/**
 * ====================================================================
 * Risk Liquidity StableCoin OptimMerkle Smart Contract
 * ====================================================================
 * Simple smart contract for StableCoin Proof of Reserves verification
 * Follows the original pattern: 100→90 state change on compliance
 * ====================================================================
 */

import { Field, SmartContract, state, State, method } from 'o1js';
import { RiskLiquidityStableCoinOptimMerkleProof } from '../../zk-programs/risk/RiskLiquidityStableCoinZKProgram.js';

export class RiskLiquidityStableCoinOptimMerkleSmartContract extends SmartContract {
    @state(Field) riskComplianceStatus = State<Field>();           // Main compliance status (100 = not verified, 90 = verified)
    @state(Field) totalVerifications = State<Field>();             // Count of successful verifications

    // Initialize the contract state
    init() {
        super.init();
        this.riskComplianceStatus.set(Field(100));           // Start with unverified status (100)
        this.totalVerifications.set(Field(0));               // Zero verifications initially  
    }

    // Method to verify StableCoin compliance and update state
    @method async verifyStableCoinRiskComplianceWithProof(proof: RiskLiquidityStableCoinOptimMerkleProof) {
        // Ensure the state variables match their current values
        this.riskComplianceStatus.requireEquals(this.riskComplianceStatus.get());
        this.totalVerifications.requireEquals(this.totalVerifications.get());
        
        // Get current state values
        const currentStatus = this.riskComplianceStatus.get();
        const currentVerificationCount = this.totalVerifications.get();

        // Verify the ZK proof
        proof.verify();

        // Extract compliance result from proof
        const publicOutput = proof.publicOutput;
        const isStableCoinCompliant = publicOutput.stableCoinCompliant;

        // StableCoin compliance achieved: change status from 100 to 90
        isStableCoinCompliant.assertTrue();
        
        // Update the state: 100 → 90 (compliance achieved)
        const updatedStatus = currentStatus.sub(Field(10));
        this.riskComplianceStatus.set(updatedStatus);
        
        // Update verification metadata
        const newVerificationCount = currentVerificationCount.add(Field(1));
        this.totalVerifications.set(newVerificationCount);
    }
}
