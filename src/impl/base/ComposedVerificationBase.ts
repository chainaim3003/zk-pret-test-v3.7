/**
 * ComposedVerificationBase.ts - Base class for Composed Verification
 * SHARED LOGIC between LOCAL and NETWORK implementations
 * COMPOSITION PATTERN: Provides reusable methods for 3-level proof composition
 */

import { Field, CircuitString, Poseidon, MerkleTree } from 'o1js';
import {
  ComposedOptimCompliance,
  ComposedOptimProof,
  ComposedOptimCompliancePublicOutput,
} from '../../zk-programs/compliance/ComposedRecursiveOptim3LevelZKProgramWithSign.js';

import { safeCircuitString, CIRCUIT_STRING_MAX_LENGTHS } from '../../utils/core/CoreZKUtilities.js';

// Import proof types from individual services
import { CorporateRegistrationOptimProof } from '../../zk-programs/compliance/CorporateRegistrationOptimZKProgram.js';
import { EXIMOptimProof } from '../../zk-programs/compliance/EXIMZKProgram.js';
import { GLEIFOptimProof } from '../../zk-programs/compliance/GLEIFZKProgram.js';

/**
 * Proof lineage interface for tracking proof composition hierarchy
 */
export interface ProofLineage {
  companyName: string;
  companyIdentifier: string;
  iteration: number;
  timestamp: number;
  composedProofHash: string;
  composedProof: ComposedOptimProof;
  level1ProofHash: string;
  level2ProofHash: string;
  level3ProofHash: string;
  corpRegProofHash: string;
  eximProofHash: string;
  gleifProofHash: string;
  corpRegProof: CorporateRegistrationOptimProof;
  eximProof: EXIMOptimProof;
  gleifProof: GLEIFOptimProof;
  overallComplianceScore: number;
  corpRegComplianceScore: number;
  eximComplianceScore: number;
  gleifComplianceScore: number;
  isFullyCompliant: boolean;
}

/**
 * Proof registry for managing composed proofs with Merkle tree storage
 */
export class ComposedProofRegistry {
  private proofs: Map<string, ProofLineage[]>;
  private proofsTree: MerkleTree;
  private nextIndex: number;

  constructor() {
    this.proofs = new Map();
    this.proofsTree = new MerkleTree(16); // 16 levels = 65,536 proofs max
    this.nextIndex = 0;
  }

  /**
   * Store a proof with its lineage information
   */
  storeProofWithLineage(lineage: ProofLineage): { index: number; witness: any } {
    const companyId = lineage.companyIdentifier;

    if (!this.proofs.has(companyId)) {
      this.proofs.set(companyId, []);
    }
    const companyProofs = this.proofs.get(companyId)!;
    companyProofs.push(lineage);

    const proofHash = Poseidon.hash([
      safeCircuitString(lineage.composedProofHash, CIRCUIT_STRING_MAX_LENGTHS.MEDIUM, 'composedProofHash').hash(),
      Field(lineage.timestamp),
      safeCircuitString(companyId, CIRCUIT_STRING_MAX_LENGTHS.MEDIUM, 'companyId').hash(),
    ]);

    const index = this.nextIndex++;
    this.proofsTree.setLeaf(BigInt(index), proofHash);
    const witness = this.proofsTree.getWitness(BigInt(index));

    console.log(`📋 Stored proof for ${lineage.companyName} (iteration ${lineage.iteration}) at index ${index}`);
    return { index, witness };
  }

  /**
   * Get all proofs for a company
   */
  getCompanyProofs(companyId: string): ProofLineage[] {
    return this.proofs.get(companyId) || [];
  }

  /**
   * Get a specific proof by iteration number
   */
  getProofByIteration(companyId: string, iteration: number): ProofLineage | null {
    const companyProofs = this.proofs.get(companyId);
    if (!companyProofs) return null;
    return companyProofs.find((proof) => proof.iteration === iteration) || null;
  }

  /**
   * Get the latest proof for a company
   */
  getLatestProof(companyId: string): ProofLineage | null {
    const companyProofs = this.proofs.get(companyId);
    if (!companyProofs || companyProofs.length === 0) return null;
    return companyProofs[companyProofs.length - 1];
  }

  /**
   * Get example proofs for demonstration
   */
  getProofLineageExamples(maxExamples: number = 3): ProofLineage[] {
    const examples: ProofLineage[] = [];
    let count = 0;

    for (const [companyId, proofs] of this.proofs.entries()) {
      if (count >= maxExamples) break;
      if (proofs.length > 0) {
        examples.push(proofs[0]);
        count++;
      }
    }
    return examples;
  }

  /**
   * Get Merkle root of all stored proofs
   */
  getRoot(): Field {
    return this.proofsTree.getRoot();
  }

  /**
   * Get total number of stored proofs
   */
  getTotalProofs(): number {
    return this.nextIndex;
  }

  /**
   * Get all company IDs
   */
  getAllCompanies(): string[] {
    return Array.from(this.proofs.keys());
  }
}

/**
 * Base verification class with common composition logic
 */
export class ComposedVerificationBase {
  /**
   * Orchestrate 3-level recursive proof composition
   * Level 1: Corporate Registration only
   * Level 2: Level 1 + EXIM
   * Level 3: Level 2 + GLEIF (Final)
   */
  protected async composeThreeLevelProof(
    corpRegProof: CorporateRegistrationOptimProof,
    eximProof: EXIMOptimProof,
    gleifProof: GLEIFOptimProof,
    timestamp: Field
  ): Promise<{
    level1Proof: ComposedOptimProof;
    level2Proof: ComposedOptimProof;
    level3Proof: ComposedOptimProof;
  }> {
    console.log('🔄 Composing 3-level recursive proof...');

    // Level 1: Corporate Registration only
    console.log('  📊 Level 1: Corporate Registration');
    const level1Proof = await ComposedOptimCompliance.level1(timestamp, corpRegProof);

    // Level 2: Level 1 + EXIM
    console.log('  📊 Level 2: Level 1 + EXIM');
    const level2Proof = await ComposedOptimCompliance.level2(timestamp, level1Proof, eximProof);

    // Level 3: Level 2 + GLEIF (Final)
    console.log('  📊 Level 3: Level 2 + GLEIF (Final)');
    const level3Proof = await ComposedOptimCompliance.level3(timestamp, level2Proof, gleifProof);

    console.log('✅ 3-level proof composition completed');

    return { level1Proof, level2Proof, level3Proof };
  }

  /**
   * Create proof lineage record for tracking
   */
  protected createProofLineage(
    companyName: string,
    companyIdentifier: string,
    iteration: number,
    timestamp: number,
    level1Proof: ComposedOptimProof,
    level2Proof: ComposedOptimProof,
    level3Proof: ComposedOptimProof,
    corpRegProof: CorporateRegistrationOptimProof,
    eximProof: EXIMOptimProof,
    gleifProof: GLEIFOptimProof,
    overallScore: number,
    corpRegScore: number,
    eximScore: number,
    gleifScore: number,
    isCompliant: boolean
  ): ProofLineage {
    const level3Output = level3Proof.publicOutput;

    return {
      companyName,
      companyIdentifier,
      iteration,
      timestamp,
      composedProofHash: level3Output.underlyingProofsHash.toString(),
      composedProof: level3Proof,
      level1ProofHash: level1Proof.publicOutput.underlyingProofsHash.toString(),
      level2ProofHash: level2Proof.publicOutput.underlyingProofsHash.toString(),
      level3ProofHash: level3Output.underlyingProofsHash.toString(),
      corpRegProofHash: corpRegProof.publicOutput.merkle_root.toString(),
      eximProofHash: eximProof.publicOutput.merkle_root.toString(),
      gleifProofHash: gleifProof.publicOutput.merkle_root.toString(),
      corpRegProof,
      eximProof,
      gleifProof,
      overallComplianceScore: overallScore,
      corpRegComplianceScore: corpRegScore,
      eximComplianceScore: eximScore,
      gleifComplianceScore: gleifScore,
      isFullyCompliant: isCompliant,
    };
  }

  /**
   * Validate that all required proofs are present
   */
  protected validateProofs(
    corpRegProof: CorporateRegistrationOptimProof | null,
    eximProof: EXIMOptimProof | null,
    gleifProof: GLEIFOptimProof | null
  ): void {
    if (!corpRegProof) {
      throw new Error('Corporate Registration proof is required');
    }
    if (!eximProof) {
      throw new Error('EXIM proof is required');
    }
    if (!gleifProof) {
      throw new Error('GLEIF proof is required');
    }
  }

  /**
   * Calculate overall compliance score from individual service scores
   */
  protected calculateOverallScore(corpRegScore: number, eximScore: number, gleifScore: number): number {
    return Math.round((corpRegScore + eximScore + gleifScore) / 3);
  }

  /**
   * Determine if company is fully compliant based on threshold
   */
  protected isFullyCompliant(overallScore: number, threshold: number = 75): boolean {
    return overallScore >= threshold;
  }
}