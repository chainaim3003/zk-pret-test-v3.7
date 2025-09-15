/**
 * Devnet Account Funding Checker
 * Reliably checks if accounts are funded on Mina Devnet
 * Uses direct GraphQL queries to bypass o1js compatibility issues
 */

import * as fs from 'fs';
import * as path from 'path';

interface Account {
    role: string;
    deployer: {
        privateKey: string;
        publicKey: string;
        index: number;
    };
    sender: {
        privateKey: string;
        publicKey: string;
        index: number;
    };
}

interface AccountBalance {
    funded: boolean;
    balance?: string;
    error?: string;
}

/**
 * Check account balance using direct GraphQL query
 */
async function checkAccountBalance(publicKey: string): Promise<AccountBalance> {
    try {
        const query = `
            query {
                account(publicKey: "${publicKey}") {
                    balance {
                        total
                    }
                    nonce
                }
            }
        `;
        
        const response = await fetch('https://api.minascan.io/node/devnet/v1/graphql', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query }),
        });
        
        if (!response.ok) {
            return { funded: false, error: `HTTP ${response.status}: ${response.statusText}` };
        }
        
        const data = await response.json();
        
        if (data.errors) {
            return { funded: false, error: data.errors[0]?.message || 'GraphQL error' };
        }
        
        if (!data.data?.account) {
            return { funded: false, error: 'Account not found' };
        }
        
        const balanceNano = data.data.account.balance.total;
        const balanceMina = (parseInt(balanceNano) / 1e9).toFixed(4);
        
        return { 
            funded: true, 
            balance: balanceMina 
        };
        
    } catch (error) {
        return { 
            funded: false, 
            error: error instanceof Error ? error.message : String(error) 
        };
    }
}

/**
 * Check funding for all accounts
 */
async function checkAllAccounts(accounts: Account[]): Promise<void> {
    console.log('🔗 Using Devnet GraphQL: https://api.minascan.io/node/devnet/v1/graphql');
    console.log(`🔍 Checking funding for ${accounts.length * 2} accounts...\n`);
    
    let fundedCount = 0;
    let totalBalance = 0;
    const results: Array<{ role: string; type: string; address: string; funded: boolean; balance?: string }> = [];
    
    for (const account of accounts) {
        console.log(`📋 ${account.role} Accounts:`);
        
        // Check deployer
        const deployerResult = await checkAccountBalance(account.deployer.publicKey);
        const deployerLabel = `  Deployer`;
        
        if (deployerResult.funded) {
            console.log(`✅ ${deployerLabel}: ${deployerResult.balance} MINA`);
            fundedCount++;
            totalBalance += parseFloat(deployerResult.balance || '0');
        } else {
            console.log(`❌ ${deployerLabel}: ${deployerResult.error}`);
        }
        
        results.push({
            role: account.role,
            type: 'Deployer',
            address: account.deployer.publicKey,
            funded: deployerResult.funded,
            balance: deployerResult.balance
        });
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Check sender
        const senderResult = await checkAccountBalance(account.sender.publicKey);
        const senderLabel = `  Sender`;
        
        if (senderResult.funded) {
            console.log(`✅ ${senderLabel}: ${senderResult.balance} MINA`);
            fundedCount++;
            totalBalance += parseFloat(senderResult.balance || '0');
        } else {
            console.log(`❌ ${senderLabel}: ${senderResult.error}`);
        }
        
        results.push({
            role: account.role,
            type: 'Sender',
            address: account.sender.publicKey,
            funded: senderResult.funded,
            balance: senderResult.balance
        });
        
        console.log(''); // Empty line between roles
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Summary
    console.log('📊 FUNDING SUMMARY');
    console.log('==================');
    console.log(`✅ Funded accounts: ${fundedCount}/${accounts.length * 2}`);
    console.log(`💰 Total balance: ${totalBalance.toFixed(4)} MINA`);
    console.log(`📈 Funding percentage: ${((fundedCount / (accounts.length * 2)) * 100).toFixed(1)}%`);
    
    // Show unfunded accounts
    const unfunded = results.filter(r => !r.funded);
    if (unfunded.length > 0) {
        console.log(`\n❌ UNFUNDED ACCOUNTS (${unfunded.length}):`);
        unfunded.forEach(account => {
            console.log(`   ${account.role} ${account.type}: ${account.address}`);
        });
        
        console.log('\n💡 To fund these accounts:');
        console.log('   1. Web Faucet: https://faucet.minaprotocol.com/ (select Devnet)');
        console.log('   2. Discord: #testnet-faucet channel with: $request <address>');
        console.log('   3. Explorer: https://minascan.io/devnet/');
    }
    
    if (fundedCount === accounts.length * 2) {
        console.log('\n🎉 All accounts are funded and ready for zkApp development!');
    }
}

/**
 * Load accounts from file
 */
function loadAccountsFromFile(filepath: string): Account[] {
    if (!fs.existsSync(filepath)) {
        throw new Error(`File not found: ${filepath}`);
    }
    
    console.log(`📂 Loading accounts from: ${path.basename(filepath)}`);
    const content = fs.readFileSync(filepath, 'utf8');
    const accounts = JSON.parse(content);
    
    console.log(`📋 Found ${accounts.length} oracle roles with ${accounts.length * 2} accounts total`);
    return accounts;
}

/**
 * Find latest accounts file
 */
function findLatestAccountsFile(): string | null {
    const files = fs.readdirSync(process.cwd())
        .filter(file => file.startsWith('testnet-accounts-') && file.endsWith('.json'))
        .sort()
        .reverse();
    
    return files.length > 0 ? files[0] : null;
}

/**
 * Main function
 */
async function main() {
    try {
        console.log('🔍 Devnet Account Funding Checker');
        console.log('===================================\n');
        
        // Get file path
        let filepath = process.argv[2];
        
        if (!filepath) {
            const latestFile = findLatestAccountsFile();
            if (latestFile) {
                filepath = latestFile;
                console.log(`📄 No file specified, using latest: ${latestFile}`);
            } else {
                console.error('❌ No accounts file found!');
                console.log('\nUsage:');
                console.log('  npm run check:funding');
                console.log('  npm run check:funding-direct <accounts-file.json>');
                console.log('  ./check-funding.sh <accounts-file.json>');
                process.exit(1);
            }
        }
        
        // Load and check accounts
        const accounts = loadAccountsFromFile(filepath);
        await checkAllAccounts(accounts);
        
    } catch (error) {
        console.error('\n❌ Error:', error instanceof Error ? error.message : String(error));
        process.exit(1);
    }
}

main().catch(console.error);
