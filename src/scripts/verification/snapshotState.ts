/**
 * snapshotState.ts
 *
 * Captures the current on-chain state of a deployed zkApp contract
 * on Mina Devnet and writes it to a JSON file.
 *
 * PURPOSE:
 *   Run this BEFORE your transaction script.
 *   The verifyTransaction script reads this snapshot to compare before/after.
 *
 * HOW IT WORKS:
 *   1. Connects to Mina Devnet via o1js Mina.Network()
 *   2. Calls fetchAccount() — the official o1js API for on-chain state
 *   3. Reads appState[0..6] — the 7 @state fields of GLEIFOptimMultiCompanySmartContract:
 *        [0] totalCompaniesTracked
 *        [1] compliantCompaniesCount
 *        [2] totalVerificationsGlobal
 *        [3] lastVerificationTime       (UInt64 — stored as two Fields internally)
 *        [4] companiesMapRoot
 *        [5] registryVersion
 *        [6] contractDisabled
 *   4. Writes a JSON snapshot to outputFile
 *
 * USAGE:
 *   npm run build
 *   node build/scripts/verification/snapshotState.js \
 *     --contractName GLEIFOptimMultiCompanySmartContract \
 *     --outputFile /tmp/zk_state_before.json
 *
 * Or via npm script (after adding to package.json):
 *   npm run snapshot:state
 *
 * REFERENCES:
 *   o1js fetchAccount: https://docs.minaprotocol.com/zkapps/o1js/fetch-events-and-actions
 *   Mina.Network:      https://docs.minaprotocol.com/zkapps/o1js-reference/modules/Mina
 *   Devnet endpoints:  src/infrastructure/environment/devnet-endpoints.ts
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { Mina, fetchAccount, PublicKey } from 'o1js';
import { promises as fs } from 'fs';
import {
  initializeOracleRegistry,
  environmentManager,
} from '../../infrastructure/index.js';

// ─── Configuration (all values from .env — never hard-coded) ─────────────────

const CONFIG = {
  // These endpoints match DEVNET_ENDPOINTS in devnet-endpoints.ts exactly
  MINA_GRAPHQL:    process.env.MINA_GRAPHQL_ENDPOINT
                   || 'https://api.minascan.io/node/devnet/v1/graphql',
  ARCHIVE_GRAPHQL: process.env.MINA_ARCHIVE_ENDPOINT
                   || 'https://api.minascan.io/archive/devnet/v1/graphql',
  CONTRACT_NAME:   process.env.CONTRACT_NAME
                   || 'GLEIFOptimMultiCompanySmartContract',
  OUTPUT_FILE:     process.env.SNAPSHOT_FILE
                   || '/tmp/zk_state_before.json',
};

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ContractStateSnapshot {
  capturedAt:                  string;   // ISO-8601 timestamp of when snapshot was taken
  contractName:                string;
  contractAddress:             string;
  // appState slots — exact field order from GLEIFMultiSmartContract.ts @state declarations
  totalCompaniesTracked:       string;   // appState[0]
  compliantCompaniesCount:     string;   // appState[1]
  totalVerificationsGlobal:    string;   // appState[2]
  lastVerificationTime:        string;   // appState[3] — UInt64 lower half (as Field)
  companiesMapRoot:            string;   // appState[4]
  registryVersion:             string;   // appState[5]
  contractDisabled:            string;   // appState[6]
  // Account-level data
  accountNonce:                string;
  balanceNanomina:             string;
  balanceMina:                 string;
}

// ─── Argument Parser ─────────────────────────────────────────────────────────

function parseArgs(): Record<string, string> {
  const args = process.argv.slice(2);
  const parsed: Record<string, string> = {};
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i]?.replace(/^--/, '');
    if (key && args[i + 1] !== undefined) {
      parsed[key] = args[i + 1];
    }
  }
  return parsed;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const args = parseArgs();
  const contractName = args['contractName'] || CONFIG.CONTRACT_NAME;
  const outputFile   = args['outputFile']   || CONFIG.OUTPUT_FILE;

  console.log('\n' + '='.repeat(70));
  console.log('📸  State Snapshot — Mina Devnet (zk-pret-test-v3.7)');
  console.log('='.repeat(70));
  console.log(`   Contract    : ${contractName}`);
  console.log(`   Output file : ${outputFile}`);
  console.log('='.repeat(70) + '\n');

  // ── Step 1: Initialize Oracle Registry & environment manager ─────────────
  // initializeOracleRegistry() follows the exact pattern in QueryVerificationCount.ts
  console.log('⚙️  Step 1: Initializing environment...');
  await initializeOracleRegistry();
  const currentEnv = environmentManager.getCurrentEnvironment();
  console.log(`   Environment : ${currentEnv}`);

  // ── Step 2: Connect to Mina Devnet ────────────────────────────────────────
  // Uses the same Mina.Network() call pattern as QueryVerificationCount.ts
  if (environmentManager.shouldConnectToDevnet()) {
    const network = Mina.Network({
      mina:    CONFIG.MINA_GRAPHQL,
      archive: CONFIG.ARCHIVE_GRAPHQL,
    });
    Mina.setActiveInstance(network);
    console.log(`   ✓ Connected to Mina Devnet`);
    console.log(`     Mina    : ${CONFIG.MINA_GRAPHQL}`);
    console.log(`     Archive : ${CONFIG.ARCHIVE_GRAPHQL}\n`);
  } else {
    console.log(`   ℹ️  Environment "${currentEnv}" — skipping Mina.Network (LOCAL mode)\n`);
  }

  // ── Step 3: Discover deployed contract address ────────────────────────────
  // Reads from config/environments/testnet.json via environmentManager
  console.log('🔍 Step 2: Discovering contract address...');
  const contractAddress = await environmentManager.getDeployedContractAddress(contractName);
  if (!contractAddress) {
    console.error(`\n❌ Contract "${contractName}" not found in environment config.`);
    console.error(`   Check config/environments/testnet.json for deployed contracts.`);
    console.error(`   Available: GLEIFOptimMultiCompanySmartContract, CorporateRegistrationMultiSmartContract, etc.`);
    process.exit(1);
  }
  console.log(`   Contract address : ${contractAddress}`);
  console.log(`   Explorer         : https://minascan.io/devnet/account/${contractAddress}\n`);

  // ── Step 4: Fetch account via o1js ────────────────────────────────────────
  // fetchAccount() is the official o1js method — same as in QueryVerificationCount.ts
  console.log('📡 Step 3: Fetching on-chain account state via o1js fetchAccount()...');
  const publicKey  = PublicKey.fromBase58(contractAddress);
  const accountInfo = await fetchAccount({ publicKey });

  if (accountInfo.error) {
    console.error(`\n❌ fetchAccount() returned an error: ${accountInfo.error}`);
    console.error(`   The contract may not be deployed or funded yet.`);
    console.error(`   Explorer: https://minascan.io/devnet/account/${contractAddress}`);
    process.exit(1);
  }

  const account  = accountInfo.account;
  // appState is an array of up to 8 Field elements.
  // GLEIFOptimMultiCompanySmartContract declares 7 @state fields.
  // UInt64 occupies 1 slot (stored as a single Field internally in o1js ≥ 0.16).
  const appState = account?.zkapp?.appState ?? [];

  const snapshot: ContractStateSnapshot = {
    capturedAt:               new Date().toISOString(),
    contractName,
    contractAddress,
    // Slot indices match the @state declaration order in GLEIFMultiSmartContract.ts
    totalCompaniesTracked:    appState[0]?.toString() ?? '0',
    compliantCompaniesCount:  appState[1]?.toString() ?? '0',
    totalVerificationsGlobal: appState[2]?.toString() ?? '0',
    lastVerificationTime:     appState[3]?.toString() ?? '0',
    companiesMapRoot:         appState[4]?.toString() ?? '0',
    registryVersion:          appState[5]?.toString() ?? '0',
    contractDisabled:         appState[6]?.toString() ?? '0',
    accountNonce:             account?.nonce?.toString()   ?? '0',
    balanceNanomina:          account?.balance?.toString() ?? '0',
    balanceMina:              (Number(account?.balance?.toString() ?? '0') / 1e9).toFixed(6),
  };

  // ── Step 5: Write snapshot to disk ────────────────────────────────────────
  await fs.writeFile(outputFile, JSON.stringify(snapshot, null, 2), 'utf8');

  // ── Print summary ────────────────────────────────────────────────────────
  console.log('✅ Snapshot captured successfully:\n');
  console.log(`   totalCompaniesTracked    : ${snapshot.totalCompaniesTracked}`);
  console.log(`   compliantCompaniesCount  : ${snapshot.compliantCompaniesCount}`);
  console.log(`   totalVerificationsGlobal : ${snapshot.totalVerificationsGlobal}`);
  console.log(`   lastVerificationTime     : ${snapshot.lastVerificationTime}`);
  console.log(`   registryVersion          : ${snapshot.registryVersion}`);
  console.log(`   contractDisabled         : ${snapshot.contractDisabled}`);
  console.log(`   accountNonce             : ${snapshot.accountNonce}`);
  console.log(`   balance                  : ${snapshot.balanceMina} MINA`);
  console.log(`\n   📄 Written to: ${outputFile}\n`);
}

main().catch(err => {
  console.error('\n❌ snapshotState.ts crashed:');
  console.error(err instanceof Error ? err.message : String(err));
  if (err instanceof Error && err.stack) {
    console.error(err.stack);
  }
  process.exit(1);
});
