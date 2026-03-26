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
11. [Delegation Chains](./delegation.md) — multi-agent delegation specification

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
- `did` (string): W3C Decentralized Identifier in did:web format (e.g., "did:web:api.aport.io:agents:ap_abc123")
- `expires_at` (ISO 8601): Expiration timestamp for ephemeral credentials
- `never_expires` (boolean): Explicit flag for perpetual credentials (default: true if expires_at not set)

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
      "id": "finance.payment.refund",
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
  "did": "did:web:api.aport.io:agents:ap_abc123",
  "never_expires": true,
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
- `policy_id` (string): Policy pack identifier (e.g., "finance.payment.refund.v1")
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
- Key identifiers (kid) MUST be resolvable via `/.well-known/oap/jwks.json`

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
| `oap.criteria_not_met` | An attestation has `met: false`; fix criterion and re-attest |
| `oap.evidence_missing` | An attestation has empty evidence; add concrete evidence string |
| `oap.criteria_incomplete` | Missing attestation for a passport criterion; submit attestation for every criterion_id |
| `oap.summary_insufficient` | Summary absent or below min_summary_words; write longer summary |
| `oap.tests_not_passing` | tests_passing required but false or missing; fix tests and resubmit |
| `oap.self_review_not_allowed` | reviewer_agent_id === author_agent_id or either missing; get different reviewer |
| `oap.blocked_pattern_detected` | output_content contains blocked pattern; remove flagged pattern |

## Versioning

### Specification Versioning

### Specification Versioning

- Uses SemVer: `oap/1.0`, `oap/1.1`, etc.
- Major versions may introduce breaking changes
- Minor versions add backward-compatible features

### Policy Pack Versioning

- Policy packs are frozen by ID (e.g., `finance.payment.refund.v1`)
- Changes require new version (e.g., `finance.payment.refund.v2`)
- Old versions remain valid and supported

### Policy Pack Schema

Policy packs define the evaluation logic for specific capabilities. Each policy pack MUST include the following fields:

#### Required Fields

- `id` (string): Unique policy pack identifier in the format `{domain}.{capability}.v{version}` (e.g., `finance.payment.refund.v1`)
- `name` (string): Human-readable policy name
- `description` (string): Detailed description of the policy's purpose and enforcement rules
- `version` (string): Semantic version (e.g., `1.0.0`)
- `status` (string): One of `active`, `deprecated`, `beta`
- `requires_capabilities` (array of strings): List of capability IDs required for this policy
- `min_assurance` (string): Minimum assurance level required (e.g., `L1`, `L2`, `L3`)

#### Optional Fields

- `evaluation_rules_version` (string): Version of the evaluation rules format (e.g., `1.0`). Defaults to `1.0` if not specified.
- `evaluation_rules` (array): Array of evaluation rule objects that define the policy logic. Each rule object MUST include:
  - `name` (string): Unique identifier for this rule within the policy
  - `type` (string): Rule type - either `expression` or `custom_validator`
  - `deny_code` (string): OAP error code to return if rule fails (e.g., `oap.limit_exceeded`)
  - `description` (string): Human-readable description of what this rule checks
  - For `expression` type:
    - `condition` (string): JavaScript expression that evaluates to boolean. Has access to `passport`, `context`, and `limits` scope objects. Uses safe expression evaluator with restricted grammar.
  - For `custom_validator` type:
    - `validator` (string): Name of the validator function from the custom validators registry
  - Optional:
    - `message` (string): Custom error message to return if rule fails

- `limits_required` (array of strings): List of limit keys that must be present in passport limits
- `required_fields` (array of strings): List of required context fields
- `optional_fields` (array of strings): List of optional context fields
- `enforcement` (object): Enforcement configuration flags
- `required_context` (object): JSON Schema for validating context data
- `cache` (object): Caching configuration with `default_ttl_seconds` and `suspend_invalidate_seconds`
- `mcp` (object): MCP-specific configuration flags
- `advice` (array of strings): Best practice recommendations for policy usage
- `deprecation` (object or null): Deprecation information if status is `deprecated`
- `created_at` (string): ISO 8601 timestamp of policy creation
- `updated_at` (string): ISO 8601 timestamp of last policy update

#### Evaluation Rules

Evaluation rules provide declarative policy logic without requiring manual code. Rules are evaluated in order, and the first failing rule causes policy denial.

**Expression Rules** use safe JavaScript expressions:
```json
{
  "name": "amount_within_limit",
  "type": "expression",
  "condition": "context.amount <= limits.payments.charge.max_per_tx",
  "deny_code": "oap.limit_exceeded",
  "description": "Transaction amount must not exceed limit"
}
```

**Custom Validator Rules** reference pre-defined validator functions:
```json
{
  "name": "blocked_patterns",
  "type": "custom_validator",
  "validator": "validateBlockedPatterns",
  "deny_code": "oap.blocked_pattern",
  "description": "Command must not contain blocked patterns"
}
```

Expression rules have access to:
- `passport` - The full passport object (agent_id, status, capabilities, limits, etc.)
- `context` - The action context provided in the verification request
- `limits` - Shorthand for `passport.limits`
- `helpers` - Safe helper methods (array/string operations, comparisons)

Expressions MUST NOT contain:
- `eval()`, `Function()`, or other code execution primitives
- `__proto__`, `prototype`, `constructor` (prototype pollution)
- Expressions longer than 1000 characters

Custom validators MUST be:
- Pure functions (no I/O, no side effects)
- Deterministic (same inputs always produce same outputs)
- Registered in the validator registry before evaluation

#### Example Policy Pack

```json
{
  "id": "system.command.execute.v1",
  "name": "System Command Execution Policy",
  "description": "Pre-action governance for shell command execution",
  "version": "1.0.0",
  "status": "active",
  "requires_capabilities": ["system.command.execute"],
  "min_assurance": "L2",
  "evaluation_rules_version": "1.0",
  "evaluation_rules": [
    {
      "name": "command_allowlist",
      "type": "expression",
      "condition": "limits.allowed_commands.includes(context.command)",
      "deny_code": "oap.command_not_allowed",
      "description": "Command must be in allowed list"
    },
    {
      "name": "blocked_patterns",
      "type": "custom_validator",
      "validator": "validateBlockedPatterns",
      "deny_code": "oap.blocked_pattern",
      "description": "Command must not contain blocked patterns"
    }
  ],
  "required_context": {
    "type": "object",
    "required": ["command"],
    "properties": {
      "command": {
        "type": "string",
        "description": "Command to execute"
      }
    }
  },
  "cache": {
    "default_ttl_seconds": 60,
    "suspend_invalidate_seconds": 30
  }
}
```

## Security

### Key Management

### Key Management

- Ed25519 keys for all signatures
- Registry keys published at `https://api.yourdomain/.well-known/oap/jwks.json`
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
