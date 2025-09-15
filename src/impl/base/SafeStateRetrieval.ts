/**
 * SOLUTION: Safe zkApp State Retrieval with Retry Logic
 * 
 * This file provides the missing functionality to safely fetch zkApp account state
 * with proper retry logic for newly deployed contracts on DEVNET.
 */

import { fetchAccount, PublicKey } from 'o1js';
import { environmentManager } from '../../infrastructure/index.js';

/**
 * Safe zkApp account fetching with retry logic
 * This addresses the "Could not find account" error for newly deployed contracts
 */
export async function safelyFetchZkAppAccount(
    zkAppAddress: PublicKey,
    maxAttempts: number = 5,
    delayMs: number = 2000
): Promise<boolean> {
    const currentEnv = environmentManager.getCurrentEnvironment();
    const shouldConnectToDevnet = environmentManager.shouldConnectToDevnet();
    
    console.log(`🔍 Fetching zkApp account with retry logic for ${currentEnv === 'TESTNET' && shouldConnectToDevnet ? 'DEVNET' : currentEnv}...`);
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            console.log(`   Attempt ${attempt}/${maxAttempts} - Fetching account from ${currentEnv === 'TESTNET' && shouldConnectToDevnet ? 'DEVNET' : currentEnv}...`);
            
            if (currentEnv === 'TESTNET' && shouldConnectToDevnet) {
                console.log(`   ✅ Network set to: https://api.minascan.io/node/devnet/v1/graphql`);
            }
            
            const accountData = await fetchAccount({ publicKey: zkAppAddress });
            
            if (accountData && accountData.account) {
                console.log(`✅ zkApp account successfully fetched on attempt ${attempt}`);
                const balance = Number(accountData.account.balance?.toString() || '0');
                console.log(`🔍 Account Balance: ${balance} nanomina (${(balance / 1e9).toFixed(1)} MINA)`);
                
                // Check if it's a zkApp account
                if (accountData.account.zkapp) {
                    console.log(`✅ Account Status: ACTIVATED zkApp`);
                    if (accountData.account.zkapp.appState) {
                        const appState = accountData.account.zkapp.appState.map(field => field.toString()).join(', ');
                        console.log(`🔍 App State: ${appState}`);
                    }
                } else {
                    console.log(`ℹ️  Account Status: Regular account (not zkApp)`);
                }
                
                return true;
            } else {
                throw new Error('Account data is null or undefined');
            }
        } catch (error: any) {
            console.log(`   ❌ Attempt ${attempt} failed: ${error.message}`);
            
            if (attempt === maxAttempts) {
                console.error(`❌ Failed to fetch zkApp account after ${maxAttempts} attempts`);
                console.error(`❌ Final error: ${error.message}`);
                return false;
            }
            
            if (attempt < maxAttempts) {
                console.log(`   ⏳ Waiting ${delayMs}ms before retry...`);
                await new Promise(resolve => setTimeout(resolve, delayMs));
            }
        }
    }
    
    return false;
}

/**
 * Safe contract state retrieval with proper error handling
 * This wraps the zkApp.getRegistryInfo() call with fetchAccount() first
 */
export async function safelyGetContractState(zkApp: any, zkAppAddress: PublicKey, phase: string = 'UNKNOWN') {
    console.log(`\n🔍 ${phase === 'BEFORE' ? 'Smart Contract State BEFORE Verification:' : phase === 'AFTER' ? 'Contract state AFTER verification:' : 'Fetching contract state...'}`);
    
    // First, safely fetch the account
    const accountFetched = await safelyFetchZkAppAccount(zkAppAddress);
    
    if (!accountFetched) {
        console.error(`❌ Could not fetch zkApp account for address: ${zkAppAddress.toBase58()}`);
        throw new Error(`Failed to fetch zkApp account: ${zkAppAddress.toBase58()}`);
    }
    
    try {
        // Now safely call the contract method
        console.log(`✅ zkApp account state fetched from ${environmentManager.shouldConnectToDevnet() ? 'DEVNET' : environmentManager.getCurrentEnvironment()}`);
        
        const state = zkApp.getRegistryInfo();
        
        // Calculate compliance percentage
        const totalCompanies = Number(state.totalCompaniesTracked.toString());
        const compliantCompanies = Number(state.compliantCompaniesCount.toString());
        const compliancePercentage = totalCompanies > 0 ? Math.round((compliantCompanies / totalCompanies) * 100) : 0;
        
        console.log(`  Total Companies: ${totalCompanies}`);
        console.log(`  Compliant Companies: ${compliantCompanies}`);
        console.log(`  Global Compliance Score: ${compliancePercentage}%`);
        console.log(`  Total Verifications: ${state.totalVerificationsGlobal.toString()}`);
        console.log(`  Companies Root Hash: ${state.companiesRootHash.toString()}`);
        console.log(`  Registry Version: ${state.registryVersion.toString()}`);
        
        return state;
    } catch (error: any) {
        console.error(`❌ Error reading contract state: ${error.message}`);
        throw error;
    }
}

/**
 * Enhanced version of logSmartContractState with safe fetching
 */
export async function safeLogSmartContractState(
    zkApp: any,
    zkAppAddress: PublicKey,
    phase: string = 'BEFORE'
): Promise<any> {
    try {
        const state = await safelyGetContractState(zkApp, zkAppAddress, phase);
        return state;
    } catch (error: any) {
        console.error(`❌ Failed to log smart contract state (${phase}): ${error.message}`);
        throw error;
    }
}