import { Field, SmartContract, state, State, method, Bool, CircuitString, UInt64, Struct } from 'o1js';
import { EXIMOptimProof } from '../../../zk-programs/compliance/EXIMZKProgram.js';

// =================================== Verification Record Structure ===================================
export class EXIMVerificationRecord extends Struct({
   verificationIndex: Field,           // Index of this verification (1, 2, 3...)
   isCompliant: Bool,                  // Compliance status at this verification
   verificationTimestamp: UInt64,      // When this verification occurred
   complianceScore: Field,             // Compliance score (0-100)
   merkleRoot: Field,                  // Merkle root of the verification data
}) {}

// =================================== EXIM Single Company Contract ===================================
export class EXIMOptimSingleCompanySmartContract extends SmartContract {
   // =================================== Company Identity (Optimized for 8-field limit) ===================================
   @state(Field) companyIdentifierHash = State<Field>();          // Hash of IEC Code or Company ID
   @state(Field) companyNameHash = State<Field>();               // Hash of company legal name
   @state(Field) jurisdictionHash = State<Field>();              // Hash of jurisdiction of registration
   
   // =================================== Current Compliance Status ===================================
   @state(Bool) eximCompliant = State<Bool>();                        // Current compliance status
   @state(Field) currentComplianceScore = State<Field>();             // Current compliance score (0-100)
   @state(UInt64) lastVerificationTime = State<UInt64>();            // Most recent verification time
   
   // =================================== Verification History Tracking ===================================
   @state(Field) totalVerifications = State<Field>();                 // Total number of verifications
   @state(UInt64) firstVerificationTime = State<UInt64>();           // When first verified
   
   // =================================== NOTE: Removed fields to meet 8-field limit ===================================
   // ❌ @state(Field) verificationsMapRoot = State<Field>(); // REMOVED - can be computed off-chain
   // ❌ @state(UInt64) contractCreationTime = State<UInt64>(); // REMOVED - can use blockchain timestamp
   
   // =================================== NOTE: totalCompaniesVerified REMOVED ===================================
   // ❌ @state(Field) totalCompaniesVerified = State<Field>(); // REMOVED - meaningless for single company

   // =================================== Initialize Contract ===================================
   init() {
      super.init();
      
      // Company identity (empty initially - using zero hash for empty)
      this.companyIdentifierHash.set(Field(0));
      this.companyNameHash.set(Field(0));
      this.jurisdictionHash.set(Field(0));
      
      // Compliance status
      this.eximCompliant.set(Bool(false));
      this.currentComplianceScore.set(Field(0));
      this.lastVerificationTime.set(UInt64.from(0));
      
      // Verification history
      this.totalVerifications.set(Field(0));
      this.firstVerificationTime.set(UInt64.from(0));
   }

   // =================================== Enhanced Verification Method ===================================
   @method async verifyOptimizedComplianceWithProof(proof: EXIMOptimProof) {
      // Add required state preconditions for proper constraint generation
      this.companyIdentifierHash.requireEquals(this.companyIdentifierHash.get());
      this.totalVerifications.requireEquals(this.totalVerifications.get());
      this.firstVerificationTime.requireEquals(this.firstVerificationTime.get());
      this.eximCompliant.requireEquals(this.eximCompliant.get());
      
      // Get current state values
      const currentCompliantStatus = this.eximCompliant.get();
      const currentVerificationCount = this.totalVerifications.get();
      const currentCompanyIdHash = this.companyIdentifierHash.get();
      const currentFirstVerificationTime = this.firstVerificationTime.get();

      // =================================== Verify ZK Proof ===================================
      proof.verify();

      // =================================== Extract Proof Data ===================================
      const publicOutput = proof.publicOutput;
      const isCompliant = publicOutput.isEXIMCompliant;
      const verificationTimestamp = publicOutput.verification_timestamp;
      
      // Extract company identification from proof and hash them
      const proofCompanyId = publicOutput.iec;
      const proofCompanyName = publicOutput.entityName;
      const proofJurisdiction = CircuitString.fromString('India'); // Default for EXIM
      
      // Create hashes for comparison and storage
      const proofCompanyIdHash = proofCompanyId.hash();
      const proofCompanyNameHash = proofCompanyName.hash();
      const proofJurisdictionHash = proofJurisdiction.hash();

      // =================================== Company Identity Validation ===================================
      const emptyHash = Field(0);
      const isContractEmpty = currentCompanyIdHash.equals(emptyHash);
      const isFirstVerification = currentVerificationCount.equals(Field(0));
      
      // If first verification, set company identity
      // If not first verification, ensure it's the same company
      const isValidCompany = isContractEmpty.and(isFirstVerification).or(
         currentCompanyIdHash.equals(proofCompanyIdHash)
      );
      isValidCompany.assertTrue('Company identifier mismatch - this contract is for a different company');

      // =================================== Update Company Identity (First Time Only) ===================================
      // Set company identity hashes on first verification or keep existing
      this.companyIdentifierHash.set(proofCompanyIdHash);
      this.companyNameHash.set(proofCompanyNameHash);
      this.jurisdictionHash.set(proofJurisdictionHash);

      // =================================== Update Current Compliance State ===================================
      this.eximCompliant.set(isCompliant);
      
      // Calculate compliance score based on proof data (simplified)
      const complianceScore = isCompliant.toField().mul(100);
      this.currentComplianceScore.set(complianceScore);
      
      this.lastVerificationTime.set(verificationTimestamp);

      // =================================== Update Verification History ===================================
      const newVerificationCount = currentVerificationCount.add(1);
      this.totalVerifications.set(newVerificationCount);
      
      // Set first verification time if this is the first verification
      const shouldUseNewTime = isFirstVerification;
      const updatedFirstTime = shouldUseNewTime.toField().equals(Field(1))
        ? verificationTimestamp
        : currentFirstVerificationTime;
      this.firstVerificationTime.set(updatedFirstTime);

      // NOTE: verificationsMapRoot removed to meet o1js 8-field limit
      // Verification history can be tracked off-chain or via events
   }

   // =================================== Company Information Queries ===================================
   
   /**
    * Get complete company information and current status (returns hashes for privacy)
    */
   getCompanyInfo(): {
      companyIdentifierHash: Field;
      companyNameHash: Field;
      jurisdictionHash: Field;
      isCompliant: Bool;
      complianceScore: Field;
   } {
      // Add required state preconditions
      this.companyIdentifierHash.requireEquals(this.companyIdentifierHash.get());
      this.companyNameHash.requireEquals(this.companyNameHash.get());
      this.jurisdictionHash.requireEquals(this.jurisdictionHash.get());
      this.eximCompliant.requireEquals(this.eximCompliant.get());
      this.currentComplianceScore.requireEquals(this.currentComplianceScore.get());
      
      return {
         companyIdentifierHash: this.companyIdentifierHash.get(),
         companyNameHash: this.companyNameHash.get(),
         jurisdictionHash: this.jurisdictionHash.get(),
         isCompliant: this.eximCompliant.get(),
         complianceScore: this.currentComplianceScore.get()
      };
   }

   /**
    * Get current compliance status (most recent verification)
    */
   getCurrentCompliance(): {
      isCompliant: Bool;
      lastVerificationTime: UInt64;
      complianceScore: Field;
   } {
      // Add required state preconditions
      this.eximCompliant.requireEquals(this.eximCompliant.get());
      this.lastVerificationTime.requireEquals(this.lastVerificationTime.get());
      this.currentComplianceScore.requireEquals(this.currentComplianceScore.get());
      
      return {
         isCompliant: this.eximCompliant.get(),
         lastVerificationTime: this.lastVerificationTime.get(),
         complianceScore: this.currentComplianceScore.get()
      };
   }

   /**
    * Get verification statistics
    */
   getVerificationStats(): {
      totalVerifications: Field;
      firstVerificationTime: UInt64;
      lastVerificationTime: UInt64;
      hasBeenVerified: Bool;
   } {
      // Add required state preconditions
      this.totalVerifications.requireEquals(this.totalVerifications.get());
      this.firstVerificationTime.requireEquals(this.firstVerificationTime.get());
      this.lastVerificationTime.requireEquals(this.lastVerificationTime.get());
      
      const hasBeenVerified = this.totalVerifications.get().greaterThan(Field(0));
      
      return {
         totalVerifications: this.totalVerifications.get(),
         firstVerificationTime: this.firstVerificationTime.get(),
         lastVerificationTime: this.lastVerificationTime.get(),
         hasBeenVerified: hasBeenVerified
      };
   }

   /**
    * Check if a specific company is tracked by this contract (using hash comparison)
    */
   isTrackingCompany(expectedCompanyIdHash: Field): Bool {
      // Add required state precondition
      this.companyIdentifierHash.requireEquals(this.companyIdentifierHash.get());
      
      const currentCompanyIdHash = this.companyIdentifierHash.get();
      const emptyHash = Field(0);
      const hasCompany = currentCompanyIdHash.equals(emptyHash).not();
      return hasCompany.and(currentCompanyIdHash.equals(expectedCompanyIdHash));
   }

   // =================================== Company Name-Based Query Methods (Same as MultiCompany) ===================================
   
   /**
    * Check if a specific company is tracked by this contract (using company name)
    */
   isTrackingCompanyByName(companyName: CircuitString): Bool {
      // Add required state preconditions
      this.companyNameHash.requireEquals(this.companyNameHash.get());
      this.totalVerifications.requireEquals(this.totalVerifications.get());
      
      // Check if the provided company name hash matches the stored hash
      const providedNameHash = companyName.hash();
      const storedNameHash = this.companyNameHash.get();
      const emptyHash = Field(0);
      
      // Contract must have a company set (not empty) and name must match
      const hasCompany = storedNameHash.equals(emptyHash).not();
      const nameMatches = storedNameHash.equals(providedNameHash);
      
      return hasCompany.and(nameMatches);
   }

   /**
    * Check if a specific company is EXIM compliant by company name
    */
   isCompanyEXIMCompliant(companyName: CircuitString): Bool {
      // Add required state preconditions
      this.companyNameHash.requireEquals(this.companyNameHash.get());
      this.eximCompliant.requireEquals(this.eximCompliant.get());
      
      // Verify the company name matches the stored company
      const providedNameHash = companyName.hash();
      const storedNameHash = this.companyNameHash.get();
      providedNameHash.assertEquals(storedNameHash, 'Company name does not match the tracked company');
      
      // Return the compliance status
      return this.eximCompliant.get();
   }

   /**
    * Get company compliance info by name
    */
   getCompanyComplianceByName(companyName: CircuitString): {
      isTracked: Bool;
      isCompliant: Bool;
      complianceScore: Field;
      verificationCount: Field;
   } {
      // Add required state preconditions
      this.companyNameHash.requireEquals(this.companyNameHash.get());
      this.eximCompliant.requireEquals(this.eximCompliant.get());
      this.currentComplianceScore.requireEquals(this.currentComplianceScore.get());
      this.totalVerifications.requireEquals(this.totalVerifications.get());
      
      // Check if the provided company name hash matches the stored hash
      const providedNameHash = companyName.hash();
      const storedNameHash = this.companyNameHash.get();
      const emptyHash = Field(0);
      
      // Contract must have a company set (not empty) and name must match
      const hasCompany = storedNameHash.equals(emptyHash).not();
      const nameMatches = storedNameHash.equals(providedNameHash);
      const isTracked = hasCompany.and(nameMatches);
      
      return {
         isTracked,
         isCompliant: this.eximCompliant.get(),
         complianceScore: this.currentComplianceScore.get(),
         verificationCount: this.totalVerifications.get(),
      };
   }

   // =================================== Administrative Methods ===================================
   
   /**
    * Reset compliance status (admin function)
    */
   @method async resetCompliance() {
      // Add required state precondition
      this.eximCompliant.requireEquals(this.eximCompliant.get());
      
      this.eximCompliant.set(Bool(false));
      this.currentComplianceScore.set(Field(0));
   }

   /**
    * Reset entire contract for new company (admin function)
    * WARNING: This erases all history
    */
   @method async resetForNewCompany() {
      // Add required state preconditions
      this.companyIdentifierHash.requireEquals(this.companyIdentifierHash.get());
      this.totalVerifications.requireEquals(this.totalVerifications.get());
      
      // Reset company identity hashes
      this.companyIdentifierHash.set(Field(0));
      this.companyNameHash.set(Field(0));
      this.jurisdictionHash.set(Field(0));
      
      // Reset compliance
      this.eximCompliant.set(Bool(false));
      this.currentComplianceScore.set(Field(0));
      this.lastVerificationTime.set(UInt64.from(0));
      
      // Reset history
      this.totalVerifications.set(Field(0));
      this.firstVerificationTime.set(UInt64.from(0));
   }
}
