/**
 * BusinessProcessNetworkMultiVerifier.ts - NETWORK Multi-Process Entry Point  
 * RENAMED FROM: BusinessProcessNetworkVerifier.ts
 * ENHANCED: Support for multiple process verification
 * Parallel to GLEIFNetworkMultiVerifier.ts naming pattern
 * 
 * Usage:
 * node ./build/tests/with-sign/BusinessProcessNetworkMultiVerifier.js STABLECOIN expected.bpmn actual.bpmn
 * node ./build/tests/with-sign/BusinessProcessNetworkMultiVerifier.js STABLECOIN exp1.bpmn act1.bpmn SCF exp2.bpmn act2.bpmn
 */

import { Field,CircuitString } from 'o1js';
import { 
  runBusinessProcessTestWithFundedAccounts,
  runMultiBusinessProcessTestWithFundedAccounts
} from '../handler/BusinessProcessNetworkHandler.js';

// Type definitions for network transactions
interface NetworkTransaction {
  processType: string;
  transactionHash: string | null;
  status: string;
}

interface NetworkVerificationResult {
  transactions: NetworkTransaction[];
  [key: string]: any;
}

// Parse command line arguments
const args = process.argv.slice(2);

/**
 * Main verification function
 * ENHANCED: Support for both single and multi-process verification
 * PARALLEL TO: GLEIFNetworkMultiVerifier.verifyGLEIFMultiCompanyCompliance()
 */
async function verifyBusinessProcessCompliance(): Promise<void> {
  console.log('\n🌐 Business Process NETWORK Multi-Verifier Started');
  console.log('='.repeat(60));
  
  // Determine network type from environment
  const networkType = (process.env.NETWORK_TYPE as 'testnet' | 'mainnet') || 'testnet';
  
  // Determine if single or multi-process mode
  const isMultiProcess = args.length > 4 && args.length % 4 === 0;
  const processCount = isMultiProcess ? args.length / 4 : 1;
  
  console.log(`📊 Mode: ${isMultiProcess ? 'Multi-Process' : 'Single Process'}`);
  console.log(`📋 Process Count: ${processCount}`);
  console.log(`🌍 Network: ${networkType.toUpperCase()}`);
  console.log('='.repeat(60));

  try {
    console.log('\n🚀 Starting enhanced business process verification...');
    
    let result;
    
    if (isMultiProcess) {
      // Multi-process verification
      const processFilePairs = [];
      for (let i = 0; i < args.length; i += 4) {
        processFilePairs.push({
          bpmnGroupID:args[i],
          processType: args[i+1],
          expectedBPMNFile: args[i + 2],
          actualBPMNFile: args[i + 3]
        });
        
        console.log(`📂 Process ${Math.floor(i/4) + 1}: ${args[i]} (${args[i + 1]} vs ${args[i + 2]})`);
      }
      
      result = await runMultiBusinessProcessTestWithFundedAccounts(processFilePairs, networkType);
      
      console.log('\n✅ Business Process NETWORK Multi-Verification Completed Successfully!');
      console.log(`🎯 Overall Result: ${result.overallResult ? '✅ ALL PASSED' : '❌ SOME FAILED'}`);
      console.log(`📊 Process Success Rate: ${result.verificationPercentage}%`);
      console.log(`🔧 Proof Success Rate: ${result.proofSuccessRate}%`);
      console.log(`📡 Network Success Rate: ${result.networkSuccessRate}%`);
      console.log(`📈 Successful Verifications: ${result.successfulVerifications}/${result.totalProcesses}`);
      
      // Show transaction details
      if (result.transactions && result.transactions.length > 0) {
        const successfulTxns = result.transactions.filter((t: NetworkTransaction) => t.transactionHash);
        console.log(`\n📡 Network Submissions: ${successfulTxns.length}/${result.transactions.length}`);
        
        if (successfulTxns.length > 0) {
          console.log('\n🔗 Transaction Details:');
          successfulTxns.forEach((txn: NetworkTransaction, index: number) => {
            console.log(`  ${index + 1}. ${txn.processType}:`);
            console.log(`     Hash: ${txn.transactionHash}`);
            console.log(`     Explorer: https://minascan.io/${networkType}/tx/${txn.transactionHash}`);
          });
        }
        
        const failedTxns = result.transactions.filter((t: NetworkTransaction) => !t.transactionHash);
        if (failedTxns.length > 0) {
          console.log('\n❌ Failed Network Submissions:');
          failedTxns.forEach((txn: NetworkTransaction, index: number) => {
            console.log(`  ${index + 1}. ${txn.processType}: ${txn.status}`);
          });
        }
      }
      
    } else {
      // Single process verification
      const [bpmnGroupID,processType, expectedFile, actualFile] = args;
      
      console.log(`📂 Single Process: ${processType} (${expectedFile} vs ${actualFile})`);
      const bpmnGroupIDCircuit = CircuitString.fromString(bpmnGroupID);
      result = await runBusinessProcessTestWithFundedAccounts(
        bpmnGroupIDCircuit,
        processType,
        expectedFile,
        actualFile,
        networkType
      );
      
      console.log('\n✅ Business Process NETWORK Verification Completed Successfully!');
      
      // ✅ O1JS BEST PRACTICE: Validate result object before accessing properties
      if (result && typeof result.verificationResult !== 'undefined') {
        console.log(`🎯 Verification Result: ${result.verificationResult ? '✅ PASSED' : '❌ FAILED'}`);
      } else {
        console.log('❌ Verification Result: UNDEFINED - Transaction failed');
        console.error('Result object:', result);
      }
      
      if (result?.transactionHash) {
        console.log(`📡 Network Submitted: ✅ YES`);
        console.log(`🔗 Transaction Hash: ${result.transactionHash}`);
        console.log(`🔍 Explorer: ${result.explorerUrl}`);
      } else {
        console.log(`📡 Network Submitted: ❌ NO`);
        console.log(`⚠️ Verification completed locally only`);
      }
      
      if (result.verificationResult) {
        console.log('\n🎉 SUCCESS: Process verification passed with cryptographic proof!');
        console.log(`🔐 Process Hash: ${result.processData.processHash.toString().substring(0, 30)}...`);
        console.log(`🌳 Merkle Root: ${result.processData.merkleRoot.toString().substring(0, 30)}...`);
      } else {
        console.log('\n❌ FAILURE: Process verification failed');
        console.log(`⚠️ Issue: Process path does not match expected pattern`);
      }
    }
    
    // Common result logging
    console.log(`\n📊 Final Summary:`);
    console.log(`🌍 Environment: ${result.environment}`);
    console.log(`⏰ Timestamp: ${result.timestamp}`);
    
    if (result.environment !== 'LOCAL') {
      console.log(`\n🔗 Network Information:`);
      console.log(`   • Network: ${networkType.toUpperCase()}`);
      console.log(`   • Explorer: https://minascan.io/${networkType}/`);
      
      if (process.env.FUNDED_ACCOUNT_PRIVATE_KEY) {
        console.log(`   • Using funded account from environment`);
      } else {
        console.log(`   • Using local oracle key (for development only)`);
      }
    }

  } catch (error) {
    console.error('\n❌ Business Process NETWORK Verification Failed');
    if (error instanceof Error) {
      console.error('Error:', error.message);
      console.error('Stack:', error.stack);
    } else {
      console.error('Unknown error:', error);
    }
    throw error;
  }
}

async function main() {
  console.log('\n🔧 Business Process NETWORK Multi-Verifier Test');
  
  // Validate arguments
  if (args.length < 4) {
    console.error('❌ Error: Missing required arguments');
    console.error('Usage (Single): node BusinessProcessNetworkMultiVerifier.js <PROCESS_TYPE> <EXPECTED_BPMN> <ACTUAL_BPMN>');
    console.error('Usage (Multi): node BusinessProcessNetworkMultiVerifier.js <TYPE1> <EXP1> <ACT1> <TYPE2> <EXP2> <ACT2> ...');
    console.error('Example (Single): node BusinessProcessNetworkMultiVerifier.js STABLECOIN expected.bpmn actual.bpmn');
    console.error('Example (Multi): node BusinessProcessNetworkMultiVerifier.js STABLECOIN exp1.bpmn act1.bpmn SCF exp2.bpmn act2.bpmn');
    console.error('\nEnvironment Variables:');
    console.error('  NETWORK_TYPE=testnet|mainnet (default: testnet)');
    console.error('  FUNDED_ACCOUNT_PRIVATE_KEY=<base58_private_key> (for network transactions)');
    process.exit(1);
  }

  // Validate multi-process format
  if (args.length > 4 && args.length % 4 !== 0) {
    console.error('❌ Error: Invalid argument count for multi-process mode');
    console.error('Multi-process arguments must be in groups of 4: <PROCESS_TYPE> <EXPECTED_BPMN> <ACTUAL_BPMN>');
    process.exit(1);
  }

  try {
    await verifyBusinessProcessCompliance();
    console.log('\n🎉 Business Process NETWORK verification completed successfully!');
  } catch (error) {
    console.error('\n💥 Business Process verification failed:', error);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('💥 Fatal Error:', err);
  process.exit(1);
});
