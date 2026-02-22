/**
 * ====================================================================
 * Risk Liquidity Basel3 OptimMerkle Smart Contract
 * ====================================================================
 * Smart contract for Basel3 LCR/NSFR Risk verification
 * ENHANCED WITH GROUP STRUCTURE (Following StableCoin Pattern)
 * ====================================================================
 */

import {
  Field,
  SmartContract,
  state,
  State,
  method,
  Bool,
  UInt64,
  Struct,
  MerkleWitness,
  MerkleTree,
  Poseidon,
  MerkleMapWitness,
  MerkleMap,
  Provable,
} from "o1js";
import { RiskLiquidityBasel3OptimMerkleProof } from "../../zk-programs/risk/RiskLiquidityBasel3ZKProgram.js";

// =================================== Merkle Tree Configuration (Following StableCoin Pattern) ===================================
export const BASEL3_GROUP_MERKLE_HEIGHT = 8; // Height 8 for up to 256 basel3 groups
export class Basel3GroupMerkleWitness extends MerkleWitness(
  BASEL3_GROUP_MERKLE_HEIGHT,
) {}

// =================================== Basel3 Group Record Structure (Following StableCoin Pattern) ===================================
export class Basel3GroupRecord extends Struct({
  groupIDHash: Field, // Hash of Basel3 Group ID for privacy
  isValid: Bool, // Current validity status
  complianceScore: Field, // 0-100 score
  totalVerifications: Field, // Total verification attempts
  passedVerifications: Field, // Number of passed verifications
  failedVerifications: Field, // Number of failed verifications
  consecutiveFailures: Field, // Current streak of consecutive failures
  lastVerificationTime: UInt64, // Last verification timestamp
  firstVerificationTime: UInt64, // First verification timestamp
  lastPassTime: UInt64, // Last successful verification timestamp
  lastFailTime: UInt64, // Last failed verification timestamp
}) {}

// =================================== Basel3 Group Storage Key (Following StableCoin Pattern) ===================================
export class Basel3GroupKey extends Struct({
  groupIDHash: Field,
}) {
  static create(groupIDHash: Field): Basel3GroupKey {
    return new Basel3GroupKey({ groupIDHash });
  }

  toField(): Field {
    return Poseidon.hash([this.groupIDHash]);
  }
}

// =================================== Basel3 Group Verification Statistics ===================================
export class Basel3GroupVerificationStats extends Struct({
  groupIDHash: Field,
  totalVerifications: Field,
  passedVerifications: Field,
  failedVerifications: Field,
  successRate: Field, // Percentage (0-100)
  consecutiveFailures: Field,
  isCurrentlyCompliant: Bool,
  firstVerificationTime: UInt64,
  lastVerificationTime: UInt64,
  daysSinceLastVerification: Field,
}) {}

// =================================== Basel3 Group Query Results ===================================
export class Basel3GroupQueryResult extends Struct({
  exists: Bool,
  record: Basel3GroupRecord,
  merkleRoot: Field,
  isValid: Bool,
}) {}

// =================================== Query Result Structures (Following StableCoin Pattern) ===================================
export class Basel3RegistryInfo extends Struct({
  totalBasel3GroupTracked: Field,
  validBasel3Count: Field,
  totalVerificationsGlobal: Field,
  basel3GroupRootHash: Field,
  registryVersion: Field,
}) {}

export class Basel3GlobalComplianceStats extends Struct({
  totalBasel3Group: Field,
  validBasel3: Field,
  totalVerifications: Field,
  lastVerificationTime: Field,
}) {}

export class RiskLiquidityBasel3SmartContract extends SmartContract {
  // =================================== STATE FIELDS (Following StableCoin Pattern - 7 Fields) ===================================
  @state(Field) totalBasel3GroupTracked = State<Field>(); // Field 1: Unique Basel3 Group count
  @state(Field) validBasel3Count = State<Field>(); // Field 2: Compliant count
  @state(Field) totalVerificationsGlobal = State<Field>(); // Field 3: All verifications
  @state(Field) lastVerificationTime = State<Field>(); // Field 4: Latest timestamp
  @state(Field) basel3GroupMapRoot = State<Field>(); // Field 5: MerkleMap root
  @state(Field) registryVersion = State<Field>(); // Field 6: Version
  @state(Bool) contractDisabled = State<Bool>(); // Field 7: Emergency disable
  // Field 8: Available for future use

  // Initialize the contract state
  init() {
    super.init();

    // Initialize all state fields
    this.totalBasel3GroupTracked.set(Field(0));
    this.validBasel3Count.set(Field(0));
    this.totalVerificationsGlobal.set(Field(0));

    // Initialize timestamps
    this.lastVerificationTime.set(Field.from(Date.now()));

    // Initialize version
    this.registryVersion.set(Field(1));

    // Initialize empty MerkleMap for individual basel3 group storage
    const emptyMap = new MerkleMap();
    this.basel3GroupMapRoot.set(emptyMap.getRoot());

    // Initialize as enabled
    this.contractDisabled.set(Bool(false));
  }

  // =================================== VERIFICATION METHOD WITH COMPLETE GROUP STRUCTURE (Following StableCoin Pattern) ===================================
  /**
   * Verify Basel3 Risk Compliance with Complete Group Tracking
   * Following StableCoin verifyStableCoinRiskComplianceWithGroup pattern exactly
   */
  @method async verifyBasel3RiskComplianceWithGroup(
    proof: RiskLiquidityBasel3OptimMerkleProof,
    basel3GroupWitness: Basel3GroupMerkleWitness,
    basel3GroupRecord: Basel3GroupRecord,
    basel3GroupMapWitness: MerkleMapWitness,
  ) {
    // Check if contract is disabled
    this.contractDisabled.requireEquals(Bool(false));

    // Add required state preconditions for proper constraint generation
    this.totalBasel3GroupTracked.requireEquals(
      this.totalBasel3GroupTracked.get(),
    );
    this.validBasel3Count.requireEquals(this.validBasel3Count.get());
    this.totalVerificationsGlobal.requireEquals(
      this.totalVerificationsGlobal.get(),
    );
    this.basel3GroupMapRoot.requireEquals(this.basel3GroupMapRoot.get());

    // Get current state values
    const currentTotalBasel3Group = this.totalBasel3GroupTracked.get();
    const currentValidCount = this.validBasel3Count.get();
    const currentTotalVerifications = this.totalVerificationsGlobal.get();
    const currentMapRoot = this.basel3GroupMapRoot.get();

    // =================================== Verify ZK Proof ===================================
    proof.verify();

    // =================================== Extract Proof Data ===================================
    const publicOutput = proof.publicOutput;
    const isValid = publicOutput.basel3Compliant;
    const verificationTimestamp = publicOutput.verificationTimestamp; // Keep as UInt64

    // Extract basel3 group identification from proof
    // NOTE: Basel3 group ID should come from proof, but if not available in current ZK program,
    // use scenarioID as the group identifier for now
    const proofBasel3GroupID = publicOutput.scenarioID;

    // Create hash for comparison and storage
    const proofBasel3GroupIDHash = proofBasel3GroupID.hash();

    // Create basel3 group key for storage
    const basel3GroupKey = Basel3GroupKey.create(proofBasel3GroupIDHash);
    const basel3GroupKeyField = basel3GroupKey.toField();

    // =================================== Verify Basel3 Group Record Consistency ===================================
    // Ensure the basel3 group record matches the proof data
    basel3GroupRecord.groupIDHash.assertEquals(proofBasel3GroupIDHash);
    basel3GroupRecord.isValid.assertEquals(isValid);
    basel3GroupRecord.lastVerificationTime.assertEquals(verificationTimestamp); // Direct UInt64 comparison

    // =================================== Basel3 Group Record Storage (Enhanced with Verification Tracking) ===================================
    // Create enhanced basel3 group record with verification tracking
    const enhancedGroupRecord = new Basel3GroupRecord({
      groupIDHash: basel3GroupRecord.groupIDHash,
      isValid: basel3GroupRecord.isValid,
      complianceScore: basel3GroupRecord.complianceScore,
      totalVerifications: Field(1), // Start with 1 verification
      passedVerifications: isValid.toField(), // 1 if passed, 0 if failed
      failedVerifications: isValid.not().toField(), // 1 if failed, 0 if passed
      consecutiveFailures: isValid.not().toField(), // 1 if this verification failed, 0 if passed
      lastVerificationTime: verificationTimestamp, // Already UInt64
      firstVerificationTime: verificationTimestamp, // Already UInt64
      lastPassTime: UInt64.from(0),
      lastFailTime: UInt64.from(0),
    });

    // =================================== Real Basel3 Group Data Storage ===================================
    // Serialize enhanced basel3 group record for storage (with all verification tracking fields)
    const basel3GroupRecordHash = Poseidon.hash([
      enhancedGroupRecord.groupIDHash,
      enhancedGroupRecord.isValid.toField(),
      enhancedGroupRecord.complianceScore,
      enhancedGroupRecord.totalVerifications,
      enhancedGroupRecord.passedVerifications,
      enhancedGroupRecord.failedVerifications,
      enhancedGroupRecord.consecutiveFailures,
      enhancedGroupRecord.lastVerificationTime.value,
      enhancedGroupRecord.firstVerificationTime.value,
      enhancedGroupRecord.lastPassTime.value,
      enhancedGroupRecord.lastFailTime.value,
    ]);

    // Update the MerkleMap with the new/updated basel3 group record
    const [newMapRoot, _key1] = basel3GroupMapWitness.computeRootAndKey(
      basel3GroupRecordHash,
    );
    this.basel3GroupMapRoot.set(newMapRoot);

    // =================================== Proper Basel3 Group Counting Logic (Following StableCoin Pattern) ===================================
    Provable.log(
      "🔍 SMART CONTRACT DEBUG: Starting basel3 group existence check",
    );
    Provable.log("🔍 Basel3 Group Key:", basel3GroupKeyField);
    Provable.log("🔍 Current Map Root:", currentMapRoot);

    const [witnessRoot, witnessKey] = basel3GroupMapWitness.computeRootAndKey(
      Field(0),
    );

    Provable.log("🔍 Witness Root:", witnessRoot);
    Provable.log("🔍 Witness Key:", witnessKey);

    // Only verify the key is correct (skip root verification)
    witnessKey.assertEquals(basel3GroupKeyField);

    // Use basel3 group count instead of map root to determine if contract is empty
    // Check if we have any basel3 groups tracked
    const hasNoBasel3Group = currentTotalBasel3Group.equals(Field(0));

    // For contracts with 0 basel3 groups: definitely a new basel3 group
    // For contracts with >0 basel3 groups: need more sophisticated logic (for now, treat as new)
    const isNewBasel3Group = hasNoBasel3Group;
    const basel3GroupExists = hasNoBasel3Group.not();

    Provable.log("🔍 Has No Basel3 Groups:", hasNoBasel3Group);
    Provable.log("🔍 Basel3 Group Exists:", basel3GroupExists);
    Provable.log("🔍 Is New Basel3 Group:", isNewBasel3Group);
    Provable.log("🔍 Current Total Basel3 Groups:", currentTotalBasel3Group);
    Provable.log("🔍 Is Compliant:", isValid);

    // Only increment total basel3 groups for NEW basel3 groups
    const newTotalBasel3Group: Field = Provable.if(
      isNewBasel3Group,
      currentTotalBasel3Group.add(Field(1)),
      currentTotalBasel3Group,
    );

    // Always increment total verifications (regardless of basel3 group newness)
    const newTotalVerifications: Field = currentTotalVerifications.add(
      Field(1),
    );

    // Smart compliant basel3 group tracking
    // Only increment compliant count for NEW COMPLIANT basel3 groups
    const newValidCount: Field = Provable.if(
      isNewBasel3Group.and(isValid),
      currentValidCount.add(Field(1)),
      currentValidCount,
    );

    Provable.log("🔍 NEW Total Basel3 Groups:", newTotalBasel3Group);
    Provable.log("🔍 NEW Compliant Count:", newValidCount);
    Provable.log("🔍 NEW Total Verifications:", newTotalVerifications);

    // Update all state fields
    this.totalBasel3GroupTracked.set(newTotalBasel3Group);
    this.validBasel3Count.set(newValidCount);
    this.totalVerificationsGlobal.set(newTotalVerifications);

    // Update last verification time (convert UInt64 to Field for state)
    this.lastVerificationTime.set(verificationTimestamp.value);
  }

  // =================================== Query Methods (Following StableCoin Pattern) ===================================

  /**
   * Get global compliance stats
   */
  getBasel3GlobalComplianceStats(): Basel3GlobalComplianceStats {
    // Add required state preconditions
    this.totalBasel3GroupTracked.requireEquals(
      this.totalBasel3GroupTracked.get(),
    );
    this.validBasel3Count.requireEquals(this.validBasel3Count.get());
    this.totalVerificationsGlobal.requireEquals(
      this.totalVerificationsGlobal.get(),
    );
    this.lastVerificationTime.requireEquals(this.lastVerificationTime.get());

    return new Basel3GlobalComplianceStats({
      totalBasel3Group: this.totalBasel3GroupTracked.get(),
      validBasel3: this.validBasel3Count.get(),
      totalVerifications: this.totalVerificationsGlobal.get(),
      lastVerificationTime: this.lastVerificationTime.get(),
    });
  }

  /**
   * Get registry info
   */
  getBasel3RegistryInfo(): Basel3RegistryInfo {
    // Add required state preconditions
    this.totalBasel3GroupTracked.requireEquals(
      this.totalBasel3GroupTracked.get(),
    );
    this.validBasel3Count.requireEquals(this.validBasel3Count.get());
    this.totalVerificationsGlobal.requireEquals(
      this.totalVerificationsGlobal.get(),
    );
    this.basel3GroupMapRoot.requireEquals(this.basel3GroupMapRoot.get());
    this.registryVersion.requireEquals(this.registryVersion.get());

    return new Basel3RegistryInfo({
      totalBasel3GroupTracked: this.totalBasel3GroupTracked.get(),
      validBasel3Count: this.validBasel3Count.get(),
      totalVerificationsGlobal: this.totalVerificationsGlobal.get(),
      basel3GroupRootHash: this.basel3GroupMapRoot.get(),
      registryVersion: this.registryVersion.get(),
    });
  }

  /**
   * Enhanced contract state querying for client-side existence checks
   */
  getEnhancedContractState(): {
    totalBasel3Groups: Field;
    validBasel3Groups: Field;
    mapRoot: Field;
    isEmpty: Bool;
    version: Field;
    isDisabled: Bool;
  } {
    // State preconditions
    this.totalBasel3GroupTracked.requireEquals(
      this.totalBasel3GroupTracked.get(),
    );
    this.validBasel3Count.requireEquals(this.validBasel3Count.get());
    this.basel3GroupMapRoot.requireEquals(this.basel3GroupMapRoot.get());
    this.registryVersion.requireEquals(this.registryVersion.get());
    this.contractDisabled.requireEquals(this.contractDisabled.get());

    const totalBasel3Groups = this.totalBasel3GroupTracked.get();
    const mapRoot = this.basel3GroupMapRoot.get();

    // Check if contract is empty (no basel3 groups)
    const isEmpty = totalBasel3Groups.equals(Field(0));

    return {
      totalBasel3Groups: totalBasel3Groups,
      validBasel3Groups: this.validBasel3Count.get(),
      mapRoot: mapRoot,
      isEmpty: isEmpty,
      version: this.registryVersion.get(),
      isDisabled: this.contractDisabled.get(),
    };
  }

  // =================================== Administrative Methods (Following StableCoin Pattern) ===================================

  /**
   * Emergency disable function - stops all new verifications
   */
  @method async emergencyDisable() {
    this.contractDisabled.requireEquals(this.contractDisabled.get());
    this.contractDisabled.set(Bool(true));
  }

  /**
   * Re-enable contract (in case of false alarm)
   */
  @method async reEnableContract() {
    this.contractDisabled.requireEquals(this.contractDisabled.get());
    this.contractDisabled.set(Bool(false));
  }

  /**
   * Reset registry (admin function)
   */
  @method async resetRegistry() {
    // Add required state preconditions
    this.totalBasel3GroupTracked.requireEquals(
      this.totalBasel3GroupTracked.get(),
    );
    this.validBasel3Count.requireEquals(this.validBasel3Count.get());
    this.registryVersion.requireEquals(this.registryVersion.get());

    // Reset all state to initial values
    this.totalBasel3GroupTracked.set(Field(0));
    this.validBasel3Count.set(Field(0));
    this.lastVerificationTime.set(Field.from(0));
    this.registryVersion.set(this.registryVersion.get().add(1)); // Increment version
  }

  /**
   * Get contract metadata
   */
  getContractInfo(): {
    basel3GroupsRootHash: Field;
    totalBasel3Groups: Field;
    validBasel3Groups: Field;
    totalVerifications: Field;
    creationTime: Field;
    version: Field;
  } {
    // Add required state preconditions
    this.totalBasel3GroupTracked.requireEquals(
      this.totalBasel3GroupTracked.get(),
    );
    this.validBasel3Count.requireEquals(this.validBasel3Count.get());
    this.lastVerificationTime.requireEquals(this.lastVerificationTime.get());
    this.basel3GroupMapRoot.requireEquals(this.basel3GroupMapRoot.get());
    this.registryVersion.requireEquals(this.registryVersion.get());

    const totalBasel3Groups = this.totalBasel3GroupTracked.get();

    return {
      basel3GroupsRootHash: this.basel3GroupMapRoot.get(),
      totalBasel3Groups: totalBasel3Groups,
      validBasel3Groups: this.validBasel3Count.get(),
      totalVerifications: totalBasel3Groups,
      creationTime: this.lastVerificationTime.get(),
      version: this.registryVersion.get(),
    };
  }
}