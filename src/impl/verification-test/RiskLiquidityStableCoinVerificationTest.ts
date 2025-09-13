/**
 * BACKWARD COMPATIBILITY WRAPPER for RiskLiquidityStableCoinOptimMerkleVerificationTestWithSign.ts
 * Original file becomes thin wrapper calling new organized handler
 * MAINTAINS 100% CLI COMPATIBILITY with working implementation
 * 
 * UPDATE: Converted from monolithic implementation to organized architecture
 * Uses RiskStableCoinNetworkHandler while preserving all existing functionality
 */

import { RiskStableCoinNetworkHandler } from '../network/handler/RiskStableCoinNetworkHandler.js';
import { RiskVerificationResult } from '../verification-base/RiskVerificationBase.js';

// PRESERVE EXACT SAME FUNCTION SIGNATURE for compatibility
export async function executeRiskLiquidityStableCoinOptimMerkleVerification(
    backingRatioThreshold: number = 100,
    liquidityRatioThreshold: number = 20,
    concentrationLimit: number = 25,
    qualityThreshold: number = 80,
    actusUrl: string = 'http://localhost:8083/eventsBatch',
    contractPortfolio?: string | any[],
    regulatoryFramework?: string,
    jurisdictionOverride?: string
): Promise<RiskVerificationResult> {
    console.log('🔄 Using organized architecture (backward compatible)');
    
    // Delegate to new organized handler - ZERO FUNCTIONAL CHANGE
    const handler = new RiskStableCoinNetworkHandler();
    return await handler.executeStableCoinRiskVerification({
        backingRatioThreshold,
        liquidityRatioThreshold,
        concentrationLimit,
        qualityThreshold,
        actusUrl,
        contractPortfolio,
        regulatoryFramework,
        jurisdictionOverride
    });
}

// PRESERVE EXACT SAME CLI ENTRY POINT for backward compatibility
async function main() {
    // PRESERVE EXACT PARAMETER PARSING from working implementation
    const backingRatioThreshold = parseFloat(process.argv[2]) || 100;
    const actusUrl = process.argv[3] || 'http://localhost:8083/eventsBatch';
    const portfolioPath = process.argv[4];
    const executionMode = process.argv[5] || 'ultra_strict';
    const jurisdictionCLI = process.argv[6];

    // PRESERVE EXACT VALIDATION AND PROCESSING from working implementation
    if (!portfolioPath) {
        console.error('❌ Error: Portfolio path is required');
        console.log('Usage: node RiskLiquidityStableCoinOptimMerkleVerificationTestWithSign.js <backingRatio> <actusUrl> <portfolioPath> <executionMode> <jurisdiction>');
        process.exit(1);
    }

    if (!jurisdictionCLI || !['US', 'EU'].includes(jurisdictionCLI.toUpperCase())) {
        console.error('❌ Error: Invalid jurisdiction. Must be US or EU.');
        process.exit(1);
    }

    // PRESERVE EXACT PORTFOLIO AND THRESHOLD LOADING from working implementation
    let finalContractPortfolio: any[] | string = portfolioPath;
    let finalConcentrationLimit = 25;
    let liquidityRatioThreshold = 20;
    let qualityThreshold = 80;

    if (portfolioPath && portfolioPath.endsWith('.json')) {
        try {
            const fs = await import('fs');
            const path = await import('path');
            const fullPath = path.resolve(portfolioPath);
            const configData = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
            
            if (configData.configuration) {
                const config = configData.configuration;
                finalConcentrationLimit = config.concentrationLimit || 25;
                liquidityRatioThreshold = config.liquidityRatioThreshold || 20;
                qualityThreshold = config.qualityThreshold || 80;
                console.log(`🎯 Using concentration limit from config: ${finalConcentrationLimit}%`);
            }
            
            if (configData.contracts) {
                finalContractPortfolio = configData.contracts;
                console.log(`✅ Extracted ${configData.contracts.length} contracts from configuration`);
            }
        } catch (error: any) {
            console.error(`❌ Failed to load portfolio from ${portfolioPath}:`, error.message);
        }
    }

    // Handle execution mode specific parameters
    if (executionMode === 'ultra_strict') {
        liquidityRatioThreshold = 100;
        qualityThreshold = 95;
    }

    // PRESERVE EXACT LOGGING from working implementation
    console.log(`🎯 StableCoin Backing Ratio Threshold: ${backingRatioThreshold}%`);
    console.log(`💧 StableCoin Liquidity Ratio Threshold: ${liquidityRatioThreshold}%`);
    console.log(`🎯 StableCoin Concentration Limit: ${finalConcentrationLimit}%`);
    console.log(`⭐ StableCoin Quality Threshold: ${qualityThreshold}`);
    console.log(`🌐 ACTUS API URL: ${actusUrl}`);
    console.log(`📁 Portfolio Path: ${portfolioPath}`);
    console.log(`🚀 Execution Mode: ${executionMode}`);
    console.log(`🏛️ Jurisdiction: ${jurisdictionCLI}`);

    // Execute the refactored function - IDENTICAL RESULTS
    const result = await executeRiskLiquidityStableCoinOptimMerkleVerification(
        backingRatioThreshold,
        liquidityRatioThreshold,
        finalConcentrationLimit,
        qualityThreshold,
        actusUrl,
        finalContractPortfolio,
        undefined,
        jurisdictionCLI?.toUpperCase()
    );
    
    // PRESERVE EXACT SUCCESS/FAILURE HANDLING from working implementation
    if (result.success) {
        console.log('\n🎉 StableCoin Risk verification completed successfully!');
        console.log(`📊 Status Change: ${result.contractStatus.beforeVerification} → ${result.contractStatus.afterVerification}`);
        
        if (result.contractStatus.afterVerification === 90) {
            console.log('✅ STABLECOIN COMPLIANCE ACHIEVED - Contract status changed to 90');
        } else {
            console.log('❌ STABLECOIN COMPLIANCE NOT ACHIEVED - Contract status remains at 100');
        }
    } else {
        console.log('\n❌ StableCoin Risk verification failed');
        process.exit(1);
    }
}

// PRESERVE EXACT CLI EXECUTION PATTERN from working implementation
main().catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
});