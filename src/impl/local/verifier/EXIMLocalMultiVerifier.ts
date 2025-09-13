import { getEXIMLocalMultiVerifierUtils } from '../handler/EXIMLocalHandler.js';

if (process.argv[1] && process.argv[1].includes('EXIMLocalMultiVerifier')) {
  async function main() {
    try {
      // Get company name from command line arguments
      const companyName = process.argv.slice(2).join(' ').trim();
      
      if (!companyName) {
        console.error('❌ Error: Company name is required');
        console.error('Usage: node EXIMLocalMultiVerifier.js "COMPANY NAME"');
        process.exit(1);
      }

      console.log(`\n🎯 Starting verification for: "${companyName}"`);
      
      // Run the verification
      const result = await getEXIMLocalMultiVerifierUtils([companyName]);
      
      // Display detailed results
      console.log(`\n${'='.repeat(80)}`);
      console.log('📋 VERIFICATION RESULTS');
      console.log(`${'='.repeat(80)}`);
      
      result.verificationResults.forEach((result: any, index: number) => {
        console.log(`\n🏢 Company ${index + 1}: ${result.companyName}`);
        if (result.error) {
          console.log(`❌ Status: Failed`);
          console.log(`🚫 Error: ${result.error}`);
        } else {
          console.log(`✅ Status: Success`);
          console.log(`🔢 LEI: ${result.iec}`);
          console.log(`📊 Compliance Score: ${result.complianceScore}%`);
          console.log(`✓ Is Compliant: ${result.isCompliant ? 'Yes' : 'No'}`);
          console.log(`⏰ Timestamp: ${new Date(parseInt(result.verificationTime)).toISOString()}`);
        }
      });
      
      console.log(`\n${'='.repeat(80)}`);
      console.log(`📈 SUMMARY`);
      console.log(`${'='.repeat(80)}`);
      console.log(`🏢 Total Companies Processed: ${result.totalCompanies}`);
      const successCount = result.verificationResults.filter((r: any) => !r.error).length;
      const failureCount = result.verificationResults.filter((r: any) => r.error).length;
      console.log(`✅ Successful Verifications: ${successCount}`);
      console.log(`❌ Failed Verifications: ${failureCount}`);
      console.log(`🔐 ZK Proofs Generated: ${result.proofs.length}`);
      
      if (successCount > 0) {
        console.log(`\n🎉 Verification completed successfully!`);
      } else {
        console.log(`\n⚠️  All verifications failed. Please check the company name and try again.`);
      }
      
    } catch (error: any) {
      console.error(`\n💥 Fatal error during verification:`);
      console.error(`❌ ${error.message}`);
      if (error.stack) {
        console.error(`\n🔍 Stack trace:`);
        console.error(error.stack);
      }
      process.exit(1);
    }
  }
  
  main();
}
