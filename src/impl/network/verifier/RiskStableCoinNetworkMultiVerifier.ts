/**
 * CLI Entry Point for StableCoin Risk Network Verification
 * PRESERVES EXACT SAME CLI PATTERN as working implementation
 * 
 * Uses new organized RiskStableCoinNetworkHandler while maintaining
 * 100% backward compatibility with existing CLI interface
 */

import { RiskStableCoinNetworkHandler } from '../handler/RiskStableCoinNetworkHandler.js';

async function main() {
    console.log('🚀 StableCoin Risk Network Verification (Organized Architecture)');

    // PRESERVE EXACT PARAMETER PARSING from working implementation
    const backingRatioThreshold = parseFloat(process.argv[2]) || 100;
    const actusUrl = process.argv[3] || 'http://localhost:8083/eventsBatch';
    const portfolioPath = process.argv[4];
    const executionMode = process.argv[5] || 'ultra_strict';
    const jurisdictionCLI = process.argv[6];

    // PRESERVE EXACT VALIDATION LOGIC from working implementation
    if (!portfolioPath) {
        console.error('❌ Error: Portfolio path is required');
        console.log('Usage: node RiskStableCoinNetworkMultiVerifier.js <backingRatio> <actusUrl> <portfolioPath> <executionMode> <jurisdiction>');
        process.exit(1);
    }

    if (!jurisdictionCLI || !['US', 'EU'].includes(jurisdictionCLI.toUpperCase())) {
        console.error('❌ Error: Invalid jurisdiction. Must be US or EU.');
        process.exit(1);
    }

    // PRESERVE EXACT PORTFOLIO LOADING from working implementation
    let finalContractPortfolio: any[] | string = portfolioPath;
    let finalConcentrationLimit = 25; // Default
    let liquidityRatioThreshold = 20; // Default
    let qualityThreshold = 80; // Default

    // Load portfolio configuration if provided
    if (portfolioPath && portfolioPath.endsWith('.json')) {
        try {
            const fs = await import('fs');
            const path = await import('path');
            const fullPath = path.resolve(portfolioPath);
            const configData = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
            
            // PRESERVE EXACT CONFIG PROCESSING from working implementation
            if (configData.configuration) {
                const config = configData.configuration;
                finalConcentrationLimit = config.concentrationLimit || 25;
                liquidityRatioThreshold = config.liquidityRatioThreshold || 20;
                qualityThreshold = config.qualityThreshold || 80;
                
                console.log(`📊 Portfolio ID: ${configData.portfolioMetadata?.portfolioId || 'Unknown'}`);
                console.log(`💰 Total Notional: ${configData.portfolioMetadata?.totalNotional || 'Unknown'}`);
                console.log(`🎯 Using concentration limit from config: ${finalConcentrationLimit}%`);
            }
            // NEW: Also check portfolioMetadata.complianceTarget for concentration limit
            else if (configData.portfolioMetadata?.complianceTarget) {
                const target = configData.portfolioMetadata.complianceTarget;
                finalConcentrationLimit = target.concentrationLimit || 25;
                liquidityRatioThreshold = target.liquidityRatioThreshold || 20;
                qualityThreshold = target.qualityScore || 80;
                
                console.log(`📊 Portfolio ID: ${configData.portfolioMetadata?.portfolioId || 'Unknown'}`);
                console.log(`💰 Total Notional: ${configData.portfolioMetadata?.totalNotional || 'Unknown'}`);
                console.log(`🎯 Using concentration limit from portfolioMetadata: ${finalConcentrationLimit}%`);
            }
            
            if (configData.contracts) {
                finalContractPortfolio = configData.contracts;
                console.log(`✅ Extracted ${configData.contracts.length} contracts from configuration`);
            }
        } catch (error: any) {
            console.error(`❌ Failed to load portfolio from ${portfolioPath}:`, error.message);
            console.log(`🔄 Using portfolio path as-is`);
        }
    }

    // Handle execution mode specific parameters
    if (executionMode === 'ultra_strict') {
        liquidityRatioThreshold = 100;
        qualityThreshold = 95;
    }

    // PRESERVE EXACT LOGGING PATTERN from working implementation
    console.log(`🎯 StableCoin Backing Ratio Threshold: ${backingRatioThreshold}%`);
    console.log(`💧 StableCoin Liquidity Ratio Threshold: ${liquidityRatioThreshold}%`);
    console.log(`🎯 StableCoin Concentration Limit: ${finalConcentrationLimit}%`);
    console.log(`⭐ StableCoin Quality Threshold: ${qualityThreshold}`);
    console.log(`🌐 ACTUS API URL: ${actusUrl}`);
    console.log(`📁 Portfolio Path: ${portfolioPath}`);
    console.log(`🚀 Execution Mode: ${executionMode}`);
    console.log(`🏛️ Jurisdiction: ${jurisdictionCLI}`);

    try {
        // Execute using new organized handler - SAME FUNCTIONALITY
        const handler = new RiskStableCoinNetworkHandler();
        const result = await handler.executeStableCoinRiskVerification({
            backingRatioThreshold,
            liquidityRatioThreshold,
            concentrationLimit: finalConcentrationLimit,
            qualityThreshold,
            actusUrl,
            contractPortfolio: finalContractPortfolio,
            regulatoryFramework: undefined,
            jurisdictionOverride: jurisdictionCLI?.toUpperCase()
        });

        // PRESERVE EXACT OUTPUT HANDLING from working implementation
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
    } catch (error) {
        console.error('💥 Error during verification:', error);
        process.exit(1);
    }
}

// PRESERVE EXACT CLI EXECUTION PATTERN from working code
main().catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
});