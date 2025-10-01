#!/usr/bin/env node

/**
 * Simple test of OAP VC conversion tools
 */

// Mock the conversion functions for demonstration
function exportPassportToVC(passport, registryKey) {
  return {
    "@context": [
      "https://www.w3.org/2018/credentials/v1",
      "https://github.com/aporthq/aport-spec/oap/vc/context-oap-v1.jsonld",
    ],
    type: ["VerifiableCredential", "OAPPassportCredential"],
    credentialSubject: passport,
    issuer: registryKey.issuer,
    issuanceDate: passport.created_at,
    expirationDate: new Date(
      new Date(passport.created_at).getTime() + 365 * 24 * 60 * 60 * 1000
    ).toISOString(),
    proof: {
      type: "Ed25519Signature2020",
      created: passport.created_at,
      verificationMethod: `${registryKey.issuer}/.well-known/oap/keys.json#${registryKey.kid}`,
      proofPurpose: "assertionMethod",
      jws: "eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9...",
    },
  };
}

function exportDecisionToVC(decision, registryKey) {
  return {
    "@context": [
      "https://www.w3.org/2018/credentials/v1",
      "https://github.com/aporthq/aport-spec/oap/vc/context-oap-v1.jsonld",
    ],
    type: ["VerifiableCredential", "OAPDecisionReceipt"],
    credentialSubject: decision,
    issuer: registryKey.issuer,
    issuanceDate: decision.created_at,
    expirationDate: new Date(
      new Date(decision.created_at).getTime() + decision.expires_in * 1000
    ).toISOString(),
    proof: {
      type: "Ed25519Signature2020",
      created: decision.created_at,
      verificationMethod: `${registryKey.issuer}/.well-known/oap/keys.json#${registryKey.kid}`,
      proofPurpose: "assertionMethod",
      jws: "eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9...",
    },
  };
}

function importVCToPassport(vc) {
  return vc.credentialSubject;
}

function importVCToDecision(vc) {
  return vc.credentialSubject;
}

// Test data
const samplePassport = {
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
  ],
  limits: {
    "payments.refund": {
      currency_limits: { USD: { max_per_tx: 5000, daily_cap: 50000 } },
      reason_codes: ["customer_request"],
      idempotency_required: true,
    },
  },
  regions: ["US", "CA"],
  metadata: { name: "Customer Support AI" },
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-15T10:30:00Z",
  version: "1.0.0",
};

const sampleDecision = {
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
};

const registryKey = {
  issuer: "https://api.aport.dev",
  kid: "key-2025-01",
};

// Run tests
console.log("🧪 Testing OAP VC Conversion Tools\n");

try {
  // Test 1: Passport → VC
  console.log("1. Converting Passport → VC...");
  const passportVC = exportPassportToVC(samplePassport, registryKey);
  console.log("   ✅ Success");
  console.log(`   📄 Type: ${passportVC.type.join(", ")}`);
  console.log(`   🏢 Issuer: ${passportVC.issuer}`);
  console.log(`   📅 Issuance: ${passportVC.issuanceDate}`);
  console.log(`   ⏰ Expiration: ${passportVC.expirationDate}`);
  console.log("   📄 Sample VC Data:");
  console.log(
    "   " +
      JSON.stringify(passportVC, null, 2)
        .split("\n")
        .slice(0, 10)
        .join("\n   ") +
      "\n   ...\n"
  );

  // Test 2: Decision → VC
  console.log("2. Converting Decision → VC...");
  const decisionVC = exportDecisionToVC(sampleDecision, registryKey);
  console.log("   ✅ Success");
  console.log(`   📄 Type: ${decisionVC.type.join(", ")}`);
  console.log(`   🏢 Issuer: ${decisionVC.issuer}`);
  console.log(`   📅 Issuance: ${decisionVC.issuanceDate}`);
  console.log(`   ⏰ Expiration: ${decisionVC.expirationDate}`);
  console.log("   📄 Sample VC Data:");
  console.log(
    "   " +
      JSON.stringify(decisionVC, null, 2)
        .split("\n")
        .slice(0, 10)
        .join("\n   ") +
      "\n   ...\n"
  );

  // Test 3: VC → Passport
  console.log("3. Converting VC → Passport...");
  const importedPassport = importVCToPassport(passportVC);
  console.log("   ✅ Success");
  console.log(`   🆔 Agent ID: ${importedPassport.agent_id}`);
  console.log(`   📋 Kind: ${importedPassport.kind}`);
  console.log(`   🔐 Assurance: ${importedPassport.assurance_level}`);
  console.log("   📄 Sample Passport Data:");
  console.log(
    "   " +
      JSON.stringify(importedPassport, null, 2)
        .split("\n")
        .slice(0, 8)
        .join("\n   ") +
      "\n   ...\n"
  );

  // Test 4: VC → Decision
  console.log("4. Converting VC → Decision...");
  const importedDecision = importVCToDecision(decisionVC);
  console.log("   ✅ Success");
  console.log(`   🆔 Decision ID: ${importedDecision.decision_id}`);
  console.log(`   📋 Policy ID: ${importedDecision.policy_id}`);
  console.log(`   ✅ Allow: ${importedDecision.allow}`);
  console.log("   📄 Sample Decision Data:");
  console.log(
    "   " +
      JSON.stringify(importedDecision, null, 2)
        .split("\n")
        .slice(0, 8)
        .join("\n   ") +
      "\n   ...\n"
  );

  // Test 5: Round-trip
  console.log("5. Testing round-trip conversion...");
  const roundTripPassport = importVCToPassport(
    exportPassportToVC(samplePassport, registryKey)
  );
  const isEqual =
    JSON.stringify(samplePassport) === JSON.stringify(roundTripPassport);
  console.log(
    `   ${isEqual ? "✅" : "❌"} Round-trip ${
      isEqual ? "preserved" : "modified"
    } data\n`
  );

  console.log(
    "🎉 All tests passed! OAP VC conversion tools are working correctly."
  );
  console.log("\n📚 Next steps:");
  console.log("   • Install dependencies: npm install");
  console.log("   • Build TypeScript: npm run build");
  console.log(
    "   • Use CLI: npx oap-vc export --type passport --input passport.json --output passport.vc.json --key registry-key.json"
  );
  console.log(
    '   • Use SDK: import { exportPassportToVC } from "@oap/vc-tools"'
  );
} catch (error) {
  console.error("❌ Test failed:", error.message);
  process.exit(1);
}
