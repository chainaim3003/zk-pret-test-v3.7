import { SmartContract, state, State, method, Field, Bool, UInt64 } from 'o1js';
import { BusinessStdIntegrityOptimMerkleProof } from '../../zk-programs/process/BusinessStdIntegrityZKProgram.js';

export class BusinessStdIntegrityOptimMerkleSmartContract extends SmartContract {
  // State to track verification results
  @state(Field) merkleRoot = State<Field>();
  @state(Field) totalVerifications = State<Field>();
  @state(Field) successfulVerifications = State<Field>();
  @state(UInt64) lastVerificationTimestamp = State<UInt64>();
  @state(Bool) isVerificationEnabled = State<Bool>();
  @state(Field) risk = State<Field>(); // Risk score state (starts at 100, reduces to 90 on success)

  // Events for logging verification results
  events = {
    'verification-completed': Field,
    'verification-failed': Field,
    'compliance-status': Bool,
    'merkle-root-updated': Field,
  };

  init() {
    super.init();
    
    // Initialize state
    this.merkleRoot.set(Field(0));
    this.totalVerifications.set(Field(0));
    this.successfulVerifications.set(Field(0));
    this.lastVerificationTimestamp.set(UInt64.from(0));
    this.isVerificationEnabled.set(Bool(true));
    this.risk.set(Field(100)); // Initialize risk score to 100
  }

  @method async verifyCoreCompliance(
    proof: BusinessStdIntegrityOptimMerkleProof,
    currentTimestamp: UInt64
  ) {
    // Verify the ZK proof
    proof.verify();

    // Extract public outputs
    const publicOutput = proof.publicOutput;
    
    // Validate that verification is enabled
    const verificationEnabled = this.isVerificationEnabled.getAndRequireEquals();
    verificationEnabled.assertTrue();
    
    // Get current risk score
    const currentRisk = this.risk.getAndRequireEquals();
    
    // Update merkle root state
    this.merkleRoot.set(publicOutput.datasetRoot);
    
    // Update verification counters
    const currentTotal = this.totalVerifications.getAndRequireEquals();
    const newTotal = currentTotal.add(Field(1));
    this.totalVerifications.set(newTotal);
    
    // If compliance passed, increment successful verifications AND reduce risk
    const currentSuccessful = this.successfulVerifications.getAndRequireEquals();
    const newSuccessful = currentSuccessful.add(
      publicOutput.isBLCompliant.toField()
    );
    this.successfulVerifications.set(newSuccessful);
    
    // Risk reduction logic: 100 → 90 on successful compliance
    // Only reduce risk if compliance is true
    const riskReduction = publicOutput.isBLCompliant.toField().mul(Field(10)); // 10 if true, 0 if false
    const updatedRisk = currentRisk.sub(riskReduction);
    this.risk.set(updatedRisk);
    
    // Update timestamp
    this.lastVerificationTimestamp.set(currentTimestamp);
    
    // Emit events
    this.emitEvent('verification-completed', newTotal);
    this.emitEvent('compliance-status', publicOutput.isBLCompliant);
    this.emitEvent('merkle-root-updated', publicOutput.datasetRoot);
    
    // Require minimum validation standards
    publicOutput.fieldsValidated.assertGreaterThanOrEqual(Field(24)); // At least 24 core fields
    publicOutput.patternValidationsPassed.assertGreaterThanOrEqual(Field(6)); // All pattern validations
    publicOutput.enumValidationsPassed.assertGreaterThanOrEqual(Field(4)); // All enum validations
    publicOutput.booleanValidationsPassed.assertGreaterThanOrEqual(Field(3)); // All boolean validations
    publicOutput.arrayValidationsPassed.assertGreaterThanOrEqual(Field(4)); // All array validations
    publicOutput.stringValidationsPassed.assertGreaterThanOrEqual(Field(7)); // All string validations
  }

  @method async verifyEnhancedCompliance(
    proof: BusinessStdIntegrityOptimMerkleProof,
    currentTimestamp: UInt64
  ) {
    // Verify the ZK proof
    proof.verify();

    // Extract public outputs
    const publicOutput = proof.publicOutput;
    
    // Validate that verification is enabled
    const verificationEnabled = this.isVerificationEnabled.getAndRequireEquals();
    verificationEnabled.assertTrue();
    
    // Get current risk score
    const currentRisk = this.risk.getAndRequireEquals();
    
    // Update merkle root state
    this.merkleRoot.set(publicOutput.datasetRoot);
    
    // Update verification counters
    const currentTotal = this.totalVerifications.getAndRequireEquals();
    const newTotal = currentTotal.add(Field(1));
    this.totalVerifications.set(newTotal);
    
    // If compliance passed, increment successful verifications AND reduce risk
    const currentSuccessful = this.successfulVerifications.getAndRequireEquals();
    const newSuccessful = currentSuccessful.add(
      publicOutput.isBLCompliant.toField()
    );
    this.successfulVerifications.set(newSuccessful);
    
    // Risk reduction logic: 100 → 90 on successful enhanced compliance
    // Only reduce risk if compliance is true
    const riskReduction = publicOutput.isBLCompliant.toField().mul(Field(10)); // 10 if true, 0 if false
    const updatedRisk = currentRisk.sub(riskReduction);
    this.risk.set(updatedRisk);
    
    // Update timestamp
    this.lastVerificationTimestamp.set(currentTimestamp);
    
    // Emit events
    this.emitEvent('verification-completed', newTotal);
    this.emitEvent('compliance-status', publicOutput.isBLCompliant);
    this.emitEvent('merkle-root-updated', publicOutput.datasetRoot);
    
    // Require enhanced validation standards
    publicOutput.fieldsValidated.assertGreaterThanOrEqual(Field(24)); // At least 24 core fields
    publicOutput.fieldsValidated.assertLessThanOrEqual(Field(50)); // Maximum reasonable field count
    publicOutput.patternValidationsPassed.assertGreaterThanOrEqual(Field(6)); // All core pattern validations
    publicOutput.enumValidationsPassed.assertGreaterThanOrEqual(Field(4)); // All enum validations
    publicOutput.booleanValidationsPassed.assertGreaterThanOrEqual(Field(3)); // All boolean validations
    publicOutput.arrayValidationsPassed.assertGreaterThanOrEqual(Field(4)); // All array validations
    publicOutput.stringValidationsPassed.assertGreaterThanOrEqual(Field(7)); // All string validations
    // Enhanced validations are optional - allow 0 or more
    publicOutput.enhancedValidationsPassed.assertGreaterThanOrEqual(Field(0)); // Allow any number of enhanced validations
  }

  @method async enableVerification() {
    // Only deployer can enable/disable
    this.requireSignature();
    this.isVerificationEnabled.set(Bool(true));
  }

  @method async disableVerification() {
    // Only deployer can enable/disable
    this.requireSignature();
    this.isVerificationEnabled.set(Bool(false));
  }

  @method async resetCounters() {
    // Only deployer can reset counters
    this.requireSignature();
    this.totalVerifications.set(Field(0));
    this.successfulVerifications.set(Field(0));
    this.lastVerificationTimestamp.set(UInt64.from(0));
  }

  // =================================== Query Methods (Non-@method for compatibility) ===================================
  
  /**
   * Get current merkle root
   */
  getMerkleRoot(): Field {
    return this.merkleRoot.get();
  }

  /**
   * Get total number of verifications performed
   */
  getTotalVerifications(): Field {
    return this.totalVerifications.get();
  }

  /**
   * Get number of successful verifications
   */
  getSuccessfulVerifications(): Field {
    return this.successfulVerifications.get();
  }

  /**
   * Get last verification timestamp
   */
  getLastVerificationTimestamp(): UInt64 {
    return this.lastVerificationTimestamp.get();
  }

  /**
   * Calculate success rate as percentage (0-100)
   */
  getSuccessRate(): Field {
    const total = this.totalVerifications.get();
    const successful = this.successfulVerifications.get();
    return total.equals(Field(0)) ? Field(0) : successful.mul(Field(100)).div(total);
  }
}
