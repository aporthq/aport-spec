# Webhook Specification

## Overview

The AI Agent Passport Registry can send webhook notifications when agent passport status changes occur.

## Configuration

Webhooks are configured via environment variables:
- `WEBHOOK_URL`: Target webhook endpoint URL
- `WEBHOOK_SECRET`: Secret key for webhook signature verification

## Webhook Events

### Status Change Events
- `passport.created` - New passport created
- `passport.updated` - Passport data updated
- `passport.suspended` - Passport suspended
- `passport.revoked` - Passport revoked
- `passport.activated` - Suspended passport reactivated

## Payload Format

### Headers
```
Content-Type: application/json
X-Webhook-Signature: sha256=abc123...
X-Webhook-Event: passport.updated
X-Webhook-Timestamp: 1640995200
```

### Payload Structure
```json
{
  "event": "passport.updated",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "agent_id": "ap_123",
    "previous_status": "active",
    "current_status": "suspended",
    "reason": "Policy violation",
    "updated_by": "admin@example.com"
  },
  "passport": {
    "agent_id": "ap_123",
    "owner": "AI Research Lab",
    "role": "Tier-1",
    "status": "suspended",
    "updated_at": "2024-01-15T10:30:00Z"
  }
}
```

## Signature Verification

Webhooks include a signature header for verification:

```
X-Webhook-Signature: sha256=abc123...
```

The signature is generated using HMAC-SHA256:
```
signature = hmac-sha256(webhook_secret, payload_body)
```

## Retry Logic

- **Initial Retry**: 1 second delay
- **Subsequent Retries**: Exponential backoff (2s, 4s, 8s, 16s, 32s)
- **Max Retries**: 5 attempts
- **Timeout**: 30 seconds per attempt
- **Success Criteria**: HTTP 2xx response

## Security

- **HTTPS Required**: All webhook URLs must use HTTPS
- **Signature Verification**: Always verify webhook signatures
- **Timestamp Validation**: Reject webhooks older than 5 minutes
- **IP Allowlisting**: Optional IP allowlisting for additional security

## Error Handling

### Webhook Endpoint Errors
- **4xx Errors**: Will not be retried
- **5xx Errors**: Will be retried according to retry logic
- **Timeout**: Will be retried
- **Network Errors**: Will be retried

### Failed Webhooks
After max retries, failed webhooks are logged but not retried. Check logs for failed webhook deliveries.

## Testing

### Webhook Testing Endpoint
```
POST /api/admin/webhook-test
```

Test webhook delivery without changing actual passport status.

### Example Test Request
```bash
curl -X POST "https://api.aport.io/api/admin/webhook-test" \
  -H "Authorization: Bearer your-admin-token" \
  -H "Content-Type: application/json" \
  -d '{
    "webhook_url": "https://your-endpoint.com/webhook",
    "event": "passport.updated"
  }'
```

## Implementation Examples

### Node.js Express Handler
```javascript
const crypto = require('crypto');

app.post('/webhook', (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const payload = JSON.stringify(req.body);
  
  // Verify signature
  const expectedSignature = crypto
    .createHmac('sha256', process.env.WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');
  
  if (signature !== `sha256=${expectedSignature}`) {
    return res.status(401).send('Invalid signature');
  }
  
  // Process webhook
  const { event, data, passport } = req.body;
  console.log(`Received ${event} for agent ${passport.agent_id}`);
  
  res.status(200).send('OK');
});
```

### Python Flask Handler
```python
import hmac
import hashlib
import json
from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/webhook', methods=['POST'])
def webhook():
    signature = request.headers.get('X-Webhook-Signature')
    payload = request.get_data()
    
    # Verify signature
    expected_signature = hmac.new(
        WEBHOOK_SECRET.encode(),
        payload,
        hashlib.sha256
    ).hexdigest()
    
    if signature != f'sha256={expected_signature}':
        return 'Invalid signature', 401
    
    # Process webhook
    data = request.get_json()
    event = data['event']
    passport = data['passport']
    
    print(f'Received {event} for agent {passport["agent_id"]}')
    
    return 'OK', 200
```

## Monitoring

Webhook delivery metrics are available via the `/api/metrics` endpoint:

```json
{
  "webhooks": {
    "totalSent": 1250,
    "successfulDeliveries": 1200,
    "failedDeliveries": 50,
    "successRate": 96.0,
    "averageDeliveryTime": 1.2
  }
}
```
