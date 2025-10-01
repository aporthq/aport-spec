#!/usr/bin/env node

/**
 * Example: Convert Verifiable Credential to OAP Decision
 */

import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { importVCToDecision } from "../dist/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Sample Verifiable Credential (OAP Decision)
const vc = {
  "@context": [
    "https://www.w3.org/2018/credentials/v1",
    "https://github.com/aporthq/aport-spec/oap/vc/context-oap-v1.jsonld",
  ],
  type: ["VerifiableCredential", "OAPDecisionReceipt"],
  credentialSubject: {
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
  },
  issuer: "https://api.aport.dev",
  issuanceDate: "2024-01-15T10:30:00Z",
  expirationDate: "2024-01-15T11:30:00Z",
  proof: {
    type: "Ed25519Signature2020",
    created: "2024-01-15T10:30:00Z",
    verificationMethod:
      "https://api.aport.dev/.well-known/oap/keys.json#key-2025-01",
    proofPurpose: "assertionMethod",
    jws: "eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJjcmVkZW50aWFsU3ViamVjdCI6eyJkZWNpc2lvbl9pZCI6IjU1MGU4NDAwLWUyOWItNDFkNC1hNzE2LTQ0NjY1NTQ0MDAwMiIsInBvbGljeV9pZCI6InBheW1lbnRzLnJlZnVuZC52MSIsImFnZW50X2lkIjoiNTUwZTg0MDAtZTI5Yi00MWQ0LWE3MTYtNDQ2NjU1NDQwMDAwIiwib3duZXJfaWQiOiJvcmdfMTIzNDU2NzgiLCJhc3N1cmFuY2VfbGV2ZWwiOiJMMiIsImFsbG93Ijp0cnVlLCJyZWFzb25zIjpbeyJjb2RlIjoib2FwLmFsbG93ZWQiLCJtZXNzYWdlIjoiVHJhbnNhY3Rpb24gd2l0aGluIGxpbWl0cyJ9XSwicGFzc3BvcnRfZGlnZXN0Ijoic2hhMjU2OmFiY2QxMjM0ZWZnaDU2NzhpamtsOTAxMm1ub3AzNDU2cXJzdDc4OTB1dnd4MTIzNHl6YWI1Njc4Y2RlZiIsInNpZ25hdHVyZSI6ImV5SmhiR2NpT2lKU1V6STFOaUlzSW5SNWNDSTZJa3BYVkNKOS5leUpoYkdjaU9pSlNVekkxTmlJc0luUjVjQ0k2SWtwWFZDSjkucGxhY2Vob2xkZXIifQ.signature",
  },
};

try {
  console.log("🔄 Converting Verifiable Credential to OAP Decision...\n");

  // Convert VC to decision
  const decision = importVCToDecision(vc);

  // Save to file
  const outputFile = join(__dirname, "decision.json");
  writeFileSync(outputFile, JSON.stringify(decision, null, 2));

  console.log("✅ Conversion successful!");
  console.log(`🆔 Decision ID: ${decision.decision_id}`);
  console.log(`📋 Policy ID: ${decision.policy_id}`);
  console.log(`✅ Allow: ${decision.allow}`);
  console.log(`📝 Reasons: ${decision.reasons.length} reasons`);
  console.log(`⏰ Expires In: ${decision.expires_in} seconds`);
  console.log(`📁 Output saved to: ${outputFile}`);

  // Log the converted data
  console.log("\n📄 Converted Decision Data:");
  console.log("─".repeat(50));
  console.log(JSON.stringify(decision, null, 2));
  console.log("─".repeat(50));
} catch (error) {
  console.error("❌ Conversion failed:", error.message);
  process.exit(1);
}
