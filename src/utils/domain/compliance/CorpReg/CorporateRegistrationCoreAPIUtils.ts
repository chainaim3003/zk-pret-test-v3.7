import * as dotenv from 'dotenv';
dotenv.config();
import axios from 'axios';
import { Field, CircuitString, Poseidon, MerkleTree } from 'o1js';
import { CORP_REG_FIELD_INDICES } from '../../../../zk-programs/compliance/CorporateRegistrationOptimZKProgram.js';

// =================================== Type Definitions ===================================

export interface CorporateRegistrationAPIResponse {
  success?: boolean;
  data?: {
    company_master_data?: {
      cin?: string;
      company_name?: string;
      company_status?: string;
      company_type?: string;
      company_category?: string;
      company_subcategory?: string;
      class_of_company?: string;
      date_of_incorporation?: string;
      registration_number?: string;
      roc_code?: string;
      registrar_of_companies?: string;
      email?: string;
      phone?: string;
      website?: string;
      activity_description?: string;
      company_activity_code?: string;
      industrial_class?: string;
      mca_id?: string;
      jurisdiction?: string;
      legal_form?: string;
      llpin_details?: string;
      foreign_company_details?: string;
      
      // Address fields
      registered_address_line1?: string;
      registered_address_line2?: string;
      registered_city?: string;
      registered_state?: string;
      registered_country?: string;
      registered_pincode?: string;
      corporate_address_line1?: string;
      corporate_address_line2?: string;
      corporate_city?: string;
      corporate_state?: string;
      corporate_country?: string;
      corporate_pincode?: string;
      correspondence_address_line1?: string;
      correspondence_address_line2?: string;
      correspondence_city?: string;
      correspondence_state?: string;
      correspondence_country?: string;
      correspondence_pincode?: string;
      
      // Financial fields
      authorized_capital?: string;
      paid_up_capital?: string;
      number_of_members?: string;
      number_of_partners?: string;
      last_agm_date?: string;
      last_bs_date?: string;
      last_annual_return_date?: string;
      listing_status?: string;
      whether_listed_or_not?: string;
      suspended_at_stock_exchange?: string;
      market_cap?: string;
      share_capital_details?: string;
      
      // Directors and governance
      number_of_directors?: string;
      director_details?: string;
      compliance_status?: string;
      filing_status?: string;
      board_composition?: string;
      key_personnel?: string;
      signatory_details?: string;
      
      // Legal and regulatory
      strike_off_details?: string;
      dormant_status?: string;
      nbfc_registration?: string;
      prosecution_launched?: string;
      conversion_details?: string;
      amalgamation_details?: string;
      regulatory_approvals?: string;
      licenses?: string;
      
      // Timestamps
      created_at?: string;
      updated_at?: string;
      data_source?: string;
      api_version?: string;
      
      // Legacy field mappings
      'company_status(for_efiling)'?: string;
    };
  };
  error?: string;
  message?: string;
  
  // For compatibility
  [key: string]: any;
}

export interface CorporateRegistrationComplianceAnalysis {
  isCompliant: boolean;
  complianceScore: number;
  issues: string[];
  summary: string;
}

export interface CorporateRegistrationDataSummary {
  companyName: string;
  cin: string;
  companyStatus: string;
  jurisdiction: string;
  category: string;
  complianceScore: number;
}


// =================================== Enhanced Fetch with Two-Stage Lookup ===================================

/**
 * Fetch company data from Corporate Registration API with enhanced Stage 1 logging
 * Parallels GLEIF's fetchGLEIFDataWithFullLogging
 */

export async function fetchCorporateRegistrationDataWithFullLogging(
  cin: string,
  jurisdiction: string = 'IN'
): Promise<CorporateRegistrationAPIResponse> {
  console.log(`\n🚀 Starting Corporate Registration Data Fetch`);
  console.log(`🔍 CIN: ${cin}`);
  console.log(`📡 All environments now use LIVE API`);
  
  try {
    // Import the existing utility function to avoid breaking existing code
    const { fetchCorporateRegistrationData } = await import('../../../../utils/domain/compliance/CorpReg/CorporateRegistrationUtils.js');
    
    // Use the existing function to get the data
    const response = await fetchCorporateRegistrationData(cin);
    
    // Print comprehensive response analysis
    printCorporateRegistrationResponse(response, cin);
    
    return response;
    
  } catch (error: any) {
    console.error(`❌ Error in Corporate Registration Data Fetch:`, error.message);
    
    // Print error details
    console.log(`\n🚨 Error Details:`);
    console.log(`  Error Type: ${error.name || 'Unknown'}`);
    console.log(`  Error Message: ${error.message}`);
    if (error.response?.data) {
      console.log(`  API Error Response:`, JSON.stringify(error.response.data, null, 2));
    }
    if (error.response?.status) {
      console.log(`  HTTP Status: ${error.response.status}`);
    }
    
    throw error;
  }
}

/**
 * CIN extraction utility for two-stage lookup
 * Parallels GLEIF's extractLEIFromGLEIFResponse
 */
export function extractCINFromResponse(apiResponse: CorporateRegistrationAPIResponse): string {
  if (!apiResponse.data?.company_master_data) {
    throw new Error('No Corporate Registration data available for CIN extraction');
  }
  
  const cin = apiResponse.data.company_master_data.cin;
  if (!cin) {
    throw new Error('CIN not found in Corporate Registration response');
  }
  
  if (!validateCIN(cin)) {
    throw new Error(`Invalid CIN format: ${cin}`);
  }
  
  return cin;
}

/**
 * CIN validation (21-character alphanumeric format)
 * Parallels GLEIF's validateLEI
 */
export function validateCIN(cin: string): boolean {
  // CIN format: L/U + 5 digits + 2 letters + 4 digits + 3 letters + 6 digits
  const cinRegex = /^[LU]\d{5}[A-Z]{2}\d{4}[A-Z]{3}\d{6}$/;
  return cinRegex.test(cin);
}

/**
 * Original Corporate Registration API function with complete JSON printing
 * Enhanced to match GLEIF's fetchGLEIFCompanyDataWithFullDetails
 */
export async function fetchCorporateRegistrationDataWithFullDetails(
  companyNameOrCin: string,
  jurisdiction: string = 'IN'
): Promise<CorporateRegistrationAPIResponse> {
  let BASEURL;
  let url;

  let typeOfNet = process.env.BUILD_ENV;
  if (!typeOfNet) {
    typeOfNet = 'TESTNET';
  }

  console.log('Company Name/CIN:', companyNameOrCin);
  console.log('Type of Network:', typeOfNet);
  console.log('Jurisdiction:', jurisdiction);

  if (typeOfNet === 'TESTNET') {
    console.log('+++++++++++++++++++++++++++++++++++++++++++++++++++++in sandbox++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++');
    BASEURL = process.env.CORP_REG_URL_SANDBOX;
    url = `${BASEURL}?identifier=${encodeURIComponent(companyNameOrCin)}&jurisdiction=${jurisdiction}`;
  } 
  else if (typeOfNet === 'LOCAL') {
    console.log('------------------------------------------------using live Corporate Registration API--------------------------------------------------');
    BASEURL = process.env.CORP_REG_URL_MOCK; 
    url = `${BASEURL}?identifier=${encodeURIComponent(companyNameOrCin)}&jurisdiction=${jurisdiction}`;
  } 
  else {
    console.log('///////////////////////////////////////////////in prod//////////////////////////////////////////////');
    BASEURL = process.env.CORP_REG_URL_PROD;
    url = `${BASEURL}?identifier=${encodeURIComponent(companyNameOrCin)}&jurisdiction=${jurisdiction}`;
  }

  if (!BASEURL) {
    throw new Error('BASEURL is not set in the environment variables.');
  }
  if (!companyNameOrCin) {
    throw new Error('Company name or CIN is required.');
  }

  const response = await axios.get(url);
  const parsedData = response.data;

  console.log('\n🔍 COMPLETE CORPORATE REGISTRATION API RESPONSE:');
  console.log('='.repeat(100));
  console.log(JSON.stringify(parsedData, null, 2));

  if (parsedData.data?.company_master_data) {
    const record = parsedData.data.company_master_data;
    
    console.log('\n📊 DETAILED RECORD ANALYSIS:');
    console.log('='.repeat(100));
    
    console.log('\n🏢 BASIC RECORD INFO:');
    console.log(`Success: ${parsedData.success}`);
    console.log(`CIN: ${record.cin}`);
    
    console.log('\n📋 COMPANY MASTER DATA (Complete Object):');
    console.log('─'.repeat(80));
    console.log(JSON.stringify(record, null, 2));

    console.log('\n🎯 ZK CIRCUIT OPTIMIZATION ANALYSIS:');
    console.log('='.repeat(100));
    analyzeCorporateRegistrationStructureForZK(record);

    console.log('\n✅ COMPLIANCE STATUS:');
    console.log('─'.repeat(50));
    const status = record.company_status || record['company_status(for_efiling)'];
    console.log(`Company Status: ${status}`);
    const isCompliant = !!status && status.toLowerCase() === 'active';
    console.log(`Is company "${companyNameOrCin}" Corporate Registration compliant? ${isCompliant}`);
  }

  if (!parsedData.data?.company_master_data) {
    throw new Error('No company found with that identifier.');
  }

  return parsedData;
}

/**
 * Analyze Corporate Registration compliance based on API response
 * Enhanced version of the original analyzeCorporateRegistrationCompliance
 */

export function analyzeCorporateRegistrationCompliance(
  response: CorporateRegistrationAPIResponse,
): {
  isCompliant: boolean;
  complianceScore: number;
  issues: Array<{type: string; message: string; field?: string; severity?: number}>;
  businessRuleResults: {
    cinNotEmpty: boolean;
    registrationNumberNotEmpty: boolean;
    companyNameNotEmpty: boolean;
    dateOfIncorporationValid: boolean;
    companyStatusActive: boolean;
  };
} {
  const summary = extractCorporateRegistrationSummary(response);
  const issues: Array<{type: string; message: string; field?: string; severity?: number}> = [];
  
  // Business rule checks
  const businessRuleResults = {
    cinNotEmpty: summary.cin !== '' && summary.cin !== 'UNKNOWN' && summary.cin !== null && summary.cin !== undefined,
    registrationNumberNotEmpty: summary.registrationNumber !== '' && summary.registrationNumber !== 'UNKNOWN' && summary.registrationNumber !== null && summary.registrationNumber !== undefined,
    companyNameNotEmpty: summary.companyName !== '' && summary.companyName !== 'UNKNOWN' && summary.companyName !== null && summary.companyName !== undefined,
    dateOfIncorporationValid: summary.dateOfIncorporation !== '' && summary.dateOfIncorporation !== 'UNKNOWN' && summary.dateOfIncorporation !== null && summary.dateOfIncorporation !== undefined,
    companyStatusActive: summary.status.toLowerCase() === 'active'
  };
  
  // Collect issues with proper typing
  if (!businessRuleResults.cinNotEmpty) {
    issues.push({type: 'error', message: 'CIN is empty or missing', field: 'cin', severity: 10});
  }
  if (!businessRuleResults.registrationNumberNotEmpty) {
    issues.push({type: 'warning', message: 'Registration number is empty or missing', field: 'registrationNumber', severity: 7});
  }
  if (!businessRuleResults.companyNameNotEmpty) {
    issues.push({type: 'error', message: 'Company name is empty or missing', field: 'companyName', severity: 10});
  }
  if (!businessRuleResults.dateOfIncorporationValid) {
    issues.push({type: 'warning', message: 'Date of incorporation is invalid or missing', field: 'dateOfIncorporation', severity: 5});
  }
  if (!businessRuleResults.companyStatusActive) {
    issues.push({type: 'error', message: `Company status is not "Active": ${summary.status}`, field: 'status', severity: 9});
  }
  
  // Calculate compliance score
  const scoreFactors = Object.values(businessRuleResults);
  const complianceScore = Math.round((scoreFactors.filter(Boolean).length / scoreFactors.length) * 100);
  
  const isCompliant = complianceScore === 100;
  
  return {
    isCompliant,
    complianceScore,
    issues,
    businessRuleResults
  };
}

/**
 * Create comprehensive Corporate Registration Merkle tree from API response
 * Enhanced to match GLEIF's createComprehensiveGLEIFMerkleTree
 */
export function createComprehensiveCorporateRegistrationMerkleTree(
  apiResponse: CorporateRegistrationAPIResponse,
  MerkleTreeClass: any,
  CircuitStringClass: any,
  height: number,
  fieldIndices: typeof CORP_REG_FIELD_INDICES
): { tree: any; extractedData: Record<string, any> } {
  console.log('🌳 Creating comprehensive Corporate Registration Merkle tree...');
  console.log('📋 Processing live Corporate Registration API structure...');

  if (!apiResponse.data?.company_master_data) {
    throw new Error('No Corporate Registration data available for Merkle tree creation');
  }

  const record = apiResponse.data.company_master_data;
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
  setField('companyName', fieldIndices.companyName, record.company_name || '');
  setField('CIN', fieldIndices.CIN, record.cin || '');
  setField('companyStatus', fieldIndices.companyStatus, record.company_status || record['company_status(for_efiling)'] || '');
  setField('category', fieldIndices.category, record.company_category || '');
  setField('classOfCompany', fieldIndices.classOfCompany, record.class_of_company || '');
  
  // Registration fields
  setField('registrationNumber', fieldIndices.registrationNumber, record.registration_number || '');
  setField('listed', fieldIndices.listed, record.whether_listed_or_not || '');
  setField('suspended', fieldIndices.suspended, record.suspended_at_stock_exchange || '');
  setField('dateOfIncorporation', fieldIndices.dateOfIncorporation, record.date_of_incorporation || '');
  setField('numberOfPartners', fieldIndices.numberOfPartners, record.number_of_partners || '0');
  
  // Additional fields
  setField('companyType', fieldIndices.companyType, record.company_type || '');
  setField('companySubcategory', fieldIndices.companySubcategory, record.company_subcategory || '');
  setField('rocCode', fieldIndices.rocCode, record.roc_code || '');
  setField('registrarOfCompanies', fieldIndices.registrarOfCompanies, record.registrar_of_companies || '');
  setField('email', fieldIndices.email, record.email || '');
  setField('phone', fieldIndices.phone, record.phone || '');
  setField('website', fieldIndices.website, record.website || '');
  setField('activityDescription', fieldIndices.activityDescription, record.activity_description || '');
  setField('companyActivityCode', fieldIndices.companyActivityCode, record.company_activity_code || '');
  setField('industrialClass', fieldIndices.industrialClass, record.industrial_class || '');
  setField('mcaId', fieldIndices.mcaId, record.mca_id || '');
  setField('jurisdiction', fieldIndices.jurisdiction, record.jurisdiction || 'IN');
  setField('legalForm', fieldIndices.legalForm, record.legal_form || '');
  setField('llpinDetails', fieldIndices.llpinDetails, record.llpin_details || '');
  setField('foreignCompanyDetails', fieldIndices.foreignCompanyDetails, record.foreign_company_details || '');
  
  // Address fields
  setField('registeredAddressLine1', fieldIndices.registeredAddressLine1, record.registered_address_line1 || '');
  setField('registeredCity', fieldIndices.registeredCity, record.registered_city || '');
  setField('registeredState', fieldIndices.registeredState, record.registered_state || '');
  setField('registeredCountry', fieldIndices.registeredCountry, record.registered_country || '');
  setField('registeredPincode', fieldIndices.registeredPincode, record.registered_pincode || '');
  
  // Financial fields
  setField('authorizedCapital', fieldIndices.authorizedCapital, record.authorized_capital || '');
  setField('paidUpCapital', fieldIndices.paidUpCapital, record.paid_up_capital || '');
  setField('numberOfMembers', fieldIndices.numberOfMembers, record.number_of_members || '');
  setField('numberOfDirectors', fieldIndices.numberOfDirectors, record.number_of_directors || '');
  
  // Compliance fields
  setField('complianceStatus', fieldIndices.complianceStatus, record.compliance_status || '');
  setField('filingStatus', fieldIndices.filingStatus, record.filing_status || '');
  setField('lastAgmDate', fieldIndices.lastAgmDate, record.last_agm_date || '');
  setField('lastBsDate', fieldIndices.lastBsDate, record.last_bs_date || '');
  setField('lastAnnualReturnDate', fieldIndices.lastAnnualReturnDate, record.last_annual_return_date || '');

  const fieldCount = Object.keys(extractedData).length;
  console.log(`✅ Created Merkle tree with ${fieldCount} fields`);
  console.log(`🌳 Merkle root: ${tree.getRoot()}`);

  return { tree, extractedData };
}

/**
 * Create optimized Corporate Registration compliance data for ZK proofs
 * Parallels GLEIF's createOptimizedGLEIFComplianceData
 */
export function createOptimizedCorporateRegistrationComplianceData(
  extractedData: Record<string, any>,
  merkleRoot: any,
  CircuitStringClass: any,
  CorporateRegistrationOptimComplianceDataClass: any
): any {
  console.log('🔐 Preparing ZK proof data...');
  
  // Helper function to safely create CircuitString
  function safeCircuitString(value: any, fieldName: string): any {
    try {
      if (value === null || value === undefined) {
        console.warn(`⚠️ ${fieldName} is null/undefined, using empty string`);
        return CircuitStringClass.fromString('');
      }
      
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
    const complianceData = new CorporateRegistrationOptimComplianceDataClass({
      // Core identifiers
      name: safeCircuitString(extractedData.companyName, 'companyName'),
      cin: safeCircuitString(extractedData.CIN, 'CIN'),
      
      // Compliance critical fields
      registration_number: safeCircuitString(extractedData.registrationNumber, 'registrationNumber'),
      company_status: safeCircuitString(extractedData.companyStatus, 'companyStatus'),
      dateOfIncorporation: safeCircuitString(extractedData.dateOfIncorporation, 'dateOfIncorporation'),
      
      // Temporal validation fields
      category: safeCircuitString(extractedData.category, 'category'),
      classOfCompany: safeCircuitString(extractedData.classOfCompany, 'classOfCompany'),
      numberOfPartners: safeCircuitString(extractedData.numberOfPartners, 'numberOfPartners'),
      
      // Related fields
      listed: safeCircuitString(extractedData.listed, 'listed'),
      suspended: safeCircuitString(extractedData.suspended, 'suspended'),
      
      // Merkle tree root
      merkle_root: merkleRoot
    });

    console.log('✅ Optimized Corporate Registration compliance data created successfully');
    return complianceData;
  } catch (error) {
    console.error('❌ Error creating optimized Corporate Registration compliance data:', error);
    throw new Error(`Failed to create compliance data: ${error}`);
  }
}

/**
 * Analyze Corporate Registration structure for ZK optimization
 * Parallels GLEIF's analyzeGLEIFStructureForZK
 */
function analyzeCorporateRegistrationStructureForZK(record: any): void {
  console.log('🔬 ANALYZING DATA STRUCTURE FOR ZK OPTIMIZATION...\n');
  
  console.log('📊 COMPANY MASTER DATA STRUCTURE ANALYSIS:');
  
  if (record.cin) {
    console.log(`  ✅ CIN: ${record.cin}`);
  }

  if (record.company_name) {
    console.log(`  ✅ Company Name: ${record.company_name}`);
  }
  
  const status = record.company_status || record['company_status(for_efiling)'];
  if (status) {
    console.log(`  ✅ Status: ${status}`);
  }

  if (record.jurisdiction) {
    console.log(`  ✅ Jurisdiction: ${record.jurisdiction}`);
  }

  if (record.company_category) {
    console.log(`  ✅ Category: ${record.company_category}`);
  }
  
  if (record.class_of_company) {
    console.log(`  ✅ Class of Company: ${record.class_of_company}`);
  }

  console.log('\n📍 ADDRESS DATA:');
  if (record.registered_address_line1 || record.registered_city) {
    console.log('  Registered Address:', {
      line1: record.registered_address_line1,
      city: record.registered_city,
      state: record.registered_state,
      country: record.registered_country,
      pincode: record.registered_pincode
    });
  }

  console.log('\n💰 FINANCIAL DATA:');
  if (record.authorized_capital || record.paid_up_capital) {
    console.log('  Financial Info:', {
      authorized_capital: record.authorized_capital,
      paid_up_capital: record.paid_up_capital,
      number_of_members: record.number_of_members,
      number_of_directors: record.number_of_directors
    });
  }
  
  console.log('\n📝 COMPLIANCE DATA:');
  console.log(JSON.stringify({
    compliance_status: record.compliance_status,
    filing_status: record.filing_status,
    last_agm_date: record.last_agm_date,
    last_bs_date: record.last_bs_date,
    last_annual_return_date: record.last_annual_return_date
  }, null, 2));
}

/**
 * Company registry for managing multiple companies in merkle tree
 * Parallels GLEIF's CompanyRegistry
 */
export class CorporateRegistrationCompanyRegistry {
  private companiesTree: any;
  private companyRecords: Map<string, { record: any; index: number }>;
  private nextIndex: number;
  private COMPANY_MERKLE_HEIGHT: number;

  constructor(merkleHeight: number = 8) {
    this.COMPANY_MERKLE_HEIGHT = merkleHeight;
    this.companyRecords = new Map();
    this.nextIndex = 0;
  }

  /**
   * Initialize the merkle tree
   */
  initializeMerkleTree(MerkleTreeClass: any) {
    this.companiesTree = new MerkleTreeClass(this.COMPANY_MERKLE_HEIGHT);
  }

  /**
   * Add or update a company in the registry
   */
  addOrUpdateCompany(cin: string, companyRecord: any, CompanyMerkleWitnessClass: any, PoseidonClass: any): any {
    let index: number;
    
    if (this.companyRecords.has(cin)) {
      index = this.companyRecords.get(cin)!.index;
      console.log(`📝 Updating existing company at index ${index}: ${cin}`);
    } else {
      index = this.nextIndex++;
      console.log(`➕ Adding new company at index ${index}: ${cin}`);
    }
    
    const companyHash = PoseidonClass.hash([
      companyRecord.cinHash,
      companyRecord.legalNameHash,
      companyRecord.jurisdictionHash,
      companyRecord.isCompliant.toField(),
      companyRecord.complianceScore,
      companyRecord.totalVerifications,
      companyRecord.lastVerificationTime,
      companyRecord.firstVerificationTime
    ]);
    
    this.companiesTree.setLeaf(BigInt(index), companyHash);
    this.companyRecords.set(cin, { record: companyRecord, index });
    
    return new CompanyMerkleWitnessClass(this.companiesTree.getWitness(BigInt(index)));
  }

  /**
   * Get merkle witness for a company
   */
  getCompanyWitness(cin: string, CompanyMerkleWitnessClass: any): any | null {
    const entry = this.companyRecords.get(cin);
    if (!entry) return null;
    
    return new CompanyMerkleWitnessClass(this.companiesTree.getWitness(BigInt(entry.index)));
  }

  /**
   * Get company record
   */
  getCompanyRecord(cin: string): any | null {
    const entry = this.companyRecords.get(cin);
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
 * Create a company record from Corporate Registration compliance data
 * Parallels GLEIF's createCompanyRecord
 */
export function createCorporateRegistrationCompanyRecord(
  complianceData: any,
  isCompliant: any,
  verificationTimestamp: any,
  CircuitStringClass: any,
  CorporateRegistrationCompanyRecordClass: any,
  FieldClass: any,
  isFirstVerification: boolean = true
): any {
  console.log(`    🔍 createCorporateRegistrationCompanyRecord: Validating input parameters...`);
  
  // Validate all input parameters
  if (!complianceData) {
    throw new Error('createCorporateRegistrationCompanyRecord: complianceData is null or undefined');
  }
  if (!complianceData.cin) {
    throw new Error('createCorporateRegistrationCompanyRecord: complianceData.cin is null or undefined');
  }
  if (!complianceData.name) {
    throw new Error('createCorporateRegistrationCompanyRecord: complianceData.name is null or undefined');
  }
  if (isCompliant === null || isCompliant === undefined) {
    throw new Error('createCorporateRegistrationCompanyRecord: isCompliant is null or undefined');
  }
  if (!verificationTimestamp) {
    throw new Error('createCorporateRegistrationCompanyRecord: verificationTimestamp is null or undefined');
  }
  if (!CircuitStringClass) {
    throw new Error('createCorporateRegistrationCompanyRecord: CircuitStringClass is null or undefined');
  }
  if (!CorporateRegistrationCompanyRecordClass) {
    throw new Error('createCorporateRegistrationCompanyRecord: CorporateRegistrationCompanyRecordClass is null or undefined');
  }
  if (!FieldClass) {
    throw new Error('createCorporateRegistrationCompanyRecord: FieldClass is null or undefined');
  }
  
  console.log(`    ✅ createCorporateRegistrationCompanyRecord: All input parameters validated`);
  
  const currentTime = verificationTimestamp;
  
  try {
    console.log(`    🔄 createCorporateRegistrationCompanyRecord: Creating hashes...`);
    
    // Create hashes with error handling
    let cinHash, companyNameHash, jurisdictionHash;
    
    try {
      cinHash = complianceData.cin.hash();
      console.log(`      ✅ cinHash created: ${cinHash.toString()}`);
    } catch (error) {
      throw new Error(`createCorporateRegistrationCompanyRecord: Failed to create cinHash - ${error}`);
    }
    
    try {
      companyNameHash = complianceData.name.hash();
      console.log(`      ✅ legalNameHash created: ${companyNameHash.toString()}`);
    } catch (error) {
      throw new Error(`createCorporateRegistrationCompanyRecord: Failed to create legalNameHash - ${error}`);
    }
    
    try {
      jurisdictionHash = CircuitStringClass.fromString('IN').hash();
      console.log(`      ✅ jurisdictionHash created: ${jurisdictionHash.toString()}`);
    } catch (error) {
      throw new Error(`createCorporateRegistrationCompanyRecord: Failed to create jurisdictionHash - ${error}`);
    }
    
    console.log(`    🔄 createCorporateRegistrationCompanyRecord: Creating compliance score...`);
    let complianceScore;
    try {
      complianceScore = isCompliant.toField().mul(100);
      console.log(`      ✅ complianceScore created: ${complianceScore.toString()}`);
    } catch (error) {
      throw new Error(`createCorporateRegistrationCompanyRecord: Failed to create complianceScore - ${error}`);
    }
    
    console.log(`    🔄 createCorporateRegistrationCompanyRecord: Creating verification counts...`);
    let totalVerifications, passedVerifications, failedVerifications, consecutiveFailures;
    try {
      totalVerifications = FieldClass(1);
      passedVerifications = isCompliant.toField();
      failedVerifications = isCompliant.not().toField();
      consecutiveFailures = isCompliant.not().toField();
      
      console.log(`      ✅ totalVerifications created: ${totalVerifications.toString()}`);
      console.log(`      ✅ passedVerifications created: ${passedVerifications.toString()}`);
      console.log(`      ✅ failedVerifications created: ${failedVerifications.toString()}`);
      console.log(`      ✅ consecutiveFailures created: ${consecutiveFailures.toString()}`);
    } catch (error) {
      throw new Error(`createCorporateRegistrationCompanyRecord: Failed to create verification counts - ${error}`);
    }
    
    console.log(`    🔄 createCorporateRegistrationCompanyRecord: Creating timestamp fields...`);
    let lastPassTime, lastFailTime;
    try {
      const UInt64 = verificationTimestamp.constructor;
      
      lastPassTime = isCompliant.toField().equals(FieldClass(1)) ? currentTime : UInt64.from(0);
      lastFailTime = isCompliant.toField().equals(FieldClass(0)) ? currentTime : UInt64.from(0);
      
      console.log(`      ✅ lastPassTime created: ${lastPassTime.toString()}`);
      console.log(`      ✅ lastFailTime created: ${lastFailTime.toString()}`);
    } catch (error) {
      throw new Error(`createCorporateRegistrationCompanyRecord: Failed to create timestamp fields - ${error}`);
    }
    
    console.log(`    🔄 createCorporateRegistrationCompanyRecord: Creating CorporateRegistrationCompanyRecord with all 13 fields...`);
    const record = new CorporateRegistrationCompanyRecordClass({
      cinHash: cinHash,
      companyNameHash: companyNameHash,
      jurisdictionHash: jurisdictionHash,
      isCompliant: isCompliant,
      complianceScore: complianceScore,
      totalVerifications: totalVerifications,
      passedVerifications: passedVerifications,
      failedVerifications: failedVerifications,
      consecutiveFailures: consecutiveFailures,
      lastVerificationTime: currentTime,
      firstVerificationTime: currentTime,
      lastPassTime: lastPassTime,
      lastFailTime: lastFailTime
    });
    
    console.log(`    ✅ createCorporateRegistrationCompanyRecord: CorporateRegistrationCompanyRecord created successfully with all 13 fields`);
    return record;
    
  } catch (error) {
    console.error(`    ❌ createCorporateRegistrationCompanyRecord: Error creating company record:`, error);
    throw error;
  }
}

/**
 * Extract company summary for logging
 * Enhanced version with all fields
 */

export function extractCorporateRegistrationSummary(
  response: CorporateRegistrationAPIResponse,
): {
  companyName: string;
  cin: string;
  status: string;
  registrationNumber: string;
  dateOfIncorporation: string;
  category: string;
  classOfCompany: string;
  numberOfPartners: string;
  listed: string;
  suspended: string;
} {
  // Since LOCAL now uses live API, all environments use the same structure
  const masterData = response.data?.company_master_data || {};
  return {
    companyName: masterData.company_name || 'UNKNOWN',
    cin: masterData.cin || 'UNKNOWN',
    // Fix: Use correct field name for company status
    status: masterData['company_status(for_efiling)'] || masterData.company_status || 'UNKNOWN',
    registrationNumber: masterData.registration_number || 'UNKNOWN',
    dateOfIncorporation: masterData.date_of_incorporation || 'UNKNOWN',
    category: masterData.company_category || 'UNKNOWN',
    classOfCompany: masterData.class_of_company || 'UNKNOWN',
    numberOfPartners: masterData.number_of_partners ? String(masterData.number_of_partners) : 'UNKNOWN',
    // Fix: Use correct field name for listing status  
    listed: masterData.whether_listed_or_not || 'UNKNOWN',
    suspended: masterData.suspended_at_stock_exchange || 'UNKNOWN'
  };
}

/**
 * Check if a company is Corporate Registration compliant
 * Enhanced with better error handling
 */
export function isCompanyCorporateRegistrationCompliant(
  companyDataOrCin: CorporateRegistrationAPIResponse | string,
  jurisdiction: string = 'IN'
): boolean | Promise<boolean> {
  if (typeof companyDataOrCin === 'string') {
    return fetchCorporateRegistrationDataWithFullLogging(companyDataOrCin, jurisdiction)
      .then(apiResponse => {
        const analysis = analyzeCorporateRegistrationCompliance(apiResponse);
        return analysis.isCompliant;
      });
  } else {
    const analysis = analyzeCorporateRegistrationCompliance(companyDataOrCin);
    return analysis.isCompliant;
  }
}

/**
 * Print comprehensive Corporate Registration API response
 * Enhanced with complete field logging
 */
export function printCorporateRegistrationResponse(
  response: CorporateRegistrationAPIResponse,
  companyIdentifier: string,
): void {
  console.log(`\n🏢 ===== CORPORATE REGISTRATION API RESPONSE =====`);
  console.log(`🔍 Query: ${companyIdentifier}`);
  console.log(`📅 Timestamp: ${new Date().toISOString()}`);
  console.log(`🔄 API Response Structure Analysis:`);
  
  console.log(`📋 Production API Response:`);
  console.log(`  Success: ${response.success || 'unknown'}`);
  console.log(`  Has Data: ${!!response.data}`);
  console.log(`  Has Company Master Data: ${!!response.data?.company_master_data}`);
  
  if (response.error) {
    console.log(`  ❌ Error: ${response.error}`);
  }
  
  if (response.message) {
    console.log(`  💬 Message: ${response.message}`);
  }
    
  const masterData = response.data?.company_master_data;
  if (masterData) {
    console.log(`\n🏢 Company Master Data Analysis:`);
    console.log(`  Total Fields Available: ${Object.keys(masterData).length}`);
    
    console.log(`\n🆔 Core Identification:`);
    console.log(`  CIN: ${masterData.cin || 'N/A'}`);
    console.log(`  Company Name: ${masterData.company_name || 'N/A'}`);
    console.log(`  Registration Number: ${masterData.registration_number || 'N/A'}`);
    console.log(`  Company Status: ${masterData.company_status || masterData['company_status(for_efiling)'] || 'N/A'}`);
    console.log(`  Date of Incorporation: ${masterData.date_of_incorporation || 'N/A'}`);
    
    console.log(`\n📊 Business Classification:`);
    console.log(`  Company Type: ${masterData.company_type || 'N/A'}`);
    console.log(`  Company Category: ${masterData.company_category || 'N/A'}`);
    console.log(`  Company Subcategory: ${masterData.company_subcategory || 'N/A'}`);
    console.log(`  Class of Company: ${masterData.class_of_company || 'N/A'}`);
    console.log(`  Number of Partners: ${masterData.number_of_partners || 'N/A'}`);
    
    console.log(`\n📈 Market & Regulatory Status:`);
    console.log(`  Listing Status: ${masterData.listing_status || 'N/A'}`);
    console.log(`  Suspended at Stock Exchange: ${masterData.suspended_at_stock_exchange || 'N/A'}`);
    console.log(`  Compliance Status: ${masterData.compliance_status || 'N/A'}`);
    console.log(`  Filing Status: ${masterData.filing_status || 'N/A'}`);
    
    console.log(`\n💰 Financial Information:`);
    console.log(`  Authorized Capital: ${masterData.authorized_capital || 'N/A'}`);
    console.log(`  Paid Up Capital: ${masterData.paid_up_capital || 'N/A'}`);
    console.log(`  Number of Members: ${masterData.number_of_members || 'N/A'}`);
    console.log(`  Number of Directors: ${masterData.number_of_directors || 'N/A'}`);
    
    console.log(`\n🏠 Address Information:`);
    console.log(`  Registered Address: ${[
      masterData.registered_address_line1,
      masterData.registered_address_line2,
      masterData.registered_city,
      masterData.registered_state,
      masterData.registered_pincode
    ].filter(Boolean).join(', ') || 'N/A'}`);
    
    console.log(`\n📞 Contact Information:`);
    console.log(`  Email: ${masterData.email || 'N/A'}`);
    console.log(`  Phone: ${masterData.phone || 'N/A'}`);
    console.log(`  Website: ${masterData.website || 'N/A'}`);
    
    console.log(`\n⚖️ Regulatory Details:`);
    console.log(`  ROC Code: ${masterData.roc_code || 'N/A'}`);
    console.log(`  Registrar of Companies: ${masterData.registrar_of_companies || 'N/A'}`);
    console.log(`  MCA ID: ${masterData.mca_id || 'N/A'}`);
    console.log(`  Jurisdiction: ${masterData.jurisdiction || 'N/A'}`);
    console.log(`  Legal Form: ${masterData.legal_form || 'N/A'}`);
    
    console.log(`\n📋 Complete Field Inventory (All ${Object.keys(masterData).length} fields):`);
    Object.keys(masterData).sort().forEach((key, index) => {
      const value = masterData[key as keyof typeof masterData];
      const truncatedValue = typeof value === 'string' && value.length > 80 
        ? value.substring(0, 80) + '...' 
        : value;
      console.log(`  ${index + 1}. ${key}: ${truncatedValue || 'null'}`);
    });
  }
  
  console.log(`\n✅ Corporate Registration Response Analysis Complete`);
  console.log(`==========================================\n`);
}

export default CORP_REG_FIELD_INDICES;
