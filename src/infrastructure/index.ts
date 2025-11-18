/**
 * Infrastructure Module Index
 * Exports all infrastructure components for easy importing
 */

// Environment Management
export { Environment } from './environment/types.js';
export type { EnvironmentConfig, NetworkConfig } from './environment/types.js';
export { environmentManager, EnvironmentManager, debugEnvironmentInfo } from './environment/manager.js';
export { FileBasedEnvironmentStorage } from './environment/storage.js';

// Oracle Management
export type { OracleRegistry, OracleAccount } from './oracle/types.js';
export { LocalOracleRegistry } from './oracle/LocalOracleRegistry.js';
export { NetworkOracleRegistry } from './oracle/NetworkOracleRegistry.js';
export { 
  OracleRegistryFactory,
  initializeOracleRegistry,
  debugEnvironmentSetup,
  getPrivateKeyFor,
  getPublicKeyFor,
  getDeployerAccount,
  getDeployerKey,
  getSenderAccount,
  getSenderKey,
  getCompatibilityAccounts
} from './oracle/factory.js';

// Deployment Management
export { DeploymentManager, deploymentManager } from './deployment/manager.js';
export type { DeploymentResult } from './deployment/manager.js';

// Compilation Management
export { CompilationCategory } from './compilation/types.js';
export type { CompilationItem, CompilationResult } from './compilation/types.js';
export { COMPILATION_REGISTRY, getCompilationByName, getCompilationsByCategory } from './compilation/registry.js';
export { CompilationManager, compilationManager } from './compilation/manager.js';
