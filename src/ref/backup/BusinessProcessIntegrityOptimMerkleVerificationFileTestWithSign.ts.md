import { BusinessProcessIntegrityOptimMerkleTestUtils } from './BusinessProcessIntegrityOptimMerkleVerificationFileTestWithSignUtils.js';
import parseBpmn from '../../utils/parsebpmn.js';
import { Field,CircuitString } from 'o1js';

/**
 * Business Process Integrity OptimMerkle Verification Test (Main Entry Point)
 * 
 * This test demonstrates OptimMerkle-enhanced BPMN process verification while maintaining
 * complete backward compatibility with the existing system.
 * 
 * Key Features:
 * - Same BPMN file inputs as existing system
 * - Same ZK regex circuits (verifyProcessSCF, verifyProcessSTABLECOIN, verifyProcessDVP)
 * - Enhanced with Poseidon hashing, Merkle trees, and advanced oracle signatures
 * - Zero breaking changes to existing code
 * 
 * Usage:
 * node ./build/tests/with-sign/BusinessProcessIntegrityOptimMerkleVerificationFileTestWithSign.js 
 * SCF 
 * ./src/data/scf/process/EXPECTED/bpmn-SCF-Example-Process-Expected.bpmn
 * ./src/data/scf/process/ACTUAL/bpmn-SCF-Example-Execution-Actual-Accepted-1.bpmn
 */

// Parse command line arguments (same as existing system)
const [, , bpmnGroupID,businessProcessType, expectedBPMNFileName, actualBPMNFileName] = process.argv;

async function main() {
  console.log('🌳 Business Process Integrity OptimMerkle Verification Test');
  console.log('=' .repeat(80));
  console.log('🎯 Enhanced BPMN verification with OptimMerkle security');
  console.log('🔄 Maintaining full backward compatibility with existing ZK regex');
  console.log('');
  
  // Validate command line arguments
  if (!businessProcessType || !expectedBPMNFileName || !actualBPMNFileName) {
    console.error('❌ Error: Missing required arguments');
    console.error('Usage: node BusinessProcessIntegrityOptimMerkleVerificationFileTestWithSign.js <PROCESS_TYPE> <EXPECTED_BPMN> <ACTUAL_BPMN>');
    console.error('Example: node BusinessProcessIntegrityOptimMerkleVerificationFileTestWithSign.js SCF expected.bpmn actual.bpmn');
    process.exit(1);
  }
  
  console.log('📂 Input Files:');
  console.log('  Expected BPMN:', expectedBPMNFileName);
  console.log('  Actual BPMN:', actualBPMNFileName);
  console.log('  Process Type:', businessProcessType);
  console.log('');
  
  try {
    // ===== STEP 1: PARSE BPMN FILES (same as existing system) =====
    console.log('📋 Parsing BPMN files...');
    const expectedPath = await parseBpmn(expectedBPMNFileName) || "";
    const actualPath = await parseBpmn(actualBPMNFileName) || "";
    
    if (!expectedPath || !actualPath) {
      throw new Error('Failed to parse BPMN files. Please check file paths and content.');
    }
    
    console.log('✅ BPMN files parsed successfully');
    console.log('📋 Expected Pattern:', expectedPath);
    console.log('🎯 Actual Path:', actualPath);
    console.log('');
    
    // ===== STEP 2: RUN OPTIMERKLE VERIFICATION =====
    console.log('🚀 Starting OptimMerkle Enhanced Verification...');
    console.log('');
    //const bpmnGroupIDStr = bpmnGroupID.toString();
    const bpmnGroupIDCircuit = CircuitString.fromString(bpmnGroupID);

    const result = await BusinessProcessIntegrityOptimMerkleTestUtils.runOptimMerkleVerification(
      bpmnGroupIDCircuit,
      businessProcessType, 
      expectedPath, 
      actualPath,
      {
        expectedFile: expectedBPMNFileName,
        actualFile: actualBPMNFileName
      }
    );
    
    // ===== STEP 3: DISPLAY RESULTS =====
    console.log('');
    console.log('🏆 FINAL OPTIMERKLE VERIFICATION RESULTS:');
    console.log('=' .repeat(60));
    
    if (result.success) {
      console.log('🎉 SUCCESS: OptimMerkle Process Verification PASSED!');
      console.log('');
      console.log('📊 Verification Components:');
      console.log(`   🔍 ZK Regex Validation:    ${result.zkRegexResult ? '✅ PASS' : '❌ FAIL'}`);
      console.log(`   ✍️ Oracle Signature:       ${result.oracleVerified ? '✅ PASS' : '❌ FAIL'}`);
      console.log(`   🧾 Merkle Verification:    ${result.merkleVerified ? '✅ PASS' : '❌ FAIL'}`);
      console.log('');
      console.log('🔐 Cryptographic Evidence:');
      console.log(`   🌳 Merkle Root: ${result.merkleRoot?.slice(0, 40)}...`);
      console.log(`   🔐 Process Hash: ${result.processHash?.slice(0, 40)}...`);
      console.log('');
      console.log('🌟 OptimMerkle Enhancements:');
      console.log('   ✅ Poseidon hash-based data integrity');
      console.log('   ✅ Merkle tree for efficient batch verification');
      console.log('   ✅ Enhanced oracle signature verification');
      console.log('   ✅ Selective disclosure capability');
      console.log('   ✅ Full backward compatibility maintained');
      console.log('');
      console.log('🎯 Process Compliance: VERIFIED IN ZERO KNOWLEDGE');
      
    } else {
      console.log('❌ FAILURE: OptimMerkle Process Verification FAILED');
      console.error('💥 Error Details:', result.error);
      console.log('');
      console.log('🔍 Troubleshooting:');
      console.log('   • Check BPMN file paths and accessibility');
      console.log('   • Verify process type is valid (SCF, STABLECOIN, DVP)');
      console.log('   • Ensure oracle service is accessible');
      console.log('   • Check network connectivity for oracle data');
      
      process.exit(1);
    }
    
  } catch (error) {
    console.error('');
    console.error('💥 CRITICAL ERROR:', (error as Error).message);
    console.error('🚨 Stack trace:', (error as Error).stack);
    console.error('');
    console.error('🔧 Please check:');
    console.error('   • File paths are correct and accessible');
    console.error('   • BPMN files are valid and properly formatted');
    console.error('   • All dependencies are installed');
    console.error('   • Network connection for oracle services');
    
    process.exit(1);
  }
}

// Handle uncaught exceptions gracefully
process.on('uncaughtException', (error) => {
  console.error('');
  console.error('💥 UNCAUGHT EXCEPTION:', error.message);
  console.error('🚨 Stack trace:', error.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('');
  console.error('💥 UNHANDLED REJECTION at:', promise);
  console.error('🚨 Reason:', reason);
  process.exit(1);
});

// Run the main function
main().catch((error) => {
  console.error('');
  console.error('💥 MAIN FUNCTION ERROR:', error.message);
  console.error('🚨 Stack trace:', error.stack);
  process.exit(1);
});
