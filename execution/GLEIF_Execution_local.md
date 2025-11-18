# GLEIF Test Execution Path Analysis

## Command Executed
```bash
npm run test:local-complete-GLEIF "SREE PALANI ANDAVAR AGROS PRIVATE LIMITED"
```

## Execution Flow

### 1. NPM Script Resolution
**package.json** defines:
```json
"test:local-complete-GLEIF": "npm run build && node build/scripts/local/local-deploy-verify-GLEIF.js"
```

### 2. Build Process
- **Command**: `npm run build` → `npx tsc`
- **Config**: `tsconfig.json`
- **Action**: Compiles all TypeScript files from `src/` to `build/`

### 3. Main Entry Point
**File**: `build/scripts/local/local-deploy-verify-GLEIF.js` (compiled from `src/scripts/local/local-deploy-verify-GLEIF.ts`)

**Purpose**: 
- Sets `BUILD_ENV=LOCAL`
- Processes command line arguments (company name)
- Spawns the actual verifier process

**Spawned Process**:
```bash
node ./build/impl/local/verifier/GLEIFLocalMultiVerifier.js "SREE PALANI ANDAVAR AGROS PRIVATE LIMITED"
```

### 4. Verifier Entry Point
**File**: `build/impl/local/verifier/GLEIFLocalMultiVerifier.js` (compiled from `src/impl/local/verifier/GLEIFLocalMultiVerifier.ts`)

**Purpose**:
- Processes company name argument
- Calls main verification function
- Formats and displays results

**Key Function Call**:
```typescript
const result = await getGLEIFLocalMultiVerifierUtils([companyName]);
```

### 5. Core Handler
**File**: `build/impl/local/handler/GLEIFLocalHandler.js` (compiled from `src/impl/local/handler/GLEIFLocalHandler.ts`)

**Function**: `getGLEIFLocalMultiVerifierUtils()`

**Main Operations**:
1. Sets up local blockchain (Mina)
2. Compiles ZK programs
3. Deploys smart contract
4. Fetches GLEIF data via API
5. Creates Merkle tree
6. Generates ZK proof
7. Verifies compliance

## Key Dependencies and Files

### Configuration Files
- **`.env`** - Environment variables (API URLs, build environment)
- **`config.json`** - Network configuration
- **`package.json`** - Dependencies and scripts
- **`tsconfig.json`** - TypeScript compilation settings

### Core ZK Components
- **`src/zk-programs/compliance/GLEIFZKProgram.js`** - ZK circuit definitions
  - `GLEIFOptim` - Main ZK program
  - `GLEIFOptimComplianceData` - Data structure
  - `MerkleWitness8` - Merkle proof witness

### Smart Contracts
- **`src/contracts/complaince/GLEIF/GLEIFMultiSmartContract.js`** - Smart contract for GLEIF verification
  - `GLEIFOptimMultiCompanySmartContract` - Main contract class

### Core Infrastructure
- **`src/core/OracleRegistry.js`** - Blockchain setup and account management
  - Local blockchain setup
  - Deployer/sender accounts and keys
  - Signer key for oracle signatures

### API and Utilities
- **`src/utils/domain/compliance/GLEIF/GLEIFCoreAPIUtils.js`** - GLEIF API integration
  - `fetchGLEIFDataWithFullLogging()` - Fetches company data from GLEIF API
  - `analyzeGLEIFCompliance()` - Compliance analysis
  - `createComprehensiveGLEIFMerkleTree()` - Merkle tree creation
  - `GLEIF_FIELD_INDICES` - Field mapping constants

### External Dependencies
- **o1js** - Zero-knowledge proof library
- **dotenv** - Environment variable loading
- **Node.js built-ins** - child_process.spawn, etc.

## Data Flow

### Input Processing
1. Company name: `"SREE PALANI ANDAVAR AGROS PRIVATE LIMITED"`
2. Environment: `BUILD_ENV=LOCAL`

### API Integration
1. **GLEIF API Call**: Resolves company name to LEI (Legal Entity Identifier)
2. **Data Source**: `https://api.gleif.org/api/v1/lei-records` (from .env)
3. **Response Processing**: Extracts compliance-relevant fields

### ZK Proof Generation
1. **Merkle Tree Creation**: All GLEIF data fields hashed into tree structure
2. **Witness Generation**: Creates proofs for specific fields (entity status, LEI, etc.)
3. **Oracle Signature**: Signs merkle root with private key
4. **ZK Proof**: Proves compliance without revealing sensitive data

### Smart Contract Interaction
1. **Deployment**: Deploys fresh contract on local blockchain
2. **Verification**: Submits ZK proof for on-chain verification
3. **State Updates**: Records compliance status and statistics

## File System Structure (Relevant Paths)

```
C:\Users\MADHAN\WORK\CHAINAIM3003\clone-1\zk-pret-test-v3.7.0\
├── .env                                    # Environment configuration
├── config.json                            # Network configuration  
├── package.json                           # NPM scripts and dependencies
├── tsconfig.json                          # TypeScript configuration
├── src/
│   ├── scripts/local/
│   │   └── local-deploy-verify-GLEIF.ts   # Main entry script
│   ├── impl/local/
│   │   ├── verifier/
│   │   │   └── GLEIFLocalMultiVerifier.ts # Verifier entry point
│   │   └── handler/
│   │       └── GLEIFLocalHandler.ts       # Core verification logic
│   ├── zk-programs/compliance/
│   │   └── GLEIFZKProgram.js             # ZK circuit definitions
│   ├── contracts/complaince/GLEIF/
│   │   └── GLEIFMultiSmartContract.js    # Smart contract
│   ├── core/
│   │   └── OracleRegistry.js             # Blockchain infrastructure
│   └── utils/domain/compliance/GLEIF/
│       └── GLEIFCoreAPIUtils.js          # API utilities
└── build/                                 # Compiled JavaScript output
    └── [mirrors src/ structure]
```

## Runtime Behavior

### Phase 1: Initialization
- Environment setup and validation
- Local blockchain initialization
- ZK program compilation (~30-60 seconds)
- Smart contract deployment

### Phase 2: Data Fetching
- GLEIF API call to resolve company name
- Data extraction and validation
- Compliance analysis

### Phase 3: Cryptographic Operations
- Merkle tree construction from GLEIF data
- ZK proof generation (compute-intensive)
- Oracle signature creation

### Phase 4: Verification
- Smart contract interaction
- On-chain proof verification
- Results compilation and display

## Key Environment Variables Used

From **`.env`**:
- `GLEIF_URL_PROD` - GLEIF API endpoint
- `BUILD_ENV` - Execution environment (LOCAL/TESTNET/MAINNET)

## Output and Results

The execution produces:
1. **Console Logs**: Detailed progress and debugging information
2. **Verification Results**: Company compliance status, LEI, scores
3. **ZK Proofs**: Cryptographic proofs of compliance
4. **Smart Contract State**: Updated registry with verification data