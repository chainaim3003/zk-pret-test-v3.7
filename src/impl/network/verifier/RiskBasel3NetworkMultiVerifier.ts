/**
 * CLI Entry Point for Basel3 Risk Network Verification
 * PRESERVES EXACT SAME CLI PATTERN as working implementation
 * 
 * Uses new organized RiskBasel3NetworkHandler while maintaining
 * 100% backward compatibility with existing CLI interface
 */

import { RiskBasel3NetworkHandler } from '../handler/RiskBasel3NetworkHandler.js';

async function main() {
    console.log('🚀 Basel3 Risk Network Verification (Organized Architecture)');

    // PRESERVE EXACT PARAMETER PARSING from working implementation
    const lcrThreshold = parseFloat(process.argv[2]);
    const nsfrThreshold = parseFloat(process.argv[3]) || 100;
    const actusUrl = process.argv[4] || 'http://localhost:8083/eventsBatch';
    const portfolioPath = process.argv[5];

    // PRESERVE EXACT VALIDATION LOGIC from working implementation
    if (isNaN(lcrThreshold)) {
        console.error('❌ Error: LCR threshold is required');
        console.log('Usage: node RiskBasel3NetworkMultiVerifier.js <lcrThreshold> <nsfrThreshold> <actusUrl> [portfolioPath]');
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

    // PRESERVE EXACT LOGGING PATTERN from working implementation
    console.log(`🏦 Basel3 LCR Threshold: ${lcrThreshold}%`);
    console.log(`💰 Basel3 NSFR Threshold: ${nsfrThreshold}%`);
    console.log(`🌐 ACTUS API URL: ${actusUrl}`);
    if (portfolioPath) {
        console.log(`📁 Portfolio Path: ${portfolioPath}`);
    }

    try {
        // Execute using new organized handler - SAME FUNCTIONALITY
        const handler = new RiskBasel3NetworkHandler();
        const result = await handler.executeBasel3RiskVerification({
            lcrThreshold,
            nsfrThreshold,
            actusUrl,
            contractPortfolio
        });

        // PRESERVE EXACT OUTPUT HANDLING from working implementation
        if (result.success) {
            console.log('\n🎉 Basel3 Risk verification completed successfully!');
            console.log(`📊 Status Change: ${result.contractStatus.beforeVerification} → ${result.contractStatus.afterVerification}`);
            
            if (result.contractStatus.afterVerification === 90) {
                console.log('✅ BASEL3 COMPLIANCE ACHIEVED - Contract status changed to 90');
            } else {
                console.log('⚠️ Unexpected contract status - should be 90 (compliant)');
            }
        } else {
            console.log('\n🔴 Basel3 Risk verification completed - Non-compliant scenario detected');
            console.log('✅ This is expected behavior for INVALID test cases');
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