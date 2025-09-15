/**
 * Local Deployer - Clean Architecture Implementation
 * 
 * Following o1js best practices:
 * - Uses shared LocalBlockchain from BlockchainManager
 * - Gets oracle accounts from Oracle Registry
 * - No duplicate blockchain creation
 * - Clean separation of concerns
 */

import { PrivateKey, PublicKey, Mina, AccountUpdate } from 'o1js';
import { BlockchainManager } from '../../infrastructure/blockchain/BlockchainManager.js';
import { getPrivateKeyFor, getPublicKeyFor } from '../../core/OracleRegistry.js';

interface LocalDeploymentResult {
  success: boolean;
  contractAddress: string;
  deployerAddress: string;
  senderAddress: string;
  deploymentTime: number;
  error?: string;
}

export class LocalDeployer {
  /**
   * Deploy contract using clean architecture pattern
   * ✅ Uses shared LocalBlockchain (no duplication)
   * ✅ Gets oracle accounts from Oracle Registry
   * ✅ Follows o1js best practices
   */
  static async deploy(contractName: string): Promise<LocalDeploymentResult> {
    const deploymentStart = Date.now();
    
    try {
      console.log('🏠 LOCAL Deployment - Clean Architecture');
      console.log('========================================');
      
      // Step 1: Ensure shared LocalBlockchain exists (no creation if already exists)
      console.log('📱 Getting shared LocalBlockchain...');
      await BlockchainManager.ensureLocalBlockchain(false); // No proofs for speed
      console.log('✅ LocalBlockchain ready');
      
      // Step 2: Get oracle accounts from Registry (environment-aware)
      console.log('🔑 Getting oracle accounts...');
      const deployerKey = getPrivateKeyFor('MCA');
      const senderKey = getPrivateKeyFor('GLEIF');
      
      console.log('👤 Using oracle accounts:');
      console.log(`   Deployer: ${deployerKey.toPublicKey().toBase58()}`);
      console.log(`   Sender: ${senderKey.toPublicKey().toBase58()}`);
      
      // Step 3: Load contract (direct import)
      console.log('⚙️ Loading contract...');
      const contractPath = `../contracts/with-sign/${contractName}.js`;
      const contractModule = await import(contractPath);
      const ContractClass = contractModule[contractName];
      
      if (!ContractClass) {
        throw new Error(`Contract class '${contractName}' not found`);
      }
      
      // Step 4: Compile dependencies first
      console.log('🔄 Compiling dependencies...');
      try {
        const zkProgramPath = `../zk-programs/with-sign/GLEIFOptimZKProgram.js`;
        const zkProgramModule = await import(zkProgramPath);
        const GLEIFOptim = zkProgramModule.GLEIFOptim;
        
        if (GLEIFOptim) {
          console.log('   📦 Compiling GLEIFOptim...');
          await GLEIFOptim.compile();
          console.log('   ✅ GLEIFOptim compiled');
        }
      } catch (error) {
        console.log('   ⚠️ GLEIFOptim compilation skipped (optional)');
      }
      
      // Step 5: Compile main contract
      console.log('🔄 Compiling main contract...');
      const { verificationKey } = await ContractClass.compile();
      console.log(`✅ Contract compiled`);
      console.log(`🔑 VK Hash: ${verificationKey.hash}`);
      
      // Step 6: Generate zkApp address
      const zkAppPrivateKey = PrivateKey.random();
      const zkAppAddress = zkAppPrivateKey.toPublicKey();
      
      console.log('🚀 Deploying contract...');
      console.log(`📍 Address: ${zkAppAddress.toBase58()}`);
      
      // Step 7: Create and deploy 
      const contract = new ContractClass(zkAppAddress);
      
      const deployTx = await Mina.transaction(senderKey.toPublicKey(), async () => {
        AccountUpdate.fundNewAccount(senderKey.toPublicKey());
        await contract.deploy();
      });
      
      console.log('🔄 Proving transaction...');
      await deployTx.prove();
      
      console.log('✍️ Signing transaction...');
      deployTx.sign([senderKey, zkAppPrivateKey]);
      
      console.log('📡 Sending transaction...');
      const txResult = await deployTx.send();
      
      if (txResult.status === 'pending') {
        console.log('✅ LOCAL deployment successful!');
        console.log(`🆔 TX Hash: ${txResult.hash}`);
        
        const totalTime = Date.now() - deploymentStart;
        console.log(`⏱️ Total Time: ${totalTime}ms`);
        
        return {
          success: true,
          contractAddress: zkAppAddress.toBase58(),
          deployerAddress: deployerKey.toPublicKey().toBase58(),
          senderAddress: senderKey.toPublicKey().toBase58(),
          deploymentTime: totalTime
        };
      } else {
        throw new Error(`Transaction failed: ${JSON.stringify(txResult.errors)}`);
      }
      
    } catch (error) {
      const totalTime = Date.now() - deploymentStart;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      console.log('❌ LOCAL deployment failed!');
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
  
  /**
   * Alternative deployment method that uses any blockchain instance
   * Useful when tests create their own LocalBlockchain
   */
  static async deployWithCustomBlockchain(contractName: string, blockchain: any): Promise<LocalDeploymentResult> {
    const deploymentStart = Date.now();
    
    try {
      console.log('🏠 LOCAL Deployment - Custom Blockchain');
      console.log('=======================================');
      
      // Set the provided blockchain as active
      Mina.setActiveInstance(blockchain);
      
      // Use oracle accounts (environment-aware)
      const deployerKey = getPrivateKeyFor('MCA');
      const senderKey = getPrivateKeyFor('GLEIF');
      
      console.log('👤 Using oracle accounts with custom blockchain:');
      console.log(`   Deployer: ${deployerKey.toPublicKey().toBase58()}`);
      console.log(`   Sender: ${senderKey.toPublicKey().toBase58()}`);
      
      // Continue with same deployment logic...
      const contractPath = `../contracts/with-sign/${contractName}.js`;
      const contractModule = await import(contractPath);
      const ContractClass = contractModule[contractName];
      
      if (!ContractClass) {
        throw new Error(`Contract class '${contractName}' not found`);
      }
      
      console.log('🔄 Compiling main contract...');
      const { verificationKey } = await ContractClass.compile();
      console.log(`✅ Contract compiled`);
      
      const zkAppPrivateKey = PrivateKey.random();
      const zkAppAddress = zkAppPrivateKey.toPublicKey();
      const contract = new ContractClass(zkAppAddress);
      
      const deployTx = await Mina.transaction(senderKey.toPublicKey(), async () => {
        AccountUpdate.fundNewAccount(senderKey.toPublicKey());
        await contract.deploy();
      });
      
      await deployTx.prove();
      deployTx.sign([senderKey, zkAppPrivateKey]);
      const txResult = await deployTx.send();
      
      if (txResult.status === 'pending') {
        const totalTime = Date.now() - deploymentStart;
        console.log('✅ LOCAL deployment with custom blockchain successful!');
        
        return {
          success: true,
          contractAddress: zkAppAddress.toBase58(),
          deployerAddress: deployerKey.toPublicKey().toBase58(),
          senderAddress: senderKey.toPublicKey().toBase58(),
          deploymentTime: totalTime
        };
      } else {
        throw new Error(`Transaction failed: ${JSON.stringify(txResult.errors)}`);
      }
      
    } catch (error) {
      const totalTime = Date.now() - deploymentStart;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
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