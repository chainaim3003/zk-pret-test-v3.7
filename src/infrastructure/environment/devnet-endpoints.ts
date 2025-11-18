// src/infrastructure/environment/devnet-endpoints.ts
/**
 * DEVNET Network Endpoints and Fee Configuration
 * Enhances existing infrastructure with DEVNET connectivity
 */

import { Environment } from './types.js';

// ✅ DEVNET Network Endpoints (NOT Berkeley testnet)
export const DEVNET_ENDPOINTS = {
  DEVNET_PRIMARY: {
    minaEndpoint: 'https://api.minascan.io/node/devnet/v1/graphql',
    minaGraphQLEndpoint: 'https://api.minascan.io/node/devnet/v1/graphql',
    archiveEndpoint: 'https://api.minascan.io/archive/devnet/v1/graphql'
  },
  DEVNET_FALLBACK: {
    minaEndpoint: 'https://devnet.minaprotocol.com/graphql',
    minaGraphQLEndpoint: 'https://devnet.minaprotocol.com/graphql'
  },
  MAINNET: {
    minaEndpoint: 'https://api.minascan.io/node/mainnet/v1/graphql',
    minaGraphQLEndpoint: 'https://api.minascan.io/node/mainnet/v1/graphql',
    archiveEndpoint: 'https://api.minascan.io/archive/mainnet/v1/graphql'
  }
} as const;

// ✅ Fee constants in nanomina (o1js v2.0 best practice)
export const FEES_NANOMINA = {
  LOCAL: {
    DEPLOY: 100_000_000n,    // 0.1 MINA
    UPDATE: 10_000_000n,     // 0.01 MINA
    VERIFY: 10_000_000n      // 0.01 MINA
  },
  TESTNET: { // DEVNET fees
    DEPLOY: 100_000_000n,    // 0.1 MINA
    UPDATE: 100_000_000n,    // 0.1 MINA
    VERIFY: 100_000_000n     // 0.1 MINA
  },
  MAINNET: {
    DEPLOY: 1_000_000_000n,  // 1.0 MINA
    UPDATE: 200_000_000n,    // 0.2 MINA
    VERIFY: 100_000_000n     // 0.1 MINA
  }
} as const;

/**
 * Get DEVNET network configuration for TESTNET environment
 */
export function getDevnetNetworkConfig() {
  return {
    environment: Environment.TESTNET,
    minaEndpoint: DEVNET_ENDPOINTS.DEVNET_PRIMARY.minaEndpoint,
    minaGraphQLEndpoint: DEVNET_ENDPOINTS.DEVNET_PRIMARY.minaGraphQLEndpoint,
    archiveEndpoint: DEVNET_ENDPOINTS.DEVNET_PRIMARY.archiveEndpoint,
    proofsEnabled: true,
    feeNanoMina: FEES_NANOMINA.TESTNET.DEPLOY
  };
}

/**
 * Get environment-specific fee in nanomina
 */
export function getEnvironmentFee(environment: Environment, operation: 'DEPLOY' | 'UPDATE' | 'VERIFY'): bigint {
  switch (environment) {
    case Environment.LOCAL:
      return FEES_NANOMINA.LOCAL[operation];
    case Environment.TESTNET:
      return FEES_NANOMINA.TESTNET[operation];
    case Environment.MAINNET:
      return FEES_NANOMINA.MAINNET[operation];
    default:
      return FEES_NANOMINA.LOCAL[operation];
  }
}

/**
 * Convert nanomina to MINA for display
 */
export function nanominaToMina(nanomina: bigint): string {
  return (Number(nanomina) / 1_000_000_000).toFixed(3);
}

/**
 * Check if network endpoint is DEVNET
 */
export function isDevnetEndpoint(endpoint?: string): boolean {
  return !!endpoint && (
    endpoint.includes('devnet') || 
    endpoint.includes('api.minascan.io/node/devnet')
  );
}
