/**
 * Oracle Configuration Types
 * Defines type-safe Oracle contexts, roles, and configurations
 */

import { PrivateKey, PublicKey } from 'o1js';

export enum OracleCategory {
  CORPREG = 'CORPREG',
  GLEIF = 'GLEIF',
  EXIM = 'EXIM', 
  RISK = 'RISK',
  BIZ_STD = 'BIZ_STD'
}

export enum Jurisdiction {
  GLOBAL = 'GLOBAL',
  INDIA = 'INDIA',
  US = 'US',
  EU = 'EU',
  SAUDI = 'SAUDI'
}

export enum OracleRole {
  DEPLOYER = 'deployer',   // Deploys smart contracts
  SIGNER = 'signer',       // Signs Oracle attestations/proofs  
  SENDER = 'sender'        // Sends transactions
}

export interface OracleContext {
  category: OracleCategory;
  jurisdiction: Jurisdiction;
  organization?: string;
  methodology?: string;
  standard?: string;
  path: string;           // e.g., "CORPREG.INDIA.MCA"
  id: string;            // e.g., "CORPREG_INDIA_MCA"
  description: string;
}

export interface OracleRoleConfig {
  accountIndex: number;
  description?: string;
  keyDerivationPath?: string;  // For deterministic key generation
}

export interface OracleDefinition {
  id: string;
  description: string;
  category: OracleCategory;
  jurisdiction: Jurisdiction;
  organization?: string;
  methodology?: string;
  standard?: string;
  roles: Record<OracleRole, OracleRoleConfig>;
  metadata?: Record<string, any>;
}

export interface OracleKeyPair {
  publicKey: PublicKey;
  privateKey: PrivateKey;
}

// Predefined Oracle Contexts (Type-safe)
export const OracleContexts = {
  // Corporate Registry
  CORPREG_INDIA_MCA: {
    category: OracleCategory.CORPREG,
    jurisdiction: Jurisdiction.INDIA,
    organization: 'MCA',
    path: 'CORPREG.INDIA.MCA',
    id: 'CORPREG_INDIA_MCA',
    description: 'Ministry of Corporate Affairs - India'
  } as OracleContext,

  CORPREG_US_SEC: {
    category: OracleCategory.CORPREG,
    jurisdiction: Jurisdiction.US,
    organization: 'SEC',
    path: 'CORPREG.US.SEC',
    id: 'CORPREG_US_SEC',
    description: 'Securities and Exchange Commission - US'
  } as OracleContext,

  // GLEIF
  GLEIF_GLOBAL: {
    category: OracleCategory.GLEIF,
    jurisdiction: Jurisdiction.GLOBAL,
    path: 'GLEIF.GLOBAL',
    id: 'GLEIF_GLOBAL',
    description: 'Global Legal Entity Identifier Foundation'
  } as OracleContext,

  // Export/Import
  EXIM_INDIA_DGFT: {
    category: OracleCategory.EXIM,
    jurisdiction: Jurisdiction.INDIA,
    organization: 'DGFT',
    path: 'EXIM.INDIA.DGFT',
    id: 'EXIM_INDIA_DGFT',
    description: 'Directorate General of Foreign Trade - India'
  } as OracleContext,

  EXIM_SAUDI_GAZT: {
    category: OracleCategory.EXIM,
    jurisdiction: Jurisdiction.SAUDI,
    organization: 'GAZT',
    path: 'EXIM.SAUDI.GAZT',
    id: 'EXIM_SAUDI_GAZT',
    description: 'General Authority for Zakat and Tax - Saudi Arabia'
  } as OracleContext,

  // Risk
  RISK_GLOBAL_ACTUS_IMPLEMENTOR_1: {
    category: OracleCategory.RISK,
    jurisdiction: Jurisdiction.GLOBAL,
    methodology: 'ACTUS-IMPLEMENTOR-1',
    path: 'RISK.GLOBAL.ACTUS-IMPLEMENTOR-1',
    id: 'RISK_GLOBAL_ACTUS_IMPLEMENTOR_1',
    description: 'ACTUS Risk Methodology Implementor - CHAINAIM'
  } as OracleContext,

  // Business Standards
  BIZ_STD_GLOBAL_DCSAV3: {
    category: OracleCategory.BIZ_STD,
    jurisdiction: Jurisdiction.GLOBAL,
    standard: 'DCSAV3.0',
    path: 'BIZ_STD.GLOBAL.DCSAV3.0',
    id: 'BIZ_STD_GLOBAL_DCSAV3',
    description: 'DCSA v3.0 Business Standards'
  } as OracleContext,
} as const;
