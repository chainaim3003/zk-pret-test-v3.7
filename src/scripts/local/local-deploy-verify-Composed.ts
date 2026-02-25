/**
 * Local Deploy + Verify - Composed Recursive 3-Level Verification
 * PARALLELS: local-deploy-verify-GLEIF.ts, local-deploy-verify-EXIM.ts, local-deploy-verify-CorpReg.ts
 * 
 * Fixed: Uses shared LocalBlockchain to avoid conflicts
 * UPDATED: Points to new consolidated local handler location
 */

import { spawn } from 'child_process';

async function main(): Promise<void> {
  // Set BUILD_ENV for LOCAL (Windows compatible)
  process.env.BUILD_ENV = 'LOCAL';
  
  const args = process.argv.slice(2);
  
  // Parse company name (handle spaces properly + remove Windows shell artifacts)
  const companyNameParts: string[] = [];
  const cinParts: string[] = [];
  let iterations = '1';
  
  let parsingCompanyName = true;
  
  for (const arg of args) {
    if (arg.match(/^[0-9]+$/)) {
      // If it's a number, it's iterations
      iterations = arg;
    } else if (arg.match(/^[A-Z][0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$/)) {
      // If it matches CIN pattern, it's the CIN
      cinParts.push(arg);
      parsingCompanyName = false;
    } else if (parsingCompanyName) {
      companyNameParts.push(arg);
    } else {
      cinParts.push(arg);
    }
  }
  
  const rawCompanyName = companyNameParts.join(' ');
  const companyName = rawCompanyName
    .replace(/\^/g, '')              // Remove caret characters (Windows shell artifacts)
    .replace(/\s+/g, ' ')            // Normalize multiple spaces to single space
    .trim();                         // Final trim

  const companyCIN = cinParts.join(' ').trim();

  // Use defaults if not provided
  const finalCompanyName = companyName || 'SREE PALANI ANDAVAR AGROS PRIVATE LIMITED';
  const finalCIN = companyCIN || 'U01112TZ2022PTC039493';
  const finalIterations = iterations;

  try {
    console.log('🏠 LOCAL Composed Deploy + Verify Pipeline (O1JS Best Practices)');
    console.log('=================================================================');
    
    console.log(`\n🔍 Verifying company "${finalCompanyName}" (CIN: ${finalCIN}) using consolidated local handler...`);
    console.log(`🔄 Iterations: ${finalIterations}`);
    
    return new Promise((resolve, reject) => {
      const verifyProcess = spawn('node', [
        './build/impl/local/verifier/ComposedLocalMultiVerifier.js',
        finalCompanyName,
        finalCIN,
        finalIterations
      ], {
        stdio: 'inherit',
        env: { ...process.env, BUILD_ENV: 'LOCAL' }
      });
      
      verifyProcess.on('close', (code) => {
        if (code === 0) {
          console.log('\n🎉 LOCAL Composed Deploy + Verify completed successfully!');
          console.log('✅ O1JS Best Practices followed');
          console.log('✅ Consolidated local handler used');
          console.log('✅ Composition pattern for shared compliance logic');
          console.log('✅ No deployment conflicts');
          console.log('✅ Composed 3-level verification completed');
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

main();
