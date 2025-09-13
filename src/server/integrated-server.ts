import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import WebSocket, { WebSocketServer } from 'ws';
import fs from 'fs';
import path from 'path';
import { logger } from './utils/logger.js';
import { zkToolExecutor } from './services/zkToolExecutor.js';

declare global {
    var wsServer: WebSocketServer;
}

// Utility functions for reading config files
function getConfigFiles(configPath: string): string[] {
    try {
        const fullPath = path.join(process.cwd(), 'src', 'data', 'RISK', configPath);
        const files = fs.readdirSync(fullPath);
        return files.filter(file => file.endsWith('.json'));
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`Failed to read config files from ${configPath}:`, errorMessage);
        return [];
    }
}

function getDirectories(basePath: string): string[] {
    try {
        const fullPath = path.join(process.cwd(), 'src', 'data', 'RISK', basePath);
        const items = fs.readdirSync(fullPath, { withFileTypes: true });
        return items.filter(item => item.isDirectory()).map(item => item.name);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`Failed to read directories from ${basePath}:`, errorMessage);
        return [];
    }
}
// NEW: Utility function for stablecoin configuration files by jurisdiction
function getStablecoinConfigFiles(jurisdiction: string): string[] {
    try {
        const fullPath = path.join(process.cwd(), 'src', 'data', 'RISK', 'StableCoin', 'CONFIG', jurisdiction);
        logger.info(`Reading stablecoin config files from: ${fullPath}`);

        if (!fs.existsSync(fullPath)) {
            logger.warn(`Stablecoin config directory does not exist: ${fullPath}`);
            return [];
        }

        const files = fs.readdirSync(fullPath);
        const configFiles = files.filter(file => file.endsWith('.json'));
        logger.info(`Found ${configFiles.length} stablecoin config files in ${fullPath}`);
        return configFiles;
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`Failed to read stablecoin config files from ${jurisdiction}:`, errorMessage);
        return [];
    }
}


// NEW: Utility function for Bill of Lading files
function getBillOfLadingFiles(): string[] {
    try {
        const fullPath = path.join(process.cwd(), 'src', 'data', 'scf', 'BILLOFLADING');

        logger.info(`Reading Bill of Lading files from: ${fullPath}`);

        if (!fs.existsSync(fullPath)) {
            logger.warn(`Bill of Lading directory does not exist: ${fullPath}`);
            return [];
        }

        const files = fs.readdirSync(fullPath);
        // Filter for JSON files (Bill of Lading files are typically JSON)
        const billOfLadingFiles = files.filter(file =>
            file.endsWith('.json')
        );

        logger.info(`Found ${billOfLadingFiles.length} Bill of Lading files in ${fullPath}`);
        return billOfLadingFiles;
    } catch (error) {
        logger.error(`Failed to read Bill of Lading files:`, error);
        return [];
    }
}

// NEW: Utility function for process files (SCF, DVP, STABLECOIN)
// function getProcessFiles(processType: string, fileType: 'expected' | 'actual'): string[] {
//     try {
//         const basePath = processType.toUpperCase();
//         const subPath = fileType.toUpperCase();
//         const fullPath = path.join(process.cwd(), 'src', 'data', basePath, 'process', subPath);

//         logger.info(`Reading process files from: ${fullPath}`);

//         if (!fs.existsSync(fullPath)) {
//             logger.warn(`Process files directory does not exist: ${fullPath}`);
//             return [];
//         }

//         const files = fs.readdirSync(fullPath);
//         // Filter for common process file extensions
//         const processFiles = files.filter(file =>
//             file.endsWith('.bpmn') ||
//             file.endsWith('.xml') ||
//             file.endsWith('.json') ||
//             file.endsWith('.txt')
//         );

//         logger.info(`Found ${processFiles.length} process files in ${fullPath}`);
//         return processFiles;
//     } catch (error) {
//         logger.error(`Failed to read process files from ${processType}/${fileType}:`, error);
//         return [];
//     }
// }

function getProcessFiles(processType: string, fileType: string): string[] {
    try {
        const basePath = processType.toUpperCase();
        const subPath = fileType.toUpperCase();
        const fullPath = path.join(process.cwd(), 'src', 'data', basePath, 'process', subPath);

        logger.info(`📁 Attempting to read process files from: ${fullPath}`);

        if (!fs.existsSync(fullPath)) {
            logger.warn(`⚠️ Process files directory does not exist: ${fullPath}`);

            // Try alternative paths for AWS deployment
            const alternativePaths = [
                path.join(process.cwd(), 'dist', 'src', 'data', basePath, 'process', subPath),
                path.join(process.cwd(), 'build', 'data', basePath, 'process', subPath),
                path.join(__dirname, '..', '..', 'src', 'data', basePath, 'process', subPath),
                path.join('/app', 'src', 'data', basePath, 'process', subPath) // Common AWS/Docker path
            ];

            for (const altPath of alternativePaths) {
                logger.info(`🔍 Trying alternative path: ${altPath}`);
                if (fs.existsSync(altPath)) {
                    logger.info(`✅ Found files at alternative path: ${altPath}`);
                    const files = fs.readdirSync(altPath);
                    const processFiles = files.filter(file =>
                        file.endsWith('.bpmn') ||
                        file.endsWith('.xml') ||
                        file.endsWith('.json') ||
                        file.endsWith('.txt')
                    );
                    logger.info(`📄 Found ${processFiles.length} process files in ${altPath}`);
                    return processFiles;
                }
            }

            logger.error(`❌ No valid path found for ${processType}/${fileType}`);
            return [];
        }

        const files = fs.readdirSync(fullPath);
        const processFiles = files.filter(file =>
            file.endsWith('.bpmn') ||
            file.endsWith('.xml') ||
            file.endsWith('.json') ||
            file.endsWith('.txt')
        );

        logger.info(`📄 Found ${processFiles.length} process files in ${fullPath}`);
        return processFiles;

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`❌ Failed to read process files from ${processType}/${fileType}:`, errorMessage);
        return [];
    }
}

// NEW: Utility function to get all available process types
function getAvailableProcessTypes(): string[] {
    try {
        const dataPath = path.join(process.cwd(), 'src', 'data');
        const items = fs.readdirSync(dataPath, { withFileTypes: true });

        // Filter for directories that contain process subdirectories
        const processTypes = items
            .filter(item => item.isDirectory())
            .map(item => item.name)
            .filter(name => {
                const processPath = path.join(dataPath, name, 'process');
                return fs.existsSync(processPath);
            });

        logger.info(`Available process types: ${processTypes.join(', ')}`);
        return processTypes;
    } catch (error) {
        logger.error('Failed to get available process types:', error);
        return ['SCF', 'DVP', 'STABLECOIN']; // Fallback to known types
    }
}

function generateJobId(): string {
    return 'job_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

interface Job {
    id: string;
    toolName: string;
    parameters: any;
    status: 'pending' | 'running' | 'completed' | 'failed';
    startTime: Date;
    endTime?: Date;
    result?: any;
    error?: string;
    progress?: number;
}

class AsyncJobManager {
    private jobs = new Map<string, Job>();
    private wss: WebSocketServer;

    constructor(wss: WebSocketServer) {
        this.wss = wss;
        logger.info('Async job management enabled (default execution mode)');
    }

    async startJob(jobId: string, toolName: string, parameters: any): Promise<Job> {
        const job: Job = {
            id: jobId,
            toolName,
            parameters,
            status: 'pending',
            startTime: new Date()
        };

        this.jobs.set(jobId, job);
        this.broadcastJobUpdate(job);

        this.processJob(job);

        return job;
    }

    private async processJob(job: Job) {
        try {
            job.status = 'running';
            job.progress = 0;
            this.broadcastJobUpdate(job);

            logger.info(`Starting async job ${job.id}: ${job.toolName}`);

            job.progress = 10;
            this.broadcastJobUpdate(job);

            const startTime = Date.now();
            const result = await zkToolExecutor.executeTool(job.toolName, job.parameters);
            const executionTime = Date.now() - startTime;

            job.status = 'completed';
            job.result = {
                ...result,
                executionTimeMs: executionTime,
                jobId: job.id,
                completedAt: new Date().toISOString(),
                mode: 'async-only-server'
            };
            job.endTime = new Date();
            job.progress = 100;

            logger.info(`Async job ${job.id} completed successfully in ${executionTime}ms`);

        } catch (error) {
            job.status = 'failed';
            job.error = error instanceof Error ? error.message : 'Unknown error';
            job.endTime = new Date();

            logger.error(`Async job ${job.id} failed:`, error);
        }

        this.broadcastJobUpdate(job);
    }

    private broadcastJobUpdate(job: Job) {
        const message = JSON.stringify({
            type: 'job_update',
            jobId: job.id,
            status: job.status,
            progress: job.progress,
            result: job.result,
            error: job.error,
            timestamp: new Date().toISOString(),
            server: 'zk-pret-async-only-server'
        });

        this.wss.clients.forEach((client: WebSocket) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        });
    }

    getJob(jobId: string): Job | undefined {
        return this.jobs.get(jobId);
    }

    getAllJobs(): Job[] {
        return Array.from(this.jobs.values());
    }

    getActiveJobs(): Job[] {
        return Array.from(this.jobs.values()).filter(job =>
            job.status === 'pending' || job.status === 'running'
        );
    }

    clearCompletedJobs() {
        for (const [jobId, job] of this.jobs.entries()) {
            if (job.status === 'completed' || job.status === 'failed') {
                this.jobs.delete(jobId);
            }
        }
    }
}

const app = express();
const server = createServer(app);

const wss = new WebSocketServer({ server });
global.wsServer = wss;

const jobManager = new AsyncJobManager(wss);

const ZK_PRET_HTTP_SERVER_PORT = parseInt(process.env.ZK_PRET_HTTP_SERVER_PORT || '3001', 10);
const ZK_PRET_HTTP_SERVER_HOST = process.env.ZK_PRET_HTTP_SERVER_HOST || 'localhost';

app.use(helmet());

const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
    max: parseInt(process.env.RATE_LIMIT_MAX || '100'),
    message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

app.options('*', cors());

app.use('/api/*', (req, res, next) => {
    console.log(`🔍 API Request: ${req.method} ${req.path}`);
    console.log(`🔍 Headers:`, req.headers);
    console.log(`🔍 Origin:`, req.get('origin'));
    next();
});


app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        // Allow all origins in production for AWS deployment
        if (process.env.NODE_ENV === 'production') {
            return callback(null, true);
        }

        // For development, use specific origins
        const allowedOrigins = [
            'http://localhost:3000',
            'http://localhost:3001',
            'http://localhost:5173',
            process.env.CORS_ORIGIN
        ].filter(Boolean);

        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        // Fallback: allow all for now
        return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key', 'Accept', 'Origin', 'X-Requested-With'],
    exposedHeaders: ['Content-Length', 'X-Requested-With'],
    optionsSuccessStatus: 200,
    preflightContinue: false
}));

app.use(express.json({ limit: process.env.MAX_REQUEST_SIZE || '10mb' }));
app.use(express.urlencoded({ extended: true, limit: process.env.MAX_REQUEST_SIZE || '10mb' }));

if (process.env.ZK_PRET_ENABLE_API_AUTH === 'true') {
    const API_KEY = process.env.ZK_PRET_API_KEY;

    const requireApiKey = (req: express.Request, res: express.Response, next: express.NextFunction) => {
        const providedKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');

        if (!providedKey || providedKey !== API_KEY) {
            logger.warn('Unauthorized API access attempt', {
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                url: req.url,
                providedKey: providedKey ? '[REDACTED]' : 'none'
            });

            return res.status(401).json({
                success: false,
                error: 'Unauthorized: Valid API key required',
                timestamp: new Date().toISOString(),
                server: 'zk-pret-async-only-server'
            });
        }

        next();
    };

    app.use('/api/v1/tools', requireApiKey);
    logger.info('API key authentication enabled for tool endpoints');
} else {
    logger.info('API key authentication disabled');
}

app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
    logger.info('HTTP Request', {
        method: req.method,
        url: req.url,
        ip: req.ip,
        userAgent: req.get('User-Agent')
    });
    next();
});

wss.on('connection', (ws: WebSocket) => {
    logger.info('New WebSocket connection established');

    ws.on('message', (message: WebSocket.RawData) => {
        try {
            const data = JSON.parse(message.toString());
            logger.info('WebSocket message received:', data);

            if (data.type === 'subscribe_state_monitoring') {
                ws.send(JSON.stringify({
                    type: 'state_monitoring_subscribed',
                    message: 'Subscribed to progressive state monitoring',
                    timestamp: new Date().toISOString(),
                    server: 'zk-pret-async-only-server'
                }));
            }
        } catch (error) {
            logger.error('Invalid WebSocket message:', error);
        }
    });

    ws.on('close', () => {
        logger.info('WebSocket connection closed');
    });

    ws.send(JSON.stringify({
        type: 'connection',
        status: 'connected',
        server: 'zk-pret-async-only-server',
        timestamp: new Date().toISOString(),
        features: {
            progressiveStateMonitoring: true,
            asyncJobs: true,
            realTimeUpdates: true,
            executionMode: 'async-only'
        }
    }));
});

app.get('/api/v1/health', async (req: express.Request, res: express.Response) => {
    try {
        const executorHealth = await zkToolExecutor.healthCheck();

        return res.json({
            status: executorHealth.connected ? 'healthy' : 'degraded',
            timestamp: new Date().toISOString(),
            server: 'zk-pret-async-only-server',
            version: '1.0.0',
            mode: 'async-only',
            services: {
                zkExecutor: executorHealth.connected,
                asyncJobs: true,
                websockets: wss.clients.size > 0,
                progressiveStateMonitoring: true,
                configDataEndpoints: true,
                processFileEndpoints: true,
                stdioPath: executorHealth.status?.path
            },
            activeJobs: jobManager.getActiveJobs().length,
            websocketConnections: wss.clients.size,
            executorStatus: executorHealth.status
        });
    } catch (error) {
        logger.error('Health check failed', { error: error instanceof Error ? error.message : String(error) });
        return res.status(500).json({
            status: 'error',
            timestamp: new Date().toISOString(),
            error: 'Health check failed'
        });
    }
});

app.get('/api/v1/tools', async (req: express.Request, res: express.Response) => {
    try {
        const tools = zkToolExecutor.getAvailableTools();

        return res.json({
            success: true,
            tools,
            count: tools.length,
            timestamp: new Date().toISOString(),
            server: 'zk-pret-async-only-server',
            mode: 'async-only',
            features: {
                asyncExecution: true,
                websockets: true,
                directBackendAccess: true,
                progressiveStateMonitoring: true,
                configDataEndpoints: true,
                processFileEndpoints: true,
                executionMode: 'async-only'
            }
        });
    } catch (error) {
        logger.error('Failed to list tools', { error: error instanceof Error ? error.message : String(error) });
        return res.status(500).json({
            success: false,
            error: 'Failed to list tools',
            timestamp: new Date().toISOString()
        });
    }
});

// ==== EXISTING CONFIG DATA ENDPOINTS ====

// Basel III Configuration Files
app.get('/api/v1/basel3-config-files', (req: express.Request, res: express.Response) => {
    try {
        const files = getConfigFiles('Basel3/CONFIG');

        logger.info(`Basel III config files requested - found ${files.length} files`);

        return res.json({
            success: true,
            files: files,
            count: files.length,
            timestamp: new Date().toISOString(),
            server: 'zk-pret-async-only-server'
        });
    } catch (error) {
        logger.error('Failed to get Basel III config files:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to load Basel III configuration files',
            timestamp: new Date().toISOString(),
            server: 'zk-pret-async-only-server'
        });
    }
});

// Risk Advanced Configuration Files  
app.get('/api/v1/risk-advanced-config-files', (req: express.Request, res: express.Response) => {
    try {
        const files = getConfigFiles('Advanced/CONFIG');

        logger.info(`Risk Advanced config files requested - found ${files.length} files`);

        return res.json({
            success: true,
            files: files,
            count: files.length,
            timestamp: new Date().toISOString(),
            server: 'zk-pret-async-only-server'
        });
    } catch (error) {
        logger.error('Failed to get Risk Advanced config files:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to load Risk Advanced configuration files',
            timestamp: new Date().toISOString(),
            server: 'zk-pret-async-only-server'
        });
    }
});

// Stablecoin Jurisdictions
app.get('/api/v1/stablecoin-jurisdictions', (req: express.Request, res: express.Response) => {
    try {
        const jurisdictions = getDirectories('StableCoin/CONFIG');

        logger.info(`Stablecoin jurisdictions requested - found ${jurisdictions.length} jurisdictions`);

        return res.json({
            success: true,
            jurisdictions: jurisdictions,
            count: jurisdictions.length,
            timestamp: new Date().toISOString(),
            server: 'zk-pret-async-only-server'
        });
    } catch (error) {
        logger.error('Failed to get stablecoin jurisdictions:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to load stablecoin jurisdictions',
            timestamp: new Date().toISOString(),
            server: 'zk-pret-async-only-server'
        });
    }
});

// FIXED: Stablecoin Situations by Jurisdiction
app.get('/api/v1/stablecoin-situations/:jurisdiction', (req: express.Request, res: express.Response) => {
    try {
        const jurisdiction = req.params.jurisdiction;
        const configFiles = getStablecoinConfigFiles(jurisdiction);

        logger.info(`Stablecoin config files requested for ${jurisdiction} - found ${configFiles.length} files`);

        return res.json({
            success: true,
            situations: configFiles,
            jurisdiction: jurisdiction,
            count: configFiles.length,
            timestamp: new Date().toISOString(),
            server: 'zk-pret-async-only-server'
        });
    } catch (error) {
        logger.error(`Failed to get stablecoin config files for ${req.params.jurisdiction}:`, error);
        return res.status(500).json({
            success: false,
            error: `Failed to load config files for ${req.params.jurisdiction}`,
            timestamp: new Date().toISOString(),
            server: 'zk-pret-async-only-server'
        });
    }
});

// Risk Advanced Execution Settings
app.get('/api/v1/risk-advanced-execution-settings', (req: express.Request, res: express.Response) => {
    try {
        // Predefined execution paths - you can make this dynamic later by reading from config files
        const executionPaths = [
            {
                id: "ultra_strict",
                name: "Ultra Strict Mode",
                description: "Highest security verification"
            },
            {
                id: "strict",
                name: "Strict Mode",
                description: "High security verification"
            },
            {
                id: "standard",
                name: "Standard Mode",
                description: "Standard security verification"
            },
            {
                id: "relaxed",
                name: "Relaxed Mode",
                description: "Lower security verification"
            }
        ];

        logger.info(`Risk Advanced execution settings requested - found ${executionPaths.length} paths`);

        return res.json({
            success: true,
            executionPaths: executionPaths,
            count: executionPaths.length,
            timestamp: new Date().toISOString(),
            server: 'zk-pret-async-only-server'
        });
    } catch (error) {
        logger.error('Failed to get execution settings:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to load execution settings',
            timestamp: new Date().toISOString(),
            server: 'zk-pret-async-only-server'
        });
    }
});

// ==== NEW: PROCESS FILES ENDPOINTS ====

// Get all available process types
app.get('/api/v1/process-types', (req: express.Request, res: express.Response) => {
    try {
        const processTypes = getAvailableProcessTypes();

        logger.info(`Process types requested - found ${processTypes.length} types`);

        return res.json({
            success: true,
            processTypes: processTypes,
            count: processTypes.length,
            timestamp: new Date().toISOString(),
            server: 'zk-pret-async-only-server'
        });
    } catch (error) {
        logger.error('Failed to get process types:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to load process types',
            timestamp: new Date().toISOString(),
            server: 'zk-pret-async-only-server'
        });
    }
});

// Bill of Lading files endpoint for Data Integrity
app.get('/api/v1/bill-of-lading-files', (req: express.Request, res: express.Response) => {
    try {
        const files = getBillOfLadingFiles();

        logger.info(`Bill of lading files requested - found ${files.length} files`);

        return res.json({
            success: true,
            files: files,
            count: files.length,
            timestamp: new Date().toISOString(),
            server: 'zk-pret-async-only-server'
        });
    } catch (error) {
        logger.error('Failed to get bill of lading files:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to load bill of lading files',
            timestamp: new Date().toISOString(),
            server: 'zk-pret-async-only-server'
        });
    }
});

// Generic process files endpoint - handles SCF/expected, SCF/actual, DVP/expected, etc.
app.get('/api/v1/process-files/:processType/:fileType', (req: express.Request, res: express.Response) => {
    try {
        const { processType, fileType } = req.params;

        // Validate file type
        if (fileType !== 'expected' && fileType !== 'actual') {
            return res.status(400).json({
                success: false,
                error: 'Invalid file type. Must be "expected" or "actual"',
                timestamp: new Date().toISOString(),
                server: 'zk-pret-async-only-server'
            });
        }

        const files = getProcessFiles(processType, fileType as 'expected' | 'actual');

        logger.info(`Process files requested for ${processType}/${fileType} - found ${files.length} files`);

        return res.json({
            success: true,
            files: files,
            processType: processType.toUpperCase(),
            fileType: fileType.toLowerCase(),
            count: files.length,
            timestamp: new Date().toISOString(),
            server: 'zk-pret-async-only-server'
        });
    } catch (error) {
        logger.error(`Failed to get process files for ${req.params.processType}/${req.params.fileType}:`, error);
        return res.status(500).json({
            success: false,
            error: `Failed to load ${req.params.processType}/${req.params.fileType} process files`,
            timestamp: new Date().toISOString(),
            server: 'zk-pret-async-only-server'
        });
    }
});

// Specific endpoints for common process types (for backward compatibility)
app.get('/api/v1/scf-expected-files', (req, res) => {
    try {
        logger.info('📡 SCF expected files endpoint called');
        const files = getProcessFiles('SCF', 'expected');

        logger.info(`✅ SCF expected files requested - found ${files.length} files`);

        return res.status(200).json({
            success: true,
            files: files,
            count: files.length,
            timestamp: new Date().toISOString(),
            server: 'zk-pret-async-only-server',
            endpoint: '/api/v1/scf-expected-files',
            processType: 'SCF',
            fileType: 'expected'
        });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('❌ Failed to get SCF expected files:', errorMessage);
        return res.status(500).json({
            success: false,
            error: 'Failed to load SCF expected files',
            details: errorMessage,
            timestamp: new Date().toISOString(),
            server: 'zk-pret-async-only-server',
            endpoint: '/api/v1/scf-expected-files'
        });
    }
});

app.get('/api/v1/scf-actual-files', (req, res) => {
    try {
        logger.info('📡 SCF actual files endpoint called');
        const files = getProcessFiles('SCF', 'actual');

        logger.info(`✅ SCF actual files requested - found ${files.length} files`);

        return res.status(200).json({
            success: true,
            files: files,
            count: files.length,
            timestamp: new Date().toISOString(),
            server: 'zk-pret-async-only-server',
            endpoint: '/api/v1/scf-actual-files',
            processType: 'SCF',
            fileType: 'actual'
        });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('❌ Failed to get SCF actual files:', errorMessage);
        return res.status(500).json({
            success: false,
            error: 'Failed to load SCF actual files',
            details: errorMessage,
            timestamp: new Date().toISOString(),
            server: 'zk-pret-async-only-server',
            endpoint: '/api/v1/scf-actual-files'
        });
    }
});


// DVP process files
app.get('/api/v1/dvp-expected-files', (req, res) => {
    try {
        logger.info('📡 DVP expected files endpoint called');
        const files = getProcessFiles('DVP', 'expected');

        logger.info(`✅ DVP expected files requested - found ${files.length} files`);

        return res.status(200).json({
            success: true,
            files: files,
            count: files.length,
            timestamp: new Date().toISOString(),
            server: 'zk-pret-async-only-server',
            endpoint: '/api/v1/dvp-expected-files',
            processType: 'DVP',
            fileType: 'expected'
        });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('❌ Failed to get DVP expected files:', errorMessage);
        return res.status(500).json({
            success: false,
            error: 'Failed to load DVP expected files',
            details: errorMessage,
            timestamp: new Date().toISOString(),
            server: 'zk-pret-async-only-server',
            endpoint: '/api/v1/dvp-expected-files'
        });
    }
});

app.get('/api/v1/dvp-actual-files', (req, res) => {
    try {
        logger.info('📡 DVP actual files endpoint called');
        const files = getProcessFiles('DVP', 'actual');

        logger.info(`✅ DVP actual files requested - found ${files.length} files`);

        return res.status(200).json({
            success: true,
            files: files,
            count: files.length,
            timestamp: new Date().toISOString(),
            server: 'zk-pret-async-only-server',
            endpoint: '/api/v1/dvp-actual-files',
            processType: 'DVP',
            fileType: 'actual'
        });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('❌ Failed to get DVP actual files:', errorMessage);
        return res.status(500).json({
            success: false,
            error: 'Failed to load DVP actual files',
            details: errorMessage,
            timestamp: new Date().toISOString(),
            server: 'zk-pret-async-only-server',
            endpoint: '/api/v1/dvp-actual-files'
        });
    }
});

// Stablecoin process files
app.get('/api/v1/stablecoin-expected-files', (req, res) => {
    try {
        logger.info('📡 STABLECOIN expected files endpoint called');
        const files = getProcessFiles('STABLECOIN', 'expected');

        logger.info(`✅ STABLECOIN expected files requested - found ${files.length} files`);

        return res.status(200).json({
            success: true,
            files: files,
            count: files.length,
            timestamp: new Date().toISOString(),
            server: 'zk-pret-async-only-server',
            endpoint: '/api/v1/stablecoin-expected-files',
            processType: 'STABLECOIN',
            fileType: 'expected'
        });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('❌ Failed to get STABLECOIN expected files:', errorMessage);
        return res.status(500).json({
            success: false,
            error: 'Failed to load STABLECOIN expected files',
            details: errorMessage,
            timestamp: new Date().toISOString(),
            server: 'zk-pret-async-only-server',
            endpoint: '/api/v1/stablecoin-expected-files'
        });
    }
});

app.get('/api/v1/stablecoin-actual-files', (req, res) => {
    try {
        logger.info('📡 STABLECOIN actual files endpoint called');
        const files = getProcessFiles('STABLECOIN', 'actual');

        logger.info(`✅ STABLECOIN actual files requested - found ${files.length} files`);

        return res.status(200).json({
            success: true,
            files: files,
            count: files.length,
            timestamp: new Date().toISOString(),
            server: 'zk-pret-async-only-server',
            endpoint: '/api/v1/stablecoin-actual-files',
            processType: 'STABLECOIN',
            fileType: 'actual'
        });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('❌ Failed to get STABLECOIN actual files:', errorMessage);
        return res.status(500).json({
            success: false,
            error: 'Failed to load STABLECOIN actual files',
            details: errorMessage,
            timestamp: new Date().toISOString(),
            server: 'zk-pret-async-only-server',
            endpoint: '/api/v1/stablecoin-actual-files'
        });
    }
});

// ==== END PROCESS FILES ENDPOINTS ====

// MAIN EXECUTION ENDPOINT - ASYNC ONLY
app.post('/api/v1/tools/execute', async (req: express.Request, res: express.Response) => {
    try {
        const { toolName, parameters, jobId } = req.body;

        if (!toolName) {
            return res.status(400).json({
                success: false,
                error: 'toolName is required',
                timestamp: new Date().toISOString()
            });
        }

        const actualJobId = jobId || generateJobId();

        logger.info('ASYNC execution started (default mode)', {
            jobId: actualJobId,
            toolName,
            parameters: JSON.stringify(parameters),
            mode: 'async-only',
            progressiveStateMonitoring: true
        });

        const job = await jobManager.startJob(actualJobId, toolName, parameters || {});

        return res.json({
            success: true,
            jobId: job.id,
            status: job.status,
            toolName: job.toolName,
            timestamp: job.startTime.toISOString(),
            message: 'Async job started successfully (default execution mode)',
            server: 'zk-pret-async-only-server',
            mode: 'async-only',
            websocketUrl: `ws://${ZK_PRET_HTTP_SERVER_HOST}:${ZK_PRET_HTTP_SERVER_PORT}`,
            progressiveStateMonitoring: true
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            error: 'Failed to start async job',
            message: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
        });
    }
});

app.get('/api/v1/jobs/:jobId', (req: express.Request, res: express.Response) => {
    const job = jobManager.getJob(req.params.jobId);
    if (!job) {
        return res.status(404).json({
            success: false,
            error: 'Job not found',
            jobId: req.params.jobId,
            timestamp: new Date().toISOString()
        });
    }

    return res.json({
        success: true,
        job,
        timestamp: new Date().toISOString(),
        server: 'zk-pret-async-only-server',
        mode: 'async-only'
    });
});

app.get('/api/v1/jobs', (req: express.Request, res: express.Response) => {
    const jobs = jobManager.getAllJobs();
    return res.json({
        success: true,
        jobs,
        total: jobs.length,
        active: jobManager.getActiveJobs().length,
        timestamp: new Date().toISOString(),
        server: 'zk-pret-async-only-server',
        mode: 'async-only'
    });
});

app.delete('/api/v1/jobs/completed', (req: express.Request, res: express.Response) => {
    jobManager.clearCompletedJobs();
    return res.json({
        success: true,
        message: 'Completed jobs cleared',
        timestamp: new Date().toISOString(),
        server: 'zk-pret-async-only-server',
        mode: 'async-only'
    });
});

// SPECIALIZED TOOL ENDPOINTS - ALL ASYNC
app.post('/api/v1/tools/gleif', async (req: express.Request, res: express.Response) => {
    try {
        const parameters = req.body;
        const jobId = generateJobId();

        logger.info('GLEIF async execution started', {
            jobId,
            parameters: JSON.stringify(parameters)
        });

        const job = await jobManager.startJob(jobId, 'get-GLEIF-verification-with-sign', parameters);

        return res.json({
            success: true,
            jobId: job.id,
            status: job.status,
            toolName: 'get-GLEIF-verification-with-sign',
            timestamp: job.startTime.toISOString(),
            message: 'GLEIF async job started successfully',
            server: 'zk-pret-async-only-server',
            mode: 'async-only',
            websocketUrl: `ws://${ZK_PRET_HTTP_SERVER_HOST}:${ZK_PRET_HTTP_SERVER_PORT}`,
            progressiveStateMonitoring: true
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
        });
    }
});

app.post('/api/v1/tools/corporate', async (req: express.Request, res: express.Response) => {
    try {
        const parameters = req.body;
        const jobId = generateJobId();

        logger.info('Corporate async execution started', {
            jobId,
            parameters: JSON.stringify(parameters)
        });

        const job = await jobManager.startJob(jobId, 'get-Corporate-Registration-verification-with-sign', parameters);

        return res.json({
            success: true,
            jobId: job.id,
            status: job.status,
            toolName: 'get-Corporate-Registration-verification-with-sign',
            timestamp: job.startTime.toISOString(),
            message: 'Corporate Registration async job started successfully',
            server: 'zk-pret-async-only-server',
            mode: 'async-only',
            websocketUrl: `ws://${ZK_PRET_HTTP_SERVER_HOST}:${ZK_PRET_HTTP_SERVER_PORT}`,
            progressiveStateMonitoring: true
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
        });
    }
});

app.post('/api/v1/tools/exim', async (req: express.Request, res: express.Response) => {
    try {
        const parameters = req.body;
        const jobId = generateJobId();

        logger.info('EXIM async execution started', {
            jobId,
            parameters: JSON.stringify(parameters)
        });

        const job = await jobManager.startJob(jobId, 'get-EXIM-verification-with-sign', parameters);

        return res.json({
            success: true,
            jobId: job.id,
            status: job.status,
            toolName: 'get-EXIM-verification-with-sign',
            timestamp: job.startTime.toISOString(),
            message: 'EXIM async job started successfully',
            server: 'zk-pret-async-only-server',
            mode: 'async-only',
            websocketUrl: `ws://${ZK_PRET_HTTP_SERVER_HOST}:${ZK_PRET_HTTP_SERVER_PORT}`,
            progressiveStateMonitoring: true
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
        });
    }
});

app.post('/api/v1/tools/risk', async (req: express.Request, res: express.Response) => {
    try {
        const parameters = req.body;
        const toolName = parameters.riskType === 'advanced' ? 'get-RiskLiquidityAdvancedOptimMerkle-verification-with-sign' :
            parameters.riskType === 'basel3' ? 'get-RiskLiquidityBasel3Optim-Merkle-verification-with-sign' :
                parameters.riskType === 'stablecoin' ? 'get-StablecoinProofOfReservesRisk-verification-with-sign' :
                    'get-RiskLiquidityAdvancedOptimMerkle-verification-with-sign';

        const jobId = generateJobId();

        logger.info('Risk async execution started', {
            jobId,
            toolName,
            parameters: JSON.stringify(parameters)
        });

        const job = await jobManager.startJob(jobId, toolName, parameters);

        return res.json({
            success: true,
            jobId: job.id,
            status: job.status,
            toolName,
            timestamp: job.startTime.toISOString(),
            message: 'Risk verification async job started successfully',
            server: 'zk-pret-async-only-server',
            mode: 'async-only',
            websocketUrl: `ws://${ZK_PRET_HTTP_SERVER_HOST}:${ZK_PRET_HTTP_SERVER_PORT}`,
            progressiveStateMonitoring: true
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
        });
    }
});

app.get('/api/v1/status', async (req: express.Request, res: express.Response) => {
    try {
        const executorHealth = await zkToolExecutor.healthCheck();

        return res.json({
            server: 'zk-pret-async-only-server',
            version: '1.0.0',
            mode: 'async-only',
            status: executorHealth.connected ? 'healthy' : 'degraded',
            timestamp: new Date().toISOString(),
            port: ZK_PRET_HTTP_SERVER_PORT,
            host: ZK_PRET_HTTP_SERVER_HOST,
            features: {
                asyncExecution: true,
                realTimeResults: true,
                batchOperations: true,
                websockets: true,
                jobManagement: true,
                directBackendAccess: true,
                progressiveStateMonitoring: true,
                configDataEndpoints: true,
                processFileEndpoints: true,
                executionMode: 'async-only'
            },
            executor: {
                connected: executorHealth.connected,
                status: executorHealth.status,
                executionMode: 'async-only'
            },
            jobs: {
                total: jobManager.getAllJobs().length,
                active: jobManager.getActiveJobs().length
            },
            websockets: {
                connections: wss.clients.size,
                enabled: true,
                progressiveStateUpdates: true
            }
        });
    } catch (error) {
        return res.status(500).json({
            server: 'zk-pret-async-only-server',
            status: 'error',
            error: error instanceof Error ? error.message : String(error),
            timestamp: new Date().toISOString()
        });
    }
});

// ==== DIRECT EXECUTION ENDPOINTS (NO JOB IDS) ====
// Add these endpoints to your existing integrated-server.ts before the error handlers

// GLEIF LEI Direct API
app.post('/zkpret/compliance/global/lei/', async (req: express.Request, res: express.Response) => {
    try {
        const { companyName } = req.body;

        if (!companyName) {
            return res.status(400).json({
                success: false,
                error: 'companyName is required',
                endpoint: '/zkpret/compliance/global/lei/',
                example: { companyName: "SREE PALANI ANDAVAR AGROS PRIVATE LIMITED" },
                timestamp: new Date().toISOString()
            });
        }

        logger.info('Direct GLEIF LEI execution started', { companyName });

        const startTime = Date.now();
        const result = await zkToolExecutor.executeTool('get-GLEIF-verification-with-sign', { companyName });
        const executionTime = Date.now() - startTime;

        return res.json({
            success: true,
            data: result,
            metadata: {
                companyName,
                executionTimeMs: executionTime,
                timestamp: new Date().toISOString(),
                endpoint: '/zkpret/compliance/global/lei/',
                service: 'GLEIF LEI Verification',
                mode: 'direct-execution'
            }
        });

    } catch (error) {
        logger.error('Direct GLEIF LEI execution failed', {
            companyName: req.body.companyName,
            error: error instanceof Error ? error.message : String(error)
        });
        return res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            endpoint: '/zkpret/compliance/global/lei/',
            timestamp: new Date().toISOString()
        });
    }
});

// EXIM Direct API
app.post('/zkpret/compliance/global/exim/', async (req: express.Request, res: express.Response) => {
    try {
        const { companyName } = req.body;

        if (!companyName) {
            return res.status(400).json({
                success: false,
                error: 'companyName is required',
                endpoint: '/zkpret/compliance/global/exim/',
                example: { companyName: "zenova_dgft" },
                timestamp: new Date().toISOString()
            });
        }

        logger.info('Direct EXIM execution started', { companyName });

        const startTime = Date.now();
        const result = await zkToolExecutor.executeTool('get-EXIM-verification-with-sign', { companyName });
        const executionTime = Date.now() - startTime;

        return res.json({
            success: true,
            data: result,
            metadata: {
                companyName,
                executionTimeMs: executionTime,
                timestamp: new Date().toISOString(),
                endpoint: '/zkpret/compliance/global/exim/',
                service: 'EXIM Compliance Verification',
                mode: 'direct-execution'
            }
        });

    } catch (error) {
        logger.error('Direct EXIM execution failed', {
            companyName: req.body.companyName,
            error: error instanceof Error ? error.message : String(error)
        });
        return res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            endpoint: '/zkpret/compliance/global/exim/',
            timestamp: new Date().toISOString()
        });
    }
});

// Corporate Registration Direct API
app.post('/zkpret/compliance/global/corporate/', async (req: express.Request, res: express.Response) => {
    try {
        const { cin } = req.body;

        if (!cin) {
            return res.status(400).json({
                success: false,
                error: 'cin (Corporate Identification Number) is required',
                endpoint: '/zkpret/compliance/global/corporate/',
                example: { cin: "U01112TZ2022PTC039493" },
                timestamp: new Date().toISOString()
            });
        }

        logger.info('Direct Corporate Registration execution started', { cin });

        const startTime = Date.now();
        const result = await zkToolExecutor.executeTool('get-CorporateRegistration-data', { cin });
        const executionTime = Date.now() - startTime;

        return res.json({
            success: true,
            data: result,
            metadata: {
                cin,
                executionTimeMs: executionTime,
                timestamp: new Date().toISOString(),
                endpoint: '/zkpret/compliance/global/corporate/',
                service: 'Corporate Registration Verification',
                mode: 'direct-execution'
            }
        });

    } catch (error) {
        logger.error('Direct Corporate Registration execution failed', {
            cin: req.body.cin,
            error: error instanceof Error ? error.message : String(error)
        });
        return res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            endpoint: '/zkpret/compliance/global/corporate/',
            timestamp: new Date().toISOString()
        });
    }
});

// GLEIF Multi-Verifier Direct API (with ZK proofs)
app.post('/zkpret/verify/lei/', async (req: express.Request, res: express.Response) => {
    try {
        const { companyName } = req.body;

        if (!companyName) {
            return res.status(400).json({
                success: false,
                error: 'companyName is required',
                endpoint: '/zkpret/verify/lei/',
                example: { companyName: "SREE PALANI ANDAVAR AGROS PRIVATE LIMITED" },
                timestamp: new Date().toISOString()
            });
        }

        logger.info('Direct GLEIF Multi-Verifier execution started', { companyName });

        const startTime = Date.now();
        const result = await zkToolExecutor.executeTool('run-GLEIF-local-multiverifier', { companyName });
        const executionTime = Date.now() - startTime;

        return res.json({
            success: true,
            data: result,
            metadata: {
                companyName,
                executionTimeMs: executionTime,
                timestamp: new Date().toISOString(),
                endpoint: '/zkpret/verify/lei/',
                service: 'GLEIF LEI Verification with ZK Proofs',
                mode: 'direct-execution',
                type: 'full-zk-verification'
            }
        });

    } catch (error) {
        logger.error('Direct GLEIF Multi-Verifier execution failed', {
            companyName: req.body.companyName,
            error: error instanceof Error ? error.message : String(error)
        });
        return res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            endpoint: '/zkpret/verify/lei/',
            timestamp: new Date().toISOString()
        });
    }
});

// ==== BUSINESS PROCESS INTEGRITY DIRECT EXECUTION ENDPOINTS ====

// Generic Business Process Direct API
app.post('/zkpret/compliance/business/process/', async (req, res) => {
    try {
        const { processType, expectedProcessFilePath, actualProcessFilePath } = req.body;

        if (!processType || !expectedProcessFilePath || !actualProcessFilePath) {
            return res.status(400).json({
                success: false,
                error: 'processType, expectedProcessFilePath, and actualProcessFilePath are required',
                endpoint: '/zkpret/compliance/business/process/',
                examples: [
                    {
                        processType: "STABLECOIN",
                        expectedProcessFilePath: "./src/data/STABLECOIN/process/EXPECTED/STABLECOIN-Expected.bpmn",
                        actualProcessFilePath: "./src/data/STABLECOIN/process/ACTUAL/STABLECOIN-Accepted1.bpmn"
                    },
                    {
                        processType: "SCF",
                        expectedProcessFilePath: "./src/data/scf/process/EXPECTED/SCF-Expected.bpmn",
                        actualProcessFilePath: "./src/data/scf/process/ACTUAL/SCF-Accepted1.bpmn"
                    },
                    {
                        processType: "DVP",
                        expectedProcessFilePath: "./src/data/DVP/process/EXPECTED/DVP-Expected.bpmn",
                        actualProcessFilePath: "./src/data/DVP/process/ACTUAL/DVP-Accepted1.bpmn"
                    }
                ],
                timestamp: new Date().toISOString()
            });
        }

        logger.info('Direct Business Process execution started', {
            processType, expectedProcessFilePath, actualProcessFilePath
        });

        const startTime = Date.now();
        const result = await zkToolExecutor.executeTool('get-BPI-compliance-verification', {
            processType,
            expectedProcessFilePath,
            actualProcessFilePath
        });
        const executionTime = Date.now() - startTime;

        return res.json({
            success: true,
            data: result,
            metadata: {
                processType,
                expectedProcessFilePath,
                actualProcessFilePath,
                executionTimeMs: executionTime,
                timestamp: new Date().toISOString(),
                endpoint: '/zkpret/compliance/business/process/',
                service: 'Business Process Integrity Verification',
                mode: 'direct-execution'
            }
        });

    } catch (error) {
        logger.error('Direct Business Process execution failed', {
            processType: req.body.processType,
            error: error instanceof Error ? error.message : String(error)
        });
        return res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            endpoint: '/zkpret/compliance/business/process/',
            timestamp: new Date().toISOString()
        });
    }
});

// STABLECOIN Process Direct API
app.post('/zkpret/compliance/business/stablecoin/', async (req, res) => {
    try {
        const { expectedFile, actualFile } = req.body;

        // Set default files if not provided
        const expectedProcessFilePath = expectedFile || "./src/data/STABLECOIN/process/EXPECTED/STABLECOIN-Expected.bpmn";
        const actualProcessFilePath = actualFile || "./src/data/STABLECOIN/process/ACTUAL/STABLECOIN-Accepted1.bpmn";

        logger.info('Direct STABLECOIN Process execution started', {
            expectedProcessFilePath, actualProcessFilePath
        });

        const startTime = Date.now();
        const result = await zkToolExecutor.executeTool('get-BPI-compliance-verification', {
            processType: 'STABLECOIN',
            expectedProcessFilePath,
            actualProcessFilePath
        });
        const executionTime = Date.now() - startTime;

        return res.json({
            success: true,
            data: result,
            metadata: {
                processType: 'STABLECOIN',
                expectedProcessFilePath,
                actualProcessFilePath,
                executionTimeMs: executionTime,
                timestamp: new Date().toISOString(),
                endpoint: '/zkpret/compliance/business/stablecoin/',
                service: 'STABLECOIN Business Process Verification',
                mode: 'direct-execution'
            }
        });

    } catch (error) {
        logger.error('Direct STABLECOIN Process execution failed', {
            error: error instanceof Error ? error.message : String(error)
        });
        return res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            endpoint: '/zkpret/compliance/business/stablecoin/',
            timestamp: new Date().toISOString()
        });
    }
});

// SCF Process Direct API
app.post('/zkpret/compliance/business/scf/', async (req, res) => {
    try {
        const { expectedFile, actualFile } = req.body;

        // Set default files if not provided
        const expectedProcessFilePath = expectedFile || "./src/data/scf/process/EXPECTED/SCF-Expected.bpmn";
        const actualProcessFilePath = actualFile || "./src/data/scf/process/ACTUAL/SCF-Accepted1.bpmn";

        logger.info('Direct SCF Process execution started', {
            expectedProcessFilePath, actualProcessFilePath
        });

        const startTime = Date.now();
        const result = await zkToolExecutor.executeTool('get-BPI-compliance-verification', {
            processType: 'SCF',
            expectedProcessFilePath,
            actualProcessFilePath
        });
        const executionTime = Date.now() - startTime;

        return res.json({
            success: true,
            data: result,
            metadata: {
                processType: 'SCF',
                expectedProcessFilePath,
                actualProcessFilePath,
                executionTimeMs: executionTime,
                timestamp: new Date().toISOString(),
                endpoint: '/zkpret/compliance/business/scf/',
                service: 'SCF Business Process Verification',
                mode: 'direct-execution'
            }
        });

    } catch (error) {
        logger.error('Direct SCF Process execution failed', {
            error: error instanceof Error ? error.message : String(error)
        });
        return res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            endpoint: '/zkpret/compliance/business/scf/',
            timestamp: new Date().toISOString()
        });
    }
});

// DVP Process Direct API
app.post('/zkpret/compliance/business/dvp/', async (req, res) => {
    try {
        const { expectedFile, actualFile } = req.body;

        // Set default files if not provided
        const expectedProcessFilePath = expectedFile || "./src/data/DVP/process/EXPECTED/DVP-Expected.bpmn";
        const actualProcessFilePath = actualFile || "./src/data/DVP/process/ACTUAL/DVP-Accepted1.bpmn";

        logger.info('Direct DVP Process execution started', {
            expectedProcessFilePath, actualProcessFilePath
        });

        const startTime = Date.now();
        const result = await zkToolExecutor.executeTool('get-BPI-compliance-verification', {
            processType: 'DVP',
            expectedProcessFilePath,
            actualProcessFilePath
        });
        const executionTime = Date.now() - startTime;

        return res.json({
            success: true,
            data: result,
            metadata: {
                processType: 'DVP',
                expectedProcessFilePath,
                actualProcessFilePath,
                executionTimeMs: executionTime,
                timestamp: new Date().toISOString(),
                endpoint: '/zkpret/compliance/business/dvp/',
                service: 'DVP Business Process Verification',
                mode: 'direct-execution'
            }
        });

    } catch (error) {
        logger.error('Direct DVP Process execution failed', {
            error: error instanceof Error ? error.message : String(error)
        });
        return res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            endpoint: '/zkpret/compliance/business/dvp/',
            timestamp: new Date().toISOString()
        });
    }
});

// ==== END BUSINESS PROCESS INTEGRITY ENDPOINTS ====

app.post('/zkpret/compliance/data/integrity/', async (req, res) => {
    try {
        const { dataType, filePath } = req.body;

        if (!dataType || !filePath) {
            return res.status(400).json({
                success: false,
                error: 'dataType and filePath are required',
                endpoint: '/zkpret/compliance/data/integrity/',
                examples: [
                    {
                        dataType: "BOL",
                        filePath: "./src/data/scf/BILLOFLADING/BOL-VALID-1.json"
                    },
                    {
                        dataType: "BOL",
                        filePath: "./src/data/scf/BILLOFLADING/BOL-INVALID-1.json"
                    }
                    // {
                    //     dataType: "AWB",
                    //     filePath: "./src/data/scf/AIRWAYBILL/AWB-VALID-1.json"
                    // },
                    // {
                    //     dataType: "INVOICE",
                    //     filePath: "./src/data/scf/INVOICE/INVOICE-VALID-1.json"
                    // }
                ],
                supportedDataTypes: ["BOL", "AWB", "INVOICE", "billoflading", "airwaybill", "invoice"],
                timestamp: new Date().toISOString()
            });
        }

        logger.info('Direct Business Standard Data Integrity execution started', {
            dataType, filePath
        });

        const startTime = Date.now();
        const result = await zkToolExecutor.executeTool('get-BSDI-compliance-verification', {
            dataType,
            filePath
        });
        const executionTime = Date.now() - startTime;

        return res.json({
            success: true,
            data: result,
            metadata: {
                dataType,
                filePath,
                executionTimeMs: executionTime,
                timestamp: new Date().toISOString(),
                endpoint: '/zkpret/compliance/data/integrity/',
                service: 'Business Standard Data Integrity Verification',
                mode: 'direct-execution'
            }
        });

    } catch (error) {
        logger.error('Direct Business Standard Data Integrity execution failed', {
            dataType: req.body.dataType,
            filePath: req.body.filePath,
            error: error instanceof Error ? error.message : String(error)
        });
        return res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            endpoint: '/zkpret/compliance/data/integrity/',
            timestamp: new Date().toISOString()
        });
    }
});

// / ==== RISK VERIFICATION DIRECT EXECUTION ENDPOINTS ====

// Generic Risk Verification Direct API
app.post('/zkpret/compliance/risk/verification/', async (req: express.Request, res: express.Response) => {
    try {
        const { riskType, environment, lcrThreshold, nsfrThreshold, liquidityThreshold, actusUrl, configFilePath, executionMode, jurisdiction } = req.body;

        if (!riskType || !environment) {
            return res.status(400).json({
                success: false,
                error: 'riskType and environment are required',
                endpoint: '/zkpret/compliance/risk/verification/',
                supportedRiskTypes: ['basel3', 'stablecoin', 'advanced'],
                supportedEnvironments: ['local', 'network'],
                examples: [
                    {
                        riskType: "basel3",
                        environment: "local",
                        lcrThreshold: 80,
                        nsfrThreshold: 80,
                        actusUrl: "http://34.203.247.32:8083/eventsBatch",
                        configFilePath: "src/data/RISK/Basel3/CONFIG/basel3-VALID-1.json"
                    },
                    {
                        riskType: "stablecoin",
                        environment: "local",
                        liquidityThreshold: 100,
                        actusUrl: "http://34.203.247.32:8083/eventsBatch",
                        configFilePath: "src/data/RISK/StableCoin/CONFIG/US/StableCoin-VALID-1.json",
                        executionMode: "ultra_strict",
                        jurisdiction: "US"
                    },
                    {
                        riskType: "advanced",
                        environment: "local",
                        liquidityThreshold: 100,
                        actusUrl: "http://34.203.247.32:8083/eventsBatch",
                        configFilePath: "src/data/RISK/Advanced/CONFIG/Advanced-VALID-1.json"
                    }
                ],
                timestamp: new Date().toISOString()
            });
        }

        // Determine the appropriate tool name
        let toolName: string;
        if (riskType === 'basel3') {
            toolName = environment === 'local' ? 'get-RiskLiquidityBasel3Optim-Merkle-verification-with-sign' : 'get-RiskLiquidityBasel3Optim-Merkle-verification-with-sign';
        } else if (riskType === 'stablecoin') {
            toolName = environment === 'local' ? 'get-StablecoinProofOfReservesRisk-verification-with-sign' : 'get-StablecoinProofOfReservesRisk-verification-with-sign';
        } else if (riskType === 'advanced') {
            toolName = environment === 'local' ? 'get-RiskLiquidityAdvancedOptimMerkle-verification-with-sign' : 'get-RiskLiquidityAdvancedOptimMerkle-verification-with-sign';
        } else {
            return res.status(400).json({
                success: false,
                error: 'Invalid riskType. Supported types: basel3, stablecoin, advanced',
                timestamp: new Date().toISOString()
            });
        }

        logger.info('Direct Risk Verification execution started', {
            riskType, environment, toolName
        });

        const startTime = Date.now();

        // Prepare parameters based on risk type with proper typing
        let parameters: any = { actusUrl: actusUrl || "http://34.203.247.32:8083/eventsBatch" };

        if (riskType === 'basel3') {
            parameters = {
                ...parameters,
                lcrThreshold: lcrThreshold || 80,
                nsfrThreshold: nsfrThreshold || 80,
                configFilePath: configFilePath || "src/data/RISK/Basel3/CONFIG/basel3-VALID-1.json"
            };
        } else if (riskType === 'stablecoin') {
            parameters = {
                ...parameters,
                liquidityThreshold: liquidityThreshold || 100,
                jurisdiction: jurisdiction || "US",
                situation: configFilePath ? configFilePath.split('/').pop() : "StableCoin-VALID-1.json",
                executionMode: executionMode || "ultra_strict",
                configFilePath: configFilePath || "src/data/RISK/StableCoin/CONFIG/US/StableCoin-VALID-1.json"
            };
        } else if (riskType === 'advanced') {
            parameters = {
                ...parameters,
                liquidityThreshold: liquidityThreshold || 100,
                configFilePath: configFilePath || "src/data/RISK/Advanced/CONFIG/Advanced-VALID-1.json",
                executionMode: executionMode || "ultra_strict"
            };
        }

        const result = await zkToolExecutor.executeTool(toolName, parameters);
        const executionTime = Date.now() - startTime;

        return res.json({
            success: true,
            data: result,
            metadata: {
                riskType,
                environment,
                toolName,
                parameters,
                executionTimeMs: executionTime,
                timestamp: new Date().toISOString(),
                endpoint: '/zkpret/compliance/risk/verification/',
                service: `${riskType.toUpperCase()} Risk Verification (${environment})`,
                mode: 'direct-execution'
            }
        });

    } catch (error) {
        logger.error('Direct Risk Verification execution failed', {
            riskType: req.body.riskType,
            environment: req.body.environment,
            error: error instanceof Error ? error.message : String(error)
        });
        return res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            endpoint: '/zkpret/compliance/risk/verification/',
            timestamp: new Date().toISOString()
        });
    }
});

// API Documentation Endpoint
app.get('/zkpret/', (req: express.Request, res: express.Response) => {
    const baseUrl = `http://${req.get('host')}`;

    return res.json({
        service: "ZK-PRET Direct Compliance API",
        version: "1.0.0",
        description: "Direct execution endpoints without job IDs - immediate results",
        server: "zk-pret-integrated-server",
        baseUrl,
        timestamp: new Date().toISOString(),
        endpoints: {
            documentation: {
                method: "GET",
                path: "/zkpret/",
                description: "This documentation"
            },
            compliance: {
                global: {
                    lei: {
                        method: "POST",
                        path: "/zkpret/compliance/global/lei/",
                        description: "GLEIF LEI verification",
                        body: { companyName: "string" },
                        example: { companyName: "SREE PALANI ANDAVAR AGROS PRIVATE LIMITED" }
                    },
                    exim: {
                        method: "POST",
                        path: "/zkpret/compliance/exim/",
                        description: "EXIM compliance verification",
                        body: { companyName: "string" },
                        example: { companyName: "zenova_dgft" }
                    },
                    corporate: {
                        method: "POST",
                        path: "/zkpret/compliance/corporate/",
                        description: "Corporate registration verification",
                        body: { cin: "string" },
                        example: { cin: "U01112TZ2022PTC039493" }
                    }
                }
            },
            verification: {
                lei: {
                    method: "POST",
                    path: "/zkpret/verify/lei/",
                    description: "Full GLEIF verification with ZK proofs",
                    body: { companyName: "string" },
                    example: { companyName: "SREE PALANI ANDAVAR AGROS PRIVATE LIMITED" }
                }
            }
        },
        features: [
            "Direct execution (no job IDs)",
            "Immediate response with results",
            "Professional RESTful API structure",
            "Comprehensive error handling",
            "Execution time tracking",
            "Compatible with async endpoints"
        ],
        asyncEndpoints: {
            note: "Async endpoints with job IDs are still available",
            execute: "POST /api/v1/tools/execute",
            jobs: "GET /api/v1/jobs/:jobId"
        }
    });
});

// ==== END DIRECT EXECUTION ENDPOINTS ====

app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    logger.error('Unhandled error', {
        error: error.message,
        stack: error.stack,
        url: req.url,
        method: req.method
    });

    res.status(500).json({
        success: false,
        error: 'Internal server error',
        timestamp: new Date().toISOString(),
        server: 'zk-pret-async-only-server'
    });
});

if (process.env.NODE_ENV === 'production') {
    // Serve static files
    app.use(express.static(path.join(process.cwd(), 'dist')));
    app.use(express.static(path.join(process.cwd(), 'build')));
    app.use(express.static(path.join(process.cwd(), 'public')));

    // Handle client-side routing - ONLY for non-API routes
    app.get('*', (req, res, next) => {
        // Skip API routes - let them be handled by the API handlers
        if (req.path.startsWith('/api/') || req.path.startsWith('/zkpret/')) {
            return next();
        }

        // For non-API routes, serve the frontend
        const indexPath = path.join(process.cwd(), 'dist', 'index.html');
        if (fs.existsSync(indexPath)) {
            res.sendFile(indexPath);
        } else {
            res.status(404).send('Frontend not built. Run npm run build first.');
        }
    });
}

app.use((req, res) => {
    // Only return JSON for API routes
    if (req.path.startsWith('/api/') || req.path.startsWith('/zkpret/')) {
        res.status(404).json({
            success: false,
            error: 'API endpoint not found',
            path: req.path,
            method: req.method,
            timestamp: new Date().toISOString(),
            server: 'zk-pret-async-only-server',
            availableEndpoints: [
                '/api/v1/health',
                '/api/v1/stablecoin-actual-files',
                '/api/v1/stablecoin-expected-files',
                '/zkpret/'
            ]
        });
    } else {
        // For non-API routes, try to serve index.html (SPA fallback)
        const indexPath = path.join(process.cwd(), 'dist', 'index.html');
        if (fs.existsSync(indexPath)) {
            res.sendFile(indexPath);
        } else {
            res.status(404).send('Page not found');
        }
    }
});


app.use((req: express.Request, res: express.Response) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        path: req.path,
        method: req.method,
        timestamp: new Date().toISOString(),
        server: 'zk-pret-async-only-server'
    });
});

const startServer = async () => {
    try {
        console.log('🚀 Starting ZK-PRET Async-Only HTTP Server...');

        console.log('⚡ Initializing ZK Tool Executor...');
        await zkToolExecutor.initialize();
        console.log('✅ ZK Tool Executor initialization completed');

        server.listen(ZK_PRET_HTTP_SERVER_PORT, ZK_PRET_HTTP_SERVER_HOST, () => {
            logger.info(`🚀 ZK-PRET Async-Only HTTP Server started successfully`);
            logger.info(`📡 Server URL: http://${ZK_PRET_HTTP_SERVER_HOST}:${ZK_PRET_HTTP_SERVER_PORT}`);
            logger.info(`🔄 Mode: Async-Only Execution`);
            logger.info(`📡 WebSocket URL: ws://${ZK_PRET_HTTP_SERVER_HOST}:${ZK_PRET_HTTP_SERVER_PORT}`);
            logger.info(`⚡ Features: Async-only execution with real-time updates`);
            logger.info(`🎯 Ready to process ZK-PRET tool requests asynchronously`);
            logger.info(`📊 Progressive State Monitoring: Enabled`);
            logger.info(`📂 Config Data Endpoints: Enabled`);
            logger.info(`📄 Process Files Endpoints: Enabled`);

            console.log('\n=== ZK-PRET ASYNC-ONLY HTTP SERVER ENDPOINTS ===');
            console.log('🔍 HEALTH & INFO:');
            console.log(`GET  http://${ZK_PRET_HTTP_SERVER_HOST}:${ZK_PRET_HTTP_SERVER_PORT}/api/v1/health`);
            console.log(`GET  http://${ZK_PRET_HTTP_SERVER_HOST}:${ZK_PRET_HTTP_SERVER_PORT}/api/v1/tools`);
            console.log(`GET  http://${ZK_PRET_HTTP_SERVER_HOST}:${ZK_PRET_HTTP_SERVER_PORT}/api/v1/status`);

            console.log('📂 CONFIG DATA ENDPOINTS:');
            console.log(`GET  http://${ZK_PRET_HTTP_SERVER_HOST}:${ZK_PRET_HTTP_SERVER_PORT}/api/v1/basel3-config-files`);
            console.log(`GET  http://${ZK_PRET_HTTP_SERVER_HOST}:${ZK_PRET_HTTP_SERVER_PORT}/api/v1/risk-advanced-config-files`);
            console.log(`GET  http://${ZK_PRET_HTTP_SERVER_HOST}:${ZK_PRET_HTTP_SERVER_PORT}/api/v1/stablecoin-jurisdictions`);
            console.log(`GET  http://${ZK_PRET_HTTP_SERVER_HOST}:${ZK_PRET_HTTP_SERVER_PORT}/api/v1/stablecoin-situations/:jurisdiction`);
            console.log(`GET  http://${ZK_PRET_HTTP_SERVER_HOST}:${ZK_PRET_HTTP_SERVER_PORT}/api/v1/risk-advanced-execution-settings`);

            console.log('📄 PROCESS FILES ENDPOINTS:');
            console.log(`GET  http://${ZK_PRET_HTTP_SERVER_HOST}:${ZK_PRET_HTTP_SERVER_PORT}/api/v1/process-types`);
            console.log(`GET  http://${ZK_PRET_HTTP_SERVER_HOST}:${ZK_PRET_HTTP_SERVER_PORT}/api/v1/bill-of-lading-files`);
            console.log(`GET  http://${ZK_PRET_HTTP_SERVER_HOST}:${ZK_PRET_HTTP_SERVER_PORT}/api/v1/process-files/:processType/:fileType`);
            console.log(`GET  http://${ZK_PRET_HTTP_SERVER_HOST}:${ZK_PRET_HTTP_SERVER_PORT}/api/v1/process-files/SCF/expected`);
            console.log(`GET  http://${ZK_PRET_HTTP_SERVER_HOST}:${ZK_PRET_HTTP_SERVER_PORT}/api/v1/process-files/SCF/actual`);
            console.log(`GET  http://${ZK_PRET_HTTP_SERVER_HOST}:${ZK_PRET_HTTP_SERVER_PORT}/api/v1/process-files/DVP/expected`);
            console.log(`GET  http://${ZK_PRET_HTTP_SERVER_HOST}:${ZK_PRET_HTTP_SERVER_PORT}/api/v1/process-files/DVP/actual`);
            console.log(`GET  http://${ZK_PRET_HTTP_SERVER_HOST}:${ZK_PRET_HTTP_SERVER_PORT}/api/v1/process-files/STABLECOIN/expected`);
            console.log(`GET  http://${ZK_PRET_HTTP_SERVER_HOST}:${ZK_PRET_HTTP_SERVER_PORT}/api/v1/process-files/STABLECOIN/actual`);

            console.log('📄 SPECIFIC PROCESS FILE ENDPOINTS (BACKWARD COMPATIBILITY):');
            console.log(`GET  http://${ZK_PRET_HTTP_SERVER_HOST}:${ZK_PRET_HTTP_SERVER_PORT}/api/v1/scf-expected-files`);
            console.log(`GET  http://${ZK_PRET_HTTP_SERVER_HOST}:${ZK_PRET_HTTP_SERVER_PORT}/api/v1/scf-actual-files`);
            console.log(`GET  http://${ZK_PRET_HTTP_SERVER_HOST}:${ZK_PRET_HTTP_SERVER_PORT}/api/v1/dvp-expected-files`);
            console.log(`GET  http://${ZK_PRET_HTTP_SERVER_HOST}:${ZK_PRET_HTTP_SERVER_PORT}/api/v1/dvp-actual-files`);
            console.log(`GET  http://${ZK_PRET_HTTP_SERVER_HOST}:${ZK_PRET_HTTP_SERVER_PORT}/api/v1/stablecoin-expected-files`);
            console.log(`GET  http://${ZK_PRET_HTTP_SERVER_HOST}:${ZK_PRET_HTTP_SERVER_PORT}/api/v1/stablecoin-actual-files`);

            console.log('🔄 ASYNC EXECUTION (DEFAULT):');
            console.log(`POST http://${ZK_PRET_HTTP_SERVER_HOST}:${ZK_PRET_HTTP_SERVER_PORT}/api/v1/tools/execute`);
            console.log(`POST http://${ZK_PRET_HTTP_SERVER_HOST}:${ZK_PRET_HTTP_SERVER_PORT}/api/v1/tools/gleif`);
            console.log(`POST http://${ZK_PRET_HTTP_SERVER_HOST}:${ZK_PRET_HTTP_SERVER_PORT}/api/v1/tools/corporate`);
            console.log(`POST http://${ZK_PRET_HTTP_SERVER_HOST}:${ZK_PRET_HTTP_SERVER_PORT}/api/v1/tools/exim`);
            console.log(`POST http://${ZK_PRET_HTTP_SERVER_HOST}:${ZK_PRET_HTTP_SERVER_PORT}/api/v1/tools/risk`);

            console.log('📊 JOB MANAGEMENT:');
            console.log(`GET  http://${ZK_PRET_HTTP_SERVER_HOST}:${ZK_PRET_HTTP_SERVER_PORT}/api/v1/jobs/:jobId`);
            console.log(`GET  http://${ZK_PRET_HTTP_SERVER_HOST}:${ZK_PRET_HTTP_SERVER_PORT}/api/v1/jobs`);
            console.log(`DEL  http://${ZK_PRET_HTTP_SERVER_HOST}:${ZK_PRET_HTTP_SERVER_PORT}/api/v1/jobs/completed`);

            // Add this to your console.log section in the startServer() function:

            console.log('🚀 DIRECT EXECUTION ENDPOINTS (NEW):');
            console.log(`POST http://${ZK_PRET_HTTP_SERVER_HOST}:${ZK_PRET_HTTP_SERVER_PORT}/zkpret/compliance/global/lei/`);
            console.log(`POST http://${ZK_PRET_HTTP_SERVER_HOST}:${ZK_PRET_HTTP_SERVER_PORT}/zkpret/compliance/global/exim/`);
            console.log(`POST http://${ZK_PRET_HTTP_SERVER_HOST}:${ZK_PRET_HTTP_SERVER_PORT}/zkpret/compliance/global/corporate/`);
            console.log(`POST http://${ZK_PRET_HTTP_SERVER_HOST}:${ZK_PRET_HTTP_SERVER_PORT}/zkpret/verify/lei/`);
            console.log(`GET  http://${ZK_PRET_HTTP_SERVER_HOST}:${ZK_PRET_HTTP_SERVER_PORT}/zkpret/ (documentation)`);

            console.log('📡 WEBSOCKET:');
            console.log(`WS   ws://${ZK_PRET_HTTP_SERVER_HOST}:${ZK_PRET_HTTP_SERVER_PORT} (real-time async updates)`);
            console.log('📊 PROGRESSIVE STATE MONITORING:');
            console.log(`WS   ws://${ZK_PRET_HTTP_SERVER_HOST}:${ZK_PRET_HTTP_SERVER_PORT} (real-time state updates)`);
            console.log('=====================================\n');

            console.log('🎯 ASYNC-ONLY INTEGRATION SUCCESS:');
            console.log('• All executions are asynchronous by default');
            console.log('• POST /api/v1/tools/execute → Returns job ID immediately');
            console.log('• Real-time updates via WebSocket');
            console.log('• Progressive state monitoring enabled');
            console.log('• Config data endpoints enabled');
            console.log('• Process files endpoints enabled');
            console.log('• Bill of Lading files endpoint enabled');
            console.log('• Frontend dropdown population supported');
            console.log('• Business process file access');
            console.log('• No synchronous blocking operations');
            console.log('• Optimized for concurrent processing');
            console.log('=====================================\n');

            console.log('📊 ASYNC-ONLY FEATURES:');
            console.log('• Immediate job ID response');
            console.log('• Real-time progress updates via WebSocket');
            console.log('• Non-blocking execution');
            console.log('• Enhanced job management');
            console.log('• Progressive state capture');
            console.log('• Configuration file serving');
            console.log('• Basel III config files endpoint');
            console.log('• Risk Advanced config files endpoint');
            console.log('• Stablecoin jurisdictions endpoint');
            console.log('• Dynamic situations loading');
            console.log('• Execution settings endpoint');
            console.log('• Process files endpoints');
            console.log('• SCF/DVP/STABLECOIN process file access');
            console.log('• Expected/Actual file categorization');
            console.log('• Business process integrity support');
            console.log('• Bill of Lading files for Data Integrity');
            console.log('=====================================\n');
        });
    } catch (error) {
        logger.error('Failed to start async-only HTTP server:', error);
        console.log('❌ Server startup failed');
        process.exit(1);
    }
};

export { startServer };

process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully');
    server.close(() => {
        logger.info('Async-only HTTP server closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    logger.info('SIGINT received, shutting down gracefully');
    server.close(() => {
        logger.info('Async-only HTTP server closed');
        process.exit(0);
    });
});

console.log('Starting async-only server from integrated-server.js...');
startServer().catch(error => {
    console.error('Failed to start server:', error);
    process.exit(1);
});