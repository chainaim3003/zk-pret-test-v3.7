/**
 * RiskBasel3LocalHandler.ts
 * LOCAL blockchain version of Basel3 risk verification
 * IDENTICAL business logic to Network handler but optimized for local development/testing
 * PRESERVES: All LCR/NSFR calculations, dynamic Merkle root, Basel3-specific processing
 * 
 * COMPOSITION PATTERN: Uses RiskVerificationBase for shared Risk functionality
 * Following successful GLEIF/BusinessProcess local architecture
 */

import { RiskVerificationBase, RiskEnvironment, RiskVerificationResult } from '../../verification-base/RiskVerificationBase.js';
import { BaseVerificationCore } from '../../verification-base/BaseVerificationCore.js';
import { ComplianceVerificationBase } from '../../verification-base/ComplianceVerificationBase.js';

// PRESERVE EXACT IMPORTS from working implementation
import { Field, Mina, PrivateKey, AccountUpdate, CircuitString, Poseidon, Signature, UInt64, MerkleTree } from 'o1js';
import { getPrivateKeyFor } from '../../../core/OracleRegistry.js';
import { 
    fetchRiskLiquidityBasel3OptimMerkleData,
    processBasel3RiskDataOptimMerkle,
    buildBasel3RiskMerkleStructure,
    calculateBasel3RiskMetricsOptimMerkle,
    validateBasel3RiskDataOptimMerkle,
    generateBasel3RiskSummaryOptimMerkle
} from '../../../utils/optimerkle/domain/risk/basel3/RiskLiquidityBasel3OptimMerkleUtils.js';
import { loadContractPortfolio } from '../../../utils/optimerkle/domain/risk/ACTUSOptimMerkleAPI.js';
import {
    RiskLiquidityBasel3OptimMerkleZKProgramWithSign,
    createBasel3RiskComplianceData,
    validateBasel3RiskComplianceData,
    MerkleWitness8
} from '../../../zk-programs/risk/RiskLiquidityBasel3MerkleZKProgram.js';
import { RiskLiquidityBasel3OptimMerkleSmartContract } from '../../../contracts/risk/RiskLiquidityBasel3SmartContract.js';

export interface Basel3RiskParams {
    lcrThreshold: number;
    nsfrThreshold?: number;
    actusUrl: string;
    contractPortfolio?: any[];
}

export class RiskBasel3LocalHandler {
    private baseCore: BaseVerificationCore;
    private complianceBase: ComplianceVerificationBase;
    private riskBase: RiskVerificationBase;

    constructor() {
        this.baseCore = new BaseVerificationCore();
        this.complianceBase = new ComplianceVerificationBase();
        this.riskBase = new RiskVerificationBase();
    }

    /**
     * LOCAL Basel3 Risk Verification
     * IDENTICAL logic to network handler but optimized for local blockchain
     * PRESERVES: All LCR/NSFR calculations, dynamic Merkle root, Basel3-specific processing
     */
    async executeBasel3RiskVerification(params: Basel3RiskParams): Promise<RiskVerificationResult> {
        console.log('🏠 Starting LOCAL Basel3 LCR/NSFR OptimMerkle Verification...');
        
        try {
            // LOCAL OPTIMIZATION: Environment setup for local development
            console.log('🏠 Using LOCAL blockchain for development/testing');
            const riskEnv = await this.setupLocalRiskEnvironment();
            
            // PRESERVE EXACT COMPILATION PATTERN from working code
            console.log('🔧 Compiling ZK program and smart contract...');
            await RiskLiquidityBasel3OptimMerkleZKProgramWithSign.compile();
            const { verificationKey } = await RiskLiquidityBasel3OptimMerkleSmartContract.compile();
            console.log('✅ Compilation successful');

            // PRESERVE EXACT DEPLOYMENT PATTERN from working code
            const zkAppKey = PrivateKey.random();
            const zkAppAddress = zkAppKey.toPublicKey();
            const zkApp = new RiskLiquidityBasel3OptimMerkleSmartContract(zkAppAddress);
            
            const initialStatus = await this.riskBase.deployRiskContract(
                zkApp, riskEnv.deployerAccount, riskEnv.deployerKey, zkAppKey, verificationKey
            );

            // PRESERVE EXACT ACTUS DATA PROCESSING from working code
            console.log('🌐 Fetching ACTUS data for LOCAL Basel3 scenario...');
            const actusResponse = await fetchRiskLiquidityBasel3OptimMerkleData(params.actusUrl, params.contractPortfolio);
            
            // PRESERVE EXACT BASEL3 DATA PROCESSING from working code
            const basel3RiskData = await processBasel3RiskDataOptimMerkle(
                actusResponse,
                params.lcrThreshold,
                params.nsfrThreshold || 100,
                10,   // liquidityThreshold
                5000, // newInvoiceAmount
                11    // newInvoiceEvaluationMonth
            );
            
            console.log(`📈 LOCAL: Processed ${basel3RiskData.periodsCount} periods with Basel3 categorization`);

            // PRESERVE EXACT RISK METRICS CALCULATION from working code
            console.log('📊 LOCAL: Calculating Basel3 LCR/NSFR metrics...');
            const riskMetrics = calculateBasel3RiskMetricsOptimMerkle(basel3RiskData);
            validateBasel3RiskDataOptimMerkle(basel3RiskData);
            
            // Use base class for common logging pattern
            this.riskBase.validateRiskMetrics(riskMetrics, 'Basel3');

            // PRESERVE EXACT DYNAMIC MERKLE ROOT CALCULATION from working code
            console.log('📋 LOCAL: Creating ZK compliance data structure (without Merkle root)...');
            
            // PRESERVE EXACT HQLA COMPONENTS CALCULATION from working code
            const hqlaComponents = {
                level1Total: basel3RiskData.hqlaLevel1.reduce((sum: number, val: number) => sum + val, 0),
                level2ATotal: basel3RiskData.hqlaLevel2A.reduce((sum: number, val: number) => sum + val, 0),
                level2BTotal: basel3RiskData.hqlaLevel2B.reduce((sum: number, val: number) => sum + val, 0),
                netCashOutflowsTotal: basel3RiskData.netCashOutflows.reduce((sum: number, val: number) => sum + val, 0)
            };
            
            // PRESERVE EXACT NSFR COMPONENTS CALCULATION from working code
            const nsfrComponents = {
                availableStableFundingTotal: basel3RiskData.availableStableFunding[0] || 0,
                requiredStableFundingTotal: basel3RiskData.requiredStableFunding[0] || 0
            };

            // PRESERVE EXACT ZK COMPLIANCE DATA CREATION from working code
            console.log('📋 LOCAL: Building Merkle tree with CURRENT processed data...');
            
            // ✅ FIXED: Use the proper Merkle tree construction function from utils
            // This ensures the tree structure matches exactly what the ZK program expects
            const merkleProcessedData = buildBasel3RiskMerkleStructure(basel3RiskData);
            const merkleRoot = merkleProcessedData.merkleRoot;
            
            console.log(`🔧 DYNAMIC Merkle root: ${merkleRoot}`);
            console.log('LOCAL: This root is calculated AFTER data processing to ensure consistency');
            
            // PRESERVE EXACT ORACLE SIGNATURE CREATION from working code
            console.log('🔐 Creating oracle signature on dynamic root...');
            const oraclePrivateKey = getPrivateKeyFor('BASEL3');
            const signature = this.riskBase.createOracleSignature(merkleRoot, oraclePrivateKey);
            console.log('✅ Oracle signature created for dynamic root');
            
            // PRESERVE EXACT ZK DATA STRUCTURE CREATION from working code
            console.log('📋 LOCAL: Creating final ZK compliance data with dynamic Merkle root...');
            
            // Transform riskMetrics to match expected interface
            const calculatedMetrics = {
                lcrRatio: riskMetrics.averageLCR || 0,
                nsfrRatio: riskMetrics.averageNSFR || 0,
                lcrCompliant: riskMetrics.lcrCompliant || false,
                nsfrCompliant: riskMetrics.nsfrCompliant || false,
                basel3Compliant: riskMetrics.overallCompliant || false
            };
            
            const zkComplianceData = createBasel3RiskComplianceData(
                'BASEL3_OPTIMMERKLE_10001',
                'Basel3 OptimMerkle LCR/NSFR Assessment',
                hqlaComponents,
                nsfrComponents,
                {
                    lcrThreshold: params.lcrThreshold,
                    nsfrThreshold: params.nsfrThreshold || 100
                },
                {
                    periodsCount: basel3RiskData.periodsCount,
                    liquidityThreshold: 10,
                    newInvoiceAmount: 5000,
                    newInvoiceEvaluationMonth: 11
                },
                merkleRoot,
                calculatedMetrics
            );
            validateBasel3RiskComplianceData(zkComplianceData);
            console.log('✅ LOCAL: ZK compliance data structure created and validated');

            // FIXED: ZK proof generation with proper oracle signature and Merkle data
            console.log('🏠 LOCAL: Generating Basel3 ZK proof (faster execution)...');
            const proof = await this.executeLocalBasel3ZKProofFlowFixed(
                RiskLiquidityBasel3OptimMerkleZKProgramWithSign,
                zkApp,
                zkComplianceData,
                signature,
                'verifyBasel3RiskComplianceWithProof',  // ✅ FIXED: Correct method name from smart contract
                riskEnv.senderAccount,
                riskEnv.senderKey,
                merkleProcessedData  // ✅ ADD: Pass the proper Merkle tree data
            );
            
            // PRESERVE EXACT PROOF OUTPUT LOGGING from working code
            console.log(`📊 LOCAL Proof public output - Basel3 Compliant: ${proof.publicOutput.basel3Compliant}`);
            console.log(`📊 LOCAL Proof public output - LCR Ratio: ${proof.publicOutput.lcrRatio}`);
            console.log(`📊 LOCAL Proof public output - NSFR Ratio: ${proof.publicOutput.nsfrRatio}`);

            // ✅ SIMPLIFIED: Clean ZK verification status
            console.log('🔧 LOCAL ZK Verification Results:');
            console.log(`   - ProofsEnabled: ${riskEnv.useProof}`);
            console.log(`   - Basel3 Compliant: ${proof.publicOutput.basel3Compliant}`);
            console.log(`   - ZK Proof: ✅ Successfully generated and verified`);
            if (proof.publicOutput.basel3Compliant) {
                console.log(`   - Status: ✅ COMPLIANT - LCR and NSFR thresholds met`);
            } else {
                console.log(`   - Status: ❌ NON-COMPLIANT - Thresholds not met`);
            }

            // PRESERVE EXACT STATUS TRACKING from working code
            const finalStatus = Number(zkApp.riskComplianceStatus.get().toBigInt());
            const totalVerifications = Number(zkApp.totalVerifications.get().toBigInt());
            
            this.riskBase.validateContractStatusChange(initialStatus, finalStatus, riskMetrics.overallCompliant);

            // PRESERVE EXACT SUMMARY GENERATION from working code
            const summary = generateBasel3RiskSummaryOptimMerkle(basel3RiskData, riskMetrics);

            // Use local-specific result formatting
            return this.formatLocalVerificationResult(
                riskMetrics.overallCompliant,
                proof,
                initialStatus,
                finalStatus,
                riskMetrics,
                summary,
                'Basel3'
            );

        } catch (error) {
            console.error('❌ LOCAL Basel3 Risk verification failed:', error);
            throw error;
        }
    }

    /**
     * LOCAL-specific blockchain environment setup for Basel3
     * Uses Basel3 working pattern: useProof = true for proper ZK circuit assertion
     */
    private async setupLocalRiskEnvironment(): Promise<RiskEnvironment> {
        console.log('🏠 Setting up LOCAL Basel3 blockchain environment...');
        
        // PRESERVE EXACT WORKING PATTERN: useProof = true for Basel3 (but can be false for faster local testing)
        const useProof = true; // Basel3 working pattern - keep true for production testing
        console.log(`🏠 LOCAL CRITICAL DEBUG: proofsEnabled = ${useProof}`);
        console.log(`🏠 LOCAL: This affects whether ZK circuit assertions work!`);
        
        const Local = await Mina.LocalBlockchain({ proofsEnabled: useProof });
        Mina.setActiveInstance(Local);

        const deployerAccount = Local.testAccounts[0];
        const deployerKey = deployerAccount.key;
        const senderAccount = Local.testAccounts[1]; 
        const senderKey = senderAccount.key;

        console.log('✅ LOCAL Basel3 blockchain environment ready');

        return {
            deployerAccount,
            deployerKey,
            senderAccount,
            senderKey,
            useProof
        };
    }

    /**
     * FIXED: ZK proof flow with proper oracle signature and witnesses from utils function
     */
    private async executeLocalBasel3ZKProofFlowFixed(
        zkProgram: any,
        zkApp: any,
        zkComplianceData: any,
        oracleSignature: Signature,
        verificationMethod: string,
        senderAccount: any,
        senderKey: any,
        merkleProcessedData: any  // ✅ ADD: Use the proper Merkle tree data from utils
    ): Promise<any> {
        console.log('🔧 Generating ZK proof...');
        
        // ✅ FIXED: Use the properly constructed witnesses from utils function
        // This ensures the witnesses match the same tree that generated the merkleRoot
        const witnesses = merkleProcessedData.witnesses;
        
        console.log(`🔍 Verifying witness calculations:`);
        console.log(`   Company Info Root: ${witnesses.companyInfo.calculateRoot(zkComplianceData.scenarioID.hash())}`);
        console.log(`   Cash Flows Root: ${witnesses.cashFlows.calculateRoot(zkComplianceData.hqlaLevel1Total.add(zkComplianceData.hqlaLevel2ATotal))}`);
        console.log(`   HQLA Root: ${witnesses.hqlaComponents.calculateRoot(zkComplianceData.hqlaLevel1Total.add(zkComplianceData.hqlaLevel2ATotal).add(zkComplianceData.hqlaLevel2BTotal).add(zkComplianceData.netCashOutflowsTotal))}`);
        console.log(`   NSFR Root: ${witnesses.nsfrComponents.calculateRoot(zkComplianceData.availableStableFundingTotal.add(zkComplianceData.requiredStableFundingTotal))}`);
        console.log(`   Thresholds Root: ${witnesses.thresholds.calculateRoot(zkComplianceData.lcrThreshold.add(zkComplianceData.nsfrThreshold))}`);
        
        // Verify they all match the main root
        const merkleRoot = zkComplianceData.merkleRoot;
        const allMatch = [
            witnesses.companyInfo.calculateRoot(zkComplianceData.scenarioID.hash()),
            witnesses.cashFlows.calculateRoot(zkComplianceData.hqlaLevel1Total.add(zkComplianceData.hqlaLevel2ATotal)),
            witnesses.hqlaComponents.calculateRoot(zkComplianceData.hqlaLevel1Total.add(zkComplianceData.hqlaLevel2ATotal).add(zkComplianceData.hqlaLevel2BTotal).add(zkComplianceData.netCashOutflowsTotal)),
            witnesses.nsfrComponents.calculateRoot(zkComplianceData.availableStableFundingTotal.add(zkComplianceData.requiredStableFundingTotal)),
            witnesses.thresholds.calculateRoot(zkComplianceData.lcrThreshold.add(zkComplianceData.nsfrThreshold))
        ].every(calculatedRoot => calculatedRoot.toString() === merkleRoot.toString());
        
        console.log(`   All witnesses match root: ${allMatch}`);
        
        // FIXED: Use correct method with ALL required parameters including oracle signature
        const currentTimestamp = UInt64.from(Date.now());
        const proof = await zkProgram.proveBasel3RiskCompliance(
            currentTimestamp,
            zkComplianceData,
            oracleSignature,          // FIXED: Add oracle signature
            witnesses.companyInfo,    // FIXED: Use proper witness from utils
            witnesses.cashFlows,      // FIXED: Use proper witness from utils
            witnesses.hqlaComponents, // FIXED: Use proper witness from utils
            witnesses.nsfrComponents, // FIXED: Use proper witness from utils
            witnesses.thresholds      // FIXED: Use proper witness from utils
        );
        console.log('✅ ZK proof generated successfully');
        
        // Contract verification
        console.log('🔍 Verifying proof with smart contract...');
        const verifyTxn = await Mina.transaction(senderAccount, async () => {
            await zkApp[verificationMethod](proof);
        });
        await verifyTxn.prove();
        await verifyTxn.sign([senderKey]).send();
        console.log('✅ Proof verified by smart contract');
        
        return proof;
    }

    /**
     * LOCAL-specific result formatting for Basel3
     * Same as base class but with LOCAL-specific messaging
     */
    private formatLocalVerificationResult(
        success: boolean,
        proof: any,
        initialStatus: number,
        finalStatus: number,
        riskMetrics: any,
        summary: string,
        riskType: 'StableCoin' | 'Basel3'
    ): RiskVerificationResult {
        
        // Final status logging with LOCAL prefix
        const totalVerifications = Number(finalStatus);
        console.log(`📊 LOCAL Final Basel3 contract status: ${finalStatus}`);
        console.log(`📈 LOCAL Total Basel3 verifications: ${totalVerifications}`);
        
        // Success message formatting with LOCAL prefix
        if (success) {
            console.log(`\n🎉 LOCAL ${riskType} Risk verification completed successfully!`);
            console.log(`📊 LOCAL Status Change: ${initialStatus} → ${finalStatus}`);
            
            if (finalStatus === 90) {
                console.log(`✅ LOCAL ${riskType.toUpperCase()} COMPLIANCE ACHIEVED - Contract status changed to 90`);
            } else {
                console.log(`❌ LOCAL ${riskType.toUpperCase()} COMPLIANCE NOT ACHIEVED - Contract status remains at 100`);
            }
        } else {
            console.log(`\n🔴 LOCAL ${riskType} Risk verification completed - Non-compliant scenario detected`);
            console.log('✅ LOCAL: This is expected behavior for INVALID test cases');
        }

        return {
            success,
            proof,
            contractStatus: {
                beforeVerification: initialStatus,
                afterVerification: finalStatus
            },
            riskMetrics,
            summary
        };
    }
}