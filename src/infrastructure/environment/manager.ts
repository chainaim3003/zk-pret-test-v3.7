/**
 * Environment Manager
 * Centralized management of environment configurations and switching
 */

import * as dotenv from 'dotenv';
import { Environment, EnvironmentConfig, NetworkConfig, OracleConfig, DeploymentConfig } from './types.js';
import { FileBasedEnvironmentStorage } from './storage.js';
import { getDevnetNetworkConfig, getEnvironmentFee, nanominaToMina, isDevnetEndpoint } from './devnet-endpoints.js';

export class EnvironmentManager {
  private static instance: EnvironmentManager;
  private currentEnvironment!: Environment; // Use definite assignment assertion
  private storage: FileBasedEnvironmentStorage;
  private currentConfig: EnvironmentConfig | null = null;

  private constructor() {
    // Load .env file FIRST before environment detection
    dotenv.config();
    
    // Enhanced environment detection with debugging
    this.loadAndValidateEnvironment();
    this.storage = new FileBasedEnvironmentStorage();
  }

  private loadAndValidateEnvironment(): void {
    // Read from multiple sources with priority
    const sources = {
      BUILD_ENV: process.env.BUILD_ENV,
      NODE_ENV: process.env.NODE_ENV,
      MINA_ENV: process.env.MINA_ENV,
    };

    console.log('🔍 Environment Detection Debug:');
    console.log('  BUILD_ENV:', sources.BUILD_ENV);
    console.log('  NODE_ENV:', sources.NODE_ENV);
    console.log('  MINA_ENV:', sources.MINA_ENV);

    // Primary source is BUILD_ENV
    const envValue = sources.BUILD_ENV || 'LOCAL';
    console.log(`🎯 Selected environment value: "${envValue}"`);

    this.currentEnvironment = this.parseEnvironment(envValue);
    
    // Enhanced validation
    this.validateEnvironment();
  }

  static getInstance(): EnvironmentManager {
    if (!EnvironmentManager.instance) {
      EnvironmentManager.instance = new EnvironmentManager();
    }
    return EnvironmentManager.instance;
  }

  private parseEnvironment(value: string): Environment {
    const upperValue = value.toUpperCase().trim();
    
    // Enhanced validation with explicit mapping
    const environmentMap: Record<string, Environment> = {
      'LOCAL': Environment.LOCAL,
      'TESTNET': Environment.TESTNET,
      'DEVNET': Environment.TESTNET, // Map DEVNET to TESTNET internally
      'MAINNET': Environment.MAINNET,
      'PRODUCTION': Environment.MAINNET,
    };

    if (environmentMap[upperValue]) {
      const mappedEnv = environmentMap[upperValue];
      console.log(`✅ Environment "${value}" mapped to: ${mappedEnv}`);
      return mappedEnv;
    }

    console.warn(`⚠️ Unknown environment '${value}', defaulting to LOCAL`);
    console.warn(`⚠️ Valid environments: ${Object.keys(environmentMap).join(', ')}`);
    return Environment.LOCAL;
  }

  private validateEnvironment(): void {
    console.log(`🔍 Environment Validation:`);
    console.log(`  Current Environment: ${this.currentEnvironment}`);
    console.log(`  Should use NetworkOracleRegistry: ${this.shouldUseNetworkRegistry()}`);
    console.log(`  Should connect to DEVNET: ${this.shouldConnectToDevnet()}`);
  }

  getCurrentEnvironment(): Environment {
    return this.currentEnvironment;
  }

  /**
   * New method: Explicitly check if we should use NetworkOracleRegistry
   */
  shouldUseNetworkRegistry(): boolean {
    return this.currentEnvironment === Environment.TESTNET || 
           this.currentEnvironment === Environment.MAINNET;
  }

  /**
   * New method: Explicitly check if we should connect to DEVNET
   */
  shouldConnectToDevnet(): boolean {
    return this.currentEnvironment === Environment.TESTNET;
  }

  /**
   * New method: Get expected registry type
   */
  getExpectedRegistryType(): 'Local' | 'Network' {
    return this.shouldUseNetworkRegistry() ? 'Network' : 'Local';
  }

  async switchEnvironment(environment: Environment): Promise<void> {
    console.log(`🔄 Switching from ${this.currentEnvironment} to ${environment}`);
    
    // Save current config if it exists
    if (this.currentConfig) {
      await this.storage.save(this.currentEnvironment, this.currentConfig);
    }

    this.currentEnvironment = environment;
    this.currentConfig = null;

    // Load new environment config
    await this.loadCurrentConfig();
    
    console.log(`✅ Switched to ${environment} environment`);
  }

  async getCurrentConfig(): Promise<EnvironmentConfig> {
    if (!this.currentConfig) {
      await this.loadCurrentConfig();
    }
    
    if (!this.currentConfig) {
      throw new Error(`No configuration available for environment ${this.currentEnvironment}`);
    }
    
    return this.currentConfig;
  }

  private async loadCurrentConfig(): Promise<void> {
    const existingConfig = await this.storage.load(this.currentEnvironment);
    
    if (existingConfig) {
      this.currentConfig = existingConfig;
      console.log(`✅ Loaded existing config for ${this.currentEnvironment}`);
    } else {
      console.log(`ℹ️ Creating default config for ${this.currentEnvironment}`);
      this.currentConfig = this.createDefaultConfig();
      await this.storage.save(this.currentEnvironment, this.currentConfig);
    }
  }

  private createDefaultConfig(): EnvironmentConfig {
    const network = this.createDefaultNetworkConfig();
    const oracles = this.createDefaultOracleConfig();
    const deployments = this.createDefaultDeploymentConfig();

    return {
      network,
      oracles,
      deployments,
      gleifApiConfig: this.createGleifApiConfig()
    };
  }

  private createDefaultNetworkConfig(): NetworkConfig {
    switch (this.currentEnvironment) {
      case Environment.LOCAL:
        return {
          environment: Environment.LOCAL,
          proofsEnabled: true
        };
      
      case Environment.TESTNET:
        // 🎯 TESTNET now connects to Mina DEVNET (not Berkeley testnet)
        console.log('🌐 TESTNET environment connecting to Mina DEVNET');
        return getDevnetNetworkConfig();
      
      case Environment.MAINNET:
        return {
          environment: Environment.MAINNET,
          minaEndpoint: process.env.MINA_MAINNET_ENDPOINT || 'https://api.minaexplorer.com/mainnet/',
          minaGraphQLEndpoint: process.env.MINA_MAINNET_GRAPHQL || 'https://api.minaexplorer.com/mainnet/graphql',
          archiveEndpoint: process.env.MINA_MAINNET_ARCHIVE,
          proofsEnabled: true
        };
    }
  }

  private createDefaultOracleConfig(): OracleConfig {
    if (this.currentEnvironment === Environment.LOCAL) {
      // For LOCAL, we'll use test accounts (will be set up by Oracle Registry)
      return {
        registry: {
          'MCA': { publicKey: '', privateKey: '', role: 'MCA_ORACLE' },
          'GLEIF': { publicKey: '', privateKey: '', role: 'GLEIF_ORACLE' },
          'EXIM': { publicKey: '', privateKey: '', role: 'EXIM_ORACLE' },
          'BPMN': { publicKey: '', privateKey: '', role: 'BUSINESS_PROCESS_ORACLE' },
          'RISK': { publicKey: '', privateKey: '', role: 'RISK_ORACLE' },
          'BL_REGISTRY': { publicKey: '', privateKey: '', role: 'BILL_OF_LADING_ORACLE' }
        }
      };
    } else {
      // For TESTNET/MAINNET, keys will be loaded from secure storage
      return {
        registry: {
          'MCA': { publicKey: process.env.MCA_PUBLIC_KEY || '', role: 'MCA_ORACLE' },
          'GLEIF': { publicKey: process.env.GLEIF_PUBLIC_KEY || '', role: 'GLEIF_ORACLE' },
          'EXIM': { publicKey: process.env.EXIM_PUBLIC_KEY || '', role: 'EXIM_ORACLE' },
          'BPMN': { publicKey: process.env.BPMN_PUBLIC_KEY || '', role: 'BUSINESS_PROCESS_ORACLE' },
          'RISK': { publicKey: process.env.RISK_PUBLIC_KEY || '', role: 'RISK_ORACLE' },
          'BL_REGISTRY': { publicKey: process.env.BL_REGISTRY_PUBLIC_KEY || '', role: 'BILL_OF_LADING_ORACLE' }
        }
      };
    }
  }

  private createDefaultDeploymentConfig(): DeploymentConfig {
    return {
      contracts: {}
    };
  }

  private createGleifApiConfig() {
    return {
      sandboxUrl: process.env.GLEIF_URL_SANDBOX,
      prodUrl: process.env.GLEIF_URL_PROD,
      mockUrl: process.env.GLEIF_URL_MOCK
    };
  }

  async updateConfig(updates: Partial<EnvironmentConfig>): Promise<void> {
    if (!this.currentConfig) {
      await this.loadCurrentConfig();
    }

    if (this.currentConfig) {
      // Deep merge the updates
      this.currentConfig = {
        ...this.currentConfig,
        ...updates,
        network: { ...this.currentConfig.network, ...updates.network },
        oracles: { 
          ...this.currentConfig.oracles, 
          ...updates.oracles,
          registry: { ...this.currentConfig.oracles.registry, ...updates.oracles?.registry }
        },
        deployments: {
          ...this.currentConfig.deployments,
          ...updates.deployments,
          contracts: { ...this.currentConfig.deployments.contracts, ...updates.deployments?.contracts }
        }
      };

      await this.storage.save(this.currentEnvironment, this.currentConfig);
      console.log(`✅ Updated ${this.currentEnvironment} environment config`);
    }
  }

  async saveDeployment(contractName: string, address: string, verificationKey?: string, transactionHash?: string): Promise<void> {
    await this.updateConfig({
      deployments: {
        contracts: {
          [contractName]: {
            address,
            verificationKey,
            deployedAt: new Date().toISOString(),
            transactionHash
          }
        }
      }
    });
  }

  async getDeployment(contractName: string): Promise<{ address: string; verificationKey?: string } | null> {
    const config = await this.getCurrentConfig();
    const deployment = config.deployments.contracts[contractName];
    
    if (!deployment?.address) {
      return null;
    }

    return {
      address: deployment.address,
      verificationKey: deployment.verificationKey
    };
  }

  /**
   * Get deployed contract address from environment configuration
   */
  async getDeployedContractAddress(contractName: string): Promise<string | null> {
    try {
      const config = await this.getCurrentConfig();
      return config.deployments?.contracts?.[contractName]?.address || null;
    } catch (error) {
      console.error(`Failed to load contract address: ${error}`);
      return null;
    }
  }

  /**
   * Validate contract address format (Mina public key)
   */
  validateContractAddress(address: string): boolean {
    const base58Regex = /^B62[1-9A-HJ-NP-Za-km-z]{52}$/;
    return base58Regex.test(address);
  }

  async listDeployments(): Promise<Record<string, any>> {
    const config = await this.getCurrentConfig();
    return config.deployments.contracts;
  }

  async clearDeployments(): Promise<void> {
    await this.updateConfig({
      deployments: {
        contracts: {}
      }
    });
    console.log(`✅ Cleared all deployments for ${this.currentEnvironment}`);
  }

  async backupEnvironment(): Promise<string> {
    return await this.storage.backup(this.currentEnvironment);
  }

  isLocal(): boolean {
    return this.currentEnvironment === Environment.LOCAL;
  }

  isTestnet(): boolean {
    return this.currentEnvironment === Environment.TESTNET;
  }

  isMainnet(): boolean {
    return this.currentEnvironment === Environment.MAINNET;
  }

  getEnvironmentInfo(): { 
    environment: Environment; 
    proofsEnabled: boolean; 
    hasPersistedConfig: boolean;
    networkEndpoint?: string;
    isDevnet?: boolean;
    feeNanoMina?: bigint;
  } {
    const networkEndpoint = this.currentConfig?.network.minaEndpoint;
    return {
      environment: this.currentEnvironment,
      proofsEnabled: this.currentConfig?.network.proofsEnabled ?? false,
      hasPersistedConfig: this.currentConfig !== null,
      networkEndpoint,
      isDevnet: isDevnetEndpoint(networkEndpoint),
      feeNanoMina: this.getFeeNanoMina('DEPLOY')
    };
  }

  /**
   * ✅ Get fee in nanomina for transactions (o1js best practice)
   */
  getFeeNanoMina(operation: 'DEPLOY' | 'UPDATE' | 'VERIFY' = 'DEPLOY'): bigint {
    return getEnvironmentFee(this.currentEnvironment, operation);
  }

  /**
   * ✅ Check if currently connected to DEVNET
   */
  isConnectedToDevnet(): boolean {
    return this.isTestnet() && isDevnetEndpoint(this.currentConfig?.network.minaEndpoint);
  }

  /**
   * ✅ Get fee in MINA for display purposes
   */
  getFeeInMina(operation: 'DEPLOY' | 'UPDATE' | 'VERIFY' = 'DEPLOY'): string {
    const feeNano = this.getFeeNanoMina(operation);
    return nanominaToMina(feeNano);
  }
}

// Export singleton instance
export const environmentManager = EnvironmentManager.getInstance();

/**
 * Debug function to trace the environment setup
 */
export function debugEnvironmentInfo(): void {
  console.log('\n🔍 ENVIRONMENT INFO');
  console.log('='.repeat(30));
  
  console.log('📝 Environment Variables:');
  console.log(`  BUILD_ENV: "${process.env.BUILD_ENV}"`);
  console.log(`  NODE_ENV: "${process.env.NODE_ENV}"`);
  
  console.log('\n🎯 Environment Manager:');
  console.log(`  Current Environment: ${environmentManager.getCurrentEnvironment()}`);
  console.log(`  Should use NetworkOracleRegistry: ${environmentManager.shouldUseNetworkRegistry()}`);
  console.log(`  Should connect to DEVNET: ${environmentManager.shouldConnectToDevnet()}`);
  console.log(`  Expected Registry Type: ${environmentManager.getExpectedRegistryType()}`);
  
  console.log('\n' + '='.repeat(30) + '\n');
}
