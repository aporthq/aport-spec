# Rate Limiting Specification

## Overview

The Open Agent Passport (OAP) API implements comprehensive rate limiting to ensure fair usage and system stability. This document defines the rate limiting rules, headers, and enforcement mechanisms.

## Rate Limiting Headers

### Standard Headers

All API responses include the following rate limiting headers:

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640995200
X-RateLimit-Window: 3600
```

### Header Definitions

- **X-RateLimit-Limit**: Maximum number of requests allowed in the current window
- **X-RateLimit-Remaining**: Number of requests remaining in the current window
- **X-RateLimit-Reset**: Unix timestamp when the current window resets
- **X-RateLimit-Window**: Duration of the rate limit window in seconds

## Rate Limits by Endpoint

### Verification Endpoints

| Endpoint | Limit | Window | Notes |
|----------|-------|--------|-------|
| `/api/verify/{agent_id}` | 1000 | 1 hour | Per agent ID |
| `/api/verify/policy/{pack_id}` | 500 | 1 hour | Per policy pack |
| `/api/verify/decisions/{agent_id}` | 100 | 1 hour | Per agent ID |

### Passport Management

| Endpoint | Limit | Window | Notes |
|----------|-------|--------|-------|
| `/api/passports` (POST) | 10 | 1 hour | Per owner |
| `/api/passports/{agent_id}` (PUT) | 50 | 1 hour | Per agent ID |
| `/api/passports/{agent_id}/status` (PUT) | 20 | 1 hour | Per agent ID |

### Public Endpoints

| Endpoint | Limit | Window | Notes |
|----------|-------|--------|-------|
| `/api/verify/attestation/{id}` | 2000 | 1 hour | Public endpoint |
| `/api/policies/{policy_name}` | 1000 | 1 hour | Public policy lookup |

## Rate Limiting Strategies

### Tiered Limiting

Rate limits are applied in tiers:

1. **Global Rate Limit**: 10,000 requests per hour per IP
2. **Endpoint Rate Limit**: Specific limits per endpoint
3. **User Rate Limit**: Additional limits for authenticated users
4. **Agent Rate Limit**: Limits specific to agent operations

### Burst Allowance

Short-term burst requests are allowed:

- **Burst Factor**: 2x the normal rate limit
- **Burst Window**: 1 minute
- **Burst Reset**: 5 minutes

## Error Responses

### Rate Limit Exceeded

When rate limits are exceeded, the API returns:

```json
{
  "error": "rate_limit_exceeded",
  "message": "Rate limit exceeded. Please try again later.",
  "retry_after": 3600,
  "rate_limit_info": {
    "limit": 1000,
    "remaining": 0,
    "reset": 1640995200,
    "window": 3600
  }
}
```

### HTTP Status Codes

- **429 Too Many Requests**: Rate limit exceeded
- **503 Service Unavailable**: System overload protection

## Implementation Notes

### Distributed Rate Limiting

Rate limiting is implemented using:

- **Redis**: For distributed rate limit counters
- **Sliding Window**: For smooth rate limit enforcement
- **Token Bucket**: For burst allowance

### Monitoring

Rate limiting metrics are tracked:

- Requests per second by endpoint
- Rate limit violations by IP/user
- System load and performance impact

## Best Practices

### Client Implementation

1. **Respect Headers**: Always check rate limit headers
2. **Exponential Backoff**: Implement retry with backoff
3. **Caching**: Cache responses to reduce API calls
4. **Batching**: Combine multiple requests when possible

### Error Handling

1. **Retry Logic**: Implement intelligent retry mechanisms
2. **Fallback**: Have fallback strategies for rate limit scenarios
3. **Monitoring**: Track rate limit usage and violations

## Compliance

This rate limiting specification ensures:

- **Fair Usage**: Prevents abuse while allowing legitimate use
- **System Stability**: Protects against overload
- **Scalability**: Supports high-volume operations
- **Transparency**: Clear communication of limits and status
