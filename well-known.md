# OAP Service Discovery via `.well-known/oap/`

**Specification:** OAP v1.0
**Status:** Draft
**Last Updated:** 2026-03-09

---

## Overview

The `.well-known/oap/` URI provides a standard discovery mechanism for the Open Agent Passport (OAP) authorization layer. Any HTTP server that supports OAP-based pre-action authorization MAY expose this endpoint to allow agent frameworks, orchestration platforms, and relying parties to automatically discover its OAP configuration without prior out-of-band setup.

This specification follows the conventions established by RFC 8615 (Well-Known URIs) and mirrors the discovery patterns used by:
- OAuth 2.0 Authorization Server Metadata ([RFC 8414](https://www.rfc-editor.org/rfc/rfc8414))
- OpenID Connect Discovery 1.0
- DID Configuration ([DIF](https://identity.foundation/.well-known/resources/did-configuration/))

A IANA Well-Known URI registration for `oap` has been submitted per RFC 8615 §5.

---

## Discovery Request

A client wishing to discover OAP support for a domain sends:

```http
GET /.well-known/oap/ HTTP/1.1
Host: example.com
Accept: application/json
```

---

## Discovery Response

A server that supports OAP MUST respond with HTTP 200 and a JSON body conforming to the following schema.

### Example Response

```json
{
  "oap_version": "1.0",
  "authorization_endpoint": "https://api.example.com/oap/v1/authorize",
  "passport_endpoint": "https://api.example.com/oap/v1/passports",
  "policy_endpoint": "https://api.example.com/oap/v1/policies",
  "public_key_endpoint": "https://api.example.com/oap/v1/.well-known/jwks.json",
  "supported_policy_packs": [
    "oap:finance:v1",
    "oap:data:v1",
    "oap:comms:v1"
  ],
  "supported_assurance_levels": ["L0", "L1", "L2", "L3", "L4KYC", "L4FIN"],
  "agent_manifest_endpoint": "https://api.example.com/oap/v1/agents",
  "spec_url": "https://github.com/aporthq/aport-spec/blob/main/oap/oap-spec.md",
  "contact": "security@example.com"
}
```

### Response Field Reference

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `oap_version` | string | **REQUIRED** | OAP specification version implemented (e.g., `"1.0"`) |
| `authorization_endpoint` | URI | **REQUIRED** | Pre-action authorization endpoint. Clients submit `AuthorizationRequest` objects here. |
| `passport_endpoint` | URI | **REQUIRED** | Endpoint for retrieving and managing OAP passports. |
| `policy_endpoint` | URI | **REQUIRED** | Endpoint for retrieving and evaluating policy packs. |
| `public_key_endpoint` | URI | RECOMMENDED | JWKS endpoint for verifying OAP decision signatures. |
| `supported_policy_packs` | array of string | RECOMMENDED | URN identifiers of policy packs this server can enforce (see Capability Registry). |
| `supported_assurance_levels` | array of enum | RECOMMENDED | Assurance levels the issuer can credential and enforce: `L0`, `L1`, `L2`, `L3`, `L4KYC`, `L4FIN`. |
| `agent_manifest_endpoint` | URI | OPTIONAL | Public agent registry scoped to this domain. |
| `spec_url` | URI | OPTIONAL | Link to the OAP specification document. |
| `contact` | string | OPTIONAL | Security or operations contact (email or URL). |

---

## Sub-paths

Servers MAY serve additional resources under `.well-known/oap/`:

| Path | Content-Type | Purpose |
|------|-------------|---------|
| `/.well-known/oap/` | `application/json` | Discovery document (this spec) |
| `/.well-known/oap/jwks.json` | `application/json` | Domain-scoped JWKS (alternative to `public_key_endpoint`) |
| `/.well-known/oap/agents/` | `application/json` | Domain-scoped agent manifest (alternative to `agent_manifest_endpoint`) |

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

1. **TLS required.** The `.well-known/oap/` endpoint MUST be served over HTTPS. HTTP is not acceptable for production deployments — discovery over plaintext exposes the authorization endpoint to MITM substitution.

2. **Validate the response.** Clients MUST validate that the `authorization_endpoint` URI uses HTTPS and belongs to the expected domain or a trusted subdomain before using it.

3. **No sensitive data in discovery.** The discovery document MUST NOT contain credentials, private keys, or tenant-specific sensitive data.

4. **Cache with care.** Clients MAY cache discovery responses but SHOULD respect `Cache-Control` headers and re-fetch on authorization failures. Stale discovery responses can silently route traffic to outdated endpoints.

5. **Endpoint ownership.** The `authorization_endpoint` and `passport_endpoint` SHOULD be hosted on the same domain as `/.well-known/oap/` or on a domain explicitly controlled by the same organization.

---

## Use Cases

### 1. Agent Framework Auto-Configuration

An agent framework (e.g., LangChain, CrewAI, OpenClaw) integrating OAP enforcement discovers the authorization endpoint by resolving `/.well-known/oap/` on the target API's domain. No developer configuration required.

```typescript
// Auto-discovery in an OAP-aware agent framework
const oap = await fetch(`https://${targetDomain}/.well-known/oap/`)
  .then(r => r.json());
const decision = await fetch(oap.authorization_endpoint, {
  method: 'POST',
  body: JSON.stringify({ passport_id, action, context })
});
```

### 2. Relying Party Verification

A merchant or API gateway verifying an agent's OAP credential resolves the agent's issuer domain's `.well-known/oap/` endpoint to obtain the JWKS for signature verification — the same pattern used in JWT issuer discovery.

### 3. Multi-Agent Delegation

In a multi-agent pipeline, a sub-agent discovering the orchestrator's OAP endpoint to check delegation scope resolves `.well-known/oap/` on the orchestrator's domain.

---

## IANA Registration

A Well-Known URI registration for `oap` has been submitted to IANA per [RFC 8615 §5](https://www.rfc-editor.org/rfc/rfc8615#section-5):

- **URI Suffix:** `oap`
- **Change Controller:** Uchi Uchibeke, APort / LiftRails Inc.
- **Specification Document:** This document and `oap/oap-spec.md`
- **Status:** Pending (submitted 2026-03-09)

---

## Conformance

An implementation is conformant with this specification if:

1. It responds to `GET /.well-known/oap/ HTTP/1.1` over HTTPS.
2. The response Content-Type is `application/json`.
3. The response body contains at minimum: `oap_version`, `authorization_endpoint`, `passport_endpoint`, `policy_endpoint`.
4. All URI values in the response use HTTPS.
5. The `authorization_endpoint` accepts `AuthorizationRequest` objects as defined in [oap-spec.md](./oap/oap-spec.md).

---

## Related Specifications

- [OAP Specification v1.0](./oap/oap-spec.md)
- [Passport Schema](./oap/passport-schema.json)
- [Decision Schema](./oap/decision-schema.json)
- [Capability Registry](./oap/capability-registry.md)
- [Security Model](./oap/security.md)
- RFC 8615 — Well-Known Uniform Resource Identifiers
- RFC 8414 — OAuth 2.0 Authorization Server Metadata
