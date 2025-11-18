/**
 * Local Oracle Registry
 * Uses Mina LocalBlockchain test accounts for development
 */

import { Mina, PrivateKey, PublicKey } from 'o1js';
import { OracleRegistry, OracleAccount, OracleKeyPair } from './types.js';
import { environmentManager } from '../environment/manager.js';

export class LocalOracleRegistry implements OracleRegistry {
  private Local: any;
  private registry: Map<string, OracleKeyPair> = new Map();
  private isInitialized = false;

  // Account mapping for different oracle types
  private readonly accountMapping = {
    'MCA': { deployer: 0, sender: 1 },
    'GLEIF': { deployer: 2, sender: 3 },
    'EXIM': { deployer: 4, sender: 5 },
    'BPMN': { deployer: 6, sender: 7 },
    'RISK': { deployer: 8, sender: 9 },
    'BL_REGISTRY': { deployer: 6, sender: 7 } // Reuse BPMN accounts
  };

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    console.log('🔧 Initializing Local Oracle Registry...');

    // Initialize Local blockchain
    const useProof = false;
    this.Local = await Mina.LocalBlockchain({ proofsEnabled: useProof });
    Mina.setActiveInstance(this.Local);

    // Set up oracle accounts
    this.setupOracleAccounts();

    // Update environment config with the oracle public keys
    await this.updateEnvironmentConfig();

    this.isInitialized = true;
    console.log('✅ Local Oracle Registry initialized');
  }

  private setupOracleAccounts(): void {
    const testAccounts = this.Local.testAccounts;

    for (const [oracleKey, mapping] of Object.entries(this.accountMapping)) {
      const deployerAccount = testAccounts[mapping.deployer];
      this.registry.set(oracleKey, {
        publicKey: deployerAccount,
        privateKey: deployerAccount.key
      });

      console.log(`📋 Oracle ${oracleKey}: Account ${mapping.deployer} (${deployerAccount.toBase58()})`);
    }
  }

  private async updateEnvironmentConfig(): Promise<void> {
    const oracleConfig: Record<string, any> = {};
    
    for (const [key, keyPair] of this.registry.entries()) {
      const mapping = this.accountMapping[key as keyof typeof this.accountMapping];
      oracleConfig[key] = {
        publicKey: keyPair.publicKey.toBase58(),
        privateKey: keyPair.privateKey.toBase58(),
        role: `${key}_ORACLE`,
        deployerAccountIndex: mapping.deployer,
        senderAccountIndex: mapping.sender
      };
    }

    await environmentManager.updateConfig({
      oracles: {
        registry: oracleConfig
      }
    });
  }

  getPrivateKeyFor(key: string): PrivateKey {
    if (!this.isInitialized) {
      throw new Error('Oracle registry not initialized. Call initialize() first.');
    }

    const keyPair = this.registry.get(key);
    if (!keyPair) {
      throw new Error(`No private key found for oracle '${key}'. Available oracles: ${this.listOracles().join(', ')}`);
    }
    return keyPair.privateKey;
  }

  getPublicKeyFor(key: string): PublicKey {
    if (!this.isInitialized) {
      throw new Error('Oracle registry not initialized. Call initialize() first.');
    }

    const keyPair = this.registry.get(key);
    if (!keyPair) {
      throw new Error(`No public key found for oracle '${key}'. Available oracles: ${this.listOracles().join(', ')}`);
    }
    return keyPair.publicKey;
  }

  getOracleAccount(key: string): OracleAccount {
    if (!this.isInitialized) {
      throw new Error('Oracle registry not initialized. Call initialize() first.');
    }

    const keyPair = this.registry.get(key);
    if (!keyPair) {
      throw new Error(`No oracle account found for '${key}'. Available oracles: ${this.listOracles().join(', ')}`);
    }

    return {
      publicKey: keyPair.publicKey,
      privateKey: keyPair.privateKey,
      role: `${key}_ORACLE`
    };
  }

  hasOracle(key: string): boolean {
    return this.registry.has(key);
  }

  listOracles(): string[] {
    return Array.from(this.registry.keys());
  }

  getDeployerAccount(oracleType: string): PublicKey {
    return this.getPublicKeyFor(oracleType);
  }

  getDeployerKey(oracleType: string): PrivateKey {
    return this.getPrivateKeyFor(oracleType);
  }

  getSenderAccount(oracleType: string): PublicKey {
    if (!this.isInitialized) {
      throw new Error('Oracle registry not initialized. Call initialize() first.');
    }

    const mapping = this.accountMapping[oracleType as keyof typeof this.accountMapping];
    if (!mapping) {
      throw new Error(`No account mapping found for oracle type '${oracleType}'`);
    }

    const testAccounts = this.Local.testAccounts;
    return testAccounts[mapping.sender];
  }

  getSenderKey(oracleType: string): PrivateKey {
    if (!this.isInitialized) {
      throw new Error('Oracle registry not initialized. Call initialize() first.');
    }

    const mapping = this.accountMapping[oracleType as keyof typeof this.accountMapping];
    if (!mapping) {
      throw new Error(`No account mapping found for oracle type '${oracleType}'`);
    }

    const testAccounts = this.Local.testAccounts;
    return testAccounts[mapping.sender].key;
  }

  async cleanup(): Promise<void> {
    // Nothing special needed for local cleanup
    console.log('🧹 Local Oracle Registry cleaned up');
  }

  // Additional methods for LOCAL environment
  getTestAccounts() {
    if (!this.isInitialized) {
      throw new Error('Oracle registry not initialized. Call initialize() first.');
    }
    return this.Local.testAccounts;
  }

  getLocalBlockchain() {
    if (!this.isInitialized) {
      throw new Error('Oracle registry not initialized. Call initialize() first.');
    }
    return this.Local;
  }
}
