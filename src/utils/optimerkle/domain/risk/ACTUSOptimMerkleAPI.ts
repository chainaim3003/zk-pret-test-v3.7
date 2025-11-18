/**
 * ====================================================================
 * ACTUS API Interface for Risk Scenarios
 * ====================================================================
 * Centralized API interface for ACTUS engine calls
 * Used by all risk verification tests (Advanced, Basel3, StableCoin)
 * ====================================================================
 */

import axios from 'axios';

// =================================== API Response Interface ===================================

export interface ACTUSOptimMerkleAPIResponse {
    inflow: number[][];
    outflow: number[][];
    periodsCount: number;          // Changed from monthsCount for flexibility (daily/monthly/yearly)
    contractDetails: any[];
    riskMetrics: any;
    metadata: {
        timeHorizon: string;        // 'daily', 'monthly', 'yearly'
        currency: string;
        processingDate: string;
    };
}

// =================================== Contract Input Interface ===================================

export interface ACTUSContract {
    contractType: string;
    contractID: string;
    contractRole: string;
    contractDealDate: string;
    initialExchangeDate?: string;
    statusDate: string;
    notionalPrincipal: string;
    currency: string;
    [key: string]: any;  // Allow additional contract-specific fields
}

export interface ACTUSRequestData {
    contracts: ACTUSContract[];
    riskFactors: any[];
}

// =================================== API Service Functions ===================================

/**
 * Generic ACTUS API call function
 * Can be used by all risk scenarios with custom contract portfolios
 */
export async function callACTUSAPI(
    url: string,
    contracts: ACTUSContract[],
    riskFactors: any[] = []
): Promise<ACTUSOptimMerkleAPIResponse> {
    // Strip out non-ACTUS fields (like hqlaCategory) before sending to API
    const cleanedContracts = contracts.map(contract => {
        const { hqlaCategory, reserveType, liquidityScore, ...cleanContract } = contract;
        return cleanContract;
    });
    
    const requestData: ACTUSRequestData = {
        contracts: cleanedContracts,
        riskFactors
    };

    try {
        const response = await axios.post(url, requestData);
        const jsonData = response.data;
        
        return {
            inflow: jsonData.inflow || [],
            outflow: jsonData.outflow || [],
            periodsCount: jsonData.monthsCount || jsonData.periodsCount || 0,
            contractDetails: jsonData.contractDetails || [],
            riskMetrics: jsonData.riskMetrics || {},
            metadata: {
                timeHorizon: jsonData.timeHorizon || 'monthly',
                currency: jsonData.currency || 'USD',
                processingDate: new Date().toISOString()
            }
        };
    } catch (error) {
        console.error('Error calling ACTUS API:', error);
        throw new Error(`ACTUS API call failed: ${error}`);
    }
}

/**
 * Load contract portfolio from file or return default
 * Enables flexible contract input (file upload or server-based)
 */
export async function loadContractPortfolio(
    portfolioSource?: string | ACTUSContract[]
): Promise<ACTUSContract[]> {
    // If array provided directly, use it
    if (Array.isArray(portfolioSource)) {
        return portfolioSource;
    }
    
    // If file path provided, load from file
    if (portfolioSource && typeof portfolioSource === 'string') {
        try {
            const fs = await import('fs/promises');
            const fileContent = await fs.readFile(portfolioSource, 'utf-8');
            const parsed = JSON.parse(fileContent);
            return parsed.contracts || parsed;
        } catch (error) {
            console.warn(`Could not load portfolio from ${portfolioSource}, using default`);
        }
    }
    
    // Return default portfolio for testing
    return getDefaultContractPortfolio();
}

/**
 * Default contract portfolio for testing/demo purposes
 * USING EXACT ORIGINAL CONTRACTS from existing tests for 100% compatibility
 */
export function getDefaultContractPortfolio(): ACTUSContract[] {
    return [
        {
            "contractType": "PAM",
            "contractID": "pam01",
            "contractRole": "RPA",
            "contractDealDate": "2023-01-01T00:00:00",
            "initialExchangeDate": "2023-01-02T00:00:00",
            "statusDate": "2023-01-01T00:00:00",
            "notionalPrincipal": "10000",
            "maturityDate": "2023-06-01T00:00:00",
            "nominalInterestRate": "0.05",
            "currency": "USD",
            "dayCountConvention": "A365"
        },
        {
            "contractType": "ANN",
            "contractID": "ann01",
            "contractRole": "RPA",
            "contractDealDate": "2023-12-28T00:00:00",
            "initialExchangeDate": "2024-01-01T00:00:00",
            "statusDate": "2023-12-30T00:00:00",
            "notionalPrincipal": "5000",
            "cycleAnchorDateOfPrincipalRedemption": "2024-02-01T00:00:00",
            "nextPrincipalRedemptionPayment": "434.866594118346",
            "dayCountConvention": "A365",
            "nominalInterestRate": "0.08",
            "currency": "USD",
            "cycleOfPrincipalRedemption": "P1ML0",
            "maturityDate": "2025-01-01T00:00:00",
            "rateMultiplier": "1.0",
            "rateSpread": "0.0",
            "fixingDays": "P0D",
            "cycleAnchorDateOfInterestPayment": "2024-02-01T00:00:00",
            "cycleOfInterestPayment": "P1ML0"
        },
        {
            "contractType": "STK",
            "contractID": "stk01",
            "contractRole": "RPA",
            "contractDealDate": "2023-12-28T00:00:00",
            "statusDate": "2023-12-30T00:00:00",
            "notionalPrincipal": "1000",
            "currency": "USD",
            "purchaseDate": "2024-01-01T00:00:00",
            "priceAtPurchaseDate": "1100",
            "endOfMonthConvention": "EOM"
        },
        {
            "contractType": "PAM",
            "contractID": "pam02",
            "contractRole": "RPA",
            "contractDealDate": "2023-12-28T00:00:00",
            "initialExchangeDate": "2024-01-01T00:00:00",
            "statusDate": "2023-12-30T00:00:00",
            "notionalPrincipal": "3000",
            "maturityDate": "2025-01-01T00:00:00",
            "nominalInterestRate": "0.1",
            "currency": "USD",
            "dayCountConvention": "A360",
            "cycleAnchorDateOfInterestPayment": "2024-01-01T00:00:00",
            "cycleOfInterestPayment": "P2ML0",
            "endOfMonthConvention": "SD",
            "premiumDiscountAtIED": "-200",
            "rateMultiplier": "1.0"
        }
    ];
}

/**
 * Basel3-specific contract portfolio
 * Uses ORIGINAL contracts with Basel3 HQLA classifications added
 */
export function getBasel3ContractPortfolio(): ACTUSContract[] {
    const originalContracts = getDefaultContractPortfolio();
    
    // Add Basel3 HQLA classifications to original contracts
    return originalContracts.map(contract => {
        const classified = { ...contract };
        
        // Classify based on original contract types - MATCH OLD TEST LOGIC
        switch (contract.contractID) {
            case 'pam01':
                classified.hqlaCategory = 'L2A'; // Corporate bond - MATCH OLD TEST
                break;
            case 'pam02': 
                classified.hqlaCategory = 'L1';  // Government bond - MATCH OLD TEST
                break;
            case 'ann01':
                classified.hqlaCategory = 'L2B'; // Loan - CHANGED TO MATCH OLD TEST
                break;
            case 'stk01':
                classified.hqlaCategory = 'L2B'; // Equity
                break;
            default:
                classified.hqlaCategory = 'NonHQLA';
        }
        
        return classified;
    });
}

/**
 * StableCoin-specific contract portfolio
 * Uses ORIGINAL contracts with StableCoin reserve classifications added
 */
export function getStableCoinContractPortfolio(): ACTUSContract[] {
    const originalContracts = getDefaultContractPortfolio();
    
    // Add StableCoin reserve classifications to original contracts
    return originalContracts.map(contract => {
        const classified = { ...contract };
        
        // Classify based on original contract types for stablecoin reserves
        switch (contract.contractID) {
            case 'pam01':
                classified.reserveType = 'government';  // Government bond = treasury reserve
                classified.liquidityScore = '95';
                break;
            case 'pam02': 
                classified.reserveType = 'corporate';   // Corporate bond = corporate reserve
                classified.liquidityScore = '70';
                break;
            case 'ann01':
                classified.reserveType = 'cash';        // Loan generating cash = cash reserve
                classified.liquidityScore = '100';
                break;
            case 'stk01':
                classified.reserveType = 'other';       // Stock = other reserve
                classified.liquidityScore = '50';
                break;
            default:
                classified.reserveType = 'other';
                classified.liquidityScore = '50';
        }
        
        return classified;
    });
}
