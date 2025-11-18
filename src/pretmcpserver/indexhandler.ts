import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
   CallToolRequestSchema,
   ErrorCode,
   ListToolsRequestSchema,
   McpError,
} from "@modelcontextprotocol/sdk/types.js";
import axios from "axios";

const server = new Server({
   name: "actus-server",
   version: "1.0.0",
}, {
   capabilities: {
      tools: {}
   }
});

server.setRequestHandler(ListToolsRequestSchema, async () => {
   return {
      tools: [{
         name: "get_actus_data",
         description: "Get actus data",
         inputSchema: {
            type: "object",
            properties: {
               contracts: {
                  type: "array",
                  items: {
                     type: "object",
                     properties: {
                        contractType: { type: "string" },
                        contractID: { type: "string" },
                        contractRole: { type: "string" },
                        contractDealDate: { type: "string" },
                        initialExchangeDate: { type: "string" },
                        statusDate: { type: "string" },
                        notionalPrincipal: { type: "string" },
                        cycleAnchorDateOfPrincipalRedemption: { type: "string" },
                        nextPrincipalRedemptionPayment: { type: "string" },
                        dayCountConvention: { type: "string" },
                        nominalInterestRate: { type: "string" },
                        currency: { type: "string" },
                        cycleOfPrincipalRedemption: { type: "string" },
                        maturityDate: { type: "string" },
                        rateMultiplier: { type: "string" },
                        rateSpread: { type: "string" },
                        fixingDays: { type: "string" },
                        cycleAnchorDateOfInterestPayment: { type: "string" },
                        cycleOfInterestPayment: { type: "string" }
                     }
                  }
               },
               riskFactors: {
                  type: "array",
                  items: {
                     type: "object",
                     properties: {
                        marketObjectCode: { type: "string" },
                        base: { type: "number" },
                        data: {
                           type: "array",
                           items: {
                              type: "object",
                              properties: {
                                 time: { type: "string" },
                                 value: { type: "number" }
                              }
                           }
                        }
                     }
                  }
               }
            },
            required: ["contracts"]
         }
      }
      ]
   };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
   if (request.params.name === "get_actus_data") {
      const args = request.params.arguments ?? {};
      const a = args;

      const res = await axios.post("http://98.84.165.146:8083/eventsBatch",
         a,  // Send the data directly - axios will stringify it
         {
            headers: {
               "Content-Type": "application/json",
            }
         }
      ).catch((err) => {
         console.log("Error: ", err);
         throw new McpError(ErrorCode.ConnectionClosed, "Connection closed");
      });
      const data = res.data;
      console.log(data);
      return { toolResult: data };

   }
   if (request.params.name === "get_GLEIF_data") {
      const args = request.params.arguments ?? {};
      const a = args;

      const res = await axios.get(`https://api.gleif.org/api/v1/lei-records?filter[entity.legalName]=${a}`,)
      .catch((err) => {
         console.log("Error: ", err);
         throw new McpError(ErrorCode.ConnectionClosed, "Connection closed");
      });
      const data = res.data;
      console.log(data);
      return { toolResult: data };

   }
   throw new McpError(ErrorCode.MethodNotFound, "Tool not found");
});

const transport = new StdioServerTransport();
await server.connect(transport);