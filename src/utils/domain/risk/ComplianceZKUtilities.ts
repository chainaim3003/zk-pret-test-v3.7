/**
 * ====================================================================
 * Layer 1: Compliance-Specific ZK Utilities (Simplified)
 * ====================================================================
 * Domain-specific utilities for compliance and risk scenarios
 * - Simplified to avoid complex Field operations
 * ====================================================================
 */

import { Field, Bool } from 'o1js';

// =================================== Compliance ZK Utilities ===================================

/**
 * Calculate percentage with ZK constraints (simplified)
 */
export function calculatePercentageZK(numerator: Field, denominator: Field): Field {
    // Ensure denominator is not zero
    denominator.assertGreaterThan(Field(0));
    
    // Calculate percentage: (numerator * 100) / denominator
    return numerator.mul(100).div(denominator);
}

/**
 * Assert threshold compliance with various operators
 */
export function assertThresholdComplianceZK(
    value: Field,
    threshold: Field,
    operator: 'gte' | 'lte' | 'eq'
): void {
    if (operator === 'gte') {
        value.assertGreaterThanOrEqual(threshold);
    } else if (operator === 'lte') {
        value.assertLessThanOrEqual(threshold);
    } else if (operator === 'eq') {
        value.assertEquals(threshold);
    }
}

/**
 * Calculate ratio between two values
 */
export function calculateRatioZK(asset: Field, liability: Field): Field {
    // Ensure liability is not zero
    liability.assertGreaterThan(Field(0));
    
    // Return ratio: asset / liability
    return asset.div(liability);
}

/**
 * Validate value is within compliance range
 */
export function validateComplianceRangeZK(
    value: Field,
    minThreshold: Field,
    maxThreshold: Field
): Bool {
    const aboveMin = value.greaterThanOrEqual(minThreshold);
    const belowMax = value.lessThanOrEqual(maxThreshold);
    return aboveMin.and(belowMax);
}

/**
 * Calculate weighted sum for compliance metrics (simplified)
 */
export function calculateWeightedSumZK(
    values: Field[],
    weights: Field[]
): Field {
    // Ensure arrays have same length
    if (values.length !== weights.length) {
        throw new Error('Values and weights arrays must have same length');
    }
    
    let weightedSum = Field(0);
    for (let i = 0; i < values.length; i++) {
        const weightedValue = values[i].mul(weights[i]);
        weightedSum = weightedSum.add(weightedValue);
    }
    
    return weightedSum;
}

/**
 * Calculate concentration risk metric (simplified)
 */
export function calculateConcentrationRiskZK(
    assetValues: Field[],
    totalAssets: Field
): Field {
    totalAssets.assertGreaterThan(Field(0));
    
    // Find maximum single asset concentration (simplified)
    let maxConcentration = Field(0);
    for (const assetValue of assetValues) {
        const concentration = calculatePercentageZK(assetValue, totalAssets);
        const isGreater = concentration.greaterThan(maxConcentration);
        // Use simple conditional instead of Field.if
        if (isGreater.toBoolean()) {
            maxConcentration = concentration;
        }
    }
    
    return maxConcentration;
}

/**
 * Assert liquidity compliance across multiple periods
 */
export function assertLiquidityComplianceZK(
    liquidityRatios: Field[],
    threshold: Field
): void {
    liquidityRatios.forEach(ratio => {
        assertThresholdComplianceZK(ratio, threshold, 'gte');
    });
}

/**
 * Calculate net cash flow for a period
 */
export function calculateNetCashFlowZK(
    inflows: Field[],
    outflows: Field[]
): Field[] {
    if (inflows.length !== outflows.length) {
        throw new Error('Inflows and outflows arrays must have same length');
    }
    
    return inflows.map((inflow, index) => inflow.sub(outflows[index]));
}

/**
 * Validate cash flow patterns meet regulatory requirements
 */
export function validateCashFlowPatternsZK(
    netCashFlows: Field[],
    minimumBuffer: Field
): Bool {
    let allPeriodsCompliant = Bool(true);
    
    for (const netCashFlow of netCashFlows) {
        const isCompliant = netCashFlow.greaterThanOrEqual(minimumBuffer);
        allPeriodsCompliant = allPeriodsCompliant.and(isCompliant);
    }
    
    return allPeriodsCompliant;
}

/**
 * Calculate stress test impact
 */
export function calculateStressImpactZK(
    baseValue: Field,
    stressPercentage: Field
): Field {
    // Apply stress as percentage reduction
    const stressFactor = Field(100).sub(stressPercentage);
    return baseValue.mul(stressFactor).div(100);
}

/**
 * Validate asset quality scores
 */
export function validateAssetQualityZK(
    qualityScores: Field[],
    minimumQuality: Field
): Bool {
    let allAssetsQualified = Bool(true);
    
    for (const score of qualityScores) {
        const meetsMinimum = score.greaterThanOrEqual(minimumQuality);
        allAssetsQualified = allAssetsQualified.and(meetsMinimum);
    }
    
    return allAssetsQualified;
}
