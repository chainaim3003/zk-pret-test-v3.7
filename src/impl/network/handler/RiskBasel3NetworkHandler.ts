/**
 * RiskBasel3NetworkHandler.ts
 * EXTRACTED from working RiskLiquidityBasel3OptimMerkleVerificationTestWithSign.ts
 * PRESERVES 100% of working business logic including dynamic Merkle root calculation
 * 
 * COMPOSITION PATTERN: Uses RiskVerificationBase for shared Risk functionality
 * Following successful GLEIF/BusinessProcess architecture
 */

import { RiskVerificationBase, RiskEnvironment, RiskVerificationResult } from '../../verification-base/RiskVerificationBase.js';
import { BaseVerificationCore } from '../../verification-base/BaseVerificationCore.js';
import { ComplianceVerificationBase } from '../../verification-base/ComplianceVerificationBase.js';

// PRESERVE EXACT IMPORTS from working implementation
import { Field, Mina, PrivateKey, AccountUpdate, CircuitString, Poseidon, Signature, UInt64 } from 'o1js';
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
    validateBasel3RiskComplianceData
} from '../../../zk-programs/risk/RiskLiquidityBasel3MerkleZKProgram.js';
import { RiskLiquidityBasel3OptimMerkleSmartContract } from '../../../contracts/risk/RiskLiquidityBasel3SmartContract.js';

export interface Basel3RiskParams {
    lcrThreshold: number;
    nsfrThreshold?: number;
    actusUrl: string;
    contractPortfolio?: any[];
}

export class RiskBasel3NetworkHandler {
    private baseCore: BaseVerificationCore;
    private complianceBase: ComplianceVerificationBase;
    private riskBase: RiskVerificationBase;

    constructor() {
        this.baseCore = new BaseVerificationCore();
        this.complianceBase = new ComplianceVerificationBase();
        this.riskBase = new RiskVerificationBase();
    }

    /**
     * EXTRACTED Basel3 Risk Verification - IDENTICAL to working implementation
     * PRESERVES: All LCR/NSFR calculations, dynamic Merkle root, Basel3-specific processing
     */
    async executeBasel3RiskVerification(params: Basel3RiskParams): Promise<RiskVerificationResult> {
        console.log('🚀 Starting Basel3 LCR/NSFR OptimMerkle Verification...');
        
        try {
            // PRESERVE EXACT WORKING PATTERN: useProof = true for Basel3
            const riskEnv = await this.riskBase.setupRiskEnvironment(true);
            
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
            
            console.log(`📈 Processed ${basel3RiskData.periodsCount} periods with Basel3 categorization`);

            // PRESERVE EXACT RISK METRICS CALCULATION from working code
            console.log('📊 Calculating Basel3 LCR/NSFR metrics...');
            const riskMetrics = calculateBasel3RiskMetricsOptimMerkle(basel3RiskData);
            validateBasel3RiskDataOptimMerkle(basel3RiskData);
            
            // Use base class for common logging pattern
            this.riskBase.validateRiskMetrics(riskMetrics, 'Basel3');

            // PRESERVE EXACT DYNAMIC MERKLE ROOT CALCULATION from working code
            console.log('📋 Creating ZK compliance data structure (without Merkle root)...');
            
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

            // ✅ FIXED: Use the proper Merkle tree construction function from utils (same as Local handler)
            console.log('📋 Building Merkle tree with CURRENT processed data...');
            
            // ✅ FIXED: Use the proper Merkle tree construction function from utils
            // This ensures the tree structure matches exactly what the ZK program expects
            const merkleProcessedData = buildBasel3RiskMerkleStructure(basel3RiskData);
            const merkleRoot = merkleProcessedData.merkleRoot;
            
            console.log(`🔧 DYNAMIC Merkle root: ${merkleRoot}`);
            console.log('This root is calculated AFTER data processing to ensure consistency');
            
            // PRESERVE EXACT ORACLE SIGNATURE CREATION from working code
            console.log('🔐 Creating oracle signature on dynamic root...');
            const oraclePrivateKey = getPrivateKeyFor('BASEL3');
            const signature = this.riskBase.createOracleSignature(merkleRoot, oraclePrivateKey);
            console.log('✅ Oracle signature created for dynamic root');
            
            // PRESERVE EXACT ZK DATA STRUCTURE CREATION from working code
            console.log('📋 Creating final ZK compliance data with dynamic Merkle root...');
            
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
            console.log('✅ ZK compliance data structure created and validated');

            // ✅ FIXED: ZK proof generation with proper oracle signature and Merkle data (same as Local handler)
            console.log('🌐 Generating ZK proof...');
            const proof = await this.executeNetworkBasel3ZKProofFlowFixed(
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
            console.log(`📊 Proof public output - Basel3 Compliant: ${proof.publicOutput.basel3Compliant}`);
            console.log(`📊 Proof public output - LCR Ratio: ${proof.publicOutput.lcrRatio}`);
            console.log(`📊 Proof public output - NSFR Ratio: ${proof.publicOutput.nsfrRatio}`);

            // ✅ ZK proof verification completed successfully

            // PRESERVE EXACT STATUS TRACKING from working code
            const finalStatus = Number(zkApp.riskComplianceStatus.get().toBigInt());
            const totalVerifications = Number(zkApp.totalVerifications.get().toBigInt());
            
            this.riskBase.validateContractStatusChange(initialStatus, finalStatus, riskMetrics.overallCompliant);

            // PRESERVE EXACT SUMMARY GENERATION from working code
            const summary = generateBasel3RiskSummaryOptimMerkle(basel3RiskData, riskMetrics);

            // Use base class for result formatting
            return this.riskBase.formatVerificationResult(
                riskMetrics.overallCompliant,
                proof,
                initialStatus,
                finalStatus,
                riskMetrics,
                summary,
                'Basel3'
            );

        } catch (error) {
            console.error('❌ Basel3 Risk verification failed:', error);
            throw error;
        }
    }

    /**
     * ✅ FIXED: ZK proof flow with proper oracle signature and witnesses from utils function
     * (Same as Local handler but for Network environment)
     */
    private async executeNetworkBasel3ZKProofFlowFixed(
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
        
        // ✅ FIXED: Use correct method with ALL required parameters including oracle signature
        const currentTimestamp = UInt64.from(Date.now());
        const proof = await zkProgram.proveBasel3RiskCompliance(
            currentTimestamp,
            zkComplianceData,
            oracleSignature,          // ✅ FIXED: Add oracle signature
            witnesses.companyInfo,    // ✅ FIXED: Use proper witness from utils
            witnesses.cashFlows,      // ✅ FIXED: Use proper witness from utils
            witnesses.hqlaComponents, // ✅ FIXED: Use proper witness from utils
            witnesses.nsfrComponents, // ✅ FIXED: Use proper witness from utils
            witnesses.thresholds      // ✅ FIXED: Use proper witness from utils
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
}
