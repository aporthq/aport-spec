/**
 * Open Agent Passport VC Conversion Tools
 *
 * Provides functions to convert between OAP objects and Verifiable Credentials
 * for interoperability with VC/DID ecosystems.
 *
 * Note: This module is designed to work in both Node.js and Cloudflare Workers environments.
 * File system operations are skipped in Workers since they're not available there.
 */

import {
  canonicalizeJsonLd,
  signEd25519,
  verifyEd25519,
  bytesToBase64url,
  publicKeyToBytes,
} from "./crypto-utils";

// Types
export interface OAPPassport {
  agent_id: string;
  kind: "template" | "instance";
  spec_version: string;
  parent_agent_id?: string;
  owner_id: string;
  owner_type: "org" | "user";
  assurance_level: "L0" | "L1" | "L2" | "L3" | "L4KYC" | "L4FIN";
  status: "draft" | "active" | "suspended" | "revoked";
  capabilities: Array<{ id: string; params?: Record<string, any> }>;
  limits: Record<string, any>;
  regions: string[];
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  version: string;
}

export interface OAPDecision {
  decision_id: string;
  policy_id: string;
  agent_id: string;
  owner_id: string;
  assurance_level: string;
  allow: boolean;
  reasons: Array<{ code: string; message?: string }>;
  created_at: string;
  expires_in: number;
  passport_digest: string;
  signature: string;
  kid: string;
  decision_token?: string;
  remaining_daily_cap?: Record<string, number>;
}

export interface VerifiableCredential {
  "@context": string[];
  type: string[];
  credentialSubject: any;
  issuer: string;
  issuanceDate: string;
  expirationDate: string;
  proof: {
    type: string;
    created: string;
    verificationMethod: string;
    proofPurpose: string;
    jws: string;
  };
}

export interface RegistryKey {
  issuer: string;
  kid: string;
  privateKey?: string;
  publicKey?: string;
}

// Load schemas (only in Node.js environment, not in Cloudflare Workers)
// These are loaded but not currently used - kept for future schema validation
// In Cloudflare Workers, we skip loading since file system APIs are not available
let passportSchema: any = null;
let decisionSchema: any = null;
let oapContext: any = null;

// Skip schema loading in Cloudflare Workers (import.meta.url is undefined)
// The schemas are not used in the current code, so this is safe

/**
 * Convert OAP Passport to Verifiable Credential
 */
export async function exportPassportToVC(
  passport: OAPPassport,
  registryKey: RegistryKey
): Promise<VerifiableCredential> {
  // Validate passport structure
  if (!isValidOAPPassport(passport)) {
    throw new Error("Invalid OAP passport structure");
  }

  // Create VC structure
  // Use DID as issuer if available, otherwise fall back to registry URL
  const issuer = (passport as any).did || registryKey.issuer;

  // Construct verification method based on issuer type
  let verificationMethod: string;
  if (issuer.startsWith("did:")) {
    // DID-based issuer (preferred)
    // Resolves via DID Document: https://aport.io/api/agents/{agent_id}/did.json
    // Public key is in the DID Document's verificationMethod array
    verificationMethod = `${issuer}#key-1`;
  } else {
    // URL-based issuer (legacy fallback)
    // Requires well-known endpoint: https://aport.io/.well-known/oap/keys.json
    // Note: This endpoint should return JWK format with the specified kid
    verificationMethod = `${registryKey.issuer}/.well-known/oap/keys.json#${registryKey.kid}`;
  }

  // Create VC structure (without proof first, proof is added after signing)
  const vcWithoutProof: Omit<VerifiableCredential, "proof"> = {
    "@context": [
      "https://www.w3.org/2018/credentials/v1",
      "https://raw.githubusercontent.com/aporthq/aport-spec/refs/heads/main/oap/vc/context-oap-v1.jsonld",
    ],
    type: ["VerifiableCredential", "OAPPassportCredential"],
    credentialSubject: {
      // Map all OAP passport fields
      agent_id: passport.agent_id,
      kind: passport.kind,
      spec_version: passport.spec_version,
      parent_agent_id: passport.parent_agent_id,
      owner_id: passport.owner_id,
      owner_type: passport.owner_type,
      assurance_level: passport.assurance_level,
      status: passport.status,
      capabilities: passport.capabilities,
      limits: passport.limits,
      regions: passport.regions,
      metadata: passport.metadata,
      created_at: passport.created_at,
      updated_at: passport.updated_at,
      version: passport.version,
      did: (passport as any).did, // Include DID in credential subject
    },
    issuer: issuer,
    issuanceDate: passport.created_at,
    expirationDate: computeExpirationDate(passport),
  };

  // Sign the credential (signs the credential without proof)
  const jws = await signCredential(
    vcWithoutProof as VerifiableCredential,
    registryKey
  );

  // Add proof to complete the VC
  const vc: VerifiableCredential = {
    ...vcWithoutProof,
    proof: {
      type: "Ed25519Signature2020",
      created: passport.created_at,
      verificationMethod: verificationMethod,
      proofPurpose: "assertionMethod",
      jws: jws,
    },
  };

  return vc;
}

/**
 * Convert OAP Decision to Verifiable Credential
 */
export async function exportDecisionToVC(
  decision: OAPDecision,
  registryKey: RegistryKey
): Promise<VerifiableCredential> {
  // Validate decision structure
  if (!isValidOAPDecision(decision)) {
    throw new Error("Invalid OAP decision structure");
  }

  // Create VC structure (without proof first)
  const vcWithoutProof: Omit<VerifiableCredential, "proof"> = {
    "@context": [
      "https://www.w3.org/2018/credentials/v1",
      "https://raw.githubusercontent.com/aporthq/aport-spec/refs/heads/main/oap/vc/context-oap-v1.jsonld",
    ],
    type: ["VerifiableCredential", "OAPDecisionReceipt"],
    credentialSubject: {
      // Map all OAP decision fields
      decision_id: decision.decision_id,
      policy_id: decision.policy_id,
      agent_id: decision.agent_id,
      owner_id: decision.owner_id,
      assurance_level: decision.assurance_level,
      allow: decision.allow,
      reasons: decision.reasons,
      created_at: decision.created_at,
      expires_in: decision.expires_in,
      passport_digest: decision.passport_digest,
      signature: decision.signature,
      kid: decision.kid,
      decision_token: decision.decision_token,
      remaining_daily_cap: decision.remaining_daily_cap,
    },
    issuer: registryKey.issuer,
    issuanceDate: decision.created_at,
    expirationDate: new Date(
      new Date(decision.created_at).getTime() + decision.expires_in * 1000
    ).toISOString(),
  };

  // Sign the credential
  const jws = await signCredential(
    vcWithoutProof as VerifiableCredential,
    registryKey
  );

  // Add proof to complete the VC
  const vc: VerifiableCredential = {
    ...vcWithoutProof,
    proof: {
      type: "Ed25519Signature2020",
      created: decision.created_at,
      // For decisions, use registry's well-known endpoint
      // This should resolve to: https://aport.io/.well-known/oap/keys.json
      verificationMethod: `${registryKey.issuer}/.well-known/oap/keys.json#${registryKey.kid}`,
      proofPurpose: "assertionMethod",
      jws: jws,
    },
  };

  return vc;
}

/**
 * Convert Verifiable Credential to OAP Passport
 */
export async function importVCToPassport(
  vc: VerifiableCredential,
  publicKey?: string | Uint8Array
): Promise<OAPPassport> {
  // Validate VC structure
  if (!isValidVC(vc)) {
    throw new Error("Invalid VC structure");
  }

  // Verify signature
  const isValid = await verifyCredentialSignature(vc, publicKey);
  if (!isValid) {
    throw new Error("Invalid VC signature");
  }

  // Extract passport from credential subject
  const passport = vc.credentialSubject;

  // Validate OAP passport structure
  if (!isValidOAPPassport(passport)) {
    throw new Error("Invalid OAP passport structure");
  }

  return passport;
}

/**
 * Convert Verifiable Credential to OAP Decision
 */
export async function importVCToDecision(
  vc: VerifiableCredential,
  publicKey?: string | Uint8Array
): Promise<OAPDecision> {
  // Validate VC structure
  if (!isValidVC(vc)) {
    throw new Error("Invalid VC structure");
  }

  // Verify signature
  const isValid = await verifyCredentialSignature(vc, publicKey);
  if (!isValid) {
    throw new Error("Invalid VC signature");
  }

  // Extract decision from credential subject
  const decision = vc.credentialSubject;

  // Validate OAP decision structure
  if (!isValidOAPDecision(decision)) {
    throw new Error("Invalid OAP decision structure");
  }

  return decision;
}

/**
 * Validation Functions
 */
export function isValidVC(vc: any): boolean {
  return (
    vc &&
    vc["@context"] &&
    vc.type &&
    vc.credentialSubject &&
    vc.issuer &&
    vc.issuanceDate &&
    vc.proof
  );
}

export function isValidOAPPassport(passport: any): boolean {
  return (
    passport &&
    passport.agent_id &&
    passport.kind &&
    passport.spec_version &&
    passport.owner_id &&
    passport.owner_type &&
    passport.assurance_level &&
    passport.status &&
    passport.capabilities &&
    passport.limits &&
    passport.regions &&
    passport.created_at &&
    passport.updated_at &&
    passport.version
  );
}

export function isValidOAPDecision(decision: any): boolean {
  return (
    decision &&
    decision.decision_id &&
    decision.policy_id &&
    decision.agent_id &&
    decision.owner_id &&
    decision.assurance_level &&
    typeof decision.allow === "boolean" &&
    decision.reasons &&
    decision.created_at &&
    decision.expires_in &&
    decision.passport_digest &&
    decision.signature &&
    decision.kid
  );
}

/**
 * Helper Functions
 */
function computeExpirationDate(passport: OAPPassport | any): string {
  // Use native expiry if set
  if (passport.expires_at) {
    return passport.expires_at;
  }

  // Check never_expires flag
  if (passport.never_expires) {
    // W3C VC spec requires expirationDate, use far future for perpetual credentials
    return new Date("2999-12-31T23:59:59Z").toISOString();
  }

  // Default: 1 year from creation
  const created = new Date(passport.created_at);
  const expiration = new Date(created.getTime() + 365 * 24 * 60 * 60 * 1000);
  return expiration.toISOString();
}

/**
 * Sign a credential using Ed25519
 *
 * @param vc - The Verifiable Credential to sign (without proof)
 * @param registryKey - Registry key containing private key
 * @returns JWS in compact format: <header>.<payload>.<signature>
 *
 * Note: JWS is safe to expose publicly - it's a cryptographic signature meant for verification.
 * Anyone can verify it using the public key from verificationMethod.
 *
 * According to W3C VC spec, we sign the credential WITHOUT the proof, then add the proof.
 *
 * @see https://www.w3.org/TR/vc-data-model/#proofs-signatures
 * @see https://w3c-ccg.github.io/lds-ed25519-2020/#ed25519signature2020
 */
async function signCredential(
  vc: VerifiableCredential,
  registryKey: RegistryKey
): Promise<string> {
  if (!registryKey.privateKey) {
    throw new Error(
      "REGISTRY_PRIVATE_KEY is required for VC signing. Set it in environment variables."
    );
  }

  // Step 1: Create credential without proof (proof is added after signing)
  const credentialWithoutProof = {
    "@context": vc["@context"],
    type: vc.type,
    credentialSubject: vc.credentialSubject,
    issuer: vc.issuer,
    issuanceDate: vc.issuanceDate,
    expirationDate: vc.expirationDate,
  };

  // Step 2: Canonicalize the JSON-LD representation
  const canonicalMessage = await canonicalizeJsonLd(credentialWithoutProof);

  // Step 3: Sign using Ed25519
  const signatureBytes = await signEd25519(
    canonicalMessage,
    registryKey.privateKey
  );

  // Step 4: Format as JWS (compact format)
  // JWS header for Ed25519
  const header = {
    alg: "EdDSA",
    b64: false,
    crit: ["b64"],
  };
  const headerB64 = bytesToBase64url(
    new TextEncoder().encode(JSON.stringify(header))
  );

  // For Ed25519Signature2020, we use detached payload
  // The signature is over the canonicalized credential
  const signatureB64 = bytesToBase64url(signatureBytes);

  // Return compact JWS format: header..signature (detached payload)
  // Note: For Ed25519Signature2020, the payload is the canonicalized credential
  return `${headerB64}..${signatureB64}`;
}

/**
 * Verify a Verifiable Credential's Ed25519 signature
 *
 * @param vc - The Verifiable Credential to verify
 * @param publicKey - Optional public key. If not provided, will attempt to resolve from verificationMethod
 * @returns Promise<boolean> - true if signature is valid
 *
 * @see https://www.w3.org/TR/vc-data-model/#proofs-signatures
 * @see https://w3c-ccg.github.io/lds-ed25519-2020/#ed25519signature2020
 */
export async function verifyCredentialSignature(
  vc: VerifiableCredential,
  publicKey?: string | Uint8Array
): Promise<boolean> {
  if (!vc.proof || !vc.proof.jws) {
    return false;
  }

  try {
    // Step 1: Recreate credential without proof
    const credentialWithoutProof = {
      "@context": vc["@context"],
      type: vc.type,
      credentialSubject: vc.credentialSubject,
      issuer: vc.issuer,
      issuanceDate: vc.issuanceDate,
      expirationDate: vc.expirationDate,
    };

    // Step 2: Canonicalize the JSON-LD representation (same as signing)
    const canonicalMessage = await canonicalizeJsonLd(credentialWithoutProof);

    // Step 3: Extract signature from JWS
    const jwsParts = vc.proof.jws.split(".");
    if (jwsParts.length !== 3) {
      console.error("Invalid JWS format. Expected header.payload.signature");
      return false;
    }

    const signatureB64 = jwsParts[2];
    const signatureBytes = base64urlToBytes(signatureB64);

    // Step 4: Get public key
    let publicKeyBytes: Uint8Array;

    if (publicKey) {
      // Use provided public key
      publicKeyBytes = publicKeyToBytes(publicKey);
    } else {
      // TODO: Resolve public key from verificationMethod
      // For now, require public key to be provided
      throw new Error(
        "Public key is required for verification. Provide it or implement verificationMethod resolution."
      );
    }

    // Step 5: Verify signature
    return await verifyEd25519(
      canonicalMessage,
      signatureBytes,
      publicKeyBytes
    );
  } catch (error) {
    console.error("VC signature verification error:", error);
    return false;
  }
}

/**
 * Convert base64url string to Uint8Array
 */
function base64urlToBytes(base64url: string): Uint8Array {
  // Convert base64url to base64
  let base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");

  // Add padding if needed
  while (base64.length % 4) {
    base64 += "=";
  }

  // Decode base64
  if (typeof Buffer !== "undefined") {
    return Buffer.from(base64, "base64");
  } else {
    // For Cloudflare Workers, use atob
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
}

// Export Verifiable Presentation functions
export * from "./vp";
