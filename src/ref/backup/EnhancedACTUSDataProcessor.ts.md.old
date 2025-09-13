/**
 * ====================================================================
 * Enhanced ACTUS Data Processor with Generic Framework Integration
 * ====================================================================
 * Extends existing ACTUSDataProcessor with generic temporal framework
 * Maintains 100% backward compatibility with existing code
 * Adds generic period-agnostic processing capabilities
 * ====================================================================
 */

import { 
  processRawACTUSData, 
  convertToOptimMerkleFormat, 
  printCoreACTUSResponse,
  callACTUSAPIWithPostProcessing 
} from './ACTUSDataProcessor.js';
import { 
  TemporalACTUSData,
  GenericRiskClassification,
  Basel3HQLA,
  convertToGenericFormat,
  extractDateRangeFromEvents,
  determinePeriodType
} from './GenericTemporalRiskFramework.js';
import { 
  processBasel3ThroughGenericFramework,
  convertACTUSToGenericTemporal
} from './Basel3Implementation.js';
import { ACTUSOptimMerkleAPIResponse } from './ACTUSOptimMerkleAPI.js';

// =================================== Enhanced Processing Functions ===================================

/**
 * Enhanced ACTUS API call with generic framework support
 * Maintains full backward compatibility while adding generic capabilities
 */
export async function callACTUSAPIWithGenericProcessing(
  url: string,
  contracts: any[],
  options: {
    periodType?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
    riskFramework?: 'basel3' | 'solvency2' | 'ifrs9' | 'custom';
    enableGenericFramework?: boolean;
    riskFactors?: any[];
  } = {}
): Promise<{
  // Backward compatibility - same as original
  optimMerkleResponse: ACTUSOptimMerkleAPIResponse;
  
  // Enhanced capabilities
  temporalData?: TemporalACTUSData;
  genericClassification?: GenericRiskClassification<any>;
  frameworkResults?: any;
}> {
  
  console.log('🚀 Enhanced ACTUS API call with generic framework support...');
  console.log(`🎯 Framework: ${options.riskFramework || 'default'}`);
  console.log(`📅 Period Type: ${options.periodType || 'auto-detect'}`);
  
  // Step 1: Call existing ACTUS API processor (maintains compatibility)
  const optimMerkleResponse = await callACTUSAPIWithPostProcessing(
    url, 
    contracts, 
    options.riskFactors || []
  );
  
  console.log(`✅ Basic processing complete: ${optimMerkleResponse.periodsCount} periods`);
  
  // If generic framework is not enabled, return basic results
  if (!options.enableGenericFramework) {
    console.log('📤 Returning basic results (generic framework disabled)');
    return { optimMerkleResponse };
  }
  
  console.log('🧬 Enabling generic framework processing...');
  
  // Step 2: Convert to generic temporal format
  const temporalData = convertACTUSToGenericTemporal(
    optimMerkleResponse.inflow,
    optimMerkleResponse.outflow,
    optimMerkleResponse.periodsCount,
    contracts, // Use original contracts as raw events
    optimMerkleResponse.contractDetails
  );
  
  // Step 3: Apply risk framework-specific processing
  let genericClassification: GenericRiskClassification<any> | undefined;
  let frameworkResults: any;
  
  switch (options.riskFramework) {
    case 'basel3':
      frameworkResults = await processBasel3ThroughGenericFramework(
        optimMerkleResponse.inflow,
        optimMerkleResponse.outflow,
        optimMerkleResponse.periodsCount,
        contracts,
        optimMerkleResponse.contractDetails,
        {
          liquidityThreshold_LCR: 100, // Default Basel3 threshold
          liquidityThreshold: 10,
          newInvoiceAmount: 5000,
          newInvoiceEvaluationMonth: 11
        }
      );
      genericClassification = frameworkResults.classification;
      console.log(`🏦 Basel3 processing complete: ${frameworkResults.compliance ? 'COMPLIANT' : 'NON-COMPLIANT'}`);
      break;
      
    case 'solvency2':
      console.log('🏛️ Solvency II framework (placeholder for future implementation)');
      // TODO: Implement Solvency II processor
      break;
      
    case 'ifrs9':
      console.log('📊 IFRS9 framework (placeholder for future implementation)');
      // TODO: Implement IFRS9 processor
      break;
      
    default:
      console.log('🔧 Using default generic processing');
      // Basic generic processing without specific risk framework
      break;
  }
  
  console.log('✅ Enhanced processing complete');
  
  return {
    optimMerkleResponse,
    temporalData,
    genericClassification,
    frameworkResults
  };
}

/**
 * Auto-detect optimal period type from ACTUS data
 * Helps choose between daily, monthly, quarterly processing
 */
export function autoDetectPeriodType(
  rawACTUSResponse: any[],
  inflows: number[][],
  outflows: number[][]
): {
  recommendedPeriodType: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  reasoning: string;
  confidence: number;
} {
  
  console.log('🔍 Auto-detecting optimal period type...');
  
  // Extract date range from raw events
  const dateRange = extractDateRangeFromEvents(rawACTUSResponse);
  const { periodType, expectedPeriods } = determinePeriodType(dateRange);
  
  // Analyze data characteristics
  const actualPeriods = inflows.length;
  const periodMatch = Math.abs(expectedPeriods - actualPeriods) / expectedPeriods;
  
  // Calculate confidence based on how well the detected period matches actual data
  const confidence = Math.max(0, 1 - periodMatch);
  
  let reasoning = `Date range: ${dateRange.start.toISOString().split('T')[0]} to ${dateRange.end.toISOString().split('T')[0]}. `;
  reasoning += `Expected ${expectedPeriods} ${periodType} periods, found ${actualPeriods} actual periods. `;
  reasoning += `Match confidence: ${(confidence * 100).toFixed(1)}%`;
  
  console.log(`📊 Detected period type: ${periodType} (confidence: ${(confidence * 100).toFixed(1)}%)`);
  
  return {
    recommendedPeriodType: periodType,
    reasoning,
    confidence
  };
}

/**
 * Process ACTUS data with automatic framework detection
 * Analyzes data patterns to recommend optimal risk framework
 */
export async function processACTUSWithAutoFramework(
  url: string,
  contracts: any[],
  options: {
    autoDetectPeriod?: boolean;
    autoDetectFramework?: boolean;
    fallbackFramework?: 'basel3' | 'solvency2' | 'ifrs9';
  } = {}
): Promise<{
  results: any;
  recommendations: {
    periodType: string;
    framework: string;
    reasoning: string;
  };
}> {
  
  console.log('🤖 Auto-processing ACTUS data with framework detection...');
  
  // Step 1: Basic ACTUS processing to analyze data
  const basicResults = await callACTUSAPIWithPostProcessing(url, contracts);
  
  let recommendedPeriodType: string = 'monthly';
  let recommendedFramework: string = options.fallbackFramework || 'basel3';
  let reasoning: string = 'Using default settings';
  
  // Step 2: Auto-detect period type if requested
  if (options.autoDetectPeriod) {
    const detection = autoDetectPeriodType(
      contracts,
      basicResults.inflow,
      basicResults.outflow
    );
    recommendedPeriodType = detection.recommendedPeriodType;
    reasoning = detection.reasoning;
  }
  
  // Step 3: Auto-detect framework if requested
  if (options.autoDetectFramework) {
    // Analyze contract types and patterns to recommend framework
    const frameworkDetection = detectOptimalRiskFramework(contracts, basicResults);
    recommendedFramework = frameworkDetection.framework;
    reasoning += ` Framework: ${frameworkDetection.reasoning}`;
  }
  
  console.log(`🎯 Recommendations: ${recommendedFramework} framework with ${recommendedPeriodType} periods`);
  
  // Step 4: Process with recommended settings
  const enhancedResults = await callACTUSAPIWithGenericProcessing(url, contracts, {
    periodType: recommendedPeriodType as any,
    riskFramework: recommendedFramework as any,
    enableGenericFramework: true
  });
  
  return {
    results: enhancedResults,
    recommendations: {
      periodType: recommendedPeriodType,
      framework: recommendedFramework,
      reasoning
    }
  };
}

/**
 * Detect optimal risk framework based on contract characteristics
 */
function detectOptimalRiskFramework(
  contracts: any[],
  basicResults: ACTUSOptimMerkleAPIResponse
): {
  framework: 'basel3' | 'solvency2' | 'ifrs9';
  reasoning: string;
  confidence: number;
} {
  
  // Analyze contract types
  const contractTypes = contracts.map(c => c.contractType);
  const hasLoans = contractTypes.includes('ANN');
  const hasBonds = contractTypes.includes('PAM');
  const hasEquities = contractTypes.includes('STK');
  
  // Basel3 indicators: focus on liquidity and capital adequacy
  const basel3Score = (hasLoans ? 0.3 : 0) + (hasBonds ? 0.4 : 0) + (hasEquities ? 0.3 : 0);
  
  // Solvency II indicators: focus on insurance and long-term liabilities
  const solvency2Score = hasEquities ? 0.6 : 0.2;
  
  // IFRS9 indicators: focus on credit loss and impairment
  const ifrs9Score = hasLoans ? 0.7 : 0.3;
  
  // Determine best framework
  const scores = {
    basel3: basel3Score,
    solvency2: solvency2Score,
    ifrs9: ifrs9Score
  };
  
  const bestFramework = Object.entries(scores).reduce((a, b) => 
    scores[a[0] as keyof typeof scores] > scores[b[0] as keyof typeof scores] ? a : b
  )[0] as 'basel3' | 'solvency2' | 'ifrs9';
  
  const confidence = scores[bestFramework];
  
  let reasoning = `Contract analysis: ${contractTypes.length} contracts (${contractTypes.join(', ')}). `;
  reasoning += `${bestFramework.toUpperCase()} scored highest (${(confidence * 100).toFixed(1)}%) based on contract mix.`;
  
  return {
    framework: bestFramework,
    reasoning,
    confidence
  };
}

// =================================== Backward Compatibility Exports ===================================

// Re-export all existing functions for backward compatibility
export {
  processRawACTUSData,
  convertToOptimMerkleFormat,
  printCoreACTUSResponse,
  callACTUSAPIWithPostProcessing
} from './ACTUSDataProcessor.js';

// Export new generic framework functions
export {
  convertToGenericFormat,
  extractDateRangeFromEvents,
  determinePeriodType
} from './GenericTemporalRiskFramework.js';

// Export Basel3 implementation functions
export {
  processBasel3ThroughGenericFramework,
  convertACTUSToGenericTemporal,
  createCompatibleACTUSData
} from './Basel3Implementation.js';
