/**
 * Enhanced Transaction Wrapper for GLEIF Verification
 * Implements comprehensive transaction monitoring and state verification
 * FIXED: Now environment-aware for LOCAL, TESTNET, and MAINNET
 */

import { Field, Mina, PublicKey, UInt64, PrivateKey, Bool, AccountUpdate, fetchAccount } from 'o1js';
import { TransactionMonitor, TransactionResult, calculateOptimalFee } from './TransactionMonitor.js';
import { 
  GLEIFOptimMultiCompanySmartContract,
  GLEIFCompanyRecord, 
  CompanyMerkleWitness 
} from '../../contracts/complaince/GLEIF/GLEIFMultiSmartContract.js';
import { GLEIFOptimComplianceData } from '../../zk-programs/compliance/GLEIFZKProgram.js';
import { BaseVerificationCore } from '../../impl/verification-base/BaseVerificationCore.js';

/**
 * Enhanced verification transaction with comprehensive monitoring
 * This replaces the basic Mina.transaction pattern with proper state verification
 */
export async function executeVerificationTransactionWithMonitoring(
  zkApp: GLEIFOptimMultiCompanySmartContract,
  zkAppAddress: PublicKey,
  senderAccount: PublicKey,
  senderKey: PrivateKey,
  companyName: string,
  proof: any,
  complianceData: GLEIFOptimComplianceData,
  companyRecord: GLEIFCompanyRecord,
  companyWitness: CompanyMerkleWitness,
  companiesMapWitness: any, // MerkleMapWitness
  isCompliant: Bool,
  environment: string
): Promise<TransactionResult> {
  
  console.log(`\n🔍 ENHANCED VERIFICATION TRANSACTION: ${companyName}`);
  console.log('='.repeat(80));
  
  // Calculate optimal fee
  const fee = calculateOptimalFee(environment, 'verify');
  console.log(`💰 Using verification fee: ${fee.toString()} nanomina (${Number(fee.toString()) / 1e9} MINA)`);
  
  // Define expected state changes
  const expectedStateChanges = {
    field_0: '1', // Total companies should increment
    field_1: isCompliant.toJSON() ? '1' : '0', // Compliant companies should increment if compliant
  };
  
  // Execute transaction with comprehensive monitoring
  const transactionResult = await TransactionMonitor.executeAndVerify(
    async () => {
      console.log(`🚀 Creating verification transaction for ${companyName}...`);
      
      const txn = await Mina.transaction(
        {
          sender: senderAccount,
          fee: fee,
        },
        async () => {
          // Call the smart contract method
          await zkApp.verifyOptimizedComplianceWithProof(
            proof,
            companyWitness,
            companyRecord,
            companiesMapWitness
          );
        }
      );
      
      console.log(`✍️ Signing transaction for ${companyName}...`);
      const signedTxn = await txn.sign([senderKey]).send();
      
      console.log(`📤 Transaction submitted: ${signedTxn.hash}`);
      const baseCore = new BaseVerificationCore();
      console.log(`🔗 Track transaction: ${baseCore.getExplorerUrl('tx', signedTxn.hash)}`);
      
      return signedTxn;
    },
    zkAppAddress,
    expectedStateChanges,
    `GLEIF Verification for ${companyName}`
  );
  
  // Additional logging based on results
  if (transactionResult.executionSuccess) {
    console.log(`\n✅ TRANSACTION SUCCESSFUL: ${companyName}`);
    console.log(`   📊 State properly updated on-chain`);
    console.log(`   🔗 Transaction hash: ${transactionResult.transaction.hash}`);
  } else {
    console.log(`\n❌ TRANSACTION FAILED: ${companyName}`);
    console.log(`   🚨 State was NOT updated on-chain`);
    console.log(`   🔍 This indicates the transaction did not execute properly`);
    
    // Throw error to stop execution for failed transactions
    throw new Error(`Verification transaction failed for ${companyName}: State not updated on-chain`);
  }
  
  return transactionResult;
}

/**
 * Enhanced deployment transaction with monitoring
 */
export async function executeDeploymentTransactionWithMonitoring(
  zkApp: GLEIFOptimMultiCompanySmartContract,
  zkAppAddress: PublicKey,
  zkAppKey: PrivateKey,
  deployerAccount: PublicKey,
  deployerKey: PrivateKey,
  verificationKey: any,
  environment: string
): Promise<TransactionResult> {
  
  console.log(`\n🚀 ENHANCED DEPLOYMENT TRANSACTION`);
  console.log('='.repeat(80));
  
  // Calculate optimal fee for deployment
  const deploymentFee = calculateOptimalFee(environment, 'deploy');
  
  console.log(`💰 Using deployment fee: ${deploymentFee.toString()} nanomina (${Number(deploymentFee.toString()) / 1e9} MINA)`);
  console.log(`📋 Deployment Details:`);
  console.log(`   • Deployer Account: ${deployerAccount.toBase58()}`);
  console.log(`   • zkApp Account: ${zkAppAddress.toBase58()} (NEW - will be created)`);
  console.log(`   • Account Creation Cost: 3 MINA (funded by deployer)`);
  console.log(`   • Transaction Fee: ${Number(deploymentFee.toString()) / 1e9} MINA`);
  console.log(`   • Total Cost: ${(Number(deploymentFee.toString()) + 3000000000) / 1e9} MINA`);
  
  // Execute deployment with monitoring
  const transactionResult = await TransactionMonitor.executeAndVerify(
    async () => {
      console.log(`🚀 Creating SINGLE deployment transaction (SIMPLIFIED APPROACH)...`);
      console.log(`📝 Note: 'Creating account' means creating the zkApp account, NOT the deployer account`);
      
      try {
        const deployTxn = await Mina.transaction(
          {
            sender: deployerAccount,
            fee: deploymentFee,
          },
          async () => {
            console.log(`   💰 Step 1: Funding new zkApp account with 3 MINA...`);
            AccountUpdate.fundNewAccount(deployerAccount, 3);
            console.log(`   🚀 Step 2: Deploying zkApp smart contract...`);
            await zkApp.deploy({ verificationKey });
          }
        );
        
        console.log(`✅ Transaction created successfully`);
        console.log(`📊 Transaction structure:`);
        const txnJson = JSON.parse(deployTxn.toJSON());
        console.log(`   • Account updates: ${txnJson.accountUpdates?.length || 0}`);
        console.log(`   • Fee payer: ${txnJson.feePayer?.body?.publicKey || 'Unknown'}`);
        
        console.log(`✍️ Signing deployment transaction...`);
        const signedTxn = await deployTxn.sign([deployerKey, zkAppKey]).send();
        
        console.log(`📤 Deployment transaction submitted: ${signedTxn.hash}`);
        const baseCore = new BaseVerificationCore();
        console.log(`🔗 Track transaction: ${baseCore.getExplorerUrl('tx', signedTxn.hash)}`);
        
        return signedTxn;
        
      } catch (txnError: any) {
        console.error(`❌ Transaction creation/submission failed:`);
        console.error(`   Error: ${txnError.message}`);
        console.error(`   Type: ${txnError.constructor.name}`);
        if (txnError.stack) {
          console.error(`   Stack: ${txnError.stack.substring(0, 500)}...`);
        }
        throw txnError;
      }
    },
    zkAppAddress,
    {}, // No specific state changes expected for deployment - verification will be done differently
    'zkApp Deployment (Single Transaction)'
  );
  
  if (transactionResult.executionSuccess || transactionResult.stateChanged) {
    console.log(`\n✅ DEPLOYMENT SUCCESSFUL`);
    console.log(`   📊 Contract deployed and activated`);
    console.log(`   🏠 Contract address: ${zkAppAddress.toBase58()}`);
  } else {
    // For deployments, we need special handling as the account might not be immediately accessible
    console.log(`\n⚠️ Deployment status unclear - performing additional verification...`);
    
    // Wait a bit more for the deployment to propagate
    await new Promise(resolve => setTimeout(resolve, 10000)); // 10 seconds
    
    try {
      // Try to fetch the account and verify it exists
      await fetchAccount({ publicKey: zkAppAddress });
      const account = Mina.getAccount(zkAppAddress);
      
      if (account && account.zkapp) {
        console.log(`\n✅ DEPLOYMENT VERIFIED`);
        console.log(`   📊 zkApp account successfully created`);
        console.log(`   💵 Account balance: ${account.balance.toString()} nanomina`);
        console.log(`   🏠 Contract address: ${zkAppAddress.toBase58()}`);
        return transactionResult; // Deployment was actually successful
      } else {
        console.log(`\n❌ DEPLOYMENT FAILED`);
        console.log(`   🚨 Contract was NOT properly deployed`);
        throw new Error(`Deployment transaction failed: Contract not activated`);
      }
    } catch (verificationError) {
      console.log(`\n❌ DEPLOYMENT VERIFICATION FAILED`);
      console.log(`   🚨 Cannot verify contract deployment: ${verificationError}`);
      throw new Error(`Deployment transaction failed: Contract not activated`);
    }
  }
  
  return transactionResult;
}

/**
 * Verify contract state matches expected values
 */
export async function verifyContractState(
  zkApp: GLEIFOptimMultiCompanySmartContract,
  zkAppAddress: PublicKey,
  expectedTotalCompanies: number,
  expectedCompliantCompanies: number,
  description: string = 'Contract State'
): Promise<boolean> {
  
  console.log(`\n🔍 VERIFYING CONTRACT STATE: ${description}`);
  console.log('-'.repeat(50));
  
  try {
    // Fetch fresh account state
    await fetchAccount({ publicKey: zkAppAddress });
    
    // Get contract state
    const registryInfo = zkApp.getRegistryInfo();
    const actualTotalCompanies = Number(registryInfo.totalCompaniesTracked.toString());
    const actualCompliantCompanies = Number(registryInfo.compliantCompaniesCount.toString());
    
    console.log(`📊 Expected: ${expectedTotalCompanies} total, ${expectedCompliantCompanies} compliant`);
    console.log(`📊 Actual: ${actualTotalCompanies} total, ${actualCompliantCompanies} compliant`);
    
    const totalMatches = actualTotalCompanies === expectedTotalCompanies;
    const compliantMatches = actualCompliantCompanies === expectedCompliantCompanies;
    
    if (totalMatches && compliantMatches) {
      console.log(`✅ Contract state matches expected values`);
      return true;
    } else {
      console.log(`❌ Contract state mismatch:`);
      if (!totalMatches) {
        console.log(`   Total companies: expected ${expectedTotalCompanies}, got ${actualTotalCompanies}`);
      }
      if (!compliantMatches) {
        console.log(`   Compliant companies: expected ${expectedCompliantCompanies}, got ${actualCompliantCompanies}`);
      }
      return false;
    }
    
  } catch (error) {
    console.error(`❌ Failed to verify contract state: ${error}`);
    return false;
  }
}
