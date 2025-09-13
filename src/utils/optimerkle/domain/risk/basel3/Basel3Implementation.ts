/**
 * ====================================================================
 * Basel3 Implementation of Generic Temporal Risk Framework
 * ====================================================================
 * Period-agnostic Basel3 LCR/NSFR risk calculations
 * Works with any time period (daily, monthly, yearly) - math is identical
 * ====================================================================
 */

import { Field, CircuitString, Bool, UInt64 } from 'o1js';
import {
  GenericRiskProcessor,
  GenericTemporalRiskZKProgram,
  TemporalACTUSData,
  GenericRiskClassification,
  Basel3HQLA,
  convertToGenericFormat
} from '../../../../domain/risk/basel3/GenericTemporalRiskFramework.js';
import { ACTUSDatao1 } from '../../../../../zk-programs/risk/RiskLiquidityACTUSZKProgram_basel3.js';
import { getBasel3ContractPortfolio } from '../ACTUSOptimMerkleAPI.js';

// =================================== Basel3 Risk Processor ===================================

export class Basel3Processor extends GenericRiskProcessor<Basel3HQLA> {
  periodType = 'period-agnostic'; // Works with any time unit
  
  /**
   * Process temporal ACTUS data into Basel3 HQLA classifications
   * Period-agnostic: works whether periods are daily, monthly, or yearly
   */
  processRiskData(temporalData: TemporalACTUSData): GenericRiskClassification<Basel3HQLA> {
    console.log('🏦 Processing Basel3 HQLA classifications with EVENT-BASED logic...');
    console.log(`📊 Processing ${temporalData.eventDetails.contractEvents.length} events across ${temporalData.periodsCount} periods`);
    
    // Create period-by-period HQLA classifications using EVENT-BASED logic
    const periodHQLA: Basel3HQLA[] = [];
    
    for (let period = 0; period < temporalData.periodsCount; period++) {
      const periodData = this.classifyHQLAForPeriod(period, temporalData);
      periodHQLA.push(periodData);
    }
    
    // Create aggregated arrays for backward compatibility
    const aggregatedMetrics = this.createAggregatedArrays(periodHQLA);
    
    console.log(`✅ Processed ${periodHQLA.length} period HQLA classifications`);
    
    return {
      periodsCount: temporalData.periodsCount,
      periodType: 'period-agnostic',
      classifiedData: periodHQLA,
      aggregatedMetrics,
      riskMetrics: {
        periodMetrics: [],     // Will be calculated in ZK program
        cumulativeMetrics: [], // Will be calculated in ZK program  
        averageMetrics: 0,     // Not used in original logic
        worstCase: 0          // Will be calculated in ZK program
      }
    };
  }
  
  /**
   * Classify HQLA for a specific period using EVENT-BASED logic
   * Period-agnostic: works whether period represents day, month, or year
   */
  private classifyHQLAForPeriod(
    period: number,
    temporalData: TemporalACTUSData
  ): Basel3HQLA {
    
    let hqla: Basel3HQLA = {
      L1: 0,
      L2A: 0,
      L2B: 0,
      NonHQLA: 0
    };
    
    // Process each individual event for this period
    temporalData.eventDetails.contractEvents.forEach((event, eventIndex) => {
      const eventPeriod = temporalData.eventDetails.eventToMonthMapping[eventIndex];
      
      if (eventPeriod === period && event.payoff !== 0) {
        const hqlaCategory = event.hqlaCategory || 'NonHQLA';
        
        // Debug logging for first few periods
        if (period <= 2 || period >= 12) {
          console.log(`   Period ${period}, Event ${eventIndex}: ${event.contractId} | ${event.type} | Payoff: ${event.payoff} | HQLA: ${hqlaCategory}`);
        }
        
        if (event.payoff > 0) {
          // Positive payoff = inflow (asset)
          switch (hqlaCategory) {
            case 'L1':
              hqla.L1 += event.payoff;
              break;
            case 'L2A':
              hqla.L2A += event.payoff;
              break;
            case 'L2B':
              hqla.L2B += event.payoff;
              break;
            default:
              hqla.NonHQLA += event.payoff;
              break;
          }
        } else {
          // Negative payoff = outflow (liability/stress)
          // For Basel3 LCR, outflows contribute to stress scenarios
          hqla.NonHQLA += Math.abs(event.payoff);
        }
      }
    });
    
    // Apply fallback heuristic ONLY if no events were found for this period
    if (hqla.L1 === 0 && hqla.L2A === 0 && hqla.L2B === 0 && hqla.NonHQLA === 0) {
      // Check if there are any cash flows for this period from the aggregated data
      if (period < temporalData.cashFlows.inflows.length) {
        const totalInflow = temporalData.cashFlows.inflows[period].reduce((sum, val) => sum + val, 0);
        if (totalInflow > 0) {
          // Heuristic distribution
          hqla.L1 = totalInflow * 0.4;   // 40% Level 1
          hqla.L2A = totalInflow * 0.35; // 35% Level 2A
          hqla.L2B = totalInflow * 0.15; // 15% Level 2B
        }
        
        const totalOutflow = temporalData.cashFlows.outflows[period].reduce((sum, val) => sum + val, 0);
        if (totalOutflow > 0) {
          hqla.NonHQLA += totalOutflow;
        }
      }
    }
    
    if (period <= 2 || period >= 12) {
      console.log(`   Period ${period} HQLA Result: L1=${hqla.L1.toFixed(2)}, L2A=${hqla.L2A.toFixed(2)}, L2B=${hqla.L2B.toFixed(2)}, NonHQLA=${hqla.NonHQLA.toFixed(2)}`);
    }
    
    return hqla;
  }
  
  /**
   * Create aggregated metric arrays for backward compatibility
   */
  protected createAggregatedArrays(classifiedData: Basel3HQLA[]): Record<string, number[]> {
    return {
      totalHQLA_L1: classifiedData.map(period => period.L1),
      totalHQLA_L2A: classifiedData.map(period => period.L2A),
      totalHQLA_L2B: classifiedData.map(period => period.L2B),
      totalNonHQLA: classifiedData.map(period => period.NonHQLA),
      
      // Also create cash flow arrays for compatibility
      cashInflows: classifiedData.map(period => period.L1 + period.L2A + period.L2B),
      cashOutflows: classifiedData.map(period => period.NonHQLA)
    };
  }
}

// =================================== Basel3 ZK Program ===================================

export class Basel3ZKProgram extends GenericTemporalRiskZKProgram<Basel3HQLA> {
  periodType = 'period-agnostic'; // Works with any time unit
  
  /**
   * Core risk calculation logic - FIXED NSFR to use cumulative funding
   * Maintains exact same month-by-month cumulative LCR calculation
   * 🔧 CRITICAL FIX: NSFR now calculates cumulative stable funding properly
   */
  riskCalculation(
    data: GenericRiskClassification<Basel3HQLA>,
    thresholds: Record<string, number>
  ): boolean {
    
    console.log('🔐 Executing Basel3 cumulative LCR/NSFR calculation...');
    
    // Same cumulative calculation logic regardless of time period
    let initial_reservenum = 0;
    let cumulativeInflows = initial_reservenum;
    let cumulativeOutflows = 0;
    let cumulativeHQLA = 0;
    let lcrCompliant = true;
    
    // 🔧 NEW: Cumulative stable funding tracking for NSFR
    let cumulativeL1 = 0;
    let cumulativeL2A = 0;
    let cumulativeL2B = 0;
    let cumulativeNonHQLA = 0;
    
    const liquidityThreshold_LCR = thresholds.liquidityThreshold_LCR || 100;
    const liquidityThreshold_NSFR = thresholds.liquidityThreshold_NSFR || 100;
    
    console.log(`📊 Starting cumulative calculation with ${data.periodsCount} periods`);
    console.log(`🎯 LCR Threshold: ${liquidityThreshold_LCR}%`);
    console.log(`🎯 NSFR Threshold: ${liquidityThreshold_NSFR}%`);
    
    // Store calculation details
    const periodLCRDetails = [];
    const nsfrRatios: number[] = [];
    const lcrRatios: number[] = [];
    
    // Period-by-period cumulative calculation
    for (let period = 0; period < data.periodsCount; period++) {
      
      const periodData = data.classifiedData[period];
      
      // Add all HQLA categories as inflows
      const periodInflow = periodData.L1 + periodData.L2A + periodData.L2B;
      const periodOutflow = periodData.NonHQLA;
      
      cumulativeInflows += periodInflow;
      cumulativeOutflows += periodOutflow;
      
      // 🔧 NEW: Update cumulative HQLA tracking for NSFR
      cumulativeL1 += periodData.L1;
      cumulativeL2A += periodData.L2A;
      cumulativeL2B += periodData.L2B;
      cumulativeNonHQLA += periodData.NonHQLA;
      
      // Cumulative cash flow check
      const cumulativeCashFlow = cumulativeInflows - cumulativeOutflows;
      if (cumulativeInflows < cumulativeOutflows) {
        console.log(`❌ Period ${period}: Negative cash flow (${cumulativeCashFlow})`);
      }
      
      // Total HQLA calculation
      const totalHQLA = periodData.L1 + periodData.L2A + periodData.L2B + periodData.NonHQLA;
      cumulativeHQLA += totalHQLA;
      
      // LCR calculation
      let LCR = 0;
      if (cumulativeOutflows > 0) {
        LCR = (cumulativeHQLA / cumulativeOutflows) * 100;
      } else {
        LCR = 100;
      }
      
      lcrRatios.push(LCR);
      
      // 🔧 FIXED NSFR: Proper Basel3 Available Stable Funding (ASF) / Required Stable Funding (RSF)
      // ASF: Funding sources with proper Basel3 haircuts
      const asfL1 = cumulativeL1 * 1.0;     // Level 1 HQLA: 100% ASF factor
      const asfL2A = cumulativeL2A * 0.85;  // Level 2A HQLA: 85% ASF factor
      const asfL2B = cumulativeL2B * 0.5;   // Level 2B HQLA: 50% ASF factor
      const totalASF = asfL1 + asfL2A + asfL2B;
      
      // RSF: Required stable funding based on asset categories
      // For Basel3: Cash/HQLA require less RSF, loans/assets require more
      const rsfHQLA = (cumulativeL1 + cumulativeL2A + cumulativeL2B) * 0.0;  // HQLA: 0% RSF
      const rsfOtherAssets = cumulativeNonHQLA * 0.65; // Other assets: 65% RSF
      const totalRSF = rsfHQLA + rsfOtherAssets;
      
      let NSFR = 100; // Default to 100%
      if (totalRSF > 0) {
        NSFR = (totalASF / totalRSF) * 100;
      } else if (totalASF > 0) {
        // If we have stable funding but no requirements, excellent
        NSFR = 200; // High compliance score
      }
      // If both are 0, keep default 100%
      
      nsfrRatios.push(NSFR);
      
      console.log(`📈 Period ${period}: LCR = ${LCR.toFixed(2)}%, NSFR = ${NSFR.toFixed(2)}%, Cumulative HQLA = ${cumulativeHQLA.toFixed(2)}, Cumulative Outflows = ${cumulativeOutflows.toFixed(2)}`);
      
      // Store details
      periodLCRDetails.push({
        period: period + 1,
        cumulativeInflows: cumulativeInflows.toString(),
        cumulativeOutflows: cumulativeOutflows.toString(),
        cumulativeCashFlow: cumulativeCashFlow.toString(),
        cumulativeHQLA: cumulativeHQLA.toString(),
        LCR: LCR.toString(),
        NSFR: NSFR.toString()
      });
      
      if (LCR < liquidityThreshold_LCR) {
        console.log(`❌ Period ${period}: LCR ${LCR.toFixed(2)}% below threshold ${liquidityThreshold_LCR}%`);
        lcrCompliant = false;
      }
    }
    
    // Check compliance for both LCR and NSFR
    lcrCompliant = lcrRatios.every(ratio => ratio >= liquidityThreshold_LCR);
    const nsfrCompliant = nsfrRatios.every(ratio => ratio >= liquidityThreshold_NSFR);
    
    const averageLCR = lcrRatios.length > 0 ? lcrRatios.reduce((sum, ratio) => sum + ratio, 0) / lcrRatios.length : 100;
    const averageNSFR = nsfrRatios.length > 0 ? nsfrRatios.reduce((sum, ratio) => sum + ratio, 0) / nsfrRatios.length : 100;
    const worstCaseLCR = Math.min(...lcrRatios);
    const worstCaseNSFR = Math.min(...nsfrRatios);
    
    console.log(`\n🔧 CRITICAL BASEL3 COMPLIANCE CHECK:`);
    console.log(`   - LCR Compliant: ${lcrCompliant}`);
    console.log(`   - NSFR Compliant: ${nsfrCompliant}`);
    console.log(`   - Average LCR: ${averageLCR.toFixed(2)}%`);
    console.log(`   - Average NSFR: ${averageNSFR.toFixed(2)}%`);
    console.log(`   - Worst Case LCR: ${worstCaseLCR.toFixed(2)}%`);
    console.log(`   - Worst Case NSFR: ${worstCaseNSFR.toFixed(2)}%`);
    console.log(`   - LCR Ratios: [${lcrRatios.map(r => r.toFixed(2)).join(', ')}]`);
    console.log(`   - NSFR Ratios: [${nsfrRatios.map(r => r.toFixed(2)).join(', ')}]`);
    
    // Check for any periods with NSFR below threshold
    nsfrRatios.forEach((ratio, index) => {
      if (ratio < liquidityThreshold_NSFR) {
        console.log(`   ⚠️ Period ${index}: NSFR ${ratio.toFixed(2)}% < ${liquidityThreshold_NSFR}%`);
      }
    });
    
    // 🔧 CRITICAL FIX: Require BOTH LCR AND NSFR compliance
    const overallCompliant = lcrCompliant && nsfrCompliant;
    console.log(`   - Overall Compliant (LCR && NSFR): ${lcrCompliant} && ${nsfrCompliant} = ${overallCompliant}`);
    
    if (lcrCompliant && !nsfrCompliant) {
      console.log(`   ❌ LCR passed but NSFR failed - Overall: NON-COMPLIANT`);
    }
    
    // 🔧 Display detailed period breakdown
    console.log('\n===== Period LCR/NSFR Calculation Details =====');
    console.log(JSON.stringify(periodLCRDetails, null, 2));
    console.log('==============================================\n');
    
    console.log(`🏁 Final result: ${overallCompliant ? 'COMPLIANT' : 'NON-COMPLIANT'}`);
    return overallCompliant; // 🔧 Return overall compliance, not just LCR
  }
}

// =================================== Compatibility Functions ===================================

/**
 * Convert generic classification back to ACTUSDatao1 for backward compatibility
 * Ensures existing ZK programs can work with new generic data
 */
export function createCompatibleACTUSData(
  genericData: GenericRiskClassification<Basel3HQLA>,
  scenarioParams: {
    scenarioID?: string;
    scenarioName?: string;
    newInvoiceAmount?: number;
    newInvoiceEvaluationMonth?: number;
    liquidityThreshold?: number;
    liquidityThreshold_LCR?: number;
  } = {}
): ACTUSDatao1 {
  
  console.log('🔄 Converting generic data to ACTUSDatao1 compatibility format...');
  
  // ✅ CRITICAL FIX: Match EXACT old system array structure
  // Extract arrays using SAME logic as old system
  const totalHQLA_L1 = genericData.classifiedData.map(month => month.L1);
  const totalHQLA_L2A = genericData.classifiedData.map(month => month.L2A);
  const totalHQLA_L2B = genericData.classifiedData.map(month => month.L2B);
  const totalNonHQLA = genericData.classifiedData.map(month => month.NonHQLA);
  
  // ✅ CRITICAL FIX: Calculate cash flows EXACTLY like old system
  // Old system: cinflow = cashInflow.map(arr => arr.reduce((sum, num) => sum + num, 0))
  const cashInflows = totalHQLA_L1.map((l1, i) => l1 + totalHQLA_L2A[i] + totalHQLA_L2B[i]);
  const cashOutflows = totalNonHQLA.slice(); // Use NonHQLA as outflows
  
  console.log('🔍 Debug cash flow arrays:');
  console.log(`   Cash Inflows: [${cashInflows.slice(0, 5).map(v => v.toFixed(2)).join(', ')}...]`);
  console.log(`   Cash Outflows: [${cashOutflows.slice(0, 5).map(v => v.toFixed(2)).join(', ')}...]`);
  console.log(`   Total HQLA L1: [${totalHQLA_L1.slice(0, 5).map(v => v.toFixed(2)).join(', ')}...]`);
  console.log(`   Total HQLA L2A: [${totalHQLA_L2A.slice(0, 5).map(v => v.toFixed(2)).join(', ')}...]`);
  console.log(`   Total HQLA L2B: [${totalHQLA_L2B.slice(0, 5).map(v => v.toFixed(2)).join(', ')}...]`);
  console.log(`   Total NonHQLA: [${totalNonHQLA.slice(0, 5).map(v => v.toFixed(2)).join(', ')}...]`);
  
  // ✅ EXACT same ACTUSDatao1 structure as original test
  const compatibleData = new ACTUSDatao1({
    scenarioID: CircuitString.fromString(scenarioParams.scenarioID || 'Financier 10001'),
    scenarioName: CircuitString.fromString(scenarioParams.scenarioName || 'Financier 1 - CashFlows RiskFree'),
    scenarioName_str: "scenario_1",
    riskEvaluated: Field(1),
    
    // ✅ CRITICAL FIX: Use .flat() EXACTLY like old system
    cashInflows: [cashInflows].flat(),  // Flatten to match expected format
    cashOutflows: [cashOutflows].flat(), // Flatten to match expected format
    inflowLength: [cashInflows].flat().length,
    outflowLength: [cashOutflows].flat().length,
    
    // SAME parameters
    newInvoiceAmount: scenarioParams.newInvoiceAmount || 5000,
    newInvoiceEvaluationMonth: scenarioParams.newInvoiceEvaluationMonth || 11,
    liquidityThreshold: scenarioParams.liquidityThreshold || 10,
    liquidityThreshold_LCR: scenarioParams.liquidityThreshold_LCR || 100,
    
    // ✅ CRITICAL FIX: Empty classified contracts like old system
    classifiedContracts: [],
    
    // ✅ EXACT same HQLA arrays as old system
    totalHQLA_L1: totalHQLA_L1,
    totalHQLA_L2A: totalHQLA_L2A,
    totalHQLA_L2B: totalHQLA_L2B,
    totalNonHQLA: totalNonHQLA,
  });
  
  console.log(`✅ Created compatible ACTUSDatao1 with ${genericData.periodsCount} periods`);
  console.log(`   - Flattened cash inflows length: ${[cashInflows].flat().length}`);
  console.log(`   - Flattened cash outflows length: ${[cashOutflows].flat().length}`);
  
  return compatibleData;
}

/**
 * Convert processed ACTUS data to generic temporal format
 * Bridge between existing data processor and new generic framework
 * PRESERVES CONTRACT HQLA CLASSIFICATIONS for proper Basel3 processing
 */
export function convertACTUSToGenericTemporal(
  inflows: number[][],
  outflows: number[][],
  monthsCount: number,
  rawEvents: any[],
  contractDetails: any[]
): TemporalACTUSData {
  
  console.log('🌉 Converting processed ACTUS data to generic temporal format...');
  
  // ✅ CRITICAL FIX: Use contractDetails HQLA classifications if available, otherwise fall back to hardcoded
  let contractsWithHQLA: any[];
  
  // Check if contractDetails already contain HQLA categories (from config file)
  const hasHQLAInDetails = contractDetails && contractDetails.length > 0 && 
    contractDetails.some(detail => detail && detail.hqlaCategory);
  
  if (hasHQLAInDetails) {
    console.log(`📋 Using HQLA categories from config file (${contractDetails.length} contracts)`);
    contractsWithHQLA = contractDetails;
    
    // DEBUG: Show config file HQLA mapping
    contractsWithHQLA.forEach((contract, index) => {
      if (contract && contract.hqlaCategory) {
        console.log(`   Config Contract: ${contract.contractID || `contract_${index}`} → ${contract.hqlaCategory}`);
      }
    });
  } else {
    console.log(`📋 No HQLA categories in contractDetails, using hardcoded Basel3 contracts`);
    contractsWithHQLA = getBasel3ContractPortfolio();
    
    // DEBUG: Show hardcoded Basel3 mapping
    contractsWithHQLA.forEach(contract => {
      console.log(`   Basel3 Contract: ${contract.contractID} → ${contract.hqlaCategory}`);
    });
  }
  
  // ✅ CRITICAL DEBUG: Show raw events structure
  console.log(`📋 Raw events received: ${rawEvents.length} contracts`);
  rawEvents.forEach((eventContract, index) => {
    console.log(`   Raw Event Contract ${index}: ${eventContract.contractId} with ${eventContract.events?.length || 0} events`);
  });
  
  // Enhance raw events with HQLA classifications from config or Basel3 contracts
  const enhancedRawEvents = rawEvents.map((eventContract, index) => {
    // Find matching contract by contractId
    const matchingContract = contractsWithHQLA.find(contract => 
      contract.contractID === eventContract.contractId
    );
    
    console.log(`   Matching ${eventContract.contractId} with contract: ${matchingContract ? matchingContract.hqlaCategory : 'NOT FOUND'}`);
    
    return {
      ...eventContract,
      hqlaCategory: matchingContract?.hqlaCategory || 'NonHQLA'
    };
  });
  
  // Also enhance contract details
  const enhancedContractDetails = contractDetails || [];
  enhancedRawEvents.forEach((contract, index) => {
    if (!enhancedContractDetails[index]) {
      enhancedContractDetails[index] = {};
    }
    enhancedContractDetails[index].hqlaCategory = contract.hqlaCategory;
  });
  
  console.log(`📋 Enhanced contract details: ${enhancedContractDetails.length} contracts with HQLA info`);
  enhancedContractDetails.forEach((detail, i) => {
    if (detail && detail.hqlaCategory) {
      console.log(`   - Contract ${i}: ${detail.hqlaCategory}`);
    }
  });
  
  const temporalData = convertToGenericFormat(
    monthsCount,
    'monthly',
    inflows,
    outflows,
    enhancedRawEvents,  // ✅ Use enhanced events with HQLA classifications
    enhancedContractDetails
  );
  
  console.log(`✅ Converted to generic format: ${temporalData.periodsCount} monthly periods`);
  return temporalData;
}

/**
 * Process Basel3 data through generic framework while maintaining compatibility
 * This is the main entry point for Basel3 processing
 */
export async function processBasel3ThroughGenericFramework(
  inflows: number[][],
  outflows: number[][],
  monthsCount: number,
  rawEvents: any[],
  contractDetails: any[],
  thresholds: {
    liquidityThreshold_LCR: number;
    liquidityThreshold_NSFR?: number; // 🔧 Add NSFR threshold
    liquidityThreshold?: number;
    newInvoiceAmount?: number;
    newInvoiceEvaluationMonth?: number;
  }
): Promise<{
  temporalData: TemporalACTUSData;
  classification: GenericRiskClassification<Basel3HQLA>;
  compatibleData: ACTUSDatao1;
  compliance: boolean;
}> {
  
  console.log('🚀 Processing Basel3 data through generic framework...');
  
  // Step 1: Convert to generic temporal format
  const temporalData = convertACTUSToGenericTemporal(
    inflows, outflows, monthsCount, rawEvents, contractDetails
  );
  
  // Step 2: Process through Basel3 processor
  const processor = new Basel3Processor();
  const classification = processor.processRiskData(temporalData);
  
  // Step 3: Create backward-compatible data structure
  const compatibleData = createCompatibleACTUSData(classification, {
    liquidityThreshold_LCR: thresholds.liquidityThreshold_LCR,
    liquidityThreshold: thresholds.liquidityThreshold,
    newInvoiceAmount: thresholds.newInvoiceAmount,
    newInvoiceEvaluationMonth: thresholds.newInvoiceEvaluationMonth
  });
  
  // Step 4: Calculate compliance using generic ZK program logic
  // 🔧 CRITICAL FIX: Pass BOTH LCR and NSFR thresholds
  const zkProgram = new Basel3ZKProgram();
  const compliance = zkProgram.riskCalculation(classification, {
    liquidityThreshold_LCR: thresholds.liquidityThreshold_LCR,
    liquidityThreshold_NSFR: thresholds.liquidityThreshold_NSFR || 100 // 🔧 Add NSFR threshold
  });
  
  console.log('✅ Basel3 processing complete through generic framework');
  
  return {
    temporalData,
    classification,
    compatibleData,
    compliance
  };
}
