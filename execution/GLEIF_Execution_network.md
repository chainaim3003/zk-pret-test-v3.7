# GLEIF Network Verifier Execution Path Analysis

## Command Executed
```bash
node ./build/impl/network/verifier/GLEIFNetworkMultiVerifier.js "SREE PALANI ANDAVAR AGROS PRIVATE LIMITED"
```

## Execution Flow

### 1. Entry Point
**File**: `build/impl/network/verifier/GLEIFNetworkMultiVerifier.js` (compiled from `src/impl/network/verifier/GLEIFNetworkMultiVerifier.ts`)

**Purpose**: 
- Parses command line arguments (company name)
- Calls main verification function
- Formats and displays results

**Key Function Call**:
```typescript
const result = await verifyGLEIFMultiCompanyCompliance(companyNames, true);
```

### 2. Main Verification Controller
**Function**: `verifyGLEIFMultiCompanyCompliance()` in GLEIFNetworkMultiVerifier.ts

**Purpose**:
- Environment-aware contract discovery
- Calls the funded accounts wrapper

**Key Function Call**:
```typescript
const result = await runGLEIFTestWithFundedAccounts(companyNames);
```

### 3. Enhanced Test Wrapper
**File**: `build/impl/network/handler/GLEIFNetworkHandler.js` (compiled from `src/impl/network/handler/GLEIFNetworkHandler.ts`)

**Function**: `runGLEIFTestWithFundedAccounts()`

**Purpose**:
- Environment-aware Oracle Registry initialization
- Ensures funded account usage for DEVNET transactions
- Calls core verification method

**Key Function Call**:
```typescript
const result = await this.getGLEIFNetworkMultiVerifierUtils(companyNames);
```

### 4. Core Network Handler
**Function**: `getGLEIFNetworkMultiVerifierUtils()` in GLEIFNetworkHandler.ts

**Main Operations**:
1. Infrastructure initialization
2. Environment-aware blockchain setup
3. ZK program compilation
4. Existing smart contract lookup
5. Multi-company verification loop
6. Results compilation

## Key Dependencies and Architecture

### Composition Pattern
**GLEIFNetworkHandler uses composition**:
- **BaseVerificationCore** - Network connection management
- **ComplianceVerificationBase** - Shared compliance logic

### Infrastructure Components
- **Environment Manager** - Handles LOCAL/TESTNET/MAINNET environments
- **Oracle Registry Factory** - Manages funded accounts
- **Compilation Manager** - ZK program compilation
- **Deployment Manager** - Contract address resolution

### Core Files and Dependencies

#### Entry and Controller Layer
- **`src/impl/network/verifier/GLEIFNetworkMultiVerifier.ts`** - CLI entry point
- **`src/impl/network/handler/GLEIFNetworkHandler.ts`** - Core verification logic

#### Base Infrastructure
- **`src/impl/base/BaseVerificationCore.ts`** - Network connection utilities
- **`src/impl/base/ComplianceVerificationBase.ts`** - Shared compliance logic
- **`src/infrastructure/index.ts`** - Infrastructure module exports

#### Environment Management
- **`src/infrastructure/environment/manager.ts`** - Environment detection and management
- **`config/environments/testnet.json`** - TESTNET configuration with funded accounts
- **`config/environments/local.json`** - LOCAL configuration
- **`config/environments/mainnet.json`** - MAINNET configuration

#### Oracle Account Management
- **`src/infrastructure/oracle/factory.ts`** - Oracle account factory
- **`src/infrastructure/oracle/NetworkOracleRegistry.ts`** - Network account management
- **`src/core/OracleRegistry.js`** - Legacy Oracle key management

#### ZK Components (Same as Local)
- **`src/zk-programs/compliance/GLEIFZKProgram.js`** - ZK circuit definitions
- **`src/contracts/complaince/GLEIF/GLEIFMultiSmartContract.js`** - Smart contract

#### API and Utilities (Same as Local)
- **`src/utils/domain/compliance/GLEIF/GLEIFCoreAPIUtils.js`** - GLEIF API integration

#### Configuration Files
- **`.env`** - Environment variables and API endpoints
- **`config.json`** - Basic network configuration
- **`package.json`** - Scripts and dependencies
- **`tsconfig.json`** - TypeScript compilation

## Network vs Local Differences

### 1. Blockchain Connection
**Network**:
```typescript
// Connects to external networks
const endpoint = this.baseCore.getNetworkEndpoint(); // DEVNET/TESTNET/MAINNET
Mina.setActiveInstance(Mina.Network(endpoint));
```

**Local**:
```typescript
// Creates local blockchain
const Local = await Mina.LocalBlockchain({ proofsEnabled: false });
Mina.setActiveInstance(Local);
```

### 2. Account Management
**Network**:
```typescript
// Uses funded Oracle accounts from environment config
deployerAccount = getDeployerAccount('GLEIF');
deployerKey = getDeployerKey('GLEIF');
// Accounts loaded from config/environments/testnet.json
```

**Local**:
```typescript
// Uses local test accounts
deployerAccount = Local.testAccounts[0];
deployerKey = Local.testAccounts[0].key;
```

### 3. Smart Contract Discovery
**Network**:
```typescript
// Loads existing deployed contract address
const contractAddress = await environmentManager.getDeployedContractAddress('GLEIFOptimMultiCompanySmartContract');
const zkAppAddress = PublicKey.fromBase58(contractAddress);
// Address from config/environments/testnet.json deployments.contracts section
```

**Local**:
```typescript
// Deploys new contract
const zkAppKey = PrivateKey.random();
const zkAppAddress = zkAppKey.toPublicKey();
await zkApp.deploy({ verificationKey });
```

### 4. Transaction Fees
**Network**:
```typescript
// Environment-aware fees
const fee = this.getTransactionFee(currentEnvironment);
// TESTNET: 100000000, MAINNET: 300000000, LOCAL: 1000000
```

**Local**:
```typescript
// Default/minimal fees for local testing
```

## Environment Configuration Details

### TESTNET Configuration
**File**: `config/environments/testnet.json`

**Key Elements**:
- **Network endpoint**: `https://api.minascan.io/node/devnet/v1/graphql`
- **Oracle accounts**: Pre-funded GLEIF deployer/sender accounts
- **Contract addresses**: Currently deployed contract `B62qqTMTF4KVhFZ82Fkrqakgt1uYE1vi78gjooEiq2Fgo3wyPqd1P5q`
- **Deployment aliases**: testnet-gleif, testnet-gleif-dev, testnet-gleif-force

### Runtime Environment Detection
**Environment Variables Used**:
- **`BUILD_ENV`** - Set to TESTNET for network mode
- **`GLEIF_URL_PROD`** - GLEIF API endpoint

## Data Flow and Network Operations

### 1. Environment Initialization
1. **Environment Detection**: Reads `BUILD_ENV` and determines TESTNET mode
2. **Network Connection**: Connects to DEVNET GraphQL endpoint
3. **Account Loading**: Loads funded Oracle accounts from testnet.json
4. **Contract Discovery**: Finds deployed contract address

### 2. Verification Process
1. **GLEIF API Call**: Same as local - fetches company data
2. **Compliance Analysis**: Same business logic as local
3. **ZK Proof Generation**: Same cryptographic operations
4. **Network Transaction**: Submits to actual blockchain network
5. **State Verification**: Queries actual network state

### 3. Network Transaction Flow
```typescript
const verifyTxn = await Mina.transaction(
  { sender: senderAccount, fee }, // Uses funded account + network fees
  async () => {
    await zkApp.verifyOptimizedComplianceWithProof(
      proof,
      companyWitness,
      companyRecord,
      companiesMap.getWitness(companyKey.toField())
    );
  }
);

await verifyTxn.prove(); // Generate transaction proof
await verifyTxn.sign([senderKey]).send(); // Submit to network
```

## File System Structure (Network-Specific)

```
C:\Users\MADHAN\WORK\CHAINAIM3003\clone-1\zk-pret-test-v3.7.0\
├── config/environments/
│   ├── testnet.json                       # Network config & contract addresses
│   ├── mainnet.json                       # Mainnet configuration
│   └── local.json                         # Local fallback config
├── src/impl/network/
│   ├── verifier/
│   │   └── GLEIFNetworkMultiVerifier.ts   # Network entry point
│   └── handler/
│       └── GLEIFNetworkHandler.ts         # Core network logic
├── src/impl/base/
│   ├── BaseVerificationCore.ts            # Network utilities
│   └── ComplianceVerificationBase.ts      # Shared compliance logic
├── src/infrastructure/
│   ├── environment/
│   │   └── manager.ts                     # Environment management
│   └── oracle/
│       ├── factory.ts                     # Account factory
│       └── NetworkOracleRegistry.ts       # Network accounts
└── [shared files same as local verifier]
```

## Runtime Behavior Comparison

### Network Verifier
- **Startup**: ~10-15 seconds (network connection + account loading)
- **ZK Compilation**: ~30-60 seconds (same as local)
- **Transaction**: 3-5 minutes (network confirmation times)
- **Verification**: Queries live blockchain state
- **Persistence**: Results permanently recorded on blockchain

### Local Verifier
- **Startup**: ~2-3 seconds (local blockchain creation)
- **ZK Compilation**: ~30-60 seconds (same as network)
- **Transaction**: ~1-2 seconds (instant local confirmation)
- **Verification**: Local state only
- **Persistence**: Results lost when process ends

## Key Environment Variables and Endpoints

**Network Configuration**:
- **DEVNET GraphQL**: `https://api.minascan.io/node/devnet/v1/graphql`
- **Archive Endpoint**: `https://archive.devnet.minaexplorer.com`
- **MinaScan Explorer**: `https://minascan.io/devnet/`

**Contract Addresses** (from testnet.json):
- **GLEIFOptimMultiCompanySmartContract**: `B62qqTMTF4KVhFZ82Fkrqakgt1uYE1vi78gjooEiq2Fgo3wyPqd1P5q`

## Output and Results

The network verifier produces:
1. **Live Blockchain Verification**: Results recorded on actual DEVNET
2. **Transaction Hashes**: Permanent transaction records
3. **Explorer Links**: MinaScan URLs for verification
4. **Network State**: Real contract state updates
5. **Compliance Records**: Permanently stored compliance data

## Error Handling and Resilience

**Network-Specific Error Handling**:
- **Connection failures**: Automatic retry with exponential backoff
- **Account funding**: Validates sufficient balance before transactions
- **Transaction failures**: Detailed error reporting with suggested fixes
- **Contract state**: Safe state retrieval with fallback mechanisms