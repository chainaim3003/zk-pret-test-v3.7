import axios from 'axios';
import * as dotenv from 'dotenv';
dotenv.config();

/**
 * Enhanced GLEIF Utils with complete JSON printing and ZK optimization analysis
 */

// =================================== Type Definitions ===================================
export interface GLEIFAPIResponse {
  data?: any;
  [key: string]: any;
}

export interface GLEIFComplianceAnalysis {
  isCompliant: boolean;
  complianceScore: number;
  issues: string[];
  summary: string;
}

export interface GLEIFDataSummary {
  legalName: string;
  lei: string;
  entityStatus: string;
  jurisdiction: string;
  legalForm: string;
  complianceScore: number;
}

/**
 * Fetch company data from GLEIF API with enhanced Stage 1 logging
 */
export async function fetchGLEIFDataWithFullLogging(companyName: string): Promise<GLEIFAPIResponse> {
  console.log(`🔍 STAGE 1: Two-Stage Lookup - Resolving company name to LEI`);
  console.log(`📋 Company Name: "${companyName}"`);
  
  // Enhanced: Clean the company name first
  const cleanCompanyName = companyName
    .trim()
    .replace(/\^/g, '') // Remove any ^ characters
    .replace(/[^\w\s\&\.\'\_]/g, '') // Keep only safe characters
    .replace(/\s+/g, ' '); // Normalize spaces
    
  console.log(`🧹 Normalized: "${cleanCompanyName}"`);
  
  try {
    const apiResponse = await fetchGLEIFCompanyDataWithFullDetails(cleanCompanyName);
    
    // Enhanced LEI extraction and validation
    const lei = extractLEIFromGLEIFResponse(apiResponse);
    const legalName = apiResponse.data[0].attributes?.entity?.legalName?.name;
    
    console.log(`✅ STAGE 1 SUCCESS: Name resolved to LEI`);
    console.log(`   LEI: ${lei}`);
    console.log(`   Legal Name: ${legalName}`);
    console.log(`   Status: ${apiResponse.data[0].attributes?.entity?.status}`);
    
    return apiResponse;
    
  } catch (error) {
    console.error(`❌ STAGE 1 FAILED: Could not resolve "${companyName}" to LEI`);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Company name resolution failed: ${errorMessage}`);
  }
}

/**
 * LEI extraction utility for two-stage lookup
 */
export function extractLEIFromGLEIFResponse(apiResponse: GLEIFAPIResponse): string {
  if (!apiResponse.data || apiResponse.data.length === 0) {
    throw new Error('No GLEIF data available for LEI extraction');
  }
  
  const lei = apiResponse.data[0].attributes?.lei;
  if (!lei) {
    throw new Error('LEI not found in GLEIF response');
  }
  
  if (!validateLEI(lei)) {
    throw new Error(`Invalid LEI format: ${lei}`);
  }
  
  return lei;
}

/**
 * LEI validation (ISO 17442 standard)
 */
export function validateLEI(lei: string): boolean {
  const leiRegex = /^[A-Z0-9]{20}$/;
  return leiRegex.test(lei);
}

/**
 * Original GLEIF API function (used by enhanced wrapper)
 */
export async function fetchGLEIFCompanyDataWithFullDetails(companyName: string): Promise<any> {
  let BASEURL;
  let url;

  let typeOfNet = process.env.BUILD_ENV;
  if (!typeOfNet) {
    typeOfNet = 'TESTNET';
  }

  console.log('Company Name:', companyName);
  console.log('Type of Network:', typeOfNet);

  if (typeOfNet === 'TESTNET') {
    console.log('+++++++++++++++++++++++++++++++++++++++++++++++++++++in sandbox++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++');
    BASEURL = process.env.GLEIF_URL_SANDBOX;
    url = `${BASEURL}?filter[entity.legalName]=${encodeURIComponent(companyName)}`;
  } 
  else if (typeOfNet === 'LOCAL') {
    console.log('------------------------------------------------using live GLEIF API--------------------------------------------------');
    BASEURL = process.env.GLEIF_URL_MOCK; 
    url = `${BASEURL}?filter[entity.legalName]=${encodeURIComponent(companyName)}`;
  } 
  else {
    console.log('///////////////////////////////////////////////in prod//////////////////////////////////////////////');
    BASEURL = process.env.GLEIF_URL_PROD;
    url = `${BASEURL}?filter[entity.legalName]=${encodeURIComponent(companyName)}`;
  }

  if (!BASEURL) {
    throw new Error('BASEURL is not set in the environment variables.');
  }
  if (!companyName) {
    throw new Error('Company name is required.');
  }

  const response = await axios.get(url);
  const parsedData = response.data;

  console.log('\n🔍 COMPLETE GLEIF API RESPONSE:');
  console.log('='.repeat(100));
  console.log(JSON.stringify(parsedData, null, 2));

  if (parsedData.data && parsedData.data.length > 0) {
    const record = parsedData.data[0];
    
    console.log('\n📊 DETAILED RECORD ANALYSIS:');
    console.log('='.repeat(100));
    
    console.log('\n🏢 BASIC RECORD INFO:');
    console.log(`Type: ${record.type}`);
    console.log(`ID (LEI): ${record.id}`);
    
    console.log('\n📋 ATTRIBUTES SECTION (Complete Object):');
    console.log('─'.repeat(80));
    console.log(JSON.stringify(record.attributes, null, 2));
    
    console.log('\n🔗 RELATIONSHIPS SECTION (Complete Object):');
    console.log('─'.repeat(80));
    console.log(JSON.stringify(record.relationships, null, 2));
    
    console.log('\n🌐 LINKS SECTION (Complete Object):');
    console.log('─'.repeat(80));
    console.log(JSON.stringify(record.links, null, 2));

    console.log('\n🎯 ZK CIRCUIT OPTIMIZATION ANALYSIS:');
    console.log('='.repeat(100));
    analyzeGLEIFStructureForZK(record);

    console.log('\n✅ COMPLIANCE STATUS:');
    console.log('─'.repeat(50));
    const status = record.attributes?.entity?.status;
    console.log(`Company Status: ${status}`);
    const isCompliant = !!status && status === 'ACTIVE';
    console.log(`Is company "${companyName}" GLEIF compliant? ${isCompliant}`);
  }

  if (
    !parsedData.data ||
    (Array.isArray(parsedData.data) && parsedData.data.length === 0)
  ) {
    throw new Error('No company found with that name.');
  }

  return parsedData;
}

/**
 * Analyze GLEIF compliance based on API response
 */
export function analyzeGLEIFCompliance(apiResponse: GLEIFAPIResponse): GLEIFComplianceAnalysis {
  if (!apiResponse.data || apiResponse.data.length === 0) {
    return {
      isCompliant: false,
      complianceScore: 0,
      issues: ['No GLEIF data available'],
      summary: 'Company not found in GLEIF database'
    };
  }

  const record = apiResponse.data[0];
  const entity = record.attributes?.entity;
  const registration = record.attributes?.registration;
  
  const issues: string[] = [];
  let complianceScore = 0;

  // Check 1: Entity status
  if (entity?.status === 'ACTIVE') {
    complianceScore += 20;
  } else {
    issues.push(`Entity status is not ACTIVE: ${entity?.status}`);
  }

  // Check 2: Registration status
  if (registration?.status === 'ISSUED') {
    complianceScore += 20;
  } else {
    issues.push(`Registration status is not ISSUED: ${registration?.status}`);
  }

  // Check 3: LEI format validation
  const lei = record.attributes?.lei;
  if (lei && validateLEI(lei)) {
    complianceScore += 20;
  } else {
    issues.push(`Invalid LEI format: ${lei}`);
  }

  // Check 4: Required fields present
  if (entity?.legalName?.name && entity?.jurisdiction) {
    complianceScore += 20;
  } else {
    issues.push('Missing required entity information');
  }

  // Check 5: Registration dates valid
  if (registration?.nextRenewalDate) {
    const renewalDate = new Date(registration.nextRenewalDate);
    if (renewalDate > new Date()) {
      complianceScore += 20;
    } else {
      issues.push('LEI registration has expired');
    }
  } else {
    issues.push('Missing renewal date information');
  }

  const isCompliant = complianceScore >= 80;
  const summary = isCompliant ? 'Company meets GLEIF compliance requirements' : `Company has compliance issues: ${issues.join(', ')}`;

  return {
    isCompliant,
    complianceScore,
    issues,
    summary
  };
}

/**
 * Create comprehensive GLEIF Merkle tree from API response
 */
export function createComprehensiveGLEIFMerkleTree(
  apiResponse: GLEIFAPIResponse,
  MerkleTreeClass: any,
  CircuitStringClass: any,
  height: number,
  fieldIndices: typeof GLEIF_FIELD_INDICES
): { tree: any; extractedData: Record<string, any> } {
  console.log('🌳 Creating comprehensive GLEIF Merkle tree...');
  console.log('📋 Processing live GLEIF API structure...');

  if (!apiResponse.data || apiResponse.data.length === 0) {
    throw new Error('No GLEIF data available for Merkle tree creation');
  }

  const record = apiResponse.data[0];
  const attributes = record.attributes;
  const entity = attributes?.entity;
  const registration = attributes?.registration;

  const tree = new MerkleTreeClass(height);
  const extractedData: Record<string, any> = {};

  const setField = (fieldName: string, index: number, value: string) => {
    const truncatedValue = value.length > 50 ? value.substring(0, 47) + '...' : value;
    console.log(`  Set field ${fieldName} (${index}): "${truncatedValue}"`);
    const circuitValue = CircuitStringClass.fromString(value);
    const hash = circuitValue.hash();
    tree.setLeaf(BigInt(index), hash);
    extractedData[fieldName] = value;
  };

  // Set core fields
  setField('legalName', fieldIndices.legalName, entity?.legalName?.name || '');
  setField('lei', fieldIndices.lei, attributes?.lei || '');
  setField('entityStatus', fieldIndices.entityStatus, entity?.status || '');
  setField('legalForm', fieldIndices.legalForm, entity?.legalForm?.id || '');
  setField('jurisdiction', fieldIndices.jurisdiction, entity?.jurisdiction || '');
  
  // Address fields
  const addressLine = entity?.legalAddress?.addressLines?.[0] || '';
  setField('legalAddress', fieldIndices.legalAddress, addressLine);
  setField('legalCity', fieldIndices.legalCity, entity?.legalAddress?.city || '');
  setField('legalCountry', fieldIndices.legalCountry, entity?.legalAddress?.country || '');
  
  // Registration fields
  setField('registrationAuthority', fieldIndices.registrationAuthority, entity?.registeredAt?.id || '');
  setField('entityCategory', fieldIndices.entityCategory, entity?.category || '');
  setField('businessRegisterEntityId', fieldIndices.businessRegisterEntityId, entity?.registeredAs || '');
  setField('leiStatus', fieldIndices.leiStatus, registration?.status || '');
  setField('initialRegistrationDate', fieldIndices.initialRegistrationDate, registration?.initialRegistrationDate || '');
  setField('lastUpdateDate', fieldIndices.lastUpdateDate, registration?.lastUpdateDate || '');
  setField('nextRenewalDate', fieldIndices.nextRenewalDate, registration?.nextRenewalDate || '');
  setField('registration_status', fieldIndices.registration_status, registration?.status || '');
  setField('bic_codes', fieldIndices.bic_codes, attributes?.bic || '');
  setField('mic_codes', fieldIndices.mic_codes, attributes?.mic || '');
  setField('conformityFlag', fieldIndices.conformityFlag, attributes?.conformityFlag || '');
  setField('managingLou', fieldIndices.managingLou, registration?.managingLou || '');

  const fieldCount = Object.keys(extractedData).length;
  console.log(`✅ Created Merkle tree with ${fieldCount} fields`);
  console.log(`🌳 Merkle root: ${tree.getRoot()}`);

  return { tree, extractedData };
}

/**
 * Create optimized GLEIF compliance data for ZK proofs
 * FIXED: Updated to match the expected GLEIFOptimComplianceData structure
 */
export function createOptimizedGLEIFComplianceData(
  extractedData: Record<string, any>,
  merkleRoot: any,
  CircuitStringClass: any,
  GLEIFOptimComplianceDataClass: any
): any {
  console.log('🔐 Preparing ZK proof data...');
  
  // Helper function to safely create CircuitString
  function safeCircuitString(value: any, fieldName: string): any {
    try {
      if (value === null || value === undefined) {
        console.warn(`⚠️ ${fieldName} is null/undefined, using empty string`);
        return CircuitStringClass.fromString('');
      }
      
      // Handle different value types
      if (typeof value === 'string') {
        return CircuitStringClass.fromString(value);
      } else if (value && typeof value.toString === 'function') {
        return CircuitStringClass.fromString(value.toString());
      } else {
        console.warn(`⚠️ ${fieldName} cannot be converted to string, using empty string`);
        return CircuitStringClass.fromString('');
      }
    } catch (error) {
      console.error(`❌ Error creating CircuitString for ${fieldName}:`, error);
      return CircuitStringClass.fromString('');
    }
  }
  
  try {
    // Create compliance data matching GLEIFOptimComplianceData structure
    const complianceData = new GLEIFOptimComplianceDataClass({
      // Core identifiers
      lei: safeCircuitString(extractedData.lei, 'lei'),
      name: safeCircuitString(extractedData.legalName, 'legalName'),
      
      // Compliance critical fields (matching the struct field names)
      entity_status: safeCircuitString(extractedData.entityStatus, 'entityStatus'),
      registration_status: safeCircuitString(extractedData.registration_status || extractedData.registrationStatus, 'registration_status'),
      conformity_flag: safeCircuitString(extractedData.conformityFlag, 'conformityFlag'),
      
      // Temporal validation fields
      initialRegistrationDate: safeCircuitString(extractedData.initialRegistrationDate, 'initialRegistrationDate'),
      lastUpdateDate: safeCircuitString(extractedData.lastUpdateDate, 'lastUpdateDate'),
      nextRenewalDate: safeCircuitString(extractedData.nextRenewalDate, 'nextRenewalDate'),
      
      // Related IDs
      bic_codes: safeCircuitString(extractedData.bic_codes || '', 'bic_codes'),
      mic_codes: safeCircuitString(extractedData.mic_codes || '', 'mic_codes'),
      managing_lou: safeCircuitString(extractedData.managingLou, 'managingLou'),
      
      // Merkle tree root
      merkle_root: merkleRoot
    });

    console.log('✅ Optimized GLEIF compliance data created successfully');
    return complianceData;
  } catch (error) {
    console.error('❌ Error creating optimized GLEIF compliance data:', error);
    throw new Error(`Failed to create compliance data: ${error}`);
  }
}

function analyzeGLEIFStructureForZK(record: any): void {
  console.log('🔬 ANALYZING DATA STRUCTURE FOR ZK OPTIMIZATION...\n');
  
  if (record.attributes) {
    console.log('📊 ATTRIBUTES STRUCTURE ANALYSIS:');
    
    if (record.attributes.lei) {
      console.log(`  ✅ LEI: ${record.attributes.lei}`);
    }

    if (record.attributes.entity) {
      console.log('\n🏢 ENTITY DATA STRUCTURE:');
      const entity = record.attributes.entity;
      
      if (entity.legalName?.name) {
        console.log(`  ✅ Legal Name: ${entity.legalName.name}`);
      }
      
      if (entity.status) {
        console.log(`  ✅ Status: ${entity.status}`);
      }

      if (entity.jurisdiction) {
        console.log(`  ✅ Jurisdiction: ${entity.jurisdiction}`);
      }

      if (entity.legalAddress) {
        console.log('\n  📍 LEGAL ADDRESS DATA:');
        console.log(JSON.stringify(entity.legalAddress, null, 4));
      }

      if (entity.headquartersAddress) {
        console.log('\n  🏢 HEADQUARTERS ADDRESS DATA:');
        console.log(JSON.stringify(entity.headquartersAddress, null, 4));
      }
      
      if (entity.legalForm?.id) {
        console.log(`  ✅ Legal Form: ${entity.legalForm.id}`);
      }
      if (entity.category) {
        console.log(`  ✅ Category: ${entity.category}`);
      }
    }
    
    if (record.attributes.registration) {
      console.log('\n📝 REGISTRATION DATA STRUCTURE:');
      console.log(JSON.stringify(record.attributes.registration, null, 2));
    }
  }

  if (record.relationships) {
    console.log('\n🔗 RELATIONSHIPS STRUCTURE ANALYSIS:');
    console.log(JSON.stringify(record.relationships, null, 2));
    
    Object.keys(record.relationships).forEach(key => {
      console.log(`  📊 Relationship type: ${key}`);
    });
  }
}

// GLEIF Field Indices for Merkle Tree Structure
export const GLEIF_FIELD_INDICES = {
  legalName: 0,
  lei: 1,
  entityStatus: 2,
  entity_status: 2,
  legalForm: 3,
  jurisdiction: 4,
  legalAddress: 5,
  legalCity: 6,
  legalCountry: 7,
  registrationAuthority: 8,
  entityCategory: 9,
  businessRegisterEntityId: 10,
  leiStatus: 11,
  initialRegistrationDate: 12,
  lastUpdateDate: 13,
  nextRenewalDate: 14,
  registration_status: 15,
  conformity_flag: 16,
  conformityFlag: 16,
  bic_codes: 17,
  mic_codes: 18,
  managingLou: 19,
} as const;

/**
 * Company registry for managing multiple companies in merkle tree
 */
export class CompanyRegistry {
  private companiesTree: any; // MerkleTree imported from o1js in actual usage
  private companyRecords: Map<string, { record: any; index: number }>;
  private nextIndex: number;
  private COMPANY_MERKLE_HEIGHT: number;

  constructor(merkleHeight: number = 8) {
    // MerkleTree will be imported in the actual usage files
    this.COMPANY_MERKLE_HEIGHT = merkleHeight;
    this.companyRecords = new Map();
    this.nextIndex = 0;
    // this.companiesTree = new MerkleTree(this.COMPANY_MERKLE_HEIGHT); // Set in actual usage
  }

  /**
   * Initialize the merkle tree (called from usage files with proper MerkleTree import)
   */
  initializeMerkleTree(MerkleTreeClass: any) {
    this.companiesTree = new MerkleTreeClass(this.COMPANY_MERKLE_HEIGHT);
  }

  /**
   * Add or update a company in the registry
   */
  addOrUpdateCompany(lei: string, companyRecord: any, CompanyMerkleWitnessClass: any, PoseidonClass: any): any {
    let index: number;
    
    if (this.companyRecords.has(lei)) {
      // Update existing company
      index = this.companyRecords.get(lei)!.index;
      console.log(`📝 Updating existing company at index ${index}: ${lei}`);
    } else {
      // Add new company
      index = this.nextIndex++;
      console.log(`➕ Adding new company at index ${index}: ${lei}`);
    }
    
    // Calculate company record hash using the same method as the smart contract
    const companyHash = PoseidonClass.hash([
      companyRecord.leiHash,
      companyRecord.legalNameHash,
      companyRecord.jurisdictionHash,
      companyRecord.isCompliant.toField(),
      companyRecord.complianceScore,
      companyRecord.totalVerifications,
      companyRecord.lastVerificationTime,
      companyRecord.firstVerificationTime
    ]);
    
    // Update merkle tree
    this.companiesTree.setLeaf(BigInt(index), companyHash);
    
    // Store company record
    this.companyRecords.set(lei, { record: companyRecord, index });
    
    // Return witness for this company
    return new CompanyMerkleWitnessClass(this.companiesTree.getWitness(BigInt(index)));
  }

  /**
   * Get merkle witness for a company
   */
  getCompanyWitness(lei: string, CompanyMerkleWitnessClass: any): any | null {
    const entry = this.companyRecords.get(lei);
    if (!entry) return null;
    
    return new CompanyMerkleWitnessClass(this.companiesTree.getWitness(BigInt(entry.index)));
  }

  /**
   * Get company record
   */
  getCompanyRecord(lei: string): any | null {
    const entry = this.companyRecords.get(lei);
    return entry ? entry.record : null;
  }

  /**
   * Get merkle root of companies tree
   */
  getRoot(): any {
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

/**
 * Create a company record from GLEIF compliance data and verification info
 */
export function createCompanyRecord(
  complianceData: any,
  isCompliant: any,
  verificationTimestamp: any,
  CircuitStringClass: any,
  GLEIFCompanyRecordClass: any,
  FieldClass: any,
  isFirstVerification: boolean = true
): any {
  console.log(`    🔍 createCompanyRecord: Validating input parameters...`);
  
  // Validate all input parameters
  if (!complianceData) {
    throw new Error('createCompanyRecord: complianceData is null or undefined');
  }
  if (!complianceData.lei) {
    throw new Error('createCompanyRecord: complianceData.lei is null or undefined');
  }
  if (!complianceData.name) {
    throw new Error('createCompanyRecord: complianceData.name is null or undefined');
  }
  if (isCompliant === null || isCompliant === undefined) {
    throw new Error('createCompanyRecord: isCompliant is null or undefined');
  }
  if (!verificationTimestamp) {
    throw new Error('createCompanyRecord: verificationTimestamp is null or undefined');
  }
  if (!CircuitStringClass) {
    throw new Error('createCompanyRecord: CircuitStringClass is null or undefined');
  }
  if (!GLEIFCompanyRecordClass) {
    throw new Error('createCompanyRecord: GLEIFCompanyRecordClass is null or undefined');
  }
  if (!FieldClass) {
    throw new Error('createCompanyRecord: FieldClass is null or undefined');
  }
  
  console.log(`    ✅ createCompanyRecord: All input parameters validated`);
  
  const currentTime = verificationTimestamp;
  
  try {
    console.log(`    🔄 createCompanyRecord: Creating hashes...`);
    
    // Create hashes with error handling
    let leiHash, legalNameHash, jurisdictionHash;
    
    try {
      leiHash = complianceData.lei.hash();
      console.log(`      ✅ leiHash created: ${leiHash.toString()}`);
    } catch (error) {
      throw new Error(`createCompanyRecord: Failed to create leiHash - ${error}`);
    }
    
    try {
      legalNameHash = complianceData.name.hash();
      console.log(`      ✅ legalNameHash created: ${legalNameHash.toString()}`);
    } catch (error) {
      throw new Error(`createCompanyRecord: Failed to create legalNameHash - ${error}`);
    }
    
    try {
      jurisdictionHash = CircuitStringClass.fromString('Global').hash();
      console.log(`      ✅ jurisdictionHash created: ${jurisdictionHash.toString()}`);
    } catch (error) {
      throw new Error(`createCompanyRecord: Failed to create jurisdictionHash - ${error}`);
    }
    
    console.log(`    🔄 createCompanyRecord: Creating compliance score...`);
    let complianceScore;
    try {
      complianceScore = isCompliant.toField().mul(100);
      console.log(`      ✅ complianceScore created: ${complianceScore.toString()}`);
    } catch (error) {
      throw new Error(`createCompanyRecord: Failed to create complianceScore - ${error}`);
    }
    
    console.log(`    🔄 createCompanyRecord: Creating verification counts...`);
    let totalVerifications, passedVerifications, failedVerifications, consecutiveFailures;
    try {
      totalVerifications = FieldClass(1); // This is the first verification
      passedVerifications = isCompliant.toField(); // 1 if passed, 0 if failed
      failedVerifications = isCompliant.not().toField(); // 1 if failed, 0 if passed
      consecutiveFailures = isCompliant.not().toField(); // 1 if this verification failed, 0 if passed
      
      console.log(`      ✅ totalVerifications created: ${totalVerifications.toString()}`);
      console.log(`      ✅ passedVerifications created: ${passedVerifications.toString()}`);
      console.log(`      ✅ failedVerifications created: ${failedVerifications.toString()}`);
      console.log(`      ✅ consecutiveFailures created: ${consecutiveFailures.toString()}`);
    } catch (error) {
      throw new Error(`createCompanyRecord: Failed to create verification counts - ${error}`);
    }
    
    console.log(`    🔄 createCompanyRecord: Creating timestamp fields...`);
    let lastPassTime, lastFailTime;
    try {
      // Import UInt64 from the modules that should be available
      const UInt64 = verificationTimestamp.constructor; // Get UInt64 constructor from the timestamp
      
      // Set lastPassTime to current time if compliant, 0 if not
      lastPassTime = isCompliant.toField().equals(FieldClass(1)) ? currentTime : UInt64.from(0);
      // Set lastFailTime to current time if not compliant, 0 if compliant 
      lastFailTime = isCompliant.toField().equals(FieldClass(0)) ? currentTime : UInt64.from(0);
      
      console.log(`      ✅ lastPassTime created: ${lastPassTime.toString()}`);
      console.log(`      ✅ lastFailTime created: ${lastFailTime.toString()}`);
    } catch (error) {
      throw new Error(`createCompanyRecord: Failed to create timestamp fields - ${error}`);
    }
    
    console.log(`    🔄 createCompanyRecord: Creating GLEIFCompanyRecord with all 13 fields...`);
    const record = new GLEIFCompanyRecordClass({
      leiHash: leiHash,
      legalNameHash: legalNameHash,
      jurisdictionHash: jurisdictionHash,
      isCompliant: isCompliant,
      complianceScore: complianceScore,
      totalVerifications: totalVerifications,
      passedVerifications: passedVerifications,         // NEW FIELD
      failedVerifications: failedVerifications,         // NEW FIELD
      consecutiveFailures: consecutiveFailures,         // NEW FIELD
      lastVerificationTime: currentTime,
      firstVerificationTime: currentTime,
      lastPassTime: lastPassTime,                       // NEW FIELD
      lastFailTime: lastFailTime                        // NEW FIELD
    });
    
    console.log(`    ✅ createCompanyRecord: GLEIFCompanyRecord created successfully with all 13 fields`);
    return record;
    
  } catch (error) {
    console.error(`    ❌ createCompanyRecord: Error creating company record:`, error);
    throw error;
  }
}

export default GLEIF_FIELD_INDICES;
