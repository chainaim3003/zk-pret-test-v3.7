/**
 * RiskBasel3VerificationBase.ts - Basel3 Risk Domain Common Infrastructure
 * EXTRACTED from working Basel3 implementation
 * PRESERVES all working patterns and business logic
 * 
 * COMPOSITION PATTERN: Uses BaseVerificationCore and ComplianceVerificationBase
 * Following successful GLEIF/BusinessProcess architecture
 */

import { BaseVerificationCore } from './BaseVerificationCore.js';
import { ComplianceVerificationBase } from './ComplianceVerificationBase.js';
import { Field, Mina, PrivateKey, AccountUpdate, UInt64, Signature } from 'o1js';

export interface RiskEnvironment {
    deployerAccount: any;
    deployerKey: any;
    senderAccount: any;
    senderKey: any;
    useProof: boolean;
}

export interface RiskVerificationResult {
    success: boolean;
    proof: any;
    contractStatus: {
        beforeVerification: number;
        afterVerification: number;
    };
    transactionDetails?: {
        hash: string;
        explorerUrl: string;
        contractAddress: string;
        network: string;
        totalVerifications: number;
    };
    riskMetrics: any;
    summary: string;
}

export class RiskVerificationBase {
    private baseCore: BaseVerificationCore;
    private complianceBase: ComplianceVerificationBase;

    constructor() {
        this.baseCore = new BaseVerificationCore();
        this.complianceBase = new ComplianceVerificationBase();
    }

    /**
     * EXTRACTED: Blockchain Environment Setup (preserving exact working patterns)
     * Basel3 uses useProof=true, StableCoin uses useProof=false
     */
    async setupRiskEnvironment(useProof: boolean): Promise<RiskEnvironment> {
        console.log('📋 Setting up blockchain environment...');

        // PRESERVE EXACT WORKING PATTERN from both implementations
        if (useProof) {
            console.log(`🔧 CRITICAL DEBUG: proofsEnabled = ${useProof}`);
            console.log(`🔧 This affects whether ZK circuit assertions work!`);
        }

        const Local = await Mina.LocalBlockchain({ proofsEnabled: useProof });
        Mina.setActiveInstance(Local);

        const deployerAccount = Local.testAccounts[0];
        const deployerKey = deployerAccount.key;
        const senderAccount = Local.testAccounts[1];
        const senderKey = senderAccount.key;

        return {
            deployerAccount,
            deployerKey,
            senderAccount,
            senderKey,
            useProof
        };
    }

    /**
     * EXTRACTED: Common Smart Contract Deployment Pattern
     * Preserves exact working pattern from both implementations
     */
    async deployRiskContract(
        zkApp: any,
        deployerAccount: any,
        deployerKey: any,
        zkAppKey: any,
        verificationKey: any
    ): Promise<number> {
        console.log('📦 Deploying smart contract...');

        // PRESERVE EXACT WORKING PATTERN from both implementations
        const deployTxn = await Mina.transaction(deployerAccount, async () => {
            AccountUpdate.fundNewAccount(deployerAccount);
            await zkApp.deploy({ verificationKey });
        });

        await deployTxn.sign([deployerKey, zkAppKey]).send();
        console.log('✅ Smart contract deployed');

        // PRESERVE EXACT STATUS TRACKING from working code
        const initialStatus = zkApp.riskComplianceStatus.get().toBigInt();
        console.log(`📊 Initial contract status: ${initialStatus}`);

        return Number(initialStatus);
    }

    /**
     * EXTRACTED: Common Contract Status Validation
     * Preserves exact working logging patterns
     */
    validateContractStatusChange(
        initialStatus: number,
        finalStatus: number,
        complianceExpected: boolean
    ): void {
        console.log(`📊 Status Change: ${initialStatus} → ${finalStatus}`);

        // PRESERVE EXACT WORKING PATTERN from both implementations
        if (finalStatus === 90) {
            console.log('✅ COMPLIANCE ACHIEVED - Contract status changed to 90');
        } else if (finalStatus === 100) {
            console.log('❌ COMPLIANCE NOT ACHIEVED - Contract status remains at 100');
        } else {
            console.log(`⚠️ Unexpected contract status: ${finalStatus}`);
        }
    }

    /**
     * EXTRACTED: ACTUS Data Processing Patterns
     * Common functionality across Risk types
     */
    async processACTUSResponse(
        actusResponse: any,
        contractPortfolio: any[],
        riskType: 'StableCoin' | 'Basel3'
    ): Promise<any> {
        // Common ACTUS processing patterns
        console.log(`🌐 Processing ACTUS data for ${riskType} scenario...`);

        // Preserve working pattern: detailed logging
        if (actusResponse.periodsCount) {
            console.log(`📈 Processed ${actusResponse.periodsCount} periods with ${riskType} categorization`);
        }

        return actusResponse;
    }

    /**
     * EXTRACTED: Risk Metrics Calculation Validation
     * Common pattern from both implementations
     */
    validateRiskMetrics(riskMetrics: any, riskType: 'StableCoin' | 'Basel3'): void {
        console.log(`📊 Calculating ${riskType} metrics...`);

        // PRESERVE EXACT WORKING LOGGING PATTERNS
        if (riskType === 'StableCoin') {
            console.log(`📊 Average Backing Ratio: ${riskMetrics.averageBackingRatio?.toFixed(2)}%`);
            console.log(`💧 Average Liquidity Ratio: ${riskMetrics.averageLiquidityRatio?.toFixed(2)}%`);
            console.log(`🎯 Max Concentration Risk: ${riskMetrics.maxConcentrationRisk?.toFixed(2)}%`);
            console.log(`⭐ Average Asset Quality: ${riskMetrics.averageAssetQuality?.toFixed(2)}`);
            console.log(`✅ Overall StableCoin Compliance: ${riskMetrics.overallCompliant ? 'PASSED' : 'FAILED'}`);
        } else if (riskType === 'Basel3') {
            console.log(`🏦 Average LCR: ${riskMetrics.averageLCR?.toFixed(2)}%`);
            console.log(`💰 Average NSFR: ${riskMetrics.averageNSFR?.toFixed(2)}%`);
            console.log(`🔧 Total-based LCR: ${riskMetrics.totalBasedLCR?.toFixed(2)}% (for ZK circuit)`);
            console.log(`🔧 Total-based NSFR: ${riskMetrics.totalBasedNSFR?.toFixed(2)}% (for ZK circuit)`);
            console.log(`⚠️ Worst Case LCR: ${riskMetrics.worstCaseLCR?.toFixed(2)}%`);
            console.log(`⚠️ Worst Case NSFR: ${riskMetrics.worstCaseNSFR?.toFixed(2)}%`);
            console.log(`✅ LCR Compliance: ${riskMetrics.lcrCompliant ? 'PASSED' : 'FAILED'}`);
            console.log(`✅ NSFR Compliance: ${riskMetrics.nsfrCompliant ? 'PASSED' : 'FAILED'}`);
            console.log(`✅ Overall Basel3 Compliance: ${riskMetrics.overallCompliant ? 'PASSED' : 'FAILED'}`);
        }
    }

    /**
     * EXTRACTED: StableCoin-specific ZK Proof Generation and Verification Pattern
     * Updated to use correct o1js ZkProgram method calling pattern
     */
    async executeStableCoinZKProofFlow(
        zkProgram: any,
        zkApp: any,
        zkComplianceData: any,
        oracleSignature: any,
        merkleWitnesses: any[],
        verificationMethod: string,
        senderAccount: any,
        senderKey: any,
        currentTimestamp: any
    ): Promise<any> {
        // CORRECTED: Use proper o1js ZkProgram method calling pattern
        console.log('🔧 Generating ZK proof...');
        const proof = await zkProgram.proveStableCoinRiskCompliance(
            currentTimestamp,
            zkComplianceData,
            oracleSignature,
            ...merkleWitnesses
        );
        console.log('✅ ZK proof generated successfully');

        // PRESERVE EXACT WORKING PATTERN: Contract verification
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
     * EXTRACTED: Basel3-specific ZK Proof Generation and Verification Pattern
     * Updated to use correct o1js ZkProgram method calling pattern
     */
    async executeBasel3ZKProofFlow(
        zkProgram: any,
        zkApp: any,
        zkComplianceData: any,
        oracleSignature: any,
        merkleWitnesses: any[],
        verificationMethod: string,
        senderAccount: any,
        senderKey: any,
        currentTimestamp: any
    ): Promise<any> {
        // CORRECTED: Use proper o1js ZkProgram method calling pattern for Basel3
        console.log('🔧 Generating ZK proof...');
        const proof = await zkProgram.proveBasel3RiskCompliance(
            currentTimestamp,
            zkComplianceData,
            oracleSignature,
            ...merkleWitnesses
        );
        console.log('✅ ZK proof generated successfully');

        // PRESERVE EXACT WORKING PATTERN: Contract verification
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
     * EXTRACTED: Oracle Signature Creation Pattern
     * Common pattern from Basel3 implementation
     */
    createOracleSignature(merkleRoot: any, oraclePrivateKey: any): any {
        console.log('🔐 Creating oracle signature on dynamic root...');
        const signature = Signature.create(oraclePrivateKey, [merkleRoot]);
        console.log('✅ Oracle signature created for dynamic root');
        return signature;
    }

    /**
     * EXTRACTED: Local vs Network Environment Detection
     * Helps handlers determine optimal configuration
     */
    isLocalEnvironment(): boolean {
        // Check if we're running in local development mode
        const args = process.argv.join(' ');
        return args.includes('Local') || args.includes('localhost') || process.env.NODE_ENV === 'development';
    }

    /**
     * EXTRACTED: Success/Failure Result Formatting
     * Common pattern from both implementations
     */
    formatVerificationResult(
        success: boolean,
        proof: any,
        initialStatus: number,
        finalStatus: number,
        riskMetrics: any,
        summary: string,
        riskType: 'StableCoin' | 'Basel3'
    ): RiskVerificationResult {

        // Final status logging
        const totalVerifications = Number(finalStatus); // Simplified for common case
        console.log(`📊 Final contract status: ${finalStatus}`);
        console.log(`📈 Total verifications: ${totalVerifications}`);

        // Success message formatting
        if (success) {
            console.log(`\n🎉 ${riskType} Risk verification completed successfully!`);
            console.log(`📊 Status Change: ${initialStatus} → ${finalStatus}`);

            if (finalStatus === 90) {
                console.log(`✅ ${riskType.toUpperCase()} COMPLIANCE ACHIEVED - Contract status changed to 90`);
            } else {
                console.log(`❌ ${riskType.toUpperCase()} COMPLIANCE NOT ACHIEVED - Contract status remains at 100`);
            }
        } else {
            console.log(`\n❌ ${riskType} Risk verification failed`);
        }

        return {
            success,
            proof,
            riskMetrics,
            summary,
            contractStatus: {
                beforeVerification: 0,
                afterVerification: 0,
            }
        };
    }
}
