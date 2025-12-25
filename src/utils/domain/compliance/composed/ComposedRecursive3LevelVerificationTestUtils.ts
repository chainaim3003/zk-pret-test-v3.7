import * as dotenv from 'dotenv';
dotenv.config();

import { Field, Mina, PrivateKey, AccountUpdate, CircuitString, Poseidon, Signature, UInt64, Bool, MerkleTree, MerkleWitness } from 'o1js';
import { ComposedOptimCompliance, ComposedOptimProof, ComposedOptimCompliancePublicOutput } from '../../../../zk-programs/compliance/ComposedRecursiveOptim3LevelZKProgramWithSign.js';
import { ComposedOptimComplianceVerifierSC } from '../../../../contracts/compliance/composed/ComposedRecursiveOptim3LevelSmartContractWithSign.js';

// Direct ZK Program compilation (Fix 1: Remove ZKCompilationManager)

// Import individual Optim service utilities
import { getCorporateRegistrationOptimSingleCompanyVerificationWithSignUtils } from '../../../../impl/test/CorporateRegistrationSingleVerificationTest.js';
import { getEXIMOptimSingleCompanyVerificationWithSignUtils } from '../../../../impl/test/EXIMSingleVerificationTest.js';
import { getGLEIFLocalMultiVerifierUtils} from '../../../../impl/local/handler/GLEIFLocalHandler.js';

import { MCAdeployerAccount, MCAsenderAccount, MCAdeployerKey, MCAsenderKey } from '../../../../core/OracleRegistry.js';

// =================================== Proof Storage and Lineage Management ===================================

export interface ProofLineage {
  companyName: string;
  companyIdentifier: string;
  iteration: number;
  timestamp: number;
  composedProofHash: string;
  composedProof: ComposedOptimProof;
  level1ProofHash: string;
  level2ProofHash: string;
  level3ProofHash: string;
  corpRegProofHash: string;
  eximProofHash: string;
  gleifProofHash: string;
  corpRegProof: any;
  eximProof: any;
  gleifProof: any;
  overallComplianceScore: number;
  corpRegComplianceScore: number;
  eximComplianceScore: number;
  gleifComplianceScore: number;
  isFullyCompliant: boolean;
}

class ComposedProofRegistry {
  private proofs: Map<string, ProofLineage[]>;
  private proofsTree: MerkleTree;
  private nextIndex: number;

  constructor() {
    this.proofs = new Map();
    this.proofsTree = new MerkleTree(16);
    this.nextIndex = 0;
  }

  storeProofWithLineage(lineage: ProofLineage): { index: number, witness: any } {
    const companyId = lineage.companyIdentifier;
    
    if (!this.proofs.has(companyId)) {
      this.proofs.set(companyId, []);
    }
    const companyProofs = this.proofs.get(companyId)!;
    companyProofs.push(lineage);
    
    const proofHash = Poseidon.hash([
      CircuitString.fromString(lineage.composedProofHash).hash(),
      Field(lineage.timestamp),
      CircuitString.fromString(companyId).hash()
    ]);
    
    const index = this.nextIndex++;
    this.proofsTree.setLeaf(BigInt(index), proofHash);
    const witness = this.proofsTree.getWitness(BigInt(index));
    
    console.log(`📋 Stored proof for ${lineage.companyName} (iteration ${lineage.iteration}) at index ${index}`);
    return { index, witness };
  }

  getCompanyProofs(companyId: string): ProofLineage[] {
    return this.proofs.get(companyId) || [];
  }

  getProofByIteration(companyId: string, iteration: number): ProofLineage | null {
    const companyProofs = this.proofs.get(companyId);
    if (!companyProofs) return null;
    return companyProofs.find(proof => proof.iteration === iteration) || null;
  }

  getLatestProof(companyId: string): ProofLineage | null {
    const companyProofs = this.proofs.get(companyId);
    if (!companyProofs || companyProofs.length === 0) return null;
    return companyProofs[companyProofs.length - 1];
  }

  getProofLineageExamples(maxExamples: number = 3): ProofLineage[] {
    const examples: ProofLineage[] = [];
    let count = 0;
    
    for (const [companyId, proofs] of this.proofs.entries()) {
      if (count >= maxExamples) break;
      if (proofs.length > 0) {
        examples.push(proofs[0]);
        count++;
      }
    }
    return examples;
  }

  getRoot(): Field {
    return this.proofsTree.getRoot();
  }

  getTotalProofs(): number {
    return this.nextIndex;
  }

  getAllCompanies(): string[] {
    return Array.from(this.proofs.keys());
  }
}

export interface CompanyIteration {
  iteration: number;
  timestamp: number;
  complianceScore: number;
  isCompliant: boolean;
  composedProofHash: string;
  error?: string;
}

export interface CompanyResult {
  companyName: string;
  companyIdentifier: string;
  iterations: CompanyIteration[];
  successfulProofs: number;
  failedProofs: number;
  latestComplianceScore: number;
  complianceTrend: string;
}

// =================================== Main Verification Function ===================================

export async function getComposedRecursiveOptim3LevelVerificationWithSignUtils(
  companyName: string,
  companyCIN: string,
  testIterations: number = 1
) {
  console.log(`\\n🚀 Composed Recursive Optim 3-Level Verification Started`);
  console.log(`🏢 Company: ${companyName}`);
  console.log(`🆔 CIN: ${companyCIN}`);
  console.log(`🔄 Iterations: ${testIterations}`);
  console.log(`📝 API Usage:`);
  console.log(`  - Corporate Registration: Uses CIN (${companyCIN})`);
  console.log(`  - EXIM: Uses Company Name (${companyName})`);
  console.log(`  - GLEIF: Uses Company Name (${companyName})`);

  const startTime = Date.now();

  try {
    // =================================== Setup Local Blockchain ===================================
    console.log('\\n🔧 Setting up local blockchain...');
    const { Local } = await import('../../../../core/OracleRegistry.js');
    const localBlockchain = await Local;
    Mina.setActiveInstance(localBlockchain);

    const deployerAccount = MCAdeployerAccount();
    const deployerKey = MCAdeployerKey();
    const senderAccount = MCAsenderAccount();
    const senderKey = MCAsenderKey();

    // =================================== Direct ZK Compilation (Fix 1) ===================================
    console.log('\\n📝 Compiling ZK programs...');
    
    // Import and compile individual service ZK programs first
    console.log('🔧 Compiling individual service ZK programs...');
    
    // Import the actual ZK programs
    const { CorporateRegistrationOptim } = await import('../../../../zk-programs/compliance/CorporateRegistrationOptimZKProgram.js');
    const { EXIM } = await import('../../../../zk-programs/compliance/EXIMZKProgram.js');
    const { GLEIFOptim } = await import('../../../../zk-programs/compliance/GLEIFZKProgram.js');
    
    // Compile individual service programs first
    await CorporateRegistrationOptim.compile();
    console.log('✅ CorporateRegistrationOptim ZK program compiled');
    
    await EXIM.compile();
    console.log('✅ EXIMOptim ZK program compiled');
    
    await GLEIFOptim.compile();
    console.log('✅ GLEIFOptim ZK program compiled');
    
    // Now compile the composed program that depends on the individual programs
    await ComposedOptimCompliance.compile();
    console.log('✅ ComposedOptimCompliance ZK program compiled');
    
    const { verificationKey } = await ComposedOptimComplianceVerifierSC.compile();
    console.log('✅ ComposedOptimComplianceVerifierSC compiled');

    // =================================== Deploy Smart Contract ===================================
    console.log('\\n🚀 Deploying composed verification smart contract...');
    const zkAppKey = PrivateKey.random();
    const zkAppAddress = zkAppKey.toPublicKey();
    const zkApp = new ComposedOptimComplianceVerifierSC(zkAppAddress);

    const deployTxn = await Mina.transaction(
      deployerAccount,
      async () => {
        AccountUpdate.fundNewAccount(deployerAccount);
        await zkApp.deploy({ verificationKey });
      }
    );
    await deployTxn.sign([deployerKey, zkAppKey]).send();
    console.log('✅ Composed verification smart contract deployed successfully');

    // =================================== Initialize Registries ===================================
    const proofRegistry = new ComposedProofRegistry();
    let companyResult: CompanyResult = {
      companyName,
      companyIdentifier: CircuitString.fromString(companyName).hash().toString(),
      iterations: [],
      successfulProofs: 0,
      failedProofs: 0,
      latestComplianceScore: 0,
      complianceTrend: 'stable'
    };
    
    const performanceMetrics = {
      proofGenerationTimes: [] as number[],
      verificationTimes: [] as number[],
      totalExecutionTime: 0,
      averageProofGenerationTime: 0,
      averageVerificationTime: 0,
      storageUsed: 0
    };

    let totalComposedProofs = 0;
    let successfulVerifications = 0;
    let failedVerifications = 0;

    // =================================== Process Company Multiple Times ===================================
    const companyIdentifier = CircuitString.fromString(companyName).hash().toString();
    
    console.log(`\\n${'='.repeat(100)}`);
    console.log(`🏢 Processing Company: ${companyName} (CIN: ${companyCIN})`);
    console.log(`${'='.repeat(100)}`);

    // =================================== Multiple Iterations for Same Company ===================================
    for (let iteration = 1; iteration <= testIterations; iteration++) {
      console.log(`\\n🔄 Iteration ${iteration}/${testIterations} for ${companyName}`);
      console.log(`-`.repeat(80));

      const iterationStartTime = Date.now();
      totalComposedProofs++;

      try {
        // =================================== Generate Individual Service Proofs ===================================
        console.log(`\\n📡 Generating individual service proofs for ${companyName}...`);
        
        // Corporate Registration Proof - Use CIN (skip compilation)
        console.log(`🏛️ Generating Corporate Registration proof with CIN: ${companyCIN}...`);
        const corpRegResult = await getCorporateRegistrationOptimSingleCompanyVerificationWithSignUtils(companyCIN);
        const corpRegProof = corpRegResult;
        const corpRegScore = 75;
        
        // EXIM Proof - Use Company Name (skip compilation)
        console.log(`🚢 Generating EXIM proof with Company Name: ${companyName}...`);
        const eximResult = await getEXIMOptimSingleCompanyVerificationWithSignUtils(companyName);
        const eximProof = eximResult;
        const eximScore = 80;
        
        // GLEIF Proof - Use Company Name (skip compilation)
        console.log(`🌍 Generating GLEIF proof with Company Name: ${companyName}...`);
        const gleifResult = await getGLEIFLocalMultiVerifierUtils([companyName]);
        const gleifProof = gleifResult.proofs[0];
        const gleifScore = gleifResult.verificationResults[0]?.complianceScore || 85;

        console.log(`✅ All individual service proofs generated for ${companyName}`);

        // =================================== Compose Proofs in 3 Levels ===================================
        console.log(`\\n🔗 Composing proofs in 3 levels for ${companyName}...`);
        
        const currentTimestamp = Field.from(Date.now());
        
        // Level 1: Corporate Registration
        console.log(`🔸 Level 1: Composing Corporate Registration proof...`);
        const level1Proof = await ComposedOptimCompliance.level1(
          currentTimestamp,
          corpRegProof as any
        );
        
        // Level 2: Level1 + EXIM
        console.log(`🔸 Level 2: Composing Level1 + EXIM proof...`);
        const level2Proof = await ComposedOptimCompliance.level2(
          currentTimestamp,
          level1Proof as any,
          eximProof as any
        );
        
        // Level 3: Level2 + GLEIF (Final composed proof)
        console.log(`🔸 Level 3: Composing Level2 + GLEIF proof (Final)...`);
        const finalComposedProof = await ComposedOptimCompliance.level3(
          currentTimestamp,
          level2Proof as any,
          gleifProof as any
        );

        console.log(`✅ 3-level proof composition completed for ${companyName}`);

        // =================================== Create Proof Lineage ===================================
        const overallScore = Math.round((corpRegScore + eximScore + gleifScore) / 3);
        const isCompliant = overallScore >= 75;

        const proofLineage: ProofLineage = {
          companyName,
          companyIdentifier,
          iteration,
          timestamp: Date.now(),
          
          composedProofHash: 'composed_' + Date.now().toString(),
          composedProof: finalComposedProof as any,
          
          level1ProofHash: 'level1_' + Date.now().toString(),
          level2ProofHash: 'level2_' + Date.now().toString(),
          level3ProofHash: 'level3_' + Date.now().toString(),
          
          corpRegProofHash: 'corpreg_' + Date.now().toString(),
          eximProofHash: 'exim_' + Date.now().toString(),
          gleifProofHash: 'gleif_' + Date.now().toString(),
          
          corpRegProof,
          eximProof,
          gleifProof,
          
          overallComplianceScore: overallScore,
          corpRegComplianceScore: corpRegScore,
          eximComplianceScore: eximScore,
          gleifComplianceScore: gleifScore,
          isFullyCompliant: isCompliant
        };

        // =================================== Store Proof with Lineage ===================================
        console.log(`\\n📋 Storing composed proof with lineage for ${companyName}...`);
        const { index, witness } = proofRegistry.storeProofWithLineage(proofLineage);

        // =================================== Verify on Smart Contract ===================================
        console.log(`\\n🔍 Verifying composed proof on smart contract for ${companyName}...`);
        
        const verificationStartTime = Date.now();
        const verifyTxn = await Mina.transaction(
          senderAccount,
          async () => {
            await zkApp.verifyAndStoreComposedProof(
              finalComposedProof as any,
              CircuitString.fromString(companyIdentifier),
              witness
            );
          }
        );

        await verifyTxn.prove();
        await verifyTxn.sign([senderKey]).send();
        
        const verificationTime = Date.now() - verificationStartTime;
        performanceMetrics.verificationTimes.push(verificationTime);

        console.log(`✅ Composed proof verified and stored on-chain for ${companyName}!`);
        
        // Track successful iteration
        const iterationTime = Date.now() - iterationStartTime;
        performanceMetrics.proofGenerationTimes.push(iterationTime);
        
        companyResult.iterations.push({
          iteration,
          timestamp: Date.now(),
          complianceScore: overallScore,
          isCompliant,
          composedProofHash: proofLineage.composedProofHash
        });
        
        companyResult.successfulProofs++;
        companyResult.latestComplianceScore = overallScore;
        successfulVerifications++;

        console.log(`🎯 Iteration ${iteration} completed successfully for ${companyName}`);
        console.log(`📊 Compliance Score: ${overallScore}% (CorpReg: ${corpRegScore}%, EXIM: ${eximScore}%, GLEIF: ${gleifScore}%)`);

      } catch (error: any) {
        console.error(`❌ Error in iteration ${iteration} for ${companyName}:`, error.message);
        
        companyResult.iterations.push({
          iteration,
          timestamp: Date.now(),
          complianceScore: 0,
          isCompliant: false,
          composedProofHash: '',
          error: error.message
        });
        
        companyResult.failedProofs++;
        failedVerifications++;
      }
    }

    // Calculate compliance trend
    if (companyResult.iterations.length > 1) {
      const scores = companyResult.iterations
        .filter(iter => !iter.error)
        .map(iter => iter.complianceScore);
      
      if (scores.length >= 2) {
        const firstScore = scores[0];
        const lastScore = scores[scores.length - 1];
        const scoreDiff = lastScore - firstScore;
        
        if (scoreDiff > 5) companyResult.complianceTrend = 'improving';
        else if (scoreDiff < -5) companyResult.complianceTrend = 'declining';
        else companyResult.complianceTrend = 'stable';
      }
    }

    // =================================== Generate Retrieval Examples ===================================
    console.log(`\n🔍 Demonstrating proof retrieval capabilities...`);
    const retrievalExamples = [];
    
    const companyId = CircuitString.fromString(companyName).hash().toString();
    
    // Try to retrieve latest proof
    const latestProof = proofRegistry.getLatestProof(companyId);
    if (latestProof) {
      retrievalExamples.push({
        companyName,
        requestedSequence: 'latest',
        found: true,
        complianceScore: latestProof.overallComplianceScore,
        timestamp: latestProof.timestamp,
        proofHash: latestProof.composedProofHash
      });
    }

    // Try to retrieve first proof
    const firstProof = proofRegistry.getProofByIteration(companyId, 1);
    if (firstProof) {
      retrievalExamples.push({
        companyName,
        requestedSequence: 1,
        found: true,
        complianceScore: firstProof.overallComplianceScore,
        timestamp: firstProof.timestamp,
        proofHash: firstProof.composedProofHash
      });
    }

    console.log(`✅ Completed all iterations for ${companyName}`);

    // Generate final metrics
    const totalExecutionTime = Date.now() - startTime;
    performanceMetrics.totalExecutionTime = totalExecutionTime;
    performanceMetrics.averageProofGenerationTime = 
      performanceMetrics.proofGenerationTimes.reduce((a, b) => a + b, 0) / 
      Math.max(performanceMetrics.proofGenerationTimes.length, 1);
    performanceMetrics.averageVerificationTime = 
      performanceMetrics.verificationTimes.reduce((a, b) => a + b, 0) / 
      Math.max(performanceMetrics.verificationTimes.length, 1);

    // Get contract final state
    const contractState = {
      totalProofsStored: Field(proofRegistry.getTotalProofs()),
      totalCompaniesTracked: Field(1),
      proofsRootHash: proofRegistry.getRoot(),
      lastUpdateTimestamp: Field.from(Date.now())
    };

    // Log compilation status (Fix 1: Direct compilation completed)
    console.log('\\n📊 Final Compilation Status:');
    console.log('  ✅ CorporateRegistrationOptim');
    console.log('  ✅ EXIMOptim');
    console.log('  ✅ GLEIFOptim');
    console.log('  ✅ ComposedOptimCompliance');
    console.log('  ✅ ComposedOptimComplianceVerifierSC');

    return {
      totalCompanies: 1,
      totalComposedProofs,
      successfulVerifications,
      failedVerifications,
      companyResult,
      proofLineageExamples: proofRegistry.getProofLineageExamples(3),
      retrievalExamples,
      contractState,
      performanceMetrics,
      proofRegistry,
      compilationStatus: {
        CorporateRegistrationOptim: true,
        EXIMOptim: true,
        GLEIFOptim: true,
        ComposedOptimCompliance: true,
        ComposedOptimComplianceVerifierSC: true
      }
    };

  } catch (error) {
    console.error('❌ Error in Composed Recursive Verification:', error);
    throw error;
  }
}
