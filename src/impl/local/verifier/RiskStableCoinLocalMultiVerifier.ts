/**
 * CLI Entry Point for StableCoin Risk LOCAL Verification
 * ENHANCED WITH GROUP STRUCTURE (Following Network Pattern)
 * Optimized for local development/testing with faster execution
 * 
 * Uses new organized RiskStableCoinLocalHandler for improved development workflow
 */

import { CircuitString } from 'o1js';
import { RiskStableCoinLocalHandler } from '../handler/RiskStableCoinLocalHandler.js';

async function main() {
    console.log('🏠 StableCoin Risk LOCAL Verification (Group Structure Enabled - Development Optimized)');

    // === GROUP STRUCTURE PATTERN (Following Network Implementation) ===
    // Parse command line arguments in same order as Network
    const args = process.argv.slice(2);
    
    // Extract parameters following Network pattern
    const riskGroupID = args[0];                                    
    const backingRatioThreshold = parseFloat(args[1]) || 100;      
    const actusUrl = args[2] || 'http://localhost:8083/eventsBatch'; 
    const portfolioPath = args[3];                                  
    const executionMode = args[4] || 'ultra_strict';               
    const jurisdictionCLI = args[5];                                

    // === VALIDATION (Following Network Pattern) ===
    if (!riskGroupID) {
        console.error('❌ Error: Risk Group ID is required (first argument)');
        console.log('Usage: node RiskStableCoinLocalMultiVerifier.js <RISK_GROUP_ID> <backingRatio> <actusUrl> <portfolioPath> <executionMode> <jurisdiction>');
        console.log('Example: node RiskStableCoinLocalMultiVerifier.js RISK_GROUP_001 100 http://localhost:8083/eventsBatch ./portfolio.json ultra_strict US');
        process.exit(1);
    }

    if (!portfolioPath) {
        console.error('❌ Error: Portfolio path is required');
        console.log('Usage: node RiskStableCoinLocalMultiVerifier.js <RISK_GROUP_ID> <backingRatio> <actusUrl> <portfolioPath> <executionMode> <jurisdiction>');
        process.exit(1);
    }

    if (!jurisdictionCLI || !['US', 'EU'].includes(jurisdictionCLI.toUpperCase())) {
        console.error('❌ Error: Invalid jurisdiction. Must be US or EU.');
        process.exit(1);
    }
    
    // Convert Risk Group ID to CircuitString (Following Network Pattern)
    const riskGroupIDCircuit = CircuitString.fromString(riskGroupID);
    console.log(`🏷️  LOCAL Risk Group ID: ${riskGroupID}`);

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
                
                console.log(`📊 LOCAL Portfolio ID: ${configData.portfolioMetadata?.portfolioId || 'Unknown'}`);
                console.log(`💰 LOCAL Total Notional: ${configData.portfolioMetadata?.totalNotional || 'Unknown'}`);
                console.log(`🎯 LOCAL Using concentration limit from config: ${finalConcentrationLimit}%`);
            }
            // ALSO CHECK portfolioMetadata.complianceTarget (ACTUAL config structure)
            else if (configData.portfolioMetadata?.complianceTarget) {
                const target = configData.portfolioMetadata.complianceTarget;
                finalConcentrationLimit = target.concentrationLimit || 25;
                // Keep existing thresholds for ultra_strict mode override
                console.log(`📊 LOCAL Portfolio ID: ${configData.portfolioMetadata?.portfolioId || 'Unknown'}`);
                console.log(`💰 LOCAL Total Notional: ${configData.portfolioMetadata?.totalNotional || 'Unknown'}`);
                console.log(`🎯 LOCAL Using concentration limit from config: ${finalConcentrationLimit}%`);
            }
            
            if (configData.contracts) {
                finalContractPortfolio = configData.contracts;
                console.log(`✅ LOCAL Extracted ${configData.contracts.length} contracts from configuration`);
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

    // PRESERVE EXACT LOGGING PATTERN from working implementation with LOCAL prefix
    console.log(`🎯 LOCAL StableCoin Backing Ratio Threshold: ${backingRatioThreshold}%`);
    console.log(`💧 LOCAL StableCoin Liquidity Ratio Threshold: ${liquidityRatioThreshold}%`);
    console.log(`🎯 LOCAL StableCoin Concentration Limit: ${finalConcentrationLimit}%`);
    console.log(`⭐ LOCAL StableCoin Quality Threshold: ${qualityThreshold}`);
    console.log(`🌐 LOCAL ACTUS API URL: ${actusUrl}`);
    console.log(`📁 LOCAL Portfolio Path: ${portfolioPath}`);
    console.log(`🚀 LOCAL Execution Mode: ${executionMode}`);
    console.log(`🏛️ LOCAL Jurisdiction: ${jurisdictionCLI}`);
    
    // === GROUP STRUCTURE VERIFICATION (Following Network Pattern) ===
    console.log('\n🏗️  Starting LOCAL Risk Group Verification...');
    console.log(`📊 Risk Group ID: ${riskGroupID}`);

    try {
        // Execute using new organized LOCAL handler with GROUP STRUCTURE
        const handler = new RiskStableCoinLocalHandler();
        const result = await handler.executeStableCoinRiskVerification({
            riskGroupID: riskGroupIDCircuit,  // Pass as CircuitString
            backingRatioThreshold,
            liquidityRatioThreshold,
            concentrationLimit: finalConcentrationLimit,
            qualityThreshold,
            actusUrl,
            contractPortfolio: finalContractPortfolio,
            regulatoryFramework: undefined,
            jurisdictionOverride: jurisdictionCLI?.toUpperCase()
        });

        // PRESERVE EXACT OUTPUT HANDLING from working implementation with LOCAL prefix
        if (result.success) {
            console.log('\n🎉 LOCAL StableCoin Risk verification completed successfully!');
            
            // === GROUP VERIFICATION SUMMARY (Following Network Pattern) ===
            console.log(`\n🏗️  LOCAL Risk Group Verification Summary:`);
            console.log(`   📊 Risk Group ID: ${riskGroupID}`);
            console.log(`   ✅ Group Structure: Enabled`);
            console.log(`   🏠 LOCAL DEVELOPMENT BENEFITS:`);
            console.log('      ⚡ Faster execution (no network delays)');
            console.log('      🔧 Instant blockchain setup');
            console.log('      📊 Immediate feedback for testing');
        } else {
            console.log('\n❌ LOCAL StableCoin Risk verification failed');
            process.exit(1);
        }
    } catch (error) {
        console.error('💥 LOCAL Error during verification:', error);
        process.exit(1);
    }
}

// PRESERVE EXACT CLI EXECUTION PATTERN from working code
main().catch(err => {
    console.error('❌ LOCAL Error:', err);
    process.exit(1);
});