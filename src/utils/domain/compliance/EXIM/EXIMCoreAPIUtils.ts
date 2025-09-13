/**
 * EXIMCoreAPIUtils.ts - Core EXIM API Utilities
 * 
 * PARALLEL TO: GLEIFCoreAPIUtils.ts
 * REFACTORED FROM: EXIMEnhancedUtils.ts
 * 
 * Provides unified EXIM API integration, data processing, and compliance analysis
 * following the exact same pattern as GLEIF for consistency across compliance domains.
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { Field, CircuitString, MerkleTree, Poseidon } from 'o1js';
import { 
  EXIMOptimComplianceData, 
  EXIMMerkleWitness8, 
  EXIM_MERKLE_TREE_HEIGHT,
  EXIM_FIELD_INDICES 
} from '../../../../zk-programs/compliance/EXIMZKProgram.js';
import { 
  EXIMCompanyRecord,
  COMPANY_MERKLE_HEIGHT
} from '../../../../contracts/complaince/EXIM/EXIMMultiSmartContract.js';

// =================================== EXIM API INTERFACES ===================================

export interface EXIMAPIResponse {
  success?: boolean;
  iec?: string;
  entityName?: string;
  iecIssueDate?: string;
  pan?: string;
  iecStatus?: number;
  iecModificationDate?: string;
  dataAsOn?: string;
  
  // Additional EXIM fields
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  pin?: number;
  contactNo?: number;
  email?: string;
  exporterType?: number;
  activeComplianceStatusCode?: number;
  starStatus?: number;
  natureOfConcern?: number;
  
  // Branch and director data
  branches?: Array<{
    branchCode?: number;
    badd1?: string;
    badd2?: string;
    city?: string;
    state?: string;
    pin?: number;
  }>;
  
  directors?: Array<{
    name?: string;
  }>;
  
  error?: string;
  message?: string;
  
  // For compatibility
  [key: string]: any;
}

export interface ComplianceAnalysis {
  isCompliant: boolean;
  complianceScore: number;
  issues: string[];
  businessRuleResults: {
    entityNameNotEmpty: boolean;
    iecNotEmpty: boolean;
    panNotEmpty: boolean;
    iecIssueDateExists: boolean;
    iecModificationDateExists: boolean;
    dataAsOnValid: boolean;
    iecStatusCompliant: boolean;
  };
}

export interface MerkleTreeResult {
  tree: MerkleTree;
  extractedData: any;
  fieldCount: number;
}

// =================================== FIELD INDICES (PARALLEL TO GLEIF_FIELD_INDICES) ===================================

export { EXIM_FIELD_INDICES };

// =================================== COMPANY REGISTRY CLASS ===================================

/**
 * Company registry for managing multiple companies in merkle tree
 * PARALLEL TO: CompanyRegistry in GLEIFCoreAPIUtils.ts
 */
export class CompanyRegistry {
  private companiesTree: MerkleTree;
  private companyRecords: Map<string, { record: EXIMCompanyRecord; index: number }>;
  private nextIndex: number;

  constructor(height: number = COMPANY_MERKLE_HEIGHT) {
    this.companiesTree = new MerkleTree(height);
    this.companyRecords = new Map();
    this.nextIndex = 0;
  }

  /**
   * Add or update a company in the registry
   */
  addOrUpdateCompany(iec: string, companyRecord: EXIMCompanyRecord): any {
    let index: number;
    
    if (this.companyRecords.has(iec)) {
      // Update existing company
      index = this.companyRecords.get(iec)!.index;
      console.log(`📝 Updating existing company at index ${index}: ${iec}`);
    } else {
      // Add new company
      index = this.nextIndex++;
      console.log(`➕ Adding new company at index ${index}: ${iec}`);
    }
    
    // Calculate company record hash using the same method as the smart contract
    const companyHash = Poseidon.hash([
      companyRecord.iecHash,
      companyRecord.entityNameHash,
      companyRecord.jurisdictionHash,
      companyRecord.isCompliant.toField(),
      companyRecord.complianceScore,
      companyRecord.totalVerifications,
      companyRecord.lastVerificationTime.value,
      companyRecord.firstVerificationTime.value
    ]);
    
    // Update merkle tree
    this.companiesTree.setLeaf(BigInt(index), companyHash);
    
    // Store company record
    this.companyRecords.set(iec, { record: companyRecord, index });
    
    // Return witness for this company (implementation depends on your witness class)
    return this.companiesTree.getWitness(BigInt(index));
  }

  /**
   * Get merkle witness for a company
   */
  getCompanyWitness(iec: string): any | null {
    const entry = this.companyRecords.get(iec);
    if (!entry) return null;
    
    return this.companiesTree.getWitness(BigInt(entry.index));
  }

  /**
   * Get company record
   */
  getCompanyRecord(iec: string): EXIMCompanyRecord | null {
    const entry = this.companyRecords.get(iec);
    return entry ? entry.record : null;
  }

  /**
   * Get merkle root of companies tree
   */
  getRoot(): Field {
    return this.companiesTree.getRoot();
  }

  /**
   * Get all tracked companies
   */
  getAllCompanies(): string[] {
    return Array.from(this.companyRecords.keys());
  }

  /**
   * Get total number of companies
   */
  getTotalCompanies(): number {
    return this.companyRecords.size;
  }
}

// =================================== API INTEGRATION FUNCTIONS ===================================

/**
 * Enhanced fetch function with comprehensive response logging
 * PARALLEL TO: fetchGLEIFDataWithFullLogging in GLEIFCoreAPIUtils.ts
 */
export async function fetchEXIMDataWithFullLogging(
  companyName: string
): Promise<EXIMAPIResponse> {
  console.log(`\n🚀 Starting EXIM Data Fetch`);
  console.log(`🔍 Company Name: ${companyName}`);
  
  try {
    // Import the existing utility function to avoid breaking existing code
    const { fetchEXIMCompanyData } = await import('../../../../utils/domain/compliance/EXIM/EXIMBasicUtils.js');
    
    // Use the existing function to get the data
    const response = await fetchEXIMCompanyData(companyName);
    
    // Print comprehensive response analysis
    printEXIMResponse(response, companyName);
    
    return response;
    
  } catch (error: any) {
    console.error(`❌ Error in EXIM Data Fetch:`, error.message);
    
    // Print error details
    console.log(`\n🚨 Error Details:`);
    console.log(`  Error Type: ${error.name || 'Unknown'}`);
    console.log(`  Error Message: ${error.message}`);
    if (error.response?.data) {
      console.log(`  API Error Response:`, JSON.stringify(error.response, null, 2));
    }
    if (error.response?.status) {
      console.log(`  HTTP Status: ${error.response.status}`);
    }
    
    throw error;
  }
}

/**
 * Print comprehensive EXIM API response
 * PARALLEL TO: GLEIF response printing functions
 */
export function printEXIMResponse(
  response: EXIMAPIResponse,
  companyIdentifier: string
): void {
  console.log(`\n🚢 ===== EXIM API RESPONSE =====`);
  console.log(`🔍 Query: ${companyIdentifier}`);
  console.log(`📅 Timestamp: ${new Date().toISOString()}`);
  console.log(`🔄 API Response Structure Analysis:`);
  
  console.log(`📋 Production API Response:`);
  console.log(`  Success: ${response.success || 'unknown'}`);
  console.log(`  Has Data: ${!!response}`);
  
  if (response.error) {
    console.log(`  ❌ Error: ${response.error}`);
  }
  
  if (response.message) {
    console.log(`  💬 Message: ${response.message}`);
  }
    
  const data = response;
  if (data) {
    console.log(`\n🚢 EXIM Data Analysis:`);
    console.log(`  Total Fields Available: ${Object.keys(data).length}`);
    
    // Core identification fields
    console.log(`\n🆔 Core Identification:`);
    console.log(`  IEC: ${data.iec || 'N/A'}`);
    console.log(`  Entity Name: ${data.entityName || 'N/A'}`);
    console.log(`  PAN: ${data.pan || 'N/A'}`);
    console.log(`  IEC Status: ${data.iecStatus !== undefined ? data.iecStatus : 'N/A'}`);
    
    // Temporal information
    console.log(`\n📅 Important Dates:`);
    console.log(`  IEC Issue Date: ${data.iecIssueDate || 'N/A'}`);
    console.log(`  IEC Modification Date: ${data.iecModificationDate || 'N/A'}`);
    console.log(`  Data As On: ${data.dataAsOn || 'N/A'}`);
    
    // Status information
    console.log(`\n📊 Status Information:`);
    console.log(`  IEC Status: ${data.iecStatus !== undefined ? data.iecStatus : 'N/A'}`);
    console.log(`  Exporter Type: ${data.exporterType !== undefined ? data.exporterType : 'N/A'}`);
    console.log(`  Active Compliance Status Code: ${data.activeComplianceStatusCode !== undefined ? data.activeComplianceStatusCode : 'N/A'}`);
    console.log(`  Star Status: ${data.starStatus !== undefined ? data.starStatus : 'N/A'}`);
    console.log(`  Nature of Concern: ${data.natureOfConcern !== undefined ? data.natureOfConcern : 'N/A'}`);
    
    // Address information
    console.log(`\n🏠 Address Information:`);
    console.log(`  Address Line 1: ${data.addressLine1 || 'N/A'}`);
    console.log(`  Address Line 2: ${data.addressLine2 || 'N/A'}`);
    console.log(`  City: ${data.city || 'N/A'}`);
    console.log(`  State: ${data.state || 'N/A'}`);
    console.log(`  PIN: ${data.pin !== undefined ? data.pin : 'N/A'}`);
    
    // Contact information
    console.log(`\n📞 Contact Information:`);
    console.log(`  Contact No: ${data.contactNo !== undefined ? data.contactNo : 'N/A'}`);
    console.log(`  Email: ${data.email || 'N/A'}`);
    
    // Complete field inventory
    console.log(`\n📋 Complete Field Inventory (All fields):`);
    Object.keys(data).sort().forEach((key, index) => {
      const value = data[key as keyof typeof data];
      if (Array.isArray(value)) {
        console.log(`  ${index + 1}. ${key}: [Array with ${value.length} items]`);
      } else {
        const truncatedValue = typeof value === 'string' && value.length > 80 
          ? value.substring(0, 80) + '...' 
          : value;
        console.log(`  ${index + 1}. ${key}: ${truncatedValue !== undefined ? truncatedValue : 'null'}`);
      }
    });
  }
  
  console.log(`\n✅ EXIM Response Analysis Complete`);
  console.log(`==========================================\n`);
}

// =================================== COMPLIANCE ANALYSIS FUNCTIONS ===================================

/**
 * Business rule analysis for EXIM compliance
 * PARALLEL TO: analyzeGLEIFCompliance in GLEIFCoreAPIUtils.ts
 */
export function analyzeEXIMCompliance(
  response: EXIMAPIResponse
): ComplianceAnalysis {
  const summary = extractEXIMSummary(response);
  const issues: string[] = [];
  
  // Business rule checks based on user specification
  const businessRuleResults = {
    entityNameNotEmpty: summary.entityName !== '' && summary.entityName !== 'UNKNOWN' && summary.entityName !== null && summary.entityName !== undefined,
    iecNotEmpty: summary.iec !== '' && summary.iec !== 'UNKNOWN' && summary.iec !== null && summary.iec !== undefined,
    panNotEmpty: summary.pan !== '' && summary.pan !== 'UNKNOWN' && summary.pan !== null && summary.pan !== undefined,
    iecIssueDateExists: summary.iecIssueDate !== '' && summary.iecIssueDate !== 'UNKNOWN' && summary.iecIssueDate !== null && summary.iecIssueDate !== undefined,
    iecModificationDateExists: summary.iecModificationDate !== '' && summary.iecModificationDate !== 'UNKNOWN' && summary.iecModificationDate !== null && summary.iecModificationDate !== undefined,
    dataAsOnValid: summary.dataAsOn !== '' && summary.dataAsOn !== 'UNKNOWN' && summary.dataAsOn !== null && summary.dataAsOn !== undefined,
    iecStatusCompliant: [0, 4, 7, 8].includes(summary.iecStatus)
  };
  
  // Collect issues based on user specification
  if (!businessRuleResults.entityNameNotEmpty) {
    issues.push('Entity name is empty or missing');
  }
  if (!businessRuleResults.iecNotEmpty) {
    issues.push('IEC is empty or missing');
  }
  if (!businessRuleResults.panNotEmpty) {
    issues.push('PAN is empty or missing');
  }
  if (!businessRuleResults.iecIssueDateExists) {
    issues.push('IEC issue date is missing');
  }
  if (!businessRuleResults.iecModificationDateExists) {
    issues.push('IEC modification date is missing');
  }
  if (!businessRuleResults.dataAsOnValid) {
    issues.push('Data as on date is invalid or missing');
  }
  if (!businessRuleResults.iecStatusCompliant) {
    issues.push(`IEC status is not compliant. Expected: 0, 4, 7, or 8. Got: ${summary.iecStatus}`);
  }
  
  // Calculate compliance score
  const scoreFactors = Object.values(businessRuleResults);
  const complianceScore = Math.round((scoreFactors.filter(Boolean).length / scoreFactors.length) * 100);
  
  const isCompliant = complianceScore === 100;
  
  return {
    isCompliant,
    complianceScore,
    issues,
    businessRuleResults
  };
}

/**
 * Extract company summary for logging
 * PARALLEL TO: GLEIF summary extraction functions
 */
export function extractEXIMSummary(
  response: EXIMAPIResponse
): {
  iec: string;
  entityName: string;
  iecIssueDate: string;
  pan: string;
  iecStatus: number;
  iecModificationDate: string;
  dataAsOn: string;
} {
  const data = response || {};
  return {
    iec: data.iec || 'UNKNOWN',
    entityName: data.entityName || 'UNKNOWN',
    iecIssueDate: data.iecIssueDate || 'UNKNOWN',
    pan: data.pan || 'UNKNOWN',
    iecStatus: data.iecStatus !== undefined ? data.iecStatus : -1,
    iecModificationDate: data.iecModificationDate || 'UNKNOWN',
    dataAsOn: data.dataAsOn || 'UNKNOWN'
  };
}

// =================================== MERKLE TREE FUNCTIONS ===================================

/**
 * Create a comprehensive merkle tree from EXIM API response
 * PARALLEL TO: createComprehensiveGLEIFMerkleTree in GLEIFCoreAPIUtils.ts
 */
export function createComprehensiveEXIMMerkleTree(
  apiResponse: EXIMAPIResponse,
  MerkleTreeClass: typeof MerkleTree,
  CircuitStringClass: typeof CircuitString,
  height: number,
  fieldIndices: typeof EXIM_FIELD_INDICES
): MerkleTreeResult {
  console.log('🌳 Creating comprehensive EXIM Merkle tree...');
  
  const tree = new MerkleTreeClass(height);
  let fieldCount = 0;
  const extractedData: any = {};

  // Helper function to safely set field in tree
  function setTreeField(fieldName: string, value: string | undefined, index: number) {
    const safeValue = value || '';
    const circuitValue = CircuitStringClass.fromString(safeValue);
    const hash = circuitValue.hash();
    tree.setLeaf(BigInt(index), hash);
    extractedData[fieldName] = circuitValue;
    fieldCount++;
    console.log(`  Set field ${fieldName} (${index}): "${safeValue.substring(0, 50)}${safeValue.length > 50 ? '...' : ''}"`);  
  }

  // Helper function to set Field-type values in tree
  function setTreeFieldAsNumber(fieldName: string, value: number | string | undefined, index: number) {
    const safeValue = typeof value === 'number' ? value : (typeof value === 'string' ? parseInt(value) || 0 : 0);
    const fieldValue = Field(safeValue);
    const hash = Poseidon.hash([fieldValue]);
    tree.setLeaf(BigInt(index), hash);
    extractedData[fieldName] = fieldValue;
    fieldCount++;
    console.log(`  Set field ${fieldName} (${index}): ${safeValue}`);  
  }

  try {
    console.log('📋 Processing Production API structure...');
    const eximData = apiResponse.data || apiResponse;
    
    // Core compliance fields (indices 0-6) - matching ZK program structure
    setTreeField('iec', eximData.iec, fieldIndices.iec);
    setTreeField('entityName', eximData.entityName, fieldIndices.entityName);
    setTreeField('iecIssueDate', eximData.iecIssueDate, fieldIndices.iecIssueDate);
    setTreeField('pan', eximData.PAN || eximData.pan, fieldIndices.pan);
    setTreeFieldAsNumber('iecStatus', eximData.iecStatus, fieldIndices.iecStatus);
    setTreeField('iecModificationDate', eximData.iecModificationDate, fieldIndices.iecModificationDate);
    setTreeField('dataAsOn', eximData.dataAsOn, fieldIndices.dataAsOn);
    
    // Additional EXIM fields that exist in the ZK program field indices
    if ('addressLine1' in fieldIndices) {
      setTreeField('addressLine1', eximData.addressLine1 || '', fieldIndices.addressLine1);
    }
    if ('addressLine2' in fieldIndices) {
      setTreeField('addressLine2', eximData.addressLine2 || '', fieldIndices.addressLine2);
    }
    if ('city' in fieldIndices) {
      setTreeField('city', eximData.city || '', fieldIndices.city);
    }
    if ('state' in fieldIndices) {
      setTreeField('state', eximData.state || '', fieldIndices.state);
    }
    if ('email' in fieldIndices) {
      setTreeField('email', eximData.email || '', fieldIndices.email);
    }
    if ('exporterType' in fieldIndices) {
      setTreeFieldAsNumber('exporterType', eximData.exporterType, fieldIndices.exporterType);
    }
    if ('activeComplianceStatusCode' in fieldIndices) {
      setTreeFieldAsNumber('activeComplianceStatusCode', eximData.activeComplianceStatusCode, fieldIndices.activeComplianceStatusCode);
    }
    if ('starStatus' in fieldIndices) {
      setTreeFieldAsNumber('starStatus', eximData.starStatus, fieldIndices.starStatus);
    }
    if ('natureOfConcern' in fieldIndices) {
      setTreeFieldAsNumber('natureOfConcern', eximData.natureOfConcern, fieldIndices.natureOfConcern);
    }

    console.log(`✅ Created Merkle tree with ${fieldCount} fields`);
    console.log(`🌳 Merkle root: ${tree.getRoot().toString()}`);
    
    return { tree, extractedData, fieldCount };
    
  } catch (error) {
    console.error('❌ Error creating Merkle tree:', error);
    throw error;
  }
}

/**
 * Create optimized compliance data from extracted fields
 * PARALLEL TO: createOptimizedGLEIFComplianceData in GLEIFCoreAPIUtils.ts
 */
export function createOptimizedEXIMComplianceData(
  extractedData: any,
  merkleRoot: Field,
  CircuitStringClass: typeof CircuitString,
  ComplianceDataClass: typeof EXIMOptimComplianceData
): EXIMOptimComplianceData {
  return new ComplianceDataClass({
    iec: extractedData.iec || CircuitStringClass.fromString(''),
    entityName: extractedData.entityName || CircuitStringClass.fromString(''),
    iecIssueDate: extractedData.iecIssueDate || CircuitStringClass.fromString(''),
    pan: extractedData.pan || CircuitStringClass.fromString(''),
    iecStatus: extractedData.iecStatus || Field(0),
    iecModificationDate: extractedData.iecModificationDate || CircuitStringClass.fromString(''),
    dataAsOn: extractedData.dataAsOn || CircuitStringClass.fromString(''),
    merkle_root: merkleRoot,
  });
}

/**
 * Create a company record from EXIM compliance data and verification info
 * PARALLEL TO: createCompanyRecord functions in GLEIFCoreAPIUtils.ts
 */
export function createCompanyRecord(
  complianceData: EXIMOptimComplianceData,
  isCompliant: any, // Bool type
  verificationTimestamp: any, // UInt64 type
  CircuitStringClass: typeof CircuitString,
  CompanyRecordClass: typeof EXIMCompanyRecord,
  FieldClass: typeof Field
): EXIMCompanyRecord {
  const currentTime = verificationTimestamp;
  
  return new CompanyRecordClass({
    iecHash: complianceData.iec.hash(),
    entityNameHash: complianceData.entityName.hash(),
    jurisdictionHash: CircuitStringClass.fromString('India').hash(), // EXIM is India-specific
    isCompliant: isCompliant,
    complianceScore: isCompliant.toField().mul(100), // 100 if compliant, 0 if not
    totalVerifications: FieldClass(1), // This will be updated if company already exists
    lastVerificationTime: currentTime,
    firstVerificationTime: currentTime // Set to current time for new verifications
  });
}

/**
 * Check if a company is EXIM compliant
 * PARALLEL TO: similar functions in GLEIFCoreAPIUtils.ts
 */
export function isCompanyEXIMCompliant(
  companyDataOrName: EXIMAPIResponse | string
): boolean | Promise<boolean> {
  if (typeof companyDataOrName === 'string') {
    // If string provided, fetch data first
    return fetchEXIMDataWithFullLogging(companyDataOrName)
      .then(apiResponse => {
        const analysis = analyzeEXIMCompliance(apiResponse);
        return analysis.isCompliant;
      });
  } else {
    // If API response provided, analyze directly
    const analysis = analyzeEXIMCompliance(companyDataOrName);
    return analysis.isCompliant;
  }
}
