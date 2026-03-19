/**
 * ComposedLocalHandler.ts  —  CORRECTED LOCAL IMPLEMENTATION
 *
 * Bugs fixed vs previous version:
 *
 * FIX 1 — companyIdentifier derived from proof, not from external parameter
 *   BEFORE: safeCircuitString(companyCIN, 32)  ← external caller value, can mismatch proof
 *   AFTER:  corpRegProof.publicOutput.CIN       ← exact CircuitString inside the proof
 *           contract assertion: proof.companyIdentifierHash == companyIdentifier.hash() ✅
 *
 * FIX 2 — Merkle witness leaf formula now matches the contract exactly
 *   Contract computes leafData as:
 *     proofHash = Poseidon.hash([underlyingProofsHash, companyNameHash, companyIdentifierHash, timestamp])
 *     leafData  = Poseidon.hash([companyIdentifier.hash(), sequenceNumber, proofHash, timestamp])
 *   BEFORE: tree.setLeaf(proofIndex, Field.random())  ← wrong leaf, wrong index
 *   AFTER:  tree.setLeaf(BigInt(iteration), leafData) ← correct leaf matching contract formula
 *
 * FIX 3 — proofIndex now matches contract's sequenceNumber
 *   Contract: sequenceNumber = currentTotal.add(1)
 *             for iteration N with fresh contract: sequenceNumber = N
 *   BEFORE: proofIndex = BigInt(iteration - 1)  ← off by one (0 for first proof)
 *   AFTER:  proofIndex = BigInt(iteration)      ← matches contract sequenceNumber
 *
 * FIX 4 — Accurate log messages (GLEIF individual contract not actually called)
 *   The Composed flow only needs the GLEIFOptimProof object.
 *   The GLEIF sub-handler generates and returns the proof but does not submit
 *   it to the GLEIF multi-company contract — that is expected and correct.
 *   Log messages now reflect what actually happens.
 *
 * Things that were already correct and are kept unchanged:
 *   - Single timestamp: Field.from(Date.now()) captured once, reused for all 3 levels + contract
 *   - servicesIncluded = Field(7), composedProofVersion = Field(3) flow from ZK program ✅
 *   - Proof types (CorpReg/EXIM/GLEIF) match level1/level2/level3 privateInputs ✅
 *   - Mina local blockchain shared across all sub-handlers ✅
 */

import * as dotenv from 'dotenv';
dotenv.config();

import {
  Field,
  Mina,
  PrivateKey,
  AccountUpdate,
  MerkleTree,
  Poseidon,
  CircuitString,
} from 'o1js';

// Composed ZK Programs and Contracts
import { ComposedOptimCompliance } from '../../../zk-programs/compliance/ComposedRecursiveOptim3LevelZKProgramWithSign.js';
import {
  ComposedOptimComplianceVerifierSC,
  ComposedProofMerkleWitness,
} from '../../../contracts/compliance/composed/ComposedRecursiveOptim3LevelSmartContractWithSign.js';

// Individual service verification utilities — these use LOCAL blockchain internally
import { getCorporateRegistrationOptimSingleCompanyVerificationWithSignUtils } from '../../../impl/test/CorporateRegistrationSingleVerificationTest.js';
import { getEXIMOptimSingleCompanyVerificationWithSignUtils } from '../../../impl/test/EXIMSingleVerificationTest.js';
import { getGLEIFLocalMultiVerifierUtils } from './GLEIFLocalHandler.js';

// Oracle accounts for LOCAL — COMPOSED maps to GLEIF test accounts (index 2/3)
import {
  COMPOSEDdeployerAccount,
  COMPOSEDsenderAccount,
  COMPOSEDdeployerKey,
  COMPOSEDsenderKey,
} from '../../../core/OracleRegistry.js';

// ═══════════════════════════════════════════════════════════════════════════
// TREE STRUCTURE VISUALIZATION HELPERS  (unchanged from original)
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
  const separator =
    style === 'thick'
      ? TREE_SYMBOLS.SEPARATOR_THICK
      : style === 'double'
      ? TREE_SYMBOLS.SEPARATOR_DOUBLE
      : TREE_SYMBOLS.SEPARATOR_THIN;
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
// HELPER: compute Merkle leaf exactly as the contract does
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Computes the leaf value the contract will use inside verifyAndStoreComposedProof.
 *
 * Contract logic (exact copy):
 *   const proofHash = Poseidon.hash([
 *     proofOutput.underlyingProofsHash,
 *     proofOutput.companyNameHash,
 *     proofOutput.companyIdentifierHash,
 *     timestamp
 *   ]);
 *   const sequenceNumber = currentTotal.add(Field(1));
 *   const leafData = Poseidon.hash([
 *     expectedCompanyHash,   // companyIdentifier.hash()
 *     sequenceNumber,
 *     proofHash,
 *     timestamp
 *   ]);
 *
 * Off-chain we mirror this exactly so the witness produces the same root.
 */
function computeLeafData(
  level3PublicOutput: {
    underlyingProofsHash: Field;
    companyNameHash: Field;
    companyIdentifierHash: Field;
  },
  companyIdentifierHash: Field,  // = companyIdentifier.hash(), same value
  sequenceNumber: Field,          // = Field(iteration) for fresh contract
  timestamp: Field
): Field {
  const proofHash = Poseidon.hash([
    level3PublicOutput.underlyingProofsHash,
    level3PublicOutput.companyNameHash,
    level3PublicOutput.companyIdentifierHash,
    timestamp,
  ]);
  return Poseidon.hash([companyIdentifierHash, sequenceNumber, proofHash, timestamp]);
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPOSED LOCAL HANDLER
// ═══════════════════════════════════════════════════════════════════════════

export async function getComposedLocalMultiVerifierUtils(
  companyName: string,
  companyCIN: string,
  testIterations: number = 1
) {
  printStageSeparator('🚀 COMPOSED RECURSIVE 3-LEVEL VERIFICATION (LOCAL)', 'thick');
  console.log(`🏢 Company: ${companyName}`);
  console.log(`🆔 CIN (caller input): ${companyCIN}`);
  console.log(`🔄 Test Iterations: ${testIterations}`);
  console.log(`🏠 Environment: LOCAL blockchain`);
  console.log(`📝 Note: companyIdentifier is derived from the CorpReg proof's CIN field,`);
  console.log(`         not directly from the caller's companyCIN parameter.`);
  printStageSeparator('', 'thick');

  try {
    // ── LOCAL BLOCKCHAIN SETUP ──────────────────────────────────────────────
    console.log('\n🔧 Setting up local blockchain...');
    const { Local } = await import('../../../core/OracleRegistry.js');
    const localBlockchain = await Local;
    Mina.setActiveInstance(localBlockchain);

    const deployerAccount = COMPOSEDdeployerAccount();
    const deployerKey = COMPOSEDdeployerKey();
    const senderAccount = COMPOSEDsenderAccount();
    const senderKey = COMPOSEDsenderKey();

    console.log(`🔑 Using COMPOSED oracle accounts:`);
    console.log(`   Deployer: ${deployerAccount.toBase58()}`);
    console.log(`   Sender:   ${senderAccount.toBase58()}`);
    console.log('✅ Local blockchain initialized');

    // ── ZK COMPILATION ─────────────────────────────────────────────────────
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

    // ── CONTRACT DEPLOYMENT ────────────────────────────────────────────────
    printStageSeparator('🚀 DEPLOYMENT STAGE: Smart Contract to LOCAL Blockchain', 'thin');
    const zkAppKey = PrivateKey.random();
    const zkAppAddress = zkAppKey.toPublicKey();
    const zkApp = new ComposedOptimComplianceVerifierSC(zkAppAddress);

    console.log('📋 Contract Details:');
    console.log(`   Address:          ${zkAppAddress.toBase58()}`);
    console.log(`   Blockchain:       LOCAL`);
    console.log(`   Verification Key: ${verificationKey.hash.toString().substring(0, 20)}...`);

    const deployTxn = await Mina.transaction(deployerAccount, async () => {
      AccountUpdate.fundNewAccount(deployerAccount);
      await zkApp.deploy({ verificationKey });
    });
    await deployTxn.sign([deployerKey, zkAppKey]).send();
    console.log('✅ Composed smart contract deployed successfully on LOCAL blockchain');

    // ── ITERATION LOOP ─────────────────────────────────────────────────────
    const proofs: any[] = [];
    const verificationResults: any[] = [];

    for (let iteration = 1; iteration <= testIterations; iteration++) {
      printStageSeparator(
        `🔄 ITERATION ${iteration}/${testIterations} FOR ${companyName}`,
        'double'
      );

      try {
        // ───────────────────────────────────────────────────────────────────
        // STAGE 1: INDIVIDUAL SERVICE VERIFICATIONS
        // ───────────────────────────────────────────────────────────────────
        printStageSeparator('📊 STAGE 1: Individual Service Verifications', 'thin');
        console.log('📝 Each service: API call → ZK proof generation\n');

        // Service 1: Corporate Registration
        printTreeBranch('[1/3] 🏛️  Corporate Registration Verification', false, 0);
        printTreeLeaf(`📋 Input: CIN = ${companyCIN}`, 1);
        printTreeLeaf('📡 Fetching API data from Corporate Registry...', 1);
        printTreeLeaf('⚡ Generating ZK proof (compliance verification)...', 1);

        const corpRegStartTime = Date.now();
        const corpRegProof = await getCorporateRegistrationOptimSingleCompanyVerificationWithSignUtils(
          companyCIN
        );
        const corpRegDuration = ((Date.now() - corpRegStartTime) / 1000).toFixed(2);

        // ── FIX 1: derive companyIdentifier DIRECTLY from the proof's CIN field ──
        // corpRegProof.publicOutput.CIN is the exact CircuitString used inside the
        // CorpReg ZK program.  level1() sets companyIdentifierHash = CIN.hash().
        // The contract asserts: proofOutput.companyIdentifierHash == companyIdentifier.hash()
        // So we MUST pass this exact CircuitString — not an externally supplied string.
        const companyIdentifier: CircuitString = corpRegProof.publicOutput.CIN;
        const resolvedCIN = companyIdentifier.toString();

        printTreeLeaf(`✅ Corporate Registration complete (${corpRegDuration}s)`, 1);
        printTreeLeaf(`🆔 Resolved CIN from proof: ${resolvedCIN}`, 1);
        if (resolvedCIN !== companyCIN) {
          console.warn(
            `   ⚠️  IMPORTANT: API-resolved CIN "${resolvedCIN}" differs from ` +
              `caller CIN "${companyCIN}". Using proof CIN (correct behaviour).`
          );
        }
        console.log('');

        // Service 2: EXIM
        printTreeBranch('[2/3] 🚢 EXIM Compliance Verification', false, 0);
        printTreeLeaf(`📋 Input: Company Name = ${companyName}`, 1);
        printTreeLeaf('📡 Fetching API data from EXIM Registry...', 1);
        printTreeLeaf('⚡ Generating ZK proof (import/export compliance)...', 1);

        const eximStartTime = Date.now();
        const eximProof = await getEXIMOptimSingleCompanyVerificationWithSignUtils(companyName);
        const eximDuration = ((Date.now() - eximStartTime) / 1000).toFixed(2);

        printTreeLeaf(`✅ EXIM Verification complete (${eximDuration}s)`, 1);
        console.log('');

        // Service 3: GLEIF
        printTreeBranch('[3/3] 🌍 GLEIF Entity Verification', true, 0);
        printTreeLeaf(`📋 Input: Company Name = ${companyName}`, 1);
        printTreeLeaf('📡 Fetching API data from GLEIF (Global LEI System)...', 1);
        printTreeLeaf('⚡ Generating ZK proof (entity compliance)...', 1);
        printTreeLeaf(
          '📝 Note: GLEIF proof is generated for composition; GLEIF sub-contract not called here.',
          1
        );

        const gleifStartTime = Date.now();
        const gleifResult = await getGLEIFLocalMultiVerifierUtils([companyName]);
        const gleifProof = gleifResult.proofs[0];
        const gleifDuration = ((Date.now() - gleifStartTime) / 1000).toFixed(2);

        if (!gleifProof) {
          throw new Error(`GLEIF proof generation failed for company: ${companyName}`);
        }

        printTreeLeaf(`✅ GLEIF Verification complete (${gleifDuration}s)`, 1);

        console.log('\n📊 Individual Service Summary:');
        console.log(`   ✅ Corporate Registration: ${corpRegDuration}s`);
        console.log(`   ✅ EXIM Compliance:        ${eximDuration}s`);
        console.log(`   ✅ GLEIF Entity:           ${gleifDuration}s`);
        console.log(`   📝 ZK proofs generated:    3/3`);

        // ───────────────────────────────────────────────────────────────────
        // STAGE 2: RECURSIVE PROOF COMPOSITION (3 LEVELS)
        // ───────────────────────────────────────────────────────────────────
        printStageSeparator('🔗 STAGE 2: Recursive Proof Composition (3 Levels)', 'thin');

        // ── Single timestamp captured ONCE ──────────────────────────────
        // This same Field value is passed to level1, level2, level3, and the
        // smart contract method.  The contract checks:
        //   proofOutput.verificationTimestamp.assertEquals(timestamp)
        // If two separate Date.now() calls were made, the millisecond values
        // would differ and the assertion would fail.
        const timestamp = Field.from(Date.now());
        console.log(`🕐 Timestamp captured: ${timestamp.toString()}`);
        console.log('📝 Same timestamp will be used for all 3 levels and the contract call.\n');

        // Level 1 — Corporate Registration Foundation
        console.log('🔸 Level 1: Corporate Registration Foundation');
        const level1StartTime = Date.now();
        const level1Proof = await ComposedOptimCompliance.level1(timestamp, corpRegProof);
        const level1Duration = ((Date.now() - level1StartTime) / 1000).toFixed(2);
        printTreeBranch(`✅ Level 1 Composed (${level1Duration}s)`, true, 1);
        printTreeLeaf(
          `companyIdentifierHash in proof: ${level1Proof.publicOutput.companyIdentifierHash.toString().substring(0, 30)}...`,
          2
        );
        printTreeLeaf(`servicesIncluded: ${level1Proof.publicOutput.servicesIncluded.toString()}`, 2);
        console.log('');

        // Level 2 — Add EXIM
        console.log('🔸 Level 2: Level 1 + EXIM Compliance');
        const level2StartTime = Date.now();
        const level2Proof = await ComposedOptimCompliance.level2(timestamp, level1Proof, eximProof);
        const level2Duration = ((Date.now() - level2StartTime) / 1000).toFixed(2);
        printTreeBranch(`✅ Level 2 Composed (${level2Duration}s)`, true, 1);
        printTreeLeaf(`servicesIncluded: ${level2Proof.publicOutput.servicesIncluded.toString()}`, 2);
        console.log('');

        // Level 3 — Add GLEIF (Final)
        console.log('🔸 Level 3: Level 2 + GLEIF Entity (FINAL COMPOSITION)');
        const level3StartTime = Date.now();
        const level3Proof = await ComposedOptimCompliance.level3(timestamp, level2Proof, gleifProof);
        const level3Duration = ((Date.now() - level3StartTime) / 1000).toFixed(2);
        printTreeBranch(`✅ Level 3 Composed — FINAL PROOF (${level3Duration}s)`, true, 1);
        printTreeLeaf(
          `servicesIncluded: ${level3Proof.publicOutput.servicesIncluded.toString()} (must be 7)`,
          2
        );
        printTreeLeaf(
          `composedProofVersion: ${level3Proof.publicOutput.composedProofVersion.toString()} (must be 3)`,
          2
        );

        // Sanity check before submitting
        const servicesVal = level3Proof.publicOutput.servicesIncluded.toBigInt();
        if (servicesVal !== 7n) {
          throw new Error(
            `servicesIncluded=${servicesVal} but contract requires Field(7). ` +
              `This means one or more sub-proofs was not included correctly in composition.`
          );
        }

        console.log('\n📊 Composition Summary:');
        console.log(`   🔸 Level 1 (CorpReg):  ${level1Duration}s`);
        console.log(`   🔸 Level 2 (+ EXIM):   ${level2Duration}s`);
        console.log(`   🔸 Level 3 (+ GLEIF):  ${level3Duration}s`);
        console.log(`   🏆 Final Composed Proof: Ready for blockchain`);

        // ───────────────────────────────────────────────────────────────────
        // STAGE 3: BLOCKCHAIN SUBMISSION
        // ───────────────────────────────────────────────────────────────────
        printStageSeparator('📤 STAGE 3: Composed Proof Blockchain Submission', 'thin');

        // ── FIX 2 & 3: Merkle witness with correct leaf formula and index ─

        // The contract uses sequenceNumber = currentTotal.add(Field(1)).
        // For a fresh contract, currentTotal = 0, so sequenceNumber = 1 for iteration 1.
        // For iteration N on a contract that started at zero: sequenceNumber = N.
        // So the tree leaf index = BigInt(iteration).
        const sequenceNumber = Field(iteration);   // matches contract's sequenceNumber
        const proofIndex = BigInt(iteration);      // tree leaf index

        // Compute the companyIdentifierHash — this is companyIdentifier.hash()
        // which equals level3Proof.publicOutput.companyIdentifierHash (they're the same)
        const companyIdentifierHash = companyIdentifier.hash();

        // Mirror the exact Poseidon formula the contract uses for leafData
        const leafData = computeLeafData(
          level3Proof.publicOutput,
          companyIdentifierHash,
          sequenceNumber,
          timestamp
        );

        // Build a fresh MerkleTree(16) — same height as ComposedProofMerkleWitness(16)
        // Set the leaf at the correct index (iteration), get the witness for that index.
        // proofWitness.calculateRoot(leafData) will then reproduce the new root exactly,
        // which the contract stores as proofsRoot.
        const proofsTree = new MerkleTree(16);
        proofsTree.setLeaf(proofIndex, leafData);
        const witness = proofsTree.getWitness(proofIndex);
        const composedWitness = new ComposedProofMerkleWitness(witness);

        console.log('🔧 Preparing blockchain transaction...');
        console.log(`   Contract:          ${zkAppAddress.toBase58()}`);
        console.log(`   Sender:            ${senderAccount.toBase58()}`);
        console.log(`   companyIdentifier: ${resolvedCIN} (from CorpReg proof)`);
        console.log(`   sequenceNumber:    ${iteration} (= currentTotal + 1 on-chain)`);
        console.log(`   Proof leaf index:  ${proofIndex}`);

        // Pass companyIdentifier from proof — NOT safeCircuitString(companyCIN)
        const verifyTxn = await Mina.transaction(senderAccount, async () => {
          await zkApp.verifyAndStoreComposedProof(
            level3Proof,
            companyIdentifier,   // ← derived from corpRegProof.publicOutput.CIN
            composedWitness,
            timestamp            // ← same single timestamp used for all 3 composition levels
          );
        });

        console.log('⚡ Generating transaction proof...');
        const txProofStartTime = Date.now();
        await verifyTxn.prove();
        const txProofDuration = ((Date.now() - txProofStartTime) / 1000).toFixed(2);
        console.log(`✅ Transaction proof generated (${txProofDuration}s)`);

        console.log('📝 Signing and sending transaction to LOCAL blockchain...');
        await verifyTxn.sign([senderKey]).send();
        console.log('✅ Composed proof transaction accepted by LOCAL blockchain');

        // Read back contract state to confirm
        const storedTotal = zkApp.totalProofsStored.get();
        const storedTimestamp = zkApp.lastUpdateTimestamp.get();
        console.log(`\n📊 On-chain state after transaction:`);
        console.log(`   totalProofsStored:    ${storedTotal.toString()}`);
        console.log(`   lastUpdateTimestamp:  ${storedTimestamp.toString()}`);

        // ───────────────────────────────────────────────────────────────────
        // STAGE 4: ITERATION SUMMARY
        // ───────────────────────────────────────────────────────────────────
        printStageSeparator('✅ ITERATION SUMMARY', 'thin');

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
        printTreeBranch('ZK Proof Generation: 3/3 ✅', false, 0);
        printTreeLeaf(`Corporate Registration: ${corpRegDuration}s`, 1);
        printTreeLeaf(`EXIM Compliance:        ${eximDuration}s`, 1);
        printTreeLeaf(`GLEIF Entity:           ${gleifDuration}s`, 1);
        console.log('');
        printTreeBranch('Recursive Composition: 3 Levels ✅', false, 0);
        printTreeLeaf(`Level 1: ${level1Duration}s`, 1);
        printTreeLeaf(`Level 2: ${level2Duration}s`, 1);
        printTreeLeaf(`Level 3: ${level3Duration}s`, 1);
        console.log('');
        printTreeBranch('Blockchain Transactions: 1/1 ✅', true, 0);
        printTreeLeaf(`Composed Proof submitted & verified on LOCAL chain (${txProofDuration}s)`, 1);
        printTreeLeaf(
          `Note: CorpReg and EXIM individual contracts were called during proof generation.`,
          1
        );
        printTreeLeaf(
          `GLEIF proof was generated but GLEIF's own contract was not called separately.`,
          1
        );

        console.log(`\n⏱️  Total Processing Time: ${totalDuration}s`);
        console.log(`🏆 Composed proof recorded on LOCAL blockchain!`);

        proofs.push(level3Proof);
        verificationResults.push({
          companyName,
          companyCIN_caller: companyCIN,
          companyCIN_proof: resolvedCIN,
          iteration,
          timestamp: timestamp.toString(),
          isCompliant: level3Proof.publicOutput.isFullyCompliant.toBoolean(),
          servicesIncluded: level3Proof.publicOutput.servicesIncluded.toString(),
          composedProofVersion: level3Proof.publicOutput.composedProofVersion.toString(),
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
            total: totalDuration,
          },
        });
      } catch (error: any) {
        // Clean error propagation — no retry loop that swallows contract failures
        console.error(`\n❌ Error in iteration ${iteration}: ${error.message}`);
        console.error(`   Stack: ${error.stack}`);
        verificationResults.push({
          companyName,
          companyCIN,
          iteration,
          error: error.message,
        });
      }
    }

    // ── FINAL STATISTICS ────────────────────────────────────────────────────
    printStageSeparator('🎉 COMPOSED VERIFICATION COMPLETED!', 'thick');

    const successCount = verificationResults.filter((r) => !r.error).length;
    const failCount = verificationResults.filter((r) => r.error).length;

    console.log(`\n📈 Final Statistics:`);
    console.log(`   🏢 Company:              ${companyName}`);
    console.log(`   🆔 CIN (caller input):   ${companyCIN}`);
    console.log(`   🏠 Environment:          LOCAL blockchain`);
    console.log(`   🔄 Total Iterations:     ${testIterations}`);
    console.log(`   ✅ Successful:           ${successCount}`);
    console.log(`   ❌ Failed:               ${failCount}`);
    console.log(`   📊 Success Rate:         ${((successCount / testIterations) * 100).toFixed(1)}%`);

    if (successCount > 0) {
      console.log(`\n✅ SUCCESS BREAKDOWN:`);
      console.log(`   📤 Composed proofs submitted on-chain: ${successCount}`);
      console.log(`   🌳 Proof composition levels per run:   3`);
      console.log(`   📝 ZK proofs generated per run:        3 (CorpReg + EXIM + GLEIF)`);
    }

    if (failCount > 0) {
      console.log(`\n⚠️  FAILURES:`);
      verificationResults
        .filter((r) => r.error)
        .forEach((r, i) => {
          console.log(`   ${i + 1}. Iteration ${r.iteration}: ${r.error}`);
        });
    }

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
    };
  } catch (error: any) {
    console.error('\n❌ Fatal error in Composed verification:', error);
    console.error('Stack trace:', error.stack);
    throw error;
  }
}
