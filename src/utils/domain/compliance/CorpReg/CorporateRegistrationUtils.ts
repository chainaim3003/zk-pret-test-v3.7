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
