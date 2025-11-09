/**
 * Open Agent Passport VC Conversion Tools
 *
 * Provides functions to convert between OAP objects and Verifiable Credentials
 * for interoperability with VC/DID ecosystems.
 *
 * Note: This module is designed to work in both Node.js and Cloudflare Workers environments.
 * File system operations are skipped in Workers since they're not available there.
 */

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
export function exportPassportToVC(
  passport: OAPPassport,
  registryKey: RegistryKey
): VerifiableCredential {
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
    // DID-based issuer (e.g., did:web:api.aport.io:agents:ap_abc123#key-1)
    verificationMethod = `${issuer}#key-1`;
  } else {
    // URL-based issuer (legacy)
    verificationMethod = `${registryKey.issuer}/.well-known/oap/keys.json#${registryKey.kid}`;
  }

  const vc: VerifiableCredential = {
    "@context": [
      "https://www.w3.org/2018/credentials/v1",
      "https://github.com/aporthq/aport-spec/oap/vc/context-oap-v1.jsonld",
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
    proof: {
      type: "Ed25519Signature2020",
      created: passport.created_at,
      verificationMethod: verificationMethod,
      proofPurpose: "assertionMethod",
      jws: signCredential(passport, registryKey),
    },
  };

  return vc;
}

/**
 * Convert OAP Decision to Verifiable Credential
 */
export function exportDecisionToVC(
  decision: OAPDecision,
  registryKey: RegistryKey
): VerifiableCredential {
  // Validate decision structure
  if (!isValidOAPDecision(decision)) {
    throw new Error("Invalid OAP decision structure");
  }

  // Create VC structure
  const vc: VerifiableCredential = {
    "@context": [
      "https://www.w3.org/2018/credentials/v1",
      "https://github.com/aporthq/aport-spec/oap/vc/context-oap-v1.jsonld",
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
    proof: {
      type: "Ed25519Signature2020",
      created: decision.created_at,
      verificationMethod: `${registryKey.issuer}/.well-known/oap/keys.json#${registryKey.kid}`,
      proofPurpose: "assertionMethod",
      jws: signCredential(decision, registryKey),
    },
  };

  return vc;
}

/**
 * Convert Verifiable Credential to OAP Passport
 */
export function importVCToPassport(vc: VerifiableCredential): OAPPassport {
  // Validate VC structure
  if (!isValidVC(vc)) {
    throw new Error("Invalid VC structure");
  }

  // Verify signature
  if (!verifyCredentialSignature(vc)) {
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
export function importVCToDecision(vc: VerifiableCredential): OAPDecision {
  // Validate VC structure
  if (!isValidVC(vc)) {
    throw new Error("Invalid VC structure");
  }

  // Verify signature
  if (!verifyCredentialSignature(vc)) {
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

function signCredential(data: any, registryKey: RegistryKey): string {
  // In a real implementation, this would use Ed25519 signing
  // For now, return a placeholder signature
  const payload = JSON.stringify(data);
  const signature = Buffer.from(payload).toString("base64");
  return `eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.${signature}.placeholder`;
}

function verifyCredentialSignature(vc: VerifiableCredential): boolean {
  // In a real implementation, this would verify the Ed25519 signature
  // For now, return true for demonstration
  return true;
}
