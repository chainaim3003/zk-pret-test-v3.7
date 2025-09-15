/**
 * Enhanced Deployment CLI Interface
 * Comprehensive monitoring and detailed status reporting
 */

import { PRETDeployer } from '../../deployment/pret-deployer.js';

async function main(): Promise<void> {
  const aliasName = process.argv[2];

  if (!aliasName) {
    console.error('❌ Usage: npm run deploy <alias-name>');
    console.error('');
    console.error('Available aliases:');
    console.error('  🏠 Local Development:');
    console.error('     npm run deploy local-gleif');
    console.error('');
    console.error('  🧪 Testnet Development:');
    console.error('     npm run deploy testnet-gleif-dev');
    console.error('     npm run deploy testnet-gleif');
    console.error('     npm run deploy testnet-gleif-force');
    console.error('');
    console.error('  🚀 Production:');
    console.error('     npm run deploy mainnet-gleif');
    console.error('');
    console.error('Or use convenience scripts:');
    console.error('  npm run deploy:local');
    console.error('  npm run deploy:testnet');
    console.error('  npm run deploy:testnet-force');
    console.error('  npm run deploy:mainnet');
    process.exit(1);
  }

  try {
    console.log(`🚀 Starting deployment for alias: ${aliasName}`);
    console.log(`⏰ Start time: ${new Date().toISOString()}`);
    console.log(`🏷️  Process ID: ${process.pid}`);
    console.log(''.padEnd(80, '='));
    
    const result = await PRETDeployer.deploy(aliasName);
    
    console.log(''.padEnd(80, '='));
    
    if (result.success) {
      console.log('\n🎉 DEPLOYMENT SUCCESSFUL!');
      console.log(''.padEnd(60, '-'));
      
      // Core deployment info
      console.log(`📍 Contract Address: ${result.contractAddress}`);
      console.log(`🆔 Transaction Hash: ${result.transactionHash}`);
      console.log(`⏱️  Total Time: ${result.deploymentTime}ms (${(result.deploymentTime/1000).toFixed(1)}s)`);
      console.log(`🔑 Verification Key Hash: ${result.verificationKey?.hash}`);
      
      // zkApp state info
      if (result.zkAppState && result.zkAppState.length > 0) {
        console.log(`📊 zkApp State: [${result.zkAppState.join(', ')}]`);
      }
      console.log(`💰 Final Contract Balance: ${result.finalBalance} MINA`);
      
      // Account tracking summary
      if (result.accountTracking && result.accountTracking.deployer) {
        console.log('\n💳 Account Tracking Summary:');
        console.log(''.padEnd(40, '-'));
        
        const deployer = result.accountTracking.deployer;
        const sender = result.accountTracking.sender;
        
        console.log(`👤 Deployer (${deployer.address}):`);
        console.log(`   Balance: ${deployer.initialBalance} → ${deployer.finalBalance} MINA (${deployer.balanceChange >= 0 ? '+' : ''}${deployer.balanceChange})`);
        console.log(`   Nonce: ${deployer.initialNonce} → ${deployer.finalNonce} (+${deployer.nonceChange})`);
        
        console.log(`💸 Sender (${sender.address}):`);
        console.log(`   Balance: ${sender.initialBalance} → ${sender.finalBalance} MINA (${sender.balanceChange >= 0 ? '+' : ''}${sender.balanceChange})`);
        console.log(`   Nonce: ${sender.initialNonce} → ${sender.finalNonce} (+${sender.nonceChange})`);
        console.log(`   Fee Paid: ~${sender.feePaid} MINA`);
        
        const contract = result.accountTracking.contract;
        console.log(`🏗️  Contract (${contract.address}):`);
        console.log(`   Exists: ${contract.exists ? '✅' : '❌'}`);
        console.log(`   Balance: ${contract.balance} MINA`);
        console.log(`   Nonce: ${contract.nonce}`);
        if (contract.zkAppState && contract.zkAppState.length > 0) {
          console.log(`   State: [${contract.zkAppState.join(', ')}]`);
        }
      }
      
      // Display detailed step summary
      console.log('\n📊 Deployment Steps Summary:');
      console.log(''.padEnd(60, '-'));
      let totalMicrosteps = 0;
      
      result.steps.forEach((step, index) => {
        const status = step.status === 'COMPLETED' ? '✅' : 
                     step.status === 'FAILED' ? '❌' : '🔄';
        const duration = step.duration || 0;
        const microstepCount = step.microsteps?.length || 0;
        totalMicrosteps += microstepCount;
        
        console.log(`   ${status} ${index + 1}. ${step.name} (${duration}ms, ${microstepCount} microsteps)`);
        
        // Show microsteps for failed steps or if requested
        if (step.status === 'FAILED' && step.microsteps && step.microsteps.length > 0) {
          step.microsteps.forEach((microstep, mIndex) => {
            const mStatus = microstep.status === 'COMPLETED' ? '✓' : 
                           microstep.status === 'FAILED' ? '✗' : '◐';
            console.log(`      ${mStatus} ${mIndex + 1}.${index + 1} ${microstep.name} (${microstep.duration || 0}ms)`);
            if (microstep.error) {
              console.log(`         Error: ${microstep.error}`);
            }
          });
        }
      });
      
      console.log(`\n📈 Summary: ${result.steps.length} steps, ${totalMicrosteps} microsteps completed`);
      console.log(`⏰ End time: ${new Date().toISOString()}`);
      
      // Blockchain verification links
      const isTestnet = aliasName.startsWith('testnet-');
      const isMainnet = aliasName.startsWith('mainnet-');
      const network = isTestnet ? 'devnet' : isMainnet ? 'mainnet' : 'berkeley';
      
      console.log('\n🔗 Verification Links:');
      console.log(`   Contract: https://minascan.io/${network}/account/${result.contractAddress}`);
      console.log(`   Transaction: https://minascan.io/${network}/tx/${result.transactionHash}`);
      
    } else {
      console.log('\n❌ DEPLOYMENT FAILED!');
      console.log(''.padEnd(60, '-'));
      
      // Display failed steps with details
      console.log('\n📊 Deployment Steps Summary:');
      let totalMicrosteps = 0;
      
      result.steps.forEach((step, index) => {
        const status = step.status === 'COMPLETED' ? '✅' : 
                     step.status === 'FAILED' ? '❌' : '🔄';
        const duration = step.duration || 0;
        const microstepCount = step.microsteps?.length || 0;
        totalMicrosteps += microstepCount;
        
        console.log(`   ${status} ${index + 1}. ${step.name} (${duration}ms, ${microstepCount} microsteps)`);
        
        if (step.error) {
          console.log(`      Error: ${step.error}`);
        }
        
        // Show microsteps for failed steps
        if (step.status === 'FAILED' && step.microsteps && step.microsteps.length > 0) {
          step.microsteps.forEach((microstep, mIndex) => {
            const mStatus = microstep.status === 'COMPLETED' ? '✓' : 
                           microstep.status === 'FAILED' ? '✗' : '◐';
            console.log(`      ${mStatus} ${mIndex + 1}.${index + 1} ${microstep.name} (${microstep.duration || 0}ms)`);
            if (microstep.error) {
              console.log(`         Error: ${microstep.error}`);
            }
          });
        }
      });
      
      console.log(`\n📈 Summary: ${result.steps.filter(s => s.status === 'COMPLETED').length}/${result.steps.length} steps completed, ${totalMicrosteps} microsteps attempted`);
      console.log(`⏰ Failed at: ${new Date().toISOString()}`);
      
      // Troubleshooting hints
      console.log('\n🔧 Troubleshooting Hints:');
      const failedStep = result.steps.find(s => s.status === 'FAILED');
      if (failedStep) {
        switch (failedStep.name) {
          case 'CONFIG_LOADING':
            console.log('   • Check that the environment config file exists');
            console.log('   • Verify the deployment alias is correctly defined');
            console.log('   • Ensure private keys are in correct Base58 format');
            break;
          case 'NETWORK_INIT':
            console.log('   • Check network connectivity');
            console.log('   • Verify endpoints are accessible');
            console.log('   • Try again - network may be temporarily unavailable');
            break;
          case 'ACCOUNT_VALIDATION':
            console.log('   • Fund the sender account (minimum 1 MINA required)');
            console.log('   • Check that accounts exist on the target network');
            console.log('   • Verify private keys correspond to existing accounts');
            break;
          case 'COMPILATION':
            console.log('   • Ensure the contract file exists and is built');
            console.log('   • Run: npm run build');
            console.log('   • Check for TypeScript compilation errors');
            break;
          case 'DEPLOYMENT':
            console.log('   • Check account balances and nonce conflicts');
            console.log('   • Verify network is not congested');
            console.log('   • Try again with a different deployer account');
            break;
          case 'CONFIRMATION':
            console.log('   • Network may be slow - try again');
            console.log('   • Check if transaction was actually included');
            console.log('   • Monitor network status on block explorer');
            break;
        }
      }
      
      process.exit(1);
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`\n💥 DEPLOYMENT ERROR: ${errorMessage}`);
    console.error(`⏰ Error time: ${new Date().toISOString()}`);
    console.error('\n🔧 Common solutions:');
    console.error('   • Run: npm run build');
    console.error('   • Check network connectivity');
    console.error('   • Verify account funding');
    console.error('   • Review environment configuration');
    process.exit(1);
  }
}

main();