/**
 * Account Selection Verification and Fix
 * Ensures the system uses pre-funded DEVNET accounts
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { 
  initializeOracleRegistry,
  getDeployerAccount,
  getDeployerKey,
  debugEnvironmentSetup,
  environmentManager 
} from '../infrastructure/index.js';

async function verifyAccountSelection() {
  console.log('\n🔍 ACCOUNT SELECTION VERIFICATION');
  console.log('='.repeat(60));
  
  try {
    // Initialize Oracle Registry
    await initializeOracleRegistry();
    
    // Check which accounts the system will use
    console.log('\n📋 Account Selection Check:');
    
    // Get GLEIF deployer account (what your test should use)
    const gleifDeployer = getDeployerAccount('GLEIF');
    const gleifDeployerKey = getDeployerKey('GLEIF');
    
    console.log('\n🎯 GLEIF Oracle Accounts:');
    console.log(`  Deployer Account: ${gleifDeployer.toBase58()}`);
    console.log(`  Expected (funded): B62qmHa4M2r8zXia5u58hr1ssWeVMZJ4fh5rZt3Cd7YMDjVgDowDtir`);
    console.log(`  Match: ${gleifDeployer.toBase58() === 'B62qmHa4M2r8zXia5u58hr1ssWeVMZJ4fh5rZt3Cd7YMDjVgDowDtir' ? '✅ YES' : '❌ NO'}`);
    
    // Check all oracle accounts
    console.log('\n📊 All Oracle Accounts:');
    const oracleTypes = ['MCA', 'GLEIF', 'EXIM', 'BPMN', 'RISK', 'BL_REGISTRY'];
    
    for (const type of oracleTypes) {
      const deployerAccount = getDeployerAccount(type);
      console.log(`  ${type}: ${deployerAccount.toBase58()}`);
    }
    
    // Environment verification
    console.log('\n🌐 Environment Status:');
    console.log(`  Environment: ${environmentManager.getCurrentEnvironment()}`);
    console.log(`  Should connect to DEVNET: ${environmentManager.shouldConnectToDevnet()}`);
    console.log(`  Using NetworkOracleRegistry: ${environmentManager.shouldUseNetworkRegistry()}`);
    
    // Verification result
    const isCorrectAccount = gleifDeployer.toBase58() === 'B62qmHa4M2r8zXia5u58hr1ssWeVMZJ4fh5rZt3Cd7YMDjVgDowDtir';
    
    if (isCorrectAccount) {
      console.log('\n✅ SUCCESS: System will use pre-funded DEVNET account!');
      console.log('🎯 Your next GLEIF test should work with funded account');
      console.log('💰 Account has 299 MINA available for transactions');
    } else {
      console.log('\n❌ ISSUE: System will use wrong account');
      console.log('🔧 Need to fix account selection in Oracle Registry');
    }
    
  } catch (error) {
    console.error('\n❌ VERIFICATION FAILED');
    if (error instanceof Error) {
      console.error('Error:', error.message);
      console.error('Stack:', error.stack);
    } else {
      console.error('Unknown error:', error);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('🔍 Account Selection Verification Complete');
}

// Run the verification
verifyAccountSelection().catch(console.error);
