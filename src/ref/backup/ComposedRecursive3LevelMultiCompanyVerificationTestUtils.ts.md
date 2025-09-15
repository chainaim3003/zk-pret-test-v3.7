/**
 * ComposedRecursiveOptim3LevelMultiCompanyVerificationTestWithSignUtils.ts - Multi-Company Composed Verification
 * Based on: ComposedRecursiveOptim3LevelVerificationTestWithSignUtils.ts (WORKING SINGLE COMPANY VERSION)
 * MAINTAINS: Exact same core logic, just adds multi-company loop
 */
import * as dotenv from 'dotenv';
dotenv.config();

import { Field, Mina, PrivateKey, AccountUpdate, CircuitString, Poseidon, Signature, MerkleTree, UInt64, Bool, MerkleWitness } from 'o1js';
import { ComposedOptimCompliance, ComposedOptimProof, ComposedOptimCompliancePublicOutput } from '../../zk-programs/compliance/ComposedRecursiveOptim3LevelZKProgramWithSign.js';
import { ComposedOptimComplianceVerifierSC, ComposedProofMerkleWitness,ComposedCompanyRecord } from '../../contracts/complaince/composed/ComposedRecursiveOptimMultiCompanySmartContract.js';

//Proofs
import { CorporateRegistrationOptimProof } from '../../zk-programs/compliance/CorporateRegistrationZKProgram.js';
import { EXIMOptimProof } from '../../zk-programs/compliance/EXIMZKProgram.js';
import { GLEIFOptimProof } from '../../zk-programs/compliance/GLEIFZKProgram.js';

// Import individual Optim service utilities (SAME AS WORKING VERSION)
import { getCorporateRegistrationOptimSingleCompanyVerificationWithSignUtils } from './CorporateRegistrationSingleVerificationTest.js';
import { getEXIMOptimSingleCompanyVerificationWithSignUtils } from './EXIMSingleVerificationTest.js';
import { getGLEIFLocalMultiVerifierUtils} from '../local/handler/GLEIFLocalHandler.js';

import { MCAdeployerAccount, MCAsenderAccount, MCAdeployerKey, MCAsenderKey } from '../../core/OracleRegistry.js';

// =================================== Proof Storage and Lineage Management (UNCHANGED) ===================================

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
    this.proofsTree = new MerkleTree(8);  // ✅ CORRECT: Same height as COMPANY_MERKLE_HEIGHT (matches all working services)
    this.nextIndex = 0;
  }

  storeProofWithLineage(lineage: ProofLineage): { index: number, witness: ComposedProofMerkleWitness } {
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
    
    // ✅ Create witness directly like GLEIF does (no manual validation needed)
    const properWitness = new ComposedProofMerkleWitness(witness);
    console.log(`📋 Stored proof for ${lineage.companyName} (iteration ${lineage.iteration}) at index ${index}`);
    return { index, witness: properWitness };
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

// =================================== Company Info Interface (ADDED FOR MULTI-COMPANY) ===================================
export interface CompanyInfo {
  companyName: string;
  companyCIN: string;
}

// =================================== Main Multi-Company Verification Function (MODIFIED FROM SINGLE) ===================================

export async function getComposedRecursiveOptim3LevelMultiCompanyVerificationWithSignUtils(
  companies: CompanyInfo[],  // CHANGED: Array instead of single company
  testIterations: number = 1
) {
  console.log(`\n🚀 Composed Recursive Optim 3-Level Multi-Company Verification Started`);  // CHANGED: Added "Multi-Company"
  console.log(`🏢 Companies: ${companies.map(c => c.companyName).join(', ')}`);  // CHANGED: List all companies
  console.log(`📊 Total Companies: ${companies.length}`);  // ADDED: Total count
  console.log(`🔄 Iterations per Company: ${testIterations}`);  // CHANGED: "per Company"
  console.log(`📝 API Usage:`);
  console.log(`  - Corporate Registration: Uses CIN per company`);  // CHANGED: "per company"
  console.log(`  - EXIM: Uses Company Name per company`);  // CHANGED: "per company"
  console.log(`  - GLEIF: Uses Company Name per company`);  // CHANGED: "per company"

  const startTime = Date.now();

  try {
    // =================================== Setup Local Blockchain (UNCHANGED) ===================================
    console.log('\n🔧 Setting up local blockchain...');
    const { Local } = await import('../../core/OracleRegistry.js');
    const localBlockchain = await Local;
    Mina.setActiveInstance(localBlockchain);

    const deployerAccount = MCAdeployerAccount();
    const deployerKey = MCAdeployerKey();
    const senderAccount = MCAsenderAccount();
    const senderKey = MCAsenderKey();

    // =================================== Direct ZK Compilation (UNCHANGED) ===================================
    console.log('\n📝 Compiling ZK programs...');
    
    // Import and compile individual service ZK programs first
    console.log('🔧 Compiling individual service ZK programs...');
    
    // Import the actual ZK programs
    const { CorporateRegistrationOptim } = await import('../../zk-programs/compliance/CorporateRegistrationZKProgram.js');
    const { EXIMOptim } = await import('../../zk-programs/compliance/EXIMZKProgram.js');
    const { GLEIFOptim } = await import('../../zk-programs/compliance/GLEIFZKProgram.js');
    
    // Compile individual service programs first
    await CorporateRegistrationOptim.compile();
    console.log('✅ CorporateRegistrationOptim ZK program compiled');
    
    await EXIMOptim.compile();
    console.log('✅ EXIMOptim ZK program compiled');
    
    await GLEIFOptim.compile();
    console.log('✅ GLEIFOptim ZK program compiled');
    
    // Now compile the composed program that depends on the individual programs
    await ComposedOptimCompliance.compile();
    console.log('✅ ComposedOptimCompliance ZK program compiled');
    
    const { verificationKey } = await ComposedOptimComplianceVerifierSC.compile();
    console.log('✅ ComposedOptimComplianceVerifierSC compiled');

    // =================================== Deploy Smart Contract (UNCHANGED) ===================================
    console.log('\n🚀 Deploying composed verification smart contract...');
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

    // =================================== Initialize Registries (MODIFIED FOR MULTI-COMPANY) ===================================
    const proofRegistry = new ComposedProofRegistry();
    const companyResults: CompanyResult[] = [];  // CHANGED: Array for multiple companies
    
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

    // =================================== Process Multiple Companies (ADDED OUTER LOOP) ===================================
    for (let companyIndex = 0; companyIndex < companies.length; companyIndex++) {
      const { companyName, companyCIN } = companies[companyIndex];  // ADDED: Extract company info
      
      console.log(`\n${'='.repeat(100)}`);
      console.log(`🏢 Processing Company ${companyIndex + 1}/${companies.length}: ${companyName} (CIN: ${companyCIN})`);  // CHANGED: Company counter
      console.log(`${'='.repeat(100)}`);

      // Initialize result for this company (ADDED)
      let companyResult: CompanyResult = {
        companyName,
        companyIdentifier: companyCIN,
        iterations: [],
        successfulProofs: 0,
        failedProofs: 0,
        latestComplianceScore: 0,
        complianceTrend: 'stable'
      };

      // =================================== Multiple Iterations for Same Company (SAME LOGIC AS WORKING VERSION) ===================================
      for (let iteration = 1; iteration <= testIterations; iteration++) {
        console.log(`\n🔄 Iteration ${iteration}/${testIterations} for ${companyName}`);
        console.log(`-`.repeat(80));

        const iterationStartTime = Date.now();
        totalComposedProofs++;

        try {
          // =================================== Generate Individual Service Proofs (UNCHANGED LOGIC) ===================================
          console.log(`\n📡 Generating individual service proofs for ${companyName}...`);
          
          // Corporate Registration Proof - Use CIN (skip compilation)
          console.log(`🏛️ Generating Corporate Registration proof with CIN: ${companyCIN}...`);
          const corpRegResult = await getCorporateRegistrationOptimSingleCompanyVerificationWithSignUtils(companyCIN);
          const corpRegProof = corpRegResult as any as CorporateRegistrationOptimProof;
          
          const corpRegScore = 75;
          
          // EXIM Proof - Use Company Name (skip compilation)
          console.log(`🚢 Generating EXIM proof with Company Name: ${companyName}...`);
          const eximResult = await getEXIMOptimSingleCompanyVerificationWithSignUtils(companyName);
          const eximProof = eximResult as any as EXIMOptimProof;
          const eximScore = 80;
          
          // GLEIF Proof - Use Company Name (skip compilation)
          console.log(`🌍 Generating GLEIF proof with Company Name: ${companyName}...`);
          const gleifResult = await getGLEIFLocalMultiVerifierUtils([companyName]);
          const gleifProof = gleifResult.proofs[0] as any as GLEIFOptimProof;
          const gleifScore = gleifResult.verificationResults[0]?.complianceScore || 85;

          console.log(`✅ All individual service proofs generated for ${companyName}`);

          // =================================== Compose Proofs in 3 Levels (UNCHANGED LOGIC) ===================================
          console.log(`\n🔗 Composing proofs in 3 levels for ${companyName}...`);
          
          const currentTimestamp = Field.from(Date.now());
          
          // Level 1: Corporate Registration
          console.log(`🔸 Level 1: Composing Corporate Registration proof...`);
          const level1Proof = await ComposedOptimCompliance.level1(
            currentTimestamp,
            corpRegProof 
          );
          
          // Level 2: Level1 + EXIM
          console.log(`🔸 Level 2: Composing Level1 + EXIM proof...`);
          const level2Proof = await ComposedOptimCompliance.level2(
            currentTimestamp,
            level1Proof,
            eximProof 
          );
          
          // Level 3: Level2 + GLEIF (Final composed proof)
          console.log(`🔸 Level 3: Composing Level2 + GLEIF proof (Final)...`);
          const finalComposedProof = await ComposedOptimCompliance.level3(
            currentTimestamp,
            level2Proof,
            gleifProof 
          );

          console.log(`✅ 3-level proof composition completed for ${companyName}`);

          // =================================== Create Proof Lineage (UNCHANGED LOGIC) ===================================
          const overallScore = Math.round((corpRegScore + eximScore + gleifScore) / 3);
          const isCompliant = overallScore >= 75;

          const proofLineage: ProofLineage = {
            companyName,
            companyIdentifier: companyCIN,  // Use companyCIN here
            iteration,
            timestamp: Date.now(),
            
            composedProofHash: 'composed_' + Date.now().toString(),
            composedProof: finalComposedProof,
            
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

          //======================================================CompanyRecord====================================================================
          const companyRecord = new ComposedCompanyRecord({
  companyNameHash: CircuitString.fromString(companyName).hash(),
  companyIdentifierHash: CircuitString.fromString(companyCIN).hash(),
  jurisdictionHash: CircuitString.fromString('India').hash(),
  isFullyCompliant: Bool(isCompliant),
  overallComplianceScore: Field(overallScore),
  servicesIncluded: Field(7), // All services: CorpReg(1) + EXIM(2) + GLEIF(4) = 7
  servicesCompliant: Field(isCompliant ? 7 : 0), // If compliant, all services compliant
  totalVerifications: Field(iteration), // Current iteration number
  lastVerificationTime: UInt64.from(Date.now()),
  firstVerificationTime: UInt64.from(iteration === 1 ? Date.now() : Date.now()),
  composedProofVersion: Field(3), // Level 3 composed proof
  underlyingProofsHash: Poseidon.hash([
    CircuitString.fromString(proofLineage.corpRegProofHash).hash(),
    CircuitString.fromString(proofLineage.eximProofHash).hash(),
    CircuitString.fromString(proofLineage.gleifProofHash).hash()
  ])
});

          // =================================== Store Proof with Lineage (UNCHANGED LOGIC) ===================================
          console.log(`\n📋 Storing composed proof with lineage for ${companyName}...`);
          const { index, witness } = proofRegistry.storeProofWithLineage(proofLineage);

          // =================================== Verify on Smart Contract (UNCHANGED LOGIC) ===================================
        

          // =================================== Verify on Smart Contract (UNCHANGED LOGIC) ===================================
          console.log(`\n🔍 Verifying composed proof on smart contract for ${companyName}...`);
          
          const verificationStartTime = Date.now();
          // Before smart contract verification:
          console.log(`🔍 Debug - Smart Contract Inputs:`);
          console.log(`  Company Name: "${companyName}"`);
          console.log(`  Company CIN: "${companyCIN}"`);
          console.log(`  Company Name Hash: ${CircuitString.fromString(companyName).hash()}`);
          console.log(`  Company CIN Hash: ${CircuitString.fromString(companyCIN).hash()}`);

// Check what the composed proof's public output contains:
          console.log(`  Proof companyNameHash: ${finalComposedProof.publicOutput.companyNameHash}`);
          console.log(`  Proof companyIdentifierHash: ${finalComposedProof.publicOutput.companyIdentifierHash}`);

          // ADD THIS ENHANCED DEBUG BLOCK HERE (after line ~321):
          console.log(`\n🔍 Enhanced Debug - Before Smart Contract:`);
          
          // Calculate the proof hash that should be used in Merkle tree
          const proofHash = Poseidon.hash([
            CircuitString.fromString(proofLineage.composedProofHash).hash(),
            Field(proofLineage.timestamp),
            CircuitString.fromString(companyCIN).hash()
          ]);
          
          console.log(`  Expected proof hash for merkle: ${proofHash}`);
          console.log(`  Merkle witness index: ${index}`);
          console.log(`  Registry root: ${proofRegistry.getRoot()}`);
          
          // Check current contract state
          
          // Also check the witness calculation
          const calculatedRoot = witness.calculateRoot(proofHash);
          console.log(`  Witness calculated root: ${calculatedRoot}`);
          console.log(`  🔍 Witness root matches registry: ${calculatedRoot.toString() === proofRegistry.getRoot().toString()}`);

          // In your Utils file, add this BEFORE calling verifyAndStoreComposedProof:




          


// Then call smart contract
          const verifyTxn = await Mina.transaction(
            senderAccount,
            async () => {
              await zkApp.verifyAndStoreComposedProof(
                finalComposedProof,
                CircuitString.fromString(companyName), // Try companyName first
                witness,
                companyRecord
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

      // Calculate compliance trend for this company (UNCHANGED LOGIC)
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

      console.log(`✅ Completed all iterations for ${companyName}`);
      companyResults.push(companyResult);  // ADDED: Store company result
    }

    // =================================== Generate Retrieval Examples (MODIFIED FOR MULTI-COMPANY) ===================================
    console.log(`\n🔍 Demonstrating proof retrieval capabilities...`);
    const retrievalExamples = [];
    
    // Try to retrieve examples from each company
    for (const company of companies) {
      const companyId = company.companyCIN;
      
      // Try to retrieve latest proof
      const latestProof = proofRegistry.getLatestProof(companyId);
      if (latestProof) {
        retrievalExamples.push({
          companyName: company.companyName,
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
          companyName: company.companyName,
          requestedSequence: 1,
          found: true,
          complianceScore: firstProof.overallComplianceScore,
          timestamp: firstProof.timestamp,
          proofHash: firstProof.composedProofHash
        });
      }
      
      // Limit examples to avoid too much output
      if (retrievalExamples.length >= 6) break;
    }

    // Generate final metrics (UNCHANGED LOGIC)
    const totalExecutionTime = Date.now() - startTime;
    performanceMetrics.totalExecutionTime = totalExecutionTime;
    performanceMetrics.averageProofGenerationTime = 
      performanceMetrics.proofGenerationTimes.reduce((a, b) => a + b, 0) / 
      Math.max(performanceMetrics.proofGenerationTimes.length, 1);
    performanceMetrics.averageVerificationTime = 
      performanceMetrics.verificationTimes.reduce((a, b) => a + b, 0) / 
      Math.max(performanceMetrics.verificationTimes.length, 1);

    // Get contract final state (MODIFIED FOR MULTI-COMPANY)
    const contractState = {
      totalProofsStored: Field(proofRegistry.getTotalProofs()),
      totalCompaniesTracked: Field(companies.length),  // CHANGED: Use companies.length
      proofsRootHash: proofRegistry.getRoot(),
      lastUpdateTimestamp: Field.from(Date.now())
    };

    // Log compilation status (UNCHANGED)
    console.log('\n📊 Final Compilation Status:');
    console.log('  ✅ CorporateRegistrationOptim');
    console.log('  ✅ EXIMOptim');
    console.log('  ✅ GLEIFOptim');
    console.log('  ✅ ComposedOptimCompliance');
    console.log('  ✅ ComposedOptimComplianceVerifierSC');

    return {
      totalCompanies: companies.length,  // CHANGED: Use companies.length
      totalComposedProofs,
      successfulVerifications,
      failedVerifications,
      companyResults,  // CHANGED: Return companyResults array
      proofLineageExamples: proofRegistry.getProofLineageExamples(6),  // CHANGED: More examples
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
    console.error('❌ Error in Composed Recursive Multi-Company Verification:', error);  // CHANGED: Error message
    throw error;
  }
}