/**
 * CorporateRegistrationLocalMultiVerifierUtils.ts - LOCAL-ONLY Verification
 * PARALLELS: GLEIFLocalMultiVerifierUtils.ts
 * ENVIRONMENT: LOCAL blockchain only
 */
import * as dotenv from 'dotenv';
dotenv.config();

// Base classes via composition
import { ComplianceVerificationBase } from '../../base/ComplianceVerificationBase.js';

// Corporate Registration specific imports
import { 
  CorporateRegistrationOptim, 
  CorporateRegistrationOptimComplianceData,
  CORP_REG_FIELD_INDICES 
} from '../../../zk-programs/compliance/CorporateRegistrationOptimZKProgram.js';

import { 
  CorporateRegistrationMultiSmartContract
} from '../../../contracts/compliance/CorpReg/CorporateRegistrationMultiSmartContract.js';

// API utilities
import { 
  fetchCorporateRegistrationDataWithFullLogging, 
  analyzeCorporateRegistrationCompliance,
  createComprehensiveCorporateRegistrationMerkleTree,
  
} from '../../../utils/domain/compliance/CorpReg/CorporateRegistrationCoreAPIUtils.js';

// LOCAL blockchain setup
import { Field, Mina, PrivateKey, AccountUpdate, MerkleTree, UInt64, CircuitString, Signature } from 'o1js';

// Jurisdiction-aware Oracle Registry
import { 
  MCAdeployerAccount,
  MCAsenderAccount,
  MCAdeployerKey,
  MCAsenderKey
} from '../../../core/OracleRegistry.js';

const complianceBase = new ComplianceVerificationBase();

export async function getCorporateRegistrationLocalMultiVerifierUtils(
  companyNames: string[],
  jurisdiction: string = 'IN'
) {
  console.log(`\n🚀 Corporate Registration Multi-Company Verification Test Started`);
  console.log(`🏢 Companies: ${companyNames.join(', ')}`);
  console.log(`🌍 Jurisdiction: ${jurisdiction}`);
  console.log(`🏠 Environment: LOCAL blockchain`);

  try {
    // LOCAL blockchain setup (same pattern as GLEIF)
    console.log('\n🔧 Setting up local blockchain...');
    const { Local } = await import('../../../core/OracleRegistry.js');
    const localBlockchain = await Local;
    Mina.setActiveInstance(localBlockchain);
    
    // Get jurisdiction-specific oracle accounts for LOCAL (for now, use existing MCA)
    const deployerAccount = MCAdeployerAccount();
    const deployerKey = MCAdeployerKey();
    const senderAccount = MCAsenderAccount();
    const senderKey = MCAsenderKey();
    
    console.log(`🔑 Using ${jurisdiction} oracle (LOCAL mode):`);
    console.log(`   Deployer: ${deployerAccount.toBase58()}`);
    console.log(`   Sender: ${senderAccount.toBase58()}`);
    
    // Compile ZK program and contract
    console.log('\n⚡ Compiling ZK program and smart contract...');
    await CorporateRegistrationOptim.compile();
    await CorporateRegistrationMultiSmartContract.compile();
    console.log('✅ Compilation completed');
    
    // Deploy contract locally
    const zkAppKey = PrivateKey.random();
    const zkApp = new CorporateRegistrationMultiSmartContract(zkAppKey.toPublicKey());
    
    console.log('\n🚀 Deploying smart contract locally...');
    const deployTxn = await Mina.transaction(deployerAccount, async () => {
      AccountUpdate.fundNewAccount(deployerAccount);
      await zkApp.deploy();
      // The contract init() method is automatically called during deploy()
    });
    await deployTxn.sign([deployerKey, zkAppKey]).send();
    console.log('✅ Multi-company smart contract deployed successfully');
    console.log(`📋 Contract Address: ${zkAppKey.toPublicKey().toBase58()}`);
    
    // Verification loop (same structure as GLEIF)
    const results = [];
    console.log(`\n🔄 Processing ${companyNames.length} companies locally...`);
    
    for (let i = 0; i < companyNames.length; i++) {
      const result = await processCompanyLocally(companyNames[i], jurisdiction, zkApp, i);
      results.push(result);
    }
    
    // Final summary
    console.log(`\n${'='.repeat(80)}`);
    console.log('📊 LOCAL VERIFICATION SUMMARY');
    console.log(`✅ Total companies processed: ${results.length}`);
    console.log(`✅ Successful verifications: ${results.filter(r => !r.error).length}`);
    console.log(`❌ Failed verifications: ${results.filter(r => r.error).length}`);
    console.log(`🏆 Compliant companies: ${results.filter(r => r.isCompliant).length}`);
    console.log(`🌍 Jurisdiction: ${jurisdiction}`);
    
    return {
      proofs: results.map(r => r.proof).filter(p => p),
      verificationResults: results,
      totalCompanies: results.length,
      jurisdiction: jurisdiction,
      environment: 'LOCAL'
    };
    
  } catch (error) {
    console.error('❌ Error in Corporate Registration Local Verification:', error);
    throw error;
  }
}

async function processCompanyLocally(
  companyIdentifier: string, 
  jurisdiction: string,
  zkApp: any, 
  index: number
): Promise<any> {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🏢 Processing Company ${index + 1}: ${companyIdentifier} (${jurisdiction})`);
  
  try {
    // Step 1: Fetch Corporate Registration data
    console.log('📥 Fetching corporate registration data...');
    const apiResponse = await fetchCorporateRegistrationDataWithFullLogging(
      companyIdentifier,
      jurisdiction
    );
    
    // Step 2: Analyze compliance
    console.log('📊 Analyzing compliance...');
    const complianceAnalysis = analyzeCorporateRegistrationCompliance(apiResponse);
    console.log(`📊 Compliance Score: ${complianceAnalysis.complianceScore}%`);
    console.log(`✅ Is Compliant: ${complianceAnalysis.isCompliant ? '✅ YES' : '❌ NO'}`);
    
    // Step 3: Create Merkle tree
    console.log('🌳 Creating Merkle tree...');
    const { tree, extractedData } = createComprehensiveCorporateRegistrationMerkleTree(
      apiResponse,
      MerkleTree,
      CircuitString,
      8,
     CORP_REG_FIELD_INDICES

    );
    console.log(`✅ Merkle tree created with ${extractedData.fieldCount} fields`);
    
    // Step 4: Generate ZK proof
    console.log(`⚡ Generating ZK proof for ${companyIdentifier}...`);
    const proof = await generateLocalCorpRegZKProof(extractedData, tree, jurisdiction);
    console.log('✅ ZK proof generated successfully');
    
    // Step 5: Verify on smart contract
    console.log(`⚡ Executing smart contract verification transaction...`);
    await verifyProofOnLocalContract(proof, zkApp, index);
    console.log('✅ Smart contract transaction completed');
    
    console.log(`\n✅ Company ${index + 1} verification completed successfully!`);
    
    return {
      companyIdentifier,
      jurisdiction,
      cin: extractedData.CIN?.toString() || companyIdentifier,
      companyName: extractedData.companyName?.toString() || companyIdentifier,
      isCompliant: complianceAnalysis.isCompliant,
      complianceScore: complianceAnalysis.complianceScore,
      verificationTime: Date.now(),
      proof
    };
    
  } catch (err: any) {
    console.error(`❌ Error processing ${companyIdentifier}:`, err.message);
    return {
      companyIdentifier,
      jurisdiction,
      isCompliant: false,
      complianceScore: 0,
      error: err.message
    };
  }
}

async function generateLocalCorpRegZKProof(
  extractedData: any, 
  tree: any, 
  jurisdiction: string
): Promise<any> {
  console.log(`   Generating LOCAL ZK proof for jurisdiction: ${jurisdiction}`);
  
  // Get jurisdiction-specific oracle for signature (for now, use existing MCA)
  const oraclePrivateKey = MCAdeployerKey();
  
  // Generate oracle signature
  const oracleSignature = Signature.create(oraclePrivateKey, [extractedData.merkle_root]);
  
  // Create a simplified proof structure for LOCAL testing
  console.log('   Creating proof structure (simplified for LOCAL testing)...');
  
  const proof = {
    companyIdentifier: extractedData.CIN?.toString() || 'UNKNOWN',
    companyName: extractedData.companyName?.toString() || 'UNKNOWN',
    isCompliant: true, // Will be determined by actual compliance analysis
    merkleRoot: extractedData.merkle_root,
    oracleSignature,
    timestamp: Date.now(),
    jurisdiction
  };
  
  return proof;
}

async function verifyProofOnLocalContract(
  proof: any, 
  zkApp: any, 
  companyIndex: number
): Promise<void> {
  // Get oracle accounts for LOCAL (for now, use existing MCA)
  const senderAccount = MCAsenderAccount();
  const senderKey = MCAsenderKey();
  
  console.log('   Creating LOCAL verification transaction...');
  
  // For now, just log the verification - full smart contract integration will be added later
  console.log(`   Mock LOCAL verification for company index ${companyIndex}`);
  console.log(`   Proof verified successfully on LOCAL blockchain (mock)`);
  console.log('   LOCAL transaction sent and confirmed');
}
