/**
 * ====================================================================
 * Risk Liquidity Advanced OptimMerkle Utilities
 * ====================================================================
 * Data preparation utilities for Advanced Risk scenario
 * Follows the modular pattern: API call → data prep → signature → witnesses → ZK
 * ====================================================================
 */

import { Field, CircuitString, Poseidon, MerkleTree } from 'o1js';
import { 
    callACTUSAPI, 
    loadContractPortfolio, 
    getDefaultContractPortfolio,
    ACTUSOptimMerkleAPIResponse,
    ACTUSContract 
} from '../ACTUSOptimMerkleAPI.js';
import { 
    callACTUSAPIWithPostProcessing,
    printCoreACTUSResponse 
} from '../../../../domain/risk/ACTUSDataProcessor.js';
import { buildMerkleTreeZK, hashDataZK, MerkleWitness8, safeFieldFrom } from '../../../../core/CoreZKUtilities.js';
import * as fs from 'fs';
import * as path from 'path';

// =================================== Advanced Risk Data Structures ===================================

export interface RiskLiquidityAdvancedOptimMerkleData {
    // Scenario identifiers
    companyID: string;
    companyName: string;
    mcaID: string;
    businessPANID: string;
    
    // Risk assessment data
    riskEvaluated: number;
    cashInflow: number[];
    cashOutflow: number[];
    periodsCount: number;
    
    // Advanced risk metrics
    newInvoiceAmount: number;
    newInvoiceEvaluationMonth: number;
    liquidityThreshold: number;
    
    // API response metadata
    metadata: {
        timeHorizon: string;
        currency: string;
        processingDate: string;
    };
}

export interface RiskLiquidityAdvancedOptimMerkleProcessedData {
    complianceData: RiskLiquidityAdvancedOptimMerkleData;
    merkleTree: MerkleTree;
    merkleRoot: Field;
    witnesses: {
        cashInflow: MerkleWitness8;
        cashOutflow: MerkleWitness8;
        riskMetrics: MerkleWitness8;
        companyInfo: MerkleWitness8;
    };
}

// =================================== Data Processing Functions ===================================

/**
 * Fetch and process ACTUS data for Advanced Risk scenario
 */
export async function fetchRiskLiquidityAdvancedOptimMerkleData(
    actusUrl: string,
    contractPortfolio?: string | ACTUSContract[]
): Promise<ACTUSOptimMerkleAPIResponse> {
    try {
        console.log('Loading contract portfolio for Advanced Risk...');
        const contracts = await loadContractPortfolio(contractPortfolio || getDefaultContractPortfolio());
        
        console.log(`🔍 DEBUG: Contract portfolio input type: ${typeof contractPortfolio}`);
        console.log(`🔍 DEBUG: Contract portfolio is array: ${Array.isArray(contractPortfolio)}`);
        console.log(`🔍 DEBUG: Contract portfolio length: ${contractPortfolio?.length || 'undefined'}`);
        
        if (contractPortfolio && Array.isArray(contractPortfolio)) {
            console.log(`🔍 DEBUG: Using PROVIDED contracts from configuration file`);
            console.log(`🔍 DEBUG: First contract preview:`, JSON.stringify(contractPortfolio[0], null, 2));
            console.log(`🔍 DEBUG: NO Basel3 or haircuts will be applied`);
        } else {
            console.log(`🔍 DEBUG: Using DEFAULT contracts`);
            console.log(`🔍 DEBUG: Default contract preview:`, JSON.stringify(contracts[0], null, 2));
            console.log(`🔍 DEBUG: NO Basel3 or haircuts will be applied`);
        }
        
        console.log(`🔍 DEBUG: Loaded ${contracts.length} contracts for ACTUS API`);
        console.log('🔍 DEBUG: Contract preview:', JSON.stringify(contracts.slice(0, 2), null, 2));
        console.log(`🔍 DEBUG: ACTUS API URL: ${actusUrl}`);
        
        console.log('Calling ACTUS API for Advanced Risk calculations (no Basel3)...');
        const actusResponse = await callACTUSAPIWithPostProcessing(actusUrl, contracts);
        
        console.log(`🔍 DEBUG: Raw ACTUS API response structure:`);
        console.log(`🔍 DEBUG: - periodsCount: ${actusResponse.periodsCount}`);
        console.log(`🔍 DEBUG: - inflow length: ${actusResponse.inflow?.length}`);
        console.log(`🔍 DEBUG: - outflow length: ${actusResponse.outflow?.length}`);
        console.log(`🔍 DEBUG: - metadata: ${JSON.stringify(actusResponse.metadata)}`);
        
        if (actusResponse.periodsCount === 0) {
            console.warn('⚠️ WARNING: ACTUS API returned 0 periods - this may indicate an API issue');
            console.log('🔍 DEBUG: Full ACTUS response:', JSON.stringify(actusResponse, null, 2));
        }
        
        console.log(`Advanced Risk ACTUS data fetched: ${actusResponse.periodsCount} periods (ready for simple processing)`);
        return actusResponse;
        
    } catch (error) {
        console.error('Error fetching Advanced Risk ACTUS data:', error);
        throw new Error(`Advanced Risk data fetch failed: ${error}`);
    }
}

/**
 * Process ACTUS response into Advanced Risk compliance data structure
 * ✅ SIMPLE: Just aggregate cash flows, no Basel3 complexity
 */
export function processAdvancedRiskData(
    actusResponse: ACTUSOptimMerkleAPIResponse,
    liquidityThreshold: number,
    newInvoiceAmount: number = 0,  // Simplified - not used in calculations
    newInvoiceEvaluationMonth: number = 1,  // Simplified - not used in calculations
    masterConfig?: AdvancedMasterConfiguration,
    executionMode?: string
): RiskLiquidityAdvancedOptimMerkleData {
    
    console.log('📊 Processing Advanced Risk data - Liquidity checks (NO Basel3, NO haircuts)...');
    
    // ✅ SIMPLE: Just aggregate cash flows by period (25 months from ACTUS post-processing)
    const aggregatedInflows = actusResponse.inflow.map((period: number[]) => 
        period.reduce((sum: number, value: number) => sum + value, 0)
    );
    
    const aggregatedOutflows = actusResponse.outflow.map((period: number[]) => 
        period.reduce((sum: number, value: number) => sum + value, 0)
    );
    
    console.log(`✅ Aggregation: ${aggregatedInflows.length} periods (contracts from specified source only)`);
    console.log(`   - Sample inflows: [${aggregatedInflows.slice(0, 3).join(', ')}...]`);
    console.log(`   - Sample outflows: [${aggregatedOutflows.slice(0, 3).join(', ')}...]`);
    console.log(`   - NO Basel3 formulas applied`);
    console.log(`   - NO haircuts applied`);
    
    return {
        // Simple identifiers
        companyID: 'ADV_LIQ_001',
        companyName: 'Advanced Liquidity Check (No Basel3/Haircuts)',
        mcaID: 'SIMPLE_001',
        businessPANID: 'SIMPLE_001',
        
        // Core data - just the cash flows from contracts
        riskEvaluated: 1,
        cashInflow: aggregatedInflows,
        cashOutflow: aggregatedOutflows,
        periodsCount: actusResponse.periodsCount,
        
        // Simplified legacy fields
        newInvoiceAmount: 0,  // Not used in simple calculations
        newInvoiceEvaluationMonth: 1,  // Not used in simple calculations
        liquidityThreshold: Math.round(liquidityThreshold),
        
        // Metadata
        metadata: actusResponse.metadata
    };
}

/**
 * Build Merkle tree and generate witnesses for Advanced Risk data
 * ✅ CRITICAL FIX: Match exact structure expected by ZK program
 */
export function buildAdvancedRiskMerkleStructure(
    complianceData: RiskLiquidityAdvancedOptimMerkleData
): RiskLiquidityAdvancedOptimMerkleProcessedData {
    
    console.log('🔧 Building Merkle tree with ZK program compatible structure (ZK-COMPLIANT)...');
    
    // ✅ CRITICAL FIX: Use exact same leaf calculations as ZK program expects
    // These must match the calculations in the ZK circuit exactly
    
    // ✅ ZK-COMPLIANT: Helper function to encode arrays exactly like ZK program
    function encodeArrayToFieldForMerkleZKCompliant(numbers: number[]): Field {
        // ✅ ZK-COMPLIANT: Use same logic as ZK program (Poseidon hash, no division)
        if (numbers.length === 0) {
            return Field(0);
        }
        
        // Import Poseidon for consistent hashing
        const fieldsArray = numbers.slice(0, 8).map(num => {
            const scaled = Math.floor(Math.abs(num)); // No division, just floor
            const maxSafeInt = 2n ** 200n; // Conservative limit
            const boundedValue = Math.min(scaled, Number(maxSafeInt));
            return Field(boundedValue);
        });
        
        // Pad to 8 elements for consistent Poseidon input
        while (fieldsArray.length < 8) {
            fieldsArray.push(Field(0));
        }
        
        return Poseidon.hash(fieldsArray);
    }
    
    // ✅ CRITICAL FIX: Create leaves that match ZK program expectations exactly
    const merkleLeaves: Field[] = [
        // 0. Company info hash - must match: complianceData.scenarioID.hash()
        CircuitString.fromString(complianceData.companyID).hash(),
        
        // 1. Cash inflows hash - must match: encodeArrayToFieldZKCompliant(cashInflows)
        encodeArrayToFieldForMerkleZKCompliant(complianceData.cashInflow),
        
        // 2. Cash outflows hash - must match: encodeArrayToFieldZKCompliant(cashOutflows)
        encodeArrayToFieldForMerkleZKCompliant(complianceData.cashOutflow),
        
        // 3. Risk metrics hash - must match ZK program calculation exactly using Poseidon
        Poseidon.hash([
            Field(complianceData.newInvoiceAmount),
            Field(complianceData.newInvoiceEvaluationMonth),
            Field(complianceData.liquidityThreshold),
            Field(complianceData.periodsCount)
        ])
    ];
    
    console.log('🔧 Merkle Leaves Debug (ZK Compatible):');
    console.log(`   Leaf 0 (Company): ${merkleLeaves[0].toString()}`);
    console.log(`   Leaf 1 (Inflows): ${merkleLeaves[1].toString()}`);
    console.log(`   Leaf 2 (Outflows): ${merkleLeaves[2].toString()}`);
    console.log(`   Leaf 3 (Risk Metrics): ${merkleLeaves[3].toString()}`);
    
    // Build Merkle tree
    const merkleTree = buildMerkleTreeZK(merkleLeaves);
    const merkleRoot = merkleTree.getRoot();
    
    console.log(`🔐 Calculated Merkle Root (ZK Compatible): ${merkleRoot.toString()}`);
    
    // Generate witnesses for each data category
    const witnesses = {
        companyInfo: new MerkleWitness8(merkleTree.getWitness(0n)),
        cashInflow: new MerkleWitness8(merkleTree.getWitness(1n)),
        cashOutflow: new MerkleWitness8(merkleTree.getWitness(2n)),
        riskMetrics: new MerkleWitness8(merkleTree.getWitness(3n))
    };
    
    // ✅ VERIFICATION: Test witness calculations
    console.log('🔧 Verifying witness calculations:');
    try {
        const companyInfoCalculated = witnesses.companyInfo.calculateRoot(merkleLeaves[0]);
        const inflowsCalculated = witnesses.cashInflow.calculateRoot(merkleLeaves[1]);
        const outflowsCalculated = witnesses.cashOutflow.calculateRoot(merkleLeaves[2]);
        const riskMetricsCalculated = witnesses.riskMetrics.calculateRoot(merkleLeaves[3]);
        
        console.log(`   Company Info Root: ${companyInfoCalculated.toString()}`);
        console.log(`   Inflows Root: ${inflowsCalculated.toString()}`);
        console.log(`   Outflows Root: ${outflowsCalculated.toString()}`);
        console.log(`   Risk Metrics Root: ${riskMetricsCalculated.toString()}`);
        
        const allMatch = [companyInfoCalculated, inflowsCalculated, outflowsCalculated, riskMetricsCalculated]
            .every(calculatedRoot => calculatedRoot.toString() === merkleRoot.toString());
        
        console.log(`   All witnesses match root: ${allMatch}`);
        
        if (!allMatch) {
            console.error('❌ Witness verification failed - will cause ZK proof failure!');
        }
        
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
 * Calculate ultra-simple liquidity metrics
 * ✅ ULTRA SIMPLE: Just inflow/outflow ratio per period, no complexity
 */
export function calculateAdvancedRiskMetrics(
    complianceData: RiskLiquidityAdvancedOptimMerkleData,
    dynamicThresholds?: DynamicThresholds,
    masterConfig?: AdvancedMasterConfiguration
): {
    periodicLiquidityRatios: number[];
    averageLiquidityRatio: number;
    worstCaseLiquidityRatio: number;
    liquidityStressTestPassed: boolean;
    periodByPeriodCompliance: boolean[];
} {
    const { cashInflow, cashOutflow, liquidityThreshold } = complianceData;
    
    // Use dynamic threshold if provided, otherwise use original threshold
    const effectiveThreshold = dynamicThresholds?.baseThreshold || liquidityThreshold;
    const tolerance = dynamicThresholds?.tolerance || 0;
    
    console.log(`📊 Liquidity Check (25 months from ACTUS - CUMULATIVE):`);
    console.log(`   - Threshold: ${effectiveThreshold}% (tolerance: ${tolerance}%)`);
    console.log(`   - Periods: ${cashInflow.length}`);
    console.log(`   - NO Basel3 formulas`);
    console.log(`   - NO haircuts applied`);
    console.log(`   - Contracts from specified source only`);
    console.log(`   - CUMULATIVE cash flow analysis`);
    
    // ✅ CUMULATIVE LIQUIDITY: Calculate cumulative flows and period-by-period ratios
    const periodicLiquidityRatios: number[] = [];
    const periodByPeriodCompliance: boolean[] = [];
    
    let cumulativeInflow = 0;
    let cumulativeOutflow = 0;
    
    for (let period = 0; period < cashInflow.length; period++) {
        const periodInflow = cashInflow[period];
        const periodOutflow = cashOutflow[period];
        
        // Add to cumulative totals
        cumulativeInflow += periodInflow;
        cumulativeOutflow += periodOutflow;
        
        // Calculate cumulative liquidity ratio
        let liquidityRatio: number;
        if (cumulativeOutflow > 0) {
            liquidityRatio = Math.round((cumulativeInflow / cumulativeOutflow) * 100);
        } else if (cumulativeInflow > 0) {
            liquidityRatio = 500; // High liquidity when we have inflows but no outflows
        } else {
            liquidityRatio = 100; // Neutral when both are zero (no activity yet)
        }
        
        periodicLiquidityRatios.push(liquidityRatio);
        
        // Check if this period passes threshold
        const thresholdWithTolerance = effectiveThreshold - tolerance;
        const periodCompliant = liquidityRatio >= thresholdWithTolerance;
        periodByPeriodCompliance.push(periodCompliant);
        
        // Show detailed analysis for ALL periods
        const status = periodCompliant ? 'PASS' : 'FAIL';
        const inflowSign = periodInflow >= 0 ? '+' : '';
        const outflowSign = periodOutflow >= 0 ? '+' : '';
        
        console.log(`   - Period ${(period + 1).toString().padStart(2, ' ')}: ` +
                   `Inflow ${inflowSign}${periodInflow.toFixed(0).padStart(8, ' ')}, ` +
                   `Outflow ${outflowSign}${periodOutflow.toFixed(0).padStart(8, ' ')} | ` +
                   `Cumulative: ${cumulativeInflow.toFixed(0).padStart(8, ' ')} / ${cumulativeOutflow.toFixed(0).padStart(8, ' ')} = ` +
                   `${liquidityRatio.toString().padStart(3, ' ')}% [${status}]`);
    }
    
    // Simple aggregate calculations
    const averageLiquidityRatio = Math.round(
        periodicLiquidityRatios.reduce((sum, ratio) => sum + ratio, 0) / periodicLiquidityRatios.length
    );
    const worstCaseLiquidityRatio = Math.min(...periodicLiquidityRatios);
    
    // ALL periods must pass
    const liquidityStressTestPassed = periodByPeriodCompliance.every(compliant => compliant);
    
    const failedPeriods = periodByPeriodCompliance.filter(compliant => !compliant).length;
    
    console.log(`\n📊 Cumulative Liquidity Analysis Results:`);
    console.log(`   - Average Ratio: ${averageLiquidityRatio}%`);
    console.log(`   - Worst Case: ${worstCaseLiquidityRatio}%`);
    console.log(`   - Failed Periods: ${failedPeriods}/${periodByPeriodCompliance.length}`);
    console.log(`   - Final Cumulative: ${cumulativeInflow.toFixed(0)} / ${cumulativeOutflow.toFixed(0)}`);
    console.log(`   - Overall: ${liquidityStressTestPassed ? 'PASS' : 'FAIL'}`);
    
    return {
        periodicLiquidityRatios,
        averageLiquidityRatio,
        worstCaseLiquidityRatio,
        liquidityStressTestPassed,
        periodByPeriodCompliance
    };
}

/**
 * Validate advanced risk data integrity
 */
export function validateAdvancedRiskData(
    complianceData: RiskLiquidityAdvancedOptimMerkleData,
    masterConfig?: AdvancedMasterConfiguration
): boolean {
    // Basic validation checks
    if (!complianceData.companyID || complianceData.companyID.length === 0) {
        throw new Error('Company ID is required for Advanced Risk scenario');
    }
    
    if (complianceData.cashInflow.length !== complianceData.cashOutflow.length) {
        throw new Error('Cash inflow and outflow arrays must have equal length');
    }
    
    if (complianceData.cashInflow.length !== complianceData.periodsCount) {
        throw new Error('Cash flow data length must match periods count');
    }
    
    if (complianceData.liquidityThreshold <= 0) {
        throw new Error('Liquidity threshold must be positive');
    }
    
    if (complianceData.newInvoiceEvaluationMonth < 1 || complianceData.newInvoiceEvaluationMonth > complianceData.periodsCount) {
        throw new Error('New invoice evaluation month must be within valid period range');
    }
    
    // Enhanced validation with master configuration constraints
    if (masterConfig) {
        const maxSafeValue = BigInt(masterConfig.minaO1jsConstraints.fieldArithmetic.maxSafeValue);
        
        // Validate cash flow values are within Field constraints
        const maxCashValue = Math.max(
            ...complianceData.cashInflow.map(v => Math.abs(v)),
            ...complianceData.cashOutflow.map(v => Math.abs(v))
        );
        
        if (BigInt(Math.round(maxCashValue * 100)) > maxSafeValue) {
            throw new Error(`Cash flow values exceed max safe Field value: ${maxCashValue}`);
        }
        
        // Validate circuit complexity constraints
        const estimatedComplexity = complianceData.periodsCount * 10; // Simple estimation
        if (estimatedComplexity > masterConfig.minaO1jsConstraints.circuitOptimization.maxCircuitComplexity) {
            console.warn(`Estimated circuit complexity ${estimatedComplexity} may exceed limit`);
        }
    }
    
    // Special handling for edge case where ACTUS returns 0 periods
    if (complianceData.periodsCount === 0) {
        console.warn('⚠️ WARNING: Zero periods detected - this may indicate ACTUS API issues');
        console.warn('⚠️ This could be due to:');
        console.warn('  - ACTUS API server not responding correctly');
        console.warn('  - Invalid contract portfolio configuration');
        console.warn('  - Network connectivity issues');
        throw new Error('Cannot validate data with zero periods - check ACTUS API response');
    }
    
    return true;
}

/**
 * Generate summary report for Advanced Risk assessment
 * ✅ Focus on period-by-period liquidity compliance, NO Basel3
 */
export function generateAdvancedRiskSummary(
    complianceData: RiskLiquidityAdvancedOptimMerkleData,
    riskMetrics: ReturnType<typeof calculateAdvancedRiskMetrics>
): string {
    const passedPeriods = riskMetrics.periodByPeriodCompliance.filter(compliant => compliant).length;
    const totalPeriods = riskMetrics.periodByPeriodCompliance.length;
    const failedPeriods = totalPeriods - passedPeriods;
    
    return `
=== Advanced Risk Liquidity Assessment Summary ===
Company: ${complianceData.companyName} (${complianceData.companyID})
Assessment Period: ${complianceData.periodsCount} periods (${complianceData.metadata.timeHorizon})
Currency: ${complianceData.metadata.currency}

Simplified Parameters:
- Liquidity Threshold: ${complianceData.liquidityThreshold}%
- NO Basel3 formulas applied
- NO haircuts applied
- Contracts from specified source only
- Simple period-by-period check only

Period-by-Period Liquidity Analysis:
- Total Periods Analyzed: ${totalPeriods}
- Periods Passed: ${passedPeriods}
- Periods Failed: ${failedPeriods}
- Pass Rate: ${((passedPeriods / totalPeriods) * 100).toFixed(1)}%

Simple Liquidity Metrics:
- Average Liquidity Ratio: ${riskMetrics.averageLiquidityRatio.toFixed(2)}%
- Worst Case Liquidity Ratio: ${riskMetrics.worstCaseLiquidityRatio.toFixed(2)}%
- Period-by-Period Compliance: ${riskMetrics.liquidityStressTestPassed ? 'ALL PERIODS PASSED' : `${failedPeriods} PERIOD(S) FAILED`}

Overall Compliance Status: ${riskMetrics.liquidityStressTestPassed ? 'COMPLIANT' : 'NON-COMPLIANT'}
(Note: Simple check requires ALL periods to meet liquidity threshold)

Processing Method: Advanced Liquidity per period check
Generated: ${complianceData.metadata.processingDate}
`;
}

// =================================== Advanced Configuration Management ===================================

export interface AdvancedMasterConfiguration {
    configMetadata: {
        configId: string;
        systemScope: string;
        version: string;
    };
    minaO1jsConstraints: {
        fieldArithmetic: {
            maxSafeValue: string;
            integerOnly: boolean;
            divisionSafety: string;
            overflowPrevention: boolean;
        };
        circuitOptimization: {
            maxCircuitComplexity: number;
            adaptiveScaling: boolean;
        };
    };
    businessThresholdVariance: {
        dynamicStrategies: {
            [key: string]: {
                baseThreshold: number;
                tolerance: number;
                stressMultiplier: number;
                description: string;
            };
        };
    };
    zkSecurityGuarantees: any;
    performanceOptimization: any;
    systemIsolation: any;
}

export interface ExecutionSettings {
    executionSettings: {
        settingsId: string;
        version: string;
    };
    executionPaths: {
        [key: string]: {
            parameters: {
                liquidityThreshold: number;
                executionMode: string;
            };
            expectedOutcome: string;
            description: string;
        };
    };
}

export interface DynamicThresholds {
    baseThreshold: number;
    tolerance: number;
    stressMultiplier: number;
    description: string;
}

/**
 * Load the advanced master configuration
 */
export function loadAdvancedMasterConfiguration(): AdvancedMasterConfiguration {
    try {
        const configPath = path.join(process.cwd(), 'src', 'data', 'RISK', 'Advanced', 'SETTINGS', 'advanced-master-config.json');
        const configContent = fs.readFileSync(configPath, 'utf8');
        return JSON.parse(configContent);
    } catch (error) {
        throw new Error(`Failed to load advanced master configuration: ${error}`);
    }
}

/**
 * Load execution settings
 */
export function loadExecutionSettings(): ExecutionSettings {
    try {
        const settingsPath = path.join(process.cwd(), 'src', 'data', 'RISK', 'Advanced', 'SETTINGS', 'execution-settings.json');
        const settingsContent = fs.readFileSync(settingsPath, 'utf8');
        return JSON.parse(settingsContent);
    } catch (error) {
        throw new Error(`Failed to load execution settings: ${error}`);
    }
}

/**
 * Apply dynamic threshold strategy based on execution mode
 */
export function applyDynamicThresholdStrategy(
    executionMode: string,
    baseThreshold: number,
    masterConfig: AdvancedMasterConfiguration
): DynamicThresholds {
    const strategies = masterConfig.businessThresholdVariance.dynamicStrategies;
    
    // Use execution mode strategy if available, otherwise default to 'production'
    const strategy = strategies[executionMode] || strategies['production'];
    
    if (!strategy) {
        console.warn(`No strategy found for execution mode '${executionMode}', using default`);
        return {
            baseThreshold: baseThreshold,
            tolerance: 5.0,
            stressMultiplier: 1.0,
            description: 'Default strategy'
        };
    }
    
    // Apply base threshold override or use provided value
    const finalThreshold = strategy.baseThreshold || baseThreshold;
    
    return {
        baseThreshold: finalThreshold,
        tolerance: strategy.tolerance,
        stressMultiplier: strategy.stressMultiplier,
        description: strategy.description
    };
}

/**
 * Validate Field arithmetic constraints
 */
export function validateFieldArithmeticConstraints(
    thresholds: DynamicThresholds,
    constraints: AdvancedMasterConfiguration['minaO1jsConstraints']
): boolean {
    const maxSafeValue = BigInt(constraints.fieldArithmetic.maxSafeValue);
    
    // Check threshold values are within safe Field range
    if (BigInt(Math.round(thresholds.baseThreshold * 100)) > maxSafeValue) {
        throw new Error(`Base threshold ${thresholds.baseThreshold} exceeds max safe Field value`);
    }
    
    if (BigInt(Math.round(thresholds.tolerance * 100)) > maxSafeValue) {
        throw new Error(`Tolerance ${thresholds.tolerance} exceeds max safe Field value`);
    }
    
    // Validate only integers are used (as required by o1.js)
    if (!constraints.fieldArithmetic.integerOnly) {
        throw new Error('Field arithmetic must use integers only for o1.js compatibility');
    }
    
    // Validate division safety is configured
    if (constraints.fieldArithmetic.divisionSafety !== 'SCALED_MULTIPLICATIVE_INVERSE') {
        throw new Error('Division safety must use SCALED_MULTIPLICATIVE_INVERSE pattern');
    }
    
    return true;
}
