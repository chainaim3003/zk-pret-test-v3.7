
import { Bool, Field, SmartContract, state, State, method, CircuitString, Struct, FlexibleProvablePure, ZkProgram, Provable } from 'o1js';
import { BusinessStandardOptimProof } from '../../zk-programs/process/BusinessStandardZKProgram.js';


export class BusinessStandardOptimVerificationSmartContract extends SmartContract {
   @state(Field) risk = State<Field>(); // State variable to hold risk score
   // Initialize the contract state
   init() {
      super.init(); // Call the parent class initializer
      this.risk.set(Field(100)); // Set initial value of `risk` to 100
   }


   // Method to verify compliance and update state
   @method async verifyComplianceWithProof(proof: BusinessStandardOptimProof) {
      // Ensure the state of `risk` matches its current value
      this.risk.requireEquals(this.risk.get());
      const currentRisk = this.risk.get();

      // Verify the cryptographic proof
      proof.verify();
      
      // Get the boolean result from the proof (with explicit casting if needed)
      const publicOutput = proof.publicOutput;
      const result = (publicOutput as any).result as Bool;
      const evaluationId = (publicOutput as any).businessStandardDataIntegrityEvaluationId as Field;
      
      // Log the evaluation details
      Provable.asProver(() => {
         console.log('Evaluation ID:', evaluationId.toJSON(), 'Result:', result.toJSON());
      });
      
      // Only proceed if result is true
      result.assertTrue();

      // Update the state only if proof is valid and result is true
      const updatedRisk = currentRisk.sub(10);
      this.risk.set(updatedRisk);
   }

}
