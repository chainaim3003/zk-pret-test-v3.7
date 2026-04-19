/**
 * verifyTransaction.ts
 *
 * Automated on-chain transaction verifier for Mina Devnet — zk-pret-test-v3.7.
 *
 * WHAT IT VERIFIES:
 *   [A] Transaction exists in the Mina Archive Node (by hash)
 *   [B] Transaction status is INCLUDED (not PENDING / FAILED)
 *   [C] Transaction has a valid timestamp (dateTime field from archive)
 *   [D] Contract state BEFORE the transaction matches the expected value
 *   [E] Contract state AFTER  the transaction matches the expected value
 *
 * The "value" being tracked is totalVerificationsGlobal (appState[2]) of the
 * deployed zkApp contract — this is the field that increments on every
 * successful GLEIF / CorpReg / EXIM verification (your 57→58 use case).
 *
 * HOW IT WORKS:
 *   1. Initializes environmentManager (reads BUILD_ENV from .env)
 *   2. Connects to Mina Devnet via o1js Mina.Network()
 *   3. Resolves contract address from config/environments/testnet.json
 *   4. Loads the before-snapshot written by snapshotState.ts
 *   5. Queries the Mina Archive GraphQL for the transaction by hash
 *   6. Reads the contract's current on-chain state via o1js fetchAccount()
 *   7. Runs all checks and prints a clear PASS / FAIL report
 *
 * OFFICIAL REFERENCES:
 *   Mina Archive GraphQL schema:
 *     https://docs.minaprotocol.com/node/archive-node/archive-node-api
 *   o1js fetchAccount:
 *     https://docs.minaprotocol.com/zkapps/o1js/fetch-events-and-actions
 *   Mina.Network:
 *     https://docs.minaprotocol.com/zkapps/o1js-reference/modules/Mina
 *   Archive endpoint (minascan devnet):
 *     https://api.minascan.io/archive/devnet/v1/graphql
 *
 * USAGE:
 *   npm run build
 *   node build/scripts/verification/verifyTransaction.js \
 *     --txHash <TRANSACTION_HASH> \
 *     --contractName GLEIFOptimMultiCompanySmartContract \
 *     --expectedBefore 57 \
 *     --expectedAfter 58 \
 *     --snapshotFile /tmp/zk_state_before.json
 *
 * EXIT CODES:
 *   0  — all checks passed
 *   1  — one or more checks failed
 *   2  — crash / unexpected error
 */

import * as dotenv from 'dotenv';
dotenv.config();

import axios from 'axios';
import { Mina, fetchAccount, PublicKey } from 'o1js';
import { promises as fs } from 'fs';
import {
  initializeOracleRegistry,
  environmentManager,
} from '../../infrastructure/index.js';
import type { ContractStateSnapshot } from './snapshotState.js';

// ─── Configuration ──────────────────────────────────────────────────────────

const CONFIG = {
  MINA_GRAPHQL:    process.env.MINA_GRAPHQL_ENDPOINT
                   || 'https://api.minascan.io/node/devnet/v1/graphql',
  ARCHIVE_GRAPHQL: process.env.MINA_ARCHIVE_ENDPOINT
                   || 'https://api.minascan.io/archive/devnet/v1/graphql',
  TX_HASH:         process.env.TX_HASH         || '',
  CONTRACT_NAME:   process.env.CONTRACT_NAME   || 'GLEIFOptimMultiCompanySmartContract',
  EXPECTED_BEFORE: Number(process.env.EXPECTED_BEFORE ?? '-1'),  // -1 = skip check
  EXPECTED_AFTER:  Number(process.env.EXPECTED_AFTER  ?? '-1'),  // -1 = skip check
  SNAPSHOT_FILE:   process.env.SNAPSHOT_FILE   || '/tmp/zk_state_before.json',
  RETRY_COUNT:     Number(process.env.RETRY_COUNT     ?? '3'),
  RETRY_DELAY_MS:  Number(process.env.RETRY_DELAY_MS  ?? '8000'),
};

// ─── Types ───────────────────────────────────────────────────────────────────

/**
 * Data returned by the Mina Archive Node for a single transaction.
 * Field names match the Archive GraphQL schema exactly.
 * Reference: https://docs.minaprotocol.com/node/archive-node/archive-node-api
 */
interface TransactionInfo {
  hash:        string;
  /** ISO-8601 UTC timestamp from the Archive Node */
  dateTime:    string;
  blockHeight: number;
  /** null when transaction succeeded; populated when it failed */
  failureReason: string | null;
  memo:        string;
  feePayerPublicKey: string;
  nonce:       number;
  /** Derived from failureReason: 'INCLUDED' | 'FAILED' */
  status:      'INCLUDED' | 'FAILED' | 'UNKNOWN';
}

interface ContractStateAfter {
  totalCompaniesTracked:    string;
  compliantCompaniesCount:  string;
  totalVerificationsGlobal: string;
  lastVerificationTime:     string;
  accountNonce:             string;
  balanceMina:              string;
}

interface SingleCheck {
  pass:   boolean;
  detail: string;
}

interface VerificationResult {
  pass:   boolean;
  txHash: string;
  checks: {
    txExists:    SingleCheck;
    txStatus:    SingleCheck;
    txTimestamp: SingleCheck;
    valueBefore: SingleCheck;
    valueAfter:  SingleCheck;
  };
  transactionInfo?:  TransactionInfo;
  stateBefore?:      ContractStateSnapshot;
  stateAfter?:       ContractStateAfter;
  contractAddress?:  string;
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

/**
 * Retries an async operation up to `retries` times with `delayMs` between attempts.
 * Mina Devnet GraphQL endpoints can be transiently unavailable — retries are essential.
 */
async function withRetry<T>(
  label: string,
  fn: () => Promise<T>,
  retries: number  = CONFIG.RETRY_COUNT,
  delayMs: number  = CONFIG.RETRY_DELAY_MS
): Promise<T> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`   ⚠️  [${label}] Attempt ${attempt}/${retries} failed: ${msg}`);
      if (attempt < retries) {
        console.log(`   ⏳  Retrying in ${delayMs / 1000}s...`);
        await sleep(delayMs);
      } else {
        throw err;
      }
    }
  }
  // TypeScript needs this even though the loop always throws or returns
  throw new Error(`[${label}] All ${retries} attempts failed`);
}

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

// ─── Archive Node Query ──────────────────────────────────────────────────────

/**
 * Queries the Mina Archive Node's GraphQL endpoint for a transaction by hash.
 *
 * The Archive Node GraphQL schema exposes a `transaction` query that accepts
 * a `query` filter object. The `hash` field is the Mina transaction hash
 * (base58-encoded, typically starts with "5J...").
 *
 * Archive endpoint: https://api.minascan.io/archive/devnet/v1/graphql
 * Schema reference: https://docs.minaprotocol.com/node/archive-node/archive-node-api
 *
 * NOTE: `failureReason` is null for successful (INCLUDED) transactions.
 *       It is a string describing the failure for failed transactions.
 */
async function fetchTransactionFromArchive(txHash: string): Promise<TransactionInfo | null> {
  const query = `
    query GetTransaction($hash: String!) {
      transaction(query: { hash: $hash }) {
        hash
        dateTime
        blockHeight
        failureReason
        memo
        nonce
        feePayer {
          publicKey
        }
      }
    }
  `;

  const data = await withRetry('archive:fetchTx', async () => {
    const res = await axios.post(
      CONFIG.ARCHIVE_GRAPHQL,
      { query, variables: { hash: txHash } },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30_000,
      }
    );
    if (res.data?.errors?.length) {
      throw new Error(
        `Archive GraphQL returned errors: ${JSON.stringify(res.data.errors)}`
      );
    }
    return res.data;
  });

  const tx = data?.data?.transaction;
  if (!tx) return null;

  return {
    hash:             tx.hash,
    dateTime:         tx.dateTime ?? '',
    blockHeight:      tx.blockHeight ?? 0,
    failureReason:    tx.failureReason ?? null,
    memo:             tx.memo ?? '',
    feePayerPublicKey: tx.feePayer?.publicKey ?? '',
    nonce:            tx.nonce ?? 0,
    // A null failureReason means the transaction was successfully included.
    status: tx.failureReason ? 'FAILED' : 'INCLUDED',
  };
}

// ─── On-chain State Query ─────────────────────────────────────────────────────

/**
 * Reads the current on-chain state of the zkApp contract via o1js fetchAccount().
 *
 * fetchAccount() is the canonical o1js method for retrieving a Mina account's
 * state from the network. It returns the zkapp.appState array (up to 8 Fields).
 *
 * appState slot mapping for GLEIFOptimMultiCompanySmartContract
 * (order matches the @state declarations in GLEIFMultiSmartContract.ts):
 *   [0] totalCompaniesTracked
 *   [1] compliantCompaniesCount
 *   [2] totalVerificationsGlobal   ← this is the "value" (57→58)
 *   [3] lastVerificationTime       (UInt64 → stored as Field)
 *   [4] companiesMapRoot
 *   [5] registryVersion
 *   [6] contractDisabled
 */
async function readOnChainState(contractAddress: string): Promise<ContractStateAfter> {
  const publicKey = PublicKey.fromBase58(contractAddress);

  const accountInfo = await withRetry('o1js:fetchAccount', async () => {
    return fetchAccount({ publicKey });
  });

  if (accountInfo.error) {
    throw new Error(
      `o1js fetchAccount() returned an error for ${contractAddress}: ${accountInfo.error}`
    );
  }

  const account  = accountInfo.account;
  const appState = account?.zkapp?.appState ?? [];

  return {
    totalCompaniesTracked:    appState[0]?.toString() ?? '0',
    compliantCompaniesCount:  appState[1]?.toString() ?? '0',
    totalVerificationsGlobal: appState[2]?.toString() ?? '0',
    lastVerificationTime:     appState[3]?.toString() ?? '0',
    accountNonce:             account?.nonce?.toString()   ?? '0',
    balanceMina:              (Number(account?.balance?.toString() ?? '0') / 1e9).toFixed(6),
  };
}

// ─── Before-snapshot Loader ───────────────────────────────────────────────────

/**
 * Loads the JSON snapshot file written by snapshotState.ts.
 * Returns null (gracefully) if the file doesn't exist — checks [D] will be skipped.
 */
async function loadSnapshot(filePath: string): Promise<ContractStateSnapshot | null> {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw) as ContractStateSnapshot;
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      console.warn(`   ⚠️  Snapshot file not found: ${filePath}`);
      console.warn(`      Before-state checks will be skipped.`);
      return null;
    }
    throw err;
  }
}

// ─── Result Printer ───────────────────────────────────────────────────────────

function printResults(result: VerificationResult): void {
  const icon = (p: boolean) => p ? '✅ PASS' : '❌ FAIL';
  const { checks } = result;

  console.log('\n' + '='.repeat(70));
  console.log('📊  VERIFICATION RESULTS');
  console.log('='.repeat(70));

  console.log(`\n  [A] Transaction Exists    : ${icon(checks.txExists.pass)}`);
  console.log(`      ${checks.txExists.detail}`);

  console.log(`\n  [B] Transaction Status    : ${icon(checks.txStatus.pass)}`);
  console.log(`      ${checks.txStatus.detail}`);

  console.log(`\n  [C] Timestamp Present     : ${icon(checks.txTimestamp.pass)}`);
  console.log(`      ${checks.txTimestamp.detail}`);

  console.log(`\n  [D] Value BEFORE (state)  : ${icon(checks.valueBefore.pass)}`);
  console.log(`      ${checks.valueBefore.detail}`);

  console.log(`\n  [E] Value AFTER  (state)  : ${icon(checks.valueAfter.pass)}`);
  console.log(`      ${checks.valueAfter.detail}`);

  if (result.transactionInfo) {
    const tx = result.transactionInfo;
    console.log('\n' + '-'.repeat(70));
    console.log('📌  Transaction Details:');
    console.log(`    Hash         : ${tx.hash}`);
    console.log(`    Status       : ${tx.status}`);
    console.log(`    Block #      : ${tx.blockHeight}`);
    console.log(`    Timestamp    : ${tx.dateTime}`);
    console.log(`    Fee Payer    : ${tx.feePayerPublicKey}`);
    console.log(`    Nonce        : ${tx.nonce}`);
    console.log(`    Memo         : ${tx.memo || '(none)'}`);
    if (tx.failureReason) {
      console.log(`    Fail Reason  : ${tx.failureReason}`);
    }
    console.log(`    Explorer     : https://minascan.io/devnet/tx/${tx.hash}`);
  }

  if (result.stateAfter) {
    const s = result.stateAfter;
    console.log('\n' + '-'.repeat(70));
    console.log('📋  Contract State (AFTER):');
    console.log(`    totalVerificationsGlobal : ${s.totalVerificationsGlobal}`);
    console.log(`    totalCompaniesTracked    : ${s.totalCompaniesTracked}`);
    console.log(`    compliantCompaniesCount  : ${s.compliantCompaniesCount}`);
    console.log(`    lastVerificationTime     : ${s.lastVerificationTime}`);
    console.log(`    accountNonce             : ${s.accountNonce}`);
    console.log(`    balance                  : ${s.balanceMina} MINA`);
  }

  if (result.stateBefore) {
    const b = result.stateBefore;
    console.log('\n' + '-'.repeat(70));
    console.log('📋  Contract State (BEFORE — from snapshot):');
    console.log(`    totalVerificationsGlobal : ${b.totalVerificationsGlobal}`);
    console.log(`    totalCompaniesTracked    : ${b.totalCompaniesTracked}`);
    console.log(`    compliantCompaniesCount  : ${b.compliantCompaniesCount}`);
    console.log(`    capturedAt               : ${b.capturedAt}`);
  }

  if (result.contractAddress) {
    console.log('\n' + '-'.repeat(70));
    console.log('🌐  Contract Explorer:');
    console.log(`    https://minascan.io/devnet/account/${result.contractAddress}`);
  }

  console.log('\n' + '='.repeat(70));
  const label = result.pass ? '✅  OVERALL: PASS' : '❌  OVERALL: FAIL';
  console.log(`    ${label}`);
  console.log('='.repeat(70) + '\n');
}

// ─── Core Verifier ─────────────────────────────────────────────────────────

/**
 * Runs the full verification sequence.
 * Exported so it can also be called programmatically from other scripts.
 */
export async function verifyTransaction(options: {
  txHash:         string;
  contractName:   string;
  expectedBefore: number;   // -1 = skip
  expectedAfter:  number;   // -1 = skip
  snapshotFile:   string;
}): Promise<VerificationResult> {
  const { txHash, contractName, expectedBefore, expectedAfter, snapshotFile } = options;

  console.log('\n' + '='.repeat(70));
  console.log('🔍  Automated Transaction Verifier — zk-pret-test-v3.7');
  console.log('='.repeat(70));
  console.log(`   TX Hash         : ${txHash}`);
  console.log(`   Contract        : ${contractName}`);
  console.log(`   Expected Before : ${expectedBefore === -1 ? '(skip)' : expectedBefore}`);
  console.log(`   Expected After  : ${expectedAfter  === -1 ? '(skip)' : expectedAfter}`);
  console.log(`   Snapshot file   : ${snapshotFile}`);
  console.log('='.repeat(70) + '\n');

  // ── Step 1: Initialize environment ─────────────────────────────────────
  console.log('⚙️  Step 1: Initializing environment...');
  await initializeOracleRegistry();
  const currentEnv = environmentManager.getCurrentEnvironment();
  console.log(`   Environment : ${currentEnv}`);

  // ── Step 2: Connect to Mina Devnet ──────────────────────────────────────
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
    console.log(`   ℹ️  Non-devnet env (${currentEnv}) — skipping Mina.Network\n`);
  }

  // ── Step 3: Resolve contract address ────────────────────────────────────
  console.log('🔍 Step 2: Resolving contract address...');
  const contractAddress = await environmentManager.getDeployedContractAddress(contractName);
  if (!contractAddress) {
    throw new Error(
      `Contract "${contractName}" not found in config/environments/testnet.json.\n` +
      `Ensure it is deployed and the CONTRACT_NAME env var is correct.`
    );
  }
  console.log(`   Contract address : ${contractAddress}\n`);

  // ── Step 4: Load before-snapshot ─────────────────────────────────────────
  console.log('📂 Step 3: Loading before-snapshot...');
  const stateBefore = await loadSnapshot(snapshotFile);
  if (stateBefore) {
    console.log(`   ✓ Snapshot loaded (captured at ${stateBefore.capturedAt})`);
    console.log(`   totalVerificationsGlobal (before) : ${stateBefore.totalVerificationsGlobal}\n`);
  } else {
    console.log(`   ⚠️  No snapshot — before-state checks will show "skipped"\n`);
  }

  // ── Step 5: Query archive for the transaction ────────────────────────────
  console.log('📦 Step 4: Querying Mina Archive Node for transaction...');
  console.log(`   Archive : ${CONFIG.ARCHIVE_GRAPHQL}`);
  const txInfo = await fetchTransactionFromArchive(txHash);
  if (txInfo) {
    console.log(`   ✓ Transaction found — block #${txInfo.blockHeight}, status: ${txInfo.status}\n`);
  } else {
    console.log(`   ⚠️  Transaction not found in archive (may still be pending finalization)\n`);
  }

  // ── Step 6: Fetch current on-chain contract state ────────────────────────
  console.log('📡 Step 5: Fetching current on-chain contract state via o1js fetchAccount()...');
  const stateAfter = await readOnChainState(contractAddress);
  console.log(`   totalVerificationsGlobal (after) : ${stateAfter.totalVerificationsGlobal}\n`);

  // ── Step 7: Build check results ──────────────────────────────────────────
  console.log('📋 Step 6: Evaluating checks...');

  // [A] Transaction exists in the archive
  const txExists: SingleCheck = {
    pass:   txInfo !== null,
    detail: txInfo
      ? `Transaction found in Mina Archive — block #${txInfo.blockHeight}`
      : `Transaction ${txHash} NOT found in Archive Node (finalization may still be in progress)`,
  };

  // [B] Transaction status is INCLUDED (not FAILED)
  const txStatus: SingleCheck = {
    pass:   txInfo?.status === 'INCLUDED',
    detail: txInfo
      ? `Status: ${txInfo.status}${txInfo.failureReason ? ' — ' + txInfo.failureReason : ''}`
      : `Cannot determine status — transaction not found in archive`,
  };

  // [C] Transaction has a valid timestamp
  const hasValidTimestamp = !!txInfo?.dateTime && !isNaN(Date.parse(txInfo.dateTime));
  const txTimestamp: SingleCheck = {
    pass:   hasValidTimestamp,
    detail: hasValidTimestamp
      ? `Timestamp: ${txInfo!.dateTime} (block #${txInfo!.blockHeight})`
      : `No valid timestamp on transaction (dateTime: "${txInfo?.dateTime ?? 'missing'}")`,
  };

  // [D] Value BEFORE matches expected
  //     Uses totalVerificationsGlobal from the snapshot (appState[2])
  const beforeActual = stateBefore
    ? Number(stateBefore.totalVerificationsGlobal)
    : null;

  const valueBefore: SingleCheck = (() => {
    if (expectedBefore === -1) {
      return { pass: true, detail: 'Before-check skipped (expectedBefore = -1)' };
    }
    if (beforeActual === null) {
      return { pass: false, detail: 'Before-check: no snapshot available for comparison' };
    }
    const pass = beforeActual === expectedBefore;
    return {
      pass,
      detail: `totalVerificationsGlobal BEFORE — expected: ${expectedBefore}, actual: ${beforeActual}`,
    };
  })();

  // [E] Value AFTER matches expected
  //     Uses totalVerificationsGlobal from the live fetchAccount() call (appState[2])
  const afterActual = Number(stateAfter.totalVerificationsGlobal);
  const valueAfter: SingleCheck = (() => {
    if (expectedAfter === -1) {
      return { pass: true, detail: 'After-check skipped (expectedAfter = -1)' };
    }
    const pass = afterActual === expectedAfter;
    return {
      pass,
      detail: `totalVerificationsGlobal AFTER — expected: ${expectedAfter}, actual: ${afterActual}`,
    };
  })();

  const allPassed =
    txExists.pass &&
    txStatus.pass &&
    txTimestamp.pass &&
    valueBefore.pass &&
    valueAfter.pass;

  const result: VerificationResult = {
    pass: allPassed,
    txHash,
    checks: { txExists, txStatus, txTimestamp, valueBefore, valueAfter },
    transactionInfo:  txInfo  ?? undefined,
    stateBefore:      stateBefore ?? undefined,
    stateAfter,
    contractAddress,
  };

  // ── Step 8: Print human-readable results ────────────────────────────────
  printResults(result);

  return result;
}

// ─── CLI Entry Point ──────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const args = parseArgs();

  const txHash         = args['txHash']         || CONFIG.TX_HASH;
  const contractName   = args['contractName']   || CONFIG.CONTRACT_NAME;
  const snapshotFile   = args['snapshotFile']   || CONFIG.SNAPSHOT_FILE;
  const expectedBefore = args['expectedBefore'] !== undefined
    ? Number(args['expectedBefore'])
    : CONFIG.EXPECTED_BEFORE;
  const expectedAfter  = args['expectedAfter']  !== undefined
    ? Number(args['expectedAfter'])
    : CONFIG.EXPECTED_AFTER;

  if (!txHash) {
    console.error('\n❌ Transaction hash is required.\n');
    console.log('Usage:');
    console.log('  node build/scripts/verification/verifyTransaction.js \\');
    console.log('    --txHash <TX_HASH> \\');
    console.log('    --contractName GLEIFOptimMultiCompanySmartContract \\');
    console.log('    --expectedBefore 57 \\');
    console.log('    --expectedAfter 58 \\');
    console.log('    --snapshotFile /tmp/zk_state_before.json\n');
    console.log('Or set TX_HASH in your .env file.\n');
    process.exit(2);
  }

  try {
    const result = await verifyTransaction({
      txHash,
      contractName,
      expectedBefore,
      expectedAfter,
      snapshotFile,
    });

    // Shell-compatible exit codes: 0 = pass, 1 = fail
    process.exit(result.pass ? 0 : 1);

  } catch (err) {
    console.error('\n❌ verifyTransaction.ts crashed:');
    console.error(err instanceof Error ? err.message : String(err));
    if (err instanceof Error && err.stack) {
      console.error(err.stack);
    }
    process.exit(2);
  }
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(2);
});
