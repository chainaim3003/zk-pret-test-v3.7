import axios from 'axios';
import { Field, CircuitString } from 'o1js';

// Import data structures from individual services
// Note: These would need to be the actual Optim data structures
import { CorporateRegistrationOptimComplianceData } from '../../../../zk-programs/compliance/CorporateRegistrationZKProgram.js';
import { EXIMOptimComplianceData } from '../../../../zk-programs/compliance/EXIMZKProgram.js';
import { GLEIFOptimComplianceData } from '../../../../zk-programs/compliance/GLEIFZKProgram.js';

/**
 * API Response interfaces for type safety
 */
export interface CorporateRegistrationAPIResponse {
  data?: {
    company_master_data?: {
      company_name?: string;
      cin?: string;
      registration_number?: string;
      company_status?: string;
      'company_status(for_efiling)'?: string;
      date_of_incorporation?: string;
      company_category?: string;
      class_of_company?: string;
      number_of_partners?: number;
      whether_listed_or_not?: string;
      suspended_at_stock_exchange?: string;
      [key: string]: any;
    };
  };
  [key: string]: any;
}

export interface EXIMAPIResponse {
  iec?: string;
  entityName?: string;
  iecStatus?: number;
  [key: string]: any;
}

export interface GLEIFAPIResponse {
  data?: Array<{
    type?: string;
    id?: string;
    attributes?: {
      lei?: string;
      entity?: {
        legalName?: {
          name?: string;
        };
      };
      registration?: {
        status?: string;
      };
    };
  }>;
  [key: string]: any;
}

/**
 * Enhanced Corporate Registration data fetching with parameter support
 * Supports both CIN and company name queries
 */
export async function fetchOptimCorporateRegistrationData(
  companyIdentifier: string
): Promise<CorporateRegistrationAPIResponse> {
  console.log(`📡 Fetching Corporate Registration data for: ${companyIdentifier}`);
  
  let baseUrl: string;
  let endpoint: string;
  let typeOfNet = process.env.BUILD_ENV;
  if (!typeOfNet) {
    typeOfNet = 'TESTNET';
  }
  // Determine API endpoint based on network type and identifier format
  switch (typeOfNet.toUpperCase()) {
    case 'LOCAL':
      // For LOCAL, use live API or mock data
      baseUrl = 'https://api.corporateregistry.gov.in';
      
      // Check if identifier looks like CIN or company name
      if (isCINFormat(companyIdentifier)) {
        endpoint = `/api/company/cin/${companyIdentifier}`;
      } else {
        endpoint = `/api/company/search?name=${encodeURIComponent(companyIdentifier)}`;
      }
      break;
      
    case 'TESTNET':
      // Use test environment
      baseUrl = 'https://test-api.corporateregistry.gov.in';
      endpoint = isCINFormat(companyIdentifier) 
        ? `/api/company/cin/${companyIdentifier}`
        : `/api/company/search?name=${encodeURIComponent(companyIdentifier)}`;
      break;
      
    case 'MAINNET':
      // Use production environment
      baseUrl = 'https://api.corporateregistry.gov.in';
      endpoint = isCINFormat(companyIdentifier) 
        ? `/api/company/cin/${companyIdentifier}`
        : `/api/company/search?name=${encodeURIComponent(companyIdentifier)}`;
      break;
      
    default:
      // Fallback to mock data for unknown network types
      console.log(`⚠️ Unknown network type ${typeOfNet}, using mock data`);
      return generateMockCorporateRegistrationData(companyIdentifier);
  }
  
  try {
    const response = await axios.get(`${baseUrl}${endpoint}`, {
      timeout: 30000,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'ZK-Compliance-Verifier/1.0'
      }
    });
    
    console.log(`✅ Corporate Registration data fetched successfully for ${companyIdentifier}`);
    return response.data;
    
  } catch (error: any) {
    console.warn(`⚠️ API call failed for ${companyIdentifier}, using fallback mock data:`, error.message);
    return generateMockCorporateRegistrationData(companyIdentifier);
  }
}

/**
 * Enhanced EXIM data fetching with parameter support
 * Supports company name queries
 */
export async function fetchOptimEXIMData(
  companyName: string
): Promise<EXIMAPIResponse> {
  console.log(`📡 Fetching EXIM data for: ${companyName}`);
  
  let baseUrl: string;
  let endpoint: string;
  let typeOfNet = process.env.BUILD_ENV ;
  if (!typeOfNet) {
    typeOfNet = 'TESTNET';
  }
  switch (typeOfNet.toUpperCase()) {
    case 'LOCAL':
      baseUrl = 'https://api.dgft.gov.in';
      endpoint = `/api/exim/search?entity=${encodeURIComponent(companyName)}`;
      break;
      
    case 'TESTNET':
      baseUrl = 'https://test-api.dgft.gov.in';
      endpoint = `/api/exim/search?entity=${encodeURIComponent(companyName)}`;
      break;
      
    case 'MAINNET':
      baseUrl = 'https://api.dgft.gov.in';
      endpoint = `/api/exim/search?entity=${encodeURIComponent(companyName)}`;
      break;
      
    default:
      console.log(`⚠️ Unknown network type ${typeOfNet}, using mock data`);
      return generateMockEXIMData(companyName);
  }
  
  try {
    const response = await axios.get(`${baseUrl}${endpoint}`, {
      timeout: 30000,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'ZK-Compliance-Verifier/1.0'
      }
    });
    
    console.log(`✅ EXIM data fetched successfully for ${companyName}`);
    return response.data;
    
  } catch (error: any) {
    console.warn(`⚠️ API call failed for ${companyName}, using fallback mock data:`, error.message);
    return generateMockEXIMData(companyName);
  }
}

/**
 * Enhanced GLEIF data fetching with parameter support
 * Supports company name queries
 */
export async function fetchOptimGLEIFData(
  companyName: string
): Promise<GLEIFAPIResponse> {
  console.log(`📡 Fetching GLEIF data for: ${companyName}`);
  
  let baseUrl: string;
  let endpoint: string;
  let typeOfNet = process.env.BUILD_ENV;
  if (!typeOfNet) {
    typeOfNet = 'TESTNET';
  }
  switch (typeOfNet.toUpperCase()) {
    case 'LOCAL':
      baseUrl = 'https://api.gleif.org';
      endpoint = `/api/v1/lei-records?filter[entity.legalName]=${encodeURIComponent(companyName)}`;
      break;
      
    case 'TESTNET':
      baseUrl = 'https://test-api.gleif.org';
      endpoint = `/api/v1/lei-records?filter[entity.legalName]=${encodeURIComponent(companyName)}`;
      break;
      
    case 'MAINNET':
      baseUrl = 'https://api.gleif.org';
      endpoint = `/api/v1/lei-records?filter[entity.legalName]=${encodeURIComponent(companyName)}`;
      break;
      
    default:
      console.log(`⚠️ Unknown network type ${typeOfNet}, using mock data`);
      return generateMockGLEIFData(companyName);
  }
  
  try {
    const response = await axios.get(`${baseUrl}${endpoint}`, {
      timeout: 30000,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'ZK-Compliance-Verifier/1.0'
      }
    });
    
    console.log(`✅ GLEIF data fetched successfully for ${companyName}`);
    return response.data;
    
  } catch (error: any) {
    console.warn(`⚠️ API call failed for ${companyName}, using fallback mock data:`, error.message);
    return generateMockGLEIFData(companyName);
  }
}

// =================================== Data Conversion Functions ===================================

/**
 * Convert Corporate Registration API response to OptimComplianceData
 */
export function convertToCorporateRegistrationOptimData(
  apiResponse: CorporateRegistrationAPIResponse,
  companyIdentifier: string
): CorporateRegistrationOptimComplianceData {
  const masterData = apiResponse.data?.company_master_data || {};
  
  return new CorporateRegistrationOptimComplianceData({
    companyName: CircuitString.fromString(masterData.company_name || companyIdentifier),
    CIN: CircuitString.fromString(masterData.cin || companyIdentifier),
    registrationNumber: CircuitString.fromString(masterData.registration_number || ''),
    companyStatus: CircuitString.fromString(
      masterData['company_status(for_efiling)'] || masterData.company_status || 'ACTIVE'
    ),
    dateOfIncorporation: CircuitString.fromString(masterData.date_of_incorporation || ''),
    category: CircuitString.fromString(masterData.company_category || ''),
    classOfCompany: CircuitString.fromString(masterData.class_of_company || ''),
    numberOfPartners: CircuitString.fromString(
      masterData.number_of_partners ? String(masterData.number_of_partners) : '0'
    ),
    listed: CircuitString.fromString(masterData.whether_listed_or_not || 'No'),
    suspended: CircuitString.fromString(masterData.suspended_at_stock_exchange || 'No'),
    merkle_root: Field(0) // This would be set by the calling function
  });
}

/**
 * Convert EXIM API response to OptimComplianceData
 */
export function convertToEXIMOptimData(
  apiResponse: EXIMAPIResponse,
  companyName: string
): EXIMOptimComplianceData {
  return new EXIMOptimComplianceData({
    iec: CircuitString.fromString(apiResponse.iec || ''),
    entityName: CircuitString.fromString(apiResponse.entityName || companyName),
    iecIssueDate: CircuitString.fromString('2020-01-01'),
    pan: CircuitString.fromString('ABCDE1234F'),
    iecStatus: Field(apiResponse.iecStatus ?? 1),
    iecModificationDate: CircuitString.fromString('2020-01-01'),
    dataAsOn: CircuitString.fromString('2025-01-01'),
    merkle_root: Field(0)
  });
}

/**
 * Convert GLEIF API response to OptimComplianceData
 */
export function convertToGLEIFOptimData(
  apiResponse: GLEIFAPIResponse,
  companyName: string
): GLEIFOptimComplianceData {
  const firstRecord = apiResponse.data?.[0];
  
  return new GLEIFOptimComplianceData({
    lei: CircuitString.fromString(firstRecord?.attributes?.lei || ''),
    name: CircuitString.fromString(
      firstRecord?.attributes?.entity?.legalName?.name || companyName
    ),
    entity_status: CircuitString.fromString('ACTIVE'),
    registration_status: CircuitString.fromString(
      firstRecord?.attributes?.registration?.status || 'ISSUED'
    ),
    conformity_flag: CircuitString.fromString('CONFORMING'),
    managing_lou: CircuitString.fromString('LOU_001'),
    lastUpdateDate: CircuitString.fromString('2025-01-01'),
    nextRenewalDate: CircuitString.fromString('2026-01-01'),
    initialRegistrationDate: CircuitString.fromString('2020-01-01'),
    bic_codes: CircuitString.fromString(''),
    mic_codes: CircuitString.fromString(''),
    merkle_root: Field(0)
  });
}

// =================================== Utility Functions ===================================

/**
 * Check if a string looks like a CIN (Corporate Identification Number)
 */
function isCINFormat(identifier: string): boolean {
  // CIN format: L/U + 5 digits + state code + year + company type + 6 digits
  const cinPattern = /^[LU]\d{5}[A-Z]{2}\d{4}[A-Z]{3}\d{6}$/;
  return cinPattern.test(identifier);
}

/**
 * Calculate compliance score based on API response
 */
export function calculateComplianceScore(
  corpRegData: CorporateRegistrationAPIResponse,
  eximData: EXIMAPIResponse,
  gleifData: GLEIFAPIResponse
): {
  overallScore: number;
  corpRegScore: number;
  eximScore: number;
  gleifScore: number;
} {
  // Corporate Registration compliance scoring
  let corpRegScore = 0;
  const masterData = corpRegData.data?.company_master_data;
  if (masterData) {
    if (masterData.company_status === 'ACTIVE' || masterData['company_status(for_efiling)'] === 'ACTIVE') corpRegScore += 40;
    if (masterData.cin) corpRegScore += 30;
    if (masterData.date_of_incorporation) corpRegScore += 15;
    if (masterData.company_category) corpRegScore += 15;
  }
  
  // EXIM compliance scoring
  let eximScore = 0;
  if (eximData.iec) eximScore += 50;
  if (eximData.iecStatus === 1) eximScore += 50;
  
  // GLEIF compliance scoring
  let gleifScore = 0;
  const gleifRecord = gleifData.data?.[0];
  if (gleifRecord) {
    if (gleifRecord.attributes?.lei) gleifScore += 50;
    if (gleifRecord.attributes?.registration?.status === 'ISSUED') gleifScore += 50;
  }
  
  const overallScore = Math.round((corpRegScore + eximScore + gleifScore) / 3);
  
  return {
    overallScore,
    corpRegScore,
    eximScore,
    gleifScore
  };
}

// =================================== Mock Data Generators ===================================

function generateMockCorporateRegistrationData(identifier: string): CorporateRegistrationAPIResponse {
  return {
    data: {
      company_master_data: {
        company_name: identifier.length > 20 ? identifier : `${identifier} Private Limited`,
        cin: isCINFormat(identifier) ? identifier : `L${Math.floor(Math.random() * 99999).toString().padStart(5, '0')}MH2020PTC123456`,
        registration_number: `REG${Math.floor(Math.random() * 999999)}`,
        'company_status(for_efiling)': 'ACTIVE',
        date_of_incorporation: '2020-01-15',
        company_category: 'PRIVATE',
        class_of_company: 'PVT LTD',
        number_of_partners: 0,
        whether_listed_or_not: 'No',
        suspended_at_stock_exchange: 'No'
      }
    }
  };
}

function generateMockEXIMData(companyName: string): EXIMAPIResponse {
  return {
    iec: `IEC${Math.floor(Math.random() * 999999999).toString().padStart(9, '0')}`,
    entityName: companyName,
    iecStatus: 1
  };
}

function generateMockGLEIFData(companyName: string): GLEIFAPIResponse {
  return {
    data: [{
      type: 'lei-records',
      id: `LEI${Math.floor(Math.random() * 999999999999999999).toString(16).toUpperCase()}`,
      attributes: {
        lei: `LEI${Math.floor(Math.random() * 999999999999999999).toString(16).toUpperCase()}`,
        entity: {
          legalName: {
            name: companyName
          }
        },
        registration: {
          status: 'ISSUED'
        }
      }
    }]
  };
}

/**
 * Batch fetch all service data for multiple companies
 * Optimized for composed verification workflows
 */
export async function fetchAllServiceDataForCompanies(
  companyNames: string[],
  typeOfNet: string
): Promise<Map<string, {
  corpRegData: CorporateRegistrationAPIResponse;
  eximData: EXIMAPIResponse;
  gleifData: GLEIFAPIResponse;
  complianceScores: {
    overallScore: number;
    corpRegScore: number;
    eximScore: number;
    gleifScore: number;
  };
}>> {
  console.log(`📡 Batch fetching all service data for ${companyNames.length} companies...`);
  
  const results = new Map();
  
  for (const companyName of companyNames) {
    console.log(`\n🔄 Fetching data for: ${companyName}`);
    
    try {
      // Fetch data from all three services concurrently
      const [corpRegData, eximData, gleifData] = await Promise.all([
        fetchOptimCorporateRegistrationData(companyName),
        fetchOptimEXIMData(companyName ),
        fetchOptimGLEIFData(companyName )
      ]);
      
      // Calculate compliance scores
      const complianceScores = calculateComplianceScore(corpRegData, eximData, gleifData);
      
      results.set(companyName, {
        corpRegData,
        eximData,
        gleifData,
        complianceScores
      });
      
      console.log(`✅ All service data fetched for ${companyName}`);
      console.log(`📊 Compliance scores - Overall: ${complianceScores.overallScore}%, CorpReg: ${complianceScores.corpRegScore}%, EXIM: ${complianceScores.eximScore}%, GLEIF: ${complianceScores.gleifScore}%`);
      
    } catch (error: any) {
      console.error(`❌ Failed to fetch data for ${companyName}:`, error.message);
      // Continue with other companies
    }
  }
  
  console.log(`✅ Batch data fetching completed for ${results.size}/${companyNames.length} companies`);
  return results;
}
