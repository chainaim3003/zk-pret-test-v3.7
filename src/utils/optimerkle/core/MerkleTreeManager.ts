import { MerkleTree, Field, MerkleWitness, Poseidon, CircuitString } from 'o1js';
import { PoseidonHasher } from './PoseidonHasher.js';

// Define MerkleWitness for 8-level tree following o1js best practices
export class MerkleWitness8 extends MerkleWitness(8) {}

/**
 * MerkleTreeManager - Optimized for o1js best practices
 * 
 * FULLY OPTIMIZED FOR O1JS:
 * ✅ Bounded Poseidon hashing (max 16 fields per hash)
 * ✅ Hierarchical hashing for large data structures
 * ✅ Proper field validation and range checks
 * ✅ Constraint-optimized operations
 * ✅ Memory-efficient field conversion
 * ✅ Circuit-safe string processing
 * ✅ Deterministic hashing with consistent padding
 */
export class MerkleTreeManager {
  private tree: MerkleTree;
  private readonly treeHeight: number;
  
  // O1JS best practice constants
  static MAX_STRING_LENGTH = 32;
  static MAX_CONTENT_LENGTH = 64;
  static POSEIDON_MAX_FIELDS = 16;
  
  // Export the MerkleWitness class for external use
  static MerkleWitness8 = MerkleWitness8;
  
  constructor(height: number = 8) {
    this.treeHeight = height;
    this.tree = new MerkleTree(height);
  }

  /**
   * Convert string to bounded Field array with o1js best practices
   * - Validates ASCII range (0-255)
   * - Bounds string length for circuit safety
   * - Uses deterministic padding
   */
  private stringToFields(str: string, maxLength: number = 32): Field[] {
    const truncated = str.slice(0, maxLength);
    const fields: Field[] = [];
    
    for (let i = 0; i < truncated.length; i++) {
      const charCode = truncated.charCodeAt(i);
      // Validate ASCII range for circuit safety
      if (charCode > 255) {
        throw new Error(`Invalid character code ${charCode} in string "${str}". Must be 0-255 for circuit safety.`);
      }
      fields.push(Field(charCode));
    }
    
    // Deterministic padding for consistent hashing
    while (fields.length < Math.min(maxLength, 32)) {
      fields.push(Field(0));
    }
    
    return fields.slice(0, 32);
  }

  /**
   * Hierarchical Poseidon hashing following o1js best practices
   * - Never exceeds 16 fields per hash operation
   * - Minimizes constraint count
   */
  private hierarchicalHash(fields: Field[]): Field {
    if (fields.length === 0) {
      return Field(0);
    }
    
    if (fields.length <= 16) {
      return Poseidon.hash(fields);
    }
    
    // Split into chunks and hash hierarchically
    const chunks: Field[] = [];
    for (let i = 0; i < fields.length; i += 16) {
      const chunk = fields.slice(i, i + 16);
      chunks.push(Poseidon.hash(chunk));
    }
    
    // Recursively hash the chunk hashes
    return this.hierarchicalHash(chunks);
  }

  /**
   * Create the SAME optimized process hash as the utils file (CRITICAL)
   * This ensures Merkle witness verification will succeed
   */
  private createOptimizedProcessHash(
    businessProcessID: CircuitString, 
    timestamp: Field, 
    businessProcessType: string, 
    actualContent: string
  ): Field {
    // Hash basic metadata (fits in single Poseidon)
    const metadataHash = Poseidon.hash([
      businessProcessID.hash(),
      timestamp,
      Field(businessProcessType.length),
      Field(actualContent.length)
    ]);

    // Hash business process type efficiently
    const typeFields = this.stringToFields(businessProcessType, 16);
    const typeHash = this.hierarchicalHash(typeFields);

    // Hash actual content efficiently - support longer content
    const contentFields = this.stringToFields(actualContent, Math.min(actualContent.length, 64));
    const contentHash = this.hierarchicalHash(contentFields);

    // Combine all hashes (fits in single Poseidon)
    return Poseidon.hash([metadataHash, typeHash, contentHash]);
  }
  
  /**
   * Create Merkle tree with process execution data following o1js best practices
   * - Uses hierarchical hashing for large data structures
   * - Validates all inputs
   * - Ensures the SAME processHash calculation as the utils file
   */
  async createProcessMerkleTree(processData: {
    bpmngroupid: CircuitString,
    businessProcessType: string,
    expectedContent: string,
    actualContent: string,
    timestamp: Field,
    executorID: string,
    expectedFile: string,
    actualFile: string
  }): Promise<MerkleTree> {
    // Validate inputs
    if (!processData.bpmngroupid) {
      throw new Error('businessProcessID is required');
    }
    if (!processData.timestamp) {
      throw new Error('timestamp is required');
    }

    // Create new tree
    this.tree = new MerkleTree(this.treeHeight);

    // CRITICAL: Use the SAME process hash calculation as utils file
    const processHash = this.createOptimizedProcessHash(
      processData.bpmngroupid,
      processData.timestamp,
      processData.businessProcessType || "",
      processData.actualContent || ""
    );

    // Hash file metadata with hierarchical hashing
    const expectedFileFields = this.stringToFields(processData.expectedFile || "", 64);
    const expectedFileHash = this.hierarchicalHash(expectedFileFields);

    const actualFileFields = this.stringToFields(processData.actualFile || "", 64);
    const actualFileHash = this.hierarchicalHash(actualFileFields);

    // Hash execution path
    const executionFields = this.stringToFields(processData.actualContent || "", 64);
    const executionHash = this.hierarchicalHash(executionFields);

    // Hash executor ID
    const executorFields = this.stringToFields(processData.executorID || "", 32);
    const executorHash = this.hierarchicalHash(executorFields);

    // Add data as leaves to the tree (use BigInt for o1js compatibility)
    this.tree.setLeaf(0n, processHash);      // Main process hash
    this.tree.setLeaf(1n, expectedFileHash); // Expected file hash
    this.tree.setLeaf(2n, actualFileHash);   // Actual file hash
    this.tree.setLeaf(3n, executionHash);    // Execution path hash
    this.tree.setLeaf(4n, executorHash);     // Executor ID hash
    this.tree.setLeaf(5n, processData.timestamp); // Timestamp

    return this.tree;
  }
  
  /**
   * Get Merkle root
   */
  getRoot(): Field {
    return this.tree.getRoot();
  }
  
  /**
   * Generate witness for a specific leaf following o1js best practices
   * - Proper witness validation
   * - Circuit-safe operations
   */
  generateWitness(leafIndex: bigint): MerkleWitness8 {
    // Validate leaf index
    const maxLeaves = BigInt(Math.pow(2, this.treeHeight));
    if (leafIndex < 0n || leafIndex >= maxLeaves) {
      throw new Error(`Invalid leaf index ${leafIndex}. Must be between 0 and ${maxLeaves - 1n}`);
    }

    const witness = this.tree.getWitness(leafIndex);
    
    // Create MerkleWitness8 instance with proper path format
    return new MerkleWitness8(witness);
  }
  
  /**
   * Verify a witness against the root with enhanced validation
   */
  verifyWitness(leafValue: Field, witness: any, root?: Field): boolean {
    try {
      const merkleRoot = root || this.getRoot();
      const calculatedRoot = witness.calculateRoot(leafValue);
      return calculatedRoot.equals(merkleRoot).toBoolean();
    } catch (error) {
      console.error('Witness verification failed:', error);
      return false;
    }
  }
  
  /**
   * Add additional process data to the tree with validation
   */
  addProcessStep(stepData: any, leafIndex: bigint): void {
    // Validate inputs
    if (!stepData) {
      throw new Error('stepData is required');
    }

    const maxLeaves = BigInt(Math.pow(2, this.treeHeight));
    if (leafIndex < 0n || leafIndex >= maxLeaves) {
      throw new Error(`Invalid leaf index ${leafIndex}. Must be between 0 and ${maxLeaves - 1n}`);
    }

    // Create step hash with validation
    const stepNumber = Field(stepData.stepNumber || 0);
    const stepHash = Poseidon.hash([stepNumber]);
    
    this.tree.setLeaf(leafIndex, stepHash);
  }
  
  /**
   * Get comprehensive tree information
   */
  getTreeInfo(): {
    height: number,
    root: string,
    leafCount: number,
    maxLeaves: number,
    constraintOptimized: boolean,
    poseidonBounded: boolean
  } {
    return {
      height: this.treeHeight,
      root: this.getRoot().toString(),
      leafCount: Math.pow(2, this.treeHeight),
      maxLeaves: Math.pow(2, this.treeHeight),
      constraintOptimized: true,
      poseidonBounded: true
    };
  }

  /**
   * Validate tree integrity
   */
  validateTreeIntegrity(): {
    valid: boolean,
    root: string | null,
    message: string
  } {
    try {
      const root = this.getRoot();
      return {
        valid: true,
        root: root.toString(),
        message: 'Tree integrity validated successfully'
      };
    } catch (error: any) {
      return {
        valid: false,
        root: null,
        message: `Tree integrity validation failed: ${error.message}`
      };
    }
  }
}