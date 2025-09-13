/**
 * Configuration-Driven Oracle Manager
 * Replaces magic string Oracle access with type-safe, role-based Oracle management
 */

import { PrivateKey, PublicKey, Mina } from 'o1js';
import { 
  OracleContext, 
  OracleRole, 
  OracleDefinition, 
  OracleContexts,
  OracleCategory,
  Jurisdiction,
  OracleKeyPair
} from './oracle-types.js';
import type { EnvironmentConfig } from '../infrastructure/environment/types.js';

export class ConfigurableOracleManager {
  private environment: string;
  private oracleDefinitions: Map<string, OracleDefinition> = new Map();
  private localBlockchain: any = null;
  private initialized = false;
  private legacyMapping: Map<string, string> = new Map();
  private environmentConfig: EnvironmentConfig | null = null;

  constructor(environment: string = 'LOCAL') {
    this.environment = environment;
  }

  /**
   * Set environment configuration from loaded JSON config
   */
  setEnvironmentConfig(config: EnvironmentConfig): void {
    this.environmentConfig = config;
    console.log(`✅ Oracle Manager: Environment config loaded for ${this.environment}`);
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    console.log(`🔧 Initializing Oracle Manager for ${this.environment}...`);

    // Load Oracle definitions (hardcoded for LOCAL for now)
    this.loadOracleDefinitions();
    
    // Initialize blockchain (LOCAL only)
    if (this.environment === 'LOCAL') {
      await this.initializeLocalBlockchain();
    }

    this.initialized = true;
    console.log(`✅ Oracle Manager initialized for ${this.environment}`);
  }

  /**
   * 🔗 Set Local Blockchain Instance for LOCAL Environment
   * Called by OracleRegistry.ts to provide access to Local.testAccounts
   */
  setLocalBlockchain(localInstance: any): void {
    if (this.environment === 'LOCAL') {
      this.localBlockchain = localInstance;
      console.log('✅ Oracle Manager: Local blockchain instance set for LOCAL environment');
    }
  }

  /**
   * Synchronous initialization for all environments
   * Used as fallback during module loading timing issues
   */
  initializeSync(): boolean {
    if (this.initialized) return true;
    
    try {
      console.log(`🔧 Sync initializing Oracle Manager for ${this.environment}...`);
      
      // Load Oracle definitions (synchronous for all environments)
      this.loadOracleDefinitions();
      
      // Environment-specific initialization
      if (this.environment === 'LOCAL') {
        // For LOCAL, we'll access the existing blockchain instance when needed
        // No need to initialize a new one during sync init
        this.initialized = true;
        console.log(`✅ Oracle Manager sync initialized for ${this.environment}`);
        return true;
      } else if (this.environment === 'TESTNET' || this.environment === 'MAINNET') {
        // For TESTNET/MAINNET, just load the definitions
        // Keys will be loaded from environment variables when needed
        this.initialized = true;
        console.log(`✅ Oracle Manager sync initialized for ${this.environment}`);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('❌ Sync initialization failed:', error);
      return false;
    }
  }

  /**
   * ✨ NEW TYPE-SAFE API: Get Oracle key by context and role
   */
  getOracleKey(context: OracleContext, role: OracleRole): PrivateKey {
    this.ensureInitialized();
    
    const definition = this.oracleDefinitions.get(context.id);
    if (!definition) {
      throw new Error(`Oracle not found: ${context.id}. Available: ${this.listAvailableOracles().join(', ')}`);
    }

    const roleConfig = definition.roles[role];
    if (!roleConfig) {
      throw new Error(`Role '${role}' not configured for Oracle '${context.id}'. Available roles: ${Object.keys(definition.roles).join(', ')}`);
    }

    return this.getKeyForRole(definition, role);
  }

  /**
   * ✨ NEW TYPE-SAFE API: Get Oracle account by context and role
   */
  getOracleAccount(context: OracleContext, role: OracleRole): PublicKey {
    const privateKey = this.getOracleKey(context, role);
    return privateKey.toPublicKey();
  }

  /**
   * 🔄 LEGACY COMPATIBILITY: Support old getPrivateKeyFor calls during migration
   */
  getPrivateKeyFor(legacyKey: string): PrivateKey {
    this.ensureInitialized();
    
    console.warn(`⚠️ DEPRECATED: getPrivateKeyFor('${legacyKey}') is deprecated. Use getOracleKey(context, role) instead.`);
    
    // Map legacy key to Oracle context
    const oraclePath = this.legacyMapping.get(legacyKey);
    if (!oraclePath) {
      throw new Error(`Legacy Oracle key '${legacyKey}' not found in mapping. Available: ${Array.from(this.legacyMapping.keys()).join(', ')}`);
    }

    // Find Oracle definition by mapping
    const definition = Array.from(this.oracleDefinitions.values())
      .find(def => this.pathMatches(def, oraclePath));
    
    if (!definition) {
      throw new Error(`Oracle definition not found for legacy key '${legacyKey}' (mapped to '${oraclePath}')`);
    }

    // Default to SIGNER role for legacy calls
    return this.getKeyForRole(definition, OracleRole.SIGNER);
  }

  /**
   * 🔄 LEGACY COMPATIBILITY: Support old getPublicKeyFor calls
   */
  getPublicKeyFor(legacyKey: string): PublicKey {
    return this.getPrivateKeyFor(legacyKey).toPublicKey();
  }

  /**
   * 📋 Query available Oracles
   */
  listAvailableOracles(): string[] {
    return Array.from(this.oracleDefinitions.keys());
  }

  getOraclesByCategory(category: string): OracleDefinition[] {
    return Array.from(this.oracleDefinitions.values())
      .filter(def => def.category === category);
  }

  getOraclesByJurisdiction(jurisdiction: string): OracleDefinition[] {
    return Array.from(this.oracleDefinitions.values())
      .filter(def => def.jurisdiction === jurisdiction);
  }

  /**
   * 🔧 Management functions
   */
  validateConfiguration(): boolean {
    // Validate all Oracle definitions
    for (const [id, definition] of this.oracleDefinitions) {
      if (!this.validateOracleDefinition(definition)) {
        console.error(`❌ Invalid Oracle definition: ${id}`);
        return false;
      }
    }
    return true;
  }

  generateOracleReport(): string {
    const report = {
      environment: this.environment,
      totalOracles: this.oracleDefinitions.size,
      categories: {} as any,
      jurisdictions: {} as any
    };

    // Generate summary by category and jurisdiction
    for (const definition of this.oracleDefinitions.values()) {
      report.categories[definition.category] = (report.categories[definition.category] || 0) + 1;
      report.jurisdictions[definition.jurisdiction] = (report.jurisdictions[definition.jurisdiction] || 0) + 1;
    }

    return JSON.stringify(report, null, 2);
  }

  // Private helper methods
  private loadOracleDefinitions(): void {
    // Load Oracle definitions for LOCAL environment
    const localOracles = [
      {
        id: 'CORPREG_INDIA_MCA',
        description: 'Ministry of Corporate Affairs - India',
        category: OracleCategory.CORPREG,
        jurisdiction: Jurisdiction.INDIA,
        organization: 'MCA',
        roles: {
          [OracleRole.DEPLOYER]: { accountIndex: 0, description: 'Deploys MCA contracts' },
          [OracleRole.SIGNER]: { accountIndex: 0, description: 'Signs MCA attestations' },
          [OracleRole.SENDER]: { accountIndex: 1, description: 'Sends MCA transactions' }
        }
      },
      {
        id: 'GLEIF_GLOBAL',
        description: 'Global Legal Entity Identifier Foundation',
        category: OracleCategory.GLEIF,
        jurisdiction: Jurisdiction.GLOBAL,
        roles: {
          [OracleRole.DEPLOYER]: { accountIndex: 2, description: 'Deploys GLEIF contracts' },
          [OracleRole.SIGNER]: { accountIndex: 2, description: 'Signs GLEIF attestations' },
          [OracleRole.SENDER]: { accountIndex: 3, description: 'Sends GLEIF transactions' }
        }
      },
      {
        id: 'EXIM_INDIA_DGFT',
        description: 'Directorate General of Foreign Trade - India',
        category: OracleCategory.EXIM,
        jurisdiction: Jurisdiction.INDIA,
        organization: 'DGFT',
        roles: {
          [OracleRole.DEPLOYER]: { accountIndex: 4, description: 'Deploys DGFT contracts' },
          [OracleRole.SIGNER]: { accountIndex: 4, description: 'Signs DGFT attestations' },
          [OracleRole.SENDER]: { accountIndex: 5, description: 'Sends DGFT transactions' }
        }
      },
      {
        id: 'RISK_GLOBAL_ACTUS_IMPLEMENTOR_1',
        description: 'ACTUS Risk Methodology Implementor - CHAINAIM',
        category: OracleCategory.RISK,
        jurisdiction: Jurisdiction.GLOBAL,
        methodology: 'ACTUS-IMPLEMENTOR-1',
        roles: {
          [OracleRole.DEPLOYER]: { accountIndex: 8, description: 'Deploys ACTUS contracts' },
          [OracleRole.SIGNER]: { accountIndex: 8, description: 'Signs ACTUS attestations' },
          [OracleRole.SENDER]: { accountIndex: 9, description: 'Sends ACTUS transactions' }
        }
      },
      {
        id: 'BIZ_STD_GLOBAL_DCSAV3',
        description: 'DCSA v3.0 Business Standards',
        category: OracleCategory.BIZ_STD,
        jurisdiction: Jurisdiction.GLOBAL,
        standard: 'DCSAV3.0',
        roles: {
          [OracleRole.DEPLOYER]: { accountIndex: 6, description: 'Deploys DCSA contracts' },
          [OracleRole.SIGNER]: { accountIndex: 6, description: 'Signs DCSA attestations' },
          [OracleRole.SENDER]: { accountIndex: 7, description: 'Sends DCSA transactions' }
        }
      }
    ];

    // Store Oracle definitions
    for (const oracle of localOracles) {
      this.oracleDefinitions.set(oracle.id, oracle as OracleDefinition);
    }

    // Set up legacy mapping
    this.legacyMapping.set('MCA', 'CORPREG_INDIA_MCA');
    this.legacyMapping.set('GLEIF', 'GLEIF_GLOBAL');
    this.legacyMapping.set('EXIM', 'EXIM_INDIA_DGFT');
    this.legacyMapping.set('RISK', 'RISK_GLOBAL_ACTUS_IMPLEMENTOR_1');
    this.legacyMapping.set('BPMN', 'BIZ_STD_GLOBAL_DCSAV3');
    this.legacyMapping.set('BL_REGISTRY', 'BIZ_STD_GLOBAL_DCSAV3'); // Alias for BPMN

    console.log(`✅ Loaded ${this.oracleDefinitions.size} Oracle definitions`);
    console.log(`✅ Legacy mapping: ${Array.from(this.legacyMapping.keys()).join(', ')}`);
  }

  private async initializeLocalBlockchain(): Promise<void> {
    // ⚠️ MINA o1js BEST PRACTICE: Do NOT create multiple blockchain instances
    // The Local blockchain should be created only once in OracleRegistry.ts
    // This method is intentionally empty to avoid conflicts
    console.log('✅ Local blockchain access delegated to OracleRegistry.ts (o1js best practice)');
  }

  private getKeyForRole(definition: OracleDefinition, role: OracleRole): PrivateKey {
    if (this.environment === 'LOCAL') {
      // ✅ MINA o1js BEST PRACTICE: Use existing Local blockchain instance (no new instances)
      if (!this.localBlockchain) {
        throw new Error('Local blockchain not set. Oracle Manager needs Local blockchain instance for LOCAL environment.');
      }
      
      const roleConfig = definition.roles[role];
      const accountIndex = roleConfig.accountIndex;
      
      if (!this.localBlockchain.testAccounts || !this.localBlockchain.testAccounts[accountIndex]) {
        throw new Error(`Local test account ${accountIndex} not found for Oracle '${definition.id}' role '${role}'`);
      }
      
      // Clean logging for production use
      console.log(`🔐 Oracle Manager: Using ${definition.description} ${role} key`);
      return this.localBlockchain.testAccounts[accountIndex].key;
      
    } else if (this.environment === 'TESTNET' || this.environment === 'MAINNET') {
      // ✅ NEW: Use JSON config instead of environment variables
      if (!this.environmentConfig) {
        throw new Error(`Environment config not loaded for ${this.environment}. Call setEnvironmentConfig() first.`);
      }
      
      // Map oracle definition ID to legacy oracle names in JSON config
      const legacyOracleName = this.getLegacyOracleNameFromDefinition(definition);
      const oracleConfig = this.environmentConfig.oracles.registry[legacyOracleName];
      
      if (!oracleConfig) {
        throw new Error(`Oracle config not found for '${legacyOracleName}' in ${this.environment} environment`);
      }
      
      if (!oracleConfig.privateKey) {
        throw new Error(`Private key not configured for oracle '${legacyOracleName}' in ${this.environment} environment`);
      }
      
      // ✅ MINA o1js BEST PRACTICE: Validate private key format before use
      if (!this.isValidPrivateKeyFormat(oracleConfig.privateKey)) {
        throw new Error(`Invalid private key format for oracle '${legacyOracleName}': Must be valid Base58 string`);
      }
      
      console.log(`🌐 Oracle Manager: Using ${definition.description} ${role} key from JSON config`);
      
      try {
        return PrivateKey.fromBase58(oracleConfig.privateKey);
      } catch (error) {
        throw new Error(`Failed to parse private key for '${legacyOracleName}': ${(error as Error).message}`);
      }
      
    } else {
      throw new Error(`Unsupported environment: ${this.environment}. Supported: LOCAL, TESTNET, MAINNET`);
    }
  }

  private getLegacyOracleNameFromDefinition(definition: OracleDefinition): string {
    // Map the oracle definition ID to the legacy oracle name used in JSON config
    switch (definition.id) {
      case 'CORPREG_INDIA_MCA':
        return 'MCA';
      case 'GLEIF_GLOBAL':
        return 'GLEIF';
      case 'EXIM_INDIA_DGFT':
        return 'EXIM';
      case 'RISK_GLOBAL_ACTUS_IMPLEMENTOR_1':
        return 'RISK';
      case 'BIZ_STD_GLOBAL_DCSAV3':
        return 'BPMN';
      default:
        // Try to find via legacy mapping as fallback
        for (const [legacyName, oracleId] of this.legacyMapping.entries()) {
          if (oracleId === definition.id) {
            return legacyName;
          }
        }
        throw new Error(`No legacy oracle name mapping found for oracle definition '${definition.id}'`);
    }
  }

  private pathMatches(definition: OracleDefinition, oraclePath: string): boolean {
    // Check if the definition matches the legacy path mapping
    return definition.id === oraclePath;
  }

  private validateOracleDefinition(definition: OracleDefinition): boolean {
    // Validate required fields
    return !!(definition.id && definition.category && definition.jurisdiction && definition.roles);
  }

  /**
   * ✅ MINA o1js BEST PRACTICE: Validate private key format before parsing
   * Ensures keys are valid Base58 strings before attempting PrivateKey.fromBase58()
   */
  private isValidPrivateKeyFormat(privateKeyString: string): boolean {
    // Basic validation: Check if it's a non-empty string
    if (!privateKeyString || typeof privateKeyString !== 'string') {
      return false;
    }
    
    // Check for reasonable length (Mina private keys are typically 52 characters in Base58)
    if (privateKeyString.length < 40 || privateKeyString.length > 60) {
      return false;
    }
    
    // Check for valid Base58 characters (no 0, O, I, l)
    const base58Regex = /^[1-9A-HJ-NP-Za-km-z]+$/;
    return base58Regex.test(privateKeyString);
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('Oracle Manager not initialized. Call initialize() first.');
    }
  }
}

// Singleton instance
export const oracleManager = new ConfigurableOracleManager();
