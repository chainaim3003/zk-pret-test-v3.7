/**
 * ComposedRecursiveOptim3LevelMultiCompanyVerificationTestWithSign.ts - Multi-Company Entry Point
 * Based on: ComposedRecursiveOptim3LevelVerificationTestWithSign.ts
 * MAINTAINS: Exact same structure, just adds multi-company parsing
 */
import * as dotenv from 'dotenv';
dotenv.config();

import { Field, Mina, PrivateKey, AccountUpdate, CircuitString, Poseidon, Signature, UInt64, Bool } from 'o1js';
import { getComposedRecursiveOptim3LevelMultiCompanyVerificationWithSignUtils, CompanyInfo } from './ComposedComplianceLocalMultiVerifierUtils.js';

async function main() {
    // Get company data and test iterations from command line arguments
    const companiesArg = process.argv[2];
    const testIterations = parseInt(process.argv[3] || '1'); // Number of times to test each company

    if (!companiesArg) {
        console.error('❌ Error: Company data is required');
        console.log('📖 Usage: node ComposedRecursiveOptim3LevelMultiCompanyVerificationTestWithSign.js "COMPANY1:CIN1,COMPANY2:CIN2" [iterations]');
        console.log('📝 Example: node ComposedRecursiveOptim3LevelMultiCompanyVerificationTestWithSign.js "SREE PALANI ANDAVAR AGROS PRIVATE LIMITED:U01112TZ2022PTC039493,TATA CONSULTANCY SERVICES LIMITED:L22210TN1995PLC028581" 2');
        console.log('🔍 Features:');
        console.log('  ✅ Multi-company composed verification (Corporate Registration + EXIM + GLEIF)');
        console.log('  ✅ Uses CIN for Corporate Registration API calls');
        console.log('  ✅ Uses Company Name for EXIM and GLEIF API calls');
        console.log('  ✅ Multiple iterations per company for tracking changes over time');
        console.log('  ✅ Composed proof storage and retrieval');
        console.log('  ✅ Proof lineage tracking showing underlying proofs');
        console.log('  ✅ Historical proof management');
        console.log('  ✅ Cross-company compliance analysis');
        process.exit(1);
    }

    if (testIterations > 5) {
        console.error('❌ Error: Maximum 5 iterations per company to avoid excessive proof generation time');
        process.exit(1);
    }

    // Parse company data
    let companies: CompanyInfo[] = [];
    try {
        companies = companiesArg.split(',').map(companyData => {
            const [companyName, companyCIN] = companyData.split(':').map(s => s.trim());
            if (!companyName || !companyCIN) {
                throw new Error(`Invalid company data format: ${companyData}`);
            }
            return { companyName, companyCIN };
        });
    } catch (error) {
        console.error('❌ Error parsing company data:', (error as Error).message);
        console.error('📖 Expected format: "COMPANY1:CIN1,COMPANY2:CIN2"');
        process.exit(1);
    }

    if (companies.length === 0) {
        console.error('❌ Error: At least one company is required');
        process.exit(1);
    }

    if (companies.length > 10) {
        console.error('❌ Error: Maximum 10 companies supported to avoid excessive proof generation time');
        process.exit(1);
    }

    console.log('🏢 Companies to Process:');
    companies.forEach((company, index) => {
        console.log(`  ${index + 1}. ${company.companyName} (CIN: ${company.companyCIN})`);
    });
    console.log(`🔄 Test Iterations per Company: ${testIterations}`);
    console.log(`📊 Total Proofs to Generate: ${companies.length * testIterations}`);

    try {
        console.log('\n🚀 Starting Composed Recursive Optim 3-Level Multi-Company Verification Test...');
        console.log('=' .repeat(100));

        const result = await getComposedRecursiveOptim3LevelMultiCompanyVerificationWithSignUtils(
            companies,
            testIterations
        );

        console.log('\n🎯 Composed Recursive Multi-Company Verification completed successfully!');
        console.log('=' .repeat(100));

        // Display comprehensive results
        console.log('\n📊 Final Test Summary:');
        console.log(`✅ Total Companies Tested: ${result.totalCompanies}`);
        console.log(`✅ Total Composed Proofs Generated: ${result.totalComposedProofs}`);
        console.log(`✅ Successful Verifications: ${result.successfulVerifications}`);
        console.log(`❌ Failed Verifications: ${result.failedVerifications}`);
        console.log(`🏆 Overall Success Rate: ${((result.successfulVerifications / result.totalComposedProofs) * 100).toFixed(2)}%`);

        // Company results summary
        console.log('\n🏢 Company Results Summary:');
        if (result.companyResults && result.companyResults.length > 0) {
            result.companyResults.forEach((companyResult, index) => {
                console.log(`\n  ${index + 1}. ${companyResult.companyName}:`);
                console.log(`     📊 Iterations Completed: ${companyResult.iterations.length}/${testIterations}`);
                console.log(`     ✅ Successful Composed Proofs: ${companyResult.successfulProofs}`);
                console.log(`     ❌ Failed Proofs: ${companyResult.failedProofs}`);
                console.log(`     🎯 Latest Compliance Score: ${companyResult.latestComplianceScore}%`);
                console.log(`     📈 Compliance Trend: ${companyResult.complianceTrend}`);
                
                if (companyResult.iterations.length > 1) {
                    console.log(`     📋 Proof History:`);
                    companyResult.iterations.forEach((iteration, idx) => {
                        const status = iteration.error ? '❌ ERROR' : '✅ SUCCESS';
                        console.log(`       ${idx + 1}. ${status} - Score: ${iteration.complianceScore}% - ${new Date(iteration.timestamp).toISOString()}`);
                        if (iteration.error) {
                            console.log(`          Error: ${iteration.error}`);
                        }
                    });
                }
            });
        }

        // Cross-company compliance analysis
        console.log('\n📈 Cross-Company Compliance Analysis:');
        if (result.companyResults && result.companyResults.length > 0) {
            const compliantCompanies = result.companyResults.filter(c => c.latestComplianceScore >= 75).length;
            const averageScore = result.companyResults.reduce((sum, c) => sum + c.latestComplianceScore, 0) / result.companyResults.length;
            const bestPerformer = result.companyResults.reduce((best, current) => 
                current.latestComplianceScore > best.latestComplianceScore ? current : best);
            const improvingCompanies = result.companyResults.filter(c => c.complianceTrend === 'improving').length;
            
            console.log(`  🏆 Compliant Companies: ${compliantCompanies}/${result.totalCompanies} (${((compliantCompanies/result.totalCompanies)*100).toFixed(1)}%)`);
            console.log(`  📊 Average Compliance Score: ${averageScore.toFixed(1)}%`);
            console.log(`  🥇 Best Performer: ${bestPerformer.companyName} (${bestPerformer.latestComplianceScore}%)`);
            console.log(`  📈 Improving Companies: ${improvingCompanies}/${result.totalCompanies}`);
        }

        // Proof lineage demonstration
        console.log('\n🔗 Proof Lineage Examples:');
        if (result.proofLineageExamples && result.proofLineageExamples.length > 0) {
            result.proofLineageExamples.slice(0, 3).forEach((example, index) => {
                console.log(`\n  Example ${index + 1}: ${example.companyName} (Iteration ${example.iteration})`);
                console.log(`    🔸 Composed Proof Hash: ${example.composedProofHash.substring(0, 20)}...`);
                console.log(`    🔸 Level 1 (Corporate Registration) Proof: ${example.level1ProofHash.substring(0, 20)}...`);
                console.log(`    🔸 Level 2 (Level1 + EXIM) Proof: ${example.level2ProofHash.substring(0, 20)}...`);
                console.log(`    🔸 Level 3 (Level2 + GLEIF) Proof: ${example.level3ProofHash.substring(0, 20)}...`);
                console.log(`    🔸 Underlying Service Proofs:`);
                console.log(`      - Corporate Registration: ${example.corpRegProofHash.substring(0, 20)}...`);
                console.log(`      - EXIM: ${example.eximProofHash.substring(0, 20)}...`);
                console.log(`      - GLEIF: ${example.gleifProofHash.substring(0, 20)}...`);
            });
        }

        // Contract state summary
        console.log('\n📋 Smart Contract Final State:');
        console.log(`  🏗️ Total Proofs Stored: ${result.contractState.totalProofsStored.toString()}`);
        console.log(`  🏢 Total Companies Tracked: ${result.contractState.totalCompaniesTracked.toString()}`);
        console.log(`  🌳 Proofs Root Hash: ${result.contractState.proofsRootHash.toString().substring(0, 30)}...`);
        console.log(`  🕒 Last Update Time: ${new Date(Number(result.contractState.lastUpdateTimestamp.toString())).toISOString()}`);

        // Features demonstrated
        console.log('\n🎉 Features Successfully Demonstrated:');
        console.log(`  ✅ Multi-Service Composed Verification (Corporate Registration + EXIM + GLEIF)`);
        console.log(`  ✅ 3-Level Recursive Proof Composition`);
        console.log(`  ✅ Multi-Company Batch Processing`);
        console.log(`  ✅ Multiple Iterations per Company`);
        console.log(`  ✅ Composed Proof Storage and Retrieval`);
        console.log(`  ✅ Proof Lineage Tracking`);
        console.log(`  ✅ Historical Proof Management`);
        console.log(`  ✅ On-Chain Verification`);
        console.log(`  ✅ Compliance Trend Analysis`);
        console.log(`  ✅ Cross-Company Compliance Analysis`);
        console.log(`  ✅ Zero-Knowledge Proof Generation and Verification`);

        // Performance metrics
        if (result.performanceMetrics) {
            console.log('\n⚡ Performance Metrics:');
            console.log(`  🕒 Total Execution Time: ${result.performanceMetrics.totalExecutionTime}ms`);
            console.log(`  📊 Average Proof Generation Time: ${result.performanceMetrics.averageProofGenerationTime}ms`);
            console.log(`  🔍 Average Verification Time: ${result.performanceMetrics.averageVerificationTime}ms`);
            console.log(`  💾 Total Contract Storage Used: ${result.performanceMetrics.storageUsed} bytes`);
        }

        // Proof retrieval demonstration
        console.log('\n🔍 Proof Retrieval Demonstration:');
        if (result.retrievalExamples && result.retrievalExamples.length > 0) {
            result.retrievalExamples.slice(0, 4).forEach((example, index) => {
                console.log(`\n  Retrieval Example ${index + 1}:`);
                console.log(`    🏢 Company: ${example.companyName}`);
                console.log(`    🔢 Requested Sequence: ${example.requestedSequence}`);
                console.log(`    ✅ Successfully Retrieved: ${example.found ? 'Yes' : 'No'}`);
                if (example.found) {
                    console.log(`    📊 Compliance Score: ${example.complianceScore}%`);
                    console.log(`    🕒 Timestamp: ${new Date(example.timestamp).toISOString()}`);
                    console.log(`    🔗 Proof Hash: ${example.proofHash.substring(0, 30)}...`);
                }
            });
        }

        console.log('\n🎊 Composed Recursive Optim 3-Level Multi-Company Verification Test Completed Successfully!');

    } catch (error) {
        console.error('💥 Error in Composed Recursive Multi-Company Verification:', error);
        console.error('💥 Error Stack:', (error as Error).stack || 'No stack trace available');
        process.exit(1);
    }
}

main().catch(err => {
    console.error('💥 Fatal Error:', err);
    console.error('💥 Fatal Error Stack:', err.stack);
    process.exit(1);
});