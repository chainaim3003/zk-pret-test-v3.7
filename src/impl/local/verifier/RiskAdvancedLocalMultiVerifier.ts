/**
 * CLI Entry Point for Advanced Risk LOCAL Verification
 * PRESERVES EXACT SAME CLI PATTERN as working implementation
 * Optimized for local development/testing with faster execution
 * 
 * Uses new organized RiskAdvancedLocalHandler for improved development workflow
 */

import { CircuitString } from 'o1js';
import { RiskAdvancedLocalHandler } from '../handler/RiskAdvancedLocalHandler.js';

async function main() {
    console.log('🏠 Advanced Risk LOCAL Verification (Organized Architecture - Development Optimized)');

    // PRESERVE EXACT PARAMETER PARSING from working implementation
    const riskGroupID = process.argv[2];
    const liquidityThreshold = parseFloat(process.argv[3]);
    const actusUrl = process.argv[4] || 'http://localhost:8083/eventsBatch';
    const portfolioPath = process.argv[5];
    const executionMode = process.argv[6] || 'production';

    // PRESERVE EXACT VALIDATION LOGIC from working implementation
    if (!riskGroupID) {
        console.error('❌ Error: Risk Group ID is required');
        console.log('Usage: node RiskAdvancedLocalMultiVerifier.js <riskGroupID> <liquidityThreshold> <actusUrl> [portfolioPath] [executionMode]');
        process.exit(1);
    }
    if (isNaN(liquidityThreshold)) {
        console.error('❌ Error: Liquidity threshold is required');
        console.log('Usage: node RiskAdvancedLocalMultiVerifier.js <riskGroupID> <liquidityThreshold> <actusUrl> [portfolioPath] [executionMode]');
        process.exit(1);
    }

    const riskGroupIDCircuit = CircuitString.fromString(riskGroupID);

    // PRESERVE EXACT PORTFOLIO LOADING from working implementation
    let contractPortfolio: any[] | undefined;
    if (portfolioPath) {
        try {
            const fs = await import('fs');
            const path = await import('path');
            const fullPath = path.resolve(portfolioPath);
            const rawData = fs.readFileSync(fullPath, 'utf8');
            const parsed = JSON.parse(rawData);
            contractPortfolio = parsed.contracts || parsed;
            
            console.log(`📊 LOCAL Portfolio ID: ${parsed.portfolioMetadata?.portfolioId || 'Unknown'}`);
            console.log(`💰 LOCAL Total Notional: ${parsed.portfolioMetadata?.totalNotional || 'Unknown'}`);
            console.log(`🔍 LOCAL HQLA Categories from Config:`);
            contractPortfolio?.forEach((contract, index) => {
                console.log(`   LOCAL Contract ${contract.contractID || index}: HQLA Category = ${contract.hqlaCategory || 'Not specified'}`);
            });
        } catch (error: any) {
            console.error(`❌ Failed to load portfolio from ${portfolioPath}:`, error.message);
            console.log(`🔄 Falling back to default hardcoded contracts`);
            contractPortfolio = undefined;
        }
    }

    // Create and execute LOCAL handler
    const handler = new RiskAdvancedLocalHandler();
    
    console.log(`🏠 LOCAL Parameters:`);
    console.log(`   �️ Risk Group ID: ${riskGroupID}`);
    console.log(`   �🎯 Liquidity Threshold: ${liquidityThreshold}%`);
    console.log(`   🌐 ACTUS API URL: ${actusUrl}`);
    console.log(`   📁 Portfolio Path: ${portfolioPath || 'Using default contracts'}`);
    console.log(`   ⚙️ Execution Mode: ${executionMode}`);

    try {
        const startTime = Date.now();
        
        const result = await handler.executeAdvancedRiskVerification({
            riskGroupID: riskGroupIDCircuit,
            liquidityThreshold,
            actusUrl,
            contractPortfolio,
            executionMode
        });

        const endTime = Date.now();
        const duration = (endTime - startTime) / 1000;

        if (result.success) {
            console.log('✅ LOCAL Advanced Risk verification completed successfully!');
            console.log(`⏱️ Total execution time: ${duration.toFixed(2)} seconds`);
            console.log(`📊 Status Change: ${result.contractStatus?.beforeVerification} → ${result.contractStatus?.afterVerification}`);
            console.log('✅ ADVANCED RISK COMPLIANCE ACHIEVED - Contract status changed');
            
            process.exit(0);
        } else {
            console.error('❌ LOCAL Advanced Risk verification failed!');
            console.error(`❌ Error: ${result.summary}`);
            process.exit(1);
        }
        
    } catch (error: any) {
        console.error('💥 Unexpected error during LOCAL Advanced Risk verification:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

// Execute main function
main().catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
});
