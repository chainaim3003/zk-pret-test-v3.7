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
export class MerkleWitness8 extends MerkleWitness(8) { }
export class MerkleWitness9 extends MerkleWitness(9) { }
export class MerkleWitness10 extends MerkleWitness(10) { }

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
 * Maximum value safely representable as a Field from a JS number.
 * Field prime is ~2^254; JS integers are safe up to 2^53-1 (Number.MAX_SAFE_INTEGER).
 * We enforce the JS safe-integer boundary here so that BigInt promotion in Field.from()
 * always receives an exact value with no floating-point drift.
 */
const MAX_SAFE_FIELD_INPUT = Number.MAX_SAFE_INTEGER; // 2^53 - 1

/**
 * Convert a JS number to a Field with proper range validation.
 *
 * Checks performed before conversion:
 *  1. Value must be finite (rejects NaN / Infinity)
 *  2. Value must be non-negative (Field arithmetic is modular; negatives wrap)
 *  3. Value must not exceed Number.MAX_SAFE_INTEGER (prevents silent precision loss)
 *
 * @param value - The number to convert (decimals are rounded first)
 * @param label - Optional field name used in error messages
 */
export function safeFieldFromNumber(value: number, label = 'value'): Field {
    if (!Number.isFinite(value)) {
        throw new Error(
            `safeFieldFromNumber: ${label} must be finite, got ${value}`
        );
    }
    const rounded = Math.round(value);
    if (rounded < 0) {
        throw new Error(
            `safeFieldFromNumber: ${label} must be non-negative for Field conversion, got ${rounded}. ` +
            `Negative numbers wrap around the field prime and silently corrupt ZK proofs.`
        );
    }
    if (rounded > MAX_SAFE_FIELD_INPUT) {
        throw new Error(
            `safeFieldFromNumber: ${label} exceeds Number.MAX_SAFE_INTEGER (${MAX_SAFE_FIELD_INPUT}), got ${rounded}. ` +
            `Use BigInt arithmetic or scale down the value before Field conversion.`
        );
    }
    return Field.from(rounded);
}

/**
 * Legacy alias kept for backward compatibility.
 * Prefer safeFieldFromNumber for new code.
 */
export function safeFieldFrom(value: number, label?: string): Field {
    return safeFieldFromNumber(value, label);
}

/**
 * Safe array sum that returns a Field.
 * Validates the summed total before Field conversion.
 */
export function safeArraySumToField(array: number[]): Field {
    const total = array.reduce((sum, val) => sum + val, 0);
    return safeFieldFromNumber(total, 'array sum');
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
    return numbers.map((num, i) => safeFieldFromNumber(num, `array[${i}]`));
}

/**
 * Safe division operation for ZK circuits
 * Prevents division by zero and ensures Field arithmetic consistency
 */
export function safeDivideZK(numerator: Field, denominator: Field): Field {
    // Assert denominator is not zero to prevent division by zero
    denominator.assertGreaterThan(Field(0), 'Division by zero is not allowed in ZK arithmetic');

    // Perform safe division using Field.div
    return numerator.div(denominator);
}

/**
 * Consistent Field arithmetic for addition
 * Ensures all operations use Field methods for ZK consistency
 */
export function addFieldsZK(a: Field, b: Field): Field {
    return a.add(b);
}

/**
 * Consistent Field arithmetic for subtraction
 * Ensures all operations use Field methods for ZK consistency
 */
export function subtractFieldsZK(a: Field, b: Field): Field {
    return a.sub(b);
}

/**
 * Consistent Field arithmetic for multiplication
 * Ensures all operations use Field methods for ZK consistency
 */
export function multiplyFieldsZK(a: Field, b: Field): Field {
    return a.mul(b);
}

/**
 * Calculate percentage using consistent Field arithmetic
 * Returns (numerator * 100) / denominator as Field
 */
export function calculatePercentageZK(numerator: Field, denominator: Field): Field {
    return safeDivideZK(numerator.mul(Field(100)), denominator);
}

/**
 * Calculate ratio using consistent Field arithmetic
 * Returns numerator / denominator as Field
 */
export function calculateRatioZK(numerator: Field, denominator: Field): Field {
    return safeDivideZK(numerator, denominator);
}
