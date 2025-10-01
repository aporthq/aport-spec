# OAP Conformance Test Runner

A CLI tool for validating **your OAP implementation** against the Open Agent Passport specification.

## What It Does

The conformance runner validates **your OAP implementation** by:
- ✅ **Schema Validation**: Ensures your passports and decisions conform to OAP JSON schemas
- ✅ **Policy Evaluation**: Tests your policy logic with various contexts and limits
- ✅ **Signature Verification**: Validates your Ed25519 signatures over JCS-canonicalized payloads
- ✅ **API Testing**: Tests your OAP endpoints for compliance
- ✅ **Report Generation**: Produces detailed PASS/FAIL reports for certification

## Quick Start

### 1. Get the OAP Specification
```bash
# Clone the OAP spec repository
git clone https://github.com/aporthq/oap-spec.git
cd oap-spec
```

### 2. Install Dependencies
```bash
# Navigate to conformance directory
cd spec/conformance

# Install dependencies
pnpm install
```

### 3. Test Your OAP Implementation
```bash
# Test your OAP API endpoint
pnpm test --endpoint https://your-oap-api.com

# Test with your passport file
pnpm test --passport-file /path/to/your-passport.json

# Test with your decision file
pnpm test --decision-file /path/to/your-decision.json

# Test all components
pnpm test --endpoint https://your-oap-api.com --passport-file passport.json --decision-file decision.json
```

### 4. Expected Output
```bash
🔍 OAP Conformance Test Runner v1.0.0

Testing your OAP implementation...
✅ Passport validation: PASS
✅ Decision validation: PASS
✅ Policy evaluation: PASS
✅ Signature verification: PASS
✅ API compliance: PASS

📊 Conformance Test Results
✅ Passed: 5
❌ Failed: 0
📈 Success Rate: 100.0%

🎯 Your implementation is OAP compliant!
```

## CLI Commands

### Testing Your Implementation
```bash
# Test your OAP API endpoint
pnpm test --endpoint https://your-oap-api.com

# Test with your passport file
pnpm test --passport-file /path/to/your-passport.json

# Test with your decision file
pnpm test --decision-file /path/to/your-decision.json

# Test all components together
pnpm test --endpoint https://your-oap-api.com --passport-file passport.json --decision-file decision.json
```

### Policy Pack Testing
```bash
# Test specific policy pack against your implementation
pnpm test --endpoint https://your-oap-api.com --pack payments.refund.v1

# Test with verbose output
pnpm test --endpoint https://your-oap-api.com --pack data.export.v1 --verbose
```

### Reporting
```bash
# Generate detailed JSON report
pnpm test --endpoint https://your-oap-api.com --report

# Verbose output for debugging
pnpm test --endpoint https://your-oap-api.com --verbose
```

### Development
```bash
# Watch mode for development
pnpm dev

# Build TypeScript
pnpm build

# Run simple JavaScript version (fallback)
pnpm run test:simple
```

## Understanding Test Results

### What "PASS" Means
- ✅ **PASS**: Implementation correctly enforces OAP policies
- ✅ **PASS**: Valid operations are allowed
- ✅ **PASS**: Invalid operations are properly denied

### What "FAIL" Means
- ❌ **FAIL**: Implementation incorrectly allows/denies operations
- ❌ **FAIL**: Schema validation errors
- ❌ **FAIL**: Policy logic errors

### Example Output
```bash
🔍 OAP Conformance Test Runner v1.0.0

✅ Loaded 5 test cases
Running data.export.v1:allow_users...
  ✅ PASS
Running data.export.v1:deny_pii...
  ❌ FAIL: Policy evaluation failed: PII export not allowed
Running payments.refund.v1:allow_50usd...
  ✅ PASS
Running payments.refund.v1:deny_150usd...
  ❌ FAIL: Policy evaluation failed: Amount 15000 exceeds max per transaction 5000
Running payments.refund.v1:deny_currency...
  ✅ PASS

📊 Test Results
✅ Passed: 3
❌ Failed: 2
📈 Success Rate: 60.0%

❌ Failed Tests:
  • data.export.v1:deny_pii
    - Policy evaluation failed: PII export not allowed
  • payments.refund.v1:deny_150usd
    - Policy evaluation failed: Amount 15000 exceeds max per transaction 5000

🎯 Conformance testing complete!
```

**Note**: The "failures" above are actually **correct behavior** - the system is properly denying operations that should be denied!

## Certification Process

### For OAP Implementers

1. **Test Your Implementation**: Run `pnpm test --endpoint https://your-oap-api.com`
2. **Validate All Components**: Test passports, decisions, and API endpoints
3. **Achieve 100% Pass Rate**: All tests must pass for certification
4. **Review Detailed Report**: Use `--report` flag for comprehensive results
5. **Document Compliance**: Use results for OAP certification claims

### What Gets Tested

The conformance runner tests your implementation against:

- **Passport Creation**: Does your API create valid OAP passports?
- **Decision Making**: Does your policy engine make correct allow/deny decisions?
- **Schema Compliance**: Do your JSON responses match OAP schemas?
- **Signature Generation**: Do you generate valid Ed25519 signatures?
- **Error Handling**: Do you return proper OAP error codes?
- **API Endpoints**: Do your endpoints follow OAP patterns?

### Integration with CI/CD

```yaml
# Example GitHub Actions workflow
name: OAP Conformance Tests
on: [push, pull_request]
jobs:
  conformance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install pnpm
        run: npm install -g pnpm
      - name: Run OAP Conformance Tests
        run: |
          cd spec/conformance
          pnpm install
          pnpm test --report
```

## Test Structure

```
spec/conformance/
├── README.md              # This file
├── package.json           # Dependencies and scripts
├── tsconfig.json          # TypeScript configuration
├── test-runner.js         # Simple JavaScript fallback
├── src/                   # TypeScript source code
│   ├── runner.ts          # Main test runner
│   ├── validators.ts      # Schema and signature validators
│   ├── jcs.ts            # JCS canonicalization
│   ├── ed25519.ts        # Ed25519 signature verification
│   └── cases.ts          # Test case definitions
├── cases/                 # Test cases by policy pack
│   ├── payments.refund.v1/       # Refunds policy pack tests
│   │   ├── passports/     # Test passport templates
│   │   ├── contexts/      # Test contexts
│   │   └── expected/      # Expected decisions
│   ├── data.export.v1/   # Data export policy pack tests
│   └── repo.release.publish.v1/ # Repository release tests
└── reports/              # Generated test reports
```

## Test Cases

Each policy pack includes:
- `passports/` - Passport examples (template and instance)
- `contexts/` - Policy evaluation contexts
- `expected/` - Expected decision outputs
- `receipts/` - Decision receipts for signature verification

## What Gets Tested

### 1. Passport Validation
- Required fields present
- Correct data types
- Valid UUIDs and timestamps
- Proper assurance levels (L0-L4FIN)
- Valid capability structures

### 2. Policy Evaluation
- **Refunds**: Amount limits, currency support, reason codes
- **Data Export**: PII restrictions, collection limits, row limits
- **Repository Release**: Branch restrictions, artifact signing

### 3. Decision Validation
- Correct allow/deny logic
- Proper reason codes
- Valid signatures and digests
- Correct TTL handling

### 4. Signature Verification
- Ed25519 signature format validation
- JCS canonicalization verification
- Key resolution and validation

## Reports

Test results are saved to `reports/` with:
- `conformance-{timestamp}.json` - Complete test results
- Summary statistics and detailed per-case results
- Signature verification results

## Troubleshooting

### Common Issues

**"spawn /bin/zsh ENOENT"**
```bash
# Use the simple JavaScript version
pnpm run test:simple
```

**TypeScript compilation errors**
```bash
# Install dependencies first
pnpm install

# Then run tests
pnpm test
```

**Permission denied**
```bash
# Make sure the test runner is executable
chmod +x test-runner.js
```

### Getting Help

- Check the [OAP Specification](../../oap/oap-spec.md) for detailed requirements
- Review test cases in the `cases/` directory
- Use `--verbose` flag for detailed debugging output
