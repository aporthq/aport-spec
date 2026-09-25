# Open Agent Passport (OAP) Versioning

## Current State (2026-09-24)

| Item | Value |
|---|---|
| Document revision | 1.0.0 (the only entry in the history below; see the note on its date) |
| Wire version | `spec_version: "oap/1.0"` |
| Maturity | **Working Draft** for the whole specification (oap-spec.md, the three JSON schemas, capability-registry.md, security.md, conformance.md, delegation.md) |
| Candidate | Not entered. Two of the six entry criteria are not met and two more are partly met; see "What Candidate Is Waiting On" below. |
| Next revision number | Not assigned. Two changes since the 1.0.0 text are incompatible with it, so 1.1.0 is not available under semver. See "Open decision" below. |

## Two Numbers, Not One

The specification carries two version identifiers with different jobs.

**Document revision** (`1.0.0`, `1.1.0`, `2.0.0`) follows [Semantic Versioning](https://semver.org/) and is recorded in this file and in CHANGELOG.md.

- Major: a change that makes a valid 1.x passport, decision, or pack invalid, or changes the meaning of an existing field, code, or identifier
- Minor: new optional fields, new error codes, new policy packs, new sections, all backward compatible
- Patch: corrections and clarifications that do not change what a validator accepts

**Wire version** (`spec_version: "oap/1.0"`) is the string carried inside every passport and checked by validators. It tracks only the major.minor of the document revision. Patch revisions do not change it. Maturity changes (Working Draft to Candidate to Final) do not change it either: a passport issued against the working draft and one issued against the final text both say `oap/1.0`.

What a minor bump means for validators. `passport-schema.json` today pins `spec_version` with `"const": "oap/1.0"`, and the hosted implementation defaults new passports to that string. When 1.1.0 ships:

- the schema changes `const` to `"enum": ["oap/1.0", "oap/1.1"]`
- a validator that implements 1.1 MUST accept objects marked `oap/1.0` and objects marked `oap/1.1`
- an object marked `oap/1.1` MAY use fields defined in 1.1; an object marked `oap/1.0` MUST NOT rely on them
- a validator that only implements 1.0 will reject `oap/1.1` objects by schema, so issuers SHOULD keep emitting `oap/1.0` until their relying parties have upgraded, and MUST NOT mark an object `oap/1.1` unless it uses a 1.1 field

A major bump (`oap/2.0`) is not accepted by any 1.x validator. Implementations MAY support several major versions at once.

## Maturity Ladder

Maturity is separate from the version number. It answers "how much can this text still change", not "what changed".

### Working Draft

The text may change without notice, including in ways that break earlier drafts. No implementation should claim conformance to a Working Draft; the conformance suite is a tool for the editors, not a certificate.

### Candidate

The text is feature complete for its version. Changes are limited to fixing defects and clarifying wording; no new required fields, no renamed identifiers, no removed error codes. New policy packs are registry additions and are allowed. A review window is stated with a start and end date. Implementations may claim conformance to a Candidate and must say so.

Entry checklist (Working Draft to Candidate), each item verifiable by a reader:

1. Feature complete: every section listed in the table of contents of oap-spec.md has normative text, and no open pull request adds a required field
2. At least one production implementation serves the discovery document with the matching `oap_version` and signs decisions with a resolvable `kid`
3. The conformance suite in `spec/conformance` runs against the current registry identifiers and passes
4. Every pack in `policies/` appears in capability-registry.md with its status, and every pack has a README
5. A security review of the specification text (not only of an implementation) has been written down, with findings and their disposition
6. The deprecation policy in this file is in force: no identifier has been removed without the stated notice period since the policy was written

### Final

The text is frozen. Any change, including a correction to a schema, ships as a new minor or major revision. Conformance claims name the frozen revision.

Exit checklist (Candidate to Final):

1. At least two independent implementations, from different maintainers, pass the conformance suite; "independent" means neither shares evaluator code with the other
2. The conformance suite covers every registered pack, and both runners (`test-runner.js` and `src/runner.ts`) agree
3. Every defect listed in the Status section of oap-spec.md is closed
4. The review window has elapsed and every issue raised during it is resolved or explicitly deferred to the next revision
5. A security review by someone outside the maintainers has been completed and its findings addressed
6. The deprecation policy has been in force for a full notice period with no exceptions
7. A git tag for the revision exists and the published spec URL serves that tag

## What Candidate Is Waiting On

Evaluated 2026-09-24 against the six entry criteria above. The specification is
a Working Draft because criteria 3 and 6 are not met and criteria 4 and 5 are
only partly met. The evidence for each is in the Status section of
oap-spec.md; this is the list of work that changes the status.

| # | Criterion | Status | What has to happen |
|---|---|---|---|
| 1 | Feature complete | Met | Nothing. |
| 2 | One production implementation | Met | Nothing. `api.aport.io` serves the discovery document and a resolvable `kid`. |
| 3 | Conformance suite passes against the current registry | **Not met** | Re-point the cases in `spec/conformance/cases/` from the pre-rename ids `payments.refunds.v1` and `data.export.v1` to the current ids, so that `tsx src/runner.ts` stops failing 5 of 5 with "Unknown policy pack". Both runners must agree, and `test-runner.js` must check pack ids rather than pass regardless of them. Coverage beyond the current 2 of 22 packs is a Final criterion, not an entry one. |
| 4 | Every pack listed, every pack has a README | Partly met | Write READMEs for `data.file.read.v1`, `data.file.write.v1`, `web.browser.v1`, and `web.fetch.v1`. |
| 5 | Security review of the specification text | Partly met | The existing reviews cover the implementation. A review of the specification text itself, with findings and their disposition written down, is still outstanding. It does not have to be external; that is a Final criterion. |
| 6 | Deprecation policy in force | **Not met** | The policy is written but the 2025-10-08 rename broke it, removing four pack ids with no notice period and no alias. Either restore aliases for `payments.refunds.v1`, `data.export.v1`, `repo.v1`, and `messaging.v1` for the 12-month window, or record the rename as a knowing exception with the date the policy starts counting from, and then leave it unbroken. |

Why this matters rather than being bookkeeping: the Candidate rung says
implementations may claim conformance. Criterion 3 is the one that makes such a
claim mean anything, and it is the one failing. Declaring Candidate now would
let an implementation advertise conformance to a suite that does not run
against the identifiers the registry actually uses.

Until then: no implementation should claim conformance to this text. Three
places carry the status and all three read Working Draft: the maturity line in
oap-spec.md, the Current State table above, and the Suite Status section of
conformance.md. CHANGELOG.md records the decision under Unreleased rather than
carrying a status line of its own. Entering Candidate means closing the items in
the table, updating those three places plus a CHANGELOG entry in one change, and
stating the review window's start and end dates at that point.

## Version History

### v1.0.0 (2025-01-16)

- Initial release of OAP specification
- Core passport and decision schemas
- Ed25519 signing and JCS canonicalization
- Policy packs: the registry documented three packs (`finance.payment.refund.v1`, `data.export.create.v1`, `code.release.publish.v1`, under the identifiers they received on 2025-10-08). The `policies/` directory at the first commit that carries this text (443a015, 2025-09-30) held four packs under earlier names: `payments.refunds.v1`, `data.export.v1`, `repo.v1`, `messaging.v1`
- Verifiable Credential interoperability
- Conformance testing framework

Note on the date: the earliest git evidence for the 1.0.0 text is commit 443a015 on 2025-09-30, nine days after the repository's first commit. The `created_at` fields of the oldest packs also say 2025-01-16, so the date may come from a history that predates this repository. It could not be verified and no git tag exists for it.

### Unreleased

See [CHANGELOG.md](./CHANGELOG.md). Summary: 19 new policy packs (22 total), a service discovery document and schema, optional passport fields for DID and expiry, a policy pack schema with declarative evaluation rules, seven new error codes, a delegation chain draft, and a key resolution path change. Two of the changes are incompatible with the 1.0.0 text; see below.

## Open Decision: The Next Revision Number

The changes since the 1.0.0 text are additions and clarifications except for two:

1. **Identifiers renamed without aliases** (commit e361b1e, 2025-10-08). `payments.refunds.v1`, `data.export.v1`, `repo.v1`, and `messaging.v1` were deleted and replaced by `finance.payment.refund.v1`, `data.export.create.v1`, `code.release.publish.v1`, and `messaging.message.send.v1`; the capability `payments.refund` became `finance.payment.refund`. The 1.0.0 text says pack ids are frozen and old ids remain valid. The hosted verifier has no alias for the old ids.
2. **Key resolution path changed** (commit f21366f, 2026-03-26). The 1.0.0 text required `kid` to resolve via `/.well-known/oap/keys.json`. The implementation served that route from 2025-11-09, removed it on 2026-03-26, and now serves `/.well-known/oap/jwks.json` only; the old path returns 404 on api.aport.io today. A validator built to the 1.0.0 text cannot resolve keys.

Under semver both are major changes. Whether they matter depends on a fact this repository cannot establish: whether anyone built against the public text between 2025-09-24 (first sync to aporthq/aport-spec) and the dates above. Two defensible outcomes:

- **Re-base 1.0.** Treat the 2025-09-30 text as never released (no tag, no announcement, no known consumer), fold everything under 1.0.0, and keep `oap/1.0` on the wire. Cheapest for every passport already issued.
- **Cut 2.0.0.** Treat the public text as released, move the wire string to `oap/2.0`, and re-issue passports. Correct under a strict reading; costly, for a rename.

The maintainer makes this call. It does not block the maturity question: the wire version stays `oap/1.0` either way while the text is a Working Draft.

## Specification URLs

The URL patterns in earlier versions of this file (`.../aport-spec/oap/1.0`, `.../oap/latest`) return 404 and are replaced by the locations that resolve today:

- **Specification (main branch)**: `https://github.com/aporthq/aport-spec/blob/main/oap/oap-spec.md` (this is also the `spec_uri` the live discovery document advertises)
- **Schema base (raw)**: `https://raw.githubusercontent.com/aporthq/aport-spec/refs/heads/main/oap/`
- **Policy packs**: `https://github.com/aporthq/aport-policies`
- **Live discovery**: `https://api.aport.io/.well-known/oap/`
- **Tagged revisions**: none exist yet. The release process below creates them as `oap-v<major>.<minor>.<patch>` on aporthq/aport-spec.

## Backward Compatibility

- **v1.x**: All minor and patch versions are backward compatible
- **v2.0+**: Major version changes may introduce breaking changes
- **Deprecation Policy**: Features and identifiers marked for deprecation stay supported for at least 12 months from the CHANGELOG entry that announces the deprecation. A removed pack id keeps returning decisions (or a defined `oap.policy_error`) for that period; it is not deleted from the registry.

The 2025-10-08 rename did not follow this policy. It is recorded in CHANGELOG.md so that the next removal does.

## How the Spec Is Released

The practical steps, in order. They apply to a change in `spec/oap` or `policies/`; a pack-only change stops after step 5.

1. **Change set.** Open a pull request that touches `spec/oap/**` or `policies/**`. A pack change includes its `policy.json`, README, and `tests/` fixtures. A spec change that adds or renames a field updates the JSON schema and the examples in the same PR.
2. **CHANGELOG entry.** Add the change under `[Unreleased]` in CHANGELOG.md, in Keep a Changelog form (Added, Changed, Deprecated, Removed, Fixed, Security). A removal or rename also gets a Deprecated entry dated at least 12 months earlier, or it does not merge.
3. **Version bump.** When cutting a revision, move the Unreleased block under a new heading with the version and date, update the Current State table in this file, and, for a minor or major bump, update `spec_version` in `passport-schema.json` and the examples.
4. **Tag.** Merge to `main`. The `publish-opensource.yml` workflow opens a PR in aporthq/aport-spec (spec) and aporthq/aport-policies (packs). Those sync PRs carry the `package.json` version of this repository (0.1.x today), which is unrelated to the spec revision. After the sync merges, tag aporthq/aport-spec with `oap-v<major>.<minor>.<patch>`. No such tag exists yet.
5. **Publish.** The spec URL above serves `main`; the tag is the frozen copy. Confirm `https://api.aport.io/.well-known/oap/` reports the matching `oap_version` and that `supported_capabilities` matches the registry.
6. **Announce.** Note the revision, its maturity, and any deprecations in the aport-spec release notes and the repository README badge (which reads `OAP-v1.0.0` today).
7. **Deprecation window.** Anything marked Deprecated in the release stays supported for 12 months from the release date. Track the removal date in the CHANGELOG entry so the removal PR can cite it.

## Implementation Notes

- Implementations MUST support the current major version
- Implementations SHOULD support the latest minor version
- Implementations MAY support multiple major versions simultaneously
- Implementations that claim conformance state the document revision and the maturity level they tested against
