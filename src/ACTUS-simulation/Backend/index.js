const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const multer = require("multer"); // For file uploads
const mongoose = require("mongoose"); // For MongoDB connection
const Ajv = require("ajv"); // For JSON schema validation
const addFormats = require("ajv-formats"); // For date-time format validation
require('dotenv').config(); // Load environment variables

const app = express();
const port = process.env.PORT || 8081;

// Middleware
app.use(bodyParser.json());
app.use(cors());

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error("Error: MONGODB_URI is not defined in .env file");
    process.exit(1);
}

mongoose.connect(MONGODB_URI)
    .then(() => console.log("Connected to MongoDB successfully!"))
    .catch((err) => console.error("Error connecting to MongoDB:", err));

// Define a simple schema for storing JSON data
const jsonDataSchema = new mongoose.Schema({
    data: Object
});

const JsonData = mongoose.model('JsonData', jsonDataSchema);

// Multer configuration for file uploads
const storage = multer.memoryStorage(); // Store the file in memory
const upload = multer({ storage: storage });

// JSON Schema for validation
const schema = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "title": "Actus Simulation Input Schema",
    "description": "Schema for validating Actus simulation input, supporting multiple contract types.",
    "type": "object",
    "properties": {
        "contracts": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "contractType": {
                        "type": "string",
                        "enum": ["ANN", "PAM", "CSH", "FXOUT", "COM"]
                    },
                    "contractID": { "type": "string" },
                    "contractRole": { "type": "string", "enum": ["RPA", "RPL"] },
                    "contractDealDate": { "type": "string", "format": "date-time" },
                    "initialExchangeDate": { "type": "string", "format": "date-time" },
                    "statusDate": { "type": "string", "format": "date-time" },
                    "notionalPrincipal": { "type": "number" },
                    "cycleAnchorDateOfPrincipalRedemption": { "type": "string", "format": "date-time" },
                    "nextPrincipalRedemptionPayment": { "type": "string", "format": "date-time" },
                    "dayCountConvention": { "type": "string" },
                    "nominalInterestRate": { "type": "number" },
                    "currency": { "type": "string" },
                    "cycleOfPrincipalRedemption": { "type": "string" },
                    "maturityDate": { "type": "string", "format": "date-time" },
                    "rateMultiplier": { "type": "number" },
                    "rateSpread": { "type": "number" },
                    "fixingDays": { "type": "integer" },
                    "cycleAnchorDateOfInterestPayment": { "type": "string", "format": "date-time" },
                    "cycleOfInterestPayment": { "type": "string" },
                    "endOfMonthConvention": { "type": "string" },
                    "premiumDiscountAtIED": { "type": "number" },
                    "currency2": { "type": "string" },
                    "notionalPrincipal2": { "type": "number" },
                    "calendar": { "type": "string" },
                    "deliverySettlement": { "type": "string" },
                    "settlementPeriod": { "type": "string" },
                    "purchaseDate": { "type": "string", "format": "date-time" },
                    "priceAtPurchaseDate": { "type": "number" },
                    "quantity": { "type": "integer" },
                    "unit": { "type": "string" },
                    "terminationDate": { "type": "string", "format": "date-time" },
                    "priceAtTerminationDate": { "type": "number" },
                    "identifier": { "type": "string" },
                    "terms": {
                        "type": "object",
                        "properties": {
                            "contractType": {
                                "type": "string",
                                "enum": ["CSH"]
                            },
                            "statusDate": {
                                "type": "string",
                                "format": "date-time"
                            },
                            "contractRole": {
                                "type": "string",
                                "enum": ["RPL", "RPA"]
                            },
                            "contractID": {
                                "type": "string"
                            },
                            "currency": {
                                "type": "string"
                            },
                            "notionalPrincipal": {
                                "type": "number"
                            }
                        },
                        "required": [
                            "contractType",
                            "statusDate",
                            "contractRole",
                            "contractID",
                            "currency",
                            "notionalPrincipal"
                        ]
                    },
                    "to": {
                        "type": "string"
                    },
                    "dataObserved": {
                        "type": "object"
                    },
                    "eventsObserved": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "time": {
                                    "type": "string",
                                    "format": "date-time"
                                },
                                "type": {
                                    "type": "string"
                                },
                                "value": {
                                    "type": "integer"
                                }
                            },
                            "required": [
                                "time",
                                "type",
                                "value"
                            ]
                        }
                    }
                },
                "required": [
                    "contractType",
                    "contractID",
                    "contractRole",
                    "statusDate"
                ],
                "additionalProperties": true
            }
        },
        "riskFactors": {
            "type": "array",
            "items": {}
        },
        "to": {
            "type": "string"
        },
        "dataObserved": {
            "type": "object"
        },
        "eventsObserved": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "time": {
                        "type": "string",
                        "format": "date-time"
                    },
                    "type": {
                        "type": "string"
                    },
                    "value": {
                        "type": "integer"
                    }
                },
                "required": [
                    "time",
                    "type",
                    "value"
                ]
            }
        }
    },
    "required": [
        "contracts"
    ],
    "additionalProperties": true
};

// Initialize Ajv
const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

// Compile the schema
const validate = ajv.compile(schema);

// API Endpoints

app.post("/eventsBatch", (req, res) => {
    try {
        const data = req.body;

        // Validate the input JSON
        const valid = validate(data);

        if (!valid) {
            console.error("Validation errors:", validate.errors); // Log validation errors
            return res.status(400).json({
                message: "Invalid JSON format.",
                errors: validate.errors
            });
        }

        // Save the validated data to MongoDB
        const jsonData = new JsonData({ data: data });
        jsonData.save((err) => {
            if (err) {
                console.error("Error saving data:", err);
                res.status(500).json({ message: "Failed to save event data.", error: err.message });
            } else {
                console.log("Event data saved successfully!");
                res.status(200).json(data);  // Send back the received data
            }
        });
    } catch (error) {
        console.error("Error in /eventsBatch:", error);
        res.status(500).json({ message: "Failed to save event data.", error: error.message });
    }
});

app.post("/upload", upload.single("file"), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded." });
        }

        const fileContent = req.file.buffer.toString("utf-8"); // Assuming UTF-8 encoding

        // Split the file content into individual JSON objects
        const jsonObjects = fileContent.split('\n').filter(line => line.trim() !== '').map(line => {
            try {
                return JSON.parse(line);
            } catch (error) {
                console.error("Error parsing JSON:", error);
                return null; // Skip invalid JSON objects
            }
        }).filter(obj => obj !== null);  // Remove any null objects

        if (jsonObjects.length === 0) {
            return res.status(400).json({ message: "No valid JSON objects found in the file." });
        }

        // Validate each JSON object
        const validObjects = [];
        const invalidObjects = [];
        let allValidationErrors = []; // Collect errors from all invalid objects

        jsonObjects.forEach(jsonData => {
            const valid = validate(jsonData);
            if (valid) {
                validObjects.push(jsonData);
            } else {
                invalidObjects.push(jsonData);
                allValidationErrors = allValidationErrors.concat(validate.errors); // Collect all errors
                console.error("Validation errors:", validate.errors);  // Log validation errors for each invalid object
            }
        });

        if (invalidObjects.length > 0) {
            console.error("Validation errors:", allValidationErrors); // Log all validation errors
            return res.status(400).json({
                message: "One or more JSON objects in the file are invalid.",
                errors: allValidationErrors // Send all validation errors
            });
        }

        // Save the validated data to MongoDB
        Promise.all(validObjects.map(jsonData => {
            const dataToSave = new JsonData({ data: jsonData });
            return dataToSave.save();
        }))
            .then(() => {
                console.log("File uploaded and all data saved successfully!");
                res.status(200).json({ message: "File uploaded and all data saved successfully!" });
            })
            .catch(err => {
                console.error("Error saving data:", err);
                res.status(500).json({ message: "Failed to save uploaded data.", error: err.message });
            });
    } catch (error) {
        console.error("Error in /upload:", error);
        res.status(500).json({ message: "Failed to upload file.", error: error.message });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});
