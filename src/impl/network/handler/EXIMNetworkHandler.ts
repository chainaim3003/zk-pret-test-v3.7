/**
 * EXIMNetworkHandler.ts - Consolidated Network Verification
 *
 * PARALLEL TO: GLEIFNetworkHandler.ts
 * CONSOLIDATED FROM:
 * - EXIMEnhancedTestWrapper.ts (network orchestration) - Not yet created, following GLEIF pattern
 * - EXIMEnvironmentAwareUtils.ts (network utilities) - Not needed, using base classes
 * - EXIMNetworkMultiVerifierUtils.ts (main verification logic) - Creating new following GLEIF pattern
 *
 * COMPOSITION PATTERN: Uses BaseVerificationCore and ComplianceVerificationBase
 * ZERO FUNCTIONAL CHANGES: All methods work exactly as before
 */

import * as dotenv from 'dotenv';
dotenv.config();

// === COMPOSITION: Use base classes instead of duplicating code ===
import { BaseVerificationCore } from '../../verification-base/BaseVerificationCore.js';
import { ComplianceVerificationBase } from '../../verification-base/EXIMComplianceVerificationBase.js';

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
  EXIMOptim, 
  EXIMOptimComplianceData, 
  EXIMMerkleWitness8 
} from '../../../zk-programs/compliance/EXIMZKProgram.js';
import { 
  EXIMOptimMultiCompanySmartContract, 
  COMPANY_MERKLE_HEIGHT, 
  CompanyMerkleWitness, 
  EXIMCompanyRecord ,
  CompanyKey
} from '../../../contracts/complaince/EXIM/EXIMMultiSmartContract.js';

// === INFRASTRUCTURE IMPORTS ===
import { 
  initializeOracleRegistry, 
  getDeployerAccount, 
  getDeployerKey, 
  environmentManager, 
  compilationManager, 
  getSenderAccount, 
  getSenderKey 
} from '../../../infrastructure/index.js';

// === API UTILITIES ===
import { 
  fetchEXIMDataWithFullLogging, 
  analyzeEXIMCompliance, 
  CompanyRegistry, 
  createComprehensiveEXIMMerkleTree, 
  createOptimizedEXIMComplianceData, 
  createCompanyRecord, 
  EXIM_FIELD_INDICES 
} from '../../../utils/domain/compliance/EXIM/EXIMCoreAPIUtils.js';

// === ORACLE KEY MANAGEMENT ===
import { getPrivateKeyFor } from '../../../core/OracleRegistry.js';

export class EXIMNetworkHandler {
  private baseCore: BaseVerificationCore;
  private complianceBase: ComplianceVerificationBase;

  constructor() {
    this.baseCore = new BaseVerificationCore();
    this.complianceBase = new ComplianceVerificationBase();
  }

  static readonly TRANSACTION_FEES = {
    LOCAL: UInt64.from(1000000),
    TESTNET: UInt64.from(100000000),
    DEVNET: UInt64.from(100000000),
    MAINNET: UInt64.from(300000000),
  };

  getTransactionFee(environment: string): UInt64 {
    switch (environment.toUpperCase()) {
      case 'LOCAL':
        return EXIMNetworkHandler.TRANSACTION_FEES.LOCAL;
      case 'TESTNET':
      case 'DEVNET':
        return EXIMNetworkHandler.TRANSACTION_FEES.TESTNET;
      case 'MAINNET':
        return EXIMNetworkHandler.TRANSACTION_FEES.MAINNET;
      default:
        console.warn(`Unknown environment ${environment}, using TESTNET fee`);
        return EXIMNetworkHandler.TRANSACTION_FEES.TESTNET;
    }
  }

  /**
   * MAIN ORCHESTRATION METHOD
   * PARALLEL TO: GLEIFNetworkHandler.runGLEIFTestWithFundedAccounts()
   */
  async runEXIMTestWithFundedAccounts(companyNames: string[]): Promise<any> {
    console.log('\n🔧 ENHANCED EXIM TEST - ENSURING FUNDED ACCOUNT USAGE');
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
          const eximDeployer = getDeployerAccount('EXIM');
          console.log(`🎯 EXIM Deployer Account: ${eximDeployer.toBase58()}`);
          console.log(`🌐 Network: ${this.baseCore.getEnvironmentDisplayName()}`);
          try {
            const deployerBalance = await fetchAccount({ publicKey: eximDeployer });
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

      // Step 2: Run the actual EXIM test
      console.log('\n📋 Step 2: Running EXIM verification...');
      const result = await this.getEXIMNetworkMultiVerifierUtils(companyNames);

      console.log('\n✅ ENHANCED EXIM TEST COMPLETED SUCCESSFULLY!');
      if (currentEnv === 'TESTNET' && shouldConnectToDevnet) {
        console.log('🔗 Check: https://minascan.io/devnet/');
      } else if (currentEnv === 'MAINNET') {
        console.log('🔗 Check: https://minascan.io/mainnet/');
      }

      return result;

    } catch (error) {
      console.error('\n❌ ENHANCED EXIM TEST FAILED');
      if (error instanceof Error) {
        console.error('Error:', error.message);
      }
      throw error;
    }
  }

  /**
   * MAIN VERIFICATION METHOD
   * PARALLEL TO: GLEIFNetworkHandler.getGLEIFNetworkMultiVerifierUtils()
   */
  async getEXIMNetworkMultiVerifierUtils(companyNames: string[]): Promise<any> {
    console.log(`\n🚀 EXIM Multi-Company Verification Started`);
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
      let deployerAccount: PublicKey;
      let deployerKey: PrivateKey;
      let senderAccount: PublicKey;
      let senderKey: PrivateKey;

      if (shouldConnectToDevnet) {
        console.log('🌐 DEVNET environment detected - using funded Oracle accounts');
        // ✅ COMPOSITION: Use baseCore for network setup
        const connected = this.baseCore.setupNetworkConnection();
        if (!connected) {
          throw new Error('Failed to establish DEVNET connection');
        }
        console.log('✅ Network connection established via BaseVerificationCore');

        try {
          deployerAccount = getDeployerAccount('EXIM');
          deployerKey = getDeployerKey('EXIM');
          senderAccount = getSenderAccount('EXIM');
          senderKey = getSenderKey('EXIM');
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
      await EXIMOptim.compile();
      console.log('✅ EXIMOptim ZK program compiled');

      const { verificationKey } = await EXIMOptimMultiCompanySmartContract.compile();
      console.log('✅ EXIMOptimMultiCompanySmartContract compiled');

      // === SMART CONTRACT LOOKUP ===
      console.log('\n🚀 Looking up smart contract address...');
      
      // Load contract address from environment configuration
      const contractAddress = await environmentManager.getDeployedContractAddress('EXIMOptimMultiCompanySmartContract');
      
      if (!contractAddress) {
        throw new Error(`EXIMOptimMultiCompanySmartContract address not found in ${currentEnv.toLowerCase()}.json deployments.contracts section`);
      }
      
      // Validate the contract address format
      if (!environmentManager.validateContractAddress(contractAddress)) {
        throw new Error(`Invalid contract address format: ${contractAddress}`);
      }
      
      console.log(`✅ Contract address found: ${contractAddress}`);
      console.log(`📋 Source: config/environments/${currentEnv.toLowerCase()}.json`);
      
      const zkAppAddress = PublicKey.fromBase58(contractAddress);
      const zkApp = new EXIMOptimMultiCompanySmartContract(zkAppAddress);
      
      // Set fee for transactions
      const fee = this.getTransactionFee(currentEnvironment);

      // === MAIN VERIFICATION LOOP ===
      const proofs = [];
      const verificationResults = [];
      const companyRegistry = new CompanyRegistry(COMPANY_MERKLE_HEIGHT);
      const companiesMap = new MerkleMap();

      // Process Each Company
      for (let i = 0; i < companyNames.length; i++) {
        const companyName = companyNames[i];
        console.log(`\n${'='.repeat(80)}`);
        console.log(`🏢 Processing Company ${i + 1}/${companyNames.length}: ${companyName}`);
        console.log(`${'='.repeat(80)}`);

        try {
          // === EXIM API CALL ===
          console.log(`\n🔍 STAGE 1: Resolving company name to IEC...`);
          const apiResponse = await fetchEXIMDataWithFullLogging(companyName);
          const companyIec = apiResponse.iec;
          if (!companyIec) {
            throw new Error(`No IEC found for company: "${companyName}"`);
          }
          console.log(`✅ STAGE 1 SUCCESS: "${companyName}" → IEC: ${companyIec}`);

          // ✅ COMPOSITION: Use complianceBase for analysis
          console.log(`\n🔍 Analyzing compliance for ${companyName}...`);
          const complianceAnalysis = analyzeEXIMCompliance(apiResponse);
          console.log(`📊 Compliance Score: ${complianceAnalysis.complianceScore}%`);
          console.log(`✅ Is Compliant: ${complianceAnalysis.isCompliant}`);

          // === CREATE MERKLE TREE ===
          console.log(`\n🌳 Creating Merkle tree for ${companyName}...`);
          const { tree, extractedData, fieldCount } = createComprehensiveEXIMMerkleTree(
            apiResponse,
            MerkleTree,
            CircuitString,
            8, // Use height 8 to match EXIMMerkleWitness8
            EXIM_FIELD_INDICES
          );
          console.log(`✅ Merkle tree created with ${fieldCount} fields`);

          // === PREPARE ZK PROOF DATA ===
          console.log(`\n🔐 Preparing ZK proof data for ${companyName}...`);
          const merkleRoot = tree.getRoot();
          const currentTimestamp = UInt64.from(Date.now());

          const complianceData = createOptimizedEXIMComplianceData(
            extractedData,
            merkleRoot,
            CircuitString,
            EXIMOptimComplianceData
          );

          // Generate merkle witnesses
          const iecWitness = new EXIMMerkleWitness8(tree.getWitness(BigInt(EXIM_FIELD_INDICES.iec)));
          const entityNameWitness = new EXIMMerkleWitness8(tree.getWitness(BigInt(EXIM_FIELD_INDICES.entityName)));
          const iecIssueDateWitness = new EXIMMerkleWitness8(tree.getWitness(BigInt(EXIM_FIELD_INDICES.iecIssueDate)));
          const panWitness = new EXIMMerkleWitness8(tree.getWitness(BigInt(EXIM_FIELD_INDICES.pan)));
          const iecStatusWitness = new EXIMMerkleWitness8(tree.getWitness(BigInt(EXIM_FIELD_INDICES.iecStatus)));
          const iecModificationDateWitness = new EXIMMerkleWitness8(tree.getWitness(BigInt(EXIM_FIELD_INDICES.iecModificationDate)));
          const dataAsOnWitness = new EXIMMerkleWitness8(tree.getWitness(BigInt(EXIM_FIELD_INDICES.dataAsOn)));

          console.log('✅ All EXIMMerkleWitness8 instances created');

          // === ORACLE SIGNATURE ===
          console.log(`\n🔏 Generating oracle signature...`);
          const eximSignerPrivateKey = getPrivateKeyFor('EXIM');
          const oracleSignature = Signature.create(eximSignerPrivateKey, [merkleRoot]);
          console.log('✅ Oracle signature generated');


          const stateBefore = await this.complianceBase.logSmartContractState(zkApp, zkAppAddress, 'BEFORE');
          this.complianceBase.logComplianceFieldAnalysis(complianceData, Bool(complianceAnalysis.isCompliant), 'Pre-Verification');


          // Log contract state before verification
          console.log(`\n📊 Contract state before verification...`);
          try {
            const stateBefore = await this.baseCore.fetchDeployedZkAppAccount(zkAppAddress);
            console.log(`✅ Contract accessible: ${stateBefore}`);
          } catch (error) {
            console.log(`⚠️ Could not fetch contract state: will proceed with verification`);
          }

          // === GENERATE ZK PROOF ===
          console.log(`\n⚡ Generating ZK proof for ${companyName}...`);
          const proof = await EXIMOptim.proveOptimizedCompliance(
            currentTimestamp,
            complianceData,
            oracleSignature,
            iecWitness,
            entityNameWitness,
            iecIssueDateWitness,
            panWitness,
            iecStatusWitness,
            iecModificationDateWitness,
            dataAsOnWitness
          );
          console.log('✅ ZK proof generated successfully');
          proofs.push(proof);

          // === SMART CONTRACT TRANSACTION ===
          console.log(`\n⚡ Executing smart contract verification transaction...`);
          const isCompliant = Bool(complianceAnalysis.isCompliant);
          const companyRecord = createCompanyRecord(
            complianceData,
            Bool(complianceAnalysis.isCompliant),
            currentTimestamp,
            CircuitString,
            EXIMCompanyRecord,
            Field
          );

          const companyKey = CompanyKey.create(
            complianceData.iec.hash(),
            complianceData.entityName.hash()
          );

          // Create CompanyMerkleWitness using actual MerkleTree
          console.log('🔧 Creating MerkleWitness for company verification...');
          let companyWitness: any;
          try {
            console.log('🔧 Creating temporary MerkleTree for proper witness generation...');
            const tempCompanyTree = new MerkleTree(COMPANY_MERKLE_HEIGHT);
            const companyHash = Poseidon.hash([
              companyRecord.iecHash,
              companyRecord.entityNameHash,
              companyRecord.jurisdictionHash,
              companyRecord.isCompliant.toField(),
              companyRecord.complianceScore,
              companyRecord.totalVerifications,
              companyRecord.lastVerificationTime.value,
              companyRecord.firstVerificationTime.value
            ]);
            tempCompanyTree.setLeaf(BigInt(0), companyHash);
            const realWitness = tempCompanyTree.getWitness(BigInt(0));
            companyWitness = new CompanyMerkleWitness(realWitness);
            console.log('✅ CompanyMerkleWitness created successfully using real tree witness');
          } catch (witnessError) {
            console.error(`❌ Error creating CompanyMerkleWitness: ${(witnessError as Error).message}`);
            throw new Error(`Failed to create CompanyMerkleWitness: ${(witnessError as Error).message}`);
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

          // Generate proof for the transaction
          console.log('⚡ Generating transaction proof...');
          await verifyTxn.prove();
          console.log('✅ Transaction proof generated successfully');

          // Sign and send the transaction with proof authorization
          await verifyTxn.sign([senderKey]).send();
          console.log('✅ Smart contract transaction completed');

          const stateAfter = await this.complianceBase.logSmartContractState(zkApp, zkAppAddress, 'AFTER');
          this.complianceBase.logStateChanges(stateBefore, stateAfter);
          this.complianceBase.logComplianceFieldAnalysis(complianceData, isCompliant, 'Post-Verification');

          // Log contract state after verification
          console.log(`\n📊 Contract state after verification...`);
          try {
            const stateAfter = await this.baseCore.fetchDeployedZkAppAccount(zkAppAddress);
            console.log(`✅ Contract state updated: ${stateAfter}`);
          } catch (error) {
            console.log(`⚠️ Could not fetch updated contract state`);
          }

          // === VERIFICATION RESULTS ===
          // Create simple analysis for EXIM (parallel to GLEIF analysis)
          const analysis = {
            isEntityActive: complianceAnalysis.businessRuleResults.entityNameNotEmpty,
            isRegistrationIssued: complianceAnalysis.businessRuleResults.iecNotEmpty,
            isConformityOk: complianceAnalysis.businessRuleResults.panNotEmpty,
            hasValidDates: complianceAnalysis.businessRuleResults.dataAsOnValid,
            hasValidLEI: complianceAnalysis.businessRuleResults.iecStatusCompliant,
          };
          
          verificationResults.push({
            companyName,
            iec: complianceData.iec.toString(),
            isCompliant: isCompliant.toJSON(),
            complianceScore: complianceAnalysis.complianceScore,
            verificationTime: currentTimestamp.toString(),
            businessRules: {
              entityActive: analysis.isEntityActive,
              iecCompliant: analysis.isRegistrationIssued,
              panValid: analysis.isConformityOk,
              validDates: analysis.hasValidDates,
              validIEC: analysis.hasValidLEI,
            }
          });

        } catch (err) {
          console.error(`❌ Error processing ${companyName}:`, (err as Error).message);
          verificationResults.push({
            companyName,
            iec: 'ERROR',
            isCompliant: false,
            complianceScore: 0,
            verificationTime: Date.now().toString(),
            error: (err as Error).message
          });
        }
      }

      // === FINAL RESULTS ===
      console.log(`\n${'='.repeat(80)}`);
      console.log(`🎉 EXIM Multi-Company Verification Completed!`);
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
      console.error('❌ Error in EXIM Multi-Company Verification:', error);
      throw error;
    }
  }
}

// === EXPORT FUNCTIONS FOR BACKWARD COMPATIBILITY ===

/**
 * Backward compatibility function - maintains exact same interface
 */
export async function runEXIMTestWithFundedAccounts(companyNames: string[]): Promise<any> {
  const handler = new EXIMNetworkHandler();
  return await handler.runEXIMTestWithFundedAccounts(companyNames);
}

/**
 * Backward compatibility function - maintains exact same interface
 */
export async function getEXIMNetworkMultiVerifierUtils(companyNames: string[]): Promise<any> {
  const handler = new EXIMNetworkHandler();
  return await handler.getEXIMNetworkMultiVerifierUtils(companyNames);
}
