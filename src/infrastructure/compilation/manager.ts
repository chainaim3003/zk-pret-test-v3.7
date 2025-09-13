/**
 * Compilation Manager
 * Handles centralized compilation with caching and dependency resolution
 */

import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { CompilationItem, CompilationResult, CompilationCache, CompilationStats, CompilationCategory } from './types.js';
import { COMPILATION_REGISTRY, getCompilationByName, getDependencies } from './registry.js';
import { environmentManager } from '../environment/manager.js';

export class CompilationManager {
  private static instance: CompilationManager;
  private cache: CompilationCache = {};
  private cacheFilePath: string;
  private compiledPrograms: Set<string> = new Set();

  private constructor() {
    const environment = environmentManager.getCurrentEnvironment();
    this.cacheFilePath = `./config/compilation-cache-${environment.toLowerCase()}.json`;
  }

  static getInstance(): CompilationManager {
    if (!CompilationManager.instance) {
      CompilationManager.instance = new CompilationManager();
    }
    return CompilationManager.instance;
  }

  /**
   * Initialize the compilation manager and load cache
   */
  async initialize(): Promise<void> {
    await this.loadCache();
    console.log('🔧 Compilation Manager initialized');
  }

  /**
   * Compile a specific program by name
   */
  async compileProgram(name: string, forceRecompile: boolean = false): Promise<CompilationResult> {
    const item = getCompilationByName(name);
    if (!item) {
      throw new Error(`Compilation item '${name}' not found in registry`);
    }

    // Check cache first
    if (!forceRecompile && this.cache[name] && this.isValidCacheEntry(name)) {
      console.log(`✅ Using cached compilation for ${name}`);
      this.compiledPrograms.add(name);
      return {
        name,
        verificationKey: this.cache[name].verificationKey,
        compilationTime: 0, // From cache
        success: true
      };
    }

    console.log(`🔧 Compiling ${name}...`);
    const startTime = Date.now();

    try {
      // Compile dependencies first
      await this.compileDependencies(item);

      // Load and compile the program
      const module = await item.loader();
      const program = this.extractProgramFromModule(module, name);

      if (!program || typeof program.compile !== 'function') {
        throw new Error(`Invalid program structure for ${name}: missing compile method`);
      }

      const compilation = await program.compile();
      const compilationTime = Date.now() - startTime;

      // Cache the result
      const cacheEntry = {
        verificationKey: compilation.verificationKey || compilation,
        compiledAt: new Date().toISOString(),
        compilationTime,
        environment: environmentManager.getCurrentEnvironment()
      };

      this.cache[name] = cacheEntry;
      this.compiledPrograms.add(name);
      await this.saveCache();

      console.log(`✅ ${name} compiled successfully (${compilationTime}ms)`);

      return {
        name,
        verificationKey: cacheEntry.verificationKey,
        compilationTime,
        success: true
      };

    } catch (error: any) {
      const compilationTime = Date.now() - startTime;
      console.error(`❌ Failed to compile ${name}:`, error.message);

      return {
        name,
        compilationTime,
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Extract the program object from the imported module
   */
  private extractProgramFromModule(module: any, name: string): any {
    // Try different common export patterns
    if (module.default && typeof module.default.compile === 'function') {
      return module.default;
    }

    // Try to find by name
    if (module[name] && typeof module[name].compile === 'function') {
      return module[name];
    }

    // Try common ZK program names
    const commonNames = [
      name,
      name.replace('SmartContract', ''),
      name.replace('Contract', ''),
      name + 'ZKProgram',
      name + 'Program'
    ];

    for (const commonName of commonNames) {
      if (module[commonName] && typeof module[commonName].compile === 'function') {
        return module[commonName];
      }
    }

    // If all else fails, look for any object with a compile method
    for (const [key, value] of Object.entries(module)) {
      if (value && typeof (value as any).compile === 'function') {
        console.log(`🔍 Found compilable program '${key}' in module for ${name}`);
        return value;
      }
    }

    throw new Error(`Could not find compilable program in module for ${name}`);
  }

  /**
   * Compile dependencies recursively
   */
  private async compileDependencies(item: CompilationItem): Promise<void> {
    if (!item.dependencies || item.dependencies.length === 0) {
      return;
    }

    console.log(`🔗 Compiling dependencies for ${item.name}: ${item.dependencies.join(', ')}`);

    for (const dependency of item.dependencies) {
      if (!this.compiledPrograms.has(dependency)) {
        await this.compileProgram(dependency);
      }
    }
  }

  /**
   * Compile multiple programs
   */
  async compilePrograms(names: string[], forceRecompile: boolean = false): Promise<CompilationResult[]> {
    console.log(`🔧 Compiling ${names.length} programs...`);
    const results: CompilationResult[] = [];

    for (const name of names) {
      const result = await this.compileProgram(name, forceRecompile);
      results.push(result);
    }

    return results;
  }

  /**
   * Compile by category
   */
  async compileByCategory(category: CompilationCategory, forceRecompile: boolean = false): Promise<CompilationResult[]> {
    const items = COMPILATION_REGISTRY.filter(item => 
      item.category === category && item.enabled !== false
    );

    const names = items.map(item => item.name);
    console.log(`🔧 Compiling ${category} programs: ${names.join(', ')}`);

    return await this.compilePrograms(names, forceRecompile);
  }

  /**
   * Compile all programs in dependency order
   */
  async compileAll(forceRecompile: boolean = false): Promise<CompilationResult[]> {
    console.log('🔧 Compiling all programs...');
    
    // Sort by compilation order
    const sortedItems = COMPILATION_REGISTRY
      .filter(item => item.enabled !== false)
      .sort((a, b) => a.compilationOrder - b.compilationOrder);

    const results: CompilationResult[] = [];

    for (const item of sortedItems) {
      const result = await this.compileProgram(item.name, forceRecompile);
      results.push(result);
    }

    return results;
  }

  /**
   * Get verification key for a compiled program
   */
  getVerificationKey(name: string): any | null {
    const cacheEntry = this.cache[name];
    if (cacheEntry && this.isValidCacheEntry(name)) {
      return cacheEntry.verificationKey;
    }
    return null;
  }

  /**
   * Check if a program is compiled
   */
  isCompiled(name: string): boolean {
    return this.compiledPrograms.has(name) || (this.cache[name] && this.isValidCacheEntry(name));
  }

  /**
   * Clear compilation cache
   */
  async clearCache(): Promise<void> {
    this.cache = {};
    this.compiledPrograms.clear();
    try {
      await fs.unlink(this.cacheFilePath);
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        console.error('❌ Error clearing cache file:', error);
      }
    }
    console.log('🧹 Compilation cache cleared');
  }

  /**
   * Get compilation statistics
   */
  getStats(): CompilationStats {
    const totalPrograms = COMPILATION_REGISTRY.filter(item => item.enabled !== false).length;
    const compiledPrograms = this.compiledPrograms.size;
    const cachedPrograms = Object.keys(this.cache).length;
    
    const byCategory: Record<CompilationCategory, number> = {
      [CompilationCategory.ZK_PROGRAM]: 0,
      [CompilationCategory.SMART_CONTRACT]: 0,
      [CompilationCategory.BUSINESS_PROCESS]: 0,
      [CompilationCategory.RISK_LIQUIDITY]: 0,
      [CompilationCategory.RECURSIVE_PROGRAM]: 0
    };

    COMPILATION_REGISTRY
      .filter(item => item.enabled !== false)
      .forEach(item => {
        byCategory[item.category]++;
      });

    const totalCompilationTime = Object.values(this.cache)
      .reduce((sum, entry) => sum + entry.compilationTime, 0);

    return {
      totalPrograms,
      compiledPrograms,
      cachedPrograms,
      failedPrograms: 0, // We'd need to track this separately
      totalCompilationTime,
      byCategory
    };
  }

  /**
   * Load cache from file
   */
  private async loadCache(): Promise<void> {
    try {
      const cacheData = await fs.readFile(this.cacheFilePath, 'utf8');
      this.cache = JSON.parse(cacheData);
      
      // Mark cached programs as compiled if they're still valid
      for (const [name, entry] of Object.entries(this.cache)) {
        if (this.isValidCacheEntry(name)) {
          this.compiledPrograms.add(name);
        }
      }
      
      console.log(`✅ Loaded compilation cache with ${Object.keys(this.cache).length} entries`);
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        console.error('❌ Error loading compilation cache:', error);
      }
      this.cache = {};
    }
  }

  /**
   * Save cache to file
   */
  private async saveCache(): Promise<void> {
    try {
      await fs.mkdir(dirname(this.cacheFilePath), { recursive: true });
      await fs.writeFile(this.cacheFilePath, JSON.stringify(this.cache, null, 2), 'utf8');
    } catch (error) {
      console.error('❌ Error saving compilation cache:', error);
    }
  }

  /**
   * Check if a cache entry is valid
   */
  private isValidCacheEntry(name: string): boolean {
    const entry = this.cache[name];
    if (!entry) return false;

    // Check if it's for the current environment
    const currentEnv = environmentManager.getCurrentEnvironment();
    if (entry.environment !== currentEnv) {
      return false;
    }

    // Check if the program still exists in registry
    const item = getCompilationByName(name);
    if (!item || item.enabled === false) {
      return false;
    }

    // Cache is valid for 24 hours in LOCAL, indefinitely in TESTNET/MAINNET
    if (currentEnv === 'LOCAL') {
      const cacheAge = Date.now() - new Date(entry.compiledAt).getTime();
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours
      return cacheAge < maxAge;
    }

    return true;
  }

  /**
   * Precompile programs for faster test execution
   */
  async precompilePrograms(programs: string[]): Promise<void> {
    console.log(`🚀 Precompiling ${programs.length} programs for faster execution...`);
    
    const startTime = Date.now();
    await this.compilePrograms(programs, false);
    const totalTime = Date.now() - startTime;
    
    console.log(`✅ Precompilation completed in ${totalTime}ms`);
  }

  /**
   * Get program module (already compiled)
   */
  async getCompiledProgram(name: string): Promise<any> {
    if (!this.isCompiled(name)) {
      await this.compileProgram(name);
    }

    const item = getCompilationByName(name);
    if (!item) {
      throw new Error(`Program '${name}' not found in registry`);
    }

    const module = await item.loader();
    return this.extractProgramFromModule(module, name);
  }
}

// Export singleton instance
export const compilationManager = CompilationManager.getInstance();
