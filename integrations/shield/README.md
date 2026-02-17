# SHIELD Integration (Draft)

_Last updated: 2026-02-17_

## Overview

**SHIELD.md** ([canonical spec](https://nova-hunting.github.io/shield.md/)) defines a structured threat feed for AI agents: threat entries with id, fingerprint, category, severity, confidence, action, and `recommendation_agent` matching logic. Enforcement is exactly one of `log`, `require_approval`, or `block`. Version 0 is context-loaded (advisory); [v1 keeps the same threat shape and moves enforcement outside the LLM](https://nova-hunting.github.io/shield.md/#upgrade).

**Open Agent Passport (OAP) v1.0** ([spec](../../oap/oap-spec.md)) provides the runtime authorization layer SHIELD v1 envisions:
- Passports (W3C VC/DID-aligned) describe agent capabilities and limits.
- Policy packs define evaluation rules; **limits** (e.g. allowlists, blocked patterns, threat data) live in the **passport** under `limits.{capability}`.
- APort guardrails evaluate policy packs against passport + context and enforce deterministically (e.g. `before_tool_call` in OpenClaw).

This integration treats **SHIELD threat intelligence as an input to OAP**: SHIELD content (whether from community feeds or user-defined `shield.md` rules) is imported into OAP policy packs and passport limits so the same deterministic, signed enforcement applies.

**OAP is the authorization standard. SHIELD is threat intelligence.**

- **SHIELD:** A format for threat definitions. Content can be **feeds** (community- or vendor-curated lists you import) or **user-defined rules** (a `shield.md` your team authors). Either way it’s easy for security teams to maintain.
- **OAP:** W3C-compliant authorization (crypto signatures, audit trails)
- **This adapter:** Translates SHIELD → OAP for deterministic enforcement

**Analogy:** SHIELD is like a CVE database (or your own rule set in that format); OAP is the firewall that enforces rules based on that intel. This adapter is the import layer.

See [_plan/execution/openclaw/SHIELD_POWER_ANALYSIS_CORRECTED.md](../../../_plan/execution/openclaw/SHIELD_POWER_ANALYSIS_CORRECTED.md).

## Goals

- **Spec alignment:** Map the [canonical SHIELD v0/v1](https://nova-hunting.github.io/shield.md/) threat model onto OAP: passport `limits.{capability}.shield` and policy pack `evaluation_rules`.
- **Importer tooling:** CLI to ingest `shield.md` and emit (1) a limits fragment for passports and (2) policy pack updates (e.g. a SHIELD evaluation rule) so guardrails can enforce without hand-editing JSON.
- **Confidence semantics:** Preserve SHIELD’s rule: ≥0.85 confidence → enforce as-is; &lt;0.85 → treat as `require_approval` unless action is `block` and severity is `critical`.
- **Multi-source feeds:** SHIELD alongside ClawMoat, CVE, and custom rules, all under the same OAP schema and enforcement.

## SHIELD v0 Reference (canonical)

- **Scopes:** `prompt`, `skill.install`, `skill.execute`, `tool.call`, `network.egress`, `secrets.read`, `mcp`
- **Threat categories:** `prompt`, `tool`, `mcp`, `memory`, `supply_chain`, `vulnerability`, `fraud`, `policy_bypass`, `anomaly`, `skill`, `other`
- **Actions:** `log` | `require_approval` | `block` (only these three)
- **Eligibility:** threat is eligible only if `revoked` is false, `revoked_at` is null, and current time is before `expires_at`
- **Decision block:** Before gated events, emit a decision with `action`, `scope`, `threat_id`, `fingerprint`, `matched_on`, `match_value`, `reason`
- **Block response (exact):** `Blocked. Threat matched: <threat_id>. Match: <matched_on>=<match_value>.`
- **recommendation_agent (v0):** Case-sensitive directives `BLOCK:`, `APPROVE:`, `LOG:` with conditions: skill name equals/contains, outbound request to domain/url, secrets read path equals, file path equals; operator OR. Normalization: domains lowercase, no trailing dot; URLs prefix match.

## Scope → OAP capability mapping

| SHIELD scope        | OAP capability / policy pack (example) | Implemented in adapter |
|---------------------|----------------------------------------|-------------------------|
| `prompt`            | e.g. `prompt.guardrail`                | No (OAP supports when policy pack exists) |
| `skill.install`     | Skill policy                           | No |
| `skill.execute`     | Skill policy                           | No |
| `tool.call`         | `system.command.execute` ([policy](../../../policies/system.command.execute.v1/policy.json)) | **Yes** |
| `network.egress`    | Network policy                         | No |
| `secrets.read`      | Secrets policy                         | No |
| `mcp`               | `mcp.tool.execute` ([policy](../../../policies/mcp.tool.execute.v1/policy.json)) | No (OAP supports; adapter can be extended) |

When importing, `threat.category` and SHIELD scope determine which OAP capability (and thus which policy pack and `limits.{capability}`) the threat is attached to. Each capability already has its own policy pack (e.g. `system.command.execute.v1` → `policies/system.command.execute.v1/policy.json`). We do not create new policy files per scope; **within each existing policy pack, we embed SHIELD threats under `limits.{capability}.shield`** (passport limits for that capability).

## Strategy for multiple SHIELD scopes

**Why doesn’t the adapter support every scope today?** Each SHIELD scope has different **context** and **recommendation_agent** conditions:

- `tool.call` → context: command, args; conditions: “command contains X” → we map to `blocked_patterns` and an OAP policy for `system.command.execute`.
- `mcp` → context: server, tool; conditions: domain/url, skill name, etc. → would need a different limits shape and policy pack (e.g. `mcp.tool.execute`).
- `skill.execute` → context: skill name, etc.; conditions: “skill name equals/contains” → would need a skill policy pack and condition parser.
- `network.egress`, `secrets.read`, `prompt` → each has its own context and conditions in the [SHIELD spec](https://nova-hunting.github.io/shield.md/).

**Do we have to implement each scope manually?** Yes. Adding a scope means: (1) **scope → OAP capability** (and policy pack shape), (2) **parsing that scope’s recommendation_agent conditions** (e.g. “skill name contains X” → limits or conditions), (3) **outputting the right policy + limits** for that capability. The adapter is a reference implementation; each scope is a small, well-defined addition (new template + condition parser).

**Generated on the fly vs stored in policies/?** The adapter **generates** policy and limits on the fly from `shield.md`; nothing is hardcoded in the repo as the only source. For scopes that already have an APort policy pack (e.g. `policies/system.command.execute.v1/`, `policies/mcp.tool.execute.v1/`), we reuse that **shape** (required_context, evaluation_rules) in the adapter so the output is verifier-compatible. Each capability already maps to its policy pack; we embed SHIELD threats inside those packs under limits.{capability}.shield. So: **each SHIELD scope becomes an OAP policy (capability + rules); that policy is generated by the adapter from the feed, not stored as a static file.** The existing `policies/*` in the repo are canonical shapes the adapter can mirror; they are not required to exist for the adapter to emit a valid pack for a new scope.

## Field mapping (SHIELD → OAP)

Each OAP capability already has its own policy pack (e.g. `policies/system.command.execute.v1/policy.json`). SHIELD threat fields are stored under **passport limits** at `limits.{capability}.shield.threats[]` for that capability - i.e. within each existing policy pack’s limits, we embed SHIELD under `limits.{capability}.shield`; we do not create new policy files per scope. The **policy pack** adds an evaluation rule (e.g. type `shield` or custom_validator `validateShieldThreats`) that reads this structure and enforces SHIELD semantics.

| SHIELD field (v0)     | OAP placement (passport limits)                    | Notes |
|----------------------|-----------------------------------------------------|-------|
| `id`                 | `limits.{capability}.shield.threats[].id`           | Prefixed `shield_` to avoid collisions (e.g. `shield_T001`). |
| `fingerprint`        | `limits.{capability}.shield.threats[].fingerprint` | Optional; dedup and audit. |
| `category`           | `limits.{capability}.shield.threats[].category`      | Must align with SHIELD categories; used for scope matching. |
| `severity`           | `limits.{capability}.shield.threats[].severity`     | Drives priority when multiple threats match. |
| `confidence`         | `limits.{capability}.shield.threats[].confidence`   | ≥0.85 → enforce; &lt;0.85 → require_approval unless block+critical. |
| `action`             | `limits.{capability}.shield.threats[].action`       | `log` \| `require_approval` \| `block`. |
| `title`              | `limits.{capability}.shield.threats[].title`       | Short label; optional `description` for body. |
| `recommendation_agent` | `limits.{capability}.shield.threats[].recommendation_agent` or parsed into `conditions` | BLOCK/APPROVE/LOG + conditions; see below. |
| `expires_at`         | `limits.{capability}.shield.threats[].expires_at`   | Omit or mark inactive when expired. |
| `revoked` / `revoked_at` | `limits.{capability}.shield.threats[].revoked` (and optional `revoked_at`) | Exclude revoked threats from evaluation. |

### recommendation_agent → conditions

SHIELD v0 conditions map to structured conditions used by the guardrail:

- **skill name equals &lt;value&gt;** → e.g. `conditions.skill.equals` or `conditions.skill.name`
- **skill name contains &lt;value&gt;** → e.g. `conditions.skill.contains`
- **outbound request to &lt;domain&gt;** → e.g. `conditions.domain` (normalized: lowercase, no trailing dot)
- **outbound request to &lt;url_prefix&gt;** → e.g. `conditions.url_prefix`
- **secrets read path equals &lt;value&gt;** → e.g. `conditions.secret.path`
- **file path equals &lt;value&gt;** → e.g. `conditions.file.path`

BLOCK → enforce as block; APPROVE → require_approval; LOG → log. Multiple conditions may be combined with OR as in the spec.

### Resulting passport limits shape (per capability)

Imported SHIELD threats for a given capability live under the passport’s limits, e.g. for `system.command.execute`:

```json
{
  "limits": {
    "system.command.execute": {
      "allowed_commands": ["npm", "node", "git"],
      "blocked_patterns": ["rm -rf", "sudo"],
      "max_execution_time": 300,
      "shield": {
        "threats": [
          {
            "id": "shield_T001",
            "fingerprint": "optional-hash",
            "category": "tool",
            "severity": "critical",
            "confidence": 0.97,
            "action": "block",
            "title": "Destructive shell commands",
            "recommendation_agent": "BLOCK: command contains rm -rf OR command contains sudo",
            "conditions": {
              "patterns": { "blocked": ["rm -rf", "sudo"] }
            },
            "description": "Block destructive shell commands",
            "expires_at": null,
            "revoked": false
          }
        ]
      }
    }
  }
}
```

Policy packs that support SHIELD add an evaluation rule that:
1. Reads `limits.{capability}.shield.threats` (for the capability the policy governs).
2. Filters to eligible threats (not revoked, not expired).
3. Matches using `recommendation_agent` / conditions first, then explicit string match; applies confidence downgrade rule; resolves multiple matches as block &gt; require_approval &gt; log.
4. For deny: returns OAP deny with a reason that follows SHIELD’s block format where applicable: `Blocked. Threat matched: <id>. Match: <matched_on>=<match_value>.`

Example evaluation rule in the **policy pack** (conceptual; OAP today supports `expression` and `custom_validator` - either add `type: "shield"` or implement as a custom_validator such as `validateShieldThreats`):

```json
{
  "name": "shield_enforcement",
  "type": "shield",
  "shield_ref": "limits.system.command.execute.shield",
  "deny_code": "oap.shield_blocked",
  "description": "Evaluate SHIELD threats for this capability"
}
```

Expression rules in OAP have access to `passport`, `context`, and `limits`; a SHIELD rule would use `limits.system.command.execute.shield` (or the capability implied by the policy).

### Confidence downgrade logic

Same as SHIELD v0:

```javascript
const shouldEnforce = threat.confidence >= 0.85 || (threat.action === "block" && threat.severity === "critical");
const effectiveAction = shouldEnforce ? threat.action : "require_approval";
```

## Implementation vs canonical SHIELD spec

The [canonical SHIELD v0 spec](https://nova-hunting.github.io/shield.md/) defines scopes, threat fields, enforcement states, decision block format, and `recommendation_agent` syntax. This integration implements the following:

| Spec element | Implemented | Notes |
|--------------|-------------|--------|
| **Scope** | `tool.call` only | Adapter outputs policy + limits for `system.command.execute`. Other scopes (prompt, skill.install, skill.execute, network.egress, secrets.read, mcp) are not yet implemented in the adapter; OAP supports them when corresponding policy packs exist. |
| **Active threats (compressed)** | Yes | Parsed: id, fingerprint, category, severity, confidence, action, title, recommendation_agent, expires_at, revoked. |
| **Match eligibility** | Partially | Revoked threats excluded in adapter. Evaluator can filter by expires_at and apply confidence threshold. |
| **Confidence threshold** | In evaluator | ≥0.85 enforce; &lt;0.85 → require_approval unless block+critical. Can be applied when evaluating `limits.{capability}.shield.threats`. |
| **Enforcement states** | Yes | log, require_approval, block; BLOCK/APPROVE/LOG in recommendation_agent. |
| **recommendation_agent** | Subset | **Implemented:** BLOCK/APPROVE with “command contains X” (and OR) for tool scope. **Not yet:** skill name equals/contains, outbound request to domain/url, secrets read path, file path. |
| **Block response format** | Optional | Spec requires exact: `Blocked. Threat matched: <threat_id>. Match: <matched_on>=<match_value>.` OAP deny reason can follow this when using a SHIELD-specific evaluator. |
| **Decision block** | Via OAP | SHIELD’s DECISION block (action, scope, threat_id, …) is reflected in OAP’s allow/deny decision + reasons; scope maps to capability. |

## Alignment with OpenClaw and APort spec

- **[OpenClaw #12385](https://github.com/openclaw/openclaw/issues/12385)** – Adds an optional SHIELD policy layer that runs **before** sensitive events (skill install/execute, tool call, MCP, network, secrets). Our adapter produces the OAP policy pack and limits fragment that a guardrail uses to enforce that layer; the “before_tool_call” (and other gates) call the same OAP verifier. So: **this repo = SHIELD → OAP import; OpenClaw = where that OAP policy is enforced at runtime** (e.g. before_tool_call). **To point the thread here:** post the drafted reply in [ISSUE_REPLY_DRAFT.md](ISSUE_REPLY_DRAFT.md) as a comment on the issue.
- **[aporthq/aport-spec discussion #19](https://github.com/aporthq/aport-spec/discussions/19)** – Proposes SHIELD threat intelligence import into OAP policy packs, CLI `shield-to-oap`, and multi-source threat intel. This adapter is the reference implementation of that import path; field mapping and `limits.{capability}.shield` shape align with the discussion. **Next steps:** post the summary in [DISCUSSION_SUMMARY.md](DISCUSSION_SUMMARY.md) to the discussion, gather feedback, and link the public discussion from this README once it's live.

APort **supports** policy-in-body verify and the full OAP stack today; the “future” piece is only optional **packaging** of the adapter as `npx @aporthq/agent-guardrails shield import shield.md` for distribution.

## Reference adapter

**CLI status:** The packaged CLI (`npx @aporthq/agent-guardrails shield import shield.md`) is **not yet released - CLI implementation in progress.** Use the in-repo script below until it ships.

The reference implementation lives in **`adapters/`**:

- **[adapters/index.js](adapters/index.js)** – Imports each scope adapter, exposes `convert(shieldPath)`, and doubles as a script: `node adapters/index.js [shield.md]` outputs JSON (policy, limitsFragment, threats). Default input: `test/shield.md`.
- **Current scope:** **tool.call** → [adapters/system-command-execute.js](adapters/system-command-execute.js) (OAP `system.command.execute`). Add more scopes by adding an adapter file and registering it in `index.js`.
- **`test/`** – Test folder: fixture [test/shield.md](test/shield.md) and integration test [test/test-shield-to-verify.js](test/test-shield-to-verify.js) (conversion, APort verify, response shape).
- **Demo:** A **&lt;2 min demo GIF** showing “malicious tool blocked” (e.g. Cisco scenario). Placeholder until recorded.

See [test/README.md](test/README.md) for run instructions and test coverage.

## Workstreams

1. **Spec (this doc):** Finalize mapping, scope→capability table, and `limits.{capability}.shield` shape; document in [aport-spec discussion #19](https://github.com/aporthq/aport-spec/discussions/19).
2. **Importer:** [adapters/index.js](adapters/index.js) is the reference implementation (run as CLI: `node adapters/index.js [shield.md]`). Optional packaging as `npx @aporthq/agent-guardrails shield import shield.md` for distribution. It parses `shield.md` (threat blocks between ---), maps to `limits.{capability}.shield.threats[]` and an OAP policy pack (e.g. tool.call → system.command.execute).
3. **Demo and docs:** Example `shield.md`, resulting limits fragment, policy pack snippet, guardrail log excerpt; **&lt;2 min demo GIF** (malicious tool blocked, e.g. Cisco scenario).

## Roadmap

| Phase           | Target | Deliverables |
|----------------|--------|--------------|
| Spec alignment | Feb 20 | Final mapping (this doc), scope→capability table, publish summary and open questions in [discussion #19](https://github.com/aporthq/aport-spec/discussions/19). |
| Importer + tests | Feb 28 | **CLI implementation in progress.** Target: packaged `shield-to-oap` CLI, fixtures, README + demo, guardrail integration tests. In-repo: `node adapters/index.js [shield.md]` works today. |
| Launch & outreach | Mar 5  | OpenClaw PR/docs, Discord, contribution guide for SHIELD feeds, joint messaging with ClawMoat. |

**Publishable state:** Once the discussion summary is posted to [discussion #19](https://github.com/aporthq/aport-spec/discussions/19), the drafted issue reply is posted to [OpenClaw #12385](https://github.com/openclaw/openclaw/issues/12385), and an initial ClawMoat schema is added, the spec folder is in a **publishable state** even before the packaged CLI ships.

## Open questions (for discussion #19)

1. Store SHIELD threats under `limits.{capability}.shield` (as above) or introduce a top-level `threat_feeds` section?
2. Support bidirectional export (OAP limits + rules → SHIELD markdown) for round-trip editing?
3. Conflict resolution when multiple feeds define the same capability/condition: last-write-wins vs explicit priorities?
4. How to represent `recommendation_agent` natural-language fragments that don’t map to explicit strings (heuristics vs structured conditions only)?

## Compatibility with APort

This integration is compatible with **APort’s policy verifier** and the OAP authorization stack: policy packs that include SHIELD threat data (via the mapping above) are evaluated by the same verifier that enforces all OAP policies - deterministic evaluation, cryptographically signed allow/deny decisions, compliance-grade audit trail, and sub-100ms decisions. SHIELD threat intelligence is one input to that standard; the authorization standard remains OAP. This spec (and the broader `spec/integrations` direction) sets the standard for how threat feeds plug into OAP and positions APort as the authorization layer, consistent with [discussion #19](https://github.com/aporthq/aport-spec/discussions/19).

## Open Questions for Discussion #19
1. Should we support bidirectional export (OAP policy pack → SHIELD markdown) for round-trip editing?
2. Conflict resolution: when multiple feeds define the same capability/condition, should latest 
entry win, or should we require explicit priorities?
1. How should `recommendation_agent` directives that rely on natural-language descriptions be 
represented (e.g., heuristics vs explicit strings)?

## Test and adapters

The [test/](test/) folder contains the test fixture (`shield.md`) and integration test (`test-shield-to-verify.js`). The [adapters/](adapters/) folder contains one adapter per scope: [index.js](adapters/index.js) imports them (currently [system-command-execute.js](adapters/system-command-execute.js) for tool.call). Flow: **shield.md → adapters → policy + limits → verify**. See [test/README.md](test/README.md) for run instructions.

## References

- **SHIELD spec (canonical):** [shield.md](https://nova-hunting.github.io/shield.md/) and [Upgrade path to v1](https://nova-hunting.github.io/shield.md/#upgrade)
- **OAP spec:** [spec/oap/oap-spec.md](../../oap/oap-spec.md)
- **Policy packs:** [policies/README.md](../../../policies/README.md), e.g. [system.command.execute.v1](../../../policies/system.command.execute.v1/policy.json), [mcp.tool.execute.v1](../../../policies/mcp.tool.execute.v1/policy.json)
- **OpenClaw issue (SHIELD policy layer):** [openclaw/openclaw#12385](https://github.com/openclaw/openclaw/issues/12385) - draft reply: [ISSUE_REPLY_DRAFT.md](ISSUE_REPLY_DRAFT.md)
- **OAP spec discussion (SHIELD import):** [aporthq/aport-spec discussions #19](https://github.com/aporthq/aport-spec/discussions/19) - draft summary: [DISCUSSION_SUMMARY.md](DISCUSSION_SUMMARY.md)
- **Positioning (OAP = standard, SHIELD = threat intel):** [_plan/execution/openclaw/SHIELD_POWER_ANALYSIS_CORRECTED.md](../../../_plan/execution/openclaw/SHIELD_POWER_ANALYSIS_CORRECTED.md)
