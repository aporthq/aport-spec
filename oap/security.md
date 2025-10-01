# Open Agent Passport Security Model

## Overview

The Open Agent Passport (OAP) security model ensures the integrity, authenticity, and confidentiality of agent credentials and policy decisions through cryptographic verification and secure key management.

## Cryptographic Primitives

### Ed25519 Signatures

All OAP objects use Ed25519 for digital signatures:

- **Algorithm**: Edwards Curve Digital Signature Algorithm (EdDSA)
- **Curve**: Curve25519
- **Key Size**: 256 bits (32 bytes)
- **Signature Size**: 512 bits (64 bytes)
- **Performance**: Fast signing and verification, suitable for edge computing

### SHA-256 Hashing

Passport digests use SHA-256:

- **Algorithm**: SHA-256
- **Input**: JCS-canonicalized passport view
- **Output**: 256-bit (32-byte) hash
- **Format**: `sha256:<base64-encoded-hash>`

### JCS Canonicalization

All objects are canonicalized using RFC 8785 JCS before signing:

- **Standard**: RFC 8785 JSON Canonicalization Scheme
- **Purpose**: Deterministic JSON representation for consistent hashing
- **Implementation**: Must follow RFC 8785 exactly

## Key Management

### Key Types

#### Registry Keys

Registry keys are used by the OAP registry to sign decisions:

- **Format**: `oap:registry:<keyid>`
- **Location**: `https://api.yourdomain/.well-known/oap/keys.json`
- **Rotation**: Regular rotation schedule (e.g., quarterly)
- **Backup**: Multiple keys for high availability

#### Owner Keys

Owner keys are used by passport owners for additional verification:

- **Format**: `oap:owner:<domain>:<keyid>`
- **Location**: `https://<domain>/.well-known/oap/keys.json`
- **Optional**: Not required for basic OAP compliance
- **Use Case**: Additional verification layers

### Key Resolution

Keys are resolved using the following process:

1. **Parse kid**: Extract key type and identifier
2. **Resolve URL**: Construct key resolution URL
3. **Fetch key**: Retrieve public key from URL
4. **Validate**: Verify key format and expiration
5. **Cache**: Cache key for performance

#### Key Resolution URLs

```
Registry keys: https://api.yourdomain/.well-known/oap/keys.json
Owner keys:    https://<domain>/.well-known/oap/keys.json
```

#### Key Format

```json

{
  "keys": [
    {
      "kid": "oap:registry:key-2025-01",
      "kty": "OKP",
      "crv": "Ed25519",
      "x": "base64url-encoded-public-key",
      "use": "sig",
      "alg": "EdDSA",
      "exp": 1735689600
    }
  ]
}
```

## Signature Verification

### Decision Verification

All decisions MUST be verified before acceptance:

1. **Parse signature**: Extract Ed25519 signature from `signature` field
2. **Resolve key**: Use `kid` to fetch public key
3. **Canonicalize**: Apply JCS canonicalization to decision payload
4. **Verify signature**: Use Ed25519 to verify signature
5. **Check expiration**: Ensure `expires_at` is in the future
6. **Validate digest**: Verify `passport_digest` matches evaluated passport

### Passport Verification

Passport integrity is verified through digests:

1. **Canonicalize passport**: Apply JCS canonicalization
2. **Compute digest**: SHA-256 of canonicalized passport
3. **Compare**: Ensure computed digest matches `passport_digest`

## Security Properties

### Integrity

- **Passport integrity**: SHA-256 digest ensures passport hasn't been tampered with
- **Decision integrity**: Ed25519 signature ensures decision hasn't been modified
- **Canonicalization**: JCS ensures consistent representation across implementations

### Authenticity

- **Decision authenticity**: Ed25519 signature proves decision came from registry
- **Key authenticity**: HTTPS and certificate validation for key resolution
- **Passport authenticity**: Registry signature on active passports

### Non-repudiation

- **Decision non-repudiation**: Ed25519 signature provides cryptographic proof
- **Audit trail**: All decisions are logged with signatures
- **Key rotation**: Old keys remain valid for historical verification

## Threat Model

### Threats Addressed

1. **Passport tampering**: Prevented by SHA-256 digests
2. **Decision forgery**: Prevented by Ed25519 signatures
3. **Replay attacks**: Prevented by expiration times and idempotency keys
4. **Key compromise**: Mitigated by key rotation and revocation
5. **Man-in-the-middle**: Prevented by HTTPS and certificate validation

### Threats Not Addressed

1. **Key theft**: Physical security of private keys
2. **Insider attacks**: Malicious registry operators
3. **Side-channel attacks**: Implementation-specific vulnerabilities
4. **Quantum attacks**: Future quantum computing threats

## Security Best Practices

### For Implementers

1. **Use secure random**: Generate UUIDs and keys with cryptographically secure random
2. **Validate inputs**: Strictly validate all input data
3. **Check expiration**: Always verify decision expiration times
4. **Cache securely**: Store decisions securely with proper access controls
5. **Rotate keys**: Implement regular key rotation schedule
6. **Monitor logs**: Monitor for suspicious activity and key usage

### For Deployers

1. **HTTPS only**: Use HTTPS for all key resolution and API calls
2. **Certificate validation**: Validate TLS certificates properly
3. **Key storage**: Store private keys securely (HSM recommended)
4. **Access controls**: Implement proper access controls for key management
5. **Monitoring**: Monitor key usage and decision patterns
6. **Incident response**: Have procedures for key compromise

## Suspend Semantics

### Global Invalidation

When a passport is suspended or revoked:

1. **Immediate effect**: Status change takes effect immediately
2. **Cache invalidation**: All caches MUST be purged within 30 seconds
3. **Decision invalidation**: All cached decisions become invalid
4. **Notification**: Relying parties SHOULD be notified via webhooks

### Implementation Requirements

- **Registry**: Must invalidate all cached decisions within 30 seconds
- **Relying parties**: Must treat cached decisions as invalid after suspend
- **Monitoring**: Must detect and alert on suspend/revoke events
- **Recovery**: Must support passport reactivation with new decisions

## Compliance

### Security Standards

OAP implementations should comply with:

- **FIPS 140-2**: For cryptographic modules (if applicable)
- **Common Criteria**: For high-assurance implementations
- **SOC 2**: For service providers
- **ISO 27001**: For information security management

### Audit Requirements

- **Key usage**: Log all key usage and signature operations
- **Decision audit**: Log all policy decisions with full context
- **Access audit**: Log all administrative access to keys and passports
- **Retention**: Retain audit logs for required period (e.g., 7 years)

## References

- [RFC 8032: Edwards-Curve Digital Signature Algorithm (EdDSA)](https://tools.ietf.org/html/rfc8032)
- [RFC 8785: JSON Canonicalization Scheme (JCS)](https://tools.ietf.org/html/rfc8785)
- [NIST SP 800-57: Key Management Guidelines](https://csrc.nist.gov/publications/detail/sp/800-57-part-1/rev-5/final)
- [OWASP Cryptographic Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)
