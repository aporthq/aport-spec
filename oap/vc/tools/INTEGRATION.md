# OAP VC Integration Guide

This guide shows how to integrate OAP VC conversion tools into your application using the tools directly from the repository.

## ⚡ Quick Start (5 minutes)

```bash
# 1. Get the tools
git clone https://github.com/aporthq/oap-spec.git
cd oap-spec/spec/oap/vc/tools

# 2. Install and build
npm install
npm run build

# 3. Generate a registry key
node dist/cli.js generate-key --output registry-key.json

# 4. Convert your OAP passport to VC
node dist/cli.js export --type passport --input your-passport.json --output your-passport.vc.json --key registry-key.json

# 5. Convert VC back to OAP
node dist/cli.js import --type passport --input your-passport.vc.json --output your-passport-back.json
```

That's it! You now have working OAP ↔ VC conversion tools.

## 📖 Try the Examples

```bash
# Run the working examples
node examples/passport-to-vc.js
node examples/decision-to-vc.js
node examples/vc-to-passport.js
node examples/vc-to-decision.js

# Or run the test suite
node test-simple.js
```

## 🚀 Full Integration Guide

### 1. Get the Tools

```bash
# Clone or download the OAP specification repository
git clone https://github.com/aporthq/oap-spec.git
cd oap-spec/spec/oap/vc/tools

# Install dependencies
npm install

# Build the TypeScript code
npm run build
```

### 2. Basic Usage

#### Option A: Use as CLI Tool

```bash
# Export OAP Passport to VC
node dist/cli.js export --type passport --input passport.json --output passport.vc.json --key registry-key.json

# Export with verbose output (shows converted data)
node dist/cli.js export --type passport --input passport.json --output passport.vc.json --key registry-key.json --verbose

# Import VC to OAP Passport
node dist/cli.js import --type passport --input passport.vc.json --output passport.json

# Import with verbose output (shows converted data)
node dist/cli.js import --type passport --input passport.vc.json --output passport.json --verbose

# Validate OAP objects or VCs
node dist/cli.js validate --type passport --input passport.json
node dist/cli.js validate --type vc --input passport.vc.json

# Generate a registry key
node dist/cli.js generate-key --output my-registry-key.json
```

#### Option B: Use as SDK

```javascript
// Import the conversion functions directly
import { 
  exportPassportToVC, 
  exportDecisionToVC, 
  importVCToPassport, 
  importVCToDecision 
} from './dist/index.js';

// Your OAP passport
const passport = {
  agent_id: '550e8400-e29b-41d4-a716-446655440000',
  kind: 'template',
  spec_version: 'oap/1.0',
  // ... other fields
};

// Your registry key
const registryKey = {
  issuer: 'https://api.aport.dev',
  kid: 'key-2025-01',
  publicKey: 'your-ed25519-public-key',
  privateKey: 'your-ed25519-private-key'
};

// Convert to VC
const vc = exportPassportToVC(passport, registryKey);

// Convert back to OAP
const importedPassport = importVCToPassport(vc);
```

## 🔧 Integration Patterns

### Pattern 1: OAP → VC → Storage

```javascript
// Import the tools
import { exportPassportToVC, importVCToPassport } from './dist/index.js';

// Convert OAP passport to VC for storage in VC wallet
const vc = exportPassportToVC(passport, registryKey);

// Store in VC wallet
await vcWallet.store(vc);

// Later: retrieve and convert back
const storedVC = await vcWallet.retrieve(vcId);
const passport = importVCToPassport(storedVC);
```

### Pattern 2: VC → OAP → Processing

```javascript
// Import the tools
import { importVCToPassport, exportDecisionToVC } from './dist/index.js';

// Receive VC from external system
const vc = await receiveVCFromExternalSystem();

// Convert to OAP for processing
const passport = importVCToPassport(vc);

// Process using OAP logic
const decision = await processOAPPassport(passport);

// Convert decision back to VC
const decisionVC = exportDecisionToVC(decision, registryKey);

// Send back to external system
await sendVCToExternalSystem(decisionVC);
```

### Pattern 3: Hybrid OAP/VC System

```javascript
// Import the tools
import { exportPassportToVC } from './dist/index.js';

// Store both formats for maximum compatibility
const passport = await createOAPPassport(data);
const vc = exportPassportToVC(passport, registryKey);

// Store in both systems
await oapDatabase.store(passport);
await vcWallet.store(vc);

// Use appropriate format based on context
if (needsVCCapabilities) {
  return vc;
} else {
  return passport;
}
```

## 🛠️ CLI Integration

### Batch Conversion

```bash
#!/bin/bash
# Convert all OAP passports to VCs

# Make sure you're in the tools directory
cd spec/oap/vc/tools

# Build the tools first
npm run build

# Convert all passports
for passport in passports/*.json; do
  filename=$(basename "$passport" .json)
  node dist/cli.js export --type passport --input "$passport" --output "vcs/${filename}.vc.json" --key registry-key.json
done
```

### Validation Pipeline

```bash
#!/bin/bash
# Validate all VCs before processing

# Make sure you're in the tools directory
cd spec/oap/vc/tools

# Build the tools first
npm run build

# Validate all VCs
for vc in vcs/*.vc.json; do
  if ! node dist/cli.js validate --type vc --input "$vc"; then
    echo "Invalid VC: $vc"
    exit 1
  fi
done
```

## 🔒 Security Integration

### Key Management

```javascript
// Import the tools
import { exportPassportToVC, importVCToPassport } from './dist/index.js';

// Load registry key securely
const registryKey = await loadRegistryKeyFromSecureStore();

// Rotate keys periodically
const newKey = await generateNewRegistryKey();
await updateRegistryKey(newKey);
```

### Signature Verification

```javascript
// Import the tools
import { importVCToPassport } from './dist/index.js';

// Always verify signatures when importing
const vc = await receiveVCFromExternalSystem();

try {
  const passport = importVCToPassport(vc);
  // Signature verified automatically
  console.log('VC signature is valid');
} catch (error) {
  console.error('Invalid VC signature:', error.message);
}
```

## 🌐 VC Ecosystem Integration

### VC Wallet Integration

```javascript
// Import the tools
import { exportPassportToVC } from './dist/index.js';

// Store OAP as VC in wallet
const vc = exportPassportToVC(passport, registryKey);
await wallet.store(vc);

// Present VC to verifier
const presentation = await wallet.createPresentation([vc]);
await verifier.verify(presentation);
```

### DID Integration

```javascript
// Import the tools
import { exportPassportToVC } from './dist/index.js';

// Use with DID documents
const did = 'did:example:123456789';
const vc = exportPassportToVC(passport, { ...registryKey, issuer: did });
```

## 📊 Monitoring and Logging

```javascript
// Import the tools
import { exportPassportToVC } from './dist/index.js';

// Log conversion events
function convertWithLogging(passport, registryKey) {
  console.log('Converting passport to VC:', passport.agent_id);
  
  try {
    const vc = exportPassportToVC(passport, registryKey);
    console.log('Conversion successful:', vc.id);
    return vc;
  } catch (error) {
    console.error('Conversion failed:', error.message);
    throw error;
  }
}
```

## 🧪 Testing Integration

```javascript
// Import the tools
import { exportPassportToVC, importVCToPassport } from './dist/index.js';

// Test conversion functions
describe('OAP VC Conversion', () => {
  test('should convert passport to VC and back', () => {
    const vc = exportPassportToVC(samplePassport, sampleRegistryKey);
    const importedPassport = importVCToPassport(vc);
    
    expect(importedPassport.agent_id).toBe(samplePassport.agent_id);
    expect(importedPassport.kind).toBe(samplePassport.kind);
  });
});
```

## 🚀 Deployment

### Docker Integration

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy the OAP VC tools
COPY spec/oap/vc/tools/package*.json ./
RUN npm install

COPY spec/oap/vc/tools/ ./
RUN npm run build

# Use the CLI tool
CMD ["node", "dist/cli.js", "--help"]
```

### CI/CD Pipeline

```yaml
name: OAP VC Conversion
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: |
          cd spec/oap/vc/tools
          npm install
      - name: Build tools
        run: |
          cd spec/oap/vc/tools
          npm run build
      - name: Test tools
        run: |
          cd spec/oap/vc/tools
          npm test
```

## 📚 Additional Resources

- [W3C Verifiable Credentials Data Model v2.0](https://www.w3.org/TR/vc-data-model-2.0/)
- [OAP Specification](../oap-spec.md)
- [VC Mapping Documentation](../vc-mapping.md)
- [Examples Directory](./examples/)
