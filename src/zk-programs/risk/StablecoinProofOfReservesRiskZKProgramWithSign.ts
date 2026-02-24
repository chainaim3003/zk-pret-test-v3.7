import { count } from 'console';
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
   Bool,
   UInt64,
   Poseidon
} from 'o1js';
import { getPublicKeyFor } from '../../core/OracleRegistry.js'
// import axios from 'axios';
import { safeFieldFromNumber } from '../../utils/core/CoreZKUtilities.js';

// =============================================================================
// MEDIUM #5 FIX — Input Sanitization
// =============================================================================
// Official o1js source (node_modules/o1js/src/lib/provable/field.ts, line ~100):
//   constructor(x) { this.value = FieldVar.constant(Fp.mod(BigInt(x))); }
//
// What each bad JS number does when passed to Field():
//   BigInt(NaN)       → throws TypeError  ("not an integer")     — crash
//   BigInt(Infinity)  → throws TypeError  ("not an integer")     — crash
//   BigInt(-n)        → Fp.mod wraps to p-n ≈ 2^254             — SILENT WRONG VALUE
//
// Official docs state: "Creating a Field from a negative number can result in
// unexpected behavior if you are not familiar with modular arithmetic."
//
// safeFieldFromNumber() in CoreZKUtilities.ts guards all three cases:
//   1. !Number.isFinite(value) → rejects NaN and ±Infinity
//   2. rounded < 0             → rejects negatives (prevents silent modulus wrap)
//   3. rounded > MAX_SAFE_INTEGER → rejects precision-loss values
//
// toMinaFieldSafe() replaces the original toMinaField() which had NO guard:
//   Original: Field(Math.abs(Math.round(value)))
//     Math.abs(NaN) = NaN, Math.round(NaN) = NaN → BigInt(NaN) throws (crash)
//   Fixed: validate isFinite first, then abs+round via safeFieldFromNumber.
// =============================================================================

/**
 * Safe replacement for the original toMinaField().
 * Original intent: treat HQLA values as magnitudes (take abs value).
 * Added: validate that the raw value is finite before any Math.abs/Math.round.
 */
function toMinaFieldSafe(value: number, label: string): Field {
   if (!Number.isFinite(value)) {
      throw new RangeError(
         `[MEDIUM#5] "${label}" is ${value}. ` +
         `NaN and Infinity cannot be passed to Field() — ` +
         `o1js internally calls BigInt(x) which throws for non-integer values. ` +
         `Check upstream ACTUS contract data for missing or overflow values.`
      );
   }
   // Math.abs preserves original intent: HQLA amounts are always magnitudes.
   // Result is ≥ 0 so safeFieldFromNumber's negative-guard does not block it.
   return safeFieldFromNumber(Math.abs(value), label);
}
const MAX_LENGTH = 120; // Define a maximum length for cash flows

export class ACTUSData extends Struct({
   scenarioID: CircuitString,
   scenarioName: CircuitString,
   scenarioName_str: String,
   riskEvaluated: Field,

   // Cash Flow Data (Inflows & Outflows)
   cashInflows: Array(MAX_LENGTH).fill(Number),
   cashOutflows: Array(MAX_LENGTH).fill(Number),
   inflowLength: Number,
   outflowLength: Number,

   // LCR Calculation Data
   newInvoiceAmount: Number,
   newInvoiceEvaluationMonth: Number,
   liquidityThreshold: Number,
   liquidityThreshold_LCR: Number,
   //  Classified Contracts for HQLA
   classifiedContracts: Array(MAX_LENGTH).fill({
      id: String,
      type: String,
      hqlaCategory: String,   // "L1", "L2A", "L2B", or "Non-HQLA"
      inflowTotal: Number,
      outflowTotal: Number,
   }),

   //  Aggregated HQLA Amounts
   totalHQLA_L1: Array(MAX_LENGTH).fill(Number),
   totalHQLA_L2A: Array(MAX_LENGTH).fill(Number),
   totalHQLA_L2B: Array(MAX_LENGTH).fill(Number),
   totalNonHQLA: Array(MAX_LENGTH).fill(Number),
}) {
   constructor(data: {
      scenarioID: CircuitString;
      scenarioName: CircuitString;
      scenarioName_str: string;
      riskEvaluated: Field;

      cashInflows: number[];
      cashOutflows: number[];
      inflowLength: number;
      outflowLength: number;

      newInvoiceAmount: number;
      newInvoiceEvaluationMonth: number;
      liquidityThreshold: number;
      liquidityThreshold_LCR: number;

      classifiedContracts: { id: string; type: string; hqlaCategory: string; inflowTotal: number; outflowTotal: number }[];

      totalHQLA_L1: number[];
      totalHQLA_L2A: number[];
      totalHQLA_L2B: number[];
      totalNonHQLA: number[];
   }) {
      super(data);

      this.cashInflows = this.padArray(data.cashInflows, MAX_LENGTH);
      this.cashOutflows = this.padArray(data.cashOutflows, MAX_LENGTH);
      this.classifiedContracts = this.padObjectArray(data.classifiedContracts, MAX_LENGTH);
   }
   //  Utility Function: Pads numeric arrays to MAX_LENGTH
   private padArray(arr: number[], length: number): number[] {
      return [...arr, ...Array(Math.max(0, length - arr.length)).fill(0)].slice(0, length);
   }
   // Utility Function: Pads classified contract arrays
   private padObjectArray(arr: { id: string; type: string; hqlaCategory: string; inflowTotal: number; outflowTotal: number }[], length: number) {
      const emptyContract = { id: "", type: "", hqlaCategory: "Non-HQLA", inflowTotal: 0, outflowTotal: 0 };
      return [...arr, ...Array(Math.max(0, length - arr.length)).fill(emptyContract)].slice(0, length);
   }
}


export class liquidityratioDataPublicOutput extends Struct({
   out: Bool
}) { }

export const LiquidityRatioZkprogram = ZkProgram({
   name: 'LiquidityRatio',
   publicInput: Field,
   publicOutput: liquidityratioDataPublicOutput,
   methods: {
      proveCompliance: { // Generates the public output
         privateInputs: [
            ACTUSData,
            Signature,
         ],
         async method(
            LiquidityRatioToProve: Field,
            LiquidityRatioData: ACTUSData,
            oracleSignature: Signature,
         ): Promise<liquidityratioDataPublicOutput> {
            let out = Bool(true);

            //try {
            //========================================================================================================
            const risk1DataHash = Poseidon.hash(ACTUSData.toFields(LiquidityRatioData));
            const registryPublicKey = getPublicKeyFor('RISK');
            const isValidSignature = oracleSignature.verify(
               registryPublicKey,
               [risk1DataHash]
            );
            isValidSignature.assertTrue();
            //========================================================================================================

            // ── MEDIUM #5 FIX ─────────────────────────────────────────────────────────
            // Previously: Field(Math.round(val)) with no guard for NaN / Infinity.
            // Now: safeFieldFromNumber() validates before Field construction.
            const cashInfl = LiquidityRatioData.cashInflows.map((val, i) => {
               if (!Number.isFinite(val)) throw new RangeError(
                  `[MEDIUM#5] cashInflows[${i}] is ${val}. Must be a finite number.`);
               const r = Math.round(val);
               if (r < 0) throw new RangeError(
                  `[MEDIUM#5] cashInflows[${i}] rounded to ${r}. Negative values silently wrap the field prime.`);
               return safeFieldFromNumber(r, `cashInflows[${i}]`);
            });
            const cashOutfl = LiquidityRatioData.cashOutflows.map((val, i) => {
               if (!Number.isFinite(val)) throw new RangeError(
                  `[MEDIUM#5] cashOutflows[${i}] is ${val}. Must be a finite number.`);
               const r = Math.round(val);
               if (r < 0) throw new RangeError(
                  `[MEDIUM#5] cashOutflows[${i}] rounded to ${r}. Negative values silently wrap the field prime.`);
               return safeFieldFromNumber(r, `cashOutflows[${i}]`);
            });

            const monthsCount             = safeFieldFromNumber(LiquidityRatioData.outflowLength,                       'outflowLength');
            const newInvoiceAmount        = safeFieldFromNumber(Math.round(LiquidityRatioData.newInvoiceAmount),         'newInvoiceAmount');
            const newInvoiceEvaluationMonth = safeFieldFromNumber(LiquidityRatioData.newInvoiceEvaluationMonth,          'newInvoiceEvaluationMonth');
            const liquidityThreshold      = safeFieldFromNumber(Math.round(LiquidityRatioData.liquidityThreshold),       'liquidityThreshold');
            const liquidityThreshold_LCR  = safeFieldFromNumber(Math.round(LiquidityRatioData.liquidityThreshold_LCR),  'liquidityThreshold_LCR');

            // toMinaFieldSafe replaces toMinaField — validates isFinite before Math.abs/Math.round.
            const totalHQLA_L1  = LiquidityRatioData.totalHQLA_L1.map( (val, i) => toMinaFieldSafe(val, `totalHQLA_L1[${i}]`));
            const totalHQLA_L2A = LiquidityRatioData.totalHQLA_L2A.map((val, i) => toMinaFieldSafe(val, `totalHQLA_L2A[${i}]`));
            const totalHQLA_L2B = LiquidityRatioData.totalHQLA_L2B.map((val, i) => toMinaFieldSafe(val, `totalHQLA_L2B[${i}]`));
            const totalNonHQLA  = LiquidityRatioData.totalNonHQLA.map( (val, i) => toMinaFieldSafe(val, `totalNonHQLA[${i}]`));

            console.log("===== Liquidity Ratio Data =====");
            console.log("Cash Inflows:", cashInfl.map(val => val.toString()));
            console.log("Cash Outflows:", cashOutfl.map(val => val.toString()));
            // console.log("Months Count:", monthsCount.toString());
            // console.log("New Invoice Amount:", newInvoiceAmount.toString());
            // console.log("New Invoice Evaluation Month:", newInvoiceEvaluationMonth.toString());
            // console.log("Liquidity Threshold:", liquidityThreshold.toString());
            // console.log("Liquidity Threshold (LCR):", liquidityThreshold_LCR.toString());
            // console.log("Total HQLA L1:", totalHQLA_L1.map(val => val.toString()));
            // console.log("Total HQLA L2A:", totalHQLA_L2A.map(val => val.toString()));
            // console.log("Total HQLA L2B:", totalHQLA_L2B.map(val => val.toString()));
            // console.log("Total Non-HQLA:", totalNonHQLA.map(val => val.toString()));
            console.log("=================================");

            let initial_reservenum = 10000;
            let cumulativeInflows = Field(initial_reservenum);
            let cumulativeOutflows = Field(0);
            let cumulativeHQLA = Field(0);

            function safeDivision(numerator: { toBigInt: () => any; }, denominator: { toBigInt: () => any; }) {
               const num = Number(numerator.toBigInt());
               const den = Number(denominator.toBigInt());

               if (den === 0) {
                  return Field(0); // Avoid division by zero
               }

               const result = Math.floor((num * 100) / den);
               return Field(result);
            }

            let monthlyLCR = [];

            for (let month = 0; month < monthsCount.toBigInt(); month++) {
            //for (let month = Field(1); month.lessThan(monthsCount).toBoolean(); month = month.add(1)) {   
  
               // Update cumulative inflows and outflows
               cumulativeInflows = cumulativeInflows.add(cashInfl[month]);
               cumulativeOutflows = cumulativeOutflows.add(cashOutfl[month]);

               // Compute cumulative cash flow
               let cumulativeCashFlow = cumulativeInflows.sub(cumulativeOutflows);
               if (cumulativeInflows < cumulativeOutflows) { out = Bool(false); }

               // Update cumulative HQLA
               let totalHQLA = totalHQLA_L1[month]
                  .add(totalHQLA_L2A[month])
                  .add(totalHQLA_L2B[month])
                  .add(totalNonHQLA[month]);

               cumulativeHQLA = cumulativeHQLA.add(totalHQLA);

               // Compute LCR
               let LCR = (safeDivision(cumulativeHQLA, cumulativeOutflows)); // LCR in %
               if (LCR < liquidityThreshold_LCR.mul(100)) { out = Bool(false); }

               // Store results
               monthlyLCR.push({
                  month: month + 1,
                  cumulativeInflows: cumulativeInflows.toString(),
                  cumulativeOutflows: cumulativeOutflows.toString(),
                  cumulativeCashFlow: cumulativeCashFlow.toString(),
                  cumulativeHQLA: cumulativeHQLA.toString(),
                  LCR: LCR.toString()
               });

               //try {
               out.assertTrue('true');
               //} catch (error) {
               // console.error("Assertion failed:", error);
               //out = Bool(false);
               //}
            }

            console.log(monthlyLCR);

            //} catch (error) {
            //  console.error("Error in proveCompliance method:", error);
            //  out = Bool(false);
            //}

            return new liquidityratioDataPublicOutput({ out });
         }
      }
   }
});

export class LiquidityRatioProof extends ZkProgram.Proof(LiquidityRatioZkprogram) { }