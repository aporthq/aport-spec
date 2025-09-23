# Rate Limiting Specification

## Overview

The AI Agent Passport Registry implements sliding window rate limiting to protect against abuse and ensure fair usage.

## Rate Limits

### Anonymous Endpoints
- **Verify Endpoints**: 60 requests per minute per IP
- **Endpoints**: `/api/verify`, `/api/verify-compact`

### Admin Endpoints
- **All Admin Endpoints**: 100 requests per minute per IP
- **Endpoints**: `/api/admin/*`, `/api/metrics`

## Headers

### Rate Limit Headers
All rate-limited endpoints return the following headers:

```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 59
X-RateLimit-Reset: 1640995200
X-RateLimit-Window: 60
```

### Header Descriptions
- `X-RateLimit-Limit`: Maximum requests allowed per window
- `X-RateLimit-Remaining`: Requests remaining in current window
- `X-RateLimit-Reset`: Unix timestamp when the window resets
- `X-RateLimit-Window`: Window size in seconds

## Rate Limit Exceeded Response

When rate limit is exceeded, the API returns:

```json
{
  "error": "Rate limit exceeded",
  "message": "Too many requests. Please try again later.",
  "retryAfter": 30,
  "limit": 60,
  "remaining": 0,
  "resetTime": "2024-01-01T00:00:00Z"
}
```

**Status Code**: `429 Too Many Requests`

## Implementation Details

### Sliding Window Algorithm
- Uses Cloudflare KV for distributed rate limiting
- Window slides every second
- Counters are automatically cleaned up after window expires

### Client Identification
- Primary: Client IP address
- Fallback: User-Agent + IP combination for edge cases

### Configuration
Rate limits are configurable via environment variables:
- `VERIFY_RPM`: Verify endpoint rate limit (default: 60)
- `ADMIN_RPM`: Admin endpoint rate limit (default: 100)

## Best Practices

### For API Consumers
1. **Respect Rate Limits**: Check `X-RateLimit-Remaining` header
2. **Implement Backoff**: Use exponential backoff when rate limited
3. **Cache Responses**: Use ETag headers for efficient caching
4. **Monitor Usage**: Track your API usage patterns

### For Developers
1. **Test Rate Limits**: Include rate limiting in integration tests
2. **Handle 429 Responses**: Implement proper retry logic
3. **Monitor Headers**: Log rate limit headers for debugging
4. **Optimize Requests**: Batch requests when possible

## Examples

### Successful Request
```bash
curl -i "https://api.aport.io/api/verify/agt_tmpl_mfuzqhwt_fkcm84"

HTTP/1.1 200 OK
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 59
X-RateLimit-Reset: 1640995200
X-RateLimit-Window: 60
Content-Type: application/json

{
  "agent_id": "agt_tmpl_mfuzqhwt_fkcm84",
  "status": "active",
  "owner": "AI Research Lab"
}
```

### Rate Limited Request
```bash
curl -i "https://api.aport.io/api/verify/agt_tmpl_mfuzqhwt_fkcm84"

HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1640995200
X-RateLimit-Window: 60
Retry-After: 30
Content-Type: application/json

{
  "error": "Rate limit exceeded",
  "message": "Too many requests. Please try again later.",
  "retryAfter": 30
}
```

## Monitoring

Rate limiting metrics are available via the `/api/metrics` endpoint:

```json
{
  "rateLimiting": {
    "verify": {
      "totalRequests": 1250,
      "rateLimitedRequests": 15,
      "rateLimitPercentage": 1.2
    },
    "admin": {
      "totalRequests": 340,
      "rateLimitedRequests": 2,
      "rateLimitPercentage": 0.6
    }
  }
}
```
