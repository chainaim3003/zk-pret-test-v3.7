/**
 * CorporateRegistrationLocalSingleVerifierUtils.ts - LOCAL Single Company Verification
 * PARALLELS: CorporateRegistrationLocalMultiVerifierUtils.ts (but for single company)
 * ENVIRONMENT: LOCAL blockchain only
 */
import * as dotenv from 'dotenv';
dotenv.config();

// Use the multi-company LOCAL verifier for single company
import { getCorporateRegistrationLocalMultiVerifierUtils } from './CorporateRegistrationLocalMultiVerifierUtils.js';

export async function getCorporateRegistrationLocalSingleVerifierUtils(
  companyName: string,
  jurisdiction: string = 'IN'
) {
  console.log(`\n🚀 Corporate Registration Single Company Verification Test Started`);
  console.log(`🏢 Company: ${companyName}`);
  console.log(`🌍 Jurisdiction: ${jurisdiction}`);
  console.log(`🏠 Environment: LOCAL blockchain`);

  // Use the multi-company verifier with a single company
  const result = await getCorporateRegistrationLocalMultiVerifierUtils([companyName], jurisdiction);
  
  // Return single company result
  const singleResult = result.verificationResults[0];
  
  return {
    proof: result.proofs[0],
    verificationResult: singleResult,
    totalCompanies: 1,
    jurisdiction: result.jurisdiction,
    environment: result.environment,
    isCompliant: singleResult?.isCompliant || false,
    complianceScore: singleResult?.complianceScore || 0
  };
}

// Main execution (same pattern as multi-company)
async function main() {
  const args = process.argv.slice(2);
  
  // Parse jurisdiction flag
  const jurisdictionFlag = args.find(arg => arg.startsWith('--jurisdiction='));
  const jurisdiction = jurisdictionFlag ? jurisdictionFlag.split('=')[1] : 'IN';
  
  // Parse company identifier
  const companyIds = args.filter(arg => !arg.startsWith('--'));
  const companyName = companyIds.join(' ').trim();
  
  if (!companyName) {
    console.error('❌ Usage: node CorporateRegistrationLocalSingleVerifierUtils.js [--jurisdiction=IN] "CIN_or_Company_Name"');
    console.error('');
    console.error('Examples:');
    console.error('  node CorporateRegistrationLocalSingleVerifierUtils.js "U01112TZ2022PTC039493"');
    console.error('  node CorporateRegistrationLocalSingleVerifierUtils.js --jurisdiction=US "Delaware_Corp_123"');
    console.error('  node CorporateRegistrationLocalSingleVerifierUtils.js "SREE PALANI ANDAVAR AGROS PRIVATE LIMITED"');
    process.exit(1);
  }

  try {
    const result = await getCorporateRegistrationLocalSingleVerifierUtils(companyName, jurisdiction);
    console.log('\n🎉 LOCAL Corporate Registration single company verification completed successfully!');
    console.log(`🏢 Company: ${companyName}`);
    console.log(`✅ Is Compliant: ${result.isCompliant ? 'YES' : 'NO'}`);
    console.log(`📊 Compliance Score: ${result.complianceScore}%`);
    console.log(`🌍 Jurisdiction: ${result.jurisdiction}`);
    console.log(`🏠 Environment: ${result.environment}`);
  } catch (error) {
    console.error('💥 Fatal Error:', error);
    process.exit(1);
  }
}

// Module detection (same as multi-company)
const isMainModule = import.meta.url === `file://${process.argv[1]}` || 
                     import.meta.url.endsWith('CorporateRegistrationLocalSingleVerifierUtils.js');

if (isMainModule && process.argv.length > 2) {
  main().catch(err => {
    console.error('💥 Fatal Error:', err);
    process.exit(1);
  });
}
