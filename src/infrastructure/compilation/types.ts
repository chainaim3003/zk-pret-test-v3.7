/**
 * Compilation Registry Types
 * Defines types for the centralized compilation system
 */

export enum CompilationCategory {
  ZK_PROGRAM = 'ZK_PROGRAM',
  SMART_CONTRACT = 'SMART_CONTRACT',
  BUSINESS_PROCESS = 'BUSINESS_PROCESS',
  RISK_LIQUIDITY = 'RISK_LIQUIDITY',
  RECURSIVE_PROGRAM = 'RECURSIVE_PROGRAM'
}

export interface CompilationItem {
  name: string;
  category: CompilationCategory;
  loader: () => Promise<any>;
  dependencies?: string[];
  compilationOrder: number;
  enabled?: boolean;
  environmentRestrictions?: string[];
}

export interface CompilationResult {
  name: string;
  verificationKey?: any;
  compilationTime: number;
  success: boolean;
  error?: string;
}

export interface CompilationCache {
  [programName: string]: {
    verificationKey: any;
    compiledAt: string;
    compilationTime: number;
    environment: string;
  };
}

export interface CompilationStats {
  totalPrograms: number;
  compiledPrograms: number;
  cachedPrograms: number;
  failedPrograms: number;
  totalCompilationTime: number;
  byCategory: Record<CompilationCategory, number>;
}
