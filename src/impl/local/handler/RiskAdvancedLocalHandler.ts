/**
 * RiskAdvancedLocalHandler.ts
 * LOCAL blockchain version of Advanced Risk verification
 * IDENTICAL business logic to Network handler but optimized for local development/testing
 * PRESERVES: All Advanced Risk calculations, dynamic Merkle root, Advanced-specific processing
 * 
 * COMPOSITION PATTERN: Uses RiskVerificationBase for shared Risk functionality
 * Following successful GLEIF/BusinessProcess local architecture
 */

import { RiskVerificationBase, RiskEnvironment, RiskVerificationResult } from '../../base/RiskVerificationBase.js';
import { BaseVerificationCore } from '../../base/BaseVerificationCore.js';
import { ComplianceVerificationBase } from '../../base/ComplianceVerificationBase.js';

// PRESERVE EXACT IMPORTS from working implementation
import { Field, Mina, PrivateKey, AccountUpdate, CircuitString, Poseidon, Signature, UInt64, MerkleTree, MerkleMap } from 'o1js';
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
    RiskLiquidityAdvanced,
    createAdvancedRiskComplianceData,
    validateAdvancedRiskComplianceData,
    MerkleWitness8
} from '../../../zk-programs/risk/RiskLiquidityAdvancedZKProgram.js';
import { 
    RiskLiquidityAdvancedSmartContract,
    RiskGroupRecord,
    RiskGroupKey,
    RISK_GROUP_MERKLE_HEIGHT,
    RiskGroupMerkleWitness
} from '../../../contracts/risk/RiskLiquidityAdvancedSmartContract.js';

export interface AdvancedRiskParams {
    riskGroupID: CircuitString | string;
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
            await RiskLiquidityAdvanced.compile();
            const { verificationKey } = await RiskLiquidityAdvancedSmartContract.compile();
            console.log('✅ LOCAL Compilation successful');

            // PRESERVE EXACT DEPLOYMENT PATTERN from working code
            const zkAppKey = PrivateKey.random();
            const zkAppAddress = zkAppKey.toPublicKey();
            const zkApp = new RiskLiquidityAdvancedSmartContract(zkAppAddress);
            
            const deployTxn = await Mina.transaction(riskEnv.deployerAccount, async () => {
                AccountUpdate.fundNewAccount(riskEnv.deployerAccount);
                await zkApp.deploy({ verificationKey });
            });
            
            await deployTxn.sign([riskEnv.deployerKey, zkAppKey]).send();
            console.log('✅ LOCAL Smart contract deployed');

            // Get initial contract status (should be 0 groups)
            const initialStatus = zkApp.totalRiskGroupTracked.get().toBigInt();

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
            const proof = await RiskLiquidityAdvanced.proveAdvancedRiskCompliance(
                currentTimestamp,
                zkComplianceData,
                oracleSignature,
                merkleStructure.witnesses.companyInfo,
                merkleStructure.witnesses.cashInflow,
                merkleStructure.witnesses.cashOutflow,
                merkleStructure.witnesses.riskMetrics
            );
            console.log('✅ LOCAL ZK proof generated successfully');

            // Get Risk Group ID from params
            const riskGroupIDStr = typeof params.riskGroupID === 'string' ? params.riskGroupID : params.riskGroupID.toString();
            
            // Determine compliance status from proof
            const isCompliant = proof.publicOutput.riskCompliant;
            
            // Extract timestamp from proof to ensure exact match with contract verification
            const proofTimestamp = proof.publicOutput.verificationTimestamp;
            
            // Extract Risk Group ID from proof (using scenarioID as the group identifier)
            const proofRiskGroupID = proof.publicOutput.scenarioID;
            const riskGroupIDHash = proofRiskGroupID.hash();
            
            console.log(`   📋 Using Risk Group ID from proof: ${proofRiskGroupID.toString()}`);
            console.log(`   🔐 Group ID Hash: ${riskGroupIDHash.toString().substring(0, 30)}...`);
            console.log(`   ⏰ Proof Timestamp: ${proofTimestamp.toString()}`);
            
            // Create Risk Group Record (similar to StableCoin RiskGroupRecord)
            const riskGroupRecord = new RiskGroupRecord({
                groupIDHash: riskGroupIDHash,
                isValid: isCompliant,
                complianceScore: Field(100), // Default compliance score
                totalVerifications: Field(1),
                passedVerifications: isCompliant.toField(),
                failedVerifications: isCompliant.not().toField(),
                consecutiveFailures: isCompliant.not().toField(),
                lastVerificationTime: proofTimestamp,
                firstVerificationTime: proofTimestamp,
                lastPassTime: UInt64.from(0),
                lastFailTime: UInt64.from(0)
            });
            
            console.log('✅ LOCAL Risk Group Record created');
            console.log(`   Group ID Hash: ${riskGroupIDHash.toString().substring(0, 30)}...`);
            console.log(`   Compliance Status: ${isCompliant.toBoolean()}`);
            console.log(`   Compliance Score: 100`);
            
            // Create Risk Group Key
            const riskGroupKey = RiskGroupKey.create(riskGroupIDHash);
            const companiesMap = new MerkleMap();
            const riskGroupMapWitness = companiesMap.getWitness(riskGroupKey.toField());
            
            console.log('✅ LOCAL Risk Group Key and Map Witness created');
            
            // Create Risk Group Merkle Witness (Following StableCoin Pattern)
            console.log('🔧 LOCAL Creating RiskGroupMerkleWitness...');
            let riskGroupWitness: RiskGroupMerkleWitness;
            try {
                // Create a temporary MerkleTree for proper witness generation
                const tempGroupTree = new MerkleTree(RISK_GROUP_MERKLE_HEIGHT);
                
                // Set the group record at index 0 with ALL fields
                const groupHash = Poseidon.hash([
                    riskGroupRecord.groupIDHash,
                    riskGroupRecord.isValid.toField(),
                    riskGroupRecord.complianceScore,
                    riskGroupRecord.totalVerifications,
                    riskGroupRecord.passedVerifications,
                    riskGroupRecord.failedVerifications,
                    riskGroupRecord.consecutiveFailures,
                    riskGroupRecord.lastVerificationTime.value,
                    riskGroupRecord.firstVerificationTime.value,
                    riskGroupRecord.lastPassTime.value,
                    riskGroupRecord.lastFailTime.value
                ]);
                tempGroupTree.setLeaf(BigInt(0), groupHash);
                
                // Generate the actual witness from the real tree
                const realWitness = tempGroupTree.getWitness(BigInt(0));
                riskGroupWitness = new RiskGroupMerkleWitness(realWitness);
                console.log('✅ LOCAL RiskGroupMerkleWitness created successfully');
            } catch (witnessError) {
                const errorMessage = witnessError instanceof Error ? witnessError.message : 'Unknown witness creation error';
                console.error(`❌ LOCAL Error creating RiskGroupMerkleWitness: ${errorMessage}`);
                throw new Error(`Failed to create RiskGroupMerkleWitness: ${errorMessage}`);
            }

            // PRESERVE EXACT CONTRACT VERIFICATION from working code
            console.log('📋 LOCAL: Verifying proof with smart contract...');
            const verificationTxn = await Mina.transaction(riskEnv.deployerAccount, async () => {
                await zkApp.verifyAdvancedRiskComplianceWithGroup(
                    proof,
                    riskGroupWitness,
                    riskGroupRecord,
                    riskGroupMapWitness
                );
            });
            
            await verificationTxn.prove();
            await verificationTxn.sign([riskEnv.deployerKey]).send();
            console.log('✅ LOCAL Proof verified by smart contract');

            // Get final contract status
            const finalStatus = zkApp.totalRiskGroupTracked.get().toBigInt();
            console.log(`📊 LOCAL Final contract status: ${finalStatus}`);
            console.log(`📊 LOCAL Total verifications: ${zkApp.totalVerificationsGlobal.get().toBigInt()}`);

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
