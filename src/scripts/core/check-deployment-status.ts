/**
 * Generic Deployment Status Checker for Mina zkApps
 * Checks the deployment status of a smart contract on Mina devnet/testnet
 * 
 * Usage:
 * npm run check-status <contract-address> [transaction-hash] [alias]
 * 
 * Examples:
 * npm run check-status B62qoJKYYHAvmLyxWjwgLxyJVHiqeRig6N7aZRpVdtPB5dR5tPtYMRG
 * npm run check-status B62qoJKYYHAvmLyxWjwgLxyJVHiqeRig6N7aZRpVdtPB5dR5tPtYMRG 5JvExHaCttT9va9qGkzaZg1ieLXDEpiDiu9VuaL4fYRr1vG5rhZg
 * npm run check-status B62qoJKYYHAvmLyxWjwgLxyJVHiqeRig6N7aZRpVdtPB5dR5tPtYMRG 5JvExHaCttT9va9qGkzaZg1ieLXDEpiDiu9VuaL4fYRr1vG5rhZg testnet-exim-dev
 */

import { Mina, PublicKey, Account, Field, UInt64, UInt32 } from 'o1js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

interface NetworkConfig {
    environment: string;
    minaEndpoint: string;
    archiveEndpoint: string;
}

interface DeploymentRecord {
    address: string;
    status: string;
    deployedAt: string;
    transactionHash: string;
    alias: string;
    oracle: string;
    contractName: string;
    verificationKey?: {
        hash: string;
    };
}

interface AccountInfo {
    publicKey: string;
    balance: string;
    nonce: number;
    exists: boolean;
    isZkApp: boolean;
    verificationKey?: string;
    zkAppState?: string[];
    zkAppVersion?: string;
    actionState?: string[];
    lastActionSlot?: string;
    provedState?: boolean;
    zkappUri?: string;
}

interface TransactionInfo {
    hash: string;
    status: 'PENDING' | 'INCLUDED' | 'FAILED' | 'UNKNOWN';
    blockHeight?: number;
    confirmations?: number;
}

interface StatusCheckResult {
    account: AccountInfo;
    transaction?: TransactionInfo;
    deploymentRecord?: DeploymentRecord;
    networkInfo: {
        environment: string;
        endpoint: string;
        blockHeight?: number;
        connectivity: boolean;
        error?: string;
    };
    verificationStatus: {
        addressExists: boolean;
        isValidZkApp: boolean;
        transactionConfirmed?: boolean;
        configMatches?: boolean;
    };
}

class DeploymentStatusChecker {
    private network: ReturnType<typeof Mina.Network>;
    private networkConfig: NetworkConfig;

    constructor(networkConfig: NetworkConfig) {
        this.networkConfig = networkConfig;
        this.network = Mina.Network({
            mina: networkConfig.minaEndpoint,
            archive: networkConfig.archiveEndpoint
        });
        Mina.setActiveInstance(this.network);
    }

    /**
     * Load network configuration from environment config file
     */
    static loadNetworkConfig(environment: string = 'testnet'): NetworkConfig {
        try {
            const __filename = fileURLToPath(import.meta.url);
            const __dirname = dirname(__filename);
            const configPath = join(__dirname, '..', '..', 'config', 'environments', `${environment}.json`);
            const config = JSON.parse(readFileSync(configPath, 'utf8'));
            
            return {
                environment: config.network.environment,
                minaEndpoint: config.network.minaEndpoint,
                archiveEndpoint: config.network.archiveEndpoint
            };
        } catch (error) {
            console.warn(`⚠️  Could not load ${environment} config, using default testnet endpoints`);
            return {
                environment: 'TESTNET',
                minaEndpoint: 'https://api.minascan.io/node/devnet/v1/graphql',
                archiveEndpoint: 'https://archive.devnet.minaexplorer.com'
            };
        }
    }

    /**
     * Try multiple devnet endpoints to find a working one
     */
    static async findWorkingEndpoint(): Promise<NetworkConfig> {
        const endpoints = [
            {
                environment: 'TESTNET',
                minaEndpoint: 'https://api.minascan.io/node/devnet/v1/graphql',
                archiveEndpoint: 'https://archive.devnet.minaexplorer.com'
            },
            {
                environment: 'TESTNET', 
                minaEndpoint: 'https://devnet.graphql.minaexplorer.com/',
                archiveEndpoint: 'https://devnet.graphql.minaexplorer.com/'
            },
            {
                environment: 'TESTNET',
                minaEndpoint: 'https://proxy.devnet.minaexplorer.com/graphql',
                archiveEndpoint: 'https://proxy.devnet.minaexplorer.com/graphql'
            }
        ];

        console.log(`🔍 Testing multiple devnet endpoints...`);
        
        for (const config of endpoints) {
            console.log(`⚙️  Trying endpoint: ${config.minaEndpoint}`);
            try {
                const testNetwork = Mina.Network({
                    mina: config.minaEndpoint,
                    archive: config.archiveEndpoint
                });
                Mina.setActiveInstance(testNetwork);
                
                // Test with a simple query
                const testAccount = PublicKey.fromBase58('B62qiy32p8kAKnny8ZFwoMhYpBppM1DWVCqAPBYNcXnsAHhnfAAuXgg');
                await testNetwork.getAccount(testAccount);
                
                console.log(`✅ Endpoint working: ${config.minaEndpoint}`);
                return config;
            } catch (error) {
                console.log(`❌ Endpoint failed: ${config.minaEndpoint}`);
                continue;
            }
        }
        
        console.log(`⚠️  All endpoints failed, using default config`);
        return DeploymentStatusChecker.loadNetworkConfig('testnet');
    }

    /**
     * Load deployment record from config if alias is provided
     */
    static loadDeploymentRecord(alias?: string, environment: string = 'testnet'): DeploymentRecord | undefined {
        if (!alias) return undefined;

        try {
            const __filename = fileURLToPath(import.meta.url);
            const __dirname = dirname(__filename);
            const configPath = join(__dirname, '..', '..', 'config', 'environments', `${environment}.json`);
            const config = JSON.parse(readFileSync(configPath, 'utf8'));
            
            // Search through all contracts in deployments
            const deployments = config.deployments?.contracts || {};
            for (const [contractName, deployment] of Object.entries(deployments)) {
                if ((deployment as any).alias === alias) {
                    return deployment as DeploymentRecord;
                }
            }
            
            console.warn(`⚠️  No deployment record found for alias: ${alias}`);
            return undefined;
        } catch (error) {
            console.warn(`⚠️  Could not load deployment records: ${error}`);
            return undefined;
        }
    }

    /**
     * Get account information from the blockchain
     */
    async getAccountInfo(address: string): Promise<AccountInfo> {
        try {
            console.log(`📝 Querying account: ${address}`);
            const publicKey = PublicKey.fromBase58(address);
            console.log(`✅ Valid public key format`);
            
            const account = await this.network.getAccount(publicKey);
            console.log(`✅ Account data retrieved from network`);
            
            const accountInfo: AccountInfo = {
                publicKey: address,
                balance: account.balance.toString(),
                nonce: Number(account.nonce.toString()),
                exists: true,
                isZkApp: false
            };

            console.log(`💰 Account balance: ${accountInfo.balance} MINA`);
            console.log(`🔢 Account nonce: ${accountInfo.nonce}`);

            // Check if it's a zkApp by looking for verification key
            if (account.zkapp && account.zkapp.verificationKey) {
                accountInfo.isZkApp = true;
                accountInfo.verificationKey = account.zkapp.verificationKey.hash.toString();
                console.log(`✅ zkApp detected with verification key`);
                
                // Get zkApp state if available
                if (account.zkapp.appState) {
                    accountInfo.zkAppState = account.zkapp.appState.map((field: Field) => field.toString());
                    console.log(`📊 zkApp state: ${accountInfo.zkAppState.length} fields`);
                }
                
                // Get additional zkApp properties
                if (account.zkapp.zkappVersion) {
                    accountInfo.zkAppVersion = account.zkapp.zkappVersion.toString();
                    console.log(`🔖 zkApp version: ${accountInfo.zkAppVersion}`);
                }
                
                if (account.zkapp.actionState) {
                    accountInfo.actionState = account.zkapp.actionState.map((field: Field) => field.toString());
                    console.log(`⚙️ Action state: ${accountInfo.actionState.length} fields`);
                }
                
                if (account.zkapp.lastActionSlot) {
                    accountInfo.lastActionSlot = account.zkapp.lastActionSlot.toString();
                    console.log(`🕒 Last action slot: ${accountInfo.lastActionSlot}`);
                }
                
                if (account.zkapp.provedState) {
                    accountInfo.provedState = account.zkapp.provedState.toBoolean();
                    console.log(`🔐 Proved state: ${accountInfo.provedState}`);
                }
                
                if (account.zkapp.zkappUri) {
                    accountInfo.zkappUri = account.zkapp.zkappUri;
                    console.log(`🔗 zkApp URI: ${accountInfo.zkappUri}`);
                }
            } else {
                console.log(`❌ No zkApp data found (not a smart contract)`);
            }

            return accountInfo;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.log(`❌ Account fetch failed: ${errorMessage}`);
            console.log(`⚠️  This could mean:`);
            console.log(`   - Account doesn't exist on the network`);
            console.log(`   - Network connectivity issues`);
            console.log(`   - Wrong network endpoint`);
            console.log(`   - Account hasn't been funded yet`);
            
            // Account doesn't exist or other error
            return {
                publicKey: address,
                balance: '0',
                nonce: 0,
                exists: false,
                isZkApp: false
            };
        }
    }

    /**
     * Get transaction information (simplified version - in real implementation would query archive)
     */
    async getTransactionInfo(txHash?: string): Promise<TransactionInfo | undefined> {
        if (!txHash) return undefined;

        try {
            // In a real implementation, you would query the archive endpoint
            // For now, we'll return a basic structure
            return {
                hash: txHash,
                status: 'UNKNOWN' // Would need to implement actual archive querying
            };
        } catch (error) {
            console.warn(`⚠️  Could not retrieve transaction info: ${error}`);
            return {
                hash: txHash,
                status: 'UNKNOWN'
            };
        }
    }

    /**
     * Get current network block height and test connectivity
     */
    async getNetworkInfo(): Promise<{ blockHeight?: number; networkId?: string; chainId?: string; connectivity: boolean; error?: string }> {
        try {
            console.log(`🌐 Testing connectivity to: ${this.networkConfig.minaEndpoint}`);
            
            // Test basic connectivity by trying to get network status
            // Try multiple known accounts to verify devnet availability
            const testAccounts = [
                'B62qiy32p8kAKnny8ZFwoMhYpBppM1DWVCqAPBYNcXnsAHhnfAAuXgg', // Genesis account
                'B62qre3erTHfzQckNuibViWQGyyKwZseztqrjPZBv6SQF384Rg6ESAy', // Another known account
                'B62qrPN5Y5yq8kGE3FbVKbGTdTAJNdtNtB5sNVpxyRwWGcDEhpMzc8g'  // Another test account
            ];
            
            let connectivityTest = false;
            let lastError = '';
            
            for (const testAccountAddress of testAccounts) {
                try {
                    const testAccount = PublicKey.fromBase58(testAccountAddress);
                    const account = await this.network.getAccount(testAccount);
                    console.log(`✅ Successfully queried account: ${testAccountAddress}`);
                    console.log(`✅ Network connectivity confirmed`);
                    console.log(`✅ Connected to Mina ${this.networkConfig.environment}`);
                    connectivityTest = true;
                    break;
                } catch (accountError) {
                    const errorMessage = accountError instanceof Error ? accountError.message : String(accountError);
                    lastError = errorMessage;
                    console.log(`⚠️  Account ${testAccountAddress} not found: ${errorMessage}`);
                    continue;
                }
            }
            
            if (!connectivityTest) {
                console.log(`❌ All test accounts failed - Devnet might be down or reset`);
                console.log(`⚠️  This suggests:`);
                console.log(`   - Devnet is temporarily unavailable`);
                console.log(`   - Devnet was recently reset (all accounts wiped)`);
                console.log(`   - GraphQL endpoint issues`);
                console.log(`   - Try checking https://minascan.io/devnet/ for devnet status`);
                return {
                    connectivity: false,
                    error: `All test accounts failed. Last error: ${lastError}`
                };
            }
            
            return {
                connectivity: true,
                networkId: this.networkConfig.environment
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.warn(`⚠️  Could not retrieve network info: ${errorMessage}`);
            return {
                connectivity: false,
                error: errorMessage
            };
        }
    }

    /**
     * Perform comprehensive status check
     */
    async checkStatus(address: string, txHash?: string, alias?: string): Promise<StatusCheckResult> {
        console.log(`🔍 Checking deployment status for: ${address}`);
        console.log(`⏰ Check time: ${new Date().toISOString()}`);
        console.log(''.padEnd(80, '='));

        // Load deployment record if alias provided
        const deploymentRecord = DeploymentStatusChecker.loadDeploymentRecord(alias);
        
        // Get account information
        console.log('📋 Fetching account information...');
        const account = await this.getAccountInfo(address);
        
        // Get transaction information if hash provided
        let transaction: TransactionInfo | undefined;
        if (txHash) {
            console.log('📋 Fetching transaction information...');
            transaction = await this.getTransactionInfo(txHash);
        }

        // Get network information
        console.log('📋 Fetching network information...');
        const networkInfo = await this.getNetworkInfo();

        // Perform verification checks
        const verificationStatus = {
            addressExists: account.exists,
            isValidZkApp: account.isZkApp,
            transactionConfirmed: transaction?.status === 'INCLUDED',
            configMatches: this.verifyConfigMatch(account, deploymentRecord)
        };

        return {
            account,
            transaction,
            deploymentRecord,
            networkInfo: {
                environment: this.networkConfig.environment,
                endpoint: this.networkConfig.minaEndpoint,
                ...networkInfo
            },
            verificationStatus
        };
    }

    /**
     * Verify if account matches deployment record
     */
    private verifyConfigMatch(account: AccountInfo, deploymentRecord?: DeploymentRecord): boolean | undefined {
        if (!deploymentRecord) return undefined;
        
        const addressMatches = account.publicKey === deploymentRecord.address;
        const vkMatches = account.verificationKey === deploymentRecord.verificationKey?.hash;
        
        return addressMatches && (deploymentRecord.verificationKey ? vkMatches : true);
    }

    /**
     * Display formatted status report
     */
    displayStatus(result: StatusCheckResult): void {
        console.log('\n🎯 DEPLOYMENT STATUS REPORT');
        console.log(''.padEnd(60, '-'));

        // Account Status
        console.log('\n📍 Contract Account Status:');
        console.log(`   Address: ${result.account.publicKey}`);
        console.log(`   Exists: ${result.account.exists ? '✅' : '❌'}`);
        console.log(`   Balance: ${result.account.balance} MINA`);
        console.log(`   Nonce: ${result.account.nonce}`);
        console.log(`   Is zkApp: ${result.account.isZkApp ? '✅' : '❌'}`);
        
        if (result.account.isZkApp) {
            console.log(`   Verification Key: ${result.account.verificationKey}`);
            if (result.account.zkAppState && result.account.zkAppState.length > 0) {
                console.log(`   zkApp State: [${result.account.zkAppState.join(', ')}]`);
            }
            if (result.account.zkAppVersion) {
                console.log(`   zkApp Version: ${result.account.zkAppVersion}`);
            }
            if (result.account.provedState !== undefined) {
                console.log(`   Proved State: ${result.account.provedState ? '✅' : '❌'}`);
            }
            if (result.account.actionState && result.account.actionState.length > 0) {
                console.log(`   Action State: [${result.account.actionState.join(', ')}]`);
            }
            if (result.account.lastActionSlot) {
                console.log(`   Last Action Slot: ${result.account.lastActionSlot}`);
            }
            if (result.account.zkappUri) {
                console.log(`   zkApp URI: ${result.account.zkappUri}`);
            }
        }

        // Transaction Status
        if (result.transaction) {
            console.log('\n📡 Transaction Status:');
            console.log(`   Hash: ${result.transaction.hash}`);
            console.log(`   Status: ${result.transaction.status}`);
            if (result.transaction.blockHeight) {
                console.log(`   Block Height: ${result.transaction.blockHeight}`);
            }
            if (result.transaction.confirmations) {
                console.log(`   Confirmations: ${result.transaction.confirmations}`);
            }
        }

        // Deployment Record
        if (result.deploymentRecord) {
            console.log('\n📝 Deployment Record:');
            console.log(`   Alias: ${result.deploymentRecord.alias}`);
            console.log(`   Contract: ${result.deploymentRecord.contractName}`);
            console.log(`   Oracle: ${result.deploymentRecord.oracle}`);
            console.log(`   Deployed At: ${result.deploymentRecord.deployedAt}`);
            console.log(`   Status: ${result.deploymentRecord.status}`);
        }

        // Network Information
        console.log('\n🌐 Network Information:');
        console.log(`   Environment: ${result.networkInfo.environment}`);
        console.log(`   Endpoint: ${result.networkInfo.endpoint}`);
        console.log(`   Connectivity: ${result.networkInfo.connectivity ? '✅' : '❌'}`);
        if (result.networkInfo.error) {
            console.log(`   Error: ${result.networkInfo.error}`);
        }
        if (result.networkInfo.blockHeight) {
            console.log(`   Current Block: ${result.networkInfo.blockHeight}`);
        }

        // Verification Summary
        console.log('\n✅ Verification Summary:');
        console.log(`   Address Exists: ${result.verificationStatus.addressExists ? '✅' : '❌'}`);
        console.log(`   Valid zkApp: ${result.verificationStatus.isValidZkApp ? '✅' : '❌'}`);
        if (result.verificationStatus.transactionConfirmed !== undefined) {
            console.log(`   Transaction Confirmed: ${result.verificationStatus.transactionConfirmed ? '✅' : '❌'}`);
        }
        if (result.verificationStatus.configMatches !== undefined) {
            console.log(`   Config Matches: ${result.verificationStatus.configMatches ? '✅' : '❌'}`);
        }

        // zkApp Health Check
        if (result.account.isZkApp) {
            console.log('\n🔍 zkApp Health Check:');
            console.log(`   Has Verification Key: ${result.account.verificationKey ? '✅' : '❌'}`);
            console.log(`   State Initialized: ${result.account.zkAppState && result.account.zkAppState.length > 0 ? '✅' : '❌'}`);
            console.log(`   Proved State: ${result.account.provedState ? '✅' : result.account.provedState === false ? '❌' : '❓'}`);
            console.log(`   Has Version: ${result.account.zkAppVersion ? '✅' : '❌'}`);
            
            const zkAppHealthScore = [
                result.account.verificationKey ? 1 : 0,
                result.account.zkAppState && result.account.zkAppState.length > 0 ? 1 : 0,
                result.account.provedState ? 1 : 0,
                result.account.zkAppVersion ? 1 : 0
            ].reduce((a, b) => a + b, 0);
            
            const healthPercentage = (zkAppHealthScore / 4) * 100;
            console.log(`   Health Score: ${zkAppHealthScore}/4 (${healthPercentage}%)`);
        }

        // Overall Status
        const isHealthy = result.verificationStatus.addressExists && result.verificationStatus.isValidZkApp;
        console.log('\n🎉 OVERALL STATUS:');
        console.log(`   Deployment: ${isHealthy ? '✅ HEALTHY' : '❌ ISSUES DETECTED'}`);
        
        if (!isHealthy) {
            console.log('\n⚠️  Issues detected:');
            if (!result.verificationStatus.addressExists) {
                console.log('   - Contract address does not exist on the network');
                console.log('   💡 Possible causes:');
                console.log('     • Transaction is still pending confirmation');
                console.log('     • Transaction failed during deployment');
                console.log('     • Wrong network (check if deployed to mainnet vs devnet)');
                console.log('     • Account address is incorrect');
                console.log('     • Devnet reset occurred after deployment');
            }
            if (!result.verificationStatus.isValidZkApp) {
                console.log('   - Account is not a valid zkApp (missing verification key)');
                console.log('   💡 This suggests the account exists but is not a smart contract');
            }
        }

        // Blockchain Explorer Links
        const network = result.networkInfo.environment === 'TESTNET' ? 'devnet' : 'mainnet';
        console.log('\n🔗 Verification Links:');
        console.log(`   Contract: https://minascan.io/${network}/account/${result.account.publicKey}`);
        if (result.transaction) {
            console.log(`   Transaction: https://minascan.io/${network}/tx/${result.transaction.hash}`);
        }

        console.log(`\n⏰ Check completed at: ${new Date().toISOString()}`);
        console.log(''.padEnd(80, '='));
    }
}

/**
 * Main execution function
 */
async function main() {
    const contractAddress = process.argv[2];
    const transactionHash = process.argv[3];
    const alias = process.argv[4];

    if (!contractAddress) {
        console.error('❌ Usage: npm run check-status <contract-address> [transaction-hash] [alias]');
        console.error('');
        console.error('Examples:');
        console.error('  npm run check-status B62qoJKYYHAvmLyxWjwgLxyJVHiqeRig6N7aZRpVdtPB5dR5tPtYMRG');
        console.error('  npm run check-status B62qoJKYYHAvmLyxWjwgLxyJVHiqeRig6N7aZRpVdtPB5dR5tPtYMRG 5JvExHaCttT9va9qGkzaZg1ieLXDEpiDiu9VuaL4fYRr1vG5rhZg');
        console.error('  npm run check-status B62qoJKYYHAvmLyxWjwgLxyJVHiqeRig6N7aZRpVdtPB5dR5tPtYMRG 5JvExHaCttT9va9qGkzaZg1ieLXDEpiDiu9VuaL4fYRr1vG5rhZg testnet-exim-dev');
        process.exit(1);
    }

    try {
        // Find a working devnet endpoint
        console.log('🔧 Finding working devnet endpoint...');
        const networkConfig = await DeploymentStatusChecker.findWorkingEndpoint();
        console.log(`✅ Using endpoint: ${networkConfig.minaEndpoint}`);
        
        // Create status checker
        const checker = new DeploymentStatusChecker(networkConfig);
        
        // Perform status check
        const result = await checker.checkStatus(contractAddress, transactionHash, alias);
        
        // Display results
        checker.displayStatus(result);
        
        // Exit with appropriate code
        const isHealthy = result.verificationStatus.addressExists && result.verificationStatus.isValidZkApp;
        process.exit(isHealthy ? 0 : 1);
        
    } catch (error) {
        console.error('❌ Error checking deployment status:', error);
        process.exit(1);
    }
}

// Run main function
main().catch(console.error);

export { DeploymentStatusChecker, type StatusCheckResult };