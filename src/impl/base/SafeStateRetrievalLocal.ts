/**
 * SafeStateRetrievalLocal.ts - LOCAL Blockchain Safe State Retrieval
 * 
 * This is a simplified version for LOCAL blockchain testing that doesn't need
 * the complex retry logic required for DEVNET/TESTNET environments.
 */

import { PublicKey } from 'o1js';

/**
 * Simple state retrieval for LOCAL blockchain (no retry needed)
 * Local blockchains are synchronous and don't have propagation delays
 */
export async function safeLogSmartContractStateLocal(
    zkApp: any,
    zkAppAddress: PublicKey,
    phase: string = 'BEFORE'
): Promise<any> {
    console.log(`\n🔍 ${phase === 'BEFORE' ? 'Smart Contract State BEFORE Verification:' : phase === 'AFTER' ? 'Contract state AFTER verification:' : 'Fetching contract state...'}`);
    
    try {
        // For LOCAL blockchain, we can directly call getRegistryInfo without retry logic
        const state = zkApp.getRegistryInfo();
        
        // Calculate compliance percentage
        const totalCompanies = Number(state.totalCompaniesTracked.toString());
        const compliantCompanies = Number(state.compliantCompaniesCount.toString());
        const compliancePercentage = totalCompanies > 0 ? Math.round((compliantCompanies / totalCompanies) * 100) : 0;
        
        console.log(`  Total Companies: ${totalCompanies}`);
        console.log(`  Compliant Companies: ${compliantCompanies}`);
        console.log(`  Global Compliance Score: ${compliancePercentage}%`);
        console.log(`  Total Verifications: ${state.totalVerificationsGlobal.toString()}`);
        console.log(`  Companies Root Hash: ${state.companiesRootHash.toString()}`);
        console.log(`  Registry Version: ${state.registryVersion.toString()}`);
        
        return state;
    } catch (error: any) {
        console.error(`❌ Error reading LOCAL contract state: ${error.message}`);
        throw error;
    }
}