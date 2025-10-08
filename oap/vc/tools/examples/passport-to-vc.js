#!/usr/bin/env node

/**
 * Example: Convert OAP Passport to Verifiable Credential
 */

import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { exportPassportToVC } from "../dist/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Sample OAP Passport
const passport = {
  agent_id: "550e8400-e29b-41d4-a716-446655440000",
  kind: "template",
  spec_version: "oap/1.0",
  owner_id: "org_12345678",
  owner_type: "org",
  assurance_level: "L2",
  status: "active",
  capabilities: [
    {
      id: "finance.payment.refund",
      params: { currency_limits: { USD: { max_per_tx: 5000 } } },
    },
    { id: "data.export", params: { max_rows: 100000 } },
  ],
  limits: {
    "finance.payment.refund": {
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

// Sample Registry Key
const registryKey = {
  issuer: "https://api.aport.dev",
  kid: "key-2025-01",
  publicKey: "placeholder-public-key",
  privateKey: "placeholder-private-key",
};

try {
  console.log("🔄 Converting OAP Passport to Verifiable Credential...\n");

  // Convert passport to VC
  const vc = exportPassportToVC(passport, registryKey);

  // Save to file
  const outputFile = join(__dirname, "passport.vc.json");
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
