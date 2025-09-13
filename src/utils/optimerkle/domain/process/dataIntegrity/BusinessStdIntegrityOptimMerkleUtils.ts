import { MerkleTree, MerkleWitness, CircuitString, Field, Poseidon, Bool } from 'o1js';
import { safeFieldFrom } from '../../../../core/CoreZKUtilities.js';

// Merkle witness for tree height 8 (supports 256 fields)
class BusinessStdMerkleWitness8 extends MerkleWitness(8) {}

// Enhanced Business Standard data structure using Merkle Tree
export class BusinessStdMerkleTree {
  values: {key: number, value: Field[], fieldName: string}[];
  tree: MerkleTree;
  fieldNames: string[];

  constructor(blData: any) {
    this.values = this.parseBLToTreeData(blData);
    this.tree = new MerkleTree(8); // Support 256 fields
    this.fieldNames = this.values.map(v => v.fieldName);
    
    // Populate tree with hashed field values - ALL fields from document
    for(const {key, value} of this.values) {
      this.tree.setLeaf(BigInt(key), Poseidon.hash(value));
    }
  }

  private parseBLToTreeData(blData: any): {key: number, value: Field[], fieldName: string}[] {
    // Helper function to safely set field in tree for ZK validation fields (need CircuitString)
    const createZKFieldEntry = (key: number, value: string | undefined | boolean | number, fieldName: string) => {
      let safeValue: string;
      if (typeof value === 'boolean') {
        safeValue = value ? 'true' : 'false';
      } else if (typeof value === 'number') {
        safeValue = value.toString();
      } else {
        safeValue = value || '';
      }
      
      // Truncate if too long for CircuitString
      if (safeValue.length > 128) {
        safeValue = safeValue.substring(0, 128);
      }
      
      return {
        key,
        value: CircuitString.fromString(safeValue).values.map(c => c.toField()),
        fieldName
      };
    };

    // Helper function for data storage fields (use direct Field hashing)
    const createDataFieldEntry = (key: number, value: string | undefined | boolean | number, fieldName: string) => {
      let safeValue: string;
      if (typeof value === 'boolean') {
        safeValue = value ? 'true' : 'false';
      } else if (typeof value === 'number') {
        safeValue = value.toString();
      } else {
        safeValue = value || '';
      }
      
      // For data storage, hash the string directly using Poseidon
      // Convert string to bytes and hash in chunks if needed
      const encoder = new TextEncoder();
      const bytes = encoder.encode(safeValue);
      const fields = [];
      
      // Process in chunks of 31 bytes (safe for Field)
      for (let i = 0; i < bytes.length; i += 31) {
        const chunk = bytes.slice(i, i + 31);
        let value = 0n;
        for (let j = 0; j < chunk.length; j++) {
          value = value * 256n + BigInt(chunk[j]);
        }
        fields.push(safeFieldFrom(Number(value)));
      }
      
      // If no content, add a zero field
      if (fields.length === 0) {
        fields.push(safeFieldFrom(0));
      }
      
      return {
        key,
        value: [Poseidon.hash(fields)],
        fieldName
      };
    };

    // Helper function to extract country code from UN location code
    const extractCountryCode = (unLocationCode: string): string => {
      if (!unLocationCode || unLocationCode.length < 2) return '';
      return unLocationCode.substring(0, 2);
    };

    // Extract nested values safely
    const transports = blData.transports || {};
    const documentParties = blData.documentParties || {};
    const shipper = documentParties.shipper || {};
    const issuingParty = documentParties.issuingParty || {};
    const issuingAddress = issuingParty.address || {};
    const portOfLoading = transports.portOfLoading || {};
    const portOfDischarge = transports.portOfDischarge || {};
    const vesselVoyages = transports.vesselVoyages || [];
    const firstVoyage = vesselVoyages[0] || {};
    const consignmentItems = blData.consignmentItems || [];
    const firstConsignment = consignmentItems[0] || {};
    const cargoItems = firstConsignment.cargoItems || [];
    const firstCargoItem = cargoItems[0] || {};
    const outerPackaging = firstCargoItem.outerPackaging || {};
    const utilizedTransportEquipments = blData.utilizedTransportEquipments || [];
    const firstEquipment = utilizedTransportEquipments[0] || {};
    const equipment = firstEquipment.equipment || {};
    const seals = firstEquipment.seals || [];
    const firstSeal = seals[0] || {};
    const partyContactDetails = blData.partyContactDetails || [];
    const charges = blData.charges || [];
    const firstCharge = charges[0] || {};

    return [
      // ================ CORE 24 REQUIRED FIELDS (0-23) ================
      
      // Pattern validation fields (0-5) - need witnesses for ZKRegex
      createZKFieldEntry(0, blData.transportDocumentReference, 'transportDocumentReference'), // fun0
      createZKFieldEntry(1, shipper.partyName, 'shipperPartyName'), // fun0
      createZKFieldEntry(2, issuingParty.partyName, 'issuingPartyName'), // fun0
      createZKFieldEntry(3, issuingAddress.city, 'addressCity'), // fun0
      createZKFieldEntry(4, issuingAddress.countryCode, 'countryCode'), // fun1
      createZKFieldEntry(5, blData.carrierCode, 'carrierCode'), // fun2
      
      // Enum validation fields (6-9) - need witnesses for enum checks
      createZKFieldEntry(6, blData.transportDocumentTypeCode, 'transportDocumentTypeCode'), // enum: BOL, SWB
      createZKFieldEntry(7, blData.receiptTypeAtOrigin, 'receiptTypeAtOrigin'), // enum: CY, SD, CFS
      createZKFieldEntry(8, blData.deliveryTypeAtDestination, 'deliveryTypeAtDestination'), // enum: CY, SD, CFS
      createZKFieldEntry(9, blData.carrierCodeListProvider, 'carrierCodeListProvider'), // enum: SMDG, NMFTA
      
      // Boolean validation fields (10-12) - need witnesses for boolean checks
      createZKFieldEntry(10, blData.isShippedOnBoardType, 'isShippedOnBoardType'), // boolean
      createZKFieldEntry(11, blData.isElectronic, 'isElectronic'), // boolean
      createZKFieldEntry(12, blData.isToOrder, 'isToOrder'), // boolean
      
      // Array existence fields (13-16) - need witnesses for "not empty" checks
      createZKFieldEntry(13, Array.isArray(partyContactDetails) ? partyContactDetails.length.toString() : '0', 'partyContactDetailsCount'),
      createZKFieldEntry(14, Array.isArray(consignmentItems) ? consignmentItems.length.toString() : '0', 'consignmentItemsCount'),
      createZKFieldEntry(15, Array.isArray(utilizedTransportEquipments) ? utilizedTransportEquipments.length.toString() : '0', 'utilizedTransportEquipmentsCount'),
      createZKFieldEntry(16, Array.isArray(vesselVoyages) ? vesselVoyages.length.toString() : '0', 'vesselVoyagesCount'),
      
      // String existence fields (17-23) - the "missing" 7 fields, need witnesses for "not empty" checks
      createZKFieldEntry(17, blData.transportDocumentStatus, 'transportDocumentStatus'),
      createZKFieldEntry(18, issuingAddress.street, 'street'),
      createZKFieldEntry(19, blData.termsAndConditions, 'termsAndConditions'),
      createZKFieldEntry(20, blData.cargoMovementTypeAtOrigin, 'cargoMovementTypeAtOrigin'),
      createZKFieldEntry(21, blData.cargoMovementTypeAtDestination, 'cargoMovementTypeAtDestination'),
      createZKFieldEntry(22, transports.plannedArrivalDate, 'plannedArrivalDate'),
      createZKFieldEntry(23, transports.plannedDepartureDate, 'plannedDepartureDate'),

      // ================ ADDITIONAL FIELDS USING EXISTING ZKRegex (24-37) ================
      
      // Additional fun0 fields (24-29) - Non-whitespace with content
      createZKFieldEntry(24, firstVoyage.vesselName, 'vesselName'), // fun0
      createZKFieldEntry(25, firstVoyage.carrierExportVoyageNumber, 'carrierExportVoyageNumber'), // fun0
      createZKFieldEntry(26, equipment.equipmentReference, 'equipmentReference'), // fun0
      createZKFieldEntry(27, firstConsignment.carrierBookingReference, 'carrierBookingReference'), // fun0
      createZKFieldEntry(28, blData.serviceContractReference, 'serviceContractReference'), // fun0
      createZKFieldEntry(29, firstSeal.number, 'sealNumber'), // fun0
      
      // Additional fun1 fields (30-32) - Two uppercase letters
      createZKFieldEntry(30, firstCharge.currencyCode, 'currencyCode'), // fun1
      createZKFieldEntry(31, extractCountryCode(portOfLoading.UNLocationCode), 'portOfLoadingCountry'), // fun1
      createZKFieldEntry(32, extractCountryCode(portOfDischarge.UNLocationCode), 'portOfDischargeCountry'), // fun1
      
      // Additional fun2 fields (33-37) - One or more non-whitespace
      createZKFieldEntry(33, equipment.ISOEquipmentCode, 'ISOEquipmentCode'), // fun2
      createZKFieldEntry(34, outerPackaging.packageCode, 'packageCode'), // fun2
      createZKFieldEntry(35, firstCharge.paymentTermCode, 'paymentTermCode'), // fun2
      createZKFieldEntry(36, blData.freightPaymentTermCode, 'freightPaymentTermCode'), // fun2
      createZKFieldEntry(37, portOfLoading.UNLocationCode, 'portOfLoadingCode'), // fun2

      // ================ COMPLETE DOCUMENT DATA (38+) - DATA STORAGE ONLY ================
      // Store all other fields for complete data integrity using direct hashing
      
      // Additional document fields for completeness
      createDataFieldEntry(38, blData.shippingInstructionsReference, 'shippingInstructionsReference'),
      createDataFieldEntry(39, blData.shippedOnBoardDate, 'shippedOnBoardDate'),
      createDataFieldEntry(40, portOfDischarge.UNLocationCode, 'portOfDischargeCode'),
      createDataFieldEntry(41, issuingAddress.streetNumber, 'streetNumber'),
      createDataFieldEntry(42, firstConsignment.descriptionOfGoods ? firstConsignment.descriptionOfGoods.join(', ') : '', 'descriptionOfGoods'),
      createDataFieldEntry(43, firstConsignment.HSCodes ? firstConsignment.HSCodes.join(', ') : '', 'HSCodes'),
      createDataFieldEntry(44, firstCargoItem.cargoGrossWeight ? `${firstCargoItem.cargoGrossWeight.value} ${firstCargoItem.cargoGrossWeight.unit}` : '', 'cargoGrossWeight'),
      createDataFieldEntry(45, outerPackaging.numberOfPackages, 'numberOfPackages'),
      createDataFieldEntry(46, outerPackaging.description, 'packageDescription'),
      createDataFieldEntry(47, firstEquipment.isShipperOwned, 'isShipperOwned'),
      createDataFieldEntry(48, firstCharge.chargeName, 'chargeName'),
      createDataFieldEntry(49, firstCharge.currencyAmount, 'currencyAmount'),
      createDataFieldEntry(50, firstCharge.calculationBasis, 'calculationBasis'),
      createDataFieldEntry(51, firstCharge.unitPrice, 'unitPrice'),
      createDataFieldEntry(52, firstCharge.quantity, 'chargeQuantity'),

      // Contact and party details
      createDataFieldEntry(53, partyContactDetails[0]?.name, 'contactName'),
      createDataFieldEntry(54, partyContactDetails[0]?.email, 'contactEmail'),
      createDataFieldEntry(55, shipper.displayedAddress ? shipper.displayedAddress.join(', ') : '', 'shipperDisplayedAddress'),
      createDataFieldEntry(56, issuingParty.identifyingCodes ? JSON.stringify(issuingParty.identifyingCodes[0] || {}) : '', 'issuingPartyIdentifyingCodes'),

      // Invoice and payment details  
      createDataFieldEntry(57, blData.invoicePayableAt ? blData.invoicePayableAt.UNLocationCode : '', 'invoicePayableAtLocation'),

      // Reserve fields for future expansion (58-99)
      ...Array.from({length: 42}, (_, i) => createDataFieldEntry(58 + i, '', `reserved_${58 + i}`)),
    ];
  }

  get root(): Field {
    return this.tree.getRoot();
  }

  public witness(index: number): BusinessStdMerkleWitness8 {
    return new BusinessStdMerkleWitness8(this.tree.getWitness(BigInt(index)));
  }

  // Compatibility method for test utils
  public getWitness(index: number): BusinessStdMerkleWitness8 {
    return this.witness(index);
  }

  // Get field value by index
  public getFieldValue(index: number): CircuitString {
    const field = this.values.find(v => v.key === index);
    if (!field) {
      throw new Error(`Field with index ${index} not found`);
    }
    // Convert Field array back to CircuitString
    const characters = field.value.map(f => {
      const charValue = Number(f.toBigInt()) % 256;
      return String.fromCharCode(charValue);
    }).join('');
    return CircuitString.fromString(characters);
  }

  // Get field name by index
  public getFieldName(index: number): string {
    const field = this.values.find(v => v.key === index);
    if (!field) {
      throw new Error(`Field with index ${index} not found`);
    }
    return field.fieldName;
  }

  // List all available fields
  public listFields(): {index: number, name: string, value: string}[] {
    return this.values.map(field => ({
      index: field.key,
      name: field.fieldName,
      value: CircuitString.fromFields(field.value).toString()
    }));
  }
}

// Utility class for Business Standard Merkle operations
export class BusinessStdMerkleUtils {
  
  // Complete field index mappings
  static readonly FIELD_INDICES: Record<string, number> = {
    // CORE 24 REQUIRED FIELDS (0-23)
    // Pattern validation fields (0-5)
    'transportDocumentReference': 0,    // fun0
    'shipperPartyName': 1,             // fun0
    'issuingPartyName': 2,             // fun0
    'addressCity': 3,                  // fun0
    'countryCode': 4,                  // fun1
    'carrierCode': 5,                  // fun2
    
    // Enum validation fields (6-9)
    'transportDocumentTypeCode': 6,     // enum: BOL, SWB
    'receiptTypeAtOrigin': 7,          // enum: CY, SD, CFS
    'deliveryTypeAtDestination': 8,     // enum: CY, SD, CFS
    'carrierCodeListProvider': 9,       // enum: SMDG, NMFTA
    
    // Boolean validation fields (10-12)
    'isShippedOnBoardType': 10,        // boolean
    'isElectronic': 11,                // boolean
    'isToOrder': 12,                   // boolean
    
    // Array count fields (13-16)
    'partyContactDetailsCount': 13,     // >= 1
    'consignmentItemsCount': 14,       // >= 1
    'utilizedTransportEquipmentsCount': 15, // >= 1
    'vesselVoyagesCount': 16,          // >= 1
    
    // String existence fields (17-23) - the "missing" 7 fields
    'transportDocumentStatus': 17,      // not empty
    'street': 18,                      // not empty
    'termsAndConditions': 19,          // not empty
    'cargoMovementTypeAtOrigin': 20,    // not empty
    'cargoMovementTypeAtDestination': 21, // not empty
    'plannedArrivalDate': 22,          // not empty
    'plannedDepartureDate': 23,        // not empty

    // ADDITIONAL FIELDS USING EXISTING ZKRegex (24-37)
    // Additional fun0 fields (24-29)
    'vesselName': 24,                  // fun0
    'carrierExportVoyageNumber': 25,   // fun0
    'equipmentReference': 26,          // fun0
    'carrierBookingReference': 27,     // fun0
    'serviceContractReference': 28,    // fun0
    'sealNumber': 29,                  // fun0
    
    // Additional fun1 fields (30-32)
    'currencyCode': 30,                // fun1
    'portOfLoadingCountry': 31,        // fun1
    'portOfDischargeCountry': 32,      // fun1
    
    // Additional fun2 fields (33-37)
    'ISOEquipmentCode': 33,            // fun2
    'packageCode': 34,                 // fun2
    'paymentTermCode': 35,             // fun2
    'freightPaymentTermCode': 36,      // fun2
    'portOfLoadingCode': 37,           // fun2

    // COMPLETE DOCUMENT DATA (38+)
    'shippingInstructionsReference': 38,
    'shippedOnBoardDate': 39,
    'portOfDischargeCode': 40,
    'streetNumber': 41,
    'descriptionOfGoods': 42,
    'HSCodes': 43,
    'cargoGrossWeight': 44,
    'numberOfPackages': 45,
    'packageDescription': 46,
    'isShipperOwned': 47,
    'chargeName': 48,
    'currencyAmount': 49,
    'calculationBasis': 50,
    'unitPrice': 51,
    'chargeQuantity': 52,
    'contactName': 53,
    'contactEmail': 54,
    'shipperDisplayedAddress': 55,
    'issuingPartyIdentifyingCodes': 56,
    'invoicePayableAtLocation': 57,
  };

  // Create Merkle tree from BL data
  static createBusinessStdMerkleTree(blData: any): BusinessStdMerkleTree {
    console.log(`🌳 Creating Business Standard Merkle tree`);
    const tree = new BusinessStdMerkleTree(blData);
    
    console.log(`✅ Merkle tree created with ${tree.values.length} fields`);
    console.log(`🔗 Root hash: ${tree.root.toString()}`);
    
    return tree;
  }

  // Get witnesses for specific fields
  static getFieldWitnesses(tree: BusinessStdMerkleTree, fieldNames: string[]): BusinessStdMerkleWitness8[] {
    return fieldNames.map(fieldName => {
      const index = this.FIELD_INDICES[fieldName as keyof typeof this.FIELD_INDICES];
      if (index === undefined) {
        throw new Error(`Unknown field name: ${fieldName}. Available fields: ${Object.keys(this.FIELD_INDICES).join(', ')}`);
      }
      return tree.witness(index);
    });
  }

  // Get field values for specific fields
  static getFieldValues(tree: BusinessStdMerkleTree, fieldNames: string[]): CircuitString[] {
    return fieldNames.map(fieldName => {
      const index = this.FIELD_INDICES[fieldName as keyof typeof this.FIELD_INDICES];
      if (index === undefined) {
        throw new Error(`Unknown field name: ${fieldName}. Available fields: ${Object.keys(this.FIELD_INDICES).join(', ')}`);
      }
      return tree.getFieldValue(index);
    });
  }

  // Get core compliance fields for required 24 field validation
  static getCoreComplianceFields(tree: BusinessStdMerkleTree): {
    witnesses: BusinessStdMerkleWitness8[],
    values: CircuitString[],
    fieldNames: string[]
  } {
    const coreFields = [
      // Pattern validation (6 fields)
      'transportDocumentReference', 'shipperPartyName', 'issuingPartyName', 
      'addressCity', 'countryCode', 'carrierCode',
      
      // Enum validation (4 fields)
      'transportDocumentTypeCode', 'receiptTypeAtOrigin', 
      'deliveryTypeAtDestination', 'carrierCodeListProvider',
      
      // Boolean validation (3 fields)
      'isShippedOnBoardType', 'isElectronic', 'isToOrder',
      
      // Array count validation (4 fields)
      'partyContactDetailsCount', 'consignmentItemsCount', 
      'utilizedTransportEquipmentsCount', 'vesselVoyagesCount',
      
      // String existence validation (7 fields)
      'transportDocumentStatus', 'street', 'termsAndConditions',
      'cargoMovementTypeAtOrigin', 'cargoMovementTypeAtDestination',
      'plannedArrivalDate', 'plannedDepartureDate'
    ];
    
    return {
      witnesses: this.getFieldWitnesses(tree, coreFields),
      values: this.getFieldValues(tree, coreFields),
      fieldNames: coreFields
    };
  }

  // Get enhanced compliance fields (core + additional ZKRegex fields)
  static getEnhancedComplianceFields(tree: BusinessStdMerkleTree): {
    witnesses: BusinessStdMerkleWitness8[],
    values: CircuitString[],
    fieldNames: string[]
  } {
    const enhancedFields = [
      // Core 24 fields
      'transportDocumentReference', 'shipperPartyName', 'issuingPartyName', 
      'addressCity', 'countryCode', 'carrierCode',
      'transportDocumentTypeCode', 'receiptTypeAtOrigin', 
      'deliveryTypeAtDestination', 'carrierCodeListProvider',
      'isShippedOnBoardType', 'isElectronic', 'isToOrder',
      'partyContactDetailsCount', 'consignmentItemsCount', 
      'utilizedTransportEquipmentsCount', 'vesselVoyagesCount',
      'transportDocumentStatus', 'street', 'termsAndConditions',
      'cargoMovementTypeAtOrigin', 'cargoMovementTypeAtDestination',
      'plannedArrivalDate', 'plannedDepartureDate',
      
      // Additional ZKRegex fields (14 fields)
      'vesselName', 'carrierExportVoyageNumber', 'equipmentReference',
      'carrierBookingReference', 'serviceContractReference', 'sealNumber',
      'currencyCode', 'portOfLoadingCountry', 'portOfDischargeCountry',
      'ISOEquipmentCode', 'packageCode', 'paymentTermCode',
      'freightPaymentTermCode', 'portOfLoadingCode'
    ];
    
    return {
      witnesses: this.getFieldWitnesses(tree, enhancedFields),
      values: this.getFieldValues(tree, enhancedFields),
      fieldNames: enhancedFields
    };
  }

  // Verify a field exists in the tree (useful for testing)
  static verifyFieldInTree(tree: BusinessStdMerkleTree, fieldName: string, expectedValue?: string): boolean {
    try {
      const index = this.FIELD_INDICES[fieldName as keyof typeof this.FIELD_INDICES];
      if (index === undefined) return false;

      const witness = tree.witness(index);
      const fieldValue = tree.getFieldValue(index);
      const fieldHash = Poseidon.hash(fieldValue.values.map(c => c.toField()));
      const calculatedRoot = witness.calculateRoot(fieldHash);
      
      const rootMatches = calculatedRoot.equals(tree.root).toBoolean();
      
      if (expectedValue) {
        const valueMatches = fieldValue.toString() === expectedValue;
        console.log(`🔍 Field '${fieldName}': Root match=${rootMatches}, Value match=${valueMatches}`);
        return rootMatches && valueMatches;
      }
      
      console.log(`🔍 Field '${fieldName}': Root match=${rootMatches}`);
      return rootMatches;
    } catch (error) {
      console.error(`❌ Error verifying field '${fieldName}':`, error);
      return false;
    }
  }

  // Print tree summary
  static printTreeSummary(tree: BusinessStdMerkleTree): void {
    console.log('\n📊 Business Standard Merkle Tree Summary:');
    console.log(`🔗 Root: ${tree.root.toString()}`);
    console.log(`📁 Total fields: ${tree.values.length}`);
    console.log('\n📋 Available fields:');
    
    const fields = tree.listFields();
    fields.forEach((field, index) => {
      const truncatedValue = field.value.length > 50 ? 
        field.value.substring(0, 47) + '...' : field.value;
      console.log(`  ${field.index.toString().padStart(2)}: ${field.name.padEnd(35)} = "${truncatedValue}"`);
    });
    console.log('');
  }
}

export { BusinessStdMerkleWitness8 };
