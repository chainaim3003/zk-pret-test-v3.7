/**
 * Timestamped Config Manager
 * List, compare, and manage generated testnet configs
 */

import * as fs from 'fs';
import * as path from 'path';

const CONFIG_DIR = './config/environments';

interface ConfigMetadata {
    generated?: string;
    timestamp?: string;
    accountCount?: number;
    oracleTypes?: string[];
    version?: string;
}

interface Config {
    network?: {
        environment?: string;
        minaEndpoint?: string;
        proofsEnabled?: boolean;
    };
    oracles?: {
        registry?: Record<string, any>;
    };
    metadata?: ConfigMetadata;
}

/**
 * List all timestamped configs
 */
function listConfigs(): Array<{ file: string; filepath: string; metadata: ConfigMetadata; stats: fs.Stats }> {
    if (!fs.existsSync(CONFIG_DIR)) {
        console.log('❌ Config directory not found:', CONFIG_DIR);
        return [];
    }
    
    const files = fs.readdirSync(CONFIG_DIR)
        .filter(file => file.startsWith('testnet-') && file.endsWith('.json'))
        .filter(file => file !== 'testnet-new.json') // Exclude the latest symlink
        .sort()
        .reverse(); // Most recent first
    
    console.log('📁 TIMESTAMPED TESTNET CONFIGS');
    console.log('==============================');
    
    if (files.length === 0) {
        console.log('No timestamped configs found.');
        return [];
    }
    
    const configs: Array<{ file: string; filepath: string; metadata: ConfigMetadata; stats: fs.Stats }> = [];
    
    files.forEach((file, index) => {
        const filepath = path.join(CONFIG_DIR, file);
        const stats = fs.statSync(filepath);
        const size = (stats.size / 1024).toFixed(1);
        
        // Try to read metadata
        try {
            const config: Config = JSON.parse(fs.readFileSync(filepath, 'utf8'));
            const metadata = config.metadata || {};
            
            console.log(`${index + 1}. ${file}`);
            console.log(`   📅 Generated: ${metadata.generated || stats.mtime.toISOString()}`);
            console.log(`   👥 Accounts: ${metadata.accountCount || 'Unknown'}`);
            console.log(`   🔧 Version: ${metadata.version || 'Unknown'}`);
            console.log(`   📊 Size: ${size} KB`);
            console.log(`   🏷️  Oracles: ${metadata.oracleTypes ? metadata.oracleTypes.join(', ') : 'Unknown'}`);
            console.log('');
            
            configs.push({
                file,
                filepath,
                metadata,
                stats
            });
        } catch (error) {
            console.log(`${index + 1}. ${file} (❌ Invalid JSON)`);
            console.log('');
        }
    });
    
    return configs;
}

/**
 * Show config details
 */
function showConfigDetails(filename: string): void {
    const filepath = path.join(CONFIG_DIR, filename);
    
    if (!fs.existsSync(filepath)) {
        console.log(`❌ Config not found: ${filename}`);
        return;
    }
    
    try {
        const config: Config = JSON.parse(fs.readFileSync(filepath, 'utf8'));
        
        console.log(`📄 CONFIG DETAILS: ${filename}`);
        console.log('='.repeat(50));
        
        if (config.metadata) {
            console.log('📋 METADATA:');
            console.log(`   Generated: ${config.metadata.generated}`);
            console.log(`   Timestamp: ${config.metadata.timestamp}`);
            console.log(`   Accounts: ${config.metadata.accountCount}`);
            console.log(`   Version: ${config.metadata.version}`);
            console.log(`   Oracles: ${config.metadata.oracleTypes?.join(', ')}`);
            console.log('');
        }
        
        console.log('🔗 NETWORK CONFIG:');
        console.log(`   Environment: ${config.network?.environment}`);
        console.log(`   Endpoint: ${config.network?.minaEndpoint}`);
        console.log(`   Proofs: ${config.network?.proofsEnabled}`);
        console.log('');
        
        console.log('👥 ORACLE ACCOUNTS:');
        if (config.oracles?.registry) {
            Object.entries(config.oracles.registry).forEach(([role, data]: [string, any]) => {
                console.log(`   ${role}:`);
                console.log(`     Public Key: ${data.publicKey}`);
                console.log(`     Role: ${data.role}`);
                console.log('');
            });
        }
        
    } catch (error) {
        console.log(`❌ Error reading config: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Set a config as the current/latest
 */
function setAsLatest(filename: string): void {
    const sourcePath = path.join(CONFIG_DIR, filename);
    const latestPath = path.join(CONFIG_DIR, 'testnet-new.json');
    
    if (!fs.existsSync(sourcePath)) {
        console.log(`❌ Source config not found: ${filename}`);
        return;
    }
    
    try {
        // Copy the file content
        const content = fs.readFileSync(sourcePath);
        fs.writeFileSync(latestPath, content);
        
        console.log(`✅ Set ${filename} as latest config (testnet-new.json)`);
        console.log(`🔗 Projects will now use this configuration`);
        
    } catch (error) {
        console.log(`❌ Error setting latest: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Compare two configs
 */
function compareConfigs(file1: string, file2: string): void {
    const path1 = path.join(CONFIG_DIR, file1);
    const path2 = path.join(CONFIG_DIR, file2);
    
    if (!fs.existsSync(path1) || !fs.existsSync(path2)) {
        console.log('❌ One or both config files not found');
        return;
    }
    
    try {
        const config1: Config = JSON.parse(fs.readFileSync(path1, 'utf8'));
        const config2: Config = JSON.parse(fs.readFileSync(path2, 'utf8'));
        
        console.log(`🔄 COMPARING CONFIGS`);
        console.log('===================');
        console.log(`📄 File 1: ${file1}`);
        console.log(`📄 File 2: ${file2}`);
        console.log('');
        
        // Compare metadata
        console.log('📋 METADATA COMPARISON:');
        const meta1 = config1.metadata || {};
        const meta2 = config2.metadata || {};
        
        console.log(`   Generated: ${meta1.generated} vs ${meta2.generated}`);
        console.log(`   Accounts: ${meta1.accountCount} vs ${meta2.accountCount}`);
        console.log(`   Version: ${meta1.version} vs ${meta2.version}`);
        console.log('');
        
        // Compare account counts
        const oracles1 = Object.keys(config1.oracles?.registry || {});
        const oracles2 = Object.keys(config2.oracles?.registry || {});
        
        console.log('👥 ORACLE COMPARISON:');
        console.log(`   Count: ${oracles1.length} vs ${oracles2.length}`);
        console.log(`   Types: ${oracles1.join(', ')} vs ${oracles2.join(', ')}`);
        
    } catch (error) {
        console.log(`❌ Error comparing configs: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Clean old configs (keep last N)
 */
function cleanOldConfigs(keepCount: number = 5): void {
    const configs = listConfigs();
    
    if (configs.length <= keepCount) {
        console.log(`✅ Only ${configs.length} configs found, nothing to clean`);
        return;
    }
    
    const toDelete = configs.slice(keepCount);
    
    console.log(`🗑️  CLEANING OLD CONFIGS (keeping ${keepCount} most recent)`);
    console.log('================================================');
    
    toDelete.forEach(config => {
        try {
            fs.unlinkSync(config.filepath);
            console.log(`✅ Deleted: ${config.file}`);
        } catch (error) {
            console.log(`❌ Failed to delete ${config.file}: ${error instanceof Error ? error.message : String(error)}`);
        }
    });
    
    console.log(`🎉 Cleanup complete! Kept ${keepCount} most recent configs.`);
}

/**
 * Main CLI handler
 */
function main(): void {
    const command = process.argv[2];
    const arg1 = process.argv[3];
    const arg2 = process.argv[4];
    
    switch (command) {
        case 'list':
        case 'ls':
            listConfigs();
            break;
            
        case 'show':
        case 'details':
            if (!arg1) {
                console.log('❌ Usage: node build/scripts/config-manager.js show <filename>');
                return;
            }
            showConfigDetails(arg1);
            break;
            
        case 'latest':
        case 'set-latest':
            if (!arg1) {
                console.log('❌ Usage: node build/scripts/config-manager.js latest <filename>');
                return;
            }
            setAsLatest(arg1);
            break;
            
        case 'compare':
            if (!arg1 || !arg2) {
                console.log('❌ Usage: node build/scripts/config-manager.js compare <file1> <file2>');
                return;
            }
            compareConfigs(arg1, arg2);
            break;
            
        case 'clean':
            const keepCount = arg1 ? parseInt(arg1) : 5;
            cleanOldConfigs(keepCount);
            break;
            
        default:
            console.log('🔧 TIMESTAMPED CONFIG MANAGER');
            console.log('=============================');
            console.log('');
            console.log('Commands:');
            console.log('  list                     - List all timestamped configs');
            console.log('  show <filename>          - Show config details');
            console.log('  latest <filename>        - Set config as latest/current');
            console.log('  compare <file1> <file2>  - Compare two configs');
            console.log('  clean [count]            - Clean old configs (keep 5 by default)');
            console.log('');
            console.log('Examples:');
            console.log('  npm run build && node build/scripts/config-manager.js list');
            console.log('  node build/scripts/config-manager.js show testnet-2025-07-02T15-30-45.json');
            console.log('  node build/scripts/config-manager.js latest testnet-2025-07-02T15-30-45.json');
            console.log('  node build/scripts/config-manager.js clean 3');
    }
}

main();
