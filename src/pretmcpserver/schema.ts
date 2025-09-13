import { z } from 'zod';

// Your original contract data
const contractData = {
   contracts: [
      {
         contractType: "ANN",
         contractID: "ann01",
         contractRole: "RPA",
         contractDealDate: "2012-12-28T00:00:00",
         initialExchangeDate: "2013-01-01T00:00:00",
         statusDate: "2012-12-30T00:00:00",
         notionalPrincipal: "5000",
         cycleAnchorDateOfPrincipalRedemption: "2013-02-01T00:00:00",
         nextPrincipalRedemptionPayment: "434.866594118346",
         dayCountConvention: "A365",
         nominalInterestRate: "0.08",
         currency: "USD",
         cycleOfPrincipalRedemption: "P1ML0",
         maturityDate: "2014-01-01T00:00:00",
         rateMultiplier: "1.0",
         rateSpread: "0.0",
         fixingDays: "P0D",
         cycleAnchorDateOfInterestPayment: "2013-02-01T00:00:00",
         cycleOfInterestPayment: "P1ML0"
      }
   ],
   riskFactors: []
};

interface ContractData {
   contracts: Array<{
      contractType: string;
      contractID: string;
      contractRole: string;
      contractDealDate: string;
      initialExchangeDate: string;
      statusDate: string;
      notionalPrincipal: string;
      cycleAnchorDateOfPrincipalRedemption: string;
      nextPrincipalRedemptionPayment: string;
      dayCountConvention: string;
      nominalInterestRate: string;
      currency: string;
      cycleOfPrincipalRedemption: string;
      maturityDate: string;
      rateMultiplier: string;
      rateSpread: string;
      fixingDays: string;
      cycleAnchorDateOfInterestPayment: string;
      cycleOfInterestPayment: string;
   }>;
   riskFactors: any[];
}


// Your target Zod schema type (for reference)
const inputSchemaType = z.object({
   type: z.literal("object"),
   properties: z.object({}).passthrough().optional(),
}).passthrough();

/**
 * Transforms a contract into the expected properties format for Zod schema
 */
function transformContractToZodProperties(contract: Record<string, any>): Record<string, { type: string }> {
   const properties: Record<string, { type: string }> = {};

   // Convert each contract field to the format { type: "string" }
   for (const [key, value] of Object.entries(contract)) {
      // Determine the type based on the value
      let type = "string";
      if (typeof value === 'number') type = "number";
      if (typeof value === 'boolean') type = "boolean";

      properties[key] = { type };
   }

   return properties;
}

/**
 * Creates a Zod schema compatible object from contract data
 */
function createZodSchemaObject(_contractData: typeof contractData) {
   if (_contractData.contracts.length === 0) {
      // Return an empty schema if no contracts
      return {
         type: "object" as const,
         properties: {}
      };
   }

   // Use the first contract to create the schema
   const properties = transformContractToZodProperties(_contractData.contracts[0]);

   return {
      type: "object" as const,
      properties: {
         contracts: [{
            ...properties
         }],
         riskFactor: { type: "array" }
      }
   };
}

// Transform the contract data into the format needed for your Zod schema
const transformedSchema = createZodSchemaObject(contractData);

// This is how you would use it with your schema
const validateWithYourSchema = () => {
   try {
      // This is how you would validate against your specific schema
      const result = inputSchemaType.parse(transformedSchema);
      console.log("Validation successful!");
      return result;
   } catch (error) {
      console.error("Validation failed:", error);
      throw error;
   }
};

// Example: Building a Zod schema from the transformed structure
function buildZodSchemaFromTransformed(transformed: typeof transformedSchema) {
   const schemaProperties: Record<string, z.ZodTypeAny> = {};

   // Create proper Zod validators for each property
   for (const [key, value] of Object.entries(transformed.properties || {})) {
      switch (value.type) {
         case 'string':
            schemaProperties[key] = z.string();
            break;
         case 'number':
            schemaProperties[key] = z.number();
            break;
         case 'boolean':
            schemaProperties[key] = z.boolean();
            break;
         default:
            schemaProperties[key] = z.any();
      }
   }

   return z.object(schemaProperties);
}

// Create a usable contract Zod schema
const contractSchema = buildZodSchemaFromTransformed(transformedSchema);

// Use the schema to validate a contract
try {
   const validatedContract = contractSchema.parse(contractData.contracts[0]);
   console.log("Contract validated successfully!");
} catch (error) {
   console.error("Contract validation failed:", error);
}

// Export the transformed schema and functions
export {
   transformedSchema,
   createZodSchemaObject,
   buildZodSchemaFromTransformed,
   contractSchema
};