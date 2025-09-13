import { Field, SmartContract, state, State, method, Bool, CircuitString, UInt64 } from 'o1js';
import { CorporateRegistrationOptimProof } from '../../../zk-programs/compliance/CorporateRegistrationZKProgram.js';

export class CorporateRegistrationOptimSmartContract extends SmartContract {
   // =================================== State Variables ===================================
   @state(Bool) corpRegCompliant = State<Bool>();           // Main compliance status
   @state(Field) totalVerifications = State<Field>();       // Count of verifications performed
   @state(UInt64) lastVerificationTime = State<UInt64>();   // Timestamp of last verification
   @state(Field) totalCompaniesVerified = State<Field>();   // Count of unique companies verified

   // =================================== Initialize Contract ===================================
   init() {
      super.init();
      this.corpRegCompliant.set(Bool(false));         // Start as non-compliant
      this.totalVerifications.set(Field(0));          // Zero verifications initially  
      this.lastVerificationTime.set(UInt64.from(0));  // No verification time
      this.totalCompaniesVerified.set(Field(0));      // Zero companies verified
   }

   // =================================== Main Verification Method ===================================
   @method async verifyOptimizedComplianceWithProof(proof: CorporateRegistrationOptimProof) {
      // Ensure the state values match their current values (following the working pattern)
      this.corpRegCompliant.requireEquals(this.corpRegCompliant.get());
      this.totalVerifications.requireEquals(this.totalVerifications.get());
      this.totalCompaniesVerified.requireEquals(this.totalCompaniesVerified.get());
      
      // Get current state values
      const currentCompliantStatus = this.corpRegCompliant.get();
      const currentVerificationCount = this.totalVerifications.get();
      const currentCompaniesCount = this.totalCompaniesVerified.get();

      // =================================== Verify ZK Proof ===================================
      proof.verify();

      // =================================== Extract Proof Data ===================================
      const publicOutput = proof.publicOutput;
      const isCompliant = publicOutput.isCorpRegCompliant;
      const verificationTimestamp = publicOutput.verification_timestamp;

      // =================================== Update Contract State ===================================
      // Update compliance status from proof result
      this.corpRegCompliant.set(isCompliant);
      
      // Increment verification counter
      const newVerificationCount = currentVerificationCount.add(1);
      this.totalVerifications.set(newVerificationCount);
      
      // Increment companies verified counter
      const newCompaniesCount = currentCompaniesCount.add(1);
      this.totalCompaniesVerified.set(newCompaniesCount);
      
      // Update last verification timestamp
      this.lastVerificationTime.set(verificationTimestamp);
   }

   // =================================== Query Methods (Non-@method for compatibility) ===================================
   
   /**
    * Get current compliance status
    */
   getComplianceStatus(): Bool {
      return this.corpRegCompliant.get();
   }

   /**
    * Get total number of verifications performed
    */
   getTotalVerifications(): Field {
      return this.totalVerifications.get();
   }

   /**
    * Get last verification timestamp
    */
   getLastVerificationTime(): UInt64 {
      return this.lastVerificationTime.get();
   }

   // =================================== Administrative Methods ===================================
   
   /**
    * Reset compliance status (admin function)
    */
   @method async resetCompliance() {
      this.corpRegCompliant.requireEquals(this.corpRegCompliant.get());
      this.corpRegCompliant.set(Bool(false));
   }

   /**
    * Reset all counters (admin function)
    */
   @method async resetCounters() {
      this.totalVerifications.requireEquals(this.totalVerifications.get());
      this.totalCompaniesVerified.requireEquals(this.totalCompaniesVerified.get());
      
      this.totalVerifications.set(Field(0));
      this.totalCompaniesVerified.set(Field(0));
      this.lastVerificationTime.set(UInt64.from(0));
   }
}
