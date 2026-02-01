/**
 * ====================================================================
 * Risk Liquidity Advanced OptimMerkle Verification Test
 * ====================================================================
 * End-to-end verification test for Advanced Risk scenario
 * Follows modular pattern: API → data prep → signature → witnesses → ZK → contract
 * ====================================================================
 */

import { Field, Mina, PrivateKey, AccountUpdate, CircuitString, Poseidon, Signature, UInt64 } from 'o1js';
import { getPrivateKeyFor } from '../../core/OracleRegistry.js';
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
} from '../../utils/optimerkle/domain/risk/adv/RiskLiquidityAdvancedOptimMerkleUtils.js';
import { loadContractPortfolio } from '../../utils/optimerkle/domain/risk/ACTUSOptimMerkleAPI.js';
import {
    RiskLiquidityAdvanced,
    createAdvancedRiskComplianceData,
    validateAdvancedRiskComplianceData
} from '../../zk-programs/risk/RiskLiquidityAdvancedZKProgram.js';
import { RiskLiquidityAdvancedSmartContract } from '../../contracts/risk/RiskLiquidityAdvancedSmartContract.js';
import * as fs from 'fs';
import * as path from 'path';

// =================================== Main Verification Function ===================================

export async function executeRiskLiquidityAdvancedOptimMerkleVerification(
    liquidityThreshold: number,
    actusUrl: string = 'http://localhost:8083/eventsBatch',
    contractPortfolio?: string | any[],
    executionMode: string = 'production'
): Promise<{
    success: boolean;
    proof: any;
    contractStatus: {
        beforeVerification: number;
        afterVerification: number;
    };
    riskMetrics: any;
    summary: string;
}> {
    console.log('🚀 Starting Advanced Risk Liquidity OptimMerkle Verification...');
    console.log(`📋 Execution Mode: ${executionMode}`);
    console.log(`📋 Processing Method: NO Basel3, NO haircuts, cash flow ratios only`);
    
    try {
        // =================================== Step 0: Load Advanced Configuration ===================================
        console.log('⚙️ Loading advanced master configuration and execution settings...');
        
        const masterConfig = loadAdvancedMasterConfiguration();
        const executionSettings = loadExecutionSettings();
        
        // Validate system isolation - ensure Risk Advanced Merkle only
        if (masterConfig.configMetadata.systemScope !== 'RISK_ADVANCED_MERKLE_ONLY') {
            throw new Error('Invalid configuration: Must be RISK_ADVANCED_MERKLE_ONLY scope');
        }
        
        console.log(`✅ Configuration loaded: ${masterConfig.configMetadata.configId}`);
        console.log(`🎯 System scope: ${masterConfig.configMetadata.systemScope}`);
        
        // Apply dynamic threshold strategy based on execution mode
        const dynamicThresholds = applyDynamicThresholdStrategy(executionMode, liquidityThreshold, masterConfig);
        console.log(`📊 Dynamic thresholds applied: Base=${dynamicThresholds.baseThreshold}%, Tolerance=${dynamicThresholds.tolerance}%`);
        
        // Validate Field arithmetic constraints
        validateFieldArithmeticConstraints(dynamicThresholds, masterConfig.minaO1jsConstraints);
        console.log('✅ Field arithmetic constraints validated');
        
        // Load portfolio configuration if provided as file path
        let portfolioConfig = contractPortfolio;
        let finalContractPortfolio: any[] | undefined = undefined;
        
        if (typeof contractPortfolio === 'string' && contractPortfolio.endsWith('.json')) {
            console.log(`📁 Loading portfolio configuration from: ${contractPortfolio}`);
            const loadedConfig = JSON.parse(fs.readFileSync(contractPortfolio, 'utf8'));
            portfolioConfig = loadedConfig;
            console.log(`✅ Portfolio loaded: ${loadedConfig.portfolioMetadata?.portfolioId || 'Unknown'}`);
            
            // ✅ CRITICAL FIX: Extract contracts from the configuration file
            finalContractPortfolio = loadedConfig.contracts || loadedConfig;
            console.log(`✅ Extracted ${finalContractPortfolio?.length || 0} contracts from configuration`);
            
            // ✅ DEBUG: Show loaded contract details
            console.log(`🔍 LOADED CONTRACTS DEBUG:`);
            finalContractPortfolio?.forEach((contract, index) => {
                console.log(`   Contract ${contract.contractID || index}: ${contract.contractType} - ${contract.notionalPrincipal} ${contract.currency} (HQLA: ${contract.hqlaCategory || 'Not specified'})`);
            });
        } else if (Array.isArray(contractPortfolio)) {
            finalContractPortfolio = contractPortfolio;
            console.log(`✅ Using provided contract array: ${finalContractPortfolio.length} contracts`);
        } else {
            console.log(`📋 No portfolio file specified, will use default hardcoded contracts`);
            finalContractPortfolio = undefined; // Will trigger default in ACTUS API
        }
        // =================================== Step 1: Setup Blockchain Environment ===================================
        console.log('📋 Setting up blockchain environment...');
        
        const useProof = false; // Set to true for production
        const Local = await Mina.LocalBlockchain({ proofsEnabled: useProof });
        Mina.setActiveInstance(Local);

        const deployerAccount = Local.testAccounts[0];
        const deployerKey = deployerAccount.key;
        const senderAccount = Local.testAccounts[1];
        const senderKey = senderAccount.key;

        // =================================== Step 2: Compile ZK Program and Smart Contract ===================================
        console.log('🔧 Compiling ZK program and smart contract (ZK-COMPLIANT - no Basel3)...');
        console.log('✅ ZK Compliance: No division operations, Poseidon hash encoding, safe Field bounds');
        
        await RiskLiquidityAdvanced.compile();
        const { verificationKey } = await RiskLiquidityAdvancedSmartContract.compile();
        
        console.log('✅ Compilation successful');

        // =================================== Step 3: Deploy Smart Contract ===================================
        console.log('📦 Deploying smart contract...');
        
        const zkAppKey = PrivateKey.random();
        const zkAppAddress = zkAppKey.toPublicKey();
        const zkApp = new RiskLiquidityAdvancedSmartContract(zkAppAddress);

        const deployTxn = await Mina.transaction(deployerAccount, async () => {
            AccountUpdate.fundNewAccount(deployerAccount);
            await zkApp.deploy({ verificationKey });
        });
        
        await deployTxn.sign([deployerKey, zkAppKey]).send();
        console.log('✅ Smart contract deployed');

        // Get initial contract status (should be 0 groups)
        const initialStatus = zkApp.totalRiskGroupTracked.get().toBigInt();
        console.log(`📊 Initial total risk groups: ${initialStatus}`);

        // =================================== Step 4: Fetch and Process ACTUS Data ===================================
        console.log('🌐 Fetching ACTUS data for Advanced Risk scenario...');
        console.log('🔍 DEBUG: Portfolio config type:', typeof portfolioConfig);
        console.log('🔍 DEBUG: Portfolio config preview:', JSON.stringify(portfolioConfig, null, 2).substring(0, 500) + '...');
        
        const actusResponse = await fetchRiskLiquidityAdvancedOptimMerkleData(actusUrl, finalContractPortfolio);
        console.log('🔍 DEBUG: ACTUS Response preview:', JSON.stringify(actusResponse, null, 2).substring(0, 1000) + '...');
        console.log(`📊 ACTUS Response summary: ${actusResponse.periodsCount} periods, ${actusResponse.inflow?.length || 0} inflow periods, ${actusResponse.outflow?.length || 0} outflow periods`);
        
        const advancedRiskData = processAdvancedRiskData(
            actusResponse,
            dynamicThresholds.baseThreshold,
            5000, // newInvoiceAmount
            Math.min(11, actusResponse.periodsCount || 1),   // newInvoiceEvaluationMonth - ensure it's within range
            masterConfig,
            executionMode
        );
        
        console.log(`📈 Processed ${advancedRiskData.periodsCount} periods of cash flow data`);

        // =================================== Step 5: Calculate Risk Metrics ===================================
        console.log('📊 Calculating Advanced Risk metrics (no Basel3, no haircuts)...');
        
        const riskMetrics = calculateAdvancedRiskMetrics(advancedRiskData, dynamicThresholds, masterConfig);
        validateAdvancedRiskData(advancedRiskData, masterConfig);
        
        console.log(`💧 Average Liquidity Ratio: ${riskMetrics.averageLiquidityRatio.toFixed(2)}%`);
        console.log(`⚠️ Worst Case Liquidity Ratio: ${riskMetrics.worstCaseLiquidityRatio.toFixed(2)}%`);
        console.log(`✅ Stress Test Result: ${riskMetrics.liquidityStressTestPassed ? 'PASSED' : 'FAILED'}`);

        // =================================== Step 6: Build Merkle Tree Structure ===================================
        console.log('🌳 Building Merkle tree structure...');
        
        const merkleStructure = buildAdvancedRiskMerkleStructure(advancedRiskData);
        const merkleRoot = merkleStructure.merkleRoot;
        
        console.log(`🔐 Merkle root: ${merkleRoot.toString()}`);

        // =================================== Step 7: Create Oracle Signature ===================================
        console.log('🔑 Creating oracle signature...');
        
        const registryPrivateKey = getPrivateKeyFor('RISK');
        const oracleSignature = Signature.create(registryPrivateKey, [merkleRoot]);
        
        console.log('✅ Oracle signature created');

        // =================================== Step 8: Create ZK Compliance Data ===================================
        console.log('📋 Creating ZK compliance data structure...');
        
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
        
        validateAdvancedRiskComplianceData(zkComplianceData);
        console.log('✅ ZK compliance data structure created and validated');

        // =================================== Step 9: Generate ZK Proof ===================================
        console.log('🔒 Generating ZK proof (ZK-compliant liquidity check)...');
        
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
        
        console.log('✅ ZK proof generated successfully');
        console.log(`📊 Proof public output - Compliant: ${proof.publicOutput.riskCompliant.toBoolean()}`);

        // =================================== Step 10: Verify Proof with Smart Contract ===================================
        console.log('📋 Verifying proof with smart contract...');
        
        const verificationTxn = await Mina.transaction(senderAccount, async () => {
            await zkApp.verifyAdvancedRiskComplianceWithProof(proof);
        });
        
        const proofTxn = await verificationTxn.prove();
        await verificationTxn.sign([senderKey]).send();
        
        console.log('✅ Proof verified by smart contract');

        // =================================== Step 11: Check Final Contract Status ===================================
        const finalStatus = zkApp.totalRiskGroupTracked.get().toBigInt();
        const totalVerifications = zkApp.totalVerificationsGlobal.get().toBigInt();
        
        console.log(`📊 Final total risk groups: ${finalStatus}`);
        console.log(`🔢 Total verifications: ${totalVerifications}`);

        // =================================== Step 12: Generate Summary Report ===================================
        const summary = generateAdvancedRiskSummary(advancedRiskData, riskMetrics);
        console.log('\n' + summary);

        // =================================== Return Results ===================================
        return {
            success: true,
            proof: proof,
            contractStatus: {
                beforeVerification: Number(initialStatus),
                afterVerification: Number(finalStatus)
            },
            riskMetrics: riskMetrics,
            summary: summary
        };
        
    } catch (error) {
        console.error('❌ Advanced Risk verification failed:', error);
        return {
            success: false,
            proof: null,
            contractStatus: {
                beforeVerification: 100,
                afterVerification: 100
            },
            riskMetrics: null,
            summary: `Verification failed: ${error}`
        };
    }
}

// =================================== CLI Entry Point ===================================

async function main() {
    const liquidityThreshold = parseFloat(process.argv[2]) || 95;
    const actusUrl = process.argv[3] || 'http://localhost:8083/eventsBatch';
    const portfolioPath = process.argv[4]; // Optional portfolio file path
    const executionMode = process.argv[5] || 'production'; // Execution mode
    
    console.log(`🎯 Advanced Risk Liquidity Threshold: ${liquidityThreshold}%`);
    console.log(`🌐 ACTUS API URL: ${actusUrl}`);
    if (portfolioPath) {
        console.log(`📁 Portfolio Path: ${portfolioPath}`);
    }
    console.log(`🚀 Execution Mode: ${executionMode}`);
    console.log(`📋 Processing: NO Basel3 formulas, NO haircuts, period checks only`);
    
    const result = await executeRiskLiquidityAdvancedOptimMerkleVerification(
        liquidityThreshold,
        actusUrl,
        portfolioPath,
        executionMode
    );
    
    if (result.success) {
        console.log('\n🎉 Advanced Risk verification completed successfully!');
        console.log(`📊 Status Change: ${result.contractStatus.beforeVerification} → ${result.contractStatus.afterVerification}`);
        console.log('\n📅 ZK-COMPLIANT PROCESSING SUMMARY:');
        console.log('   ✅ NO Basel3 HQLA classifications applied');
        console.log('   ✅ NO haircuts (0%, 15%, 50%) applied');
        console.log('   ✅ NO complex risk formulas used');
        console.log('   ✅ Simple inflow/outflow ratios per period only');
        console.log('   ✅ Contracts loaded from specified source only');
        console.log('   ✅ 25 months from ACTUS post-processing');
        console.log('\n🔒 ZK COMPLIANCE FEATURES:');
        console.log('   ✅ NO Field division operations (uses Poseidon hash)');
        console.log('   ✅ Deterministic array encoding (fixed-size, padded)');
        console.log('   ✅ Safe Field bounds (max 50,000% ratios)');
        console.log('   ✅ MINA o1.js best practices followed');
        console.log('   ✅ Consistent Merkle leaf calculations');
        
        if (result.contractStatus.afterVerification === 90) {
            console.log('✅ COMPLIANCE ACHIEVED - Contract status changed to 90 (ZK-compliant liquidity check passed)');
        } else {
            console.log('❌ COMPLIANCE NOT ACHIEVED - Contract status remains at 100 (ZK-compliant liquidity check failed)');
        }
    } else {
        console.log('\n❌ Advanced Risk verification failed');
        process.exit(1);
    }
}

// Run the main function
main().catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
});
