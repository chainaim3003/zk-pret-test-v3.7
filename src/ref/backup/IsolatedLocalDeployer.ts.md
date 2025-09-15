/**
 * Isolated LOCAL Deployment - No Oracle Dependencies
 * Pure O1JS LocalBlockchain deployment without any infrastructure
 */

import { PrivateKey, PublicKey, Mina, AccountUpdate } from 'o1js';

interface LocalDeploymentResult {
  success: boolean;
  contractAddress: string;
  deployerAddress: string;
  senderAddress: string;
  deploymentTime: number;
  error?: string;
}

export class IsolatedLocalDeployer {
  /**
   * Deploy contract using pure O1JS with zero external dependencies
   * ✅ No Oracle system interference
   * ✅ No environment infrastructure
   * ✅ Just LocalBlockchain + Contract + Deploy
   */
  static async deploy(contractName: string): Promise<LocalDeploymentResult> {
    const deploymentStart = Date.now();
    
    try {
      console.log('🔒 ISOLATED LOCAL Deployment - Zero Dependencies');
      console.log('===============================================');
      
      // Step 1: Create isolated LocalBlockchain
      console.log('📱 Creating isolated LocalBlockchain...');
      const Local = await Mina.LocalBlockchain({ proofsEnabled: false });
      Mina.setActiveInstance(Local);
      
      // Step 2: Use test accounts directly
      const deployerAccount = Local.testAccounts[0].key;
      const senderAccount = Local.testAccounts[1].key;
      
      console.log('👤 Test accounts:');
      console.log(`   Deployer: ${deployerAccount.toPublicKey().toBase58()}`);
      console.log(`   Sender: ${senderAccount.toPublicKey().toBase58()}`);
      
      // Step 3: Direct contract import (bypass all infrastructure)
      console.log('⚙️ Loading contract directly...');
      
      // Try to load contract without triggering Oracle system
      let ContractClass;
      try {
        const contractPath = `../contracts/with-sign/${contractName}.js`;
        const contractModule = await import(contractPath);
        ContractClass = contractModule[contractName];
        
        if (!ContractClass) {
          throw new Error(`Contract class '${contractName}' not found`);
        }
      } catch (error) {
        console.log('⚠️ Direct import failed, trying alternative approach...');
        // Alternative: try loading from build directory
        try {
          const altPath = `../../build/contracts/with-sign/${contractName}.js`;
          const altModule = await import(altPath);
          ContractClass = altModule[contractName];
        } catch (altError) {
          throw new Error(`Cannot load contract ${contractName}: ${error}`);
        }
      }
      
      // Step 4: Compile ZK program dependencies first
      console.log('🔄 Compiling ZK program dependencies...');
      
      try {
        // Import and compile the ZK program that the contract depends on
        const { GLEIFOptim } = await import('../../zk-programs/compliance/GLEIFZKProgram.js');
        await GLEIFOptim.compile();
        console.log('✅ GLEIFOptim ZK program compiled');
      } catch (zkError) {
        console.log(`❌ ZK program compilation failed: ${zkError}`);
        throw new Error(`ZK program compilation failed: ${zkError}`);
      }
      
      // Step 5: Compile the smart contract
      console.log('🔄 Compiling smart contract...');
      
      let verificationKey: any;
      try {
        const result = await ContractClass.compile();
        verificationKey = result.verificationKey;
        console.log(`✅ Smart contract compiled successfully`);
      } catch (compileError) {
        console.log(`❌ Smart contract compilation failed: ${compileError}`);
        throw new Error(`Smart contract compilation failed: ${compileError}`);
      }
      
      // Step 6: Simple deployment without Oracle interference
      const zkAppPrivateKey = PrivateKey.random();
      const zkAppAddress = zkAppPrivateKey.toPublicKey();
      
      console.log('🚀 Deploying...');
      console.log(`📍 Address: ${zkAppAddress.toBase58()}`);
      
      const contract = new ContractClass(zkAppAddress);
      
      // Simple transaction with verification key
      const deployTx = await Mina.transaction(senderAccount.toPublicKey(), async () => {
        AccountUpdate.fundNewAccount(senderAccount.toPublicKey());
        await contract.deploy({ verificationKey });
      });
      
      console.log('⚡ Proving...');
      await deployTx.prove();
      
      console.log('✍️ Signing...');
      deployTx.sign([senderAccount, zkAppPrivateKey]);
      
      console.log('📡 Sending...');
      const txResult = await deployTx.send();
      
      if (txResult.status === 'pending') {
        const totalTime = Date.now() - deploymentStart;
        
        console.log('✅ ISOLATED deployment successful!');
        console.log(`🆔 TX: ${txResult.hash}`);
        console.log(`⏱️ Time: ${totalTime}ms`);
        
        return {
          success: true,
          contractAddress: zkAppAddress.toBase58(),
          deployerAddress: deployerAccount.toPublicKey().toBase58(),
          senderAddress: senderAccount.toPublicKey().toBase58(),
          deploymentTime: totalTime
        };
      } else {
        throw new Error(`Transaction failed: ${JSON.stringify(txResult.errors)}`);
      }
      
    } catch (error) {
      const totalTime = Date.now() - deploymentStart;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      console.log('❌ ISOLATED deployment failed!');
      console.log(`⏱️ Failed after: ${totalTime}ms`);
      console.log(`💥 Error: ${errorMessage}`);
      
      return {
        success: false,
        contractAddress: '',
        deployerAddress: '',
        senderAddress: '',
        deploymentTime: totalTime,
        error: errorMessage
      };
    }
  }
}
