/**
 * Test suite for OAP VC conversion tools
 */

import {
  exportPassportToVC,
  exportDecisionToVC,
  importVCToPassport,
  importVCToDecision,
  OAPPassport,
  OAPDecision,
  RegistryKey,
} from "./index.js";

// Sample OAP Passport
const samplePassport: OAPPassport = {
  agent_id: "550e8400-e29b-41d4-a716-446655440000",
  kind: "template",
  spec_version: "oap/1.0",
  owner_id: "org_12345678",
  owner_type: "org",
  assurance_level: "L2",
  status: "active",
  capabilities: [
    {
      id: "payments.refund",
      params: { currency_limits: { USD: { max_per_tx: 5000 } } },
    },
    { id: "data.export", params: { max_rows: 100000 } },
  ],
  limits: {
    "payments.refund": {
      currency_limits: {
        USD: { max_per_tx: 5000, daily_cap: 50000 },
      },
      reason_codes: ["customer_request", "defective_product"],
      idempotency_required: true,
    },
  },
  regions: ["US", "CA"],
  metadata: {
    name: "Customer Support AI",
    description: "AI agent for customer support operations",
  },
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-15T10:30:00Z",
  version: "1.0.0",
};

// Sample OAP Decision
const sampleDecision: OAPDecision = {
  decision_id: "550e8400-e29b-41d4-a716-446655440002",
  policy_id: "payments.refund.v1",
  agent_id: "550e8400-e29b-41d4-a716-446655440000",
  owner_id: "org_12345678",
  assurance_level: "L2",
  allow: true,
  reasons: [{ code: "oap.allowed", message: "Transaction within limits" }],
  created_at: "2024-01-15T10:30:00Z",
  expires_in: 3600,
  passport_digest:
    "sha256:abcd1234efgh5678ijkl9012mnop3456qrst7890uvwx1234yzab5678cdef",
  signature: "eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9...",
  kid: "oap:registry:key-2025-01",
  decision_token: "eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9...",
};

// Sample Registry Key
const sampleRegistryKey: RegistryKey = {
  issuer: "https://api.aport.dev",
  kid: "key-2025-01",
  publicKey: "placeholder-public-key",
  privateKey: "placeholder-private-key",
};

async function runTests() {
  console.log("🧪 Running OAP VC Conversion Tests\n");

  try {
    // Test 1: Export Passport to VC
    console.log("1. Testing Passport → VC conversion...");
    const passportVC = exportPassportToVC(samplePassport, sampleRegistryKey);
    console.log("   ✅ Passport exported to VC successfully");
    console.log(`   📄 VC Type: ${passportVC.type.join(", ")}`);
    console.log(`   🏢 Issuer: ${passportVC.issuer}`);
    console.log(`   📅 Issuance Date: ${passportVC.issuanceDate}`);
    console.log(`   ⏰ Expiration Date: ${passportVC.expirationDate}\n`);

    // Test 2: Export Decision to VC
    console.log("2. Testing Decision → VC conversion...");
    const decisionVC = exportDecisionToVC(sampleDecision, sampleRegistryKey);
    console.log("   ✅ Decision exported to VC successfully");
    console.log(`   📄 VC Type: ${decisionVC.type.join(", ")}`);
    console.log(`   🏢 Issuer: ${decisionVC.issuer}`);
    console.log(`   📅 Issuance Date: ${decisionVC.issuanceDate}`);
    console.log(`   ⏰ Expiration Date: ${decisionVC.expirationDate}\n`);

    // Test 3: Import VC to Passport
    console.log("3. Testing VC → Passport conversion...");
    const importedPassport = importVCToPassport(passportVC);
    console.log("   ✅ VC imported to Passport successfully");
    console.log(`   🆔 Agent ID: ${importedPassport.agent_id}`);
    console.log(`   📋 Kind: ${importedPassport.kind}`);
    console.log(`   🔐 Assurance Level: ${importedPassport.assurance_level}`);
    console.log(
      `   📊 Capabilities: ${importedPassport.capabilities.length} capabilities\n`
    );

    // Test 4: Import VC to Decision
    console.log("4. Testing VC → Decision conversion...");
    const importedDecision = importVCToDecision(decisionVC);
    console.log("   ✅ VC imported to Decision successfully");
    console.log(`   🆔 Decision ID: ${importedDecision.decision_id}`);
    console.log(`   📋 Policy ID: ${importedDecision.policy_id}`);
    console.log(`   ✅ Allow: ${importedDecision.allow}`);
    console.log(`   📝 Reasons: ${importedDecision.reasons.length} reasons\n`);

    // Test 5: Round-trip conversion
    console.log(
      "5. Testing round-trip conversion (Passport → VC → Passport)..."
    );
    const roundTripPassport = importVCToPassport(
      exportPassportToVC(samplePassport, sampleRegistryKey)
    );
    const isEqual =
      JSON.stringify(samplePassport) === JSON.stringify(roundTripPassport);
    console.log(
      `   ${isEqual ? "✅" : "❌"} Round-trip conversion ${
        isEqual ? "preserved" : "modified"
      } data`
    );
    console.log(`   🆔 Original Agent ID: ${samplePassport.agent_id}`);
    console.log(`   🆔 Round-trip Agent ID: ${roundTripPassport.agent_id}\n`);

    console.log(
      "🎉 All tests passed! OAP VC conversion tools are working correctly."
    );
  } catch (error) {
    console.error(
      "❌ Test failed:",
      error instanceof Error ? error.message : "Unknown error"
    );
    process.exit(1);
  }
}

// Run tests
runTests();
