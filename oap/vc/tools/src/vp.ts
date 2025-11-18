/**
 * Verifiable Presentation (VP) Support
 *
 * A Verifiable Presentation is a package of one or more Verifiable Credentials
 * that is presented to a verifier. The holder signs the VP to prove they control
 * the credentials.
 *
 * W3C VC Data Model 1.1 Compliance:
 * - @context: Required, must include https://www.w3.org/2018/credentials/v1
 * - type: Required, must include "VerifiablePresentation"
 * - verifiableCredential: Required, one or more VCs
 * - holder: Optional, DID of the holder
 * - proof: Required, includes challenge (required) and domain (optional) for replay prevention
 *
 * @see https://www.w3.org/TR/vc-data-model/#presentations
 */

import { VerifiableCredential } from "./index";
import {
  signEd25519,
  verifyEd25519,
  canonicalizeJsonLd,
  privateKeyToBytes as cryptoPrivateKeyToBytes,
  bytesToBase64url,
} from "./crypto-utils";

export interface VerifiablePresentation {
  "@context": string[];
  type: string[];
  verifiableCredential: VerifiableCredential | VerifiableCredential[];
  holder?: string; // DID of the holder
  proof: {
    type: string;
    created: string;
    verificationMethod: string;
    proofPurpose: string;
    challenge: string; // Required: Nonce to prevent replay attacks
    domain?: string; // Optional: Domain of the verifier
    jws: string;
  };
}

/**
 * Options for creating a Verifiable Presentation
 *
 * @property holderDid - Optional DID of the holder (will be derived from VC if not provided)
 * @property holderPrivateKey - Required private key for signing the VP
 * @property challenge - Required nonce to prevent replay attacks (should come from verifier)
 * @property domain - Optional domain binding for additional security
 */
export interface PresentationOptions {
  holderDid?: string;
  holderPrivateKey: string; // Required: Private key for signing
  challenge: string; // Required: Nonce to prevent replay attacks
  domain?: string; // Optional: Domain of the verifier
}

/**
 * Create a Verifiable Presentation from one or more Verifiable Credentials
 *
 * @param credentials - One or more Verifiable Credentials to include
 * @param options - Presentation options including holder DID, private key, challenge, and domain
 * @returns Verifiable Presentation compliant with W3C VC Data Model 1.1
 *
 * @throws Error if credentials are invalid or required options are missing
 */
export async function createVerifiablePresentation(
  credentials: VerifiableCredential | VerifiableCredential[],
  options: PresentationOptions
): Promise<VerifiablePresentation> {
  const vcArray = Array.isArray(credentials) ? credentials : [credentials];

  // Validate all credentials
  for (const vc of vcArray) {
    if (!vc["@context"] || !vc.type || !vc.credentialSubject || !vc.proof) {
      throw new Error("Invalid Verifiable Credential in presentation");
    }
  }

  // Validate required options
  if (!options.holderPrivateKey) {
    throw new Error("holderPrivateKey is required for signing");
  }
  if (!options.challenge) {
    throw new Error("challenge is required to prevent replay attacks");
  }

  // Use holder DID or derive from first credential's subject
  const holder =
    options.holderDid ||
    (vcArray[0].credentialSubject as any)?.did ||
    (vcArray[0].credentialSubject as any)?.agent_id;

  if (!holder) {
    throw new Error(
      "holder DID is required. Provide holderDid or ensure VC has did/agent_id in credentialSubject"
    );
  }

  // Create VP structure (without proof first, proof is added after signing)
  const vpWithoutProof = {
    "@context": [
      "https://www.w3.org/2018/credentials/v1",
      "https://w3id.org/security/suites/ed25519-2020/v1",
    ],
    type: ["VerifiablePresentation", "OAPPassportPresentation"],
    verifiableCredential: vcArray.length === 1 ? vcArray[0] : vcArray,
    holder: holder,
  };

  // Sign the presentation
  const created = new Date().toISOString();
  const verificationMethod = `${holder}#key-1`;
  const jws = await signPresentation(
    vpWithoutProof,
    options.holderPrivateKey,
    options,
    created,
    verificationMethod
  );

  // Add proof to complete the VP
  const vp: VerifiablePresentation = {
    ...vpWithoutProof,
    proof: {
      type: "Ed25519Signature2020",
      created: created,
      verificationMethod: verificationMethod,
      proofPurpose: "authentication",
      challenge: options.challenge, // Required for replay prevention
      ...(options.domain && { domain: options.domain }), // Optional domain
      jws: jws,
    },
  };

  return vp;
}

/**
 * Sign a Verifiable Presentation using Ed25519
 *
 * Signs the VP structure (without proof) along with challenge and domain
 * to prevent replay attacks.
 *
 * @param vpWithoutProof - VP structure without proof
 * @param privateKey - Holder's private key (base64 or multibase format)
 * @param options - Presentation options including challenge and domain
 * @param created - ISO 8601 timestamp when proof was created
 * @param verificationMethod - DID URL of the verification method
 * @returns JWS signature in compact format: {header}..{signature}
 */
async function signPresentation(
  vpWithoutProof: any,
  privateKey: string,
  options: PresentationOptions,
  created: string,
  verificationMethod: string
): Promise<string> {
  // Build the payload to sign (VP without proof + challenge + domain)
  // This ensures replay attack prevention
  const payloadToSign = {
    ...vpWithoutProof,
    challenge: options.challenge,
    ...(options.domain && { domain: options.domain }),
    created: created,
    verificationMethod: verificationMethod,
  };

  // Canonicalize the JSON-LD representation
  const canonicalMessage = await canonicalizeJsonLd(payloadToSign);

  // Convert private key to bytes
  const privateKeyBytes = privateKeyToBytes(privateKey);

  // Sign using Ed25519
  const signatureBytes = await signEd25519(canonicalMessage, privateKeyBytes);

  // Create JWS header
  const header = {
    alg: "Ed25519",
    typ: "JWT",
  };

  // Encode header and signature as base64url
  const headerB64 = bytesToBase64url(
    new TextEncoder().encode(JSON.stringify(header))
  );
  const signatureB64 = bytesToBase64url(signatureBytes);

  // Return compact JWS format: {header}..{signature}
  // Note: Detached payload (payload is not included in JWS)
  return `${headerB64}..${signatureB64}`;
}

// Use the privateKeyToBytes function from crypto-utils
const privateKeyToBytes = cryptoPrivateKeyToBytes;

/**
 * Verify a Verifiable Presentation
 *
 * Validates VP structure and verifies the cryptographic signature.
 * Also checks challenge and domain to prevent replay attacks.
 *
 * @param vp - Verifiable Presentation to verify
 * @param expectedChallenge - Expected challenge value (must match proof.challenge)
 * @param expectedDomain - Expected domain value (optional, must match if provided)
 * @param publicKey - Public key for signature verification (optional, will resolve from verificationMethod if not provided)
 * @returns Verification result with valid flag and optional error message
 */
export async function verifyVerifiablePresentation(
  vp: VerifiablePresentation,
  expectedChallenge: string,
  expectedDomain?: string,
  publicKey?: string | Uint8Array
): Promise<{ valid: boolean; error?: string }> {
  // Validate VP structure
  if (!vp["@context"] || !vp.type || !vp.verifiableCredential || !vp.proof) {
    return { valid: false, error: "Invalid VP structure" };
  }

  // Check if type includes VerifiablePresentation
  if (!vp.type.includes("VerifiablePresentation")) {
    return { valid: false, error: "VP must have type VerifiablePresentation" };
  }

  // Validate challenge (required for replay prevention)
  if (!vp.proof.challenge) {
    return { valid: false, error: "VP proof must include challenge" };
  }

  if (vp.proof.challenge !== expectedChallenge) {
    return {
      valid: false,
      error: "Challenge mismatch - possible replay attack",
    };
  }

  // Validate domain if provided
  if (expectedDomain) {
    if (vp.proof.domain !== expectedDomain) {
      return {
        valid: false,
        error: "Domain mismatch - presentation not intended for this verifier",
      };
    }
  }

  // Validate credentials
  const vcs = Array.isArray(vp.verifiableCredential)
    ? vp.verifiableCredential
    : [vp.verifiableCredential];

  for (const vc of vcs) {
    if (!vc["@context"] || !vc.type || !vc.credentialSubject || !vc.proof) {
      return { valid: false, error: "Invalid VC in presentation" };
    }
  }

  // Verify signature
  try {
    // Recreate VP without proof for signing
    const vpWithoutProof = {
      "@context": vp["@context"],
      type: vp.type,
      verifiableCredential: vp.verifiableCredential,
      holder: vp.holder,
      challenge: vp.proof.challenge,
      ...(vp.proof.domain && { domain: vp.proof.domain }),
      created: vp.proof.created,
      verificationMethod: vp.proof.verificationMethod,
    };

    // Canonicalize
    const canonicalMessage = await canonicalizeJsonLd(vpWithoutProof);

    // Extract signature from JWS
    const jwsParts = vp.proof.jws.split(".");
    if (jwsParts.length !== 3) {
      return { valid: false, error: "Invalid JWS format" };
    }

    const signatureB64 = jwsParts[2];
    const signatureBytes = base64urlToBytes(signatureB64);

    // Get public key
    if (!publicKey) {
      // Public key resolution from verificationMethod is not yet implemented
      // This would require DID Document resolution, which is environment-dependent
      return {
        valid: false,
        error:
          "Public key required for verification. Provide it explicitly or implement DID resolution to fetch from verificationMethod.",
      };
    }

    const publicKeyBytes = publicKeyToBytes(publicKey);

    // Verify signature
    const isValid = await verifyEd25519(
      canonicalMessage,
      signatureBytes,
      publicKeyBytes
    );

    if (!isValid) {
      return { valid: false, error: "Invalid signature" };
    }

    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: `Verification error: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    };
  }
}

/**
 * Convert base64url string to Uint8Array
 */
function base64urlToBytes(base64url: string): Uint8Array {
  const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  // Handle padding
  const padLength = (4 - (base64.length % 4)) % 4;
  const paddedBase64 = base64 + "=".repeat(padLength);

  try {
    const binaryString = atob(paddedBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  } catch (e) {
    throw new Error(
      `Invalid base64url string: ${
        e instanceof Error ? e.message : "Unknown error"
      }`
    );
  }
}

/**
 * Convert public key string to Uint8Array
 *
 * @param publicKey - Public key in various formats (base64url, base64, multibase, or Uint8Array)
 * @returns Decoded bytes
 * @throws Error if the key format is invalid
 * @internal
 */
function publicKeyToBytes(publicKey: string | Uint8Array): Uint8Array {
  if (publicKey instanceof Uint8Array) {
    return publicKey;
  }

  // Remove multibase prefix if present
  if (publicKey.startsWith("z")) {
    publicKey = publicKey.slice(1);
  }

  // Convert base64/base64url to bytes
  const base64 = publicKey.replace(/-/g, "+").replace(/_/g, "/");
  const padLength = (4 - (base64.length % 4)) % 4;
  const paddedBase64 = base64 + "=".repeat(padLength);

  try {
    const binaryString = atob(paddedBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  } catch (e) {
    throw new Error(
      `Invalid public key format: ${
        e instanceof Error ? e.message : "Unknown error"
      }`
    );
  }
}
