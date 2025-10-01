# Webhook Specification

## Overview

The Open Agent Passport (OAP) webhook system provides real-time notifications for agent passport events. This specification defines the webhook payload format, delivery mechanisms, and security requirements.

## Webhook Events

### Supported Events

| Event | Description | Trigger |
|-------|-------------|---------|
| `passport.created` | Agent passport created | New passport registration |
| `passport.updated` | Agent passport updated | Passport data changes |
| `passport.suspended` | Agent passport suspended | Status change to suspended |
| `passport.revoked` | Agent passport revoked | Status change to revoked |
| `passport.activated` | Agent passport activated | Status change to active |
| `decision.created` | Policy decision created | New authorization decision |
| `decision.updated` | Policy decision updated | Decision modification |

### Event Payload Structure

All webhook events follow this base structure:

```json
{
  "id": "evt_1234567890",
  "type": "passport.created",
  "created_at": "2025-01-16T10:30:00Z",
  "data": {
    // Event-specific data
  },
  "api_version": "2025-01-16",
  "livemode": true
}
```

## Event Payloads

### Passport Events

#### passport.created

```json
{
  "id": "evt_1234567890",
  "type": "passport.created",
  "created_at": "2025-01-16T10:30:00Z",
  "data": {
    "object": "passport",
    "agent_id": "aeebc92d-13fb-4e23-8c3c-1aa82b167da6",
    "owner_id": "ap_org_456",
    "name": "Acme Support Bot",
    "status": "active",
    "capabilities": [
      {
        "id": "payments.refund",
        "params": {"max_amount": 5000}
      }
    ],
    "assurance_level": "L4KYC",
    "created_at": "2025-01-16T10:30:00Z"
  },
  "api_version": "2025-01-16",
  "livemode": true
}
```

#### passport.updated

```json
{
  "id": "evt_1234567891",
  "type": "passport.updated",
  "created_at": "2025-01-16T10:35:00Z",
  "data": {
    "object": "passport",
    "agent_id": "aeebc92d-13fb-4e23-8c3c-1aa82b167da6",
    "changes": [
      {
        "field": "capabilities",
        "old_value": [{"id": "payments.refund", "params": {"max_amount": 5000}}],
        "new_value": [{"id": "payments.refund", "params": {"max_amount": 10000}}]
      }
    ],
    "updated_at": "2025-01-16T10:35:00Z"
  },
  "api_version": "2025-01-16",
  "livemode": true
}
```

#### passport.suspended

```json
{
  "id": "evt_1234567892",
  "type": "passport.suspended",
  "created_at": "2025-01-16T10:40:00Z",
  "data": {
    "object": "passport",
    "agent_id": "aeebc92d-13fb-4e23-8c3c-1aa82b167da6",
    "reason": "Policy violation detected",
    "suspended_at": "2025-01-16T10:40:00Z",
    "suspended_by": "ap_user_789"
  },
  "api_version": "2025-01-16",
  "livemode": true
}
```

### Decision Events

#### decision.created

```json
{
  "id": "evt_1234567893",
  "type": "decision.created",
  "created_at": "2025-01-16T10:45:00Z",
  "data": {
    "object": "decision",
    "decision_id": "dec_123456789",
    "agent_id": "aeebc92d-13fb-4e23-8c3c-1aa82b167da6",
    "policy_id": "payments.refund.v1",
    "allow": true,
    "reasons": [
      {
        "code": "capability_verified",
        "message": "Agent has required refund capability",
        "severity": "info"
      }
    ],
    "expires_in": 300,
    "context": {
      "amount": 5000,
      "currency": "USD",
      "transaction_id": "txn_123456"
    }
  },
  "api_version": "2025-01-16",
  "livemode": true
}
```

## Webhook Security

### Signature Verification

All webhooks include a signature header for verification:

```
X-APort-Signature: t=1640995200,v1=abc123def456...
```

### Signature Format

```
X-APort-Signature: t={timestamp},v1={signature}
```

- **t**: Unix timestamp of the webhook
- **v1**: HMAC-SHA256 signature of the payload

### Signature Generation

```javascript
const crypto = require('crypto');

function generateSignature(payload, secret, timestamp) {
  const payloadString = JSON.stringify(payload);
  const signedPayload = `${timestamp}.${payloadString}`;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');
  return `t=${timestamp},v1=${signature}`;
}
```

### Signature Verification

```javascript
function verifySignature(payload, signature, secret) {
  const [timestamp, signatureValue] = signature.split(',');
  const t = timestamp.split('=')[1];
  const v1 = signatureValue.split('=')[1];
  
  const expectedSignature = generateSignature(payload, secret, t);
  return expectedSignature === signature;
}
```

## Webhook Delivery

### Delivery Attempts

- **Initial Attempt**: Immediate delivery
- **Retry Attempts**: 3 retries with exponential backoff
- **Retry Intervals**: 1s, 5s, 30s, 5m, 30m, 2h, 6h, 12h
- **Timeout**: 30 seconds per attempt

### Delivery Status

| Status | Description |
|--------|-------------|
| `pending` | Webhook queued for delivery |
| `delivered` | Successfully delivered |
| `failed` | All retry attempts failed |
| `retrying` | Currently retrying delivery |

### Response Requirements

Webhook endpoints must:

1. **Return 200 OK** for successful processing
2. **Process within 30 seconds** to avoid timeout
3. **Handle duplicate events** idempotently
4. **Log delivery attempts** for debugging

## Webhook Configuration

### Endpoint Registration

```json
{
  "url": "https://example.com/webhooks/aport",
  "events": ["passport.created", "passport.updated"],
  "secret": "whsec_1234567890",
  "active": true,
  "created_at": "2025-01-16T10:00:00Z"
}
```

### Event Filtering

Webhooks can be configured to receive specific events:

```json
{
  "events": [
    "passport.created",
    "passport.suspended",
    "passport.revoked",
    "decision.created"
  ]
}
```

## Error Handling

### Webhook Failures

When webhook delivery fails:

1. **Log Error**: Record failure reason and timestamp
2. **Retry Logic**: Attempt delivery with exponential backoff
3. **Dead Letter Queue**: Store failed webhooks for manual review
4. **Alerting**: Notify administrators of persistent failures

### Common Error Scenarios

| Error | Cause | Resolution |
|-------|-------|------------|
| `timeout` | Endpoint too slow | Optimize endpoint performance |
| `connection_refused` | Endpoint unavailable | Check endpoint availability |
| `invalid_response` | Non-200 status | Fix endpoint response handling |
| `signature_mismatch` | Invalid signature | Verify signature calculation |

## Testing

### Webhook Testing

Use the webhook testing endpoint:

```bash
curl -X POST https://api.aport.io/webhooks/test \
  -H "Authorization: Bearer sk_test_..." \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com/webhooks/test",
    "events": ["passport.created"]
  }'
```

### Test Events

Test events are prefixed with `test.`:

- `test.passport.created`
- `test.decision.created`

## Best Practices

### Endpoint Implementation

1. **Idempotency**: Handle duplicate events gracefully
2. **Async Processing**: Process webhooks asynchronously
3. **Error Handling**: Implement proper error handling
4. **Logging**: Log all webhook processing attempts

### Security

1. **HTTPS Only**: Always use HTTPS endpoints
2. **Signature Verification**: Always verify webhook signatures
3. **Secret Management**: Store webhook secrets securely
4. **Rate Limiting**: Implement rate limiting on webhook endpoints

### Monitoring

1. **Delivery Metrics**: Track webhook delivery success rates
2. **Performance Monitoring**: Monitor endpoint response times
3. **Error Tracking**: Track and alert on webhook failures
4. **Audit Logging**: Log all webhook processing activities
