import { Field, SmartContract, state, State, method , Bool,} from 'o1js';
import { LiquidityRatioProof } from '../../zk-programs/risk/StablecoinProofOfReservesRiskZKProgramWithSign.js';


export class LiquidityRatioVerifierSmartContract extends SmartContract {
   @state(Field) risk = State<Field>(); // State variable to hold a number
   @state(Bool) reservesProved = State<Bool>(); // State variable to hold a boolean value
   
   // Initialize the contract state
   init() {
      super.init(); // Call the parent class initializer
      this.risk.set(Field(100)); // Set initial value of `num` to 100
      this.reservesProved.set(Bool(false)); // Set initial value of `reservesProved` to false
   }



   // Method to verify compliance and update state
   @method async verifyComplianceWithProof(proof: LiquidityRatioProof) {


      // Ensure the state of `num` matches its current value
      this.risk.requireEquals(this.risk.get());
      const currentRisk = this.risk.get();

      proof.verify();
      const out = proof.publicOutput.out;
      //console.log("out from smart contract",out);                        
      out.assertTrue();

      // Update the state
      const updatedRisk = currentRisk.sub(10);
      this.risk.set(updatedRisk);
      
      this.reservesProved.set(Bool(true)); // Set reservesProved to true

   }
}


