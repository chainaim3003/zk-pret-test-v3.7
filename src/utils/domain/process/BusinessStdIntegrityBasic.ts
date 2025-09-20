
import { Field} from 'o1js';
import {getBusinessStdIntegrityLocalVerifier} from './BusinessStdIntegrityBasicUtils.js';
import * as fs from 'fs';
import * as dotenv from 'dotenv';


// Load environment variables
dotenv.config();

const args = process.argv.slice(2);

async function main() {
  console.log('\n🏠 Business Standard Integrity LOCAL Multi-Verifier');
  console.log('='.repeat(60));
  console.log('✅ REAL ZK Proofs: Uses actual BusinessStdIntegrityOptimMerkleVerifier');
  console.log('✅ REAL Merkle Trees: All cryptographic operations are genuine');
  
  console.log('\n🔍 DEBUG: Main function started');
  console.log(`📋 Arguments received: ${args.length}`);
  console.log(`📂 Args: ${JSON.stringify(args)}`);
  
  // Validate arguments - EXACT pattern from BusinessProcess
  if (args.length < 2) {
    console.error('❌ Error: Missing required arguments');
    console.error('Usage (Single): node BusinessStdIntegrityLocalMultiVerifier.js <DOC_TYPE> <DOC_FILE>');
    console.error('Usage (Multi): node BusinessStdIntegrityLocalMultiVerifier.js <TYPE1> <FILE1> <TYPE2> <FILE2> ...');
    console.error('Example (Single): node BusinessStdIntegrityLocalMultiVerifier.js BOL ./src/data/scf/BILLOFLADING/BOL-VALID-1.json');
    console.error('Example (Multi): node BusinessStdIntegrityLocalMultiVerifier.js BOL file1.json AWB file2.json');
    process.exit(1);
  }

  try {
    if (args.length === 2) {
      // Single document verification - EXACT pattern from BusinessProcess
      console.log('📋 Single Document Mode');
      const [documentType, documentFile] = args;
      
      console.log(`🔍 Processing: ${documentType}`);
      console.log(`📂 Document: ${documentFile}`);
      //Load and validate document data - EXACT pattern
        console.log(`\n📂 Loading document data from: ${documentFile}`);
        if (!fs.existsSync(documentFile)) {
            throw new Error(`File not found: ${documentFile}`);
        }
        
        const documentDataRaw = fs.readFileSync(documentFile, 'utf8');
        const documentData = JSON.parse(documentDataRaw);
      console.log('\n🔧 DEBUG: About to call getBusinessStdIntegrityLocalVerifier...');
      console.log('⚠️  If hanging occurs after this message, the issue is in the LocalHandler function');
      
      const result = await getBusinessStdIntegrityLocalVerifier(documentType, documentData);
      
      console.log('\n✅ LOCAL Business Standard Integrity Verification Completed Successfully!');
      console.log(`🎯 Result: ${result.verificationResult ? '✅ PASSED' : '❌ FAILED'}`);
      console.log(`🌍 Environment: ${result.environment}`);
      console.log(`⏰ Timestamp: ${result.timestamp}`);      
    }
    
  } catch (error) {
    console.error('\n❌ LOCAL Business Standard Integrity Verification Failed:', error);
    if (error instanceof Error) {
      console.error('Error Message:', error.message);
      if (error.stack) {
        console.error('Stack Trace:', error.stack);
      }
    }
    console.log('\n🔧 TROUBLESHOOTING TIPS:');
    console.log('  1. Ensure document file exists and is valid JSON');
    console.log('  2. Check that all required 24 fields are present');
    console.log('  3. Verify zkRegex patterns match document content');
    console.log('  4. Ensure BUILD_ENV is properly configured');
    console.log('  5. Check Oracle Registry initialization');
    process.exit(1);
  }
}

// Execute main function immediately
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});