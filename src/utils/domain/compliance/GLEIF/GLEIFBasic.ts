import { isCompanyGLEIFCompliant } from "./GLEIFBasicUtils.js";
async function main() {
  try {
    // Get company name from CLI args (default fallback)
    const companyName = process.argv[2] ;

    console.log(`\n🏁 Starting compliance check for: ${companyName}\n`);

    // Call compliance check
    const isCompliant = await isCompanyGLEIFCompliant(companyName);

    console.log(`\n📊 Compliance Result:`);
    console.log(`   Company: ${companyName}`);
    console.log(`   Compliant: ${isCompliant ? "✅ YES" : "❌ NO"}`);

    process.exit(0);
  } catch (err: any) {
    console.error(`\n🚨 Error in main(): ${err.message}`);
    process.exit(1);
  }
}

// If this file is executed directly (not imported), run main
main();