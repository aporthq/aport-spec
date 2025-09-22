# Transport Profile Specification v0

## Overview

The Transport Profile defines standardized methods for passing and consuming `agent_id` across different transport protocols and platforms. This ensures consistent agent identification regardless of the underlying technology stack.

## Transport Methods

### HTTP/Webhooks

#### Header Format
```
X-Agent-Passport-Id: <agent_id>
```

#### Example Request
```http
GET /api/data HTTP/1.1
Host: api.example.com
X-Agent-Passport-Id: ap_1234567890abcdef
Authorization: Bearer <token>
Content-Type: application/json
```

#### Example Response
```http
HTTP/1.1 200 OK
Content-Type: application/json
X-Agent-Passport-Id: ap_1234567890abcdef
Cache-Control: public, max-age=60
ETag: "agent_passport_v1_abc123"

{
  "data": "...",
  "agent_verified": true
}
```

### gRPC

#### Metadata Format
```
x-agent-passport-id: <agent_id>
```

#### Example gRPC Call
```protobuf
// Client metadata
metadata = {
    "x-agent-passport-id": "ap_1234567890abcdef",
    "authorization": "Bearer <token>"
}

// Server can access via context
agent_id := metadata.Get("x-agent-passport-id")
```

### WebSocket/Server-Sent Events (SSE)

#### Connection Parameters
```
ws://api.example.com/stream?agent_id=ap_1234567890abcdef
```

#### First Message Requirement
The first message sent over the connection must contain the `agent_id` for verification:

```json
{
  "type": "handshake",
  "agent_id": "ap_1234567890abcdef",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

#### Example WebSocket Connection
```javascript
const ws = new WebSocket('ws://api.example.com/stream?agent_id=ap_1234567890abcdef');

ws.onopen = function() {
  // Send handshake with agent_id
  ws.send(JSON.stringify({
    type: 'handshake',
    agent_id: 'ap_1234567890abcdef',
    timestamp: new Date().toISOString()
  }));
};
```

### Message Queues

#### Message Attribute Format
```json
{
  "MessageAttributes": {
    "agent_id": {
      "StringValue": "ap_1234567890abcdef",
      "DataType": "String"
    }
  },
  "MessageBody": "..."
}
```

#### Example AWS SQS Message
```json
{
  "Records": [
    {
      "messageAttributes": {
        "agent_id": {
          "stringValue": "ap_1234567890abcdef",
          "dataType": "String"
        }
      },
      "body": "{\"action\": \"process_data\", \"data\": \"...\"}"
    }
  ]
}
```

### Environment Variables

#### CLI/Job Format
```bash
export AGENT_PASSPORT_ID=ap_1234567890abcdef
```

#### Example Usage
```bash
# Set environment variable
export AGENT_PASSPORT_ID=ap_1234567890abcdef

# Run CLI tool
./agent-tool --process-data

# Run background job
python worker.py
```

## Verification Process

### Cache Behavior

#### Cache Duration
- **Default TTL**: 60 seconds
- **Cache-Control**: `public, max-age=60`
- **ETag**: `agent_passport_v1_<hash>`

#### Verification Request
```http
GET /api/verify/ap_1234567890abcdef HTTP/1.1
Host: passport-registry.com
If-None-Match: "agent_passport_v1_abc123"
```

#### Cache Hit Response
```http
HTTP/1.1 304 Not Modified
ETag: "agent_passport_v1_abc123"
Cache-Control: public, max-age=60
```

#### Cache Miss Response
```http
HTTP/1.1 200 OK
Content-Type: application/json
ETag: "agent_passport_v1_abc123"
Cache-Control: public, max-age=60

{
  "agent_id": "ap_1234567890abcdef",
  "status": "active",
  "permissions": ["read:data", "write:logs"],
  "limits": {
    "requests_per_hour": 10000
  },
  "regions": ["us-east-1", "eu-west-1"],
  "verified_at": "2024-01-15T10:30:00Z"
}
```

## Failure Modes

### Invalid Agent ID
```http
HTTP/1.1 404 Not Found
Content-Type: application/json

{
  "error": "agent_not_found",
  "message": "Agent passport not found",
  "agent_id": "ap_invalid_id"
}
```

### Suspended Agent
```http
HTTP/1.1 403 Forbidden
Content-Type: application/json

{
  "error": "agent_suspended",
  "message": "This agent is suspended",
  "agent_id": "ap_1234567890abcdef",
  "status": "suspended",
  "suspended_until": "2024-02-15T10:30:00Z"
}
```

### Revoked Agent
```http
HTTP/1.1 403 Forbidden
Content-Type: application/json

{
  "error": "agent_revoked",
  "message": "This agent has been revoked",
  "agent_id": "ap_1234567890abcdef",
  "status": "revoked",
  "revoked_at": "2024-01-10T10:30:00Z"
}
```

### Rate Limit Exceeded
```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/json
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1640995200

{
  "error": "rate_limit_exceeded",
  "message": "Too many verification requests",
  "retry_after": 60
}
```

## Implementation Guidelines

### Platform Requirements

1. **Header Validation**: Always check for `X-Agent-Passport-Id` header
2. **Agent Verification**: Call `/api/verify` with proper caching
3. **Status Enforcement**: Verify `status === "active"`
4. **Permission Checking**: Validate required permissions
5. **Rate Limiting**: Respect agent-specific limits
6. **Regional Compliance**: Check allowed regions

### Agent Requirements

1. **Header Inclusion**: Always include `X-Agent-Passport-Id` in requests
2. **Environment Setup**: Set `AGENT_PASSPORT_ID` for CLI tools
3. **WebSocket Handshake**: Send agent_id in first message
4. **Error Handling**: Handle verification failures gracefully
5. **Retry Logic**: Implement exponential backoff for retries

### Security Considerations

1. **Header Injection**: Validate agent_id format to prevent injection
2. **Cache Poisoning**: Use ETags to prevent cache poisoning
3. **Rate Limiting**: Implement per-agent rate limiting
4. **Audit Logging**: Log all verification attempts
5. **Token Validation**: Verify agent_id matches authenticated user

## Examples

### Express.js Middleware
```javascript
app.use((req, res, next) => {
  const agentId = req.headers['x-agent-passport-id'];
  if (agentId) {
    // Verify agent and set req.agent
    verifyAgent(agentId).then(agent => {
      req.agent = agent;
      next();
    });
  } else {
    next();
  }
});
```

### Python FastAPI Middleware
```python
@app.middleware("http")
async def verify_agent_passport(request: Request, call_next):
    agent_id = request.headers.get("x-agent-passport-id")
    if agent_id:
        agent = await verify_agent(agent_id)
        request.state.agent = agent
    return await call_next(request)
```

### Node.js SDK Usage
```javascript
import { withAgentPassportId } from '@agent-passport/sdk';

const response = await withAgentPassportId('ap_1234567890abcdef', fetch)(
  'https://api.example.com/data'
);
```

### Python SDK Usage
```python
from agent_passport import agent_session

with agent_session('ap_1234567890abcdef') as session:
    response = session.get('https://api.example.com/data')
```

## Version History

- **v0.1** (2024-01-15): Initial specification
  - HTTP/Webhooks header format
  - gRPC metadata format
  - WebSocket/SSE connection parameters
  - Message queue attributes
  - Environment variable format
  - Cache behavior and verification process
  - Failure modes and error handling
  - Security considerations and examples
