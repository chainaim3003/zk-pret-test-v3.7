/**
 * CLI Entry Point for Basel3 Risk LOCAL Verification
 * ENHANCED WITH GROUP STRUCTURE (Following Network Pattern)
 * Optimized for local development/testing with faster execution
 *
 * Uses new organized RiskBasel3LocalHandler for improved development workflow
 */

import { CircuitString } from "o1js";
import { RiskBasel3LocalHandler } from "../handler/RiskBasel3LocalHandler.js";

async function main() {
  console.log(
    "🏠 Basel3 Risk LOCAL Verification (Group Structure Enabled - Development Optimized)",
  );

  // === GROUP STRUCTURE PATTERN (Following Network Implementation) ===
  // Parse command line arguments in same order as Network
  const args = process.argv.slice(2);

  // Extract parameters following Network pattern
  const baselGroupID = args[0];
  const lcrThreshold = parseFloat(args[1]);
  const nsfrThreshold = parseFloat(args[2]) || 100;
  const actusUrl = args[3] || "http://localhost:8083/eventsBatch";
  const portfolioPath = args[4];

  // === VALIDATION (Following Network Pattern) ===
  if (!baselGroupID) {
    console.error("❌ Error: Basel Group ID is required (first argument)");
    console.log(
      "Usage: node RiskBasel3LocalMultiVerifier.js <BASEL_GROUP_ID> <lcrThreshold> <nsfrThreshold> <actusUrl> <portfolioPath>",
    );
    console.log(
      "Example: node RiskBasel3LocalMultiVerifier.js BASEL_GROUP_001 80 80 http://localhost:8083/eventsBatch ./portfolio.json",
    );
    process.exit(1);
  }

  if (isNaN(lcrThreshold)) {
    console.error("❌ Error: LCR threshold is required (second argument)");
    console.log(
      "Usage: node RiskBasel3LocalMultiVerifier.js <BASEL_GROUP_ID> <lcrThreshold> <nsfrThreshold> <actusUrl> <portfolioPath>",
    );
    process.exit(1);
  }

  if (!portfolioPath) {
    console.error("❌ Error: Portfolio path is required");
    console.log(
      "Usage: node RiskBasel3LocalMultiVerifier.js <BASEL_GROUP_ID> <lcrThreshold> <nsfrThreshold> <actusUrl> <portfolioPath>",
    );
    process.exit(1);
  }

  // Convert Basel Group ID to CircuitString (Following Network Pattern)
  const baselGroupIDCircuit = CircuitString.fromString(baselGroupID);
  console.log(`🏷️  LOCAL Basel Group ID: ${baselGroupID}`);

  // PRESERVE EXACT PORTFOLIO LOADING from working implementation
  let finalContractPortfolio: any[] | string = portfolioPath;

  // Load portfolio configuration if provided
  if (portfolioPath && portfolioPath.endsWith(".json")) {
    try {
      const fs = await import("fs");
      const path = await import("path");
      const fullPath = path.resolve(portfolioPath);
      const configData = JSON.parse(fs.readFileSync(fullPath, "utf8"));

      console.log(
        `📊 LOCAL Portfolio ID: ${
          configData.portfolioMetadata?.portfolioId || "Unknown"
        }`,
      );
      console.log(
        `💰 LOCAL Total Notional: ${
          configData.portfolioMetadata?.totalNotional || "Unknown"
        }`,
      );
      console.log(`🔍 LOCAL HQLA Categories from Config:`);

      if (configData.contracts) {
        finalContractPortfolio = configData.contracts;
        configData.contracts.forEach((contract: any, index: number) => {
          console.log(
            `   LOCAL Contract ${
              contract.contractID || index
            }: HQLA Category = ${contract.hqlaCategory || "Not specified"}`,
          );
        });
        console.log(
          `✅ LOCAL Extracted ${configData.contracts.length} contracts from configuration`,
        );
      }
    } catch (error: any) {
      console.error(
        `❌ Failed to load portfolio from ${portfolioPath}:`,
        error.message,
      );
      console.log(`🔄 Using portfolio path as-is`);
    }
  }

  // PRESERVE EXACT LOGGING PATTERN from working implementation with LOCAL prefix
  console.log(`\n🏦 LOCAL Basel3 Basel Group ID: ${baselGroupID}`);
  console.log(`🏦 LOCAL Basel3 LCR Threshold: ${lcrThreshold}%`);
  console.log(`💰 LOCAL Basel3 NSFR Threshold: ${nsfrThreshold}%`);
  console.log(`🌐 LOCAL ACTUS API URL: ${actusUrl}`);
  console.log(`📁 LOCAL Portfolio Path: ${portfolioPath}`);

  // === GROUP STRUCTURE VERIFICATION (Following Network Pattern) ===
  console.log("\n🏗️  Starting LOCAL Basel Group Verification...");
  console.log(`📊 Basel Group ID: ${baselGroupID}`);

  try {
    // Execute using new organized LOCAL handler - SAME FUNCTIONALITY but faster
    const handler = new RiskBasel3LocalHandler();
    const result = await handler.executeBasel3RiskVerification({
      baselGroupID: baselGroupIDCircuit, // Pass as CircuitString
      lcrThreshold,
      nsfrThreshold,
      actusUrl,
      contractPortfolio: finalContractPortfolio,
    });

    // PRESERVE EXACT OUTPUT HANDLING from working implementation with LOCAL prefix
    if (result.success) {
      console.log(
        "\n🎉 LOCAL Basel3 Risk verification completed successfully!",
      );

      // === GROUP VERIFICATION SUMMARY (Following Network Pattern) ===
      console.log(`\n🏗️  LOCAL Basel Group Verification Summary:`);
      console.log(`   📊 Basel Group ID: ${baselGroupID}`);
      console.log(`   ✅ Group Structure: Enabled`);
      console.log(`   🏠 LOCAL DEVELOPMENT BENEFITS:`);
      console.log("      ⚡ Faster execution (no network delays)");
      console.log("      🔧 Instant blockchain setup");
      console.log("      📊 Immediate feedback for testing");
    } else {
      console.log("\n❌ LOCAL Basel3 Risk verification failed");
      process.exit(1);
    }
  } catch (error) {
    console.error("💥 LOCAL Error during verification:", error);
    process.exit(1);
  }
}

// PRESERVE EXACT CLI EXECUTION PATTERN from working code
main().catch((err) => {
  console.error("❌ LOCAL Error:", err);
  process.exit(1);
});
