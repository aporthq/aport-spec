# Open Agent Passport (OAP) v1.0 Specification

## Abstract

The Open Agent Passport (OAP) specification defines a standardized format for AI agent identity, capabilities, and policy enforcement. This specification enables secure, verifiable, and interoperable agent authentication and authorization across platforms and organizations.

## Status

This document is a working draft of the Open Agent Passport specification v1.0.

## Table of Contents

1. [Introduction](#introduction)
2. [Core Objects](#core-objects)
3. [Assurance Levels](#assurance-levels)
4. [Decision Objects](#decision-objects)
5. [Caching & TTL](#caching--ttl)
6. [Canonicalization & Signing](#canonicalization--signing)
7. [Errors](#errors)
8. [Versioning](#versioning)
9. [Security](#security)
10. [Conformance](#conformance)

## Introduction

The Open Agent Passport (OAP) specification provides a standardized way to:

- **Identify AI agents** with unique, verifiable credentials
- **Define capabilities** and operational limits
- **Enforce policies** through standardized decision objects
- **Ensure security** through cryptographic signatures and verification
- **Enable interoperability** across different platforms and organizations

### Key Design Principles

- **Simplicity**: Core objects are minimal and focused
- **Security**: Cryptographic verification of all decisions
- **Interoperability**: Standardized formats for cross-platform compatibility
- **Extensibility**: Support for custom capabilities and policy packs
- **Performance**: Optimized for edge computing and high-throughput scenarios

## Core Objects

### Passport Objects

### Passport (Template or Instance)

A passport represents either a template (canonical agent identity) or an instance (tenant-specific deployment).

#### Required Fields

- `passport_id` (UUID v4): Unique identifier for the passport
- `kind` (enum): Either "template" or "instance"
- `spec_version` (string): OAP specification version (e.g., "oap/1.0")
- `owner_id` (string): Unique identifier for the owner
- `owner_type` (enum): Either "org" or "user"
- `assurance_level` (enum): L0, L1, L2, L3, L4KYC, L4FIN
- `status` (enum): draft, active, suspended, or revoked
- `capabilities` (array): List of granted capabilities with optional parameters
- `limits` (object): Operational limits per capability
- `regions` (array): Authorized geographic regions
- `created_at` (ISO 8601): Creation timestamp
- `updated_at` (ISO 8601): Last update timestamp
- `version` (string): Semantic version number (e.g., "1.0.0")

#### Optional Fields

- `parent_agent_id` (UUID v4): Required for instances, references the template
- `metadata` (object): Additional metadata

#### Example

```json
{
  "passport_id": "550e8400-e29b-41d4-a716-446655440000",
  "kind": "template",
  "spec_version": "oap/1.0",
  "owner_id": "org_12345678",
  "owner_type": "org",
  "assurance_level": "L2",
  "status": "active",
  "capabilities": [
    {
      "id": "payments.refund",
      "params": {
        "max_amount": 5000,
        "currency": "USD"
      }
    },
    {
      "id": "data.export"
    }
  ],
  "limits": {
    "payments.refund": {
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
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-15T10:30:00Z",
  "version": "1.0.0"
}
```

## Assurance Levels

Assurance levels indicate the verification strength of the passport owner's identity.

| Level | Name | Description | Requirements |
|-------|------|-------------|--------------|
| L0 | Self-Attested | Owner self-declares identity | Self-declaration |
| L1 | Email Verified | Email address verified | Valid email + confirmation |
| L2 | GitHub Verified | GitHub account verified | GitHub account + public profile |
| L3 | Domain Verified | Domain ownership verified | DNS TXT or /.well-known/oap.json |
| L4KYC | KYC/KYB Verified | Know Your Customer/Business verification completed | Government ID + business registration |
| L4FIN | Financial Data Verified | Financial data and banking information verified | Bank account verification + financial statements |

## Decision Objects

### Decision Structure

A decision object represents the result of policy evaluation for a specific action.

### Required Fields

- `decision_id` (UUID v4): Unique identifier for the decision
- `policy_id` (string): Policy pack identifier (e.g., "payments.refund.v1")
- `agent_id` (UUID v4): Agent that was evaluated
- `owner_id` (string): Owner ID from the passport
- `assurance_level` (enum): Assurance level from the passport
- `allow` (boolean): Whether the action is allowed
- `reasons` (array): Array of reason objects with code and message
- `created_at` (ISO 8601): When the decision was created
- `expires_in` (integer): Number of seconds until the decision expires
- `passport_digest` (string): SHA-256 hash of JCS-canonicalized passport
- `signature` (string): Ed25519 signature over decision payload
- `kid` (string): Key identifier for signature verification

### Optional Fields

- `decision_token` (string): Compact JWT for sub-TTL caching

### Example

```json
{
  "decision_id": "550e8400-e29b-41d4-a716-446655440002",
  "policy_id": "payments.refund.v1",
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
  "passport_digest": "sha256:abcd1234efgh5678ijkl9012mnop3456qrst7890uvwx1234yzab5678cdef",
  "signature": "ed25519:abcd1234efgh5678ijkl9012mnop3456qrst7890uvwx1234yzab5678cdef==",
  "kid": "oap:registry:key-2025-01"
}
```

## Caching & TTL

### Decision Caching

### Decision Caching

Relying parties MAY cache allow decisions until `expires_at`.

### Suspend/Revoke Semantics

When a passport is suspended or revoked:
- Validators MUST treat cached tokens as invalid after max 30 seconds
- Publishers MUST purge caches within 30 seconds
- Decision tokens MUST be invalidated globally

## Canonicalization & Signing

### JCS Canonicalization

### JCS Canonicalization

All objects MUST be canonicalized using [RFC 8785 JCS](https://tools.ietf.org/html/rfc8785) before:
- Computing passport digests
- Creating signatures
- Verifying signatures

### Ed25519 Signatures

- All decisions MUST be signed with Ed25519
- Signatures are computed over JCS-canonicalized decision payloads
- Key identifiers (kid) MUST be resolvable via `/.well-known/oap/keys.json`

### Key Resolution

Keys are resolved using the following format:
- Registry keys: `oap:registry:<keyid>`
- Owner keys: `oap:owner:<domain>:<keyid>`

## Errors

### Normative Error Codes

### Normative Error Codes

| Code | Description |
|------|-------------|
| `oap.invalid_context` | Context data is invalid or malformed |
| `oap.unknown_capability` | Capability is not recognized |
| `oap.limit_exceeded` | Operation exceeds configured limits |
| `oap.currency_unsupported` | Currency is not supported |
| `oap.region_blocked` | Operation not allowed in this region |
| `oap.assurance_insufficient` | Assurance level too low for operation |
| `oap.passport_suspended` | Passport is suspended or revoked |
| `oap.idempotency_conflict` | Idempotency key conflict |
| `oap.policy_error` | Policy evaluation error |

## Versioning

### Specification Versioning

### Specification Versioning

- Uses SemVer: `oap/1.0`, `oap/1.1`, etc.
- Major versions may introduce breaking changes
- Minor versions add backward-compatible features

### Policy Pack Versioning

- Policy packs are frozen by ID (e.g., `payments.refund.v1`)
- Changes require new version (e.g., `payments.refund.v2`)
- Old versions remain valid and supported

## Security

### Key Management

### Key Management

- Ed25519 keys for all signatures
- Registry keys published at `https://api.yourdomain/.well-known/oap/keys.json`
- Owner keys MAY be published at their domain

### Receipt Verification

- Decision receipts MUST be signed
- Relying parties SHOULD verify signatures where feasible
- Passport digests MUST match the evaluated passport

### Suspend Semantics

- Status changes to suspended/revoked MUST invalidate decisions within ≤30s globally
- Cached decisions MUST be treated as invalid after suspend/revoke

## Conformance

### What Implementers Must Do

### What Implementers Must Do

1. **Validate passports** against `passport-schema.json` and semantic rules
2. **Evaluate policy packs** deterministically with given context and limits
3. **Produce decisions** matching `decision-schema.json` with correct reasons, digest, signature, and TTL
4. **Verify receipts** (signature + kid resolution)
5. **Respect suspend semantics** (cache TTL bounds)

### Test Vectors

Conformance test cases are provided in the `/conformance` directory with:
- Passport examples
- Context data
- Expected decisions
- Signature verification tests

## References

- [RFC 8785: JSON Canonicalization Scheme (JCS)](https://tools.ietf.org/html/rfc8785)
- [RFC 8032: Edwards-Curve Digital Signature Algorithm (EdDSA)](https://tools.ietf.org/html/rfc8032)
- [W3C Verifiable Credentials Data Model](https://www.w3.org/TR/vc-data-model/)
- [JSON Schema Specification](https://json-schema.org/)
