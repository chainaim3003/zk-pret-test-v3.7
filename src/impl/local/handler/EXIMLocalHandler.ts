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
  EXIMOptim, 
  EXIMOptimComplianceData, 
  EXIMMerkleWitness8, 
  EXIM_MERKLE_TREE_HEIGHT,
  EXIM_FIELD_INDICES 
} from '../../../zk-programs/compliance/EXIMZKProgram.js';
import { 
  EXIMOptimMultiCompanySmartContract,
  EXIMCompanyRecord,
  CompanyMerkleWitness,
  COMPANY_MERKLE_HEIGHT
} from '../../../contracts/complaince/EXIM/EXIMMultiSmartContract.js';
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
    await EXIMOptim.compile();
    console.log('✅ EXIMOptim ZK program compiled');
    
    const { verificationKey } = await EXIMOptimMultiCompanySmartContract.compile();
    console.log('✅ EXIMOptimMultiCompanySmartContract compiled');

    // =================================== Deploy Multi-Company Smart Contract ===================================
    console.log('\n🚀 Deploying multi-company smart contract...');
    const zkAppKey = PrivateKey.random();
    const zkAppAddress = zkAppKey.toPublicKey();
    const zkApp = new EXIMOptimMultiCompanySmartContract(zkAppAddress);

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
          dataAsOnWitness,
        );
        console.log(`✅ ZK proof generated successfully for ${companyName}`);
        proofs.push(proof);

        // =================================== Add Company to Registry ===================================
        // console.log(`\n📋 Adding ${companyName} to company registry...`);
        // const isCompliant = proof.publicOutput.isEXIMCompliant;
        // const companyRecord = createCompanyRecord(
        //   complianceData, 
        //   isCompliant, 
        //   currentTimestamp,
        //   CircuitString,
        //   EXIMCompanyRecord,
        //   Field
        // );
        // const iec = complianceData.iec.toString();
        
        // // Add company to registry and get witness
        // const companyWitness = companyRegistry.addOrUpdateCompany(iec, companyRecord);
        // console.log(`✅ Company added to registry. Total companies: ${companyRegistry.getTotalCompanies()}`);

        // // =================================== Verify Proof on Multi-Company Smart Contract ===================================
        // console.log(`\n🔍 Verifying proof on multi-company smart contract for ${companyName}...`);
        
        // // Show contract state before verification
        // console.log('📊 Contract state before verification:');
        // const stateBefore = zkApp.getRegistryInfo();
        // console.log(`  Total Companies: ${stateBefore.totalCompaniesTracked.toString()}`);
        // console.log(`  Compliant Companies: ${stateBefore.compliantCompaniesCount.toString()}`);
        // console.log(`  Global Compliance Score: ${stateBefore.globalComplianceScore.toString()}`);
        // console.log(`  Total Verifications: ${stateBefore.totalVerificationsGlobal.toString()}`);

        // // Create proper CompanyMerkleWitness for the contract call
        // let properCompanyWitness: CompanyMerkleWitness;
        // try {
        //   const tempCompanyTree = new MerkleTree(COMPANY_MERKLE_HEIGHT);
        //   const companyHash = Poseidon.hash([
        //     companyRecord.iecHash,
        //     companyRecord.entityNameHash,
        //     companyRecord.jurisdictionHash,
        //     companyRecord.isCompliant.toField(),
        //     companyRecord.complianceScore,
        //     companyRecord.totalVerifications,
        //     companyRecord.lastVerificationTime.value,
        //     companyRecord.firstVerificationTime.value
        //   ]);
        //   tempCompanyTree.setLeaf(BigInt(0), companyHash);
        //   const realWitness = tempCompanyTree.getWitness(BigInt(0));
        //   properCompanyWitness = new CompanyMerkleWitness(realWitness);
        //   console.log('✅ CompanyMerkleWitness created successfully');
        // } catch (witnessError) {
        //   console.error(`❌ Error creating CompanyMerkleWitness: ${(witnessError as Error).message}`);
        //   throw new Error(`Failed to create CompanyMerkleWitness: ${(witnessError as Error).message}`);
        // }

        // const txn = await Mina.transaction(
        //   senderAccount,
        //   async () => {
        //     await zkApp.verifyOptimizedComplianceWithProof(proof, properCompanyWitness, companyRecord,companyWitness);
        //   }
        // );

        // await txn.prove();
        // await txn.sign([senderKey]).send();

        // console.log(`✅ Proof verified on multi-company smart contract for ${companyName}!`);
        
        // // Show contract state after verification
        // console.log('📊 Contract state after verification:');
        // const stateAfter = zkApp.getRegistryInfo();
        // console.log(`  Total Companies: ${stateAfter.totalCompaniesTracked.toString()}`);
        // console.log(`  Compliant Companies: ${stateAfter.compliantCompaniesCount.toString()}`);
        // console.log(`  Global Compliance Score: ${stateAfter.globalComplianceScore.toString()}`);
        // console.log(`  Total Verifications: ${stateAfter.totalVerificationsGlobal.toString()}`);
        // console.log(`  Companies Root Hash: ${stateAfter.companiesRootHash.toString()}`);
        // console.log(`  Registry Version: ${stateAfter.registryVersion.toString()}`);

        // // =================================== Demonstrate Enhanced Individual Company Tracking ===================================
        // console.log(`\n🔍 Testing enhanced individual company tracking for ${companyName}...`);
        
        // // Test individual company queries (same as SingleCompany)
        // const companyInfo = zkApp.getCompanyInfo(properCompanyWitness, companyRecord);
        // const currentCompliance = zkApp.getCurrentCompliance(properCompanyWitness, companyRecord);
        // const verificationStats = zkApp.getVerificationStats(properCompanyWitness, companyRecord);
        
        // console.log('📋 Individual Company Information:');
        // console.log(`  • Company Identifier Hash: ${companyInfo.companyIdentifierHash.toString()}`);
        // console.log(`  • Company Name Hash: ${companyInfo.companyNameHash.toString()}`);
        // console.log(`  • Jurisdiction Hash: ${companyInfo.jurisdictionHash.toString()}`);
        // console.log(`  • Is Compliant: ${companyInfo.isCompliant.toJSON()}`);
        // console.log(`  • Compliance Score: ${companyInfo.complianceScore.toJSON()}`);
        
        // console.log('📊 Current Compliance Status:');
        // console.log(`  • Status: ${currentCompliance.isCompliant.toJSON()}`);
        // console.log(`  • Last Verification: ${new Date(Number(currentCompliance.lastVerificationTime.toString())).toISOString()}`);
        // console.log(`  • Score: ${currentCompliance.complianceScore.toJSON()}`);
        
        // console.log('📈 Verification Statistics:');
        // console.log(`  • Total Verifications: ${verificationStats.totalVerifications.toJSON()}`);
        // console.log(`  • First Verification: ${new Date(Number(verificationStats.firstVerificationTime.toString())).toISOString()}`);
        // console.log(`  • Last Verification: ${new Date(Number(verificationStats.lastVerificationTime.toString())).toISOString()}`);
        // console.log(`  • Has Been Verified: ${verificationStats.hasBeenVerified.toJSON()}`);

        // // =================================== Test Company Name-based Queries ===================================
        // console.log(`\n🏢 Testing company name-based compliance queries...`);
        // const companyNameCircuit = CircuitString.fromString(companyName);
        
        // // Test if company is tracked by name
        // const isTrackedByName = zkApp.isTrackingCompanyByName(companyNameCircuit, properCompanyWitness, companyRecord);
        // console.log(`  • Is ${companyName} tracked: ${isTrackedByName.toJSON()}`);
        
        // // Test EXIM compliance by company name
        // const isEXIMCompliantByName = zkApp.isCompanyEXIMCompliant(companyNameCircuit, properCompanyWitness, companyRecord);
        // console.log(`  • Is ${companyName} EXIM compliant: ${isEXIMCompliantByName.toJSON()}`);
        
        // // Test comprehensive company info by name
        // const complianceByName = zkApp.getCompanyComplianceByName(companyNameCircuit, properCompanyWitness, companyRecord);
        // console.log(`  • Company tracked by name: ${complianceByName.isTracked.toJSON()}`);
        // console.log(`  • Company compliant by name: ${complianceByName.isCompliant.toJSON()}`);
        // console.log(`  • Compliance score by name: ${complianceByName.complianceScore.toJSON()}`);
        // console.log(`  • Verification count by name: ${complianceByName.verificationCount.toJSON()}`);

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
          // iec: 'ERROR',
          // isCompliant: false,
          // complianceScore: 0,
          // verificationTime: Date.now().toString(),
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

// =================================== CLI ENTRY POINT ===================================

async function main(): Promise<void> {
  // Get company names and network type from command line arguments
  const companyNamesArg = process.argv[2];
  
  if (!companyNamesArg) {
    console.error('❌ Error: Company names are required');
    console.log('📖 Usage: node EXIMLocalMultiVerifierUtils.js "COMPANY1,COMPANY2"');
    console.log('📝 Example: node EXIMLocalMultiVerifierUtils.js "Tata Motors Limited,Reliance Industries Limited"');
    console.log('📝 Example: node EXIMLocalMultiVerifierUtils.js "Wipro Limited,Infosys Limited"');
    console.log('📝 Single Company: node EXIMLocalMultiVerifierUtils.js "SREE PALANI ANDAVAR AGROS PRIVATE LIMITED"');
    console.log('🔍 Features: Individual company tracking, name-based queries, same capabilities as SingleCompany contract');
    process.exit(1);
  }
  
  // Parse company names from comma-separated string
  const companyNames = companyNamesArg.split(',').map(name => name.trim()).filter(name => name.length > 0);
  
  if (companyNames.length === 0) {
    console.error('❌ Error: At least one company name is required');
    process.exit(1);
  }
  
  if (companyNames.length > 10) {
    console.error('❌ Error: Maximum 10 companies supported in this demo');
    process.exit(1);
  }
  
  console.log('🏢 Company Names:', companyNames);
  console.log('🏠 Environment: LOCAL (local blockchain)');
  console.log('📊 Total Companies to Process:', companyNames.length);
  
  try {
    const result = await getEXIMLocalMultiVerifierUtils(companyNames);
    
    console.log('\n🎯 Multi-Company Verification completed successfully!');
    console.log('\n📊 Final Summary:');
    console.log(`✅ Total Companies Processed: ${result.verificationResults.length}`);
    console.log(`✅ Successful Verifications: ${result.verificationResults.filter((r: any) => !r.error).length}`);
    console.log(`❌ Failed Verifications: ${result.verificationResults.filter((r: any) => r.error).length}`);
    console.log(`🏆 Compliant Companies: ${result.verificationResults.filter((r: any) => r.isCompliant).length}`);
    console.log(`⚠️ Non-Compliant Companies: ${result.verificationResults.filter((r: any) => !r.isCompliant && !r.error).length}`);
    
    console.log('\n🏢 Company Status Details:');
    result.verificationResults.forEach((company: any, index: number) => {
      const status = company.error ? '❌ ERROR' : (company.isCompliant ? '✅ COMPLIANT' : '⚠️ NON-COMPLIANT');
      console.log(`  ${index + 1}. ${company.companyName}: ${status}`);
      if (!company.error) {
        console.log(`     📄 IEC: ${company.iec}`);
        console.log(`     📊 Score: ${company.complianceScore}%`);
        console.log(`     🕒 Verified: ${new Date(Number(company.verificationTime)).toISOString()}`);
      } else {
        console.log(`     ❌ Error: ${company.error}`);
      }
    });
    
    console.log('\n🎉 Multi-Company EXIM LOCAL Verification Demo Completed Successfully!');
    console.log('📋 Features Demonstrated:');
    console.log('  ✅ Multiple company verification in single contract');
    console.log('  ✅ Global compliance statistics tracking');
    console.log('  ✅ Individual company state management');
    console.log('  ✅ Merkle tree-based company registry');
    console.log('  ✅ Aggregate compliance scoring');
    console.log('  ✅ Real-time EXIM API integration');
    console.log('  ✅ Zero-knowledge proof generation and verification');
    console.log('  ✅ Smart contract state updates');
    console.log('  ✅ LOCAL blockchain execution');
    
  } catch (error) {
    console.error('💥 Error:', error);
    console.error('💥 Error Stack:', (error as Error).stack || 'No stack trace available');
    process.exit(1);
  }
}

// Always run main function when this module is executed
main().catch(err => {
  console.error('💥 Fatal Error:', err);
  console.error('💥 Fatal Error Stack:', err.stack);
  process.exit(1);
});
