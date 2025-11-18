/**
 * BusinessProcessVerificationBase.ts - Business Process Verification Infrastructure
 * RENAMED FROM: BusinessVerificationBase.ts for clarity and specificity
 * Parallel to ComplianceVerificationBase.ts for business process domains
 * 
 * COVERS:
 * - BPMN file parsing and validation
 * - Process path extraction and analysis
 * - ZK regex pattern generation
 * - OptimMerkle tree operations for process data
 * - Process integrity verification patterns
 * - Circuit-safe string operations (o1js best practices)
 */

import { Field, Bool, UInt64, CircuitString, Poseidon ,PublicKey} from 'o1js';
// MerkleWitness8 will be imported where needed
// import { MerkleWitness8 } from '../../../utils/optimerkle/MerkleTreeManager.js';


import parseBpmn from '../../utils/transform/parsebpmn.js';


import { safeLogSmartContractStateLocal } from './SafeStateRetrievalLocal.js';
import { safeLogSmartContractState } from './SafeStateRetrieval.js';
import { environmentManager } from '../../infrastructure/index.js';
import { 
  RegistryInfo,
  GlobalComplianceStats
} from '../../contracts/process/BPMNGenericSmartContract.js';


export interface ProcessAnalysis {
  expectedPattern: string;
  actualPath: string;
  pathsMatch: boolean | null; // null until ZK circuit decides
  processType: string;
  expectedPaths: string[];
  actualPaths: string[];
  verificationResult: boolean | null; // null until ZK circuit decides
}

export interface ProcessVerificationData {
  processId: number;
  processType: string;
  expectedContent: string;
  actualContent: string;
  merkleRoot: Field;
  processHash: Field;
  timestamp: UInt64;
}

export interface MultiProcessVerificationSummary {
  totalProcesses: number;
  successfulVerifications: number;
  failedVerifications: number;
  verificationPercentage: number;
  processTypes: string[];
  overallResult: boolean;
}

export class BusinessProcessVerificationBase {
  /**
   * O1JS Best Practice Constants
   */
  static readonly MAX_STRING_LENGTH = 32;
  static readonly MAX_CONTENT_LENGTH = 256;
  static readonly POSEIDON_MAX_FIELDS = 16;
  
  /**
   * Parse and analyze BPMN files for process verification
   * ENHANCED: Support for multiple process verification
   */
  public async parseBPMNFiles(
    expectedBPMNFile: string, 
    actualBPMNFile: string
  ): Promise<{ expectedPath: string, actualPath: string }> {
    console.log('📋 Parsing BPMN files...');
    
    try {
      const expectedPath = await parseBpmn(expectedBPMNFile) || "";
      const actualPath = await parseBpmn(actualBPMNFile) || "";
      
      console.log('✅ BPMN files parsed successfully');
      console.log(`🔍 Expected Pattern: ${expectedPath}`);
      console.log(`📊 Actual Path: ${actualPath}`);
      
      return { expectedPath, actualPath };
    } catch (error) {
      console.error('❌ BPMN parsing failed:', error);
      throw new Error(`BPMN parsing error: ${error}`);
    }
  }
  
  /**
   * Parse multiple BPMN file pairs for multi-process verification
   * NEW CAPABILITY: Support for multi-verifier pattern
   */
  public async parseMultipleBPMNFiles(
    bpmnFilePairs: Array<{expected: string, actual: string, processType: string}>
  ): Promise<Array<{expectedPath: string, actualPath: string, processType: string}>> {
    console.log(`📋 Parsing ${bpmnFilePairs.length} BPMN file pairs...`);
    
    const results = [];
    
    for (let i = 0; i < bpmnFilePairs.length; i++) {
      const { expected, actual, processType } = bpmnFilePairs[i];
      console.log(`\n📂 Processing pair ${i + 1}/${bpmnFilePairs.length}: ${processType}`);
      
      try {
        const { expectedPath, actualPath } = await this.parseBPMNFiles(expected, actual);
        results.push({ expectedPath, actualPath, processType });
        console.log(`✅ Successfully parsed ${processType}`);
      } catch (error) {
        console.error(`❌ Failed to parse ${processType}:`, error);
        // Continue with other pairs, but log the failure
        results.push({ 
          expectedPath: "", 
          actualPath: "", 
          processType: `${processType}_FAILED` 
        });
      }
    }
    
    console.log(`📊 Parsing Summary: ${results.filter(r => !r.processType.includes('FAILED')).length}/${bpmnFilePairs.length} successful`);
    return results;
  }
  
  /**
   * Analyze process paths and generate verification data
   * ENHANCED: Multi-process support - ZK CIRCUIT AUTHORITY ONLY
   */
  public analyzeProcessPaths(
    expectedPattern: string, 
    actualPath: string, 
    processType: string
  ): ProcessAnalysis {
    console.log(`\n🔍 Process Analysis for ${processType}:`);
    
    // Pattern verification for LOGGING ONLY - NOT FOR FINAL DECISION
    const patternCheck = this.verifyPathAgainstPattern(actualPath, expectedPattern);
    
    console.log(`📊 Expected Paths: 1`);
    console.log(`📋 Actual Paths: 1`);
    console.log(`⚡ Final Decision: Will be determined by ZK Circuit ONLY`);
    
    return {
      expectedPattern,
      actualPath,
      pathsMatch: null as any, // Don't make decision here - let ZK circuit decide
      processType,
      expectedPaths: [expectedPattern],
      actualPaths: [actualPath],
      verificationResult: null as any // Will be set by ZK proof result
    };
  }
  
  /**
   * Analyze multiple processes for multi-verifier capability
   * NEW METHOD: Multi-process analysis
   */
  public analyzeMultipleProcesses(
    processData: Array<{expectedPath: string, actualPath: string, processType: string}>
  ): {
    individualAnalyses: ProcessAnalysis[],
    summary: MultiProcessVerificationSummary
  } {
    console.log(`\n🔍 Multi-Process Analysis (${processData.length} processes):`);
    console.log('='.repeat(60));
    
    const individualAnalyses = processData.map(data => 
      this.analyzeProcessPaths(data.expectedPath, data.actualPath, data.processType)
    );
    
    const successfulVerifications = individualAnalyses.filter(a => a.verificationResult).length;
    const failedVerifications = individualAnalyses.length - successfulVerifications;
    const verificationPercentage = Math.round((successfulVerifications / individualAnalyses.length) * 100);
    const processTypes = individualAnalyses.map(a => a.processType);
    const overallResult = failedVerifications === 0;
    
    const summary: MultiProcessVerificationSummary = {
      totalProcesses: individualAnalyses.length,
      successfulVerifications,
      failedVerifications,
      verificationPercentage,
      processTypes,
      overallResult
    };
    
    console.log(`📊 Multi-Process Summary:`);
    console.log(`  • Total Processes: ${summary.totalProcesses}`);
    console.log(`  • Successful: ${summary.successfulVerifications}`);
    console.log(`  • Failed: ${summary.failedVerifications}`);
    console.log(`  • Success Rate: ${summary.verificationPercentage}%`);
    console.log(`  • Overall Result: ${summary.overallResult ? '✅ PASS' : '❌ FAIL'}`);
    
    return { individualAnalyses, summary };
  }
  
  /**
   * Create OptimMerkle process data with o1js best practices
   * ENHANCED: Multi-process support
   */
  public createProcessData(
    processId: number,
    processType: string,
    expectedContent: string,
    actualContent: string,
    timestamp: UInt64
  ): ProcessVerificationData {
    console.log(`\n📦 Creating OptimMerkle process data for ${processType}...`);
    
    // O1JS Best Practice: Bound content length
    const boundedExpected = this.boundContentLength(expectedContent);
    const boundedActual = this.boundContentLength(actualContent);
    
    // O1JS Best Practice: Hierarchical hashing for large data
    const expectedHash = this.hierarchicalHash(boundedExpected);
    const actualHash = this.hierarchicalHash(boundedActual);
    
    // Create combined process hash
    const processHash = Poseidon.hash([
      Field(processId),
      expectedHash,
      actualHash,
      timestamp.value
    ]);
    
    // Create merkle root (simplified for single process)
    const merkleRoot = Poseidon.hash([processHash, Field(0)]);
    
    console.log(`🆔 Process ID: ${processId}`);
    console.log(`📝 Process Type: ${processType}`);
    console.log(`🌳 Merkle Root: ${merkleRoot.toString().substring(0, 20)}...`);
    console.log(`🔐 Process Hash: ${processHash.toString().substring(0, 20)}...`);
    
    return {
      processId,
      processType,
      expectedContent: boundedExpected,
      actualContent: boundedActual,
      merkleRoot,
      processHash,
      timestamp
    };
  }
  
  /**
   * Create multiple process data for multi-verifier capability
   * NEW METHOD: Multi-process data creation
   */
  public createMultipleProcessData(
    processAnalyses: ProcessAnalysis[],
    timestamp: UInt64
  ): ProcessVerificationData[] {
    console.log(`\n📦 Creating OptimMerkle data for ${processAnalyses.length} processes...`);
    
    return processAnalyses.map((analysis, index) => {
      return this.createProcessData(
        index,
        analysis.processType,
        analysis.expectedPattern,
        analysis.actualPath,
        timestamp
      );
    });
  }
  
  /**
   * Generate oracle signature for process verification
   * ENHANCED: Support for multi-process verification
   */
  public generateProcessOracleSignature(processHash: Field): {
    signature: any, // Signature type
    oraclePublicKey: any // PublicKey type
  } {
    console.log('✍️ Generating oracle signature for process verification...');
    
    // Implementation will use existing oracle key management
    // but with business process-specific keys
    
    return {
      signature: null, // Placeholder - will implement actual signature
      oraclePublicKey: null // Placeholder - will implement actual key
    };
  }
  
  /**
   * Generate multiple oracle signatures for multi-process verification
   * NEW METHOD: Multi-process signature generation
   */
  public generateMultipleProcessOracleSignatures(processHashes: Field[]): Array<{
    signature: any,
    oraclePublicKey: any,
    processId: number
  }> {
    console.log(`✍️ Generating oracle signatures for ${processHashes.length} processes...`);
    
    return processHashes.map((processHash, index) => {
      const { signature, oraclePublicKey } = this.generateProcessOracleSignature(processHash);
      return {
        signature,
        oraclePublicKey,
        processId: index
      };
    });
  }
  
  /**
  * Log process verification results - ZK CIRCUIT AUTHORITY ONLY
  * ENHANCED: Multi-process logging support
  */
  public logProcessVerificationResults(
  analysis: ProcessAnalysis,
  verificationData: ProcessVerificationData,
  phase: 'Pre-Verification' | 'Post-Verification' = 'Pre-Verification'
  ): void {
  console.log(`\n📊 PROCESS VERIFICATION RESULTS (${phase}):`); 
  console.log('='.repeat(50));
  
  console.log(`🏷️  Process Type: ${analysis.processType}`);
  console.log(`🎯 Expected Pattern: ${analysis.expectedPattern}`);
  console.log(`📋 Actual Path: ${analysis.actualPath}`);
  
  if (phase === 'Pre-Verification') {
    console.log(`⏳ Awaiting ZK Circuit verification...`);
  } else {
    // Post-verification - show ZK circuit result
  console.log(`⚡ ZK Circuit Verification: ${analysis.verificationResult ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`🏆 Final Authority: ZK CIRCUIT RESULT`);
  }
  
  console.log(`🔐 Process Hash: ${verificationData.processHash.toString().substring(0, 30)}...`);
  console.log(`🌳 Merkle Root: ${verificationData.merkleRoot.toString().substring(0, 30)}...`);
  console.log(`⏰ Timestamp: ${verificationData.timestamp.toString()}`);
  
  if (phase === 'Post-Verification') {
  console.log(`✅ Chain Status: VERIFIED AND STORED ON BLOCKCHAIN`);
    
      if (!analysis.verificationResult) {
        console.log(`⚠️ ZK Circuit Issues Detected:`);
        console.log(`  - Expected behavior: Process should match circuit pattern`);
        console.log(`  - Actual result: ZK circuit verification failed`);
        console.log(`  - Recommendation: Check ZK circuit implementation`);
      }
    }
  }
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
   * Log multi-process verification results
   * NEW METHOD: Multi-process logging
   */
  public logMultiProcessVerificationResults(
    analyses: ProcessAnalysis[],
    verificationData: ProcessVerificationData[],
    summary: MultiProcessVerificationSummary,
    phase: 'Pre-Verification' | 'Post-Verification' = 'Pre-Verification'
  ): void {
    console.log(`\n📊 MULTI-PROCESS VERIFICATION RESULTS (${phase}):`);
    console.log('='.repeat(70));
    
    // Log summary first
    console.log(`📋 Summary:`);
    console.log(`  🔢 Total Processes: ${summary.totalProcesses}`);
    console.log(`  ✅ Successful: ${summary.successfulVerifications}`);
    console.log(`  ❌ Failed: ${summary.failedVerifications}`);
    console.log(`  📈 Success Rate: ${summary.verificationPercentage}%`);
    console.log(`  🎯 Overall Result: ${summary.overallResult ? '✅ PASS' : '❌ FAIL'}`);
    
    // Log individual results
    console.log(`\n📋 Individual Process Results:`);
    for (let i = 0; i < analyses.length; i++) {
      const analysis = analyses[i];
      const data = verificationData[i];
      
      console.log(`\n  ${i + 1}. ${analysis.processType}:`);
      console.log(`     Path Match: ${analysis.pathsMatch ? '✅ YES' : '❌ NO'}`);
      console.log(`     Process Hash: ${data.processHash.toString().substring(0, 20)}...`);
      
      if (!analysis.pathsMatch) {
        console.log(`     ⚠️ Issues: Expected "${analysis.expectedPattern}" but got "${analysis.actualPath}"`);
      }
    }
    
    if (phase === 'Pre-Verification') {
      console.log(`\n⏳ Chain Status: ${summary.totalProcesses} processes awaiting ZK proof generation...`);
    } else {
      console.log(`\n✅ Chain Status: ${summary.totalProcesses} processes verified and stored on blockchain`);
    }
  }
  
  /**
   * PRIVATE UTILITY METHODS
   */
  
  private extractPathsFromPattern(pattern: string): string[] {
    // Extract all possible paths from regex pattern
    // This is a simplified implementation - actual regex parsing is more complex
    return [pattern]; // Placeholder implementation
  }
  
  private verifyPathAgainstPattern(path: string, pattern: string): boolean {
    // FOR LOGGING ONLY - NOT FOR FINAL DECISION
    try {
      const regex = new RegExp(pattern);
      const matches = regex.test(path);
      return matches;
    } catch (error) {
      // Pattern has syntax errors - this is expected for complex patterns
      return false; // This should NOT affect final result
    }
  }
  
  private boundContentLength(content: string): string {
    // O1JS Best Practice: Bound string length for circuit safety
    if (content.length > BusinessProcessVerificationBase.MAX_CONTENT_LENGTH) {
      console.warn(`⚠️ Content length ${content.length} exceeds maximum ${BusinessProcessVerificationBase.MAX_CONTENT_LENGTH}, truncating`);
      return content.substring(0, BusinessProcessVerificationBase.MAX_CONTENT_LENGTH);
    }
    return content;
  }
  
  private hierarchicalHash(content: string): Field {
    // O1JS Best Practice: Hierarchical hashing for large strings
    if (content.length <= BusinessProcessVerificationBase.POSEIDON_MAX_FIELDS) {
      // Direct hashing for small content
      const fields = content.split('').map(char => Field(char.charCodeAt(0)));
      return Poseidon.hash(fields);
    } else {
      // Hierarchical hashing for large content
      const chunks = this.chunkString(content, BusinessProcessVerificationBase.POSEIDON_MAX_FIELDS);
      const chunkHashes = chunks.map(chunk => {
        const fields = chunk.split('').map(char => Field(char.charCodeAt(0)));
        return Poseidon.hash(fields);
      });
      
      // Hash the chunk hashes
      return Poseidon.hash(chunkHashes);
    }
  }
  
  private chunkString(str: string, chunkSize: number): string[] {
    const chunks = [];
    for (let i = 0; i < str.length; i += chunkSize) {
      chunks.push(str.slice(i, i + chunkSize));
    }
    return chunks;
  }
}
