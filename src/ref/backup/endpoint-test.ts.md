/**
 * DEVNET Endpoint Testing - Multiple Endpoints
 * Tests different DEVNET GraphQL endpoints to find working ones
 */

import { Mina, PublicKey } from 'o1js';

const DEVNET_ENDPOINTS = [
  'https://api.minascan.io/node/devnet/v1/graphql',
  'https://devnet.graphql.minaprotocol.com/graphql', 
  'https://proxy.devnet.minaexplorer.com/graphql',
  'https://devnet-api.zkapp.dev/graphql',
  'https://berkeley.graphql.minaprotocol.com/graphql',
  'https://api.minaexplorer.com/devnet/graphql'
];

const TEST_ACCOUNTS = [
  'B62qo3JqEQno6Z234yV42Sdqy2qfwjVtLFUpdn21kBKmUMRAGrKeEJ9', // GLEIF from config
  'B62qmHa4M2r8zXia5u58hr1ssWeVMZJ4fh5rZt3Cd7YMDjVgDowDtir', // MCA from config
  'B62qoT88Z1hYHSZ2PTcz1peM1Aj6PHvJKYRMMqqtoeEphMmUh57sFBK', // Previous deployment
];

async function testEndpoint(endpoint: string, accountB58: string): Promise<boolean> {
  try {
    console.log(`\n🔍 Testing: ${endpoint}`);
    console.log(`   Account: ${accountB58}`);
    
    const Network = Mina.Network(endpoint);
    Mina.setActiveInstance(Network);
    
    const account = PublicKey.fromBase58(accountB58);
    const accountInfo = await Mina.getAccount(account);
    
    console.log(`   ✅ SUCCESS: Balance ${Number(accountInfo.balance.toString()) / 1e9} MINA`);
    console.log(`   📊 Nonce: ${accountInfo.nonce.toString()}`);
    return true;
    
  } catch (error: any) {
    console.log(`   ❌ FAILED: ${error.message}`);
    return false;
  }
}

async function testAllEndpoints() {
  console.log('🌐 DEVNET ENDPOINT COMPREHENSIVE TEST');
  console.log('====================================');
  
  const results: {endpoint: string, working: boolean, accounts: string[]}[] = [];
  
  for (const endpoint of DEVNET_ENDPOINTS) {
    console.log(`\n📡 TESTING ENDPOINT: ${endpoint}`);
    console.log('-'.repeat(60));
    
    const workingAccounts: string[] = [];
    let endpointWorking = false;
    
    for (const accountB58 of TEST_ACCOUNTS) {
      const success = await testEndpoint(endpoint, accountB58);
      if (success) {
        workingAccounts.push(accountB58);
        endpointWorking = true;
      }
      await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limit
    }
    
    results.push({
      endpoint,
      working: endpointWorking,
      accounts: workingAccounts
    });
  }
  
  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 ENDPOINT TEST RESULTS SUMMARY');
  console.log('='.repeat(80));
  
  const workingEndpoints = results.filter(r => r.working);
  
  if (workingEndpoints.length === 0) {
    console.log('❌ NO WORKING ENDPOINTS FOUND');
    console.log('🔍 Possible issues:');
    console.log('   • All DEVNET endpoints are down');
    console.log('   • All test accounts are unfunded/invalid');
    console.log('   • Network connectivity issues');
    console.log('   • DEVNET was recently reset');
  } else {
    console.log(`✅ FOUND ${workingEndpoints.length} WORKING ENDPOINT(S):`);
    workingEndpoints.forEach(result => {
      console.log(`\n🌐 ${result.endpoint}`);
      console.log(`   💰 Found ${result.accounts.length} funded accounts:`);
      result.accounts.forEach(account => {
        console.log(`     ${account}`);
      });
    });
    
    console.log('\n🎯 RECOMMENDED ACTION:');
    console.log(`   Update testnet.json to use: ${workingEndpoints[0].endpoint}`);
    console.log(`   Fund missing accounts or use found accounts`);
  }
  
  console.log('\n🔧 ALTERNATIVE SOLUTIONS:');
  console.log('   1. Check DEVNET status: https://status.minaprotocol.com/');
  console.log('   2. Use DEVNET faucet: https://faucet.minaprotocol.com/devnet');
  console.log('   3. Switch to LOCAL testing temporarily');
  console.log('   4. Check if Berkeley testnet is the target instead');
  
  return results;
}

// Run the comprehensive test
testAllEndpoints().catch(console.error);
