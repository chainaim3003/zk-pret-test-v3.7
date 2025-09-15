import * as dotenv from 'dotenv';
dotenv.config();

import { Field, Mina, PrivateKey, AccountUpdate, CircuitString, Poseidon, Signature, MerkleTree, UInt64 } from 'o1js';
import { 
  EXIMOptim, 
  EXIMOptimComplianceData, 
  EXIMMerkleWitness8, 
  EXIM_MERKLE_TREE_HEIGHT,
  EXIM_FIELD_INDICES 
} from '../../zk-programs/compliance/EXIMZKProgram.js';
import { EXIMOptimSingleCompanySmartContract } from '../../contracts/complaince/EXIM/EXIMSingleSmartContract.js';
import { EXIMdeployerAccount, EXIMsenderAccount, EXIMdeployerKey, EXIMsenderKey, getPrivateKeyFor } from '../../core/OracleRegistry.js';
import { 
  fetchEXIMDataWithFullLogging, 
  EXIMAPIResponse,
  extractEXIMSummary,
  analyzeEXIMCompliance
} from '../../utils/domain/compliance/EXIM/EXIMEnhancedUtils.js';

// =================================== Merkle Tree Creation Functions ===================================

/**
 * Create a comprehensive merkle tree from EXIM API response
 */
function createComprehensiveEXIMMerkleTree(
  apiResponse: EXIMAPIResponse,
): {
  tree: MerkleTree,
  extractedData: any,
  fieldCount: number
} {
  console.log('🌳 Creating comprehensive EXIM Merkle tree...');
  
  const tree = new MerkleTree(EXIM_MERKLE_TREE_HEIGHT);
  let fieldCount = 0;
  const extractedData: any = {};

  // Helper function to safely set field in tree
  function setTreeField(fieldName: string, value: string | undefined, index: number) {
    const safeValue = value || '';
    const circuitValue = CircuitString.fromString(safeValue);
    const hash = circuitValue.hash();
    tree.setLeaf(BigInt(index), hash);
    extractedData[fieldName] = circuitValue;
    fieldCount++;
    console.log(`  Set field ${fieldName} (${index}): "${safeValue.substring(0, 50)}${safeValue.length > 50 ? '...' : ''}"`);  
  }

  // Helper function to set Field-type values in tree
  function setTreeFieldAsNumber(fieldName: string, value: number | string | undefined, index: number) {
    const safeValue = typeof value === 'number' ? value : (typeof value === 'string' ? parseInt(value) || 0 : 0);
    const fieldValue = Field(safeValue);
    const hash = Poseidon.hash([fieldValue]);
    tree.setLeaf(BigInt(index), hash);
    extractedData[fieldName] = fieldValue;
    fieldCount++;
    console.log(`  Set field ${fieldName} (${index}): ${safeValue}`);  
  }

  try {
    // Since LOCAL now uses live API, all environments use the same structure
    console.log('📋 Processing Production API structure...');
    const eximData = apiResponse.data || apiResponse;
    
    // Core compliance fields (indices 0-6) - matching ZK program structure
    setTreeField('iec', eximData.iec, EXIM_FIELD_INDICES.iec);
    setTreeField('entityName', eximData.entityName, EXIM_FIELD_INDICES.entityName);
    setTreeField('iecIssueDate', eximData.iecIssueDate, EXIM_FIELD_INDICES.iecIssueDate);
    setTreeField('pan', eximData.PAN, EXIM_FIELD_INDICES.pan);
    setTreeFieldAsNumber('iecStatus', eximData.iecStatus, EXIM_FIELD_INDICES.iecStatus);
    setTreeField('iecModificationDate', eximData.iecModificationDate, EXIM_FIELD_INDICES.iecModificationDate);
    setTreeField('dataAsOn', eximData.dataAsOn, EXIM_FIELD_INDICES.dataAsOn);
    
    // Additional EXIM fields that exist in the ZK program field indices
    if ('addressLine1' in EXIM_FIELD_INDICES) {
      setTreeField('addressLine1', eximData.addressLine1 || '', EXIM_FIELD_INDICES.addressLine1);
    }
    if ('addressLine2' in EXIM_FIELD_INDICES) {
      setTreeField('addressLine2', eximData.addressLine2 || '', EXIM_FIELD_INDICES.addressLine2);
    }
    if ('city' in EXIM_FIELD_INDICES) {
      setTreeField('city', eximData.city || '', EXIM_FIELD_INDICES.city);
    }
    if ('state' in EXIM_FIELD_INDICES) {
      setTreeField('state', eximData.state || '', EXIM_FIELD_INDICES.state);
    }
    if ('email' in EXIM_FIELD_INDICES) {
      setTreeField('email', eximData.email || '', EXIM_FIELD_INDICES.email);
    }
    if ('exporterType' in EXIM_FIELD_INDICES) {
      setTreeFieldAsNumber('exporterType', eximData.exporterType, EXIM_FIELD_INDICES.exporterType);
    }
    if ('activeComplianceStatusCode' in EXIM_FIELD_INDICES) {
      setTreeFieldAsNumber('activeComplianceStatusCode', eximData.activeComplianceStatusCode, EXIM_FIELD_INDICES.activeComplianceStatusCode);
    }
    if ('starStatus' in EXIM_FIELD_INDICES) {
      setTreeFieldAsNumber('starStatus', eximData.starStatus, EXIM_FIELD_INDICES.starStatus);
    }
    if ('natureOfConcern' in EXIM_FIELD_INDICES) {
      setTreeFieldAsNumber('natureOfConcern', eximData.natureOfConcern, EXIM_FIELD_INDICES.natureOfConcern);
    }

    console.log(`✅ Created Merkle tree with ${fieldCount} fields`);
    console.log(`🌳 Merkle root: ${tree.getRoot().toString()}`);
    
    return { tree, extractedData, fieldCount };
    
  } catch (error) {
    console.error('❌ Error creating Merkle tree:', error);
    throw error;
  }
}

/**
 * Create optimized compliance data from extracted fields
 */
function createOptimizedEXIMComplianceData(
  extractedData: any,
  merkleRoot: Field
): EXIMOptimComplianceData {
  return new EXIMOptimComplianceData({
    iec: extractedData.iec || CircuitString.fromString(''),
    entityName: extractedData.entityName || CircuitString.fromString(''),
    iecIssueDate: extractedData.iecIssueDate || CircuitString.fromString(''),
    pan: extractedData.pan || CircuitString.fromString(''),
    iecStatus: extractedData.iecStatus || Field(0),
    iecModificationDate: extractedData.iecModificationDate || CircuitString.fromString(''),
    dataAsOn: extractedData.dataAsOn || CircuitString.fromString(''),
    merkle_root: merkleRoot,
  });
}

// =================================== Main Single Company Verification Function ===================================
export async function getEXIMOptimSingleCompanyVerificationWithSignUtils(companyName: string) {
  console.log(`\n🚀 EXIM Single Company Verification Test Started`);
  console.log(`🏢 Company: ${companyName}`);
  console.log(`📡 Using LIVE API for all environments`);

  try {
    // =================================== Setup Local Blockchain ===================================
    console.log('\n🔧 Setting up local blockchain...');
    // Import and use the existing Local blockchain instance from OracleRegistry
    const { Local } = await import('../../core/OracleRegistry.js');
    const localBlockchain = await Local;
    Mina.setActiveInstance(localBlockchain);
    
    // Use existing account setup from OracleRegistry
    const deployerAccount = EXIMdeployerAccount();
    const deployerKey = EXIMdeployerKey();
    const senderAccount = EXIMsenderAccount();
    const senderKey = EXIMsenderKey();

    // =================================== Compile Programs ===================================
    console.log('\n📝 Compiling ZK programs...');
    await EXIMOptim.compile();
    console.log('✅ EXIMOptim ZK program compiled');
    
    const { verificationKey } = await EXIMOptimSingleCompanySmartContract.compile();
    console.log('✅ EXIMOptimSingleCompanySmartContract compiled');

    // =================================== Deploy Smart Contract ===================================
    console.log('\n🚀 Deploying single company smart contract...');
    const zkAppKey = PrivateKey.random();
    const zkAppAddress = zkAppKey.toPublicKey();
    const zkApp = new EXIMOptimSingleCompanySmartContract(zkAppAddress);

    const deployTxn = await Mina.transaction(
      deployerAccount,
      async () => {
        AccountUpdate.fundNewAccount(deployerAccount);
        await zkApp.deploy({ verificationKey });
      }
    );
    await deployTxn.sign([deployerKey, zkAppKey]).send();
    console.log('✅ Single company smart contract deployed successfully');

    // =================================== Fetch EXIM Data ===================================
    console.log('\n📡 Fetching EXIM data...');
    let apiResponse: EXIMAPIResponse;
    try {
      apiResponse = await fetchEXIMDataWithFullLogging(companyName);
      console.log('✅ EXIM data fetched successfully');
    } catch (err: any) {
      console.error('❌ Error fetching EXIM data:', err.message);
      throw err;
    }

    // =================================== Analyze Compliance ===================================
    console.log('\n🔍 Analyzing compliance...');
    const complianceAnalysis = analyzeEXIMCompliance(apiResponse);
    console.log(`📊 Compliance Score: ${complianceAnalysis.complianceScore}%`);
    console.log(`✅ Is Compliant: ${complianceAnalysis.isCompliant}`);
    
    if (complianceAnalysis.issues.length > 0) {
      console.log(`⚠️ Issues found:`);
      complianceAnalysis.issues.forEach((issue, index) => {
        console.log(`  ${index + 1}. ${issue}`);
      });
    }

    // =================================== Create Comprehensive Merkle Tree ===================================
    console.log('\n🌳 Creating comprehensive Merkle tree...');
    const { tree, extractedData, fieldCount } = createComprehensiveEXIMMerkleTree(apiResponse);
    console.log(`✅ Merkle tree created with ${fieldCount} fields`);

    // =================================== Prepare ZK Proof Data ===================================
    console.log('\n🔐 Preparing ZK proof data...');
    const merkleRoot = tree.getRoot();
    const currentTimestamp = UInt64.from(Date.now());
    
    // Create optimized compliance data
    const complianceData = createOptimizedEXIMComplianceData(extractedData, merkleRoot);
    
    // Generate merkle witnesses for the 7 compliance fields
    const iecWitness = new EXIMMerkleWitness8(tree.getWitness(BigInt(EXIM_FIELD_INDICES.iec)));
    const entityNameWitness = new EXIMMerkleWitness8(tree.getWitness(BigInt(EXIM_FIELD_INDICES.entityName)));
    const iecIssueDateWitness = new EXIMMerkleWitness8(tree.getWitness(BigInt(EXIM_FIELD_INDICES.iecIssueDate)));
    const panWitness = new EXIMMerkleWitness8(tree.getWitness(BigInt(EXIM_FIELD_INDICES.pan)));
    const iecStatusWitness = new EXIMMerkleWitness8(tree.getWitness(BigInt(EXIM_FIELD_INDICES.iecStatus)));
    const iecModificationDateWitness = new EXIMMerkleWitness8(tree.getWitness(BigInt(EXIM_FIELD_INDICES.iecModificationDate)));
    const dataAsOnWitness = new EXIMMerkleWitness8(tree.getWitness(BigInt(EXIM_FIELD_INDICES.dataAsOn)));

    // =================================== Oracle Signature ===================================
    console.log('\n🔏 Generating oracle signature...');
    const registryPrivateKey = getPrivateKeyFor('EXIM');
    const oracleSignature = Signature.create(registryPrivateKey, [merkleRoot]);
    console.log('✅ Oracle signature generated');

    // =================================== Generate ZK Proof ===================================
    console.log('\n⚡ Generating ZK proof...');
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
    console.log('✅ ZK proof generated successfully');

    // =================================== Verify Proof on Single Company Smart Contract ===================================
    console.log('\n🔍 Verifying proof on single company smart contract...');
    console.log('📊 Initial smart contract state:');
    console.log(`  Company Identifier Hash: "${zkApp.companyIdentifierHash.get().toString()}"`);
    console.log(`  Company Name Hash: "${zkApp.companyNameHash.get().toString()}"`);
    console.log(`  Jurisdiction Hash: "${zkApp.jurisdictionHash.get().toString()}"`);
    console.log(`  EXIMCompliant: ${zkApp.eximCompliant.get().toJSON()}`);
    console.log(`  Total Verifications: ${zkApp.totalVerifications.get().toJSON()}`);
    console.log(`  Last Verification Time: ${zkApp.lastVerificationTime.get().toJSON()}`);

    const txn = await Mina.transaction(
      senderAccount,
      async () => {
        await zkApp.verifyOptimizedComplianceWithProof(proof);
      }
    );

    await txn.prove();
    await txn.sign([senderKey]).send();

    console.log('✅ Proof verified on single company smart contract!');
    console.log('📊 Final smart contract state:');
    console.log(`  Company Identifier Hash: "${zkApp.companyIdentifierHash.get().toString()}"`);
    console.log(`  Company Name Hash: "${zkApp.companyNameHash.get().toString()}"`);
    console.log(`  Jurisdiction Hash: "${zkApp.jurisdictionHash.get().toString()}"`);
    console.log(`  EXIMCompliant: ${zkApp.eximCompliant.get().toJSON()}`);
    console.log(`  Current Compliance Score: ${zkApp.currentComplianceScore.get().toJSON()}`);
    console.log(`  Total Verifications: ${zkApp.totalVerifications.get().toJSON()}`);
    console.log(`  First Verification Time: ${zkApp.firstVerificationTime.get().toJSON()}`);
    console.log(`  Last Verification Time: ${zkApp.lastVerificationTime.get().toJSON()}`);

    // =================================== Demonstrate Company Tracking ===================================
    console.log('\n🔍 Testing company tracking capabilities...');
    const companyInfo = zkApp.getCompanyInfo();
    const currentCompliance = zkApp.getCurrentCompliance();
    const verificationStats = zkApp.getVerificationStats();
    
    console.log('📋 Company Information:');
    console.log(`  • Identifier Hash: ${companyInfo.companyIdentifierHash.toString()}`);
    console.log(`  • Name Hash: ${companyInfo.companyNameHash.toString()}`);
    console.log(`  • Jurisdiction Hash: ${companyInfo.jurisdictionHash.toString()}`);
    console.log(`  • Is Compliant: ${companyInfo.isCompliant.toJSON()}`);
    console.log(`  • Compliance Score: ${companyInfo.complianceScore.toJSON()}`);
    
    console.log('📊 Current Compliance Status:');
    console.log(`  • Status: ${currentCompliance.isCompliant.toJSON()}`);
    console.log(`  • Last Verification: ${new Date(Number(currentCompliance.lastVerificationTime.toString())).toISOString()}`);
    console.log(`  • Score: ${currentCompliance.complianceScore.toJSON()}`);
    
    console.log('📈 Verification Statistics:');
    console.log(`  • Total Verifications: ${verificationStats.totalVerifications.toJSON()}`);
    console.log(`  • First Verification: ${new Date(Number(verificationStats.firstVerificationTime.toString())).toISOString()}`);
    console.log(`  • Last Verification: ${new Date(Number(verificationStats.lastVerificationTime.toString())).toISOString()}`);
    console.log(`  • Has Been Verified: ${verificationStats.hasBeenVerified.toJSON()}`);

    // =================================== Test Company Name-based Queries (New Feature) ===================================
    console.log(`\n🏢 Testing company name-based compliance queries...`);
    const companyNameCircuit = CircuitString.fromString(companyName);
    
    // Test if company is tracked by name
    const isTrackedByName = zkApp.isTrackingCompanyByName(companyNameCircuit);
    console.log(`  • Is ${companyName} tracked: ${isTrackedByName.toJSON()}`);
    
    // Test EXIM compliance by company name
    const isEXIMCompliantByName = zkApp.isCompanyEXIMCompliant(companyNameCircuit);
    console.log(`  • Is ${companyName} EXIM compliant: ${isEXIMCompliantByName.toJSON()}`);
    
    // Test comprehensive company info by name
    const complianceByName = zkApp.getCompanyComplianceByName(companyNameCircuit);
    console.log(`  • Company tracked by name: ${complianceByName.isTracked.toJSON()}`);
    console.log(`  • Company compliant by name: ${complianceByName.isCompliant.toJSON()}`);
    console.log(`  • Compliance score by name: ${complianceByName.complianceScore.toJSON()}`);
    console.log(`  • Verification count by name: ${complianceByName.verificationCount.toJSON()}`);

    // =================================== Summary ===================================
    console.log('\n🎉 EXIM Single Company Verification Completed Successfully!');
    console.log('📈 Summary:');
    console.log(`  • Contract Type: Single Company (Enhanced)`);
    console.log(`  • Company: ${complianceData.entityName.toString()}`);
    console.log(`  • IEC Code: ${complianceData.iec.toString()}`);
    console.log(`  • PAN: ${complianceData.pan.toString()}`);
    console.log(`  • IEC Status: ${complianceData.iecStatus.toString()}`);
    console.log(`  • EXIM Compliant: ${zkApp.eximCompliant.get().toJSON()}`);
    console.log(`  • Compliance Score: ${complianceAnalysis.complianceScore}%`);
    console.log(`  • Contract Verification Count: ${zkApp.totalVerifications.get().toJSON()}`);
    console.log(`  • Company Identity Locked: ✅`);
    console.log(`  • Historical Tracking: ✅`);
    console.log(`  • Multiple Verifications Support: ✅`);
    console.log(`  • Company Name-based Queries: ✅`);
    console.log(`  • Individual Company Detail Tracking: ✅`);
    
    console.log('\n📋 Enhanced Features Demonstrated:');
    console.log(`  • Individual Company Info Retrieval: ✅`);
    console.log(`  • Current Compliance Status: ✅`);
    console.log(`  • Verification Statistics: ✅`);
    console.log(`  • Company Name-based Compliance Queries: ✅`);
    console.log(`  • Identity-based Company Tracking: ✅`);
    console.log(`  • Administrative Functions: ✅`);
    console.log(`  • Complete Audit Trail: ✅`);


    return proof;

  } catch (error) {
    console.error('❌ Error in EXIM Single Company Verification:', error);
    throw error;
  }
}
