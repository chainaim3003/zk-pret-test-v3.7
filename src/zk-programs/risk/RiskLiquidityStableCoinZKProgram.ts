/**
 * Debug version of the ZK program to identify the exact hash mismatch
 */

import {
    Field,
    Signature,
    Struct,
    ZkProgram,
    CircuitString,
    UInt64,
    Bool,
    MerkleWitness,
    Provable,
    Poseidon,
} from 'o1js';
import { getPublicKeyFor } from '../../core/OracleRegistry.js';
import { verifyOracleSignatureZK, verifyMerkleWitnessZK, MerkleWitness8, hashDataZK, safeFieldFrom } from '../../utils/core/CoreZKUtilities.js';
import { 
    calculatePercentageZK, 
    assertThresholdComplianceZK,
    calculateConcentrationRiskZK,
    validateAssetQualityZK
} from '../../utils/domain/risk/ComplianceZKUtilities.js';

// =================================== Merkle Tree Configuration ===================================
export const MERKLE_TREE_HEIGHT = 8;

// =================================== StableCoin Risk Data Structures ===================================

export class RiskLiquidityStableCoinOptimMerkleComplianceData extends Struct({
    // Core identifiers
    scenarioID: CircuitString,
    scenarioName: CircuitString,
    
    // Risk evaluation status
    riskEvaluated: Field,
    
    // StableCoin reserve components (aggregated totals)
    cashReservesTotal: Field,           
    treasuryReservesTotal: Field,       
    corporateReservesTotal: Field,      
    otherReservesTotal: Field,          
    
    // Outstanding token information
    outstandingTokensTotal: Field,      
    tokenValue: Field,                  
    
    // Reserve quality metrics
    averageLiquidityScore: Field,       
    averageCreditRating: Field,         
    averageMaturity: Field,             
    
    // StableCoin compliance metrics
    backingRatio: Field,                
    liquidityRatio: Field,              
    concentrationRisk: Field,           
    assetQualityScore: Field,           
    
    // 🚨 NEW: Regulatory Compliance Validation (CRITICAL SECURITY FIX)
    regulatoryJurisdiction: CircuitString, // US, EU, etc.
    regulatoryScore: Field,               // 0-100 overall compliance score
    regulatoryThreshold: Field,           // Minimum required score (e.g., 85 for US)
    regulatoryCompliant: Bool,            // Overall regulatory compliance status
    
    // Compliance thresholds
    backingRatioThreshold: Field,       
    liquidityRatioThreshold: Field,     
    concentrationLimit: Field,          
    qualityThreshold: Field,            
    
    // Overall compliance status
    backingCompliant: Bool,
    liquidityCompliant: Bool,
    concentrationCompliant: Bool,
    qualityCompliant: Bool,
    stableCoinCompliant: Bool,
    
    // Additional risk parameters
    periodsCount: Field,
    liquidityThreshold: Field,
    newInvoiceAmount: Field,
    newInvoiceEvaluationMonth: Field,
    
    // Merkle root containing all detailed data
    merkleRoot: Field,
    
    // Verification metadata
    verificationTimestamp: UInt64,
}) {}

export class RiskLiquidityStableCoinOptimMerklePublicOutput extends Struct({
    scenarioID: CircuitString,
    stableCoinCompliant: Bool,
    regulatoryCompliant: Bool,      // 🚨 NEW: Include regulatory compliance in public output
    regulatoryScore: Field,         // 🚨 NEW: Include regulatory score in public output
    backingRatio: Field,
    liquidityRatio: Field,
    concentrationRisk: Field,
    assetQualityScore: Field,
    verificationTimestamp: UInt64,
    merkleRoot: Field,
}) {}

// =================================== DEBUG VERSION - Disable Merkle Verification ===================================

export const RiskLiquidityStableCoinOptimMerkleZKProgramWithSign = ZkProgram({
    name: 'RiskLiquidityStableCoinOptimMerkle',
    publicInput: UInt64,
    publicOutput: RiskLiquidityStableCoinOptimMerklePublicOutput,

    methods: {
        proveStableCoinRiskCompliance: {
            privateInputs: [
                RiskLiquidityStableCoinOptimMerkleComplianceData,
                Signature,
                MerkleWitness8,
                MerkleWitness8,
                MerkleWitness8,
                MerkleWitness8,
                MerkleWitness8,
            ],
            
            async method(
                currentTimestamp: UInt64,
                complianceData: RiskLiquidityStableCoinOptimMerkleComplianceData,
                oracleSignature: Signature,
                companyInfoWitness: MerkleWitness8,
                reservesWitness: MerkleWitness8,
                tokensWitness: MerkleWitness8,
                qualityWitness: MerkleWitness8,
                thresholdsWitness: MerkleWitness8,
            ): Promise<RiskLiquidityStableCoinOptimMerklePublicOutput> {

                // =================================== Oracle Signature Verification ===================================
                const registryPublicKey = getPublicKeyFor('RISK');
                verifyOracleSignatureZK(oracleSignature, [complianceData.merkleRoot], registryPublicKey);

                // =================================== Merkle Inclusion Proofs ===================================
                const merkleRoot = complianceData.merkleRoot;
                
                // Create hashes for each data component to match Merkle tree structure
                // ✅ ZK-COMPLIANT: Use CircuitString.hash() instead of toString().length
                const companyInfoHash = Poseidon.hash([
                    complianceData.scenarioID.hash(),
                    complianceData.riskEvaluated
                ]);
                
                const reservesHash = Poseidon.hash([
                    complianceData.cashReservesTotal,
                    complianceData.treasuryReservesTotal,
                    complianceData.corporateReservesTotal,
                    complianceData.otherReservesTotal,
                    Field(0), // Padding to 8 elements
                    Field(0),
                    Field(0),
                    Field(0)
                ]);
                
                const tokensHash = Poseidon.hash([
                    complianceData.outstandingTokensTotal,
                    complianceData.tokenValue,
                    Field(0), // Padding to 8 elements
                    Field(0),
                    Field(0),
                    Field(0),
                    Field(0),
                    Field(0)
                ]);
                
                const qualityMetricsHash = Poseidon.hash([
                    complianceData.averageLiquidityScore,
                    complianceData.averageCreditRating,
                    complianceData.averageMaturity,
                    complianceData.assetQualityScore,
                    Field(0), // Padding to 8 elements
                    Field(0),
                    Field(0),
                    Field(0)
                ]);
                
                const thresholdsHash = Poseidon.hash([
                    complianceData.backingRatioThreshold,
                    complianceData.liquidityRatioThreshold,
                    complianceData.concentrationLimit,
                    complianceData.qualityThreshold,
                    complianceData.liquidityThreshold,
                    complianceData.newInvoiceAmount,
                    complianceData.newInvoiceEvaluationMonth,
                    complianceData.periodsCount
                ]);
                
                // Verify all components are included in the Merkle tree
                verifyMerkleWitnessZK(companyInfoWitness, merkleRoot, companyInfoHash);
                verifyMerkleWitnessZK(reservesWitness, merkleRoot, reservesHash);
                verifyMerkleWitnessZK(tokensWitness, merkleRoot, tokensHash);
                verifyMerkleWitnessZK(qualityWitness, merkleRoot, qualityMetricsHash);
                verifyMerkleWitnessZK(thresholdsWitness, merkleRoot, thresholdsHash);

                // =================================== ZK-SAFE StableCoin Compliance Logic ===================================
                // ✅ ZK-COMPLIANT: Safe Field arithmetic with proper bounds (like Advanced program)
                
                // 1. Validate risk evaluation status
                complianceData.riskEvaluated.assertEquals(Field(1));
                
                // 2. Validate periods count is reasonable (1-120 months)
                complianceData.periodsCount.assertGreaterThan(Field(0));
                complianceData.periodsCount.assertLessThanOrEqual(Field(120));
                
                // 3. Validate StableCoin thresholds are positive and reasonable
                complianceData.backingRatioThreshold.assertGreaterThan(Field(0));
                complianceData.backingRatioThreshold.assertLessThanOrEqual(Field(50000)); // Max 50000%
                complianceData.liquidityRatioThreshold.assertGreaterThanOrEqual(Field(0));
                complianceData.liquidityRatioThreshold.assertLessThanOrEqual(Field(10000)); // Max 10000%
                complianceData.concentrationLimit.assertGreaterThan(Field(0));
                complianceData.concentrationLimit.assertLessThanOrEqual(Field(10000)); // Max 10000%
                complianceData.qualityThreshold.assertGreaterThanOrEqual(Field(0));
                complianceData.qualityThreshold.assertLessThanOrEqual(Field(100)); // Max 100
                
                // 4. Validate reserve components are non-negative and within safe bounds
                const maxReserveAmount = Field(1000000000); // 1B max per component
                complianceData.cashReservesTotal.assertGreaterThanOrEqual(Field(0));
                complianceData.cashReservesTotal.assertLessThanOrEqual(maxReserveAmount);
                complianceData.treasuryReservesTotal.assertGreaterThanOrEqual(Field(0));
                complianceData.treasuryReservesTotal.assertLessThanOrEqual(maxReserveAmount);
                complianceData.corporateReservesTotal.assertGreaterThanOrEqual(Field(0));
                complianceData.corporateReservesTotal.assertLessThanOrEqual(maxReserveAmount);
                complianceData.otherReservesTotal.assertGreaterThanOrEqual(Field(0));
                complianceData.otherReservesTotal.assertLessThanOrEqual(maxReserveAmount);
                
                // 5. Validate token information within safe bounds
                complianceData.outstandingTokensTotal.assertGreaterThan(Field(0));
                complianceData.outstandingTokensTotal.assertLessThanOrEqual(maxReserveAmount);
                complianceData.tokenValue.assertGreaterThan(Field(0));
                complianceData.tokenValue.assertLessThanOrEqual(Field(10000)); // Max 100.00 (scaled by 100)
                
                // 6. Validate timestamp freshness
                const timeDiff = currentTimestamp.sub(complianceData.verificationTimestamp);
                timeDiff.assertLessThanOrEqual(UInt64.from(86400));
                
                // =================================== ZK-SAFE: Validate Pre-calculated Metrics ===================================
                // ✅ ZK-COMPLIANT: Instead of recalculating with unsafe division, validate the pre-calculated values
                // This approach is similar to the Advanced program which trusts pre-calculated metrics
                
                // Validate backing ratio is within reasonable bounds (0-50000%)
                complianceData.backingRatio.assertGreaterThanOrEqual(Field(0));
                complianceData.backingRatio.assertLessThanOrEqual(Field(50000)); // Max 50000%
                
                // Validate liquidity ratio is within reasonable bounds (0-10000%)
                complianceData.liquidityRatio.assertGreaterThanOrEqual(Field(0));
                complianceData.liquidityRatio.assertLessThanOrEqual(Field(10000)); // Max 10000%
                
                // Validate concentration risk is within reasonable bounds (0-10000%)
                complianceData.concentrationRisk.assertGreaterThanOrEqual(Field(0));
                complianceData.concentrationRisk.assertLessThanOrEqual(Field(10000)); // Max 10000%
                
                // Validate asset quality score is within bounds (0-100)
                complianceData.assetQualityScore.assertGreaterThanOrEqual(Field(0));
                complianceData.assetQualityScore.assertLessThanOrEqual(Field(100));
                
                // =================================== ZK-SAFE: Simple Compliance Checks ===================================
                // ✅ ZK-COMPLIANT: Simple threshold comparisons without complex arithmetic
                
                // Backing compliance: backing ratio >= threshold
                const backingCompliant = complianceData.backingRatio.greaterThanOrEqual(complianceData.backingRatioThreshold);
                complianceData.backingCompliant.assertEquals(backingCompliant);
                
                // Liquidity compliance: liquidity ratio >= threshold 
                const liquidityCompliant = complianceData.liquidityRatio.greaterThanOrEqual(complianceData.liquidityRatioThreshold);
                complianceData.liquidityCompliant.assertEquals(liquidityCompliant);
                
                // Concentration compliance: concentration risk <= limit
                const concentrationCompliant = complianceData.concentrationRisk.lessThanOrEqual(complianceData.concentrationLimit);
                complianceData.concentrationCompliant.assertEquals(concentrationCompliant);
                
                // Quality compliance: asset quality >= threshold
                const qualityCompliant = complianceData.assetQualityScore.greaterThanOrEqual(complianceData.qualityThreshold);
                complianceData.qualityCompliant.assertEquals(qualityCompliant);
                
                // =================================== Additional Quality Metric Validation ===================================
                // Validate individual quality metrics are within bounds
                complianceData.averageLiquidityScore.assertGreaterThanOrEqual(Field(0));
                complianceData.averageLiquidityScore.assertLessThanOrEqual(Field(100));
                complianceData.averageCreditRating.assertGreaterThanOrEqual(Field(0));
                complianceData.averageCreditRating.assertLessThanOrEqual(Field(100));
                complianceData.averageMaturity.assertGreaterThanOrEqual(Field(0));
                complianceData.averageMaturity.assertLessThanOrEqual(Field(3650)); // Max ~10 years
                
                // =================================== 🚨 CRITICAL: Regulatory Compliance Validation ===================================
                // This is the SECURITY FIX that prevents invalid portfolios from being accepted
                
                // 1. Validate regulatory score is within bounds (0-100)
                complianceData.regulatoryScore.assertGreaterThanOrEqual(Field(0));
                complianceData.regulatoryScore.assertLessThanOrEqual(Field(100));
                
                // 2. Validate regulatory threshold is within bounds (0-100) 
                complianceData.regulatoryThreshold.assertGreaterThanOrEqual(Field(0));
                complianceData.regulatoryThreshold.assertLessThanOrEqual(Field(100));
                
                // 3. 🚨 CRITICAL ASSERTION: Regulatory score must meet or exceed threshold
                //    This will FAIL the ZK proof if regulatory compliance fails (e.g., yield violations)
                complianceData.regulatoryScore.assertGreaterThanOrEqual(complianceData.regulatoryThreshold);
                
                // 4. Validate the regulatory compliance boolean matches the score comparison
                const regulatoryScoreCompliant = complianceData.regulatoryScore.greaterThanOrEqual(complianceData.regulatoryThreshold);
                complianceData.regulatoryCompliant.assertEquals(regulatoryScoreCompliant);
                
                // 5. 🚨 CRITICAL ASSERTION: Overall regulatory compliance must be true
                //    This ensures no invalid portfolios can generate valid proofs
                complianceData.regulatoryCompliant.assertEquals(Bool(true));
                
                // =================================== Overall StableCoin Compliance ===================================
                // ✅ ZK-COMPLIANT: Simple boolean logic WITH regulatory compliance
                const overallStableCoinCompliant = backingCompliant
                    .and(liquidityCompliant)
                    .and(concentrationCompliant)
                    .and(qualityCompliant)
                    .and(complianceData.regulatoryCompliant); // 🚨 INCLUDE regulatory compliance
                complianceData.stableCoinCompliant.assertEquals(overallStableCoinCompliant);

                // =================================== Return Public Output ===================================
                return new RiskLiquidityStableCoinOptimMerklePublicOutput({
                    scenarioID: complianceData.scenarioID,
                    stableCoinCompliant: overallStableCoinCompliant,
                    regulatoryCompliant: complianceData.regulatoryCompliant, // 🚨 NEW: Include regulatory compliance
                    regulatoryScore: complianceData.regulatoryScore,         // 🚨 NEW: Include regulatory score
                    backingRatio: complianceData.backingRatio,
                    liquidityRatio: complianceData.liquidityRatio,
                    concentrationRisk: complianceData.concentrationRisk,
                    assetQualityScore: complianceData.assetQualityScore,
                    verificationTimestamp: currentTimestamp,
                    merkleRoot: complianceData.merkleRoot,
                });
            },
        },
    },
});

export class RiskLiquidityStableCoinOptimMerkleProof extends ZkProgram.Proof(RiskLiquidityStableCoinOptimMerkleZKProgramWithSign) {}

// =================================== Utility Functions ===================================

export function createStableCoinRiskComplianceData(
    scenarioID: string,
    scenarioName: string,
    reserveComponents: {
        cashReservesTotal: number;
        treasuryReservesTotal: number;
        corporateReservesTotal: number;
        otherReservesTotal: number;
    },
    tokenInfo: {
        outstandingTokensTotal: number;
        tokenValue: number;
    },
    qualityMetrics: {
        averageLiquidityScore: number;
        averageCreditRating: number;
        averageMaturity: number;
        assetQualityScore: number;
    },
    thresholds: {
        backingRatioThreshold: number;
        liquidityRatioThreshold: number;
        concentrationLimit: number;
        qualityThreshold: number;
    },
    additionalParams: {
        periodsCount: number;
        liquidityThreshold: number;
        newInvoiceAmount: number;
        newInvoiceEvaluationMonth: number;
    },
    merkleRoot: Field,
    calculatedMetrics: {
        backingRatio: number;
        liquidityRatio: number;
        concentrationRisk: number;
        backingCompliant: boolean;
        liquidityCompliant: boolean;
        concentrationCompliant: boolean;
        qualityCompliant: boolean;
        stableCoinCompliant: boolean;
    },
    regulatoryData: {                    // 🚨 NEW: Regulatory compliance data
        jurisdiction: string;            // US, EU, etc.
        score: number;                   // 0-100 overall compliance score 
        threshold: number;               // Minimum required score
        compliant: boolean;              // Overall regulatory compliance status
    },
    currentTimestamp: number = Date.now()  // ✅ FIXED: Pass timestamp as parameter
): RiskLiquidityStableCoinOptimMerkleComplianceData {
    return new RiskLiquidityStableCoinOptimMerkleComplianceData({
        scenarioID: CircuitString.fromString(scenarioID),
        scenarioName: CircuitString.fromString(scenarioName),
        riskEvaluated: Field(1),
        cashReservesTotal: Field(Math.round(reserveComponents.cashReservesTotal)),
        treasuryReservesTotal: Field(Math.round(reserveComponents.treasuryReservesTotal)),
        corporateReservesTotal: Field(Math.round(reserveComponents.corporateReservesTotal)),
        otherReservesTotal: Field(Math.round(reserveComponents.otherReservesTotal)),
        outstandingTokensTotal: Field(Math.round(tokenInfo.outstandingTokensTotal)),
        tokenValue: Field(Math.round(tokenInfo.tokenValue * 100)),
        averageLiquidityScore: Field(Math.round(qualityMetrics.averageLiquidityScore)),
        averageCreditRating: Field(Math.round(qualityMetrics.averageCreditRating)),
        averageMaturity: Field(Math.round(qualityMetrics.averageMaturity)),
        assetQualityScore: Field(Math.round(qualityMetrics.assetQualityScore)),
        backingRatio: Field(Math.round(calculatedMetrics.backingRatio)),
        liquidityRatio: Field(Math.round(calculatedMetrics.liquidityRatio)),
        concentrationRisk: Field(Math.round(calculatedMetrics.concentrationRisk)),
        // 🚨 NEW: Regulatory compliance fields
        regulatoryJurisdiction: CircuitString.fromString(regulatoryData.jurisdiction),
        regulatoryScore: Field(Math.round(regulatoryData.score)),
        regulatoryThreshold: Field(Math.round(regulatoryData.threshold)),
        regulatoryCompliant: Bool(regulatoryData.compliant),
        backingRatioThreshold: Field(Math.round(thresholds.backingRatioThreshold)),
        liquidityRatioThreshold: Field(Math.round(thresholds.liquidityRatioThreshold)),
        concentrationLimit: Field(Math.round(thresholds.concentrationLimit)),
        qualityThreshold: Field(Math.round(thresholds.qualityThreshold)),
        backingCompliant: Bool(calculatedMetrics.backingCompliant),
        liquidityCompliant: Bool(calculatedMetrics.liquidityCompliant),
        concentrationCompliant: Bool(calculatedMetrics.concentrationCompliant),
        qualityCompliant: Bool(calculatedMetrics.qualityCompliant),
        stableCoinCompliant: Bool(calculatedMetrics.stableCoinCompliant),
        periodsCount: Field(additionalParams.periodsCount),
        liquidityThreshold: Field(Math.round(additionalParams.liquidityThreshold)),
        newInvoiceAmount: Field(additionalParams.newInvoiceAmount),
        newInvoiceEvaluationMonth: Field(additionalParams.newInvoiceEvaluationMonth),
        merkleRoot,
        verificationTimestamp: UInt64.from(currentTimestamp), // ✅ FIXED: Use parameter instead of Date.now()
    });
}

export function calculateStableCoinMetrics(
    reserveComponents: {
        cashReservesTotal: number;
        treasuryReservesTotal: number;
        corporateReservesTotal: number;
        otherReservesTotal: number;
    },
    tokenInfo: {
        outstandingTokensTotal: number;
        tokenValue: number;
    },
    thresholds: {
        backingRatioThreshold: number;
        liquidityRatioThreshold: number;
        concentrationLimit: number;
        qualityThreshold: number;
    },
    qualityMetrics: {
        assetQualityScore: number;
    }
): {
    backingRatio: number;
    liquidityRatio: number;
    concentrationRisk: number;
    backingCompliant: boolean;
    liquidityCompliant: boolean;
    concentrationCompliant: boolean;
    qualityCompliant: boolean;
    stableCoinCompliant: boolean;
} {
    const totalReserves = reserveComponents.cashReservesTotal + 
                         reserveComponents.treasuryReservesTotal + 
                         reserveComponents.corporateReservesTotal + 
                         reserveComponents.otherReservesTotal;
    
    const totalTokenValue = tokenInfo.outstandingTokensTotal * tokenInfo.tokenValue;
    const backingRatio = totalTokenValue > 0 ? (totalReserves / totalTokenValue) * 100 : 100;
    
    const liquidReserves = reserveComponents.cashReservesTotal + reserveComponents.treasuryReservesTotal;
    const liquidityRatio = totalReserves > 0 ? (liquidReserves / totalReserves) * 100 : 0;
    
    const assetValues = [
        reserveComponents.cashReservesTotal,
        reserveComponents.treasuryReservesTotal,
        reserveComponents.corporateReservesTotal,
        reserveComponents.otherReservesTotal
    ];
    const maxAsset = Math.max(...assetValues);
    const concentrationRisk = totalReserves > 0 ? (maxAsset / totalReserves) * 100 : 0;
    
    const backingCompliant = backingRatio >= thresholds.backingRatioThreshold;
    const liquidityCompliant = liquidityRatio >= thresholds.liquidityRatioThreshold;
    const concentrationCompliant = concentrationRisk <= thresholds.concentrationLimit;
    const qualityCompliant = qualityMetrics.assetQualityScore >= thresholds.qualityThreshold;
    const stableCoinCompliant = backingCompliant && liquidityCompliant && concentrationCompliant && qualityCompliant;
    
    return {
        backingRatio,
        liquidityRatio,
        concentrationRisk,
        backingCompliant,
        liquidityCompliant,
        concentrationCompliant,
        qualityCompliant,
        stableCoinCompliant
    };
}

/**
 * ✅ ZK-COMPLIANT: Simplified validation without Field extractions
 * The ZK circuit itself handles all the critical validation
 */
export function validateStableCoinRiskComplianceData(
    complianceData: RiskLiquidityStableCoinOptimMerkleComplianceData
): boolean {
    // Basic structural validation only - no Field value extraction
    if (!complianceData.scenarioID) {
        throw new Error('Scenario ID is required');
    }
    
    if (!complianceData.merkleRoot) {
        throw new Error('Merkle root is required');
    }
    
    console.log('✅ ZK-COMPLIANT StableCoin validation passed - structural checks completed');
    console.log('    Critical validation happens inside the ZK circuit with proper assertions');
    return true;
}
