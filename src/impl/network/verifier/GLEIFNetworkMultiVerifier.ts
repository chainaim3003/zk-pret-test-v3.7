/**
 * FIXED: GLEIF Multi-Company Verifier (TypeScript)
 * 
 * UPDATED to use consolidated GLEIFNetworkHandler
 * ZERO FUNCTIONAL CHANGES: All verification logic identical
 */

import * as dotenv from 'dotenv';
dotenv.config();

// Import the consolidated network handler - UPDATED: Use new consolidated handler
import { runGLEIFTestWithFundedAccounts } from '../handler/GLEIFNetworkHandler.js';

// Import types for proper TypeScript support
import type { PublicKey } from 'o1js';

/**
 * Types for verification results
 */
interface ComplianceFields {
  entityStatus: string;
  registrationStatus: string;
  conformityFlag: string;
  initialRegistrationDate: string;
  lastUpdateDate: string;
  nextRenewalDate: string;
  bicCodes: string;
  micCodes: string;
  managingLou: string;
}

interface BusinessRules {
  entityActive: boolean;
  registrationIssued: boolean;
  conformityOk: boolean;
  validDates: boolean;
  validLEI: boolean;
}

interface StateChanges {
  totalCompaniesBefore: string;
  totalCompaniesAfter: string;
  compliantCompaniesBefore: string;
  compliantCompaniesAfter: string;
  globalScoreBefore: string;
  globalScoreAfter: string;
}

interface VerificationResult {
  companyName: string;
  lei: string;
  isCompliant: boolean;
  complianceScore: number;
  verificationTime: string;
  complianceFields?: ComplianceFields;
  businessRules?: BusinessRules;
  stateChanges?: StateChanges;
  error?: string;
}

interface VerificationResponse {
  proofs: any[];
  totalCompanies: number;
  companyRegistry: any;
  contractState: any;
  globalStats: any;
  verificationResults: VerificationResult[];
  contractAddress?: string;
}

/**
 * ENHANCED MAIN VERIFICATION FUNCTION
 * Uses consolidated network handler for better organization
 */
export async function verifyGLEIFMultiCompanyCompliance(
  companyNames: string[], 
  useExistingContract: boolean = true
): Promise<VerificationResponse> {
  console.log('\n🔍 GLEIF Multi-Company Compliance Verifier');
  console.log('='.repeat(60));
  console.log(`🏢 Companies to verify: ${companyNames.length}`);
  console.log(`📋 Use existing contract: ${useExistingContract ? 'YES' : 'NO'}`);
  console.log('✅ Using consolidated GLEIFNetworkHandler + proven infrastructure');
  
  try {
    // =================================== Smart Contract Discovery ===================================
    console.log('\n📋 Step 1: Smart contract discovery with Environment-Aware Manager...');
    
    // Contract address will be determined by infrastructure during verification
    console.log('📍 Contract address: Loaded dynamically from environment configuration');
    console.log('✅ Using environment-aware contract discovery');
    
    // =================================== Run Verification ===================================
    console.log('\n🚀 Step 2: Running GLEIF verification with consolidated infrastructure...');
    const result: VerificationResponse = await runGLEIFTestWithFundedAccounts(companyNames);
    
    console.log('\n🎉 VERIFICATION COMPLETED SUCCESSFULLY!');
    return result;
    
  } catch (error) {
    console.error('❌ Error in GLEIF Multi-Company Compliance Verification:', error);
    throw error;
  }
}

/**
 * ENHANCED CLI FUNCTION with better argument parsing
 */
async function main(): Promise<void> {
  const args: string[] = process.argv.slice(2);
  
  // Parse company names from command line arguments
  let companyNames: string[] = [];
  
  if (args.length === 0) {
    console.error('❌ Error: Company names are required');
    console.log('📖 Usage: node GLEIFNetworkMultiVerifier.ts "COMPANY1,COMPANY2" [TESTNET|MAINNET]');
    console.log('📝 Example: node GLEIFNetworkMultiVerifier.ts "Apple Inc.,Microsoft Corporation"');
    console.log('📝 Single Company: node GLEIFNetworkMultiVerifier.ts "SREE PALANI ANDAVAR AGROS PRIVATE LIMITED"');
    process.exit(1);
  }
  
  // ✅ FIXED: Handle company names with spaces correctly
  if (args.length === 1 && args[0].includes(',')) {
    // Comma-separated format
    companyNames = args[0].split(',').map((name: string) => name.trim()).filter((name: string) => name.length > 0);
  } else if (args.length === 1) {
    // Single company name (possibly with spaces)
    companyNames = [args[0].trim()];
  } else {
    // Multiple arguments - join them as one company name
    const fullCompanyName = args.join(' ').trim();
    companyNames = [fullCompanyName];
  }
  
  // ✅ Clean company names - remove any problematic characters
  companyNames = companyNames.map((name: string) => 
    name.replace(/[^\w\s\&\.\'\-]/g, '') // Keep only safe characters
  ).filter((name: string) => name.length > 0);
  
  if (companyNames.length === 0) {
    console.error('❌ Error: At least one company name is required');
    process.exit(1);
  }
  
  if (companyNames.length > 10) {
    console.error('❌ Error: Maximum 10 companies supported in this demo');
    process.exit(1);
  }
  
  console.log('🔍 GLEIF Multi-Company Compliance Verifier');
  console.log('='.repeat(60));
  console.log(`🏢 Companies to verify: ${companyNames.join(', ')}`);
  console.log(`📊 Total Companies: ${companyNames.length}`);
  
  try {
    const result: VerificationResponse = await verifyGLEIFMultiCompanyCompliance(companyNames, true);
    
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
