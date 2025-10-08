#!/usr/bin/env node

/**
 * Example: Convert Verifiable Credential to OAP Passport
 */

import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { importVCToPassport } from "../dist/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Sample Verifiable Credential (OAP Passport)
const vc = {
  "@context": [
    "https://www.w3.org/2018/credentials/v1",
    "https://github.com/aporthq/aport-spec/oap/vc/context-oap-v1.jsonld",
  ],
  type: ["VerifiableCredential", "OAPPassportCredential"],
  credentialSubject: {
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
  },
  issuer: "https://api.aport.dev",
  issuanceDate: "2024-01-01T00:00:00Z",
  expirationDate: "2025-01-01T00:00:00Z",
  proof: {
    type: "Ed25519Signature2020",
    created: "2024-01-01T00:00:00Z",
    verificationMethod:
      "https://api.aport.dev/.well-known/oap/keys.json#key-2025-01",
    proofPurpose: "assertionMethod",
    jws: "eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJjcmVkZW50aWFsU3ViamVjdCI6eyJhZ2VudF9pZCI6IjU1MGU4NDAwLWUyOWItNDFkNC1hNzE2LTQ0NjY1NTQ0MDAwMCIsImtpbmQiOiJ0ZW1wbGF0ZSIsInNwZWNfdmVyc2lvbiI6Im9hcC8xLjAiLCJvd25lcl9pZCI6Im9yZ18xMjM0NTY3OCIsIm93bmVyX3R5cGUiOiJvcmciLCJhc3N1cmFuY2VfbGV2ZWwiOiJMMiIsInN0YXR1cyI6ImFjdGl2ZSIsImNhcGFiaWxpdGllcyI6W3siaWQiOiJwYXltZW50cy5yZWZ1bmQiLCJwYXJhbXMiOnsiY3VycmVuY3lfbGltaXRzIjp7IlVTRCI6eyJtYXhfcGVyX3R4Ijo1MDAwfX19fSx7ImlkIjoiZGF0YS5leHBvcnQiLCJwYXJhbXMiOnsibWF4X3Jvd3MiOjEwMDAwMH19XSwibGltaXRzIjp7InBheW1lbnRzLnJlZnVuZCI6eyJjdXJyZW5jeV9saW1pdHMiOnsiVVNEIjp7Im1heF9wZXJfdHgiOjUwMDAsImRhaWx5X2NhcCI6NTAwMDB9fSwicmVhc29uX2NvZGVzIjpbImN1c3RvbWVyX3JlcXVlc3QiLCJkZWZlY3RpdmVfcHJvZHVjdCJdLCJpZGVtcG90ZW5jeV9yZXF1aXJlZCI6dHJ1ZX19LCJyZWdpb25zIjpbIlVTIiwiQ0EiXSwibWV0YWRhdGEiOnsibmFtZSI6IkN1c3RvbWVyIFN1cHBvcnQgQUkiLCJkZXNjcmlwdGlvbiI6IkFJIGFnZW50IGZvciBjdXN0b21lciBzdXBwb3J0IG9wZXJhdGlvbnMifSwiY3JlYXRlZF9hdCI6IjIwMjQtMDEtMDFUMDA6MDA6MDBaIiwidXBkYXRlZF9hdCI6IjIwMjQtMDEtMTVUMTA6MzA6MDBaIiwidmVyc2lvbiI6IjEuMC4wIn0sImlzc3VlciI6Imh0dHBzOi8vYXBpLmFwb3J0LmRldiIsImlzc3VhbmNlRGF0ZSI6IjIwMjQtMDEtMDFUMDA6MDA6MDBaIiwiZXhwaXJhdGlvbkRhdGUiOiIyMDI1LTAxLTAxVDAwOjAwOjAwWiJ9.signature",
  },
};

try {
  console.log("🔄 Converting Verifiable Credential to OAP Passport...\n");

  // Convert VC to passport
  const passport = importVCToPassport(vc);

  // Save to file
  const outputFile = join(__dirname, "passport.json");
  writeFileSync(outputFile, JSON.stringify(passport, null, 2));

  console.log("✅ Conversion successful!");
  console.log(`🆔 Agent ID: ${passport.agent_id}`);
  console.log(`📋 Kind: ${passport.kind}`);
  console.log(`🔐 Assurance Level: ${passport.assurance_level}`);
  console.log(`📊 Capabilities: ${passport.capabilities.length} capabilities`);
  console.log(`🌍 Regions: ${passport.regions.join(", ")}`);
  console.log(`📁 Output saved to: ${outputFile}`);

  // Log the converted data
  console.log("\n📄 Converted Passport Data:");
  console.log("─".repeat(50));
  console.log(JSON.stringify(passport, null, 2));
  console.log("─".repeat(50));
} catch (error) {
  console.error("❌ Conversion failed:", error.message);
  process.exit(1);
}
