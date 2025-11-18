/**
 * Environment Management Types
 * Defines the core types for multi-environment support (LOCAL, TESTNET, MAINNET)
 */

export enum Environment {
  LOCAL = 'LOCAL',
  TESTNET = 'TESTNET', 
  MAINNET = 'MAINNET'
}

export interface NetworkConfig {
  environment: Environment;
  minaEndpoint?: string;
  minaGraphQLEndpoint?: string;
  archiveEndpoint?: string;
  proofsEnabled: boolean;
  feePayer?: {
    publicKey: string;
    privateKey?: string; // Optional for hardware wallets
  };
}

export interface OracleConfig {
  registry: Record<string, {
    publicKey: string;
    privateKey?: string; // Optional for hardware wallets/secure storage
    role: string;
  }>;
}

export interface DeploymentConfig {
  contracts: Record<string, {
    address?: string;
    verificationKey?: string;
    deployedAt?: string;
    transactionHash?: string;
  }>;
}

export interface EnvironmentConfig {
  network: NetworkConfig;
  oracles: OracleConfig;
  deployments: DeploymentConfig;
  gleifApiConfig?: {
    sandboxUrl?: string;
    prodUrl?: string;
    mockUrl?: string;
  };
}

export interface PersistentStorage {
  save(environment: Environment, config: EnvironmentConfig): Promise<void>;
  load(environment: Environment): Promise<EnvironmentConfig | null>;
  exists(environment: Environment): Promise<boolean>;
  clear(environment: Environment): Promise<void>;
}
