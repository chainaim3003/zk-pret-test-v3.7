import * as dotenv from 'dotenv';
dotenv.config();

import { Field, Mina, PrivateKey, AccountUpdate, CircuitString, Poseidon, Signature, MerkleTree, UInt64, Bool } from 'o1js';
import { 
  CorporateRegistrationOptim, 
  CorporateRegistrationOptimComplianceData, 
  CorporateRegistrationMerkleWitness8, 
  CORP_REG_MERKLE_TREE_HEIGHT,
  CORP_REG_FIELD_INDICES 
} from '../../zk-programs/compliance/CorporateRegistrationZKProgram.js';
import { 
  CorporateRegistrationOptimMultiCompanySmartContract,
  CorporateRegistrationCompanyRecord,
  CompanyMerkleWitness,
  COMPANY_MERKLE_HEIGHT
} from '../../contracts/complaince/CorpReg/CorporateRegistrationMultiSmartContract.js';
import { MCAdeployerAccount, MCAsenderAccount, MCAdeployerKey, MCAsenderKey, getPrivateKeyFor } from '../../core/OracleRegistry.js';
import { 
  fetchCorporateRegistrationDataWithFullLogging, 
  CorporateRegistrationAPIResponse,
  extractCorporateRegistrationSummary,
  analyzeCorporateRegistrationCompliance
} from '../../utils/domain/compliance/CorpReg/CorporateRegistrationCoreAPIUtils.js';

// =================================== Multi-Company Registry Management ===================================

/**
 * Company registry for managing multiple companies in merkle tree
 */
class CompanyRegistry {
  private companiesTree: MerkleTree;
  private companyRecords: Map<string, { record: CorporateRegistrationCompanyRecord; index: number }>;
  private nextIndex: number;

  constructor() {
    this.companiesTree = new MerkleTree(COMPANY_MERKLE_HEIGHT);
    this.companyRecords = new Map();
    this.nextIndex = 0;
  }

  /**
   * Add or update a company in the registry
   */
  addOrUpdateCompany(cin: string, companyRecord: CorporateRegistrationCompanyRecord): CompanyMerkleWitness {
    let index: number;
    
    if (this.companyRecords.has(cin)) {
      // Update existing company
      index = this.companyRecords.get(cin)!.index;
      console.log(`📝 Updating existing company at index ${index}: ${cin}`);
    } else {
      // Add new company
      index = this.nextIndex++;
      console.log(`➕ Adding new company at index ${index}: ${cin}`);
    }
    
    // Calculate company record hash using the same method as the smart contract
    const companyHash = Poseidon.hash([
      companyRecord.cinHash,
      companyRecord.companyNameHash,
      companyRecord.jurisdictionHash,
      companyRecord.isCompliant.toField(),
      companyRecord.complianceScore,
      companyRecord.totalVerifications,
      companyRecord.lastVerificationTime.value,
      companyRecord.firstVerificationTime.value
    ]);
    
    // Update merkle tree
    this.companiesTree.setLeaf(BigInt(index), companyHash);
    
    // Store company record
    this.companyRecords.set(cin, { record: companyRecord, index });
    
    // Return witness for this company
    return new CompanyMerkleWitness(this.companiesTree.getWitness(BigInt(index)));
  }

  /**
   * Get merkle witness for a company
   */
  getCompanyWitness(cin: string): CompanyMerkleWitness | null {
    const entry = this.companyRecords.get(cin);
    if (!entry) return null;
    
    return new CompanyMerkleWitness(this.companiesTree.getWitness(BigInt(entry.index)));
  }

  /**
   * Get company record
   */
  getCompanyRecord(cin: string): CorporateRegistrationCompanyRecord | null {
    const entry = this.companyRecords.get(cin);
    return entry ? entry.record : null;
  }

  /**
   * Get merkle root of companies tree
   */
  getRoot(): Field {
    return this.companiesTree.getRoot();
  }

  /**
   * Get all tracked companies
   */
  getAllCompanies(): string[] {
    return Array.from(this.companyRecords.keys());
  }

  /**
   * Get total number of companies
   */
  getTotalCompanies(): number {
    return this.companyRecords.size;
  }
}

// =================================== Corporate Registration Data Processing Functions ===================================

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
function createOptimizedCorporateRegistrationComplianceData(
  extractedData: any,
  merkleRoot: Field
): CorporateRegistrationOptimComplianceData {
  return new CorporateRegistrationOptimComplianceData({
    companyName: extractedData.companyName || CircuitString.fromString(''),
    CIN: extractedData.CIN || CircuitString.fromString(''),
    registrationNumber: extractedData.registrationNumber || CircuitString.fromString(''),
    companyStatus: extractedData.companyStatus || CircuitString.fromString(''),
    dateOfIncorporation: extractedData.dateOfIncorporation || CircuitString.fromString(''),
    category: extractedData.category || CircuitString.fromString(''),
    classOfCompany: extractedData.classOfCompany || CircuitString.fromString(''),
    numberOfPartners: extractedData.numberOfPartners || CircuitString.fromString(''),
    listed: extractedData.listed || CircuitString.fromString(''),
    suspended: extractedData.suspended || CircuitString.fromString(''),
    merkle_root: merkleRoot,
  });
}

/**
 * Create a company record from Corporate Registration compliance data and verification info
 */
function createCompanyRecord(
  complianceData: CorporateRegistrationOptimComplianceData,
  isCompliant: Bool,
  verificationTimestamp: UInt64,
  isFirstVerification: boolean = true
): CorporateRegistrationCompanyRecord {
  const currentTime = verificationTimestamp;
  
  return new CorporateRegistrationCompanyRecord({
    cinHash: complianceData.CIN.hash(),
    companyNameHash: complianceData.companyName.hash(),
    jurisdictionHash: CircuitString.fromString('India').hash(), // Corporate Registration is India-specific
    isCompliant: isCompliant,
    complianceScore: isCompliant.toField().mul(100), // 100 if compliant, 0 if not
    totalVerifications: Field(1), // This will be updated if company already exists
    lastVerificationTime: currentTime,
    firstVerificationTime: currentTime // Set to current time for new verifications
  });
}

// =================================== Main Multi-Company Verification Function ===================================

export async function getCorporateRegistrationOptimMultiCompanyVerificationWithSignUtils(
  companyNames: string[], 
) {
  console.log(`\n🚀 Corporate Registration Multi-Company Verification Test Started`);
  console.log(`🏢 Companies: ${companyNames.join(', ')}`);
  //console.log(`🌐 Network: ${typeOfNet}`);
  console.log(`📊 Total Companies: ${companyNames.length}`);

  try {
    // =================================== Setup Local Blockchain ===================================
    console.log('\n🔧 Setting up local blockchain...');
    const { Local } = await import('../../core/OracleRegistry.js');
    const localBlockchain = await Local;
    Mina.setActiveInstance(localBlockchain);
    
    const deployerAccount = MCAdeployerAccount();
    const deployerKey = MCAdeployerKey();
    const senderAccount = MCAsenderAccount();
    const senderKey = MCAsenderKey();

    // =================================== Compile Programs ===================================
    console.log('\n📝 Compiling ZK programs...');
    await CorporateRegistrationOptim.compile();
    console.log('✅ CorporateRegistrationOptim ZK program compiled');
    
    const { verificationKey } = await CorporateRegistrationOptimMultiCompanySmartContract.compile();
    console.log('✅ CorporateRegistrationOptimMultiCompanySmartContract compiled');

    // =================================== Deploy Multi-Company Smart Contract ===================================
    console.log('\n🚀 Deploying multi-company smart contract...');
    const zkAppKey = PrivateKey.random();
    const zkAppAddress = zkAppKey.toPublicKey();
    const zkApp = new CorporateRegistrationOptimMultiCompanySmartContract(zkAppAddress);

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
        // =================================== Fetch Corporate Registration Data ===================================
        console.log(`\n📡 Fetching Corporate Registration data for ${companyName}...`);
        const apiResponse: CorporateRegistrationAPIResponse = await fetchCorporateRegistrationDataWithFullLogging(companyName);
        console.log(`✅ Corporate Registration data fetched successfully for ${companyName}`);

        // =================================== Analyze Compliance ===================================
        console.log(`\n🔍 Analyzing compliance for ${companyName}...`);
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
        console.log(`\n🌳 Creating comprehensive Merkle tree for ${companyName}...`);
        const { tree, extractedData, fieldCount } = createComprehensiveCorporateRegistrationMerkleTree(apiResponse);
        console.log(`✅ Merkle tree created with ${fieldCount} fields`);

        // =================================== Prepare ZK Proof Data ===================================
        console.log(`\n🔐 Preparing ZK proof data for ${companyName}...`);
        const merkleRoot = tree.getRoot();
        const currentTimestamp = UInt64.from(Date.now());
        
        // Create optimized compliance data
        const complianceData = createOptimizedCorporateRegistrationComplianceData(extractedData, merkleRoot);
        
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
        console.log(`\n🔏 Generating oracle signature for ${companyName}...`);
        const registryPrivateKey = getPrivateKeyFor('MCA');
        const oracleSignature = Signature.create(registryPrivateKey, [merkleRoot]);
        console.log('✅ Oracle signature generated');

        // =================================== Generate ZK Proof ===================================
        console.log(`\n⚡ Generating ZK proof for ${companyName}...`);
        console.log(`📊 Proving compliance for: ${complianceData.companyName.toString()}`);
        console.log(`🆔 CIN: ${complianceData.CIN.toString()}`);
        console.log(`📋 Registration Number: ${complianceData.registrationNumber.toString()}`);
        console.log(`📍 Company Status: ${complianceData.companyStatus.toString()}`);

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
        console.log(`✅ ZK proof generated successfully for ${companyName}`);
        proofs.push(proof);

        // =================================== Add Company to Registry ===================================
        console.log(`\n📋 Adding ${companyName} to company registry...`);
        const isCompliant = proof.publicOutput.isCorpRegCompliant;
        const companyRecord = createCompanyRecord(complianceData, isCompliant, currentTimestamp, true);
        const cin = complianceData.CIN.toString();
        
        // Add company to registry and get witness
        const companyWitness = companyRegistry.addOrUpdateCompany(cin, companyRecord);
        console.log(`✅ Company added to registry. Total companies: ${companyRegistry.getTotalCompanies()}`);

        // =================================== Verify Proof on Multi-Company Smart Contract ===================================
        console.log(`\n🔍 Verifying proof on multi-company smart contract for ${companyName}...`);
        
        // Show contract state before verification
        console.log('📊 Contract state before verification:');
        const stateBefore = zkApp.getRegistryInfo();
        console.log(`  Total Companies: ${stateBefore.totalCompaniesTracked.toString()}`);
        console.log(`  Compliant Companies: ${stateBefore.compliantCompaniesCount.toString()}`);
        console.log(`  Global Compliance Score: ${stateBefore.globalComplianceScore.toString()}`);
        console.log(`  Total Verifications: ${stateBefore.totalVerificationsGlobal.toString()}`);

        const txn = await Mina.transaction(
          senderAccount,
          async () => {
            await zkApp.verifyOptimizedComplianceWithProof(proof, companyWitness, companyRecord);
          }
        );

        await txn.prove();
        await txn.sign([senderKey]).send();

        console.log(`✅ Proof verified on multi-company smart contract for ${companyName}!`);
        
        // Show contract state after verification
        console.log('📊 Contract state after verification:');
        const stateAfter = zkApp.getRegistryInfo();
        console.log(`  Total Companies: ${stateAfter.totalCompaniesTracked.toString()}`);
        console.log(`  Compliant Companies: ${stateAfter.compliantCompaniesCount.toString()}`);
        console.log(`  Global Compliance Score: ${stateAfter.globalComplianceScore.toString()}`);
        console.log(`  Total Verifications: ${stateAfter.totalVerificationsGlobal.toString()}`);
        console.log(`  Companies Root Hash: ${stateAfter.companiesRootHash.toString()}`);
        console.log(`  Registry Version: ${stateAfter.registryVersion.toString()}`);

        // Store verification result
        verificationResults.push({
          companyName,
          cin: complianceData.CIN.toString(),
          isCompliant: isCompliant.toJSON(),
          complianceScore: complianceAnalysis.complianceScore,
          verificationTime: currentTimestamp.toString()
        });

      } catch (err: any) {
        console.error(`❌ Error processing ${companyName}:`, err.message);
        // Continue with other companies instead of stopping
        verificationResults.push({
          companyName,
          cin: 'ERROR',
          isCompliant: false,
          complianceScore: 0,
          verificationTime: Date.now().toString(),
          error: err.message
        });
        continue;
      }
    }

    // =================================== Final Registry Analysis ===================================
    console.log(`\n${'='.repeat(80)}`);
    console.log(`🎉 Corporate Registration Multi-Company Verification Completed!`);
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
      if (result.cin !== 'ERROR') {
        console.log(`     CIN: ${result.cin}`);
        console.log(`     Score: ${result.complianceScore}%`);
      }
      if (result.error) {
        console.log(`     Error: ${result.error}`);
      }
    });

    console.log('\n📋 Contract Features Demonstrated:');
    console.log(`  • Multi-Company Tracking: ✅`);
    console.log(`  • Global Compliance Metrics: ✅`);
    console.log(`  • Company Registry Management: ✅`);
    console.log(`  • Merkle Tree Storage: ✅`);
    console.log(`  • Aggregate Statistics: ✅`);
    console.log(`  • Individual Company Verification: ✅`);

    return {
      proofs,
      totalCompanies: companyRegistry.getTotalCompanies(),
      companyRegistry: companyRegistry,
      contractState: zkApp.getRegistryInfo(),
      globalStats: zkApp.getGlobalComplianceStats(),
      verificationResults
    };

  } catch (error) {
    console.error('❌ Error in Corporate Registration Multi-Company Verification:', error);
    throw error;
  }
}

/**
 * Helper function to verify a single company in an existing multi-company contract
 */
export async function verifySingleCompanyInMultiContract(
  companyName: string,
  zkApp: CorporateRegistrationOptimMultiCompanySmartContract,
  companyRegistry: CompanyRegistry
) {
  console.log(`\n🔍 Verifying single company: ${companyName}`);
  
  // This function can be used to add additional companies to an existing registry
  // For now, return info about what would be needed
  console.log('💡 Use the main getCorporateRegistrationOptimMultiCompanyVerificationWithSignUtils function');
  console.log('📝 This function would follow the same pattern as in the main loop');
  
  return {
    message: 'Single company verification in multi-contract ready for implementation',
    suggestion: 'Use main verification function for complete flow'
  };
}
