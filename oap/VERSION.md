# Open Agent Passport (OAP) Versioning

## Current Version: v1.0.0

The Open Agent Passport specification follows [Semantic Versioning](https://semver.org/) principles.

## Version Format

- **Major Version (X)**: Breaking changes to the specification
- **Minor Version (Y)**: New features that are backward compatible
- **Patch Version (Z)**: Bug fixes and clarifications

## Version History

### v1.0.0 (2025-01-16)

- Initial release of OAP specification
- Core passport and decision schemas
- Ed25519 signing and JCS canonicalization
- Three initial policy packs: finance.payment.refund.v1, data.export.create.v1, repo.release.publish.v1
- Verifiable Credential interoperability
- Conformance testing framework

## Specification URLs

- **Current**: `https://github.com/aporthq/aport-spec/oap/1.0`
- **Latest**: `https://github.com/aporthq/aport-spec/oap/latest`
- **Schema Base**: `https://github.com/aporthq/aport-spec/oap/`

## Backward Compatibility

- **v1.x**: All minor and patch versions are backward compatible
- **v2.0+**: Major version changes may introduce breaking changes
- **Deprecation Policy**: Features marked for deprecation will be supported for at least 12 months

## Implementation Notes

- Implementations MUST support the current major version
- Implementations SHOULD support the latest minor version
- Implementations MAY support multiple major versions simultaneously
