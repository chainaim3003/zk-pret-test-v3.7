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

    // console.log('\n🎯 ZK CIRCUIT OPTIMIZATION ANALYSIS:');
    // console.log('='.repeat(100));
    //analyzeGLEIFStructureForZK(record);

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

export function isCompanyGLEIFCompliant(
  companyDataOrCin: GLEIFAPIResponse | string
): boolean | Promise<boolean> {
  if (typeof companyDataOrCin === 'string') {
    // If string provided, fetch data first
    return fetchGLEIFDataWithFullLogging(companyDataOrCin )
      .then(apiResponse => {
        const analysis = analyzeGLEIFCompliance(apiResponse);
        return analysis.isCompliant;
      });
  } else {
    // If API response provided, analyze directly
    const analysis = analyzeGLEIFCompliance(companyDataOrCin);
    return analysis.isCompliant;
  }
}

// //export type { CorporateRegistrationAPIResponse };
// async function main() {
//   try {
//     // Get company name from CLI args (default fallback)
//     const companyName = process.argv[2] ;

//     console.log(`\n🏁 Starting compliance check for: ${companyName}\n`);

//     // Call compliance check
//     const isCompliant = await isCompanyGLEIFCompliant(companyName);

//     console.log(`\n📊 Compliance Result:`);
//     console.log(`   Company: ${companyName}`);
//     console.log(`   Compliant: ${isCompliant ? "✅ YES" : "❌ NO"}`);

//     process.exit(0);
//   } catch (err: any) {
//     console.error(`\n🚨 Error in main(): ${err.message}`);
//     process.exit(1);
//   }
// }

// // If this file is executed directly (not imported), run main
// main();