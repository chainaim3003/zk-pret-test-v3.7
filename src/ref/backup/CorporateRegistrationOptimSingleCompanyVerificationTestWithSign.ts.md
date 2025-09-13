import * as dotenv from 'dotenv';
dotenv.config();

import { getCorporateRegistrationOptimSingleCompanyVerificationWithSignUtils } from './CorporateRegistrationOptimSingleCompanyVerificationTestWithSignUtils.js';

async function main() {
    // Get company name and network type from command line arguments
    const cin = process.argv[2];
    //const typeOfNet = process.argv[3] || 'TESTNET';
    
    if (!cin) {
        console.error('❌ Error: Company name is required');
        console.log('📖 Usage: node CorporateRegistrationOptimSingleCompanyVerificationTestWithSign.js "COMPANY NAME" [TESTNET|MAINNET]');
        console.log('📝 Example: node CorporateRegistrationOptimSingleCompanyVerificationTestWithSign.js "SREE PALANI ANDAVAR AGROS PRIVATE LIMITED" "TESTNET"');
        process.exit(1);
    }
    
    console.log('🏢 CIN:', cin);
    //console.log('🌐 Network Type:', typeOfNet);
    
    try {
        const proof = await getCorporateRegistrationOptimSingleCompanyVerificationWithSignUtils(cin);
        console.log('\n🎯 Proof generated successfully!');
        // Uncomment the line below if you want to see the full proof JSON
        // console.log('📄 Proof:', proof.toJSON());
    } catch (error) {
        console.error('💥 Error:', error);
        console.error('💥 Error Stack:', (error as Error).stack || 'No stack trace available');
        process.exit(1);
    }
}

main().catch(err => {
    console.error('💥 Fatal Error:', err);
    console.error('💥 Fatal Error Stack:', err.stack);
    process.exit(1);
});
