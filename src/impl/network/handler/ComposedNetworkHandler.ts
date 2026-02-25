import * as dotenv from 'dotenv';
dotenv.config();

import {
  Field,
  Mina,
  PrivateKey,
  PublicKey,
  AccountUpdate,
  UInt64,
  MerkleTree,
} from 'o1js';

// Composed ZK Programs and Contracts
import { ComposedOptimCompliance } from '../../../zk-programs/compliance/ComposedRecursiveOptim3LevelZKProgramWithSign.js';
import {
  ComposedOptimComplianceVerifierSC,
  ComposedProofMerkleWitness,
} from '../../../contracts/compliance/composed/ComposedRecursiveOptim3LevelSmartContractWithSign.js';

// Infrastructure imports
import {
  initializeOracleRegistry,
  getDeployerAccount,
  getDeployerKey,
  environmentManager,
  getSenderAccount,
  getSenderKey,
} from '../../../infrastructure/index.js';

// FIXED: Correct import for network handlers
import { CorporateRegistrationNetworkHandler } from './CorporateRegistrationNetworkHandler.js';
import { EXIMNetworkHandler } from './EXIMNetworkHandler.js';
import { GLEIFNetworkHandler } from './GLEIFNetworkHandler.js';

import { safeCircuitString, CIRCUIT_STRING_MAX_LENGTHS } from '../../../utils/core/CoreZKUtilities.js';

export async function getComposedNetworkMultiVerifierUtils(
  companyName: string,
  companyCIN: string,
  testIterations: number = 1
) {
  console.log(`\n🚀 Composed Recursive Optim 3-Level Verification Started (NETWORK)`);
  console.log(`🏢 Company: ${companyName}`);
  console.log(`🆔 CIN: ${companyCIN}`);
  console.log(`🔄 Iterations: ${testIterations}`);

  try {
    // === INFRASTRUCTURE INITIALIZATION ===
    console.log('\n🔧 Initializing infrastructure system...');

    await initializeOracleRegistry();

    const currentEnvironment = environmentManager.getCurrentEnvironment();
    console.log(`✅ Environment Manager: ${currentEnvironment}`);

    // === BLOCKCHAIN ENVIRONMENT SETUP ===
    console.log('\n📋 Setting up blockchain environment...');

    const shouldConnectToDevnet = environmentManager.shouldConnectToDevnet();

    let deployerAccount: any;
    let deployerKey: any;
    let senderAccount: any;
    let senderKey: any;

    if (shouldConnectToDevnet) {
      console.log('🌐 DEVNET environment detected - using funded Oracle accounts');

      const network = Mina.Network('https://api.minascan.io/node/devnet/v1/graphql');
      Mina.setActiveInstance(network);
      console.log('✅ Connected to DEVNET');

      deployerAccount = getDeployerAccount('MCA');
      deployerKey = getDeployerKey('MCA');
      senderAccount = getSenderAccount('MCA');
      senderKey = getSenderKey('MCA');

      console.log('✅ Blockchain environment initialized with DEVNET Oracle accounts');
    } else {
      console.log(`🔧 ${currentEnvironment} environment - creating LocalBlockchain`);

      const Local = await Mina.LocalBlockchain({ proofsEnabled: false });
      Mina.setActiveInstance(Local);

      deployerAccount = Local.testAccounts[0];
      deployerKey = Local.testAccounts[0].key;
      senderAccount = Local.testAccounts[1];
      senderKey = Local.testAccounts[1].key;

      console.log('✅ Local blockchain initialized');
    }

    // === ZK COMPILATION ===
    console.log('\n📝 Compiling ZK programs...');

    const { CorporateRegistrationOptim } = await import(
      '../../../zk-programs/compliance/CorporateRegistrationOptimZKProgram.js'
    );
    const { EXIM } = await import('../../../zk-programs/compliance/EXIMZKProgram.js');
    const { GLEIFOptim } = await import('../../../zk-programs/compliance/GLEIFZKProgram.js');

    await CorporateRegistrationOptim.compile();
    console.log('✅ CorporateRegistrationOptim ZK program compiled');

    await EXIM.compile();
    console.log('✅ EXIM ZK program compiled');

    await GLEIFOptim.compile();
    console.log('✅ GLEIFOptim ZK program compiled');

    await ComposedOptimCompliance.compile();
    console.log('✅ ComposedOptimCompliance ZK program compiled');

    const { verificationKey } = await ComposedOptimComplianceVerifierSC.compile();
    console.log('✅ ComposedOptimComplianceVerifierSC compiled');

    // === SMART CONTRACT LOOKUP OR DEPLOY ===
    console.log('\n🚀 Looking up smart contract address...');

    let contractAddress = await environmentManager.getDeployedContractAddress('ComposedOptimComplianceVerifierSC');

    if (!contractAddress) {
      if (currentEnvironment !== 'MAINNET') {
        console.log('⚠️ Contract not found, deploying new instance...');

        const zkAppKey = PrivateKey.random();
        const zkAppAddress = zkAppKey.toPublicKey();
        const zkApp = new ComposedOptimComplianceVerifierSC(zkAppAddress);

        const fee = UInt64.from(100000000); // 0.1 MINA

    const deployTxn = await Mina.transaction({ sender: deployerAccount, fee }, async () => {
      AccountUpdate.fundNewAccount(deployerAccount);
      await zkApp.deploy({ verificationKey });
    });

    await deployTxn.prove();
    console.log('✅ Deployment transaction proven');

    const pendingTx = await deployTxn.sign([deployerKey, zkAppKey]).send();
    console.log(`📤 Transaction hash: ${pendingTx.hash}`);
    console.log(`🔍 Track at: https://minascan.io/devnet/tx/${pendingTx.hash}`);

    console.log('⏳ Waiting for transaction confirmation (may take 3-5 minutes)...');
    await pendingTx.wait({ maxAttempts: 90, interval: 20000 });
    console.log('✅ Deployment transaction confirmed!');

    contractAddress = zkAppAddress.toBase58();
    console.log(`✅ Contract deployed to: ${contractAddress}`);
      } else {
        throw new Error(`ComposedOptimComplianceVerifierSC address not found in ${currentEnvironment.toLowerCase()}.json`);
      }
    }

    console.log(`✅ Contract address: ${contractAddress}`);

    const zkAppAddress = PublicKey.fromBase58(contractAddress);
    const zkApp = new ComposedOptimComplianceVerifierSC(zkAppAddress);

    const fee = UInt64.from(100000000); // 0.1 MINA

    // === PROCESSING ===
    const proofs: any[] = [];
    const verificationResults: any[] = [];

    for (let iteration = 1; iteration <= testIterations; iteration++) {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`🔄 Iteration ${iteration}/${testIterations} for ${companyName} (NETWORK)`);
      console.log(`${'='.repeat(80)}`);

      try {
        // === GENERATE INDIVIDUAL SERVICE PROOFS ===
        console.log(`\n📡 Generating individual service proofs for ${companyName}...`);

        // FIXED: Use handler classes correctly
        console.log(`🏛️ Generating Corporate Registration proof for company: ${companyName}...`);
        const corpRegHandler = new CorporateRegistrationNetworkHandler();
        const corpRegResult = await corpRegHandler.getCorporateRegistrationNetworkMultiVerifierUtils([companyName]);
        if (!corpRegResult?.proofs?.[0]) {
          throw new Error(`Failed to generate Corporate Registration proof for ${companyCIN}`);
        }
        const corpRegProof = corpRegResult.proofs[0];

        console.log(`🚢 Generating EXIM proof with Company Name: ${companyName}...`);
        const eximHandler = new EXIMNetworkHandler();
        const eximResult = await eximHandler.getEXIMNetworkMultiVerifierUtils([companyName]);
        if (!eximResult?.proofs?.[0]) {
          throw new Error(`Failed to generate EXIM proof for ${companyName}`);
        }
        const eximProof = eximResult.proofs[0];

        console.log(`🌍 Generating GLEIF proof with Company Name: ${companyName}...`);
        const gleifHandler = new GLEIFNetworkHandler();
        const gleifResult = await gleifHandler.getGLEIFNetworkMultiVerifierUtils([companyName]);
        if (!gleifResult?.proofs?.[0]) {
          throw new Error(`Failed to generate GLEIF proof for ${companyName}`);
        }
        const gleifProof = gleifResult.proofs[0];

        console.log(`✅ All individual service proofs generated for ${companyName}`);

        // === COMPOSE PROOFS IN 3 LEVELS ===
        console.log(`\n🔗 Composing proofs in 3 levels for ${companyName}...`);

        const timestamp = Field.from(Date.now());

        console.log(`  📊 Level 1: Corporate Registration`);
        const level1Proof = await ComposedOptimCompliance.level1(timestamp, corpRegProof);

        console.log(`  📊 Level 2: Level 1 + EXIM`);
        const level2Proof = await ComposedOptimCompliance.level2(timestamp, level1Proof, eximProof);

        console.log(`  📊 Level 3: Level 2 + GLEIF (Final)`);
        const level3Proof = await ComposedOptimCompliance.level3(timestamp, level2Proof, gleifProof);

        console.log(`✅ 3-level proof composition completed for ${companyName}`);

        // === STORE IN CONTRACT ===
        console.log(`\n💾 Storing proof in contract...`);

        const proofsTree = new MerkleTree(16);
        const proofIndex = BigInt(iteration - 1);
        const proofHash = Field.random();
        proofsTree.setLeaf(proofIndex, proofHash);
        const witness = proofsTree.getWitness(proofIndex);
        const composedWitness = new ComposedProofMerkleWitness(witness);

        const verifyTxn = await Mina.transaction({ sender: senderAccount, fee }, async () => {
          await zkApp.verifyAndStoreComposedProof(
            level3Proof,
            safeCircuitString(companyCIN, CIRCUIT_STRING_MAX_LENGTHS.SHORT, 'companyCIN'),
            composedWitness,
            timestamp
          );
        });

        console.log('⚡ Generating transaction proof (this may take 1-2 minutes)...');
        
        try {
          const startProveTime = Date.now();
          console.log('→ Starting prove() at', new Date().toISOString());
          
          await verifyTxn.prove();
          
          const proveTime = ((Date.now() - startProveTime) / 1000).toFixed(2);
          console.log(`✅ Transaction proof generated successfully (${proveTime}s)`);
          
          // CRITICAL: Wait for proof object to stabilize before sending
          // This prevents "Invalid_proof In progress" errors
          console.log('⏳ Stabilizing proof object (2s delay)...');
          await new Promise(resolve => setTimeout(resolve, 2000));
          console.log('✅ Proof object ready');
        } catch (proveError: any) {
          console.error('❌ Transaction proof generation failed!');
          console.error('Error Type:', proveError.name);
          console.error('Error Message:', proveError.message);
          console.error('Full Error:', JSON.stringify(proveError, null, 2));
          throw new Error(`prove() failed: ${proveError.message}`);
        }

          console.log('📤 Signing and sending transaction...');
          try {
            const pendingTx = await verifyTxn.sign([senderKey]).send();
            console.log(`📤 Transaction hash: ${pendingTx.hash}`);
            console.log(`🔍 Track at: https://minascan.io/devnet/tx/${pendingTx.hash}`);
            
            console.log('⏳ Waiting for transaction confirmation (may take 3-5 minutes)...');
            await pendingTx.wait({ maxAttempts: 90, interval: 20000 });
            console.log(`✅ Composed proof verified and stored on-chain for ${companyName}!`);
          } catch (sendError: any) {
            console.error('❌ Transaction send failed!');
            console.error('Error Type:', sendError.name);
            console.error('Error Message:', sendError.message);
            if (sendError.errors) {
              console.error('zkApp Errors:', JSON.stringify(sendError.errors, null, 2));
            }
            throw new Error(`send() failed: ${sendError.message}`);
          }

        proofs.push(level3Proof);
        verificationResults.push({
          companyName,
          companyCIN,
          iteration,
          timestamp: Date.now(),
          isCompliant: true,
        });

        console.log(`🎯 Iteration ${iteration} completed successfully for ${companyName}`);
      } catch (error: any) {
        console.error(`❌ Error in iteration ${iteration} for ${companyName}:`, error.message);
        verificationResults.push({
          companyName,
          companyCIN,
          iteration,
          error: error.message,
        });
      }
    }

    // === FINAL STATISTICS ===
    console.log(`\n${'='.repeat(80)}`);
    console.log(`🎉 NETWORK Composed Verification Completed!`);
    console.log(`${'='.repeat(80)}`);

    const successCount = verificationResults.filter((r) => !r.error).length;
    const failCount = verificationResults.filter((r) => r.error).length;

    console.log(`\n📈 Final Statistics:`);
    console.log(`  • Total Iterations: ${testIterations}`);
    console.log(`  • Successful: ${successCount}`);
    console.log(`  • Failed: ${failCount}`);

    console.log(`\n✅ Composed verification completed!`);
    return {
      company: companyName,
      totalComposedProofs: testIterations,
      successfulVerifications: successCount,
      failedVerifications: failCount,
      proofs,
      verificationResults,
      environment: currentEnvironment,
    };
  } catch (error: any) {
    console.error('❌ Error in Composed verification:', error);
    throw error;
  }
}