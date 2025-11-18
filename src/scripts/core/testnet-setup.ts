/**
 * Minimal Testnet Wallet Setup for Mina Protocol
 * Generates accounts, saves them, asks for funded account file
 */

import { PrivateKey, PublicKey, Mina } from 'o1js';
import * as fs from 'fs';
import * as path from 'path';
import { createInterface } from 'readline';

interface TestnetConfig {
    network: {
        environment: string;
        proofsEnabled: boolean;
        minaEndpoint: string;
        archiveEndpoint: string;
    };
    oracles: {
        registry: { [key: string]: any };
    };
    deployments: {
        contracts: { [key: string]: any };
    };
    gleifApiConfig: { [key: string]: any };
}

/**
 * Generate testnet accounts for all oracle roles
 */
function generateTestnetAccounts(): any[] {
    console.log('🔑 Generating testnet wallet accounts...');
    
    const accounts = [];
    const roles = ['MCA', 'GLEIF', 'EXIM', 'BPMN', 'RISK', 'BL_REGISTRY'];
    
    for (let i = 0; i < roles.length; i++) {
        const role = roles[i];
        
        // Generate deployer and sender accounts
        const deployerPrivateKey = PrivateKey.random();
        const senderPrivateKey = PrivateKey.random();
        
        accounts.push({
            role: role,
            deployer: {
                privateKey: deployerPrivateKey.toBase58(),
                publicKey: deployerPrivateKey.toPublicKey().toBase58(),
                index: i * 2
            },
            sender: {
                privateKey: senderPrivateKey.toBase58(),
                publicKey: senderPrivateKey.toPublicKey().toBase58(),
                index: i * 2 + 1
            }
        });
        
        console.log(`✅ Generated ${role} accounts:`);
        console.log(`   Deployer: ${deployerPrivateKey.toPublicKey().toBase58()}`);
        console.log(`   Sender: ${senderPrivateKey.toPublicKey().toBase58()}`);
    }
    
    return accounts;
}

/**
 * Save accounts to timestamped file
 */
function saveAccountsToFile(accounts: any[]): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `testnet-accounts-${timestamp}.json`;
    const filepath = path.join(process.cwd(), filename);
    
    fs.writeFileSync(filepath, JSON.stringify(accounts, null, 2));
    console.log(`📄 Accounts saved to: ${filename}`);
    
    return filepath;
}

/**
 * Display funding instructions
 */
function displayFundingInstructions(accounts: any[]) {
    console.log('\n💰 MANUAL FUNDING REQUIRED');
    console.log('='.repeat(50));
    console.log('\n📋 Fund these 12 addresses using:');
    console.log('   1. Web Faucet: https://faucet.minaprotocol.com/');
    console.log('   2. Discord: #testnet-faucet channel with: $request <address>');
    
    console.log('\n🏦 Addresses to fund:');
    accounts.forEach((account, index) => {
        console.log(`   ${index * 2 + 1}. ${account.role} Deployer: ${account.deployer.publicKey}`);
        console.log(`   ${index * 2 + 2}. ${account.role} Sender: ${account.sender.publicKey}`);
    });
}

/**
 * Ask user for funded accounts file
 */
function askForFundedAccountsFile(): Promise<string> {
    const rl = createInterface({
        input: process.stdin,
        output: process.stdout
    });
    
    return new Promise((resolve) => {
        rl.question('\n📁 Enter path to funded accounts file (or press Enter to use current file): ', (answer) => {
            rl.close();
            resolve(answer.trim());
        });
    });
}

/**
 * Load accounts from file
 */
function loadAccountsFromFile(filepath: string): any[] {
    if (!fs.existsSync(filepath)) {
        throw new Error(`File not found: ${filepath}`);
    }
    
    const content = fs.readFileSync(filepath, 'utf8');
    return JSON.parse(content);
}

/**
 * Check if accounts are funded
 */
async function checkAccountFunding(accounts: any[]): Promise<boolean> {
    console.log('\n🔍 Checking account funding...');
    
    try {
        // Connect to testnet
        const Testnet = Mina.Network('https://proxy.berkeley.minaexplorer.com/graphql');
        Mina.setActiveInstance(Testnet);
        
        let fundedCount = 0;
        
        for (const account of accounts) {
            try {
                // Check deployer
                await Mina.getAccount(PublicKey.fromBase58(account.deployer.publicKey));
                console.log(`✅ ${account.role} Deployer: Funded`);
                fundedCount++;
                
                // Check sender
                await Mina.getAccount(PublicKey.fromBase58(account.sender.publicKey));
                console.log(`✅ ${account.role} Sender: Funded`);
                fundedCount++;
            } catch (error) {
                console.log(`⏳ ${account.role}: Not funded or pending`);
            }
        }
        
        const allFunded = fundedCount === accounts.length * 2;
        console.log(`\n💰 Funding Status: ${fundedCount}/${accounts.length * 2} accounts funded`);
        
        return allFunded;
    } catch (error) {
        console.warn('⚠️ Could not check funding status, proceeding anyway...');
        return true; // Proceed if we can't check
    }
}

/**
 * Create testnet configuration
 */
function createTestnetConfig(accounts: any[]): TestnetConfig {
    const config: TestnetConfig = {
        network: {
            environment: "TESTNET",
            proofsEnabled: true,
            minaEndpoint: "https://proxy.berkeley.minaexplorer.com/graphql",
            archiveEndpoint: "https://archive.berkeley.minaexplorer.com"
        },
        oracles: {
            registry: {}
        },
        deployments: {
            contracts: {}
        },
        gleifApiConfig: {}
    };
    
    // Add oracle accounts to config
    accounts.forEach(account => {
        config.oracles.registry[account.role] = {
            publicKey: account.deployer.publicKey,
            privateKey: account.deployer.privateKey,
            role: `${account.role}_ORACLE`,
            deployerAccountIndex: account.deployer.index,
            senderAccountIndex: account.sender.index
        };
    });
    
    return config;
}

/**
 * Save testnet configuration
 */
function saveTestnetConfig(config: TestnetConfig): string {
    const configPath = path.join(process.cwd(), 'config', 'environments', 'testnet.json');
    
    // Ensure directory exists
    const dir = path.dirname(configPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    
    // Write config file
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log(`📄 Testnet configuration saved to: ${configPath}`);
    
    return configPath;
}

/**
 * Main setup function
 */
async function main() {
    try {
        console.log('🔧 Minimal Testnet Wallet Setup');
        console.log('================================\n');
        
        // Step 1: Generate accounts and save immediately
        const accounts = generateTestnetAccounts();
        const accountsFile = saveAccountsToFile(accounts);
        
        // Step 2: Display funding instructions
        displayFundingInstructions(accounts);
        
        // Step 3: Ask for funded accounts file
        const fundedFile = await askForFundedAccountsFile();
        const finalAccountsFile = fundedFile || accountsFile;
        
        // Step 4: Load accounts from specified file
        console.log(`\n📂 Loading accounts from: ${finalAccountsFile}`);
        const finalAccounts = loadAccountsFromFile(finalAccountsFile);
        
        // Step 5: Check funding
        const isFunded = await checkAccountFunding(finalAccounts);
        if (!isFunded) {
            console.log('\n⚠️ Not all accounts are funded, but proceeding...');
        }
        
        // Step 6: Create and save testnet config
        const config = createTestnetConfig(finalAccounts);
        const configPath = saveTestnetConfig(config);
        
        // Step 7: Display completion
        console.log('\n🎉 TESTNET SETUP COMPLETED');
        console.log('==========================');
        console.log(`✅ Configuration: ${configPath}`);
        console.log(`✅ Accounts: ${finalAccounts.length} oracles configured`);
        
        console.log('\n📋 Next Steps:');
        console.log('  1. Set BUILD_ENV=TESTNET in .env file');
        console.log('  2. Run: npm run force-precompile');
        console.log('  3. Run: npm run build');
        console.log('  4. Execute testnet test');
        
    } catch (error) {
        console.error('\n❌ Setup failed:', error instanceof Error ? error.message : String(error));
        process.exit(1);
    }
}

// Run the main function
main().catch(console.error);

export { generateTestnetAccounts, createTestnetConfig, saveTestnetConfig };
