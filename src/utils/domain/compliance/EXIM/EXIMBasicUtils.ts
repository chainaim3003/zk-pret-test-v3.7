import axios from 'axios';
import * as dotenv from 'dotenv';
dotenv.config();

export async function fetchEXIMCompanyData(companyName: string): Promise<any> {
    //const BASEURL = process.env.GLEIF_URL_PROD;
    let BASEURL: string | undefined;
    let url: string;
    let typeOfNet = process.env.BUILD_ENV;
    if (!typeOfNet) {
        typeOfNet = 'TESTNET';
    }
    console.log('Type of Network:', typeOfNet);
    if (typeOfNet === 'TESTNET') {
        console.log('+++++++++++++++++++++++++++++++++++++++++++++++++++++in sandbox++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++');
        BASEURL = process.env.EXIM_URL_MOCK_INDIA;
        if (!BASEURL) {
        throw new Error('BASEURL is not set in the environment variables.');
        }
        if (!companyName) {
            throw new Error('Company name is required.');
        }
        url = `${BASEURL}/${companyName}`;
   } else if (typeOfNet === 'LOCAL') {
        console.log('------------------------------------------------using live API for LOCAL--------------------------------------------------');
        // Changed: LOCAL now uses live production API instead of mock
        BASEURL = process.env.EXIM_URL_MOCK_INDIA;
        if (!BASEURL) {
        throw new Error('BASEURL is not set in the environment variables.');
        }
        if (!companyName) {
            throw new Error('Company name is required.');
        }
        url = `${BASEURL}/${companyName}`;
    }
    else{
        console.log('///////////////////////////////////////////////in prod//////////////////////////////////////////////');
        BASEURL = process.env.EXIM_URL_MOCK_INDIA;
        if (!BASEURL) {
        throw new Error('BASEURL is not set in the environment variables.');
        }
        if (!companyName) {
            throw new Error('Company name is required.');
        }
        url = `${BASEURL}/${companyName}`;
    }
    const response = await axios.get(url);
    const parsedData = response.data;
    console.log('EXIM API Response:', parsedData);

    // if (!parsedData.data || parsedData.data.length === 0) {
    // throw new Error('No company found with that name.');
    // }

    return parsedData;
}


export interface EXIMAPIResponse {
  success?: boolean;
  iec?: string;
  entityName?: string;
  iecIssueDate?: string;
  pan?: string;
  iecStatus?: number;
  iecModificationDate?: string;
  dataAsOn?: string;
  
  // Additional EXIM fields
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
  
  // Branch and director data
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
  
  error?: string;
  message?: string;
  
  // For compatibility
  [key: string]: any;
}

export interface ComplianceAnalysis {
  isCompliant: boolean;
  complianceScore: number;
  issues: string[];
  businessRuleResults: {
    entityNameNotEmpty: boolean;
    iecNotEmpty: boolean;
    panNotEmpty: boolean;
    iecIssueDateExists: boolean;
    iecModificationDateExists: boolean;
    dataAsOnValid: boolean;
    iecStatusCompliant: boolean;
  };
}

// =================================== API INTEGRATION FUNCTIONS ===================================

/**
 * Enhanced fetch function with comprehensive response logging
 * PARALLEL TO: fetchGLEIFDataWithFullLogging in GLEIFCoreAPIUtils.ts
 */
export async function fetchEXIMDataWithFullLogging(
  companyName: string
): Promise<EXIMAPIResponse> {
  console.log(`\n🚀 Starting EXIM Data Fetch`);
  console.log(`🔍 Company Name: ${companyName}`);
  
  try {
    // Import the existing utility function to avoid breaking existing code
    //const { fetchEXIMCompanyData } = await import('./EXIMUtils.js');
    
    // Use the existing function to get the data
    const response = await fetchEXIMCompanyData(companyName);
    
    // Print comprehensive response analysis
    printEXIMResponse(response, companyName);
    
    return response;
    
  } catch (error: any) {
    console.error(`❌ Error in EXIM Data Fetch:`, error.message);
    
    // Print error details
    console.log(`\n🚨 Error Details:`);
    console.log(`  Error Type: ${error.name || 'Unknown'}`);
    console.log(`  Error Message: ${error.message}`);
    if (error.response?.data) {
      console.log(`  API Error Response:`, JSON.stringify(error.response, null, 2));
    }
    if (error.response?.status) {
      console.log(`  HTTP Status: ${error.response.status}`);
    }
    
    throw error;
  }
}

/**
 * Print comprehensive EXIM API response
 * PARALLEL TO: GLEIF response printing functions
 */
export function printEXIMResponse(
  response: EXIMAPIResponse,
  companyIdentifier: string
): void {
  console.log(`\n🚢 ===== EXIM API RESPONSE =====`);
  console.log(`🔍 Query: ${companyIdentifier}`);
  console.log(`📅 Timestamp: ${new Date().toISOString()}`);
  console.log(`🔄 API Response Structure Analysis:`);
  
  console.log(`📋 Production API Response:`);
  console.log(`  Success: ${response.success || 'unknown'}`);
  console.log(`  Has Data: ${!!response}`);
  
  if (response.error) {
    console.log(`  ❌ Error: ${response.error}`);
  }
  
  if (response.message) {
    console.log(`  💬 Message: ${response.message}`);
  }
    
  const data = response;
  if (data) {
    console.log(`\n🚢 EXIM Data Analysis:`);
    console.log(`  Total Fields Available: ${Object.keys(data).length}`);
    
    // Core identification fields
    console.log(`\n🆔 Core Identification:`);
    console.log(`  IEC: ${data.iec || 'N/A'}`);
    console.log(`  Entity Name: ${data.entityName || 'N/A'}`);
    console.log(`  PAN: ${data.pan || 'N/A'}`);
    console.log(`  IEC Status: ${data.iecStatus !== undefined ? data.iecStatus : 'N/A'}`);
    
    // Temporal information
    console.log(`\n📅 Important Dates:`);
    console.log(`  IEC Issue Date: ${data.iecIssueDate || 'N/A'}`);
    console.log(`  IEC Modification Date: ${data.iecModificationDate || 'N/A'}`);
    console.log(`  Data As On: ${data.dataAsOn || 'N/A'}`);
    
    // Status information
    console.log(`\n📊 Status Information:`);
    console.log(`  IEC Status: ${data.iecStatus !== undefined ? data.iecStatus : 'N/A'}`);
    console.log(`  Exporter Type: ${data.exporterType !== undefined ? data.exporterType : 'N/A'}`);
    console.log(`  Active Compliance Status Code: ${data.activeComplianceStatusCode !== undefined ? data.activeComplianceStatusCode : 'N/A'}`);
    console.log(`  Star Status: ${data.starStatus !== undefined ? data.starStatus : 'N/A'}`);
    console.log(`  Nature of Concern: ${data.natureOfConcern !== undefined ? data.natureOfConcern : 'N/A'}`);
    
    // Address information
    console.log(`\n🏠 Address Information:`);
    console.log(`  Address Line 1: ${data.addressLine1 || 'N/A'}`);
    console.log(`  Address Line 2: ${data.addressLine2 || 'N/A'}`);
    console.log(`  City: ${data.city || 'N/A'}`);
    console.log(`  State: ${data.state || 'N/A'}`);
    console.log(`  PIN: ${data.pin !== undefined ? data.pin : 'N/A'}`);
    
    // Contact information
    console.log(`\n📞 Contact Information:`);
    console.log(`  Contact No: ${data.contactNo !== undefined ? data.contactNo : 'N/A'}`);
    console.log(`  Email: ${data.email || 'N/A'}`);
    
    // Complete field inventory
    console.log(`\n📋 Complete Field Inventory (All fields):`);
    Object.keys(data).sort().forEach((key, index) => {
      const value = data[key as keyof typeof data];
      if (Array.isArray(value)) {
        console.log(`  ${index + 1}. ${key}: [Array with ${value.length} items]`);
      } else {
        const truncatedValue = typeof value === 'string' && value.length > 80 
          ? value.substring(0, 80) + '...' 
          : value;
        console.log(`  ${index + 1}. ${key}: ${truncatedValue !== undefined ? truncatedValue : 'null'}`);
      }
    });
  }
  
  console.log(`\n✅ EXIM Response Analysis Complete`);
  console.log(`==========================================\n`);
}

// =================================== COMPLIANCE ANALYSIS FUNCTIONS ===================================

/**
 * Business rule analysis for EXIM compliance
 * PARALLEL TO: analyzeGLEIFCompliance in GLEIFCoreAPIUtils.ts
 */
export function analyzeEXIMCompliance(
  response: EXIMAPIResponse
): ComplianceAnalysis {
  const summary = extractEXIMSummary(response);
  const issues: string[] = [];
  
  // Business rule checks based on user specification
  const businessRuleResults = {
    entityNameNotEmpty: summary.entityName !== '' && summary.entityName !== 'UNKNOWN' && summary.entityName !== null && summary.entityName !== undefined,
    iecNotEmpty: summary.iec !== '' && summary.iec !== 'UNKNOWN' && summary.iec !== null && summary.iec !== undefined,
    panNotEmpty: summary.pan !== '' && summary.pan !== 'UNKNOWN' && summary.pan !== null && summary.pan !== undefined,
    iecIssueDateExists: summary.iecIssueDate !== '' && summary.iecIssueDate !== 'UNKNOWN' && summary.iecIssueDate !== null && summary.iecIssueDate !== undefined,
    iecModificationDateExists: summary.iecModificationDate !== '' && summary.iecModificationDate !== 'UNKNOWN' && summary.iecModificationDate !== null && summary.iecModificationDate !== undefined,
    dataAsOnValid: summary.dataAsOn !== '' && summary.dataAsOn !== 'UNKNOWN' && summary.dataAsOn !== null && summary.dataAsOn !== undefined,
    iecStatusCompliant: [0, 4, 7, 8].includes(summary.iecStatus)
  };
  
  // Collect issues based on user specification
  if (!businessRuleResults.entityNameNotEmpty) {
    issues.push('Entity name is empty or missing');
  }
  if (!businessRuleResults.iecNotEmpty) {
    issues.push('IEC is empty or missing');
  }
  if (!businessRuleResults.panNotEmpty) {
    issues.push('PAN is empty or missing');
  }
  if (!businessRuleResults.iecIssueDateExists) {
    issues.push('IEC issue date is missing');
  }
  if (!businessRuleResults.iecModificationDateExists) {
    issues.push('IEC modification date is missing');
  }
  if (!businessRuleResults.dataAsOnValid) {
    issues.push('Data as on date is invalid or missing');
  }
  if (!businessRuleResults.iecStatusCompliant) {
    issues.push(`IEC status is not compliant. Expected: 0, 4, 7, or 8. Got: ${summary.iecStatus}`);
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
 * Extract company summary for logging
 * PARALLEL TO: GLEIF summary extraction functions
 */
export function extractEXIMSummary(
  response: EXIMAPIResponse
): {
  iec: string;
  entityName: string;
  iecIssueDate: string;
  pan: string;
  iecStatus: number;
  iecModificationDate: string;
  dataAsOn: string;
} {
  const data = response || {};
  return {
    iec: data.iec || 'UNKNOWN',
    entityName: data.entityName || 'UNKNOWN',
    iecIssueDate: data.iecIssueDate || 'UNKNOWN',
    pan: data.pan || 'UNKNOWN',
    iecStatus: data.iecStatus !== undefined ? data.iecStatus : -1,
    iecModificationDate: data.iecModificationDate || 'UNKNOWN',
    dataAsOn: data.dataAsOn || 'UNKNOWN'
  };
}



export function isCompanyEXIMCompliant(
  companyDataOrName: EXIMAPIResponse | string
): boolean | Promise<boolean> {
  if (typeof companyDataOrName === 'string') {
    // If string provided, fetch data first
    return fetchEXIMDataWithFullLogging(companyDataOrName)
      .then(apiResponse => {
        const analysis = analyzeEXIMCompliance(apiResponse);
        return analysis.isCompliant;
      });
  } else {
    // If API response provided, analyze directly
    const analysis = analyzeEXIMCompliance(companyDataOrName);
    return analysis.isCompliant;
  }
}

/**
 * Main entrypoint for testing EXIM compliance
 * Usage: ts-node EXIMCoreAPIUtils.ts "CompanyName"
 */
// async function main() {
//   try {
//     // Get company name from CLI args (default fallback)
//     const companyName = process.argv[2] ;

//     console.log(`\n🏁 Starting compliance check for: ${companyName}\n`);

//     // Call compliance check
//     const isCompliant = await isCompanyEXIMCompliant(companyName);

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
