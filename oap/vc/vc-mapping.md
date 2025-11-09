# Open Agent Passport Verifiable Credential Mapping

## Overview

This document defines how Open Agent Passport (OAP) objects can be exported and imported as W3C Verifiable Credentials (VCs) for interoperability with existing VC ecosystems.

## Design Principles

- **Optional VC Support**: VCs are optional for OAP v1 - native OAP JSON remains the source of truth
- **Deterministic Mapping**: Export/import mappings are deterministic and reversible
- **Minimal VC Dependencies**: Avoid forcing VC adoption in OAP v1 implementations
- **Future Compatibility**: Design for future VC integration without breaking changes

## Passport to VC Mapping

### OAP Passport Credential

An OAP passport can be exported as a Verifiable Credential with the following structure:

```json
{
  "@context": [
    "https://www.w3.org/2018/credentials/v1",
    "https://raw.githubusercontent.com/aporthq/aport-spec/refs/heads/main/oap/vc/context-oap-v1.jsonld"
  ],
  "type": ["VerifiableCredential", "OAPPassportCredential"],
  "credentialSubject": {
    "agent_id": "550e8400-e29b-41d4-a716-446655440000",
    "kind": "template",
    "spec_version": "oap/1.0",
    "owner_id": "org_12345678",
    "owner_type": "org",
    "assurance_level": "L2",
    "status": "active",
    "capabilities": ["finance.payment.refund", "data.export"],
    "limits": {
      "finance.payment.refund": {
        "currency_limits": {
          "USD": {
            "max_per_tx": 5000,
            "daily_cap": 50000
          }
        },
        "reason_codes": ["customer_request", "defective_product"],
        "idempotency_required": true
      }
    },
    "regions": ["US", "CA"],
    "metadata": {
      "name": "Customer Support AI",
      "description": "AI agent for customer support operations"
    },
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-15T10:30:00Z",
    "version": "1.0.0"
  },
  "issuer": "https://aport.io",
  "issuanceDate": "2024-01-01T00:00:00Z",
  "expirationDate": "2025-01-01T00:00:00Z",
  "proof": {
    "type": "Ed25519Signature2020",
    "created": "2024-01-01T00:00:00Z",
    "verificationMethod": "https://aport.io/.well-known/oap/keys.json#key-2025-01",
    "proofPurpose": "assertionMethod",
    "jws": "eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### Mapping Rules

1. **Context**: Include OAP context and W3C VC context
2. **Type**: Use `["VerifiableCredential", "OAPPassportCredential"]`
3. **Credential Subject**: Map all OAP passport fields directly
4. **Issuer**: Use registry URL or owner domain
5. **Dates**: Map `created_at` to `issuanceDate`, set `expirationDate` based on policy
6. **Proof**: Use Ed25519Signature2020 over JCS-canonicalized credential subject

## Decision to VC Mapping

### OAP Decision Receipt

An OAP decision can be exported as a Verifiable Credential receipt:

```json
{
  "@context": [
    "https://www.w3.org/2018/credentials/v1",
    "https://raw.githubusercontent.com/aporthq/aport-spec/refs/heads/main/oap/vc/context-oap-v1.jsonld"
  ],
  "type": ["VerifiableCredential", "OAPDecisionReceipt"],
  "credentialSubject": {
    "decision_id": "550e8400-e29b-41d4-a716-446655440002",
    "policy_id": "finance.payment.refund.v1",
    "agent_id": "550e8400-e29b-41d4-a716-446655440000",
    "owner_id": "org_12345678",
    "assurance_level": "L2",
    "allow": true,
    "reasons": [
      {
        "code": "oap.allowed",
        "message": "Transaction within limits"
      }
    ],
    "created_at": "2024-01-15T10:30:00Z",
    "expires_in": 3600,
    "passport_digest": "sha256:abcd1234efgh5678ijkl9012mnop3456qrst7890uvwx1234yzab5678cdef"
  },
  "issuer": "https://aport.io",
  "issuanceDate": "2024-01-15T10:30:00Z",
  "expirationDate": "2024-01-15T11:30:00Z",
  "proof": {
    "type": "Ed25519Signature2020",
    "created": "2024-01-15T10:30:00Z",
    "verificationMethod": "https://aport.io/.well-known/oap/keys.json#key-2025-01",
    "proofPurpose": "assertionMethod",
    "jws": "eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### Decision Mapping Rules

1. **Context**: Include OAP context and W3C VC context
2. **Type**: Use `["VerifiableCredential", "OAPDecisionReceipt"]`
3. **Credential Subject**: Map all OAP decision fields directly
4. **Issuer**: Use registry URL
5. **Dates**: Map `created_at` to `issuanceDate`, compute `expirationDate` from `expires_in`
6. **Proof**: Use Ed25519Signature2020 over JCS-canonicalized credential subject

## Import/Export Rules

### Export Rules

#### Requirements

1. **Deterministic**: Same OAP object always produces same VC
2. **Complete**: All OAP fields are included in VC
3. **Valid**: Generated VCs are valid according to VC specification
4. **Signed**: VCs include proper Ed25519 signatures
5. **Context**: Include proper JSON-LD context

### Import Rules

#### Import Requirements

1. **Advisory Only**: VC import is advisory, not authoritative
2. **Validation**: Validate VC structure and signatures
3. **Mapping**: Map VC fields back to OAP format
4. **Source of Truth**: Native OAP JSON remains authoritative
5. **Error Handling**: Handle invalid or malformed VCs gracefully

### Implementation Example

#### Code

```javascript
// Export OAP passport to VC
function exportPassportToVC(passport, registryKey) {
  const vc = {
    "@context": [
      "https://www.w3.org/2018/credentials/v1",
      "https://raw.githubusercontent.com/aporthq/aport-spec/refs/heads/main/oap/vc/context-oap-v1.jsonld"
    ],
    "type": ["VerifiableCredential", "OAPPassportCredential"],
    "credentialSubject": passport,
    "issuer": "https://aport.io",
    "issuanceDate": passport.created_at,
    "expirationDate": computeExpirationDate(passport),
    "proof": {
      "type": "Ed25519Signature2020",
      "created": passport.created_at,
      "verificationMethod": `${registryKey.issuer}#${registryKey.kid}`,
      "proofPurpose": "assertionMethod",
      "jws": signCredential(passport, registryKey)
    }
  };
  return vc;
}

// Import VC to OAP passport
function importVCToPassport(vc) {
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
```

## Interoperability Considerations

### VC Ecosystem Integration

- **Wallet Support**: OAP VCs can be stored in standard VC wallets
- **Presentation**: OAP VCs can be presented using standard VC presentation protocols
- **Verification**: OAP VCs can be verified using standard VC verification libraries
- **Storage**: OAP VCs can be stored in standard VC repositories

### OAP Ecosystem Integration

- **Native Support**: OAP implementations work with native JSON format
- **VC Optional**: VC support is optional for OAP compliance
- **Performance**: Native OAP format is optimized for performance
- **Simplicity**: Native OAP format is simpler for basic use cases

## Future Considerations

### VC v2.0 Support

Future versions may include:

- **BBS+ Signatures**: Support for selective disclosure
- **ZKP Integration**: Zero-knowledge proof support
- **Multi-Signature**: Support for multiple signers
- **Revocation**: Standard VC revocation mechanisms

### OAP v2.0 Integration

Future OAP versions may:

- **Native VC Support**: Make VCs a first-class citizen
- **DID Integration**: Support for Decentralized Identifiers
- **Credential Exchange**: Standard credential exchange protocols
- **Privacy Enhancements**: Enhanced privacy and selective disclosure

## Implementation Guide

### Export OAP Passport to VC

```javascript
function exportPassportToVC(passport, registryKey) {
  // Validate passport structure
  if (!isValidOAPPassport(passport)) {
    throw new Error("Invalid OAP passport structure");
  }

  // Create VC structure
  const vc = {
    "@context": [
      "https://www.w3.org/2018/credentials/v1",
      "https://raw.githubusercontent.com/aporthq/aport-spec/refs/heads/main/oap/vc/context-oap-v1.jsonld"
    ],
    "type": ["VerifiableCredential", "OAPPassportCredential"],
    "credentialSubject": {
      // Map all OAP passport fields
      "agent_id": passport.agent_id,
      "kind": passport.kind,
      "spec_version": passport.spec_version,
      "parent_agent_id": passport.parent_agent_id,
      "owner_id": passport.owner_id,
      "owner_type": passport.owner_type,
      "assurance_level": passport.assurance_level,
      "status": passport.status,
      "capabilities": passport.capabilities,
      "limits": passport.limits,
      "regions": passport.regions,
      "metadata": passport.metadata,
      "created_at": passport.created_at,
      "updated_at": passport.updated_at,
      "version": passport.version
    },
    "issuer": registryKey.issuer,
    "issuanceDate": passport.created_at,
    "expirationDate": computeExpirationDate(passport),
    "proof": {
      "type": "Ed25519Signature2020",
      "created": passport.created_at,
      "verificationMethod": `${registryKey.issuer}/.well-known/oap/keys.json#${registryKey.kid}`,
      "proofPurpose": "assertionMethod",
      "jws": signCredential(passport, registryKey)
    }
  };

  return vc;
}
```

### Export OAP Decision to VC

```javascript
function exportDecisionToVC(decision, registryKey) {
  // Validate decision structure
  if (!isValidOAPDecision(decision)) {
    throw new Error("Invalid OAP decision structure");
  }

  // Create VC structure
  const vc = {
    "@context": [
      "https://www.w3.org/2018/credentials/v1",
      "https://raw.githubusercontent.com/aporthq/aport-spec/refs/heads/main/oap/vc/context-oap-v1.jsonld"
    ],
    "type": ["VerifiableCredential", "OAPDecisionReceipt"],
    "credentialSubject": {
      // Map all OAP decision fields
      "decision_id": decision.decision_id,
      "policy_id": decision.policy_id,
      "agent_id": decision.agent_id,
      "owner_id": decision.owner_id,
      "assurance_level": decision.assurance_level,
      "allow": decision.allow,
      "reasons": decision.reasons,
      "created_at": decision.created_at,
      "expires_in": decision.expires_in,
      "passport_digest": decision.passport_digest,
      "signature": decision.signature,
      "kid": decision.kid,
      "decision_token": decision.decision_token,
      "remaining_daily_cap": decision.remaining_daily_cap
    },
    "issuer": registryKey.issuer,
    "issuanceDate": decision.created_at,
    "expirationDate": new Date(new Date(decision.created_at).getTime() + decision.expires_in * 1000).toISOString(),
    "proof": {
      "type": "Ed25519Signature2020",
      "created": decision.created_at,
      "verificationMethod": `${registryKey.issuer}/.well-known/oap/keys.json#${registryKey.kid}`,
      "proofPurpose": "assertionMethod",
      "jws": signCredential(decision, registryKey)
    }
  };

  return vc;
}
```

### Import VC to OAP Objects

```javascript
function importVCToPassport(vc) {
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

function importVCToDecision(vc) {
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
```

### Validation Functions

```javascript
function isValidVC(vc) {
  return vc &&
    vc["@context"] &&
    vc.type &&
    vc.credentialSubject &&
    vc.issuer &&
    vc.issuanceDate &&
    vc.proof;
}

function isValidOAPPassport(passport) {
  return passport &&
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
    passport.version;
}

function isValidOAPDecision(decision) {
  return decision &&
    decision.decision_id &&
    decision.policy_id &&
    decision.agent_id &&
    decision.owner_id &&
    decision.assurance_level &&
    typeof decision.allow === 'boolean' &&
    decision.reasons &&
    decision.created_at &&
    decision.expires_in &&
    decision.passport_digest &&
    decision.signature &&
    decision.kid;
}
```

## References

- [W3C Verifiable Credentials Data Model](https://www.w3.org/TR/vc-data-model/)
- [W3C Verifiable Credentials Implementation Guidelines](https://www.w3.org/TR/vc-imp-guide/)
- [Ed25519Signature2020](https://w3c-ccg.github.io/lds-ed25519-2020/)
- [JSON-LD](https://www.w3.org/TR/json-ld11/)
- [OAP Specification](../oap-spec.md)
