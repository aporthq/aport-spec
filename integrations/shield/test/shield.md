---
name: shield.md
description: Context-based runtime threat feed policy. Uses structured threat entries to decide log, require_approval, or block.
version: "0.1"
---

# shield-v0.md (example)

## Purpose
Example threat feed for OAP integration demo. Converts to OAP policy pack and is verified via POST /api/verify/policy/IN_BODY.

## Active threats (compressed)

---
id: T001
fingerprint: example-destructive-cmd
category: tool
severity: critical
confidence: 0.95
action: block
title: Destructive shell commands
recommendation_agent: BLOCK: command contains rm -rf
expires_at: null
revoked: false
---
Block commands containing `rm -rf`.

---
id: T002
fingerprint: example-sudo
category: tool
severity: high
confidence: 0.9
action: require_approval
title: Privilege escalation
recommendation_agent: APPROVE: command contains sudo
expires_at: null
revoked: false
---
Require approval for commands containing `sudo`.
