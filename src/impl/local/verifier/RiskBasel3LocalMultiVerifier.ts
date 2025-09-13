/**
 * CLI Entry Point for Basel3 Risk LOCAL Verification
 * PRESERVES EXACT SAME CLI PATTERN as working implementation
 * Optimized for local development/testing with faster execution
 * 
 * Uses new organized RiskBasel3LocalHandler for improved development workflow
 */

import { RiskBasel3LocalHandler } from '../handler/RiskBasel3LocalHandler.js';

async function main() {
    console.log('🏠 Basel3 Risk LOCAL Verification (Organized Architecture - Development Optimized)');

    // PRESERVE EXACT PARAMETER PARSING from working implementation
    const lcrThreshold = parseFloat(process.argv[2]);
    const nsfrThreshold = parseFloat(process.argv[3]) || 100;
    const actusUrl = process.argv[4] || 'http://localhost:8083/eventsBatch';
    const portfolioPath = process.argv[5];

    // PRESERVE EXACT VALIDATION LOGIC from working implementation
    if (isNaN(lcrThreshold)) {
        console.error('❌ Error: LCR threshold is required');
        console.log('Usage: node RiskBasel3LocalMultiVerifier.js <lcrThreshold> <nsfrThreshold> <actusUrl> [portfolioPath]');
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
            contractPortfolio = parsed.contracts;
            
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

    // PRESERVE EXACT LOGGING PATTERN from working implementation with LOCAL prefix
    console.log(`🏦 LOCAL Basel3 LCR Threshold: ${lcrThreshold}%`);
    console.log(`💰 LOCAL Basel3 NSFR Threshold: ${nsfrThreshold}%`);
    console.log(`🌐 LOCAL ACTUS API URL: ${actusUrl}`);
    if (portfolioPath) {
        console.log(`📁 LOCAL Portfolio Path: ${portfolioPath}`);
    }

    try {
        // Execute using new organized LOCAL handler - SAME FUNCTIONALITY but faster
        const handler = new RiskBasel3LocalHandler();
        const result = await handler.executeBasel3RiskVerification({
            lcrThreshold,
            nsfrThreshold,
            actusUrl,
            contractPortfolio
        });

        // PRESERVE EXACT OUTPUT HANDLING from working implementation with LOCAL prefix
        if (result.success) {
            console.log('\n🎉 LOCAL Basel3 Risk verification completed successfully!');
            console.log(`📊 LOCAL Status Change: ${result.contractStatus.beforeVerification} → ${result.contractStatus.afterVerification}`);
            
            if (result.contractStatus.afterVerification === 90) {
                console.log('✅ LOCAL BASEL3 COMPLIANCE ACHIEVED - Contract status changed to 90');
            } else {
                console.log('⚠️ LOCAL Unexpected contract status - should be 90 (compliant)');
            }
            
            // LOCAL SPECIFIC: Show development benefits
            console.log('🏠 LOCAL DEVELOPMENT BENEFITS:');
            console.log('   ⚡ Faster execution (no network delays)');
            console.log('   🔧 Instant blockchain setup');
            console.log('   📊 Immediate feedback for testing');
            console.log('   🧪 Quick iteration for development');
        } else {
            console.log('\n🔴 LOCAL Basel3 Risk verification completed - Non-compliant scenario detected');
            console.log('✅ LOCAL: This is expected behavior for INVALID test cases');
            console.log('🏠 LOCAL: Use this for testing non-compliant scenarios quickly');
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