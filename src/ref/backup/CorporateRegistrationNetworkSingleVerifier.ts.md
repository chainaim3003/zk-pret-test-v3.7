/**
 * Corporate Registration Single Company Network Verifier (TypeScript)
 * PARALLELS: Similar to CorporateRegistrationNetworkMultiVerifier.ts but for single company
 * SUPPORTS: Single company verification with jurisdiction support
 */
import * as dotenv from 'dotenv';
dotenv.config();

import { runCorporateRegistrationTestWithFundedAccounts } from './network/CorporateRegistrationNetworkHandler.js';

export interface SingleVerificationResponse {
  proof?: any;
  verificationResult: any;
  contractAddress: string;
  jurisdiction: string;
  isCompliant: boolean;
  complianceScore: number;
}

export async function verifyCorporateRegistrationSingleCompanyCompliance(
  companyName: string, 
  jurisdiction: string = 'IN',
  useExistingContract: boolean = true
): Promise<SingleVerificationResponse> {
  console.log('\n🔍 Corporate Registration Single Company Compliance Verifier');
  console.log('='.repeat(70));
  console.log(`🏢 Company: ${companyName}`);
  console.log(`🌍 Jurisdiction: ${jurisdiction}`);
  console.log(`📋 Use existing contract: ${useExistingContract ? 'YES' : 'NO'}`);
  
  try {
    // Use the multi-company handler with a single company
    const result = await runCorporateRegistrationTestWithFundedAccounts(
      [companyName], 
      jurisdiction,
      useExistingContract
    );
    
    const singleResult = result.verificationResults[0];
    
    return {
      proof: result.proofs[0],
      verificationResult: singleResult,
      contractAddress: result.contractAddress,
      jurisdiction: result.jurisdiction,
      isCompliant: singleResult?.isCompliant || false,
      complianceScore: singleResult?.complianceScore || 0
    };
  } catch (error) {
    console.error('❌ Error in Corporate Registration Single Company Compliance Verification:', error);
    throw error;
  }
}

async function main(): Promise<void> {
  const args: string[] = process.argv.slice(2);
  
  // Parse jurisdiction flag (--jurisdiction=IN)
  const jurisdictionFlag = args.find(arg => arg.startsWith('--jurisdiction='));
  const jurisdiction = jurisdictionFlag ? jurisdictionFlag.split('=')[1] : 'IN';
  
  // Parse company identifier
  const companyIds = args.filter(arg => !arg.startsWith('--'));
  const companyName = companyIds.join(' ').trim();
  
  if (!companyName) {
    console.error('❌ Error: Company name or CIN is required');
    console.log('📖 Usage: node CorporateRegistrationNetworkSingleVerifier.js [--jurisdiction=IN] "CIN_or_Company_Name"');
    console.log('📝 Example: node CorporateRegistrationNetworkSingleVerifier.js --jurisdiction=IN "U01112TZ2022PTC039493"');
    console.log('📝 Example: node CorporateRegistrationNetworkSingleVerifier.js "SREE PALANI ANDAVAR AGROS PRIVATE LIMITED"');
    process.exit(1);
  }
  
  try {
    const result = await verifyCorporateRegistrationSingleCompanyCompliance(
      companyName, 
      jurisdiction, 
      true
    );
    
    console.log('\n✅ SINGLE COMPANY VERIFICATION COMPLETED');
    console.log(`🏢 Company: ${companyName}`);
    console.log(`🌍 Jurisdiction: ${result.jurisdiction}`);
    console.log(`📋 Contract Address: ${result.contractAddress}`);
    console.log(`✅ Is Compliant: ${result.isCompliant ? 'YES' : 'NO'}`);
    console.log(`📊 Compliance Score: ${result.complianceScore}%`);
    
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
