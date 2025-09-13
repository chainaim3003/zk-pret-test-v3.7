import { getBSDIOptimVerificationWithSignUtils } from './BusinessStandardOptimVerificationTestUtils.js';

async function main() {
    try {
        const evalBLJsonFileName = process.argv[2];
        if (!evalBLJsonFileName) {
            console.error('Please provide the BL JSON file path as an argument');
            process.exit(1);
        }
        console.log("🎯 OPTIMIZED COMPREHENSIVE VERIFICATION");
        console.log("📄 Processing file:", evalBLJsonFileName);
        const proof = await getBSDIOptimVerificationWithSignUtils(evalBLJsonFileName);
        console.log('🎉 Optimized verification completed successfully');
        return proof;
    }
    catch (err) {
        console.error('❌ Error in optimized verification:', err);
        throw err;
    }
}

main().catch(err => {
    console.error('Error in main:', err);
});