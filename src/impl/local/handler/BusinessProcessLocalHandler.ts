/**
 * BusinessProcessLocalHandler.ts - LOCAL-only Business Process Verification
 * UPDATED: Uses BusinessProcessVerificationBase.ts
 */

import * as dotenv from 'dotenv';
dotenv.config();

// === COMPOSITION: Use base classes ===
import { BaseVerificationCore } from '../../verification-base/BaseVerificationCore.js';
import { BusinessProcessVerificationBase } from '../../verification-base/BusinessProcessVerificationBase.js';

// === O1JS IMPORTS ===
import { 
  Field, 
  Mina, 
  PrivateKey, 
  AccountUpdate, 
  CircuitString, 
  Poseidon, 
  Signature, 
  Bool, 
  UInt64 
} from 'o1js';

// === ZK PROGRAM AND CONTRACT IMPORTS ===
import { 
  BPMNGeneric,
  BusinessProcessIntegrityOptimMerkleData,
  BusinessProcessIntegrityOptimMerkleProof
} from '../../../zk-programs/process/BPMNGenericZKProgram.js';

// === INFRASTRUCTURE IMPORTS ===
import { getPrivateKeyFor, getPublicKeyFor } from '../../../core/OracleRegistry.js';

// === UTILITY IMPORTS ===
import { BusinessProcessIntegrityOptimMerkleTestUtils } from '../../verification-test/BusinessProcessIntegrityVerificationFileTestUtils.js';

// === TYPES ===
interface ZKVerificationResult {
  success: boolean;
  zkRegexResult?: boolean;
  merkleRoot?: string;
  processHash?: string;
  oracleVerified?: boolean;
  merkleVerified?: boolean;
  proof?: any;
  error?: string;
}

export class BusinessProcessLocalHandler {
  // === COMPOSITION: Use utility classes ===
  private baseCore: BaseVerificationCore;
  private businessProcessBase: BusinessProcessVerificationBase;

  constructor() {
    this.baseCore = new BaseVerificationCore();
    this.businessProcessBase = new BusinessProcessVerificationBase();
  }

  /**
   * Main LOCAL business process verification
   * UPDATED: Uses BusinessProcessVerificationBase
   */
  public async verifyBusinessProcess(
    bpmngroupid : CircuitString,
    businessProcessType: string,
    expectedBPMNFile: string,
    actualBPMNFile: string
  ): Promise<any> {
    console.log(`\n🚀 Business Process LOCAL Verification Started`);
    console.log(`📋 Process Type: ${businessProcessType}`);
    console.log(`📂 Expected BPMN: ${expectedBPMNFile}`);
    console.log(`📂 Actual BPMN: ${actualBPMNFile}`);

    try {
      // === LOCAL BLOCKCHAIN SETUP ===
      console.log('\n🔧 Setting up local blockchain...');
      const { Local } = await import('../../../core/OracleRegistry.js');
      const localBlockchain = await Local;
      Mina.setActiveInstance(localBlockchain);
      
      console.log('✅ Local blockchain initialized');
      
      // === BPMN PARSING (using BusinessProcessVerificationBase) ===
      console.log('\n📋 Processing BPMN files...');
      const { expectedPath, actualPath } = await this.businessProcessBase.parseBPMNFiles(
        expectedBPMNFile, 
        actualBPMNFile
      );
      
      // === PROCESS ANALYSIS (using BusinessProcessVerificationBase) ===
      const processAnalysis = this.businessProcessBase.analyzeProcessPaths(
        expectedPath, 
        actualPath, 
        businessProcessType
      );
      
      // === CREATE PROCESS DATA (using BusinessProcessVerificationBase) ===
      const currentTimestamp = UInt64.from(Date.now());
      const processData = this.businessProcessBase.createProcessData(
        0, // Process ID
        businessProcessType,
        expectedPath,
        actualPath,
        currentTimestamp
      );
      
      // === LOG PRE-VERIFICATION RESULTS ===
      this.businessProcessBase.logProcessVerificationResults(
        processAnalysis, 
        processData, 
        'Pre-Verification'
      );
      
      // === ZK PROOF GENERATION (using existing utils for compatibility) ===
      console.log('\n⚙️ Generating ZK proof using existing OptimMerkle utils...');
      
      const result: ZKVerificationResult = await BusinessProcessIntegrityOptimMerkleTestUtils.runOptimMerkleVerification(
        bpmngroupid,
        businessProcessType, 
        expectedPath, 
        actualPath,
        {
          expectedFile: expectedBPMNFile,
          actualFile: actualBPMNFile
        }
      );
      
      // === CRITICAL: UPDATE VERIFICATION RESULT BASED ON ZK CIRCUIT ONLY ===
      const zkCircuitResult: boolean = result.zkRegexResult ?? false; // This comes from the ZK circuit
      
      // UPDATE VERIFICATION RESULT BASED ON ZK CIRCUIT ONLY
      processAnalysis.verificationResult = zkCircuitResult;
      processAnalysis.pathsMatch = zkCircuitResult;
      
      // Log the final authority
      console.log(`\n🎯 FINAL VERIFICATION AUTHORITY: ZK CIRCUIT`);
      console.log(`⚡ ZK Circuit Result: ${zkCircuitResult ? '✅ PASS' : '❌ FAIL'}`);
      console.log(`📋 Pattern Check was: ${processAnalysis.pathsMatch ? 'MATCH' : 'NO MATCH'} (Info Only)`);
      console.log(`🏆 Final Decision: ${zkCircuitResult ? '✅ PASSED' : '❌ FAILED'}`);
      
      // === LOG POST-VERIFICATION RESULTS ===
      this.businessProcessBase.logProcessVerificationResults(
        processAnalysis, 
        processData, 
        'Post-Verification'
      );
      
      return {
        businessProcessType,
        expectedPath,
        actualPath,
        processAnalysis,
        processData,
        proof: result,
        verificationResult: zkCircuitResult, // ZK CIRCUIT RESULT ONLY
        timestamp: currentTimestamp.toString(),
        environment: 'LOCAL'
      };
      
    } catch (error) {
      console.error('❌ Error in LOCAL Business Process Verification:', error);
      throw error;
    }
  }

  /**
   * NEW METHOD: Multi-process LOCAL verification
   * ENHANCED: Support for multiple process pairs
   */
  public async verifyMultipleBusinessProcesses(
    processFilePairs: Array<{
      groupID: CircuitString,
      processType: string,
      expectedBPMNFile: string,
      actualBPMNFile: string
    }>
  ): Promise<any> {
    console.log(`\n🚀 Multi-Process LOCAL Verification Started`);
    console.log(`📊 Total Processes: ${processFilePairs.length}`);

    try {
      // === LOCAL BLOCKCHAIN SETUP ===
      console.log('\n🔧 Setting up local blockchain...');
      const { Local } = await import('../../../core/OracleRegistry.js');
      const localBlockchain = await Local;
      Mina.setActiveInstance(localBlockchain);
      
      // === PARSE MULTIPLE BPMN FILES ===
      const bpmnData = processFilePairs.map(pair => ({
        expected: pair.expectedBPMNFile,
        actual: pair.actualBPMNFile,
        processType: pair.processType
      }));
      
      const parsedData = await this.businessProcessBase.parseMultipleBPMNFiles(bpmnData);
      
      // === ANALYZE MULTIPLE PROCESSES ===
      const { individualAnalyses, summary } = this.businessProcessBase.analyzeMultipleProcesses(parsedData);
      
      // === CREATE MULTIPLE PROCESS DATA ===
      const currentTimestamp = UInt64.from(Date.now());
      const processDataArray = this.businessProcessBase.createMultipleProcessData(individualAnalyses, currentTimestamp);
      
      // === LOG MULTI-PROCESS RESULTS ===
      this.businessProcessBase.logMultiProcessVerificationResults(
        individualAnalyses,
        processDataArray,
        summary,
        'Pre-Verification'
      );
      
      // === ZK PROOF GENERATION FOR MULTIPLE PROCESSES ===
      console.log('\n⚙️ Generating ZK proofs for multiple processes...');
      
      const proofs = [];
      let successfulProofs = 0;
      
      for (let i = 0; i < processFilePairs.length; i++) {
        const pair = processFilePairs[i];
        const analysis = individualAnalyses[i];
        
        console.log(`📝 Generating proof ${i + 1}/${processFilePairs.length} for ${pair.processType}...`);
        
        try {
          // ALWAYS GENERATE ZK PROOF - Let ZK circuit be the authority
          const result: ZKVerificationResult = await BusinessProcessIntegrityOptimMerkleTestUtils.runOptimMerkleVerification(
            pair.groupID,
            pair.processType, 
            analysis.expectedPattern, 
            analysis.actualPath,
            {
              expectedFile: pair.expectedBPMNFile,
              actualFile: pair.actualBPMNFile
            }
          );
          
          // UPDATE ANALYSIS WITH ZK CIRCUIT RESULT
          const zkCircuitResult: boolean = result.zkRegexResult ?? false;
          analysis.verificationResult = zkCircuitResult;
          analysis.pathsMatch = zkCircuitResult;
          
          proofs.push(result);
          if (result.success && zkCircuitResult) {
            successfulProofs++;
          }
          
          console.log(`✅ Proof ${i + 1} generated - ZK Result: ${zkCircuitResult ? 'PASS' : 'FAIL'}`);
        } catch (error) {
          console.error(`❌ Failed to generate proof for ${pair.processType}:`, error);
          proofs.push({ success: false, error: error instanceof Error ? error.message : String(error) });
        }
      }
      
      // === FINAL MULTI-PROCESS RESULTS ===
      this.businessProcessBase.logMultiProcessVerificationResults(
        individualAnalyses,
        processDataArray,
        summary,
        'Post-Verification'
      );
      
      const finalSuccessRate = Math.round((successfulProofs / processFilePairs.length) * 100);
      const overallSuccess = successfulProofs === processFilePairs.length;
      
      console.log(`\n🏆 FINAL MULTI-PROCESS LOCAL VERIFICATION RESULTS:`);
      console.log(`📊 Proof Generation Success Rate: ${finalSuccessRate}%`);
      console.log(`🎯 Overall Result: ${overallSuccess ? '✅ ALL PASSED' : '❌ SOME FAILED'}`);
      
      return {
        totalProcesses: summary.totalProcesses,
        successfulVerifications: summary.successfulVerifications,
        verificationPercentage: summary.verificationPercentage,
        proofSuccessRate: finalSuccessRate,
        overallResult: overallSuccess,
        individualResults: individualAnalyses,
        processData: processDataArray,
        proofs,
        timestamp: currentTimestamp.toString(),
        environment: 'LOCAL'
      };
      
    } catch (error) {
      console.error('❌ Error in Multi-Process LOCAL Verification:', error);
      throw error;
    }
  }
}

// === BACKWARD COMPATIBILITY EXPORTS ===
export async function getBusinessProcessLocalVerifier(
  bpmngroupid : CircuitString,
  businessProcessType: string,
  expectedBPMNFile: string,
  actualBPMNFile: string
): Promise<any> {
  const handler = new BusinessProcessLocalHandler();
  return await handler.verifyBusinessProcess(bpmngroupid,businessProcessType, expectedBPMNFile, actualBPMNFile);
}

// === NEW MULTI-PROCESS EXPORT ===
export async function getBusinessProcessLocalMultiVerifier(
  processFilePairs: Array<{
    groupID: CircuitString,
    processType: string,
    expectedBPMNFile: string,
    actualBPMNFile: string
  }>
): Promise<any> {
  const handler = new BusinessProcessLocalHandler();
  return await handler.verifyMultipleBusinessProcesses(processFilePairs);
}
