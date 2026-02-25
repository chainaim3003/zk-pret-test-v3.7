import * as dotenv from 'dotenv';
dotenv.config();

import { Field, Mina, PrivateKey, AccountUpdate, MerkleTree } from 'o1js';

// Composed ZK Programs and Contracts
import { ComposedOptimCompliance } from '../../../zk-programs/compliance/ComposedRecursiveOptim3LevelZKProgramWithSign.js';
import {
  ComposedOptimComplianceVerifierSC,
  ComposedProofMerkleWitness,
} from '../../../contracts/compliance/composed/ComposedRecursiveOptim3LevelSmartContractWithSign.js';

// Individual service verification utilities - These use LOCAL blockchain internally
import { getCorporateRegistrationOptimSingleCompanyVerificationWithSignUtils } from '../../../impl/test/CorporateRegistrationSingleVerificationTest.js';
import { getEXIMOptimSingleCompanyVerificationWithSignUtils } from '../../../impl/test/EXIMSingleVerificationTest.js';
import { getGLEIFLocalMultiVerifierUtils } from './GLEIFLocalHandler.js';

// Oracle accounts for LOCAL
import {
  COMPOSEDdeployerAccount,
  COMPOSEDsenderAccount,
  COMPOSEDdeployerKey,
  COMPOSEDsenderKey,
} from '../../../core/OracleRegistry.js';

import { safeCircuitString, CIRCUIT_STRING_MAX_LENGTHS } from '../../../utils/core/CoreZKUtilities.js';

// ═══════════════════════════════════════════════════════════════════════════
// TREE STRUCTURE VISUALIZATION HELPERS
// ═══════════════════════════════════════════════════════════════════════════

const TREE_SYMBOLS = {
  BRANCH: '├─',
  LAST_BRANCH: '└─',
  VERTICAL: '│',
  INDENT: '   ',
  SEPARATOR_THICK: '═'.repeat(80),
  SEPARATOR_THIN: '─'.repeat(80),
  SEPARATOR_DOUBLE: '━'.repeat(80),
};

function printStageSeparator(title: string, style: 'thick' | 'thin' | 'double' = 'thick') {
  const separator = style === 'thick' ? TREE_SYMBOLS.SEPARATOR_THICK : 
                    style === 'double' ? TREE_SYMBOLS.SEPARATOR_DOUBLE :
                    TREE_SYMBOLS.SEPARATOR_THIN;
  console.log(`\n${separator}`);
  if (title) {
    console.log(`${title}`);
    console.log(separator);
  }
}

function printTreeBranch(text: string, isLast: boolean = false, depth: number = 0) {
  const indent = TREE_SYMBOLS.INDENT.repeat(depth);
  const symbol = isLast ? TREE_SYMBOLS.LAST_BRANCH : TREE_SYMBOLS.BRANCH;
  console.log(`${indent}${symbol} ${text}`);
}

function printTreeLeaf(text: string, depth: number = 0) {
  const indent = TREE_SYMBOLS.INDENT.repeat(depth);
  console.log(`${indent}   ${text}`);
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPOSED LOCAL HANDLER WITH TREE STRUCTURE
// ═══════════════════════════════════════════════════════════════════════════

export async function getComposedLocalMultiVerifierUtils(
  companyName: string,
  companyCIN: string,
  testIterations: number = 1
) {
  printStageSeparator('🚀 COMPOSED RECURSIVE 3-LEVEL VERIFICATION (LOCAL)', 'thick');
  console.log(`🏢 Company: ${companyName}`);
  console.log(`🆔 CIN: ${companyCIN}`);
  console.log(`🔄 Test Iterations: ${testIterations}`);
  console.log(`🏠 Environment: LOCAL blockchain`);
  console.log(`📝 Mode: Real blockchain submission (same as individual handlers)`);
  printStageSeparator('', 'thick');

  try {
    // === LOCAL BLOCKCHAIN SETUP ===
    console.log('\n🔧 Setting up local blockchain...');
    const { Local } = await import('../../../core/OracleRegistry.js');
    const localBlockchain = await Local;
    Mina.setActiveInstance(localBlockchain);

    const deployerAccount = COMPOSEDdeployerAccount();
    const deployerKey = COMPOSEDdeployerKey();
    const senderAccount = COMPOSEDsenderAccount();
    const senderKey = COMPOSEDsenderKey();

    console.log(`🔑 Using COMPOSED oracle accounts :`);

    console.log(`   Deployer: ${deployerAccount.toBase58()}`);
    console.log(`   Sender: ${senderAccount.toBase58()}`);
    console.log('✅ Local blockchain initialized');

    // === ZK COMPILATION  ===
    printStageSeparator('📝 COMPILATION STAGE: ZK Programs & Smart Contracts', 'thin');
    console.log('⏱️  Estimated time: 2-3 minutes total\n');

    const { CorporateRegistrationOptim } = await import(
      '../../../zk-programs/compliance/CorporateRegistrationOptimZKProgram.js'
    );
    const { EXIM } = await import('../../../zk-programs/compliance/EXIMZKProgram.js');
    const { GLEIFOptim } = await import('../../../zk-programs/compliance/GLEIFZKProgram.js');

    console.log('🔧 [1/5] Compiling CorporateRegistrationOptim ZK Program...');
    await CorporateRegistrationOptim.compile();
    console.log('✅ [1/5] CorporateRegistrationOptim compiled');

    console.log('🔧 [2/5] Compiling EXIM ZK Program...');
    await EXIM.compile();
    console.log('✅ [2/5] EXIM compiled');

    console.log('🔧 [3/5] Compiling GLEIFOptim ZK Program...');
    await GLEIFOptim.compile();
    console.log('✅ [3/5] GLEIFOptim compiled');

    console.log('🔧 [4/5] Compiling ComposedOptimCompliance ZK Program...');
    await ComposedOptimCompliance.compile();
    console.log('✅ [4/5] ComposedOptimCompliance compiled');

    console.log('🔧 [5/5] Compiling ComposedOptimComplianceVerifierSC Smart Contract...');
    const { verificationKey } = await ComposedOptimComplianceVerifierSC.compile();
    console.log('✅ [5/5] ComposedOptimComplianceVerifierSC compiled');

    console.log('\n🎉 All ZK programs and smart contracts compiled successfully!');

    // === CONTRACT DEPLOYMENT ===
    printStageSeparator('🚀 DEPLOYMENT STAGE: Smart Contract to LOCAL Blockchain', 'thin');
    const zkAppKey = PrivateKey.random();
    const zkAppAddress = zkAppKey.toPublicKey();
    const zkApp = new ComposedOptimComplianceVerifierSC(zkAppAddress);

    console.log('📋 Contract Details:');
    console.log(`   Address: ${zkAppAddress.toBase58()}`);
    console.log(`   Blockchain: LOCAL`);
    console.log(`   Verification Key: ${verificationKey.hash.toString().substring(0, 20)}...`);

    const deployTxn = await Mina.transaction(deployerAccount, async () => {
      AccountUpdate.fundNewAccount(deployerAccount);
      await zkApp.deploy({ verificationKey });
    });
    await deployTxn.sign([deployerKey, zkAppKey]).send();
    console.log('✅ Composed smart contract deployed successfully on LOCAL blockchain');

    // === PROCESSING ===
    const proofs: any[] = [];
    const verificationResults: any[] = [];

    for (let iteration = 1; iteration <= testIterations; iteration++) {
      printStageSeparator(`🔄 ITERATION ${iteration}/${testIterations} FOR ${companyName}`, 'double');

      try {
        // ═══════════════════════════════════════════════════════════════════
        // STAGE 1: INDIVIDUAL SERVICE VERIFICATIONS
        // ═══════════════════════════════════════════════════════════════════
        printStageSeparator('📊 STAGE 1: Individual Service Verifications', 'thin');
        console.log('⏱️  Estimated time: 3-5 minutes total');
        console.log('📝 Each service: API call → ZK proof → Blockchain submission\n');

        // Service 1: Corporate Registration
        printTreeBranch('[1/3] 🏛️  Corporate Registration Verification', false, 0);
        printTreeLeaf(`📋 Input: CIN = ${companyCIN}`, 1);
        printTreeLeaf('📡 Fetching API data from Corporate Registry...', 1);
        printTreeLeaf('🌳 Creating Merkle tree from company data...', 1);
        printTreeLeaf('⚡ Generating ZK proof (compliance verification)...', 1);
        printTreeLeaf('📤 Submitting proof to LOCAL blockchain...', 1);
        
        const corpRegStartTime = Date.now();
        const corpRegProof = await getCorporateRegistrationOptimSingleCompanyVerificationWithSignUtils(companyCIN);
        const corpRegDuration = ((Date.now() - corpRegStartTime) / 1000).toFixed(2);
        
        printTreeLeaf(`✅ Corporate Registration complete (${corpRegDuration}s)`, 1);
        printTreeLeaf(`🔗 Proof Hash: ${corpRegProof.publicOutput?.toString().substring(0, 40)}...`, 1);
        console.log('');

        // Service 2: EXIM
        printTreeBranch('[2/3] 🚢 EXIM Compliance Verification', false, 0);
        printTreeLeaf(`📋 Input: Company Name = ${companyName}`, 1);
        printTreeLeaf('📡 Fetching API data from EXIM Registry...', 1);
        printTreeLeaf('🌳 Creating Merkle tree from EXIM data...', 1);
        printTreeLeaf('⚡ Generating ZK proof (import/export compliance)...', 1);
        printTreeLeaf('📤 Submitting proof to LOCAL blockchain...', 1);
        
        const eximStartTime = Date.now();
        const eximProof = await getEXIMOptimSingleCompanyVerificationWithSignUtils(companyName);
        const eximDuration = ((Date.now() - eximStartTime) / 1000).toFixed(2);
        
        printTreeLeaf(`✅ EXIM Verification complete (${eximDuration}s)`, 1);
        printTreeLeaf(`🔗 Proof Hash: ${eximProof.publicOutput?.toString().substring(0, 40)}...`, 1);
        console.log('');

        // Service 3: GLEIF
        printTreeBranch('[3/3] 🌍 GLEIF Entity Verification', true, 0);
        printTreeLeaf(`📋 Input: Company Name = ${companyName}`, 1);
        printTreeLeaf('📡 Fetching API data from GLEIF (Global LEI System)...', 1);
        printTreeLeaf('🌳 Creating Merkle tree from LEI data...', 1);
        printTreeLeaf('⚡ Generating ZK proof (entity compliance)...', 1);
        printTreeLeaf('📤 Submitting proof to LOCAL blockchain...', 1);
        
        const gleifStartTime = Date.now();
        const gleifResult = await getGLEIFLocalMultiVerifierUtils([companyName]);
        const gleifProof = gleifResult.proofs[0];
        const gleifDuration = ((Date.now() - gleifStartTime) / 1000).toFixed(2);
        
        printTreeLeaf(`✅ GLEIF Verification complete (${gleifDuration}s)`, 1);
        printTreeLeaf(`🔗 Proof Hash: ${gleifProof.publicOutput?.toString().substring(0, 40)}...`, 1);

        console.log('\n📊 Individual Service Summary:');
        console.log(`   ✅ Corporate Registration: ${corpRegDuration}s`);
        console.log(`   ✅ EXIM Compliance: ${eximDuration}s`);
        console.log(`   ✅ GLEIF Entity: ${gleifDuration}s`);
        console.log(`   📤 Blockchain Submissions: 3/3 successful`);

        // ═══════════════════════════════════════════════════════════════════
        // STAGE 2: RECURSIVE PROOF COMPOSITION (3 LEVELS)
        // ═══════════════════════════════════════════════════════════════════
        printStageSeparator('🔗 STAGE 2: Recursive Proof Composition (3 Levels)', 'thin');
        console.log('📝 Building hierarchical proof structure using recursive composition\n');

        const timestamp = Field.from(Date.now());

        // Level 1: Corporate Registration Base
        console.log('🔸 Level 1: Corporate Registration Foundation');
        printTreeBranch('Input: Corporate Registration ZK Proof', false, 1);
        printTreeLeaf('Operation: Wrap in Level 1 recursive structure', 1);
        printTreeLeaf('Purpose: Establish company identity baseline', 1);
        
        const level1StartTime = Date.now();
        const level1Proof = await ComposedOptimCompliance.level1(timestamp, corpRegProof);
        const level1Duration = ((Date.now() - level1StartTime) / 1000).toFixed(2);
        
        printTreeBranch(`✅ Level 1 Composed (${level1Duration}s)`, true, 1);
        printTreeLeaf(`Proof Hash: ${level1Proof.publicOutput.underlyingProofsHash.toString().substring(0, 40)}...`, 2);
        printTreeLeaf(`Timestamp: ${timestamp.toString()}`, 2);
        console.log('');

        // Level 2: Add EXIM Compliance
        console.log('🔸 Level 2: Level 1 + EXIM Compliance');
        printTreeBranch('Input 1: Level 1 Composed Proof (CorpReg)', false, 1);
        printTreeBranch('Input 2: EXIM ZK Proof', false, 1);
        printTreeLeaf('Operation: Recursive composition of two proofs', 1);
        printTreeLeaf('Purpose: Add import/export compliance layer', 1);
        
        const level2StartTime = Date.now();
        const level2Proof = await ComposedOptimCompliance.level2(timestamp, level1Proof, eximProof);
        const level2Duration = ((Date.now() - level2StartTime) / 1000).toFixed(2);
        
        printTreeBranch(`✅ Level 2 Composed (${level2Duration}s)`, true, 1);
        printTreeLeaf(`Proof Hash: ${level2Proof.publicOutput.underlyingProofsHash.toString().substring(0, 40)}...`, 2);
        printTreeLeaf(`Previous Level: ${level1Proof.publicOutput.underlyingProofsHash.toString().substring(0, 20)}...`, 2);
        console.log('');

        // Level 3: Add GLEIF (Final)
        console.log('🔸 Level 3: Level 2 + GLEIF Entity (FINAL COMPOSITION)');
        printTreeBranch('Input 1: Level 2 Composed Proof (CorpReg + EXIM)', false, 1);
        printTreeBranch('Input 2: GLEIF ZK Proof', false, 1);
        printTreeLeaf('Operation: Final recursive composition', 1);
        printTreeLeaf('Purpose: Complete multi-source compliance proof', 1);
        
        const level3StartTime = Date.now();
        const level3Proof = await ComposedOptimCompliance.level3(timestamp, level2Proof, gleifProof);
        const level3Duration = ((Date.now() - level3StartTime) / 1000).toFixed(2);
        
        printTreeBranch(`✅ Level 3 Composed - FINAL PROOF (${level3Duration}s)`, true, 1);
        printTreeLeaf(`Proof Hash: ${level3Proof.publicOutput.underlyingProofsHash.toString().substring(0, 40)}...`, 2);
        printTreeLeaf(`Previous Level: ${level2Proof.publicOutput.underlyingProofsHash.toString().substring(0, 20)}...`, 2);
        printTreeLeaf(`Contains: CorpReg → EXIM → GLEIF (3 services verified)`, 2);

        console.log('\n📊 Composition Summary:');
        console.log(`   🔸 Level 1 (CorpReg): ${level1Duration}s`);
        console.log(`   🔸 Level 2 (+ EXIM): ${level2Duration}s`);
        console.log(`   🔸 Level 3 (+ GLEIF): ${level3Duration}s`);
        console.log(`   🏆 Final Composed Proof: Ready for blockchain`);

        // ═══════════════════════════════════════════════════════════════════
        // STAGE 3: BLOCKCHAIN SUBMISSION
        // ═══════════════════════════════════════════════════════════════════
        printStageSeparator('📤 STAGE 3: Composed Proof Blockchain Submission', 'thin');

        const proofsTree = new MerkleTree(16);
        const proofIndex = BigInt(iteration - 1);
        const proofHash = Field.random();
        proofsTree.setLeaf(proofIndex, proofHash);
        const witness = proofsTree.getWitness(proofIndex);
        const composedWitness = new ComposedProofMerkleWitness(witness);

        console.log('🔧 Preparing blockchain transaction...');
        console.log(`   Contract: ${zkAppAddress.toBase58()}`);
        console.log(`   Sender: ${senderAccount.toBase58()}`);
        console.log(`   Proof Type: Level 3 Composed (3 services)`);

        const verifyTxn = await Mina.transaction(senderAccount, async () => {
          await zkApp.verifyAndStoreComposedProof(
            level3Proof,
            safeCircuitString(companyCIN, CIRCUIT_STRING_MAX_LENGTHS.SHORT, 'companyCIN'),
            composedWitness,
            timestamp
          );
        });

        console.log('⚡ Generating transaction proof...');
        const txProofStartTime = Date.now();
        await verifyTxn.prove();
        const txProofDuration = ((Date.now() - txProofStartTime) / 1000).toFixed(2);
        console.log(`✅ Transaction proof generated (${txProofDuration}s)`);

        console.log('📝 Signing transaction with oracle key...');
        await verifyTxn.sign([senderKey]).send();
        console.log('✅ Transaction sent to LOCAL blockchain');

        console.log('\n📊 Blockchain Submission Complete:');
        console.log(`   ✅ Composed proof verified on-chain`);
        console.log(`   ✅ Company record stored: ${companyCIN}`);
        console.log(`   ✅ Compliance data: 3 services combined`);

        // ═══════════════════════════════════════════════════════════════════
        // STAGE 4: VERIFICATION COMPLETE
        // ═══════════════════════════════════════════════════════════════════
        printStageSeparator('✅ VERIFICATION SUMMARY', 'thin');

        const totalDuration = (
          parseFloat(corpRegDuration) + 
          parseFloat(eximDuration) + 
          parseFloat(gleifDuration) + 
          parseFloat(level1Duration) + 
          parseFloat(level2Duration) + 
          parseFloat(level3Duration) + 
          parseFloat(txProofDuration)
        ).toFixed(2);

        console.log(`🎯 Iteration ${iteration}/${testIterations} completed successfully!\n`);
        
        console.log('📋 Processing Tree:');
        printTreeBranch('Individual Service Proofs: 3/3 ✅', false, 0);
        printTreeLeaf(`├─ Corporate Registration: ${corpRegDuration}s`, 1);
        printTreeLeaf(`├─ EXIM Compliance: ${eximDuration}s`, 1);
        printTreeLeaf(`└─ GLEIF Entity: ${gleifDuration}s`, 1);
        console.log('');
        printTreeBranch('Recursive Composition: 3 Levels ✅', false, 0);
        printTreeLeaf(`├─ Level 1: ${level1Duration}s`, 1);
        printTreeLeaf(`├─ Level 2: ${level2Duration}s`, 1);
        printTreeLeaf(`└─ Level 3: ${level3Duration}s`, 1);
        console.log('');
        printTreeBranch('Blockchain Transactions: 4/4 ✅', true, 0);
        printTreeLeaf(`├─ Corporate Registration: Submitted`, 1);
        printTreeLeaf(`├─ EXIM Compliance: Submitted`, 1);
        printTreeLeaf(`├─ GLEIF Entity: Submitted`, 1);
        printTreeLeaf(`└─ Composed Proof: Submitted (${txProofDuration}s)`, 1);

        console.log(`\n⏱️  Total Processing Time: ${totalDuration}s`);
        console.log(`📊 Average per Service: ${(parseFloat(totalDuration) / 4).toFixed(2)}s`);
        console.log(`🏆 All transactions recorded on LOCAL blockchain!`);

        proofs.push(level3Proof);
        verificationResults.push({  
          companyName,
          companyCIN,
          iteration,
          timestamp: Date.now(),
          isCompliant: true,
          level1ProofHash: level1Proof.publicOutput.underlyingProofsHash.toString(),
          level2ProofHash: level2Proof.publicOutput.underlyingProofsHash.toString(),
          level3ProofHash: level3Proof.publicOutput.underlyingProofsHash.toString(),
          processingTime: {
            corpReg: corpRegDuration,
            exim: eximDuration,
            gleif: gleifDuration,
            level1: level1Duration,
            level2: level2Duration,
            level3: level3Duration,
            transaction: txProofDuration,
            total: totalDuration
          }
        });

      } catch (error: any) {
        console.error(`\n❌ Error in iteration ${iteration}:`, error.message);
        console.error(`   Stack: ${error.stack}`);
        verificationResults.push({
          companyName,
          companyCIN,
          iteration,
          error: error.message,
        });
      }
    }

    // === FINAL STATISTICS ===
    printStageSeparator('🎉 COMPOSED VERIFICATION COMPLETED!', 'thick');

    const successCount = verificationResults.filter((r) => !r.error).length;
    const failCount = verificationResults.filter((r) => r.error).length;

    console.log(`\n📈 Final Statistics:`);
    console.log(`   🏢 Company: ${companyName}`);
    console.log(`   🆔 CIN: ${companyCIN}`);
    console.log(`   🏠 Environment: LOCAL blockchain`);
    console.log(`   🔄 Total Iterations: ${testIterations}`);
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ❌ Failed: ${failCount}`);
    console.log(`   📊 Success Rate: ${((successCount / testIterations) * 100).toFixed(1)}%`);

    if (successCount > 0) {
      console.log(`\n✅ SUCCESS BREAKDOWN:`);
      console.log(`   📤 Individual proofs submitted: ${successCount * 3}`);
      console.log(`   🔗 Composed proofs submitted: ${successCount}`);
      console.log(`   📊 Total blockchain transactions: ${successCount * 4}`);
      console.log(`   🌳 Proof composition levels: 3 (hierarchical)`);
    }

    if (failCount > 0) {
      console.log(`\n⚠️  FAILURES:`);
      verificationResults
        .filter(r => r.error)
        .forEach((r, i) => {
          console.log(`   ${i + 1}. Iteration ${r.iteration}: ${r.error}`);
        });
    }

    console.log(`\n🎯 All transactions recorded on LOCAL blockchain!`);
    printStageSeparator('', 'thick');
    
    return {
      company: companyName,
      cin: companyCIN,
      totalComposedProofs: testIterations,
      successfulVerifications: successCount,
      failedVerifications: failCount,
      proofs,
      verificationResults,
      environment: 'LOCAL',
      blockchainSubmissions: successCount * 4,
    };
  } catch (error: any) {
    console.error('\n❌ Fatal error in Composed verification:', error);
    console.error('Stack trace:', error.stack);
    throw error;
  }
}