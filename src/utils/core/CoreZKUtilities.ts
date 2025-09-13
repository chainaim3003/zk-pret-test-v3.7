/**
 * ====================================================================
 * Layer 0: Universal ZK Primitives
 * ====================================================================
 * Core ZK utilities used by ALL ZK programs across the entire system
 * - GLEIF, EXIM, Corporate Registration, Risk scenarios, etc.
 * - Contains fundamental operations: signatures, Merkle proofs, hashing
 * ====================================================================
 */

import {
    Field,
    Signature,
    MerkleWitness,
    MerkleTree,
    Poseidon,
    UInt64,
    PublicKey,
} from 'o1js';

// Define specific MerkleWitness classes following project patterns
export class MerkleWitness8 extends MerkleWitness(8) {}
export class MerkleWitness9 extends MerkleWitness(9) {}
export class MerkleWitness10 extends MerkleWitness(10) {}

// Type alias for flexibility in function signatures
export type AnyMerkleWitness = MerkleWitness8 | MerkleWitness9 | MerkleWitness10;

// =================================== Universal ZK Primitives ===================================

/**
 * Universal oracle signature verification
 * Used by ALL ZK programs that require oracle data verification
 */
export function verifyOracleSignatureZK(
    signature: Signature,
    data: Field[],
    oraclePublicKey: PublicKey
): void {
    const isValidSignature = signature.verify(oraclePublicKey, data);
    isValidSignature.assertTrue();
}

/**
 * Universal Merkle witness verification
 * Core operation used across all Merkle-based proofs
 */
export function verifyMerkleWitnessZK(
    witness: AnyMerkleWitness,
    expectedRoot: Field,
    leafValue: Field
): void {
    const calculatedRoot = witness.calculateRoot(leafValue);
    calculatedRoot.assertEquals(expectedRoot);
}

/**
 * Universal data hashing
 * Standard hashing function for ZK data integrity
 */
export function hashDataZK(data: Field[]): Field {
    return Poseidon.hash(data);
}

/**
 * Universal timestamp validation
 * Validates timestamps within acceptable tolerance
 */
export function validateTimestampZK(
    timestamp: UInt64,
    tolerance: UInt64
): void {
    // For now, just ensure timestamp is not zero
    // In production, you'd compare against current time with tolerance
    timestamp.assertGreaterThan(UInt64.from(0));
}

/**
 * Build Merkle tree from array of Field elements
 * Used across all scenarios that need Merkle tree construction
 */
export function buildMerkleTreeZK(leaves: Field[]): MerkleTree {
    // Use fixed height of 8 to match MerkleWitness8 class
    const height = 8;
    const tree = new MerkleTree(height);
    
    // Add leaves to the tree
    leaves.forEach((leaf, index) => {
        tree.setLeaf(BigInt(index), leaf);
    });
    
    return tree;
}

/**
 * Verify multiple Merkle witnesses at once
 * Optimized function for scenarios with multiple data points
 */
export function verifyMultipleMerkleWitnessesZK(
    witnesses: AnyMerkleWitness[],
    expectedRoot: Field,
    leafValues: Field[]
): void {
    witnesses.forEach((witness, index) => {
        verifyMerkleWitnessZK(witness, expectedRoot, leafValues[index]);
    });
}

/**
 * Safe Field creation that handles decimal values
 * Automatically rounds decimals to integers before Field creation
 */
export function safeFieldFrom(value: number): Field {
    return Field.from(Math.round(value));
}

/**
 * Safe array sum that returns a Field
 * Handles decimal totals automatically
 */
export function safeArraySumToField(array: number[]): Field {
    const total = array.reduce((sum, val) => sum + val, 0);
    return Field.from(Math.round(total));
}

/**
 * Convert string array to Field array
 * Common utility for data preparation
 */
export function stringArrayToFieldsZK(strings: string[]): Field[] {
    return strings.map(str => Field(str));
}

/**
 * Convert number array to Field array
 * Common utility for numerical data
 */
export function numberArrayToFieldsZK(numbers: number[]): Field[] {
    return numbers.map(num => Field(Math.round(num)));
}
