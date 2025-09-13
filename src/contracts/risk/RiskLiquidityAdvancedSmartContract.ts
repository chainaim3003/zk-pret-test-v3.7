/**
 * ====================================================================
 * Risk Liquidity Advanced OptimMerkle Smart Contract
 * ====================================================================
 * Simple smart contract for Advanced Risk Liquidity verification
 * Follows the original pattern: 100→90 state change on compliance
 * ====================================================================
 */

import { Field, SmartContract, state, State, method } from 'o1js';
import { RiskLiquidityAdvancedOptimMerkleProof } from '../../zk-programs/risk/RiskLiquidityAdvancedMerkleZKProgram.js';

export class RiskLiquidityAdvancedOptimMerkleSmartContract extends SmartContract {
    @state(Field) riskComplianceStatus = State<Field>();           // Main compliance status (100 = not verified, 90 = verified)
    @state(Field) totalVerifications = State<Field>();             // Count of successful verifications

    // Initialize the contract state
    init() {
        super.init();
        this.riskComplianceStatus.set(Field(100));           // Start with unverified status (100)
        this.totalVerifications.set(Field(0));               // Zero verifications initially  
    }

    // Method to verify Advanced Risk compliance and update state
    @method async verifyAdvancedRiskComplianceWithProof(proof: RiskLiquidityAdvancedOptimMerkleProof) {
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
        const isRiskCompliant = publicOutput.riskCompliant;

        // Advanced Risk compliance achieved: change status from 100 to 90
        isRiskCompliant.assertTrue();
        
        // Update the state: 100 → 90 (compliance achieved)
        const updatedStatus = currentStatus.sub(Field(10));
        this.riskComplianceStatus.set(updatedStatus);
        
        // Update verification metadata
        const newVerificationCount = currentVerificationCount.add(Field(1));
        this.totalVerifications.set(newVerificationCount);
    }
}
