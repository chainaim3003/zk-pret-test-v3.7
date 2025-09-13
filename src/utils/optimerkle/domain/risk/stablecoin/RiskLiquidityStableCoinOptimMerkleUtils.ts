/**
 * ====================================================================
 * Risk Liquidity StableCoin OptimMerkle Utilities
 * ====================================================================
 * Data preparation utilities for StableCoin Risk scenario
 * Handles reserve backing, concentration risk, and redemption capacity
 * ====================================================================
 */

import { Field, CircuitString, Poseidon, MerkleTree } from 'o1js';
import { 
    loadContractPortfolio, 
    getStableCoinContractPortfolio,
    ACTUSOptimMerkleAPIResponse,
    ACTUSContract 
} from '../ACTUSOptimMerkleAPI.js';
import { callACTUSAPIWithPostProcessing } from '../../../../domain/risk/ACTUSDataProcessor.js';
import { buildMerkleTreeZK, hashDataZK, MerkleWitness8, safeFieldFrom } from '../../../../core/CoreZKUtilities.js';
import { calculatePercentageZK, calculateConcentrationRiskZK } from '../../../../domain/risk/ComplianceZKUtilities.js';
import { 
    loadMasterConfig, 
    getRegulatoryFrameworks, 
    getBackingRatioRequirement,
    validateRegulatoryCompliance as validateRegulatoryComplianceConfigurable,
    JurisdictionComplianceResult as ConfigurableJurisdictionComplianceResult,
    RegulatoryConfigManager 
} from '../../../../domain/risk/ConfigurableRegulatoryFrameworks.js';

// =================================== StableCoin Risk Data Structures ===================================

export interface RiskLiquidityStableCoinOptimMerkleData {
    // Scenario identifiers
    companyID: string;
    companyName: string;
    mcaID: string;
    businessPANID: string;
    
    // Basic cash flow data
    riskEvaluated: number;
    cashInflow: number[];
    cashOutflow: number[];
    periodsCount: number;
    
    // StableCoin-specific reserve components
    cashReserves: number[];           // Cash and cash equivalents
    treasuryReserves: number[];       // Government securities (treasury bills, bonds)
    corporateReserves: number[];      // Corporate bonds and commercial paper
    otherReserves: number[];          // Other permissible reserve assets
    
    // Outstanding token information
    outstandingTokens: number[];      // Number of tokens in circulation
    tokenValue: number;               // Par value per token (usually 1.0)
    
    // Reserve quality metrics
    liquidityScores: number[];        // Liquidity scores for each asset category
    creditRatings: number[];          // Credit ratings for each asset category
    maturityProfiles: number[];       // Average maturity in days for each category
    
    // StableCoin compliance parameters
    backingRatioThreshold: number;    // Minimum backing ratio (usually 100%+)
    liquidityRatioThreshold: number;  // Minimum liquid reserve ratio
    concentrationLimit: number;       // Maximum single asset concentration
    qualityThreshold: number;         // Minimum asset quality score
    
    // Additional parameters
    liquidityThreshold: number;
    newInvoiceAmount: number;
    newInvoiceEvaluationMonth: number;
    
    // API response metadata
    metadata: {
        timeHorizon: string;
        currency: string;
        processingDate: string;
    };
}

export interface RiskLiquidityStableCoinOptimMerkleProcessedData {
    complianceData: RiskLiquidityStableCoinOptimMerkleData;
    merkleTree: MerkleTree;
    merkleRoot: Field;
    witnesses: {
        companyInfo: MerkleWitness8;
        reserves: MerkleWitness8;
        tokens: MerkleWitness8;
        qualityMetrics: MerkleWitness8;
        thresholds: MerkleWitness8;
    };
}

// =================================== Data Processing Functions ===================================

/**
 * Fetch and process ACTUS data for StableCoin Risk scenario
 */
export async function fetchRiskLiquidityStableCoinOptimMerkleData(
    actusUrl: string,
    contractPortfolio?: string | ACTUSContract[]
): Promise<ACTUSOptimMerkleAPIResponse> {
    try {
        console.log('Loading StableCoin-specific contract portfolio...');
        console.log(`🔍 DEBUG: contractPortfolio type: ${typeof contractPortfolio}`);
        console.log(`🔍 DEBUG: contractPortfolio length: ${Array.isArray(contractPortfolio) ? contractPortfolio.length : 'N/A'}`);
        
        // Use provided portfolio directly if it's an array, otherwise fall back to default
        let contracts: ACTUSContract[];
        if (Array.isArray(contractPortfolio)) {
            contracts = contractPortfolio;
            console.log(`🔍 DEBUG: Using provided contract array with ${contracts.length} contracts`);
        } else {
            contracts = await loadContractPortfolio(contractPortfolio || getStableCoinContractPortfolio());
            console.log(`🔍 DEBUG: Loaded from file/default: ${contracts.length} contracts`);
        }
        
        console.log(`🔍 DEBUG: Final contracts being sent to ACTUS:`);
        contracts.forEach((contract, index) => {
            console.log(`   Contract ${contract.contractID || index}: ${contract.contractType} - ${contract.notionalPrincipal} ${contract.currency}`);
        });
        
        console.log(`🌐 Calling ACTUS API at: ${actusUrl}`);
        console.log(`🔍 DEBUG: ACTUS REQUEST PAYLOAD:`);
        console.log(`   URL: ${actusUrl}`);
        console.log(`   Contracts array:`, JSON.stringify(contracts, null, 2));
        
        const actusResponse = await callACTUSAPIWithPostProcessing(actusUrl, contracts);
        
        console.log(`🔍 DEBUG: ACTUS RESPONSE:`);
        console.log(`   Raw response:`, JSON.stringify(actusResponse, null, 2));
        console.log(`   Periods count: ${actusResponse.periodsCount}`);
        console.log(`   Inflow length: ${actusResponse.inflow?.length || 'undefined'}`);
        console.log(`   Outflow length: ${actusResponse.outflow?.length || 'undefined'}`);
        console.log(`   Contract details length: ${actusResponse.contractDetails?.length || 'undefined'}`);
        console.log(`   Metadata:`, JSON.stringify(actusResponse.metadata, null, 2));
        
        console.log(`StableCoin ACTUS data fetched: ${actusResponse.periodsCount} periods`);
        return actusResponse;
        
    } catch (error) {
        console.error('Error fetching StableCoin ACTUS data:', error);
        throw new Error(`StableCoin data fetch failed: ${error}`);
    }
}

/**
 * Process ACTUS response with StableCoin-specific reserve categorization
 * Uses balance sheet analysis (contract principals) instead of cash flow analysis
 * Supports jurisdiction-based regulatory frameworks
 * NOW READS CONCENTRATION LIMIT FROM CONFIG HIERARCHY
 */
export async function processStableCoinRiskData(
    actusResponse: ACTUSOptimMerkleAPIResponse,
    contracts: ACTUSContract[],  // Add contracts parameter for principal analysis
    backingRatioThreshold: number = 100,
    liquidityRatioThreshold: number = 20,
    concentrationLimit?: number,  // CHANGED: Remove default, make optional
    qualityThreshold: number = 80,
    outstandingTokensAmount: number = 1000000,
    tokenValue: number = 1.0,
    liquidityThreshold: number = 10,
    newInvoiceAmount: number = 5000,
    newInvoiceEvaluationMonth: number = 11,
    regulatoryFramework?: string  // NEW: Support for framework detection
): Promise<RiskLiquidityStableCoinOptimMerkleData> {
    
    console.log('🔍 DEBUG: StableCoin processing with contracts:', contracts.map(c => `${c.contractID}: ${c.notionalPrincipal}`));
    
    // NEW: Determine concentration limit from config hierarchy
    let finalConcentrationLimit = concentrationLimit || 25; // Provide default if undefined
    if (!concentrationLimit) {
        // Try to get from master settings
        try {
            const masterConfig = await loadMasterConfig();
            finalConcentrationLimit = masterConfig.stablecoinThresholds?.concentrationLimits?.maximumSingleAsset || 25;
            console.log(`📊 Using concentration limit from master settings: ${finalConcentrationLimit}%`);
        } catch (error) {
            finalConcentrationLimit = 25; // Ultimate fallback
            console.log(`⚠️ Using fallback concentration limit: ${finalConcentrationLimit}%`);
        }
    } else {
        console.log(`📊 Using provided concentration limit: ${finalConcentrationLimit}%`);
    }
    
    // Aggregate basic cash flows
    const aggregatedInflows = actusResponse.inflow.map((period: number[]) =>
    period.reduce((sum: number, value: number) => sum + value, 0)
    );
    
    const aggregatedOutflows = actusResponse.outflow.map((period: number[]) =>
    period.reduce((sum: number, value: number) => sum + value, 0)
    );
    
    // NEW: Categorize reserves based on contract principals (balance sheet approach)
    // Extract jurisdiction from metadata if available
    const jurisdiction = regulatoryFramework || 'US'; // Default to US if not specified
    const reserveCategories = await categorizeReserveAssetsByPrincipals(contracts, actusResponse.periodsCount, jurisdiction);
    
    // Calculate outstanding tokens based on liability contracts
    const totalLiabilities = contracts
        .filter(c => c.contractRole === 'RPL') // Liability contracts
        .reduce((sum, c) => sum + Math.abs(parseFloat(c.notionalPrincipal)), 0);
    
    console.log('🔍 DEBUG: Total liabilities from contracts:', totalLiabilities);
    
    // Use actual liability amount instead of default
    const outstandingTokens = new Array(actusResponse.periodsCount).fill(totalLiabilities);
    
    return {
        // Scenario identifiers
        companyID: 'STABLECOIN_10001',
        companyName: 'StableCoin Proof of Reserves Assessment',
        mcaID: 'STABLE_MCA_201',
        businessPANID: 'STABLE_PAN_1001',
        
        // Basic cash flow data
        riskEvaluated: 1,
        cashInflow: aggregatedInflows,
        cashOutflow: aggregatedOutflows,
        periodsCount: actusResponse.periodsCount,
        
        // StableCoin reserve components
        cashReserves: reserveCategories.cash,
        treasuryReserves: reserveCategories.treasury,
        corporateReserves: reserveCategories.corporate,
        otherReserves: reserveCategories.other,
        
        // Token information
        outstandingTokens,
        tokenValue,
        
        // Quality metrics
        liquidityScores: reserveCategories.liquidityScores,
        creditRatings: reserveCategories.creditRatings,
        maturityProfiles: reserveCategories.maturityProfiles,
        
        // Compliance thresholds
        backingRatioThreshold: Math.round(backingRatioThreshold),
        liquidityRatioThreshold: Math.round(liquidityRatioThreshold),
        concentrationLimit: Math.round(finalConcentrationLimit), // Use final determined value
        qualityThreshold: Math.round(qualityThreshold),
        
        // Additional parameters
        liquidityThreshold: Math.round(liquidityThreshold),
        newInvoiceAmount,
        newInvoiceEvaluationMonth,
        
        // Metadata
        metadata: actusResponse.metadata
    };
}

/**
 * NEW: Categorize reserve assets based on contract principals (balance sheet approach)
 * This is the correct approach for stablecoin reserve analysis
 * Supports regulatory framework validation
 */
async function categorizeReserveAssetsByPrincipals(
    contracts: ACTUSContract[],
    periodsCount: number,
    jurisdiction?: string
): Promise<{
    cash: number[];
    treasury: number[];
    corporate: number[];
    other: number[];
    liquidityScores: number[];
    creditRatings: number[];
    maturityProfiles: number[];
    regulatoryCompliance?: ConfigurableJurisdictionComplianceResult;
}> {
    console.log('📋 DEBUG: Categorizing reserves by principals...');
    
    // Get only asset contracts (RPA = Receive Principal Amount)
    const assetContracts = contracts.filter(c => c.contractRole === 'RPA');
    
    console.log('📋 DEBUG: Asset contracts:', assetContracts.map(c => `${c.contractID}: ${c.notionalPrincipal} (${c.hqlaCategory || 'no-hqla'}))`));
    
    // Calculate total assets
    const totalAssets = assetContracts.reduce((sum, c) => sum + parseFloat(c.notionalPrincipal), 0);
    console.log('📋 DEBUG: Total assets:', totalAssets);
    
    // Initialize arrays - all periods will have the same static values (balance sheet approach)
    const cash = new Array(periodsCount).fill(0);
    const treasury = new Array(periodsCount).fill(0);
    const corporate = new Array(periodsCount).fill(0);
    const other = new Array(periodsCount).fill(0);
    
    // Categorize each asset contract with enhanced logic for treasury securities
    assetContracts.forEach(contract => {
        const principal = parseFloat(contract.notionalPrincipal);
        const contractId = contract.contractID.toLowerCase();
        const hqlaCategory = contract.hqlaCategory;
        const description = contract.description?.toLowerCase() || '';
        
        console.log(`📋 DEBUG: Processing ${contractId} (${principal}) - HQLA: ${hqlaCategory}`);
        
        // Enhanced categorization logic for professional stablecoin reserves
        let category = 'other';
        
        // Prioritize treasury securities identification
        if (contractId.includes('treasury') || description.includes('treasury') || 
            description.includes('t-bill') || description.includes('government')) {
            category = 'treasury';
        }
        // Cash and demand deposits
        else if (contractId.includes('cash') || contractId.includes('deposit') || 
                description.includes('cash') || description.includes('demand') ||
                contractId.includes('fed_member') || description.includes('fdic')) {
            category = 'cash';
        }
        // Corporate bonds and commercial paper
        else if (contractId.includes('corporate') || contractId.includes('commercial') ||
                description.includes('corporate') || description.includes('commercial')) {
            category = 'corporate';
        }
        // Fallback for institutional cash if no clear categorization
        else if (contractId.includes('institutional') || description.includes('institutional')) {
            category = 'cash';
        }
        
        // Fill all periods with the same static amount (balance sheet approach)
        for (let period = 0; period < periodsCount; period++) {
            switch (category) {
                case 'cash':
                    cash[period] += principal;
                    break;
                case 'treasury':
                    treasury[period] += principal;
                    break;
                case 'corporate':
                    corporate[period] += principal;
                    break;
                default:
                    other[period] += principal;
                    break;
            }
        }
        
        console.log(`📋 DEBUG: Assigned ${contractId} (${principal}) to ${category}`);
    });
    
    // Log final categorization with professional terminology
    console.log('📋 DEBUG: Final stablecoin reserve categorization (per period):');
    console.log(`  Cash & Equivalents: ${cash[0].toLocaleString()} (${((cash[0]/totalAssets)*100).toFixed(1)}%)`);
    console.log(`  US Treasury Securities: ${treasury[0].toLocaleString()} (${((treasury[0]/totalAssets)*100).toFixed(1)}%)`);
    console.log(`  Corporate Bonds: ${corporate[0].toLocaleString()} (${((corporate[0]/totalAssets)*100).toFixed(1)}%)`);
    console.log(`  Other Assets: ${other[0].toLocaleString()} (${((other[0]/totalAssets)*100).toFixed(1)}%)`);
    console.log(`  Total Reserve Assets: ${totalAssets.toLocaleString()}`);
    
    // Professional-grade quality metrics for institutional stablecoin reserves
    const liquidityScores = [100, 98, 75, 60]; // Cash, Treasury Bills, Corporate Bonds, Other
    const creditRatings = [100, 100, 85, 70];   // Risk-free (Cash), Risk-free (UST), Investment Grade, Lower Grade
    const maturityProfiles = [0, 60, 180, 365]; // Overnight, 60-day avg, 6-month avg, 1-year avg
    
    // NEW: Comprehensive regulatory compliance validation using configurable frameworks
    let regulatoryCompliance: ConfigurableJurisdictionComplianceResult | undefined;
    if (jurisdiction) {
        // Use internal validation with all contracts (assets + liabilities) for complete compliance check
        const internalCompliance = validateRegulatoryCompliance(contracts, jurisdiction);
        console.log(`🏛️ Jurisdiction: ${jurisdiction}`);
        console.log(`📊 Compliance Score: ${internalCompliance.overallScore}%`);
        console.log(`⚖️ Status: ${internalCompliance.compliant ? 'COMPLIANT' : 'NON-COMPLIANT'}`);
        console.log(`📋 Details: ${internalCompliance.details}`);
        if (internalCompliance.violations.length > 0) {
            console.log(`🚨 Violations:`, internalCompliance.violations);
        }
        
        // Also try configurable compliance if available
        try {
            regulatoryCompliance = await validateRegulatoryComplianceConfigurable(assetContracts, jurisdiction);
        } catch (error) {
            console.log(`⚠️ Configurable compliance not available: ${error}`);
        }
    }
    
    return {
        cash,
        treasury,
        corporate,
        other,
        liquidityScores,
        creditRatings,
        maturityProfiles,
        regulatoryCompliance
    };
}

// =================================== Regulatory Compliance Functions ===================================

/**
 * Comprehensive regulatory framework definitions
 * Internal validation against ALL applicable frameworks
 */
const REGULATORY_FRAMEWORKS = {
    'STABLE': {
        jurisdiction: 'US',
        weight: 0.6, // Higher weight (more stringent)
        requirements: {
            maturityLimitDays: 93,
            yieldAllowed: false,
            corporateBondsAllowed: false,
            minimumBackingRatio: 100
        },
        description: 'US STABLE Act (Stringent)'
    },
    'GENIUS': {
        jurisdiction: 'US', 
        weight: 0.4, // Lower weight (less stringent)
        requirements: {
            maturityLimitDays: 93,
            yieldAllowed: false,
            corporateBondsAllowed: false,
            minimumBackingRatio: 100
        },
        description: 'US GENIUS Act (Moderate)'
    },
    'MiCA': {
        jurisdiction: 'EU',
        weight: 1.0, // Single framework
        requirements: {
            maturityLimitDays: 365,
            yieldAllowed: true,
            corporateBondsAllowed: true,
            minimumBackingRatio: 100
        },
        description: 'EU MiCA Requirements'
    }
} as const;

/**
 * Jurisdiction-based compliance thresholds
 */
const JURISDICTION_THRESHOLDS = {
    'US': 85,  // Higher threshold (multiple frameworks)
    'EU': 80   // Lower threshold (single framework)
} as const;

/**
 * Interface for comprehensive compliance results
 */
interface JurisdictionComplianceResult {
    jurisdiction: string;
    
    // Internal framework scores (detailed)
    frameworkScores: {
        STABLE?: number;
        GENIUS?: number;
        MiCA?: number;
    };
    
    // Aggregate results (simple output)
    overallScore: number;
    complianceThreshold: number;
    compliant: boolean;
    
    // Debug information
    violations: string[];
    details: string;
    description: string;
}

/**
 * Comprehensive jurisdiction-based compliance validation
 * Checks ALL applicable frameworks, returns weighted score
 */
function validateRegulatoryCompliance(
    allContracts: ACTUSContract[],
    jurisdiction: string
): JurisdictionComplianceResult {
    // Separate asset and liability contracts for different validations
    const assetContracts = allContracts.filter(c => c.contractRole === 'RPA');
    
    if (!['US', 'EU'].includes(jurisdiction)) {
        return {
            jurisdiction,
            frameworkScores: {},
            overallScore: 0,
            complianceThreshold: 0,
            compliant: false,
            violations: [`Unsupported jurisdiction: ${jurisdiction}`],
            details: 'Invalid jurisdiction specified',
            description: 'Error: Unknown jurisdiction'
        };
    }
    
    const frameworkScores: { [key: string]: number } = {};
    const allViolations: string[] = [];
    let weightedScore = 0;
    let totalWeight = 0;
    
    // Determine applicable frameworks for jurisdiction
    const applicableFrameworks = Object.entries(REGULATORY_FRAMEWORKS)
        .filter(([_, config]) => config.jurisdiction === jurisdiction);
    
    // Validate against each applicable framework
    applicableFrameworks.forEach(([frameworkName, config]) => {
        // Pass all contracts (both assets and liabilities) for proper validation
        const frameworkResult = validateFrameworkCompliance(allContracts, frameworkName, config.requirements);
        
        frameworkScores[frameworkName] = frameworkResult.score;
        allViolations.push(...frameworkResult.violations.map(v => `${frameworkName}: ${v}`));
        
        // Add to weighted score calculation
        weightedScore += frameworkResult.score * config.weight;
        totalWeight += config.weight;
    });
    
    // Calculate final weighted score
    const overallScore = totalWeight > 0 ? Math.round(weightedScore / totalWeight) : 0;
    const threshold = JURISDICTION_THRESHOLDS[jurisdiction as keyof typeof JURISDICTION_THRESHOLDS];
    const compliant = overallScore >= threshold;
    
    // Generate description
    const frameworkNames = applicableFrameworks.map(([name]) => name).join(' + ');
    const description = `${jurisdiction} Stablecoin Compliance (${frameworkNames})`;
    
    const details = `Frameworks: ${Object.entries(frameworkScores)
        .map(([name, score]) => `${name} ${score}%`).join(', ')}. ` +
        `Weighted Score: ${overallScore}%. Threshold: ${threshold}%. Result: ${compliant ? 'PASS' : 'FAIL'}.`;
    
    return {
        jurisdiction,
        frameworkScores,
        overallScore,
        complianceThreshold: threshold,
        compliant,
        violations: allViolations,
        details,
        description
    };
}

/**
 * Validate compliance against a specific regulatory framework
 * Fixed to correctly handle yield prohibition (applies only to stablecoin holders, not reserve assets)
 */
function validateFrameworkCompliance(
    allContracts: ACTUSContract[],
    frameworkName: string,
    requirements: any
): {
    score: number;
    violations: string[];
} {
    const violations: string[] = [];
    let score = 100; // Start with perfect score, deduct for violations
    
    // Separate asset contracts (RPA) from liability contracts (RPL)
    const assetContracts = allContracts.filter(c => c.contractRole === 'RPA');
    const liabilityContracts = allContracts.filter(c => c.contractRole === 'RPL');
    
    // Validate asset contracts (reserve assets)
    assetContracts.forEach(contract => {
        const contractId = contract.contractID;
        const maturityDate = new Date(contract.maturityDate);
        const issueDate = new Date(contract.contractDealDate);
        const maturityDays = Math.ceil((maturityDate.getTime() - issueDate.getTime()) / (1000 * 60 * 60 * 24));
        
        // Check maturity limits (25 points)
        if (maturityDays > requirements.maturityLimitDays) {
            violations.push(`${contractId}: Maturity ${maturityDays} days exceeds ${requirements.maturityLimitDays} day limit`);
            score -= 25;
        }
        
        // Check corporate bonds (25 points)  
        if (!requirements.corporateBondsAllowed && contractId.includes('corporate')) {
            violations.push(`${contractId}: Corporate bonds not allowed`);
            score -= 25;
        }
        
        // Note: Interest earned on RESERVE ASSETS is allowed and normal
        // The yield prohibition applies only to payments to stablecoin HOLDERS
    });
    
    // Validate liability contracts (stablecoin tokens)
    liabilityContracts.forEach(contract => {
        const contractId = contract.contractID;
        const interestRate = parseFloat(contract.nominalInterestRate || '0');
        
        // Check yield restrictions - this applies to payments to stablecoin holders (25 points)
        if (!requirements.yieldAllowed && interestRate > 0) {
            violations.push(`${contractId}: Interest rate ${(interestRate * 100).toFixed(2)}% to stablecoin holders violates yield prohibition`);
            score -= 25;
        }
        
        // Note: Maturity limits do NOT apply to stablecoin liability contracts
        // They can have long-term or perpetual maturities
    });
    
    // Backing ratio check would be done separately at portfolio level (25 points)
    // This is handled in the main risk metrics calculation
    
    return {
        score: Math.max(0, score), // Don't go below 0
        violations
    };
}

/**
 * LEGACY: Categorize reserve assets for StableCoin compliance (cash flow approach - INCORRECT for stablecoins)
 * This function is kept for reference but should not be used
 */
function categorizeReserveAssets(
    contractDetails: any[],
    inflowData: number[][]
): {
    cash: number[];
    treasury: number[];
    corporate: number[];
    other: number[];
    liquidityScores: number[];
    creditRatings: number[];
    maturityProfiles: number[];
} {
    const periodsCount = inflowData.length;
    
    // Initialize reserve category arrays
    const cash = new Array(periodsCount).fill(0);
    const treasury = new Array(periodsCount).fill(0);
    const corporate = new Array(periodsCount).fill(0);
    const other = new Array(periodsCount).fill(0);
    
    // Categorize based on contract details
    contractDetails.forEach((contract, contractIndex) => {
        const reserveType = contract.reserveType || 'other';
        const liquidityScore = parseFloat(contract.liquidityScore) || 50;
        
        for (let period = 0; period < periodsCount; period++) {
            const periodValue = inflowData[period][contractIndex] || 0;
            
            switch (reserveType) {
                case 'cash':
                    cash[period] += periodValue;
                    break;
                case 'government':
                case 'treasury':
                    treasury[period] += periodValue;
                    break;
                case 'corporate':
                    corporate[period] += periodValue;
                    break;
                default:
                    other[period] += periodValue;
                    break;
            }
        }
    });
    
    // If no explicit categorization, use heuristic distribution
    if (cash.every(val => val === 0) && treasury.every(val => val === 0)) {
        for (let period = 0; period < periodsCount; period++) {
            const totalReserves = inflowData[period].reduce((sum, val) => sum + val, 0);
            
            // Conservative distribution for stablecoin reserves
            cash[period] = totalReserves * 0.3;      // 30% cash
            treasury[period] = totalReserves * 0.5;   // 50% treasury securities
            corporate[period] = totalReserves * 0.15; // 15% corporate bonds
            other[period] = totalReserves * 0.05;     // 5% other assets
        }
    }
    
    // Generate quality metrics arrays
    const liquidityScores = [100, 95, 70, 50]; // Cash, Treasury, Corporate, Other
    const creditRatings = [100, 98, 85, 70];    // AAA equivalent ratings
    const maturityProfiles = [0, 90, 180, 365]; // Days to maturity
    
    return {
        cash,
        treasury,
        corporate,
        other,
        liquidityScores,
        creditRatings,
        maturityProfiles
    };
}

/**
 * Calculate StableCoin compliance metrics
 */
export function calculateStableCoinRiskMetrics(
    complianceData: RiskLiquidityStableCoinOptimMerkleData
): {
    backingRatios: number[];
    liquidityRatios: number[];
    concentrationRisks: number[];
    assetQualityScores: number[];
    averageBackingRatio: number;
    averageLiquidityRatio: number;
    maxConcentrationRisk: number;
    averageAssetQuality: number;
    backingCompliant: boolean;
    liquidityCompliant: boolean;
    concentrationCompliant: boolean;
    qualityCompliant: boolean;
    overallCompliant: boolean;
} {
    const { 
        cashReserves, 
        treasuryReserves, 
        corporateReserves, 
        otherReserves,
        outstandingTokens,
        tokenValue,
        liquidityScores,
        backingRatioThreshold,
        liquidityRatioThreshold,
        concentrationLimit,
        qualityThreshold
    } = complianceData;
    
    // Calculate metrics for each period
    const backingRatios: number[] = [];
    const liquidityRatios: number[] = [];
    const concentrationRisks: number[] = [];
    const assetQualityScores: number[] = [];
    
    for (let period = 0; period < complianceData.periodsCount; period++) {
        // Total reserve value
        const totalReserves = cashReserves[period] + treasuryReserves[period] + 
                             corporateReserves[period] + otherReserves[period];
        
        // Total outstanding token value
        const totalTokenValue = outstandingTokens[period] * tokenValue;
        
        // Backing ratio = Total Reserves / Outstanding Token Value
        const backingRatio = totalTokenValue > 0 ? (totalReserves / totalTokenValue) * 100 : 100;
        backingRatios.push(backingRatio);
        
        // Liquidity ratio = (Cash + Treasury) / Total Reserves
        const liquidReserves = cashReserves[period] + treasuryReserves[period];
        const liquidityRatio = totalReserves > 0 ? (liquidReserves / totalReserves) * 100 : 0;
        liquidityRatios.push(liquidityRatio);
        
        // Concentration risk = Max single asset category / Total Reserves
        const assetValues = [cashReserves[period], treasuryReserves[period], 
                           corporateReserves[period], otherReserves[period]];
        const maxAsset = Math.max(...assetValues);
        const concentrationRisk = totalReserves > 0 ? (maxAsset / totalReserves) * 100 : 0;
        concentrationRisks.push(concentrationRisk);
        
        // Asset quality score = Weighted average of quality scores
        const weights = assetValues.map(val => totalReserves > 0 ? val / totalReserves : 0);
        const qualityScore = weights.reduce((sum, weight, index) => 
            sum + weight * liquidityScores[index], 0);
        assetQualityScores.push(qualityScore);
    }
    
    // Calculate summary metrics
    const averageBackingRatio = backingRatios.reduce((sum, ratio) => sum + ratio, 0) / backingRatios.length;
    const averageLiquidityRatio = liquidityRatios.reduce((sum, ratio) => sum + ratio, 0) / liquidityRatios.length;
    const maxConcentrationRisk = Math.max(...concentrationRisks);
    const averageAssetQuality = assetQualityScores.reduce((sum, score) => sum + score, 0) / assetQualityScores.length;
    
    // Check compliance
    const backingCompliant = backingRatios.every(ratio => ratio >= backingRatioThreshold);
    const liquidityCompliant = liquidityRatios.every(ratio => ratio >= liquidityRatioThreshold);
    const concentrationCompliant = concentrationRisks.every(risk => risk <= concentrationLimit);
    const qualityCompliant = assetQualityScores.every(score => score >= qualityThreshold);
    const overallCompliant = backingCompliant && liquidityCompliant && concentrationCompliant && qualityCompliant;
    
    return {
        backingRatios,
        liquidityRatios,
        concentrationRisks,
        assetQualityScores,
        averageBackingRatio,
        averageLiquidityRatio,
        maxConcentrationRisk,
        averageAssetQuality,
        backingCompliant,
        liquidityCompliant,
        concentrationCompliant,
        qualityCompliant,
        overallCompliant
    };
}

/**
 * Validate StableCoin risk data integrity
 */
export function validateStableCoinRiskData(complianceData: RiskLiquidityStableCoinOptimMerkleData): boolean {
    // Check required fields
    if (!complianceData.companyID || complianceData.companyID.length === 0) {
        throw new Error('Company ID is required for StableCoin scenario');
    }
    
    // Check array lengths consistency
    const expectedLength = complianceData.periodsCount;
    const arrays = [
        complianceData.cashReserves,
        complianceData.treasuryReserves,
        complianceData.corporateReserves,
        complianceData.otherReserves,
        complianceData.outstandingTokens
    ];
    
    arrays.forEach((array, index) => {
        if (array.length !== expectedLength) {
            throw new Error(`Reserve array ${index} length (${array.length}) does not match periods count (${expectedLength})`);
        }
    });
    
    // Check thresholds
    if (complianceData.backingRatioThreshold <= 0) {
        throw new Error('Backing ratio threshold must be positive');
    }
    
    if (complianceData.tokenValue <= 0) {
        throw new Error('Token value must be positive');
    }
    
    // Check quality metrics arrays
    if (complianceData.liquidityScores.length !== 4 || 
        complianceData.creditRatings.length !== 4 || 
        complianceData.maturityProfiles.length !== 4) {
        throw new Error('Quality metrics arrays must have exactly 4 elements (cash, treasury, corporate, other)');
    }
    
    return true;
}

/**
 * Generate StableCoin compliance summary report
 */
export function generateStableCoinRiskSummary(
    complianceData: RiskLiquidityStableCoinOptimMerkleData,
    riskMetrics: ReturnType<typeof calculateStableCoinRiskMetrics>
): string {
    return `
=== StableCoin Proof of Reserves Assessment Summary ===
Company: ${complianceData.companyName} (${complianceData.companyID})
Assessment Period: ${complianceData.periodsCount} periods (${complianceData.metadata.timeHorizon})
Currency: ${complianceData.metadata.currency}
Token Value: ${complianceData.tokenValue}

StableCoin Parameters:
- Backing Ratio Threshold: ${complianceData.backingRatioThreshold}%
- Liquidity Ratio Threshold: ${complianceData.liquidityRatioThreshold}%
- Concentration Limit: ${complianceData.concentrationLimit}%
- Quality Threshold: ${complianceData.qualityThreshold}

Reserve Metrics:
- Average Backing Ratio: ${riskMetrics.averageBackingRatio.toFixed(2)}%
- Average Liquidity Ratio: ${riskMetrics.averageLiquidityRatio.toFixed(2)}%
- Maximum Concentration Risk: ${riskMetrics.maxConcentrationRisk.toFixed(2)}%
- Average Asset Quality Score: ${riskMetrics.averageAssetQuality.toFixed(2)}

Compliance Results:
- Backing Compliance: ${riskMetrics.backingCompliant ? 'PASSED' : 'FAILED'}
- Liquidity Compliance: ${riskMetrics.liquidityCompliant ? 'PASSED' : 'FAILED'}
- Concentration Compliance: ${riskMetrics.concentrationCompliant ? 'PASSED' : 'FAILED'}
- Quality Compliance: ${riskMetrics.qualityCompliant ? 'PASSED' : 'FAILED'}

Overall StableCoin Compliance: ${riskMetrics.overallCompliant ? 'COMPLIANT' : 'NON-COMPLIANT'}
Generated: ${complianceData.metadata.processingDate}
`;
}

/**
 * Build Merkle tree structure for StableCoin risk data
 * Creates tree with proper data components that match ZK program expectations
 * IMPORTANT: This function should receive the SAME aggregated totals that are passed to the ZK program
 */
export function buildStableCoinRiskMerkleStructure(
    stableCoinRiskData: RiskLiquidityStableCoinOptimMerkleData,
    aggregatedTotals?: {
        cashReservesTotal?: number;
        treasuryReservesTotal?: number;
        corporateReservesTotal?: number;
        otherReservesTotal?: number;
        outstandingTokensTotal?: number;
        averageLiquidityScore?: number;
        averageCreditRating?: number;
        averageMaturity?: number;
        assetQualityScore?: number;
    }
): RiskLiquidityStableCoinOptimMerkleProcessedData {
    console.log('🌳 Building Merkle tree structure...');
    
    // Use provided aggregated totals if available, otherwise fallback to array reduction
    // ✅ ZK-COMPLIANT: Ensure consistency with ZK program calculations
    const cashTotal = aggregatedTotals?.cashReservesTotal ?? stableCoinRiskData.cashReserves.reduce((sum, val) => sum + val, 0);
    const treasuryTotal = aggregatedTotals?.treasuryReservesTotal ?? stableCoinRiskData.treasuryReserves.reduce((sum, val) => sum + val, 0);
    const corporateTotal = aggregatedTotals?.corporateReservesTotal ?? stableCoinRiskData.corporateReserves.reduce((sum, val) => sum + val, 0);
    const otherTotal = aggregatedTotals?.otherReservesTotal ?? stableCoinRiskData.otherReserves.reduce((sum, val) => sum + val, 0);
    const outstandingTotal = aggregatedTotals?.outstandingTokensTotal ?? stableCoinRiskData.outstandingTokens.reduce((sum, val) => sum + val, 0);
    const avgLiquidityScore = aggregatedTotals?.averageLiquidityScore ?? (stableCoinRiskData.liquidityScores.reduce((sum, val) => sum + val, 0) / stableCoinRiskData.liquidityScores.length);
    const avgCreditRating = aggregatedTotals?.averageCreditRating ?? (stableCoinRiskData.creditRatings.reduce((sum, val) => sum + val, 0) / stableCoinRiskData.creditRatings.length);
    const avgMaturity = aggregatedTotals?.averageMaturity ?? (stableCoinRiskData.maturityProfiles.reduce((sum, val) => sum + val, 0) / stableCoinRiskData.maturityProfiles.length);
    const assetQuality = aggregatedTotals?.assetQualityScore ?? avgLiquidityScore;
    
    // Prepare data for Merkle tree using consistent aggregated values
    const merkleLeaves = [
        // Company information hash
        // ✅ ZK-COMPLIANT: Use CircuitString hash for consistency with ZK program
        Poseidon.hash([
            CircuitString.fromString(stableCoinRiskData.companyID).hash(),
            Field(stableCoinRiskData.riskEvaluated)
        ]),
        
        // Reserve assets hash (using aggregated totals)
        // ✅ ZK-COMPLIANT: Use same values that will be passed to ZK program
        Poseidon.hash([
            safeFieldFrom(cashTotal),
            safeFieldFrom(treasuryTotal),
            safeFieldFrom(corporateTotal),
            safeFieldFrom(otherTotal),
            Field(0), // Padding to 8 elements
            Field(0),
            Field(0),
            Field(0)
        ]),
        
        // Token information hash (using aggregated totals)
        Poseidon.hash([
            safeFieldFrom(outstandingTotal),
            safeFieldFrom(stableCoinRiskData.tokenValue * 100), // Scale by 100 to match ZK program
            Field(0), // Padding to 8 elements
            Field(0),
            Field(0),
            Field(0),
            Field(0),
            Field(0)
        ]),
        
        // Quality metrics hash (using average values)
        Poseidon.hash([
            safeFieldFrom(avgLiquidityScore),
            safeFieldFrom(avgCreditRating),
            safeFieldFrom(avgMaturity),
            safeFieldFrom(assetQuality),
            Field(0), // Padding to 8 elements
            Field(0),
            Field(0),
            Field(0)
        ]),
        
        // Thresholds and parameters hash
        Poseidon.hash([
            Field(stableCoinRiskData.backingRatioThreshold),
            Field(stableCoinRiskData.liquidityRatioThreshold),
            Field(stableCoinRiskData.concentrationLimit),
            Field(stableCoinRiskData.qualityThreshold),
            Field(stableCoinRiskData.liquidityThreshold),
            Field(stableCoinRiskData.newInvoiceAmount),
            Field(stableCoinRiskData.newInvoiceEvaluationMonth),
            Field(stableCoinRiskData.periodsCount)
        ])
    ];
    
    // Build Merkle tree
    const merkleTree = buildMerkleTreeZK(merkleLeaves);
    const merkleRoot = merkleTree.getRoot();
    
    console.log(`📊 Merkle root: ${merkleRoot}`);
    
    // Generate witnesses
    const witnesses = {
        companyInfo: new MerkleWitness8(merkleTree.getWitness(BigInt(0))),
        reserves: new MerkleWitness8(merkleTree.getWitness(BigInt(1))),
        tokens: new MerkleWitness8(merkleTree.getWitness(BigInt(2))),
        qualityMetrics: new MerkleWitness8(merkleTree.getWitness(BigInt(3))),
        thresholds: new MerkleWitness8(merkleTree.getWitness(BigInt(4)))
    };
    
    return {
        complianceData: stableCoinRiskData,
        merkleTree,
        merkleRoot,
        witnesses
    };
}
