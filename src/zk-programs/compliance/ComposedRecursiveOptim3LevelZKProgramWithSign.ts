import {
  Field, CircuitString, Signature, ZkProgram, Proof, Struct, SelfProof,
  Poseidon, PublicKey, Provable, Bool, UInt64
} from 'o1js';

// Import individual OptimProof types (these would need to be created)
import { CorporateRegistrationOptimProof, CorporateRegistrationOptimPublicOutput } from '../../zk-programs/compliance/CorporateRegistrationZKProgram.js';
import { EXIMOptimProof, EXIMOptimPublicOutput } from '../../zk-programs/compliance/EXIMZKProgram.js';
import { GLEIFOptimProof, GLEIFOptimPublicOutput } from '../../zk-programs/compliance/GLEIFZKProgram.js';

/**
 * Public output for composed optimization compliance verification
 * Designed to be minimal to respect o1js constraints
 */
export class ComposedOptimCompliancePublicOutput extends Struct({
  // Core identification
  companyNameHash: Field,          // Hash of company name for privacy
  companyIdentifierHash: Field,    // Hash of company identifier (CIN, etc.)
  
  // Compliance summary
  overallComplianceScore: Field,   // Aggregate score across all services
  isFullyCompliant: Bool,          // True if all services are compliant
  
  // Service inclusion tracking (bitmask: CorpReg=1, EXIM=2, GLEIF=4)
  servicesIncluded: Field,         // Which services were verified
  servicesCompliant: Field,        // Which services passed compliance
  
  // Verification metadata
  verificationTimestamp: Field,   // When this composed proof was generated (Fix 2: Field instead of UInt64)
  composedProofVersion: Field,     // Version number for this company
  
  // Cryptographic integrity
  underlyingProofsHash: Field,     // Hash of all underlying proof hashes
}) {}

/**
 * Minimal structure for tracking underlying proof metadata
 * Used internally for proof composition verification
 */
export class UnderlyingProofMetadata extends Struct({
  corpRegProofHash: Field,
  eximProofHash: Field,
  gleifProofHash: Field,
  combinedHash: Field,
}) {}

/**
 * ComposedOptimCompliance ZkProgram
 * 3-level recursive composition with optimized proof handling
 * FIXED: Removed toBigInt() calls that cause compilation errors
 */
export const ComposedOptimCompliance = ZkProgram({
  name: 'ComposedOptimCompliance',
  publicInput: Field, // Fix 2: Changed from UInt64 to Field to match working version
  publicOutput: ComposedOptimCompliancePublicOutput,
  methods: {
    /**
     * Level 1: Start with Corporate Registration OptimProof
     * FIXED: Use UInt64 timestamp directly without toBigInt()
     */
    level1: {
      privateInputs: [CorporateRegistrationOptimProof],
      async method(
        timestamp: Field, 
        corpRegProof: CorporateRegistrationOptimProof
      ): Promise<ComposedOptimCompliancePublicOutput> {
        // Verify the corporate registration proof
        corpRegProof.verify();
        
        // Extract data from corporate registration proof
        const corpRegOutput = corpRegProof.publicOutput;
        
        // FIXED: Use correct property names and calculate score from compliance
        const overallScore = corpRegOutput.isCorpRegCompliant.toField().mul(Field(100)); // 100 if compliant, 0 if not
        const isCompliant = corpRegOutput.isCorpRegCompliant; // Use actual compliance
        
        // FIXED: Create deterministic proof hash using actual proof data
        const corpRegHash = Poseidon.hash([
          corpRegOutput.companyName.hash(),
          corpRegOutput.CIN.hash(),
          corpRegOutput.merkle_root,
          timestamp // Fix 4: Direct use, no .value for Field
        ]);
        const underlyingHash = corpRegHash; // Only one proof at this level
        
        return new ComposedOptimCompliancePublicOutput({
          companyNameHash: corpRegOutput.companyName.hash(),
          companyIdentifierHash: corpRegOutput.CIN.hash(),
          overallComplianceScore: overallScore,
          isFullyCompliant: isCompliant,
          servicesIncluded: Field(1), // Only Corporate Registration (bit 0)
          servicesCompliant: isCompliant.toField(), // 1 if compliant, 0 if not
          verificationTimestamp: timestamp, // FIXED: Use timestamp directly
          composedProofVersion: Field(1), // Level 1
          underlyingProofsHash: underlyingHash
        });
      }
    },

    /**
     * Level 2: Add EXIM OptimProof to Level 1
     * FIXED: Use UInt64 timestamp directly without toBigInt()
     */
    level2: {
      privateInputs: [SelfProof<Field, ComposedOptimCompliancePublicOutput>, EXIMOptimProof],
      async method(
        timestamp: Field,
        prevProof: SelfProof<Field, ComposedOptimCompliancePublicOutput>,
        eximProof: EXIMOptimProof
      ): Promise<ComposedOptimCompliancePublicOutput> {
        // Verify both proofs
        prevProof.verify();
        eximProof.verify();
        
        // Extract data
        const prevOutput = prevProof.publicOutput;
        const eximOutput = eximProof.publicOutput;
        
        // FIXED: Calculate scores correctly
        const corpRegScore = prevOutput.overallComplianceScore; // From level 1
        const eximScore = eximOutput.isEXIMCompliant.toField().mul(Field(100)); // 100 if compliant, 0 if not
        
        // FIXED: Safe average calculation
        const combinedScore = corpRegScore.add(eximScore).div(Field(2));
        
        // Check if both services are compliant
        const corpRegCompliant = prevOutput.isFullyCompliant;
        const eximCompliant = eximOutput.isEXIMCompliant;
        const bothCompliant = corpRegCompliant.and(eximCompliant);
        
        // Update service inclusion and compliance bitmasks
        const servicesIncluded = prevOutput.servicesIncluded.add(Field(2)); // Add EXIM (bit 1)
        const eximComplianceBit = eximCompliant.toField().mul(Field(2)); // Bit 1 for EXIM
        const servicesCompliant = prevOutput.servicesCompliant.add(eximComplianceBit);
        
        // FIXED: Deterministic hash using actual proof data
        const eximHash = Poseidon.hash([
          eximOutput.iec.hash(),
          eximOutput.entityName.hash(),
          eximOutput.merkle_root,
          timestamp // Fix 4: Direct use, no .value for Field
        ]);
        const combinedUnderlyingHash = Poseidon.hash([
          prevOutput.underlyingProofsHash,
          eximHash
        ]);
        
        return new ComposedOptimCompliancePublicOutput({
          companyNameHash: prevOutput.companyNameHash,
          companyIdentifierHash: prevOutput.companyIdentifierHash,
          overallComplianceScore: combinedScore,
          isFullyCompliant: bothCompliant,
          servicesIncluded: servicesIncluded,
          servicesCompliant: servicesCompliant,
          verificationTimestamp: timestamp, // FIXED: Use timestamp directly
          composedProofVersion: Field(2), // Level 2
          underlyingProofsHash: combinedUnderlyingHash
        });
      }
    },

    /**
     * Level 3: Add GLEIF OptimProof to Level 2 (Final composed proof)
     * FIXED: Use UInt64 timestamp directly without toBigInt()
     */
    level3: {
      privateInputs: [SelfProof<Field, ComposedOptimCompliancePublicOutput>, GLEIFOptimProof],
      async method(
        timestamp: Field,
        prevProof: SelfProof<Field, ComposedOptimCompliancePublicOutput>,
        gleifProof: GLEIFOptimProof
      ): Promise<ComposedOptimCompliancePublicOutput> {
        // Verify both proofs
        prevProof.verify();
        gleifProof.verify();
        
        // Extract data
        const prevOutput = prevProof.publicOutput;
        const gleifOutput = gleifProof.publicOutput;
        
        // FIXED: Use actual GLEIF compliance data
        const prevCombinedScore = prevOutput.overallComplianceScore; // CorpReg + EXIM average
        const gleifScore = gleifOutput.isGLEIFCompliant.toField().mul(Field(100)); // 100 if compliant, 0 if not
        
        // FIXED: Safe arithmetic for final score calculation
        const finalScore = prevCombinedScore.add(gleifScore).div(Field(2));
        
        // Check if all three services are compliant
        const prevCompliant = prevOutput.isFullyCompliant; // CorpReg AND EXIM
        const gleifCompliant = gleifOutput.isGLEIFCompliant;
        const allCompliant = prevCompliant.and(gleifCompliant);
        
        // Update service inclusion and compliance bitmasks
        const servicesIncluded = prevOutput.servicesIncluded.add(Field(4)); // Add GLEIF (bit 2)
        const gleifComplianceBit = gleifCompliant.toField().mul(Field(4)); // Bit 2 for GLEIF
        const servicesCompliant = prevOutput.servicesCompliant.add(gleifComplianceBit);
        
        // FIXED: Deterministic GLEIF hash using correct properties
        const gleifHash = Poseidon.hash([
          gleifOutput.lei.hash(),
          gleifOutput.name.hash(),
          gleifOutput.merkle_root,
          timestamp // Fix 4: Direct use, no .value for Field
        ]);
        const finalUnderlyingHash = Poseidon.hash([
          prevOutput.underlyingProofsHash,
          gleifHash
        ]);
        
        return new ComposedOptimCompliancePublicOutput({
          companyNameHash: prevOutput.companyNameHash,
          companyIdentifierHash: prevOutput.companyIdentifierHash,
          overallComplianceScore: finalScore,
          isFullyCompliant: allCompliant,
          servicesIncluded: servicesIncluded, // Should be 7 (1+2+4) for all services
          servicesCompliant: servicesCompliant, // Bitmask of which services are compliant
          verificationTimestamp: timestamp, // FIXED: Use timestamp directly
          composedProofVersion: Field(3), // Level 3 (final)
          underlyingProofsHash: finalUnderlyingHash
        });
      }
    }
  }
});

/**
 * Proof class for the composed compliance verification
 */
export class ComposedOptimProof extends ZkProgram.Proof(ComposedOptimCompliance) {}

/**
 * Helper functions for working with composed proofs
 */
export class ComposedOptimProofUtils {
  /**
   * Extract service compliance status from bitmask
   */
  static getServiceCompliance(servicesCompliant: Field): {
    corpReg: boolean;
    exim: boolean;
    gleif: boolean;
  } {
    const mask = servicesCompliant.toBigInt();
    return {
      corpReg: (mask & 1n) !== 0n,
      exim: (mask & 2n) !== 0n,
      gleif: (mask & 4n) !== 0n
    };
  }

  /**
   * Extract which services are included from bitmask
   */
  static getServicesIncluded(servicesIncluded: Field): {
    corpReg: boolean;
    exim: boolean;
    gleif: boolean;
  } {
    const mask = servicesIncluded.toBigInt();
    return {
      corpReg: (mask & 1n) !== 0n,
      exim: (mask & 2n) !== 0n,
      gleif: (mask & 4n) !== 0n
    };
  }

  /**
   * Check if this is a complete 3-service composed proof
   */
  static isCompleteComposedProof(proof: ComposedOptimProof): boolean {
    const output = proof.publicOutput;
    return output.servicesIncluded.equals(Field(7)).toBoolean(); // 1+2+4 = 7
  }

  /**
   * Get compliance summary for reporting
   */
  static getComplianceSummary(proof: ComposedOptimProof): {
    overallScore: number;
    isFullyCompliant: boolean;
    serviceCompliance: { corpReg: boolean; exim: boolean; gleif: boolean };
    servicesIncluded: { corpReg: boolean; exim: boolean; gleif: boolean };
    level: number;
  } {
    const output = proof.publicOutput;
    
    return {
      overallScore: Number(output.overallComplianceScore.toBigInt()),
      isFullyCompliant: output.isFullyCompliant.toBoolean(),
      serviceCompliance: this.getServiceCompliance(output.servicesCompliant),
      servicesIncluded: this.getServicesIncluded(output.servicesIncluded),
      level: Number(output.composedProofVersion.toBigInt())
    };
  }
}
