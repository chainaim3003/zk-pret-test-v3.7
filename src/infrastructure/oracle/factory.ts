/**
 * Enhanced Oracle Registry Factory
 * Creates the appropriate Oracle Registry with robust validation and DEVNET connection enforcement
 */

import { OracleRegistry } from './types.js';
import { LocalOracleRegistry } from './LocalOracleRegistry.js';
import { NetworkOracleRegistry } from './NetworkOracleRegistry.js';
import { environmentManager } from '../environment/manager.js';
import { Environment } from '../environment/types.js';

export class OracleRegistryFactory {
  private static instance: OracleRegistry | null = null;
  private static instanceType: 'Local' | 'Network' | null = null;

  /**
   * Enhanced registry creation with validation
   */
  static async create(): Promise<OracleRegistry> {
    const currentEnv = environmentManager.getCurrentEnvironment();
    const expectedType = environmentManager.getExpectedRegistryType();
    
    console.log(`🏭 Oracle Registry Factory:`);
    console.log(`  Environment: ${currentEnv}`);
    console.log(`  Expected Registry Type: ${expectedType}OracleRegistry`);
    
    // If we already have an instance, validate it's the correct type
    if (OracleRegistryFactory.instance && OracleRegistryFactory.instanceType) {
      if (OracleRegistryFactory.instanceType === expectedType) {
        console.log(`♻️ Reusing existing ${expectedType}OracleRegistry instance`);
        return OracleRegistryFactory.instance;
      } else {
        console.log(`🔄 Registry type mismatch. Expected: ${expectedType}, Got: ${OracleRegistryFactory.instanceType}`);
        console.log(`🔄 Resetting and creating new registry...`);
        await OracleRegistryFactory.reset();
      }
    }

    let registry: OracleRegistry;

    // Enhanced registry selection with explicit validation
    if (currentEnv === Environment.LOCAL) {
      console.log('🔧 Creating LocalOracleRegistry (local blockchain)');
      registry = new LocalOracleRegistry();
      OracleRegistryFactory.instanceType = 'Local';
    } else if (currentEnv === Environment.TESTNET) {
      console.log('🌐 Creating NetworkOracleRegistry for TESTNET (DEVNET connection)');
      console.log('🔗 This WILL connect to real MINA DEVNET blockchain');
      registry = new NetworkOracleRegistry(currentEnv);
      OracleRegistryFactory.instanceType = 'Network';
    } else if (currentEnv === Environment.MAINNET) {
      console.log('🌐 Creating NetworkOracleRegistry for MAINNET');
      registry = new NetworkOracleRegistry(currentEnv);
      OracleRegistryFactory.instanceType = 'Network';
    } else {
      throw new Error(`Unsupported environment: ${currentEnv}`);
    }

    // Initialize and validate
    console.log(`🚀 Initializing ${registry.constructor.name}...`);
    await registry.initialize();

    // Post-initialization validation
    OracleRegistryFactory.validateRegistry(registry, expectedType);

    OracleRegistryFactory.instance = registry;
    return registry;
  }

  /**
   * Enhanced validation after registry creation
   */
  private static validateRegistry(registry: OracleRegistry, expectedType: 'Local' | 'Network'): void {
    const actualType = registry instanceof LocalOracleRegistry ? 'Local' : 'Network';
    
    console.log(`🔍 Registry Validation:`);
    console.log(`  Expected: ${expectedType}OracleRegistry`);
    console.log(`  Actual: ${actualType}OracleRegistry`);
    
    if (actualType !== expectedType) {
      const error = `Registry type mismatch! Expected ${expectedType}OracleRegistry but got ${actualType}OracleRegistry`;
      console.error(`❌ ${error}`);
      throw new Error(error);
    }
    
    // Special validation for TESTNET/DEVNET
    const currentEnv = environmentManager.getCurrentEnvironment();
    if (currentEnv === Environment.TESTNET) {
      if (registry instanceof LocalOracleRegistry) {
        const error = 'CRITICAL: LocalOracleRegistry detected for TESTNET environment - will NOT connect to DEVNET!';
        console.error(`❌ ${error}`);
        throw new Error(error);
      } else {
        console.log('✅ VERIFIED: NetworkOracleRegistry confirmed for TESTNET - will connect to DEVNET');
      }
    }
    
    console.log(`✅ Registry validation passed`);
  }

  /**
   * Get the current Oracle Registry instance (must be created first)
   */
  static getInstance(): OracleRegistry {
    if (!OracleRegistryFactory.instance) {
      throw new Error('Oracle Registry not created. Call OracleRegistryFactory.create() first.');
    }
    return OracleRegistryFactory.instance;
  }

  /**
   * Get current instance for debugging (public access)
   */
  static getCurrentInstance(): OracleRegistry | null {
    return OracleRegistryFactory.instance;
  }

  /**
   * Get current instance type for debugging (public access)
   */
  static getCurrentInstanceType(): 'Local' | 'Network' | null {
    return OracleRegistryFactory.instanceType;
  }

  /**
   * Enhanced verification with detailed logging
   */
  static verifyNetworkConnection(): void {
    const currentEnv = environmentManager.getCurrentEnvironment();
    const registry = OracleRegistryFactory.getCurrentInstance();
    const instanceType = OracleRegistryFactory.getCurrentInstanceType();
    
    console.log(`🔍 Network Connection Verification:`);
    console.log(`  Environment: ${currentEnv}`);
    console.log(`  Registry Type: ${instanceType}OracleRegistry`);
    console.log(`  Registry Instance: ${registry?.constructor.name}`);
    
    if (currentEnv === Environment.TESTNET) {
      if (!registry || registry instanceof LocalOracleRegistry) {
        const error = 'DEVNET Connection Error: LocalOracleRegistry detected for TESTNET environment';
        console.error(`❌ ${error}`);
        throw new Error(error);
      } else {
        console.log('✅ DEVNET Connection Verified: NetworkOracleRegistry active');
        console.log('🌐 Transactions will appear in DEVNET explorer');
      }
    }
  }

  /**
   * Reset the factory (useful for environment switching)
   */
  static async reset(): Promise<void> {
    if (OracleRegistryFactory.instance) {
      await OracleRegistryFactory.instance.cleanup();
      OracleRegistryFactory.instance = null;
      OracleRegistryFactory.instanceType = null;
    }
  }

  /**
   * Switch to a different environment
   */
  static async switchEnvironment(environment: Environment): Promise<OracleRegistry> {
    console.log(`🔄 Switching Oracle Registry to ${environment}`);
    
    // Cleanup current instance
    await OracleRegistryFactory.reset();
    
    // Switch environment in the environment manager
    await environmentManager.switchEnvironment(environment);
    
    // Create new registry for the new environment
    return await OracleRegistryFactory.create();
  }
}

// Enhanced convenience functions with comprehensive validation
let currentRegistry: OracleRegistry | null = null;

/**
 * Enhanced initialization with comprehensive validation
 */
export async function initializeOracleRegistry(): Promise<void> {
  console.log('\n🚀 Starting Enhanced Oracle Registry Initialization...\n');
  
  // Step 1: Validate environment
  const currentEnv = environmentManager.getCurrentEnvironment();
  const shouldUseNetwork = environmentManager.shouldUseNetworkRegistry();
  const shouldConnectToDevnet = environmentManager.shouldConnectToDevnet();
  
  console.log('📊 Pre-initialization Status:');
  console.log(`  Environment: ${currentEnv}`);
  console.log(`  Should use NetworkOracleRegistry: ${shouldUseNetwork}`);
  console.log(`  Should connect to DEVNET: ${shouldConnectToDevnet}`);
  console.log(`  Expected blockchain: ${shouldConnectToDevnet ? 'MINA DEVNET' : shouldUseNetwork ? 'MINA MAINNET' : 'Local Test Chain'}`);
  
  // Step 2: Create registry
  console.log('\n🏗️ Creating Oracle Registry...');
  currentRegistry = await OracleRegistryFactory.create();
  
  // Step 3: Verify connection
  console.log('\n🔍 Verifying Network Connection...');
  OracleRegistryFactory.verifyNetworkConnection();
  
  // Step 4: Final status
  console.log('\n✅ Oracle Registry Initialization Complete!');
  console.log(`📡 Blockchain Target: ${shouldConnectToDevnet ? 'MINA DEVNET' : shouldUseNetwork ? 'MINA MAINNET' : 'Local Test Chain'}`);
  console.log(`🔗 Registry Type: ${currentRegistry.constructor.name}`);
  
  if (shouldConnectToDevnet) {
    console.log('🎯 Transactions will be visible at:');
    console.log('   • https://minascan.io/devnet/');
    console.log('   • https://devnet.minaexplorer.com/');
  }
  
  console.log('\n' + '='.repeat(80) + '\n');
}

/**
 * Debug function to trace the environment setup
 */
export function debugEnvironmentSetup(): void {
  console.log('\n🔍 ENVIRONMENT DEBUG REPORT');
  console.log('='.repeat(50));
  
  // Check environment variables
  console.log('📝 Environment Variables:');
  console.log(`  BUILD_ENV: "${process.env.BUILD_ENV}"`);
  console.log(`  NODE_ENV: "${process.env.NODE_ENV}"`);
  console.log(`  MINA_ENV: "${process.env.MINA_ENV}"`);
  
  // Check environment manager
  console.log('\n🎯 Environment Manager:');
  console.log(`  Current Environment: ${environmentManager.getCurrentEnvironment()}`);
  console.log(`  Should use NetworkOracleRegistry: ${environmentManager.shouldUseNetworkRegistry()}`);
  console.log(`  Should connect to DEVNET: ${environmentManager.shouldConnectToDevnet()}`);
  console.log(`  Expected Registry Type: ${environmentManager.getExpectedRegistryType()}`);
  
  // Check registry status
  const registry = OracleRegistryFactory.getCurrentInstance();
  if (registry) {
    console.log('\n🏦 Registry Status:');
    console.log(`  Registry Type: ${registry.constructor.name}`);
    console.log(`  Is NetworkOracleRegistry: ${!(registry instanceof LocalOracleRegistry)}`);
  } else {
    console.log('\n🏦 Registry Status: Not initialized');
  }
  
  console.log('\n' + '='.repeat(50) + '\n');
}

export function getPrivateKeyFor(key: string) {
  if (!currentRegistry) {
    throw new Error('Oracle Registry not initialized. Call initializeOracleRegistry() first.');
  }
  return currentRegistry.getPrivateKeyFor(key);
}

export function getPublicKeyFor(key: string) {
  if (!currentRegistry) {
    throw new Error('Oracle Registry not initialized. Call initializeOracleRegistry() first.');
  }
  return currentRegistry.getPublicKeyFor(key);
}

export function getDeployerAccount(oracleType: string) {
  if (!currentRegistry) {
    throw new Error('Oracle Registry not initialized. Call initializeOracleRegistry() first.');
  }
  return currentRegistry.getDeployerAccount(oracleType);
}

export function getDeployerKey(oracleType: string) {
  if (!currentRegistry) {
    throw new Error('Oracle Registry not initialized. Call initializeOracleRegistry() first.');
  }
  return currentRegistry.getDeployerKey(oracleType);
}

export function getSenderAccount(oracleType: string) {
  if (!currentRegistry) {
    throw new Error('Oracle Registry not initialized. Call initializeOracleRegistry() first.');
  }
  return currentRegistry.getSenderAccount(oracleType);
}

export function getSenderKey(oracleType: string) {
  if (!currentRegistry) {
    throw new Error('Oracle Registry not initialized. Call initializeOracleRegistry() first.');
  }
  return currentRegistry.getSenderKey(oracleType);
}

// For backward compatibility, export the specific account variables that the old system used
export async function getCompatibilityAccounts() {
  if (!currentRegistry) {
    throw new Error('Oracle Registry not initialized. Call initializeOracleRegistry() first.');
  }

  return {
    // MCA accounts
    MCAdeployerAccount: currentRegistry.getDeployerAccount('MCA'),
    MCAdeployerKey: currentRegistry.getDeployerKey('MCA'),
    MCAsenderAccount: currentRegistry.getSenderAccount('MCA'),
    MCAsenderKey: currentRegistry.getSenderKey('MCA'),

    // GLEIF accounts  
    GLEIFdeployerAccount: currentRegistry.getDeployerAccount('GLEIF'),
    GLEIFdeployerKey: currentRegistry.getDeployerKey('GLEIF'),
    GLEIFsenderAccount: currentRegistry.getSenderAccount('GLEIF'),
    GLEIFsenderKey: currentRegistry.getSenderKey('GLEIF'),

    // EXIM accounts
    EXIMdeployerAccount: currentRegistry.getDeployerAccount('EXIM'),
    EXIMdeployerKey: currentRegistry.getDeployerKey('EXIM'),
    EXIMsenderAccount: currentRegistry.getSenderAccount('EXIM'),
    EXIMsenderKey: currentRegistry.getSenderKey('EXIM'),

    // Business Process accounts
    BusinessProverdeployerAccount: currentRegistry.getDeployerAccount('BPMN'),
    BusinessProverdeployerKey: currentRegistry.getDeployerKey('BPMN'),
    BusinessProversenderAccount: currentRegistry.getSenderAccount('BPMN'),
    BusinessProversenderKey: currentRegistry.getSenderKey('BPMN'),

    // Risk accounts
    RiskProverdeployerAccount: currentRegistry.getDeployerAccount('RISK'),
    RiskProverdeployerKey: currentRegistry.getDeployerKey('RISK'),
    RiskProversenderAccount: currentRegistry.getSenderAccount('RISK'),
    RiskProversenderKey: currentRegistry.getSenderKey('RISK'),
  };
}
