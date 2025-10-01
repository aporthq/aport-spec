# Transport Profile Specification

## Overview

The Transport Profile defines how AI agents identify themselves and communicate their Open Agent Passport (OAP) credentials across different transport mechanisms. This specification ensures consistent agent identification regardless of the underlying communication protocol.

## Transport Mechanisms

### HTTP/HTTPS

The primary transport mechanism for web-based agent interactions.

#### Headers

Agents must include the following headers in HTTP requests:

```
X-Agent-Passport: aeebc92d-13fb-4e23-8c3c-1aa82b167da6
X-Agent-Signature: ed25519:abc123def456...
X-Agent-Timestamp: 1640995200
X-Agent-Nonce: nonce_123456789
```

#### Header Definitions

- **X-Agent-Passport**: The agent's passport ID
- **X-Agent-Signature**: Ed25519 signature of the request
- **X-Agent-Timestamp**: Unix timestamp of the request
- **X-Agent-Nonce**: Unique nonce for replay protection

### WebSocket

For real-time agent communications.

#### Connection Handshake

```json
{
  "type": "agent_handshake",
  "passport_id": "aeebc92d-13fb-4e23-8c3c-1aa82b167da6",
  "signature": "ed25519:abc123def456...",
  "timestamp": 1640995200,
  "nonce": "nonce_123456789",
  "capabilities": ["payments.refund", "data.export"]
}
```

#### Message Format

```json
{
  "type": "agent_message",
  "passport_id": "aeebc92d-13fb-4e23-8c3c-1aa82b167da6",
  "message_id": "msg_123456789",
  "payload": {
    // Message content
  },
  "signature": "ed25519:xyz789...",
  "timestamp": 1640995200
}
```

### gRPC

For high-performance agent-to-agent communication.

#### Service Definition

```protobuf
service AgentService {
  rpc Identify(AgentIdentity) returns (AgentResponse);
  rpc Execute(AgentRequest) returns (AgentResponse);
  rpc Verify(VerificationRequest) returns (VerificationResponse);
}

message AgentIdentity {
  string passport_id = 1;
  string signature = 2;
  int64 timestamp = 3;
  string nonce = 4;
  repeated string capabilities = 5;
}
```

### Message Queues

For asynchronous agent communication.

#### Message Structure

```json
{
  "headers": {
    "x-agent-passport": "aeebc92d-13fb-4e23-8c3c-1aa82b167da6",
    "x-agent-signature": "ed25519:abc123def456...",
    "x-agent-timestamp": "1640995200",
    "x-agent-nonce": "nonce_123456789"
  },
  "body": {
    // Message payload
  }
}
```

## Agent Identification

### Passport ID Format

Agent passport IDs follow this format:

```
ap_[a-zA-Z0-9]{8,16}
```

Examples:
- `aeebc92d-13fb-4e23-8c3c-1aa82b167da6`
- `ap_abc123def456`
- `ap_myagent001`

### Signature Generation

All agent communications must be signed using Ed25519:

```javascript
const crypto = require('crypto');

function signRequest(passportId, privateKey, timestamp, nonce, payload) {
  const message = `${passportId}:${timestamp}:${nonce}:${JSON.stringify(payload)}`;
  const signature = crypto
    .createSign('ed25519')
    .update(message)
    .sign(privateKey);
  return `ed25519:${signature.toString('hex')}`;
}
```

### Timestamp Validation

Timestamps must be:

- **Current**: Within 5 minutes of current time
- **Monotonic**: Never decrease for the same agent
- **Format**: Unix timestamp in seconds

### Nonce Requirements

Nonces must be:

- **Unique**: Never reused for the same agent
- **Random**: Cryptographically secure random generation
- **Format**: `nonce_[a-zA-Z0-9]{16,32}`

## Transport Security

### TLS Requirements

All agent communications must use TLS 1.3 or higher:

- **Minimum Version**: TLS 1.3
- **Cipher Suites**: Only approved cipher suites
- **Certificate Validation**: Full certificate chain validation
- **Perfect Forward Secrecy**: Required for all connections

### Signature Verification

Receiving systems must verify agent signatures:

```javascript
function verifySignature(passportId, signature, publicKey, timestamp, nonce, payload) {
  const message = `${passportId}:${timestamp}:${nonce}:${JSON.stringify(payload)}`;
  const sig = signature.replace('ed25519:', '');
  
  return crypto
    .createVerify('ed25519')
    .update(message)
    .verify(publicKey, Buffer.from(sig, 'hex'));
}
```

### Replay Protection

Implement replay protection using:

1. **Nonce Tracking**: Store used nonces for 24 hours
2. **Timestamp Windows**: Reject requests outside time window
3. **Sequence Numbers**: Optional sequence number validation

## Agent Discovery

### Service Discovery

Agents can discover other agents through:

#### DNS SRV Records

```
_agent._tcp.example.com. 300 IN SRV 10 5 443 agent1.example.com.
_agent._tcp.example.com. 300 IN SRV 20 5 443 agent2.example.com.
```

#### mDNS/Bonjour

```
_agent._tcp.local. PTR agent1._agent._tcp.local.
agent1._agent._tcp.local. SRV 0 0 443 agent1.local.
agent1._agent._tcp.local. TXT "passport=aeebc92d-13fb-4e23-8c3c-1aa82b167da6"
```

### Agent Registry

Centralized agent discovery service:

```json
{
  "agents": [
    {
      "passport_id": "aeebc92d-13fb-4e23-8c3c-1aa82b167da6",
      "name": "Acme Support Bot",
      "endpoint": "https://agent1.example.com",
      "capabilities": ["payments.refund", "data.export"],
      "status": "active",
      "last_seen": "2025-01-16T10:30:00Z"
    }
  ]
}
```

## Error Handling

### Transport Errors

| Error Code | Description | Action |
|------------|-------------|--------|
| `TRANSPORT_ERROR` | Connection failed | Retry with backoff |
| `SIGNATURE_INVALID` | Invalid signature | Reject request |
| `TIMESTAMP_EXPIRED` | Timestamp too old | Reject request |
| `NONCE_REUSED` | Nonce already used | Reject request |
| `PASSPORT_INVALID` | Invalid passport ID | Reject request |

### Error Response Format

```json
{
  "error": {
    "code": "SIGNATURE_INVALID",
    "message": "Invalid agent signature",
    "details": {
      "passport_id": "aeebc92d-13fb-4e23-8c3c-1aa82b167da6",
      "expected": "ed25519:abc123...",
      "received": "ed25519:xyz789..."
    }
  },
  "timestamp": "2025-01-16T10:30:00Z"
}
```

## Implementation Guidelines

### Client Libraries

Transport profile implementations should provide:

1. **Automatic Signing**: Sign all outgoing requests
2. **Signature Verification**: Verify incoming requests
3. **Nonce Management**: Generate and track nonces
4. **Error Handling**: Handle transport errors gracefully
5. **Retry Logic**: Implement exponential backoff

### Server Implementation

Receiving systems should:

1. **Validate Signatures**: Verify all agent signatures
2. **Check Timestamps**: Validate timestamp freshness
3. **Track Nonces**: Prevent replay attacks
4. **Rate Limiting**: Implement per-agent rate limiting
5. **Logging**: Log all agent interactions

## Testing

### Test Vectors

Standard test vectors for signature verification:

```json
{
  "passport_id": "ap_test123",
  "timestamp": 1640995200,
  "nonce": "nonce_test123",
  "payload": {"action": "test"},
  "private_key": "test_private_key",
  "expected_signature": "ed25519:test_signature"
}
```

### Conformance Testing

Use the OAP conformance test suite to verify transport profile implementation:

```bash
npm run test:transport-profile
```

## Best Practices

### Security

1. **Key Management**: Store private keys securely
2. **Key Rotation**: Implement regular key rotation
3. **Audit Logging**: Log all agent communications
4. **Monitoring**: Monitor for suspicious activity

### Performance

1. **Connection Pooling**: Reuse connections when possible
2. **Async Processing**: Process requests asynchronously
3. **Caching**: Cache passport data appropriately
4. **Load Balancing**: Distribute agent load

### Reliability

1. **Circuit Breakers**: Implement circuit breaker patterns
2. **Health Checks**: Regular health check endpoints
3. **Graceful Degradation**: Handle partial failures
4. **Monitoring**: Comprehensive monitoring and alerting
