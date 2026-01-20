/**
 * CLI Entry Point for StableCoin Risk Network Verification
 * ENHANCED WITH GROUP STRUCTURE (Following BusinessProcess Pattern)
 * 
 * Uses new organized RiskStableCoinNetworkHandler with proper group tracking
 */

import { CircuitString } from 'o1js';
import { RiskStableCoinNetworkHandler } from '../handler/RiskStableCoinNetworkHandler.js';

async function main() {
    console.log('🚀 StableCoin Risk Network Verification (Group Structure Enabled)');

    // === GROUP STRUCTURE PATTERN (Following BusinessProcess) ===
    // Parse command line arguments in same order as BusinessProcess
    const args = process.argv.slice(2);
    
    // Extract parameters following BusinessProcess pattern
    const riskGroupID = args[0];                                    
    const backingRatioThreshold = parseFloat(args[1]) || 100;      
    const actusUrl = args[2] || 'http://localhost:8083/eventsBatch'; 
    const portfolioPath = args[3];                                  
    const executionMode = args[4] || 'ultra_strict';               
    const jurisdictionCLI = args[5];                                

    // === VALIDATION (Following BusinessProcess Pattern) ===
    if (!riskGroupID) {
        console.error('❌ Error: Risk Group ID is required (first argument)');
        console.log('Usage: node RiskStableCoinNetworkMultiVerifier.js <RISK_GROUP_ID> <backingRatio> <actusUrl> <portfolioPath> <executionMode> <jurisdiction>');
        console.log('Example: node RiskStableCoinNetworkMultiVerifier.js RISK_GROUP_001 100 http://localhost:8083/eventsBatch ./portfolio.json ultra_strict US');
        process.exit(1);
    }

    if (!portfolioPath) {
        console.error('❌ Error: Portfolio path is required');
        console.log('Usage: node RiskStableCoinNetworkMultiVerifier.js <RISK_GROUP_ID> <backingRatio> <actusUrl> <portfolioPath> <executionMode> <jurisdiction>');
        process.exit(1);
    }

    if (!jurisdictionCLI || !['US', 'EU'].includes(jurisdictionCLI.toUpperCase())) {
        console.error('❌ Error: Invalid jurisdiction. Must be US or EU.');
        process.exit(1);
    }
    
    // Convert Risk Group ID to CircuitString (Following BusinessProcess Pattern)
    const riskGroupIDCircuit = CircuitString.fromString(riskGroupID);
    console.log(`🏷️  Risk Group ID: ${riskGroupID}`);

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
    
    // === GROUP STRUCTURE VERIFICATION (Following BusinessProcess Pattern) ===
    console.log('\n🏗️  Starting Risk Group Verification...');
    console.log(`📊 Risk Group ID: ${riskGroupID}`);
    
    // Single process verification
    try {
        // Execute using new organized handler with GROUP STRUCTURE
        const handler = new RiskStableCoinNetworkHandler();
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

        // PRESERVE EXACT OUTPUT HANDLING from working implementation
        if (result.success) {
            console.log('\n🎉 StableCoin Risk verification completed successfully!');
            
            // === GROUP VERIFICATION SUMMARY (Following BusinessProcess Pattern) ===
            console.log(`\n🏗️  Risk Group Verification Summary:`);
            console.log(`   📊 Risk Group ID: ${riskGroupID}`);
            console.log(`   ✅ Group Structure: Enabled`);
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