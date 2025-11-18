/**
 * GLEIF Multi-Company Smart Contract Deployer
 * Pure deployment logic with o1js best practices
 * 
 * Responsibilities:
 * ✅ Environment detection and Oracle registry initialization
 * ✅ Check existing deployment from config/{env}.json  
 * ✅ Contract accessibility verification with retry logic
 * ✅ Deploy ONLY if needed with optimized fees (1.1 MINA total)
 * ✅ Save deployment info to config
 * ✅ Enhanced verification and error handling
 */

import * as dotenv from 'dotenv';
dotenv.config();

// Import o1js directly
import { Mina, PrivateKey, PublicKey, AccountUpdate, UInt64, fetchAccount } from 'o1js';

// Import ZK programs and contracts
import { GLEIFOptim } from '../../../zk-programs/with-sign/GLEIFOptimZKProgram.js';
import { GLEIFOptimMultiCompanySmartContract } from '../../../contracts/with-sign/GLEIFOptimMultiCompanySmartContract.js';

// Import infrastructure components
import { 
  initializeOracleRegistry,
  environmentManager,
  compilationManager,
  deploymentManager,
  getDeployerAccount,
  getDeployerKey
} from '../../../infrastructure/index.js';

// Import enhanced deployment verification
import { executeDeploymentWithRealVerification } from '../../../utils/transaction/EnhancedDeploymentVerification.js';

// Import shared utilities
import {
  getTransactionFee,
  checkContractAccessibility,
  displayDeploymentCosts,
  displayDeploymentSummary,
  getContractDeploymentInfo,
  displayBuildEnvironmentInfo,
  validateBuildEnvironment
} from '../GLEIFMultiCompanySharedUtils.js';



/**
 * Environment-aware deployment messaging and links
 */
function getEnvironmentDisplayInfo(currentEnvironment: string) {
  switch (currentEnvironment) {
    case 'LOCAL':
      return {
        networkName: 'Local Blockchain',
        explorerBase: 'local://blockchain',
        networkDescription: 'Local development blockchain',
        activationTime: 'Immediate',
        cost: 'FREE (local testing)'
      };
    case 'TESTNET':
      return {
        networkName: 'MINA DEVNET',
        explorerBase: 'https://minascan.io/devnet',
        networkDescription: 'MINA DEVNET (testnet blockchain)',
        activationTime: '15-30 minutes',
        cost: '1.1 MINA'
      };
    case 'MAINNET':
      return {
        networkName: 'MINA MAINNET',
        explorerBase: 'https://minascan.io/mainnet',
        networkDescription: 'MINA MAINNET (production blockchain)',
        activationTime: '30-60 minutes',
        cost: '2.2 MINA'
      };
    default:
      return {
        networkName: 'Unknown Network',
        explorerBase: 'https://minascan.io',
        networkDescription: 'Unknown blockchain',
        activationTime: 'Unknown',
        cost: 'Unknown'
      };
  }
}

/**
 * Environment-aware next steps display
 */
function displayEnvironmentAwareNextSteps(currentEnvironment: string, contractAddress: string, wasDeployed: boolean) {
  const envInfo = getEnvironmentDisplayInfo(currentEnvironment);
  
  console.log('\n📋 Next Steps:');
  
  if (currentEnvironment === 'LOCAL') {
    console.log('  1. ✅ Contract deployed on local blockchain');
    console.log('  2. 🔄 Run verification tests immediately');
    console.log('  3. 🚀 Ready for local development and testing');
    console.log('  4. 🌐 No external explorer (local blockchain)');
  } else if (currentEnvironment === 'TESTNET') {
    if (wasDeployed) {
      console.log('  1. ⏳ Wait 15-30 minutes for DEVNET zkApp activation');
      console.log(`  2. 🔍 Check contract: ${envInfo.explorerBase}/account/${contractAddress}`);
      console.log('  3. ✅ Once activated, run GLEIFMultiCompanyVerifier.ts');
      console.log('  4. 🌐 Monitor on MinaScan DEVNET explorer');
      console.log('');
      console.log('  ⚠️  IMPORTANT: Contract is NOT ready for verification yet!');
      console.log('  ⚠️  DEVNET requires 15-30 minutes for zkApp activation');
      console.log('  ⚠️  Running verification now will fail');
    } else {
      console.log('  1. ✅ Existing contract verified and active');
      console.log('  2. 🔄 Run GLEIFMultiCompanyVerifier.ts immediately');
      console.log(`  3. 🔍 Monitor: ${envInfo.explorerBase}/account/${contractAddress}`);
    }
  } else if (currentEnvironment === 'MAINNET') {
    if (wasDeployed) {
      console.log('  1. ⏳ Wait 30-60 minutes for MAINNET zkApp activation');
      console.log(`  2. 🔍 Check contract: ${envInfo.explorerBase}/account/${contractAddress}`);
      console.log('  3. ⚠️  PRODUCTION CONTRACT - exercise caution!');
      console.log('  4. ✅ Once activated, run production verification');
    } else {
      console.log('  1. ✅ Production contract active and verified');
      console.log('  2. 🔄 Ready for production verification');
      console.log(`  3. 🔍 Monitor: ${envInfo.explorerBase}/account/${contractAddress}`);
    }
  }
}
export async function deployGLEIFMultiCompanySmartContract(
  forceRedeploy: boolean = false
): Promise<{
  contractAddress: string;
  transactionHash?: string;
  wasDeployed: boolean;
  verificationKey: any;
}> {
  
  // Get environment info early for consistent messaging
  const currentEnvironment = process.env.BUILD_ENV || 'LOCAL';
  const envInfo = getEnvironmentDisplayInfo(currentEnvironment);
  
  console.log('\n🚀 GLEIF Multi-Company Smart Contract Deployer');
  console.log('='.repeat(60));
  console.log(`🌍 Target Network: ${envInfo.networkName}`);
  console.log(`📋 Environment: ${currentEnvironment}`);
  console.log(`🔧 Force Redeploy: ${forceRedeploy ? 'YES' : 'NO'}`);
  console.log(`💰 Expected Cost: ${envInfo.cost}`);
  console.log('='.repeat(60));
  
  try {
    // =================================== Validate BUILD_ENV ===================================
    console.log('\n📋 Step 0: Validating BUILD_ENV configuration...');
    
    const envValidation = validateBuildEnvironment();
    if (!envValidation.isValid) {
      console.error('❌ BUILD_ENV validation failed:');
      envValidation.issues.forEach(issue => console.error(`  • ${issue}`));
      throw new Error('Invalid BUILD_ENV configuration');
    }
    
    // Display BUILD_ENV information
    const buildInfo = displayBuildEnvironmentInfo();
    console.log(`✅ BUILD_ENV validation passed`);
    console.log(`📁 Deployment will be saved to: ${buildInfo.configFile}`);
    
    // =================================== Initialize Infrastructure ===================================
    console.log('\n📋 Step 1: Initializing infrastructure components...');
    
    // Initialize Oracle Registry
    await initializeOracleRegistry();
    
    // Get environment details
    const currentEnvironment = environmentManager.getCurrentEnvironment();
    const shouldConnectToDevnet = environmentManager.shouldConnectToDevnet();
    
    console.log(`✅ Environment: ${currentEnvironment}`);
    console.log(`🌐 Connect to DEVNET: ${shouldConnectToDevnet}`);
    
    // Initialize compilation manager
    await compilationManager.initialize();
    console.log('✅ Compilation Manager initialized');

    // =================================== Setup Blockchain Environment ===================================
    console.log('\n📋 Step 2: Setting up blockchain environment...');
    console.log(`🌍 Configuring for: ${envInfo.networkName}`);
    
    let deployerAccount: any;
    let deployerKey: any;
    
    if (currentEnvironment === 'TESTNET' && shouldConnectToDevnet) {
      // DEVNET MODE: Use Oracle Registry funded accounts
      console.log('🌐 DEVNET environment detected - using funded Oracle accounts');
      console.log(`💰 Expected deployment cost: ${envInfo.cost}`);
      
      // Establish DEVNET connection
      console.log('🔧 Connecting to DEVNET GraphQL endpoint...');
      const devnetNetwork = Mina.Network('https://api.minascan.io/node/devnet/v1/graphql');
      Mina.setActiveInstance(devnetNetwork);
      console.log('✅ DEVNET connection established');
      
      // Get funded Oracle accounts
      try {
        deployerAccount = getDeployerAccount('GLEIF');
        deployerKey = getDeployerKey('GLEIF');
        
        // Verify deployer account
        await fetchAccount({ publicKey: deployerAccount });
        const accountInfo = Mina.getAccount(deployerAccount);
        const balance = Number(accountInfo.balance.toString()) / 1e9;
        
        console.log('✅ Blockchain environment initialized with DEVNET Oracle accounts');
        console.log(`  🎯 GLEIF Deployer: ${deployerAccount.toBase58()}`);
        console.log(`  💰 Balance: ${balance} MINA`);
        console.log(`  🌐 Connected to: ${envInfo.networkDescription}`);
        
        if (balance < 2) {
          throw new Error(`Insufficient balance: ${balance} MINA (need at least 2 MINA)`);
        }
        
      } catch (oracleError) {
        console.error('❌ Failed to get Oracle accounts:', oracleError);
        throw new Error(`Oracle Registry not properly initialized for DEVNET: ${oracleError}`);
      }
      
    } else if (currentEnvironment === 'MAINNET') {
      // MAINNET MODE: Use production Oracle Registry
      console.log('🌐 MAINNET environment detected - using production Oracle accounts');
      console.log('⚠️  PRODUCTION DEPLOYMENT - exercise extreme caution!');
      console.log(`💰 Expected deployment cost: ${envInfo.cost}`);
      
      // Establish MAINNET connection
      console.log('🔧 Connecting to MAINNET GraphQL endpoint...');
      const mainnetNetwork = Mina.Network('https://api.minascan.io/node/mainnet/v1/graphql');
      Mina.setActiveInstance(mainnetNetwork);
      console.log('✅ MAINNET connection established');
      
      // Get production Oracle accounts
      try {
        deployerAccount = getDeployerAccount('GLEIF');
        deployerKey = getDeployerKey('GLEIF');
        
        // Verify deployer account
        await fetchAccount({ publicKey: deployerAccount });
        const accountInfo = Mina.getAccount(deployerAccount);
        const balance = Number(accountInfo.balance.toString()) / 1e9;
        
        console.log('✅ Blockchain environment initialized with MAINNET Oracle accounts');
        console.log(`  🎯 GLEIF Deployer: ${deployerAccount.toBase58()}`);
        console.log(`  💰 Balance: ${balance} MINA`);
        console.log(`  🌐 Connected to: ${envInfo.networkDescription}`);
        
        if (balance < 5) {
          throw new Error(`Insufficient balance: ${balance} MINA (need at least 5 MINA for MAINNET)`);
        }
        
      } catch (oracleError) {
        console.error('❌ Failed to get Oracle accounts:', oracleError);
        throw new Error(`Oracle Registry not properly initialized for MAINNET: ${oracleError}`);
      }
      
    } else {
      // LOCAL MODE: Use LocalBlockchain for development
      console.log(`🔧 LOCAL environment - creating LocalBlockchain for development`);
      console.log(`💰 Expected deployment cost: ${envInfo.cost}`);
      
      const useProof = false;
      const Local = await Mina.LocalBlockchain({ proofsEnabled: useProof });
      Mina.setActiveInstance(Local);

      deployerAccount = Local.testAccounts[0].key.toPublicKey();
      deployerKey = Local.testAccounts[0].key;

      console.log('✅ Blockchain environment initialized with LocalBlockchain accounts');
      console.log(`  🔧 Local Deployer: ${deployerAccount.toBase58()}`);
      console.log(`  🏠 Mode: ${envInfo.networkDescription}`);
      console.log(`  💰 Balance: Unlimited (local testing)`);
    }

    // =================================== Compile Contracts ===================================
    console.log('\n📋 Step 3: Compiling contracts...');
    
    // Compile GLEIFOptim first
    if (!compilationManager.isCompiled('GLEIFOptim')) {
      console.log('🔧 Compiling GLEIFOptim...');
      await GLEIFOptim.compile();
      console.log('✅ GLEIFOptim compiled and cached');
    } else {
      console.log('✅ GLEIFOptim already compiled (cached)');
    }
    
    // Compile main contract
    let verificationKey: any;
    if (!compilationManager.isCompiled('GLEIFOptimMultiCompanySmartContract')) {
      console.log('🔧 Compiling GLEIFOptimMultiCompanySmartContract...');
      const compilation = await GLEIFOptimMultiCompanySmartContract.compile();
      verificationKey = compilation.verificationKey;
      console.log('✅ GLEIFOptimMultiCompanySmartContract compiled and cached');
    } else {
      console.log('✅ GLEIFOptimMultiCompanySmartContract already compiled (cached)');
      const compilation = await GLEIFOptimMultiCompanySmartContract.compile();
      verificationKey = compilation.verificationKey;
    }

    // =================================== Check Existing Deployment ===================================
    console.log('\n📋 Step 4: Checking for existing deployment...');
    
    const currentConfig = await environmentManager.getCurrentConfig();
    const existingContract = currentConfig.deployments?.contracts?.GLEIFOptimMultiCompanySmartContract;
    
    let contractAddress: string;
    let transactionHash: string | undefined;
    let wasDeployed = false;
    
    if (existingContract && existingContract.address && !forceRedeploy) {
      // Found existing contract in config
      console.log(`✅ Found existing contract in config: ${existingContract.address}`);
      console.log(`📅 Deployed at: ${existingContract.deployedAt || 'Unknown'}`);
      console.log(`🔗 Transaction: ${existingContract.transactionHash || 'Unknown'}`);
      
      // Check if contract is accessible
      const zkAppAddress = PublicKey.fromBase58(existingContract.address);
      const isAccessible = await checkContractAccessibility(zkAppAddress);
      
      if (isAccessible) {
        console.log(`✅ Existing contract is accessible and functional`);
        console.log(`🔄 Skipping deployment, using existing contract`);
        
        return {
          contractAddress: existingContract.address,
          transactionHash: existingContract.transactionHash,
          wasDeployed: false,
          verificationKey
        };
      } else {
        console.log(`❌ Existing contract not accessible`);
        console.log(`🚀 Will deploy new contract instead`);
        wasDeployed = true;
      }
    } else if (forceRedeploy) {
      console.log(`🔄 Force redeploy requested - deploying new contract`);
      wasDeployed = true;
    } else {
      console.log(`📋 No existing contract found - deploying new contract`);
      wasDeployed = true;
    }

    // =================================== Deploy New Contract ===================================
    if (wasDeployed) {
      console.log('\n📋 Step 5: Deploying new smart contract...');
      
      // Generate new contract keys
      const zkAppKey = PrivateKey.random();
      const zkAppAddress = zkAppKey.toPublicKey();
      const zkApp = new GLEIFOptimMultiCompanySmartContract(zkAppAddress);

      contractAddress = zkAppAddress.toBase58();
      
      // Display deployment costs
      const deploymentFee = getTransactionFee(currentEnvironment);
      console.log(`💰 Deployment costs (o1js best practices):`);
      console.log(`   Deployment fee: ${deploymentFee.toString()} nanomina (${Number(deploymentFee.toString()) / 1e9} MINA)`);
      console.log(`   Account creation: 1000000000 nanomina (1 MINA - protocol standard)`);
      console.log(`   Total cost: ${Number(deploymentFee.toString()) + 1000000000} nanomina (${(Number(deploymentFee.toString()) + 1000000000) / 1e9} MINA)`);

      // Deploy with enhanced verification
      console.log('\n🚀 Executing deployment with o1js best practices...');
      
      const deploymentResult = await executeDeploymentWithRealVerification(
        zkApp,
        zkAppAddress,
        zkAppKey,
        deployerAccount,
        deployerKey,
        verificationKey,
        currentEnvironment
      );
      
      if (!deploymentResult.success || !deploymentResult.verified) {
        throw new Error(`Deployment verification failed: ${deploymentResult.verificationMethod}`);
      }
      
      transactionHash = deploymentResult.transactionHash;
      
      console.log(`\n✅ DEPLOYMENT SUCCESSFUL`);
      console.log(`   📊 Success: ${deploymentResult.success}`);
      console.log(`   🔍 Verified: ${deploymentResult.verified}`);
      console.log(`   🎯 Method: ${deploymentResult.verificationMethod}`);
      console.log(`   ⏱️ Time: ${deploymentResult.deploymentTime}ms`);
      console.log(`   🔗 Hash: ${deploymentResult.transactionHash}`);
      console.log(`   🏠 Address: ${contractAddress}`);

      // =================================== Save Deployment Info ===================================
      console.log('\n📋 Step 6: Saving deployment information...');
      
      try {
        await environmentManager.saveDeployment(
          'GLEIFOptimMultiCompanySmartContract',
          contractAddress,
          verificationKey,
          transactionHash
        );
        console.log(`✅ Deployment saved to config/${currentEnvironment.toLowerCase()}.json`);
      } catch (saveError: any) {
        console.warn(`⚠️ Failed to save deployment: ${saveError.message}`);
        console.log(`📝 Manual address for reference: ${contractAddress}`);
      }
      
    } else {
      // This case should not happen given the logic above, but included for completeness
      contractAddress = existingContract?.address || '';
      transactionHash = existingContract?.transactionHash;
    }

    // =================================== Final Summary ===================================
    console.log('\n📊 DEPLOYMENT SUMMARY');
    console.log('='.repeat(50));
    console.log(`✅ Status: ${wasDeployed ? 'NEW DEPLOYMENT COMPLETED' : 'EXISTING CONTRACT USED'}`);
    console.log(`🏠 Contract Address: ${contractAddress}`);
    console.log(`🌍 Network: ${envInfo.networkName}`);
    console.log(`💰 Deployer Account: ${deployerAccount.toBase58()}`);
    
    if (wasDeployed && transactionHash) {
      console.log(`🔗 Transaction: ${envInfo.explorerBase}/tx/${transactionHash}`);
      const actualCost = currentEnvironment === 'LOCAL' ? 0 : (Number(getTransactionFee(currentEnvironment).toString()) + 1000000000) / 1e9;
      console.log(`💰 Total Cost: ${actualCost} MINA`);
    } else if (!wasDeployed) {
      console.log(`💰 Total Cost: FREE (reused existing deployment)`);
    }
    
    console.log(`🔗 Contract Explorer: ${envInfo.explorerBase}/account/${contractAddress}`);
    console.log(`✅ Ready for GLEIF verification process on ${envInfo.networkName}`);
    console.log('='.repeat(50));

    return {
      contractAddress,
      transactionHash,
      wasDeployed,
      verificationKey
    };

  } catch (error) {
    console.error('\n❌ DEPLOYMENT FAILED');
    console.error('Error:', error);
    throw error;
  }
}

/**
 * Main CLI function
 */
async function main() {
  const args = process.argv.slice(2);
  const forceRedeploy = args.includes('--force-redeploy') || args.includes('-f');
  
  console.log('🚀 GLEIF Multi-Company Smart Contract Deployer');
  console.log('='.repeat(60));
  
  if (forceRedeploy) {
    console.log('⚠️  Force redeploy requested - will deploy new contract regardless of existing deployment');
  }
  
  try {
    const result = await deployGLEIFMultiCompanySmartContract(forceRedeploy);
    
    console.log('\n🎉 DEPLOYMENT PROCESS COMPLETED SUCCESSFULLY!');
    console.log(`📍 Contract Address: ${result.contractAddress}`);
    
    if (result.wasDeployed) {
      console.log(`🆕 New contract deployed`);
      console.log(`🔗 Transaction: ${result.transactionHash}`);
      console.log(`💰 Cost: 1.1 MINA (optimized with o1js best practices)`);
    } else {
      console.log(`♻️ Using existing contract (no deployment needed)`);
      console.log(`💰 Cost: FREE (reusing existing deployment)`);
    }
    
    console.log('\n📋 Next Steps:');
    
    // Get environment info for proper next steps
    const currentEnvironment = process.env.BUILD_ENV || 'LOCAL';
    displayEnvironmentAwareNextSteps(currentEnvironment, result.contractAddress, result.wasDeployed);
    
    process.exit(0);
    
  } catch (error) {
    console.error('💥 Fatal Error:', error);
    process.exit(1);
  }
}

// Run if called directly - ES Module compatible
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Check if this file is being run directly (ES Module compatible)
const isMainModule = process.argv[1] === __filename || process.argv[1]?.endsWith('GLEIFMultiCompanySmartContractDeployer.js');

if (isMainModule) {
  main().catch(err => {
    console.error('💥 Fatal Error:', err);
    process.exit(1);
  });
}