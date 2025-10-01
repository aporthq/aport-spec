# Open Agent Passport Capability Registry

## Overview

The Open Agent Passport (OAP) Capability Registry defines standardized capabilities that can be granted to AI agents. Each capability includes:

- **Context fields**: Required input data for policy evaluation
- **Limits**: Configurable operational constraints
- **Deny codes**: Standardized error codes for policy violations

## Capability Naming Convention

### Format

Capabilities use a hierarchical namespace format: `category.action`

Examples:
- `payments.refund` - Financial refund operations
- `data.export` - Data export operations
- `repo.release.publish` - Repository release operations

## Policy Packs

### Structure

Policy packs define the complete policy logic for one or more capabilities. They include:

- **Policy ID**: Unique identifier (e.g., `payments.refund.v1`)
- **Required capabilities**: List of capabilities this pack handles
- **Minimum assurance**: Required assurance level
- **Context schema**: Expected input data structure
- **Limit schema**: Configurable limits structure
- **Deny codes**: Standardized error codes

## Standard Policy Packs

### payments.refund.v1

### payments.refund.v1

**Purpose**: Protects financial refund operations with amount limits, currency controls, and idempotency requirements.

**Required Capability**: `payments.refund`

**Minimum Assurance**: L2 (GitHub Verified)

**Context Fields**:
- `amount` (integer): Refund amount in minor units
- `currency` (string): ISO 4217 currency code
- `order_id` (string): Original order identifier
- `customer_id` (string): Customer identifier
- `reason_code` (string): Refund reason code
- `region` (string): Geographic region
- `idempotency_key` (string): Idempotency key for duplicate prevention

**Limits Structure**:
```json
{
  "payments.refund": {
    "currency_limits": {
      "USD": {
        "max_per_tx": 5000,
        "daily_cap": 50000
      },
      "EUR": {
        "max_per_tx": 4500,
        "daily_cap": 45000
      }
    },
    "reason_codes": ["customer_request", "defective_product", "fraud"],
    "regions": ["US", "CA", "EU"],
    "idempotency_required": true
  }
}
```

**Deny Codes**:
- `oap.limit_exceeded` - Transaction or daily limit exceeded
- `oap.currency_unsupported` - Currency not supported
- `oap.region_blocked` - Operation not allowed in this region
- `oap.invalid_reason` - Invalid reason code
- `oap.idempotency_conflict` - Idempotency key already used

### data.export.v1

**Purpose**: Protects data export operations with row limits, PII controls, and collection restrictions.

**Required Capability**: `data.export`

**Minimum Assurance**: L1 (Email Verified)

**Context Fields**:
- `collection` (string): Data collection name
- `estimated_rows` (integer): Estimated number of rows
- `include_pii` (boolean): Whether to include PII data
- `region` (string): Geographic region

**Limits Structure**:
```json
{
  "data.export": {
    "allowed_collections": ["users", "orders", "products"],
    "max_rows": 100000,
    "allow_pii": false,
    "regions": ["US", "CA", "EU"]
  }
}
```

**Deny Codes**:
- `oap.pii_blocked` - PII export not allowed
- `oap.collection_forbidden` - Collection not in allowlist
- `oap.limit_exceeded` - Row limit exceeded

### repo.release.publish.v1

**Purpose**: Protects repository release operations with branch controls, artifact verification, and rate limiting.

**Required Capability**: `repo.release.publish`

**Minimum Assurance**: L2 (GitHub Verified)

**Context Fields**:
- `repo` (string): Repository identifier
- `branch` (string): Source branch
- `tag` (string): Release tag
- `artifact_sha` (string): Artifact SHA-256 hash
- `signer` (string): Artifact signer identifier

**Limits Structure**:
```json
{
  "repo.release.publish": {
    "allowed_branches": ["main", "develop"],
    "allowed_repos": ["org/project1", "org/project2"],
    "max_releases_per_day": 10,
    "require_signed_artifacts": true
  }
}
```

**Deny Codes**:
- `oap.branch_forbidden` - Branch not in allowlist
- `oap.repo_forbidden` - Repository not in allowlist
- `oap.unsigned_artifact` - Artifact signature required
- `oap.limit_exceeded` - Daily release limit exceeded

## Custom Capabilities

### Definition Process

Organizations can define custom capabilities by:

1. **Choosing a namespace**: Use your organization domain (e.g., `acme.inventory.update`)
2. **Defining context fields**: Specify required input data
3. **Defining limits**: Specify configurable constraints
4. **Defining deny codes**: Specify error conditions
5. **Creating policy pack**: Implement the policy logic

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
      "allowed_warehouses": ["warehouse_1", "warehouse_2"],
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

### Registration

1. **Define capability**: Specify context fields, limits, and deny codes
2. **Create policy pack**: Implement policy evaluation logic
3. **Submit for review**: Submit to OAP registry for standardization
4. **Publish**: Once approved, capability is published in the registry

### Deprecation

1. **Announce deprecation**: 12-month notice period
2. **Mark deprecated**: Update registry with deprecation notice
3. **Remove support**: After notice period, remove from registry

## Registry Access

### Endpoints

The capability registry is available at:
- **Current version**: `https://github.com/aporthq/aport-spec/oap/capabilities.json`
- **Latest version**: `https://github.com/aporthq/aport-spec/oap/capabilities/latest.json`
- **Specific version**: `https://github.com/aporthq/aport-spec/oap/capabilities/v1.0.json`

## Contributing

### Process

To contribute new capabilities:

1. **Fork the specification repository**
2. **Create capability definition** following the standard format
3. **Implement policy pack** with test cases
4. **Submit pull request** with capability and policy pack
5. **Address feedback** and iterate until approved
6. **Merge and publish** once approved

## References

- [OAP Specification](./oap-spec.md)
- [Passport Schema](./passport-schema.json)
- [Decision Schema](./decision-schema.json)
- [Security Guidelines](./security.md)
