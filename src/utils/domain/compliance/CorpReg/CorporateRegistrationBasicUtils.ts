import axios from 'axios';
import * as dotenv from 'dotenv';
dotenv.config();

// Cache for authentication token
let authToken: string | null = null;
let tokenExpiry: number = 0;

interface AuthResponse {
    access_token: string;
    [key: string]: any;
}

interface MasterDataRequest {
    "@entity": string;
    id: string;
    consent: string;
    reason: string;
}

/**
 * Authenticate with the API and get access token
 */
async function authenticate(): Promise<string> {
    // Check if we have a valid cached token
    if (authToken && Date.now() < tokenExpiry) {
        console.log('🔄 Using cached authentication token');
        return authToken;
    }

    const authUrl = process.env.AUTH_URL;
    if (!authUrl) {
        throw new Error('AUTH_URL is not set in environment variables');
    }

    const authHeaders = {
        'x-api-key': process.env.API_KEY || '',
        'x-api-secret': process.env.API_SECRET || '',
        'x-api-version': process.env.API_VERSION || 'v3',
        'Content-Type': 'application/json'
    };

    console.log('\n🔐 ===== AUTHENTICATION REQUEST =====');
    console.log('🌐 Authenticating with:', authUrl);
    console.log('📋 Request Method: POST');
    console.log('🔑 Request Headers:', JSON.stringify({
        'x-api-key': process.env.API_KEY?.substring(0, 10) + '...',
        'x-api-secret': process.env.API_SECRET?.substring(0, 10) + '...',
        'x-api-version': authHeaders['x-api-version'],
        'Content-Type': authHeaders['Content-Type']
    }, null, 2));
    console.log('📊 Request Body: {}');
    console.log('⏰ Request Timestamp:', new Date().toISOString());
    console.log('='.repeat(50));

    try {
        const authResponse = await axios.post(authUrl, {}, {
            headers: authHeaders,
            timeout: 30000
        });

        console.log('\n🔐 ===== AUTHENTICATION RESPONSE =====');
        console.log('✅ Response Status:', authResponse.status, authResponse.statusText);
        console.log('📊 Response Headers:', JSON.stringify(authResponse.headers, null, 2));
        console.log('💾 Response Data Size:', JSON.stringify(authResponse.data).length, 'characters');
        console.log('⏰ Response Timestamp:', new Date().toISOString());
        console.log('\n📋 Complete Response Data:');
        console.log(JSON.stringify(authResponse.data, null, 2));
        console.log('='.repeat(50));

        if (authResponse.status === 200 && authResponse.data?.access_token) {
            const token = authResponse.data.access_token as string;
            authToken = token;
            // Set expiry to 50 minutes (assuming 1 hour token validity)
            tokenExpiry = Date.now() + (50 * 60 * 1000);
            
            console.log('\n🔍 ===== AUTHENTICATION ANALYSIS =====');
            console.log('✅ Authentication successful!');
            console.log('🎫 Token received:', token.substring(0, 20) + '...');
            console.log('📏 Token length:', token.length, 'characters');
            console.log('⏰ Token expires at:', new Date(tokenExpiry).toISOString());
            console.log('🔄 Cache duration: 50 minutes');
            console.log('='.repeat(50));
            
            return token;
        } else {
            throw new Error(`Authentication failed: ${authResponse.status}`);
        }
    } catch (error: any) {
        console.log('\n❌ ===== AUTHENTICATION ERROR =====');
        console.log('⚠️ Error Type:', error.name || 'Unknown');
        console.log('📋 Error Message:', error.message);
        console.log('🌐 Request URL:', authUrl);
        console.log('⏰ Error Timestamp:', new Date().toISOString());
        
        if (error.response) {
            console.log('📊 Error Response Status:', error.response.status, error.response.statusText);
            console.log('📋 Error Response Headers:', JSON.stringify(error.response.headers, null, 2));
            console.log('💾 Error Response Data:', JSON.stringify(error.response.data, null, 2));
        } else if (error.request) {
            console.log('📡 No Response Received');
            console.log('📋 Request Details:', error.request);
        }
        console.log('='.repeat(50));
        
        console.error('Authentication error:', error.response?.data || error.message);
        throw new Error(`Authentication failed: ${error.message}`);
    }
}

/**
 * Fetch master data using the authenticated token
 */
async function fetchMasterData(
    accessToken: string,
    apiUrl: string,
    cin: string
): Promise<any> {

    if(apiUrl !== 'https://api.sandbox.co.in/mca/company/master-data/search') {
        console.log('////////////////////////////////////////**********************************////////////////////////////////')
        const response = await axios.get(`${apiUrl}/${cin}`);
        return response.data;
    }
    else{
        try {
        const body: MasterDataRequest = {
            "@entity": "in.co.sandbox.kyc.mca.master_data.request",
            id: cin,
            consent: process.env.CONSENT || 'Y',
            reason: process.env.REASON || 'basic test'
        };

        const requestHeaders = {
            //'Authorization': `Bearer ${accessToken}`,
            'Authorization': accessToken,
            'x-api-key': process.env.API_KEY || '',
            'x-api-version': process.env.API_VERSION || 'v3',
            'Content-Type': 'application/json'
        };

        console.log('\n📡 ===== CORPORATE REGISTRATION API REQUEST =====');
        console.log('🌐 Making API request to:', apiUrl);
        console.log('📋 Request Method: POST');
        console.log('🔐 Request Headers:', JSON.stringify({
            //'Authorization': `Bearer ${accessToken.substring(0, 20)}...`,
            'Authorization':accessToken,
            'x-api-key': process.env.API_KEY?.substring(0, 10) + '...',
            'x-api-version': requestHeaders['x-api-version'],
            'Content-Type': requestHeaders['Content-Type']
        }, null, 2));
        console.log('📊 Request Body:', JSON.stringify(body, null, 2));
        console.log('⏰ Request Timestamp:', new Date().toISOString());
        console.log('='.repeat(60));

        const response = await axios.post(
            apiUrl,
            body,
            {
                headers: requestHeaders,
                timeout: 30000
            }
        );

        console.log('\n📡 ===== CORPORATE REGISTRATION API RESPONSE =====');
        console.log('✅ Response Status:', response.status, response.statusText);
        console.log('📊 Response Headers:', JSON.stringify(response.headers, null, 2));
        console.log('💾 Response Data Size:', JSON.stringify(response.data).length, 'characters');
        console.log('⏰ Response Timestamp:', new Date().toISOString());
        console.log('\n📋 Complete Response Data:');
        console.log(JSON.stringify(response.data, null, 2));
        console.log('='.repeat(60));

        // Additional response analysis
        if (response.data) {
            console.log('\n🔍 ===== RESPONSE ANALYSIS =====');
            console.log('📊 Response Code:', response.data.code || 'N/A');
            console.log('⏰ API Timestamp:', response.data.timestamp || 'N/A');
            console.log('🆔 Transaction ID:', response.data.transaction_id || 'N/A');
            console.log('📋 Has Data Object:', !!response.data.data);
            console.log('🏢 Has Company Master Data:', !!response.data.data?.company_master_data);
            
            if (response.data.data?.company_master_data) {
                const masterData = response.data.data.company_master_data;
                console.log('📈 Master Data Fields Count:', Object.keys(masterData).length);
                console.log('🏢 Company Name:', masterData.company_name || 'N/A');
                console.log('🆔 CIN:', masterData.cin || 'N/A');
                console.log('📊 Status:', masterData['company_status(for_efiling)'] || masterData.company_status || 'N/A');
            }
            
            if (response.data.data?.charges) {
                console.log('⚖️ Charges Data:', Array.isArray(response.data.data.charges) ? response.data.data.charges.length + ' items' : 'Present');
            }
            
            if (response.data.data?.['directors/signatory_details']) {
                console.log('👥 Directors/Signatory Data:', Array.isArray(response.data.data['directors/signatory_details']) ? response.data.data['directors/signatory_details'].length + ' items' : 'Present');
            }
            console.log('='.repeat(60));
        }

        console.log('\n✅ Corporate Registration API call completed successfully\n');
        return response.data;
    } catch (error: any) {
        console.log('\n❌ ===== CORPORATE REGISTRATION API ERROR =====');
        console.log('⚠️ Error Type:', error.name || 'Unknown');
        console.log('📋 Error Message:', error.message);
        console.log('🌐 Request URL:', apiUrl);
        console.log('⏰ Error Timestamp:', new Date().toISOString());
        
        if (error.response) {
            console.log('📊 Error Response Status:', error.response.status, error.response.statusText);
            console.log('📋 Error Response Headers:', JSON.stringify(error.response.headers, null, 2));
            console.log('💾 Error Response Data:', JSON.stringify(error.response.data, null, 2));
        } else if (error.request) {
            console.log('📡 No Response Received');
            console.log('📋 Request Details:', error.request);
        }
        console.log('='.repeat(60));
        
        console.error('Error fetching master data:', error.response?.data || error.message);
        throw new Error(`Error fetching master data: ${error.response?.data || error.message}`);
    }
    }
    
}

export async function fetchCorporateRegistrationData(cin: string): Promise<any> {
    let BASEURL: string | undefined;
    
    let typeOfNet = process.env.BUILD_ENV ;
    if (!typeOfNet) {
        typeOfNet = 'TESTNET';
    }
    
    console.log('Type of Network:', typeOfNet);
    console.log('CIN:', cin);
    
    if (typeOfNet === 'TESTNET') {
        console.log('+++++++++++++++++++++++++++++++++++++++++++++++++++++in sandbox++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++');
        BASEURL = process.env.CORPREG_URL_SANDBOX_INDIA;
        if (!BASEURL) {
            throw new Error('CORPREG_URL_SANDBOX_INDIA is not set in the environment variables.');
        }
        if (!cin) {
            throw new Error('CIN is required.');
        }
        
        const accessToken = await authenticate();
        return fetchMasterData(accessToken, BASEURL, cin);
        
    } else if (typeOfNet === 'LOCAL') {
        console.log('+++++++++++++++++++++++++++++++++++++++++++++++++++++in sandbox++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++');
        // FIXED: LOCAL now uses same sandbox API and authentication as TESTNET
        BASEURL = process.env.CORPREG_URL_SANDBOX_INDIA;
        if (!BASEURL) {
            throw new Error('CORPREG_URL_SANDBOX_INDIA is not set in the environment variables.');
        }
        if (!cin) {
            throw new Error('CIN is required.');
        }
        
        console.log('Using sandbox API endpoint for LOCAL:', BASEURL);
        const accessToken = await authenticate();
        return fetchMasterData(accessToken, BASEURL, cin);

        // const response =await axios.get(`${BASEURL}/${cin}`);
        // return response.data;
        
    } else {
        console.log('///////////////////////////////////////////////in prod//////////////////////////////////////////////');
        BASEURL = process.env.CORPREG_URL_PROD_INDIA;
        if (!BASEURL) {
            throw new Error('CORPREG_URL_PROD_INDIA is not set in the environment variables.');
        }
        if (!cin) {
            throw new Error('CIN is required.');
        }
        
        const accessToken = await authenticate();
        return fetchMasterData(accessToken, BASEURL, cin);
    }
}
// =================================== Corporate Registration API Response Interface ===================================
interface CorporateRegistrationAPIResponse {
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
  
  // For LOCAL mock data compatibility
  [key: string]: any;
}

// =================================== Enhanced Response Printing Functions ===================================

/**
 * Print comprehensive Corporate Registration API response
 * Similar to GLEIFUtils comprehensive logging
 */
export function printCorporateRegistrationResponse(
  response: CorporateRegistrationAPIResponse,
  companyIdentifier: string,
): void {
  console.log(`\n🏢 ===== CORPORATE REGISTRATION API RESPONSE =====`);
  console.log(`🔍 Query: ${companyIdentifier}`);
  //console.log(`🌐 Network: ${typeOfNet}`);
  console.log(`📅 Timestamp: ${new Date().toISOString()}`);
  console.log(`🔄 API Response Structure Analysis:`);
  
  // Since LOCAL now uses live API, treat it the same as TESTNET/MAINNET for all environments
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
    
    // Core identification fields
    console.log(`\n🆔 Core Identification:`);
    console.log(`  CIN: ${masterData.cin || 'N/A'}`);
    console.log(`  Company Name: ${masterData.company_name || 'N/A'}`);
    console.log(`  Registration Number: ${masterData.registration_number || 'N/A'}`);
    console.log(`  Company Status: ${masterData.company_status || masterData['company_status(for_efiling)'] || 'N/A'}`);
    console.log(`  Date of Incorporation: ${masterData.date_of_incorporation || 'N/A'}`);
    
    // Business classification
    console.log(`\n📊 Business Classification:`);
    console.log(`  Company Type: ${masterData.company_type || 'N/A'}`);
    console.log(`  Company Category: ${masterData.company_category || 'N/A'}`);
    console.log(`  Company Subcategory: ${masterData.company_subcategory || 'N/A'}`);
    console.log(`  Class of Company: ${masterData.class_of_company || 'N/A'}`);
    console.log(`  Number of Partners: ${masterData.number_of_partners || 'N/A'}`);
    
    // Market and regulatory status
    console.log(`\n📈 Market & Regulatory Status:`);
    console.log(`  Listing Status: ${masterData.listing_status || 'N/A'}`);
    console.log(`  Suspended at Stock Exchange: ${masterData.suspended_at_stock_exchange || 'N/A'}`);
    console.log(`  Compliance Status: ${masterData.compliance_status || 'N/A'}`);
    console.log(`  Filing Status: ${masterData.filing_status || 'N/A'}`);
    
    // Financial information
    console.log(`\n💰 Financial Information:`);
    console.log(`  Authorized Capital: ${masterData.authorized_capital || 'N/A'}`);
    console.log(`  Paid Up Capital: ${masterData.paid_up_capital || 'N/A'}`);
    console.log(`  Number of Members: ${masterData.number_of_members || 'N/A'}`);
    console.log(`  Number of Directors: ${masterData.number_of_directors || 'N/A'}`);
    
    // Address information
    console.log(`\n🏠 Address Information:`);
    console.log(`  Registered Address: ${[
    masterData.registered_address_line1,
    masterData.registered_address_line2,
    masterData.registered_city,
    masterData.registered_state,
    masterData.registered_pincode
    ].filter(Boolean).join(', ') || 'N/A'}`);
    
    console.log(`  Corporate Address: ${[
    masterData.corporate_address_line1,
    masterData.corporate_address_line2,
    masterData.corporate_city,
    masterData.corporate_state,
    masterData.corporate_pincode
    ].filter(Boolean).join(', ') || 'N/A'}`);
    
    // Contact information
    console.log(`\n📞 Contact Information:`);
    console.log(`  Email: ${masterData.email || 'N/A'}`);
    console.log(`  Phone: ${masterData.phone || 'N/A'}`);
    console.log(`  Website: ${masterData.website || 'N/A'}`);
    
    // Regulatory details
    console.log(`\n⚖️ Regulatory Details:`);
    console.log(`  ROC Code: ${masterData.roc_code || 'N/A'}`);
    console.log(`  Registrar of Companies: ${masterData.registrar_of_companies || 'N/A'}`);
    console.log(`  MCA ID: ${masterData.mca_id || 'N/A'}`);
    console.log(`  Jurisdiction: ${masterData.jurisdiction || 'N/A'}`);
    console.log(`  Legal Form: ${masterData.legal_form || 'N/A'}`);
    
    // Activity and business details
    console.log(`\n🏭 Business Activity:`);
    console.log(`  Activity Description: ${masterData.activity_description || 'N/A'}`);
    console.log(`  Company Activity Code: ${masterData.company_activity_code || 'N/A'}`);
    console.log(`  Industrial Class: ${masterData.industrial_class || 'N/A'}`);
    
    // Dates and temporal information
    console.log(`\n📅 Important Dates:`);
    console.log(`  Date of Incorporation: ${masterData.date_of_incorporation || 'N/A'}`);
    console.log(`  Last AGM Date: ${masterData.last_agm_date || 'N/A'}`);
    console.log(`  Last BS Date: ${masterData.last_bs_date || 'N/A'}`);
    console.log(`  Last Annual Return Date: ${masterData.last_annual_return_date || 'N/A'}`);
    
    // Complete field inventory
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

/**
 * Enhanced fetch function with comprehensive response printing
 * Compatible with existing fetchCorporateRegistrationData function
 * Enhanced to support jurisdiction parameter for multi-jurisdiction support
 */
export async function fetchCorporateRegistrationDataWithFullLogging(
  cin: string,
  jurisdiction: string = 'IN'
): Promise<CorporateRegistrationAPIResponse> {
  console.log(`\n🚀 Starting Corporate Registration Data Fetch`);
  console.log(`🔍 CIN: ${cin}`);
  //console.log(`🌐 Network Type: ${typeOfNet}`);
  console.log(`📡 All environments now use LIVE API`);
  
  try {
    // Import the existing utility function to avoid breaking existing code
    //const { fetchCorporateRegistrationData } = await import('./CorporateRegistrationUtils.js');
    
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
 * Extract company summary for logging
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
 * Business rule analysis for Corporate Registration compliance
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
 * Check if a company is Corporate Registration compliant
 */
export function isCompanyCorporateRegistrationCompliant(
  companyDataOrCin: CorporateRegistrationAPIResponse | string
): boolean | Promise<boolean> {
  if (typeof companyDataOrCin === 'string') {
    // If string provided, fetch data first
    return fetchCorporateRegistrationDataWithFullLogging(companyDataOrCin )
      .then(apiResponse => {
        const analysis = analyzeCorporateRegistrationCompliance(apiResponse);
        return analysis.isCompliant;
      });
  } else {
    // If API response provided, analyze directly
    const analysis = analyzeCorporateRegistrationCompliance(companyDataOrCin);
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
//     const isCompliant = await isCompanyCorporateRegistrationCompliant(companyName);

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