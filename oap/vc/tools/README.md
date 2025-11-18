# OAP VC Conversion Tools

Practical tools for converting between Open Agent Passport (OAP) objects and Verifiable Credentials (VCs) for interoperability with VC/DID ecosystems.

## 🚀 Quick Start

### Installation

```bash
# Clone the OAP specification repository
git clone https://github.com/aporthq/oap-spec.git
cd oap-spec/spec/oap/vc/tools

# Install dependencies
npm install

# Build the TypeScript code
npm run build
```

### CLI Usage

```bash
# Export OAP Passport to VC
node dist/cli.js export --type passport --input passport.json --output passport.vc.json --key registry-key.json

# Export with verbose output (shows converted data)
node dist/cli.js export --type passport --input passport.json --output passport.vc.json --key registry-key.json --verbose

# Export OAP Decision to VC
node dist/cli.js export --type decision --input decision.json --output decision.vc.json --key registry-key.json

# Import VC to OAP Passport
node dist/cli.js import --type passport --input passport.vc.json --output passport.json

# Import with verbose output (shows converted data)
node dist/cli.js import --type passport --input passport.vc.json --output passport.json --verbose

# Import VC to OAP Decision
node dist/cli.js import --type decision --input decision.vc.json --output decision.json

# Validate OAP objects or VCs
node dist/cli.js validate --type passport --input passport.json
node dist/cli.js validate --type decision --input decision.json
node dist/cli.js validate --type vc --input passport.vc.json

# Generate a registry key
node dist/cli.js generate-key --output my-registry-key.json
```

### SDK Usage

```javascript
import { 
  exportPassportToVC, 
  exportDecisionToVC, 
  importVCToPassport, 
  importVCToDecision 
} from './dist/index.js';

// Export OAP Passport to VC
const passportVC = exportPassportToVC(passport, registryKey);

// Export OAP Decision to VC
const decisionVC = exportDecisionToVC(decision, registryKey);

// Import VC to OAP Passport
const passport = importVCToPassport(vc);

// Import VC to OAP Decision
const decision = importVCToDecision(vc);
```

## 📋 Requirements

- Node.js 18+
- TypeScript 5.3+
- Registry key for signing VCs

## 🔧 Configuration

### Registry Key Format

```json
{
  "issuer": "https://aport.io",
  "kid": "key-2025-01",
  "publicKey": "your-ed25519-public-key",
  "privateKey": "your-ed25519-private-key"
}
```

### OAP Passport Format

```json
{
  "agent_id": "550e8400-e29b-41d4-a716-446655440000",
  "kind": "template",
  "spec_version": "oap/1.0",
  "owner_id": "org_12345678",
  "owner_type": "org",
  "assurance_level": "L2",
  "status": "active",
  "capabilities": [
    { "id": "finance.payment.refund", "params": { "currency_limits": { "USD": { "max_per_tx": 5000 } } } }
  ],
  "limits": { /* policy limits */ },
  "regions": ["US", "CA"],
  "metadata": { /* additional metadata */ },
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-15T10:30:00Z",
  "version": "1.0.0"
}
```

### OAP Decision Format

```json
{
  "decision_id": "550e8400-e29b-41d4-a716-446655440002",
  "policy_id": "finance.payment.refund.v1",
  "agent_id": "550e8400-e29b-41d4-a716-446655440000",
  "owner_id": "org_12345678",
  "assurance_level": "L2",
  "allow": true,
  "reasons": [
    { "code": "oap.allowed", "message": "Transaction within limits" }
  ],
  "created_at": "2024-01-15T10:30:00Z",
  "expires_in": 3600,
  "passport_digest": "sha256:abcd1234efgh5678ijkl9012mnop3456qrst7890uvwx1234yzab5678cdef",
  "signature": "eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9...",
  "kid": "oap:registry:key-2025-01",
  "decision_token": "eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

## 🧪 Testing

```bash
# Run the simple test (no build required)
node test-simple.js

# Build and run full test suite
npm run build
npm test

# Run specific test
npm run test -- --grep "passport"
```

## 📚 API Reference

### `exportPassportToVC(passport, registryKey)`

Converts an OAP Passport to a Verifiable Credential.

**Parameters:**

- `passport` (OAPPassport): The OAP passport object
- `registryKey` (RegistryKey): Registry key for signing

**Returns:** `VerifiableCredential`

### `exportDecisionToVC(decision, registryKey)`

Converts an OAP Decision to a Verifiable Credential.

**Parameters:**

- `decision` (OAPDecision): The OAP decision object
- `registryKey` (RegistryKey): Registry key for signing

**Returns:** `VerifiableCredential`

### `importVCToPassport(vc)`

Converts a Verifiable Credential to an OAP Passport.

**Parameters:**

- `vc` (VerifiableCredential): The Verifiable Credential

**Returns:** `OAPPassport`

### `importVCToDecision(vc)`

Converts a Verifiable Credential to an OAP Decision.

**Parameters:**

- `vc` (VerifiableCredential): The Verifiable Credential

**Returns:** `OAPDecision`

## 📊 Logging and Debugging

The tools provide detailed logging to help you understand what's being converted:

### Verbose Output

Use the `--verbose` flag to see the full converted data:

```bash
# Show converted VC data
node dist/cli.js export --type passport --input passport.json --output passport.vc.json --key registry-key.json --verbose

# Show converted OAP data
node dist/cli.js import --type passport --input passport.vc.json --output passport.json --verbose
```

### Example Output

```text
✅ Successfully exported passport to VC
📁 Output written to: passport.vc.json

📄 Converted VC Data:
──────────────────────────────────────────────────
{
  "@context": [
    "https://www.w3.org/2018/credentials/v1",
    "https://raw.githubusercontent.com/aporthq/aport-spec/refs/heads/main/oap/vc/context-oap-v1.jsonld"
  ],
  "type": ["VerifiableCredential", "OAPPassportCredential"],
  "credentialSubject": {
    "agent_id": "550e8400-e29b-41d4-a716-446655440000",
    "kind": "template",
    "spec_version": "oap/1.0",
    ...
  },
  "issuer": "https://aport.io",
  "issuanceDate": "2024-01-01T00:00:00Z",
  "expirationDate": "2025-01-01T00:00:00Z",
  "proof": {
    "type": "Ed25519Signature2020",
    ...
  }
}
──────────────────────────────────────────────────
```

## 🔒 Security Considerations

- **Signing**: VCs are signed using Ed25519Signature2020
- **Verification**: Always verify VC signatures before importing
- **Key Management**: Store registry keys securely
- **Expiration**: VCs include expiration dates for security

## 🌐 Interoperability

These tools enable OAP objects to work with:

- **VC Wallets**: Store OAP objects in standard VC wallets
- **VC Presentations**: Present OAP objects using VC presentation protocols
- **VC Verification**: Verify OAP objects using standard VC libraries
- **DID Ecosystems**: Integrate with Decentralized Identifier systems

## 📖 Examples

See the `examples/` directory for complete working examples:

- `examples/passport-to-vc.js` - Convert passport to VC
- `examples/decision-to-vc.js` - Convert decision to VC
- `examples/vc-to-passport.js` - Convert VC to passport
- `examples/vc-to-decision.js` - Convert VC to decision

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.
