/**
 * Generate New DEVNET Accounts and Update Config
 * Creates valid keypairs for DEVNET funding
 * Generates SEPARATE deployer and sender accounts
 */

import { PrivateKey, PublicKey } from 'o1js';
import { writeFileSync } from 'fs';

console.log('🔧 GENERATING NEW DEVNET ACCOUNTS');
console.log('=================================');

// Generate accounts for each Oracle type
const oracleTypes = ['MCA', 'GLEIF', 'EXIM', 'BPMN', 'RISK', 'BL_REGISTRY'];
const newAccounts = [];

for (let i = 0; i < oracleTypes.length; i++) {
  // Generate SEPARATE deployer and sender keypairs
  const deployerPrivateKey = PrivateKey.random();
  const deployerPublicKey = deployerPrivateKey.toPublicKey();
  
  const senderPrivateKey = PrivateKey.random();
  const senderPublicKey = senderPrivateKey.toPublicKey();
  
  const oracleAccount = {
    type: oracleTypes[i],
    role: `${oracleTypes[i]}_ORACLE`,
    deployer: {
      privateKey: deployerPrivateKey.toBase58(),
      publicKey: deployerPublicKey.toBase58(),
      index: i * 2  // 0, 2, 4, 6, 8, 10
    },
    sender: {
      privateKey: senderPrivateKey.toBase58(),
      publicKey: senderPublicKey.toBase58(),
      index: i * 2 + 1  // 1, 3, 5, 7, 9, 11
    }
  };
  
  newAccounts.push(oracleAccount);
  
  console.log(`✅ ${oracleTypes[i]}:`);
  console.log(`   Deployer: ${deployerPublicKey.toBase58()}`);
  console.log(`   Sender:   ${senderPublicKey.toBase58()}`);
  console.log('');
}

// Create updated testnet.json in the NEW format expected by funding checker
const updatedConfig = {
  "network": {
    "environment": "TESTNET",
    "proofsEnabled": true,
    "minaEndpoint": "https://api.minascan.io/node/devnet/v1/graphql",
    "archiveEndpoint": "https://archive.devnet.minaexplorer.com"
  },
  "oracles": {
    "registry": {} as Record<string, any>
  },
  "deployments": {
    "contracts": {}
  },
  "gleifApiConfig": {}
};

// Add accounts in the format expected by check-funding.ts
for (const account of newAccounts) {
  (updatedConfig.oracles.registry as Record<string, any>)[account.type] = {
    role: account.role,
    deployer: account.deployer,
    sender: account.sender,
    // Legacy format for backward compatibility
    publicKey: account.deployer.publicKey,
    privateKey: account.deployer.privateKey,
    deployerAccountIndex: account.deployer.index,
    senderAccountIndex: account.sender.index
  };
}

// Generate timestamp for filename
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const configPath = `./config/environments/testnet-${timestamp}.json`;
const latestConfigPath = './config/environments/testnet-new.json';

// Add metadata to config
const configWithMetadata = {
  ...updatedConfig,
  metadata: {
    generated: new Date().toISOString(),
    timestamp: timestamp,
    accountCount: newAccounts.length * 2, // deployer + sender per oracle
    oracleTypes: oracleTypes,
    version: "3.6",
    separateAccounts: true
  }
};

// Save timestamped config
writeFileSync(configPath, JSON.stringify(configWithMetadata, null, 2));

// Also save as latest (for compatibility)
writeFileSync(latestConfigPath, JSON.stringify(configWithMetadata, null, 2));

console.log('\\n📁 CONFIGS SAVED:');
console.log(`   📄 Timestamped: ${configPath}`);
console.log(`   📄 Latest: ${latestConfigPath}`);
console.log('\\n🚰 ACCOUNTS TO FUND (12 TOTAL):');
console.log('================================');

let accountNumber = 1;
newAccounts.forEach(account => {
  console.log(`${accountNumber}. ${account.type} Deployer: ${account.deployer.publicKey}`);
  console.log(`${accountNumber + 1}. ${account.type} Sender:   ${account.sender.publicKey}`);
  accountNumber += 2;
});

console.log('\\n🌐 FUNDING STEPS:');
console.log('1. Visit: https://faucet.minaprotocol.com/');
console.log('2. Select "Devnet"');
console.log('3. Fund ALL 12 accounts above (10 MINA each)');
console.log('4. Check funding: npm run build && node build/check-funding.js testnet-new.json');
console.log('\\n💰 Total funding needed: 12 accounts × 10 MINA = 120 tMINA');
