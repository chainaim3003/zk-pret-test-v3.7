import React, { useState, useEffect } from "react";
import axios from "axios";
import { useDropzone } from "react-dropzone";
import Papa from "papaparse"; // Import Papa
import moment from "moment";
import "./App.css"; // Keep this import
import { FcGoogle } from 'react-icons/fc'; // Import Google icon
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyB3yBfddVb9ELMeJ8ybtlZZAe1dz1vk_x4",
    authDomain: "login-80000.firebaseapp.com",
    projectId: "login-80000",
    storageBucket: "login-80000.firebasestorage.app",
    messagingSenderId: "243478891841",
    appId: "1:243478891841:web:62968808af7c3ae26925c0",
};

// Initialize Firebase (if not already initialized)
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const db = firebase.firestore();

const Input = ({ label, name, value, onChange, error }) => (
    <div className="input-wrapper">
        <label>{label}</label>
        <input type="text" name={name} value={value} onChange={onChange} className={error ? "is-invalid" : ""} />
        {error && <div className="invalid-feedback">{error}</div>}
    </div>
);

const RiskProver = () => {
    const [file, setFile] = useState(null);
    const [message, setMessage] = useState("");
    const [showUpload, setShowUpload] = useState(false);
    const [showJson, setShowJson] = useState(false);
    const [jsonInput, setJsonInput] = useState("");
    const [parsedJson, setParsedJson] = useState(null);
    const [error, setError] = useState("");
    const [showForm, setShowForm] = useState(false);
    const [artifactType, setArtifactType] = useState("artifact1");
    const [action, setAction] = useState("create");
    const [apiSource, setApiSource] = useState("");
    const [showFileUpload, setShowFileUpload] = useState(true);

    const [type, setType] = useState("");
    const [schema, setSchema] = useState("");
    const [version, setVersion] = useState("");

    const [formData, setFormData] = useState({
        contractId: "",
        message: "",
        status: "",
        type: "",
        time: "",
        payoff: "",
        currency: "",
        nominalValue: "",
        nominalRate: "",
        nominalAccrued: "",
        riskFactorID: "",
        marketObjectCode: "",
        base: "",
        data: [],
    });

    const [generatedJson, setGeneratedJson] = useState(null);
    const [fieldErrors, setFieldErrors] = useState({});

    // Authentication State
    const [user, setUser] = useState(null); // Track the currently logged-in user
    const [isSignUp, setIsSignUp] = useState(false); // Toggle between sign-up and sign-in
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    useEffect(() => {
        const unsubscribe = firebase.auth().onAuthStateChanged((user) => {
            setUser(user);
        });
        return () => unsubscribe(); // Cleanup subscription
    }, []);

    useEffect(() => {
        const baseURL = "http://localhost:8083"; // CHANGED TO 8083

        let newApiSource = baseURL;
        if (artifactType === "artifact1") {
            newApiSource += "/eventsBatch";
        } else if (artifactType === "artifact2") {
            newApiSource += "/addReferenceIndex";
        }
        setApiSource(newApiSource);
    }, [artifactType]);
    
    const handleSignUp = async (e) => {
        e.preventDefault();
        try {
            await firebase.auth().createUserWithEmailAndPassword(email, password);
            window.alert('Sign-up successful!');
            setError('');
            setEmail('');
            setPassword('');
    
            // Add user data to Firestore (optional, for profile info)
            const user = firebase.auth().currentUser;
            if (user) {
                await db.collection('users').doc(user.uid).set({
                    email: email,
                });
            }
        } catch (error) {
            setError(error.message);
            window.alert(error.message);
        }
    };
    
    const handleSignIn = async (e) => {
        e.preventDefault();
        try {
            await firebase.auth().signInWithEmailAndPassword(email, password);
            window.alert('Sign-in successful!');
            setError('');
            setEmail('');
            setPassword('');
        } catch (error) {
            setError(error.message);
            window.alert(error.message);
        }
    };
    
    const handleSignInWithGoogle = async () => {
        const provider = new firebase.auth.GoogleAuthProvider();
        try {
            await firebase.auth().signInWithPopup(provider);
            window.alert('Sign-in with Google successful!');
            setError('');
        } catch (error) {
            setError(error.message);
            window.alert(error.message);
        }
    };
    
    const handleSignOut = async () => {
        try {
            await firebase.auth().signOut();
            window.alert('Sign-out successful!');
            setError('');
        } catch (error) {
            setError(error.message);
            window.alert(error.message);
        }
    };    

    const renderAuthForm = () => {
        if (user) {
            return (
                <div>
                </div>
            );
        }
        return (
            <div className="auth-container">
            <form onSubmit={isSignUp ? handleSignUp : handleSignIn} className="auth-form">
                <h2 className="auth-title">{isSignUp ? "Sign Up" : "Sign In"}</h2><br /><br />
                {error && <p className="auth-error">{error}</p>}
                <label>Email: </label><input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="auth-input"
                /><br /><br /><br /><br />
                <label>Password: </label><input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="auth-input"
                /><br /><br /><br /><br />
                <button type="submit" className="auth-button primary">
                    {isSignUp ? "Sign Up" : "Sign In"}
                </button>&nbsp;&nbsp;&nbsp;
                <button type="button" onClick={() => setIsSignUp(!isSignUp)} className="auth-button switch">
                    Switch to {isSignUp ? "Sign In" : "Sign Up"}
                </button><br /><br /><br /><br />
                <button type="button" onClick={handleSignInWithGoogle} className="auth-button google">
                <span className="googleIcon"><FcGoogle style={{ color: '#4285F4', fontSize: '1.5rem' }} /></span></button> 
            </form>
        </div>
        );
    };

    const onDrop = (acceptedFiles) => {
        const selectedFile = acceptedFiles[0];
        if (!selectedFile) return;

        setFile(selectedFile);
        const transformCsvToJson = (csvData) => {
            // Define the mapping between CSV column names and ACTUS parameter names for each contract type
            const columnMapping = {
                PAM: {
                    contractType: "contractType",
                    contractID: "contractID",
                    contractRole: "contractRole",
                    contractDealDate: "contractDealDate",
                    initialExchangeDate: "initialExchangeDate",
                    statusDate: "statusDate",
                    notionalPrincipal: "notionalPrincipal",
                    maturityDate: "maturityDate",
                    nominalInterestRate: "nominalInterestRate",
                    currency: "currency",
                    dayCountConvention: "dayCountConvention",
                    cycleAnchorDateOfInterestPayment: "cycleAnchorDateOfInterestPayment",
                    cycleOfInterestPayment: "cycleOfInterestPayment",
                    endOfMonthConvention: "endOfMonthConvention",
                    premiumDiscountAtIED: "premiumDiscountAtIED",
                    rateMultiplier: "rateMultiplier",
                },
                ANN: {
                    contractType: "contractType",
                    contractID: "contractID",
                    contractRole: "contractRole",
                    contractDealDate: "contractDealDate",
                    initialExchangeDate: "initialExchangeDate",
                    statusDate: "statusDate",
                    notionalPrincipal: "notionalPrincipal",
                    cycleAnchorDateOfPrincipalRedemption: "cycleAnchorDateOfPrincipalRedemption",
                    nextPrincipalRedemptionPayment: "nextPrincipalRedemptionPayment",
                    dayCountConvention: "dayCountConvention",
                    nominalInterestRate: "nominalInterestRate",
                    currency: "currency",
                    cycleOfPrincipalRedemption: "cycleOfPrincipalRedemption",
                    maturityDate: "maturityDate",
                    rateMultiplier: "rateMultiplier",
                    rateSpread: "rateSpread",
                    fixingDays: "fixingDays",
                    cycleAnchorDateOfInterestPayment: "cycleAnchorDateOfInterestPayment",
                    cycleOfInterestPayment: "cycleOfInterestPayment",
                },
                STK: {
                    contractType: "contractType",
                    contractID: "contractID",
                    contractRole: "contractRole",
                    contractDealDate: "contractDealDate",
                    statusDate: "statusDate",
                    notionalPrincipal: "notionalPrincipal",
                    currency: "currency",
                    purchaseDate: "purchaseDate",
                    priceAtPurchaseDate: "priceAtPurchaseDate", // Special handling for this field
                    endOfMonthConvention: "endOfMonthConvention",
                },
                // Add more contract types as needed
            };
        
            const contracts = csvData.filter(row => {
                // Check if the row is empty or contains only empty strings
                return Object.values(row).some(value => value !== "");
            }).map((row) => {
                const contractType = row.contractType;
                const contract = {};
        
                if (columnMapping[contractType]) {
                    for (const csvColumn in columnMapping[contractType]) {
                        if (columnMapping[contractType].hasOwnProperty(csvColumn)) {
                            const actusParameter = columnMapping[contractType][csvColumn];
                            let value = row[actusParameter];
        
                            // Special handling for priceAtPurchaseDate to ensure it's treated as a string or number, not a date
                            if (actusParameter === 'priceAtPurchaseDate' && value !== undefined) {
                                value = value.toString(); // Ensure it's treated as a string
                            }
        
                            if (
                                actusParameter.toLowerCase().includes("date") &&
                                actusParameter !== 'priceAtPurchaseDate' && // Exclude priceAtPurchaseDate from date processing
                                value !== undefined
                            ) {
                                const date = moment(value);
                                if (date.isValid()) {
                                    value = date.format("YYYY-MM-DDTHH:mm:ss");
                                } else {
                                    value = undefined; // Remove invalid dates
                                }
                            }
        
                            if (typeof value === "string" && !isNaN(value)) {
                                value = value; // Keep as string
                            }
        
                            if (value !== undefined && value !== null && value !== "") {
                                contract[actusParameter] = value;
                            }
                        }
                    }
                }
        
                return contract;
            }).filter(contract => contract.contractID !== null && contract.contractID !== undefined); // Filter out contracts with null contractID
        
            const jsonData = {
                contracts: contracts,
                riskFactors: [],
            };
        
            return jsonData;
        };                                
        
        if (selectedFile.type === "text/csv" || selectedFile.name.endsWith(".csv")) {
            Papa.parse(selectedFile, {
                header: true, //  If your CSV has a header row
                complete: (results) => {
                    // `results.data` is an array of objects, where each object
                    // represents a row from the CSV.
                    const jsonData = transformCsvToJson(results.data);
                    setJsonInput(JSON.stringify(jsonData, null, 2)); // Set JSON input field
                    setParsedJson(JSON.stringify(jsonData, null, 2));
                    setMessage("CSV file parsed and converted to JSON.");
                    setError("");
                    setShowJson(true); // Optionally show the JSON input area
                    setShowFileUpload(false);
                },
                error: (error) => {
                    console.error("CSV parsing error:", error);
                    setError("Error parsing CSV: " + error.message);
                    setMessage("Error parsing CSV: " + error.message);
                },
            });
        } else {
            setFile(selectedFile); // Keep existing functionality for Excel/JSON uploads
            setMessage("File selected.");
        }
    };

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: ".xlsx, application/json, text/csv", // Accepts Excel, JSON, and CSV
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleAction = async (event) => {
        event.preventDefault();
        setFieldErrors({}); // Clear previous field errors
        setError(""); // Clear general errors
        setMessage(""); // Clear previous messages

        try {
            let response;
            let payload = formData;

            if (
                artifactType === "artifact1" &&
                (action === "create" || action === "update")
            ) {
                payload = {
                    contractId: formData.contractId || "",
                    status: formData.status || "",
                    message: formData.message || "",
                    events: (formData.data || []).map((point) => ({
                        type: formData.type || "",
                        time: formData.time || "",
                        payoff: parseFloat(formData.payoff) || 0,
                        currency: formData.currency || "",
                        nominalValue: parseFloat(formData.nominalValue) || 0,
                        nominalRate: parseFloat(formData.nominalRate) || 0,
                        nominalAccrued: parseFloat(formData.nominalAccrued) || 0,
                    })),
                };

                // Check data types here
                if (isNaN(payload.events[0].payoff)) {
                    setError("Payoff must be a number.");
                    return;
                }
                if (isNaN(payload.events[0].nominalValue)) {
                    setError("Nominal Value must be a number.");
                    return;
                }
                if (isNaN(payload.events[0].nominalRate)) {
                    setError("Nominal Rate must be a number.");
                    return;
                }
                if (isNaN(payload.events[0].nominalAccrued)) {
                    setError("Nominal Accrued must be a number.");
                    return;
                }
            } else if (artifactType === "artifact2") {
                payload = {
                    riskFactorID: formData.riskFactorID || "",
                    marketObjectCode: formData.marketObjectCode || "",
                    base: parseFloat(formData.base) || 0,
                    data: (formData.data || []).map((point) => ({
                        time: point.time || "",
                        value: parseFloat(point.value) || 0,
                    })),
                };

                // Check data types here
                if (isNaN(payload.base)) {
                    setError("Base must be a number.");
                    return;
                }
                if (payload.data.length > 0 && isNaN(payload.data[0].value)) {
                    setError("Value must be a number.");
                    return;
                }
            }

            if (action === "fetch") {
                response = await axios.get(apiSource);
                setMessage(`âœ… Data fetched: ${JSON.stringify(response.data)}`);
            } else if (action === "delete") {
                response = await axios.delete(apiSource, {
                    data: { contractId: formData.contractId || "" },
                });
                setMessage(response.data.message || "âœ… Data deleted successfully!");
            } else {
                response = await axios.post(apiSource, payload, {
                    headers: { "Content-Type": "application/json" },
                });
                setMessage("Data saved successfully!");
            }
            console.log("Response:", response);

        } catch (error) {
            console.error("Error saving data:", error);

            if (error.response && error.response.data && error.response.data.errors) {
                // Backend validation errors
                const backendErrors = error.response.data.errors;
                console.log("Backend Errors:", backendErrors);

                // Process and display field-specific errors
                const newFieldErrors = {};
                backendErrors.forEach(err => {
                    const fieldName = err.dataPath.replace(/^\.|\\[\'\"]/g, '').replace(/^root\./, '');  // Extract field name and remove 'root.'
                    newFieldErrors[fieldName] = err.message;
                });
                setFieldErrors(newFieldErrors);
                setError("Please correct the highlighted fields."); // General error message

                // Display detailed error messages
                const errorMessages = backendErrors.map(err => `${err.dataPath}: ${err.message}`).join("\n");
                setMessage(`Validation errors:\n${errorMessages}`);

            } else if (error.response && error.response.data && error.response.data.message) {
                // Other backend errors
                setError(error.response.data.message);
                setMessage(error.response.data.message);
            }
            else {
                // Other errors
                setError("An error occurred while saving data.");
                setMessage("An error occurred while saving data.");
            }
        }
    };

    const handleFileUpload = async () => {
        if (!file) {
            setMessage("Please select a file.");
            return;
        }

        const formData = new FormData();
        formData.append("file", file);
        setError("");  // Clear previous errors
        setMessage(""); // Clear previous messages
        try {
            const response = await axios.post(
                "http://localhost:8083/upload",
                formData,
                {
                    headers: { "Content-Type": "multipart/form-data" },
                }
            );
            setMessage(response.data.message || "File uploaded successfully!");
        } catch (error) {
            console.error("File upload error:", error);
            if (error.response && error.response.data && error.response.data.errors) {
                // Backend validation errors from file upload
                const backendErrors = error.response.data.errors;
                console.log("File upload backend Errors:", backendErrors);

                // Display detailed error messages in the message area
                const errorMessages = backendErrors.map(err => `${err.dataPath}: ${err.message}`).join("\n");
                setMessage(`File upload failed with validation errors:\n${errorMessages}`);
                setError("File upload failed due to validation errors."); // General error message

            } else if (error.response && error.response.data && error.response.data.message) {
                setMessage(`File upload failed: ${error.response.data.message}`);
                setError(`File upload failed: ${error.response.data.message}`);
            }
            else {
                setMessage(`File upload failed: ${error.message}`);
                setError(`File upload failed: ${error.message}`);
            }
        }
    };

    const handleDataChange = (e, index, field) => {
        const updatedData = [...formData.data];
        updatedData[index] = { ...updatedData[index], [field]: e.target.value };
        setFormData({ ...formData, data: updatedData });
    };

    const addDataPoint = () => {
        setFormData({
            ...formData,
            data: [...formData.data, { time: "", value: "" }],
        });
    };

    const removeDataPoint = (index) => {
        const updatedData = formData.data.filter((_, i) => i !== index);
        setFormData({ ...formData, data: updatedData });
    };

    const handleJsonChange = (e) => {
        const newJsonInput = e.target.value;
        setJsonInput(newJsonInput);
        setError(""); // Clear previous errors
        setMessage(""); // Clear previous messages
        try {
            const parsed = JSON.parse(newJsonInput); // Parse here
            setParsedJson(newJsonInput); // Store the original JSON string
        } catch (err) {
            setError("Invalid JSON: " + err.message);
            setParsedJson(null);
            setMessage("Invalid JSON: " + err.message);
        }
    };

    const handleSaveParsedJson = async (event) => {
        event.preventDefault();
        if (!parsedJson) {
            setMessage("No valid JSON to save.");
            return;
        }
        setError(""); // Clear previous errors
        setMessage(""); // Clear previous messages

        try {
            console.log("Parsed JSON String:", parsedJson);

            const response = await axios.post(
                "http://localhost:8083/eventsBatch",
                JSON.parse(parsedJson), // Parse the JSON string before sending
                {
                    headers: { "Content-Type": "application/json" },
                }
            );

            setMessage("Data saved to eventsBatch successfully!");
        } catch (error) {
            // Improved error logging
            console.error("Error saving JSON data:", error);

            if (error.response && error.response.data && error.response.data.errors) {
                // Backend validation errors
                const backendErrors = error.response.data.errors;
                console.log("Backend Errors:", backendErrors);

                // Display detailed error messages
                const errorMessages = backendErrors.map(err => `${err.dataPath}: ${err.message}`).join("\n");
                setMessage(`Validation errors:\n${errorMessages}`);
                setError("Validation errors occurred.  See details below.");
            } else if (error.response && error.response.data && error.response.data.message) {
                setMessage(`Error saving JSON: ${error.response.data.message}`);
                setError(`Error saving JSON: ${error.response.data.message}`);
            }
            else {
                setMessage(`Error saving JSON data: ${error.message}`);
                setError(`Error saving JSON data: ${error.message}`);
            }
        }
    };

    const handleProcessJson = async () => {
        if (!jsonInput) {
            setMessage("No valid JSON to process.");
            return;
        }
        setError(""); // Clear previous errors
        setMessage(""); // Clear previous messages

        try {
            const response = await fetch("http://localhost:8083/eventsBatch", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: jsonInput,
            });

            if (!response.ok) {
                const errorMessage = `HTTP error! status: ${response.status}`;
                throw new Error(errorMessage);
            }

            const data = await response.json();
            setGeneratedJson(JSON.stringify(data, null, 2));
            setMessage("JSON processed and formatted!");
        } catch (error) {
            console.error("Error processing JSON:", error);
            setMessage(`Error processing JSON: ${error.message}`);
            setError(`Error processing JSON: ${error.message}`);
            setGeneratedJson("Error: " + error.message); // Display error in the output
        }
    };

    return (
        <div className="container">
            {/* Authentication Form */}
            {renderAuthForm()}
            {user && (
                <>
            <header className="header">
                <div className="header-left">
                    <h2 className="logo">CHAINAIM</h2>
                    <p>Welcome, {user.email.replace("@gmail.com", "")}</p>
                </div>
                <div className="auth-buttons">
                    <button className="connect-btn">Connect Wallet</button>
                    <button className="connect-btn" onClick={handleSignOut}>Sign Out</button>
                </div>
            </header>
            <main className="main-content">
                <h1 className="title">Risk ACTUS Simulation</h1>
                <form className="form-container" onSubmit={handleAction}>
                    {/* Left side of the form */}
                    <div className="form-left">
                        <div className="dropdown-section1">
                            <div className="dropdown-item">
                                <label>Artifact Type</label>
                                <select
                                    className="dropdown"
                                    value={artifactType}
                                    onChange={(e) => setArtifactType(e.target.value)}
                                >
                                    <option value="artifact1">Simulation</option>
                                    <option value="artifact2">RiskFactor</option>
                                </select>
                            </div>
                            <div className="dropdown-item">
                                <label>Action</label>
                                <select
                                    className="dropdown"
                                    value={action}
                                    onChange={(e) => setAction(e.target.value)}
                                >
                                    <option value="create">Create</option>
                                    <option value="update">Update</option>
                                    <option value="delete">Delete</option>
                                    <option value="fetch">Fetch</option>
                                </select>
                            </div>
                        </div>

                        <div className="dropdown-section2">
                            <div className="dropdown-item">
                                <label>Type</label>
                                <select
                                    className="dropdown"
                                    value={type}
                                    onChange={(e) => setType(e.target.value)}
                                >
                                    <option value="t1">PAN</option>
                                    <option value="t2">ANN</option>
                                    <option value="t3">Others</option>
                                    <option value="t4">Portfolio</option>
                                </select>
                            </div>
                            <div className="dropdown-item">
                                <label>Schema</label>
                                <select
                                    className="dropdown"
                                    value={schema}
                                    onChange={(e) => setSchema(e.target.value)}
                                >
                                    <option value="s1">Schema 1</option>
                                    <option value="s2">Schema 2</option>
                                </select>
                            </div>
                            <div className="dropdown-item">
                                <label>Version</label>
                                <select
                                    className="dropdown"
                                    value={version}
                                    onChange={(e) => setVersion(e.target.value)}
                                >
                                    <option value="v1">Version 1</option>
                                    <option value="v2">Version 2</option>
                                    <option value="v3">Version 3</option>
                                    <option value="v4">Version 4</option>
                                </select>
                            </div>
                        </div>

                        <div className="input-section">
                            <label>API Source</label>
                            <input
                                type="text"
                                placeholder="API Source"
                                value={apiSource}
                                readOnly
                            />
                        </div>

                        <div className="button-section">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowUpload(true);
                                    setShowJson(false);
                                    setShowForm(false);
                                }}
                            >
                                Upload
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowUpload(false);
                                    setShowJson(true);
                                    setShowForm(false);
                                }}
                            >
                                Input JSON
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowUpload(false);
                                    setShowJson(false);
                                    setShowForm(true);
                                }}
                            >
                                Enter Simulation Input
                            </button>
                        </div>
                    </div>

                    {/* Right side of the form (conditional sections) */}
                    <div className="form-right">
                        {showUpload && (
                            <div className="upload-section">
                                <div
                                    {...getRootProps()}
                                    className={`dropzone ${isDragActive ? "active" : ""}`}
                                >
                                    <input {...getInputProps()} />
                                    {isDragActive ? (
                                        <p>Drop the files here ...</p>
                                    ) : (
                                        <p>
                                            Drag 'n' drop some files here, or click to select files
                                        </p>
                                    )}
                                </div>
                                {file && (
                                    <aside>
                                        <h4>Files</h4>
                                        <ul>
                                            <li>
                                                {file.name} - {file.size} bytes
                                            </li>
                                        </ul>
                                    </aside>
                                )}
                                <button type="button" onClick={handleFileUpload}>
                                    Upload File
                                </button>
                            </div>
                        )}

                        {showJson && (
                            <div className="json-section">
                                <textarea
                                    placeholder="Enter JSON data"
                                    value={jsonInput}
                                    onChange={handleJsonChange}
                                    className="json-input"
                                />
                                {error && <div className="error">{error}</div>}
                                <div className="json-buttons">
                                    <button type="button" onClick={handleSaveParsedJson}>
                                        Save JSON
                                    </button>
                                    <button type="button" onClick={handleProcessJson}>
                                        Process JSON
                                    </button>
                                </div>
                                {generatedJson && (
                                    <div className="generated-json">
                                        <h3>Processed JSON:</h3>
                                        <pre>{generatedJson}</pre>
                                    </div>
                                )}
                            </div>
                        )}

                        {showForm && (
                            <div className="form-section">
                                {artifactType === "artifact1" && (
                                    <>
                                        <Input
                                            label="Contract ID"
                                            name="contractId"
                                            value={formData.contractId}
                                            onChange={handleChange}
                                            error={fieldErrors["contractId"]}
                                        />
                                        <Input
                                            label="Status"
                                            name="status"
                                            value={formData.status}
                                            onChange={handleChange}
                                            error={fieldErrors["status"]}
                                        />
                                        <Input
                                            label="Message"
                                            name="message"
                                            value={formData.message}
                                            onChange={handleChange}
                                            error={fieldErrors["message"]}
                                        />
                                        <Input
                                            label="Type"
                                            name="type"
                                            value={formData.type}
                                            onChange={handleChange}

                                        />
                                        <Input
                                            label="Time"
                                            name="time"
                                            value={formData.time}
                                            onChange={handleChange}

                                        />
                                        <Input
                                            label="Payoff"
                                            name="payoff"
                                            value={formData.payoff}
                                            onChange={handleChange}

                                        />
                                        <Input
                                            label="Currency"
                                            name="currency"
                                            value={formData.currency}
                                            onChange={handleChange}

                                        />
                                        <Input
                                            label="Nominal Value"
                                            name="nominalValue"
                                            value={formData.nominalValue}
                                            onChange={handleChange}

                                        />
                                        <Input
                                            label="Nominal Rate"
                                            name="nominalRate"
                                            value={formData.nominalRate}
                                            onChange={handleChange}

                                        />
                                        <Input
                                            label="Nominal Accrued"
                                            name="nominalAccrued"
                                            value={formData.nominalAccrued}
                                            onChange={handleChange}

                                        />
                                    </>
                                )}

                                {artifactType === "artifact2" && (
                                    <>
                                        <Input
                                            label="Risk Factor ID"
                                            name="riskFactorID"
                                            value={formData.riskFactorID}
                                            onChange={handleChange}
                                        />
                                        <Input
                                            label="Market Object Code"
                                            name="marketObjectCode"
                                            value={formData.marketObjectCode}
                                            onChange={handleChange}
                                        />
                                        <Input
                                            label="Base"
                                            name="base"
                                            value={formData.base}
                                            onChange={handleChange}
                                        />
                                    </>
                                )}

                                {/* Add data points dynamically */}
                                {formData.data.map((point, index) => (
                                    <div key={index} className="data-point">
                                        <Input
                                            label={`Time ${index + 1}`}
                                            name="time"
                                            value={point.time}
                                            onChange={(e) => handleDataChange(e, index, "time")}
                                        />
                                        <Input
                                            label={`Value ${index + 1}`}
                                            name="value"
                                            value={point.value}
                                            onChange={(e) => handleDataChange(e, index, "value")}
                                        />
                                        <button type="button" onClick={() => removeDataPoint(index)}>
                                            Remove
                                        </button>
                                    </div>
                                ))}
                                <button type="button" onClick={addDataPoint}>
                                    Add Data Point
                                </button>
                            </div>
                        )}
                    </div>
                </form>
                {(error || message) && (
                    <div className="feedback-message">
                        {error && <div className="error-message">{error}</div>}
                        {message && <div className="success-message">{message}</div>}
                    </div>
                )}
                <div class="button-container"><button type="submit" className="submit-button">
                                Submit Action
                </button></div>
            </main>
            </>
            )}
        </div>
    );
};

export default RiskProver;
