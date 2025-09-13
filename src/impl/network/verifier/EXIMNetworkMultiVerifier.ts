/**
 * FIXED: EXIM Multi-Company Verifier (TypeScript)
 *
 * PARALLEL TO: GLEIFNetworkMultiVerifier.ts
 * USES: Consolidated EXIMNetworkHandler
 * ZERO FUNCTIONAL CHANGES: All verification logic identical to existing EXIM functionality
 */

import * as dotenv from 'dotenv';
dotenv.config();

// Import the consolidated network handler
import { runEXIMTestWithFundedAccounts } from '../handler/EXIMNetworkHandler.js';

/**
 * Enhanced verification response interface
 */
export interface VerificationResponse {
  proofs: any[];
  totalCompanies: number;
  verificationResults: Array<{
    companyName: string;
    iec: string;
    isCompliant: boolean;
    complianceScore: number;
    verificationTime: string;
    businessRules?: {
      entityActive: boolean;
      iecCompliant: boolean;
      panValid: boolean;
      validDates: boolean;
      validIEC: boolean;
    };
    error?: string;
  }>;
  infrastructureInfo: {
    environment: string;
    compilationCached: boolean;
    directOracleAccess: boolean;
  };
}

/**
 * ENHANCED MAIN VERIFICATION FUNCTION
 * Uses consolidated network handler for better organization
 */
export async function verifyEXIMMultiCompanyCompliance(
  companyNames: string[], 
  useExistingContract: boolean = true
): Promise<VerificationResponse> {
  console.log('\n🔍 EXIM Multi-Company Compliance Verifier');
  console.log('='.repeat(60));
  console.log(`🏢 Companies to verify: ${companyNames.length}`);
  console.log(`📋 Use existing contract: ${useExistingContract ? 'YES' : 'NO'}`);
  console.log('✅ Using consolidated EXIMNetworkHandler + proven infrastructure');

  try {
    // =================================== Smart Contract Discovery ===================================
    console.log('\n📋 Step 1: Smart contract discovery with Environment-Aware Manager...');
    // Contract address will be determined by infrastructure during verification
    console.log('📍 Contract address: Loaded dynamically from environment configuration');
    console.log('✅ Using environment-aware contract discovery');

    // =================================== Run Verification ===================================
    console.log('\n🚀 Step 2: Running EXIM verification with consolidated infrastructure...');
    const result = await runEXIMTestWithFundedAccounts(companyNames);

    console.log('\n🎉 VERIFICATION COMPLETED SUCCESSFULLY!');
    return result;

  } catch (error) {
    console.error('❌ Error in EXIM Multi-Company Compliance Verification:', error);
    throw error;
  }
}

/**
 * ENHANCED CLI FUNCTION with better argument parsing
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);

  // Parse company names from command line arguments
  let companyNames: string[] = [];
  if (args.length === 0) {
    console.error('❌ Error: Company names are required');
    console.log('📖 Usage: node EXIMNetworkMultiVerifier.ts "COMPANY1,COMPANY2" [TESTNET|MAINNET]');
    console.log('📝 Example: node EXIMNetworkMultiVerifier.ts "Tata Motors Limited,Reliance Industries Limited"');
    console.log('📝 Single Company: node EXIMNetworkMultiVerifier.ts "SREE PALANI ANDAVAR AGROS PRIVATE LIMITED"');
    process.exit(1);
  }

  // ✅ FIXED: Handle company names with spaces correctly
  if (args.length === 1 && args[0].includes(',')) {
    // Comma-separated format
    companyNames = args[0].split(',').map((name) => name.trim()).filter((name) => name.length > 0);
  } else if (args.length === 1) {
    // Single company name (possibly with spaces)
    companyNames = [args[0].trim()];
  } else {
    // Multiple arguments - join them as one company name
    const fullCompanyName = args.join(' ').trim();
    companyNames = [fullCompanyName];
  }

  // ✅ Clean company names - remove any problematic characters
  companyNames = companyNames.map((name) => 
    name.replace(/[^\w\s\&\.\'\-]/g, '') // Keep only safe characters
  ).filter((name) => name.length > 0);

  if (companyNames.length === 0) {
    console.error('❌ Error: At least one company name is required');
    process.exit(1);
  }

  if (companyNames.length > 10) {
    console.error('❌ Error: Maximum 10 companies supported in this demo');
    process.exit(1);
  }

  console.log('🔍 EXIM Multi-Company Compliance Verifier');
  console.log('='.repeat(60));
  console.log(`🏢 Companies to verify: ${companyNames.join(', ')}`);
  console.log(`📊 Total Companies: ${companyNames.length}`);

  try {
    const result = await verifyEXIMMultiCompanyCompliance(companyNames, true);

    // Simple completion message - detailed results are shown by the infrastructure layer above
    console.log('\n✅ VERIFICATION COMPLETED - See detailed results above');
    console.log('\n📋 Next Steps:');
    console.log('  1. ✅ Companies verified and recorded on blockchain');
    console.log('  2. 🌐 Check contract state on MinaScan or MinaExplorer');
    console.log('  3. 🔄 Run additional verifications as needed');
    process.exit(0);

  } catch (error) {
    console.error('💥 Fatal Error:', error);
    console.error('💥 Stack:', (error as Error).stack);
    console.log('\n🔧 TROUBLESHOOTING TIPS:');
    console.log('  1. Ensure BUILD_ENV is properly configured');
    console.log('  2. Check that Oracle Registry is initialized');
    console.log('  3. Verify DEVNET connection is available');
    console.log('  4. Ensure contract is deployed and accessible');
    process.exit(1);
  }
}

// Run if called directly
main().catch((err: Error) => {
  console.error('💥 Fatal Error:', err);
  process.exit(1);
});
