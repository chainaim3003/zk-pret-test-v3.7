/**
 * BACKWARD COMPATIBILITY WRAPPER for RiskLiquidityBasel3OptimMerkleVerificationTestWithSign.ts
 * Original file becomes thin wrapper calling new organized handler
 * MAINTAINS 100% CLI COMPATIBILITY with working implementation
 *
 * UPDATE: Converted from monolithic implementation to organized architecture
 * Uses RiskBasel3NetworkHandler while preserving all existing functionality
 */

import { RiskBasel3NetworkHandler } from "../network/handler/RiskBasel3NetworkHandler.js";
import { RiskVerificationResult } from "../base/RiskVerificationBase.js";

// PRESERVE EXACT SAME FUNCTION SIGNATURE for compatibility
export async function executeRiskLiquidityBasel3OptimMerkleVerification(
  lcrThreshold: number,
  nsfrThreshold: number = 100,
  actusUrl: string = "http://localhost:8083/eventsBatch",
  contractPortfolio?: any[],
): Promise<RiskVerificationResult> {
  console.log("🔄 Using organized architecture (backward compatible)");

  // Delegate to new organized handler - ZERO FUNCTIONAL CHANGE
  const handler = new RiskBasel3NetworkHandler();
  return await handler.executeBasel3RiskVerification({
    basel3GroupID: "BASEL_GROUP_TEST_001",
    lcrThreshold,
    nsfrThreshold,
    actusUrl,
    contractPortfolio,
  });
}

// PRESERVE EXACT SAME CLI ENTRY POINT for backward compatibility
async function main() {
  // PRESERVE EXACT PARAMETER PARSING from working implementation
  const lcrThreshold = parseFloat(process.argv[2]);
  const nsfrThreshold = parseFloat(process.argv[3]) || 100;
  const actusUrl = process.argv[4] || "http://localhost:8083/eventsBatch";
  const portfolioPath = process.argv[5];

  // PRESERVE EXACT VALIDATION LOGIC from working implementation
  if (isNaN(lcrThreshold)) {
    console.error("❌ Error: LCR threshold is required");
    console.log(
      "Usage: node RiskLiquidityBasel3OptimMerkleVerificationTestWithSign.js <lcrThreshold> <nsfrThreshold> <actusUrl> [portfolioPath]",
    );
    process.exit(1);
  }

  // PRESERVE EXACT PORTFOLIO LOADING from working implementation
  let contractPortfolio: any[] | undefined;
  if (portfolioPath) {
    try {
      const fs = await import("fs");
      const path = await import("path");
      const fullPath = path.resolve(portfolioPath);
      const rawData = fs.readFileSync(fullPath, "utf8");
      const parsed = JSON.parse(rawData);
      contractPortfolio = parsed.contracts;

      console.log(
        `📊 Portfolio ID: ${parsed.portfolioMetadata?.portfolioId || "Unknown"
        }`,
      );
      console.log(
        `💰 Total Notional: ${parsed.portfolioMetadata?.totalNotional || "Unknown"
        }`,
      );
      console.log(`🔍 HQLA Categories from Config:`);
      contractPortfolio?.forEach((contract, index) => {
        console.log(
          `   Contract ${contract.contractID || index}: HQLA Category = ${contract.hqlaCategory || "Not specified"
          }`,
        );
      });
    } catch (error: any) {
      console.error(
        `❌ Failed to load portfolio from ${portfolioPath}:`,
        error.message,
      );
      console.log(`🔄 Falling back to default hardcoded contracts`);
      contractPortfolio = undefined;
    }
  }

  // PRESERVE EXACT LOGGING from working implementation
  console.log(`🏦 Basel3 LCR Threshold: ${lcrThreshold}%`);
  console.log(`💰 Basel3 NSFR Threshold: ${nsfrThreshold}%`);
  console.log(`🌐 ACTUS API URL: ${actusUrl}`);
  if (portfolioPath) {
    console.log(`📁 Portfolio Path: ${portfolioPath}`);
  }

  // Execute the refactored function - IDENTICAL RESULTS
  const result = await executeRiskLiquidityBasel3OptimMerkleVerification(
    lcrThreshold,
    nsfrThreshold,
    actusUrl,
    contractPortfolio,
  );

  // PRESERVE EXACT SUCCESS/FAILURE HANDLING from working implementation
  if (result.success) {
    console.log("\n🎉 Basel3 Risk verification completed successfully!");
    console.log(
      `📊 Status Change: ${result.contractStatus.beforeVerification} → ${result.contractStatus.afterVerification}`,
    );

    if (result.contractStatus.afterVerification === 90) {
      console.log(
        "✅ BASEL3 COMPLIANCE ACHIEVED - Contract status changed to 90",
      );
    } else {
      console.log("⚠️ Unexpected contract status - should be 90 (compliant)");
    }
  } else {
    console.log(
      "\n🔴 Basel3 Risk verification completed - Non-compliant scenario detected",
    );
    console.log("✅ This is expected behavior for INVALID test cases");
  }
}

// PRESERVE EXACT CLI EXECUTION PATTERN from working implementation
main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});
