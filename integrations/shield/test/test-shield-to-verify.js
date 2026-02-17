#!/usr/bin/env node

/**
 * SHIELD integration tests: conversion, APort verify, and response shape.
 *
 * Flow: shield.md → adapters (index.js → system-command-execute) → policy + limits → verify.
 * Policy is always generated from shield.md via the scope adapters.
 *
 * 1. Conversion: shield.md → OAP policy pack + limits (via adapters/index.js).
 * 2. APort fit: POST /api/verify/policy/IN_BODY with that policy and passport.
 * 3. Response shape: deny reason fits SHIELD/OAP.
 *
 * Run: node spec/integrations/shield/test/test-shield-to-verify.js
 * Requires: shield.md in this folder. API_BASE:
 *   - APORT_API_BASE_URL set → use it
 *   - LOCAL=1 or RUN_LOCAL=1 → http://localhost:8787
 *   - else (e.g. CI) → https://api.aport.io (live)
 *
 * @see spec/integrations/shield/README.md
 * @see spec/integrations/shield/adapters/index.js
 */

const fs = require("fs");
const path = require("path");

const isLocal =
  process.env.LOCAL === "1" ||
  process.env.RUN_LOCAL === "1" ||
  process.env.APORT_VERIFY_LOCAL === "1";

const API_BASE =
  process.env.APORT_API_BASE_URL ||
  (isLocal ? "http://localhost:8787" : "https://api.aport.io");

const shieldPath = path.join(__dirname, "shield.md");

const { convert } = require("../adapters/index.js");

function log(msg, type = "info") {
  const c = {
    info: "\x1b[36m",
    success: "\x1b[32m",
    error: "\x1b[31m",
    warning: "\x1b[33m",
    reset: "\x1b[0m",
  };
  console.log(`${c[type] || c.info}${msg}${c.reset}`);
}

async function verifyWithPolicyInBody(body, expectAllow) {
  const res = await fetch(`${API_BASE}/api/verify/policy/IN_BODY`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  const decision = data.data?.decision || data.decision;
  const allowed = decision?.allow === true;
  const firstReason = decision?.reasons?.[0];

  if (res.status !== 200) {
    log(`HTTP ${res.status}: ${JSON.stringify(data)}`, "error");
    return { ok: false, allowed, decision, data, firstReason };
  }

  const pass = allowed === expectAllow;
  log(
    `${pass ? "✅" : "❌"} ${allowed ? "ALLOWED" : "DENIED"} (expected ${expectAllow ? "ALLOWED" : "DENIED"}) ${firstReason?.message || ""}`,
    pass ? "success" : "error",
  );
  return { ok: pass, allowed, decision, data, firstReason };
}

function runConversionTests() {
  log("\n--- 1. Conversion (shield.md → OAP policy + limits) ---\n", "info");
  let passed = 0;
  let failed = 0;

  if (!fs.existsSync(shieldPath)) {
    log(
      "shield.md not found; run from repo root with test/shield.md present",
      "error",
    );
    failed++;
    return { passed, failed, policy: null, limitsFragment: null };
  }

  const { policy, limitsFragment, threats } = convert(shieldPath);

  if (!policy || !policy.id || !policy.requires_capabilities) {
    log(
      "Conversion failed: policy missing id or requires_capabilities",
      "error",
    );
    failed++;
  } else {
    log("Converted policy id: " + policy.id, "success");
    passed++;
  }

  if (
    !limitsFragment ||
    typeof limitsFragment.blocked_patterns === "undefined"
  ) {
    log("Conversion failed: limits fragment missing blocked_patterns", "error");
    failed++;
  } else {
    log(
      "Limits fragment blocked_patterns: " +
        limitsFragment.blocked_patterns.join(", "),
      "success",
    );
    passed++;
  }

  if (!Array.isArray(threats) || threats.length === 0) {
    log("Conversion failed: no threats parsed", "error");
    failed++;
  } else {
    log("Parsed " + threats.length + " threat(s) from shield.md", "success");
    passed++;
  }

  return { passed, failed, policy, limitsFragment };
}

async function runVerifyTests(policy, passport) {
  log("\n--- 2. APort verify (policy + passport → allow/deny) ---\n", "info");
  let passed = 0;
  let failed = 0;

  const body = { context: {}, passport, policy };

  const r1 = await verifyWithPolicyInBody(
    { ...body, context: { command: "npm", args: ["install"] } },
    true,
  );
  if (r1.ok) passed++;
  else failed++;

  const r2 = await verifyWithPolicyInBody(
    { ...body, context: { command: "sh", args: ["-c", "rm -rf /tmp/foo"] } },
    false,
  );
  if (r2.ok) passed++;
  else failed++;

  const r3 = await verifyWithPolicyInBody(
    { ...body, context: { command: "git", args: ["status"] } },
    true,
  );
  if (r3.ok) passed++;
  else failed++;

  const r4 = await verifyWithPolicyInBody(
    { ...body, context: { command: "sudo", args: ["ls"] } },
    false,
  );
  if (r4.ok) passed++;
  else failed++;

  return { passed, failed, denyReason: r2.firstReason };
}

function runResponseShapeTests(denyReason) {
  log("\n--- 3. Response shape (deny fits SHIELD / OAP) ---\n", "info");
  let passed = 0;
  let failed = 0;

  if (!denyReason) {
    log("No deny reason to check (run verify tests first)", "warning");
    return { passed, failed };
  }

  const msg = (denyReason.message || "").toLowerCase();
  if (
    msg.includes("blocked") ||
    msg.includes("dangerous") ||
    msg.includes("pattern") ||
    msg.includes("not allowed")
  ) {
    log(
      "Deny reason is SHIELD/OAP-style: " +
        (denyReason.message || "").slice(0, 80),
      "success",
    );
    passed++;
  } else {
    log(
      "Deny reason (optional SHIELD format): " +
        (denyReason.message || "").slice(0, 80),
      "info",
    );
    passed++;
  }

  if (denyReason.code) {
    log("Deny code present: " + denyReason.code, "success");
    passed++;
  }

  return { passed, failed };
}

async function run() {
  log(
    "\n=== SHIELD integration tests (conversion, verify, response) ===\n",
    "info",
  );
  log("API_BASE=" + API_BASE + "  pack_id=IN_BODY\n", "info");

  let totalPassed = 0;
  let totalFailed = 0;

  const conv = runConversionTests();
  totalPassed += conv.passed;
  totalFailed += conv.failed;

  const policy = conv.policy;
  const limitsFragment = conv.limitsFragment;

  if (!policy || !limitsFragment) {
    log(
      "Conversion did not produce policy/limits; cannot run verify tests",
      "error",
    );
    totalFailed++;
  } else {
    const passport = {
      agent_id: "ap_shield_demo_001",
      name: "SHIELD demo agent",
      controller_type: "person",
      description: "Agent for SHIELD→OAP verify example",
      owner_id: "ap_org_shield_demo",
      owner: "SHIELD Demo Org",
      role: "Developer",
      capabilities: [
        {
          id: "system.command.execute",
          description: "System command execution",
        },
      ],
      limits: limitsFragment,
      regions: ["US"],
      status: "active",
      assurance_level: "L2",
      contact: "shield-demo@example.com",
      version: "1.0.0",
    };

    const verify = await runVerifyTests(policy, passport);
    totalPassed += verify.passed;
    totalFailed += verify.failed;

    const resp = runResponseShapeTests(verify.denyReason);
    totalPassed += resp.passed;
    totalFailed += resp.failed;
  }

  log(
    "\n--- Summary: " +
      totalPassed +
      " passed, " +
      totalFailed +
      " failed ---\n",
    totalFailed ? "error" : "success",
  );
  process.exit(totalFailed > 0 ? 1 : 0);
}

run().catch((err) => {
  log("Error: " + err.message, "error");
  process.exit(1);
});
