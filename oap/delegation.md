# OAP Delegation Chains — Specification

**Status:** Working Draft
**Version:** 1.0.0
**Spec version:** oap/1.0
**Last updated:** 2026-03-15

**Implementation status:** This document defines the OAP delegation-chain conformance target. Delegation chains are not currently implemented by the APort hosted verifier or published SDKs; implementations MUST NOT claim OAP Delegation conformance until they satisfy Section 11.

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
- The intersection of the delegator's OAP passport capabilities and the capabilities in the delegator's own received DT, if the delegator is itself a delegate

The same narrowing rule applies to limits, regions, and policy-pack restrictions. A delegate can only re-delegate authority that is present in both its passport and the delegation token it received.

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
| `delegator_passport_id` | string | OAP passport ID of the issuing agent |
| `delegator_agent_id` | string | Opaque agent ID of the issuing agent |
| `delegate_passport_id` | string | OAP passport ID of the receiving agent |
| `delegate_agent_id` | string | Opaque agent ID of the receiving agent |
| `granted_capabilities` | array of CapabilityGrant | Capabilities granted; each is a subset of delegator's active capabilities |
| `granted_limits` | object | Per-capability limits; MUST be ≤ delegator's own limits for each capability |
| `purpose` | string (max 256 chars) | Human-readable description of the delegation's intended use |
| `depth_cap` | integer (1–8) | Maximum delegation depth from root; set only by root delegator, propagated read-only |
| `depth_remaining` | integer (0–8) | Decrements each re-delegation; 0 = cannot re-delegate |
| `created_at` | ISO 8601 | When this DT was issued |
| `expires_at` | ISO 8601 | When this DT expires; REQUIRED; no never-expires flag |
| `parent_delegation_id` | UUID v4 \| null | `null` for root delegation; parent DT's `delegation_id` for re-delegations |
| `chain_root_passport_id` | string | OAP passport ID of the root principal; propagated unchanged through entire chain |
| `delegator_signature` | string | Base64url-encoded Ed25519 signature over the JCS-canonicalized DT payload (excluding `delegator_signature` field) |
| `delegator_key_id` | string | Key ID (`kid`) used to sign; resolves via delegator's `/.well-known/oap/jwks.json` |

### 2.2 Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `not_before` | ISO 8601 | If present, DT is not valid before this time; enforcement adapters MUST reject if `now() < not_before - CLOCK_SKEW_TOLERANCE` with error code `OAP-D-011: DELEGATION_NOT_YET_VALID` |
| `regions` | array of string | If present, restricts delegate to a subset of delegator's authorized regions |
| `policy_packs` | array of string | If present, restricts which OAP policy packs the delegate may use |
| `revocation_endpoint` | string (URI) | HTTPS URL at which this DT's revocation status may be queried. The endpoint MUST resolve to the delegator's passport-owned origin or a trusted OAP registry origin. |
| `metadata` | object | Arbitrary key-value annotations; **NOT included in signed payload**; MUST NOT affect authorization decisions; advisory only |

### 2.3 Example Delegation Token

```json
{
  "delegation_id": "7f3c8a1b-1e2d-4b5a-9c0e-123456789abc",
  "spec_version": "oap/1.0",
  "delegator_passport_id": "ap_550e8400e29b41d4a716446655440000",
  "delegator_agent_id": "agt_orchestrator_001",
  "delegate_passport_id": "ap_6ba7b8109dad11d180b400c04fd430c8",
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
  "chain_root_passport_id": "ap_550e8400e29b41d4a716446655440000",
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

An enforcement adapter receiving a DT (or chain of DTs) MUST execute the following. Implementations MUST allow a **clock skew tolerance of ±30 seconds** when evaluating `expires_at` (i.e., ASSERT `now() < expires_at + 30s`); this tolerance is a MUST to support distributed multi-agent deployments.

```
CONSTANT CLOCK_SKEW_TOLERANCE = 30  // seconds

function verifyDelegationChain(chain: DT[], action: ToolCall, agent_passport: Passport):
  1. ASSERT chain.length > 0
                                                  → else OAP-D-019: EMPTY_CHAIN
  2. ASSERT chain is ordered root-to-leaf (parent_delegation_id links form a valid chain)
  3. ASSERT chain[0].parent_delegation_id == null
  4. ASSERT chain[0].chain_root_passport_id == chain[0].delegator_passport_id
                                                  // root delegator IS the root principal
  5. RESOLVE chain[0].delegator_passport_id → root_passport
       ASSERT root_passport is active
                                                  → else OAP-D-017: PASSPORT_INACTIVE
       ASSERT chain[0].delegator_agent_id == root_passport.agent_id
                                                  → else OAP-D-013: DELEGATOR_MISMATCH
       ASSERT chain[0].granted_capabilities ⊆ root_passport.capabilities
                                                  → else OAP-D-001: SCOPE_EXCEEDS_DELEGATOR
       ASSERT limitsWithinParent(chain[0].granted_limits, root_passport.limits, chain[0].granted_capabilities)
                                                  → else OAP-D-002: LIMITS_EXCEED_DELEGATOR
       ASSERT restrictionsWithinParent(chain[0].regions, root_passport.regions)
                                                  → else OAP-D-012: RESTRICTION_EXCEEDS_DELEGATOR
       ASSERT restrictionsWithinParent(chain[0].policy_packs, root_passport.policy_packs)
                                                  → else OAP-D-012: RESTRICTION_EXCEEDS_DELEGATOR
       ASSERT chain[0].depth_remaining == chain[0].depth_cap - 1
                                                  → else OAP-D-007: DEPTH_INCONSISTENT
       effective_capabilities = chain[0].granted_capabilities
       effective_limits = inheritLimits(chain[0].granted_limits, root_passport.limits, effective_capabilities)
       effective_regions = inheritRestrictions(chain[0].regions, root_passport.regions)
       effective_policy_packs = inheritRestrictions(chain[0].policy_packs, root_passport.policy_packs)
  6. FOR each DT at index i in chain:
       a. ASSERT DT.spec_version == "oap/1.0"
       b. ASSERT now() < DT.expires_at + CLOCK_SKEW_TOLERANCE
                                                  → else OAP-D-004: DELEGATION_EXPIRED
       b2. IF DT.not_before is present:
             ASSERT now() + CLOCK_SKEW_TOLERANCE >= DT.not_before
                                                  → else OAP-D-011: DELEGATION_NOT_YET_VALID
       c. ASSERT 0 <= DT.depth_remaining <= DT.depth_cap
                                                  → else OAP-D-007: DEPTH_INCONSISTENT
       d. RESOLVE DT.delegator_key_id through DT.delegator_passport_id's JWKS or trusted registry binding → public_key
          ASSERT public_key is active and authorized for DT.delegator_passport_id
                                                  → else OAP-D-016: KEY_NOT_AUTHORIZED
       e. ASSERT Ed25519.verify(public_key, payload(DT), DT.delegator_signature)
                                                  → else OAP-D-005: INVALID_SIGNATURE
       f. IF i > 0:
            parent = chain[i-1]
            RESOLVE DT.delegator_passport_id → delegator_passport
            ASSERT delegator_passport is active
                                                  → else OAP-D-017: PASSPORT_INACTIVE
            ASSERT DT.parent_delegation_id == parent.delegation_id
                                                  → else OAP-D-006: BROKEN_CHAIN
            ASSERT DT.delegator_passport_id == parent.delegate_passport_id
            ASSERT DT.delegator_agent_id == parent.delegate_agent_id
                                                  → else OAP-D-013: DELEGATOR_MISMATCH
            ASSERT DT.depth_cap == chain[0].depth_cap
                                                  // depth_cap is immutable: propagated from root
            ASSERT DT.depth_remaining == parent.depth_remaining - 1
                                                  → else OAP-D-007: DEPTH_INCONSISTENT
            ASSERT DT.chain_root_passport_id == chain[0].chain_root_passport_id
                                                  → else OAP-D-006: BROKEN_CHAIN
            ASSERT DT.expires_at <= parent.expires_at
                                                  → else OAP-D-010: EXPIRY_EXCEEDS_PARENT
            ASSERT DT.granted_capabilities ⊆ effective_capabilities
            ASSERT DT.granted_capabilities ⊆ delegator_passport.capabilities
                                                  → else OAP-D-001: SCOPE_EXCEEDS_DELEGATOR
            ASSERT limitsWithinParent(DT.granted_limits, effective_limits, DT.granted_capabilities)
            ASSERT limitsWithinParent(DT.granted_limits, delegator_passport.limits, DT.granted_capabilities)
                                                  → else OAP-D-002: LIMITS_EXCEED_DELEGATOR
            ASSERT restrictionsWithinParent(DT.regions, effective_regions)
            ASSERT restrictionsWithinParent(DT.regions, delegator_passport.regions)
                                                  → else OAP-D-012: RESTRICTION_EXCEEDS_DELEGATOR
            ASSERT restrictionsWithinParent(DT.policy_packs, effective_policy_packs)
            ASSERT restrictionsWithinParent(DT.policy_packs, delegator_passport.policy_packs)
                                                  → else OAP-D-012: RESTRICTION_EXCEEDS_DELEGATOR
            effective_capabilities = DT.granted_capabilities
            effective_limits = inheritLimits(DT.granted_limits, effective_limits, effective_capabilities)
            effective_regions = inheritRestrictions(DT.regions, effective_regions)
            effective_policy_packs = inheritRestrictions(DT.policy_packs, effective_policy_packs)
  7. ASSERT agent_passport is active
                                                  → else OAP-D-017: PASSPORT_INACTIVE
  8. ASSERT chain[last].delegate_passport_id == agent_passport.passport_id
     ASSERT chain[last].delegate_agent_id == agent_passport.agent_id
                                                  → else OAP-D-014: DELEGATE_MISMATCH
  9. ASSERT action.capability ∈ agent_passport.capabilities
     ASSERT action.capability ∈ effective_capabilities
                                                  → else OAP-D-008: ACTION_NOT_IN_SCOPE
  10. ASSERT limitsPermitAction(action, effective_limits)
                                                  → else OAP-D-018: ACTION_EXCEEDS_LIMITS
  11. ASSERT action.region ∈ effective_regions, if action.region and effective_regions are present
     ASSERT action.policy_pack ∈ effective_policy_packs, if action.policy_pack and effective_policy_packs are present
                                                  → else OAP-D-012: RESTRICTION_EXCEEDS_DELEGATOR
  12. FOR each DT in chain WHERE DT.revocation_endpoint is present:
       ASSERT isTrustedRevocationEndpoint(DT.revocation_endpoint, DT.delegator_passport_id)
                                                  → else OAP-D-015: UNSAFE_REVOCATION_ENDPOINT
       ASSERT fetchRevocationStatus(DT, cache_ttl=60s) != "revoked"
                                                  → else OAP-D-009: DELEGATION_REVOKED
       // Note: cascade revocation is enforced here — checking ALL tokens in chain,
       // not just the leaf. Revoking a parent revokes the sub-chain via this check.
  13. RETURN ALLOW
```

`isTrustedRevocationEndpoint` MUST reject non-HTTPS URLs, loopback/private/link-local hosts, cloud-metadata hosts, and any endpoint whose origin is not either the delegator's passport-owned origin or a trusted OAP registry origin.

`limitsPermitAction(action, effective_limits)` MUST apply the policy-pack's normal limit checks to the requested action parameters using the inherited effective limits. Capability membership alone is not sufficient for `ALLOW`: numeric caps, allowlists, idempotency requirements, path restrictions, method/domain restrictions, and other bounded limit fields remain enforceable at the leaf action.

**Note on cascade revocation:** Step 12 checks all tokens in the chain for revocation, not just the leaf. This ensures that revoking a parent DT (by marking it revoked at its `revocation_endpoint`) automatically blocks all sub-chain actions, even though child signatures remain cryptographically valid. This is a policy-layer mechanism, not a cryptographic one.

**Note on metadata:** `metadata` fields are unsigned and MUST NOT affect authorization decisions. Enforcement adapters MUST ignore metadata when evaluating ALLOW/DENY.

### 3.3 Limit Comparison — `limitsWithinParent(child, parent, granted_capabilities)`

The `limitsWithinParent` function MUST implement the following recursive deep-comparison algorithm:

```
function limitsWithinParent(child_limits: object, parent_limits: object, granted_capabilities: CapabilityGrant[]) -> boolean:
  // Empty child limits are safe only if the verifier inherits the parent's
  // effective limits for every granted capability.
  IF child_limits == null OR keys(child_limits).length == 0:
    RETURN true  // callers MUST use inheritLimits() before policy evaluation
  // Edge case: parent has no limits but child claims some → reject
  IF parent_limits == null OR keys(parent_limits).length == 0:
    RETURN false
  FOR each capability_id in keys(child_limits):
    IF capability_id NOT IN parent_limits:
      RETURN false  // child claims a limit key the parent doesn't have → reject
    child_cap = child_limits[capability_id]
    parent_cap = parent_limits[capability_id]
    IF NOT capabilityLimitsLE(child_cap, parent_cap):
      RETURN false
  RETURN true

function capabilityLimitsLE(child: object, parent: object) -> boolean:
  FOR each field in keys(child):
    child_val = child[field]
    parent_val = parent[field]  // if missing in parent, treat as unbounded
    SWITCH typeof(child_val):
      CASE number:
        IF child_val > parent_val: RETURN false
      CASE array:                   // e.g., reason_codes
        IF NOT (child_val ⊆ parent_val): RETURN false
      CASE boolean:
        // Security-hardening flags: MUST NOT be relaxed (true → false is prohibited)
        // Example: idempotency_required = true in parent MUST remain true in child
        IF parent_val == true AND child_val == false: RETURN false
      CASE object:
        IF NOT capabilityLimitsLE(child_val, parent_val): RETURN false  // recurse
  RETURN true
```

`inheritLimits(child, parent, granted_capabilities)` MUST carry forward each parent limit for a granted capability unless the child supplies a stricter value. A child DT that omits `granted_limits` never erases a parent's transaction caps, daily caps, idempotency requirements, allowed paths, or other bounded restrictions.

When `parent_val` is absent for a given field, the child's value is unconstrained by that field; no rejection occurs. Implementations MAY add additional domain-specific comparison rules in extension fields prefixed with `x-`.

`restrictionsWithinParent(child, parent)` MUST return true when `child` is omitted, when `parent` is omitted or empty (unbounded), or when every value in `child` is present in `parent`. Omitted child `regions` or `policy_packs` inherit the parent's effective values; omission never widens access.

---

## 4. Re-delegation

### 4.1 When Re-delegation is Permitted

An agent holding a valid DT MAY issue a new DT (a "child DT") to a sub-agent IF:

1. `depth_remaining > 0`
2. The child DT's `delegator_passport_id` and `delegator_agent_id` equal the parent DT's `delegate_passport_id` and `delegate_agent_id`
3. The child DT's `granted_capabilities` are a subset of both the parent DT's effective capabilities and the delegator's own active passport capabilities
4. The child DT's `granted_limits` are inherited from or stricter than both the parent DT's effective limits and the delegator's own active passport limits
5. The child DT's `regions`, if present, are a subset of the parent DT's effective regions and the delegator's own authorized regions
6. The child DT's `policy_packs`, if present, are a subset of the parent DT's effective policy packs and the delegator's own authorized policy packs
7. Omitted child `granted_limits`, `regions`, or `policy_packs` inherit the parent's effective restrictions; omission MUST NOT widen access
8. The child DT's `expires_at` ≤ the parent DT's `expires_at`
9. The child DT's `depth_remaining` **MUST equal** `parent_dt.depth_remaining - 1` (constraint, not assignment)
10. The child DT's `depth_cap` **MUST equal** `parent_dt.depth_cap` (`depth_cap` is read-only once set by root)
11. The child DT's `chain_root_passport_id` **MUST equal** `parent_dt.chain_root_passport_id`

### 4.2 Prohibited Re-delegation

Re-delegation MUST be rejected by enforcement adapters when:
- `depth_remaining == 0` → `OAP-D-003: DEPTH_EXHAUSTED`
- Child `expires_at` > parent `expires_at` → `OAP-D-010: EXPIRY_EXCEEDS_PARENT`
- Child grants capabilities not in parent → `OAP-D-001: SCOPE_EXCEEDS_DELEGATOR`
- Child is issued by any passport other than the parent DT's delegate → `OAP-D-013: DELEGATOR_MISMATCH`
- Child widens inherited regions or policy packs → `OAP-D-012: RESTRICTION_EXCEEDS_DELEGATOR`

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
- Limits from the chain are inherited from parent tokens and override passport limits only where the chain value is more restrictive
- Region and policy-pack restrictions from parent tokens remain in force unless narrowed by a child token
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
| `OAP-D-001` | `SCOPE_EXCEEDS_DELEGATOR` | DT grants capabilities not held by delegator; the set `granted_capabilities ⊄ delegator.effective_capabilities` |
| `OAP-D-002` | `LIMITS_EXCEED_DELEGATOR` | DT grants limits that are less restrictive than the delegator's own limits (numeric value is higher, array set is larger, or a security-hardening boolean is relaxed) |
| `OAP-D-003` | `DEPTH_EXHAUSTED` | Re-delegation attempted with `depth_remaining = 0` |
| `OAP-D-004` | `DELEGATION_EXPIRED` | DT `expires_at` is in the past (accounting for clock skew tolerance) |
| `OAP-D-005` | `INVALID_SIGNATURE` | Ed25519 signature verification failed |
| `OAP-D-006` | `BROKEN_CHAIN` | `parent_delegation_id` does not match expected parent, or `chain_root_passport_id` is inconsistent across the chain |
| `OAP-D-007` | `DEPTH_INCONSISTENT` | `depth_remaining` does not equal `parent.depth_remaining - 1`, or `depth_remaining` is outside `[0, depth_cap]` |
| `OAP-D-008` | `ACTION_NOT_IN_SCOPE` | Action capability not found in final DT's granted scope |
| `OAP-D-009` | `DELEGATION_REVOKED` | DT has been explicitly revoked at its `revocation_endpoint` |
| `OAP-D-010` | `EXPIRY_EXCEEDS_PARENT` | Child DT `expires_at` is later than parent DT `expires_at` |
| `OAP-D-011` | `DELEGATION_NOT_YET_VALID` | Current time is before DT's `not_before` timestamp (accounting for clock skew tolerance) |
| `OAP-D-012` | `RESTRICTION_EXCEEDS_DELEGATOR` | DT widens parent or passport region or policy-pack restrictions |
| `OAP-D-013` | `DELEGATOR_MISMATCH` | Child DT issuer does not match the preceding DT's delegate identity |
| `OAP-D-014` | `DELEGATE_MISMATCH` | Leaf DT recipient does not match the acting passport |
| `OAP-D-015` | `UNSAFE_REVOCATION_ENDPOINT` | DT revocation endpoint is not HTTPS or is not bound to a trusted passport-owned or registry origin |
| `OAP-D-016` | `KEY_NOT_AUTHORIZED` | Delegator key is not active or not registered to the claimed delegator passport |
| `OAP-D-017` | `PASSPORT_INACTIVE` | Root, intermediate, or acting leaf passport is suspended, revoked, expired, or otherwise inactive |
| `OAP-D-018` | `ACTION_EXCEEDS_LIMITS` | Requested action parameters exceed the inherited effective limits |
| `OAP-D-019` | `EMPTY_CHAIN` | Delegation verification received an empty chain |

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
| Production adapters | Not yet implemented in hosted verifier or SDKs | In development |

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
3. Enforce scope narrowing on verification (Section 3.2) — reject violating tokens at enforcement time
4. Enforce depth limits (Sections 1.4, 4)
5. Verify Ed25519 signatures before acting on any DT (Section 3.2)
6. Reject expired tokens (Section 3.2)
7. Produce audit records per Section 6 for every DT-governed action
8. Bind every child DT issuer to the preceding DT's delegate identity
9. Bind the leaf DT recipient to the acting passport
10. Inherit parent limits, regions, and policy-pack restrictions unless explicitly narrowed
11. Reject unsafe revocation endpoints before any network fetch
12. Resolve every signing key through the claimed delegator passport or a trusted registry binding
13. Reject inactive root, intermediate, and acting leaf passports
14. Evaluate requested action parameters against inherited effective limits
15. Reject empty delegation chains as a defined denial, not an implementation exception

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
