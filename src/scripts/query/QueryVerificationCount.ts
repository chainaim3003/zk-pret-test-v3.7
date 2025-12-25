// import * as dotenv from 'dotenv';
// dotenv.config();

// import { Field, Mina, fetchAccount, PublicKey, CircuitString } from 'o1js';
// import { 
//     CorporateRegistrationMultiSmartContract
// } from '../../contracts/complaince/CorpReg/CorporateRegistrationMultiSmartContract.js';
// import { 
//   initializeOracleRegistry, 
//   environmentManager 
// } from '../../infrastructure/index.js';

// async function main() {
//   const args = process.argv.slice(2);
  
//   if (args.length === 0) {
//     console.log('❌ Company name or CIN is required\n');
//     console.log('Usage:');
//     console.log('  npm run build');
//     console.log('  node build/scripts/query/QueryCorporateVerificationCount.js "COMPANY_NAME"\n');
//     console.log('Examples:');
//     console.log('  node build/scripts/query/QueryCorporateVerificationCount.js "U01112TZ2022PTC039493"');
//     console.log('  node build/scripts/query/QueryCorporateVerificationCount.js "SREE PALANI ANDAVAR AGROS"');
//     process.exit(1);
//   }
  
//   const companyIdentifier = args.join(' ').trim();
  
//   console.log('\n' + '='.repeat(80));
//   console.log('📊 Corporate Registration Verification Query');
//   console.log('='.repeat(80) + '\n');
  
//   try {
//     // Initialize
//     console.log('⚙️  Initializing...');
//     await initializeOracleRegistry();
    
//     const currentEnv = environmentManager.getCurrentEnvironment();
//     console.log(`   Environment: ${currentEnv}`);
    
//     // Connect to network
//     const shouldConnectToDevnet = environmentManager.shouldConnectToDevnet();
//     if (shouldConnectToDevnet) {
//       const Berkeley = Mina.Network({
//         mina: process.env.MINA_GRAPHQL_ENDPOINT || 'https://api.minascan.io/node/devnet/v1/graphql',
//         archive: process.env.MINA_ARCHIVE_ENDPOINT || 'https://api.minascan.io/archive/devnet/v1/graphql'
//       });
//       Mina.setActiveInstance(Berkeley);
//       console.log('   ✓ Connected to Berkeley Devnet\n');
//     }
    
//     // Discover contract address
//     console.log('🔍 Discovering Contract...');
//     let contractAddress = await environmentManager.getDeployedContractAddress(
//       'CorporateRegistrationMultiSmartContract'
//     );
    
//     if (!contractAddress) {
//       contractAddress = await environmentManager.getDeployedContractAddress(
//         'CoporateRegistrationMultiSmartContract'
//       );
//     }
    
//     if (!contractAddress) {
//       throw new Error('Corporate Registration contract not found in config');
//     }
    
//     console.log(`   Contract: ${contractAddress}`);
//     console.log(`   Source: config/environments/testnet.json\n`);
    
//     const contractPubKey = PublicKey.fromBase58(contractAddress);
//     const zkApp = new CorporateRegistrationMultiSmartContract(contractPubKey);
    
//     // Fetch account to get on-chain state
//     console.log('📡 Fetching On-Chain Data...');
    
//     try {
//       // Use fetchAccount which returns account info or error
//       const accountInfo = await fetchAccount({ publicKey: contractPubKey });
      
//       if (accountInfo.error) {
//         console.log('   ⚠️  Account not found on-chain\n');
//         console.log('📊 Contract Status:');
//         console.log('-'.repeat(80));
//         console.log('   Status: NOT DEPLOYED or NOT FUNDED');
//         console.log('   The contract exists in config but has no on-chain presence yet.\n');
        
//         console.log('💡 To deploy and use this contract:');
//         console.log('-'.repeat(80));
//         console.log(`   1. Run a verification to deploy the contract:`);
//         console.log(`      node build/impl/network/verifier/CorporateRegistrationNetworkMultiVerifier.js "${companyIdentifier}"\n`);
//         console.log(`   2. After deployment, this query will show verification counts\n`);
        
//         // Still show Minascan link
//         const minascanUrl = `https://minascan.io/devnet/account/${contractAddress}`;
//         console.log('🌐 Blockchain Explorer:');
//         console.log('-'.repeat(80));
//         console.log(`   ${minascanUrl}`);
//         console.log('   (Will show "Account not found" until first deployment)\n');
        
//         console.log('='.repeat(80));
//         console.log('ℹ️  Query Complete - Contract Not Yet Deployed');
//         console.log('='.repeat(80) + '\n');
//         return;
//       }
      
//       console.log('   ✓ Account fetched successfully\n');
      
//       // Get account details
//       const account = accountInfo.account;
      
//       // Get global statistics by reading state directly
//       console.log('📊 Global Statistics:');
//       console.log('-'.repeat(80));
      
//       try {
//         // Access state using get() method
//         const totalVerifications = zkApp.totalVerificationsGlobal.get();
//         const totalCompanies = zkApp.totalCompaniesTracked.get();
//         const compliantCount = zkApp.compliantCompaniesCount.get();
//         const lastVerificationTime = zkApp.lastVerificationTime.get();
        
//         console.log(`   Total Verifications: ${totalVerifications.toString()}`);
//         console.log(`   Companies Tracked: ${totalCompanies.toString()}`);
//         console.log(`   Compliant Companies: ${compliantCount.toString()}`);
        
//         const timestamp = Number(lastVerificationTime.toString());
//         if (timestamp > 0) {
//           console.log(`   Last Verification: ${new Date(timestamp).toISOString()}`);
//         } else {
//           console.log(`   Last Verification: No verifications yet`);
//         }
//       } catch (error) {
//         console.log('   ⚠️  Could not read all state fields');
//         console.log('   Contract may not be fully initialized yet');
//       }
      
//       // Account information
//       console.log('\n📋 Account Information:');
//       console.log('-'.repeat(80));
//       if (account) {
//         console.log(`   Balance: ${Number(account.balance) / 1e9} MINA`);
//         console.log(`   Nonce: ${account.nonce.toString()}`);
//         console.log(`   Receipt Chain Hash: ${account.receiptChainHash?.toString() || 'N/A'}`);
//       }
      
//     } catch (fetchError) {
//       console.log('   ⚠️  Could not fetch account\n');
//       console.log('📊 Contract Status:');
//       console.log('-'.repeat(80));
//       console.log('   Status: ERROR FETCHING');
//       console.log(`   Error: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}\n`);
      
//       // Show instructions anyway
//       console.log('💡 Possible Solutions:');
//       console.log('-'.repeat(80));
//       console.log(`   1. Deploy the contract by running verification:`);
//       console.log(`      node build/impl/network/verifier/CorporateRegistrationNetworkMultiVerifier.js "${companyIdentifier}"\n`);
//       console.log(`   2. Check if contract address is correct in config\n`);
//       console.log(`   3. Verify network connection to Berkeley Devnet\n`);
      
//       const minascanUrl = `https://minascan.io/devnet/account/${contractAddress}`;
//       console.log('🌐 Blockchain Explorer:');
//       console.log('-'.repeat(80));
//       console.log(`   ${minascanUrl}\n`);
      
//       console.log('='.repeat(80));
//       console.log('⚠️  Query Incomplete - See Errors Above');
//       console.log('='.repeat(80) + '\n');
//       return;
//     }
    
//     // Company-specific query
//     console.log('\n🏢 Company Query:');
//     console.log('-'.repeat(80));
//     console.log(`   Company: ${companyIdentifier}`);
    
//     const cinCircuitString = CircuitString.fromString(companyIdentifier);
//     const cinHash = cinCircuitString.hash();
//     console.log(`   CIN Hash: ${cinHash.toString()}`);
    
//     // Minascan link
//     const minascanUrl = `https://minascan.io/devnet/account/${contractAddress}`;
//     console.log('\n🌐 Blockchain Explorer:');
//     console.log('-'.repeat(80));
//     console.log(`   ${minascanUrl}`);
//     console.log('\n   View on Minascan to see:');
//     console.log('   • zkApp Transactions - All verification submissions');
//     console.log('   • Updates - State changes (verification count increments)');
//     console.log('   • Updated Accounts - Companies that were verified');
//     console.log('   • Fee - Cost per verification (0.1 MINA)');
//     console.log('   • Age - When each verification occurred');
//     console.log('   • Nonce - Transaction sequence number');
    
//     // Next steps
//     console.log('\n💡 Next Steps:');
//     console.log('-'.repeat(80));
//     console.log(`   To run verification and increment count:`);
//     console.log(`   node build/impl/network/verifier/CorporateRegistrationNetworkMultiVerifier.js "${companyIdentifier}"\n`);
    
//     console.log('='.repeat(80));
//     console.log('✅ Query Complete');
//     console.log('='.repeat(80) + '\n');
    
//   } catch (error) {
//     console.log('\n' + '='.repeat(80));
//     console.log('❌ Query Failed');
//     console.log('='.repeat(80));
//     console.error('\nError:', error instanceof Error ? error.message : String(error));
    
//     if (error instanceof Error && error.stack) {
//       console.log('\nStack trace:');
//       console.log(error.stack);
//     }
    
//     process.exit(1);
//   }
// }

// main().catch(error => {
//   console.error('Fatal error:', error);
//   process.exit(1);
// });




//------------------------------------------------------------------------------------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------------------------------------------------------------------------






/**
 * GLEIF/LEI Verification Query Tool
 * 
 * Query on-chain verification data by LEI or company name
 * 
 * Usage:
 *   node build/scripts/query/QueryGLEIFVerificationCount.js "LEI_CODE"
 *   node build/scripts/query/QueryGLEIFVerificationCount.js "COMPANY_NAME"
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { Field, Mina, fetchAccount, PublicKey, CircuitString } from 'o1js';
import { 
    GLEIFOptimMultiCompanySmartContract
} from '../../contracts/compliance/GLEIF/GLEIFMultiSmartContract.js';
import { 
  initializeOracleRegistry, 
  environmentManager 
} from '../../infrastructure/index.js';

async function main() {
  //const args = process.argv.slice(2);
  
//   if (args.length === 0) {
//     console.log('❌ LEI code or company name is required\n');
//     console.log('Usage:');
//     console.log('  npm run build');
//     console.log('  node build/scripts/query/QueryGLEIFVerificationCount.js "LEI_CODE"\n');
//     console.log('Examples:');
//     console.log('  node build/scripts/query/QueryGLEIFVerificationCount.js "335800QXF6MYTB8G8D82"');
//     console.log('  node build/scripts/query/QueryGLEIFVerificationCount.js "ANTHROPIC PBC"');
//     process.exit(1);
//   }
  
  //const identifier = args.join(' ').trim();
  
  console.log('\n' + '='.repeat(80));
  console.log('📊 GLEIF/LEI Verification Query');
  console.log('='.repeat(80) + '\n');
  
  try {
    // Initialize
    console.log('⚙️  Initializing...');
    await initializeOracleRegistry();
    
    const currentEnv = environmentManager.getCurrentEnvironment();
    console.log(`   Environment: ${currentEnv}`);
    
    // Connect to network
    const shouldConnectToDevnet = environmentManager.shouldConnectToDevnet();
    if (shouldConnectToDevnet) {
      const Berkeley = Mina.Network({
        mina: process.env.MINA_GRAPHQL_ENDPOINT || 'https://api.minascan.io/node/devnet/v1/graphql',
        archive: process.env.MINA_ARCHIVE_ENDPOINT || 'https://api.minascan.io/archive/devnet/v1/graphql'
      });
      Mina.setActiveInstance(Berkeley);
      console.log('   ✓ Connected to Berkeley Devnet\n');
    }
    
    // Discover contract address
    console.log('🔍 Discovering Contract...');
    let contractAddress = await environmentManager.getDeployedContractAddress(
      'GLEIFOptimMultiCompanySmartContract'
    );
    
    if (!contractAddress) {
      contractAddress = await environmentManager.getDeployedContractAddress(
        'GLEIFOptimMultiCompanySmartContract'
      );
    }
    
    if (!contractAddress) {
      throw new Error('GLEIF contract not found in config');
    }
    
    console.log(`   Contract: ${contractAddress}`);
    console.log(`   Source: config/environments/testnet.json\n`);
    
    const contractPubKey = PublicKey.fromBase58(contractAddress);
    const zkApp = new GLEIFOptimMultiCompanySmartContract(contractPubKey);
    
    // Fetch account to get on-chain state
    console.log('📡 Fetching On-Chain Data...');
    
    try {
      const accountInfo = await fetchAccount({ publicKey: contractPubKey });
      
      if (accountInfo.error) {
        console.log('   ⚠️  Account not found on-chain\n');
        console.log('📊 Contract Status:');
        console.log('-'.repeat(80));
        console.log('   Status: NOT DEPLOYED or NOT FUNDED');
        console.log('   The contract exists in config but has no on-chain presence yet.\n');
        
        console.log('💡 To deploy and use this contract:');
        console.log('-'.repeat(80));
        console.log(`   1. Run a verification to deploy the contract:`);
        //console.log(`      node build/impl/network/verifier/GLEIFNetworkMultiVerifier.js "${identifier}"\n`);
        console.log(`   2. After deployment, this query will show verification counts\n`);
        
        const minascanUrl = `https://minascan.io/devnet/account/${contractAddress}`;
        console.log('🌐 Blockchain Explorer:');
        console.log('-'.repeat(80));
        console.log(`   ${minascanUrl}`);
        console.log('   (Will show "Account not found" until first deployment)\n');
        
        console.log('='.repeat(80));
        console.log('ℹ️  Query Complete - Contract Not Yet Deployed');
        console.log('='.repeat(80) + '\n');
        return;
      }
      
      console.log('   ✓ Account fetched successfully\n');
      
      const account = accountInfo.account;
      
      // Get global statistics
      console.log('📊 Global Statistics:');
      console.log('-'.repeat(80));
      
      try {
        const totalVerifications = zkApp.totalVerificationsGlobal.get();
        const totalCompanies = zkApp.totalCompaniesTracked.get();
        const compliantCount = zkApp.compliantCompaniesCount.get();
        const lastVerificationTime = zkApp.lastVerificationTime.get();
        
        console.log(`   Total Verifications: ${totalVerifications.toString()}`);
        console.log(`   Companies Tracked: ${totalCompanies.toString()}`);
        console.log(`   Compliant Companies: ${compliantCount.toString()}`);
        
        const timestamp = Number(lastVerificationTime.toString());
        if (timestamp > 0) {
          console.log(`   Last Verification: ${new Date(timestamp).toISOString()}`);
        } else {
          console.log(`   Last Verification: No verifications yet`);
        }
      } catch (error) {
        console.log('   ⚠️  Could not read all state fields');
        console.log('   Contract may not be fully initialized yet');
      }
      
      // Account information
      console.log('\n📋 Account Information:');
      console.log('-'.repeat(80));
      if (account) {
        console.log(`   Balance: ${Number(account.balance) / 1e9} MINA`);
        console.log(`   Nonce: ${account.nonce.toString()}`);
      }
      
    } catch (fetchError) {
      console.log('   ⚠️  Could not fetch account\n');
      console.log('📊 Contract Status:');
      console.log('-'.repeat(80));
      console.log('   Status: ERROR FETCHING');
      console.log(`   Error: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}\n`);
      
      console.log('💡 Possible Solutions:');
      console.log('-'.repeat(80));
      console.log(`   1. Deploy the contract by running verification:`);
      //console.log(`      node build/impl/network/verifier/GLEIFNetworkMultiVerifier.js "${identifier}"\n`);
      console.log(`   2. Check if contract address is correct in config\n`);
      
      const minascanUrl = `https://minascan.io/devnet/account/${contractAddress}`;
      console.log('🌐 Blockchain Explorer:');
      console.log('-'.repeat(80));
      console.log(`   ${minascanUrl}\n`);
      
      console.log('='.repeat(80));
      console.log('⚠️  Query Incomplete - See Errors Above');
      console.log('='.repeat(80) + '\n');
      return;
    }
    
    // Entity-specific query
    console.log('\n🏢 LEI/Entity Query:');
    console.log('-'.repeat(80));
    // console.log(`   Identifier: ${identifier}`);
    
    // const idCircuitString = CircuitString.fromString(identifier);
    // const idHash = idCircuitString.hash();
    // console.log(`   LEI Hash: ${idHash.toString()}`);
    
    // Minascan link
    const minascanUrl = `https://minascan.io/devnet/account/${contractAddress}`;
    console.log('\n🌐 Blockchain Explorer:');
    console.log('-'.repeat(80));
    console.log(`   ${minascanUrl}`);
    console.log('\n   View on Minascan to see:');
    console.log('   • zkApp Transactions - All verification submissions');
    console.log('   • Updates - State changes (verification count increments)');
    console.log('   • Updated Accounts - Entities that were verified');
    console.log('   • Fee - Cost per verification (0.1 MINA)');
    console.log('   • Age - When each verification occurred');
    
    // Next steps
    console.log('\n💡 Next Steps:');
    console.log('-'.repeat(80));
    console.log(`   To run verification and increment count:`);
    //console.log(`   node build/impl/network/verifier/GLEIFNetworkMultiVerifier.js "${identifier}"\n`);
    
    console.log('='.repeat(80));
    console.log('✅ Query Complete');
    console.log('='.repeat(80) + '\n');
    
  } catch (error) {
    console.log('\n' + '='.repeat(80));
    console.log('❌ Query Failed');
    console.log('='.repeat(80));
    console.error('\nError:', error instanceof Error ? error.message : String(error));
    
    if (error instanceof Error && error.stack) {
      console.log('\nStack trace:');
      console.log(error.stack);
    }
    
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});