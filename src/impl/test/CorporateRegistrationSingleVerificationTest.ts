import * as dotenv from 'dotenv';
dotenv.config();

import { Field, Mina, PrivateKey, AccountUpdate, CircuitString, Poseidon, Signature, MerkleTree, UInt64 } from 'o1js';
import { 
  CorporateRegistrationOptim, 
  CorporateRegistrationOptimComplianceData, 
  CorporateRegistrationMerkleWitness8, 
  CORP_REG_MERKLE_TREE_HEIGHT,
  CORP_REG_FIELD_INDICES 
} from '../../zk-programs/compliance/CorporateRegistrationOptimZKProgram.js';
import { CorporateRegistrationOptimSingleCompanySmartContract } from '../../contracts/compliance/CorpReg/CorporateRegistrationSmartContract.js';
import { MCAdeployerAccount, MCAsenderAccount, MCAdeployerKey, MCAsenderKey, getPrivateKeyFor } from '../../core/OracleRegistry.js';
import { 
  fetchCorporateRegistrationDataWithFullLogging, 
  CorporateRegistrationAPIResponse,
  extractCorporateRegistrationSummary,
  analyzeCorporateRegistrationCompliance
} from '../../utils/domain/compliance/CorpReg/CorporateRegistrationCoreAPIUtils.js';

// =================================== Merkle Tree Creation Functions ===================================

/**
 * Create a comprehensive merkle tree from Corporate Registration API response
 */
function createComprehensiveCorporateRegistrationMerkleTree(
  apiResponse: CorporateRegistrationAPIResponse,
): {
  tree: MerkleTree,
  extractedData: any,
  fieldCount: number
} {
  console.log('🌳 Creating comprehensive Corporate Registration Merkle tree...');
  
  const tree = new MerkleTree(CORP_REG_MERKLE_TREE_HEIGHT);
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

  try {
    // Since LOCAL now uses live API, all environments use the same structure
    console.log('📋 Processing Production API structure...');
    const masterData = apiResponse.data?.company_master_data || {};
    
    // Core compliance fields (indices 0-9) with proper field mappings
    setTreeField('companyName', masterData.company_name, CORP_REG_FIELD_INDICES.companyName);
    setTreeField('category', masterData.company_category, CORP_REG_FIELD_INDICES.category);
    setTreeField('classOfCompany', masterData.class_of_company, CORP_REG_FIELD_INDICES.classOfCompany);
    setTreeField('registrationNumber', masterData.registration_number, CORP_REG_FIELD_INDICES.registrationNumber);
    // Fix: Use correct API field name for listing status
    setTreeField('listed', masterData.whether_listed_or_not, CORP_REG_FIELD_INDICES.listed);
    setTreeField('suspended', masterData.suspended_at_stock_exchange, CORP_REG_FIELD_INDICES.suspended);
    setTreeField('CIN', masterData.cin, CORP_REG_FIELD_INDICES.CIN);
    // Fix: Use correct API field name for company status
    setTreeField('companyStatus', masterData['company_status(for_efiling)'] || masterData.company_status, CORP_REG_FIELD_INDICES.companyStatus);
    setTreeField('dateOfIncorporation', masterData.date_of_incorporation, CORP_REG_FIELD_INDICES.dateOfIncorporation);
    // Fix: Handle null values properly by converting to string
    setTreeField('numberOfPartners', masterData.number_of_partners ? String(masterData.number_of_partners) : '', CORP_REG_FIELD_INDICES.numberOfPartners);
    
    // Additional company details (indices 10-29) - only add if they exist in FIELD_INDICES
    if (CORP_REG_FIELD_INDICES.companyType !== undefined) {
      setTreeField('companyType', masterData.company_type, CORP_REG_FIELD_INDICES.companyType);
    }
    if (CORP_REG_FIELD_INDICES.companySubcategory !== undefined) {
      setTreeField('companySubcategory', masterData.company_subcategory, CORP_REG_FIELD_INDICES.companySubcategory);
    }
    if (CORP_REG_FIELD_INDICES.rocCode !== undefined) {
      setTreeField('rocCode', masterData.roc_code, CORP_REG_FIELD_INDICES.rocCode);
    }
    if (CORP_REG_FIELD_INDICES.registrarOfCompanies !== undefined) {
      setTreeField('registrarOfCompanies', masterData.registrar_of_companies, CORP_REG_FIELD_INDICES.registrarOfCompanies);
    }
    if (CORP_REG_FIELD_INDICES.email !== undefined) {
      setTreeField('email', masterData.email, CORP_REG_FIELD_INDICES.email);
    }
    if (CORP_REG_FIELD_INDICES.phone !== undefined) {
      setTreeField('phone', masterData.phone, CORP_REG_FIELD_INDICES.phone);
    }
    if (CORP_REG_FIELD_INDICES.website !== undefined) {
      setTreeField('website', masterData.website, CORP_REG_FIELD_INDICES.website);
    }
    if (CORP_REG_FIELD_INDICES.activityDescription !== undefined) {
      setTreeField('activityDescription', masterData.activity_description, CORP_REG_FIELD_INDICES.activityDescription);
    }
    if (CORP_REG_FIELD_INDICES.companyActivityCode !== undefined) {
      setTreeField('companyActivityCode', masterData.company_activity_code, CORP_REG_FIELD_INDICES.companyActivityCode);
    }
    if (CORP_REG_FIELD_INDICES.industrialClass !== undefined) {
      setTreeField('industrialClass', masterData.industrial_class, CORP_REG_FIELD_INDICES.industrialClass);
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
function createOptimizedComplianceData(
  extractedData: any,
  merkleRoot: Field
): CorporateRegistrationOptimComplianceData {
  return new CorporateRegistrationOptimComplianceData({
    name: extractedData.companyName || CircuitString.fromString(''),
    cin: extractedData.CIN || CircuitString.fromString(''),
    registration_number: extractedData.registrationNumber || CircuitString.fromString(''),
    company_status: extractedData.companyStatus || CircuitString.fromString(''),
    dateOfIncorporation: extractedData.dateOfIncorporation || CircuitString.fromString(''),
    category: extractedData.category || CircuitString.fromString(''),
    classOfCompany: extractedData.classOfCompany || CircuitString.fromString(''),
    numberOfPartners: extractedData.numberOfPartners || CircuitString.fromString(''),
    listed: extractedData.listed || CircuitString.fromString(''),
    suspended: extractedData.suspended || CircuitString.fromString(''),
    merkle_root: merkleRoot,
  });
}

// =================================== Main Single Company Verification Function ===================================
export async function getCorporateRegistrationOptimSingleCompanyVerificationWithSignUtils(cin: string) {
  console.log(`\n🚀 Corporate Registration Single Company Verification Test Started`);
  console.log(`🏢 CIN: ${cin}`);
  console.log(`📡 Using LIVE API for all environments`);

  try {
    // =================================== Setup Local Blockchain ===================================
    console.log('\n🔧 Setting up local blockchain...');
    // Import and use the existing Local blockchain instance from OracleRegistry
    const { Local } = await import('../../core/OracleRegistry.js');
    const localBlockchain = await Local;
    Mina.setActiveInstance(localBlockchain);
    
    // Use existing account setup from OracleRegistry
    const deployerAccount = MCAdeployerAccount();
    const deployerKey = MCAdeployerKey();
    const senderAccount = MCAsenderAccount();
    const senderKey = MCAsenderKey();

    // =================================== Compile Programs ===================================
    console.log('\n📝 Compiling ZK programs...');
    await CorporateRegistrationOptim.compile();
    console.log('✅ CorporateRegistrationOptim ZK program compiled');
    
    const { verificationKey } = await CorporateRegistrationOptimSingleCompanySmartContract.compile();
    console.log('✅ CorporateRegistrationOptimSingleCompanySmartContract compiled');

    // =================================== Deploy Smart Contract ===================================
    console.log('\n🚀 Deploying single company smart contract...');
    const zkAppKey = PrivateKey.random();
    const zkAppAddress = zkAppKey.toPublicKey();
    const zkApp = new CorporateRegistrationOptimSingleCompanySmartContract(zkAppAddress);

    const deployTxn = await Mina.transaction(
      deployerAccount,
      async () => {
        AccountUpdate.fundNewAccount(deployerAccount);
        await zkApp.deploy({ verificationKey });
      }
    );
    await deployTxn.sign([deployerKey, zkAppKey]).send();
    console.log('✅ Single company smart contract deployed successfully');

    // =================================== Fetch Corporate Registration Data ===================================
    console.log('\n📡 Fetching Corporate Registration data...');
    let apiResponse: CorporateRegistrationAPIResponse;
    try {
      apiResponse = await fetchCorporateRegistrationDataWithFullLogging(cin);
      console.log('✅ Corporate Registration data fetched successfully');
    } catch (err: any) {
      console.error('❌ Error fetching Corporate Registration data:', err.message);
      throw err;
    }

    // =================================== Analyze Compliance ===================================
    console.log('\n🔍 Analyzing compliance...');
    const complianceAnalysis = analyzeCorporateRegistrationCompliance(apiResponse);
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
    const { tree, extractedData, fieldCount } = createComprehensiveCorporateRegistrationMerkleTree(apiResponse);
    console.log(`✅ Merkle tree created with ${fieldCount} fields`);

    // =================================== Prepare ZK Proof Data ===================================
    console.log('\n🔐 Preparing ZK proof data...');
    const merkleRoot = tree.getRoot();
    const currentTimestamp = UInt64.from(Date.now());
    
    // Create optimized compliance data
    const complianceData = createOptimizedComplianceData(extractedData, merkleRoot);
    
    // Generate merkle witnesses for the 10 compliance fields
    const companyNameWitness = new CorporateRegistrationMerkleWitness8(tree.getWitness(BigInt(CORP_REG_FIELD_INDICES.companyName)));
    const cinWitness = new CorporateRegistrationMerkleWitness8(tree.getWitness(BigInt(CORP_REG_FIELD_INDICES.CIN)));
    const registrationNumberWitness = new CorporateRegistrationMerkleWitness8(tree.getWitness(BigInt(CORP_REG_FIELD_INDICES.registrationNumber)));
    const companyStatusWitness = new CorporateRegistrationMerkleWitness8(tree.getWitness(BigInt(CORP_REG_FIELD_INDICES.companyStatus)));
    const dateOfIncorporationWitness = new CorporateRegistrationMerkleWitness8(tree.getWitness(BigInt(CORP_REG_FIELD_INDICES.dateOfIncorporation)));
    const categoryWitness = new CorporateRegistrationMerkleWitness8(tree.getWitness(BigInt(CORP_REG_FIELD_INDICES.category)));
    const classOfCompanyWitness = new CorporateRegistrationMerkleWitness8(tree.getWitness(BigInt(CORP_REG_FIELD_INDICES.classOfCompany)));
    const numberOfPartnersWitness = new CorporateRegistrationMerkleWitness8(tree.getWitness(BigInt(CORP_REG_FIELD_INDICES.numberOfPartners)));
    const listedWitness = new CorporateRegistrationMerkleWitness8(tree.getWitness(BigInt(CORP_REG_FIELD_INDICES.listed)));
    const suspendedWitness = new CorporateRegistrationMerkleWitness8(tree.getWitness(BigInt(CORP_REG_FIELD_INDICES.suspended)));

    // =================================== Oracle Signature ===================================
    console.log('\n🔏 Generating oracle signature...');
    const registryPrivateKey = getPrivateKeyFor('MCA');
    const oracleSignature = Signature.create(registryPrivateKey, [merkleRoot]);
    console.log('✅ Oracle signature generated');

    // =================================== Generate ZK Proof ===================================
    console.log('\n⚡ Generating ZK proof...');
    console.log(`📊 Proving compliance for: ${complianceData.name.toString()}`);
    console.log(`🆔 CIN: ${complianceData.cin.toString()}`);
    console.log(`📋 Registration Number: ${complianceData.registration_number.toString()}`);
    console.log(`📈 Company Status: ${complianceData.company_status.toString()}`);

    const proof = await CorporateRegistrationOptim.proveOptimizedCompliance(
      currentTimestamp,
      complianceData,
      oracleSignature,
      companyNameWitness,
      cinWitness,
      registrationNumberWitness,
      companyStatusWitness,
      dateOfIncorporationWitness,
      categoryWitness,
      classOfCompanyWitness,
      numberOfPartnersWitness,
      listedWitness,
      suspendedWitness,
    );
    console.log('✅ ZK proof generated successfully');

    // =================================== Verify Proof on Single Company Smart Contract ===================================
    console.log('\n🔍 Verifying proof on single company smart contract...');
    console.log('📊 Initial smart contract state:');
    console.log(`  Company Identifier Hash: "${zkApp.companyIdentifierHash.get().toString()}"`);
    console.log(`  Company Name Hash: "${zkApp.companyNameHash.get().toString()}"`);
    console.log(`  Jurisdiction Hash: "${zkApp.jurisdictionHash.get().toString()}"`);
    console.log(`  CorpRegCompliant: ${zkApp.corpRegCompliant.get().toJSON()}`);
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
    console.log(`  CorpRegCompliant: ${zkApp.corpRegCompliant.get().toJSON()}`);
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

    // =================================== Summary ===================================
    console.log('\n🎉 Corporate Registration Single Company Verification Completed Successfully!');
    console.log('📈 Summary:');
    console.log(`  • Contract Type: Single Company (Enhanced)`);
    console.log(`  • Company: ${complianceData.name.toString()}`);
    console.log(`  • CIN: ${complianceData.cin.toString()}`);
    console.log(`  • Registration Number: ${complianceData.registration_number.toString()}`);
    console.log(`  • Company Status: ${complianceData.company_status.toString()}`);
    console.log(`  • CorpReg Compliant: ${zkApp.corpRegCompliant.get().toJSON()}`);
    console.log(`  • Compliance Score: ${complianceAnalysis.complianceScore}%`);
    console.log(`  • Contract Verification Count: ${zkApp.totalVerifications.get().toJSON()}`);
    console.log(`  • Company Identity Locked: ✅`);
    console.log(`  • Historical Tracking: ✅`);
    console.log(`  • Multiple Verifications Support: ✅`);


    return proof;

  } catch (error) {
    console.error('❌ Error in Corporate Registration Single Company Verification:', error);
    throw error;
  }
}
