/**
 * File-based Environment Storage
 * Handles persistent storage of environment configurations to JSON files
 */

import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { Environment, EnvironmentConfig, PersistentStorage } from './types.js';

export class FileBasedEnvironmentStorage implements PersistentStorage {
  private readonly configDir: string;

  constructor(baseDir: string = './config/environments') {
    this.configDir = baseDir;
  }

  private getConfigPath(environment: Environment): string {
    return join(this.configDir, `${environment.toLowerCase()}.json`);
  }

  async save(environment: Environment, config: EnvironmentConfig): Promise<void> {
    try {
      const configPath = this.getConfigPath(environment);
      
      // Ensure directory exists
      await fs.mkdir(dirname(configPath), { recursive: true });
      
      // Save with pretty formatting
      const configJson = JSON.stringify(config, null, 2);
      await fs.writeFile(configPath, configJson, 'utf8');
      
      console.log(`✅ Environment config saved: ${configPath}`);
    } catch (error) {
      console.error(`❌ Failed to save environment config for ${environment}:`, error);
      throw error;
    }
  }

  async load(environment: Environment): Promise<EnvironmentConfig | null> {
    try {
      const configPath = this.getConfigPath(environment);
      const configJson = await fs.readFile(configPath, 'utf8');
      const config = JSON.parse(configJson) as EnvironmentConfig;
      
      console.log(`✅ Environment config loaded: ${configPath}`);
      return config;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        console.log(`ℹ️ No environment config found for ${environment}`);
        return null;
      }
      console.error(`❌ Failed to load environment config for ${environment}:`, error);
      throw error;
    }
  }

  async exists(environment: Environment): Promise<boolean> {
    try {
      const configPath = this.getConfigPath(environment);
      await fs.access(configPath);
      return true;
    } catch {
      return false;
    }
  }

  async clear(environment: Environment): Promise<void> {
    try {
      const configPath = this.getConfigPath(environment);
      await fs.unlink(configPath);
      console.log(`✅ Environment config cleared: ${configPath}`);
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        console.error(`❌ Failed to clear environment config for ${environment}:`, error);
        throw error;
      }
    }
  }

  async listEnvironments(): Promise<Environment[]> {
    try {
      const files = await fs.readdir(this.configDir);
      const environments = files
        .filter(file => file.endsWith('.json'))
        .map(file => file.replace('.json', '').toUpperCase())
        .filter(env => Object.values(Environment).includes(env as Environment))
        .map(env => env as Environment);
      
      return environments;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  async backup(environment: Environment): Promise<string> {
    const config = await this.load(environment);
    if (!config) {
      throw new Error(`No configuration found for environment ${environment}`);
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = join(this.configDir, 'backups', `${environment.toLowerCase()}-${timestamp}.json`);
    
    await fs.mkdir(dirname(backupPath), { recursive: true });
    await fs.writeFile(backupPath, JSON.stringify(config, null, 2), 'utf8');
    
    console.log(`✅ Environment config backed up: ${backupPath}`);
    return backupPath;
  }
}
