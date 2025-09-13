# ZK-PRET Integrated Server

This directory contains the integrated HTTP server that provides API access to all ZK-PRET backend tools and functionality.

## 🎯 What This Does

The integrated server combines your existing ZK-PRET backend with a powerful HTTP API interface, allowing you to:

- **Access all ZK-PRET tools via HTTP API** - No need to run command-line tools manually
- **Sync & Async execution** - Get results immediately or track long-running jobs
- **Real-time updates** - WebSocket support for live job progress
- **Non-breaking integration** - Your existing backend works exactly as before

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Build the Project
```bash
npm run build
```

### 3. Start the Integrated Server
```bash
npm run start:integrated
```

The server will start on `http://localhost:3001` by default.

## 📡 API Endpoints

### Health & Information
- `GET /api/v1/health` - Health check and system status
- `GET /api/v1/tools` - List all available ZK-PRET tools
- `GET /api/v1/status` - Detailed server status

### Synchronous Execution (Wait for Results)
- `POST /api/v1/tools/execute` - Execute any tool and wait for results
- `POST /api/v1/tools/gleif` - GLEIF verification
- `POST /api/v1/tools/corporate` - Corporate registration verification  
- `POST /api/v1/tools/exim` - EXIM verification
- `POST /api/v1/tools/risk` - Risk assessment tools

### Asynchronous Execution (Background Jobs)
- `POST /api/v1/tools/execute-async` - Start background job
- `GET /api/v1/jobs/:jobId` - Check job status
- `GET /api/v1/jobs` - List all jobs
- `DELETE /api/v1/jobs/completed` - Clear completed jobs

### WebSocket
- `ws://localhost:3001` - Real-time job updates

## 🔧 Configuration

Copy `.env.server` to `.env` and modify as needed:

```env
# Server Settings
ZK_PRET_HTTP_SERVER_PORT=3001
ZK_PRET_HTTP_SERVER_HOST=localhost

# Enable/disable async jobs
ENABLE_ASYNC_JOBS=true

# CORS settings
CORS_ORIGIN=http://localhost:5173
```

## 📝 Usage Examples

### Sync GLEIF Verification
```bash
curl -X POST http://localhost:3001/api/v1/tools/gleif \
  -H "Content-Type: application/json" \
  -d '{"companyName": "APPLE INC"}'
```

### Async Risk Assessment
```bash
curl -X POST http://localhost:3001/api/v1/tools/execute-async \
  -H "Content-Type: application/json" \
  -d '{
    "toolName": "get-RiskLiquidityAdvancedOptimMerkle-verification-with-sign",
    "parameters": {"liquidityThreshold": 95}
  }'
```

### Check Job Status
```bash
curl http://localhost:3001/api/v1/jobs/job_1234567890_abc123
```

## 🛠 Development

### Start Development Server
```bash
npm run server:dev
```

### Build Server Only
```bash
npm run server:build
```

### Available Scripts
- `npm run start:integrated` - Build everything and start server
- `npm run start:server` - Start server (requires build)
- `npm run start:dev` - Development mode with auto-reload
- `npm run server:build` - Build server only

## 🔍 How It Works

1. **HTTP Server**: Express.js server with security middleware
2. **ZK Tool Executor**: Connects to your existing ZK-PRET programs
3. **Job Management**: Handles async execution and progress tracking
4. **WebSocket**: Real-time updates for long-running operations

## 🎯 Integration Benefits

- **No Code Changes**: Your existing ZK-PRET backend works unchanged
- **API Access**: All tools available via HTTP API
- **Frontend Ready**: Easy integration with web applications
- **Scalable**: Sync for quick operations, async for heavy computations
- **Monitoring**: Built-in health checks and job management

## 📁 File Structure

```
server/
├── integrated-server.ts     # Main HTTP server
├── services/
│   └── zkToolExecutor.ts   # Connects to ZK-PRET backend
└── utils/
    └── logger.ts           # Logging utilities
```

## 🐛 Troubleshooting

### Server Won't Start
1. Make sure project is built: `npm run build`
2. Check if port 3001 is available
3. Verify all dependencies are installed: `npm install`

### Tools Not Found
1. Ensure the build directory exists and contains compiled JS files
2. Check that your ZK-PRET tools are properly compiled
3. Verify the build path in environment variables

### Performance Issues
1. Increase timeout in `.env`: `ZK_PRET_SERVER_TIMEOUT=3600000`
2. Use async execution for heavy operations
3. Monitor memory usage during ZK proof generation

## 🎉 Success!

Your ZK-PRET backend now has a powerful HTTP API interface while maintaining all existing functionality!