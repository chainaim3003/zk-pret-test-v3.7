/**
 * Compilation Registry
 * Central registry of all ZK programs and smart contracts for compilation
 */

import { CompilationItem, CompilationCategory } from './types.js';

export const COMPILATION_REGISTRY: CompilationItem[] = [
  // ===== BASIC ZK PROGRAMS =====
  {
    name: 'GLEIFOptim',
    category: CompilationCategory.ZK_PROGRAM,
    loader: () => import('../../zk-programs/compliance/GLEIFZKProgram.js'),
    compilationOrder: 1,
    enabled: true
  },
  {
    name: 'CorporateRegistrationOptim',
    category: CompilationCategory.ZK_PROGRAM,
    loader: () => import('../../zk-programs/compliance/CorporateRegistrationZKProgram.js'),
    compilationOrder: 1,
    enabled: true
  },
  {
    name: 'EXIMOptim',
    category: CompilationCategory.ZK_PROGRAM,
    loader: () => import('../../zk-programs/compliance/EXIMZKProgram.js'),
    compilationOrder: 1,
    enabled: true
  },

  // ===== BUSINESS PROCESS PROGRAMS =====
  {
    name: 'BPMNGeneric',
    category: CompilationCategory.BUSINESS_PROCESS,
    loader: () => import('../../zk-programs/process/BPMNGenericZKProgram.js'),
    compilationOrder: 1,
    enabled: true
  },
  {
    name: 'BusinessStandardDataIntegrity',
    category: CompilationCategory.BUSINESS_PROCESS,
    loader: () => import('../../zk-programs/process/BusinessStandardDataIntegrityZKProgram.js'),
    compilationOrder: 1,
    enabled: true
  },
  {
    name: 'BusinessStandardOptim',
    category: CompilationCategory.BUSINESS_PROCESS,
    loader: () => import('../../zk-programs/process/BusinessStandardZKProgram.js'),
    compilationOrder: 1,
    enabled: true
  },
  {
    name: 'BusinessStdIntegrityOptimMerkle',
    category: CompilationCategory.BUSINESS_PROCESS,
    loader: () => import('../../zk-programs/process/BusinessStdIntegrityZKProgram.js'),
    compilationOrder: 1,
    enabled: true
  },

  // ===== RISK & LIQUIDITY PROGRAMS =====
  {
    name: 'RiskLiquidityAdvancedOptimMerkle',
    category: CompilationCategory.RISK_LIQUIDITY,
    loader: () => import('../../zk-programs/risk/RiskLiquidityAdvancedMerkleZKProgram.js'),
    compilationOrder: 1,
    enabled: true
  },
  {
    name: 'RiskLiquidityBasel3OptimMerkle',
    category: CompilationCategory.RISK_LIQUIDITY,
    loader: () => import('../../zk-programs/risk/RiskLiquidityBasel3MerkleZKProgram.js'),
    compilationOrder: 1,
    enabled: true
  },
  {
    name: 'RiskLiquidityStableCoinOptimMerkle',
    category: CompilationCategory.RISK_LIQUIDITY,
    loader: () => import('../../zk-programs/risk/RiskLiquidityStableCoinZKProgram.js'),
    compilationOrder: 1,
    enabled: true
  },
  {
    name: 'RiskLiquidityACTUSBasel3',
    category: CompilationCategory.RISK_LIQUIDITY,
    loader: () => import('../../zk-programs/risk/RiskLiquidityACTUSZKProgram_basel3.js'),
    compilationOrder: 1,
    enabled: true
  },
  {
    name: 'StablecoinProofOfReservesRisk',
    category: CompilationCategory.RISK_LIQUIDITY,
    loader: () => import('../../zk-programs/risk/StablecoinProofOfReservesRiskZKProgramWithSign.js'),
    compilationOrder: 1,
    enabled: true
  },

  // ===== SMART CONTRACTS =====
  {
    name: 'GLEIFOptimMultiCompanySmartContract',
    category: CompilationCategory.SMART_CONTRACT,
    loader: () => import('../../contracts/complaince/GLEIF/GLEIFMultiSmartContract.js'),
    dependencies: ['GLEIFOptim'],
    compilationOrder: 2,
    enabled: true
  },
  {
    name: 'CorporateRegistrationOptimSmartContract',
    category: CompilationCategory.SMART_CONTRACT,
    loader: () => import('../../contracts/complaince/CorpReg/CorporateRegistrationOptimSmartContract.js'),
    dependencies: ['CorporateRegistrationOptim'],
    compilationOrder: 2,
    enabled: true
  },
  {
    name: 'CorporateRegistrationOptimMultiCompanySmartContract',
    category: CompilationCategory.SMART_CONTRACT,
    loader: () => import('../../contracts/complaince/CorpReg/CorporateRegistrationMultiSmartContract.js'),
    dependencies: ['CorporateRegistrationOptim'],
    compilationOrder: 2,
    enabled: true
  },
  {
    name: 'CorporateRegistrationOptimSingleCompanySmartContract',
    category: CompilationCategory.SMART_CONTRACT,
    loader: () => import('../../contracts/complaince/CorpReg/CorporateRegistrationSmartContract.js'),
    dependencies: ['CorporateRegistrationOptim'],
    compilationOrder: 2,
    enabled: true
  },
  {
    name: 'EXIMOptimSmartContract',
    category: CompilationCategory.SMART_CONTRACT,
    loader: () => import('../../contracts/complaince/EXIM/EXIMSmartContract.js'),
    dependencies: ['EXIMOptim'],
    compilationOrder: 2,
    enabled: true
  },
  {
    name: 'EXIMOptimMultiCompanySmartContract',
    category: CompilationCategory.SMART_CONTRACT,
    loader: () => import('../../contracts/complaince/EXIM/EXIMMultiSmartContract.js'),
    dependencies: ['EXIMOptim'],
    compilationOrder: 2,
    enabled: true
  },
  {
    name: 'EXIMOptimSingleCompanySmartContract',
    category: CompilationCategory.SMART_CONTRACT,
    loader: () => import('../../contracts/complaince/EXIM/EXIMSingleSmartContract.js'),
    dependencies: ['EXIMOptim'],
    compilationOrder: 2,
    enabled: true
  },
  {
    name: 'BusinessStandardOptimVerificationSmartContract',
    category: CompilationCategory.SMART_CONTRACT,
    loader: () => import('../../contracts/process/BusinessStandardVerificationSmartContract.js'),
    dependencies: ['BusinessStandardOptim'],
    compilationOrder: 2,
    enabled: true
  },
  {
    name: 'BusinessStdIntegrityOptimMerkleSmartContract',
    category: CompilationCategory.SMART_CONTRACT,
    loader: () => import('../../contracts/process/BusinessStdIntegrityMerkleSmartContract.js'),
    dependencies: ['BusinessStdIntegrityOptimMerkle'],
    compilationOrder: 2,
    enabled: true
  },
  {
    name: 'RiskLiquidityAdvancedOptimMerkleSmartContract',
    category: CompilationCategory.SMART_CONTRACT,
    loader: () => import('../../contracts/risk/RiskLiquidityAdvancedSmartContract.js'),
    dependencies: ['RiskLiquidityAdvancedOptimMerkle'],
    compilationOrder: 2,
    enabled: true
  },
  {
    name: 'RiskLiquidityBasel3OptimMerkleSmartContract',
    category: CompilationCategory.SMART_CONTRACT,
    loader: () => import('../../contracts/risk/RiskLiquidityBasel3SmartContract.js'),
    dependencies: ['RiskLiquidityBasel3OptimMerkle'],
    compilationOrder: 2,
    enabled: true
  },
  {
    name: 'RiskLiquidityStableCoinOptimMerkleSmartContract',
    category: CompilationCategory.SMART_CONTRACT,
    loader: () => import('../../contracts/risk/RiskLiquidityStableCoinSmartContract.js'),
    dependencies: ['RiskLiquidityStableCoinOptimMerkle'],
    compilationOrder: 2,
    enabled: true
  },
  {
    name: 'RiskLiquidityOptimMerkleSmartContract',
    category: CompilationCategory.SMART_CONTRACT,
    loader: () => import('../../contracts/risk/RiskLiquiditySmartContract.js'),
    dependencies: ['RiskLiquidityAdvancedOptimMerkle'], // Assuming it uses the advanced version
    compilationOrder: 2,
    enabled: true
  },
  {
    name: 'StablecoinProofOfReservesRiskVerifierSmartContract',
    category: CompilationCategory.SMART_CONTRACT,
    loader: () => import('../../contracts/risk/StablecoinProofOfReservesRiskVerifierSmartContract.js'),
    dependencies: ['StablecoinProofOfReservesRisk'],
    compilationOrder: 2,
    enabled: true
  }
];

/**
 * Get compilation items by category
 */
export function getCompilationsByCategory(category: CompilationCategory): CompilationItem[] {
  return COMPILATION_REGISTRY.filter(item => item.category === category && item.enabled !== false);
}

/**
 * Get compilation item by name
 */
export function getCompilationByName(name: string): CompilationItem | undefined {
  return COMPILATION_REGISTRY.find(item => item.name === name);
}

/**
 * Get compilations in dependency order
 */
export function getCompilationsInOrder(): CompilationItem[] {
  return COMPILATION_REGISTRY
    .filter(item => item.enabled !== false)
    .sort((a, b) => a.compilationOrder - b.compilationOrder);
}

/**
 * Get dependencies for a compilation
 */
export function getDependencies(name: string): string[] {
  const item = getCompilationByName(name);
  return item?.dependencies || [];
}

/**
 * Get all compilation names
 */
export function getAllCompilationNames(): string[] {
  return COMPILATION_REGISTRY
    .filter(item => item.enabled !== false)
    .map(item => item.name);
}
