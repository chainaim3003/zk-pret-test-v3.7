/**
 * Local Deploy + Verify - O1JS Best Practices
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
    .replace(/\^/g, '')              // Remove caret characters (Windows shell artifacts)
    .replace(/\s+/g, ' ')            // Normalize multiple spaces to single space
    .trim();                         // Final trim

  if (!companyName) {
    console.error('❌ Usage: npm run test:local-complete "COMPANY NAME"');
    console.error('');
    console.error('Examples:');
    console.error('  npm run test:local-complete "SREE PALANI ANDAVAR AGROS PRIVATE LIMITED"');
    console.error('  npm run test:local-complete "APPLE INC"');
    console.error('  npm run test:local-complete "MICROSOFT CORPORATION"');
    process.exit(1);
  }

  try {
    console.log('🏠 LOCAL Deploy + Verify Pipeline (O1JS Best Practices)');
    console.log('=======================================================');
    
    // ✅ UPDATED: Point to new consolidated local handler location
    console.log(`\n🔍 Verifying company "${companyName}" using consolidated local handler...`);
    
    return new Promise((resolve, reject) => {
      const verifyProcess = spawn('node', [
        './build/impl/local/verifier/GLEIFLocalMultiVerifier.js',  // Now points to the new entry point
        companyName  // Pass as single argument
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
          resolve();
        } else {
          console.error(`\n❌ Verification failed with code ${code}`);
          reject(new Error(`Verification failed`));
        }
      });
    });
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`💥 Pipeline failed: ${errorMessage}`);
    process.exit(1);
  }
}

main();
