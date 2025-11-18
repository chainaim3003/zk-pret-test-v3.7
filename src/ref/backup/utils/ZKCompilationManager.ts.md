/**
 * ZKCompilationManager.ts - Centralized ZK Program Compilation Manager
 * 
 * Prevents concurrent compilation issues by ensuring:
 * 1. Each ZK program is compiled exactly once
 * 2. Sequential compilation (never concurrent)
 * 3. Compilation state tracking across different utilities
 * 4. Network-aware compilation strategies
 */

export class ZKCompilationManager {
    private static instance: ZKCompilationManager;
    private compiledPrograms: Set<string>;
    private compilationPromises: Map<string, Promise<any>>;
    private compilationOrder: string[];

    private constructor() {
        this.compiledPrograms = new Set();
        this.compilationPromises = new Map();
        this.compilationOrder = [
            'CorporateRegistrationOptim',
            'EXIMOptim', 
            'GLEIFOptim',
            'ComposedOptimCompliance',
            'ComposedOptimComplianceVerifierSC',
            'GLEIFOptimMultiCompanySmartContract',
            'CorporateRegistrationOptimSingleCompanySmartContract',
            'EXIMOptimSingleCompanySmartContract'
        ];
    }

    /**
     * Get singleton instance
     */
    public static getInstance(): ZKCompilationManager {
        if (!ZKCompilationManager.instance) {
            ZKCompilationManager.instance = new ZKCompilationManager();
        }
        return ZKCompilationManager.instance;
    }

    /**
     * Compile a ZK program only if not already compiled
     */
    public async compileOnce(programName: string, compileFunction: () => Promise<any>): Promise<any> {
        // If already compiled, return immediately
        if (this.compiledPrograms.has(programName)) {
            console.log(`✅ ${programName} already compiled, skipping...`);
            return Promise.resolve();
        }

        // If compilation is in progress, wait for it
        if (this.compilationPromises.has(programName)) {
            console.log(`⏳ ${programName} compilation in progress, waiting...`);
            return await this.compilationPromises.get(programName);
        }

        // Start new compilation
        console.log(`🔧 Compiling ${programName}...`);
        const compilationPromise = compileFunction();
        this.compilationPromises.set(programName, compilationPromise);
        
        try {
            const result = await compilationPromise;
            this.compiledPrograms.add(programName);
            console.log(`✅ ${programName} compiled successfully`);
            return result;
        } catch (error) {
            console.error(`❌ Failed to compile ${programName}:`, error);
            this.compilationPromises.delete(programName);
            throw error;
        } finally {
            this.compilationPromises.delete(programName);
        }
    }

    /**
     * Compile all programs in the correct order
     */
    public async compileAllInOrder(programs: { [key: string]: any }): Promise<{ [key: string]: any }> {
        const results: { [key: string]: any } = {};
        
        console.log('\n📝 Compiling ALL ZK programs sequentially...');
        
        for (const programName of this.compilationOrder) {
            if (programs[programName]) {
                try {
                    const result = await this.compileOnce(programName, () => programs[programName].compile());
                    results[programName] = result;
                } catch (error) {
                    console.error(`❌ Critical error compiling ${programName}:`, error);
                    throw error;
                }
            }
        }
        
        console.log('🎉 All ZK programs compiled successfully!');
        return results;
    }

    /**
     * Check if a program is compiled
     */
    public isCompiled(programName: string): boolean {
        return this.compiledPrograms.has(programName);
    }

    /**
     * Get compilation status
     */
    public getCompilationStatus(): { [key: string]: boolean } {
        const status: { [key: string]: boolean } = {};
        this.compilationOrder.forEach(name => {
            status[name] = this.compiledPrograms.has(name);
        });
        return status;
    }

    /**
     * Reset compilation state (for testing)
     */
    public reset(): void {
        this.compiledPrograms.clear();
        this.compilationPromises.clear();
        console.log('🔄 ZK Compilation Manager reset');
    }

    /**
     * Get total compiled programs
     */
    public getTotalCompiled(): number {
        return this.compiledPrograms.size;
    }

    /**
     * Check if all required programs are compiled
     */
    public areAllProgramsCompiled(requiredPrograms: string[]): boolean {
        return requiredPrograms.every(program => this.compiledPrograms.has(program));
    }
}

// Export singleton instance
export const zkCompilationManager = ZKCompilationManager.getInstance();
