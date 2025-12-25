/**
 * ComplianceVerificationBase.ts - Shared Compliance Logic
 * Extracted from GLEIFLocalMultiVerifierUtils.ts and GLEIFNetworkMultiVerifierUtils.ts
 * DEDUPLICATION: Removes ~200 lines of duplicate code by consolidating compliance analysis methods
 */

import { Field, Bool, UInt64, PublicKey } from 'o1js';
import { 
  RegistryInfo,
  GlobalComplianceStats
} from '../../contracts/compliance/CorpReg/CorporateRegistrationMultiSmartContract.js';
import {
  CorporateRegistrationOptimComplianceData
} from '../../zk-programs/compliance/CorporateRegistrationOptimZKProgram.js';
import { safeLogSmartContractState } from './SafeStateRetrieval.js';
import { safeLogSmartContractStateLocal } from './SafeStateRetrievalLocal.js';
import { environmentManager } from '../../infrastructure/index.js';

export interface ComplianceAnalysis {
  isCompanyActive: boolean;
  isRegistrationIssued: boolean;
  isCategoryOk: boolean;
  hasValidDates: boolean;
  hasValidCIN: boolean;
  allRulesPassed: boolean;
  rulesPassedCount: number;
}

export interface EnhancedComplianceStats {
  totalCompanies: number;
  compliantCompanies: number;
  nonCompliantCompanies: number;
  compliancePercentage: number;
  complianceRatio: string;
  complianceDecimal: string;
}

export class CorpRegVerificationBase {
  /**
   * Type guard to check if the contract stats is RegistryInfo
   * MOVED FROM: Both GLEIFLocalMultiVerifierUtils.ts and GLEIFNetworkMultiVerifierUtils.ts (identical implementations)
   */
  private isRegistryInfo(contractStats: any): contractStats is RegistryInfo {
    return 'totalCompaniesTracked' in contractStats;
  }

  /**
   * ✅ ZK BEST PRACTICE: Calculate compliance percentage outside the circuit
   * MOVED FROM: GLEIFLocalMultiVerifierUtils.ts (addCompliancePercentage function)
   * DEDUPLICATION: Single implementation instead of 2 identical copies in Local and Network utils
   */
  public addCompliancePercentage(contractStats: any): EnhancedComplianceStats {
    let total: number;
    let compliant: number;
    
    if (this.isRegistryInfo(contractStats)) {
      // RegistryInfo type
      total = Number(contractStats.totalCompaniesTracked.toString());
      compliant = Number(contractStats.compliantCompaniesCount.toString());
    } else {
      // GlobalComplianceStats type
      total = Number(contractStats.totalCompanies.toString());
      compliant = Number(contractStats.compliantCompanies.toString());
    }
    
    const percentage = total > 0 
      ? Math.round((compliant / total) * 100) 
      : 0;
      
    return {
      ...contractStats,
      totalCompanies: total,
      compliantCompanies: compliant,
      nonCompliantCompanies: total - compliant,
      compliancePercentage: percentage,
      complianceRatio: `${compliant}/${total}`,
      complianceDecimal: total > 0 ? (compliant / total).toFixed(2) : "0.00"
    } as any;
  }

  /**
   * ✅ FIXED: Analyzes compliance fields with comprehensive safety checks
   * MOVED FROM: GLEIFLocalMultiVerifierUtils.ts (analyzeComplianceFields function)
   * DEDUPLICATION: Single implementation instead of duplicates in Local and Network utils
   */
  public analyzeComplianceFields(complianceData: CorporateRegistrationOptimComplianceData): ComplianceAnalysis {
    try {
      // Validate input data
      if (!this.validateComplianceData(complianceData)) {
        console.error('❌ Invalid compliance data provided');
        throw new Error('Invalid compliance data structure');
      }
      
      // Safe field extraction with fallbacks
      const companyName = this.safeToString(complianceData.name, 'companyName');
      const CIN = this.safeToString(complianceData. cin, ' CIN');
      const registrationNumber = this.safeToString(complianceData.registration_number, 'registrationNumber');
      const companyStatus = this.safeToString(complianceData.company_status, 'companyStatus');
      const dateOfIncorporation = this.safeToString(complianceData.dateOfIncorporation, 'dateOfIncorporation');
      const category = this.safeToString(complianceData.category, 'category');

      // Business logic validation
      const isCompanyActive = companyStatus === 'ACTIVE' || companyStatus === 'Active';
      const isRegistrationIssued = registrationNumber !== '';
      const isCategoryOk = category !== '' ;
      const hasValidDates = dateOfIncorporation !== '' && dateOfIncorporation !== 'EMPTY' && 
                           dateOfIncorporation !== 'UNDEFINED';
      const hasValidCIN = CIN !== '' && CIN !== 'EMPTY' && CIN !== 'UNDEFINED';
      
      const allRulesPassed = isCompanyActive && isRegistrationIssued && isCategoryOk && hasValidDates && hasValidCIN;
      const rulesPassedCount = [isCompanyActive, isRegistrationIssued, isCategoryOk, hasValidDates, hasValidCIN]
        .filter(Boolean).length;

      return {
        isCompanyActive,
        isRegistrationIssued,
        isCategoryOk,
        hasValidDates,
        hasValidCIN,
        allRulesPassed,
        rulesPassedCount
      };
      
    } catch (error) {
      console.error('❌ Error in analyzeComplianceFields:', error);
      // Return safe defaults in case of error
      return {
        isCompanyActive: false,
        isRegistrationIssued: false,
        isCategoryOk: false,
        hasValidDates: false,
        hasValidCIN: false,
        allRulesPassed: false,
        rulesPassedCount: 0
      };
    }
  }

  /**
   * ✅ FIXED: Safe toString helper for CircuitString objects
   * Handles null/undefined/malformed CircuitString objects safely
   */
  private safeToString(value: any, fieldName: string = 'unknown'): string {
    try {
      // Handle null/undefined
      if (value === null || value === undefined) {
        console.warn(`⚠️ Field '${fieldName}' is null/undefined`);
        return 'UNDEFINED';
      }
      
      // Handle CircuitString objects
      if (value && typeof value.toString === 'function') {
        const result = value.toString();
        return result || 'EMPTY';
      }
      
      // Handle primitive strings
      if (typeof value === 'string') {
        return value || 'EMPTY';
      }
      
      // Fallback for other types
      console.warn(`⚠️ Field '${fieldName}' has unexpected type: ${typeof value}`);
      return String(value) || 'UNDEFINED';
      
    } catch (error) {
      console.error(`❌ Error converting field '${fieldName}' to string:`, error);
      return 'ERROR';
    }
  }

  /**
   * ✅ FIXED: Type guard for GLEIFOptimComplianceData validation
   */
  private validateComplianceData(complianceData: any): boolean {
    try {
      if (!complianceData) {
        console.error('❌ Compliance data is null or undefined');
        return false;
      }
      
      const requiredFields = [
        'name', 'cin', 'registration_number',
        'company_status', 'dateOfIncorporation', 'category'
      ];
      
      for (const field of requiredFields) {
        if (!(field in complianceData)) {
          console.error(`❌ Required field '${field}' missing from compliance data`);
          return false;
        }
      }
      
      return true;
    } catch (error) {
      console.error('❌ Error validating compliance data:', error);
      return false;
    }
  }

  /**
   * ✅ FIXED: Logs compliance field analysis with comprehensive error handling
   * MOVED FROM: GLEIFLocalMultiVerifierUtils.ts (logComplianceFieldAnalysis function)
   * DEDUPLICATION: Single implementation instead of duplicates in Local and Network utils
   */
  public logComplianceFieldAnalysis(
    complianceData: CorporateRegistrationOptimComplianceData,
    isCompliant: Bool,
    phase: 'Pre-Verification' | 'Post-Verification' = 'Pre-Verification'
  ): void {
    try {
      console.log(`\n🔍 COMPLIANCE FIELD ANALYSIS (${phase}):`);
      
      // Validate input parameters
      if (!complianceData) {
        console.error('❌ Compliance data is null or undefined');
        return;
      }
      
      if (!isCompliant) {
        console.error('❌ isCompliant parameter is null or undefined');
        return;
      }
      
      // Get analysis with error handling
      const analysis = this.analyzeComplianceFields(complianceData);
      
      // Safe field extraction for logging
    //   const entityStatus = this.safeToString(complianceData.entity_status, 'entity_status');
    //   const registrationStatus = this.safeToString(complianceData.registration_status, 'registration_status');
    //   const conformityFlag = this.safeToString(complianceData.conformity_flag, 'conformity_flag');
    //   const lastUpdateDate = this.safeToString(complianceData.lastUpdateDate, 'lastUpdateDate');
    //   const nextRenewalDate = this.safeToString(complianceData.nextRenewalDate, 'nextRenewalDate');
    //   const lei = this.safeToString(complianceData.lei, 'lei');
      
      const companyName = this.safeToString(complianceData.name, 'companyName');
      const cin = this.safeToString(complianceData.cin, ' CIN');
      const registrationNumber = this.safeToString(complianceData.registration_number, 'registrationNumber');
      const companyStatus = this.safeToString(complianceData.company_status, 'companyStatus');
      const dateOfIncorporation = this.safeToString(complianceData.dateOfIncorporation, 'dateOfIncorporation');
      const category = this.safeToString(complianceData.category, 'category');
      // Log analysis results
      console.log(`  🏢 Entity Status: "${companyStatus}" → ${analysis.isCompanyActive ? '✅ ACTIVE (Pass)' : '❌ NOT ACTIVE (Fail)'}`);
      console.log(`  📋 Registration Status: "${registrationNumber}" → ${analysis.isRegistrationIssued ? '✅ ISSUED (Pass)' : '❌ NOT ISSUED (Fail)'}`);
      console.log(`  🔍 Conformity Flag: "${category}" → ${analysis.isCategoryOk ? '✅ ACCEPTABLE (Pass)' : '❌ NON-CONFORMING (Fail)'}`);
      console.log(`  📅 Date Validation: Last Update "${dateOfIncorporation}", → ${analysis.hasValidDates ? '✅ VALID DATES (Pass)' : '❌ INVALID DATES (Fail)'}`);
      console.log(`  🆔 LEI Validation: "${cin}" → ${analysis.hasValidCIN ? '✅ VALID LEI (Pass)' : '❌ EMPTY LEI (Fail)'}`);
      
      // Safe Bool conversion
      let isCompliantValue = false;
      try {
        isCompliantValue = isCompliant.toJSON();
      } catch (error) {
        console.warn('⚠️ Error converting isCompliant to JSON, using false');
      }
      
      console.log(`  🏆 Overall Compliance Analysis: ${analysis.allRulesPassed ? '✅ ALL RULES PASSED' : '❌ SOME RULES FAILED'} → ZK Proof Shows: ${isCompliantValue ? '✅ COMPLIANT' : '❌ NON-COMPLIANT'}`);
      console.log(`  📊 Business Rules: ${analysis.rulesPassedCount}/5 passed`);
      console.log(`  📈 Compliance Percentage: ${Math.round((analysis.rulesPassedCount / 5) * 100)}%`);
      
      if (phase === 'Pre-Verification') {
        console.log(`  ⏳ Chain Status: NOT YET VERIFIED - Awaiting smart contract transaction...`);
      } else {
        console.log(`  ✅ Chain Status: VERIFIED AND STORED ON BLOCKCHAIN`);
      }
      
      if (!analysis.allRulesPassed) {
        console.log(`  ⚠️ Rules That ${phase === 'Pre-Verification' ? 'Will' : 'Did'} Fail:`);
        if (!analysis.isCompanyActive) console.log(`    - Entity Status must be "ACTIVE", got "${companyStatus}"`);
        if (!analysis.isRegistrationIssued) console.log(`    - Registration Status must be "ISSUED", got "${registrationNumber}"`);
        if (!analysis.isCategoryOk) console.log(`    - Conformity Flag must be "CONFORMING", "UNKNOWN" or empty, got "${category}"`);
        if (!analysis.hasValidDates) console.log(`    - Last Update and Next Renewal dates must not be empty`);
        if (!analysis.hasValidCIN) console.log(`    - LEI must not be empty`);
      }
      
    } catch (error) {
      console.error(`❌ Error in logComplianceFieldAnalysis (${phase}):`, error);
      console.log(`  🚨 Failed to analyze compliance data - this may indicate a data structure issue`);
      // Don't re-throw here to prevent cascading failures
    }
  }

  /**
   * FIXED: Logs smart contract state information with SAFE account fetching
   * CRITICAL FIX: Now uses appropriate safe state retrieval based on environment
   * 
   * LOCAL: Uses simple direct call (no retry needed)
   * NETWORK: Uses fetchAccount() with retry logic for DEVNET/TESTNET
   */
  public async logSmartContractState(
    zkApp: any, // GLEIFOptimMultiCompanySmartContract
    zkAppAddress: PublicKey,
    phase: 'BEFORE' | 'AFTER' = 'BEFORE'
  ): Promise<RegistryInfo> {
    try {
      // Determine environment and use appropriate method
      const currentEnv = environmentManager?.getCurrentEnvironment?.() || 'LOCAL';
      
      if (currentEnv === 'LOCAL') {
        // Use simple version for local blockchain
        const state = await safeLogSmartContractStateLocal(zkApp, zkAppAddress, phase);
        return state;
      } else {
        // Use retry logic version for network environments
        const state = await safeLogSmartContractState(zkApp, zkAppAddress, phase);
        return state;
      }
    } catch (error: any) {
      console.error(`❌ Error in logSmartContractState (${phase}): ${error.message}`);
      throw error;
    }
  }

  /**
   * Logs state changes between before and after verification
   * MOVED FROM: GLEIFLocalMultiVerifierUtils.ts (logStateChanges function)
   * CONSOLIDATED: Similar implementations in both Local and Network utils
   */
  public logStateChanges(stateBefore: RegistryInfo, stateAfter: RegistryInfo): void {
    console.log('\n📈 STATE CHANGES:');
    const stateBeforeWithPercentage = this.addCompliancePercentage(stateBefore);
    const stateAfterWithPercentage = this.addCompliancePercentage(stateAfter);
    console.log(`  📊 Total Companies: ${stateBefore.totalCompaniesTracked.toString()} → ${stateAfter.totalCompaniesTracked.toString()}`);
    console.log(`  ✅ Compliant Companies: ${stateBefore.compliantCompaniesCount.toString()} → ${stateAfter.compliantCompaniesCount.toString()}`);
    console.log(`  📈 Global Compliance Score: ${stateBeforeWithPercentage.compliancePercentage}% → ${stateAfterWithPercentage.compliancePercentage}%`);
    console.log(`  🔢 Total Verifications: ${stateBefore.totalVerificationsGlobal.toString()} → ${stateAfter.totalVerificationsGlobal.toString()}`);
    console.log(`  🌳 Companies Root Hash: ${stateBefore.companiesRootHash.toString()} → ${stateAfter.companiesRootHash.toString()}`);
    console.log(`  📝 Registry Version: ${stateBefore.registryVersion.toString()} → ${stateAfter.registryVersion.toString()}`);
  }

  /**
   * Enhanced compliance stats for global statistics
   * NEW METHOD: Enhanced version of addCompliancePercentage for global stats specifically
   */
  public enhanceGlobalComplianceStats(stats: GlobalComplianceStats): EnhancedComplianceStats & GlobalComplianceStats {
    const enhanced = this.addCompliancePercentage(stats);
    return {
      ...stats,
      ...enhanced
    } as EnhancedComplianceStats & GlobalComplianceStats;
  }

  /**
   * Log final compliance statistics with enhanced formatting
   * NEW METHOD: Standardized final statistics logging
   */
  public logFinalComplianceStatistics(
    stats: any,
    title: string = 'Final Compliance Statistics'
  ): void {
    console.log(`\n📈 ${title}:`);
    const enhanced = this.addCompliancePercentage(stats);
    
    console.log(`  • Total Companies Tracked: ${enhanced.totalCompanies}`);
    console.log(`  • Compliant Companies: ${enhanced.compliantCompanies}`);
    console.log(`  • Non-Compliant Companies: ${enhanced.nonCompliantCompanies}`);
    console.log(`  • Compliance Percentage: ${enhanced.compliancePercentage}%`);
    console.log(`  • Compliance Ratio: ${enhanced.complianceRatio}`);
    console.log(`  • Compliance Decimal: ${enhanced.complianceDecimal}`);

    if ('totalVerificationsGlobal' in stats) {
      console.log(`  • Total Verifications: ${(stats as RegistryInfo).totalVerificationsGlobal.toString()}`);
    }
    if ('totalVerifications' in stats) {
      console.log(`  • Total Verifications: ${(stats as GlobalComplianceStats).totalVerifications.toString()}`);
    }
  }

  /**
   * Initialize Oracle Registry for compliance operations
   * NEW METHOD: Placeholder for oracle registry initialization
   */
  public async initializeOracleRegistry(): Promise<void> {
    console.log('🔑 Initializing Oracle Registry for compliance operations...');
    // For now, this is a placeholder method
    // In the future, this could handle oracle registry setup, validation, etc.
    console.log('✅ Oracle Registry initialization completed');
  }
}
