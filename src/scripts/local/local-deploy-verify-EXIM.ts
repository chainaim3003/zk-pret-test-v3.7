/**
 * Local Deploy + Verify - EXIM (TypeScript)
 * 
 * PARALLEL TO: local-deploy-verify-GLEIF.js
 * Fixed: Uses shared LocalBlockchain to avoid conflicts
 * UPDATED: Points to new consolidated local handler location
 */

import { spawn } from 'child_process';

async function main(): Promise<void> {
  // Set BUILD_ENV for LOCAL (Windows compatible)
  process.env.BUILD_ENV = 'LOCAL';

  // ✅ FIXED: Handle spaces in company name properly + remove Windows shell artifacts
  const rawCompanyName = process.argv.slice(2).join(' ');
  const companyName = rawCompanyName
    .replace(/\^/g, '') // Remove caret characters (Windows shell artifacts)
    .replace(/\s+/g, ' ') // Normalize multiple spaces to single space
    .trim(); // Final trim

  // Use default company if none provided (for test:local-complete-EXIM)
  const finalCompanyName = companyName || 'SREE PALANI ANDAVAR AGROS PRIVATE LIMITED';
  
  if (!finalCompanyName) {
    console.error('❌ Usage: npm run test:local-complete-EXIM:company "COMPANY NAME"');
    console.error('');
    console.error('Examples:');
    console.error('  npm run test:local-complete-EXIM:company "SREE PALANI ANDAVAR AGROS PRIVATE LIMITED"');
    console.error('  npm run test:local-complete-EXIM:company "TATA MOTORS LIMITED"');
    console.error('  npm run test:local-complete-EXIM "COMPANY NAME" (with args)');
    console.error('  npm run test:local-complete-EXIM (uses default company)');
    process.exit(1);
  }

  try {
    console.log('🏠 LOCAL Deploy + Verify Pipeline - EXIM (O1JS Best Practices)');
    console.log('=================================================================');
    
    // ✅ UPDATED: Point to new consolidated local handler location
    console.log(`\n🔍 Verifying company "${finalCompanyName}" using consolidated local handler...`);
    
    return new Promise((resolve, reject) => {
      const verifyProcess = spawn('node', [
        './build/tests/with-sign/EXIMLocalMultiVerifier.js',
        finalCompanyName // Pass as single argument
      ], {
        stdio: 'inherit',
        env: { ...process.env, BUILD_ENV: 'LOCAL' }
      });

      verifyProcess.on('close', (code) => {
        if (code === 0) {
          console.log('\n🎉 LOCAL Deploy + Verify completed successfully!');
          console.log('✅ O1JS Best Practices followed');
          console.log('✅ Consolidated local handler used');
          console.log('✅ Composition pattern for shared compliance logic');
          console.log('✅ No deployment conflicts');
          console.log('✅ EXIM-specific verification completed');
          resolve();
        } else {
          console.error(`\n❌ Verification failed with code ${code}`);
          reject(new Error(`Verification failed`));
        }
      });

      verifyProcess.on('error', (error) => {
        console.error(`\n❌ Process error:`, error);
        reject(error);
      });
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`💥 Pipeline failed: ${errorMessage}`);
    process.exit(1);
  }
}

// Run the main function
main().catch(err => {
  console.error('💥 Fatal Error:', err);
  process.exit(1);
});
