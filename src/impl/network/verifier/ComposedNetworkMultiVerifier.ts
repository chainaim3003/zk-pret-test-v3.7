/**
 * ComposedNetworkMultiVerifier.ts - NETWORK Batch Composed Verification
 * SIMPLE ENTRY POINT - calls the handler function
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { getComposedNetworkMultiVerifierUtils } from '../handler/ComposedNetworkHandler.js';

async function main() {
  const args = process.argv.slice(2);

  // Default company and CIN
  const companyName = args[0] || 'SREE PALANI ANDAVAR AGROS PRIVATE LIMITED';
  const companyCIN = args[1] || 'U01112TZ2022PTC039493';
  const testIterations = args[2] ? parseInt(args[2]) : 1;

  if (isNaN(testIterations) || testIterations < 1 || testIterations > 5) {
    console.error('❌ Error: Iterations must be a number between 1 and 5');
    console.log('📖 Usage: node ./build/impl/network/verifier/ComposedNetworkMultiVerifier.js [companyName] [CIN] [iterations]');
    console.log('📝 Example: node ./build/impl/network/verifier/ComposedNetworkMultiVerifier.js "SREE PALANI ANDAVAR AGROS PRIVATE LIMITED" "U01112TZ2022PTC039493" 2');
    process.exit(1);
  }

  console.log('\n🚀 Starting NETWORK Composed Verification...');
  console.log(`🏢 Company: ${companyName}`);
  console.log(`🆔 CIN: ${companyCIN}`);
  console.log(`🔄 Iterations: ${testIterations}`);
  console.log(`🌐 Environment: NETWORK (DEVNET/TESTNET/MAINNET based on .env)`);
  console.log('='.repeat(80));

  try {
    const result = await getComposedNetworkMultiVerifierUtils(companyName, companyCIN, testIterations);

    console.log('\n' + '='.repeat(80));
    console.log('🎉 NETWORK COMPOSED VERIFICATION COMPLETED!');
    console.log('='.repeat(80));
    console.log(`✅ Total Composed Proofs: ${result.totalComposedProofs}`);
    console.log(`✅ Successful Verifications: ${result.successfulVerifications}`);
    console.log(`❌ Failed Verifications: ${result.failedVerifications}`);
    console.log(`🌐 Environment: ${result.environment}`);
    console.log('='.repeat(80));

    console.log('\n✨ Verification completed!');
    console.log('🔗 Check transaction status on MinaScan: https://minascan.io/devnet/');
  } catch (error: any) {
    console.error('\n❌ Fatal error in verification:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('💥 Fatal Error:', error);
  process.exit(1);
});