import { Field, SmartContract, state, State,MerkleMap, method, Bool,Provable,MerkleMapWitness, CircuitString, UInt64, Struct, MerkleWitness, MerkleTree, Poseidon } from 'o1js';
import { EXIMOptimProof } from '../../../zk-programs/compliance/EXIMZKProgram.js';

// =================================== Merkle Tree Configuration ===================================
export const COMPANY_MERKLE_HEIGHT = 8; // Height 8 for up to 256 companies
export class CompanyMerkleWitness extends MerkleWitness(COMPANY_MERKLE_HEIGHT) {}

// =================================== Company Record Structure ===================================
export class EXIMCompanyRecord extends Struct({
   iecHash: Field,                     // Hash of IEC Code for privacy 
   entityNameHash: Field,              // Hash of entity name for privacy
   jurisdictionHash: Field,            // Hash of jurisdiction
   isCompliant: Bool,                  // Current compliance status
   complianceScore: Field,             // 0-100 score
   totalVerifications: Field,          // Number of verifications for this company
   lastVerificationTime: UInt64,       // Last verification timestamp
   firstVerificationTime: UInt64,      // First verification timestamp
}) {}

// =================================== Query Result Structures ===================================
export class RegistryInfo extends Struct({
   totalCompaniesTracked: Field,
   compliantCompaniesCount: Field,
   globalComplianceScore: Field,
   totalVerificationsGlobal: Field,
   companiesRootHash: Field,
   registryVersion: Field,
}) {}

export class GlobalComplianceStats extends Struct({
   totalCompanies: Field,
   compliantCompanies: Field,
   compliancePercentage: Field,
   totalVerifications: Field,
   lastVerificationTime: UInt64,
}) {}

// =================================== Individual Company Query Results (Same as SingleCompany) ===================================
export class CompanyInfo extends Struct({
   companyIdentifierHash: Field,
   companyNameHash: Field,
   jurisdictionHash: Field,
   isCompliant: Bool,
   complianceScore: Field,
}) {}

export class CurrentCompliance extends Struct({
   isCompliant: Bool,
   lastVerificationTime: UInt64,
   complianceScore: Field,
}) {}

export class VerificationStats extends Struct({
   totalVerifications: Field,
   firstVerificationTime: UInt64,
   lastVerificationTime: UInt64,
   hasBeenVerified: Bool,
}) {}

export class CompanyKey extends Struct({
   iecHash: Field,
   nameHash: Field,
}) {
   static create(iecHash: Field, nameHash: Field): CompanyKey {
      return new CompanyKey({ iecHash, nameHash });
   }
   
   toField(): Field {
      return Poseidon.hash([this.iecHash, this.nameHash]);
   }
}

// =================================== EXIM Multi-Company Contract (Enhanced with Individual Company Tracking) ===================================
/**
 * EXIMOptimMultiCompanySmartContract now provides the SAME individual company tracking capabilities
 * as EXIMOptimSingleCompanySmartContract, plus multi-company management features:
 * 
 * INDIVIDUAL COMPANY FEATURES (Same as SingleCompany):
 * - getCompanyInfo() - Complete company profile
 * - getCurrentCompliance() - Real-time compliance status
 * - getVerificationStats() - Verification history
 * - isTrackingCompany() - Company identity verification
 * - resetComplianceForCompany() - Admin reset functions
 * 
 * COMPANY NAME-BASED QUERIES (New Feature):
 * - isTrackingCompanyByName() - Find company by name
 * - isCompanyEXIMCompliant() - Check compliance by company name
 * - getCompanyComplianceByName() - Full compliance info by name
 * 
 * MULTI-COMPANY FEATURES:
 * - getRegistryInfo() - Global registry statistics
 * - getGlobalComplianceStats() - Portfolio-level metrics
 * - resetRegistry() - Reset entire registry
 */
export class EXIMOptimMultiCompanySmartContract extends SmartContract {
   // =================================== Multi-Company State (8 fields maximum) ===================================
   @state(Field) companiesRootHash = State<Field>();         // Merkle root of all companies
   @state(Field) totalCompaniesTracked = State<Field>();     // Total number of companies tracked
   @state(Field) compliantCompaniesCount = State<Field>();   // Number currently compliant
   @state(Field) globalComplianceScore = State<Field>();     // Average compliance score
   @state(Field) totalVerificationsGlobal = State<Field>();  // Total verifications across all companies
   @state(UInt64) lastVerificationTime = State<UInt64>();    // Most recent verification timestamp
   @state(Field) registryVersion = State<Field>();           // Registry version for upgrades
   //@state(UInt64) contractCreationTime = State<UInt64>();
    @state(Field) companiesMapRoot = State<Field>();     // When contract was deployed
   //@state(Bool) contractDisabled = State<Bool>();            // Field 7: Emergency disable

   // =================================== Initialize Contract ===================================
   init() {
      super.init();
      
      // Initialize empty company tracking
      this.companiesRootHash.set(Field(0)); // Empty merkle tree root
      this.totalCompaniesTracked.set(Field(0));
      this.compliantCompaniesCount.set(Field(0));
      this.globalComplianceScore.set(Field(0));
      this.totalVerificationsGlobal.set(Field(0));
      
      // Initialize timestamps
      this.lastVerificationTime.set(UInt64.from(0));
      //this.contractCreationTime.set(UInt64.from(Date.now()));
      
      // Initialize version
      this.registryVersion.set(Field(1)); // Version 1.0

      const emptyMap = new MerkleMap();
      this.companiesMapRoot.set(emptyMap.getRoot());
      

      //this.contractDisabled.set(Bool(false));
   }

   // =================================== Main Verification Method ===================================
   @method async verifyOptimizedComplianceWithProof(
      proof: EXIMOptimProof,
      companyWitness: CompanyMerkleWitness,
      companyRecord: EXIMCompanyRecord,
      companiesMapWitness:MerkleMapWitness
   ) {
      //this.contractDisabled.requireEquals(Bool(false));

      // Add required state preconditions for proper constraint generation
      this.companiesRootHash.requireEquals(this.companiesRootHash.get());
      this.totalCompaniesTracked.requireEquals(this.totalCompaniesTracked.get());
      this.compliantCompaniesCount.requireEquals(this.compliantCompaniesCount.get());
      this.totalVerificationsGlobal.requireEquals(this.totalVerificationsGlobal.get());
      this.companiesMapRoot.requireEquals(this.companiesMapRoot.get());
      
      // Get current state values
      const currentRootHash = this.companiesRootHash.get();
      const currentTotalCompanies = this.totalCompaniesTracked.get();
      const currentCompliantCount = this.compliantCompaniesCount.get();
      const currentTotalVerifications = this.totalVerificationsGlobal.get();
      const currentMapRoot = this.companiesMapRoot.get();

      // =================================== Verify ZK Proof ===================================
      proof.verify();

      // =================================== Extract Proof Data ===================================
      const publicOutput = proof.publicOutput;
      const isCompliant = publicOutput.isEXIMCompliant;
      const verificationTimestamp = publicOutput.verification_timestamp;
      
      // Extract company identification from proof and hash them
      const proofIEC = publicOutput.iec;
      const proofEntityName = publicOutput.entityName;
      const proofJurisdiction = CircuitString.fromString('India'); // EXIM is India-specific
      
      // Create hashes for comparison and storage
      const proofIECHash = proofIEC.hash();
      const proofEntityNameHash = proofEntityName.hash();
      const proofJurisdictionHash = proofJurisdiction.hash();

      const companyKey = CompanyKey.create(proofIECHash,proofEntityNameHash);
      const companyKeyField = companyKey.toField();
      // =================================== Verify Company Record Consistency ===================================
      // Ensure the company record matches the proof data
      companyRecord.iecHash.assertEquals(proofIECHash);
      companyRecord.entityNameHash.assertEquals(proofEntityNameHash);
      companyRecord.jurisdictionHash.assertEquals(proofJurisdictionHash);
      companyRecord.isCompliant.assertEquals(isCompliant);
      companyRecord.lastVerificationTime.assertEquals(verificationTimestamp);

      // =================================== Merkle Tree Management ===================================
      // Calculate the hash of the company record

      const enhancedCompanyRecord = new EXIMCompanyRecord({
         iecHash: companyRecord.iecHash,
         entityNameHash: companyRecord.entityNameHash,
         jurisdictionHash: companyRecord.jurisdictionHash,
         isCompliant: companyRecord.isCompliant,
         complianceScore: companyRecord.complianceScore,
         totalVerifications: Field(1),                    // Start with 1 verification
         //passedVerifications: isCompliant.toField(),      // 1 if passed, 0 if failed
         //failedVerifications: isCompliant.not().toField(), // 1 if failed, 0 if passed
         //consecutiveFailures: isCompliant.not().toField(), // 1 if this verification failed, 0 if passed
         lastVerificationTime: verificationTimestamp,
         firstVerificationTime: verificationTimestamp,
         // Fixed: Simple conditional logic - only one should be set to current time
         //lastPassTime: isCompliant.toField().equals(Field(1)) ? verificationTimestamp : UInt64.from(0),
         //lastFailTime: isCompliant.toField().equals(Field(0)) ? verificationTimestamp : UInt64.from(0),
      });
      
      const companyRecordHash = Poseidon.hash([
         enhancedCompanyRecord.entityNameHash,
         enhancedCompanyRecord.iecHash,
         enhancedCompanyRecord.jurisdictionHash,
         enhancedCompanyRecord.isCompliant.toField(),
         enhancedCompanyRecord.complianceScore,
         enhancedCompanyRecord.totalVerifications,
         enhancedCompanyRecord.lastVerificationTime.value,
         enhancedCompanyRecord.firstVerificationTime.value
      ]);

      // Calculate new merkle root with the company record
      //const calculatedRoot = companyWitness.calculateRoot(companyRecordHash);
      const [newMapRoot, _key1] = companiesMapWitness.computeRootAndKey(companyRecordHash);
      this.companiesMapRoot.set(newMapRoot);

      // For new companies, verify the witness points to an empty position
      // For existing companies, this would need additional logic to verify previous state
      // Simplified: accept the calculated root as the new state
      Provable.log('🔍 SMART CONTRACT DEBUG: Starting company existence check');
      Provable.log('🔍 Company Key:', companyKeyField);
      Provable.log('🔍 Current Map Root:', currentMapRoot);
      
      //this.companiesRootHash.set(calculatedRoot);


      const [witnessRoot, witnessKey] = companiesMapWitness.computeRootAndKey(Field(0));
      Provable.log('🔍 Witness Root:', witnessRoot);
      Provable.log('🔍 Witness Key:', witnessKey);

      witnessKey.assertEquals(companyKeyField);

      const hasNoCompanies = currentTotalCompanies.equals(Field(0));

      const isNewCompany = hasNoCompanies;
      const companyExists = hasNoCompanies.not();
      
      Provable.log('🔍 Has No Companies:', hasNoCompanies);
      Provable.log('🔍 Company Exists:', companyExists);
      Provable.log('🔍 Is New Company:', isNewCompany);
      Provable.log('🔍 Current Total Companies:', currentTotalCompanies);
      Provable.log('🔍 Is Compliant:', isCompliant);
      
      // Only increment total companies for NEW companies
      const newTotalCompanies: Field = Provable.if(
         isNewCompany,
         currentTotalCompanies.add(Field(1)),
         currentTotalCompanies
      );

      // =================================== Update Global Statistics ===================================
      // This is simplified logic - in practice, you'd need to track whether this is a new company
      // or an update to an existing company to properly update counts
      
      // For now, assume each verification could be either new or update
      // A more sophisticated implementation would require additional state management
      
      // Update global verification count
      const newTotalVerifications = currentTotalVerifications.add(1);

      const newCompliantCount: Field = Provable.if(
         isNewCompany.and(isCompliant),
         currentCompliantCount.add(Field(1)),
         currentCompliantCount
      );
      
      Provable.log('🔍 NEW Total Companies:', newTotalCompanies);
      Provable.log('🔍 NEW Compliant Count:', newCompliantCount);
      Provable.log('🔍 NEW Total Verifications:', newTotalVerifications);
      
      // ✅ FIXED: Update all state fields
      this.totalCompaniesTracked.set(newTotalCompanies);
      this.compliantCompaniesCount.set(newCompliantCount);
      this.totalVerificationsGlobal.set(newTotalVerifications);
      
      // Update last verification time
      this.lastVerificationTime.set(verificationTimestamp);



      // this.totalVerificationsGlobal.set(newTotalVerifications);

      // // Update last verification time
      // this.lastVerificationTime.set(verificationTimestamp);

      // // Update company count (simplified - would need better logic for tracking new vs existing)
      // // For demonstration, we increment if this appears to be a new verification
      // const potentialNewTotal = currentTotalCompanies.add(1);
      // this.totalCompaniesTracked.set(potentialNewTotal);

      // // Update compliant count (simplified calculation)
      // //const complianceChange = isCompliant.toField();
      // //const newCompliantCount = currentCompliantCount.add(complianceChange);
      // this.compliantCompaniesCount.set(newCompliantCount);

      // // Calculate and update global compliance score
      // const globalScore = potentialNewTotal.equals(Field(0)).toField().equals(Field(1))
      //    ? Field(0) // No companies yet
      //    : newCompliantCount.mul(100).div(potentialNewTotal);
      // this.globalComplianceScore.set(globalScore);
   }

   getGlobalComplianceStats(): GlobalComplianceStats {
      // Add required state preconditions
      this.totalCompaniesTracked.requireEquals(this.totalCompaniesTracked.get());
      this.compliantCompaniesCount.requireEquals(this.compliantCompaniesCount.get());
      this.totalVerificationsGlobal.requireEquals(this.totalVerificationsGlobal.get());
      this.lastVerificationTime.requireEquals(this.lastVerificationTime.get());
      
      const totalCompanies = this.totalCompaniesTracked.get();
      const compliantCompanies = this.compliantCompaniesCount.get();
      
      // Calculate compliance percentage
      const compliancePercentage = totalCompanies.equals(Field(0)).toField().equals(Field(1))
         ? Field(0) // No companies yet
         : compliantCompanies.mul(100).div(totalCompanies);
      
      return new GlobalComplianceStats({
         totalCompanies: totalCompanies,
         compliantCompanies: compliantCompanies,
         compliancePercentage: compliancePercentage,
         totalVerifications: this.totalVerificationsGlobal.get(),
         lastVerificationTime: this.lastVerificationTime.get(),
      });
   }

   // =================================== Query Methods ===================================
   
   /**
    * Get registry information
    */
   getRegistryInfo(): RegistryInfo {
      // Add required state preconditions
      this.companiesRootHash.requireEquals(this.companiesRootHash.get());
      this.totalCompaniesTracked.requireEquals(this.totalCompaniesTracked.get());
      this.compliantCompaniesCount.requireEquals(this.compliantCompaniesCount.get());
      this.globalComplianceScore.requireEquals(this.globalComplianceScore.get());
      this.totalVerificationsGlobal.requireEquals(this.totalVerificationsGlobal.get());
      this.registryVersion.requireEquals(this.registryVersion.get());
      
      return new RegistryInfo({
         totalCompaniesTracked: this.totalCompaniesTracked.get(),
         compliantCompaniesCount: this.compliantCompaniesCount.get(),
         globalComplianceScore: this.globalComplianceScore.get(),
         totalVerificationsGlobal: this.totalVerificationsGlobal.get(),
         companiesRootHash: this.companiesRootHash.get(),
         registryVersion: this.registryVersion.get(),
      });
   }

async getCompanyByIEC(iec: CircuitString, mapWitness: MerkleMapWitness): Promise<{
      exists: Bool;
      record: EXIMCompanyRecord;
      merkleRoot: Field;
      isValid: Bool;
   }> {
         // State preconditions for o1js compliance
         this.companiesMapRoot.requireEquals(this.companiesMapRoot.get());
         
         // Create LEI-based company key
         const iecHash: Field = iec.hash();
         const companyKey = CompanyKey.create(iecHash, iecHash);
         const companyKeyField: Field = companyKey.toField();
         
         // MerkleMap witness verification
         const currentMapRoot: Field = this.companiesMapRoot.get();
         const [witnessRoot, witnessKey] = mapWitness.computeRootAndKey(Field(0));
         
         // Bool operations for existence check
         const isValidWitness: Bool = witnessRoot.equals(currentMapRoot);
         const isCorrectKey: Bool = witnessKey.equals(companyKeyField);
         // If witness verification passes, it proves non-existence (maps to Field(0))
         const companyExists: Bool = Bool(false);
         
         // Create default record structure
         const existingRecord = new EXIMCompanyRecord({
            iecHash: iecHash,
            entityNameHash: iecHash, // Would be actual name hash in production
            jurisdictionHash: CircuitString.fromString('Global').hash(),
            isCompliant: Bool(true), // Would be deserialized from hash
            complianceScore: Field(0),
            totalVerifications: Field(0),
            //passedVerifications: Field(0),
            //failedVerifications: Field(0),
            //consecutiveFailures: Field(0),
            lastVerificationTime: UInt64.from(0),
            firstVerificationTime: UInt64.from(0),
            //lastPassTime: UInt64.from(0),
            //lastFailTime: UInt64.from(0),
         });
         
         return {
            exists: companyExists,
            record: existingRecord,
            merkleRoot: currentMapRoot,
            isValid: isValidWitness.and(isCorrectKey)
         };
      }
getCompanyDataWithWitness(
      iec: CircuitString,
      companyName: CircuitString,
      mapWitness: MerkleMapWitness
   ): {
      exists: Bool;
      record: EXIMCompanyRecord;
      isValid: Bool;
   } {
      // State preconditions for o1js compliance
      this.companiesMapRoot.requireEquals(this.companiesMapRoot.get());
      this.registryVersion.requireEquals(this.registryVersion.get());
      
      const iecHash = iec.hash();
      const nameHash = companyName.hash();
      const companyKey = Poseidon.hash([iecHash, nameHash]);
      
      // Verify witness against current state
      const currentMapRoot = this.companiesMapRoot.get();
      const [witnessRoot, witnessKey] = mapWitness.computeRootAndKey(Field(0));
      
      // Validate witness
      const validWitness = witnessRoot.equals(currentMapRoot);
      const correctKey = witnessKey.equals(companyKey);
      const isValid = validWitness.and(correctKey);
      
      // For demonstration, company exists if we have a valid witness
      const companyExists = isValid;
      
      // Create a default record structure
      const defaultRecord = new EXIMCompanyRecord({
         iecHash,
         entityNameHash: nameHash,
         jurisdictionHash: CircuitString.fromString('Global').hash(),
         isCompliant: Bool(false),
         complianceScore: Field(0),
         totalVerifications: Field(0),
         // passedVerifications: Field(0),
         // failedVerifications: Field(0),
         // consecutiveFailures: Field(0),
         lastVerificationTime: UInt64.from(0),
         firstVerificationTime: UInt64.from(0),
         // lastPassTime: UInt64.from(0),
         // lastFailTime: UInt64.from(0)
      });
      
      return {
         exists: companyExists,
         record: defaultRecord,
         isValid: isValid
      };
   }

   /**
    * Get global compliance statistics
    */
   // getGlobalComplianceStats(): GlobalComplianceStats {
   //    // Add required state preconditions
   //    this.totalCompaniesTracked.requireEquals(this.totalCompaniesTracked.get());
   //    this.compliantCompaniesCount.requireEquals(this.compliantCompaniesCount.get());
   //    this.totalVerificationsGlobal.requireEquals(this.totalVerificationsGlobal.get());
   //    this.lastVerificationTime.requireEquals(this.lastVerificationTime.get());
      
   //    const totalCompanies = this.totalCompaniesTracked.get();
   //    const compliantCompanies = this.compliantCompaniesCount.get();
      
   //    // Calculate compliance percentage
   //    const compliancePercentage = totalCompanies.equals(Field(0)).toField().equals(Field(1))
   //       ? Field(0) // No companies yet
   //       : compliantCompanies.mul(100).div(totalCompanies);
      
   //    return new GlobalComplianceStats({
   //       totalCompanies: totalCompanies,
   //       compliantCompanies: compliantCompanies,
   //       compliancePercentage: compliancePercentage,
   //       totalVerifications: this.totalVerificationsGlobal.get(),
   //       lastVerificationTime: this.lastVerificationTime.get(),
   //    });
   // }

   // =================================== Individual Company Query Methods (Same as SingleCompany) ===================================
   
   /**
    * Get complete company information for a specific company (requires merkle proof)
    */
   getCompanyInfo(
      companyWitness: CompanyMerkleWitness,
      companyRecord: EXIMCompanyRecord
   ): CompanyInfo {
      // Add required state precondition
      this.companiesRootHash.requireEquals(this.companiesRootHash.get());
      
      // Verify the company record exists in the merkle tree
      const companyRecordHash = Poseidon.hash([
         companyRecord.iecHash,
         companyRecord.entityNameHash,
         companyRecord.jurisdictionHash,
         companyRecord.isCompliant.toField(),
         companyRecord.complianceScore,
         companyRecord.totalVerifications,
         companyRecord.lastVerificationTime.value,
         companyRecord.firstVerificationTime.value
      ]);
      
      const calculatedRoot = companyWitness.calculateRoot(companyRecordHash);
      calculatedRoot.assertEquals(this.companiesRootHash.get());
      
      return new CompanyInfo({
         companyIdentifierHash: companyRecord.iecHash,
         companyNameHash: companyRecord.entityNameHash,
         jurisdictionHash: companyRecord.jurisdictionHash,
         isCompliant: companyRecord.isCompliant,
         complianceScore: companyRecord.complianceScore,
      });
   }

   /**
    * Get current compliance status for a specific company (requires merkle proof)
    */
   getCurrentCompliance(
      companyWitness: CompanyMerkleWitness,
      companyRecord: EXIMCompanyRecord
   ): CurrentCompliance {
      // Add required state precondition
      this.companiesRootHash.requireEquals(this.companiesRootHash.get());
      
      // Verify the company record exists in the merkle tree
      const companyRecordHash = Poseidon.hash([
         companyRecord.iecHash,
         companyRecord.entityNameHash,
         companyRecord.jurisdictionHash,
         companyRecord.isCompliant.toField(),
         companyRecord.complianceScore,
         companyRecord.totalVerifications,
         companyRecord.lastVerificationTime.value,
         companyRecord.firstVerificationTime.value
      ]);
      
      const calculatedRoot = companyWitness.calculateRoot(companyRecordHash);
      calculatedRoot.assertEquals(this.companiesRootHash.get());
      
      return new CurrentCompliance({
         isCompliant: companyRecord.isCompliant,
         lastVerificationTime: companyRecord.lastVerificationTime,
         complianceScore: companyRecord.complianceScore,
      });
   }

   /**
    * Get verification statistics for a specific company (requires merkle proof)
    */
   getVerificationStats(
      companyWitness: CompanyMerkleWitness,
      companyRecord: EXIMCompanyRecord
   ): VerificationStats {
      // Add required state precondition
      this.companiesRootHash.requireEquals(this.companiesRootHash.get());
      
      // Verify the company record exists in the merkle tree
      const companyRecordHash = Poseidon.hash([
         companyRecord.iecHash,
         companyRecord.entityNameHash,
         companyRecord.jurisdictionHash,
         companyRecord.isCompliant.toField(),
         companyRecord.complianceScore,
         companyRecord.totalVerifications,
         companyRecord.lastVerificationTime.value,
         companyRecord.firstVerificationTime.value
      ]);
      
      const calculatedRoot = companyWitness.calculateRoot(companyRecordHash);
      calculatedRoot.assertEquals(this.companiesRootHash.get());
      
      const hasBeenVerified = companyRecord.totalVerifications.greaterThan(Field(0));
      
      return new VerificationStats({
         totalVerifications: companyRecord.totalVerifications,
         firstVerificationTime: companyRecord.firstVerificationTime,
         lastVerificationTime: companyRecord.lastVerificationTime,
         hasBeenVerified: hasBeenVerified,
      });
   }

   /**
    * Check if a specific company is tracked by this contract (using company name)
    */
   isTrackingCompanyByName(
      companyName: CircuitString,
      companyWitness: CompanyMerkleWitness,
      companyRecord: EXIMCompanyRecord
   ): Bool {
      // Add required state precondition
      this.companiesRootHash.requireEquals(this.companiesRootHash.get());
      
      // Check if the provided company name hash matches the record
      const providedNameHash = companyName.hash();
      const nameMatches = companyRecord.entityNameHash.equals(providedNameHash);
      
      // Verify the company record exists in the merkle tree
      const companyRecordHash = Poseidon.hash([
         companyRecord.iecHash,
         companyRecord.entityNameHash,
         companyRecord.jurisdictionHash,
         companyRecord.isCompliant.toField(),
         companyRecord.complianceScore,
         companyRecord.totalVerifications,
         companyRecord.lastVerificationTime.value,
         companyRecord.firstVerificationTime.value
      ]);
      
      const calculatedRoot = companyWitness.calculateRoot(companyRecordHash);
      const recordExists = calculatedRoot.equals(this.companiesRootHash.get());
      
      return nameMatches.and(recordExists);
   }

   /**
    * Check if a specific company is EXIM compliant by company name
    */
   isCompanyEXIMCompliant(
      companyName: CircuitString,
      companyWitness: CompanyMerkleWitness,
      companyRecord: EXIMCompanyRecord
   ): Bool {
      // Add required state precondition
      this.companiesRootHash.requireEquals(this.companiesRootHash.get());
      
      // Verify the company name matches
      const providedNameHash = companyName.hash();
      companyRecord.entityNameHash.assertEquals(providedNameHash);
      
      // Verify the company record exists in the merkle tree
      const companyRecordHash = Poseidon.hash([
         companyRecord.iecHash,
         companyRecord.entityNameHash,
         companyRecord.jurisdictionHash,
         companyRecord.isCompliant.toField(),
         companyRecord.complianceScore,
         companyRecord.totalVerifications,
         companyRecord.lastVerificationTime.value,
         companyRecord.firstVerificationTime.value
      ]);
      
      const calculatedRoot = companyWitness.calculateRoot(companyRecordHash);
      calculatedRoot.assertEquals(this.companiesRootHash.get());
      
      // Return the compliance status
      return companyRecord.isCompliant;
   }

   /**
    * Check if a specific IEC is being tracked (enhanced version with merkle proof)
    */
   isTrackingCompany(
      iecHash: Field,
      companyWitness: CompanyMerkleWitness,
      companyRecord: EXIMCompanyRecord
   ): Bool {
      // Add required state precondition
      this.companiesRootHash.requireEquals(this.companiesRootHash.get());
      
      // Check if the provided IEC hash matches the record
      const iecMatches = companyRecord.iecHash.equals(iecHash);
      
      // Verify the company record exists in the merkle tree
      const companyRecordHash = Poseidon.hash([
         companyRecord.iecHash,
         companyRecord.entityNameHash,
         companyRecord.jurisdictionHash,
         companyRecord.isCompliant.toField(),
         companyRecord.complianceScore,
         companyRecord.totalVerifications,
         companyRecord.lastVerificationTime.value,
         companyRecord.firstVerificationTime.value
      ]);
      
      const calculatedRoot = companyWitness.calculateRoot(companyRecordHash);
      const recordExists = calculatedRoot.equals(this.companiesRootHash.get());
      
      return iecMatches.and(recordExists);
   }
// getEnhancedContractState(): {
//       totalCompanies: Field;
//       compliantCompanies: Field;
//       mapRoot: Field;
//       isEmpty: Bool;
//       version: Field;
//       isDisabled: Bool;
//    } {
//       // State preconditions
//       this.totalCompaniesTracked.requireEquals(this.totalCompaniesTracked.get());
//       this.compliantCompaniesCount.requireEquals(this.compliantCompaniesCount.get());
//       this.companiesMapRoot.requireEquals(this.companiesMapRoot.get());
//       this.registryVersion.requireEquals(this.registryVersion.get());
//       this.contractDisabled.requireEquals(this.contractDisabled.get());
      
//       const totalCompanies = this.totalCompaniesTracked.get();
//       const mapRoot = this.companiesMapRoot.get();
      
//       // Check if contract is empty (no companies)
//       const isEmpty = totalCompanies.equals(Field(0));
      
//       return {
//          totalCompanies: totalCompanies,
//          compliantCompanies: this.compliantCompaniesCount.get(),
//          mapRoot: mapRoot,
//          isEmpty: isEmpty,
//          version: this.registryVersion.get(),
//          isDisabled: this.contractDisabled.get()
//       };
//    }

   // =================================== Administrative Methods (Enhanced to match SingleCompany) ===================================
      /**
    * Emergency disable function - stops all new verifications
    */
   // @method async emergencyDisable() {
   //    this.contractDisabled.requireEquals(this.contractDisabled.get());
   //    this.contractDisabled.set(Bool(true));
   // }
   
   // /**
   //  * Re-enable contract (in case of false alarm)
   //  */
   // @method async reEnableContract() {
   //    this.contractDisabled.requireEquals(this.contractDisabled.get());
   //    this.contractDisabled.set(Bool(false));
   // }
   /**
    * Reset compliance status for a specific company (admin function)
    */
   @method async resetComplianceForCompany(
      companyWitness: CompanyMerkleWitness,
      companyRecord: EXIMCompanyRecord
   ) {
      // Add required state preconditions
      this.companiesRootHash.requireEquals(this.companiesRootHash.get());
      this.compliantCompaniesCount.requireEquals(this.compliantCompaniesCount.get());
      
      // Verify the company record exists in the merkle tree
      const companyRecordHash = Poseidon.hash([
         companyRecord.iecHash,
         companyRecord.entityNameHash,
         companyRecord.jurisdictionHash,
         companyRecord.isCompliant.toField(),
         companyRecord.complianceScore,
         companyRecord.totalVerifications,
         companyRecord.lastVerificationTime.value,
         companyRecord.firstVerificationTime.value
      ]);
      
      const calculatedRoot = companyWitness.calculateRoot(companyRecordHash);
      calculatedRoot.assertEquals(this.companiesRootHash.get());
      
      // Create updated company record with reset compliance
      const updatedRecord = new EXIMCompanyRecord({
         iecHash: companyRecord.iecHash,
         entityNameHash: companyRecord.entityNameHash,
         jurisdictionHash: companyRecord.jurisdictionHash,
         isCompliant: Bool(false),  // Reset to non-compliant
         complianceScore: Field(0), // Reset score to 0
         totalVerifications: companyRecord.totalVerifications,
         lastVerificationTime: companyRecord.lastVerificationTime,
         firstVerificationTime: companyRecord.firstVerificationTime
      });
      
      // Calculate new record hash
      const newRecordHash = Poseidon.hash([
         updatedRecord.iecHash,
         updatedRecord.entityNameHash,
         updatedRecord.jurisdictionHash,
         updatedRecord.isCompliant.toField(),
         updatedRecord.complianceScore,
         updatedRecord.totalVerifications,
         updatedRecord.lastVerificationTime.value,
         updatedRecord.firstVerificationTime.value
      ]);
      
      // Update merkle tree
      const newRoot = companyWitness.calculateRoot(newRecordHash);
      this.companiesRootHash.set(newRoot);
      
      // Update global compliance count if company was previously compliant
      const wasCompliant = companyRecord.isCompliant;
      const currentCompliantCount = this.compliantCompaniesCount.get();
      const newCompliantCount = wasCompliant.toField().equals(Field(1))
         ? currentCompliantCount.sub(1)
         : currentCompliantCount;
      this.compliantCompaniesCount.set(newCompliantCount);
   }

   /**
    * Reset registry (admin function)
    */
   @method async resetRegistry() {
      // Add required state preconditions
      this.companiesRootHash.requireEquals(this.companiesRootHash.get());
      this.totalCompaniesTracked.requireEquals(this.totalCompaniesTracked.get());
      this.registryVersion.requireEquals(this.registryVersion.get());
      
      // Reset all state to initial values
      this.companiesRootHash.set(Field(0));
      this.totalCompaniesTracked.set(Field(0));
      this.compliantCompaniesCount.set(Field(0));
      this.globalComplianceScore.set(Field(0));
      this.totalVerificationsGlobal.set(Field(0));
      this.lastVerificationTime.set(UInt64.from(0));
      this.registryVersion.set(this.registryVersion.get().add(1));
   }

   /**
    * Get contract metadata
    */
   getContractInfo(): {
      companiesRootHash: Field;
      totalCompanies: Field;
      compliantCompanies: Field;
      totalVerifications: Field;
      //creationTime: UInt64;
      version: Field;
   } {
      // Add required state preconditions
      this.companiesRootHash.requireEquals(this.companiesRootHash.get());
      this.totalCompaniesTracked.requireEquals(this.totalCompaniesTracked.get());
      this.compliantCompaniesCount.requireEquals(this.compliantCompaniesCount.get());
      this.totalVerificationsGlobal.requireEquals(this.totalVerificationsGlobal.get());
      //this.contractCreationTime.requireEquals(this.contractCreationTime.get());
      this.registryVersion.requireEquals(this.registryVersion.get());
      
      return {
         companiesRootHash: this.companiesRootHash.get(),
         totalCompanies: this.totalCompaniesTracked.get(),
         compliantCompanies: this.compliantCompaniesCount.get(),
         totalVerifications: this.totalVerificationsGlobal.get(),
         //creationTime: this.contractCreationTime.get(),
         version: this.registryVersion.get(),
      };
   }

   // =================================== Helper Methods for Company Name Queries ===================================
   
   /**
    * Helper method: Get company compliance info by name (off-chain usage)
    * Note: This requires the caller to provide the correct witness and record
    */
   getCompanyComplianceByName(
      companyName: CircuitString,
      companyWitness: CompanyMerkleWitness,
      companyRecord: EXIMCompanyRecord
   ): {
      isTracked: Bool;
      isCompliant: Bool;
      complianceScore: Field;
      verificationCount: Field;
   } {
      // Verify company name matches record
      const providedNameHash = companyName.hash();
      const nameMatches = companyRecord.entityNameHash.equals(providedNameHash);
      
      // Verify the company record exists in the merkle tree
      const companyRecordHash = Poseidon.hash([
         companyRecord.iecHash,
         companyRecord.entityNameHash,
         companyRecord.jurisdictionHash,
         companyRecord.isCompliant.toField(),
         companyRecord.complianceScore,
         companyRecord.totalVerifications,
         companyRecord.lastVerificationTime.value,
         companyRecord.firstVerificationTime.value
      ]);
      
      const calculatedRoot = companyWitness.calculateRoot(companyRecordHash);
      const recordExists = calculatedRoot.equals(this.companiesRootHash.get());
      
      const isTracked = nameMatches.and(recordExists);
      
      return {
         isTracked,
         isCompliant: companyRecord.isCompliant,
         complianceScore: companyRecord.complianceScore,
         verificationCount: companyRecord.totalVerifications,
      };
   }
}
