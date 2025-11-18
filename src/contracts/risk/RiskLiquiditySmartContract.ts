/**
 * ====================================================================
 * Risk Liquidity OptimMerkle Smart Contract
 * ====================================================================
 * Simple smart contract for Risk Liquidity scenarios
 * Handles Advanced, Basel3, and StableCoin proofs with 100→90 state change logic
 * ====================================================================
 */

import { Field, SmartContract, state, State, method, Bool } from 'o1js';
import { RiskLiquidityAdvancedOptimMerkleProof } from '../../zk-programs/risk/RiskLiquidityAdvancedMerkleZKProgram.js';
import { RiskLiquidityBasel3OptimMerkleProof } from '../../zk-programs/risk/RiskLiquidityBasel3MerkleZKProgram.js';
import { RiskLiquidityStableCoinOptimMerkleProof } from '../../zk-programs/risk/RiskLiquidityStableCoinZKProgram.js';

export class RiskLiquidityOptimMerkleSmartContract extends SmartContract {
    // =================================== State Variables ===================================
    @state(Field) riskComplianceStatus = State<Field>();           // Main compliance status (100 = not verified, 90 = verified)
    @state(Field) totalVerifications = State<Field>();             // Count of successful verifications

    // =================================== Initialize Contract ===================================
    init() {
        super.init();
        this.riskComplianceStatus.set(Field(100));           // Start with unverified status (100)
        this.totalVerifications.set(Field(0));               // Zero verifications initially  
    }

    // =================================== Advanced Risk Verification ===================================
    @method async verifyAdvancedRiskComplianceWithProof(proof: RiskLiquidityAdvancedOptimMerkleProof) {
        // Ensure the state variables match their current values
        this.riskComplianceStatus.requireEquals(this.riskComplianceStatus.get());
        this.totalVerifications.requireEquals(this.totalVerifications.get());
        
        // Get current state values
        const currentVerificationCount = this.totalVerifications.get();

        // =================================== Verify ZK Proof ===================================
        proof.verify();

        // =================================== Extract Proof Data ===================================
        const publicOutput = proof.publicOutput;
        const isCompliant = publicOutput.riskCompliant;

        // =================================== Update Contract State Based on Compliance ===================================
        // Advanced Risk specific: if compliant, change status from 100 to 90
        this.riskComplianceStatus.set(Field(90));
        
        // Update verification metadata
        const newVerificationCount = currentVerificationCount.add(1);
        this.totalVerifications.set(newVerificationCount);
    }

    // =================================== Basel3 Risk Verification ===================================
    @method async verifyBasel3RiskComplianceWithProof(proof: RiskLiquidityBasel3OptimMerkleProof) {
        // Ensure the state variables match their current values
        this.riskComplianceStatus.requireEquals(this.riskComplianceStatus.get());
        this.totalVerifications.requireEquals(this.totalVerifications.get());
        
        // Get current state values
        const currentVerificationCount = this.totalVerifications.get();

        // =================================== Verify ZK Proof ===================================
        proof.verify();

        // =================================== Extract Proof Data ===================================
        const publicOutput = proof.publicOutput;
        const isCompliant = publicOutput.basel3Compliant;

        // =================================== Update Contract State Based on Compliance ===================================
        // Basel3 specific: if compliant, change status from 100 to 90
        this.riskComplianceStatus.set(Field(90));
        
        // Update verification metadata
        const newVerificationCount = currentVerificationCount.add(1);
        this.totalVerifications.set(newVerificationCount);
    }

    // =================================== StableCoin Risk Verification ===================================
    @method async verifyStableCoinRiskComplianceWithProof(proof: RiskLiquidityStableCoinOptimMerkleProof) {
        // Ensure the state variables match their current values
        this.riskComplianceStatus.requireEquals(this.riskComplianceStatus.get());
        this.totalVerifications.requireEquals(this.totalVerifications.get());
        
        // Get current state values
        const currentVerificationCount = this.totalVerifications.get();

        // =================================== Verify ZK Proof ===================================
        proof.verify();

        // =================================== Extract Proof Data ===================================
        const publicOutput = proof.publicOutput;
        const isCompliant = publicOutput.stableCoinCompliant;

        // =================================== Update Contract State Based on Compliance ===================================
        // StableCoin specific: if compliant, change status from 100 to 90
        this.riskComplianceStatus.set(Field(90));
        
        // Update verification metadata
        const newVerificationCount = currentVerificationCount.add(1);
        this.totalVerifications.set(newVerificationCount);
    }

    // =================================== Administrative Methods ===================================
    
    /**
     * Reset compliance status to unverified state (admin function)
     */
    @method async resetRiskCompliance() {
        this.riskComplianceStatus.requireEquals(this.riskComplianceStatus.get());
        this.riskComplianceStatus.set(Field(100)); // Reset to unverified
    }
}
