#!/usr/bin/env bash
# =============================================================================
# run_and_verify.sh
#
# Full automated pipeline for a single Mina Devnet verification + on-chain check.
#
# FLOW:
#   Step 1  — Snapshot contract state BEFORE the transaction
#   Step 2  — Run the actual transaction (e.g. GLEIF / CorpReg verifier)
#   Step 3  — Wait for Mina Devnet block finalization (~3 minutes)
#   Step 4  — Verify: tx exists, status, timestamp, before/after state
#
# USAGE:
#   # GLEIF (default)
#   bash scripts/run_and_verify.sh
#
#   # Corporate Registration
#   VERIFIER_TYPE=corpreg COMPANY_ID="U01112TZ2022PTC039493" \
#     bash scripts/run_and_verify.sh
#
#   # EXIM
#   VERIFIER_TYPE=exim COMPANY_ID="SREE PALANI ANDAVAR AGROS PRIVATE LIMITED" \
#     bash scripts/run_and_verify.sh
#
# PREREQUISITES:
#   npm run build              — TypeScript compiled to build/
#   .env populated             — BUILD_ENV=TESTNET, MINA_GRAPHQL_ENDPOINT, etc.
#   Contract deployed          — address in config/environments/testnet.json
#
# EXIT CODES:
#   0  — all verification checks passed
#   1  — one or more checks failed (check output above for details)
#   2  — pipeline error (missing build, missing env, etc.)
# =============================================================================
set -euo pipefail

# ─── Defaults (all overridable via environment variables) ────────────────────

VERIFIER_TYPE="${VERIFIER_TYPE:-gleif}"
COMPANY_ID="${COMPANY_ID:-SREE PALANI ANDAVAR AGROS PRIVATE LIMITED}"
CONTRACT_NAME="${CONTRACT_NAME:-GLEIFOptimMultiCompanySmartContract}"
EXPECTED_BEFORE="${EXPECTED_BEFORE:--1}"      # -1 = skip before check
EXPECTED_AFTER="${EXPECTED_AFTER:--1}"        # -1 = skip after check
SNAPSHOT_FILE="${SNAPSHOT_FILE:-/tmp/zk_state_before.json}"

# Mina Devnet block time is approximately 3 minutes (180 seconds).
# Increase this if your transaction is not confirmed within the window.
FINALIZATION_WAIT_SECONDS="${FINALIZATION_WAIT_SECONDS:-200}"

# ─── Load .env (safe: only export known variable names) ──────────────────────

if [ -f ".env" ]; then
  while IFS='=' read -r key value; do
    [[ "$key" =~ ^#.*$ ]] && continue
    [[ -z "$key" ]]       && continue
    case "$key" in
      BUILD_ENV|CONTRACT_NAME|EXPECTED_BEFORE|EXPECTED_AFTER|\
      SNAPSHOT_FILE|RETRY_COUNT|RETRY_DELAY_MS|\
      MINA_GRAPHQL_ENDPOINT|MINA_ARCHIVE_ENDPOINT|TX_HASH)
        export "$key=$value"
        ;;
    esac
  done < .env
fi

# ─── Sanity checks ────────────────────────────────────────────────────────────

if [ ! -d "build" ]; then
  echo "❌ build/ directory not found. Run: npm run build"
  exit 2
fi

if [ ! -f "build/scripts/verification/snapshotState.js" ]; then
  echo "❌ build/scripts/verification/snapshotState.js not found."
  echo "   Run: npm run build   (TypeScript must be compiled first)"
  exit 2
fi

if [ ! -f "build/scripts/verification/verifyTransaction.js" ]; then
  echo "❌ build/scripts/verification/verifyTransaction.js not found."
  echo "   Run: npm run build"
  exit 2
fi

# ─── Step 1: Snapshot state BEFORE transaction ───────────────────────────────

echo ""
echo "════════════════════════════════════════════════════════════════════════"
echo "  STEP 1 — Snapshot contract state BEFORE transaction"
echo "  Contract  : ${CONTRACT_NAME}"
echo "  Snapshot  : ${SNAPSHOT_FILE}"
echo "════════════════════════════════════════════════════════════════════════"

node build/scripts/verification/snapshotState.js \
  --contractName "${CONTRACT_NAME}" \
  --outputFile   "${SNAPSHOT_FILE}"

echo ""
echo "  ✓ Snapshot saved to ${SNAPSHOT_FILE}"

# ─── Step 2: Execute the transaction ─────────────────────────────────────────

echo ""
echo "════════════════════════════════════════════════════════════════════════"
echo "  STEP 2 — Executing transaction"
echo "  Type      : ${VERIFIER_TYPE}"
echo "  Company   : ${COMPANY_ID}"
echo "════════════════════════════════════════════════════════════════════════"

# Select the correct network verifier based on VERIFIER_TYPE.
# These map 1-to-1 with the commands in runAllTest3.7.sh.
case "${VERIFIER_TYPE}" in
  gleif)
    VERIFIER_CMD="node ./build/impl/network/verifier/GLEIFNetworkMultiVerifier.js"
    CONTRACT_NAME="${CONTRACT_NAME:-GLEIFOptimMultiCompanySmartContract}"
    ;;
  corpreg)
    VERIFIER_CMD="node ./build/impl/network/verifier/CorporateRegistrationNetworkMultiVerifier.js"
    CONTRACT_NAME="${CONTRACT_NAME:-CorporateRegistrationMultiSmartContract}"
    ;;
  exim)
    VERIFIER_CMD="node ./build/impl/network/verifier/EXIMNetworkMultiVerifier.js"
    CONTRACT_NAME="${CONTRACT_NAME:-EXIMOptimMultiCompanySmartContract}"
    ;;
  composed)
    VERIFIER_CMD="node ./build/impl/network/verifier/ComposedNetworkMultiVerifier.js"
    CONTRACT_NAME="${CONTRACT_NAME:-ComposedOptimComplianceVerifierSC}"
    ;;
  *)
    echo "❌ Unknown VERIFIER_TYPE: ${VERIFIER_TYPE}"
    echo "   Valid values: gleif | corpreg | exim | composed"
    exit 2
    ;;
esac

echo "  Command: ${VERIFIER_CMD} \"${COMPANY_ID}\""
echo ""

# Run the verifier; capture output for hash extraction while streaming to terminal
TX_OUTPUT_FILE="/tmp/zk_tx_output_$$.log"
${VERIFIER_CMD} "${COMPANY_ID}" 2>&1 | tee "${TX_OUTPUT_FILE}"

echo ""
echo "  ✓ Verifier execution complete"

# ─── Extract transaction hash from verifier output ───────────────────────────
#
# Mina transaction hashes are base58check-encoded, 52 characters, start with "5J".
# Reference: https://docs.minaprotocol.com/mina-protocol/base58check-encoding
#
# Your network verifiers print lines such as:
#   Transaction hash: 5Ju9nLe7...
#   txHash: 5Ju9nLe7...
#   broadcastTransaction { hash: "5Ju9..." }

TX_HASH=$(grep -oE '5J[1-9A-HJ-NP-Za-km-z]{50}' "${TX_OUTPUT_FILE}" | head -1 || true)
rm -f "${TX_OUTPUT_FILE}"

if [ -z "${TX_HASH:-}" ]; then
  echo ""
  echo "⚠️  Could not auto-extract transaction hash from verifier output."
  echo "   Please enter it manually (or press Enter to skip tx-existence checks):"
  read -r TX_HASH || true
fi

if [ -z "${TX_HASH:-}" ]; then
  echo "⚠️  No hash provided — checks [A][B][C] will FAIL. State checks [D][E] still run."
  TX_HASH="NO_HASH_PROVIDED"
fi

export TX_HASH
echo ""
echo "  ✓ Transaction hash : ${TX_HASH}"
echo "  Explorer           : https://minascan.io/devnet/tx/${TX_HASH}"

# ─── Step 3: Wait for Mina Devnet block finalization ─────────────────────────

echo ""
echo "════════════════════════════════════════════════════════════════════════"
echo "  STEP 3 — Waiting for Mina Devnet finalization (~3 min per block)"
echo "  Waiting ${FINALIZATION_WAIT_SECONDS}s ..."
echo "════════════════════════════════════════════════════════════════════════"

ELAPSED=0
while [ "${ELAPSED}" -lt "${FINALIZATION_WAIT_SECONDS}" ]; do
  REMAINING=$(( FINALIZATION_WAIT_SECONDS - ELAPSED ))
  printf "\r  ⏳  %3ds remaining..." "${REMAINING}"
  sleep 10
  ELAPSED=$(( ELAPSED + 10 ))
done
echo ""
echo ""
echo "  ✓ Wait complete"

# ─── Step 4: Run the TypeScript verifier ─────────────────────────────────────

echo ""
echo "════════════════════════════════════════════════════════════════════════"
echo "  STEP 4 — Running transaction verification"
echo "  TX Hash  : ${TX_HASH}"
echo "  Contract : ${CONTRACT_NAME}"
echo "  Expected : ${EXPECTED_BEFORE} → ${EXPECTED_AFTER}"
echo "════════════════════════════════════════════════════════════════════════"

set +e
node build/scripts/verification/verifyTransaction.js \
  --txHash         "${TX_HASH}"         \
  --contractName   "${CONTRACT_NAME}"   \
  --expectedBefore "${EXPECTED_BEFORE}" \
  --expectedAfter  "${EXPECTED_AFTER}"  \
  --snapshotFile   "${SNAPSHOT_FILE}"
VERIFY_EXIT=$?
set -e

# ─── Final summary ────────────────────────────────────────────────────────────

echo ""
echo "════════════════════════════════════════════════════════════════════════"
if [ "${VERIFY_EXIT}" -eq 0 ]; then
  echo "  🎉  OVERALL RESULT: PASS"
elif [ "${VERIFY_EXIT}" -eq 1 ]; then
  echo "  💥  OVERALL RESULT: FAIL — see VERIFICATION RESULTS above"
else
  echo "  💥  OVERALL RESULT: ERROR (exit ${VERIFY_EXIT}) — verifier crashed"
fi
echo "════════════════════════════════════════════════════════════════════════"
echo ""

exit "${VERIFY_EXIT}"
