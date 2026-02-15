# Open Agent Passport (OAP) v1.0 (**draft**)

> *The runtime trust rail for AI agents*

---

## The Agentic Era Demands New Standards

As AI agents become the primary interface for digital commerce, a fundamental question emerges: *How do we trust what we cannot see?*

Traditional identity verification answers *who* built an agent. But in a world where agents complete transactions in milliseconds, we need something more: **real-time enforcement of what agents are allowed to do at the point of action.**

The Open Agent Passport (OAP) v1.0 is the first specification designed for this new reality—a lightweight, cryptographically verifiable credential that enables **Pre-action authorization** for AI agents across any platform.

---

## Why OAP Matters

### The Problem
- **Agentic commerce** is accelerating, but trust infrastructure hasn't kept pace
- Merchants need **instant verification** before money or data moves
- Platforms require **sub-100ms decisions** at the point of action
- Current solutions focus on *who* built the agent, not *what* it can do

### The Solution
OAP provides the **runtime trust layer** that makes agentic commerce safe and scalable:

- **Pre-action authorization** before sensitive operations
- **Cryptographically signed decisions** for audit trails  
- **Global suspend capabilities** for instant risk mitigation
- **Standardized policy packs** for consistent enforcement

---

## Core Specification

### 📋 The Foundation
- **[OAP v1.0 Specification](./oap/oap-spec.md)** — Complete normative specification
- **[Passport Schema](./oap/passport-schema.json)** — Agent identity and capabilities
- **[Decision Schema](./oap/decision-schema.json)** — Authorization decisions
- **[Security Model](./oap/security.md)** — Cryptographic verification

### 🎯 Policy Framework
- **[Capability Registry](./oap/capability-registry.md)** — Standardized capabilities and limits
- **[Conformance Requirements](./oap/conformance.md)** — Implementation standards

### 📝 Implementation Examples
- **[Template Passport](./oap/examples/passport.template.v1.json)** — Agent template
- **[Instance Passport](./oap/examples/passport.instance.v1.json)** — Deployed agent
- **[Allow Decision](./oap/examples/decision.allow.sample.json)** — Authorization granted
- **[Deny Decision](./oap/examples/decision.deny.sample.json)** — Authorization denied

---

## Verifiable Credentials Integration

OAP objects integrate seamlessly with W3C Verifiable Credentials for maximum interoperability.

### 🔐 VC Specifications
- **[JSON-LD Context](./oap/vc/context-oap-v1.jsonld)** — OAP VC context definition
- **[VC Mapping Guide](./oap/vc/vc-mapping.md)** — OAP ↔ VC conversion rules
- **[VC Examples](./oap/vc/examples/)** — Passport and Decision as VCs

### 🛠️ Developer Tools
- **[CLI Tools](./oap/vc/tools/)** — Command-line conversion utilities
- **[SDK Integration](./oap/vc/tools/INTEGRATION.md)** — Integration guide
- **[JavaScript Examples](./oap/vc/tools/examples/)** — Usage examples

---

## Conformance Testing

Verify your implementation meets OAP standards with our comprehensive testing suite.

### 🧪 Test Runner
- **[Conformance Runner](./conformance/)** — CLI tool for validation
- **[Test Cases](./conformance/cases/)** — Standard test scenarios
- **[Documentation](./conformance/README.md)** — Usage and certification

### 📊 Coverage
- **Schema Validation** — JSON Schema compliance
- **Policy Evaluation** — Decision logic verification  
- **Signature Verification** — Ed25519 cryptographic validation
- **Performance Testing** — Response time validation

---

## Quick Start

### For Platform Builders
1. **Understand the Problem** — Read [OAP v1.0 Specification](./oap/oap-spec.md)
2. **See It in Action** — Review [examples](./oap/examples/) for implementation patterns
3. **Validate Your Implementation** — Use [conformance runner](./conformance/) for testing
4. **Integrate with VCs** — Follow [VC mapping guide](./oap/vc/vc-mapping.md)

### For Developers
1. **API Integration** — Use [OpenAPI spec](./api/openapi-generated.json) for client generation
2. **SDK Implementation** — Follow [integration guides](./oap/vc/tools/INTEGRATION.md)
3. **Policy Development** — Review [capability registry](./oap/capability-registry.md)

---

## The OAP Ecosystem

### How It Works
1. **Agent Registration** — Developers register agents with verified capabilities
2. **Policy Evaluation** — Real-time authorization at the point of action
3. **Decision Recording** — Cryptographically signed receipts for audit
4. **Continuous Monitoring** — Ongoing verification and risk assessment

### Key Benefits
- **Instant Trust** — Sub-100ms authorization decisions
- **Audit Trail** — Cryptographically signed decision receipts
- **Global Control** — Instant suspend capabilities across platforms
- **Standards Compliance** — Built for regulatory requirements

---

## Industry Adoption

OAP is designed to work with existing identity frameworks:

- **KYA (Know Your Agent)** — OAP implements KYA at runtime via policy packs
- **W3C Verifiable Credentials** — Full VC interoperability
- **Existing KYC/KYB** — Complements rather than replaces traditional verification

---

## Versioning & Updates

- **[Version History](./oap/VERSION.md)** — OAP specification versioning
- **[Changelog](./oap/CHANGELOG.md)** — Detailed change history



---

## Contributing

We welcome contributions to the OAP specification and tooling.

- **[Contributing Guide](./CONTRIBUTING.md)** — Development guidelines
- **[Main Documentation](https://aport.io/docs/)** — Detailed feature documentation
- **[Examples](./oap/examples/)** — Code examples and tutorials
- **[Policy Packs](https://aport.io/policy-packs)** — Available policy implementations

---

## License

All specifications are released under the MIT License. See [LICENSE](./LICENSE) for details.

---

<div align="center">

**Open Agent Passport v1.0**
*The runtime trust rail for AI agents*

[![OAP Version](https://img.shields.io/badge/OAP-v1.0.0-blue.svg)](./oap/VERSION.md)
[![Specification Status](https://img.shields.io/badge/Status-Stable-green.svg)](./oap/oap-spec.md)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

</div>

---

**Last Updated**: 2026-02-15 18:32:09 UTC
