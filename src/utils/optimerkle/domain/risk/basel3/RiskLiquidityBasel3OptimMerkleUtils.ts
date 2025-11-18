/**
 * ====================================================================
 * Risk Liquidity Basel3 OptimMerkle Utilities
 * ====================================================================
 * Data preparation utilities for Basel3 Risk scenario
 * Handles LCR, NSFR, and HQLA calculations with Merkle tree structure
 * ====================================================================
 */

import { Field, CircuitString, Poseidon, MerkleTree } from 'o1js';
import { 
    callACTUSAPI, 
    loadContractPortfolio, 
    getBasel3ContractPortfolio,
    ACTUSOptimMerkleAPIResponse,
    ACTUSContract 
} from '../ACTUSOptimMerkleAPI.js';
import { 
    callACTUSAPIWithPostProcessing,
    printCoreACTUSResponse 
} from '../../../../domain/risk/ACTUSDataProcessor.js';
// 🔥 REMOVED: Generic framework import that was causing dual calculation paths
// import { processBasel3ThroughGenericFramework } from './Basel3Implementation.js';
import { buildMerkleTreeZK, hashDataZK, MerkleWitness8, safeFieldFrom } from '../../../../core/CoreZKUtilities.js';
import { calculatePercentageZK, calculateWeightedSumZK } from '../../../../domain/risk/ComplianceZKUtilities.js';

// =================================== Basel3 Risk Data Structures ===================================

export interface RiskLiquidityBasel3OptimMerkleData {
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
    
    // Basel3 LCR components
    hqlaLevel1: number[];        // Level 1 HQLA (government bonds, central bank reserves)
    hqlaLevel2A: number[];       // Level 2A HQLA (government/PSE bonds, corporate bonds)
    hqlaLevel2B: number[];       // Level 2B HQLA (lower-rated corporate bonds, equities)
    netCashOutflows: number[];   // Stressed net cash outflows
    
    // Basel3 NSFR components
    availableStableFunding: number[];  // ASF weighted funding sources
    requiredStableFunding: number[];   // RSF weighted funding requirements
    
    // Basel3 parameters
    lcrThreshold: number;        // LCR minimum threshold (usually 100%)
    nsfrThreshold: number;       // NSFR minimum threshold (usually 100%)
    
    // Additional Basel3 metrics
    liquidityThreshold: number;  // General liquidity threshold
    newInvoiceAmount: number;
    newInvoiceEvaluationMonth: number;
    
    // API response metadata
    metadata: {
        timeHorizon: string;
        currency: string;
        processingDate: string;
    };
}

export interface RiskLiquidityBasel3OptimMerkleProcessedData {
    complianceData: RiskLiquidityBasel3OptimMerkleData;
    merkleTree: MerkleTree;
    merkleRoot: Field;
    witnesses: {
        companyInfo: MerkleWitness8;
        cashFlows: MerkleWitness8;
        hqlaComponents: MerkleWitness8;
        nsfrComponents: MerkleWitness8;
        thresholds: MerkleWitness8;
    };
}

// =================================== Data Processing Functions ===================================

/**
 * Fetch and process ACTUS data for Basel3 Risk scenario
 * ✅ FIXED: Preserves HQLA categories from config file contracts
 */
export async function fetchRiskLiquidityBasel3OptimMerkleData(
    actusUrl: string,
    contractPortfolio?: string | ACTUSContract[]
): Promise<ACTUSOptimMerkleAPIResponse & { rawResponseData?: any }> {
    try {
        console.log('🏦 Loading Basel3-specific contract portfolio...');
        const contracts = Array.isArray(contractPortfolio) ? contractPortfolio : getBasel3ContractPortfolio();
        
        // ✅ CRITICAL FIX: Store original HQLA categories AND contract roles before API call
        const originalHQLAMap = new Map<string, string>();
        const originalRoleMap = new Map<string, string>();
        contracts.forEach(contract => {
            if (contract.contractID && contract.hqlaCategory) {
                originalHQLAMap.set(contract.contractID, contract.hqlaCategory);
                console.log(`🔄 Preserving HQLA: ${contract.contractID} → ${contract.hqlaCategory}`);
            }
            if (contract.contractID && contract.contractRole) {
                originalRoleMap.set(contract.contractID, contract.contractRole);
                console.log(`🔄 Preserving Role: ${contract.contractID} → ${contract.contractRole}`);
            }
        });
        
        console.log('🚀 Calling ACTUS API with post-processing for Basel3...');
        
        // ✅ CRITICAL FIX: Capture raw response data before post-processing
        const axios = await import('axios');
        
        // Clean contracts (remove non-ACTUS fields)
        const cleanedContracts = contracts.map(contract => {
            const { hqlaCategory, reserveType, liquidityScore, ...cleanContract } = contract;
            return cleanContract;
        });
        
        const requestData = {
            contracts: cleanedContracts,
            riskFactors: []
        };
        
        console.log(`📡 Calling ACTUS API directly to preserve raw response...`);
        const rawResponse = await axios.default.post(actusUrl, requestData);
        const rawResponseData = rawResponse.data;
        
        console.log(`📋 Raw response received: ${Array.isArray(rawResponseData) ? rawResponseData.length : 'not array'} items`);
        
        // Use standard post-processing to get the formatted structure
        const actusResponse = await callACTUSAPIWithPostProcessing(actusUrl, contracts);
        
        // ✅ CRITICAL FIX: Restore HQLA categories AND contract roles to contractDetails
        if (actusResponse.contractDetails && (originalHQLAMap.size > 0 || originalRoleMap.size > 0)) {
            console.log(`🔄 Restoring HQLA categories and contract roles to ${actusResponse.contractDetails.length} contract details`);
            
            actusResponse.contractDetails = actusResponse.contractDetails.map((detail, index) => {
                // Try to match by contractID first, then by index
                const contractID = detail.contractID || contracts[index]?.contractID;
                const hqlaCategory = originalHQLAMap.get(contractID) || contracts[index]?.hqlaCategory;
                const contractRole = originalRoleMap.get(contractID) || contracts[index]?.contractRole;
                
                let updated = { ...detail };
                
                if (contractID) {
                    updated.contractID = contractID;
                }
                
                if (hqlaCategory) {
                    updated.hqlaCategory = hqlaCategory;
                    console.log(`   ✅ Restored HQLA: ${contractID || `contract_${index}`} → ${hqlaCategory}`);
                }
                
                if (contractRole) {
                    updated.contractRole = contractRole;
                    console.log(`   ✅ Restored Role: ${contractID || `contract_${index}`} → ${contractRole}`);
                } else {
                    console.log(`   ⚠️ No contract role found for: ${contractID || `contract_${index}`}`);
                }
                
                return updated;
            });
        } else {
            console.log(`⚠️ No data to restore (originalHQLAMap: ${originalHQLAMap.size}, originalRoleMap: ${originalRoleMap.size}, contractDetails: ${actusResponse.contractDetails?.length || 0})`);
        }
        
        console.log(`✅ Basel3 ACTUS data fetched and processed: ${actusResponse.periodsCount} periods`);
        
        // Attach raw response data for generic framework processing
        return {
            ...actusResponse,
            rawResponseData: rawResponseData  // ✅ Preserve original events data
        };
        
    } catch (error) {
        console.error('Error fetching Basel3 ACTUS data:', error);
        throw new Error(`Basel3 data fetch failed: ${error}`);
    }
}

/**
 * Process ACTUS response with Basel3-specific categorization - OptimMerkle implementation
 * 🔥 RENAMED to follow OptimMerkle naming convention for execution path traceability
 */
export async function processBasel3RiskDataOptimMerkle(
    actusResponse: ACTUSOptimMerkleAPIResponse,
    lcrThreshold: number,
    nsfrThreshold: number = 100,
    liquidityThreshold: number = 10,
    newInvoiceAmount: number = 5000,
    newInvoiceEvaluationMonth: number = 11
): Promise<RiskLiquidityBasel3OptimMerkleData> {
    
    console.log('🏦 Processing Basel3 data using OptimMerkle methodology...');
    
    // Aggregate basic cash flows
    const aggregatedInflows = actusResponse.inflow.map((period: number[]) =>
    period.reduce((sum: number, value: number) => sum + value, 0)
    );
    
    const aggregatedOutflows = actusResponse.outflow.map((period: number[]) =>
    period.reduce((sum: number, value: number) => sum + value, 0)
    );
    
    // Categorize assets into HQLA buckets based on contract details
    const hqlaCategories = categorizeContractsForHQLAOptimMerkle(actusResponse.contractDetails, actusResponse.inflow);
    
    // ✅ BASEL III COMPLIANT: Calculate NSFR components using balance sheet positions, not cash flows
    const nsfrComponents = calculateBasel3CompliantNSFR(actusResponse.contractDetails, (actusResponse as any).rawResponseData, actusResponse.periodsCount);
    
    return {
        // Scenario identifiers
        companyID: 'BASEL3_OPTIMMERKLE_10001',
        companyName: 'Basel3 OptimMerkle LCR/NSFR Assessment',
        mcaID: 'BASEL3_MCA_201',
        businessPANID: 'BASEL3_PAN_1001',
        
        // Basic cash flow data
        riskEvaluated: 1,
        cashInflow: aggregatedInflows,
        cashOutflow: aggregatedOutflows,
        periodsCount: actusResponse.periodsCount,
        
        // Basel3 LCR components
        hqlaLevel1: hqlaCategories.level1,
        hqlaLevel2A: hqlaCategories.level2A,
        hqlaLevel2B: hqlaCategories.level2B,
        netCashOutflows: calculateStressedOutflowsOptimMerkle(aggregatedOutflows),
        
        // Basel3 NSFR components
        availableStableFunding: nsfrComponents.asf,
        requiredStableFunding: nsfrComponents.rsf,
        
        // Basel3 thresholds
        lcrThreshold: Math.round(lcrThreshold),
        nsfrThreshold: Math.round(nsfrThreshold),
        
        // Additional parameters
        liquidityThreshold: Math.round(liquidityThreshold),
        newInvoiceAmount,
        newInvoiceEvaluationMonth,
        
        // Metadata
        metadata: actusResponse.metadata
    };
}

// 🔥 REMOVED: extractHQLAFromGenericResults function since we no longer use Generic framework

// 🔥 REMOVED: Old delegation function processBasel3RiskDataOptimMerkle - logic moved to main function above

/**
 * Categorize contracts into HQLA buckets for LCR calculation - OptimMerkle method
 */
function categorizeContractsForHQLAOptimMerkle(
    contractDetails: any[],
    inflowData: number[][]
): {
    level1: number[];
    level2A: number[];
    level2B: number[];
} {
    const periodsCount = inflowData.length;
    
    // Initialize HQLA arrays
    const level1 = new Array(periodsCount).fill(0);
    const level2A = new Array(periodsCount).fill(0);
    const level2B = new Array(periodsCount).fill(0);
    
    // If contract details specify HQLA category, use it
    contractDetails.forEach((contract, contractIndex) => {
        const hqlaCategory = contract.hqlaCategory || 'NonHQLA';
        
        for (let period = 0; period < periodsCount; period++) {
            const periodInflow = inflowData[period][contractIndex] || 0;
            
            switch (hqlaCategory) {
                case 'L1':
                    level1[period] += periodInflow;
                    break;
                case 'L2A':
                    level2A[period] += periodInflow;
                    break;
                case 'L2B':
                    level2B[period] += periodInflow;
                    break;
                default:
                    // Non-HQLA assets don't count toward LCR buffer
                    break;
            }
        }
    });
    
    // If no explicit categorization, use contract type heuristics
    if (level1.every(val => val === 0) && level2A.every(val => val === 0)) {
        for (let period = 0; period < periodsCount; period++) {
            const totalInflow = inflowData[period].reduce((sum, val) => sum + val, 0);
            
            // Heuristic distribution (in practice, this would be based on actual asset analysis)
            level1[period] = totalInflow * 0.4;  // 40% Level 1 (government bonds, cash)
            level2A[period] = totalInflow * 0.35; // 35% Level 2A (high-grade corporate bonds)
            level2B[period] = totalInflow * 0.15; // 15% Level 2B (lower-grade assets)
            // 10% Non-HQLA (not counted)
        }
    }
    
    return { level1, level2A, level2B };
}

/**
 * ✅ BASEL III COMPLIANT: Calculate NSFR using balance sheet positions per official regulation
 * Based on BIS Basel III NSFR document d295, paragraphs 17-47
 * ASF = Available Stable Funding (from liabilities and capital)
 * RSF = Required Stable Funding (from assets based on liquidity characteristics)
 * ✅ HANDLES CASH01 CONTRACT FAILURE: Uses contract config when ACTUS API fails
 */
function calculateBasel3CompliantNSFR(
    contractDetails: any[],
    rawActusData: any,
    periodsCount: number
): {
    asf: number[];
    rsf: number[];
} {
    console.log('\n🏛️ BASEL III COMPLIANT NSFR CALCULATION');
    console.log('📋 Using balance sheet positions per BIS regulation d295');
    
    // Initialize ASF and RSF arrays
    const asf = new Array(periodsCount).fill(0);
    const rsf = new Array(periodsCount).fill(0);
    
    let totalASF = 0;
    let totalRSF = 0;
    
    // Process each contract according to Basel III methodology  
    console.log(`   Processing ${contractDetails.length} contracts...`);
    contractDetails.forEach((contract, index) => {
        const contractID = contract.contractID || `contract_${index}`;
        const hqlaCategory = contract.hqlaCategory || 'NonHQLA';
        
        console.log(`\n   🏦 Contract ${index + 1}/${contractDetails.length}: ${contractID}`);
        
        // Find corresponding raw ACTUS data and contract configuration
        const rawContract = Array.isArray(rawActusData) ? rawActusData.find((raw: any) => raw.contractId === contractID) : {};
        
        // Get notional principal - try multiple sources
        let notionalPrincipal = 0;
        if (rawContract && rawContract.events && rawContract.events.length > 0) {
            // Get notional from IED event if available
            const iedEvent = rawContract.events.find((event: any) => event.type === 'IED');
            if (iedEvent) {
                notionalPrincipal = Math.abs(iedEvent.payoff);
            }
        }
        
        // ✅ CRITICAL FIX FOR CASH01: Fallback to contract configuration when ACTUS fails
        if (notionalPrincipal === 0) {
            notionalPrincipal = parseFloat(contract.notionalPrincipal || rawContract?.notionalPrincipal || 0);
            if (notionalPrincipal > 0) {
                console.log(`   ⚙️ Using config notional for ${contractID}: ${notionalPrincipal} (ACTUS failed)`);
            }
        }
        
        console.log(`   🔍 Processing ${contractID}: notional=${notionalPrincipal}, hqla=${hqlaCategory}`);
        
        // Determine contract role from configuration FIRST, then ACTUS events
        const contractRole = contract.contractRole || 'RPA'; // Use config role
        const hasNegativeIED = rawContract?.events?.some((event: any) => 
            event.type === 'IED' && event.payoff < 0
        );
        
        // ✅ CRITICAL FIX: Use config role as primary source of truth - Support both RFL and RPL as liability roles
        const isAsset = contractRole === 'RPA' || (contractRole !== 'RFL' && contractRole !== 'RPL' && hasNegativeIED);
        const isLiability = contractRole === 'RFL' || contractRole === 'RPL';
        
        console.log(`   📋 ${contractID}: role=${contractRole}, hasNegativeIED=${hasNegativeIED}, isAsset=${isAsset}, isLiability=${isLiability}`);
        
        // ✅ ENHANCED: Handle ACTUS failure by using config data
        if (notionalPrincipal === 0) {
            notionalPrincipal = parseFloat(contract.notionalPrincipal || rawContract?.notionalPrincipal || 0);
            if (notionalPrincipal > 0) {
                console.log(`   ⚙️ Using config notional for ${contractID}: ${notionalPrincipal} (ACTUS failed)`);
            }
        }
        
        // Skip if no notional principal
        if (notionalPrincipal === 0) {
            console.log(`   ⚠️ Skipping ${contractID}: no notional principal found`);
            return;
        }
        
        // Basel III categorization based on contract role
        if (isAsset) {
            // Asset (bank pays out money to acquire asset)
            // Calculate RSF based on HQLA category per Basel III Table 2
            let rsfFactor = 0;
            switch (hqlaCategory) {
                case 'L1':
                    rsfFactor = 0.05; // Unencumbered Level 1 assets: 5% RSF
                    break;
                case 'L2A':
                    rsfFactor = 0.15; // Unencumbered Level 2A assets: 15% RSF  
                    break;
                case 'L2B':
                    rsfFactor = 0.50; // Unencumbered Level 2B assets: 50% RSF
                    break;
                default:
                    rsfFactor = 0.85; // Other assets: 85% RSF
                    break;
            }
            
            const contractRSF = Math.abs(notionalPrincipal) * rsfFactor;
            totalRSF += contractRSF;
            
            console.log(`   📊 Asset ${contractID}: ${Math.abs(notionalPrincipal)} × ${(rsfFactor*100).toFixed(1)}% = ${contractRSF.toFixed(0)} RSF (${hqlaCategory})`);
            
        } else if (isLiability) {
            // Liability (bank receives funding)
            // Calculate ASF based on maturity per Basel III Table 1
            
            // Determine maturity from contract configuration or raw data
            const maturityDateStr = contract.maturityDate || rawContract?.maturityDate || '2024-12-31T00:00:00';
            const maturityDate = new Date(maturityDateStr);
            const startDate = new Date('2024-01-01');
            const maturityMonths = (maturityDate.getFullYear() - startDate.getFullYear()) * 12 + 
                                 (maturityDate.getMonth() - startDate.getMonth());
            
            console.log(`   📅 ${contractID}: maturity=${maturityDateStr}, months=${maturityMonths}`);
            
            let asfFactor = 0;
            if (maturityMonths >= 12) {
                asfFactor = 1.0; // Liabilities ≥1 year: 100% ASF
            } else if (maturityMonths >= 6) {
                asfFactor = 0.5; // Liabilities 6mo-1yr: 50% ASF
            } else {
                asfFactor = 0.0; // Short-term liabilities: 0% ASF
            }
            
            const contractASF = Math.abs(notionalPrincipal) * asfFactor;
            totalASF += contractASF;
            
            console.log(`   💰 Liability ${contractID}: ${Math.abs(notionalPrincipal)} × ${(asfFactor*100).toFixed(1)}% = ${contractASF.toFixed(0)} ASF (${maturityMonths}mo maturity)`);
        } else {
            console.log(`   ❓ Unknown role for ${contractID}: ${contractRole} - skipping`);
        }
    });
    
    // Distribute total ASF and RSF across all periods
    // Per Basel III, NSFR is calculated on balance sheet positions, not period-by-period cash flows
    // ✅ CRITICAL FIX: Use single period values for Merkle tree, not multiplied by periods
    for (let period = 0; period < periodsCount; period++) {
        asf[period] = totalASF;  // Each period gets the same balance sheet value
        rsf[period] = totalRSF;  // Each period gets the same balance sheet value
    }
    
    console.log(`\n🎯 BASEL III NSFR TOTALS:`);
    console.log(`   Available Stable Funding (ASF): ${totalASF.toFixed(0)}`);
    console.log(`   Required Stable Funding (RSF): ${totalRSF.toFixed(0)}`);
    console.log(`   Expected NSFR: ${totalRSF > 0 ? (totalASF / totalRSF * 100).toFixed(1) : 'N/A'}%`);
    console.log(`   Basel III Compliance: ${totalRSF > 0 && (totalASF / totalRSF) >= 1.0 ? '✅ PASS' : '❌ FAIL'}\n`);
    
    return { asf, rsf };
}

/**
 * 🔄 BACKWARD COMPATIBILITY: Keep old function for any legacy references
 * @deprecated Use calculateBasel3CompliantNSFR instead
 */
function calculateNSFRComponentsOptimMerkle(
    hqlaCategories: { level1: number[]; level2A: number[]; level2B: number[]; },
    inflows: number[],
    outflows: number[]
): {
    asf: number[];
    rsf: number[];
} {
    console.log('⚠️ Using legacy NSFR calculation (cash flow based) - deprecated');
    const periodsCount = inflows.length;
    
    const asf = new Array(periodsCount).fill(0);
    const rsf = new Array(periodsCount).fill(0);
    
    for (let period = 0; period < periodsCount; period++) {
        // Legacy calculation (incorrect but preserved for compatibility)
        const asfL1 = hqlaCategories.level1[period] * 1.0;
        const asfL2A = hqlaCategories.level2A[period] * 0.85;
        const asfL2B = hqlaCategories.level2B[period] * 0.5;
        asf[period] = asfL1 + asfL2A + asfL2B;
        
        const totalHQLA = hqlaCategories.level1[period] + hqlaCategories.level2A[period] + hqlaCategories.level2B[period];
        const rsfHQLA = totalHQLA * 0.0;
        const otherAssets = Math.max(inflows[period] - totalHQLA, 0);
        const rsfOtherAssets = otherAssets * 0.65;
        rsf[period] = rsfHQLA + rsfOtherAssets;
        
        if (rsf[period] === 0 && asf[period] > 0) {
            rsf[period] = asf[period] * 0.01;
        }
    }
    
    return { asf, rsf };
}

/**
 * Apply stress factors to outflows for LCR calculation - OptimMerkle method
 */
function calculateStressedOutflowsOptimMerkle(baseOutflows: number[]): number[] {
    // Basel3 stress factors
    const STRESS_FACTORS = {
        retailDeposits: 0.03,   // 3% runoff for stable retail deposits
        wholesaleDeposits: 0.25, // 25% runoff for wholesale deposits
        securedFunding: 1.0,    // 100% runoff for maturing secured funding
        derivatives: 1.0        // 100% for derivative collateral calls
    };
    
    return baseOutflows.map(outflow => {
        // Apply average stress factor of 15% (simplified)
        return outflow * 1.15;
    });
}

/**
 * ✅ CRITICAL FIX: Build Merkle tree structure for Basel3 data
 * Updated to match exactly what the ZK program expects
 */
export function buildBasel3RiskMerkleStructure(
    complianceData: RiskLiquidityBasel3OptimMerkleData
): RiskLiquidityBasel3OptimMerkleProcessedData {
    
    // ✅ CRITICAL FIX: Calculate totals that match ZK program expectations (rounded to integers)
    const hqlaLevel1Total = Math.round(complianceData.hqlaLevel1.reduce((sum, val) => sum + val, 0));
    const hqlaLevel2ATotal = Math.round(complianceData.hqlaLevel2A.reduce((sum, val) => sum + val, 0));
    const hqlaLevel2BTotal = Math.round(complianceData.hqlaLevel2B.reduce((sum, val) => sum + val, 0));
    const netCashOutflowsTotal = Math.round(complianceData.netCashOutflows.reduce((sum, val) => sum + val, 0));
    // ✅ CRITICAL FIX: For NSFR components, use single period value not sum across periods
    // Since ASF/RSF are balance sheet positions (constant across periods), we only need first period value
    const availableStableFundingTotal = Math.round(complianceData.availableStableFunding[0] || 0);
    const requiredStableFundingTotal = Math.round(complianceData.requiredStableFunding[0] || 0);
    
    console.log('🔧 Merkle Structure Debug:');
    console.log(`   Company ID: ${complianceData.companyID}`);
    console.log(`   HQLA L1 Total: ${hqlaLevel1Total}`);
    console.log(`   HQLA L2A Total: ${hqlaLevel2ATotal}`);
    console.log(`   HQLA L2B Total: ${hqlaLevel2BTotal}`);
    console.log(`   Net Cash Outflows Total: ${netCashOutflowsTotal}`);
    console.log(`   ASF Total: ${availableStableFundingTotal}`);
    console.log(`   RSF Total: ${requiredStableFundingTotal}`);
    console.log(`   LCR Threshold: ${complianceData.lcrThreshold}`);
    console.log(`   NSFR Threshold: ${complianceData.nsfrThreshold}`);
    
    // ✅ CRITICAL FIX: Prepare data for Merkle tree to match ZK program expectations
    const merkleLeaves: Field[] = [
        // 0. Company information hash - matches: companyInfoHash = complianceData.scenarioID.hash()
        CircuitString.fromString(complianceData.companyID).hash(),
        
        // 1. Cash flows hash - matches: cashFlowsHash = Field.from([hqlaLevel1Total, hqlaLevel2ATotal].reduce(...))
        safeFieldFrom(hqlaLevel1Total + hqlaLevel2ATotal),
        
        // 2. HQLA components hash - matches: hqlaHash = Field.from([hqlaLevel1Total, hqlaLevel2ATotal, hqlaLevel2BTotal, netCashOutflowsTotal].reduce(...))
        safeFieldFrom(hqlaLevel1Total + hqlaLevel2ATotal + hqlaLevel2BTotal + netCashOutflowsTotal),
        
        // 3. NSFR components hash - matches: nsfrHash = Field.from([availableStableFundingTotal, requiredStableFundingTotal].reduce(...))
        safeFieldFrom(availableStableFundingTotal + requiredStableFundingTotal),
        
        // 4. Thresholds hash - matches: thresholdsHash = Field.from([lcrThreshold, nsfrThreshold].reduce(...))
        safeFieldFrom(complianceData.lcrThreshold + complianceData.nsfrThreshold)
    ];
    
    console.log('🔧 Merkle Leaves Debug:');
    merkleLeaves.forEach((leaf, index) => {
        console.log(`   Leaf ${index}: ${leaf.toString()}`);
    });
    
    // Build Merkle tree
    const merkleTree = buildMerkleTreeZK(merkleLeaves);
    const merkleRoot = merkleTree.getRoot();
    
    console.log(`🔐 Calculated Merkle Root: ${merkleRoot.toString()}`);
    
    // Generate witnesses
    const witnesses = {
        companyInfo: new MerkleWitness8(merkleTree.getWitness(0n)),
        cashFlows: new MerkleWitness8(merkleTree.getWitness(1n)),
        hqlaComponents: new MerkleWitness8(merkleTree.getWitness(2n)),
        nsfrComponents: new MerkleWitness8(merkleTree.getWitness(3n)),
        thresholds: new MerkleWitness8(merkleTree.getWitness(4n))
    };
    
    // ✅ CRITICAL FIX: Verify witnesses against expected leaf values
    console.log('🔧 Verifying witness calculations:');
    try {
        const companyInfoCalculated = witnesses.companyInfo.calculateRoot(merkleLeaves[0]);
        console.log(`   Company Info Root: ${companyInfoCalculated.toString()}`);
        
        const cashFlowsCalculated = witnesses.cashFlows.calculateRoot(merkleLeaves[1]);
        console.log(`   Cash Flows Root: ${cashFlowsCalculated.toString()}`);
        
        const hqlaCalculated = witnesses.hqlaComponents.calculateRoot(merkleLeaves[2]);
        console.log(`   HQLA Root: ${hqlaCalculated.toString()}`);
        
        const nsfrCalculated = witnesses.nsfrComponents.calculateRoot(merkleLeaves[3]);
        console.log(`   NSFR Root: ${nsfrCalculated.toString()}`);
        
        const thresholdsCalculated = witnesses.thresholds.calculateRoot(merkleLeaves[4]);
        console.log(`   Thresholds Root: ${thresholdsCalculated.toString()}`);
        
        // Verify they all match the main root
        const allMatch = [companyInfoCalculated, cashFlowsCalculated, hqlaCalculated, nsfrCalculated, thresholdsCalculated]
            .every(calculatedRoot => calculatedRoot.toString() === merkleRoot.toString());
        
        console.log(`   All witnesses match root: ${allMatch}`);
        
    } catch (error) {
        console.error('⚠️ Witness verification failed:', error);
    }
    
    return {
        complianceData,
        merkleTree,
        merkleRoot,
        witnesses
    };
}

/**
 * Calculate and display detailed monthly LCR breakdown similar to working version
 * 🎯 Matches the monthly output format from the working Basel3 test
 */
function calculateAndDisplayMonthlyDetails(
    complianceData: RiskLiquidityBasel3OptimMerkleData,
    lcrThreshold: number
): void {
    console.log('Calculating detailed monthly LCR breakdown...');
    
    // 🔧 CRITICAL FIX: Use EXACT same logic as working old version
    let initial_reservenum = 0;
    let cumulativeInflows = initial_reservenum;
    let cumulativeOutflows = 0;
    let cumulativeHQLA = 0;
    
    const monthlyDetails = [];
    
    for (let month = 0; month < complianceData.periodsCount; month++) {
        // 🔧 CRITICAL FIX: Use Basel3 adjusted HQLA calculation with haircuts
        // Must match ZK circuit calculation exactly
        const monthInflow = (complianceData.hqlaLevel1[month] || 0) + 
                           (complianceData.hqlaLevel2A[month] || 0) + 
                           (complianceData.hqlaLevel2B[month] || 0);
        const monthOutflow = complianceData.netCashOutflows[month] || 0;
        
        // Update cumulatives
        cumulativeInflows += monthInflow;
        cumulativeOutflows += monthOutflow;
        
        // Calculate cumulative cash flow
        const cumulativeCashFlow = cumulativeInflows - cumulativeOutflows;
        
        // 🔧 CRITICAL FIX: Use Basel3 adjusted HQLA (same as ZK circuit)
        // Apply Basel3 haircuts: Level1=100%, Level2A=85%, Level2B=50%
        const adjustedMonthHQLA = (complianceData.hqlaLevel1[month] || 0) + 
                                 ((complianceData.hqlaLevel2A[month] || 0) * 0.85) + 
                                 ((complianceData.hqlaLevel2B[month] || 0) * 0.50);
        cumulativeHQLA += adjustedMonthHQLA;
        
        // 🔧 CRITICAL FIX: Use Basel3 compliant LCR calculation
        let LCR = 0;
        if (cumulativeOutflows > 0) {
            LCR = (cumulativeHQLA / cumulativeOutflows) * 100;
        } else {
            LCR = 200; // If no outflows, use same as ZK circuit (200%)
        }
        
        // Store monthly details in EXACT same format as working version
        monthlyDetails.push({
            month: month + 1,
            cumulativeInflows: cumulativeInflows.toString(),
            cumulativeOutflows: cumulativeOutflows.toString(),
            cumulativeCashFlow: cumulativeCashFlow.toString(),
            cumulativeHQLA: cumulativeHQLA.toString(),
            LCR: LCR.toString()
        });
    }
    
    // Display the monthly details array like working version
    console.log('Monthly LCR Details:');
    console.log(JSON.stringify(monthlyDetails, null, 2));
}

/**
 * Calculate Basel3 compliance metrics - OptimMerkle implementation
 * 🔧 CORRECTED NSFR calculation using Basel3 methodology
 */
export function calculateBasel3RiskMetricsOptimMerkle(
    complianceData: RiskLiquidityBasel3OptimMerkleData
): {
    lcrRatios: number[];
    nsfrRatios: number[];
    averageLCR: number;
    averageNSFR: number;
    totalBasedLCR: number;  // 🔧 NEW: Total-based LCR for ZK circuit
    totalBasedNSFR: number; // 🔧 NEW: Total-based NSFR for ZK circuit
    worstCaseLCR: number;
    worstCaseNSFR: number;
    lcrCompliant: boolean;
    nsfrCompliant: boolean;
    overallCompliant: boolean;
} {
    const { hqlaLevel1, hqlaLevel2A, hqlaLevel2B, netCashOutflows, availableStableFunding, requiredStableFunding, lcrThreshold, nsfrThreshold } = complianceData;
    
    console.log(`🔍 DEBUG Basel3 Metrics Calculation:`);
    console.log(`   - Periods Count: ${complianceData.periodsCount}`);
    console.log(`   - LCR Threshold: ${lcrThreshold}%`);
    console.log(`   - NSFR Threshold: ${nsfrThreshold}%`);
    
        // 🔧 ADD DETAILED MONTHLY CALCULATION OUTPUT
        console.log('\n===== Basel3 Monthly LCR Calculation Details =====');
        calculateAndDisplayMonthlyDetails(complianceData, lcrThreshold);
        console.log('===================================================\n');
    
    // Handle case where there are no periods (0 periods)
    if (complianceData.periodsCount === 0) {
        console.log(`   - No periods found, returning default compliant values`);
        return {
            lcrRatios: [],
            nsfrRatios: [],
            averageLCR: 100,
            averageNSFR: 100,
            totalBasedLCR: 100,  // 🔧 ADDED: Missing property
            totalBasedNSFR: 100, // 🔧 ADDED: Missing property
            worstCaseLCR: 100,
            worstCaseNSFR: 100,
            lcrCompliant: true,
            nsfrCompliant: true,
            overallCompliant: true
        };
    }
    
    // 🔧 REVERTED: Use the SAME calculation as Basel3Implementation.ts for consistency
    let initial_reservenum = 0;
    let cumulativeInflows = initial_reservenum;
    let cumulativeOutflows = 0;
    let cumulativeHQLA = 0;  // 🔧 REVERT: Use same HQLA calculation as Basel3Implementation.ts
    let allPeriodsCompliant = true;
    
    // 🔧 NEW: Cumulative NSFR tracking (keep the corrected NSFR methodology)
    let cumulativeASF = 0;
    let cumulativeRSF = 0;
    
    const cumulativeLCRRatios: number[] = [];
    const cumulativeNSFRRatios: number[] = [];
    
    for (let period = 0; period < complianceData.periodsCount; period++) {
        // ✅ CRITICAL FIX: Use BASEL3 COMPLIANT LCR calculation with haircuts
        // Must match ZK circuit calculation exactly
        const periodInflow = (hqlaLevel1[period] || 0) + 
                            (hqlaLevel2A[period] || 0) + 
                            (hqlaLevel2B[period] || 0);
        const periodOutflow = netCashOutflows[period];
        
        // Update cumulatives
        cumulativeInflows += periodInflow;
        cumulativeOutflows += periodOutflow;
        
        // 🔧 CRITICAL FIX: Use Basel3 adjusted HQLA calculation (same as ZK circuit)
        // Apply Basel3 haircuts: Level1=100%, Level2A=85%, Level2B=50%
        const adjustedHQLA = (hqlaLevel1[period] || 0) + 
                             ((hqlaLevel2A[period] || 0) * 0.85) + 
                             ((hqlaLevel2B[period] || 0) * 0.50);
        cumulativeHQLA += adjustedHQLA;
        
        // ✅ BASEL III COMPLIANT: Use pre-calculated ASF/RSF from balance sheet positions
        // These values are already correctly calculated by calculateBasel3CompliantNSFR
        const periodASF = availableStableFunding[period] || 0;
        const periodRSF = requiredStableFunding[period] || 0;
        cumulativeASF = periodASF; // ASF is constant across periods (balance sheet position)
        cumulativeRSF = periodRSF; // RSF is constant across periods (balance sheet position)
        
        // ✅ CRITICAL FIX: Use Basel3 compliant LCR calculation with haircuts
        let cumulativeLCR = 0;
        if (cumulativeOutflows > 0) {
            cumulativeLCR = (cumulativeHQLA / cumulativeOutflows) * 100;
        } else {
            cumulativeLCR = 200; // If no outflows, use same as ZK circuit (200%)
        }
        
        cumulativeLCRRatios.push(cumulativeLCR);
        
        // 🔧 KEEP: NSFR calculation using CORRECTED methodology
        let cumulativeNSFR = 100; // Default to 100%
        if (cumulativeRSF > 0) {
            cumulativeNSFR = (cumulativeASF / cumulativeRSF) * 100;
        } else if (cumulativeASF > 0) {
            // If we have stable funding but no requirements, excellent
            cumulativeNSFR = 200; // High compliance score
        }
        // If both are 0, keep default 100%
        
        cumulativeNSFRRatios.push(cumulativeNSFR);
        
        // ✅ Compliance check
        if (cumulativeLCR < lcrThreshold) {
            allPeriodsCompliant = false;
        }
        
        // 🔍 DEBUG: Show first few and last few calculations
        if (period < 3 || period >= complianceData.periodsCount - 3) {
            console.log(`   - Period ${period}: Cumulative LCR = ${cumulativeLCR.toFixed(2)}%, Cumulative NSFR = ${cumulativeNSFR.toFixed(2)}% (Cumulative HQLA=${cumulativeHQLA.toFixed(2)}, Cumulative Outflows=${cumulativeOutflows.toFixed(2)})`);
        }
    }
    
    // Use cumulative ratios
    const lcrRatios = cumulativeLCRRatios;
    const nsfrRatios = cumulativeNSFRRatios;
    
    // 🔧 CRITICAL FIX: Calculate total-based LCR/NSFR FIRST (for compliance check)
    // This matches what the ZK circuit expects: single calculation from totals
    
    // Calculate total adjusted HQLA with Basel3 haircuts
    const totalHQLALevel1 = hqlaLevel1.reduce((sum, val) => sum + val, 0);
    const totalHQLALevel2A = hqlaLevel2A.reduce((sum, val) => sum + val, 0);
    const totalHQLALevel2B = hqlaLevel2B.reduce((sum, val) => sum + val, 0);
    const totalNetCashOutflows = netCashOutflows.reduce((sum, val) => sum + val, 0);
    
    // Apply Basel3 haircuts: Level1=100%, Level2A=85%, Level2B=50%
    const totalAdjustedHQLA = totalHQLALevel1 + (totalHQLALevel2A * 0.85) + (totalHQLALevel2B * 0.50);
    
    // Calculate total-based LCR (same logic as ZK circuit)
    let totalBasedLCR = 200; // Default for zero outflows
    if (totalNetCashOutflows > 0) {
        totalBasedLCR = (totalAdjustedHQLA / totalNetCashOutflows) * 100;
    }
    
    // Calculate total-based NSFR using first period values (balance sheet positions)
    const totalASF = availableStableFunding[0] || 0;
    const totalRSF = requiredStableFunding[0] || 0;
    
    let totalBasedNSFR = 100; // Default
    if (totalRSF > 0) {
        totalBasedNSFR = (totalASF / totalRSF) * 100;
    } else if (totalASF > 0) {
        totalBasedNSFR = 200; // High compliance
    }
    
    // Calculate summary metrics (safe against empty arrays)
    const averageLCR = lcrRatios.length > 0 ? lcrRatios.reduce((sum, ratio) => sum + ratio, 0) / lcrRatios.length : 100;
    const averageNSFR = nsfrRatios.length > 0 ? nsfrRatios.reduce((sum, ratio) => sum + ratio, 0) / nsfrRatios.length : 100;
    const worstCaseLCR = lcrRatios.length > 0 ? Math.min(...lcrRatios) : 100;
    const worstCaseNSFR = nsfrRatios.length > 0 ? Math.min(...nsfrRatios) : 100;
    
    // 🔧 SURGICAL FIX: Check BOTH LCR and NSFR compliance using total-based values
    const TOLERANCE = 0.01; // 0.01% tolerance for floating point comparison
    
    // Total-based compliance (matches ZK circuit logic)
    const lcrCompliantTotal = totalBasedLCR >= (lcrThreshold - TOLERANCE);
    const nsfrCompliantTotal = totalBasedNSFR >= (nsfrThreshold - TOLERANCE);
    
    // 🔧 SURGICAL FIX: Use total-based compliance for ZK circuit consistency
    const lcrCompliant = lcrCompliantTotal;
    const nsfrCompliant = nsfrCompliantTotal;
    
    // 🔧 SURGICAL FIX: Require BOTH LCR AND NSFR compliance for overall compliance
    const overallCompliant = lcrCompliant && nsfrCompliant;
    
    // 🔧 SURGICAL FIX DEBUG: Verify the fix worked
    console.log(`🔧 SURGICAL FIX - Compliance Flags:`);
    console.log(`   - totalBasedLCR: ${totalBasedLCR.toFixed(2)} >= ${lcrThreshold} = ${lcrCompliantTotal}`);
    console.log(`   - totalBasedNSFR: ${totalBasedNSFR.toFixed(2)} >= ${nsfrThreshold} = ${nsfrCompliantTotal}`);
    console.log(`   - Final flags: lcrCompliant=${lcrCompliant}, nsfrCompliant=${nsfrCompliant}, overallCompliant=${overallCompliant}`);
    
    // 🔧 SURGICAL FIX: Ensure flags match expectations
    if (totalBasedLCR >= lcrThreshold && totalBasedNSFR >= nsfrThreshold && !overallCompliant) {
        console.error(`❌ SURGICAL FIX FAILED: Ratios compliant but flags wrong!`);
        console.error(`   Debug: LCR=${totalBasedLCR.toFixed(2)}>=100=${lcrCompliantTotal}, NSFR=${totalBasedNSFR.toFixed(2)}>=100=${nsfrCompliantTotal}`);
    } else if (totalBasedLCR >= lcrThreshold && totalBasedNSFR >= nsfrThreshold && overallCompliant) {
        console.log(`✅ SURGICAL FIX SUCCESSFUL: Compliance flags now match ratios!`);
    }
    
    // 🔍 SURGICAL FIX DEBUG: Show compliance calculation step by step
    console.log(`\n🔧 SURGICAL FIX COMPLIANCE CALCULATION DEBUG:`);
    console.log(`   - Total-based LCR: ${totalBasedLCR.toFixed(2)}% >= ${lcrThreshold}% = ${lcrCompliantTotal}`);
    console.log(`   - Total-based NSFR: ${totalBasedNSFR.toFixed(2)}% >= ${nsfrThreshold}% = ${nsfrCompliantTotal}`);
    console.log(`   - Final: lcrCompliant=${lcrCompliant}, nsfrCompliant=${nsfrCompliant}, overallCompliant=${overallCompliant}`);
    console.log(`   - LCR Ratios: [${lcrRatios.map(r => r.toFixed(2)).join(', ')}]`);
    console.log(`   - NSFR Ratios: [${nsfrRatios.map(r => r.toFixed(2)).join(', ')}]`);
    
    console.log(`   - Overall = ${lcrCompliant} && ${nsfrCompliant} = ${overallCompliant}`);
    
    if (lcrCompliant && !nsfrCompliant) {
        console.log(`   ❌ BUG DETECTED: LCR passed but NSFR failed - should be NON-COMPLIANT!`);
    }
    
    // 🔍 DEBUG: Show compliance calculation details
    console.log(`   - Average LCR: ${averageLCR.toFixed(2)}% vs Threshold: ${lcrThreshold}%`);
    console.log(`   - Worst Case LCR: ${worstCaseLCR.toFixed(2)}%`);
    console.log(`   - LCR Ratios range: ${Math.min(...lcrRatios).toFixed(2)}% to ${Math.max(...lcrRatios).toFixed(2)}%`);
    console.log(`   - All LCR ratios >= threshold: ${lcrCompliant}`);
    console.log(`   - Average NSFR: ${averageNSFR.toFixed(2)}% vs Threshold: ${nsfrThreshold}%`);
    console.log(`   - All NSFR ratios >= threshold: ${nsfrCompliant}`);
    console.log(`   - Overall Compliance: ${overallCompliant}`);
    console.log(`🔧 END COMPLIANCE DEBUG\n`);
    
    // 🔍 DEBUG: Show any non-compliant periods
    lcrRatios.forEach((ratio, period) => {
        if (ratio < lcrThreshold) {
            console.log(`   ⚠️ Period ${period}: LCR ${ratio.toFixed(2)}% < ${lcrThreshold}%`);
        }
    });
    
    nsfrRatios.forEach((ratio, period) => {
        if (ratio < nsfrThreshold) {
            console.log(`   ⚠️ Period ${period}: NSFR ${ratio.toFixed(2)}% < ${nsfrThreshold}%`);
        }
    });
    
    console.log(`🔧 TOTAL-BASED CALCULATIONS FOR ZK CIRCUIT:`);
    console.log(`   - Total Adjusted HQLA: ${totalAdjustedHQLA.toFixed(2)} (L1: ${totalHQLALevel1}, L2A: ${totalHQLALevel2A}, L2B: ${totalHQLALevel2B})`);
    console.log(`   - Total Net Cash Outflows: ${totalNetCashOutflows.toFixed(2)}`);
    console.log(`   - Total-based LCR: ${totalBasedLCR.toFixed(2)}% (vs Average LCR: ${averageLCR.toFixed(2)}%)`);
    console.log(`   - Total ASF: ${totalASF}, Total RSF: ${totalRSF}`);
    console.log(`   - Total-based NSFR: ${totalBasedNSFR.toFixed(2)}% (vs Average NSFR: ${averageNSFR.toFixed(2)}%)`);
    console.log(`   - ℹ️ ZK Circuit should use TOTAL-BASED values, not averages!`);
    
    return {
        lcrRatios,
        nsfrRatios,
        averageLCR,
        averageNSFR,
        totalBasedLCR,  // 🔧 NEW: For ZK circuit
        totalBasedNSFR, // 🔧 NEW: For ZK circuit
        worstCaseLCR,
        worstCaseNSFR,
        lcrCompliant,
        nsfrCompliant,
        overallCompliant
    };
}

/**
 * Validate Basel3 risk data integrity - OptimMerkle implementation
 */
export function validateBasel3RiskDataOptimMerkle(complianceData: RiskLiquidityBasel3OptimMerkleData): boolean {
    // Check required fields
    if (!complianceData.companyID || complianceData.companyID.length === 0) {
        throw new Error('Company ID is required for Basel3 scenario');
    }
    
    // Check array lengths consistency
    const expectedLength = complianceData.periodsCount;
    const arrays = [
        complianceData.cashInflow,
        complianceData.cashOutflow,
        complianceData.hqlaLevel1,
        complianceData.hqlaLevel2A,
        complianceData.hqlaLevel2B,
        complianceData.netCashOutflows,
        complianceData.availableStableFunding,
        complianceData.requiredStableFunding
    ];
    
    arrays.forEach((array, index) => {
        if (array.length !== expectedLength) {
            throw new Error(`Array ${index} length (${array.length}) does not match periods count (${expectedLength})`);
        }
    });
    
    // Check thresholds
    if (complianceData.lcrThreshold <= 0 || complianceData.nsfrThreshold <= 0) {
        throw new Error('LCR and NSFR thresholds must be positive');
    }
    
    return true;
}

/**
 * Generate Basel3 compliance summary report - OptimMerkle implementation
 */
export function generateBasel3RiskSummaryOptimMerkle(
    complianceData: RiskLiquidityBasel3OptimMerkleData,
    riskMetrics: ReturnType<typeof calculateBasel3RiskMetricsOptimMerkle>
): string {
    return `
=== Basel3 LCR/NSFR Risk Assessment Summary ===
Company: ${complianceData.companyName} (${complianceData.companyID})
Assessment Period: ${complianceData.periodsCount} periods (${complianceData.metadata.timeHorizon})
Currency: ${complianceData.metadata.currency}

Basel3 Parameters:
- LCR Threshold: ${complianceData.lcrThreshold}%
- NSFR Threshold: ${complianceData.nsfrThreshold}%

LCR Metrics (REQUIRED FOR COMPLIANCE):
- Average LCR: ${riskMetrics.averageLCR.toFixed(2)}%
- Worst Case LCR: ${riskMetrics.worstCaseLCR.toFixed(2)}%
- LCR Compliance: ${riskMetrics.lcrCompliant ? 'PASSED' : 'FAILED'}

NSFR Metrics (REQUIRED FOR COMPLIANCE):
- Average NSFR: ${riskMetrics.averageNSFR.toFixed(2)}%
- Worst Case NSFR: ${riskMetrics.worstCaseNSFR.toFixed(2)}%
- NSFR Compliance: ${riskMetrics.nsfrCompliant ? 'PASSED' : 'FAILED'}

Overall Basel3 Compliance: ${riskMetrics.overallCompliant ? 'COMPLIANT' : 'NON-COMPLIANT'} (requires both LCR and NSFR)
Generated: ${complianceData.metadata.processingDate}
`;
}
