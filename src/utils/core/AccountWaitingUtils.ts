/**
 * Account Waiting Utilities - O1js Best Practices
 * Implements proper account existence checking for DEVNET deployments
 */

import { Mina, PublicKey, fetchAccount } from 'o1js';
import { environmentManager } from '../../infrastructure/index.js';

export interface AccountWaitOptions {
  maxAttempts?: number;
  intervalMs?: number;
  requireZkApp?: boolean;
  requireFunded?: boolean;
  minimumBalance?: bigint;
}

export interface AccountStatus {
  exists: boolean;
  isZkApp: boolean;
  balance: bigint;
  nonce: number;
  verified: boolean;
}

/**
 * Wait until account exists on the network - O1js Best Practice
 * Following official Mina documentation patterns
 */
export async function loopUntilAccountExists(
  publicKey: PublicKey,
  options: AccountWaitOptions = {}
): Promise<AccountStatus> {
  const {
    maxAttempts = 30,
    intervalMs = 5000,
    requireZkApp = false,
    requireFunded = false,
    minimumBalance = 0n
  } = options;

  console.log(`\n⏳ Waiting for account to exist: ${publicKey.toBase58()}`);
  console.log(`   Max attempts: ${maxAttempts}`);
  console.log(`   Check interval: ${intervalMs}ms`);
  console.log(`   Require zkApp: ${requireZkApp}`);
  console.log(`   Require funded: ${requireFunded}`);

  // Get current environment
  const env = environmentManager.getCurrentEnvironment();
  
  // Environment-aware network setup
  let shouldUseNetwork = env !== 'LOCAL';
  let networkEndpoint: string | null = null;
  
  if (shouldUseNetwork) {
    switch (env) {
      case 'TESTNET':
        networkEndpoint = 'https://api.minascan.io/node/devnet/v1/graphql';
        break;
      case 'MAINNET':
        networkEndpoint = 'https://api.minaexplorer.com/mainnet/graphql';
        break;
      default:
        shouldUseNetwork = false;
    }
  }
  
  console.log(`   Environment: ${env}`);
  console.log(`   Use network: ${shouldUseNetwork}`);
  if (networkEndpoint) {
    console.log(`   Network endpoint: ${networkEndpoint}`);
  }

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`\n🔍 Attempt ${attempt}/${maxAttempts} - Checking account...`);
      
      // Environment-aware network connection
      if (shouldUseNetwork && networkEndpoint) {
        const Network = Mina.Network(networkEndpoint);
        Mina.setActiveInstance(Network);
      }
      
      // Fetch account with proper error handling
      await fetchAccount({ publicKey });
      const account = Mina.getAccount(publicKey);
      
      if (account) {
        const balance = BigInt(account.balance.toString());
        const isZkApp = !!account.zkapp;
        
        console.log(`   ✅ Account found!`);
        console.log(`   💰 Balance: ${Number(balance) / 1e9} MINA`);
        console.log(`   🎯 Is zkApp: ${isZkApp}`);
        console.log(`   📊 Nonce: ${account.nonce.toString()}`);
        
        // Check requirements
        let verified = true;
        
        if (requireZkApp && !isZkApp) {
          console.log(`   ⚠️ Account exists but is not a zkApp (continuing to wait...)`);
          verified = false;
        }
        
        if (requireFunded && balance < minimumBalance) {
          console.log(`   ⚠️ Account exists but insufficient balance (continuing to wait...)`);
          verified = false;
        }
        
        if (verified) {
          console.log(`   🎉 Account verified and ready!`);
          return {
            exists: true,
            isZkApp,
            balance,
            nonce: Number(account.nonce.toString()),
            verified: true
          };
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log(`   ❌ Attempt ${attempt} failed: ${errorMessage}`);
      console.log(`   📝 This is normal for DEVNET - account may still be processing`);
    }
    
    if (attempt < maxAttempts) {
      console.log(`   ⏳ Waiting ${intervalMs}ms before next attempt...`);
      await sleep(intervalMs);
    }
  }
  
  console.log(`\n❌ Account not found after ${maxAttempts} attempts`);
  console.log(`   🔗 Check account manually: https://minascan.io/devnet/account/${publicKey.toBase58()}`);
  
  return {
    exists: false,
    isZkApp: false,
    balance: 0n,
    nonce: 0,
    verified: false
  };
}

/**
 * Alternative endpoint checking for better DEVNET compatibility
 */
export async function checkAccountWithAlternativeEndpoints(
  publicKey: PublicKey
): Promise<AccountStatus | null> {
  const endpoints = [
    'https://api.minascan.io/node/devnet/v1/graphql',
    'https://proxy.devnet.minaexplorer.com/graphql',
    'https://devnet.minaprotocol.com/graphql'
  ];
  
  console.log(`\n🔄 Checking account with alternative endpoints...`);
  
  for (let i = 0; i < endpoints.length; i++) {
    const endpoint = endpoints[i];
    console.log(`\n📡 Trying endpoint ${i + 1}/${endpoints.length}: ${endpoint}`);
    
    try {
      const Network = Mina.Network(endpoint);
      Mina.setActiveInstance(Network);
      
      await fetchAccount({ publicKey });
      const account = Mina.getAccount(publicKey);
      
      if (account) {
        const balance = BigInt(account.balance.toString());
        const isZkApp = !!account.zkapp;
        
        console.log(`   ✅ Account found on endpoint ${i + 1}!`);
        console.log(`   💰 Balance: ${Number(balance) / 1e9} MINA`);
        console.log(`   🎯 Is zkApp: ${isZkApp}`);
        
        return {
          exists: true,
          isZkApp,
          balance,
          nonce: Number(account.nonce.toString()),
          verified: true
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log(`   ❌ Endpoint ${i + 1} failed: ${errorMessage}`);
    }
  }
  
  console.log(`\n❌ Account not found on any endpoint`);
  return null;
}

/**
 * Enhanced deployment verification with proper account waiting
 */
export async function verifyDeploymentWithAccountWaiting(
  contractAddress: PublicKey,
  description: string = 'Deployment'
): Promise<boolean> {
  console.log(`\n🔍 ${description} - ENHANCED VERIFICATION WITH ACCOUNT WAITING`);
  console.log('='.repeat(80));
  
  // Step 1: Wait for account to exist
  console.log(`\n📋 Step 1: Waiting for account to exist...`);
  const accountStatus = await loopUntilAccountExists(contractAddress, {
    maxAttempts: 20,
    intervalMs: 5000,
    requireZkApp: true,
    requireFunded: false
  });
  
  if (!accountStatus.exists) {
    console.log(`\n❌ ${description} verification failed: Account not found`);
    return false;
  }
  
  if (!accountStatus.isZkApp) {
    console.log(`\n⚠️ ${description} partially successful: Account exists but not zkApp`);
    
    // Try alternative endpoints
    console.log(`\n🔄 Trying alternative endpoints...`);
    const altStatus = await checkAccountWithAlternativeEndpoints(contractAddress);
    
    if (altStatus && altStatus.isZkApp) {
      console.log(`\n✅ ${description} verification successful via alternative endpoint!`);
      return true;
    }
    
    return false;
  }
  
  console.log(`\n✅ ${description} verification successful!`);
  console.log(`   📍 Contract Address: ${contractAddress.toBase58()}`);
  console.log(`   💰 Balance: ${Number(accountStatus.balance) / 1e9} MINA`);
  console.log(`   🎯 Status: Active zkApp`);
  console.log(`   📊 Nonce: ${accountStatus.nonce}`);
  
  return true;
}

/**
 * Utility sleep function
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export { sleep };
