import dotenv from 'dotenv';
dotenv.config();

import path from 'path';
import { existsSync } from 'fs';
import { spawn } from 'child_process';
import { logger } from '../utils/logger.js';

export interface ToolExecutionResult {
    success: boolean;
    result: any;
    executionTime: string;
}

export interface ZKExecutorConfig {
    stdioPath: string;
    stdioBuildPaths: string[]; // CHANGED: Support multiple paths
    timeout: number;
    executionMode: 'spawn';
}

/**
 * Environment-aware script mapping based on network type
 * Supports local, testnet, and mainnet environments
 */
const ENVIRONMENT_SCRIPT_MAP: Record<string, Record<string, string>> = {
    'LOCAL': {
        'get-GLEIF-verification-with-sign': 'GLEIFLocalMultiVerifier.js',
        'get-Corporate-Registration-verification-with-sign': 'CorporateRegistrationLocalMultiVerifier.js',
        'get-EXIM-verification-with-sign': 'EXIMLocalMultiVerifier.js',
        'get-Composed-Compliance-verification-with-sign': 'ComposedRecursiveOptim3LevelVerificationTestLocalWithSign.js',
        'get-ComposedProof-verification': 'ComposedRecursiveOptim3LevelVerificationTestLocalWithSign.js',
        'get-BSDI-compliance-verification': 'BusinessStdIntegrityLocalMultiVerifier.js',
        'get-BPI-compliance-verification': 'BusinessProcessLocalMultiVerifier.js',
        'get-RiskLiquidityACTUS-Verifier-Test_adv_zk': 'RiskLiquidityAdvancedOptimMerkleVerificationTestLocalWithSign.js',
        'get-RiskLiquidityACTUS-Verifier-Test_Basel3_Withsign': 'RiskLiquidityBasel3OptimMerkleVerificationTestLocalWithSign.js',
        'get-RiskLiquidityBasel3Optim-Merkle-verification-with-sign': 'RiskBasel3LocalMultiVerifier.js',
        'get-RiskLiquidityAdvancedOptimMerkle-verification-with-sign': 'RiskAdvancedLocalMultiVerifier.js',
        'get-StablecoinProofOfReservesRisk-verification-with-sign': 'RiskStableCoinLocalMultiVerifier.js',
        'execute-composed-proof-full-kyc': 'ComposedRecursiveOptim3LevelVerificationTestLocalWithSign.js',
        'execute-composed-proof-financial-risk': 'ComposedRecursiveOptim3LevelVerificationTestLocalWithSign.js',
        'execute-composed-proof-business-integrity': 'ComposedRecursiveOptim3LevelVerificationTestLocalWithSign.js',
        'execute-composed-proof-comprehensive': 'ComposedRecursiveOptim3LevelVerificationTestLocalWithSign.js'
    },
    'TESTNET': {
        'get-GLEIF-verification-with-sign': 'GLEIFNetworkMultiVerifier.js',
        'get-Corporate-Registration-verification-with-sign': 'CorporateRegistrationNetworkMultiVerifier.js',
        'get-EXIM-verification-with-sign': 'EXIMNetworkMultiVerifier.js',
        'get-Composed-Compliance-verification-with-sign': 'ComposedRecursiveOptim3LevelVerificationTestTestnetWithSign.js',
        'get-ComposedProof-verification': 'ComposedRecursiveOptim3LevelVerificationTestTestnetWithSign.js',
        'get-BSDI-compliance-verification': 'BusinessStdIntegrityTestnetMultiVerifier.js',
        'get-BPI-compliance-verification': 'BusinessProcessNetworkMultiVerifier.js',
        'get-RiskLiquidityACTUS-Verifier-Test_adv_zk': 'RiskLiquidityAdvancedOptimMerkleVerificationTestTestnetWithSign.js',
        'get-RiskLiquidityACTUS-Verifier-Test_Basel3_Withsign': 'RiskLiquidityBasel3OptimMerkleVerificationTestTestnetWithSign.js',
        'get-RiskLiquidityBasel3Optim-Merkle-verification-with-sign': 'RiskBasel3TestnetMultiVerifier.js',
        'get-RiskLiquidityAdvancedOptimMerkle-verification-with-sign': 'RiskAdvancedTestnetMultiVerifier.js',
        'get-StablecoinProofOfReservesRisk-verification-with-sign': 'RiskStableCoinTestnetMultiVerifier.js',
        'execute-composed-proof-full-kyc': 'ComposedRecursiveOptim3LevelVerificationTestTestnetWithSign.js',
        'execute-composed-proof-financial-risk': 'ComposedRecursiveOptim3LevelVerificationTestTestnetWithSign.js',
        'execute-composed-proof-business-integrity': 'ComposedRecursiveOptim3LevelVerificationTestTestnetWithSign.js',
        'execute-composed-proof-comprehensive': 'ComposedRecursiveOptim3LevelVerificationTestTestnetWithSign.js'
    },
    'MAINNET': {
        'get-GLEIF-verification-with-sign': 'GLEIFMainnetMultiVerifier.js',
        'get-Corporate-Registration-verification-with-sign': 'CorporateRegistrationMainnetMultiVerifier.js',
        'get-EXIM-verification-with-sign': 'EXIMMainnetMultiVerifier.js',
        'get-Composed-Compliance-verification-with-sign': 'ComposedRecursiveOptim3LevelVerificationTestMainnetWithSign.js',
        'get-ComposedProof-verification': 'ComposedRecursiveOptim3LevelVerificationTestMainnetWithSign.js',
        'get-BSDI-compliance-verification': 'BusinessStdIntegrityMainnetMultiVerifier.js',
        'get-BPI-compliance-verification': 'BusinessProcessMainnetMultiVerifier.js',
        'get-RiskLiquidityACTUS-Verifier-Test_adv_zk': 'RiskLiquidityAdvancedOptimMerkleVerificationTestMainnetWithSign.js',
        'get-RiskLiquidityACTUS-Verifier-Test_Basel3_Withsign': 'RiskLiquidityBasel3OptimMerkleVerificationTestMainnetWithSign.js',
        'get-RiskLiquidityBasel3Optim-Merkle-verification-with-sign': 'RiskBasel3MainnetMultiVerifier.js',
        'get-RiskLiquidityAdvancedOptimMerkle-verification-with-sign': 'RiskAdvancedMainnetMultiVerifier.js',
        'get-StablecoinProofOfReservesRisk-verification-with-sign': 'RiskStableCoinMainnetMultiVerifier.js',
        'execute-composed-proof-full-kyc': 'ComposedRecursiveOptim3LevelVerificationTestMainnetWithSign.js',
        'execute-composed-proof-financial-risk': 'ComposedRecursiveOptim3LevelVerificationTestMainnetWithSign.js',
        'execute-composed-proof-business-integrity': 'ComposedRecursiveOptim3LevelVerificationTestMainnetWithSign.js',
        'execute-composed-proof-comprehensive': 'ComposedRecursiveOptim3LevelVerificationTestMainnetWithSign.js'
    }
};

/**
 * ZK Tool Executor with Child Process Execution
 * ENHANCED: Supports multiple build paths and environment-aware script selection
 */
export class ZKToolExecutor {
    private config: ZKExecutorConfig;

    constructor() {
        console.log('=== ZK-TOOL EXECUTOR INITIALIZATION (MULTI-PATH MODE) ===');
        console.log('DEBUG: process.env.ZK_PRET_STDIO_PATH =', process.env.ZK_PRET_STDIO_PATH);

        // ENHANCED: Support multiple build paths
        this.config = {
            stdioPath: process.env.ZK_PRET_STDIO_PATH || process.cwd(),
            stdioBuildPaths: [
                './build/impl/local/handler',
                './build/impl/local/verifier',
                './build/impl/network/handler',
                './build/impl/network/verifier'
            ],
            timeout: parseInt(process.env.ZK_PRET_SERVER_TIMEOUT || '1800000'),
            executionMode: 'spawn'
        };

        console.log('DEBUG: Final stdioPath =', this.config.stdioPath);
        console.log('DEBUG: Final stdioBuildPaths =', this.config.stdioBuildPaths);
        console.log('DEBUG: Final timeout =', this.config.timeout);
        console.log('DEBUG: Final executionMode =', this.config.executionMode);
        console.log('=====================================');
    }

    /**
     * Determine the environment for script selection
     * Priority: BUILD_ENV > 'LOCAL' (default)
     * FIXED: Removed parameter-based override and fixed case handling
     */
    private determineEnvironment(parameters: any): string {
        console.log(`DEBUG: determineEnvironment called with:`, parameters);

        // Check BUILD_ENV environment variable (highest priority)
        const buildEnv = process.env.BUILD_ENV;
        console.log(`DEBUG: BUILD_ENV value: ${buildEnv}`);

        if (buildEnv) {
            const env = buildEnv.toUpperCase(); // FIXED: Convert to uppercase to match map keys
            console.log(`DEBUG: BUILD_ENV converted to: ${env}`);

            if (['LOCAL', 'TESTNET', 'MAINNET'].includes(env)) {
                console.log(`Environment determined from BUILD_ENV: ${env}`);
                return env;
            }
        }

        // Default to LOCAL
        console.log(`Environment defaulted to: LOCAL`);
        return 'LOCAL';
    }

    /**
     * Get the appropriate script file based on tool name and environment
     */
    private getScriptFileForEnvironment(toolName: string, environment: string): string | null {
        console.log(`DEBUG: getScriptFileForEnvironment called with tool: ${toolName}, env: ${environment}`);

        const envMap = ENVIRONMENT_SCRIPT_MAP[environment];
        if (!envMap) {
            console.log(`Unknown environment: ${environment}`);
            return null;
        }

        const scriptFile = envMap[toolName];
        if (!scriptFile) {
            console.log(`Tool ${toolName} not found in environment ${environment}`);
            return null;
        }

        console.log(`Script mapping: ${toolName} (${environment}) -> ${scriptFile}`);
        return scriptFile;
    }

    /**
     * ENHANCED: Find script file across multiple build paths
     */
    private findScriptPath(scriptFile: string): string | null {
        console.log(`Searching for script: ${scriptFile}`);

        for (const buildPath of this.config.stdioBuildPaths) {
            const fullPath = path.join(this.config.stdioPath, buildPath, scriptFile);
            console.log(`  Checking: ${fullPath}`);

            if (existsSync(fullPath)) {
                console.log(`  Found at: ${fullPath}`);
                return fullPath;
            } else {
                console.log(`  Not found at: ${fullPath}`);
            }
        }

        console.log(`Script not found in any build path: ${scriptFile}`);
        return null;
    }

    /**
     * Broadcast execution updates via WebSocket for progressive state monitoring
     */
    private broadcastExecutionUpdate(update: any) {
        try {
            // Access the global WebSocket server reference
            if ((global as any).wsServer) {
                const message = JSON.stringify({
                    type: 'execution_update',
                    ...update,
                    timestamp: new Date().toISOString(),
                    server: 'zk-pret-async-only-server'
                });

                (global as any).wsServer.clients.forEach((client: any) => {
                    if (client.readyState === 1) { // WebSocket.OPEN
                        client.send(message);
                    }
                });
            }
        } catch (error) {
            // Silently fail if WebSocket not available - don't break execution
            console.log('WebSocket broadcast failed (non-critical):', error);
        }
    }

    async initialize(): Promise<void> {
        try {
            // Add timeout to health check to prevent hanging
            const healthCheckPromise = this.healthCheck();
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Health check timeout after 10 seconds')), 10000);
            });

            await Promise.race([healthCheckPromise, timeoutPromise]);
            logger.info('ZK Tool Executor (Multi-Path Mode) initialized successfully');
        } catch (error) {
            logger.warn('ZK Tool Executor initialization failed', {
                error: error instanceof Error ? error.message : String(error),
                stdioPath: this.config.stdioPath
            });
            // Don't throw error - allow server to start even if health check fails
            console.log('Health check failed but continuing server startup...');
        }
    }

    async healthCheck(): Promise<{ connected: boolean; status?: any }> {
        try {
            console.log('=== ZK EXECUTOR HEALTH CHECK (MULTI-PATH MODE) ===');
            console.log('Checking path:', this.config.stdioPath);

            // Use synchronous file access to avoid hanging
            const fs = await import('fs');

            // Check main path synchronously
            if (!fs.existsSync(this.config.stdioPath)) {
                console.log('Main path does not exist');
                return { connected: false };
            }
            console.log('Main path exists');

            // ENHANCED: Check all build paths
            const buildPathsStatus = this.config.stdioBuildPaths.map(buildPath => {
                const fullPath = path.join(this.config.stdioPath, buildPath);
                const exists = fs.existsSync(fullPath);
                console.log(`${exists ? 'Build path exists' : 'Build path missing'}: ${fullPath}`);
                return { path: buildPath, exists, fullPath };
            });

            // Check for key compiled JavaScript files across all paths and environments
            const keyFiles = [
                'GLEIFLocalMultiVerifier.js',
                'GLEIFTestnetMultiVerifier.js',
                // 'GLEIFMainnetMultiVerifier.js',
                // 'EXIMLocalMultiVerifier.js',
                // 'CorporateRegistrationLocalMultiVerifier.js'
            ];

            console.log('Checking for compiled JavaScript files across all paths:');
            let foundCompiledFiles = 0;
            const fileLocations: Record<string, string> = {};

            for (const file of keyFiles) {
                const foundPath = this.findScriptPath(file);
                if (foundPath) {
                    foundCompiledFiles++;
                    fileLocations[file] = foundPath;
                    console.log(`Found: ${file} at ${foundPath}`);
                } else {
                    console.log(`Missing: ${file}`);
                }
            }

            console.log('=========================');
            console.log(`Found ${foundCompiledFiles}/${keyFiles.length} compiled files`);

            return {
                connected: foundCompiledFiles > 0,
                status: {
                    mode: 'multi-path-environment-aware-execution',
                    path: this.config.stdioPath,
                    buildPaths: buildPathsStatus,
                    compiledFilesFound: foundCompiledFiles,
                    totalCompiledFiles: keyFiles.length,
                    fileLocations,
                    supportedEnvironments: Object.keys(ENVIRONMENT_SCRIPT_MAP),
                    totalToolsSupported: Object.keys(ENVIRONMENT_SCRIPT_MAP.LOCAL).length
                }
            };
        } catch (error) {
            console.log('ZK Executor Health Check Failed:', error instanceof Error ? error.message : String(error));
            return { connected: false };
        }
    }

    getAvailableTools(): string[] {
        return [
            'get-GLEIF-verification-with-sign',
            'get-Corporate-Registration-verification-with-sign',
            'get-EXIM-verification-with-sign',
            'get-Composed-Compliance-verification-with-sign',
            'get-ComposedProof-verification',
            'get-BSDI-compliance-verification',
            'get-BPI-compliance-verification',
            'get-RiskLiquidityACTUS-Verifier-Test_adv_zk',
            'get-RiskLiquidityACTUS-Verifier-Test_Basel3_Withsign',
            'get-RiskLiquidityBasel3Optim-Merkle-verification-with-sign',
            'get-RiskLiquidityAdvancedOptimMerkle-verification-with-sign',
            'get-StablecoinProofOfReservesRisk-verification-with-sign',
            'execute-composed-proof-full-kyc',
            'execute-composed-proof-financial-risk',
            'execute-composed-proof-business-integrity',
            'execute-composed-proof-comprehensive'
        ];
    }

    /**
     * Map dataType to document type for BSDI tool
     */
    private mapDataTypeToDocType(dataType: string): string {
        const dataTypeLower = dataType.toLowerCase();

        if (dataTypeLower.includes('billoflading') || dataTypeLower.includes('bol')) {
            return 'BOL';
        }
        if (dataTypeLower.includes('airwaybill') || dataTypeLower.includes('awb')) {
            return 'AWB';
        }
        if (dataTypeLower.includes('invoice')) {
            return 'INVOICE';
        }

        // Default fallback
        return 'BOL';
    }

    /**
     * Prepare command line arguments for each tool
     * ENHANCED: Added support for Business Process Integrity (BPI) tool
     * FIXED: Proper BSDI parameter processing
     * FIXED: All Risk tool parameter processing
     */
    private prepareCommandLineArgs(toolName: string, parameters: any): string[] {
        console.log(`Preparing command line args for tool: ${toolName}`);
        console.log(`Parameters received:`, JSON.stringify(parameters, null, 2));

        switch (toolName) {
            case 'get-GLEIF-verification-with-sign':
                // Handle both single company and multiple companies
                let companies: string[] = [];

                if (parameters.companyNames && Array.isArray(parameters.companyNames)) {
                    companies = parameters.companyNames;
                } else if (parameters.companyName) {
                    companies = [parameters.companyName];
                }

                if (companies.length > 0) {
                    const companyArg = companies.join(',');
                    console.log(`GLEIF args prepared: [${companyArg}]`);
                    return [companyArg];
                }
                console.log(`GLEIF: No company name provided`);
                return [];

            case 'get-Corporate-Registration-verification-with-sign':
                const corpCompany = parameters.companyName;
                const corpArgs = corpCompany ? [corpCompany] : [];
                console.log(`Corporate Registration args prepared:`, corpArgs);
                return corpArgs;

            case 'get-EXIM-verification-with-sign':
                const eximCompany = parameters.companyName;
                const eximArgs = eximCompany ? [eximCompany] : [];
                console.log(`EXIM args prepared:`, eximArgs);
                return eximArgs;

            case 'get-RiskLiquidityBasel3Optim-Merkle-verification-with-sign':
                console.log(`Processing Basel3 Risk tool parameters...`);

                const { lcrThreshold, nsfrThreshold, actusUrl, configFilePath } = parameters;

                if (!lcrThreshold) {
                    console.error(`Basel3 Risk: Missing lcrThreshold parameter`);
                    return [];
                }

                if (!nsfrThreshold) {
                    console.error(`Basel3 Risk: Missing nsfrThreshold parameter`);
                    return [];
                }

                if (!actusUrl) {
                    console.error(`Basel3 Risk: Missing actusUrl parameter`);
                    return [];
                }

                console.log(`LCR Threshold: ${lcrThreshold}`);
                console.log(`NSFR Threshold: ${nsfrThreshold}`);
                console.log(`ACTUS URL: ${actusUrl}`);
                console.log(`Config File: ${configFilePath || 'default'}`);

                // Build arguments array: [lcrThreshold, nsfrThreshold, actusUrl, portfolioPath]
                const basel3Args = [
                    lcrThreshold.toString(),
                    nsfrThreshold.toString(),
                    actusUrl
                ];

                // Add config file path if provided (optional parameter)
                if (configFilePath) {
                    basel3Args.push(configFilePath);
                }

                console.log(`Basel3 Risk args prepared:`, basel3Args);
                return basel3Args;

            case 'get-RiskLiquidityAdvancedOptimMerkle-verification-with-sign':
                console.log(`Processing Advanced Risk tool parameters...`);

                const advLiquidityThreshold = parameters.liquidityThreshold;
                const advActusUrl = parameters.actusUrl;
                const advConfigFilePath = parameters.configFilePath;
                const advExecutionMode = parameters.executionMode;

                if (!advLiquidityThreshold && advLiquidityThreshold !== 0) {
                    console.error(`Advanced Risk: Missing liquidityThreshold parameter`);
                    return [];
                }

                if (!advActusUrl) {
                    console.error(`Advanced Risk: Missing actusUrl parameter`);
                    return [];
                }

                if (!advConfigFilePath) {
                    console.error(`Advanced Risk: Missing configFilePath parameter`);
                    return [];
                }

                console.log(`Liquidity Threshold: ${advLiquidityThreshold}`);
                console.log(`ACTUS URL: ${advActusUrl}`);
                console.log(`Config File: ${advConfigFilePath}`);
                console.log(`Execution Mode: ${advExecutionMode || 'default'}`);

                // Build arguments array: [liquidityThreshold, actusUrl, configFilePath, executionMode]
                const advancedArgs = [
                    advLiquidityThreshold.toString(),
                    advActusUrl,
                    advConfigFilePath
                ];

                // Add execution mode if provided
                if (advExecutionMode) {
                    advancedArgs.push(advExecutionMode);
                }

                console.log(`Advanced Risk args prepared:`, advancedArgs);
                return advancedArgs;

            case 'get-StablecoinProofOfReservesRisk-verification-with-sign':
                console.log(`Processing Stablecoin Risk tool parameters...`);

                const stableJurisdiction = parameters.jurisdiction;
                const stableSituation = parameters.situation;
                const stableLiquidityThreshold = parameters.liquidityThreshold;
                const stableExecutionMode = parameters.executionMode;
                const stableConfigFilePath = parameters.configFilePath;

                if (!stableJurisdiction) {
                    console.error(`Stablecoin Risk: Missing jurisdiction parameter`);
                    return [];
                }

                if (!stableSituation) {
                    console.error(`Stablecoin Risk: Missing situation parameter`);
                    return [];
                }

                if (!stableLiquidityThreshold && stableLiquidityThreshold !== 0) {
                    console.error(`Stablecoin Risk: Missing liquidityThreshold parameter`);
                    return [];
                }

                console.log(`Jurisdiction: ${stableJurisdiction}`);
                console.log(`Situation: ${stableSituation}`);
                console.log(`Liquidity Threshold: ${stableLiquidityThreshold}`);
                console.log(`Execution Mode: ${stableExecutionMode || 'default'}`);
                console.log(`Config File: ${stableConfigFilePath || 'constructed'}`);

                // Build arguments array: [liquidityThreshold, actusUrl, configFilePath, executionMode, jurisdiction]
                const stablecoinArgs = [
                    stableLiquidityThreshold.toString(),
                    'http://34.203.247.32:8083/eventsBatch', // Default ACTUS URL for stablecoin
                    stableConfigFilePath || `src/data/RISK/StableCoin/CONFIG/${stableJurisdiction}/${stableSituation}`
                ];

                // Add execution mode and jurisdiction if provided
                if (stableExecutionMode) {
                    stablecoinArgs.push(stableExecutionMode);
                }

                if (stableJurisdiction) {
                    stablecoinArgs.push(stableJurisdiction);
                }

                console.log(`Stablecoin Risk args prepared:`, stablecoinArgs);
                return stablecoinArgs;

            // ENHANCED: Business Process Integrity (BPI) tool support
            case 'get-BPI-compliance-verification':
                console.log(`Processing BPI tool parameters...`);
                const processType = parameters.processType;
                const expectedFilePath = parameters.expectedProcessFilePath;
                const actualFilePath = parameters.actualProcessFilePath;

                console.log(`Process Type: ${processType}`);
                console.log(`Expected File Path: ${expectedFilePath}`);
                console.log(`Actual File Path: ${actualFilePath}`);

                if (!processType) {
                    console.error(`BPI: Missing processType parameter`);
                    return [];
                }
                if (!expectedFilePath) {
                    console.error(`BPI: Missing expectedProcessFilePath parameter`);
                    return [];
                }
                if (!actualFilePath) {
                    console.error(`BPI: Missing actualProcessFilePath parameter`);
                    return [];
                }

                // FIX: BusinessProcessLocalMultiVerifier.js expects 4 arguments: [groupID, processType, expectedFile, actualFile]
                const bpiArgs: string[] = [processType, processType, expectedFilePath, actualFilePath];
                console.log(`BPI args prepared:`, bpiArgs);
                return bpiArgs;

            // FIXED: Composed Proof verification support
            case 'get-ComposedProof-verification':
            case 'get-Composed-Compliance-verification-with-sign':
            case 'execute-composed-proof-full-kyc':
            case 'execute-composed-proof-financial-risk':
            case 'execute-composed-proof-business-integrity':
            case 'execute-composed-proof-comprehensive':
                console.log(`Processing Composed Proof verification parameters...`);

                const { companyName, cin, typeOfNet, iterations, jobId } = parameters;

                console.log(`Company Name: ${companyName}`);
                console.log(`CIN: ${cin}`);
                console.log(`Network Type: ${typeOfNet || 'TESTNET'}`);
                console.log(`Iterations: ${iterations || '1'}`);
                console.log(`Job ID: ${jobId || 'not provided'}`);

                if (!companyName) {
                    console.error(`Composed Proof: Missing companyName parameter`);
                    return [];
                }

                if (!cin) {
                    console.error(`Composed Proof: Missing cin parameter`);
                    return [];
                }

                // Build arguments array exactly as the script expects:
                // node script.js "COMPANY_NAME" "CIN" [LOCAL|TESTNET|MAINNET] [iterations]
                const composedArgs = [
                    companyName,           // First argument: company name in quotes
                    cin,                   // Second argument: CIN
                    typeOfNet || 'TESTNET', // Third argument: network type
                    (iterations || '1').toString() // Fourth argument: iterations
                ];

                console.log(`Composed Proof args prepared:`, composedArgs);
                return composedArgs;

            // FIXED: Business Standard Data Integrity (BSDI) tool support
            case 'get-BSDI-compliance-verification':
                console.log(`Processing BSDI tool parameters...`);

                const { dataType, filePath } = parameters;

                if (!dataType) {
                    console.error(`BSDI: Missing dataType parameter`);
                    return [];
                }

                if (!filePath) {
                    console.error(`BSDI: Missing filePath parameter`);
                    return [];
                }

                // Map dataType to document type
                const docType = this.mapDataTypeToDocType(dataType);

                console.log(`Data Type: ${dataType} -> Document Type: ${docType}`);
                console.log(`File Path: ${filePath}`);

                const bsdiArgs = [docType, filePath];
                console.log(`BSDI args prepared:`, bsdiArgs);
                return bsdiArgs;

            default:
                console.log(`No specific argument preparation for tool: ${toolName}`);
                return [];
        }
    }

    async executeTool(toolName: string, parameters: any = {}): Promise<ToolExecutionResult> {
        const startTime = Date.now();

        try {
            console.log('=== CHILD PROCESS TOOL EXECUTION START ===');
            console.log('Tool Name:', toolName);
            console.log('Parameters:', JSON.stringify(parameters, null, 2));

            const result = await this.executeChildProcess(toolName, parameters);
            const executionTime = Date.now() - startTime;

            console.log('=== CHILD PROCESS TOOL EXECUTION SUCCESS ===');
            console.log('Execution Time:', `${executionTime}ms`);
            console.log('Result Success:', result.success);
            console.log('==============================');

            return {
                success: result.success,
                result: result.result || {
                    status: result.success ? 'completed' : 'failed',
                    zkProofGenerated: result.success,
                    timestamp: new Date().toISOString(),
                    output: result.output || '',
                    executionMode: 'multi-path-environment-aware-execution'
                },
                executionTime: `${executionTime}ms`
            };
        } catch (error) {
            const executionTime = Date.now() - startTime;

            console.log('=== CHILD PROCESS TOOL EXECUTION FAILED ===');
            console.log('Error:', error instanceof Error ? error.message : String(error));
            console.log('Execution Time:', `${executionTime}ms`);
            console.log('=============================');

            return {
                success: false,
                result: {
                    status: 'failed',
                    zkProofGenerated: false,
                    timestamp: new Date().toISOString(),
                    error: error instanceof Error ? error.message : 'Unknown error',
                    executionMode: 'multi-path-environment-aware-execution'
                },
                executionTime: `${executionTime}ms`
            };
        }
    }

    async executeChildProcess(toolName: string, parameters: any = {}): Promise<any> {
        // ENHANCED: Determine environment and get appropriate script file
        console.log('DEBUG: executeChildProcess called');
        const environment = this.determineEnvironment(parameters);
        console.log(`DEBUG: Environment determined: ${environment}`);

        const scriptFile = this.getScriptFileForEnvironment(toolName, environment);
        console.log(`DEBUG: Script file selected: ${scriptFile}`);

        if (!scriptFile) {
            const availableTools = Object.keys(ENVIRONMENT_SCRIPT_MAP[environment] || {});
            throw new Error(`Unknown tool: ${toolName} for environment: ${environment}. Available tools: ${availableTools.join(', ')}`);
        }

        console.log('=== ENVIRONMENT-AWARE CHILD PROCESS EXECUTION ===');
        console.log('Tool Name:', toolName);
        console.log('Environment:', environment);
        console.log('Script File:', scriptFile);
        console.log('===============================================');

        return await this.spawnChildProcess(scriptFile, parameters, toolName);
    }

    async spawnChildProcess(scriptFile: string, parameters: any = {}, toolName?: string): Promise<any> {
        // ENHANCED: Use the new findScriptPath method
        const scriptPath = this.findScriptPath(scriptFile);

        if (!scriptPath) {
            console.log('Compiled JavaScript file not found in any build path');
            throw new Error(`Compiled JavaScript file not found: ${scriptFile}. Please run 'npm run build' first. Searched in paths: ${this.config.stdioBuildPaths.join(', ')}`);
        }

        console.log('Compiled JavaScript file found at:', scriptPath);
        console.log('Executing via child process...');

        const startTime = Date.now();

        try {
            // Prepare command line arguments
            const args = this.prepareCommandLineArgs(toolName || '', parameters);

            console.log('=== CHILD PROCESS EXECUTION DEBUG ===');
            console.log('Script Path:', scriptPath);
            console.log('Working Directory:', this.config.stdioPath);
            console.log('Tool Name:', toolName);
            console.log('CLI Arguments:', args);
            console.log('Parameters:', JSON.stringify(parameters, null, 2));
            console.log('=======================================');

            // Broadcast execution started
            this.broadcastExecutionUpdate({
                type: 'execution_started',
                toolName,
                phase: 'child_process_starting',
                message: `Starting ${toolName} execution via child process...`
            });

            return new Promise((resolve, reject) => {
                // Spawn child process with proper CLI arguments
                const child = spawn('node', [scriptPath, ...args], {
                    cwd: this.config.stdioPath,
                    stdio: ['pipe', 'pipe', 'pipe'], // Capture all output
                    env: { ...process.env } // Pass environment variables including BUILD_ENV
                });

                let stdout = '';
                let stderr = '';
                let capturedBeforeState: any = null;
                let capturedAfterState: any = null;

                child.stdout.on('data', (data) => {
                    const output = data.toString();
                    stdout += output;

                    // Parse state information from output
                    this.parseStateFromOutput(output, {
                        onBeforeState: (state) => {
                            capturedBeforeState = state;
                            this.broadcastExecutionUpdate({
                                type: 'before_state_captured',
                                data: state,
                                message: 'Before state successfully captured'
                            });
                        },
                        onAfterState: (state) => {
                            capturedAfterState = state;
                            this.broadcastExecutionUpdate({
                                type: 'after_state_captured',
                                data: state,
                                message: 'After state successfully captured'
                            });
                        }
                    });

                    console.log('CHILD STDOUT:', output.trim());
                });

                child.stderr.on('data', (data) => {
                    const output = data.toString();
                    stderr += output;
                    console.log('CHILD STDERR:', output.trim());
                });

                child.on('close', (code) => {
                    const executionTime = Date.now() - startTime;

                    if (code === 0) {
                        console.log('Child process completed successfully');

                        // Broadcast execution completed
                        this.broadcastExecutionUpdate({
                            type: 'execution_completed',
                            message: 'Child process execution completed successfully',
                            contractStateBefore: capturedBeforeState,
                            contractStateAfter: capturedAfterState
                        });

                        const response = {
                            systemExecution: {
                                status: 'success',
                                executionCompleted: true,
                                scriptExecuted: true,
                                executionTime: new Date().toISOString(),
                                mode: 'multi-path-environment-aware-execution',
                                scriptPath: scriptPath,
                                environment: this.determineEnvironment(parameters)
                            },
                            verificationResult: {
                                success: true,
                                zkProofGenerated: true,
                                status: 'verification_passed',
                                reason: 'Verification completed successfully via child process'
                            },
                            contractStateBefore: capturedBeforeState,
                            contractStateAfter: capturedAfterState,
                            stateChanges: capturedBeforeState && capturedAfterState ? {
                                totalCompaniesChanged: parseInt(capturedAfterState.totalCompaniesTracked) - parseInt(capturedBeforeState.totalCompaniesTracked),
                                compliantCompaniesChanged: parseInt(capturedAfterState.compliantCompaniesCount) - parseInt(capturedBeforeState.compliantCompaniesCount),
                                globalScoreChanged: parseInt(capturedAfterState.globalComplianceScore) - parseInt(capturedBeforeState.globalComplianceScore)
                            } : null,
                            status: 'completed',
                            zkProofGenerated: true,
                            timestamp: new Date().toISOString(),
                            output: stdout,
                            stderr: stderr,
                            executionStrategy: 'Multi-Path Environment-Aware Child Process - CLI arguments execution',
                            executionMode: 'multi-path-environment-aware-execution',
                            executionTime: `${executionTime}ms`
                        };

                        resolve({
                            success: true,
                            result: response
                        });
                    } else {
                        console.log('Child process failed with code:', code);

                        // Broadcast execution failed
                        this.broadcastExecutionUpdate({
                            type: 'execution_failed',
                            error: `Child process exited with code ${code}`,
                            message: 'Child process execution failed'
                        });

                        reject(new Error(`Child process exited with code ${code}: ${stderr}`));
                    }
                });

                child.on('error', (error) => {
                    console.log('Child process error:', error);

                    this.broadcastExecutionUpdate({
                        type: 'execution_failed',
                        error: error.message,
                        message: 'Child process spawn error'
                    });

                    reject(error);
                });

                // Set timeout
                const timeoutHandle = setTimeout(() => {
                    child.kill('SIGTERM');
                    reject(new Error(`Child process timeout after ${this.config.timeout}ms`));
                }, this.config.timeout);

                child.on('close', () => {
                    clearTimeout(timeoutHandle);
                });
            });

        } catch (error) {
            console.log('CHILD PROCESS EXECUTION FAILED:', error);

            this.broadcastExecutionUpdate({
                type: 'execution_failed',
                error: error instanceof Error ? error.message : String(error),
                message: 'Child process execution failed'
            });

            throw error;
        }
    }

    /**
     * Parse state information from child process output
     * FIXED: Updated patterns to match actual output from SafeStateRetrieval.ts
     */
    private parseStateFromOutput(output: string, callbacks: {
        onBeforeState: (state: any) => void;
        onAfterState: (state: any) => void;
    }) {
        // FIXED: Detect before state logging - use correct text pattern
        if (output.includes('Smart Contract State BEFORE Verification:')) {
            this.broadcastExecutionUpdate({
                type: 'phase_update',
                phase: 'before_state_capturing',
                message: 'Capturing before state values...'
            });
        }

        // FIXED: Detect after state logging - use correct text pattern for AFTER
        if (output.includes('Contract state AFTER verification:')) {
            this.broadcastExecutionUpdate({
                type: 'phase_update',
                phase: 'after_state_capturing',
                message: 'Capturing after state values...'
            });
        }

        // ENHANCED: More flexible regex patterns with optional whitespace handling
        const totalCompaniesMatch = output.match(/Total Companies:\s*(\d+)/);
        const compliantCompaniesMatch = output.match(/Compliant Companies:\s*(\d+)/);
        const globalScoreMatch = output.match(/Global Compliance Score:\s*(\d+)%?/); // Allow optional %

        if (totalCompaniesMatch && compliantCompaniesMatch && globalScoreMatch) {
            const state = {
                totalCompaniesTracked: totalCompaniesMatch[1],
                compliantCompaniesCount: compliantCompaniesMatch[1],
                globalComplianceScore: globalScoreMatch[1],
                totalVerificationsGlobal: '1',
                registryVersion: '1',
                companiesRootHash: 'processed-hash'
            };

            // ENHANCED: More robust context detection
            if (output.includes('BEFORE Verification:') || output.includes('Smart Contract State BEFORE')) {
                callbacks.onBeforeState(state);
            } else if (output.includes('AFTER verification:') || output.includes('Contract state AFTER')) {
                callbacks.onAfterState(state);
            }
        }
    }

    /**
     * Get available environments for a given tool
     */
    getAvailableEnvironments(toolName: string): string[] {
        const environments: string[] = [];

        for (const [env, toolMap] of Object.entries(ENVIRONMENT_SCRIPT_MAP)) {
            if (toolMap[toolName]) {
                environments.push(env);
            }
        }

        return environments;
    }

    /**
     * Get all available tools for a specific environment
     */
    getToolsForEnvironment(environment: string): string[] {
        const envMap = ENVIRONMENT_SCRIPT_MAP[environment];
        return envMap ? Object.keys(envMap) : [];
    }

    /**
     * Validate if a tool is available in a specific environment
     */
    isToolAvailableInEnvironment(toolName: string, environment: string): boolean {
        const envMap = ENVIRONMENT_SCRIPT_MAP[environment];
        return !!(envMap && envMap[toolName]);
    }
}

export const zkToolExecutor = new ZKToolExecutor();