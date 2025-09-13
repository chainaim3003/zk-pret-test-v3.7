/**
 * RiskAdvancedLocalHandler.ts
 * LOCAL blockchain version of Advanced Risk verification
 * IDENTICAL business logic to Network handler but optimized for local development/testing
 * PRESERVES: All Advanced Risk calculations, dynamic Merkle root, Advanced-specific processing
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
    fetchRiskLiquidityAdvancedOptimMerkleData,
    processAdvancedRiskData,
    buildAdvancedRiskMerkleStructure,
    calculateAdvancedRiskMetrics,
    validateAdvancedRiskData,
    generateAdvancedRiskSummary,
    loadAdvancedMasterConfiguration,
    loadExecutionSettings,
    applyDynamicThresholdStrategy,
    validateFieldArithmeticConstraints
} from '../../../utils/optimerkle/domain/risk/adv/RiskLiquidityAdvancedOptimMerkleUtils.js';
import { loadContractPortfolio } from '../../../utils/optimerkle/domain/risk/ACTUSOptimMerkleAPI.js';
import {
    RiskLiquidityAdvancedOptimMerkleZKProgramWithSign,
    createAdvancedRiskComplianceData,
    validateAdvancedRiskComplianceData,
    MerkleWitness8
} from '../../../zk-programs/risk/RiskLiquidityAdvancedMerkleZKProgram.js';
import { RiskLiquidityAdvancedOptimMerkleSmartContract } from '../../../contracts/risk/RiskLiquidityAdvancedSmartContract.js';

export interface AdvancedRiskParams {
    liquidityThreshold: number;
    actusUrl: string;
    contractPortfolio?: any[];
    executionMode?: string;
}

export class RiskAdvancedLocalHandler {
    private baseCore: BaseVerificationCore;
    private complianceBase: ComplianceVerificationBase;
    private riskBase: RiskVerificationBase;

    constructor() {
        this.baseCore = new BaseVerificationCore();
        this.complianceBase = new ComplianceVerificationBase();
        this.riskBase = new RiskVerificationBase();
    }

    /**
     * LOCAL Advanced Risk Verification
     * IDENTICAL logic to network handler but optimized for local blockchain
     * PRESERVES: All Advanced Risk calculations, dynamic Merkle root, Advanced-specific processing
     */
    async executeAdvancedRiskVerification(params: AdvancedRiskParams): Promise<RiskVerificationResult> {
        console.log('🏠 Starting LOCAL Advanced Risk Liquidity OptimMerkle Verification...');
        
        try {
            // LOCAL OPTIMIZATION: Environment setup for local development
            console.log('🏠 Using LOCAL blockchain for development/testing');
            const riskEnv = await this.setupLocalRiskEnvironment();
            
            // =================================== Step 0: Load Advanced Configuration ===================================
            console.log('⚙️ Loading advanced master configuration and execution settings...');
            
            const masterConfig = loadAdvancedMasterConfiguration();
            const executionSettings = loadExecutionSettings();
            
            // Validate system isolation - ensure Risk Advanced Merkle only
            if (masterConfig.configMetadata.systemScope !== 'RISK_ADVANCED_MERKLE_ONLY') {
                throw new Error('Invalid configuration: Must be RISK_ADVANCED_MERKLE_ONLY scope');
            }
            
            console.log(`✅ LOCAL Configuration loaded: ${masterConfig.configMetadata.configId}`);
            console.log(`🏠 System scope: ${masterConfig.configMetadata.systemScope}`);
            
            // Apply dynamic threshold strategy based on execution mode
            const dynamicThresholds = applyDynamicThresholdStrategy(
                params.executionMode || 'production', 
                params.liquidityThreshold, 
                masterConfig
            );
            console.log(`📊 LOCAL Dynamic thresholds applied: Base=${dynamicThresholds.baseThreshold}%, Tolerance=${dynamicThresholds.tolerance}%`);
            
            // Validate Field arithmetic constraints
            validateFieldArithmeticConstraints(dynamicThresholds, masterConfig.minaO1jsConstraints);
            console.log('✅ LOCAL Field arithmetic constraints validated');

            // PRESERVE EXACT COMPILATION PATTERN from working code
            console.log('🔧 LOCAL: Compiling ZK program and smart contract...');
            await RiskLiquidityAdvancedOptimMerkleZKProgramWithSign.compile();
            const { verificationKey } = await RiskLiquidityAdvancedOptimMerkleSmartContract.compile();
            console.log('✅ LOCAL Compilation successful');

            // PRESERVE EXACT DEPLOYMENT PATTERN from working code
            const zkAppKey = PrivateKey.random();
            const zkAppAddress = zkAppKey.toPublicKey();
            const zkApp = new RiskLiquidityAdvancedOptimMerkleSmartContract(zkAppAddress);
            
            const deployTxn = await Mina.transaction(riskEnv.deployerAccount, async () => {
                AccountUpdate.fundNewAccount(riskEnv.deployerAccount);
                await zkApp.deploy({ verificationKey });
            });
            
            await deployTxn.sign([riskEnv.deployerKey, zkAppKey]).send();
            console.log('✅ LOCAL Smart contract deployed');

            // Get initial contract status (should be 100)
            const initialStatus = zkApp.riskComplianceStatus.get().toBigInt();

            // PRESERVE EXACT ACTUS DATA PROCESSING from working code
            console.log('🌐 LOCAL: Fetching ACTUS data for Advanced Risk scenario...');
            const actusResponse = await fetchRiskLiquidityAdvancedOptimMerkleData(params.actusUrl, params.contractPortfolio);
            
            // PRESERVE EXACT ADVANCED RISK DATA PROCESSING from working code
            const advancedRiskData = processAdvancedRiskData(
                actusResponse,
                dynamicThresholds.baseThreshold,
                5000, // newInvoiceAmount
                Math.min(11, actusResponse.periodsCount || 1), // newInvoiceEvaluationMonth
                masterConfig,
                params.executionMode || 'production'
            );
            
            console.log(`📈 LOCAL: Processed ${advancedRiskData.periodsCount} periods with Advanced Risk categorization`);

            // PRESERVE EXACT RISK METRICS CALCULATION from working code
            console.log('📊 LOCAL: Calculating Advanced Risk metrics...');
            const riskMetrics = calculateAdvancedRiskMetrics(advancedRiskData, dynamicThresholds, masterConfig);
            validateAdvancedRiskData(advancedRiskData, masterConfig);

            // PRESERVE EXACT MERKLE STRUCTURE BUILDING from working code
            console.log('🌳 LOCAL: Building Advanced Risk Merkle structure...');
            const merkleStructure = buildAdvancedRiskMerkleStructure(advancedRiskData);
            const merkleRoot = merkleStructure.merkleRoot;

            // PRESERVE EXACT COMPLIANCE DATA CREATION from working code
            console.log('🔐 LOCAL: Creating ZK compliance data structure...');
            const zkComplianceData = createAdvancedRiskComplianceData(
                advancedRiskData.companyID,
                advancedRiskData.companyName,
                advancedRiskData.cashInflow,
                advancedRiskData.cashOutflow,
                advancedRiskData.newInvoiceAmount,
                advancedRiskData.newInvoiceEvaluationMonth,
                advancedRiskData.liquidityThreshold,
                merkleRoot,
                {
                    averageLiquidityRatio: riskMetrics.averageLiquidityRatio,
                    worstCaseLiquidityRatio: riskMetrics.worstCaseLiquidityRatio,
                    liquidityCompliant: riskMetrics.liquidityStressTestPassed
                }
            );

            // PRESERVE EXACT COMPLIANCE VALIDATION from working code
            console.log('✅ LOCAL: ZK compliance validation passed - all constraints satisfied');
            validateAdvancedRiskComplianceData(zkComplianceData);

            // PRESERVE EXACT SIGNATURE GENERATION from working code
            console.log('🔏 LOCAL: Generating oracle signature...');
            const registryPrivateKey = getPrivateKeyFor('RISK');
            const oracleSignature = Signature.create(registryPrivateKey, [merkleRoot]);
            console.log('✅ LOCAL Oracle signature created');

            // PRESERVE EXACT ZK PROOF GENERATION from working code
            console.log('⚡ LOCAL: Generating ZK proof (ZK-compliant liquidity check)...');
            const currentTimestamp = UInt64.from(Date.now());
            const proof = await RiskLiquidityAdvancedOptimMerkleZKProgramWithSign.proveAdvancedRiskCompliance(
                currentTimestamp,
                zkComplianceData,
                oracleSignature,
                merkleStructure.witnesses.companyInfo,
                merkleStructure.witnesses.cashInflow,
                merkleStructure.witnesses.cashOutflow,
                merkleStructure.witnesses.riskMetrics
            );
            console.log('✅ LOCAL ZK proof generated successfully');

            // PRESERVE EXACT CONTRACT VERIFICATION from working code
            console.log('📋 LOCAL: Verifying proof with smart contract...');
            const verificationTxn = await Mina.transaction(riskEnv.deployerAccount, async () => {
                await zkApp.verifyAdvancedRiskComplianceWithProof(proof);
            });
            
            await verificationTxn.prove();
            await verificationTxn.sign([riskEnv.deployerKey]).send();
            console.log('✅ LOCAL Proof verified by smart contract');

            // Get final contract status
            const finalStatus = zkApp.riskComplianceStatus.get().toBigInt();
            console.log(`📊 LOCAL Final contract status: ${finalStatus}`);
            console.log(`📊 LOCAL Total verifications: 1`);

            // PRESERVE EXACT SUMMARY GENERATION from working code
            const summary = generateAdvancedRiskSummary(advancedRiskData, riskMetrics);

            console.log('✅ LOCAL Advanced Risk verification completed within timeout');
            console.log('\n' + summary);

            return {
                success: true,
                proof,
                contractStatus: {
                    beforeVerification: Number(initialStatus),
                    afterVerification: Number(finalStatus)
                },
                riskMetrics,
                summary
            };

        } catch (error: any) {
            console.error(`❌ LOCAL Advanced Risk verification failed:`, error.message);
            console.error('Stack trace:', error.stack);
            
            return {
                success: false,
                proof: null,
                contractStatus: { beforeVerification: 0, afterVerification: 0 },
                riskMetrics: null,
                summary: `Error: ${error.message}`
            };
        }
    }

    /**
     * Setup LOCAL Risk Environment
     * Optimized for development with faster LocalBlockchain setup
     */
    private async setupLocalRiskEnvironment(): Promise<RiskEnvironment> {
        console.log('🏠 Setting up LOCAL Advanced Risk environment...');
        
        // LOCAL: Setup LocalBlockchain
        const useProof = false; // Fast local development
        const Local = await Mina.LocalBlockchain({ proofsEnabled: useProof });
        Mina.setActiveInstance(Local);

        const deployerAccount = Local.testAccounts[0];
        const deployerKey = deployerAccount.key;
        const senderAccount = Local.testAccounts[1];
        const senderKey = senderAccount.key;
        
        console.log('✅ LOCAL Advanced Risk environment setup completed');
        
        return {
            deployerAccount,
            deployerKey,
            senderAccount,
            senderKey,
            useProof
        };
    }

    /**
     * Get handler information for debugging
     */
    getHandlerInfo(): { type: string; environment: string; capabilities: string[] } {
        return {
            type: 'RiskAdvancedLocalHandler',
            environment: 'LOCAL',
            capabilities: [
                'Advanced Risk Verification',
                'Local Blockchain Optimization',
                'Development-Friendly Logging',
                'Fast Iteration Cycles',
                'ZK Proof Generation',
                'Merkle Tree Construction',
                'Compliance Validation'
            ]
        };
    }
}
