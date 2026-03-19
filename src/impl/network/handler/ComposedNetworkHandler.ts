import * as dotenv from 'dotenv';
dotenv.config();

import {
  Field,
  Mina,
  PublicKey,
  UInt64,
  CircuitString,
  MerkleTree,
  Signature,
  Poseidon,
  fetchAccount,
} from 'o1js';

// ─── Base classes (mirrors GLEIFNetworkHandler) ─────────────────────────────
import { BaseVerificationCore } from '../../base/BaseVerificationCore.js';

// ─── Composed ZK Program & Smart Contract ───────────────────────────────────
import { ComposedOptimCompliance } from '../../../zk-programs/compliance/ComposedRecursiveOptim3LevelZKProgramWithSign.js';
import {
  ComposedOptimComplianceVerifierSC,
  ComposedProofMerkleWitness,
} from '../../../contracts/compliance/composed/ComposedRecursiveOptim3LevelSmartContractWithSign.js';

// ─── Individual ZK Programs ──────────────────────────────────────────────────
import {
  CorporateRegistrationOptim,
  CorporateRegistrationOptimComplianceData,
  CorporateRegistrationMerkleWitness8,
  CORP_REG_FIELD_INDICES,
} from '../../../zk-programs/compliance/CorporateRegistrationOptimZKProgram.js';

import {
  EXIM,
  EXIMOptimComplianceData,
  EXIMMerkleWitness8,
  EXIM_FIELD_INDICES,
} from '../../../zk-programs/compliance/EXIMZKProgram.js';

import {
  GLEIFOptim,
  GLEIFOptimComplianceData,
  MerkleWitness8,
  GLEIF_FIELD_INDICES,
} from '../../../zk-programs/compliance/GLEIFZKProgram.js';

// ─── Infrastructure ──────────────────────────────────────────────────────────
import {
  initializeOracleRegistry,
  environmentManager,
  compilationManager,
  getSenderAccount,
  getSenderKey,
} from '../../../infrastructure/index.js';

// ─── API Utilities ────────────────────────────────────────────────────────────
import {
  fetchCorporateRegistrationDataWithFullLogging,
  CorporateRegistrationAPIResponse,
  analyzeCorporateRegistrationCompliance,
  createComprehensiveCorporateRegistrationMerkleTree,
  createOptimizedCorporateRegistrationComplianceData,
} from '../../../utils/domain/compliance/CorpReg/CorporateRegistrationCoreAPIUtils.js';

import {
  fetchEXIMDataWithFullLogging,
  EXIMAPIResponse,
  analyzeEXIMCompliance,
  createComprehensiveEXIMMerkleTree,
  createOptimizedEXIMComplianceData,
} from '../../../utils/domain/compliance/EXIM/EXIMCoreAPIUtils.js';

import {
  fetchGLEIFDataWithFullLogging,
  GLEIFAPIResponse,
  analyzeGLEIFCompliance,
  createComprehensiveGLEIFMerkleTree,
  createOptimizedGLEIFComplianceData,
} from '../../../utils/domain/compliance/GLEIF/GLEIFCoreAPIUtils.js';

// ─── Oracle Keys ──────────────────────────────────────────────────────────────
import {
  getCorpRegSignerKey,
  getEximSignerKey,
  getGleifSignerKey,
} from '../../../core/OracleRegistry.js';


async function generateCorpRegProof(
  companyNameOrCIN: string,
  jurisdiction: string = 'IN',
  timestamp: UInt64
): Promise<{
  proof: Awaited<ReturnType<typeof CorporateRegistrationOptim.proveOptimizedCompliance>>;
  companyCINString: string;
  companyCINCircuit: CircuitString;
  complianceAnalysis: ReturnType<typeof analyzeCorporateRegistrationCompliance>;
}> {
  console.log(`\n🏛️  Generating Corporate Registration proof for: ${companyNameOrCIN}`);

  const apiResponse: CorporateRegistrationAPIResponse =
    await fetchCorporateRegistrationDataWithFullLogging(companyNameOrCIN, jurisdiction);

  const resolvedCIN: string = apiResponse.data?.company_master_data?.cin ?? '';
  if (!resolvedCIN) {
    throw new Error(`No CIN found in API response for: "${companyNameOrCIN}"`);
  }
  console.log(`✅ Corp Reg CIN resolved from API: ${resolvedCIN}`);

  const complianceAnalysis = analyzeCorporateRegistrationCompliance(apiResponse);
  console.log(
    `📊 Corp Reg Compliance: ${complianceAnalysis.complianceScore}% — ` +
      `${complianceAnalysis.isCompliant ? '✅ COMPLIANT' : '❌ NON-COMPLIANT'}`
  );

  const { tree, extractedData } = createComprehensiveCorporateRegistrationMerkleTree(
    apiResponse, MerkleTree, CircuitString, 8, CORP_REG_FIELD_INDICES
  );
  const merkleRoot = tree.getRoot();

  const complianceData = createOptimizedCorporateRegistrationComplianceData(
    extractedData, merkleRoot, CircuitString, CorporateRegistrationOptimComplianceData
  );

  const companyNameWitness        = new CorporateRegistrationMerkleWitness8(tree.getWitness(BigInt(CORP_REG_FIELD_INDICES.companyName)));
  const cinWitness                = new CorporateRegistrationMerkleWitness8(tree.getWitness(BigInt(CORP_REG_FIELD_INDICES.CIN)));
  const registrationNumberWitness = new CorporateRegistrationMerkleWitness8(tree.getWitness(BigInt(CORP_REG_FIELD_INDICES.registrationNumber)));
  const companyStatusWitness      = new CorporateRegistrationMerkleWitness8(tree.getWitness(BigInt(CORP_REG_FIELD_INDICES.companyStatus)));
  const dateOfIncorporationWitness= new CorporateRegistrationMerkleWitness8(tree.getWitness(BigInt(CORP_REG_FIELD_INDICES.dateOfIncorporation)));
  const categoryWitness           = new CorporateRegistrationMerkleWitness8(tree.getWitness(BigInt(CORP_REG_FIELD_INDICES.category)));
  const classOfCompanyWitness     = new CorporateRegistrationMerkleWitness8(tree.getWitness(BigInt(CORP_REG_FIELD_INDICES.classOfCompany)));
  const numberOfPartnersWitness   = new CorporateRegistrationMerkleWitness8(tree.getWitness(BigInt(CORP_REG_FIELD_INDICES.numberOfPartners)));
  const listedWitness             = new CorporateRegistrationMerkleWitness8(tree.getWitness(BigInt(CORP_REG_FIELD_INDICES.listed)));
  const suspendedWitness          = new CorporateRegistrationMerkleWitness8(tree.getWitness(BigInt(CORP_REG_FIELD_INDICES.suspended)));
  console.log('✅ All Corp Reg MerkleWitness8 instances created');

  const oracleSignature = Signature.create(getCorpRegSignerKey(), [merkleRoot]);
  console.log('✅ Corp Reg oracle signature generated');

  console.log('⚡ Generating Corp Reg ZK proof...');
  const proof = await CorporateRegistrationOptim.proveOptimizedCompliance(
    timestamp, complianceData, oracleSignature,
    companyNameWitness, cinWitness, registrationNumberWitness,
    companyStatusWitness, dateOfIncorporationWitness, categoryWitness,
    classOfCompanyWitness, numberOfPartnersWitness, listedWitness, suspendedWitness
  );
  console.log('✅ Corp Reg ZK proof generated successfully');

  const companyCINCircuit: CircuitString = proof.publicOutput.CIN;
  const companyCINString: string = companyCINCircuit.toString();

  console.log(`📌 companyIdentifier will be taken from proof.publicOutput.CIN: "${companyCINString}"`);
  if (companyCINString !== resolvedCIN) {
    console.warn(`   ⚠️  API CIN "${resolvedCIN}" ≠ proof CIN "${companyCINString}". Using proof CIN.`);
  }

  return { proof, companyCINString, companyCINCircuit, complianceAnalysis };
}

async function generateEXIMProof(
  companyName: string,
  timestamp: UInt64
): Promise<{
  proof: Awaited<ReturnType<typeof EXIM.proveOptimizedCompliance>>;
  complianceAnalysis: ReturnType<typeof analyzeEXIMCompliance>;
}> {
  console.log(`\n🚢 Generating EXIM proof for: ${companyName}`);

  const apiResponse: EXIMAPIResponse = await fetchEXIMDataWithFullLogging(companyName);
  const complianceAnalysis = analyzeEXIMCompliance(apiResponse);
  console.log(
    `📊 EXIM Compliance: ${complianceAnalysis.complianceScore}% — ` +
      `${complianceAnalysis.isCompliant ? '✅ COMPLIANT' : '❌ NON-COMPLIANT'}`
  );

  const { tree, extractedData } = createComprehensiveEXIMMerkleTree(
    apiResponse, MerkleTree, CircuitString, 8, EXIM_FIELD_INDICES
  );
  const merkleRoot = tree.getRoot();

  const complianceData = createOptimizedEXIMComplianceData(
    extractedData, merkleRoot, CircuitString, EXIMOptimComplianceData
  );

  const iecWitness                 = new EXIMMerkleWitness8(tree.getWitness(BigInt(EXIM_FIELD_INDICES.iec)));
  const entityNameWitness          = new EXIMMerkleWitness8(tree.getWitness(BigInt(EXIM_FIELD_INDICES.entityName)));
  const iecIssueDateWitness        = new EXIMMerkleWitness8(tree.getWitness(BigInt(EXIM_FIELD_INDICES.iecIssueDate)));
  const panWitness                 = new EXIMMerkleWitness8(tree.getWitness(BigInt(EXIM_FIELD_INDICES.pan)));
  const iecStatusWitness           = new EXIMMerkleWitness8(tree.getWitness(BigInt(EXIM_FIELD_INDICES.iecStatus)));
  const iecModificationDateWitness = new EXIMMerkleWitness8(tree.getWitness(BigInt(EXIM_FIELD_INDICES.iecModificationDate)));
  const dataAsOnWitness            = new EXIMMerkleWitness8(tree.getWitness(BigInt(EXIM_FIELD_INDICES.dataAsOn)));
  console.log('✅ All EXIM EXIMMerkleWitness8 instances created');

  const oracleSignature = Signature.create(getEximSignerKey(), [merkleRoot]);
  console.log('✅ EXIM oracle signature generated');

  console.log('⚡ Generating EXIM ZK proof...');
  const proof = await EXIM.proveOptimizedCompliance(
    timestamp, complianceData, oracleSignature,
    iecWitness, entityNameWitness, iecIssueDateWitness,
    panWitness, iecStatusWitness, iecModificationDateWitness, dataAsOnWitness
  );
  console.log('✅ EXIM ZK proof generated successfully');

  return { proof, complianceAnalysis };
}

async function generateGLEIFProof(
  companyName: string,
  timestamp: UInt64
): Promise<{
  proof: Awaited<ReturnType<typeof GLEIFOptim.proveOptimizedCompliance>>;
  companyLei: string;
  complianceAnalysis: ReturnType<typeof analyzeGLEIFCompliance>;
}> {
  console.log(`\n🌍 Generating GLEIF proof for: ${companyName}`);

  const apiResponse: GLEIFAPIResponse = await fetchGLEIFDataWithFullLogging(companyName);
  const companyLei: string = apiResponse.data[0].attributes.lei;
  if (!companyLei) throw new Error(`No LEI found for: "${companyName}"`);
  console.log(`✅ GLEIF LEI resolved: ${companyLei}`);

  const complianceAnalysis = analyzeGLEIFCompliance(apiResponse);
  console.log(
    `📊 GLEIF Compliance: ${complianceAnalysis.complianceScore}% — ` +
      `${complianceAnalysis.isCompliant ? '✅ COMPLIANT' : '❌ NON-COMPLIANT'}`
  );

  const { tree, extractedData } = createComprehensiveGLEIFMerkleTree(
    apiResponse, MerkleTree, CircuitString, 8, GLEIF_FIELD_INDICES
  );
  const merkleRoot = tree.getRoot();

  const complianceData = createOptimizedGLEIFComplianceData(
    extractedData, merkleRoot, CircuitString, GLEIFOptimComplianceData
  );

  const entityStatusWitness       = new MerkleWitness8(tree.getWitness(BigInt(GLEIF_FIELD_INDICES.entity_status)));
  const registrationStatusWitness = new MerkleWitness8(tree.getWitness(BigInt(GLEIF_FIELD_INDICES.registration_status)));
  const conformityFlagWitness     = new MerkleWitness8(tree.getWitness(BigInt(GLEIF_FIELD_INDICES.conformityFlag)));
  const lastUpdateWitness         = new MerkleWitness8(tree.getWitness(BigInt(GLEIF_FIELD_INDICES.lastUpdateDate)));
  const nextRenewalWitness        = new MerkleWitness8(tree.getWitness(BigInt(GLEIF_FIELD_INDICES.nextRenewalDate)));
  const leiWitness                = new MerkleWitness8(tree.getWitness(BigInt(GLEIF_FIELD_INDICES.lei)));
  const bicWitness                = new MerkleWitness8(tree.getWitness(BigInt(GLEIF_FIELD_INDICES.bic_codes)));
  const micWitness                = new MerkleWitness8(tree.getWitness(BigInt(GLEIF_FIELD_INDICES.mic_codes)));
  console.log('✅ All GLEIF MerkleWitness8 instances created');

  const oracleSignature = Signature.create(getGleifSignerKey(), [merkleRoot]);
  console.log('✅ GLEIF oracle signature generated');

  console.log('⚡ Generating GLEIF ZK proof...');
  const proof = await GLEIFOptim.proveOptimizedCompliance(
    timestamp, complianceData, oracleSignature,
    entityStatusWitness, registrationStatusWitness, conformityFlagWitness,
    lastUpdateWitness, nextRenewalWitness, leiWitness, bicWitness, micWitness
  );
  console.log('✅ GLEIF ZK proof generated successfully');

  return { proof, companyLei, complianceAnalysis };
}


export class ComposedNetworkHandler {
  private baseCore: BaseVerificationCore;

  constructor() {
    this.baseCore = new BaseVerificationCore();
  }

  private static readonly TRANSACTION_FEES = {
    LOCAL:   UInt64.from(1_000_000),
    TESTNET: UInt64.from(100_000_000),
    DEVNET:  UInt64.from(100_000_000),
    MAINNET: UInt64.from(300_000_000),
  };

  private getTransactionFee(environment: string): UInt64 {
    switch (environment.toUpperCase()) {
      case 'LOCAL':   return ComposedNetworkHandler.TRANSACTION_FEES.LOCAL;
      case 'TESTNET':
      case 'DEVNET':  return ComposedNetworkHandler.TRANSACTION_FEES.TESTNET;
      case 'MAINNET': return ComposedNetworkHandler.TRANSACTION_FEES.MAINNET;
      default:
        console.warn(`Unknown environment ${environment}, using TESTNET fee`);
        return ComposedNetworkHandler.TRANSACTION_FEES.TESTNET;
    }
  }

  public async runComposedTestWithFundedAccounts(
    companyName: string,
    companyCIN: string,
    testIterations: number = 1
  ): Promise<any> {
    console.log('\n🔧 COMPOSED NETWORK TEST — ORACLE MODE');
    console.log('='.repeat(70));

    try {
      await initializeOracleRegistry();

      const currentEnv = environmentManager.getCurrentEnvironment();
      const shouldConnectToDevnet = environmentManager.shouldConnectToDevnet();

      console.log(`🌐 Environment: ${currentEnv}`);
      console.log(`🔗 Connect to DEVNET: ${shouldConnectToDevnet}`);

      if (shouldConnectToDevnet) {
        console.log('✅ CONFIRMED: Oracle Registry initialised for DEVNET with funded accounts');
        console.log(`🌐 Network: ${this.baseCore.getEnvironmentDisplayName()}`);
        console.log('✅ DEVNET Oracle accounts accessible');
      } else if (currentEnv === 'LOCAL') {
        console.log('✅ LOCAL environment confirmed — will use local blockchain');
      }

      const result = await this.getComposedNetworkMultiVerifierUtils(
        companyName, companyCIN, testIterations
      );

      console.log('\n✅ COMPOSED NETWORK TEST COMPLETED SUCCESSFULLY!');
      if (shouldConnectToDevnet) {
        console.log('🔗 Check: https://minascan.io/devnet/');
      }

      return result;
    } catch (error) {
      console.error('\n❌ COMPOSED NETWORK TEST FAILED');
      if (error instanceof Error) console.error('Error:', error.message);
      throw error;
    }
  }

  public async getComposedNetworkMultiVerifierUtils(
    companyName: string,
    companyCIN: string,
    testIterations: number = 1
  ): Promise<any> {
    console.log(`\n🚀 Composed Recursive Optim 3-Level Verification Started (NETWORK)`);
    console.log(`🏢 Company:    ${companyName}`);
    console.log(`🆔 CIN input:  ${companyCIN}`);
    console.log(`🔄 Iterations: ${testIterations}`);
    console.log('='.repeat(80));

    try {
      // ── 1. INFRASTRUCTURE INITIALIZATION ─────────────────────────────────
      console.log('\n🔧 Initialising infrastructure system...');
      await initializeOracleRegistry();

      const currentEnvironment = environmentManager.getCurrentEnvironment();
      console.log(`✅ Environment Manager: ${currentEnvironment}`);

      await compilationManager.initialize();
      console.log('✅ Compilation Manager initialised');

      // ── 2. BLOCKCHAIN ENVIRONMENT ─────────────────────────────────────────
      console.log('\n📋 Setting up blockchain environment...');
      const shouldConnectToDevnet = environmentManager.shouldConnectToDevnet();

      let senderAccount: PublicKey;
      let senderKey: any;

      if (shouldConnectToDevnet) {
        console.log('🌐 DEVNET environment detected — using funded Oracle accounts');

        const connected = this.baseCore.setupNetworkConnection();
        if (!connected) {
          throw new Error('Failed to establish DEVNET connection via BaseVerificationCore');
        }
        console.log('✅ Network connection established via BaseVerificationCore');

        senderAccount = getSenderAccount('COMPOSED');
        senderKey     = getSenderKey('COMPOSED');
        console.log('✅ Blockchain environment initialised with DEVNET Oracle accounts');

      } else {
        console.log(`🔧 ${currentEnvironment} environment — creating LocalBlockchain`);
        const Local = await Mina.LocalBlockchain({ proofsEnabled: false });
        Mina.setActiveInstance(Local);
        senderAccount = Local.testAccounts[1];
        senderKey     = Local.testAccounts[1].key;
        console.log('✅ Local blockchain initialised');
      }

      // ── 3. COMPILE ALL ZK PROGRAMS ────────────────────────────────────────
      console.log('\n📝 Compiling ZK programs...');

      await CorporateRegistrationOptim.compile();
      console.log('✅ CorporateRegistrationOptim compiled');

      await EXIM.compile();
      console.log('✅ EXIM compiled');

      await GLEIFOptim.compile();
      console.log('✅ GLEIFOptim compiled');

      await ComposedOptimCompliance.compile();
      console.log('✅ ComposedOptimCompliance compiled');

      const { verificationKey } = await ComposedOptimComplianceVerifierSC.compile();
      console.log('✅ ComposedOptimComplianceVerifierSC compiled');

      // ── 4. SMART CONTRACT LOOKUP ──────────────────────────────────────────
      console.log('\n🚀 Looking up smart contract address...');

      const contractAddress = await environmentManager.getDeployedContractAddress(
        'ComposedOptimComplianceVerifierSC'
      );
      if (!contractAddress) {
        throw new Error(
          `ComposedOptimComplianceVerifierSC address not found in ` +
            `${currentEnvironment.toLowerCase()}.json`
        );
      }

      if (!environmentManager.validateContractAddress(contractAddress)) {
        throw new Error(
          `Invalid contract address format for ComposedOptimComplianceVerifierSC: ${contractAddress}`
        );
      }

      console.log(`✅ Contract address found: ${contractAddress}`);
      console.log(`📋 Source: config/environments/${currentEnvironment.toLowerCase()}.json`);

      const zkAppAddress = PublicKey.fromBase58(contractAddress);
      const zkApp        = new ComposedOptimComplianceVerifierSC(zkAppAddress);
      const fee          = this.getTransactionFee(currentEnvironment);

      // ── 5. ITERATION LOOP ─────────────────────────────────────────────────
      const proofs: any[]              = [];
      const verificationResults: any[] = [];

      for (let iteration = 1; iteration <= testIterations; iteration++) {
        console.log(`\n${'='.repeat(80)}`);
        console.log(`🔄 Iteration ${iteration}/${testIterations} for ${companyName}`);
        console.log(`${'='.repeat(80)}`);

        try {
          // Single timestamp: one Date.now() for everything
          const nowMs          = Date.now();
          const timestamp      = UInt64.from(nowMs);
          const timestampField = Field.from(nowMs);

          // ── A. Generate individual service proofs ───────────────────────────
          console.log(`\n📡 Generating individual service proofs for ${companyName}...`);

          const corpRegResult = await generateCorpRegProof(companyCIN, 'IN', timestamp);
          const eximResult    = await generateEXIMProof(companyName, timestamp);
          const gleifResult   = await generateGLEIFProof(companyName, timestamp);

          console.log(`\n✅ All 3 individual ZK proofs generated for ${companyName}`);

          // ── B. Compose in 3 levels ──────────────────────────────────────────
          console.log(`\n🔗 Composing proofs in 3 levels for ${companyName}...`);

          console.log('  📊 Level 1: Corporate Registration');
          const level1Proof = await ComposedOptimCompliance.level1(
            timestampField, corpRegResult.proof
          );

          console.log('  📊 Level 2: Level 1 + EXIM');
          const level2Proof = await ComposedOptimCompliance.level2(
            timestampField, level1Proof, eximResult.proof
          );

          console.log('  📊 Level 3: Level 2 + GLEIF (Final)');
          const level3Proof = await ComposedOptimCompliance.level3(
            timestampField, level2Proof, gleifResult.proof
          );

          console.log(`✅ 3-level proof composition completed for ${companyName}`);

          // Guard: verify contract requirements before spending devnet fees
          const servicesVal = level3Proof.publicOutput.servicesIncluded.toBigInt();
          if (servicesVal !== 7n) {
            throw new Error(
              `servicesIncluded=${servicesVal} but contract requires Field(7).`
            );
          }
          const versionVal = level3Proof.publicOutput.composedProofVersion.toBigInt();
          if (versionVal !== 3n) {
            throw new Error(
              `composedProofVersion=${versionVal} but contract requires Field(3).`
            );
          }

          // ── C. fetchAccount immediately before transaction (stale nonce fix) ──
          console.log('\n🔄 Fetching fresh account state immediately before transaction...');
          await fetchAccount({ publicKey: senderAccount });
          await fetchAccount({ publicKey: zkAppAddress });
          console.log('✅ Account state refreshed');

          const totalBefore = zkApp.totalProofsStored.get();
          const rootBefore  = zkApp.proofsRoot.get();
          const tsBefore    = zkApp.lastUpdateTimestamp.get();
          console.log('\n🔍 Smart Contract State BEFORE Verification:');
          console.log(`  totalProofsStored:   ${totalBefore.toString()}`);
          console.log(`  proofsRoot:          ${rootBefore.toString()}`);
          console.log(`  lastUpdateTimestamp: ${tsBefore.toString()}`);

          const currentTotal = zkApp.totalProofsStored.get();

          // ── D. companyIdentifier from proof, not external param ─────────────
          const companyIdentifier: CircuitString = corpRegResult.companyCINCircuit;
          console.log(`📌 companyIdentifier: "${companyIdentifier.toString()}" (from CorpReg proof)`);

          // ── E. Build Merkle witness — leaf formula mirrors contract exactly ──
          console.log('\n💾 Building Merkle witness for composed proof storage...');

          const sequenceNumber   = currentTotal.add(Field(1));
          const companyIdentHash = companyIdentifier.hash();

          const proofHash = Poseidon.hash([
            level3Proof.publicOutput.underlyingProofsHash,
            level3Proof.publicOutput.companyNameHash,
            level3Proof.publicOutput.companyIdentifierHash,
            timestampField,
          ]);
          const leafData = Poseidon.hash([
            companyIdentHash,
            sequenceNumber,
            proofHash,
            timestampField,
          ]);

          const proofsTree  = new MerkleTree(16);
          const proofIndex  = currentTotal.toBigInt();
          proofsTree.setLeaf(proofIndex, leafData);
          const composedWitness = new ComposedProofMerkleWitness(proofsTree.getWitness(proofIndex));
          console.log('✅ ComposedProofMerkleWitness created');

          // ── F. Build transaction ────────────────────────────────────────────
          console.log(`\n⚡ Executing smart contract verification transaction...`);

          const verifyTxn = await Mina.transaction(
            { sender: senderAccount, fee },
            async () => {
              await zkApp.verifyAndStoreComposedProof(
                level3Proof,
                companyIdentifier,
                composedWitness,
                timestampField
              );
            }
          );

          console.log('⚡ Generating transaction proof...');
          const proveStart = Date.now();
          await verifyTxn.prove();
          console.log(`✅ Transaction proof generated (${((Date.now() - proveStart) / 1000).toFixed(2)}s)`);

          console.log('📤 Signing and sending transaction...');
          const pendingTxn = await verifyTxn.sign([senderKey]).send();
          console.log('✅ Smart contract transaction completed');
          console.log(`📤 Transaction hash: ${pendingTxn.hash}`);
          console.log(`🔍 Track: https://minascan.io/devnet/tx/${pendingTxn.hash}`);

          await fetchAccount({ publicKey: zkAppAddress });
          const totalAfter = zkApp.totalProofsStored.get();
          const rootAfter  = zkApp.proofsRoot.get();
          const tsAfter    = zkApp.lastUpdateTimestamp.get();
          console.log('\n🔍 Contract state AFTER verification:');
          console.log(`  totalProofsStored:   ${totalAfter.toString()}`);
          console.log(`  proofsRoot:          ${rootAfter.toString()}`);
          console.log(`  lastUpdateTimestamp: ${tsAfter.toString()}`);
          console.log('\n📈 STATE CHANGES:');
          console.log(`  totalProofsStored:   ${totalBefore.toString()} → ${totalAfter.toString()}`);
          console.log(`  proofsRoot:          ${rootBefore.toString()} → ${rootAfter.toString()}`);
          console.log(`  lastUpdateTimestamp: ${tsBefore.toString()} → ${tsAfter.toString()}`);

          proofs.push(level3Proof);
          verificationResults.push({
            companyName,
            companyCIN_input:  companyCIN,
            companyCIN_proof:  companyIdentifier.toString(),
            iteration,
            timestamp: nowMs,
            isCompliant:
              corpRegResult.complianceAnalysis.isCompliant &&
              eximResult.complianceAnalysis.isCompliant &&
              gleifResult.complianceAnalysis.isCompliant,
            serviceCompliance: {
              corpReg: {
                score:     corpRegResult.complianceAnalysis.complianceScore,
                compliant: corpRegResult.complianceAnalysis.isCompliant,
                cin:       corpRegResult.companyCINString,
              },
              exim: {
                score:     eximResult.complianceAnalysis.complianceScore,
                compliant: eximResult.complianceAnalysis.isCompliant,
              },
              gleif: {
                score:     gleifResult.complianceAnalysis.complianceScore,
                compliant: gleifResult.complianceAnalysis.isCompliant,
                lei:       gleifResult.companyLei,
              },
            },
            transactionHash: pendingTxn?.hash ?? 'unknown',
          });

          console.log(`🎯 Iteration ${iteration} completed successfully for ${companyName}`);

        } catch (iterError: any) {
          console.error(
            `❌ Error in iteration ${iteration} for ${companyName}:`,
            iterError.message
          );
          verificationResults.push({
            companyName,
            companyCIN,
            iteration,
            error: iterError.message,
          });
        }
      }

      // ── 6. FINAL STATISTICS ────────────────────────────────────────────────
      const successCount = verificationResults.filter((r) => !r.error).length;
      const failCount    = verificationResults.filter((r) => r.error).length;


      return {
        company:                  companyName,
        totalComposedProofs:      testIterations,
        successfulVerifications:  successCount,
        failedVerifications:      failCount,
        proofs,
        verificationResults,
        environment:              currentEnvironment,
      };

    } catch (error: any) {
      console.error('❌ Fatal error in Composed verification:', error);
      throw error;
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// BACKWARD-COMPATIBLE EXPORTED FUNCTIONS (matches GLEIF pattern)
// ─────────────────────────────────────────────────────────────────────────────

export async function runComposedTestWithFundedAccounts(
  companyName: string,
  companyCIN: string,
  testIterations: number = 1
): Promise<any> {
  const handler = new ComposedNetworkHandler();
  return handler.runComposedTestWithFundedAccounts(companyName, companyCIN, testIterations);
}

export async function getComposedNetworkMultiVerifierUtils(
  companyName: string,
  companyCIN: string,
  testIterations: number = 1
): Promise<any> {
  const handler = new ComposedNetworkHandler();
  return handler.getComposedNetworkMultiVerifierUtils(companyName, companyCIN, testIterations);
}