# Change Log

All notable changes to the Open Agent Passport (OAP) specification will be documented in this file.

The format is based on [Keep a Change Log](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-01-16

### Added

- Initial release of Open Agent Passport (OAP) v1 specification
- Core passport schema with template/instance support
- Decision schema with Ed25519 signing and JCS canonicalization
- Capability registry with three initial policy packs:
  - `finance.payment.refund.v1` - Financial transaction controls
  - `data.export.create.v1` - Data export with PII controls
  - `repo.release.publish.v1` - Repository release controls
- Assurance level system (L0-L4) with verification methods
- Security model with Ed25519 signatures and key resolution
- Verifiable Credential interoperability mapping
- Conformance testing framework
- Comprehensive documentation and examples

### Security

- Ed25519 signature scheme for decision signing
- JCS (RFC 8785) canonicalization for deterministic hashing
- Key resolution via `/.well-known/oap/keys.json`
- Suspend semantics with 30-second global invalidation
- Passport digest verification for decision integrity

### Interoperability

- W3C Verifiable Credential export/import support
- JSON-LD context definitions
- Standardized error codes and response formats
- Multi-region and multi-tenant support

### Performance

- Decision caching with TTL support
- Tiered cache invalidation on suspend/revoke
- Optimized for edge computing environments
- Server-Timing headers for performance monitoring

## [Unreleased]

### Planned

- Additional policy packs for common use cases
- Enhanced assurance level verification methods
- Improved conformance testing coverage
- Performance optimizations for large-scale deployments
