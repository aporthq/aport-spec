# Change Log

All notable changes to the Open Agent Passport (OAP) specification will be documented in this file.

The format is based on [Keep a Change Log](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
Maturity (Working Draft, Candidate, Final) is tracked separately in [VERSION.md](./VERSION.md).

## [Unreleased]

Baseline for this entry: commit 443a015 (2025-09-30), the first commit carrying the 1.0.0 text. Compared with `git diff 443a015 HEAD -- spec/oap policies`. No revision number is assigned because the Removed section below contains changes that are incompatible with the 1.0.0 text; see "Open decision" in VERSION.md.

### Added

- 19 policy packs, bringing the registry to 22: `agent.session.create.v1`, `agent.tool.register.v1`, `code.repository.merge.v1`, `data.file.read.v1`, `data.file.write.v1`, `data.report.ingest.v1`, `deliverable.task.complete.v1`, `finance.crypto.trade.v1`, `finance.payment.charge.v1`, `finance.payment.payout.v1`, `finance.transaction.execute.v1`, `governance.data.access.v1`, `legal.contract.review.v1`, `mcp.tool.execute.v1`, `media.image.generate.v1`, `system.command.execute.v1`, `web.browser.v1`, `web.fetch.v1`, plus `messaging.message.send.v1` (present as `messaging.v1` at the baseline but not documented in the registry)
- Capability registry now lists every pack in `policies/` with capability, minimum assurance, status, context fields, limit keys, and deny codes, generated from each `policy.json`
- Policy Pack Schema section in oap-spec.md: required and optional fields of a pack, `evaluation_rules` with `expression` and `custom_validator` rule types, the `passport` / `context` / `limits` / `helpers` scopes, and the expression restrictions (no `eval`, `Function`, `__proto__`, `prototype`, `constructor`; 1000 character cap)
- Service discovery: `well-known-schema.json` for `GET /.well-known/oap/` (`oap_version`, `authorization_endpoint`, `passport_endpoint`, `policy_endpoint`, `jwks_uri`, `supported_capabilities`, `supported_assurance_levels`, and others), added in f21366f; the prose specification lives in `spec/well-known.md`
- Optional passport fields `did` (did:web), `expires_at`, and `never_expires` in oap-spec.md
- Seven error codes for `deliverable.task.complete.v1`: `oap.criteria_not_met`, `oap.evidence_missing`, `oap.criteria_incomplete`, `oap.summary_insufficient`, `oap.tests_not_passing`, `oap.self_review_not_allowed`, `oap.blocked_pattern_detected`
- Passport schema limit definitions for `messaging.send` and `payments.payout`, including per-recipient limits
- Delegation Chains section in oap-spec.md pointing to `delegation.md` (Working Draft, not implemented; added in f21366f, revised through 12c2b21)
- Verifiable Presentation support in the VC tooling (`vc/tools/src/vp.ts`), and VC examples updated to the current identifiers and key path
- Normative statement that `allow` is the signed policy result and that harness rollout modes (`warn`, `report-only`, `fail-open-on-api-error`) MUST NOT rewrite a denial into `allow: true`, with non-normative guidance in `docs/DECISION-VS-ENFORCEMENT.md`
- Maturity ladder, release process, and wire-version rules in VERSION.md
- Candidate entry checklist in the Status section of oap-spec.md, with each of the six criteria evaluated and its evidence, and a "What Candidate Is Waiting On" table in VERSION.md naming the work that each unmet criterion needs

### Changed

- Maturity stays **Working Draft**. Candidate was evaluated on 2026-09-24 and not entered: criteria 3 (conformance suite against the current registry) and 6 (deprecation policy in force) are not met, and criteria 4 (pack READMEs) and 5 (security review of the text) are only partly met. The Candidate rung permits conformance claims, and criterion 3 is what makes such a claim mean anything, so the status does not move until the suite runs against the current pack ids. No review window is opened.
- Policy evaluation performance target tightened from 200 ms to 100 ms at the 95th percentile (conformance.md)
- `limits` in expression rules is now defined as the block for the pack's primary capability, never populated from `context` (oap-spec.md, policies/README.md)
- Examples throughout use the current identifiers (`finance.payment.refund`, `finance.payment.refund.v1`)
- VC context URL moved from `github.com/aporthq/aport-spec/oap/vc/...` (404) to the raw GitHub URL; issuer examples changed from `api.aport.dev` to `aport.io`

### Removed

Both items are incompatible with the 1.0.0 text as it stood on 2025-09-30. They are listed here rather than under a revision number.

- Policy packs `payments.refunds.v1`, `data.export.v1`, `repo.v1`, and `messaging.v1` (commit e361b1e, 2025-10-08), replaced by `finance.payment.refund.v1`, `data.export.create.v1`, `code.release.publish.v1`, and `messaging.message.send.v1`. The capability `payments.refund` became `finance.payment.refund`. No alias for the old ids exists in the hosted verifier, and the 12-month deprecation window in VERSION.md was not applied. The conformance cases in `spec/conformance/cases/` still use the old ids.
- Key resolution route `/.well-known/oap/keys.json` (served from 8ac9e77 on 2025-11-09, removed in f21366f on 2026-03-26). Keys are now published only at `/.well-known/oap/jwks.json`. The old path returns 404 on api.aport.io.

### Fixed

- Key resolution path in oap-spec.md, security.md, conformance.md, and the 1.0.0 CHANGELOG entry corrected from `keys.json` to `jwks.json` to match the route that is served
- The "three initial policy packs" statement in VERSION.md and this file corrected: three packs were documented in the registry while four existed in `policies/`
- VERSION.md specification URLs replaced; the previous patterns returned 404
- Registry detail sections for `finance.payment.refund.v1`, `data.export.create.v1`, and `code.release.publish.v1` regenerated from `policy.json`; the previous text listed context fields, limits, and deny codes that the packs do not declare (for example `collection` and `estimated_rows` for data export, `branch` and `artifact_sha` for release publish)
- `code.release.publish.v1` was listed as `repo.release.publish.v1` in the registry

### Security

- Expression rules restricted to a safe evaluator: no code execution primitives, no prototype access, 1000 character cap; custom validators must be pure and registered before evaluation (oap-spec.md)
- Enforcement dispositions cannot rewrite a signed denial (oap-spec.md)
- Delegation draft adds mandatory scope narrowing, depth caps, revocation endpoint validation, and rejection of inactive passports anywhere in a chain (delegation.md sections 1.3, 1.4, 7, 11)
- Implementation-side reviews that informed the text, outside `spec/oap`: `SECURITY_FIXES_APPLIED.md` (2025-11-18), `SECURITY_AUDIT_POLICY_VERIFY.md` (2026-02-17, replay hash fix and expression evaluator review), `docs/PASSPORT_DIGEST_CORRECTION_2026-09-21.md` (nested limits were dropped from `passport_digest` and decision signatures by the previous serializer; corrected to RFC 8785 over the full authorization view)

### Known defects (open at the time of this entry)

- `decision-schema.json` cannot be satisfied: it requires `passport_id`, `issued_at`, and `expires_at`, none of which are in `properties`, and sets `additionalProperties: false`. Both example decisions fail validation. oap-spec.md lists `agent_id`, `created_at`, and `expires_in` instead.
- `passport-schema.json` does not define `did`, `expires_at`, or `never_expires` and sets `additionalProperties: false`, so a passport carrying the optional fields documented in oap-spec.md fails validation.
- `spec/conformance` cases use the pre-rename pack ids. `node test-runner.js` passes 5 of 5; `tsx src/runner.ts` fails 5 of 5 with "Unknown policy pack".
- The hosted discovery document lists `code.release.publish` and `code.repository.merge` as capabilities; the packs declare `repo.release` and `repo.pr.create` / `repo.merge`.
- `data.file.read.v1`, `data.file.write.v1`, `web.browser.v1`, and `web.fetch.v1` have no README.

## [1.0.0] - 2025-01-16

The earliest git evidence for this text is commit 443a015 (2025-09-30). No tag exists. See VERSION.md.

### Added

- Initial release of Open Agent Passport (OAP) v1 specification
- Core passport schema with template/instance support
- Decision schema with Ed25519 signing and JCS canonicalization
- Capability registry documenting three policy packs (under the identifiers assigned on 2025-10-08; the `policies/` directory at the baseline commit held four packs under earlier names):
  - `finance.payment.refund.v1` - Financial transaction controls
  - `data.export.create.v1` - Data export with PII controls
  - `code.release.publish.v1` - Repository release controls
- Assurance level system (L0-L4) with verification methods
- Security model with Ed25519 signatures and key resolution
- Verifiable Credential interoperability mapping
- Conformance testing framework
- Documentation and examples

### Security

- Ed25519 signature scheme for decision signing
- JCS (RFC 8785) canonicalization for deterministic hashing
- Key resolution via `/.well-known/oap/jwks.json` (the text at the baseline commit said `keys.json`; see Unreleased, Removed)
- Suspend semantics with 30-second global invalidation
- Passport digest verification for decision integrity

### Interoperability

- W3C Verifiable Credential export/import support
- JSON-LD context definitions
- Standardized error codes and response formats
- Multi-region and multi-tenant support

### Performance

- Decision caching with TTL support
- Tiered cache invalidation on suspend/revoke
- Optimized for edge computing environments
- Server-Timing headers for performance monitoring
