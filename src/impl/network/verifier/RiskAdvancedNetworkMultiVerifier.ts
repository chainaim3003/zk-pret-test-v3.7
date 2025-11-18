/**
 * CLI Entry Point for Advanced Risk Network Verification
 * PRESERVES EXACT SAME CLI PATTERN as working implementation
 * 
 * Uses new organized RiskAdvancedNetworkHandler while maintaining
 * 100% backward compatibility with existing CLI interface
 */

import { RiskAdvancedNetworkHandler } from '../handler/RiskAdvancedNetworkHandler.js';

async function main() {
    console.log('🚀 Advanced Risk Network Verification (Organized Architecture)');

    // PRESERVE EXACT PARAMETER PARSING from working implementation
    const liquidityThreshold = parseFloat(process.argv[2]);
    const actusUrl = process.argv[3] || 'http://localhost:8083/eventsBatch';
    const portfolioPath = process.argv[4];
    const executionMode = process.argv[5] || 'production';

    // PRESERVE EXACT VALIDATION LOGIC from working implementation
    if (isNaN(liquidityThreshold)) {
        console.error('❌ Error: Liquidity threshold is required');
        console.log('Usage: node RiskAdvancedNetworkMultiVerifier.js <liquidityThreshold> <actusUrl> [portfolioPath] [executionMode]');
        process.exit(1);
    }

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
            
            console.log(`📊 Portfolio ID: ${parsed.portfolioMetadata?.portfolioId || 'Unknown'}`);
            console.log(`💰 Total Notional: ${parsed.portfolioMetadata?.totalNotional || 'Unknown'}`);
            console.log(`🔍 HQLA Categories from Config:`);
            contractPortfolio?.forEach((contract, index) => {
                console.log(`   Contract ${contract.contractID || index}: HQLA Category = ${contract.hqlaCategory || 'Not specified'}`);
            });
        } catch (error: any) {
            console.error(`❌ Failed to load portfolio from ${portfolioPath}:`, error.message);
            console.log(`🔄 Falling back to default hardcoded contracts`);
            contractPortfolio = undefined;
        }
    }

    // Create and execute NETWORK handler
    const handler = new RiskAdvancedNetworkHandler();
    
    console.log(`🌐 NETWORK Parameters:`);
    console.log(`   🎯 Liquidity Threshold: ${liquidityThreshold}%`);
    console.log(`   🌐 ACTUS API URL: ${actusUrl}`);
    console.log(`   📁 Portfolio Path: ${portfolioPath || 'Using default contracts'}`);
    console.log(`   ⚙️ Execution Mode: ${executionMode}`);

    try {
        const startTime = Date.now();
        
        const result = await handler.executeAdvancedRiskVerification({
            liquidityThreshold,
            actusUrl,
            contractPortfolio,
            executionMode
        });

        const endTime = Date.now();
        const duration = (endTime - startTime) / 1000;

        if (result.success) {
            console.log('✅ NETWORK Advanced Risk verification completed successfully!');
            console.log(`⏱️ Total execution time: ${duration.toFixed(2)} seconds`);
            console.log(`📊 Status Change: ${result.contractStatus?.beforeVerification} → ${result.contractStatus?.afterVerification}`);
            // Transaction hash logging removed for compatibility
            console.log('✅ ADVANCED RISK COMPLIANCE ACHIEVED - Contract status changed');
            
            process.exit(0);
        } else {
            console.error('❌ NETWORK Advanced Risk verification failed!');
            console.error(`❌ Error: ${result.summary}`);
            process.exit(1);
        }
        
    } catch (error: any) {
        console.error('💥 Unexpected error during NETWORK Advanced Risk verification:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

// Execute main function
main().catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
});
