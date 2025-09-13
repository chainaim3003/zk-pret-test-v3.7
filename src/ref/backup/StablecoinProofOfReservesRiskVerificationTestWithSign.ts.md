import { Field, Mina, PrivateKey, AccountUpdate, CircuitString, Poseidon, Signature } from 'o1js';
import { loadAndProcessJsonData } from '../../core/map_basel3.js';
import { LiquidityRatioZkprogram, ACTUSData } from '../../zk-programs/with-sign/StablecoinProofOfReservesRiskZKProgramWithSign.js';
import { LiquidityRatioVerifierSmartContract } from '../../contracts/with-sign/StablecoinProofOfReservesRiskVerifierSmartContract.js';
import axios from 'axios';
import * as fs from 'fs/promises';

import { getPrivateKeyFor } from '../../core/OracleRegistry.js';

async function main() {
   /*const Local = Mina.LocalBlockchain({ proofsEnabled: true });

  //Mina.setActiveInstance(Local);
   const localInstance = await Local; // Await the promise before using it
   Mina.setActiveInstance(localInstance);
   const deployer = (await Local).testAccounts[0].key;
   const deployerPublicKey = deployer.toPublicKey();*/

   const useProof = false;
   const userLiquidityThreshold_LCR = parseFloat(process.argv[2]);
   const url = process.argv[3];
   const Local = await Mina.LocalBlockchain({ proofsEnabled: useProof });
   Mina.setActiveInstance(Local);

   const deployerAccount = Local.testAccounts[0];
   const deployerKey = deployerAccount.key;
   const senderAccount = Local.testAccounts[1];
   const senderKey = senderAccount.key;

   /*const deployerKeypair = PrivateKey.random();
   const deployer = deployerKeypair;*/
   //const deployer = localInstance.testAccounts[0].keypair.privateKey; // If keypair exists

   // Compile artifacts
   console.log('Compiling...');

   await LiquidityRatioZkprogram.compile();
   const { verificationKey } = await LiquidityRatioVerifierSmartContract.compile();

   console.log("verification key is successful");
   // Deploy contract
   const zkAppKey = PrivateKey.random();
   const zkAppAddress = zkAppKey.toPublicKey();


   /*await Mina.transaction(deployerKeypair, async () => {
     await Mina.fundAccount({ address: zkAppAddress, initialBalance: 10 });
   }).send();*/
   console.log("ZKAppAddress is successful");
   //const zkApp = new HashVerifier(zkAppAddress);

   const zkApp = new LiquidityRatioVerifierSmartContract(zkAppAddress);

   console.log("zkApp is successful");

   /*await Mina.transaction(deployerPublicKey, async () => {
     AccountUpdate.fundNewAccount(deployerPublicKey); // Ensure deployer has funds
     AccountUpdate.fundNewAccount(zkAppAddress); // Fund the zkApp address
 
   }).send();*/

   console.log("Mina transaction is successful");

   const deployTxn = await Mina.transaction(
      deployerAccount,
      async () => {
         AccountUpdate.fundNewAccount(deployerAccount);
         await zkApp.deploy({ verificationKey });
         //zkApp.storedHash.set(Field(42));

      }
   );
   console.log("deployTxn is successful");
   await deployTxn.sign([deployerKey, zkAppKey]).send();
   console.log("deployTxn signed successfully");
   // URL of the server
   //const url = 'http://localhost:8083/eventsBatch';
   //const url = 'http://98.84.165.146:8083/eventsBatch';
    

   // Data to send in the POST request
   //const datajson = await fs.readFile(process.argv[4], 'utf-8');
   //const data = JSON.parse(datajson);


   const data ={
  "contracts": [
    {
      "contractType": "PAM",
      "contractID": "pam01",
      "contractRole": "RPA",
      "contractDealDate": "2023-01-01T00:00:00",
      "initialExchangeDate": "2023-01-02T00:00:00",
      "statusDate": "2023-01-01T00:00:00",
      "notionalPrincipal": "10000",
      "maturityDate": "2024-01-01T00:00:00",
      "nominalInterestRate": "0.05",
      "currency": "USD",
      "dayCountConvention": "A365"
    },
    {
      "contractType": "ANN",
      "contractID": "ann01",
      "contractRole": "RPA",
      "contractDealDate": "2023-12-28T00:00:00",
      "initialExchangeDate": "2024-01-01T00:00:00",
      "statusDate": "2023-12-30T00:00:00",
      "notionalPrincipal": "5000",
      "cycleAnchorDateOfPrincipalRedemption": "2024-02-01T00:00:00",
      "nextPrincipalRedemptionPayment": "434.866594118346",
      "dayCountConvention": "A365",
      "nominalInterestRate": "0.08",
      "currency": "USD",
      "cycleOfPrincipalRedemption": "P1ML0",
      "maturityDate": "2025-01-01T00:00:00",
      "rateMultiplier": "1.0 ",
      "rateSpread": "0",
      "fixingDays": "P0D",
      "cycleAnchorDateOfInterestPayment": "2024-02-01T00:00:00",
      "cycleOfInterestPayment": "P1ML0"
    },
    {
      "contractType": "STK",
      "contractID": "stk01",
      "contractRole": "RPA",
      "contractDealDate": "2023-12-28T00:00:00",
      "statusDate": "2023-12-30T00:00:00",
      "notionalPrincipal": "1000",
      "currency": "USD",
      "purchaseDate": "2024-01-01T00:00:00",
      "priceAtPurchaseDate": "1100",
      "endOfMonthConvention": "EOM"
    },
    {
      "contractType": "PAM",
      "contractID": "pam02",
      "contractRole": "RPA",
      "contractDealDate": "2023-12-28T00:00:00",
      "initialExchangeDate": "2024-01-01T00:00:00",
      "statusDate": "2023-12-30T00:00:00",
      "notionalPrincipal": "3000",
      "maturityDate": "2025-01-01T00:00:00",
      "nominalInterestRate": "0.1",
      "currency": "USD",
      "dayCountConvention": "A360",
      "cycleAnchorDateOfInterestPayment": "2024-01-01T00:00:00",
      "cycleOfInterestPayment": "P2ML0",
      "endOfMonthConvention": "SD",
      "premiumDiscountAtIED": "-200",
      "rateMultiplier": "1.0 "
    }
  ],
  "riskFactors": []
};

   let jsondata: string | undefined;
   // Send POST request using axios
   await axios.post(url, data)
      .then(response => {
         console.log('Response Code:', response.status);
         console.log('Response Body:', response.data);

         jsondata = JSON.stringify(response.data, null, 2);
      })
      .catch(error => {
         console.error('Error:', error.response ? error.response.data : error.message);
      });

   if (!jsondata) {
      throw new Error('Failed to fetch JSON data');
   }
   //console.log(jsondata);

   console.log("Fetching compliance data...");
   // Call the function to process cash flow data
   const { inflow: cashInflow, outflow: cashOutflow, monthsCount, results: classifiedContracts }: { inflow: any[], outflow: any[], monthsCount: number, results: { [key: string]: { L1: number, L2A: number, L2B: number, NonHQLA: number } } } = loadAndProcessJsonData(jsondata);

   
   const cinflow = cashInflow.map(arr => arr.reduce((sum: any, num: any) => sum + num, 0));
   const coutflow = cashOutflow.map(arr => arr.reduce((sum: any, num: any) => sum + num, 0));
   
   const totalHQLA_L1 = Object.values(classifiedContracts).map(month => month.L1);
   const totalHQLA_L2A = Object.values(classifiedContracts).map(month => month.L2A);
   const totalHQLA_L2B = Object.values(classifiedContracts).map(month => month.L2B);
   const totalNonHQLA = Object.values(classifiedContracts).map(month => month.NonHQLA);

   const riskScenario1Data = {
      companyID: 'Financier 10001',
      companyName: 'Financier 1 - CashFlows RiskFree',
      mcaID: '201',
      businessPANID: '1001',
      riskEvaluated: Field(1),
      cashInflow: cinflow,
      cashOutflow: coutflow,
      newInvoiceAmount: 5000,
      newInvoiceEvaluationMonth: 11,
      liquidityThreshold: Math.round(10),
      liquidityThreshold_lcr: Math.round(userLiquidityThreshold_LCR),
      inflowLength: monthsCount,  // Pass inflowLength
   };

   const risk1Data = new ACTUSData({
      // Scenario Identifiers
      scenarioID: CircuitString.fromString(riskScenario1Data.companyID),
      scenarioName: CircuitString.fromString(riskScenario1Data.companyName),
      scenarioName_str: "scenario_1",
      riskEvaluated: Field(riskScenario1Data.riskEvaluated),

      // Cash Flow Data
      cashInflows: riskScenario1Data.cashInflow.flat(),  // Flatten to match expected format
      cashOutflows: riskScenario1Data.cashOutflow.flat(), // Flatten to match expected format
      inflowLength: riskScenario1Data.cashInflow.flat().length,
      outflowLength: riskScenario1Data.cashOutflow.flat().length,

      //  LCR Calculation Data
      newInvoiceAmount: riskScenario1Data.newInvoiceAmount,
      newInvoiceEvaluationMonth: riskScenario1Data.newInvoiceEvaluationMonth,
      liquidityThreshold: riskScenario1Data.liquidityThreshold,
      liquidityThreshold_LCR: riskScenario1Data.liquidityThreshold_lcr,

      // Classified Contracts (For HQLA Computation)
      classifiedContracts: Object.entries(classifiedContracts).map(([id, { L1, L2A, L2B, NonHQLA }]) => ({
         id,
         type: 'someType', 
         hqlaCategory: 'someCategory',
         inflowTotal: L1 + L2A + L2B, 
         outflowTotal: NonHQLA 
      })),

      // Aggregated HQLA Values for LCR Calculation
      totalHQLA_L1: totalHQLA_L1,
      totalHQLA_L2A: totalHQLA_L2A,
      totalHQLA_L2B: totalHQLA_L2B,
      totalNonHQLA: totalNonHQLA,
   });
   //===============================================================================================================

   const risk1DataHash = Poseidon.hash(ACTUSData.toFields(risk1Data));
   const registryPrivateKey = getPrivateKeyFor('RISK');
   const oracleSignature = Signature.create(registryPrivateKey, [risk1DataHash]);

   //===============================================================================================================

   const proof = await LiquidityRatioZkprogram.proveCompliance(Field(0), risk1Data, oracleSignature)

   console.log("Before verification, Initial value of num:", zkApp.risk.get().toJSON());
   console.log("Before verification, Initial value of reservesProved:", zkApp.reservesProved.get().toString());
   // Verify proof
   const txn = await Mina.transaction(
      senderAccount,
      async () => {
         await zkApp.verifyComplianceWithProof(proof);
      }
   );
   // await txn.sign([zkAppKey]).send();

   const proof1 = await txn.prove();
   //await txn.prove();


   console.log("Proof generated successfully");
   console.log(senderAccount.toJSON());
   console.log(senderKey.toJSON(), senderKey.toPublicKey());
   console.log("Generated Proof:", proof1.toPretty());
   await txn.sign([senderKey]).send();
   console.log("After verification, Final value of num:", zkApp.risk.get().toJSON());
   console.log("After verification, Final value of reservesProved:", zkApp.reservesProved.get().toString());
   console.log('✅ Proof verified successfully!');
}

main().catch(err => {
   console.error('Error:', err);
});

//export { ComplianceData };