# OAP Delegation Chains — Specification

**Status:** Working Draft  
**Version:** 1.0.0  
**Spec version:** oap/1.0  
**Last updated:** 2026-03-15  

---

## Abstract

This document specifies **OAP Delegation Chains** — the mechanism by which an AI agent holding a valid OAP passport may grant a sub-agent or downstream agent the authority to act on its behalf, within a strictly narrowed scope, up to a bounded delegation depth.

Delegation is a first-class concern in multi-agent architectures. When an orchestrator agent spawns workers, tool-calling cascades through potentially many agent boundaries. Without a formal delegation mechanism, two failure modes emerge:

1. **Scope escalation** — a sub-agent acquires capabilities that were never intended (the "confused deputy" problem)
2. **Chain opacity** — the authorizing system cannot trace which root principal authorized a downstream action, making auditability impossible

OAP Delegation Chains address both failure modes through cryptographically signed delegation tokens, mandatory scope narrowing, and a configurable depth cap.

---

## 1. Core Concepts

### 1.1 Delegation Token

A **Delegation Token** (DT) is a signed, time-bounded object that grants a **delegate** (recipient agent) a strict subset of the **delegator**'s active capabilities for a specified purpose.

Key properties:
- **Signed** by the delegator using its OAP-registered Ed25519 key
- **Scope-narrowing** — the delegate's effective capability set is the *intersection* of its own passport capabilities and the explicitly granted scope in the DT
- **Depth-limited** — each DT carries a `depth_remaining` counter that decrements with each re-delegation; when it reaches 0, re-delegation is prohibited
- **Time-bounded** — every DT has a mandatory `expires_at`; there is no `never_expires` flag for delegation tokens
- **Single-purpose** — a DT specifies a `purpose` string that documents the intended use; enforcement adapters MAY use this for logging and policy-pack filtering

### 1.2 Delegation Chain

A **Delegation Chain** is the ordered sequence of delegation tokens from a root OAP passport holder down to the currently-acting agent. Each link in the chain is a DT signed by the previous holder.

```
Root Passport (Org/User)
    └─ DT-1: delegated to AgentA (depth_cap=3, scope=[finance.read])
                └─ DT-2: AgentA re-delegates to AgentB (depth_remaining=2, scope=[finance.read])
                              └─ DT-3: AgentB re-delegates to AgentC (depth_remaining=1, scope=[finance.read])
                                            (AgentC CANNOT re-delegate — depth_remaining=0)
```

### 1.3 Scope Narrowing Rule (MUST)

When creating a DT, the delegator MUST ensure:

```
granted_capabilities ⊆ delegator.effective_capabilities
```

Where `delegator.effective_capabilities` is:
- The delegator's OAP passport capabilities, if the delegator is the root
- The capabilities in the delegator's own received DT, if the delegator is itself a delegate

Violation of this rule MUST cause the enforcement adapter to reject the DT with error code `OAP-D-001: SCOPE_EXCEEDS_DELEGATOR`.

### 1.4 Depth Cap

- The root delegator sets `depth_cap` (integer, 1–8) when issuing the first DT.
- Each re-delegation MUST set `depth_remaining = parent_dt.depth_remaining - 1`.
- A DT with `depth_remaining = 0` MUST NOT be re-delegated. Attempting to do so MUST fail with `OAP-D-003: DEPTH_EXHAUSTED`.
- **Default recommended cap:** `depth_cap = 3`. Values above 8 are implementation-defined and SHOULD require L4 assurance.

---

## 2. Delegation Token Object

### 2.1 Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `delegation_id` | UUID v4 | Unique identifier for this DT |
| `spec_version` | string | MUST be `"oap/1.0"` |
| `delegator_passport_id` | UUID v4 | Passport ID of the issuing agent |
| `delegator_agent_id` | UUID v4 | Agent ID of the issuing agent |
| `delegate_passport_id` | UUID v4 | Passport ID of the receiving agent |
| `delegate_agent_id` | UUID v4 | Agent ID of the receiving agent |
| `granted_capabilities` | array of CapabilityGrant | Capabilities granted; each is a subset of delegator's active capabilities |
| `granted_limits` | object | Per-capability limits; MUST be ≤ delegator's own limits for each capability |
| `purpose` | string (max 256 chars) | Human-readable description of the delegation's intended use |
| `depth_cap` | integer (1–8) | Maximum delegation depth from root; set only by root delegator, propagated read-only |
| `depth_remaining` | integer (0–8) | Decrements each re-delegation; 0 = cannot re-delegate |
| `created_at` | ISO 8601 | When this DT was issued |
| `expires_at` | ISO 8601 | When this DT expires; REQUIRED; no never-expires flag |
| `parent_delegation_id` | UUID v4 \| null | `null` for root delegation; parent DT's `delegation_id` for re-delegations |
| `chain_root_passport_id` | UUID v4 | Passport ID of the root principal; propagated unchanged through entire chain |
| `delegator_signature` | string | Base64url-encoded Ed25519 signature over the JCS-canonicalized DT payload (excluding `delegator_signature` field) |
| `delegator_key_id` | string | Key ID (`kid`) used to sign; resolves via delegator's `/.well-known/oap/keys.json` |

### 2.2 Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `regions` | array of string | If present, restricts delegate to a subset of delegator's authorized regions |
| `policy_packs` | array of string | If present, restricts which OAP policy packs the delegate may use |
| `revocation_endpoint` | string (URI) | URL at which this DT's revocation status may be queried |
| `metadata` | object | Arbitrary key-value annotations; not included in signed payload |

### 2.3 Example Delegation Token

```json
{
  "delegation_id": "7f3c8a1b-1e2d-4b5a-9c0e-123456789abc",
  "spec_version": "oap/1.0",
  "delegator_passport_id": "550e8400-e29b-41d4-a716-446655440000",
  "delegator_agent_id": "agt_orchestrator_001",
  "delegate_passport_id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
  "delegate_agent_id": "agt_worker_finance_01",
  "granted_capabilities": [
    {
      "id": "finance.payment.refund",
      "params": {
        "max_amount": 500,
        "currency": "USD"
      }
    }
  ],
  "granted_limits": {
    "finance.payment.refund": {
      "currency_limits": {
        "USD": {
          "max_per_tx": 500,
          "daily_cap": 2000
        }
      },
      "reason_codes": ["customer_request"],
      "idempotency_required": true
    }
  },
  "purpose": "Process refunds for open support tickets assigned in this batch run",
  "depth_cap": 3,
  "depth_remaining": 2,
  "created_at": "2026-03-15T03:00:00Z",
  "expires_at": "2026-03-15T05:00:00Z",
  "parent_delegation_id": null,
  "chain_root_passport_id": "550e8400-e29b-41d4-a716-446655440000",
  "delegator_signature": "base64url_encoded_ed25519_signature_here",
  "delegator_key_id": "oap:owner:api.example.com:key-2026-01",
  "revocation_endpoint": "https://api.aport.io/v1/delegations/7f3c8a1b-1e2d-4b5a-9c0e-123456789abc/status"
}
```

---

## 3. Signature and Verification

### 3.1 Signing

The delegator MUST sign the DT using its OAP-registered Ed25519 private key.

**Signed payload** (all fields EXCEPT `delegator_signature` and `metadata`), JCS-canonicalized per RFC 8785:

```
payload = JCS({
  delegation_id, spec_version, delegator_passport_id, delegator_agent_id,
  delegate_passport_id, delegate_agent_id, granted_capabilities, granted_limits,
  purpose, depth_cap, depth_remaining, created_at, expires_at,
  parent_delegation_id, chain_root_passport_id, delegator_key_id,
  regions?, policy_packs?, revocation_endpoint?
})

delegator_signature = base64url(Ed25519.sign(private_key, payload))
```

### 3.2 Verification Algorithm

An enforcement adapter receiving a DT (or chain of DTs) MUST execute the following:

```
function verifyDelegationChain(chain: DT[], action: ToolCall, agent_passport: Passport):
  1. ASSERT chain is ordered root-to-leaf (parent_delegation_id links form a valid chain)
  2. ASSERT chain[0].parent_delegation_id == null
  3. FOR each DT in chain:
       a. ASSERT DT.spec_version == "oap/1.0"
       b. ASSERT now() < DT.expires_at            → else OAP-D-004: DELEGATION_EXPIRED
       c. ASSERT DT.depth_remaining >= 0
       d. RESOLVE DT.delegator_key_id → public_key
       e. ASSERT Ed25519.verify(public_key, payload(DT), DT.delegator_signature)
                                                  → else OAP-D-005: INVALID_SIGNATURE
       f. IF index > 0:
            ASSERT DT.parent_delegation_id == chain[index-1].delegation_id
                                                  → else OAP-D-006: BROKEN_CHAIN
            ASSERT DT.depth_remaining == chain[index-1].depth_remaining - 1
                                                  → else OAP-D-007: DEPTH_INCONSISTENT
            ASSERT DT.granted_capabilities ⊆ chain[index-1].granted_capabilities
                                                  → else OAP-D-001: SCOPE_EXCEEDS_DELEGATOR
            ASSERT DT.granted_limits ≤ chain[index-1].granted_limits (per capability)
                                                  → else OAP-D-002: LIMITS_EXCEED_DELEGATOR
  4. ASSERT action.capability ∈ chain[last].granted_capabilities
                                                  → else OAP-D-008: ACTION_NOT_IN_SCOPE
  5. IF revocation_endpoint present:
       ASSERT DT.status != REVOKED (live check or cached < 60s)
                                                  → else OAP-D-009: DELEGATION_REVOKED
  6. RETURN ALLOW
```

### 3.3 Limit Comparison

When asserting `DT.granted_limits ≤ parent.granted_limits`, "less than or equal" means:
- Numeric values: `dt_value ≤ parent_value`
- Arrays (e.g., `reason_codes`): `dt_array ⊆ parent_array`
- Booleans: MUST NOT change `true` → `false` for security-critical flags (e.g., `idempotency_required`)

---

## 4. Re-delegation

### 4.1 When Re-delegation is Permitted

An agent holding a valid DT MAY issue a new DT (a "child DT") to a sub-agent IF:

1. `depth_remaining > 0`
2. The child DT's `granted_capabilities` are a strict subset of the parent DT's `granted_capabilities`
3. The child DT's `expires_at` ≤ the parent DT's `expires_at`
4. The child DT's `depth_remaining` = parent DT's `depth_remaining - 1`

### 4.2 Prohibited Re-delegation

Re-delegation MUST be rejected by enforcement adapters when:
- `depth_remaining == 0` → `OAP-D-003: DEPTH_EXHAUSTED`
- Child `expires_at` > parent `expires_at` → `OAP-D-010: EXPIRY_EXCEEDS_PARENT`
- Child grants capabilities not in parent → `OAP-D-001: SCOPE_EXCEEDS_DELEGATOR`

---

## 5. Integration with Policy Packs

Policy packs that perform per-action enforcement SHOULD accept a `delegation_chain` context object alongside the standard passport context:

```typescript
interface PolicyEvalContext {
  passport: OAPPassport;
  action: ToolCall;
  delegation_chain?: DelegationToken[];  // Present when agent is a delegate
}
```

When `delegation_chain` is present:
- The **effective capability set** for policy evaluation is the **intersection** of the agent's passport capabilities and the final DT's `granted_capabilities`
- Limits from the DT override passport limits where the DT is more restrictive
- The `chain_root_passport_id` SHOULD be logged as the authorizing principal in the audit trail

---

## 6. Audit Trail

Every DT-governed action MUST produce an audit record that includes:

| Field | Description |
|-------|-------------|
| `delegation_chain_ids` | Ordered array of `delegation_id`s from root to leaf |
| `chain_root_passport_id` | Root principal who ultimately authorized the action |
| `acting_agent_id` | Agent that executed the action |
| `delegation_depth` | Number of DTs in the chain |
| `effective_capability` | The capability evaluated (from final DT's granted scope) |
| `decision` | `ALLOW` or `DENY` with reason codes |

This audit trail enables forensic reconstruction: given any logged action, a reviewer can identify the root principal and every agent in the delegation chain.

---

## 7. Revocation

### 7.1 Revocation Modes

| Mode | Description | Latency |
|------|-------------|---------|
| **Immediate** | DT marked revoked at `revocation_endpoint`; all adapters must check before each action | ~0 |
| **Expiry-based** | No explicit revocation; DT becomes invalid at `expires_at` | Up to TTL |
| **Cascade** | Revoking a parent DT implicitly revokes all child DTs in the chain | Depends on mode |

### 7.2 Revocation Endpoint Protocol

If `revocation_endpoint` is present, a GET request MUST return:

```json
{
  "delegation_id": "7f3c8a1b-1e2d-4b5a-9c0e-123456789abc",
  "status": "active" | "revoked" | "expired",
  "revoked_at": "2026-03-15T04:12:00Z",    // present if status == "revoked"
  "revocation_reason": "task_complete"       // optional
}
```

Enforcement adapters MAY cache revocation responses for up to 60 seconds.

---

## 8. Error Codes

| Code | Name | Description |
|------|------|-------------|
| `OAP-D-001` | `SCOPE_EXCEEDS_DELEGATOR` | DT grants capabilities not held by delegator |
| `OAP-D-002` | `LIMITS_EXCEED_DELEGATOR` | DT grants higher limits than delegator holds |
| `OAP-D-003` | `DEPTH_EXHAUSTED` | Re-delegation attempted with `depth_remaining = 0` |
| `OAP-D-004` | `DELEGATION_EXPIRED` | DT `expires_at` is in the past |
| `OAP-D-005` | `INVALID_SIGNATURE` | Ed25519 signature verification failed |
| `OAP-D-006` | `BROKEN_CHAIN` | `parent_delegation_id` does not match expected parent |
| `OAP-D-007` | `DEPTH_INCONSISTENT` | `depth_remaining` does not equal parent's value minus 1 |
| `OAP-D-008` | `ACTION_NOT_IN_SCOPE` | Action capability not found in final DT's granted scope |
| `OAP-D-009` | `DELEGATION_REVOKED` | DT has been explicitly revoked |
| `OAP-D-010` | `EXPIRY_EXCEEDS_PARENT` | Child DT `expires_at` is later than parent DT `expires_at` |

---

## 9. Relationship to aeoess Agent Passport System

The OAP delegation model was informed by the aeoess Agent Passport System (aport-spec issue #21), which demonstrated depth-limit and scope-narrowing delegation chains with Ed25519 identity. Key alignments and divergences:

| Property | OAP Delegation | aeoess APS |
|----------|----------------|------------|
| Signature algorithm | Ed25519 | Ed25519 |
| Scope narrowing | ✅ Required (MUST) | ✅ Required |
| Depth limits | ✅ `depth_cap` + `depth_remaining` | ✅ depth-limit |
| Policy packs | ✅ 15+ named packs | ❌ Not specified |
| Framework adapters | ✅ 4 (Claude Code, Cursor, Express, FastAPI) | In development |
| Audit trail | ✅ Mandatory, chain-root attributed | Partial |
| Revocation | ✅ Endpoint-based + expiry | Expiry-based |
| Production adapters | ✅ v1.0.15+ | In development |

OAP delegation is designed to be cross-compatible with APS identity in a delegation chain — a passport issued by an APS-compatible system MAY appear as a `delegator_passport_id` if the signing key format is compatible and the chain verification algorithm can resolve the `kid`.

---

## 10. Security Considerations

### 10.1 Short-lived Tokens
Delegation tokens SHOULD have `expires_at` set to the minimum necessary duration. Recommended maximums by use case:

| Use case | Max TTL |
|----------|---------|
| Single batch job | 2 hours |
| Scheduled daily task | 24 hours |
| Long-running background agent | 7 days (requires L3+ assurance) |

### 10.2 Minimum Scope Principle
Delegators SHOULD grant only the capabilities the sub-agent strictly requires for the specified `purpose`. Capability enumeration in `granted_capabilities` MUST be explicit; wildcard grants are not supported.

### 10.3 Key Compromise
If a delegator's signing key is compromised, all DTs signed by that key MUST be revoked. Since child DTs depend on the parent chain's signature validity, a compromised delegator key invalidates the entire sub-chain below it.

### 10.4 Depth Cap Selection
- `depth_cap = 1`: Permits direct sub-agent delegation only. Recommended for financial capabilities.
- `depth_cap = 3`: Permits 3-level chains (orchestrator → worker → tool-calling sub-agent). Recommended default.
- `depth_cap > 5`: SHOULD require L4 assurance for root passport; high-depth chains are difficult to audit.

### 10.5 Delegation vs. Instance Passports
For long-running sub-agents with stable, predictable capabilities, prefer issuing an **OAP passport instance** (via the registry) rather than a delegation token. Delegation chains are optimized for ephemeral, task-scoped authority grants. Persistent sub-agents with a fixed role SHOULD hold their own passport.

---

## 11. Conformance

A system claiming OAP Delegation conformance MUST:

1. Implement the delegation token schema (Section 2) fully
2. Enforce scope narrowing on creation (Section 1.3) — reject violating tokens at issuance time
3. Enforce scope narrowing on verification (Section 3.2 step 3f) — reject violating tokens at enforcement time
4. Enforce depth limits (Sections 1.4, 4)
5. Verify Ed25519 signatures before acting on any DT (Section 3.2 step 3e)
6. Reject expired tokens (Section 3.2 step 3b)
7. Produce audit records per Section 6 for every DT-governed action

---

## Appendix A: Delegation Token JSON Schema

The normative JSON Schema for the delegation token object is published at:

```
https://github.com/aporthq/aport-spec/oap/delegation-schema.json
```

*(Schema file to be added in subsequent PR — tracked in aport-spec issue.)*

---

## Appendix B: Example — Three-Level Finance Delegation Chain

```
Root: Org passport (L4FIN, finance.payment.refund up to $50,000/day)
  DT-1 → OrchestratorAgent (depth_cap=3, depth_remaining=2, max_per_tx=$5000, daily_cap=$25000, expires in 4h)
    DT-2 → WorkerAgent (depth_remaining=1, max_per_tx=$1000, daily_cap=$5000, expires in 2h)
      DT-3 → ToolAgent (depth_remaining=0, max_per_tx=$250, daily_cap=$1000, expires in 30min)
        CANNOT re-delegate. Can execute finance.payment.refund ≤ $250/tx, $1000/day, for next 30min.
```

Each level narrows scope. ToolAgent cannot exceed its own grant even if it tries to claim the root passport's permissions. The root's `chain_root_passport_id` is propagated to every audit record, making the authorizing principal traceable.

---

*Specification authored by EngineerBot (LiftRails Inc.) · March 15, 2026*  
*Informed by: aeoess Agent Passport System (aport-spec issue #21), OAP core spec v1.0, production adapter requirements*
