/**
 * BusinessProcessLocalMultiVerifier.ts - LOCAL Multi-Process Entry Point
 * RENAMED FROM: BusinessProcessLocalVerifier.ts
 * ENHANCED: Support for multiple process verification
 * Parallel to GLEIFLocalMultiVerifierUtils.ts naming pattern
 * 
 * Usage:
 * npm run test:local-business-process-multi STABLECOIN expected1.bpmn actual1.bpmn SCF expected2.bpmn actual2.bpmn
 * npm run test:local-stablecoin STABLECOIN expected.bpmn actual.bpmn (single process)
 */

import { 
  getBusinessProcessLocalVerifier, 
  getBusinessProcessLocalMultiVerifier 
} from '../handler/BusinessProcessLocalHandler.js';
import { ProcessAnalysis } from '../../verification-base/BusinessProcessVerificationBase.js';
import { Field,CircuitString } from 'o1js';

// Type definitions for better TypeScript support
interface LocalVerificationResult {
  bpmngroupid : CircuitString;
  businessProcessType: string;
  expectedPath: string;
  actualPath: string;
  processAnalysis: ProcessAnalysis;
  processData: any;
  proof: any;
  verificationResult: boolean;
  timestamp: string;
  environment: string;
}

interface MultiProcessVerificationResult {
  totalProcesses: number;
  successfulVerifications: number;
  verificationPercentage: number;
  proofSuccessRate: number;
  overallResult: boolean;
  individualResults: ProcessAnalysis[];
  processData: any[];
  proofs: any[];
  timestamp: string;
  environment: string;
}

// Parse command line arguments
const args = process.argv.slice(2);

async function main() {
  console.log('\n🏠 Business Process LOCAL Multi-Verifier');
  console.log('='.repeat(50));
  
  // Validate arguments
  if (args.length < 4) {
    console.error('❌ Error: Missing required arguments');
    console.error('Usage (Single): node BusinessProcessLocalMultiVerifier.js <PROCESS_TYPE> <EXPECTED_BPMN> <ACTUAL_BPMN>');
    console.error('Usage (Multi): node BusinessProcessLocalMultiVerifier.js <TYPE1> <EXP1> <ACT1> <TYPE2> <EXP2> <ACT2> ...');
    console.error('Example (Single): node BusinessProcessLocalMultiVerifier.js STABLECOIN expected.bpmn actual.bpmn');
    console.error('Example (Multi): node BusinessProcessLocalMultiVerifier.js STABLECOIN exp1.bpmn act1.bpmn SCF exp2.bpmn act2.bpmn');
    process.exit(1);
  }
  
  try {
    if (args.length === 4) {
      // Single process verification
      console.log('📋 Single Process Mode');
      const [groupID,processType, expectedFile, actualFile] = args;
      
      console.log(`🔍 Processing: ${processType}`);
      console.log(`📂 Expected: ${expectedFile}`);
      console.log(`📂 Actual: ${actualFile}`);
      const droupIDCircuit = CircuitString.fromString(groupID);
      const result = await getBusinessProcessLocalVerifier(
        droupIDCircuit,
        processType,
        expectedFile,
        actualFile
      );
      
      console.log('\n✅ LOCAL Business Process Verification Completed Successfully!');
      console.log(`🎯 Result: ${result.verificationResult ? '✅ PASSED' : '❌ FAILED'}`);
      console.log(`🌍 Environment: ${result.environment}`);
      console.log(`⏰ Timestamp: ${result.timestamp}`);
      
      if (result.verificationResult) {
        console.log('\n🎉 SUCCESS: Process verification passed with cryptographic proof!');
        console.log(`🔐 Process Hash: ${result.processData.processHash.toString().substring(0, 30)}...`);
        console.log(`🌳 Merkle Root: ${result.processData.merkleRoot.toString().substring(0, 30)}...`);
      } else {
        console.log('\n❌ FAILURE: Process verification failed');
        console.log(`⚠️ Issue: Process path does not match expected pattern`);
      }
      
    } else if (args.length % 4 === 0) {
      // Multi-process verification
      const processCount = args.length / 4;
      console.log(`📋 Multi-Process Mode (${processCount} processes)`);
      
      const processFilePairs = [];
      for (let i = 0; i < args.length; i += 4) {
        processFilePairs.push({
          groupID : CircuitString.fromString(args[i]),
          processType: args[i+1],
          expectedBPMNFile: args[i + 2],
          actualBPMNFile: args[i + 3]
        });
        console.log(`🔍 Process ${Math.floor(i/4) + 1}: ${args[i]} (${args[i + 1]} vs ${args[i + 2]})`);
      }
      
      const result = await getBusinessProcessLocalMultiVerifier(processFilePairs);
      
      console.log('\n✅ LOCAL Multi-Process Verification Completed Successfully!');
      console.log(`🎯 Overall Result: ${result.overallResult ? '✅ ALL PASSED' : '❌ SOME FAILED'}`);
      console.log(`📊 Success Rate: ${result.verificationPercentage}%`);
      console.log(`📈 Successful: ${result.successfulVerifications}/${result.totalProcesses}`);
      console.log(`🔧 Proof Success Rate: ${result.proofSuccessRate}%`);
      console.log(`🌍 Environment: ${result.environment}`);
      console.log(`⏰ Timestamp: ${result.timestamp}`);
      
      if (result.overallResult) {
        console.log('\n🎉 SUCCESS: All processes verified with cryptographic proofs!');
        console.log(`✅ All ${result.totalProcesses} processes passed verification`);
      } else {
        console.log('\n⚠️ PARTIAL SUCCESS: Some processes failed verification');
        console.log(`📊 ${result.successfulVerifications} out of ${result.totalProcesses} processes passed`);
        
        // Show failed processes
        const failedProcesses = result.individualResults.filter((r: ProcessAnalysis) => !r.verificationResult);
        if (failedProcesses.length > 0) {
          console.log('\n❌ Failed Processes:');
          failedProcesses.forEach((process: ProcessAnalysis, index: number) => {
            console.log(`  ${index + 1}. ${process.processType}: Path mismatch`);
            console.log(`     Expected: ${process.expectedPattern}`);
            console.log(`     Actual: ${process.actualPath}`);
          });
        }
      }
      
    } else {
      console.error('❌ Error: Invalid argument count. Arguments must be in groups of 4.');
      console.error('Format: <PROCESS_TYPE> <EXPECTED_BPMN> <ACTUAL_BPMN>');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n❌ LOCAL Business Process Verification Failed:', error);
    if (error instanceof Error) {
      console.error('Error Message:', error.message);
      if (error.stack) {
        console.error('Stack Trace:', error.stack);
      }
    }
    process.exit(1);
  }
}

main().catch(err => {
  console.error('💥 Fatal Error:', err);
  process.exit(1);
});
