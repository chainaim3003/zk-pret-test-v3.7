/**
 * FIXED: Network Oracle Registry for DEVNET + config/environments/testnet.json accounts
 * 🎯 CORE FIX: Connect to DEVNET but use pre-funded accounts from config/environments/testnet.json
 * 
 * CRITICAL CHANGES:
 * 1. ✅ Connects to DEVNET with networkId: 'testnet' 
 * 2. ✅ Uses pre-funded DEVNET accounts from config/environments/testnet.json
 * 3. ✅ Verifies actual DEVNET connection
 * 4. ✅ Maps testnet.json oracle registry roles to oracle types
 */

import { Mina, PrivateKey, PublicKey, fetchAccount } from 'o1js';
import { OracleRegistry, OracleAccount, OracleKeyPair } from './types.js';
import { environmentManager } from '../environment/manager.js';
import { Environment } from '../environment/types.js';
import * as fs from 'fs';
import * as path from 'path';

interface TestnetAccount {
  role: string;
  deployer: {
    privateKey: string;
    publicKey: string;
    index: number;
  };
  sender: {
    privateKey: string;
    publicKey: string;
    index: number;
  };
}

export class NetworkOracleRegistry implements OracleRegistry {
  private deployerRegistry: Map<string, OracleKeyPair> = new Map();
  private senderRegistry: Map<string, OracleKeyPair> = new Map();
  private isInitialized = false;
  private environment: Environment;
  private testnetAccounts: TestnetAccount[] = [];

  constructor(environment: Environment) {
    if (environment === Environment.LOCAL) {
      throw new Error('NetworkOracleRegistry cannot be used for LOCAL environment. Use LocalOracleRegistry instead.');
    }
    this.environment = environment;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    console.log(`\n🚀 Initializing ${this.environment} Oracle Registry...`);
    console.log('='.repeat(60));

    // STEP 1: Setup DEVNET connection first
    await this.setupDevnetConnection();

    // STEP 2: Load and verify testnet accounts for TESTNET
    if (this.environment === Environment.TESTNET) {
      await this.loadTestnetAccountsForDevnet();
    } else {
      await this.loadMainnetAccounts();
    }

    // STEP 3: Verify the setup
    await this.verifySetup();

    this.isInitialized = true;
    console.log(`✅ ${this.environment} Oracle Registry initialized successfully!`);
    
    if (this.environment === Environment.TESTNET) {
      console.log(`🎯 Ready to deploy to DEVNET using pre-funded accounts`);
      console.log(`🔗 Transactions will appear at: https://minascan.io/devnet/`);
    }
    console.log('='.repeat(60));
  }

  /**
   * 🔧 CRITICAL FIX: Setup DEVNET connection with correct parameters
   */
  private async setupDevnetConnection(): Promise<void> {
    console.log(`🌐 Setting up network connection for ${this.environment}...`);

    const config = await environmentManager.getCurrentConfig();
    const networkConfig = config.network;
    
    if (!networkConfig.minaEndpoint) {
      throw new Error(`Mina endpoint not configured for ${this.environment}`);
    }

    let networkId: string;
    let expectedNetworkType: string;

    if (this.environment === Environment.TESTNET) {
      networkId = 'testnet'; // DEVNET uses 'testnet' as networkId
      expectedNetworkType = 'DEVNET';
      console.log(`🎯 Target: MINA DEVNET`);
    } else if (this.environment === Environment.MAINNET) {
      networkId = 'mainnet';
      expectedNetworkType = 'MAINNET';
      console.log(`🎯 Target: MINA MAINNET`);
    } else {
      throw new Error(`Unsupported environment: ${this.environment}`);
    }

    console.log(`📡 Endpoint: ${networkConfig.minaEndpoint}`);
    console.log(`🆔 Network ID: ${networkId}`);

    try {
      // 🔧 CRITICAL FIX: Setup network with proper configuration
      const network = Mina.Network(networkConfig.minaEndpoint);
      Mina.setActiveInstance(network);
      
      console.log(`📊 Connection setup:`);
      console.log(`   Endpoint: ${networkConfig.minaEndpoint}`);
      console.log(`   Target: ${expectedNetworkType}`);
      
      console.log(`✅ Network instance configured for ${expectedNetworkType}`);
      console.log(`🔗 Ready to connect to DEVNET blockchain`);
      
    } catch (error) {
      console.error(`❌ Failed to setup network for ${expectedNetworkType}:`, error);
      throw new Error(`Network setup failed: ${error}`);
    }
  }

  /**
   * 🎯 Load pre-funded DEVNET accounts from config/environments/testnet.json
   */
  private async loadTestnetAccountsForDevnet(): Promise<void> {
    console.log(`📋 Loading pre-funded DEVNET accounts from config/environments/testnet.json...`);
    
    try {
      const projectRoot = process.cwd();
      const testnetConfigPath = path.join(projectRoot, 'config/environments/testnet.json');
      
      if (!fs.existsSync(testnetConfigPath)) {
        throw new Error(`testnet.json not found: ${testnetConfigPath}`);
      }

      const configData = fs.readFileSync(testnetConfigPath, 'utf8');
      const config = JSON.parse(configData);
      
      // Navigate to oracles.registry
      const oracleRegistry = config.oracles?.registry;
      if (!oracleRegistry) {
        throw new Error('No oracles.registry found in testnet.json');
      }
      
      // Transform the nested object structure to the expected array format
      this.testnetAccounts = [];
      for (const [role, oracleData] of Object.entries(oracleRegistry)) {
        if (oracleData && typeof oracleData === 'object') {
          const data = oracleData as any;
          if (data.deployer && data.sender) {
            this.testnetAccounts.push({
              role,
              deployer: data.deployer,
              sender: data.sender
            });
          }
        }
      }
      
      console.log(`📁 Found ${this.testnetAccounts.length} account groups in config/environments/testnet.json`);
      
      // Load accounts into registries
      for (const accountGroup of this.testnetAccounts) {
        await this.loadAccountGroup(accountGroup);
      }

      // Verify we have the essential accounts
      const essentialRoles = ['MCA', 'GLEIF', 'EXIM', 'BPMN', 'RISK', 'BSDI'];
      const loadedRoles = Array.from(this.deployerRegistry.keys());
      const missingRoles = essentialRoles.filter(role => !loadedRoles.includes(role));
      
      if (missingRoles.length > 0) {
        console.warn(`⚠️ Missing essential roles: ${missingRoles.join(', ')}`);
      }

      console.log(`✅ Loaded ${this.deployerRegistry.size} deployer accounts from config/environments/testnet.json`);
      console.log(`📋 Available roles: ${loadedRoles.join(', ')}`);
      
    } catch (error) {
      console.error(`❌ Failed to load testnet accounts:`, error);
      throw error;
    }
  }

  /**
   * Load individual account group from config/environments/testnet.json
   */
  private async loadAccountGroup(accountGroup: TestnetAccount): Promise<void> {
    try {
      const role = accountGroup.role;
      
      // Load deployer account
      const deployerKey = PrivateKey.fromBase58(accountGroup.deployer.privateKey);
      const deployerPublic = PublicKey.fromBase58(accountGroup.deployer.publicKey);
      
      // Verify deployer key pair
      const derivedDeployerPublic = deployerKey.toPublicKey();
      if (!derivedDeployerPublic.equals(deployerPublic).toBoolean()) {
        throw new Error(`Deployer key pair mismatch for ${role}`);
      }

      this.deployerRegistry.set(role, {
        publicKey: deployerPublic,
        privateKey: deployerKey
      });

      // Load sender account  
      const senderKey = PrivateKey.fromBase58(accountGroup.sender.privateKey);
      const senderPublic = PublicKey.fromBase58(accountGroup.sender.publicKey);
      
      // Verify sender key pair
      const derivedSenderPublic = senderKey.toPublicKey();
      if (!derivedSenderPublic.equals(senderPublic).toBoolean()) {
        throw new Error(`Sender key pair mismatch for ${role}`);
      }

      this.senderRegistry.set(role, {
        publicKey: senderPublic,
        privateKey: senderKey
      });

      console.log(`✅ ${role}:`);
      console.log(`   Deployer: ${deployerPublic.toBase58()}`);
      console.log(`   Sender:   ${senderPublic.toBase58()}`);
      
      // 🎯 Optional: Verify accounts are funded on DEVNET
      try {
        const deployerAccount = await fetchAccount({ publicKey: deployerPublic });
        const deployerBalance = Number(deployerAccount.account?.balance.toString() || '0') / 1e9;
        console.log(`   Deployer Balance: ${deployerBalance.toFixed(3)} MINA`);
        
        if (deployerBalance < 1) {
          console.warn(`   ⚠️ Low balance for ${role} deployer: ${deployerBalance} MINA`);
        }
      } catch (error) {
        console.log(`   ℹ️ Could not verify balance for ${role} (account might be new)`);
      }
      
    } catch (error) {
      console.error(`❌ Failed to load account group ${accountGroup.role}:`, error);
      throw error;
    }
  }

  /**
   * Load MAINNET accounts from environment variables
   */
  private async loadMainnetAccounts(): Promise<void> {
    console.log(`📋 Loading MAINNET accounts from environment variables...`);
    
    const config = await environmentManager.getCurrentConfig();
    const oracleConfig = config.oracles.registry;

    for (const [oracleKey, oracleData] of Object.entries(oracleConfig)) {
      if (!oracleData || typeof oracleData !== 'object') {
        console.warn(`⚠️ Invalid oracle configuration for ${oracleKey}`);
        continue;
      }

      const data = oracleData as any;

      if (!data.publicKey || !data.privateKey) {
        console.warn(`⚠️ Missing keys for oracle ${oracleKey}`);
        continue;
      }

      try {
        const publicKey = PublicKey.fromBase58(data.publicKey);
        const privateKey = PrivateKey.fromBase58(data.privateKey);

        // Verify key pair
        const derivedPublic = privateKey.toPublicKey();
        if (!derivedPublic.equals(publicKey).toBoolean()) {
          throw new Error(`Key pair mismatch for ${oracleKey}`);
        }

        this.deployerRegistry.set(oracleKey, { publicKey, privateKey });
        this.senderRegistry.set(oracleKey, { publicKey, privateKey }); // Same for MAINNET
        
        console.log(`✅ ${oracleKey}: ${publicKey.toBase58()}`);
        
      } catch (error) {
        console.error(`❌ Failed to load oracle ${oracleKey}:`, error);
      }
    }
  }

  /**
   * Verify the complete setup
   */
  private async verifySetup(): Promise<void> {
    console.log(`🔍 Verifying setup...`);
    
    if (this.deployerRegistry.size === 0) {
      throw new Error(`No deployer accounts loaded for ${this.environment}`);
    }
    
    if (this.senderRegistry.size === 0) {
      throw new Error(`No sender accounts loaded for ${this.environment}`);
    }

    console.log(`✅ Setup verification passed`);
    console.log(`   Deployer accounts: ${this.deployerRegistry.size}`);
    console.log(`   Sender accounts: ${this.senderRegistry.size}`);
  }

  // 🎯 Oracle Registry Interface Implementation
  
  getPrivateKeyFor(key: string): PrivateKey {
    this.ensureInitialized();
    return this.getDeployerKey(key);
  }

  getPublicKeyFor(key: string): PublicKey {
    this.ensureInitialized();
    return this.getDeployerAccount(key);
  }

  getOracleAccount(key: string): OracleAccount {
    this.ensureInitialized();
    const keyPair = this.deployerRegistry.get(key);
    if (!keyPair) {
      throw new Error(`No oracle account found for '${key}'. Available: ${this.listOracles().join(', ')}`);
    }

    return {
      publicKey: keyPair.publicKey,
      privateKey: keyPair.privateKey,
      role: `${key}_ORACLE`
    };
  }

  hasOracle(key: string): boolean {
    return this.deployerRegistry.has(key);
  }

  listOracles(): string[] {
    return Array.from(this.deployerRegistry.keys());
  }

  // 🎯 Deployer and Sender Account Methods (using config/environments/testnet.json accounts)
  
  getDeployerAccount(oracleType: string): PublicKey {
    this.ensureInitialized();
    const keyPair = this.deployerRegistry.get(oracleType);
    if (!keyPair) {
      throw new Error(`No deployer account found for '${oracleType}'. Available: ${this.listOracles().join(', ')}`);
    }
    return keyPair.publicKey;
  }

  getDeployerKey(oracleType: string): PrivateKey {
    this.ensureInitialized();
    const keyPair = this.deployerRegistry.get(oracleType);
    if (!keyPair) {
      throw new Error(`No deployer key found for '${oracleType}'. Available: ${this.listOracles().join(', ')}`);
    }
    return keyPair.privateKey;
  }

  getSenderAccount(oracleType: string): PublicKey {
    this.ensureInitialized();
    const keyPair = this.senderRegistry.get(oracleType);
    if (!keyPair) {
      throw new Error(`No sender account found for '${oracleType}'. Available: ${this.listOracles().join(', ')}`);
    }
    return keyPair.publicKey;
  }

  getSenderKey(oracleType: string): PrivateKey {
    this.ensureInitialized();
    const keyPair = this.senderRegistry.get(oracleType);
    if (!keyPair) {
      throw new Error(`No sender key found for '${oracleType}'. Available: ${this.listOracles().join(', ')}`);
    }
    return keyPair.privateKey;
  }

  // 🎯 Utility Methods

  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('Oracle registry not initialized. Call initialize() first.');
    }
  }

  async cleanup(): Promise<void> {
    this.deployerRegistry.clear();
    this.senderRegistry.clear();
    this.testnetAccounts = [];
    this.isInitialized = false;
    console.log(`🧹 ${this.environment} Oracle Registry cleaned up`);
  }

  // 🎯 Network-specific verification methods

  async validateOracleAccounts(): Promise<{ [key: string]: boolean }> {
    const results: { [key: string]: boolean } = {};

    for (const [oracleKey, keyPair] of this.deployerRegistry.entries()) {
      try {
        const derivedPublicKey = keyPair.privateKey.toPublicKey();
        const isValid = derivedPublicKey.equals(keyPair.publicKey).toBoolean();
        
        results[oracleKey] = isValid;
        
        if (!isValid) {
          console.error(`❌ Oracle ${oracleKey}: Private key does not match public key`);
        }
      } catch (error) {
        console.error(`❌ Oracle ${oracleKey}: Validation error:`, error);
        results[oracleKey] = false;
      }
    }

    return results;
  }

  async checkAccountBalances(): Promise<{ [key: string]: string }> {
    const balances: { [key: string]: string } = {};

    for (const [oracleKey, keyPair] of this.deployerRegistry.entries()) {
      try {
        const accountData = await fetchAccount({ publicKey: keyPair.publicKey });
        const balance = Number(accountData.account?.balance.toString() || '0') / 1e9;
        balances[oracleKey] = `${balance.toFixed(3)} MINA`;
        
        if (balance < 1) {
          console.warn(`⚠️ Low balance for ${oracleKey}: ${balance.toFixed(3)} MINA`);
        }
      } catch (error) {
        console.error(`❌ Oracle ${oracleKey}: Balance check error:`, error);
        balances[oracleKey] = 'Error checking balance';
      }
    }

    return balances;
  }

  /**
   * 🎯 Get deployment summary for debugging
   */
  getDeploymentSummary(): {
    environment: string;
    networkConnected: boolean;
    accountsLoaded: number;
    availableRoles: string[];
    readyToDeploy: boolean;
  } {
    return {
      environment: this.environment,
      networkConnected: this.isInitialized,
      accountsLoaded: this.deployerRegistry.size,
      availableRoles: this.listOracles(),
      readyToDeploy: this.isInitialized && this.deployerRegistry.size > 0
    };
  }
}
