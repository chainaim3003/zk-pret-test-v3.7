/**
 * CLI Entry Point for Advanced Risk Network Verification
 * ENHANCED: Multi-verification support following BusinessProcessNetworkMultiVerifier pattern
 * ENHANCED WITH GROUP STRUCTURE (Following StableCoin Pattern)
 * PARALLEL TO: BusinessProcessNetworkMultiVerifier.ts naming pattern
 * 
 * Usage (Single):
 * node RiskAdvancedNetworkMultiVerifier.js <riskGroupID> <liquidityThreshold> <actusUrl> [portfolioPath] [executionMode]
 * 
 * Usage (Multi):
 * node RiskAdvancedNetworkMultiVerifier.js <group1> <threshold1> <url1> <portfolio1> <mode1> <group2> <threshold2> <url2> <portfolio2> <mode2>
 */

import { CircuitString } from 'o1js';
import { RiskAdvancedNetworkHandler } from '../handler/RiskAdvancedNetworkHandler.js';
import { environmentManager } from '../../../infrastructure/index.js';

// Type definitions for network transactions (following BusinessProcess pattern)
interface NetworkTransaction {
  portfolioId: string;
  transactionHash: string | null;
  status: string;
  liquidityThreshold: number;
}

interface NetworkVerificationResult {
  transactions: NetworkTransaction[];
  [key: string]: any;
}

// Parse command line arguments
const args = process.argv.slice(2);

/**
 * Main verification function
 * ENHANCED: Support for both single and multi-verification
 * PARALLEL TO: BusinessProcessNetworkMultiVerifier.verifyBusinessProcessCompliance()
 */
async function verifyRiskAdvancedCompliance(): Promise<void> {
  console.log('\n🌐 Risk Advanced NETWORK Multi-Verifier Started');
  console.log('='.repeat(60));
  
  // Determine network type from config file (following BusinessProcess pattern)
  const { environmentManager } = await import('../../../infrastructure/index.js');
  const currentEnv = environmentManager.getCurrentEnvironment();
  const fs = await import('fs');
  const path = await import('path');
  const configPath = path.join(process.cwd(), 'config', 'environments', `${currentEnv.toLowerCase()}.json`);
  const configData = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  const minaEndpoint = configData.network?.minaEndpoint || process.env.MINA_NETWORK_URL || '';
  const networkType = minaEndpoint.includes('devnet') ? 'devnet' : 
                    minaEndpoint.includes('testnet') ? 'testnet' : 'mainnet';
  
  // Determine if single or multi-verification mode
  const isMultiVerification = args.length >= 10 && args.length % 5 === 0;
  const verificationCount = isMultiVerification ? args.length / 5 : 1;
  
  console.log(`📊 Mode: ${isMultiVerification ? 'Multi-Verification' : 'Single Verification'}`);
  console.log(`📋 Verification Count: ${verificationCount}`);
  console.log(`🌍 Network: ${networkType.toUpperCase()}`);
  console.log('='.repeat(60));

  try {
    console.log('\n🚀 Starting enhanced risk advanced verification...');
    
    let results: any[] = [];
    let successfulVerifications = 0;
    const transactions: NetworkTransaction[] = [];
    
    if (isMultiVerification) {
      // Multi-verification mode (following BusinessProcess pattern)
      console.log('\n📊 Multi-Verification Mode');
      
      for (let i = 0; i < args.length; i += 5) {
        const riskGroupID = args[i];
        const liquidityThreshold = parseFloat(args[i + 1]);
        const actusUrl = args[i + 2] || 'http://localhost:8083/eventsBatch';
        const portfolioPath = args[i + 3];
        const executionMode = args[i + 4] || 'production';
        
        const riskGroupIDCircuit = CircuitString.fromString(riskGroupID);
        
        const verificationNum = Math.floor(i / 5) + 1;
        console.log(`\n📂 Verification ${verificationNum}/${verificationCount}:`);
        console.log(`   🏷️ Risk Group ID: ${riskGroupID}`);
        console.log(`   🎯 Threshold: ${liquidityThreshold}%`);
        console.log(`   🌐 ACTUS URL: ${actusUrl}`);
        console.log(`   📁 Portfolio: ${portfolioPath || 'Default'}`);
        console.log(`   ⚙️ Mode: ${executionMode}`);
        
        try {
          // Load portfolio if provided
          let contractPortfolio: any[] | undefined;
          let portfolioId = 'Unknown';
          
          if (portfolioPath) {
            try {
              const fs = await import('fs');
              const path = await import('path');
              const fullPath = path.resolve(portfolioPath);
              const rawData = fs.readFileSync(fullPath, 'utf8');
              const parsed = JSON.parse(rawData);
              contractPortfolio = parsed.contracts || parsed;
              portfolioId = parsed.portfolioMetadata?.portfolioId || path.basename(portfolioPath);
              
              console.log(`   📊 Portfolio ID: ${portfolioId}`);
              console.log(`   💰 Total Notional: ${parsed.portfolioMetadata?.totalNotional || 'Unknown'}`);
            } catch (error: any) {
              console.error(`   ❌ Failed to load portfolio: ${error.message}`);
              portfolioId = `Error-${verificationNum}`;
            }
          }
          
          // Execute verification
          const handler = new RiskAdvancedNetworkHandler();
          const startTime = Date.now();
          
          const result = await handler.executeAdvancedRiskVerification({
            riskGroupID: riskGroupIDCircuit,
            liquidityThreshold,
            actusUrl,
            contractPortfolio,
            executionMode
          });
          
          const endTime = Date.now();
          const duration = (endTime - startTime) / 1000;
          
          results.push(result);
          
          if (result.success) {
            successfulVerifications++;
            console.log(`   ✅ Verification ${verificationNum} PASSED (${duration.toFixed(2)}s)`);
            // console.log(`   📊 Status Change: ${result.contractStatus?.beforeVerification} → ${result.contractStatus?.afterVerification}`); // Commented out - not needed
            
            transactions.push({
              portfolioId,
              transactionHash: result.transactionDetails?.hash || null,
              status: 'SUCCESS',
              liquidityThreshold
            });
          } else {
            console.log(`   ❌ Verification ${verificationNum} FAILED`);
            
            transactions.push({
              portfolioId,
              transactionHash: null,
              status: `FAILED: ${result.summary}`,
              liquidityThreshold
            });
          }
          
        } catch (error: any) {
          console.error(`   💥 Verification ${verificationNum} error:`, error.message);
          results.push({ success: false, summary: error.message });
          
          transactions.push({
            portfolioId: `Error-${verificationNum}`,
            transactionHash: null,
            status: `ERROR: ${error.message}`,
            liquidityThreshold
          });
        }
      }
      
      // Multi-verification summary (following BusinessProcess pattern)
      const total = results.length;
      const verificationPercentage = total > 0 ? Math.round((successfulVerifications / total) * 100) : 0;
      
      console.log('\n📋 MULTI-VERIFICATION SUMMARY');
      console.log('='.repeat(70));
      console.log(`✅ Successful: ${successfulVerifications}/${total}`);
      console.log(`❌ Failed: ${total - successfulVerifications}/${total}`);
      console.log(`📊 Success Rate: ${verificationPercentage}%`);
      
      // Show transaction details (following BusinessProcess pattern)
      if (transactions.length > 0) {
        const successfulTxns = transactions.filter(t => t.transactionHash);
        console.log(`\n📡 Network Submissions: ${successfulTxns.length}/${transactions.length}`);
        
        if (successfulTxns.length > 0) {
          console.log('\n🔗 Transaction Details:');
          successfulTxns.forEach((txn, index) => {
            console.log(`  ${index + 1}. ${txn.portfolioId} (Threshold: ${txn.liquidityThreshold}%):`);
            console.log(`     Hash: ${txn.transactionHash}`);
            // console.log(`     Explorer: https://minascan.io/${networkType}/tx/${txn.transactionHash}`);
          });
        }
        
        const failedTxns = transactions.filter(t => !t.transactionHash);
        if (failedTxns.length > 0) {
          console.log('\n❌ Failed Network Submissions:');
          failedTxns.forEach((txn, index) => {
            console.log(`  ${index + 1}. ${txn.portfolioId}: ${txn.status}`);
          });
        }
      }
      
      if (successfulVerifications === total) {
        console.log('\n🎉 ALL VERIFICATIONS PASSED!');
      }
      console.log('='.repeat(70));
      
    } else {
      // Single verification mode (original logic preserved)
      const riskGroupID = args[0];
      const liquidityThreshold = parseFloat(args[1]);
      const actusUrl = args[2] || 'http://localhost:8083/eventsBatch';
      const portfolioPath = args[3];
      const executionMode = args[4] || 'production';
      
      // === VALIDATION (Following StableCoin Pattern) ===
      if (!riskGroupID) {
        console.error('❌ Error: Risk Group ID is required (first argument)');
        console.log('Usage (Single): node RiskAdvancedNetworkMultiVerifier.js <riskGroupID> <liquidityThreshold> <actusUrl> [portfolioPath] [executionMode]');
        process.exit(1);
      }
      
      // PRESERVE EXACT VALIDATION LOGIC from original implementation
      if (isNaN(liquidityThreshold)) {
        console.error('❌ Error: Liquidity threshold is required');
        console.log('Usage (Single): node RiskAdvancedNetworkMultiVerifier.js <riskGroupID> <liquidityThreshold> <actusUrl> [portfolioPath] [executionMode]');
        console.log('Usage (Multi): node RiskAdvancedNetworkMultiVerifier.js <group1> <threshold1> <url1> <portfolio1> <mode1> <group2> <threshold2> <url2> <portfolio2> <mode2>');
        process.exit(1);
      }
      
      const riskGroupIDCircuit = CircuitString.fromString(riskGroupID);
      console.log(`🏷️ Risk Group ID: ${riskGroupID}`);
      console.log(`📂 Single Verification: Threshold ${liquidityThreshold}%`);
      
      // PRESERVE EXACT PORTFOLIO LOADING from original implementation
      let contractPortfolio: any[] | undefined;
      let portfolioId = 'Unknown';
      
      if (portfolioPath) {
        try {
          const fs = await import('fs');
          const path = await import('path');
          const fullPath = path.resolve(portfolioPath);
          const rawData = fs.readFileSync(fullPath, 'utf8');
          const parsed = JSON.parse(rawData);
          contractPortfolio = parsed.contracts || parsed;
          portfolioId = parsed.portfolioMetadata?.portfolioId || path.basename(portfolioPath);
          
          console.log(`📊 Portfolio ID: ${portfolioId}`);
          console.log(`💰 Total Notional: ${parsed.portfolioMetadata?.totalNotional || 'Unknown'}`);
          console.log(`🔍 HQLA Categories from Config:`);
          contractPortfolio?.forEach((contract, index) => {
            console.log(`   Contract ${contract.contractID || index}: HQLA Category = ${contract.hqlaCategory || 'Not specified'}`);
          });
        } catch (error: any) {
          console.error(`❌ Failed to load portfolio from ${portfolioPath}:`, error.message);
          console.log(`🔄 Falling back to default hardcoded contracts`);
          contractPortfolio = undefined;
        }
      }
      
      // Create and execute NETWORK handler
      const handler = new RiskAdvancedNetworkHandler();
      
      console.log(`🌐 NETWORK Parameters:`);
      console.log(`   🎯 Liquidity Threshold: ${liquidityThreshold}%`);
      console.log(`   🌐 ACTUS API URL: ${actusUrl}`);
      console.log(`   📁 Portfolio Path: ${portfolioPath || 'Using default contracts'}`);
      console.log(`   ⚙️ Execution Mode: ${executionMode}`);
      
      const startTime = Date.now();
      
      const result = await handler.executeAdvancedRiskVerification({
        riskGroupID: riskGroupIDCircuit,
        liquidityThreshold,
        actusUrl,
        contractPortfolio,
        executionMode
      });
      
      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000;
      
      if (result.success) {
        console.log('\n✅ NETWORK Advanced Risk verification completed successfully!');
        console.log(`⏱️ Total execution time: ${duration.toFixed(2)}s`);
        console.log(`🎯 Verification Result: ✅ PASSED`);
        // console.log(`📊 Status Change: ${result.contractStatus?.beforeVerification} → ${result.contractStatus?.afterVerification}`); // Commented out - not needed
        
        // === GROUP VERIFICATION SUMMARY (Following StableCoin Pattern) ===
        console.log(`\n🏗️  Risk Group Verification Summary:`);
        console.log(`   📊 Risk Group ID: ${riskGroupID}`);
        console.log(`   ✅ Group Structure: Enabled`);
        
        // Show network transaction info (following BusinessProcess pattern)
        if (result.transactionDetails?.hash) {
          console.log(`📡 Network Submitted: ✅ YES`);
          console.log(`🔗 Transaction Hash: ${result.transactionDetails.hash}`);
          console.log(`🔍 Explorer: ${result.transactionDetails.explorerUrl}`);
        } else {
          console.log(`📡 Network Submitted: ❌ NO`);
          console.log(`⚠️ Verification completed locally only`);
        }
        
        console.log('\n🎉 SUCCESS: Advanced Risk compliance verified with cryptographic proof!');
        // console.log('✅ ADVANCED RISK COMPLIANCE ACHIEVED - Contract status changed'); // Commented out - not needed
        
      } else {
        console.error('\n❌ NETWORK Advanced Risk verification failed!');
        console.error(`❌ Error: ${result.summary}`);
        console.log(`🎯 Verification Result: ❌ FAILED`);
      }
      
      // Common result logging (following BusinessProcess pattern)
      console.log(`\n📊 Final Summary:`);
      console.log(`🌍 Environment: ${result.transactionDetails?.network || 'NETWORK'}`);
      console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
      
      // if (environmentManager.shouldConnectToDevnet()) {
      //   console.log(`\n🔗 Network Information:`);
      //   console.log(`   • Network: ${networkType.toUpperCase()}`);
      //   console.log(`   • Explorer: https://minascan.io/${networkType}/`);
      //   console.log(`   • Using deployer account from environment`);
      // } else {
      //   console.log(`   • Using local mode (for development only)`);
      // }
    }
    
  } catch (error) {
    console.error('\n❌ Risk Advanced NETWORK Verification Failed');
    if (error instanceof Error) {
      console.error('Error:', error.message);
      console.error('Stack:', error.stack);
    } else {
      console.error('Unknown error:', error);
    }
    throw error;
  }
}

/**
 * Main entry point with enhanced validation
 * FOLLOWING: BusinessProcessNetworkMultiVerifier pattern
 */
async function main() {
  console.log('\n🔧 Risk Advanced NETWORK Multi-Verifier Test');
  
  // Validate arguments (following BusinessProcess pattern)
  if (args.length < 2) {
    console.error('❌ Error: Missing required arguments');
    console.error('Usage (Single): node RiskAdvancedNetworkMultiVerifier.js <riskGroupID> <liquidityThreshold> <actusUrl> [portfolioPath] [executionMode]');
    console.error('Usage (Multi): node RiskAdvancedNetworkMultiVerifier.js <group1> <threshold1> <url1> <portfolio1> <mode1> <group2> <threshold2> <url2> <portfolio2> <mode2>');
    console.error('Example (Single): node RiskAdvancedNetworkMultiVerifier.js RISK_GROUP_001 15.5 http://localhost:8083/eventsBatch portfolio.json production');
    console.error('Example (Multi): node RiskAdvancedNetworkMultiVerifier.js RISK_GROUP_001 15.5 http://localhost:8083/eventsBatch portfolio1.json production RISK_GROUP_002 20.0 http://localhost:8083/eventsBatch portfolio2.json test');
    console.error('\nEnvironment Variables:');
    console.error('  NETWORK_TYPE=testnet|mainnet (default: testnet)');
    console.error('  DEPLOYER_PRIVATE_KEY=<base58_private_key> (for network transactions)');
    console.error('  MINA_NETWORK_URL=<network_url> (for production mode)');
    console.error('  NETWORK_MODE=local|network (force specific mode)');
    process.exit(1);
  }

  // Validate multi-verification format (following BusinessProcess pattern)
  if (args.length > 5 && args.length % 5 !== 0) {
    console.error('❌ Error: Invalid argument count for multi-verification mode');
    console.error('Multi-verification arguments must be in groups of 5: <riskGroupID> <liquidityThreshold> <actusUrl> <portfolioPath> <executionMode>');
    process.exit(1);
  }

  try {
    await verifyRiskAdvancedCompliance();
    console.log('\n🎉 Risk Advanced NETWORK verification completed successfully!');
  } catch (error) {
    console.error('\n💥 Risk Advanced verification failed:', error);
    process.exit(1);
  }
}

// Execute main function
main().catch((error) => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});

/* ============================================================================
 * ORIGINAL IMPLEMENTATION (PRESERVED - COMMENTED OUT)
 * ============================================================================

async function main_ORIGINAL() {
    console.log('🚀 Advanced Risk Network Verification (Organized Architecture)');

    // PRESERVE EXACT PARAMETER PARSING from working implementation
    const liquidityThreshold = parseFloat(process.argv[2]);
    const actusUrl = process.argv[3] || 'http://localhost:8083/eventsBatch';
    const portfolioPath = process.argv[4];
    const executionMode = process.argv[5] || 'production';

    // PRESERVE EXACT VALIDATION LOGIC from working implementation
    if (isNaN(liquidityThreshold)) {
        console.error('❌ Error: Liquidity threshold is required');
        console.log('Usage: node RiskAdvancedNetworkMultiVerifier.js <liquidityThreshold> <actusUrl> [portfolioPath] [executionMode]');
        process.exit(1);
    }

    // PRESERVE EXACT PORTFOLIO LOADING from working implementation
    let contractPortfolio: any[] | undefined;
    if (portfolioPath) {
        try {
            const fs = await import('fs');
            const path = await import('path');
            const fullPath = path.resolve(portfolioPath);
            const rawData = fs.readFileSync(fullPath, 'utf8');
            const parsed = JSON.parse(rawData);
            contractPortfolio = parsed.contracts || parsed;
            
            console.log(`📊 Portfolio ID: ${parsed.portfolioMetadata?.portfolioId || 'Unknown'}`);
            console.log(`💰 Total Notional: ${parsed.portfolioMetadata?.totalNotional || 'Unknown'}`);
            console.log(`🔍 HQLA Categories from Config:`);
            contractPortfolio?.forEach((contract, index) => {
                console.log(`   Contract ${contract.contractID || index}: HQLA Category = ${contract.hqlaCategory || 'Not specified'}`);
            });
        } catch (error: any) {
            console.error(`❌ Failed to load portfolio from ${portfolioPath}:`, error.message);
            console.log(`🔄 Falling back to default hardcoded contracts`);
            contractPortfolio = undefined;
        }
    }

    // Create and execute NETWORK handler
    const handler = new RiskAdvancedNetworkHandler();
    
    console.log(`🌐 NETWORK Parameters:`);
    console.log(`   🎯 Liquidity Threshold: ${liquidityThreshold}%`);
    console.log(`   🌐 ACTUS API URL: ${actusUrl}`);
    console.log(`   📁 Portfolio Path: ${portfolioPath || 'Using default contracts'}`);
    console.log(`   ⚙️ Execution Mode: ${executionMode}`);

    try {
        const startTime = Date.now();
        
        const result = await handler.executeAdvancedRiskVerification({
            liquidityThreshold,
            actusUrl,
            contractPortfolio,
            executionMode
        });

        const endTime = Date.now();
        const duration = (endTime - startTime) / 1000;

        if (result.success) {
            console.log('✅ NETWORK Advanced Risk verification completed successfully!');
            console.log(`⏱️ Total execution time: ${duration.toFixed(2)} seconds`);
            console.log(`📊 Status Change: ${result.contractStatus?.beforeVerification} → ${result.contractStatus?.afterVerification}`);
            // Transaction hash logging removed for compatibility
            console.log('✅ ADVANCED RISK COMPLIANCE ACHIEVED - Contract status changed');
            
            process.exit(0);
        } else {
            console.error('❌ NETWORK Advanced Risk verification failed!');
            console.error(`❌ Error: ${result.summary}`);
            process.exit(1);
        }
        
    } catch (error: any) {
        console.error('💥 Unexpected error during NETWORK Advanced Risk verification:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

// Execute main function
main_ORIGINAL().catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
});

 * ============================================================================ */
