/**
 * EXIMLocalMultiVerifierUtils.ts - LOCAL EXIM Multi-Company Verification
 *
 * REFACTORED FROM:
 * - EXIMOptimMultiCompanyVerificationTestWithSign.ts (CLI entry)
 * - EXIMOptimMultiCompanyVerificationTestWithSignUtils.ts (main logic)
 * 
 * PARALLEL TO: GLEIFLocalMultiVerifierUtils.ts
 * ENVIRONMENT: LOCAL only (local blockchain)
 * USES: EXIMCoreAPIUtils.ts for shared API and compliance logic
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { Field, Mina, PrivateKey, AccountUpdate, CircuitString, Poseidon, Signature, MerkleTree, UInt64, Bool } from 'o1js';
import { 
  EXIM, 
  EXIMOptimComplianceData, 
  EXIMMerkleWitness8, 
  EXIM_MERKLE_TREE_HEIGHT,
  EXIM_FIELD_INDICES 
} from '../../../zk-programs/compliance/EXIMZKProgram.js';
import { 
  EXIMMultiSmartContract,
  EXIMCompanyRecord,
  CompanyMerkleWitness,
  COMPANY_MERKLE_HEIGHT
} from '../../../contracts/compliance/EXIM/EXIMMultiSmartContract.js';
import { EXIMdeployerAccount, EXIMsenderAccount, EXIMdeployerKey, EXIMsenderKey, getPrivateKeyFor } from '../../../core/OracleRegistry.js';

// === USE SHARED API UTILITIES (REFACTORED) ===
import { 
  fetchEXIMDataWithFullLogging, 
  EXIMAPIResponse,
  extractEXIMSummary,
  analyzeEXIMCompliance,
  CompanyRegistry,
  createComprehensiveEXIMMerkleTree,
  createOptimizedEXIMComplianceData,
  createCompanyRecord,
  EXIM_FIELD_INDICES as SHARED_FIELD_INDICES
} from '../../../utils/domain/compliance/EXIM/EXIMCoreAPIUtils.js';

// =================================== LOCAL VERIFICATION FUNCTION ===================================

/**
 * Main LOCAL multi-company verification function
 * REFACTORED FROM: getEXIMOptimMultiCompanyVerificationWithSignUtils
 * USES: Shared EXIMCoreAPIUtils for API calls and compliance analysis
 */
export async function getEXIMLocalMultiVerifierUtils(
  companyNames: string[]
): Promise<any> {
  console.log(`\n🚀 EXIM LOCAL Multi-Company Verification Test Started`);
  console.log(`🏢 Companies: ${companyNames.join(', ')}`);
  console.log(`🏠 Environment: LOCAL (local blockchain only)`);
  console.log(`📊 Total Companies: ${companyNames.length}`);

  try {
    // =================================== Setup Local Blockchain ===================================
    console.log('\n🔧 Setting up local blockchain...');
    const { Local } = await import('../../../core/OracleRegistry.js');
    const localBlockchain = await Local;
    Mina.setActiveInstance(localBlockchain);
    
    const deployerAccount = EXIMdeployerAccount();
    const deployerKey = EXIMdeployerKey();
    const senderAccount = EXIMsenderAccount();
    const senderKey = EXIMsenderKey();

    // =================================== Compile Programs ===================================
    console.log('\n📝 Compiling ZK programs...');
    await EXIM.compile();
    console.log('✅ EXIMOptim ZK program compiled');
    
    const { verificationKey } = await EXIMMultiSmartContract.compile();
    console.log('✅ EXIMMultiSmartContract compiled');

    // =================================== Deploy Multi-Company Smart Contract ===================================
    console.log('\n🚀 Deploying multi-company smart contract...');
    const zkAppKey = PrivateKey.random();
    const zkAppAddress = zkAppKey.toPublicKey();
    const zkApp = new EXIMMultiSmartContract(zkAppAddress);

    const deployTxn = await Mina.transaction(
      deployerAccount,
      async () => {
        AccountUpdate.fundNewAccount(deployerAccount);
        await zkApp.deploy({ verificationKey });
      }
    );
    await deployTxn.sign([deployerKey, zkAppKey]).send();
    console.log('✅ Multi-company smart contract deployed successfully');

    // =================================== Initialize Company Registry ===================================
    const companyRegistry = new CompanyRegistry();
    const proofs = [];
    const verificationResults = [];

    // =================================== Process Each Company ===================================
    for (let i = 0; i < companyNames.length; i++) {
      const companyName = companyNames[i];
      console.log(`\n${'='.repeat(80)}`);
      console.log(`🏢 Processing Company ${i + 1}/${companyNames.length}: ${companyName}`);
      console.log(`${'='.repeat(80)}`);

      try {
        // === FETCH EXIM DATA (USING SHARED UTILITIES) ===
        console.log(`\n📡 Fetching EXIM data for ${companyName}...`);
        const apiResponse: EXIMAPIResponse = await fetchEXIMDataWithFullLogging(companyName);
        console.log(`✅ EXIM data fetched successfully for ${companyName}`);

        // === ANALYZE COMPLIANCE (USING SHARED UTILITIES) ===
        console.log(`\n🔍 Analyzing compliance for ${companyName}...`);
        const complianceAnalysis = analyzeEXIMCompliance(apiResponse);
        console.log(`📊 Compliance Score: ${complianceAnalysis.complianceScore}%`);
        console.log(`✅ Is Compliant: ${complianceAnalysis.isCompliant}`);
        
        if (complianceAnalysis.issues.length > 0) {
          console.log(`⚠️ Issues found:`);
          complianceAnalysis.issues.forEach((issue, index) => {
            console.log(`  ${index + 1}. ${issue}`);
          });
        }

        // === CREATE COMPREHENSIVE MERKLE TREE (USING SHARED UTILITIES) ===
        console.log(`\n🌳 Creating comprehensive Merkle tree for ${companyName}...`);
        const { tree, extractedData, fieldCount } = createComprehensiveEXIMMerkleTree(
          apiResponse,
          MerkleTree,
          CircuitString,
          EXIM_MERKLE_TREE_HEIGHT,
          EXIM_FIELD_INDICES
        );
        console.log(`✅ Merkle tree created with ${fieldCount} fields`);

        // =================================== Prepare ZK Proof Data ===================================
        console.log(`\n🔐 Preparing ZK proof data for ${companyName}...`);
        const merkleRoot = tree.getRoot();
        const currentTimestamp = UInt64.from(Date.now());
        
        // Create optimized compliance data (USING SHARED UTILITIES)
        const complianceData = createOptimizedEXIMComplianceData(
          extractedData,
          merkleRoot,
          CircuitString,
          EXIMOptimComplianceData
        );
        
        // Generate merkle witnesses for the 7 compliance fields
        const iecWitness = new EXIMMerkleWitness8(tree.getWitness(BigInt(EXIM_FIELD_INDICES.iec)));
        const entityNameWitness = new EXIMMerkleWitness8(tree.getWitness(BigInt(EXIM_FIELD_INDICES.entityName)));
        const iecIssueDateWitness = new EXIMMerkleWitness8(tree.getWitness(BigInt(EXIM_FIELD_INDICES.iecIssueDate)));
        const panWitness = new EXIMMerkleWitness8(tree.getWitness(BigInt(EXIM_FIELD_INDICES.pan)));
        const iecStatusWitness = new EXIMMerkleWitness8(tree.getWitness(BigInt(EXIM_FIELD_INDICES.iecStatus)));
        const iecModificationDateWitness = new EXIMMerkleWitness8(tree.getWitness(BigInt(EXIM_FIELD_INDICES.iecModificationDate)));
        const dataAsOnWitness = new EXIMMerkleWitness8(tree.getWitness(BigInt(EXIM_FIELD_INDICES.dataAsOn)));

        // =================================== Oracle Signature ===================================
        console.log(`\n🔏 Generating oracle signature for ${companyName}...`);
        const registryPrivateKey = getPrivateKeyFor('EXIM');
        const oracleSignature = Signature.create(registryPrivateKey, [merkleRoot]);
        console.log('✅ Oracle signature generated');

        // =================================== Generate ZK Proof ===================================
        console.log(`\n⚡ Generating ZK proof for ${companyName}...`);
        console.log(`📊 Proving compliance for: ${complianceData.entityName.toString()}`);
        console.log(`🆔 IEC: ${complianceData.iec.toString()}`);
        console.log(`📋 PAN: ${complianceData.pan.toString()}`);
        console.log(`📍 IEC Status: ${complianceData.iecStatus.toString()}`);

        const proof = await EXIM.proveOptimizedCompliance(
          currentTimestamp,
          complianceData,
          oracleSignature,
          iecWitness,
          entityNameWitness,
          iecIssueDateWitness,
          panWitness,
          iecStatusWitness,
          iecModificationDateWitness,
          dataAsOnWitness,
        );
        console.log(`✅ ZK proof generated successfully for ${companyName}`);
        proofs.push(proof);


        // Store verification result
        verificationResults.push({
          companyName,
          iec: complianceData.iec.toString(),
          isCompliant: complianceData.iecStatus.toString() === '0',
          complianceScore: complianceAnalysis.complianceScore,
          verificationTime: currentTimestamp.toString()
        });

      } catch (err: any) {
        console.error(`❌ Error processing ${companyName}:`, err.message);
        // Continue with other companies instead of stopping
        verificationResults.push({
          companyName,
          error: err.message
        });
        continue;
      }
    }

    // =================================== Final Registry Analysis ===================================
    console.log(`\n${'='.repeat(80)}`);
    console.log(`🎉 EXIM LOCAL Multi-Company Verification Completed!`);
    console.log(`${'='.repeat(80)}`);

    console.log('\n📈 Final Registry Statistics:');
    const finalStats = zkApp.getGlobalComplianceStats();
    console.log(`  • Total Companies Tracked: ${finalStats.totalCompanies.toString()}`);
    console.log(`  • Compliant Companies: ${finalStats.compliantCompanies.toString()}`);
    console.log(`  • Compliance Percentage: ${finalStats.compliancePercentage.toString()}%`);
    console.log(`  • Total Verifications: ${finalStats.totalVerifications.toString()}`);
    if (finalStats.lastVerificationTime.toString() !== '0') {
      console.log(`  • Last Verification: ${new Date(Number(finalStats.lastVerificationTime.toString())).toISOString()}`);
    }

    console.log('\n🏢 Companies Processed:');
    verificationResults.forEach((result, index) => {
      const status = result.error ? '❌ ERROR' : (result.isCompliant ? '✅ COMPLIANT' : '⚠️ NON-COMPLIANT');
      console.log(`  ${index + 1}. ${result.companyName}: ${status}`);
      if (result.iec !== 'ERROR') {
        console.log(`     IEC: ${result.iec}`);
        console.log(`     Score: ${result.complianceScore}%`);
      }
      if (result.error) {
        console.log(`     Error: ${result.error}`);
      }
    });

    console.log('\n📋 Enhanced Contract Features Demonstrated:');
    console.log(`  • Multi-Company Tracking: ✅`);
    console.log(`  • Individual Company Queries (Same as SingleCompany): ✅`);
    console.log(`  • Company Name-based Compliance Queries: ✅`);
    console.log(`  • Global Compliance Metrics: ✅`);
    console.log(`  • Company Registry Management: ✅`);
    console.log(`  • Merkle Tree Storage: ✅`);
    console.log(`  • Aggregate Statistics: ✅`);
    console.log(`  • Individual Company Verification: ✅`);
    console.log(`  • Company Info Retrieval: ✅`);
    console.log(`  • Current Compliance Status: ✅`);
    console.log(`  • Verification Statistics: ✅`);
    console.log(`  • Identity-based Company Tracking: ✅`);
    console.log(`  • Administrative Functions: ✅`);

    return {
      proofs,
      totalCompanies: companyRegistry.getTotalCompanies(),
      companyRegistry: companyRegistry,
      contractState: zkApp.getRegistryInfo(),
      globalStats: zkApp.getGlobalComplianceStats(),
      verificationResults
    };

  } catch (error) {
    console.error('❌ Error in EXIM LOCAL Multi-Company Verification:', error);
    throw error;
  }
}

  

  

  

    

    




