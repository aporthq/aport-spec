# Open Agent Passport Conformance

## Overview

This document defines the conformance requirements for Open Agent Passport (OAP) implementations. Conformance ensures interoperability and security across different implementations.

## Conformance Levels

### Basic Conformance

Basic conformance requires:

1. **Schema validation**: Validate passports against `passport-schema.json`
2. **Decision generation**: Generate decisions matching `decision-schema.json`
3. **Signature verification**: Verify Ed25519 signatures on decisions
4. **Error handling**: Return standardized error codes

### Full Conformance

Full conformance requires all basic conformance requirements plus:

1. **Policy evaluation**: Implement policy pack evaluation logic
2. **JCS canonicalization**: Use RFC 8785 for canonicalization
3. **Key resolution**: Resolve keys via `/.well-known/oap/keys.json`
4. **Suspend semantics**: Implement 30-second global invalidation
5. **Performance**: Meet performance requirements (see below)

## Implementation Requirements

### Passport Validation

Implementations MUST:

1. **Validate schema**: Ensure passport matches `passport-schema.json`
2. **Check required fields**: Verify all required fields are present
3. **Validate formats**: Check UUID, date-time, and enum formats
4. **Verify assurance**: Ensure assurance level is valid
5. **Check status**: Validate status transitions (draft → active → suspended/revoked)

#### Status State Machine

```
draft → active → suspended → active
  ↓       ↓         ↓
revoked  revoked   revoked
```

### Decision Generation

Implementations MUST:

1. **Generate decision_id**: Create unique UUID v4 for each decision
2. **Include all required fields**: Populate all required decision fields
3. **Set expiration**: Set `expires_at` based on policy and context
4. **Compute digest**: Calculate `passport_digest` using SHA-256(JCS(passport))
5. **Sign decision**: Create Ed25519 signature over JCS-canonicalized decision
6. **Set kid**: Include proper key identifier

### Policy Evaluation

Implementations MUST:

1. **Load policy pack**: Retrieve policy pack by ID
2. **Validate context**: Check context against policy requirements
3. **Check capabilities**: Verify passport has required capabilities
4. **Validate limits**: Ensure operation within configured limits
5. **Check assurance**: Verify assurance level meets minimum requirement
6. **Check regions**: Validate operation is allowed in request region
7. **Generate reasons**: Create appropriate reason codes and messages

### Signature Verification

Implementations MUST:

1. **Parse signature**: Extract Ed25519 signature from decision
2. **Resolve key**: Fetch public key using `kid` and `/.well-known/oap/keys.json`
3. **Canonicalize**: Apply JCS canonicalization to decision payload
4. **Verify signature**: Use Ed25519 to verify signature
5. **Check expiration**: Ensure decision hasn't expired
6. **Validate digest**: Verify passport digest matches

### Error Handling

Implementations MUST:

1. **Return standard codes**: Use normative error codes from specification
2. **Include context**: Provide relevant context in error messages
3. **Log errors**: Log all errors for debugging and monitoring
4. **Handle gracefully**: Don't expose internal implementation details

#### Standard Error Codes

- `oap.invalid_context` - Context data is invalid
- `oap.unknown_capability` - Capability not recognized
- `oap.limit_exceeded` - Operation exceeds limits
- `oap.currency_unsupported` - Currency not supported
- `oap.region_blocked` - Operation not allowed in region
- `oap.assurance_insufficient` - Assurance level too low
- `oap.passport_suspended` - Passport is suspended/revoked
- `oap.idempotency_conflict` - Idempotency key conflict
- `oap.policy_error` - Policy evaluation error

## Performance Requirements

### Response Times

Implementations SHOULD meet these performance targets:

- **Passport verification**: ≤ 100ms (95th percentile)
- **Policy evaluation**: ≤ 200ms (95th percentile)
- **Decision generation**: ≤ 300ms (95th percentile)
- **Signature verification**: ≤ 50ms (95th percentile)

### Throughput

Implementations SHOULD support:

- **Decision rate**: ≥ 1000 decisions/second
- **Concurrent requests**: ≥ 100 concurrent requests
- **Cache hit rate**: ≥ 95% for passport lookups

### Scalability

Implementations SHOULD:

1. **Horizontal scaling**: Support multiple instances
2. **Load balancing**: Distribute load across instances
3. **Caching**: Implement multi-level caching
4. **Database optimization**: Use appropriate indexes and queries

## Test Requirements

### Conformance Tests

Implementations MUST pass all conformance tests:

1. **Schema validation tests**: Test valid and invalid passports
2. **Decision generation tests**: Test decision creation and validation
3. **Signature tests**: Test signature creation and verification
4. **Policy tests**: Test policy pack evaluation
5. **Error handling tests**: Test error conditions and responses
6. **Performance tests**: Test response times and throughput

### Test Vectors

Test vectors are provided in the `/conformance` directory:

- **Passport examples**: Valid and invalid passport samples
- **Context data**: Policy evaluation context samples
- **Expected decisions**: Expected decision outputs
- **Signature tests**: Signature creation and verification tests

### Running Tests

```bash

# Install dependencies
npm install

# Run all tests
npm test

# Run specific test suite
npm test -- --suite payments.refund.v1

# Run performance tests
npm test -- --suite performance
```

## Security Requirements

### Cryptographic Security

Implementations MUST:

1. **Use Ed25519**: Use Ed25519 for all signatures
2. **Secure random**: Use cryptographically secure random for UUIDs
3. **Key management**: Implement secure key storage and rotation
4. **HTTPS**: Use HTTPS for all network communication
5. **Certificate validation**: Validate TLS certificates properly

### Data Protection

Implementations MUST:

1. **Encrypt sensitive data**: Encrypt passports and decisions at rest
2. **Access controls**: Implement proper access controls
3. **Audit logging**: Log all security-relevant events
4. **Data retention**: Implement appropriate data retention policies

## Interoperability

### Standard Compliance

Implementations MUST:

1. **Follow specifications**: Implement all normative requirements
2. **Use standard formats**: Use standard JSON and UUID formats
3. **Support standard capabilities**: Support all standard capabilities
4. **Handle extensions**: Gracefully handle unknown fields and capabilities

### Cross-Implementation Testing

Implementations SHOULD:

1. **Test with other implementations**: Verify interoperability
2. **Share test results**: Publish conformance test results
3. **Report issues**: Report interoperability issues
4. **Contribute tests**: Contribute additional test cases

## Certification

### Self-Certification

Implementations can self-certify by:

1. **Running conformance tests**: Pass all required tests
2. **Documenting compliance**: Document conformance to requirements
3. **Publishing results**: Publish test results publicly
4. **Maintaining compliance**: Keep implementation up to date

### Third-Party Certification

For higher assurance, implementations can seek third-party certification:

1. **Security audit**: Independent security review
2. **Performance testing**: Independent performance validation
3. **Compliance review**: Independent conformance verification
4. **Certification mark**: Use official OAP certification mark

## Compliance Monitoring

### Continuous Monitoring

Implementations SHOULD:

1. **Monitor performance**: Track response times and throughput
2. **Monitor errors**: Track error rates and types
3. **Monitor security**: Track security events and anomalies
4. **Monitor compliance**: Track conformance to requirements

### Reporting

Implementations SHOULD:

1. **Regular reports**: Publish regular compliance reports
2. **Incident reporting**: Report security incidents promptly
3. **Update notifications**: Notify users of updates and changes
4. **Deprecation notices**: Provide advance notice of deprecations

## References

- [OAP Specification](./oap-spec.md)
- [Passport Schema](./passport-schema.json)
- [Decision Schema](./decision-schema.json)
- [Security Guidelines](./security.md)
- [Capability Registry](./capability-registry.md)
