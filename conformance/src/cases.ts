/**
 * Test case definitions and types for OAP conformance testing
 */

export interface TestCase {
  id: string;
  packId: string;
  contextName: string;
  passport: any;
  context: any;
  expected: any;
  receipt?: any;
}

export interface TestResult {
  testCase: TestCase;
  passed: boolean;
  errors: string[];
  warnings: string[];
}

export interface ConformanceReport {
  timestamp: string;
  summary: {
    total: number;
    passed: number;
    failed: number;
    successRate: number;
  };
  details: Array<{
    testCase: string;
    passed: boolean;
    errors: string[];
    warnings: string[];
  }>;
}

export interface PolicyPackTestCase {
  packId: string;
  name: string;
  description: string;
  passports: any[];
  contexts: any[];
  expected: any[];
  receipts?: any[];
}

export interface SignatureVerificationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface PolicyEvaluationResult {
  valid: boolean;
  decision: any;
  errors: string[];
  warnings: string[];
}

/**
 * Standard test cases for OAP conformance
 */
export const STANDARD_TEST_CASES: PolicyPackTestCase[] = [
  {
    packId: "payments.refund.v1",
    name: "Refunds Policy Pack",
    description: "Tests for payments.refund.v1 policy pack",
    passports: [],
    contexts: [],
    expected: [],
    receipts: [],
  },
  {
    packId: "data.export.v1",
    name: "Data Export Policy Pack",
    description: "Tests for data.export.v1 policy pack",
    passports: [],
    contexts: [],
    expected: [],
    receipts: [],
  },
  {
    packId: "repo.release.publish.v1",
    name: "Repository Release Policy Pack",
    description: "Tests for repo.release.publish.v1 policy pack",
    passports: [],
    contexts: [],
    expected: [],
    receipts: [],
  },
];

/**
 * Error codes for OAP conformance testing
 */
export const OAP_ERROR_CODES = {
  INVALID_CONTEXT: "oap.invalid_context",
  UNKNOWN_CAPABILITY: "oap.unknown_capability",
  LIMIT_EXCEEDED: "oap.limit_exceeded",
  CURRENCY_UNSUPPORTED: "oap.currency_unsupported",
  REGION_BLOCKED: "oap.region_blocked",
  ASSURANCE_INSUFFICIENT: "oap.assurance_insufficient",
  PASSPORT_SUSPENDED: "oap.passport_suspended",
  IDEMPOTENCY_CONFLICT: "oap.idempotency_conflict",
  POLICY_ERROR: "oap.policy_error",
  PII_BLOCKED: "oap.pii_blocked",
  COLLECTION_FORBIDDEN: "oap.collection_forbidden",
  BRANCH_FORBIDDEN: "oap.branch_forbidden",
  REPO_FORBIDDEN: "oap.repo_forbidden",
  UNSIGNED_ARTIFACT: "oap.unsigned_artifact",
} as const;

/**
 * Assurance levels for OAP conformance testing
 */
export const ASSURANCE_LEVELS = {
  L0: "L0",
  L1: "L1",
  L2: "L2",
  L3: "L3",
  L4KYC: "L4KYC",
  L4FIN: "L4FIN",
} as const;

/**
 * Policy pack requirements for conformance testing
 */
export const POLICY_PACK_REQUIREMENTS = {
  "payments.refund.v1": {
    requiredCapabilities: ["payments.refund"],
    minAssurance: "L2",
    requiredContextFields: ["amount", "currency", "order_id"],
    optionalContextFields: [
      "customer_id",
      "reason_code",
      "region",
      "idempotency_key",
    ],
  },
  "data.export.v1": {
    requiredCapabilities: ["data.export"],
    minAssurance: "L1",
    requiredContextFields: ["collection"],
    optionalContextFields: ["estimated_rows", "include_pii", "region"],
  },
  "repo.release.publish.v1": {
    requiredCapabilities: ["repo.release.publish"],
    minAssurance: "L2",
    requiredContextFields: ["repo", "branch", "tag"],
    optionalContextFields: ["artifact_sha", "signer"],
  },
} as const;

/**
 * Test case validation utilities
 */
export class TestCaseValidator {
  /**
   * Validate a test case structure
   */
  static validateTestCase(testCase: TestCase): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!testCase.id) {
      errors.push("Test case ID is required");
    }

    if (!testCase.packId) {
      errors.push("Policy pack ID is required");
    }

    if (!testCase.passport) {
      errors.push("Passport is required");
    }

    if (!testCase.context) {
      errors.push("Context is required");
    }

    if (!testCase.expected) {
      errors.push("Expected result is required");
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate a policy pack test case
   */
  static validatePolicyPackTestCase(testCase: PolicyPackTestCase): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!testCase.packId) {
      errors.push("Policy pack ID is required");
    }

    if (!testCase.name) {
      errors.push("Test case name is required");
    }

    if (!Array.isArray(testCase.passports)) {
      errors.push("Passports must be an array");
    }

    if (!Array.isArray(testCase.contexts)) {
      errors.push("Contexts must be an array");
    }

    if (!Array.isArray(testCase.expected)) {
      errors.push("Expected results must be an array");
    }

    if (testCase.passports.length !== testCase.contexts.length) {
      errors.push("Number of passports must match number of contexts");
    }

    if (testCase.contexts.length !== testCase.expected.length) {
      errors.push("Number of contexts must match number of expected results");
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

/**
 * Test case generators for common scenarios
 */
export class TestCaseGenerator {
  /**
   * Generate a basic refund test case
   */
  static generateRefundTestCase(
    amount: number,
    currency: string,
    shouldPass: boolean
  ): TestCase {
    return {
      id: `payments.refund.v1:${amount}${currency}_${
        shouldPass ? "allow" : "deny"
      }`,
      packId: "payments.refund.v1",
      contextName: `${amount}${currency}_${shouldPass ? "allow" : "deny"}`,
      passport: {
        passport_id: "550e8400-e29b-41d4-a716-446655440000",
        kind: "template",
        spec_version: "oap/1.0",
        owner_id: "org_12345678",
        owner_type: "org",
        assurance_level: "L2",
        status: "active",
        capabilities: [{ id: "payments.refund" }],
        limits: {
          "payments.refund": {
            currency_limits: {
              [currency]: {
                max_per_tx: shouldPass ? amount * 2 : amount / 2,
                daily_cap: amount * 10,
              },
            },
          },
        },
        regions: ["US"],
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-15T10:30:00Z",
        version: "1.0.0",
      },
      context: {
        amount,
        currency,
        order_id: `order_${Date.now()}`,
        customer_id: "cust_123",
        reason_code: "customer_request",
        region: "US",
      },
      expected: {
        decision_id: "test_decision_id",
        policy_id: "payments.refund.v1",
        agent_id: "550e8400-e29b-41d4-a716-446655440000",
        owner_id: "org_12345678",
        assurance_level: "L2",
        allow: shouldPass,
        reasons: shouldPass
          ? [{ code: "oap.allowed", message: "Transaction within limits" }]
          : [{ code: "oap.limit_exceeded", message: "Amount exceeds limit" }],
        created_at: "2024-01-15T10:30:00Z",
        expires_in: 3600,
        passport_digest: "sha256:test_digest",
        signature: "ed25519:test_signature",
        kid: "oap:registry:test-key",
      },
    };
  }

  /**
   * Generate a data export test case
   */
  static generateDataExportTestCase(
    collection: string,
    estimatedRows: number,
    includePii: boolean,
    shouldPass: boolean
  ): TestCase {
    return {
      id: `data.export.v1:${collection}_${estimatedRows}_${
        includePii ? "pii" : "no_pii"
      }_${shouldPass ? "allow" : "deny"}`,
      packId: "data.export.v1",
      contextName: `${collection}_${estimatedRows}_${
        includePii ? "pii" : "no_pii"
      }_${shouldPass ? "allow" : "deny"}`,
      passport: {
        passport_id: "550e8400-e29b-41d4-a716-446655440001",
        kind: "template",
        spec_version: "oap/1.0",
        owner_id: "org_12345678",
        owner_type: "org",
        assurance_level: "L1",
        status: "active",
        capabilities: [{ id: "data.export" }],
        limits: {
          "data.export": {
            max_rows: shouldPass ? estimatedRows * 2 : estimatedRows / 2,
            allow_pii: includePii,
            allowed_collections: shouldPass
              ? [collection]
              : ["other_collection"],
          },
        },
        regions: ["US"],
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-15T10:30:00Z",
        version: "1.0.0",
      },
      context: {
        collection,
        estimated_rows: estimatedRows,
        include_pii: includePii,
        region: "US",
      },
      expected: {
        decision_id: "test_decision_id",
        policy_id: "data.export.v1",
        agent_id: "550e8400-e29b-41d4-a716-446655440001",
        owner_id: "org_12345678",
        assurance_level: "L1",
        allow: shouldPass,
        reasons: shouldPass
          ? [{ code: "oap.allowed", message: "Export within limits" }]
          : [{ code: "oap.limit_exceeded", message: "Row limit exceeded" }],
        created_at: "2024-01-15T10:30:00Z",
        expires_in: 3600,
        passport_digest: "sha256:test_digest",
        signature: "ed25519:test_signature",
        kid: "oap:registry:test-key",
      },
    };
  }
}
