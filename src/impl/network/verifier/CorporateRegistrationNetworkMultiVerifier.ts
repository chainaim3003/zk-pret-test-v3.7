/**
 * FIXED: Corporate Registration Multi-Company Verifier (TypeScript)
 * 
 * UPDATED to use consolidated CorporateRegistrationNetworkHandler (CLASS-BASED)
 * MATCHES: GLEIFNetworkMultiVerifier pattern exactly
 * ZERO FUNCTIONAL CHANGES: All verification logic identical
 */

import * as dotenv from 'dotenv';
dotenv.config();

// Import the consolidated network handler
import { 
  runCorporateRegistrationTestWithFundedAccounts,
  CorporateRegistrationNetworkHandler 
} from '../handler/CorporateRegistrationNetworkHandler.js';

// Import types for proper TypeScript support
import type { PublicKey } from 'o1js';

/**
 * Types for verification results
 */
interface ComplianceFields {
  cin: string;
  companyName: string;
  registrationDate: string;
  companyStatus: string;
  companyClass: string;
  companyCategory: string;
  authorizedCapital: string;
  paidUpCapital: string;
  registeredOffice: string;
  registrarOfCompanies: string;
  jurisdiction: string;
  lastAGMDate: string;
  lastBalanceSheetDate: string;
}

interface BusinessRules {
  companyActive: boolean;
  validRegistration: boolean;
  currentCompliance: boolean;
  validDates: boolean;
  validCIN: boolean;
  filingsCurrent: boolean;
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
  cin: string;
  jurisdiction: string;
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
  verificationResults: VerificationResult[];
  contractAddress: string;
  jurisdiction: string;
  infrastructureInfo?: any;
}

/**
 * ENHANCED MAIN VERIFICATION FUNCTION
 * Uses consolidated network handler for better organization
 */
export async function verifyCorporateRegistrationMultiCompanyCompliance(
  companyNames: string[], 
  jurisdiction: string = 'IN',
  useExistingContract: boolean = true
): Promise<VerificationResponse> {
  console.log('\n🔍 Corporate Registration Multi-Company Compliance Verifier');
  console.log('='.repeat(70));
  console.log(`🏢 Companies to verify: ${companyNames.length}`);
  console.log(`🌍 Jurisdiction: ${jurisdiction}`);
  console.log(`📋 Use existing contract: ${useExistingContract ? 'YES' : 'NO'}`);
  console.log('✅ Using consolidated CorporateRegistrationNetworkHandler + proven infrastructure');
  
  try {
    // =================================== Smart Contract Discovery ===================================
    console.log('\n📋 Step 1: Smart contract discovery with Environment-Aware Manager...');
    
    // Contract address will be determined by infrastructure during verification
    console.log('📍 Contract address: Loaded dynamically from environment configuration');
    console.log(`🌍 Jurisdiction: ${jurisdiction}`);
    console.log('✅ Using environment-aware contract discovery');
    
    // =================================== Run Verification ===================================
    console.log('\n🚀 Step 2: Running Corporate Registration verification with consolidated infrastructure...');
    const result: VerificationResponse = await runCorporateRegistrationTestWithFundedAccounts(
      companyNames,
      jurisdiction
    );
    
    console.log('\n🎉 VERIFICATION COMPLETED SUCCESSFULLY!');
    return result;
    
  } catch (error) {
    console.error('❌ Error in Corporate Registration Multi-Company Compliance Verification:', error);
    throw error;
  }
}

/**
 * ENHANCED CLI FUNCTION with better argument parsing
 */
async function main(): Promise<void> {
  const args: string[] = process.argv.slice(2);
  
  // Parse jurisdiction flag (--jurisdiction=IN)
  const jurisdictionFlag = args.find(arg => arg.startsWith('--jurisdiction='));
  const jurisdiction = jurisdictionFlag ? jurisdictionFlag.split('=')[1] : 'IN';
  
  // Parse company identifiers (CINs or company names)
  const companyIds = args.filter(arg => !arg.startsWith('--'));
  let companyNames: string[] = [];
  
  if (companyIds.length === 0) {
    console.error('❌ Error: Company names or CINs are required');
    console.log('📖 Usage: node CorporateRegistrationNetworkMultiVerifier.ts [--jurisdiction=IN] "CIN1,CIN2"');
    console.log('📝 Example: node CorporateRegistrationNetworkMultiVerifier.ts --jurisdiction=IN "U01112TZ2022PTC039493"');
    console.log('📝 Example: node CorporateRegistrationNetworkMultiVerifier.ts "SREE PALANI ANDAVAR AGROS PRIVATE LIMITED"');
    console.log('📝 Multiple Companies: node CorporateRegistrationNetworkMultiVerifier.ts "Company1,Company2"');
    process.exit(1);
  }
  
  // ✅ FIXED: Handle company names with spaces correctly (matching GLEIF pattern)
  if (companyIds.length === 1 && companyIds[0].includes(',')) {
    // Comma-separated format
    companyNames = companyIds[0].split(',').map((name: string) => name.trim()).filter((name: string) => name.length > 0);
  } else if (companyIds.length === 1) {
    // Single company name (possibly with spaces)
    companyNames = [companyIds[0].trim()];
  } else {
    // Multiple arguments - join them as one company name
    const fullCompanyName = companyIds.join(' ').trim();
    companyNames = [fullCompanyName];
  }
  
  // ✅ Clean company names - remove any problematic characters
  companyNames = companyNames.map((name: string) => 
    name.replace(/[^\w\s\&\.\'\-]/g, '') // Keep only safe characters
  ).filter((name: string) => name.length > 0);
  
  if (companyNames.length === 0) {
    console.error('❌ Error: At least one company name or CIN is required');
    process.exit(1);
  }
  
  if (companyNames.length > 10) {
    console.error('❌ Error: Maximum 10 companies supported in this demo');
    process.exit(1);
  }
  
  console.log('🔍 Corporate Registration Multi-Company Compliance Verifier');
  console.log('='.repeat(70));
  console.log(`🏢 Companies to verify: ${companyNames.join(', ')}`);
  console.log(`📊 Total Companies: ${companyNames.length}`);
  console.log(`🌍 Jurisdiction: ${jurisdiction}`);
  
  try {
    const result: VerificationResponse = await verifyCorporateRegistrationMultiCompanyCompliance(
      companyNames,
      jurisdiction,
      true
    );
    
    // ✅ FIXED: Calculate removed properties in JavaScript (ZK best practice)
    console.log('\n📊 FINAL VERIFICATION SUMMARY');
    console.log('='.repeat(70));
    console.log(`✅ Total companies processed: ${result.totalCompanies}`);
    console.log(`🌍 Jurisdiction: ${result.jurisdiction}`);
    console.log(`📋 Contract Address: ${result.contractAddress}`);
    
    // Calculate global compliance score (removed from contract)
    const successfulVerifications = result.verificationResults.filter(r => !r.error);
    const compliantCount = successfulVerifications.filter(r => r.isCompliant).length;
    const totalCount = successfulVerifications.length;
    
    if (totalCount > 0) {
      const globalCompliancePercentage = (compliantCount / totalCount) * 100;
      console.log(`📊 Global Compliance Rate: ${globalCompliancePercentage.toFixed(2)}%`);
      console.log(`✅ Compliant Companies: ${compliantCount}/${totalCount}`);
    }
    
    // Show individual results
    console.log('\n📋 INDIVIDUAL COMPANY RESULTS:');
    console.log('-'.repeat(70));
    result.verificationResults.forEach((r, index) => {
      console.log(`\n${index + 1}. ${r.companyName}`);
      console.log(`   CIN: ${r.cin}`);
      console.log(`   Compliant: ${r.isCompliant ? '✅ YES' : '❌ NO'}`);
      console.log(`   Score: ${r.complianceScore}%`);
      if (r.error) {
        console.log(`   Error: ${r.error}`);
      }
    });
    
    console.log('\n📋 Next Steps:');
    console.log('  1. ✅ Companies verified and recorded on blockchain');
    console.log('  2. 🌐 Check contract state on MinaScan or MinaExplorer');
    console.log('  3. 🔄 Run additional verifications as needed');
    console.log(`  4. 🌍 Verify jurisdiction-specific compliance for ${jurisdiction}`);
    
    process.exit(0);
    
  } catch (error) {
    console.error('💥 Fatal Error:', error);
    console.error('💥 Stack:', (error as Error).stack);
    
    console.log('\n🔧 TROUBLESHOOTING TIPS:');
    console.log('  1. Ensure BUILD_ENV is properly configured');
    console.log('  2. Check that Oracle Registry is initialized');
    console.log('  3. Verify DEVNET connection is available');
    console.log('  4. Ensure contract is deployed and accessible');
    console.log(`  5. Verify jurisdiction '${jurisdiction}' is supported`);
    console.log('  6. Check company names/CINs for special characters');
    console.log('  7. Ensure Corporate Registration Oracle is responding');
    console.log('  8. Verify MCA API credentials are valid');
    console.log('  9. Check that ZK programs are properly compiled');
    console.log('  10. Ensure sender account has sufficient balance');
    
    process.exit(1);
  }
}

// Run if called directly
main().catch((err: Error) => {
  console.error('💥 Fatal Error:', err);
  process.exit(1);
});