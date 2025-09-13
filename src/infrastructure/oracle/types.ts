/**
 * Oracle Registry Interface
 * Defines the interface for environment-specific Oracle implementations
 */

import { Mina, PrivateKey, PublicKey } from 'o1js';

export interface OracleAccount {
  publicKey: PublicKey;
  privateKey: PrivateKey;
  role: string;
}

export interface OracleRegistry {
  /**
   * Initialize the oracle registry for the current environment
   */
  initialize(): Promise<void>;

  /**
   * Get the private key for a specific oracle
   */
  getPrivateKeyFor(key: string): PrivateKey;

  /**
   * Get the public key for a specific oracle
   */
  getPublicKeyFor(key: string): PublicKey;

  /**
   * Get the oracle account (both keys) for a specific oracle
   */
  getOracleAccount(key: string): OracleAccount;

  /**
   * Check if an oracle exists
   */
  hasOracle(key: string): boolean;

  /**
   * List all available oracle keys
   */
  listOracles(): string[];

  /**
   * Get deployer and sender accounts for a specific oracle type
   */
  getDeployerAccount(oracleType: string): PublicKey;
  getDeployerKey(oracleType: string): PrivateKey;
  getSenderAccount(oracleType: string): PublicKey;
  getSenderKey(oracleType: string): PrivateKey;

  /**
   * Cleanup resources (if needed)
   */
  cleanup(): Promise<void>;
}

export interface OracleKeyPair {
  publicKey: PublicKey;
  privateKey: PrivateKey;
}
