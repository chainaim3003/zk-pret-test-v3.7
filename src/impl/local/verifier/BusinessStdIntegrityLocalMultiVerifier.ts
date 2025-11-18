/**
 * BusinessStdIntegrityLocalMultiVerifier.ts - FIXED FOLLOWING REFERENCE PATTERN
 * 
 * EXACT COPY PATTERN FROM:
 * - BusinessProcessLocalMultiVerifier.ts (infrastructure setup)
 * - BusinessStdIntegrityOptimMerkleVerificationTestWithSignUtils.ts (ZK logic)
 * - di-working-v3.6.52.txt reference (execution trace)
 * 
 * Usage:
 * npm run example-business-std:local-bol
 * node build/tests/with-sign/BusinessStdIntegrityLocalMultiVerifier.js BOL ./src/data/scf/BILLOFLADING/BOL-VALID-1.json
 */

import { 
  getBusinessStdIntegrityLocalVerifier, 
  getBusinessStdIntegrityLocalMultiVerifier 
} from '../handler/BusinessStdIntegrityLocalHandler.js';

// Type definitions following BusinessProcess pattern
interface BusinessStdIntegrityVerificationResult {
  verificationResult: boolean;
  documentData: {
    documentHash: any;
    merkleRoot: any;
    documentType: string;
    fieldsCount: number;
  };
  coreCompliance: boolean;
  enhancedCompliance: boolean;
  fieldsValidated: number;
  riskReduction: number;
  environment: string;
  timestamp: string;
  zkProofGenerated: boolean;
  merkleTreeSize: number;
  failureReason?: string;
}

interface BusinessStdIntegrityMultiVerificationResult {
  overallResult: boolean;
  totalDocuments: number;
  successfulVerifications: number;
  verificationPercentage: number;
  proofSuccessRate: number;
  averageComplianceScore: number;
  totalZKProofs: number;
  environment: string;
  timestamp: string;
  individualResults: BusinessStdIntegrityVerificationResult[];
}

interface DocumentPair {
  documentType: string;
  documentFile: string;
}

// Parse command line arguments
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
      
      console.log('\n🔧 DEBUG: About to call getBusinessStdIntegrityLocalVerifier...');
      console.log('⚠️  If hanging occurs after this message, the issue is in the LocalHandler function');
      
      const result = await getBusinessStdIntegrityLocalVerifier(documentType, documentFile);
      
      console.log('\n✅ LOCAL Business Standard Integrity Verification Completed Successfully!');
      console.log(`🎯 Result: ${result.verificationResult ? '✅ PASSED' : '❌ FAILED'}`);
      console.log(`🌍 Environment: ${result.environment}`);
      console.log(`⏰ Timestamp: ${result.timestamp}`);
      
      if (result.verificationResult) {
        console.log('\n🎉 SUCCESS: Document verification passed with REAL cryptographic proof!');
        console.log(`🔐 Document Hash: ${result.documentData.documentHash.toString().substring(0, 30)}...`);
        console.log(`🌳 Merkle Root: ${result.documentData.merkleRoot.toString().substring(0, 30)}...`);
        console.log(`📊 Core Compliance: ${result.coreCompliance ? '✅ PASSED' : '❌ FAILED'}`);
        console.log(`📈 Enhanced Compliance: ${result.enhancedCompliance ? '✅ PASSED' : '❌ FAILED'}`);
        console.log(`🔢 Fields Validated: ${result.fieldsValidated}`);
        console.log(`📉 Risk Reduction: ${result.riskReduction}%`);
      } else {
        console.log('\n❌ FAILURE: Document verification failed');
        console.log(`⚠️ Issue: Document does not meet business standard requirements`);
        if (result.failureReason) {
          console.log(`📋 Reason: ${result.failureReason}`);
        }
      }
      
    } else if (args.length % 2 === 0) {
      // Multi-document verification - EXACT pattern from BusinessProcess
      const documentCount = args.length / 2;
      console.log(`📋 Multi-Document Mode (${documentCount} documents)`);
      
      const documentPairs: DocumentPair[] = [];
      for (let i = 0; i < args.length; i += 2) {
        documentPairs.push({
          documentType: args[i],
          documentFile: args[i + 1]
        });
        console.log(`🔍 Document ${Math.floor(i / 2) + 1}: ${args[i]} (${args[i + 1]})`);
      }
      
      const result = await getBusinessStdIntegrityLocalMultiVerifier(documentPairs);
      
      console.log('\n✅ LOCAL Multi-Document Verification Completed Successfully!');
      console.log(`🎯 Overall Result: ${result.overallResult ? '✅ ALL PASSED' : '❌ SOME FAILED'}`);
      console.log(`📊 Success Rate: ${result.verificationPercentage}%`);
      console.log(`📈 Successful: ${result.successfulVerifications}/${result.totalDocuments}`);
      console.log(`🔧 Proof Success Rate: ${result.proofSuccessRate}%`);
      console.log(`🌍 Environment: ${result.environment}`);
      console.log(`⏰ Timestamp: ${result.timestamp}`);
      
      if (result.overallResult) {
        console.log('\n🎉 SUCCESS: All documents verified with REAL cryptographic proofs!');
        console.log(`✅ All ${result.totalDocuments} documents passed verification`);
        console.log(`🔐 Total ZK Proofs Generated: ${result.totalZKProofs}`);
        console.log(`📊 Average Compliance Score: ${result.averageComplianceScore}%`);
      } else {
        console.log('\n⚠️ PARTIAL SUCCESS: Some documents failed verification');
        console.log(`📊 ${result.successfulVerifications} out of ${result.totalDocuments} documents passed`);
        
        // Show failed documents - EXACT pattern from BusinessProcess
        const failedDocuments = result.individualResults.filter((r: BusinessStdIntegrityVerificationResult) => !r.verificationResult);
        if (failedDocuments.length > 0) {
          console.log('\n❌ Failed Documents:');
          failedDocuments.forEach((doc: BusinessStdIntegrityVerificationResult, index: number) => {
            console.log(`  ${index + 1}. ${doc.documentData.documentType}: Compliance failure`);
            console.log(`     Fields: ${doc.fieldsValidated}/24 validated`);
            console.log(`     Issue: ${doc.failureReason || 'Business standard requirements not met'}`);
          });
        }
      }
      
    } else {
      console.error('❌ Error: Invalid argument count. Arguments must be in pairs.');
      console.error('Format: <DOCUMENT_TYPE> <DOCUMENT_FILE>');
      process.exit(1);
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