# ClawMoat Integration (Placeholder)

_Last updated: 2026-02-17_

ClawMoat is an open-source detection layer for AI agents (prompt injection, data exfiltration, secret leakage). In the layered model from OpenClaw issue #12385, ClawMoat supplies detections while OAP/APort performs authorization.

**Open Agent Passport (OAP) v1.0** ([spec](../../oap/oap-spec.md)) provides the runtime authorization layer SHIELD v1 envisions:
- Passports (W3C VC/DID-aligned) describe agent capabilities and limits.
- Policy packs define evaluation rules; **limits** (e.g. allowlists, blocked patterns, threat data) live in the **passport** under `limits.{capability}`.
- APort guardrails evaluate policy packs against passport + context and enforce deterministically (e.g. `before_tool_call` in OpenClaw).

This folder will hold the detector schema + adapter notes once we formalize the shared findings format. For now, the priority is shipping the SHIELD→OAP mapping; ClawMoat integration will follow the same `{threat_id, module, severity, confidence}` structure when we’re ready to onboard additional feeds.
