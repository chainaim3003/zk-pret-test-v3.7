/**
 * ====================================================================
 * Risk Liquidity Advanced OptimMerkle ZK Program
 * ====================================================================
 * ZK Program for Advanced Risk Liquidity scenario
 * Uses Layer 0 and Layer 1 utilities for optimal code reuse
 * ====================================================================
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
    Poseidon,
} from 'o1js';
import { getPublicKeyFor } from '../../core/OracleRegistry.js';
import { verifyOracleSignatureZK, verifyMerkleWitnessZK } from '../../utils/core/CoreZKUtilities.js';
import { 
    calculatePercentageZK, 
    assertThresholdComplianceZK,
    validateCashFlowPatternsZK,
    calculateNetCashFlowZK
} from '../../utils/domain/risk/ComplianceZKUtilities.js';

// =================================== Merkle Tree Configuration ===================================
export const MERKLE_TREE_HEIGHT = 8;
export class MerkleWitness8 extends MerkleWitness(MERKLE_TREE_HEIGHT) {}

// =================================== Advanced Risk Data Structures ===================================

export class RiskLiquidityAdvancedOptimMerkleComplianceData extends Struct({
    // Core identifiers
    scenarioID: CircuitString,
    scenarioName: CircuitString,
    
    // Risk evaluation status
    riskEvaluated: Field,
    
    // Cash flow data (simplified)
    cashInflowsHash: Field,          // Hash of cash inflows array
    cashOutflowsHash: Field,         // Hash of cash outflows array
    periodsCount: Field,
    
    // Advanced risk parameters
    newInvoiceAmount: Field,
    newInvoiceEvaluationMonth: Field,
    liquidityThreshold: Field,
    
    // Compliance results
    liquidityCompliant: Bool,
    averageLiquidityRatio: Field,
    worstCaseLiquidityRatio: Field,
    
    // Merkle root containing all detailed data
    merkleRoot: Field,
    
    // Verification metadata
    verificationTimestamp: UInt64,
}) {}

export class RiskLiquidityAdvancedOptimMerklePublicOutput extends Struct({
    scenarioID: CircuitString,
    riskCompliant: Bool,
    liquidityThreshold: Field,
    averageLiquidityRatio: Field,
    worstCaseLiquidityRatio: Field,
    verificationTimestamp: UInt64,
    merkleRoot: Field,
}) {}

// =================================== Advanced Risk ZK Program ===================================

export const RiskLiquidityAdvancedOptimMerkleZKProgramWithSign = ZkProgram({
    name: 'RiskLiquidityAdvancedOptimMerkle',
    publicInput: UInt64, // Current timestamp
    publicOutput: RiskLiquidityAdvancedOptimMerklePublicOutput,

    methods: {
        proveAdvancedRiskCompliance: {
            privateInputs: [
                RiskLiquidityAdvancedOptimMerkleComplianceData,
                Signature,              // Oracle signature
                
                // Merkle witnesses for selective disclosure
                MerkleWitness8,         // Company info witness
                MerkleWitness8,         // Cash inflow witness
                MerkleWitness8,         // Cash outflow witness
                MerkleWitness8,         // Risk metrics witness
            ],
            
            async method(
                currentTimestamp: UInt64,
                complianceData: RiskLiquidityAdvancedOptimMerkleComplianceData,
                oracleSignature: Signature,
                companyInfoWitness: MerkleWitness8,
                inflowWitness: MerkleWitness8,
                outflowWitness: MerkleWitness8,
                riskMetricsWitness: MerkleWitness8,
            ): Promise<RiskLiquidityAdvancedOptimMerklePublicOutput> {

                // =================================== Oracle Signature Verification ===================================
                const registryPublicKey = getPublicKeyFor('RISK');
                verifyOracleSignatureZK(oracleSignature, [complianceData.merkleRoot], registryPublicKey);

                // =================================== Merkle Inclusion Proofs ===================================
                const merkleRoot = complianceData.merkleRoot;
                
                // Verify company info in Merkle tree
                const companyInfoHash = complianceData.scenarioID.hash();
                verifyMerkleWitnessZK(companyInfoWitness, merkleRoot, companyInfoHash);
                
                // Verify cash flows in Merkle tree  
                verifyMerkleWitnessZK(inflowWitness, merkleRoot, complianceData.cashInflowsHash);
                verifyMerkleWitnessZK(outflowWitness, merkleRoot, complianceData.cashOutflowsHash);
                
                // ✅ ZK-COMPLIANT: Verify risk metrics in Merkle tree using Poseidon hash
                const riskMetricsHash = Poseidon.hash([
                    complianceData.newInvoiceAmount,
                    complianceData.newInvoiceEvaluationMonth,
                    complianceData.liquidityThreshold,
                    complianceData.periodsCount
                ]);
                verifyMerkleWitnessZK(riskMetricsWitness, merkleRoot, riskMetricsHash);

                // =================================== Advanced Risk Compliance Logic ===================================
                
                // 1. Validate risk evaluation status
                complianceData.riskEvaluated.assertEquals(Field(1));
                
                // 2. Validate periods count is reasonable (1-120 months)
                complianceData.periodsCount.assertGreaterThan(Field(0));
                complianceData.periodsCount.assertLessThanOrEqual(Field(120));
                
                // 3. Validate liquidity threshold is positive and reasonable
                complianceData.liquidityThreshold.assertGreaterThan(Field(0));
                complianceData.liquidityThreshold.assertLessThanOrEqual(Field(10000)); // Max 10000%
                
                // 4. Simple validation of legacy parameters (not used in calculations)
                complianceData.newInvoiceAmount.assertGreaterThanOrEqual(Field(0));
                complianceData.newInvoiceEvaluationMonth.assertGreaterThan(Field(0));
                complianceData.newInvoiceEvaluationMonth.assertLessThanOrEqual(complianceData.periodsCount);
                
                // 5. Validate timestamp freshness (within reasonable bounds)
                const timeDiff = currentTimestamp.sub(complianceData.verificationTimestamp);
                timeDiff.assertLessThanOrEqual(UInt64.from(86400)); // Within 24 hours
                
                // =================================== Liquidity Compliance Assessment ===================================
                
                // ✅ ZK-COMPLIANT: Safe Field arithmetic with proper bounds
                const maxReasonableRatio = Field(50000); // Max 50000% ratio (very conservative)
                complianceData.averageLiquidityRatio.assertLessThanOrEqual(maxReasonableRatio);
                complianceData.worstCaseLiquidityRatio.assertLessThanOrEqual(maxReasonableRatio);
                complianceData.liquidityThreshold.assertLessThanOrEqual(Field(10000)); // Max 10000%
                
                // ✅ ZK-COMPLIANT: Simple threshold compliance checks
                const avgRatioCompliant = complianceData.averageLiquidityRatio.greaterThanOrEqual(complianceData.liquidityThreshold);
                const worstCaseCompliant = complianceData.worstCaseLiquidityRatio.greaterThanOrEqual(complianceData.liquidityThreshold);
                
                // ✅ ZK-COMPLIANT: Simple boolean logic
                const liquidityCompliant = avgRatioCompliant.and(worstCaseCompliant);
                
                // Verify compliance status matches calculated result
                complianceData.liquidityCompliant.assertEquals(liquidityCompliant);
                
                // =================================== Advanced Risk Assessment ===================================
                
                // ✅ ZK-COMPLIANT: Ultra-simple validation (no complex formulas)
                
                // 1. Validate liquidity ratios are reasonable (0-50000%)
                complianceData.averageLiquidityRatio.assertGreaterThanOrEqual(Field(0));
                complianceData.averageLiquidityRatio.assertLessThanOrEqual(Field(50000));
                complianceData.worstCaseLiquidityRatio.assertGreaterThanOrEqual(Field(0));
                complianceData.worstCaseLiquidityRatio.assertLessThanOrEqual(Field(50000));
                
                // 2. Simple consistency check: worst-case <= average
                const ratioConsistent = complianceData.worstCaseLiquidityRatio.lessThanOrEqual(complianceData.averageLiquidityRatio);
                ratioConsistent.assertTrue();
                
                // 3. ✅ ZK-COMPLIANT: Ultra-simple compliance (just use liquidity compliance)
                const overallRiskCompliant = liquidityCompliant;

                // =================================== Return Public Output ===================================
                return new RiskLiquidityAdvancedOptimMerklePublicOutput({
                    scenarioID: complianceData.scenarioID,
                    riskCompliant: overallRiskCompliant,
                    liquidityThreshold: complianceData.liquidityThreshold,
                    averageLiquidityRatio: complianceData.averageLiquidityRatio,
                    worstCaseLiquidityRatio: complianceData.worstCaseLiquidityRatio,
                    verificationTimestamp: currentTimestamp,
                    merkleRoot: complianceData.merkleRoot,
                });
            },
        },
    },
});

export class RiskLiquidityAdvancedOptimMerkleProof extends ZkProgram.Proof(RiskLiquidityAdvancedOptimMerkleZKProgramWithSign) {}

// =================================== Utility Functions ===================================

/**
 * ✅ ZK-COMPLIANT: Convert arrays to Field representation using Poseidon hash (no division)
 */
export function encodeArrayToField(numbers: number[]): Field {
    // ✅ ZK-COMPLIANT: Use Poseidon hash instead of division-based scaling
    
    if (numbers.length === 0) {
        return Field(0);
    }
    
    // ✅ ZK-COMPLIANT: Use Poseidon hash for deterministic array encoding
    const fieldsArray = numbers.slice(0, 8).map(num => { // Limit to 8 elements for Poseidon
        // Scale large values down using integer operations only (no division)
        const scaled = Math.floor(Math.abs(num)); // No division, just floor
        
        // Ensure value fits in Field (conservative limit)
        const maxSafeInt = 2n ** 200n; // Conservative limit for Field arithmetic
        const boundedValue = Math.min(scaled, Number(maxSafeInt));
        
        return Field(boundedValue);
    });
    
    // Pad to 8 elements for consistent Poseidon input
    while (fieldsArray.length < 8) {
        fieldsArray.push(Field(0));
    }
    
    return Poseidon.hash(fieldsArray);
}

/**
 * ✅ ZK-COMPLIANT: Helper function to create compliance data structure
 */
export function createAdvancedRiskComplianceData(
    scenarioID: string,
    scenarioName: string,
    cashInflows: number[],
    cashOutflows: number[],
    newInvoiceAmount: number,
    newInvoiceEvaluationMonth: number,
    liquidityThreshold: number,
    merkleRoot: Field,
    liquidityMetrics: {
        averageLiquidityRatio: number;
        worstCaseLiquidityRatio: number;
        liquidityCompliant: boolean;
    }
): RiskLiquidityAdvancedOptimMerkleComplianceData {
    
    // ✅ ZK-COMPLIANT: Ensure all numeric values are within safe bounds
    const safeThreshold = Math.max(0, Math.min(10000, Math.round(liquidityThreshold)));
    const safeAvgRatio = Math.max(0, Math.min(50000, Math.round(liquidityMetrics.averageLiquidityRatio)));
    const safeWorstRatio = Math.max(0, Math.min(50000, Math.round(liquidityMetrics.worstCaseLiquidityRatio)));
    const safeInvoiceAmount = Math.max(0, Math.min(1000000000, newInvoiceAmount)); // 1B max
    const safeEvalMonth = Math.max(1, Math.min(120, newInvoiceEvaluationMonth)); // 1-120 range
    
    return new RiskLiquidityAdvancedOptimMerkleComplianceData({
        scenarioID: CircuitString.fromString(scenarioID),
        scenarioName: CircuitString.fromString(scenarioName),
        riskEvaluated: Field(1),
        cashInflowsHash: encodeArrayToField(cashInflows),
        cashOutflowsHash: encodeArrayToField(cashOutflows),
        periodsCount: Field(cashInflows.length),
        newInvoiceAmount: Field(safeInvoiceAmount),
        newInvoiceEvaluationMonth: Field(safeEvalMonth),
        liquidityThreshold: Field(safeThreshold),
        liquidityCompliant: Bool(liquidityMetrics.liquidityCompliant),
        averageLiquidityRatio: Field(safeAvgRatio),
        worstCaseLiquidityRatio: Field(safeWorstRatio),
        merkleRoot,
        verificationTimestamp: UInt64.from(Date.now()),
    });
}

/**
 * ✅ ZK-COMPLIANT: Validate compliance data before ZK proof generation
 */
export function validateAdvancedRiskComplianceData(
    complianceData: RiskLiquidityAdvancedOptimMerkleComplianceData
): boolean {
    // ✅ ZK-COMPLIANT: Safe BigInt operations
    const periodsCountBigInt = complianceData.periodsCount.toBigInt();
    const thresholdBigInt = complianceData.liquidityThreshold.toBigInt();
    const evalMonthBigInt = complianceData.newInvoiceEvaluationMonth.toBigInt();
    
    if (periodsCountBigInt <= 0n || periodsCountBigInt > 120n) {
        throw new Error('Periods count must be between 1 and 120');
    }
    
    if (thresholdBigInt <= 0n || thresholdBigInt > 10000n) {
        throw new Error('Liquidity threshold must be between 1 and 10000');
    }
    
    if (evalMonthBigInt > periodsCountBigInt || evalMonthBigInt <= 0n) {
        throw new Error('Invoice evaluation month must be within valid period range');
    }
    
    // ✅ ZK-COMPLIANT: Additional safety checks
    const avgRatioBigInt = complianceData.averageLiquidityRatio.toBigInt();
    const worstRatioBigInt = complianceData.worstCaseLiquidityRatio.toBigInt();
    
    if (avgRatioBigInt > 50000n || worstRatioBigInt > 50000n) {
        throw new Error('Liquidity ratios exceed safe bounds (max 50000%)');
    }
    
    console.log('✅ ZK compliance validation passed - all constraints satisfied');
    return true;
}
