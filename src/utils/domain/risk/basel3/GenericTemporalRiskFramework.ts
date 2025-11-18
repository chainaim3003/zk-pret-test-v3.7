/**
 * ====================================================================
 * Generic Temporal Risk Processing Framework
 * ====================================================================
 * Base classes for period-agnostic risk processing
 * Supports daily, monthly, quarterly, yearly periods
 * Maintains functional equivalence with existing implementations
 * ====================================================================
 */

import { Field, Signature, UInt64, Bool } from 'o1js';

// =================================== Core Temporal Data Interface ===================================

export interface ACTUSEvent {
  type: string;
  time: string;
  payoff: number;
  currency: string;
  nominalValue?: number;
  nominalRate?: number;
  nominalAccrued?: number;
  // Enhanced with classification info
  contractId?: string;
  contractIndex?: number;
  hqlaCategory?: string;
}

export interface TemporalACTUSData {
  // Generic temporal structure
  periodsCount: number;
  periodType: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  periodSize: number; // e.g., 1 = 1 month, 7 = 7 days
  
  // Raw data (period-agnostic)
  rawEvents: any[];
  dateRange: { start: Date; end: Date };
  
  // Processed temporal arrays
  cashFlows: {
    inflows: number[][];  // [period][contract_events]
    outflows: number[][];
    netFlows: number[];
  };
  
  // NEW: Preserve event-level detail for precise classification
  eventDetails: {
    contractEvents: ACTUSEvent[];      // Individual events with timestamps and classifications
    contractClassifications: any[];   // HQLA categories per contract
    eventToMonthMapping: number[];     // Which month each event belongs to
    eventToContractMapping: number[];  // Which contract each event belongs to
    startDate: Date;                   // Reference start date for month calculations
  };
  
  // Metadata
  processingTimestamp: number;
  contractDetails: any[];
  currency: string;
}

// =================================== Generic Risk Classification Interface ===================================

export interface GenericRiskClassification<T> {
  periodsCount: number;
  periodType: string;
  
  // Generic classification arrays
  classifiedData: T[]; // T = Basel3HQLA | SolvencyIICategories | IFRSStages
  aggregatedMetrics: Record<string, number[]>;
  
  // Temporal risk metrics
  riskMetrics: {
    periodMetrics: number[];
    cumulativeMetrics: number[];
    averageMetrics: number;
    worstCase: number;
  };
}

// =================================== Specific Risk Classification Types ===================================

export interface Basel3HQLA {
  L1: number;
  L2A: number;
  L2B: number;
  NonHQLA: number;
}

export interface SolvencyIICategories {
  equity: number;
  bonds: number;
  alternatives: number;
}

export interface IFRSStages {
  stage1: number;
  stage2: number;
  stage3: number;
}

// =================================== Generic Temporal Merkle Tree Interface ===================================

export interface GenericTemporalMerkleTree {
  leaves: {
    rawDataHash: Field;           // Hash(original ACTUS response)
    temporalStructureHash: Field; // Hash(periods + dateRange + periodType)
    cashFlowsHash: Field;         // Hash(inflows + outflows arrays)
    classificationsHash: Field;   // Hash(risk classifications by period)
    parametersHash: Field;        // Hash(thresholds + processing rules)
  };
  
  merkleRoot: Field;
  witnesses: Field[]; // Changed from MerkleWitness[] to Field[] for public interface
  metadata: {
    periodsCount: number;
    periodType: string;
    dataIntegrityTimestamp: number;
  };
}

// =================================== Abstract Base Classes ===================================

/**
 * Abstract base class for generic risk processors
 * Maintains functional equivalence with existing implementations
 */
export abstract class GenericRiskProcessor<T> {
  abstract periodType: string;
  
  /**
   * Process temporal ACTUS data into risk classifications
   * Must maintain functional equivalence with existing logic
   */
  abstract processRiskData(temporalData: TemporalACTUSData): GenericRiskClassification<T>;
  
  /**
   * Create aggregated metric arrays for backward compatibility
   */
  protected createAggregatedArrays(classifiedData: T[]): Record<string, number[]> {
    // Default implementation - subclasses can override
    return {};
  }
  
  /**
   * Calculate temporal metrics from classified data
   */
  protected calculateTemporalMetrics(classifiedData: T[]): {
    periodMetrics: number[];
    cumulativeMetrics: number[];
    averageMetrics: number;
    worstCase: number;
  } {
    // Default implementation - subclasses can override
    return {
      periodMetrics: [],
      cumulativeMetrics: [],
      averageMetrics: 0,
      worstCase: 0
    };
  }
}

/**
 * Abstract base class for generic temporal ZK programs
 * Preserves existing ZK program patterns while enabling generics
 */
export abstract class GenericTemporalRiskZKProgram<T> {
  abstract periodType: string;
  
  /**
   * Core risk calculation logic - must be implemented by subclasses
   * Should maintain functional equivalence with existing ZK programs
   */
  abstract riskCalculation(
    data: GenericRiskClassification<T>,
    thresholds: Record<string, number>
  ): boolean;
  
  /**
   * Verify oracle signature on raw data + merkle root
   * Standard pattern across all implementations
   */
  protected verifyOracleSignature(
    signature: Signature, 
    rawData: any[], 
    merkleRoot: Field,
    publicKey: any
  ): void {
    // Standard oracle verification logic
    const dataHash = this.hashRawData(rawData);
    const isValidSignature = signature.verify(publicKey, [dataHash, merkleRoot]);
    isValidSignature.assertTrue();
  }
  
  /**
   * Verify merkle inclusion proofs
   * Standard pattern across all implementations  
   */
  protected verifyMerkleInclusion(
    witnesses: Field[], // Changed from MerkleWitness[] to Field[]
    merkleRoot: Field,
    leafHashes: Field[]
  ): void {
    // Simplified merkle verification without MerkleWitness class
    // In practice, this would use a more sophisticated merkle tree implementation
    witnesses.forEach((witness, index) => {
      if (leafHashes[index]) {
        // Basic hash verification
        const combined = Field.from(witness.toBigInt() + leafHashes[index].toBigInt());
        // In a real implementation, this would properly verify merkle paths
      }
    });
  }
  
  /**
   * Verify temporal data processing integrity
   * Ensures processed data matches raw input
   */
  protected verifyTemporalProcessing(
    temporalData: TemporalACTUSData,
    riskClassification: GenericRiskClassification<T>
  ): void {
    // Verify periods count matches
    Field(temporalData.periodsCount).assertEquals(Field(riskClassification.periodsCount));
    
    // Verify period type matches
    if (temporalData.periodType !== riskClassification.periodType) {
      throw new Error(`Period type mismatch: ${temporalData.periodType} vs ${riskClassification.periodType}`);
    }
    
    // Additional temporal integrity checks can be added here
  }
  
  /**
   * Validate thresholds against risk metrics
   * Common pattern across all risk frameworks
   */
  protected validateThresholds(
    riskMetrics: GenericRiskClassification<T>['riskMetrics'],
    thresholds: Record<string, number>
  ): void {
    // Validate that risk metrics meet required thresholds
    // Implementation depends on specific risk framework
  }
  
  /**
   * Hash raw ACTUS data for signature verification
   */
  private hashRawData(rawData: any[]): Field {
    // Create deterministic hash of raw ACTUS response
    const dataString = JSON.stringify(rawData);
    return Field.from(this.simpleHash(dataString));
  }
  
  /**
   * Simple hash function for data integrity
   */
  private simpleHash(data: string): bigint {
    let hash = 0n;
    for (let i = 0; i < data.length; i++) {
      const char = BigInt(data.charCodeAt(i));
      hash = ((hash << 5n) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
  }
}

// =================================== Generic Proof Output Interface ===================================

export interface GenericRiskProof {
  periodType: string;
  periodsCount: number;
  compliant: boolean;
  riskMetrics: any;
  verificationTimestamp: number;
  merkleRoot?: Field;
}

// =================================== Utility Functions ===================================

/**
 * Calculate month index from event date relative to start date
 */
function calculateMonthIndex(eventDate: Date, startDate: Date): number {
  const yearDiff = eventDate.getFullYear() - startDate.getFullYear();
  const monthDiff = eventDate.getMonth() - startDate.getMonth();
  return Math.max(0, yearDiff * 12 + monthDiff);
}

/**
 * Convert existing ACTUS data to generic temporal format
 * Maintains full backward compatibility while preserving event-level detail
 */
export function convertToGenericFormat(
  periodsCount: number,
  periodType: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly',
  inflows: number[][],
  outflows: number[][],
  rawEvents: any[],
  contractDetails: any[]
): TemporalACTUSData {
  
  // Extract date range from events or use defaults
  const startDate = rawEvents.length > 0 ? 
    extractDateRangeFromEvents(rawEvents).start : 
    new Date('2023-01-02');
  
  const endDate = rawEvents.length > 0 ? 
    extractDateRangeFromEvents(rawEvents).end : 
    new Date('2025-01-01');
  
  // Process all individual events with full context
  const allEvents: ACTUSEvent[] = [];
  const eventToMonthMapping: number[] = [];
  const eventToContractMapping: number[] = [];
  
  rawEvents.forEach((contract, contractIndex) => {
    console.log(`🔍 Processing contract ${contractIndex}: ${contract.contractId}, HQLA: ${contract.hqlaCategory}`);
    
    if (contract.events && Array.isArray(contract.events)) {
      contract.events.forEach((event: any) => {
        // ✅ CRITICAL FIX: Ensure HQLA category is properly passed to events
        const hqlaCategory = contract.hqlaCategory || 
                            (contractDetails[contractIndex] ? contractDetails[contractIndex].hqlaCategory : 'NonHQLA');
        
        const enhancedEvent: ACTUSEvent = {
          ...event,
          contractId: contract.contractId || contract.id,
          contractIndex: contractIndex,
          hqlaCategory: hqlaCategory
        };
        
        console.log(`   Event: ${event.type} | Payoff: ${event.payoff} | HQLA: ${hqlaCategory}`);
        
        allEvents.push(enhancedEvent);
        
        // Calculate which month this event belongs to
        const eventDate = new Date(event.time);
        const monthIndex = calculateMonthIndex(eventDate, startDate);
        eventToMonthMapping.push(monthIndex);
        eventToContractMapping.push(contractIndex);
      });
    }
  });
  
  console.log(`🔍 Event Detail Processing: ${allEvents.length} events from ${rawEvents.length} contracts`);
  console.log(`📅 Date range: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);
  
  return {
    periodsCount,
    periodType,
    periodSize: 1, // Default to 1 unit per period
    rawEvents,
    dateRange: {
      start: startDate,
      end: endDate
    },
    cashFlows: {
      inflows,
      outflows,
      netFlows: inflows.map((inf, i) => 
        inf.reduce((sum, val) => sum + val, 0) - 
        outflows[i].reduce((sum, val) => sum + val, 0)
      )
    },
    eventDetails: {
      contractEvents: allEvents,
      contractClassifications: contractDetails,
      eventToMonthMapping,
      eventToContractMapping,
      startDate
    },
    processingTimestamp: Date.now(),
    contractDetails,
    currency: 'USD'
  };
}

/**
 * Extract date range from raw ACTUS events
 * Maintains compatibility with existing date processing
 */
export function extractDateRangeFromEvents(rawEvents: any[]): { start: Date; end: Date } {
  const allDates = rawEvents.flatMap(contract => 
    contract.events?.map((event: any) => new Date(event.time)) || []
  );
  
  if (allDates.length === 0) {
    // Default range if no events
    return {
      start: new Date('2023-01-01'),
      end: new Date('2025-01-01')
    };
  }
  
  return {
    start: new Date(Math.min(...allDates.map(date => date.getTime()))),
    end: new Date(Math.max(...allDates.map(date => date.getTime())))
  };
}

/**
 * Determine period type from date range
 * Helper for automatic period detection
 */
export function determinePeriodType(dateRange: { start: Date; end: Date }): {
  periodType: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  expectedPeriods: number;
} {
  const diffTime = dateRange.end.getTime() - dateRange.start.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays <= 31) {
    return { periodType: 'daily', expectedPeriods: diffDays };
  } else if (diffDays <= 365) {
    return { periodType: 'monthly', expectedPeriods: Math.ceil(diffDays / 30) };
  } else if (diffDays <= 1095) { // ~3 years
    return { periodType: 'quarterly', expectedPeriods: Math.ceil(diffDays / 90) };
  } else {
    return { periodType: 'yearly', expectedPeriods: Math.ceil(diffDays / 365) };
  }
}
