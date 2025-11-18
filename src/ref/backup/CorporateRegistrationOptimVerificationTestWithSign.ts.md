import * as dotenv from 'dotenv';
dotenv.config();

import { Field, Mina, PrivateKey, AccountUpdate, CircuitString, Poseidon, Signature, MerkleTree, UInt64 } from 'o1js';
import { 
  CorporateRegistrationOptim, 
  CorporateRegistrationOptimComplianceData, 
  CorporateRegistrationMerkleWitness8, 
  CORP_REG_MERKLE_TREE_HEIGHT,
  CORP_REG_FIELD_INDICES 
} from '../../zk-programs/with-sign/CorporateRegistrationOptimZKProgram.js';
import { CorporateRegistrationOptimSmartContract } from '../../contracts/with-sign/CorporateRegistrationOptimSmartContract.js';
import { MCAdeployerAccount, MCAsenderAccount, MCAdeployerKey, MCAsenderKey, getPrivateKeyFor } from '../../core/OracleRegistry.js';
import { 
  fetchCorporateRegistrationDataWithFullLogging, 
  CorporateRegistrationAPIResponse,
  extractCorporateRegistrationSummary,
  analyzeCorporateRegistrationCompliance
} from './CorporateRegistrationCoreAPIUtils.js';

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

  let typeOfNet = process.env.BUILD_ENV;
  try {
    if (typeOfNet === 'LOCAL') {
      // Handle LOCAL mock data structure
      console.log('📋 Processing LOCAL mock data structure...');
      
      // Core compliance fields
      setTreeField('companyName', apiResponse['Company Name'], CORP_REG_FIELD_INDICES.companyName);
      setTreeField('category', apiResponse['Category'], CORP_REG_FIELD_INDICES.category);
      setTreeField('classOfCompany', apiResponse['Class of Company'], CORP_REG_FIELD_INDICES.classOfCompany);
      setTreeField('registrationNumber', apiResponse['Registration Number'], CORP_REG_FIELD_INDICES.registrationNumber);
      setTreeField('listed', apiResponse['Listed'], CORP_REG_FIELD_INDICES.listed);
      setTreeField('suspended', apiResponse['Suspended'], CORP_REG_FIELD_INDICES.suspended);
      setTreeField('CIN', apiResponse['CIN'], CORP_REG_FIELD_INDICES.CIN);
      setTreeField('companyStatus', apiResponse['Active Compliance'], CORP_REG_FIELD_INDICES.companyStatus);
      setTreeField('dateOfIncorporation', apiResponse['Date of Incorporation'], CORP_REG_FIELD_INDICES.dateOfIncorporation);
      setTreeField('numberOfPartners', apiResponse['Number of Partners'], CORP_REG_FIELD_INDICES.numberOfPartners);
      
      // Set additional fields if available in mock data
      Object.keys(apiResponse).forEach((key) => {
        // Skip fields we've already processed
        const processedFields = ['Company Name', 'Category', 'Class of Company', 'Registration Number', 
                               'Listed', 'Suspended', 'CIN', 'Active Compliance', 'Date of Incorporation', 'Number of Partners'];
        
        if (!processedFields.includes(key) && fieldCount < 100) {
          // Use a simple incremental index for additional fields
          setTreeField(key.replace(/[^a-zA-Z0-9]/g, '_'), apiResponse[key], fieldCount + 100);
        }
      });
      
    } else {
      // Handle SANDBOX/PROD API structure
      console.log('📋 Processing Production API structure...');
      const masterData = apiResponse.data?.company_master_data || {};
      
      // Core compliance fields (indices 0-9)
      setTreeField('companyName', masterData.company_name, CORP_REG_FIELD_INDICES.companyName);
      setTreeField('category', masterData.company_category, CORP_REG_FIELD_INDICES.category);
      setTreeField('classOfCompany', masterData.class_of_company, CORP_REG_FIELD_INDICES.classOfCompany);
      setTreeField('registrationNumber', masterData.registration_number, CORP_REG_FIELD_INDICES.registrationNumber);
      setTreeField('listed', masterData.listing_status, CORP_REG_FIELD_INDICES.listed);
      setTreeField('suspended', masterData.suspended_at_stock_exchange, CORP_REG_FIELD_INDICES.suspended);
      setTreeField('CIN', masterData.cin, CORP_REG_FIELD_INDICES.CIN);
      setTreeField('companyStatus', masterData.company_status || masterData['company_status(for_efiling)'], CORP_REG_FIELD_INDICES.companyStatus);
      setTreeField('dateOfIncorporation', masterData.date_of_incorporation, CORP_REG_FIELD_INDICES.dateOfIncorporation);
      setTreeField('numberOfPartners', masterData.number_of_partners, CORP_REG_FIELD_INDICES.numberOfPartners);
      
      // Additional company details (indices 10-29)
      setTreeField('companyType', masterData.company_type, CORP_REG_FIELD_INDICES.companyType);
      setTreeField('companySubcategory', masterData.company_subcategory, CORP_REG_FIELD_INDICES.companySubcategory);
      setTreeField('rocCode', masterData.roc_code, CORP_REG_FIELD_INDICES.rocCode);
      setTreeField('registrarOfCompanies', masterData.registrar_of_companies, CORP_REG_FIELD_INDICES.registrarOfCompanies);
      setTreeField('email', masterData.email, CORP_REG_FIELD_INDICES.email);
      setTreeField('phone', masterData.phone, CORP_REG_FIELD_INDICES.phone);
      setTreeField('website', masterData.website, CORP_REG_FIELD_INDICES.website);
      setTreeField('activityDescription', masterData.activity_description, CORP_REG_FIELD_INDICES.activityDescription);
      setTreeField('companyActivityCode', masterData.company_activity_code, CORP_REG_FIELD_INDICES.companyActivityCode);
      setTreeField('industrialClass', masterData.industrial_class, CORP_REG_FIELD_INDICES.industrialClass);
      setTreeField('mcaId', masterData.mca_id, CORP_REG_FIELD_INDICES.mcaId);
      setTreeField('jurisdiction', masterData.jurisdiction, CORP_REG_FIELD_INDICES.jurisdiction);
      setTreeField('legalForm', masterData.legal_form, CORP_REG_FIELD_INDICES.legalForm);
      setTreeField('llpinDetails', masterData.llpin_details, CORP_REG_FIELD_INDICES.llpinDetails);
      setTreeField('foreignCompanyDetails', masterData.foreign_company_details, CORP_REG_FIELD_INDICES.foreignCompanyDetails);
      
      // Address fields (indices 30-49)
      setTreeField('registeredAddressLine1', masterData.registered_address_line1, CORP_REG_FIELD_INDICES.registeredAddressLine1);
      setTreeField('registeredAddressLine2', masterData.registered_address_line2, CORP_REG_FIELD_INDICES.registeredAddressLine2);
      setTreeField('registeredCity', masterData.registered_city, CORP_REG_FIELD_INDICES.registeredCity);
      setTreeField('registeredState', masterData.registered_state, CORP_REG_FIELD_INDICES.registeredState);
      setTreeField('registeredCountry', masterData.registered_country, CORP_REG_FIELD_INDICES.registeredCountry);
      setTreeField('registeredPincode', masterData.registered_pincode, CORP_REG_FIELD_INDICES.registeredPincode);
      setTreeField('corporateAddressLine1', masterData.corporate_address_line1, CORP_REG_FIELD_INDICES.corporateAddressLine1);
      setTreeField('corporateAddressLine2', masterData.corporate_address_line2, CORP_REG_FIELD_INDICES.corporateAddressLine2);
      setTreeField('corporateCity', masterData.corporate_city, CORP_REG_FIELD_INDICES.corporateCity);
      setTreeField('corporateState', masterData.corporate_state, CORP_REG_FIELD_INDICES.corporateState);
      setTreeField('corporateCountry', masterData.corporate_country, CORP_REG_FIELD_INDICES.corporateCountry);
      setTreeField('corporatePincode', masterData.corporate_pincode, CORP_REG_FIELD_INDICES.corporatePincode);
      
      // Financial fields (indices 50-69)
      setTreeField('authorizedCapital', masterData.authorized_capital, CORP_REG_FIELD_INDICES.authorizedCapital);
      setTreeField('paidUpCapital', masterData.paid_up_capital, CORP_REG_FIELD_INDICES.paidUpCapital);
      setTreeField('numberOfMembers', masterData.number_of_members, CORP_REG_FIELD_INDICES.numberOfMembers);
      setTreeField('lastAgmDate', masterData.last_agm_date, CORP_REG_FIELD_INDICES.lastAgmDate);
      setTreeField('lastBsDate', masterData.last_bs_date, CORP_REG_FIELD_INDICES.lastBsDate);
      setTreeField('lastAnnualReturnDate', masterData.last_annual_return_date, CORP_REG_FIELD_INDICES.lastAnnualReturnDate);
      setTreeField('listingStatus', masterData.listing_status, CORP_REG_FIELD_INDICES.listingStatus);
      setTreeField('suspendedAtStockExchange', masterData.suspended_at_stock_exchange, CORP_REG_FIELD_INDICES.suspendedAtStockExchange);
      
      // Directors and governance (indices 70-89)
      setTreeField('numberOfDirectors', masterData.number_of_directors, CORP_REG_FIELD_INDICES.numberOfDirectors);
      setTreeField('directorDetails', masterData.director_details, CORP_REG_FIELD_INDICES.directorDetails);
      setTreeField('complianceStatus', masterData.compliance_status, CORP_REG_FIELD_INDICES.complianceStatus);
      setTreeField('filingStatus', masterData.filing_status, CORP_REG_FIELD_INDICES.filingStatus);
      
      // Legal and regulatory (indices 90-119)
      setTreeField('strikeOffDetails', masterData.strike_off_details, CORP_REG_FIELD_INDICES.strikeOffDetails);
      setTreeField('dormantStatus', masterData.dormant_status, CORP_REG_FIELD_INDICES.dormantStatus);
      setTreeField('nbfcRegistration', masterData.nbfc_registration, CORP_REG_FIELD_INDICES.nbfcRegistration);
      setTreeField('prosecutionLaunched', masterData.prosecution_launched, CORP_REG_FIELD_INDICES.prosecutionLaunched);
      
      // Additional metadata (indices 120+)
      setTreeField('createdAt', masterData.created_at, CORP_REG_FIELD_INDICES.createdAt);
      setTreeField('updatedAt', masterData.updated_at, CORP_REG_FIELD_INDICES.updatedAt);
      setTreeField('dataSource', masterData.data_source, CORP_REG_FIELD_INDICES.dataSource);
      setTreeField('apiVersion', masterData.api_version, CORP_REG_FIELD_INDICES.apiVersion);
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

// =================================== Main Test Function ===================================
export async function getCorporateRegistrationOptimVerification(cin: string) {
  console.log(`\n🚀 Corporate Registration Optimized Verification Test Started`);
  console.log(`🏢 CIN: ${cin}`);
  //console.log(`🌐 Network: ${typeOfNet}`);
  console.log(`📡 Using LIVE API for all environments`);

  try {
    // =================================== Compile Programs ===================================
    console.log('\n📝 Compiling ZK programs...');
    await CorporateRegistrationOptim.compile();
    console.log('✅ CorporateRegistrationOptim ZK program compiled');
    
    const { verificationKey } = await CorporateRegistrationOptimSmartContract.compile();
    console.log('✅ CorporateRegistrationOptimSmartContract compiled');

    // =================================== Deploy Smart Contract ===================================
    console.log('\n🚀 Deploying smart contract...');
    const zkAppKey = PrivateKey.random();
    const zkAppAddress = zkAppKey.toPublicKey();
    const zkApp = new CorporateRegistrationOptimSmartContract(zkAppAddress);

    const deployTxn = await Mina.transaction(
      MCAdeployerAccount(),
      async () => {
        AccountUpdate.fundNewAccount(MCAdeployerAccount());
        await zkApp.deploy({ verificationKey });
      }
    );
    await deployTxn.sign([MCAdeployerKey(), zkAppKey]).send();
    console.log('✅ Smart contract deployed successfully');

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
    console.log(`📊 Proving compliance for: ${complianceData.companyName.toString()}`);
    console.log(`🆔 CIN: ${complianceData.CIN.toString()}`);
    console.log(`📋 Registration Number: ${complianceData.registrationNumber.toString()}`);
    console.log(`📈 Company Status: ${complianceData.companyStatus.toString()}`);
    console.log(`📅 Date of Incorporation: ${complianceData.dateOfIncorporation.toString()}`);

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

    // =================================== Verify Proof on Smart Contract ===================================
    console.log('\n🔍 Verifying proof on smart contract...');
    console.log('📊 Initial smart contract state:');
    console.log(`  CorpRegCompliant: ${zkApp.corpRegCompliant.get().toJSON()}`);
    console.log(`  Total Verifications: ${zkApp.totalVerifications.get().toJSON()}`);
    console.log(`  Last Verification Time: ${zkApp.lastVerificationTime.get().toJSON()}`);
    console.log(`  Total Companies Verified: ${zkApp.totalCompaniesVerified.get().toJSON()}`);

    const txn = await Mina.transaction(
      MCAsenderAccount(),
      async () => {
        await zkApp.verifyOptimizedComplianceWithProof(proof);
      }
    );

    await txn.prove();
    await txn.sign([MCAsenderKey()]).send();

    console.log('✅ Proof verified on smart contract!');
    console.log('📊 Final smart contract state:');
    console.log(`  CorpRegCompliant: ${zkApp.corpRegCompliant.get().toJSON()}`);
    console.log(`  Total Verifications: ${zkApp.totalVerifications.get().toJSON()}`);
    console.log(`  Last Verification Time: ${zkApp.lastVerificationTime.get().toJSON()}`);
    console.log(`  Total Companies Verified: ${zkApp.totalCompaniesVerified.get().toJSON()}`);

    // =================================== Summary ===================================
    console.log('\n🎉 Corporate Registration Optimized Verification Completed Successfully!');
    console.log('📈 Summary:');
    console.log(`  • Company: ${complianceData.companyName.toString()}`);
    console.log(`  • CIN: ${complianceData.CIN.toString()}`);
    console.log(`  • Registration Number: ${complianceData.registrationNumber.toString()}`);
    console.log(`  • Company Status: ${complianceData.companyStatus.toString()}`);
    console.log(`  • Category: ${complianceData.category.toString()}`);
    console.log(`  • Class of Company: ${complianceData.classOfCompany.toString()}`);
    console.log(`  • CorpReg Compliant: ${zkApp.corpRegCompliant.get().toJSON()}`);
    console.log(`  • Compliance Score: ${complianceAnalysis.complianceScore}%`);
    console.log(`  • Verification Count: ${zkApp.totalVerifications.get().toJSON()}`);
    console.log(`  • Last Verification: ${zkApp.lastVerificationTime.get().toJSON()}`);
    console.log(`  • Merkle Tree Fields: ${fieldCount}`);
    console.log(`  • Witnesses Generated: 10 compliance fields`);
    console.log(`  • Privacy: ${fieldCount - 10} fields remain hidden`);

    return proof;

  } catch (error) {
    console.error('❌ Error in Corporate Registration Optimized Verification:', error);
    throw error;
  }
}

// =================================== Direct Execution ===================================
// GLEIF-style execution (this works!)
async function main() {
  const args = process.argv.slice(2);
  const cin = args[0] || process.env.CIN || 'U01112TZ2022PTC039493';
  //const networkType = args[1] || 'TESTNET';
  
  console.log('🏢 CIN:', cin);
  //console.log('🌐 Network Type:', networkType);
  
  try {
    const proof = await getCorporateRegistrationOptimVerification(cin);
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
