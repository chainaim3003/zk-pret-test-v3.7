# Business Process Network Multi Verifier Execution Path Analysis

## Command Executed
```bash
node ./build/impl/network/verifier/BusinessProcessNetworkMultiVerifier.js bpmngroup1 STABLECOIN ./src/data/STABLECOIN/process/EXPECTED/STABLECOIN-Expected.bpmn ./src/data/STABLECOIN/process/ACTUAL/STABLECOIN-Accepted1.bpmn
```

## Command Arguments
- **Group ID**: `bpmngroup1` - Business process group identifier
- **Process Type**: `STABLECOIN` - Type of business process being verified
- **Expected BPMN**: `./src/data/STABLECOIN/process/EXPECTED/STABLECOIN-Expected.bpmn` - Expected process flow
- **Actual BPMN**: `./src/data/STABLECOIN/process/ACTUAL/STABLECOIN-Accepted1.bpmn` - Actual executed process flow

## Execution Flow

### 1. Entry Point
**File**: `build/impl/network/verifier/BusinessProcessNetworkMultiVerifier.js` (compiled from `src/impl/network/verifier/BusinessProcessNetworkMultiVerifier.ts`)

**Purpose**: 
- CLI argument parsing and validation
- Network type detection (testnet/mainnet)
- Single vs multi-process mode detection
- Calls main verification function

**Key Function Call** (for single process):
```typescript
const result = await runBusinessProcessTestWithFundedAccounts(
  CircuitString.fromString(bpmnGroupID),
  processType,
  expectedFile,
  actualFile,
  networkType
);
```

### 2. Network Handler Entry Point
**File**: `build/impl/network/handler/BusinessProcessNetworkHandler.js` (compiled from `src/impl/network/handler/BusinessProcessNetworkHandler.ts`)

**Function**: `runBusinessProcessTestWithFundedAccounts()`

**Purpose**:
- Network environment orchestration
- Follows the GLEIF pattern for network verification
- Calls core verification method in BusinessProcessNetworkHandler class

**Key Function Call**:
```typescript
const handler = new BusinessProcessNetworkHandler();
return handler.runBusinessProcessTestWithFundedAccounts(
  bpmnGroupID, processType, expectedBPMNFile, actualBPMNFile, networkType
);
```

### 3. Core Business Process Network Handler
**Function**: `runBusinessProcessTestWithFundedAccounts()` in BusinessProcessNetworkHandler class

**Main Operations** (10 Step Process):
1. Oracle Registry initialization with funded accounts
2. Environment setup (DEVNET/TESTNET/MAINNET)
3. Account setup with proper network connection
4. ZK program compilation
5. Smart contract lookup from environment config
6. BPMN processing and verification
7. Oracle signature generation
8. ZK proof generation with process-specific circuits
9. Smart contract transaction with network fees
10. Final verification results compilation

## Network vs Local Differences

### Key Architectural Differences

#### 1. Network Connection
**Network**:
```typescript
// Connects to external blockchain networks
const connected = this.baseCore.setupNetworkConnection();
// Uses DEVNET: https://api.minascan.io/node/devnet/v1/graphql
```

**Local**:
```typescript
// Creates local blockchain
const Local = await Mina.LocalBlockchain({ proofsEnabled: false });
```

#### 2. Account Management
**Network**:
```typescript
// Uses funded Oracle accounts from environment config
deployerAccount = getDeployerAccount('BPMN');
deployerKey = getDeployerKey('BPMN'); 
senderAccount = getSenderAccount('BPMN');
senderKey = getSenderKey('BPMN');
// Accounts loaded from config/environments/testnet.json
```

**Local**:
```typescript
// Uses local test accounts
deployerAccount = Local.testAccounts[0];
deployerKey = Local.testAccounts[0].key;
```

#### 3. Smart Contract Discovery
**Network**:
```typescript
// Loads existing deployed contract address
const contractAddress = await environmentManager.getDeployedContractAddress('BPMNGenericSmartContract');
const zkAppAddress = PublicKey.fromBase58(contractAddress);
// Address from config/environments/testnet.json deployments.contracts section
```

**Local**:
```typescript
// Creates fresh contract instances
const zkAppKey = PrivateKey.random();
const zkAppAddress = zkAppKey.toPublicKey();
```

#### 4. Transaction Fees
**Network**:
```typescript
// Environment-aware fees
const fee = this.getTransactionFee(currentEnv);
// TESTNET: 100000000, MAINNET: 300000000
```

**Local**:
```typescript
// Minimal/default fees for local testing
```

#### 5. Process-Specific ZK Circuits
**Network** uses specialized circuits based on process type:
```typescript
switch (processType.toUpperCase()) {
  case 'STABLECOIN':
    proof = await BPMNGeneric.proveComplianceSTABLECOIN(
      processHash, businessProcessData, oracleSignature, merkleWitness
    );
    break;
  case 'SCF':
    proof = await BPMNGeneric.proveComplianceSCF(...);
    break;
  case 'DVP':
    proof = await BPMNGeneric.proveComplianceDVP(...);
    break;
}
```

## Key Files and Dependencies

### Entry and Handler Layer
- **`src/impl/network/verifier/BusinessProcessNetworkMultiVerifier.ts`** - CLI entry point with network support
- **`src/impl/network/handler/BusinessProcessNetworkHandler.ts`** - Core network verification orchestrator

### Base Infrastructure (Composition Pattern)
- **`src/impl/base/BaseVerificationCore.ts`** - Network connection utilities
- **`src/impl/base/BusinessProcessVerificationBase.ts`** - BPMN parsing and process analysis

### Network Infrastructure
- **`src/infrastructure/environment/manager.ts`** - Environment detection and management
- **`config/environments/testnet.json`** - TESTNET configuration with funded accounts and contract addresses
- **`src/infrastructure/oracle/factory.ts`** - Oracle account factory and management

### ZK Components
- **`src/zk-programs/process/BPMNGenericZKProgram.ts`** - ZK circuit definitions for business processes
- **`src/contracts/process/BPMNGenericSmartContract.ts`** - Smart contract for network deployment
- **`src/impl/test/BusinessProcessIntegrityVerificationTest.ts`** - ZK proof generation utilities

### BPMN Processing (Same as Local)
- **`src/utils/transform/parsebpmn.ts`** - BPMN XML parsing and process path extraction

### Environment Configuration
- **`config/environments/testnet.json`** - TESTNET accounts and contract addresses
- **`.env`** - Environment variables and settings

## ZK Circuit Selection Logic

### Process-Specific Verification
The network verifier selects appropriate ZK circuits based on process type:

**STABLECOIN Process**:
```typescript
proof = await BPMNGeneric.proveComplianceSTABLECOIN(
  processHash,
  businessProcessData,
  oracleSignature,
  merkleWitness
);
```

**SCF (Supply Chain Finance) Process**:
```typescript
proof = await BPMNGeneric.proveComplianceSCF(
  processHash,
  businessProcessData,
  oracleSignature,
  merkleWitness
);
```

**DVP (Delivery vs Payment) Process**:
```typescript
proof = await BPMNGeneric.proveComplianceDVP(
  processHash,
  businessProcessData,
  oracleSignature,
  merkleWitness
);
```

### Supported Process Types
- **STABLECOIN** - Stablecoin issuance and redemption workflows
- **SCF** - Supply chain finance and trade workflows
- **DVP** - Delivery vs payment settlement workflows

## Network Configuration Details

### TESTNET Configuration
**File**: `config/environments/testnet.json`

**Key Elements**:
- **Network endpoint**: `https://api.minascan.io/node/devnet/v1/graphql`
- **BPMN Oracle accounts**: Pre-funded deployer/sender accounts for BPMN operations
- **Contract addresses**: Currently deployed BPMNGenericSmartContract address
- **Deployment aliases**: testnet-bpmn, testnet-bpmn-dev, testnet-bpmn-force

**BPMN Oracle Accounts** (from testnet.json):
```json
"BPMN": {
  "role": "BPMN_ORACLE",
  "deployer": {
    "privateKey": "EKDurec4xzVAJPV2ZqkkzMmCmVxHAxoDGXDGtfvA2wQ1JEV3iMV7",
    "publicKey": "B62qrpRopAxfDFkAjyHkxTcWysHnv36YKAjh7TK3nirEEvTMhKrfSVx"
  },
  "sender": {
    "privateKey": "EKE1UQsE58fR7gqhQuV45k2yBCwm4XAkHgaFr27cxwbAdmvvnqHp",
    "publicKey": "B62qnpF1AWj3ePCZsXKotRuqbi1Y6Fv69YZ7XJGcq88u7ZGyZbu9Mvm"
  }
}
```

## Smart Contract Integration

### BPMNGenericSmartContract Structure
**File**: `src/contracts/process/BPMNGenericSmartContract.ts`

**Key State Fields**:
```typescript
@state(Field) totalBPMNGroupTracked = State<Field>();     // Number of groups tracked
@state(Field) validBPMNCount = State<Field>();           // Valid process count
@state(Field) totalVerificationsGlobal = State<Field>(); // Total verifications
@state(Field) lastVerificationTime = State<Field>();     // Latest verification
@state(Field) bpmnGroupMapRoot = State<Field>();         // Merkle map root
@state(Field) registryVersion = State<Field>();          // Contract version
@state(Bool) contractDisabled = State<Bool>();           // Emergency disable
```

### Contract Method Called
```typescript
await zkApp.verifyOptimizedComplianceWithProof(
  proof,                    // ZK proof from BPMNGeneric circuit
  bpmnGroupWitness,        // Merkle witness for group record
  bpmnGroupRecord,         // Group compliance record
  bpmnGroupMapWitness      // Map witness for group storage
);
```

## Data Flow Pipeline

```
Input BPMN Files
       ↓
   XML Parser (parsebpmn.ts)
       ↓
   Process Path Extraction
       ↓
   Business Process Data Structure Creation
       ↓
   Process-Specific ZK Circuit Selection
       ↓
   Oracle Signature Generation
       ↓
   ZK Proof Generation (STABLECOIN/SCF/DVP)
       ↓
   Network Transaction Preparation
       ↓
   Smart Contract Method Call
       ↓
   Network Submission (DEVNET/TESTNET/MAINNET)
       ↓
   Transaction Hash & Explorer Link
```

## Runtime Network Operations

### Phase 1: Network Initialization (10-15 seconds)
- Oracle Registry initialization with funded accounts
- DEVNET connection establishment
- Account balance verification
- Contract address lookup

### Phase 2: BPMN Processing (2-5 seconds)
- XML parsing and process path extraction
- Business process data structure creation
- Initial process analysis

### Phase 3: ZK Compilation (30-60 seconds)
- BPMNGeneric ZK program compilation
- BPMNGenericSmartContract compilation
- Circuit constraint generation

### Phase 4: Proof Generation (10-20 seconds)
- Process-specific circuit selection
- ZK proof generation with O1JS optimizations
- Oracle signature creation

### Phase 5: Network Transaction (3-5 minutes)
- Smart contract transaction preparation
- Network submission to DEVNET
- Transaction confirmation
- Explorer link generation

## File System Structure

```
C:\Users\MADHAN\WORK\CHAINAIM3003\clone-1\zk-pret-test-v3.7.0\
├── config/environments/
│   └── testnet.json                       # Network config & BPMN contract address
├── src/impl/network/verifier/
│   └── BusinessProcessNetworkMultiVerifier.ts # Network CLI entry point
├── src/impl/network/handler/
│   └── BusinessProcessNetworkHandler.ts   # Core network verification logic
├── src/impl/base/
│   ├── BaseVerificationCore.ts           # Network utilities
│   └── BusinessProcessVerificationBase.ts # BPMN processing logic
├── src/infrastructure/
│   ├── environment/manager.ts            # Environment management
│   └── oracle/factory.ts                 # Account factory
├── src/zk-programs/process/
│   └── BPMNGenericZKProgram.ts           # ZK circuits for business processes
├── src/contracts/process/
│   └── BPMNGenericSmartContract.ts       # Smart contract for network deployment
├── src/utils/transform/
│   └── parsebpmn.ts                      # BPMN XML parsing
└── src/data/STABLECOIN/process/
    ├── EXPECTED/STABLECOIN-Expected.bpmn # Expected process definition
    └── ACTUAL/STABLECOIN-Accepted1.bpmn  # Actual execution trace
```

## Expected Network Output

### Successful Network Verification
```
🔧 ENHANCED BPMN TEST - FOLLOWING GLEIF PATTERN
🏗️  Process Type: STABLECOIN
📊 Network: testnet
📋 Step 1: Initializing Oracle Registry
✅ Oracle Registry initialized

📋 Step 2: Setting up environment
🌐 Environment: TESTNET
🔗 Connect to DEVNET: true

📋 Step 3: Setting up accounts
🌐 DEVNET environment detected - using funded Oracle accounts
✅ Network connection established via BaseVerificationCore
💰 Sender Balance: 10.000 MINA
✅ Blockchain environment initialized with DEVNET Oracle accounts

📋 Step 4: Compiling ZK programs...
✅ BPMNGeneric ZK program compiled
✅ BPMNGenericSmartContract compiled

📋 Step 5: Looking up smart contract address...
✅ Contract address found: B62qmTMsVXhNzWCxguQV2wkAwnDKh1qzGycnykGL6fZpMuX5A5B1dAv
📋 Source: config/environments/testnet.json

📋 Step 6: Business Process Verification
📊 Expected Pattern: a→task1→gateway→task2→end
📊 Actual Path: a→task1→gateway→task2→end

📋 Step 7: Generating oracle signature...
✅ Oracle signature generated

📋 Step 8: Generating ZK proof...
🎯 Process Type: STABLECOIN - Selecting appropriate circuit
🔄 Calling BPMNGeneric.proveComplianceSTABLECOIN...
✅ STABLECOIN ZK proof generated successfully

📋 Step 9: Executing smart contract verification transaction...
⚡ Generating transaction proof...
✅ Transaction proof generated successfully
✅ Smart contract transaction completed

🌍 NETWORK VERIFICATION COMPLETE:
📊 Verification Result: ✅ PASSED
🌍 Network: TESTNET
📊 Network Submitted: ✅ YES
🔍 Transaction Hash: txn_1234567890_STABLECOIN
🔍 Explorer Link: https://minascan.io/testnet/tx/txn_1234567890_STABLECOIN

✅ Business Process NETWORK Verification Completed Successfully!
🎉 SUCCESS: Process verification passed with cryptographic proof!
```

## Key Differences from Local Verifier

### 1. Network Infrastructure
- **Network**: Real blockchain with transaction fees and confirmation times
- **Local**: Instant local blockchain with no fees

### 2. Account Management
- **Network**: Pre-funded Oracle accounts from environment configuration
- **Local**: Generated test accounts with unlimited balance

### 3. Contract Deployment
- **Network**: Uses existing deployed contracts from environment config
- **Local**: Deploys fresh contracts for each test

### 4. Persistence
- **Network**: Results permanently recorded on blockchain with transaction hashes
- **Local**: Results exist only during test execution

### 5. Performance
- **Network**: 3-5 minute total execution with network confirmation
- **Local**: 30-60 second execution for immediate testing

### 6. Verification Authority
- **Network**: Blockchain consensus validates results
- **Local**: Local verification only

## Error Handling and Network Resilience

### Network-Specific Error Handling
1. **Connection Failures**: Automatic retry with exponential backoff
2. **Account Funding**: Balance verification before transactions
3. **Contract State**: Safe state retrieval with fallbacks
4. **Transaction Failures**: Detailed error reporting with suggested solutions
5. **Fee Estimation**: Environment-aware transaction fee calculation

### Recovery Mechanisms
- Graceful degradation to local verification if network unavailable
- Detailed transaction status reporting
- Explorer link generation for transaction tracking
- Comprehensive error logging with stack traces

## Multi-Process Support

The network verifier supports both single and multi-process verification:

### Multi-Process Example
```bash
node BusinessProcessNetworkMultiVerifier.js \
  bpmngroup1 STABLECOIN expected1.bpmn actual1.bpmn \
  bpmngroup2 SCF expected2.bpmn actual2.bpmn \
  bpmngroup3 DVP expected3.bpmn actual3.bpmn
```

### Multi-Process Output
```
📊 Mode: Multi-Process
📋 Process Count: 3
🌍 Network: TESTNET

🔄 Processing 1/3: STABLECOIN
✅ STABLECOIN verification completed

🔄 Processing 2/3: SCF  
✅ SCF verification completed

🔄 Processing 3/3: DVP
✅ DVP verification completed

📋 MULTI-PROCESS VERIFICATION SUMMARY
✅ Successful: 3/3
📊 Success Rate: 100%
🎉 ALL BUSINESS PROCESSES VERIFIED SUCCESSFULLY
```

This provides comprehensive business process integrity verification with permanent blockchain records and cryptographic proof of process compliance.