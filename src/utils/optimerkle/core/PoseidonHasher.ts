import { Poseidon, Field, CircuitString, Provable } from 'o1js';

/**
 * PoseidonHasher - Cryptographic hashing utility for OptimMerkle process data
 * Following o1js best practices for circuit efficiency and constraint optimization
 * 
 * This class provides Poseidon hash functions for:
 * - Process execution data with bounded inputs
 * - BPMN file metadata with size constraints
 * - Batch operations with circuit-friendly operations
 */
export class PoseidonHasher {
  
  // Circuit-safe constants
  static readonly MAX_STRING_LENGTH = 32;
  static readonly MAX_HASH_INPUTS = 16;
  
  /**
   * Hash complete process data structure with circuit constraints
   */
  static hashProcessData(processData: {
    businessProcessID: Field,
    businessProcessType: string,
    expectedContent: string,
    actualContent: string,
    timestamp: Field,
    executorID: string
  }): Field {
    // Use bounded field conversion to prevent circuit bloat
    const typeFields = this.stringToConstrainedFields(processData.businessProcessType);
    const actualFields = this.stringToConstrainedFields(processData.actualContent);
    const executorFields = this.stringToConstrainedFields(processData.executorID);
    
    // Combine with size limit for Poseidon efficiency
    const allFields = [
      processData.businessProcessID,
      processData.timestamp,
      ...typeFields,
      ...actualFields.slice(0, 4), // Limit to prevent constraint explosion
      ...executorFields.slice(0, 2)
    ].slice(0, this.MAX_HASH_INPUTS);
    
    return Poseidon.hash(allFields);
  }
  
  /**
   * Hash BPMN file metadata with circuit constraints
   */
  static hashBPMNFile(filePath: string, fileSize?: number): Field {
    const pathFields = this.stringToConstrainedFields(filePath);
    const sizeField = Field(fileSize || filePath.length);
    
    // Limit fields for circuit efficiency
    const boundedFields = [...pathFields.slice(0, 8), sizeField];
    return Poseidon.hash(boundedFields);
  }
  
  /**
   * Hash process execution path with length constraints
   */
  static hashExecutionPath(path: string): Field {
    const pathFields = this.stringToConstrainedFields(path);
    return Poseidon.hash(pathFields.slice(0, 12)); // Limit for circuit efficiency
  }
  
  /**
   * Combine multiple hashes for Merkle tree operations
   */
  static combineHashes(hash1: Field, hash2: Field): Field {
    return Poseidon.hash([hash1, hash2]);
  }
  
  /**
   * Hash array of fields with size constraints
   */
  static hashFields(fields: Field[]): Field {
    const boundedFields = fields.slice(0, this.MAX_HASH_INPUTS);
    return Poseidon.hash(boundedFields);
  }
  
  /**
   * Convert string to constrained Field array for circuit safety
   * Follows o1js best practices for bounded operations
   */
  private static stringToConstrainedFields(str: string): Field[] {
    const truncated = str.slice(0, this.MAX_STRING_LENGTH);
    const fields: Field[] = [];
    
    // Convert each character to Field with bounds checking
    for (let i = 0; i < Math.min(truncated.length, this.MAX_STRING_LENGTH); i++) {
      const charCode = truncated.charCodeAt(i);
      // Ensure ASCII range for circuit safety
      const boundedCharCode = charCode > 127 ? 63 : charCode; // Use '?' for non-ASCII
      fields.push(Field(boundedCharCode));
    }
    
    // Pad with zeros for consistent circuit size
    while (fields.length < 8) {
      fields.push(Field(0));
    }
    
    return fields.slice(0, 8); // Always return exactly 8 fields
  }
}
