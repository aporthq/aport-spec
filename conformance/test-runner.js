#!/usr/bin/env node

/**
 * Simple test script to verify the conformance runner works
 * This is a fallback for when TypeScript compilation isn't available
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mock implementations for testing
class MockValidator {
  async validatePassport(passport) {
    return { valid: true, errors: [] };
  }

  async validateDecision(decision) {
    return { valid: true, errors: [] };
  }

  async validateContext(packId, context) {
    return { valid: true, errors: [] };
  }
}

class MockJCS {
  canonicalize(obj) {
    return JSON.stringify(obj, Object.keys(obj).sort());
  }

  async computePassportDigest(passport) {
    return "sha256:test_digest";
  }
}

class MockEd25519 {
  async verify(message, signature, publicKey) {
    return true;
  }

  async verifyDecisionSignature(decision, signature, publicKey) {
    return true;
  }

  async verifyPassportDigest(passport, digest) {
    return true;
  }
}

// Simple test runner
class SimpleTestRunner {
  constructor() {
    this.validator = new MockValidator();
    this.jcs = new MockJCS();
    this.ed25519 = new MockEd25519();
  }

  async run() {
    console.log("🔍 OAP Conformance Test Runner v1.0.0 (Simple Mode)\n");

    try {
      // Load test cases
      const testCases = await this.loadTestCases();
      console.log(`✅ Loaded ${testCases.length} test cases`);

      // Run tests
      const results = await this.runTests(testCases);

      // Display results
      this.displayResults(results);
    } catch (error) {
      console.error("❌ Test execution failed:", error.message);
      process.exit(1);
    }
  }

  async loadTestCases() {
    const casesDir = path.join(__dirname, "cases");
    const testCases = [];

    if (!fs.existsSync(casesDir)) {
      console.warn("⚠️  No test cases directory found");
      return testCases;
    }

    const packDirs = fs
      .readdirSync(casesDir, { withFileTypes: true })
      .filter((dirent) => dirent.isDirectory())
      .map((dirent) => path.join(casesDir, dirent.name));

    for (const packDir of packDirs) {
      const packId = path.basename(packDir);
      const packCases = await this.loadPackTestCases(packDir, packId);
      testCases.push(...packCases);
    }

    return testCases;
  }

  async loadPackTestCases(packDir, packId) {
    const testCases = [];

    try {
      const passportsDir = path.join(packDir, "passports");
      const contextsDir = path.join(packDir, "contexts");
      const expectedDir = path.join(packDir, "expected");

      if (
        !fs.existsSync(passportsDir) ||
        !fs.existsSync(contextsDir) ||
        !fs.existsSync(expectedDir)
      ) {
        console.warn(`⚠️  Skipping ${packId}: missing required directories`);
        return testCases;
      }

      const passportFiles = fs
        .readdirSync(passportsDir)
        .filter((f) => f.endsWith(".json"));
      const contextFiles = fs
        .readdirSync(contextsDir)
        .filter((f) => f.endsWith(".json"));
      const expectedFiles = fs
        .readdirSync(expectedDir)
        .filter((f) => f.endsWith(".json"));

      for (const contextFile of contextFiles) {
        const contextName = contextFile.replace(".json", "");
        const expectedFile = expectedFiles.find((f) => f.includes(contextName));

        if (!expectedFile) {
          console.warn(`⚠️  No expected result for context: ${contextName}`);
          continue;
        }

        const testCase = {
          id: `${packId}:${contextName}`,
          packId,
          contextName,
          passport: JSON.parse(
            fs.readFileSync(path.join(passportsDir, passportFiles[0]), "utf-8")
          ),
          context: JSON.parse(
            fs.readFileSync(path.join(contextsDir, contextFile), "utf-8")
          ),
          expected: JSON.parse(
            fs.readFileSync(path.join(expectedDir, expectedFile), "utf-8")
          ),
        };

        testCases.push(testCase);
      }
    } catch (error) {
      console.warn(`⚠️  Error loading ${packId}: ${error.message}`);
    }

    return testCases;
  }

  async runTests(testCases) {
    const results = [];

    for (const testCase of testCases) {
      console.log(`Running ${testCase.id}...`);

      try {
        const result = await this.runTestCase(testCase);
        results.push(result);

        if (result.passed) {
          console.log(`  ✅ PASS`);
        } else {
          console.log(`  ❌ FAIL: ${result.errors.join(", ")}`);
        }
      } catch (error) {
        console.log(`  ❌ ERROR: ${error.message}`);
        results.push({
          testCase,
          passed: false,
          errors: [error.message],
          warnings: [],
        });
      }
    }

    return results;
  }

  async runTestCase(testCase) {
    const errors = [];

    // 1. Validate passport
    const passportValidation = await this.validator.validatePassport(
      testCase.passport
    );
    if (!passportValidation.valid) {
      errors.push(
        `Passport validation failed: ${passportValidation.errors.join(", ")}`
      );
    }

    // 2. Validate context
    const contextValidation = await this.validator.validateContext(
      testCase.packId,
      testCase.context
    );
    if (!contextValidation.valid) {
      errors.push(
        `Context validation failed: ${contextValidation.errors.join(", ")}`
      );
    }

    // 3. Validate expected decision
    const decisionValidation = await this.validator.validateDecision(
      testCase.expected
    );
    if (!decisionValidation.valid) {
      errors.push(
        `Expected decision validation failed: ${decisionValidation.errors.join(
          ", "
        )}`
      );
    }

    // 4. Basic policy evaluation (simplified)
    const policyResult = await this.evaluatePolicy(testCase);
    if (!policyResult.valid) {
      errors.push(
        `Policy evaluation failed: ${policyResult.errors.join(", ")}`
      );
    }

    return {
      testCase,
      passed: errors.length === 0,
      errors,
      warnings: [],
    };
  }

  async evaluatePolicy(testCase) {
    // Simplified policy evaluation for testing
    const { packId, passport, context } = testCase;

    if (packId === "payments.refund.v1") {
      const amount = context.amount || 0;
      const currency = context.currency || "USD";

      const limits =
        passport.limits?.["payments.refund"]?.currency_limits?.[currency];
      if (limits && amount > limits.max_per_tx) {
        return {
          valid: false,
          errors: [
            `Amount ${amount} exceeds max per transaction ${limits.max_per_tx}`,
          ],
        };
      }
    }

    if (packId === "data.export.v1") {
      const includePii = context.include_pii || false;
      const allowPii = passport.limits?.["data.export"]?.allow_pii || false;

      if (includePii && !allowPii) {
        return {
          valid: false,
          errors: ["PII export not allowed"],
        };
      }
    }

    return { valid: true, errors: [] };
  }

  displayResults(results) {
    console.log("\n📊 Test Results\n");

    const passed = results.filter((r) => r.passed).length;
    const failed = results.filter((r) => !r.passed).length;
    const total = results.length;

    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(
      `📈 Success Rate: ${total > 0 ? ((passed / total) * 100).toFixed(1) : 0}%`
    );

    if (failed > 0) {
      console.log("\n❌ Failed Tests:");
      results
        .filter((r) => !r.passed)
        .forEach((result) => {
          console.log(`  • ${result.testCase.id}`);
          result.errors.forEach((error) => {
            console.log(`    - ${error}`);
          });
        });
    }

    console.log("\n🎯 Conformance testing complete!\n");
  }
}

// Run the test
const runner = new SimpleTestRunner();
runner.run().catch(console.error);

export { SimpleTestRunner };
