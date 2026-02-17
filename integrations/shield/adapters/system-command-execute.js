/**
 * SHIELD scope adapter: tool.call → OAP system.command.execute
 *
 * Parses recommendation_agent for "command contains X" (BLOCK/APPROVE).
 * Outputs OAP policy pack + limits fragment for system.command.execute.
 *
 * @see https://nova-hunting.github.io/shield.md/
 */

// OAP policy pack shape for system.command.execute (SHIELD scope: tool.call)
const POLICY = {
  id: "shield.system.command.execute.v1",
  name: "System Command Execution (from SHIELD)",
  description: "OAP policy pack produced from SHIELD threat feed.",
  version: "1.0.0",
  status: "active",
  requires_capabilities: ["system.command.execute"],
  min_assurance: "L0",
  limits_required: ["allowed_commands", "max_execution_time"],
  required_fields: ["command"],
  optional_fields: ["args", "cwd", "env", "timeout", "shell", "user"],
  enforcement: {
    command_allowlist_enforced: true,
    blocked_patterns_enforced: true,
    execution_time_enforced: true,
  },
  required_context: {
    $schema: "http://json-schema.org/draft-07/schema#",
    type: "object",
    required: ["command"],
    properties: {
      command: { type: "string", minLength: 1, maxLength: 10000 },
      args: { type: "array", items: { type: "string" }, maxItems: 100 },
      cwd: { type: "string", maxLength: 4096 },
      env: { type: "object", additionalProperties: { type: "string" } },
      timeout: { type: "integer", minimum: 1, maximum: 3600 },
    },
  },
  evaluation_rules_version: "1.0",
  evaluation_rules: [
    {
      name: "command_allowlist",
      type: "expression",
      condition:
        "limits.allowed_commands.includes('*') || limits.allowed_commands.includes(context.command) || limits.allowed_commands.some(c => context.command.startsWith(c))",
      deny_code: "oap.command_not_allowed",
      description: "Command must be in allowed list",
    },
    {
      name: "blocked_patterns",
      type: "custom_validator",
      validator: "validateBlockedPatterns",
      deny_code: "oap.blocked_pattern",
      description: "Command must not contain blocked patterns (SHIELD-aligned)",
    },
    {
      name: "execution_time_limit",
      type: "expression",
      condition:
        "!context.timeout || context.timeout <= limits.max_execution_time",
      deny_code: "oap.limit_exceeded",
      description: "Execution time must not exceed limit",
    },
  ],
};

function recommendationToPatterns(recommendation_agent) {
  const block = [];
  const approve = [];
  if (!recommendation_agent || typeof recommendation_agent !== "string")
    return { block, approve };
  const blockMatch = recommendation_agent.match(
    /BLOCK:\s*command contains\s+(.+?)(?:\s+OR\s+command contains\s+(.+))?$/i,
  );
  const approveMatch = recommendation_agent.match(
    /APPROVE:\s*command contains\s+(.+?)(?:\s+OR\s+command contains\s+(.+))?$/i,
  );
  if (blockMatch) {
    block.push(blockMatch[1].trim());
    if (blockMatch[2]) block.push(blockMatch[2].trim());
  }
  if (approveMatch) {
    approve.push(approveMatch[1].trim());
    if (approveMatch[2]) approve.push(approveMatch[2].trim());
  }
  return { block, approve };
}

/**
 * Convert threats (tool scope) to OAP limits fragment for system.command.execute.
 */
function threatsToLimitsFragment(threats) {
  const blocked_patterns = [];
  const shieldThreats = [];
  for (const t of threats) {
    if (t.revoked === "true") continue;
    const { block, approve } = recommendationToPatterns(t.recommendation_agent);
    blocked_patterns.push(...block, ...approve);
    shieldThreats.push({
      id: `shield_${t.id}`,
      fingerprint: t.fingerprint || null,
      category: t.category || "tool",
      severity: t.severity || "high",
      confidence: parseFloat(t.confidence) || 0.9,
      action: t.action || "block",
      title: t.title || t.id,
      recommendation_agent: t.recommendation_agent || null,
      expires_at: t.expires_at === "null" ? null : t.expires_at,
      revoked: t.revoked === "true",
    });
  }
  return {
    allowed_commands: ["npm", "git", "node", "python"],
    blocked_patterns: [...new Set(blocked_patterns)],
    max_execution_time: 300,
    shield: { threats: shieldThreats },
  };
}

/**
 * Convert threats for tool.call scope to { policy, limitsFragment }.
 */
function convert(threats) {
  const limitsFragment = threatsToLimitsFragment(threats);
  return { policy: { ...POLICY }, limitsFragment };
}

module.exports = {
  scope: "tool.call",
  capability: "system.command.execute",
  convert,
  threatsToLimitsFragment,
};
