#!/usr/bin/env node

/**
 * SHIELD → OAP adapters: one per scope.
 * index.js imports each scope adapter and exposes convert(shieldPath).
 * When run as CLI: node adapters/index.js [shield.md] → JSON (policy, limitsFragment, threats).
 *
 * @see https://nova-hunting.github.io/shield.md/
 */

const fs = require("fs");
const path = require("path");

const DEFAULT_INPUT = path.join(__dirname, "..", "test", "shield.md");

const systemCommandExecute = require("./system-command-execute.js");

const SCOPE_ADAPTERS = {
  "tool.call": systemCommandExecute,
  // future: "mcp": mcpToolExecute, "skill.execute": skillExecute, ...
};

/**
 * Parse SHIELD markdown: extract threat blocks (YAML between ---).
 * Returns array of threat objects (Active threats compressed fields).
 */
function parseShieldMd(content) {
  const threats = [];
  const blockRe = /^---\s*\n([\s\S]*?)\n---/gm;
  let m;
  while ((m = blockRe.exec(content)) !== null) {
    const yaml = m[1].trim();
    if (!yaml) continue;
    const entry = {};
    for (const line of yaml.split("\n")) {
      const colon = line.indexOf(":");
      if (colon === -1) continue;
      const key = line.slice(0, colon).trim();
      const value = line
        .slice(colon + 1)
        .trim()
        .replace(/^["']|["']$/g, "");
      entry[key] = value;
    }
    if (entry.id) threats.push(entry);
  }
  return threats;
}

/**
 * Map threat.category to SHIELD scope for adapter selection.
 */
function categoryToScope(category) {
  const map = {
    tool: "tool.call",
    mcp: "mcp",
    prompt: "prompt",
    skill: "skill.execute",
    memory: "memory",
    supply_chain: "supply_chain",
    vulnerability: "vulnerability",
    fraud: "fraud",
    policy_bypass: "policy_bypass",
    anomaly: "anomaly",
    other: "other",
  };
  return map[category] || "tool.call";
}

/**
 * Convert shield.md to OAP policy + limits using scope adapters.
 * Currently only tool.call (system.command.execute) is implemented;
 * threats with category "tool" are passed to that adapter. Other categories
 * are ignored until adapters are added.
 */
function convert(shieldPath) {
  const content = fs.readFileSync(shieldPath, "utf8");
  const threats = parseShieldMd(content);
  const toolThreats = threats.filter((t) => categoryToScope(t.category || "tool") === "tool.call");
  const adapter = SCOPE_ADAPTERS["tool.call"];
  const { policy, limitsFragment } = adapter.convert(toolThreats);
  return { policy, limitsFragment, threats };
}

function main() {
  const inputPath = process.argv[2] || DEFAULT_INPUT;
  if (!fs.existsSync(inputPath)) {
    console.error("File not found:", inputPath);
    process.exit(1);
  }
  const { policy, limitsFragment, threats } = convert(inputPath);
  if (process.env.SHIELD_OUTPUT === "limits") {
    console.log(JSON.stringify(limitsFragment, null, 2));
    return;
  }
  if (process.env.SHIELD_OUTPUT === "policy") {
    console.log(JSON.stringify(policy, null, 2));
    return;
  }
  console.log(JSON.stringify({ policy, limitsFragment, threats }, null, 2));
}

if (require.main === module) {
  main();
}

module.exports = {
  convert,
  parseShieldMd,
  getAdapterForScope(scope) {
    return SCOPE_ADAPTERS[scope] || null;
  },
  adapters: {
    systemCommandExecute,
  },
};
