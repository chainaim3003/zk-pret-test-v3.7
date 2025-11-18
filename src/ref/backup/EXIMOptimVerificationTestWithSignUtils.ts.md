import * as dotenv from 'dotenv';
dotenv.config();

import { Field, Mina, PrivateKey, AccountUpdate, CircuitString, Poseidon, Signature, MerkleTree, UInt64 } from 'o1js';
import { 
  EXIMOptim, 
  EXIMOptimComplianceData, 
  EXIMMerkleWitness8, 
  EXIM_MERKLE_TREE_HEIGHT,
  EXIM_FIELD_INDICES 
} from '../../zk-programs/with-sign/EXIMOptimZKProgram.js';
import { EXIMOptimSmartContract } from '../../contracts/with-sign/EXIMOptimSmartContract.js';
import { EXIMdeployerAccount, EXIMsenderAccount, EXIMdeployerKey, EXIMsenderKey, getPrivateKeyFor } from '../../core/OracleRegistry.js';
import { fetchEXIMCompanyData } from './EXIMUtils.js';

// =================================== Enhanced EXIM Utils Functions ===================================

/**
 * Enhanced EXIM API Response interface
 */
export interface EXIMAPIResponse {
  iec?: string;
  entityName?: string;
  iecIssueDate?: string;
  pan?: string;
  iecStatus?: number;
  iecModificationDate?: string;
  dataAsOn?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  pin?: number;
  contactNo?: number;
  email?: string;
  exporterType?: number;
  activeComplianceStatusCode?: number;
  starStatus?: number;
  natureOfConcern?: number;
  branches?: Array<{
    branchCode?: number;
    badd1?: string;
    badd2?: string;
    city?: string;
    state?: string;
    pin?: number;
  }>;
  directors?: Array<{
    name?: string;
  }>;
}

/**
 * Analyze EXIM compliance based on user requirements
 */
function analyzeEXIMCompliance(apiResponse: EXIMAPIResponse): {
  isCompliant: boolean;
  complianceScore: number;
  businessRuleResults: {
    entityNameValid: boolean;
    iecValid: boolean;
    panValid: boolean;
    iecIssueDateValid: boolean;
    iecModificationDateValid: boolean;
    dataAsOnValid: boolean;
    iecStatusValid: boolean;
  };
  issues: string[];
} {
  const businessRuleResults = {
    entityNameValid: !!(apiResponse.entityName && apiResponse.entityName.trim() !== ''),
    iecValid: !!(apiResponse.iec && apiResponse.iec.trim() !== ''),
    panValid: !!(apiResponse.pan && apiResponse.pan.trim() !== ''),
    iecIssueDateValid: !!(apiResponse.iecIssueDate && apiResponse.iecIssueDate.trim() !== ''),
    iecModificationDateValid: !!(apiResponse.iecModificationDate && apiResponse.iecModificationDate.trim() !== ''),
    dataAsOnValid: !!(apiResponse.dataAsOn && apiResponse.dataAsOn.trim() !== ''),
    iecStatusValid: apiResponse.iecStatus !== undefined && [0, 4, 7, 8].includes(apiResponse.iecStatus)
  };
  
  const issues: string[] = [];
  
  // Check each business rule and collect issues
  if (!businessRuleResults.entityNameValid) {
    issues.push('Entity name is empty or missing');
  }
  if (!businessRuleResults.iecValid) {
    issues.push('IEC is empty or missing');
  }
  if (!businessRuleResults.panValid) {
    issues.push('PAN is empty or missing');
  }
  if (!businessRuleResults.iecIssueDateValid) {
    issues.push('IEC issue date is empty or missing');
  }
  if (!businessRuleResults.iecModificationDateValid) {
    issues.push('IEC modification date is empty or missing');
  }
  if (!businessRuleResults.dataAsOnValid) {
    issues.push('Data as on date is empty or missing');
  }
  if (!businessRuleResults.iecStatusValid) {
    issues.push(`IEC status is not compliant: ${apiResponse.iecStatus} (must be 0, 4, 7, or 8)`);
  }
  
  // Calculate compliance score
  const scoreFactors = Object.values(businessRuleResults);
  const complianceScore = Math.round((scoreFactors.filter(Boolean).length / scoreFactors.length) * 100);
  
  const isCompliant = complianceScore === 100; // All conditions must be met
  
  return {
    isCompliant,
    complianceScore,
    businessRuleResults,
    issues
  };
}

/**
 * Extract EXIM summary for logging
 */
function extractEXIMSummary(apiResponse: EXIMAPIResponse): {
  entityName: string;
  iec: string;
  iecStatus: number;
  pan: string;
  iecIssueDate: string;
} {
  return {
    entityName: apiResponse.entityName || 'UNKNOWN',
    iec: apiResponse.iec || 'UNKNOWN',
    iecStatus: apiResponse.iecStatus ?? -1,
    pan: apiResponse.pan || 'UNKNOWN',
    iecIssueDate: apiResponse.iecIssueDate || 'UNKNOWN'
  };
}

// =================================== Merkle Tree Creation Functions ===================================

/**
 * Create a comprehensive merkle tree from EXIM API response
 */
function createComprehensiveEXIMMerkleTree(apiResponse: EXIMAPIResponse): {
  tree: MerkleTree,
  extractedData: any,
  fieldCount: number
} {
  console.log('🌳 Creating comprehensive EXIM Merkle tree...');
  
  const tree = new MerkleTree(EXIM_MERKLE_TREE_HEIGHT);
  let fieldCount = 0;
  const extractedData: any = {};

  // Helper function to safely set field in tree
  function setTreeField(fieldName: string, value: string | number | undefined, index: number) {
    const safeValue = value?.toString() || '';
    const circuitValue = CircuitString.fromString(safeValue);
    const hash = circuitValue.hash();
    tree.setLeaf(BigInt(index), hash);
    extractedData[fieldName] = circuitValue;
    fieldCount++;
    console.log(`  Set field ${fieldName} (${index}): "${safeValue.substring(0, 50)}${safeValue.length > 50 ? '...' : ''}"`);  
  }

  // Helper function to set Field-type values in tree
  function setTreeFieldAsField(fieldName: string, value: number | undefined, index: number) {
    const safeValue = value ?? 0;
    const fieldValue = Field(safeValue);
    const hash = Poseidon.hash([fieldValue]);
    tree.setLeaf(BigInt(index), hash);
    extractedData[fieldName] = fieldValue;
    fieldCount++;
    console.log(`  Set field ${fieldName} (${index}): ${safeValue}`);  
  }

  try {
    // Core compliance fields (0-6) - the 7 fields specified by user
    setTreeField('iec', apiResponse.iec, EXIM_FIELD_INDICES.iec);
    setTreeField('entityName', apiResponse.entityName, EXIM_FIELD_INDICES.entityName);
    setTreeField('iecIssueDate', apiResponse.iecIssueDate, EXIM_FIELD_INDICES.iecIssueDate);
    setTreeField('pan', apiResponse.pan, EXIM_FIELD_INDICES.pan);
    setTreeFieldAsField('iecStatus', apiResponse.iecStatus, EXIM_FIELD_INDICES.iecStatus);
    setTreeField('iecModificationDate', apiResponse.iecModificationDate, EXIM_FIELD_INDICES.iecModificationDate);
    setTreeField('dataAsOn', apiResponse.dataAsOn, EXIM_FIELD_INDICES.dataAsOn);
    
    // Additional EXIM details (7-15) - limited to fit in 16 total fields
    setTreeField('addressLine1', apiResponse.addressLine1, EXIM_FIELD_INDICES.addressLine1);
    setTreeField('addressLine2', apiResponse.addressLine2, EXIM_FIELD_INDICES.addressLine2);
    setTreeField('city', apiResponse.city, EXIM_FIELD_INDICES.city);
    setTreeField('state', apiResponse.state, EXIM_FIELD_INDICES.state);
    setTreeField('email', apiResponse.email, EXIM_FIELD_INDICES.email);
    setTreeField('exporterType', apiResponse.exporterType, EXIM_FIELD_INDICES.exporterType);
    setTreeField('activeComplianceStatusCode', apiResponse.activeComplianceStatusCode, EXIM_FIELD_INDICES.activeComplianceStatusCode);
    setTreeField('starStatus', apiResponse.starStatus, EXIM_FIELD_INDICES.starStatus);
    setTreeField('natureOfConcern', apiResponse.natureOfConcern, EXIM_FIELD_INDICES.natureOfConcern);

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
function createOptimizedComplianceData(
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

// =================================== Main Test Function ===================================
export async function getEXIMOptimVerification(companyName: string) {
  console.log('\n🚀 EXIM Optimized Verification Test Started');
  console.log(`🏢 Company: ${companyName}`);
  //console.log(`🌐 Network: ${typeOfNet}`);

  try {
    // =================================== Compile Programs ===================================
    console.log('\n📝 Compiling ZK programs...');
    await EXIMOptim.compile();
    console.log('✅ EXIMOptim ZK program compiled');
    
    const { verificationKey } = await EXIMOptimSmartContract.compile();
    console.log('✅ EXIMOptimSmartContract compiled');

    // =================================== Deploy Smart Contract ===================================
    console.log('\n🚀 Deploying smart contract...');
    const zkAppKey = PrivateKey.random();
    const zkAppAddress = zkAppKey.toPublicKey();
    const zkApp = new EXIMOptimSmartContract(zkAppAddress);

    const deployTxn = await Mina.transaction(
      EXIMdeployerAccount(),
      async () => {
        AccountUpdate.fundNewAccount(EXIMdeployerAccount());
        await zkApp.deploy({ verificationKey });
      }
    );
    await deployTxn.sign([EXIMdeployerKey(), zkAppKey]).send();
    console.log('✅ Smart contract deployed successfully');

    // =================================== Fetch EXIM Data ===================================
    console.log('\n📡 Fetching EXIM data...');
    let apiResponse: EXIMAPIResponse;
    try {
      const rawResponse = await fetchEXIMCompanyData(companyName);
      // Convert to EXIMAPIResponse format
      apiResponse = {
        iec: rawResponse.iec,
        entityName: rawResponse.entityName,
        iecIssueDate: rawResponse.iecIssueDate,
        pan: rawResponse.pan,
        iecStatus: rawResponse.iecStatus,
        iecModificationDate: rawResponse.iecModificationDate,
        dataAsOn: rawResponse.dataAsOn,
        addressLine1: rawResponse.addressLine1,
        addressLine2: rawResponse.addressLine2,
        city: rawResponse.city,
        state: rawResponse.state,
        pin: rawResponse.pin,
        contactNo: rawResponse.contactNo,
        email: rawResponse.email,
        exporterType: rawResponse.exporterType,
        activeComplianceStatusCode: rawResponse.activeComplianceStatusCode,
        starStatus: rawResponse.starStatus,
        natureOfConcern: rawResponse.natureOfConcern,
        branches: rawResponse.branches,
        directors: rawResponse.directors
      };
      console.log('✅ EXIM data fetched successfully');
    } catch (err: any) {
      console.error('❌ Error fetching EXIM data:', err.message);
      throw err;
    }

    // =================================== Print Complete Response ===================================
    console.log('\n📋 Complete EXIM API Response:');
    console.log(JSON.stringify(apiResponse, null, 2));

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
    const complianceData = createOptimizedComplianceData(extractedData, merkleRoot);
    
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
    console.log(`🆔 PAN: ${complianceData.pan.toString()}`);
    console.log(`📈 IEC Status: ${complianceData.iecStatus.toString()}`);
    console.log(`📅 IEC Issue Date: ${complianceData.iecIssueDate.toString()}`);
    console.log(`📅 IEC Modification Date: ${complianceData.iecModificationDate.toString()}`);
    console.log(`📅 Data As On: ${complianceData.dataAsOn.toString()}`);

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

    // =================================== Verify Proof on Smart Contract ===================================
    console.log('\n🔍 Verifying proof on smart contract...');
    console.log('📊 Initial smart contract state:');
    console.log(`  EXIMCompliant: ${zkApp.eximCompliant.get().toJSON()}`);
    console.log(`  Total Verifications: ${zkApp.totalVerifications.get().toJSON()}`);
    console.log(`  Last Verification Time: ${zkApp.lastVerificationTime.get().toJSON()}`);
    console.log(`  Total Companies Verified: ${zkApp.totalCompaniesVerified.get().toJSON()}`);

    const txn = await Mina.transaction(
      EXIMsenderAccount(),
      async () => {
        await zkApp.verifyOptimizedComplianceWithProof(proof);
      }
    );

    await txn.prove();
    await txn.sign([EXIMsenderKey()]).send();

    console.log('✅ Proof verified on smart contract!');
    console.log('📊 Final smart contract state:');
    console.log(`  EXIMCompliant: ${zkApp.eximCompliant.get().toJSON()}`);
    console.log(`  Total Verifications: ${zkApp.totalVerifications.get().toJSON()}`);
    console.log(`  Last Verification Time: ${zkApp.lastVerificationTime.get().toJSON()}`);
    console.log(`  Total Companies Verified: ${zkApp.totalCompaniesVerified.get().toJSON()}`);

    // =================================== Summary ===================================
    console.log('\n🎉 EXIM Optimized Verification Completed Successfully!');
    console.log('📈 Summary:');
    console.log(`  • Company: ${complianceData.entityName.toString()}`);
    console.log(`  • IEC: ${complianceData.iec.toString()}`);
    console.log(`  • PAN: ${complianceData.pan.toString()}`);
    console.log(`  • IEC Status: ${complianceData.iecStatus.toString()}`);
    console.log(`  • IEC Issue Date: ${complianceData.iecIssueDate.toString()}`);
    console.log(`  • IEC Modification Date: ${complianceData.iecModificationDate.toString()}`);
    console.log(`  • Data As On: ${complianceData.dataAsOn.toString()}`);
    console.log(`  • EXIM Compliant: ${zkApp.eximCompliant.get().toJSON()}`);
    console.log(`  • Compliance Score: ${complianceAnalysis.complianceScore}%`);
    console.log(`  • Verification Count: ${zkApp.totalVerifications.get().toJSON()}`);
    console.log(`  • Last Verification: ${zkApp.lastVerificationTime.get().toJSON()}`);
    console.log(`  • Merkle Tree Fields: ${fieldCount}`);
    console.log(`  • Witnesses Generated: 7 compliance fields`);
    console.log(`  • Privacy: ${fieldCount - 7} fields remain hidden`);

    return proof;

  } catch (error) {
    console.error('❌ Error in EXIM Optimized Verification:', error);
    throw error;
  }
}

// =================================== Direct Execution ===================================
// GLEIF-style execution (this works!)
async function main() {
  const args = process.argv.slice(2);
  const companyName = args[0] || 'zenova_dgft';
  //const networkType = args[1] || 'TESTNET';
  
  console.log('🏢 Company Name:', companyName);
  //console.log('🌐 Network Type:', networkType);
  
  try {
    const proof = await getEXIMOptimVerification(companyName);
    console.log('\n🎯 Proof generated successfully!');
    // Uncomment the line below if you want to see the full proof JSON
    // console.log('📄 Proof:', proof.toJSON());
  } catch (error: any) {
    console.error('💥 Error:', error);
    console.error('💥 Error Stack:', error.stack);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('💥 Fatal Error:', err);
  console.error('💥 Fatal Error Stack:', err.stack);
  process.exit(1);
});
