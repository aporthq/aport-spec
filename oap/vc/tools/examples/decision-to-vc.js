#!/usr/bin/env node

/**
 * Example: Convert OAP Decision to Verifiable Credential
 */

import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { exportDecisionToVC } from "../dist/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Sample OAP Decision
const decision = {
  decision_id: "550e8400-e29b-41d4-a716-446655440002",
  policy_id: "finance.payment.refund.v1",
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
const registryKey = {
  issuer: "https://api.aport.dev",
  kid: "key-2025-01",
  publicKey: "placeholder-public-key",
  privateKey: "placeholder-private-key",
};

try {
  console.log("🔄 Converting OAP Decision to Verifiable Credential...\n");

  // Convert decision to VC
  const vc = exportDecisionToVC(decision, registryKey);

  // Save to file
  const outputFile = join(__dirname, "decision.vc.json");
  writeFileSync(outputFile, JSON.stringify(vc, null, 2));

  console.log("✅ Conversion successful!");
  console.log(`📄 VC Type: ${vc.type.join(", ")}`);
  console.log(`🏢 Issuer: ${vc.issuer}`);
  console.log(`📅 Issuance Date: ${vc.issuanceDate}`);
  console.log(`⏰ Expiration Date: ${vc.expirationDate}`);
  console.log(`📁 Output saved to: ${outputFile}`);

  // Log the converted data
  console.log("\n📄 Converted VC Data:");
  console.log("─".repeat(50));
  console.log(JSON.stringify(vc, null, 2));
  console.log("─".repeat(50));
} catch (error) {
  console.error("❌ Conversion failed:", error.message);
  process.exit(1);
}
