# OAP Service Discovery via `.well-known/oap/`

**Specification:** OAP v1.0
**Status:** Draft
**Last Updated:** 2026-03-26

---

## Overview

The `.well-known/oap/` URI provides a standard discovery mechanism for the Open Agent Passport (OAP) authorization layer. Any HTTP server that supports OAP-based pre-action authorization MAY expose this endpoint to allow agent frameworks, orchestration platforms, and relying parties to automatically discover its OAP configuration without prior out-of-band setup.

This specification follows the conventions established by RFC 8615 (Well-Known URIs) and mirrors the discovery patterns used by:
- OAuth 2.0 Authorization Server Metadata ([RFC 8414](https://www.rfc-editor.org/rfc/rfc8414))
- OpenID Connect Discovery 1.0
- DIF Well-Known DID Configuration ([DIF](https://identity.foundation/.well-known/resources/did-configuration/))

---

## Discovery Request

A client wishing to discover OAP support for a domain sends:

```http
GET /.well-known/oap/ HTTP/1.1
Host: example.com
Accept: application/json
```

Servers MUST accept requests both with and without a trailing slash (`/.well-known/oap` and `/.well-known/oap/`). Servers MAY redirect one form to the other using HTTP 301, but MUST NOT return 404 for either form.

---

## Discovery Response

A server that supports OAP MUST respond with HTTP 200 and a JSON body conforming to the schema defined in [`well-known-schema.json`](./oap/well-known-schema.json).

### Example Response

```json
{
  "oap_version": "1.0",
  "authorization_endpoint": "https://api.example.com/api/verify/{agent_id}",
  "passport_endpoint": "https://api.example.com/api/passports/{agent_id}",
  "policy_endpoint": "https://api.example.com/api/policies/{policy_name}",
  "decision_endpoint": "https://api.example.com/api/verify/decisions/get/{decision_id}",
  "jwks_uri": "https://api.example.com/.well-known/oap/jwks.json",
  "supported_capabilities": [
    "finance.payment.refund",
    "finance.payment.charge",
    "data.export.create",
    "messaging.message.send"
  ],
  "supported_assurance_levels": ["L0", "L1", "L2", "L3", "L4KYC", "L4FIN"],
  "spec_uri": "https://github.com/aporthq/aport-spec/blob/main/oap/oap-spec.md",
  "contact": "security@example.com"
}
```

### Response Field Reference

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `oap_version` | string | **REQUIRED** | OAP specification version implemented (e.g., `"1.0"`). |
| `authorization_endpoint` | URI template | **REQUIRED** | Passport verification endpoint. Accepts `GET` with an `{agent_id}` path parameter. Returns the passport with capabilities and assurance level. Equivalent to the OAP "evaluate" flow entry point. |
| `passport_endpoint` | URI template | **REQUIRED** | Endpoint for retrieving and managing OAP passports. |
| `policy_endpoint` | URI template | **REQUIRED** | Endpoint for retrieving policy packs by name. Accepts `{policy_name}` in dot-separated format (e.g., `finance.payment.refund.v1`). |
| `decision_endpoint` | URI template | RECOMMENDED | Endpoint for retrieving individual authorization decisions by `{decision_id}`. |
| `jwks_uri` | URI | RECOMMENDED | JWKS endpoint (RFC 7517) for verifying OAP decision and VC signatures. MUST point to `/.well-known/oap/jwks.json` on the same domain or a domain controlled by the same organization. |
| `supported_capabilities` | array of string | RECOMMENDED | Dot-separated capability identifiers this server can enforce (see [Capability Registry](./oap/capability-registry.md)). Format: `category.subcategory.action` (e.g., `finance.payment.refund`). |
| `supported_assurance_levels` | array of enum | RECOMMENDED | Assurance levels the issuer can credential and enforce. Valid values: `L0` (self-attested), `L1` (email verified), `L2` (GitHub verified), `L3` (domain verified), `L4KYC` (KYC/KYB verified), `L4FIN` (financial data verified). |
| `agent_manifest_endpoint` | URI | OPTIONAL | Public agent registry scoped to this domain. |
| `spec_uri` | URI | OPTIONAL | Link to the OAP specification document. |
| `contact` | string | OPTIONAL | Security or operations contact (email or URL). |

### Field Naming Conventions

- Endpoint fields that accept path parameters use the `_endpoint` suffix and URI template syntax (`{param}`).
- The `jwks_uri` field follows the naming convention established by OpenID Connect Discovery (section 3) and OAuth 2.0 Authorization Server Metadata (RFC 8414, section 2).

---

## Sub-paths

Servers MAY serve additional resources under `.well-known/oap/`:

| Path | Content-Type | Purpose |
|------|-------------|---------|
| `/.well-known/oap/` | `application/json` | Discovery document (this spec) |
| `/.well-known/oap/jwks.json` | `application/json` | Domain-scoped JWKS (RFC 7517) for signature verification |
| `/.well-known/oap/agents/` | `application/json` | Domain-scoped agent manifest |

The `jwks_uri` field in the discovery document and the `/.well-known/oap/jwks.json` sub-path MUST resolve to the same key set. Servers SHOULD NOT serve keys at other paths to avoid ambiguity.

---

## Error Responses

If a server does not implement OAP, it SHOULD return HTTP 404.

Servers that wish to explicitly signal non-support MAY return HTTP 404 with:

```json
{
  "error": "oap_not_supported",
  "error_description": "This server does not implement OAP authorization."
}
```

Servers that are temporarily unavailable SHOULD return HTTP 503.

---

## Security Considerations

1. **TLS required.** The `/.well-known/oap/` endpoint MUST be served over HTTPS. HTTP is not acceptable for production deployments — discovery over plaintext exposes the authorization endpoint to MITM substitution.

2. **Validate the response.** Clients MUST validate that all URI values in the discovery document use HTTPS and belong to the expected domain or a trusted subdomain before using them.

3. **No sensitive data in discovery.** The discovery document MUST NOT contain credentials, private keys, or tenant-specific sensitive data.

4. **Cache with care.** Clients MAY cache discovery responses but SHOULD respect `Cache-Control` headers and re-fetch on authorization failures. Stale discovery responses can silently route traffic to outdated endpoints.

5. **Endpoint ownership.** All endpoint URIs SHOULD be hosted on the same domain as `/.well-known/oap/` or on a domain explicitly controlled by the same organization. Clients SHOULD reject endpoints that point to unrelated domains.

---

## Use Cases

### 1. Agent Framework Auto-Configuration

An agent framework (e.g., LangChain, CrewAI) integrating OAP enforcement discovers the authorization endpoint by resolving `/.well-known/oap/` on the target API's domain. No developer configuration required.

```typescript
// Auto-discovery in an OAP-aware agent framework
const oap = await fetch(`https://${targetDomain}/.well-known/oap/`)
  .then(r => r.json());

// Verify agent passport before action
const passport = await fetch(
  oap.authorization_endpoint.replace('{agent_id}', agentId)
).then(r => r.json());

if (passport.status === 'active') {
  // Agent is verified — proceed with action
}
```

### 2. Relying Party Verification

A merchant or API gateway verifying an agent's OAP credential resolves the agent's issuer domain's `/.well-known/oap/` endpoint to obtain the JWKS for signature verification — the same pattern used in JWT issuer discovery.

```typescript
// Fetch issuer's JWKS for signature verification
const oap = await fetch(`https://${issuerDomain}/.well-known/oap/`).then(r => r.json());
const jwks = await fetch(oap.jwks_uri).then(r => r.json());
const verified = verifyDecisionSignature(decision, jwks);
```

### 3. Multi-Agent Delegation

In a multi-agent pipeline, a sub-agent discovering the orchestrator's OAP endpoint to check delegation scope resolves `/.well-known/oap/` on the orchestrator's domain.

---

## IANA Considerations

A Well-Known URI registration for `oap` is planned per [RFC 8615 section 5](https://www.rfc-editor.org/rfc/rfc8615#section-5):

- **URI Suffix:** `oap`
- **Change Controller:** APort / LiftRails Inc.
- **Specification Document:** This document and [oap-spec.md](./oap/oap-spec.md)
- **Status:** Planned

Registration will be submitted once this specification reaches a stable draft.

---

## Conformance

An implementation is conformant with this specification if:

1. It responds to `GET /.well-known/oap/` over HTTPS with HTTP 200.
2. It accepts requests both with and without a trailing slash.
3. The response `Content-Type` is `application/json`.
4. The response body contains at minimum: `oap_version`, `authorization_endpoint`, `passport_endpoint`, `policy_endpoint`.
5. All URI values in the response use HTTPS.
6. Capability identifiers in `supported_capabilities` use dot-separated format matching the [Capability Registry](./oap/capability-registry.md).
7. If `jwks_uri` is present, it resolves to a valid JWK Set (RFC 7517) containing Ed25519 public keys.

---

## Related Specifications

- [OAP Specification v1.0](./oap/oap-spec.md)
- [Passport Schema](./oap/passport-schema.json)
- [Decision Schema](./oap/decision-schema.json)
- [Capability Registry](./oap/capability-registry.md)
- [Security Model](./oap/security.md)
- RFC 7517 — JSON Web Key (JWK)
- RFC 8615 — Well-Known Uniform Resource Identifiers
- RFC 8414 — OAuth 2.0 Authorization Server Metadata
- OpenID Connect Discovery 1.0
