# Open Agent Passport Capability Registry

## Overview

The Open Agent Passport (OAP) Capability Registry lists the capabilities an agent passport can carry and the policy pack that enforces each one. Every entry below is derived from the `policy.json` file of the pack in the `policies/` directory of this repository (published separately as [aporthq/aport-policies](https://github.com/aporthq/aport-policies)). If this document and a `policy.json` disagree, the `policy.json` is authoritative and this document has a defect.

Each pack declares:

- **Required capability**: the `requires_capabilities` entry a passport must hold
- **Minimum assurance**: the `min_assurance` level of the passport owner
- **Context fields**: the request fields the pack validates (`required_context`)
- **Limit keys**: the keys the pack reads from `passport.limits["<capability>"]` (`limits_required`)
- **Deny codes**: the `deny_code` values its evaluation rules can return

Limits belong to the passport. A verification request cannot supply or override them.

## Capability Naming Convention

Capabilities use a dot-separated namespace, `category.action` or `category.subcategory.action`, matching `^[a-z0-9]+(\.[a-z0-9]+)*$` in `passport-schema.json`. Policy pack identifiers append a frozen version suffix: `{domain}.{action}.v{n}`.

Examples:

- `finance.payment.refund` is enforced by `finance.payment.refund.v1`
- `data.export` is enforced by `data.export.create.v1`
- `system.command.execute` is enforced by `system.command.execute.v1`

The capability id and the pack id do not always share a prefix. Two packs declare capabilities that differ from the name the hosted discovery document advertises: `code.release.publish.v1` requires `repo.release` (discovery lists `code.release.publish`), and `code.repository.merge.v1` requires `repo.pr.create` and `repo.merge` (discovery lists `code.repository.merge`). Passports MUST carry the capability id declared in `policy.json`. Aligning the two is an open item; see the Status section of [oap-spec.md](./oap-spec.md).

## Policy Pack Status Values

`status` in `policy.json` is one of `active`, `beta`, or `deprecated` (see the Policy Pack Schema in [oap-spec.md](./oap-spec.md)). Pack ids are frozen: a change in evaluation behaviour ships as a new id (`...v2`), and the old id stays valid for the deprecation window in [VERSION.md](./VERSION.md).

## Registered Policy Packs

This table lists every pack present in `policies/` as of 2026-09-25 (22 packs, all at pack version 1.0.0). "Docs" is whether the pack directory has a README; "Tests" is whether it has a `tests/` directory.

| Policy pack | Capability | Min assurance | Status | Docs | Tests |
|---|---|---|---|---|---|
| [`agent.session.create.v1`](#agentsessioncreatev1) | `agent.session.create` | L0 | active | yes | no |
| [`agent.tool.register.v1`](#agenttoolregisterv1) | `agent.tool.register` | L0 | active | yes | no |
| [`code.release.publish.v1`](#codereleasepublishv1) | `repo.release` | L3 | active | yes | no |
| [`code.repository.merge.v1`](#coderepositorymergev1) | `repo.pr.create`, `repo.merge` | L2 | active | yes | no |
| [`data.export.create.v1`](#dataexportcreatev1) | `data.export` | L1 | active | yes | no |
| [`data.file.read.v1`](#datafilereadv1) | `data.file.read` | L0 | active | no | no |
| [`data.file.write.v1`](#datafilewritev1) | `data.file.write` | L0 | active | no | no |
| [`data.report.ingest.v1`](#datareportingestv1) | `data.report.ingest` | L2 | active | yes | no |
| [`deliverable.task.complete.v1`](#deliverabletaskcompletev1) | `deliverable.task.complete` | L0 | active | yes | yes |
| [`finance.crypto.trade.v1`](#financecryptotradev1) | `finance.crypto.trade` | L3 | active | yes | no |
| [`finance.payment.charge.v1`](#financepaymentchargev1) | `payments.charge` | L2 | active | yes | yes |
| [`finance.payment.payout.v1`](#financepaymentpayoutv1) | `payments.payout` | L3 | active | yes | no |
| [`finance.payment.refund.v1`](#financepaymentrefundv1) | `finance.payment.refund` | L2 | active | yes | yes |
| [`finance.transaction.execute.v1`](#financetransactionexecutev1) | `finance.transaction` | L3 | active | yes | yes |
| [`governance.data.access.v1`](#governancedataaccessv1) | `data.access` | L3 | active | yes | yes |
| [`legal.contract.review.v1`](#legalcontractreviewv1) | `legal.contract.review` | L3 | active | yes | yes |
| [`mcp.tool.execute.v1`](#mcptoolexecutev1) | `mcp.tool.execute` | L0 | active | yes | no |
| [`media.image.generate.v1`](#mediaimagegeneratev1) | `media.image.generate` | L0 | active | yes | yes |
| [`messaging.message.send.v1`](#messagingmessagesendv1) | `messaging.send` | L0 | active | yes | no |
| [`system.command.execute.v1`](#systemcommandexecutev1) | `system.command.execute` | L0 | active | yes | no |
| [`web.browser.v1`](#webbrowserv1) | `web.browser` | L0 | active | no | no |
| [`web.fetch.v1`](#webfetchv1) | `web.fetch` | L0 | active | no | no |

Packs without a README: `data.file.read.v1`, `data.file.write.v1`, `web.browser.v1`, `web.fetch.v1`. Their `policy.json` is complete; the human-readable page is missing.

20 of 22 packs also declare optional MCP attribution fields in context (some or all of `mcp_servers`, `mcp_tools`, `mcp_server`, `mcp_tool`, `mcp_session`). They are omitted from the per-pack lists below. The exceptions are `deliverable.task.complete.v1` and `media.image.generate.v1`.

Deny codes listed per pack are the `deny_code` values in that pack's `evaluation_rules`. The codes in the Errors table of [oap-spec.md](./oap-spec.md) are normative for every implementation; a pack-specific code is normative only for that pack.

## Pack Details

### agent.session.create.v1

**Purpose**: Pre-action governance for AI agent session creation. Enforces session limits, duration restrictions, concurrent session controls, and resource allocation for secure multi-session agent deployments.

**Required capability**: `agent.session.create`

**Minimum assurance**: L0

**Status**: active (pack version 1.0.0)

**Required context fields**: `user_id`, `session_type`

**Optional context fields**: `session_name`, `requested_duration`, `resources`, `metadata`, `parent_session_id`, `tags`

**Required limit keys** (under `passport.limits["agent.session.create"]`): `max_sessions_per_user`, `max_session_duration`

**Deny codes**: `oap.duration_limit_exceeded`, `oap.session_type_not_allowed`, `oap.resource_quota_exceeded`, `oap.concurrent_limit_exceeded`

**Source**: [policies/agent.session.create.v1/policy.json](../../policies/agent.session.create.v1/policy.json), [README](../../policies/agent.session.create.v1/README.md)

### agent.tool.register.v1

**Purpose**: Pre-action governance for AI agent tool registration. Enforces tool naming conventions, capability declarations, security validations, and registration limits for secure tool ecosystem management.

**Required capability**: `agent.tool.register`

**Minimum assurance**: L0

**Status**: active (pack version 1.0.0)

**Required context fields**: `tool_name`, `tool_type`, `capabilities`

**Optional context fields**: `tool_description`, `tool_version`, `schema`, `author`, `repository`, `license`, `tags`, `metadata`

**Required limit keys** (under `passport.limits["agent.tool.register"]`): `max_tools_per_agent`, `max_registrations_per_day`

**Deny codes**: `oap.tool_type_not_allowed`, `oap.invalid_tool_name`, `oap.tool_already_exists`, `oap.capability_not_allowed`

**Source**: [policies/agent.tool.register.v1/policy.json](../../policies/agent.tool.register.v1/policy.json), [README](../../policies/agent.tool.register.v1/README.md)

### code.release.publish.v1

**Purpose**: Pre-action governance for release operations. Enforces version format, file restrictions, and repository permissions.

**Required capability**: `repo.release`

**Minimum assurance**: L3

**Status**: active (pack version 1.0.0)

**Required context fields**: `repository`, `version`, `files`

**Optional context fields**: `description`, `changelog`

**Required limit keys**: none declared in `limits_required`; the pack reads limits it needs from `passport.limits["repo.release"]` and treats absent keys as unset.

**Deny codes**: `oap.passport_suspended`, `oap.assurance_insufficient`, `oap.format_unsupported`, `oap.file_forbidden`, `oap.unknown_capability`

**Source**: [policies/code.release.publish.v1/policy.json](../../policies/code.release.publish.v1/policy.json), [README](../../policies/code.release.publish.v1/README.md)

### code.repository.merge.v1

**Purpose**: Pre-action governance for repository operations. Enforces repository allowlists, branch controls, path restrictions, and PR size limits for dev-first safety.

**Required capability**: `repo.pr.create`, `repo.merge`

**Minimum assurance**: L2

**Status**: active (pack version 1.0.0)

**Required context fields**: `repository`, `action`, `branch`

**Optional context fields**: `base_branch`, `title`, `description`, `files_changed`, `lines_added`, `lines_removed`

**Required limit keys** (under `passport.limits["repo.pr.create"]`): `max_prs_per_day`, `max_merges_per_day`, `max_pr_size_kb`

**Deny codes**: `oap.passport_suspended`, `oap.unknown_capability`, `oap.limit_exceeded`

**Source**: [policies/code.repository.merge.v1/policy.json](../../policies/code.repository.merge.v1/policy.json), [README](../../policies/code.repository.merge.v1/README.md)

### data.export.create.v1

**Purpose**: Pre-action governance for data export operations. Enforces row limits, PII handling requirements, and export capability validation.

**Required capability**: `data.export`

**Minimum assurance**: L1

**Status**: active (pack version 1.0.0)

**Required context fields**: `export_type`, `format`, `filters`

**Optional context fields**: `include_pii`, `date_range`, `columns`

**Required limit keys** (under `passport.limits["data.export"]`): `max_export_rows`, `allow_pii`

**Deny codes**: `oap.passport_suspended`, `oap.unknown_capability`, `oap.limit_exceeded`, `oap.pii_not_allowed`, `oap.format_unsupported`

**Source**: [policies/data.export.create.v1/policy.json](../../policies/data.export.create.v1/policy.json), [README](../../policies/data.export.create.v1/README.md)

### data.file.read.v1

**Purpose**: Pre-action governance for file read operations. Enforces path allowlists, blocked patterns (credentials, SSH keys, secrets), file size limits, and audit trails for secure agent file access.

**Required capability**: `data.file.read`

**Minimum assurance**: L0

**Status**: active (pack version 1.0.0)

**Required context fields**: `file_path`

**Optional context fields**: `offset`, `limit`, `encoding`

**Required limit keys** (under `passport.limits["data.file.read"]`): `allowed_paths`

**Deny codes**: `oap.path_not_allowed`, `oap.blocked_pattern`, `oap.limit_exceeded`, `oap.extension_not_allowed`

**Source**: [policies/data.file.read.v1/policy.json](../../policies/data.file.read.v1/policy.json)

### data.file.write.v1

**Purpose**: Pre-action governance for file write operations. Enforces path allowlists, blocked paths (system directories, binaries), extension restrictions, size limits, and rate limiting for secure agent file modifications.

**Required capability**: `data.file.write`

**Minimum assurance**: L0

**Status**: active (pack version 1.0.0)

**Required context fields**: `file_path`

**Optional context fields**: `content`, `content_length`, `encoding`, `append`, `create_dirs`

**Required limit keys** (under `passport.limits["data.file.write"]`): `allowed_paths`

**Deny codes**: `oap.path_not_allowed`, `oap.path_blocked`, `oap.extension_not_allowed`, `oap.limit_exceeded`, `oap.rate_limit_exceeded`, `oap.directory_not_allowed`

**Source**: [policies/data.file.write.v1/policy.json](../../policies/data.file.write.v1/policy.json)

### data.report.ingest.v1

**Purpose**: Pre-action governance for data being ingested by an AI agent for reporting purposes (e.g., ESG, financial disclosures). Enforces rules on data source credibility and freshness.

**Required capability**: `data.report.ingest`

**Minimum assurance**: L2

**Status**: active (pack version 1.0.0)

**Required context fields**: `report_type`, `data_source_id`, `data_timestamp`

**Optional context fields**: `metric_type`, `data_size_mb`, `validation_checks`, `data_quality_score`, `ingest_reason`, `idempotency_key`

**Required limit keys** (under `passport.limits["data.report.ingest"]`): `approved_sources`, `max_data_age_seconds`, `max_data_size_mb`, `max_ingest_frequency_per_hour`, `data_quality_threshold`, `required_validation_checks`

**Deny codes**: `oap.passport_suspended`, `oap.source_unapproved`, `oap.data_stale`, `oap.assurance_insufficient`, `oap.data_size_exceeded`, `oap.ingest_frequency_exceeded`, `oap.data_quality_insufficient`, `oap.validation_checks_missing`, `oap.idempotency_conflict`, `oap.report_type_forbidden`, `oap.source_reputation_insufficient`, `oap.metric_type_forbidden`

**Source**: [policies/data.report.ingest.v1/policy.json](../../policies/data.report.ingest.v1/policy.json), [README](../../policies/data.report.ingest.v1/README.md)

### deliverable.task.complete.v1

**Purpose**: Pre-action governance for an agent marking a task complete. Before "done" is authorized, the agent must supply the deliverable evidence the passport requires (summary, acceptance criteria attestations, test status, reviewer identity).

**Required capability**: `deliverable.task.complete`

**Minimum assurance**: L0

**Status**: active (pack version 1.0.0)

**Required context fields**: `task_id`, `output_type`, `criteria_attestations`

**Optional context fields**: `summary`, `tests_passing`, `reviewer_agent_id`, `author_agent_id`, `output_content`

**Required limit keys**: none declared in `limits_required`; the pack reads limits it needs from `passport.limits["deliverable.task.complete"]` and treats absent keys as unset.

**Deny codes**: `oap.criteria_incomplete`, `oap.evidence_missing`, `oap.criteria_not_met`, `oap.summary_insufficient`, `oap.tests_not_passing`, `oap.self_review_not_allowed`, `oap.blocked_pattern_detected`

`acceptance_criteria` is the one registered limit that is an array of objects, `[{ id, description }]`. The request must carry one attestation per `id`, and cannot change which criteria are required: `limits` is built from `passport.limits` alone and nothing in `context` is merged into it, so a request can neither add a criterion the passport does not list nor drop one it does.

Extra attestations are a separate question, and today they are accepted. Rule `all_passport_criteria_attested` asks only that every passport criterion have some matching attestation; it does not require the reverse. An attestation whose `criterion_id` appears in no passport criterion is not rejected on its own, and it does not satisfy a passport criterion either. It is still held to the rules that apply to every attestation: `validateDeliverableCriteriaEvidence` requires non-empty evidence and `validateDeliverableCriteriaMet` requires `met` to be the boolean `true`, so an unknown id carrying `met: false` or blank evidence denies the whole request. See the pack README under "Where acceptance criteria live".

**Source**: [policies/deliverable.task.complete.v1/policy.json](../../policies/deliverable.task.complete.v1/policy.json), [README](../../policies/deliverable.task.complete.v1/README.md)

### finance.crypto.trade.v1

**Purpose**: Pre-action governance for agent-initiated crypto asset trades. Enforces rules on specific tokens, exchanges, wallet types, and transaction value.

**Required capability**: `finance.crypto.trade`

**Minimum assurance**: L3

**Status**: active (pack version 1.0.0)

**Required context fields**: `exchange_id`, `pair`, `side`, `amount_usd`

**Optional context fields**: `source_wallet_type`, `idempotency_key`, `trade_reason`, `risk_score`

**Required limit keys** (under `passport.limits["finance.crypto.trade"]`): `allowed_exchanges`, `allowed_tokens`, `max_trade_size_usd`, `max_hot_wallet_trade_usd`, `max_daily_trade_volume_usd`, `max_trades_per_day`

**Deny codes**: `oap.passport_suspended`, `oap.exchange_forbidden`, `oap.token_forbidden`, `oap.limit_exceeded`, `oap.wallet_limit_exceeded`, `oap.assurance_insufficient`, `oap.daily_volume_exceeded`, `oap.trade_frequency_exceeded`, `oap.idempotency_conflict`, `oap.risk_score_exceeded`, `oap.exchange_offline`, `oap.market_closed`

**Source**: [policies/finance.crypto.trade.v1/policy.json](../../policies/finance.crypto.trade.v1/policy.json), [README](../../policies/finance.crypto.trade.v1/README.md)

### finance.payment.charge.v1

**Purpose**: Pre-action governance for agent-initiated payments. Enforces per-currency caps, merchant/region allowlists, category blocks, assurance minimums, and idempotency.

**Required capability**: `payments.charge`

**Minimum assurance**: L2

**Status**: active (pack version 1.0.0)

**Required context fields**: `amount`, `currency`, `merchant_id`, `region`, `items`, `idempotency_key`

**Optional context fields**: `shipping_country`, `risk_score`

**Required limit keys** (under `passport.limits["payments.charge"]`): `currency_limits`, `allowed_merchant_ids`, `allowed_countries`, `blocked_categories`, `max_items_per_tx`, `require_assurance_at_least`, `idempotency_required`, `approval_required`

**Deny codes**: `oap.passport_suspended`, `oap.assurance_insufficient`, `oap.currency_unsupported`, `oap.limit_exceeded`, `oap.merchant_forbidden`, `oap.region_blocked`, `oap.category_blocked`, `oap.idempotency_conflict`

**Source**: [policies/finance.payment.charge.v1/policy.json](../../policies/finance.payment.charge.v1/policy.json), [README](../../policies/finance.payment.charge.v1/README.md)

### finance.payment.payout.v1

**Purpose**: Pre-action governance for payment payout operations. Enforces per-currency caps, destination restrictions, and compliance requirements.

**Required capability**: `payments.payout`

**Minimum assurance**: L3

**Status**: active (pack version 1.0.0)

**Required context fields**: `amount`, `currency`, `destination_type`, `destination_id`, `payout_method`, `idempotency_key`

**Optional context fields**: `description`, `compliance_notes`, `approval_required`

**Required limit keys** (under `passport.limits["payments.payout"]`): `supported_currencies`, `currency_limits`, `allowed_destination_types`, `allowed_recipients`, `max_payouts_per_day`, `compliance_checks_required`, `approval_required`

**Deny codes**: `oap.passport_suspended`, `oap.assurance_insufficient`, `oap.currency_unsupported`, `oap.limit_exceeded`, `oap.destination_type_forbidden`, `oap.compliance_check_required`, `oap.idempotency_conflict`

**Source**: [policies/finance.payment.payout.v1/policy.json](../../policies/finance.payment.payout.v1/policy.json), [README](../../policies/finance.payment.payout.v1/README.md)

### finance.payment.refund.v1

**Purpose**: Pre-act governance for refund operations. Enforces per-currency caps, reason code validation, cross-currency restrictions, and idempotency.

**Required capability**: `finance.payment.refund`

**Minimum assurance**: L2

**Status**: active (pack version 1.0.0)

**Required context fields**: `order_id`, `customer_id`, `amount`, `currency`, `region`, `reason_code`, `idempotency_key`

**Optional context fields**: `note`, `merchant_case_id`, `order_currency`, `order_total_minor`, `already_refunded_minor`

**Required limit keys** (under `passport.limits["finance.payment.refund"]`): `supported_currencies`, `currency_limits`, `refund_reason_codes`, `regions`, `approval_required`

**Deny codes**: `oap.passport_suspended`, `oap.assurance_insufficient`, `oap.currency_unsupported`, `oap.limit_exceeded`, `oap.invalid_reason_code`, `oap.cross_currency_denied`, `oap.idempotency_conflict`, `oap.region_blocked`

**Source**: [policies/finance.payment.refund.v1/policy.json](../../policies/finance.payment.refund.v1/policy.json), [README](../../policies/finance.payment.refund.v1/README.md)

### finance.transaction.execute.v1

**Purpose**: Pre-action governance for agent-initiated financial transactions like trades or transfers. Enforces rules on asset classes, exposure limits, and account types.

**Required capability**: `finance.transaction`

**Minimum assurance**: L3

**Status**: active (pack version 1.0.0)

**Required context fields**: `transaction_type`, `amount`, `currency`, `asset_class`, `source_account_id`, `destination_account_id`

**Optional context fields**: `source_account_type`, `idempotency_key`, `destination_account_type`, `counterparty_id`

**Required limit keys** (under `passport.limits["finance.transaction"]`): `allowed_transaction_types`, `allowed_asset_classes`, `max_exposure_per_tx_usd`, `allowed_source_account_types`, `restricted_source_account_types`, `max_exposure_per_counterparty_usd`, `approval_required`

**Deny codes**: `oap.passport_suspended`, `oap.action_forbidden`, `oap.asset_class_forbidden`, `oap.limit_exceeded`, `oap.account_type_restricted`, `oap.commingling_of_funds_forbidden`, `oap.counterparty_limit_exceeded`, `oap.idempotency_conflict`

**Source**: [policies/finance.transaction.execute.v1/policy.json](../../policies/finance.transaction.execute.v1/policy.json), [README](../../policies/finance.transaction.execute.v1/README.md)

### governance.data.access.v1

**Purpose**: Pre-action governance for agent-initiated data access. Enforces controls based on data classification, sensitivity, entity access rights, and jurisdictional boundaries.

**Required capability**: `data.access`

**Minimum assurance**: L3

**Status**: active (pack version 1.0.0)

**Required context fields**: `data_classification`, `accessing_entity_id`, `accessing_entity_type`, `resource_id`

**Optional context fields**: `action_type`, `jurisdiction`, `row_count`, `destination_jurisdiction`, `resource_attributes`

**Required limit keys** (under `passport.limits["data.access"]`): `allowed_classifications`, `permissions`, `allowed_jurisdictions`, `max_rows_per_export`, `allowed_destination_jurisdictions`, `balance_inquiry_cap_usd`

**Deny codes**: `oap.passport_suspended`, `oap.assurance_insufficient`, `oap.classification_forbidden`, `oap.entity_type_forbidden`, `oap.jurisdiction_blocked`, `oap.row_limit_exceeded`, `oap.balance_inquiry_forbidden`, `oap.action_forbidden`, `oap.access_frequency_exceeded`, `oap.data_expired`

**Source**: [policies/governance.data.access.v1/policy.json](../../policies/governance.data.access.v1/policy.json), [README](../../policies/governance.data.access.v1/README.md)

### legal.contract.review.v1

**Purpose**: Pre-action governance for legal contract review, drafting, and redlining operations. Enforces firm-specific guardrails, privilege protection, attorney supervision requirements, and jurisdiction controls to prevent malpractice risk and ensure ABA ethics compliance.

**Required capability**: `legal.contract.review`

**Minimum assurance**: L3

**Status**: active (pack version 1.0.0)

**Required context fields**: `document_type`, `client_id`, `jurisdiction`, `action_type`, `idempotency_key`

**Optional context fields**: `document_size_mb`, `client_tier`, `attorney_reviewer_id`, `privilege_level`, `contract_value`, `contract_currency`, `matter_id`, `review_deadline`, `client_consent_given`, `conflicts_check_passed`, `fee_disclosure_provided`, `engagement_letter_signed`, `opposing_party_id`, `data_encrypted`, `supervisor_approval_id`

**Required limit keys** (under `passport.limits["legal.contract.review"]`): `allowed_document_types`, `max_document_size_mb`, `allowed_contract_jurisdictions`, `require_attorney_review`, `privilege_protection_enabled`, `max_contracts_per_day`, `allowed_client_tiers`, `supported_currencies`, `currency_limits`, `require_client_consent`, `require_conflicts_check`, `require_fee_disclosure`, `allowed_attorney_jurisdictions`, `require_matter_isolation`

**Deny codes**: `oap.passport_suspended`, `oap.assurance_insufficient`, `oap.document_type_forbidden`, `oap.document_size_exceeded`, `oap.jurisdiction_blocked`, `oap.attorney_review_required`, `oap.privilege_protection_violation`, `oap.daily_limit_exceeded`, `oap.client_tier_forbidden`, `oap.idempotency_conflict`, `oap.currency_unsupported`, `oap.limit_exceeded`, `oap.high_value_review_required`, `oap.client_consent_required`, `oap.conflicts_check_required`, `oap.fee_disclosure_required`, `oap.engagement_letter_required`, `oap.unauthorized_practice_of_law`, `oap.conflict_of_interest`, `oap.data_encryption_required`, `oap.supervisor_approval_required`

**Source**: [policies/legal.contract.review.v1/policy.json](../../policies/legal.contract.review.v1/policy.json), [README](../../policies/legal.contract.review.v1/README.md)

### media.image.generate.v1

**Purpose**: Pre-action governance for AI image generation and image editing requests. Enforces provider allowlists, prompt metadata limits, referenced-image limits, output count limits, and output format restrictions without requiring raw prompts or image contents.

**Required capability**: `media.image.generate`

**Minimum assurance**: L0

**Status**: active (pack version 1.0.0)

**Required context fields**: `provider`, `prompt_length`, `referenced_image_count`, `output_count`, `output_format`

**Optional context fields**: `model`, `size`, `aspect_ratio`

Raw prompt text, image bytes, image URLs, and local file paths are not policy context. Implementations must send metadata only and reject non-metadata fields before signing or persisting a decision.

**Required limit keys** (under `passport.limits["media.image.generate"]`): `allowed_providers`, `max_prompt_length`, `max_referenced_images`, `max_output_images`, `allowed_output_formats`

**Deny codes**: `oap.invalid_context`, `oap.provider_not_allowed`, `oap.prompt_too_large`, `oap.referenced_image_limit_exceeded`, `oap.output_image_limit_exceeded`, `oap.output_format_not_allowed`

**Source**: [policies/media.image.generate.v1/policy.json](../../policies/media.image.generate.v1/policy.json), [README](../../policies/media.image.generate.v1/README.md)

### mcp.tool.execute.v1

**Purpose**: Pre-action governance for Model Context Protocol (MCP) tool execution. Enforces server allowlists, tool restrictions, parameter validation, and rate limits for secure MCP integration.

**Required capability**: `mcp.tool.execute`

**Minimum assurance**: L0

**Status**: active (pack version 1.0.0)

**Required context fields**: `server`, `tool`, `parameters`

**Optional context fields**: `session_id`, `timeout`, `context`, `user_id`

**Required limit keys** (under `passport.limits["mcp.tool.execute"]`): `allowed_servers`, `max_calls_per_minute`

**Deny codes**: `oap.server_not_allowed`, `oap.invalid_server_url`, `oap.tool_not_allowed`, `oap.rate_limit_exceeded`, `oap.timeout_exceeded`, `oap.parameter_size_exceeded`

**Source**: [policies/mcp.tool.execute.v1/policy.json](../../policies/mcp.tool.execute.v1/policy.json), [README](../../policies/mcp.tool.execute.v1/README.md)

### messaging.message.send.v1

**Purpose**: Pre-action governance for messaging operations. Enforces rate limits, channel restrictions, mention policies, and content validation for PLG on-ramp.

**Required capability**: `messaging.send`

**Minimum assurance**: L0

**Status**: active (pack version 1.0.0)

**Required context fields**: `channel_id`, `message`, `message_type`

**Optional context fields**: `mentions`, `attachments`, `thread_id`, `reply_to`

**Required limit keys** (under `passport.limits["messaging.send"]`): `msgs_per_min`, `msgs_per_day`, `allowed_recipients`, `approval_required`

**Deny codes**: `oap.passport_suspended`, `oap.unknown_capability`, `oap.rate_limit_exceeded`, `oap.content_too_long`

**Source**: [policies/messaging.message.send.v1/policy.json](../../policies/messaging.message.send.v1/policy.json), [README](../../policies/messaging.message.send.v1/README.md)

### system.command.execute.v1

**Purpose**: Pre-action governance for shell command execution. Enforces command allowlists, blocked patterns, execution time limits, and environment restrictions for secure agent operations.

**Required capability**: `system.command.execute`

**Minimum assurance**: L0

**Status**: active (pack version 1.0.0)

**Required context fields**: `command`

**Optional context fields**: `args`, `cwd`, `env`, `timeout`, `shell`, `user`

**Required limit keys** (under `passport.limits["system.command.execute"]`): `allowed_commands`, `max_execution_time`

**Deny codes**: `oap.command_not_allowed`, `oap.blocked_pattern`, `oap.limit_exceeded`, `oap.directory_not_allowed`, `oap.env_var_blocked`

**Source**: [policies/system.command.execute.v1/policy.json](../../policies/system.command.execute.v1/policy.json), [README](../../policies/system.command.execute.v1/README.md)

### web.browser.v1

**Purpose**: Pre-action governance for browser automation and web interactions. Enforces URL allowlists, blocked domains, action restrictions (click, type, navigate), screenshot limits, and interaction patterns to prevent unauthorized web activity and data exfiltration.

**Required capability**: `web.browser`

**Minimum assurance**: L0

**Status**: active (pack version 1.0.0)

**Required context fields**: `action`

**Optional context fields**: `url`, `selector`, `value`, `screenshot`

**Required limit keys** (under `passport.limits["web.browser"]`): `allowed_domains`

**Deny codes**: `oap.domain_not_allowed`, `oap.domain_blocked`, `oap.private_ip_blocked`, `oap.action_not_allowed`, `oap.form_submission_blocked`, `oap.rate_limit_exceeded`

**Source**: [policies/web.browser.v1/policy.json](../../policies/web.browser.v1/policy.json)

### web.fetch.v1

**Purpose**: Pre-action governance for web fetch/HTTP requests. Enforces URL allowlists, blocked domains (data exfiltration endpoints), method restrictions, header controls, and rate limiting to prevent data leakage and unauthorized external communications.

**Required capability**: `web.fetch`

**Minimum assurance**: L0

**Status**: active (pack version 1.0.0)

**Required context fields**: `url`

**Optional context fields**: `method`, `headers`, `body`, `timeout`

**Required limit keys** (under `passport.limits["web.fetch"]`): `allowed_domains`

**Deny codes**: `oap.domain_not_allowed`, `oap.domain_blocked`, `oap.private_ip_blocked`, `oap.method_not_allowed`, `oap.header_blocked`, `oap.rate_limit_exceeded`

**Source**: [policies/web.fetch.v1/policy.json](../../policies/web.fetch.v1/policy.json)

## Custom Capabilities

### Definition Process

Organizations can define custom capabilities by:

1. **Choosing a namespace**: Use your organization domain (e.g., `acme.inventory.update`)
2. **Defining context fields**: Specify required input data
3. **Defining limits**: Specify configurable constraints
4. **Defining deny codes**: Specify error conditions
5. **Creating policy pack**: Implement the policy logic using `policies/policy-template.json`

### Example Custom Capability

```json
{
  "acme.inventory.update": {
    "context_fields": {
      "product_id": "string",
      "quantity_change": "integer",
      "warehouse_id": "string",
      "reason": "string"
    },
    "limits": {
      "max_quantity_change": 1000,
      "allowed_warehouses": [
        "warehouse_1",
        "warehouse_2"
      ],
      "require_approval": true
    },
    "deny_codes": [
      "acme.quantity_exceeded",
      "acme.warehouse_forbidden",
      "acme.approval_required"
    ]
  }
}
```

## Capability Lifecycle

### Registration

1. **Define capability**: Specify context fields, limits, and deny codes
2. **Create policy pack**: Implement policy evaluation logic and tests
3. **Submit for review**: Open a pull request against this repository
4. **Publish**: Once merged, the pack is added to this registry and synced to aport-policies

### Deprecation

1. **Announce deprecation**: 12-month notice period (see [VERSION.md](./VERSION.md))
2. **Mark deprecated**: Set `status: "deprecated"` and fill `deprecation` in `policy.json`; update this registry
3. **Remove support**: After the notice period, remove from the registry

The 2025-10-08 rename of the first four packs did not follow this process (see CHANGELOG.md, Unreleased). It is recorded there so the next removal does.

## Registry Access

There is no machine-readable `capabilities.json` published yet. Today the registry is available as:

- **This document**: `https://github.com/aporthq/aport-spec/blob/main/oap/capability-registry.md`
- **Live capability list**: `GET https://api.aport.io/.well-known/oap/` returns `supported_capabilities` (21 entries on 2026-09-24; see the naming note above for the two that differ from `policy.json`)
- **Pack definitions**: `GET https://api.aport.io/api/policies/{policy_name}` and the [aporthq/aport-policies](https://github.com/aporthq/aport-policies) repository

## Contributing

To contribute new capabilities:

1. Fork the repository
2. Create the pack from `policies/policy-template.json` following the Policy Pack Schema in [oap-spec.md](./oap-spec.md)
3. Add a README and a `tests/` directory with passport, context, and expected decision fixtures
4. Add the pack to the table and details in this document
5. Open a pull request and add an entry under Unreleased in [CHANGELOG.md](./CHANGELOG.md)

## References

- [OAP Specification](./oap-spec.md)
- [Passport Schema](./passport-schema.json)
- [Decision Schema](./decision-schema.json)
- [Security Guidelines](./security.md)
- [Versioning and release process](./VERSION.md)
