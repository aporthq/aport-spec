/**
 * Verifiable Presentation (VP) Support
 * 
 * A Verifiable Presentation is a package of one or more Verifiable Credentials
 * that is presented to a verifier. The holder signs the VP to prove they control
 * the credentials.
 * 
 * @see https://www.w3.org/TR/vc-data-model/#presentations
 */

import { VerifiableCredential } from "./index";

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
    jws: string;
  };
}

export interface PresentationOptions {
  holderDid?: string;
  challenge?: string; // Nonce to prevent replay attacks
  domain?: string; // Domain of the verifier
}

/**
 * Create a Verifiable Presentation from one or more Verifiable Credentials
 */
export function createVerifiablePresentation(
  credentials: VerifiableCredential | VerifiableCredential[],
  holderPrivateKey: string,
  options: PresentationOptions = {}
): VerifiablePresentation {
  const vcArray = Array.isArray(credentials) ? credentials : [credentials];
  
  // Validate all credentials
  for (const vc of vcArray) {
    if (!vc["@context"] || !vc.type || !vc.credentialSubject || !vc.proof) {
      throw new Error("Invalid Verifiable Credential in presentation");
    }
  }

  // Use holder DID or derive from first credential's subject
  const holder = options.holderDid || 
    (vcArray[0].credentialSubject as any)?.did ||
    (vcArray[0].credentialSubject as any)?.agent_id;

  // Create VP structure
  const vp: VerifiablePresentation = {
    "@context": [
      "https://www.w3.org/2018/credentials/v1",
      "https://w3id.org/security/suites/ed25519-2020/v1",
    ],
    type: ["VerifiablePresentation", "OAPPassportPresentation"],
    verifiableCredential: vcArray.length === 1 ? vcArray[0] : vcArray,
    ...(holder && { holder: holder }),
    proof: {
      type: "Ed25519Signature2020",
      created: new Date().toISOString(),
      verificationMethod: holder ? `${holder}#key-1` : "unknown",
      proofPurpose: "authentication",
      jws: signPresentation(vcArray, holderPrivateKey, options),
    },
  };

  return vp;
}

/**
 * Sign a Verifiable Presentation
 * In production, this would use Ed25519 signing
 */
function signPresentation(
  credentials: VerifiableCredential[],
  privateKey: string,
  options: PresentationOptions
): string {
  // Build payload for signing
  const payload = {
    credentials: credentials.map((vc) => vc.proof.jws), // Reference credential proofs
    challenge: options.challenge,
    domain: options.domain,
    timestamp: new Date().toISOString(),
  };

  // In a real implementation, this would use Ed25519 signing
  // For now, return a placeholder signature
  const payloadStr = JSON.stringify(payload);
  const signature = Buffer.from(payloadStr).toString("base64");
  return `eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.${signature}.vp-placeholder`;
}

/**
 * Verify a Verifiable Presentation
 */
export function verifyVerifiablePresentation(
  vp: VerifiablePresentation
): { valid: boolean; error?: string } {
  // Validate VP structure
  if (!vp["@context"] || !vp.type || !vp.verifiableCredential || !vp.proof) {
    return { valid: false, error: "Invalid VP structure" };
  }

  // Check if type includes VerifiablePresentation
  if (!vp.type.includes("VerifiablePresentation")) {
    return { valid: false, error: "VP must have type VerifiablePresentation" };
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

  // In a real implementation, verify the signature
  // For now, return valid if structure is correct
  return { valid: true };
}

