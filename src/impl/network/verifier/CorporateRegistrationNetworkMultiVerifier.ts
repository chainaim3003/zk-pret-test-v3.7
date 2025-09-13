/**
 * Corporate Registration Multi-Company Network Verifier (TypeScript)
 * PARALLELS: GLEIFNetworkMultiVerifier.ts
 * SUPPORTS: Multi-jurisdiction verification with oracle separation
 */
import * as dotenv from 'dotenv';
dotenv.config();

import { runCorporateRegistrationTestWithFundedAccounts } from '../handler/CorporateRegistrationNetworkHandler.js';

export interface VerificationResponse {
  proofs: any[];
  verificationResults: any[];
  contractAddress: string;
  jurisdiction: string;
  totalCompanies: number;
  successfulVerifications: number;
}

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
  
  try {
    const result: VerificationResponse = await runCorporateRegistrationTestWithFundedAccounts(
      companyNames, 
      jurisdiction,
      useExistingContract
    );
    return result;
  } catch (error) {
    console.error('❌ Error in Corporate Registration Multi-Company Compliance Verification:', error);
    throw error;
  }
}

async function main(): Promise<void> {
  const args: string[] = process.argv.slice(2);
  
  // Parse jurisdiction flag (--jurisdiction=IN)
  const jurisdictionFlag = args.find(arg => arg.startsWith('--jurisdiction='));
  const jurisdiction = jurisdictionFlag ? jurisdictionFlag.split('=')[1] : 'IN';
  
  // Parse company identifiers (CINs or company names)
  const companyIds = args.filter(arg => !arg.startsWith('--'));
  let companyNames: string[] = [];
  
  if (companyIds.length === 1 && companyIds[0].includes(',')) {
    companyNames = companyIds[0].split(',').map(name => name.trim());
  } else if (companyIds.length === 1) {
    companyNames = [companyIds[0].trim()];
  } else {
    const fullCompanyName = companyIds.join(' ').trim();
    companyNames = [fullCompanyName];
  }
  
  if (companyNames.length === 0) {
    console.error('❌ Error: Company names or CINs are required');
    console.log('📖 Usage: node CorporateRegistrationNetworkMultiVerifier.js [--jurisdiction=IN] "CIN1,CIN2"');
    console.log('📝 Example: node CorporateRegistrationNetworkMultiVerifier.js --jurisdiction=IN "U01112TZ2022PTC039493"');
    console.log('📝 Example: node CorporateRegistrationNetworkMultiVerifier.js "SREE PALANI ANDAVAR AGROS PRIVATE LIMITED"');
    process.exit(1);
  }
  
  try {
    const result = await verifyCorporateRegistrationMultiCompanyCompliance(
      companyNames, 
      jurisdiction, 
      true
    );
    
    console.log('\n✅ VERIFICATION COMPLETED - See detailed results above');
    console.log(`🏢 Total companies processed: ${result.totalCompanies}`);
    console.log(`✅ Successful verifications: ${result.successfulVerifications}`);
    console.log(`🌍 Jurisdiction: ${result.jurisdiction}`);
    console.log(`📋 Contract Address: ${result.contractAddress}`);
    
    process.exit(0);
  } catch (error) {
    console.error('💥 Fatal Error:', error);
    process.exit(1);
  }
}

main().catch((err: Error) => {
  console.error('💥 Fatal Error:', err);
  process.exit(1);
});
