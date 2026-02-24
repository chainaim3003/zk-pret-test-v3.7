/**
 * ====================================================================
 * InputSanitization.ts - Input Sanitization Utilities
 * ====================================================================
 * NEW FILE — Fixes MEDIUM #5: Missing Input Sanitization
 *
 * All helper functions (createBasel3RiskComplianceData,
 * createAdvancedRiskComplianceData, createStableCoinRiskComplianceData)
 * previously passed raw numbers directly to Field.from(Math.round(x)).
 *
 * The risks:
 *   - Math.round(NaN)       → NaN  → Field.from(NaN)      → runtime error / corrupt Field
 *   - Math.round(Infinity)  → Infinity → Field.from(Infinity) → runtime error
 *   - Math.round(-Infinity) → -Infinity → Field.from(-Infinity) → runtime error
 *   - Field.from(-5)        → wraps around the finite field (mod p) → wrong value silently
 *
 * This module exports sanitize helpers that validate values BEFORE
 * they are passed to Math.round / Field.from, throwing descriptive
 * errors early so the problem is surfaced at data-prep time rather
 * than deep inside the ZK circuit.
 *
 * SAVE THIS FILE TO:
 *   src/utils/core/InputSanitization.ts
 * ====================================================================
 */

import { Field } from 'o1js';

// ====================================================================
// Core validation helper
// ====================================================================

/**
 * Validates that a raw JavaScript number is safe to pass to
 * Field.from(Math.round(value)).
 *
 * Throws a descriptive Error if value is:
 *   - not a number (typeof check)
 *   - NaN
 *   - Infinity or -Infinity
 *   - negative (when allowNegative is false, which is the default)
 *   - outside [min, max] when those are provided
 *
 * @param value       The raw number to validate
 * @param fieldName   Human-readable name used in error messages
 * @param options     Optional constraints
 */
export function assertValidFieldInput(
    value: number,
    fieldName: string,
    options: {
        allowNegative?: boolean;    // default false – Field wraps mod p for negatives
        min?: number;               // inclusive lower bound (after rounding)
        max?: number;               // inclusive upper bound (after rounding)
    } = {}
): void {
    const { allowNegative = false, min, max } = options;

    // 1. Type check
    if (typeof value !== 'number') {
        throw new TypeError(
            `[InputSanitization] Field "${fieldName}" must be a number, ` +
            `but received ${typeof value}: ${JSON.stringify(value)}`
        );
    }

    // 2. NaN check
    if (Number.isNaN(value)) {
        throw new RangeError(
            `[InputSanitization] Field "${fieldName}" is NaN. ` +
            `NaN cannot be safely converted to an o1js Field. ` +
            `Check upstream calculations (divisions, missing data, etc.).`
        );
    }

    // 3. Infinity check
    if (!Number.isFinite(value)) {
        const direction = value > 0 ? '+Infinity' : '-Infinity';
        throw new RangeError(
            `[InputSanitization] Field "${fieldName}" is ${direction}. ` +
            `Infinite values cannot be safely converted to an o1js Field. ` +
            `Check upstream ratio calculations for division-by-zero scenarios.`
        );
    }

    // 4. Negative check
    if (!allowNegative && value < 0) {
        throw new RangeError(
            `[InputSanitization] Field "${fieldName}" is negative (${value}). ` +
            `Negative values wrap around the finite field modulus and produce ` +
            `unexpected large Field values. Ensure the input is non-negative, ` +
            `or pass allowNegative: true if negatives are intentional.`
        );
    }

    // 5. Min/max bounds
    const rounded = Math.round(value);
    if (min !== undefined && rounded < min) {
        throw new RangeError(
            `[InputSanitization] Field "${fieldName}" rounded value (${rounded}) ` +
            `is below the required minimum (${min}).`
        );
    }
    if (max !== undefined && rounded > max) {
        throw new RangeError(
            `[InputSanitization] Field "${fieldName}" rounded value (${rounded}) ` +
            `exceeds the required maximum (${max}).`
        );
    }
}

// ====================================================================
// Safe Field conversion helpers
// ====================================================================

/**
 * Validates and converts a raw number to an o1js Field.
 * Drop-in replacement for:  Field.from(Math.round(value))
 *
 * Throws a descriptive error if the value is NaN, ±Infinity,
 * negative (by default), or outside optional bounds.
 */
export function safeFieldFromNumber(
    value: number,
    fieldName: string,
    options: {
        allowNegative?: boolean;
        min?: number;
        max?: number;
    } = {}
): Field {
    assertValidFieldInput(value, fieldName, options);
    return Field.from(Math.round(value));
}

/**
 * Validates a non-negative monetary / financial amount and converts to Field.
 * Max defaults to 1 000 000 000 000 (1 trillion) — adjust as needed.
 */
export function safeMonetaryField(
    value: number,
    fieldName: string,
    maxValue: number = 1_000_000_000_000
): Field {
    assertValidFieldInput(value, fieldName, {
        allowNegative: false,
        min: 0,
        max: maxValue,
    });
    return Field.from(Math.round(value));
}

/**
 * Validates a percentage ratio value (stored as an integer, e.g. 100 means 100%)
 * and converts to Field.  Range: [0, maxPercent].
 */
export function safePercentageField(
    value: number,
    fieldName: string,
    maxPercent: number = 50000   // 50 000% covers extreme LCR scenarios
): Field {
    assertValidFieldInput(value, fieldName, {
        allowNegative: false,
        min: 0,
        max: maxPercent,
    });
    return Field.from(Math.round(value));
}

/**
 * Validates a threshold value (percentage, must be positive) and converts to Field.
 * Range: (0, maxThreshold].
 */
export function safeThresholdField(
    value: number,
    fieldName: string,
    maxThreshold: number = 200
): Field {
    assertValidFieldInput(value, fieldName, {
        allowNegative: false,
        min: 1,      // thresholds must be strictly positive
        max: maxThreshold,
    });
    return Field.from(Math.round(value));
}

/**
 * Validates a period count (positive integer, 1–120) and converts to Field.
 */
export function safePeriodCountField(
    value: number,
    fieldName: string,
    maxPeriods: number = 120
): Field {
    assertValidFieldInput(value, fieldName, {
        allowNegative: false,
        min: 1,
        max: maxPeriods,
    });
    return Field.from(Math.round(value));
}

/**
 * Validates a score value (0–100, integer) and converts to Field.
 */
export function safeScoreField(
    value: number,
    fieldName: string
): Field {
    assertValidFieldInput(value, fieldName, {
        allowNegative: false,
        min: 0,
        max: 100,
    });
    return Field.from(Math.round(value));
}

// ====================================================================
// Bulk sanitization helper (validate a whole object at once)
// ====================================================================

export type FieldSpec = {
    value: number;
    name: string;
    options?: Parameters<typeof assertValidFieldInput>[2];
};

/**
 * Runs assertValidFieldInput for every entry in the specs array.
 * Use this at the TOP of createXxxComplianceData() functions to validate
 * all inputs before any Field is constructed.
 *
 * Example:
 *   validateAllFieldInputs([
 *     { value: hqlaComponents.level1Total, name: 'hqlaComponents.level1Total' },
 *     { value: thresholds.lcrThreshold,   name: 'thresholds.lcrThreshold', options: { min: 1, max: 200 } },
 *   ]);
 */
export function validateAllFieldInputs(specs: FieldSpec[]): void {
    for (const spec of specs) {
        assertValidFieldInput(spec.value, spec.name, spec.options ?? {});
    }
}