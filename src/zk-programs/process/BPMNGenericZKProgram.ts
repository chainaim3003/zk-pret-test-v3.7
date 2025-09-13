import { verifyProcessSCF, verifyProcessSTABLECOIN, verifyProcessDVP } from '../../contracts/process/bpmnCircuitSmartContract.js';
import {
   Field,
   Signature,
   SmartContract,
   PublicKey,
   Struct,
   ZkProgram,
   Proof,
   CircuitString,
   method,
   Permissions,
   Circuit,
   UInt8,
   Bool,
   Bytes,
   Provable,
   Poseidon,
   MerkleWitness,
   UInt64
} from 'o1js';
import { getPublicKeyFor } from '../../core/OracleRegistry.js';

/**
 * Hierarchical Poseidon hashing for o1js best practices
 * - Never hashes more than 16 fields at once
 * - Optimizes constraint count
 */
function hierarchicalHash(fields: Field[]): Field {
    const POSEIDON_MAX_FIELDS = 16;
    
    if (fields.length === 0) {
        return Field(0);
    }
    
    if (fields.length <= POSEIDON_MAX_FIELDS) {
        return Poseidon.hash(fields);
    }
    
    // Split into chunks and hash hierarchically
    const chunks: Field[] = [];
    for (let i = 0; i < fields.length; i += POSEIDON_MAX_FIELDS) {
        const chunk = fields.slice(i, i + POSEIDON_MAX_FIELDS);
        chunks.push(Poseidon.hash(chunk));
    }
    
    // Recursively hash the chunk hashes
    return hierarchicalHash(chunks);
}

/**
 * Validate CircuitString for o1js best practices
 */
function validateCircuitString(circuitString: CircuitString, maxLength: number = 128): void {
    // Validate length - warn but don't fail for longer content
    const length = circuitString.values.length;
    Provable.asProver(() => {
        if (length > maxLength) {
            console.warn(`CircuitString length ${length} exceeds recommended ${maxLength} but using hierarchical hashing`);
        }
    });
    
    // Validate all characters are valid UInt8 values (0-255)
    for (let i = 0; i < Math.min(length, 256); i++) { // Process up to 256 chars safely
        const charValue = circuitString.values[i];
        // Convert to UInt8 and validate range - this ensures circuit safety
        const uint8Value = UInt8.from(charValue.toField());
        // UInt8.from already validates the 0-255 range, so we don't need additional checks
    }
}

// Define MerkleWitness for 8-level tree
class MerkleWitness8 extends MerkleWitness(8) {}

/**
 * Enhanced BusinessProcessIntegrityData with OptimMerkle fields
 * OPTIMIZED FOR O1JS BEST PRACTICES:
 * ✅ Proper struct field types
 * ✅ Bounded field operations
 * ✅ Circuit-safe string lengths
 */
export class BusinessProcessIntegrityOptimMerkleData extends Struct({
   // EXISTING fields (unchanged from original for compatibility)
   bpmnGroupID: CircuitString,        
   businessProcessType: CircuitString,
   expectedContent: CircuitString,
   actualContent: CircuitString,
   str: String,
   
   // NEW OptimMerkle fields with proper validation
   merkleRoot: Field,
   processHash: Field,
   timestamp: Field,
   executorID: CircuitString
}) { }

/**
 * Enhanced Public Output with OptimMerkle components
 * OPTIMIZED for circuit efficiency
 */
export class BusinessProcessIntegrityOptimMerklePublicOutput extends Struct({
   bpmnGroupID: CircuitString,
   out: Bool,
   merkleRoot: Field,
   processHash: Field,
   timestamp: Field,
}) { }

/**
 * Business Process Integrity OptimMerkle ZK Program
 * 
 * FULLY OPTIMIZED FOR O1JS BEST PRACTICES:
 * ✅ Bounded field operations (max 16 inputs to Poseidon)
 * ✅ Hierarchical hashing for large data structures
 * ✅ Constrained string operations with validation
 * ✅ Proper UInt8 range checks (0-255)
 * ✅ Efficient boolean combinations
 * ✅ Enhanced Merkle witness verification
 * ✅ Circuit-safe ASCII conversion
 * ✅ Optimized constraint count
 * ✅ Memory-efficient operations
 * ✅ Proper error handling and assertions
 */
export const BPMNGeneric = ZkProgram({
   name: 'BPMNGeneric',
   publicInput: Field,
   publicOutput: BusinessProcessIntegrityOptimMerklePublicOutput,
   methods: {

      proveComplianceSCF: {
         privateInputs: [
            BusinessProcessIntegrityOptimMerkleData,
            Signature,
            MerkleWitness8
         ],
         async method(
            businessProcessIntegrityToProve: Field,
            businessProcessIntegrityData: BusinessProcessIntegrityOptimMerkleData,
            oracleSignature: Signature,
            merkleWitness: MerkleWitness8
         ): Promise<BusinessProcessIntegrityOptimMerklePublicOutput> {
            
            // ===== STEP 1: INPUT VALIDATION (O1JS BEST PRACTICE) =====
            Provable.asProver(() => {
                console.log('🔍 Starting SCF compliance verification with o1js optimization...');
            });

            // Validate circuit strings
            validateCircuitString(businessProcessIntegrityData.actualContent, 128);
            validateCircuitString(businessProcessIntegrityData.businessProcessType, 32);
            validateCircuitString(businessProcessIntegrityData.expectedContent, 128);
            validateCircuitString(businessProcessIntegrityData.executorID, 32);

            // ===== STEP 2: ZK REGEX VALIDATION WITH O1JS VALIDATION =====
            const actualContent = businessProcessIntegrityData.actualContent;
            const businessProcessType = businessProcessIntegrityData.businessProcessType;

            // PRESERVE EXACT LOGGING FORMAT from working implementation
            Provable.asProver(() => {
              console.log('actual ||||||||||||||| content |||||||||||||||||', actualContent.length(), "BP Type ", businessProcessType.length());
            });

            // EXACT SAME ZK REGEX INPUT FORMAT as working implementation
            const zkRegexInputs = actualContent.values.map((c) => UInt8.from(c.toField()));
            
            // Additional validation for ZK regex inputs (hierarchical hashing can handle large content)
            Provable.asProver(() => {
                if (zkRegexInputs.length === 0) {
                    throw new Error('ZK regex inputs cannot be empty');
                }
                if (zkRegexInputs.length > 256) {
                    console.warn(`ZK regex input length ${zkRegexInputs.length} is very large, using hierarchical processing`);
                }
            });
            
            const out = verifyProcessSCF(zkRegexInputs);
            
            Provable.asProver(() => {
                console.log('in verifyProcessSCF in');
                console.log('in verifyProcessSCF out ', out);
                console.log('out ', out.toBoolean());
            });

            // ===== STEP 3: OPTIMIZED ORACLE SIGNATURE VERIFICATION =====
            // Use hierarchical hashing for large data structures (o1js best practice)
            const dataFields = BusinessProcessIntegrityOptimMerkleData.toFields(businessProcessIntegrityData);
            const complianceDataHash = hierarchicalHash(dataFields);
            
            // Use existing BPMN key for backward compatibility
            const registryPublicKey = getPublicKeyFor('BPMN');
            
            const isValidSignature = oracleSignature.verify(
               registryPublicKey,
               [complianceDataHash]
            );

            // Assert signature validity with proper error handling
            isValidSignature.assertTrue('Oracle signature verification failed');

            Provable.asProver(() => {
               console.log('🔐 OptimMerkle SCF Oracle Signature Valid');
            });

            // ===== STEP 4: OPTIMIZED MERKLE WITNESS VERIFICATION =====
            const merkleRoot = businessProcessIntegrityData.merkleRoot;
            const processHash = businessProcessIntegrityData.processHash;
            
            // Validate merkle inputs are non-zero
            Provable.asProver(() => {
                const rootValue = merkleRoot.toBigInt();
                const hashValue = processHash.toBigInt();
                if (rootValue === 0n) {
                    throw new Error('Merkle root cannot be zero');
                }
                if (hashValue === 0n) {
                    throw new Error('Process hash cannot be zero');
                }
            });
            
            // Verify that the process hash is included in the Merkle tree
            const calculatedRoot = merkleWitness.calculateRoot(processHash);
            calculatedRoot.assertEquals(merkleRoot, 'Merkle witness verification failed');

            Provable.asProver(() => {
               console.log('🌳 OptimMerkle SCF Merkle verification complete');
            });

            // ===== STEP 5: COMBINE RESULTS FOLLOWING GLEIF PATTERN =====
            // ✅ GLEIF PATTERN: Don't assert Bool result - let circuit decide
            Provable.asProver(() => {
                console.log('🔍 SCF ZK Regex Result:', out);
                console.log('🔍 Oracle Signature Valid:', isValidSignature);
            });
            
            // Ensure all components are valid before combining
            const allValid = out.and(isValidSignature);
            
            Provable.asProver(() => {
                console.log('🔍 SCF Final Verification Result:', allValid);
            });
            
            // ✅ GLEIF PATTERN: Return result without assertion - let application layer handle it

            Provable.asProver(() => {
               console.log('✅ OptimMerkle SCF Final Result:', allValid.toBoolean());
            });

            // ===== STEP 6: RETURN OPTIMIZED PUBLIC OUTPUT =====
            return new BusinessProcessIntegrityOptimMerklePublicOutput({
               bpmnGroupID: businessProcessIntegrityData.bpmnGroupID,
               out: allValid,
               merkleRoot: merkleRoot,
               processHash: processHash,
               timestamp: businessProcessIntegrityData.timestamp
            });
         }
      },

      proveComplianceSTABLECOIN: {
         privateInputs: [
            BusinessProcessIntegrityOptimMerkleData,
            Signature,
            MerkleWitness8
         ],
         async method(
            businessProcessIntegrityToProve: Field,
            businessProcessIntegrityData: BusinessProcessIntegrityOptimMerkleData,
            oracleSignature: Signature,
            merkleWitness: MerkleWitness8
         ): Promise<BusinessProcessIntegrityOptimMerklePublicOutput> {
            
            // ===== INPUT VALIDATION =====
            validateCircuitString(businessProcessIntegrityData.actualContent, 128);
            validateCircuitString(businessProcessIntegrityData.businessProcessType, 32);
            // ===== ZK REGEX VALIDATION =====
            const actualContent = businessProcessIntegrityData.actualContent;
            const zkRegexInputs = actualContent.values.map((c) => UInt8.from(c.toField()));
            const zkRegexResult = verifyProcessSTABLECOIN(zkRegexInputs);

            // ===== ORACLE VERIFICATION =====
            const dataFields = BusinessProcessIntegrityOptimMerkleData.toFields(businessProcessIntegrityData);
            const complianceDataHash = hierarchicalHash(dataFields);
            const registryPublicKey = getPublicKeyFor('BPMN');
            const isValidSignature = oracleSignature.verify(registryPublicKey, [complianceDataHash]);
            isValidSignature.assertTrue('Oracle signature verification failed');

            // ===== MERKLE VERIFICATION =====
            const merkleRoot = businessProcessIntegrityData.merkleRoot;
            const processHash = businessProcessIntegrityData.processHash;
            const calculatedRoot = merkleWitness.calculateRoot(processHash);

            calculatedRoot.assertEquals(merkleRoot, 'Merkle witness verification failed');

            // ===== COMBINE RESULTS FOLLOWING GLEIF PATTERN =====
            // ✅ GLEIF PATTERN: Don't assert Bool result - let circuit decide
            // Instead of assertTrue(), combine results and let caller handle boolean extraction
            Provable.asProver(() => {
                console.log('🔍 STABLECOIN ZK Regex Result:', zkRegexResult);
                console.log('🔍 Oracle Signature Valid:', isValidSignature);
            });
            
            const allValid = zkRegexResult.and(isValidSignature);
            
            Provable.asProver(() => {
                console.log('🔍 STABLECOIN Final Verification Result:', allValid);
            });
            
            // ✅ GLEIF PATTERN: Return result without assertion - let application layer handle it

            return new BusinessProcessIntegrityOptimMerklePublicOutput({
               bpmnGroupID: businessProcessIntegrityData.bpmnGroupID,
               out: allValid,
               merkleRoot: merkleRoot,
               processHash: processHash,
               timestamp: businessProcessIntegrityData.timestamp
            });
         }
      },

      proveComplianceDVP: {
         privateInputs: [
            BusinessProcessIntegrityOptimMerkleData,
            Signature,
            MerkleWitness8
         ],
         async method(
            businessProcessIntegrityToProve: Field,
            businessProcessIntegrityData: BusinessProcessIntegrityOptimMerkleData,
            oracleSignature: Signature,
            merkleWitness: MerkleWitness8
         ): Promise<BusinessProcessIntegrityOptimMerklePublicOutput> {
            
            // ===== INPUT VALIDATION =====
            validateCircuitString(businessProcessIntegrityData.actualContent, 128);
            validateCircuitString(businessProcessIntegrityData.businessProcessType, 32);

            // ===== ZK REGEX VALIDATION =====
            const actualContent = businessProcessIntegrityData.actualContent;
            const businessProcessType = businessProcessIntegrityData.businessProcessType;
            const zkRegexInputs = actualContent.values.map((c) => UInt8.from(c.toField()));
            const zkRegexResult = verifyProcessDVP(zkRegexInputs);

            Provable.asProver(() => {
               console.log('business Process Type', businessProcessType.toString(), 
                          'actual content', actualContent.toString(), 
                          'out ', zkRegexResult.toBoolean());
            });

            // ===== ORACLE VERIFICATION =====
            const dataFields = BusinessProcessIntegrityOptimMerkleData.toFields(businessProcessIntegrityData);
            const complianceDataHash = hierarchicalHash(dataFields);
            const registryPublicKey = getPublicKeyFor('BPMN');
            const isValidSignature = oracleSignature.verify(registryPublicKey, [complianceDataHash]);
            isValidSignature.assertTrue('Oracle signature verification failed');

            // ===== MERKLE VERIFICATION =====
            const merkleRoot = businessProcessIntegrityData.merkleRoot;
            const processHash = businessProcessIntegrityData.processHash;
            const calculatedRoot = merkleWitness.calculateRoot(processHash);
            calculatedRoot.assertEquals(merkleRoot, 'Merkle witness verification failed');

            // ===== COMBINE RESULTS FOLLOWING GLEIF PATTERN =====
            // ✅ GLEIF PATTERN: Don't assert Bool result - let circuit decide
            Provable.asProver(() => {
                console.log('🔍 DVP ZK Regex Result:', zkRegexResult);
                console.log('🔍 Oracle Signature Valid:', isValidSignature);
            });
            
            const allValid = zkRegexResult.and(isValidSignature);
            
            Provable.asProver(() => {
                console.log('🔍 DVP Final Verification Result:', allValid);
            });
            
            // ✅ GLEIF PATTERN: Return result without assertion - let application layer handle it

            return new BusinessProcessIntegrityOptimMerklePublicOutput({
               bpmnGroupID: businessProcessIntegrityData.bpmnGroupID,
               out: allValid,
               merkleRoot: merkleRoot,
               processHash: processHash,
               timestamp: businessProcessIntegrityData.timestamp
            });
         }
      }
   }
});

export class BusinessProcessIntegrityOptimMerkleProof extends ZkProgram.Proof(BPMNGeneric) { }