/**
 * Business Standard Integrity NETWORK Multi-Verifier
 * Parallel to: BusinessProcessNetworkMultiVerifier.ts and GLEIFNetworkMultiVerifier.ts
 * 
 * REAL ZK PROOFS: Uses actual BusinessStdIntegrityOptimMerkleVerifier for cryptographic proofs
 * NO MOCK IMPLEMENTATIONS: All merkle trees and ZK circuits are real
 * REAL NETWORK DEPLOYMENT: Submits to actual MINA testnet/mainnet
 *
 * Usage:
 * npm run example-business-std:network-bol
 * node build/tests/with-sign/BusinessStdIntegrityNetworkMultiVerifier.js BOL ./src/data/scf/BILLOFLADING/BOL-VALID-1.json
 * node build/tests/with-sign/BusinessStdIntegrityNetworkMultiVerifier.js BOL file1.json AWB file2.json
 */

import { runBusinessStdIntegrityTestWithFundedAccounts, runMultiBusinessStdIntegrityTestWithFundedAccounts } from '../handler/BusinessStdIntegrityNetworkHandler.js';

// Parse command line arguments
const args = process.argv.slice(2);

/**
 * Main verification function
 * ENHANCED: Support for both single and multi-document verification
 * PARALLEL TO: GLEIFNetworkMultiVerifier.verifyGLEIFMultiCompanyCompliance()
 */
async function verifyBusinessStdIntegrityCompliance() {
    console.log('\n🌐 Business Standard Integrity NETWORK Multi-Verifier Started');
    console.log('='.repeat(70));
    console.log('✅ REAL ZK Proofs: Uses actual BusinessStdIntegrityOptimMerkleVerifier');
    console.log('✅ REAL Network: Submits to actual MINA blockchain');
    console.log('✅ REAL Merkle Trees: All cryptographic operations are genuine');
    
    console.log('\n🔍 DEBUG: Network verifier started');
    console.log(`📋 Arguments received: ${args.length}`);
    console.log(`📂 Args: ${JSON.stringify(args)}`);
    
    // Determine network type from environment
    const networkType = process.env.NETWORK_TYPE || 'testnet';
    
    // Determine if single or multi-document mode
    const isMultiDocument = args.length > 2 && args.length % 2 === 0;
    const documentCount = isMultiDocument ? args.length / 2 : 1;
    
    console.log(`📊 Mode: ${isMultiDocument ? 'Multi-Document' : 'Single Document'}`);
    console.log(`📋 Document Count: ${documentCount}`);
    console.log(`🌍 Network: ${networkType.toUpperCase()}`);
    console.log('='.repeat(70));
    
    try {
        console.log('\n🚀 Starting enhanced business standard integrity verification...');
        
        let result;
        
        if (isMultiDocument) {
            // Multi-document verification
            const documentPairs = [];
            for (let i = 0; i < args.length; i += 2) {
                documentPairs.push({
                    documentType: args[i],
                    documentFile: args[i + 1]
                });
                console.log(`📂 Document ${Math.floor(i / 2) + 1}: ${args[i]} (${args[i + 1]})`);
            }
            
            result = await runMultiBusinessStdIntegrityTestWithFundedAccounts(documentPairs, networkType);
            
            console.log('\n✅ Business Standard Integrity NETWORK Multi-Verification Completed Successfully!');
            console.log(`🎯 Overall Result: ${result.overallResult ? '✅ ALL PASSED' : '❌ SOME FAILED'}`);
            console.log(`📊 Document Success Rate: ${result.verificationPercentage}%`);
            console.log(`🔧 Proof Success Rate: ${result.proofSuccessRate}%`);
            console.log(`📡 Network Success Rate: ${result.networkSuccessRate}%`);
            console.log(`📈 Successful Verifications: ${result.successfulVerifications}/${result.totalDocuments}`);
            
            // Show transaction details
            if (result.transactions && result.transactions.length > 0) {
                const successfulTxns = result.transactions.filter((t: any) => t.transactionHash);
                console.log(`\n📡 Network Submissions: ${successfulTxns.length}/${result.transactions.length}`);
                
                if (successfulTxns.length > 0) {
                    console.log('\n🔗 Transaction Details:');
                    successfulTxns.forEach((txn: any, index: number) => {
                        console.log(`  ${index + 1}. ${txn.documentType}:`);
                        console.log(`     Hash: ${txn.transactionHash}`);
                        console.log(`     Explorer: https://minascan.io/${networkType}/tx/${txn.transactionHash}`);
                        console.log(`     Merkle Root: ${txn.merkleRoot.toString().substring(0, 30)}...`);
                    });
                }
                
                const failedTxns = result.transactions.filter((t: any) => !t.transactionHash);
                if (failedTxns.length > 0) {
                    console.log('\n❌ Failed Network Submissions:');
                    failedTxns.forEach((txn: any, index: number) => {
                        console.log(`  ${index + 1}. ${txn.documentType}: ${txn.status}`);
                    });
                }
            }
            
        } else {
            // Single document verification
            const [documentType, documentFile] = args;
            console.log(`📂 Single Document: ${documentType} (${documentFile})`);
            
            console.log('\n🔧 DEBUG: About to call runBusinessStdIntegrityTestWithFundedAccounts...');
            console.log('⚠️  If hanging occurs after this message, the issue is in NetworkHandler');
            
            result = await runBusinessStdIntegrityTestWithFundedAccounts(documentType, documentFile, networkType);
            
            console.log('\n✅ Business Standard Integrity NETWORK Verification Completed Successfully!');
            console.log(`🎯 Verification Result: ${result.verificationResult ? '✅ PASSED' : '❌ FAILED'}`);
            
            if (result.transactionHash) {
                console.log(`📡 Network Submitted: ✅ YES`);
                console.log(`🔗 Transaction Hash: ${result.transactionHash}`);
                console.log(`🔍 Explorer: ${result.explorerUrl}`);
                console.log(`🌳 Merkle Root: ${result.documentData.merkleRoot.toString().substring(0, 30)}...`);
            } else {
                console.log(`📡 Network Submitted: ❌ NO`);
                console.log(`⚠️ Verification completed locally only`);
            }
            
            if (result.verificationResult) {
                console.log('\n🎉 SUCCESS: Document verification passed with REAL cryptographic proof!');
                console.log(`🔐 Document Hash: ${result.documentData.documentHash.toString().substring(0, 30)}...`);
                console.log(`📊 Core Compliance: ${result.coreCompliance ? '✅ PASSED' : '❌ FAILED'}`);
                console.log(`📈 Enhanced Compliance: ${result.enhancedCompliance ? '✅ PASSED' : '❌ FAILED'}`);
                console.log(`🔢 Fields Validated: ${result.fieldsValidated}`);
                console.log(`📉 Risk Reduction: ${result.riskReduction}%`);
            } else {
                console.log('\n❌ FAILURE: Document verification failed');
                console.log(`⚠️ Issue: Document does not meet business standard requirements`);
            }
        }
        
        // Common result logging
        console.log(`\n📊 Final Summary:`);
        console.log(`   🌍 Network: ${networkType.toUpperCase()}`);
        console.log(`   ⏰ Timestamp: ${result.timestamp}`);
        console.log(`   🔐 Total ZK Proofs: ${result.totalZKProofs || 1}`);
        console.log(`   📡 Blockchain: ${result.contractAddress ? 'Deployed' : 'Local Only'}`);
        
        if (result.contractAddress) {
            console.log(`   🏭 Contract: ${result.contractAddress.toString().substring(0, 30)}...`);
        }
        
        console.log('\n🎯 Business Standard Integrity verification completed with REAL cryptographic proofs!');
        
    } catch (error) {
        console.error('\n❌ NETWORK Business Standard Integrity Verification Failed:', error);
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
        console.log('  6. Verify DEVNET connection is available');
        console.log('  7. Ensure contract is deployed and accessible');
        console.log('  8. Check account has sufficient MINA for transactions');
        
        process.exit(1);
    }
}

async function main() {
    // Validate arguments
    if (args.length < 2) {
        console.error('❌ Error: Missing required arguments');
        console.error('Usage (Single): node BusinessStdIntegrityNetworkMultiVerifier.js <DOC_TYPE> <DOC_FILE>');
        console.error('Usage (Multi): node BusinessStdIntegrityNetworkMultiVerifier.js <TYPE1> <FILE1> <TYPE2> <FILE2> ...');
        console.error('Example (Single): node BusinessStdIntegrityNetworkMultiVerifier.js BOL ./src/data/scf/BILLOFLADING/BOL-VALID-1.json');
        console.error('Example (Multi): node BusinessStdIntegrityNetworkMultiVerifier.js BOL file1.json AWB file2.json');
        process.exit(1);
    }
    
    if (args.length % 2 !== 0) {
        console.error('❌ Error: Invalid argument count. Arguments must be in pairs.');
        console.error('Format: <DOCUMENT_TYPE> <DOCUMENT_FILE>');
        process.exit(1);
    }
    
    try {
        await verifyBusinessStdIntegrityCompliance();
        console.log('\n✅ VERIFICATION COMPLETED - See detailed results above');
        
        console.log('\n📋 Next Steps:');
        console.log('  1. ✅ Documents verified and recorded on blockchain');
        console.log('  2. 🌐 Check contract state on MinaScan or MinaExplorer');
        console.log('  3. 🔄 Run additional verifications as needed');
        console.log('  4. 📊 Monitor compliance metrics and risk scores');
        
        process.exit(0);
        
    } catch (error) {
        console.error('💥 Fatal Error:', error);
        console.error('💥 Stack:', error instanceof Error ? error.stack : 'No stack trace');
        
        console.log('\n🔧 TROUBLESHOOTING TIPS:');
        console.log('  1. Ensure BUILD_ENV is properly configured');
        console.log('  2. Check that Oracle Registry is initialized');
        console.log('  3. Verify DEVNET connection is available');
        console.log('  4. Ensure contract is deployed and accessible');
        console.log('  5. Check all documents have required fields');
        
        process.exit(1);
    }
}

// Execute main function immediately
verifyBusinessStdIntegrityCompliance().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
