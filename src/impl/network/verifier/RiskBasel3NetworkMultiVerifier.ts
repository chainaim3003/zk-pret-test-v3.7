/**
 * CLI Entry Point for Basel3 Risk Network Verification
 * ENHANCED WITH GROUP STRUCTURE (Following StableCoin Pattern)
 *
 * Uses new organized RiskBasel3NetworkHandler with proper group tracking
 */

import { CircuitString } from "o1js";
import { RiskBasel3NetworkHandler } from "../handler/RiskBasel3NetworkHandler.js";

async function main() {
  console.log("🚀 Basel3 Risk Network Verification (Group Structure Enabled)");

  // === GROUP STRUCTURE PATTERN (Following StableCoin) ===
  const args = process.argv.slice(2);
    
    // Extract parameters following StableCoin pattern
    const basel3GroupID = args[0];
    const lcrThreshold = parseFloat(args[1]) || 80;
    const nsfrThreshold = parseFloat(args[2]) || 100;
    const actusUrl = args[3] || 'http://localhost:8083/eventsBatch';
    const portfolioPath = args[4];
    const executionMode = args[5] || 'ultra_strict';
    const jurisdictionCLI = args[6];

    // === VALIDATION (Following StableCoin Pattern) ===
    if (!basel3GroupID) {
        console.error('❌ Error: Basel3 Group ID is required (first argument)');
        console.log('Usage: node RiskBasel3NetworkMultiVerifier.js <BASEL3_GROUP_ID> <lcrThreshold> <nsfrThreshold> <actusUrl> <portfolioPath> <executionMode> <jurisdiction>');
        console.log('Example: node RiskBasel3NetworkMultiVerifier.js BASEL3_GROUP_001 80 100 http://localhost:8083/eventsBatch ./portfolio.json ultra_strict US');
        process.exit(1);
    }

    if (!jurisdictionCLI || !['US', 'EU'].includes(jurisdictionCLI.toUpperCase())) {
        console.error('❌ Error: Invalid jurisdiction. Must be US or EU.');
        process.exit(1);
    }

  // Convert Basel3 Group ID to CircuitString
  const basel3GroupIDCircuit = CircuitString.fromString(basel3GroupID);
  console.log(`🏷️  Basel3 Group ID: ${basel3GroupID}`);

  // PRESERVE EXACT PORTFOLIO LOADING
  let finalContractPortfolio: any[] | string | undefined = portfolioPath;

  if (portfolioPath && portfolioPath.endsWith('.json')) {
    try {
      const fs = await import("fs");
      const path = await import("path");
      const fullPath = path.resolve(portfolioPath);
      const rawData = fs.readFileSync(fullPath, "utf8");
      const configData = JSON.parse(rawData);

      // Handle both direct contracts array and config wrapper (like StableCoin)
      if (Array.isArray(configData.contracts)) {
        finalContractPortfolio = configData.contracts;
      } else if (Array.isArray(configData)) {
        finalContractPortfolio = configData;
      } else if (configData.contracts) {
        // Handle nested contracts
        finalContractPortfolio = configData.contracts;
      }

      console.log(`📁 Loaded portfolio from ${portfolioPath}`);
    } catch (error: any) {
      console.error(
        `❌ Failed to load portfolio from ${portfolioPath}:`,
        error.message,
      );
      console.log(`🔄 Using path as-is or falling back (Handler will handle it)`);
    }
  }

  // PRESERVE EXACT LOGGING PATTERN
  console.log(`🏦 Basel3 LCR Threshold: ${lcrThreshold}%`);
  console.log(`💰 Basel3 NSFR Threshold: ${nsfrThreshold}%`);
  console.log(`🌐 ACTUS API URL: ${actusUrl}`);
  if (portfolioPath) {
    console.log(`📁 Portfolio Path: ${portfolioPath}`);
  }
  console.log(`🚀 Execution Mode: ${executionMode}`);
  console.log(`🏛️ Jurisdiction: ${jurisdictionCLI}`);
  
  try {
    // Execute using new organized handler
    const handler = new RiskBasel3NetworkHandler();
    const result = await handler.executeBasel3RiskVerification({
      basel3GroupID: basel3GroupIDCircuit,
      lcrThreshold,
      nsfrThreshold,
      actusUrl,
      contractPortfolio: finalContractPortfolio,
      jurisdictionOverride: jurisdictionCLI?.toUpperCase()
    });

    // PRESERVE EXACT OUTPUT HANDLING
    if (result.success) {
      console.log("\n🎉 Basel3 Risk verification completed successfully!");

      // === GROUP VERIFICATION SUMMARY ===
      console.log(`\n🏗️  Basel Group Verification Summary:`);
      console.log(`   📊 Basel Group ID: ${basel3GroupID}`);
      console.log(`   ✅ Group Structure: Enabled`);
    } else {
      console.log(
        "\n🔴 Basel3 Risk verification failed or non-compliant",
      );
      process.exit(1);
    }
  } catch (error) {
    console.error("💥 Error during verification:", error);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});
