/**
 * GLEIFNetworkHandler.ts - Consolidated Network Verification
 * 
 * CONSOLIDATED FROM:
 * - GLEIFEnhancedTestWrapper.ts (runGLEIFTestWithFundedAccounts method)
 * - GLEIFEnvironmentAwareUtils.ts (all network utilities - now via composition)
 * - GLEIFNetworkMultiVerifierUtils.ts (main verification logic + unique methods)
 * 
 * COMPOSITION PATTERN: Uses BaseVerificationCore and ComplianceVerificationBase
 * ZERO FUNCTIONAL CHANGES: All methods work exactly as before
 */

import * as dotenv from 'dotenv';
dotenv.config();

// === COMPOSITION: Use base classes instead of duplicating code ===
import { BaseVerificationCore } from '../../verification-base/BaseVerificationCore.js';
import { ComplianceVerificationBase } from '../../verification-base/ComplianceVerificationBase.js';

// === O1JS IMPORTS ===
import { 
  Field, 
  Mina, 
  PrivateKey, 
  PublicKey, 
  AccountUpdate, 
  CircuitString, 
  UInt64, 
  Bool, 
  fetchAccount,
  MerkleTree,
  MerkleMap,
  Signature,
  Poseidon
} from 'o1js';

// === ZK PROGRAMS AND CONTRACTS ===
import { 
  GLEIFOptim, 
  GLEIFOptimComplianceData, 
  MerkleWitness8, 
  MERKLE_TREE_HEIGHT 
} from '../../../zk-programs/compliance/GLEIFZKProgram.js';

import { 
  GLEIFOptimMultiCompanySmartContract,
  COMPANY_MERKLE_HEIGHT,
  RegistryInfo,
  GlobalComplianceStats,
  CompanyMerkleWitness,
  CompanyKey,
  GLEIFCompanyRecord
} from '../../../contracts/complaince/GLEIF/GLEIFMultiSmartContract.js';

// === INFRASTRUCTURE IMPORTS ===
import { 
  initializeOracleRegistry,
  getDeployerAccount,
  getDeployerKey,
  environmentManager,
  Environment,
  compilationManager,
  deploymentManager,
  getSenderAccount,
  getSenderKey
} from '../../../infrastructure/index.js';

// === API UTILITIES ===
import { 
  fetchGLEIFDataWithFullLogging, 
  GLEIFAPIResponse,
  analyzeGLEIFCompliance,
  CompanyRegistry,
  createComprehensiveGLEIFMerkleTree,
  createOptimizedGLEIFComplianceData,
  createCompanyRecord,
  GLEIF_FIELD_INDICES
} from '../../../utils/domain/compliance/GLEIF/GLEIFCoreAPIUtils.js';

// === ORACLE KEY MANAGEMENT ===
import { getGleifSignerKey } from '../../../core/OracleRegistry.js';

export class GLEIFNetworkHandler {
  // === COMPOSITION: Use utility classes instead of inheritance ===
  private baseCore: BaseVerificationCore;
  private complianceBase: ComplianceVerificationBase;

  constructor() {
    this.baseCore = new BaseVerificationCore();
    this.complianceBase = new ComplianceVerificationBase();
  }

  // === TRANSACTION FEES CONFIGURATION ===
  private static readonly TRANSACTION_FEES = {
    LOCAL: UInt64.from(1000000),
    TESTNET: UInt64.from(100000000),
    DEVNET: UInt64.from(100000000),
    MAINNET: UInt64.from(300000000),
  };

  private getTransactionFee(environment: string): UInt64 {
    switch (environment.toUpperCase()) {
      case 'LOCAL':
        return GLEIFNetworkHandler.TRANSACTION_FEES.LOCAL;
      case 'TESTNET':
      case 'DEVNET':
        return GLEIFNetworkHandler.TRANSACTION_FEES.TESTNET;
      case 'MAINNET':
        return GLEIFNetworkHandler.TRANSACTION_FEES.MAINNET;
      default:
        console.warn(`Unknown environment ${environment}, using TESTNET fee`);
        return GLEIFNetworkHandler.TRANSACTION_FEES.TESTNET;
    }
  }

  /**
   * MAIN ORCHESTRATION METHOD
   * MOVED FROM: GLEIFEnhancedTestWrapper.ts - runGLEIFTestWithFundedAccounts()
   */
  public async runGLEIFTestWithFundedAccounts(companyNames: string[]): Promise<any> {
    console.log('\n🔧 ENHANCED GLEIF TEST - ENSURING FUNDED ACCOUNT USAGE');
    console.log('='.repeat(70));
    
    try {
      // Step 1: Environment-aware Oracle Registry initialization
      console.log('\n📋 Step 1: Initializing Oracle Registry with environment-aware accounts...');
      
      await initializeOracleRegistry();
      
      const currentEnv = environmentManager.getCurrentEnvironment();
      const shouldConnectToDevnet = environmentManager.shouldConnectToDevnet();
      
      console.log(`🌐 Environment: ${currentEnv}`);
      console.log(`🔗 Connect to DEVNET: ${shouldConnectToDevnet}`);
      
      if (currentEnv === 'TESTNET' && shouldConnectToDevnet) {
        console.log('✅ CONFIRMED: Oracle Registry initialized for DEVNET with funded accounts');
        
        try {
          const gleifDeployer = getDeployerAccount('GLEIF');
          console.log(`🎯 GLEIF Deployer Account: ${gleifDeployer.toBase58()}`);
          console.log(`🌐 Network: ${this.baseCore.getEnvironmentDisplayName()}`);
          
          try {
            const deployerBalance = await fetchAccount({ publicKey: gleifDeployer });
            const actualBalance = Number(deployerBalance.account?.balance?.toString() || '0') / 1e9;
            console.log(`💰 Current Balance: ${actualBalance.toFixed(3)} MINA`);
          } catch (balanceError) {
            console.log(`💰 Balance: Unable to fetch (will be verified during deployment)`);
          }
          
          console.log('✅ DEVNET Oracle accounts accessible');
          
        } catch (accountError) {
          console.error('❌ Failed to access Oracle accounts:', accountError);
          throw new Error(`Oracle accounts not accessible: ${accountError}`);
        }
        
      } else if (currentEnv === 'LOCAL') {
        console.log('✅ LOCAL environment confirmed - will use local blockchain only');
      } else if (currentEnv === 'MAINNET') {
        console.log('✅ MAINNET environment confirmed - will use mainnet');
      } else {
        console.warn(`⚠️ Environment: ${currentEnv}, DEVNET: ${shouldConnectToDevnet} - using detected mode`);
      }
      
      // Step 2: Run the actual GLEIF test
      console.log('\n📋 Step 2: Running GLEIF verification...');
      const result = await this.getGLEIFNetworkMultiVerifierUtils(companyNames);
      
      console.log('\n✅ ENHANCED GLEIF TEST COMPLETED SUCCESSFULLY!');
      
      if (currentEnv === 'TESTNET' && shouldConnectToDevnet) {
        console.log('🔗 Check: https://minascan.io/devnet/');
      } else if (currentEnv === 'MAINNET') {
        console.log('🔗 Check: https://minascan.io/mainnet/');
      }
      
      return result;
      
    } catch (error) {
      console.error('\n❌ ENHANCED GLEIF TEST FAILED');
      if (error instanceof Error) {
        console.error('Error:', error.message);
      }
      throw error;
    }
  }

  /**
   * MAIN VERIFICATION METHOD
   * MOVED FROM: GLEIFNetworkMultiVerifierUtils.ts - getGLEIFNetworkMultiVerifierUtils()
   */
  public async getGLEIFNetworkMultiVerifierUtils(companyNames: string[]): Promise<any> {
    console.log(`\n🚀 GLEIF Multi-Company Verification Started`);
    console.log(`🏢 Companies: ${companyNames.join(', ')}`);
    console.log(`📊 Total Companies: ${companyNames.length}`);

    try {
      // === INFRASTRUCTURE INITIALIZATION ===
      console.log('\n🔧 Initializing infrastructure system...');
      
      const currentEnvironment = environmentManager.getCurrentEnvironment();
      console.log(`✅ Environment Manager: ${currentEnvironment}`);
      
      await compilationManager.initialize();
      console.log('✅ Compilation Manager initialized');

      // === BLOCKCHAIN ENVIRONMENT SETUP ===
      console.log('\n📋 Setting up blockchain environment...');
      
      const currentEnv = environmentManager.getCurrentEnvironment();
      const shouldConnectToDevnet = environmentManager.shouldConnectToDevnet();
      
      let deployerAccount: any;
      let deployerKey: any;
      let senderAccount: any;
      let senderKey: any;
      
      if (shouldConnectToDevnet) {
        console.log('🌐 DEVNET environment detected - using funded Oracle accounts');
        
        // ✅ COMPOSITION: Use baseCore for network setup
        const connected = this.baseCore.setupNetworkConnection();
        if (!connected) {
          throw new Error('Failed to establish DEVNET connection');
        }
        console.log('✅ Network connection established via BaseVerificationCore');
        
        try {
          deployerAccount = getDeployerAccount('GLEIF');
          deployerKey = getDeployerKey('GLEIF');
          senderAccount = getSenderAccount('GLEIF');
          senderKey = getSenderKey('GLEIF');
          
          console.log('✅ Blockchain environment initialized with DEVNET Oracle accounts');
          
        } catch (oracleError) {
          console.error('❌ Failed to get Oracle accounts:', oracleError);
          throw new Error(`Oracle Registry not properly initialized: ${oracleError}`);
        }
        
      } else {
        // LOCAL MODE setup
        console.log(`🔧 ${currentEnv} environment - creating LocalBlockchain`);
        
        const Local = await Mina.LocalBlockchain({ proofsEnabled: false });
        Mina.setActiveInstance(Local);

        deployerAccount = Local.testAccounts[0];
        deployerKey = Local.testAccounts[0].key;
        senderAccount = Local.testAccounts[1];
        senderKey = Local.testAccounts[1].key;
        
        console.log('✅ Local blockchain initialized');
      }

      // === ZK COMPILATION ===
      console.log('\n📝 Compiling ZK programs...');
      
      await GLEIFOptim.compile();
      console.log('✅ GLEIFOptim ZK program compiled');
      
      const { verificationKey } = await GLEIFOptimMultiCompanySmartContract.compile();
      console.log('✅ GLEIFOptimMultiCompanySmartContract compiled');
      
      // === SMART CONTRACT LOOKUP ===
      console.log('\n🚀 Looking up smart contract address...');
      
      // Load contract address from environment configuration
      const contractAddress = await environmentManager.getDeployedContractAddress('GLEIFOptimMultiCompanySmartContract');
      
      if (!contractAddress) {
        throw new Error(`GLEIFOptimMultiCompanySmartContract address not found in ${currentEnv.toLowerCase()}.json deployments.contracts section`);
      }
      
      // Validate the contract address format
      if (!environmentManager.validateContractAddress(contractAddress)) {
        throw new Error(`Invalid contract address format: ${contractAddress}`);
      }
      
      console.log(`✅ Contract address found: ${contractAddress}`);
      console.log(`📋 Source: config/environments/${currentEnv.toLowerCase()}.json`);
      
      const zkAppAddress = PublicKey.fromBase58(contractAddress);
      const zkApp = new GLEIFOptimMultiCompanySmartContract(zkAppAddress);
      
      // Set fee for transactions
      const fee = this.getTransactionFee(currentEnvironment);
      
      // === MAIN VERIFICATION LOOP ===
      const proofs = [];
      const verificationResults: any[] = [];
      const companyRegistry = new CompanyRegistry(COMPANY_MERKLE_HEIGHT);
      const companiesMap = new MerkleMap();

      // Process Each Company
      for (let i = 0; i < companyNames.length; i++) {
        const companyName = companyNames[i];
        console.log(`\n${'='.repeat(80)}`);
        console.log(`🏢 Processing Company ${i + 1}/${companyNames.length}: ${companyName}`);
        console.log(`${'='.repeat(80)}`);

        try {
          // === GLEIF API CALL ===
          console.log(`\n🔍 STAGE 1: Resolving company name to LEI...`);
          const apiResponse: GLEIFAPIResponse = await fetchGLEIFDataWithFullLogging(companyName);
          
          const companyLei = apiResponse.data[0].attributes.lei;
          if (!companyLei) {
            throw new Error(`No LEI found for company: "${companyName}"`);
          }
          
          console.log(`✅ STAGE 1 SUCCESS: "${companyName}" → LEI: ${companyLei}`);

          // ✅ COMPOSITION: Use complianceBase for analysis
          console.log(`\n🔍 Analyzing compliance for ${companyName}...`);
          const complianceAnalysis = analyzeGLEIFCompliance(apiResponse);
          console.log(`📊 Compliance Score: ${complianceAnalysis.complianceScore}%`);
          console.log(`✅ Is Compliant: ${complianceAnalysis.isCompliant}`);

          // === CREATE MERKLE TREE ===
          console.log(`\n🌳 Creating Merkle tree for ${companyName}...`);
          const { tree, extractedData } = createComprehensiveGLEIFMerkleTree(
            apiResponse,
            MerkleTree,
            CircuitString,
            8,  // Use height 8 to match MerkleWitness8
            GLEIF_FIELD_INDICES
          );
          console.log(`✅ Merkle tree created with ${Object.keys(extractedData).length} fields`);

          // === PREPARE ZK PROOF DATA ===
          console.log(`\n🔐 Preparing ZK proof data for ${companyName}...`);
          const merkleRoot = tree.getRoot();
          const currentTimestamp = UInt64.from(Date.now());
          
          const complianceData = createOptimizedGLEIFComplianceData(
            extractedData,
            merkleRoot,
            CircuitString,
            GLEIFOptimComplianceData
          );
          
          // Generate merkle witnesses
          const entityStatusWitness = new MerkleWitness8(tree.getWitness(BigInt(GLEIF_FIELD_INDICES.entity_status)));
          const registrationStatusWitness = new MerkleWitness8(tree.getWitness(BigInt(GLEIF_FIELD_INDICES.registration_status)));
          const conformityFlagWitness = new MerkleWitness8(tree.getWitness(BigInt(GLEIF_FIELD_INDICES.conformityFlag)));
          const lastUpdateWitness = new MerkleWitness8(tree.getWitness(BigInt(GLEIF_FIELD_INDICES.lastUpdateDate)));
          const nextRenewalWitness = new MerkleWitness8(tree.getWitness(BigInt(GLEIF_FIELD_INDICES.nextRenewalDate)));
          const leiWitness = new MerkleWitness8(tree.getWitness(BigInt(GLEIF_FIELD_INDICES.lei)));
          const bicWitness = new MerkleWitness8(tree.getWitness(BigInt(GLEIF_FIELD_INDICES.bic_codes)));
          const micWitness = new MerkleWitness8(tree.getWitness(BigInt(GLEIF_FIELD_INDICES.mic_codes)));
          
          console.log('✅ All MerkleWitness8 instances created');

          // === ORACLE SIGNATURE ===
          console.log(`\n🔏 Generating oracle signature...`);
          const gleifSignerPrivateKey = getGleifSignerKey();
          const oracleSignature = Signature.create(gleifSignerPrivateKey, [merkleRoot]);
          console.log('✅ Oracle signature generated');

          // ✅ COMPOSITION: Use complianceBase for logging WITH SAFE FETCHING
          const stateBefore = await this.complianceBase.logSmartContractState(zkApp, zkAppAddress, 'BEFORE');
          this.complianceBase.logComplianceFieldAnalysis(complianceData, Bool(complianceAnalysis.isCompliant), 'Pre-Verification');

          // === GENERATE ZK PROOF ===
          console.log(`\n⚡ Generating ZK proof for ${companyName}...`);

          const proof = await GLEIFOptim.proveOptimizedCompliance(
            currentTimestamp,
            complianceData,
            oracleSignature,
            entityStatusWitness,
            registrationStatusWitness,
            conformityFlagWitness,
            lastUpdateWitness,
            nextRenewalWitness,
            leiWitness,
            bicWitness,
            micWitness,
          );
          
          console.log('✅ ZK proof generated successfully');
          proofs.push(proof);

          // === SMART CONTRACT TRANSACTION ===
          console.log(`\n⚡ Executing smart contract verification transaction...`);
          
          const isCompliant = Bool(complianceAnalysis.isCompliant);
          const companyRecord = createCompanyRecord(
            complianceData,  // Pass complianceData instead of apiResponse
            Bool(complianceAnalysis.isCompliant),
            currentTimestamp,
            CircuitString,
            GLEIFCompanyRecord,
            Field
          );
          
          // Create company key for storage
          const companyKey = CompanyKey.create(
            complianceData.lei.hash(),
            complianceData.name.hash()
          );
          
          // FIXED: Create CompanyMerkleWitness using actual MerkleTree instead of manual construction
          // This ensures compatibility with O1JS MerkleWitness validation
          console.log('🔧 Creating MerkleMapWitness for company verification...');
          
          let companyWitness: any;
          try {
            // 🔧 PROPER SOLUTION: Create a real MerkleTree and use its witness
            console.log('🔧 Creating temporary MerkleTree for proper witness generation...');
            
            // Create a temporary tree with the exact same height as CompanyMerkleWitness expects
            const tempCompanyTree = new MerkleTree(COMPANY_MERKLE_HEIGHT);
            
            // Set the company record at index 0
            const companyHash = Poseidon.hash([
              companyRecord.leiHash,
              companyRecord.legalNameHash,
              companyRecord.jurisdictionHash,
              companyRecord.isCompliant.toField(),
              companyRecord.complianceScore,
              companyRecord.totalVerifications,
              companyRecord.passedVerifications,
              companyRecord.failedVerifications,
              companyRecord.consecutiveFailures,
              companyRecord.lastVerificationTime.value,
              companyRecord.firstVerificationTime.value,
              companyRecord.lastPassTime.value,
              companyRecord.lastFailTime.value
            ]);
            
            tempCompanyTree.setLeaf(BigInt(0), companyHash);
            
            // Generate the actual witness from the real tree
            const realWitness = tempCompanyTree.getWitness(BigInt(0)) as any;
            companyWitness = new CompanyMerkleWitness(realWitness);
            console.log('✅ CompanyMerkleWitness created successfully using real tree witness');
            
          } catch (witnessError: any) {
            console.error(`❌ Error creating CompanyMerkleWitness: ${witnessError.message}`);
            throw new Error(`Failed to create CompanyMerkleWitness: ${witnessError.message}`);
          }
          
          const verifyTxn = await Mina.transaction(
            { sender: senderAccount, fee },
            async () => {
              await zkApp.verifyOptimizedComplianceWithProof(
                proof,
                companyWitness,
                companyRecord,
                companiesMap.getWitness(companyKey.toField())
              );
            }
          );
          
          // ✅ FIXED: Generate proof for the transaction to match @method authorization requirement
          console.log('⚡ Generating transaction proof...');
          await verifyTxn.prove();
          console.log('✅ Transaction proof generated successfully');
          
          // Sign and send the transaction with proof authorization
          await verifyTxn.sign([senderKey]).send();
          console.log('✅ Smart contract transaction completed');

          // ✅ COMPOSITION: Use complianceBase for state changes WITH SAFE FETCHING
          const stateAfter = await this.complianceBase.logSmartContractState(zkApp, zkAppAddress, 'AFTER');
          this.complianceBase.logStateChanges(stateBefore, stateAfter);
          this.complianceBase.logComplianceFieldAnalysis(complianceData, isCompliant, 'Post-Verification');

          // === VERIFICATION RESULTS ===
          const analysis = this.complianceBase.analyzeComplianceFields(complianceData);
          verificationResults.push({
            companyName,
            lei: complianceData.lei.toString(),
            isCompliant: isCompliant.toJSON(),
            complianceScore: complianceAnalysis.complianceScore,
            verificationTime: currentTimestamp.toString(),
            businessRules: {
              entityActive: analysis.isEntityActive,
              registrationIssued: analysis.isRegistrationIssued,
              conformityOk: analysis.isConformityOk,
              validDates: analysis.hasValidDates,
              validLEI: analysis.hasValidLEI,
            }
          });
          
        } catch (err: any) {
          console.error(`❌ Error processing ${companyName}:`, err.message);
          verificationResults.push({
            companyName,
            lei: 'ERROR',
            isCompliant: false,
            complianceScore: 0,
            verificationTime: Date.now().toString(),
            error: err.message
          });
        }
      }

      // === FINAL RESULTS ===
      console.log(`\n${'='.repeat(80)}`);
      console.log(`🎉 GLEIF Multi-Company Verification Completed!`);
      console.log(`${'='.repeat(80)}`);



      return {
        proofs,
        totalCompanies: companyNames.length,
        verificationResults,
        infrastructureInfo: {
          environment: currentEnvironment,
          compilationCached: false,
          directOracleAccess: true
        }
      };

    } catch (error) {
      console.error('❌ Error in GLEIF Multi-Company Verification:', error);
      throw error;
    }
  }
}

// === EXPORT FUNCTIONS FOR BACKWARD COMPATIBILITY ===

/**
 * Backward compatibility function - maintains exact same interface
 */
export async function runGLEIFTestWithFundedAccounts(companyNames: string[]): Promise<any> {
  const handler = new GLEIFNetworkHandler();
  return await handler.runGLEIFTestWithFundedAccounts(companyNames);
}

/**
 * Backward compatibility function - maintains exact same interface
 */
export async function getGLEIFNetworkMultiVerifierUtils(companyNames: string[]): Promise<any> {
  const handler = new GLEIFNetworkHandler();
  return await handler.getGLEIFNetworkMultiVerifierUtils(companyNames);
}
