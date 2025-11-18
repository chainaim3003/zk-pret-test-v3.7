import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {fetchGLEIFCompanyDataWithFullDetails} from "../utils/domain/compliance/GLEIF/GLEIFBasicUtils.js";
import { fetchEXIMCompanyData } from "../utils/domain/compliance/EXIM/EXIMBasicUtils.js";
import {fetchCorporateRegistrationData} from "../utils/domain/compliance/CorpReg/CorporateRegistrationBasicUtils.js";
import { getGLEIFLocalMultiVerifierUtils } from "../impl/local/handler/GLEIFLocalHandler.js";
import {getBusinessStdIntegrityLocalVerifier} from "../utils/domain/process/BusinessStdIntegrityBasicUtils.js"

export function registerPRETTools(server: McpServer) {  
//server tool gleif api call
  server.tool(
    "get-GLEIF-data",
    "get GLEIF data for a company name and depending on the environment it will call different apis example TESTNET vs MAINNET vs LOCAL",
    {
      companyName: z.string().describe("Company name for GLEIF search (e.g., 'SREE PALANI ANDAVAR AGROS PRIVATE LIMITED')"),
      //typeOfNet: z.string().optional().describe("Network name (e.g., 'LOCAL OR TESTNET OR MAINNET')")
    },
    async ({ companyName }: { companyName: string }) => {
      try {
        //console.log(`Resolving GLEIF data for company: ${companyName} on network: ${typeOfNet ?? 'TESTNET'}`);
        const response = await fetchGLEIFCompanyDataWithFullDetails(companyName);
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              companyName: companyName,
              response: response,
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Error resolving company name: ${error instanceof Error ? error.message : String(error)}`
          }],
          isError: true
        };
      }
    }
  );


  //server tool EXIM api call 
  server.tool(
    "get-EXIM-data",
    "get EXIM data takes company name and type of net TESTNET,MAINNET,etc and get EXIM compliance data for different regions",
    {
      companyName: z.string().describe("Company name for EXIM search (e.g., 'zenova_dgft')"),
      //typeOfNet: z.string().optional().describe("Network name (e.g., 'LOCAL OR TESTNET OR MAINNET')")
    },
    async ({ companyName }: { companyName: string }) => {
      try {
        //console.log(`Resolving GLEIF data for company: ${companyName} on network: ${typeOfNet ?? 'TESTNET'}`);
        const response = await fetchEXIMCompanyData(companyName);
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              companyName: companyName,
              response: response,
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Error resolving company name: ${error instanceof Error ? error.message : String(error)}`
          }],
          isError: true
        };
      }
    }
  );
  server.tool(
    "get-CorporateRegistration-data",
    "get GLEIF data for a company name and depending on the environment it will call different apis example TESTNET vs MAINNET vs LOCAL",
    {
      cin: z.string().describe("CIN for MCA search (e.g., 'U01112TZ2022PTC039493')"),
      //typeOfNet: z.string().optional().describe("Network name (e.g., 'LOCAL OR TESTNET OR MAINNET')")
    },
    async ({ cin }: { cin: string }) => {
      try {
        //console.log(`Resolving GLEIF data for company: ${cin} on network: ${typeOfNet ?? 'TESTNET'}`);
        const response = await fetchCorporateRegistrationData(cin);
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              cin: cin,
              response: response,
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Error resolving CIN: ${error instanceof Error ? error.message : String(error)}`
          }],
          isError: true
        };
      }
    }
  );

server.tool(
  "run-GLEIF-local-multiverifier",
  "Run the full GLEIF local multi-verifier pipeline (ZK, Merkle, compliance, etc.) for a company name. Returns detailed compliance and proof results.",
  {
    companyName: z.string().describe("Company name for GLEIF local multi-verifier (e.g., 'SREE PALANI ANDAVAR AGROS PRIVATE LIMITED')")
  },
  async ({ companyName }: { companyName: string }) => {
    try {
      const result = await getGLEIFLocalMultiVerifierUtils([companyName]);
      return {
        content: [{
          type: "text",
          text: JSON.stringify(result, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Error running GLEIF local multi-verifier: ${error instanceof Error ? error.message : String(error)}`
        }],
        isError: true
      };
    }
  }
);

// server.tool(
//     "get-BOL-data-valid",
//     "get BOL data for a company name and depending on the environment it will call different apis example TESTNET vs MAINNET vs LOCAL",
//     {
//       documentType: z.string().describe("Type BOL (e.g., BOL)"),
//       documentFile: z.string().describe("Document file path (e.g., ./src/data/scf/BILLOFLADING/BOL-VALID-1.json)"),
//       //typeOfNet: z.string().optional().describe("Network name (e.g., 'LOCAL OR TESTNET OR MAINNET')")
//     },
//     async ({ documentType,documentFile }: { documentType: string,documentFile:string }) => {
//       try {
//         //console.log(`Resolving GLEIF data for company: ${companyName} on network: ${typeOfNet ?? 'TESTNET'}`);
//         const response = await getBusinessStdIntegrityLocalVerifier(documentType,documentFile);
//         return {
//           content: [{
//             type: "text",
//             text: JSON.stringify({
//               documentType: documentType,
//               response: response,
//             }, null, 2)
//           }]
//         };
//       } catch (error) {
//         return {
//           content: [{
//             type: "text",
//             text: `Error resolving company name: ${error instanceof Error ? error.message : String(error)}`
//           }],
//           isError: true
//         };
//       }
//     }
//   );


server.tool(
  "get-BOL-data-valid",
  "get BOL data for a company name and depending on the environment it will call different apis example TESTNET vs MAINNET vs LOCAL",
  {
    documentType: z.string().describe("Type BOL (e.g., BOL)"),
    documentContent: z.string().describe("JSON document content as string (e.g., stringified JSON of BOL data)"),
    //typeOfNet: z.string().optional().describe("Network name (e.g., 'LOCAL OR TESTNET OR MAINNET')")
  },
  async ({ documentType, documentContent }: { documentType: string, documentContent: string }) => {
    try {
      // Parse the JSON content to validate it's valid JSON
      const parsedDocument = JSON.parse(documentContent);
      
      // Pass the parsed document to your function instead of file path
      const response = await getBusinessStdIntegrityLocalVerifier(documentType, parsedDocument);
      
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            documentType: documentType,
            response: response,
          }, null, 2)
        }]
      };
    } catch (error) {
      if (error instanceof SyntaxError) {
        return {
          content: [{
            type: "text",
            text: `Error parsing JSON document: ${error.message}`
          }],
          isError: true
        };
      }
      
      return {
        content: [{
          type: "text",
          text: `Error processing document: ${error instanceof Error ? error.message : String(error)}`
        }],
        isError: true
      };
    }
  }
);

}
