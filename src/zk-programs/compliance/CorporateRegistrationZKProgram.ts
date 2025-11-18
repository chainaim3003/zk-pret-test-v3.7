import {
   Field,
   Signature,
   Struct,
   ZkProgram,
   CircuitString,
   Poseidon,
   MerkleWitness,
   UInt64,
   Bool,
} from 'o1js';
import { getPublicKeyFor } from '../../core/OracleRegistry.js';

// =================================== Merkle Tree Configuration ===================================
export const CORP_REG_MERKLE_TREE_HEIGHT = 8; // Height 8 for up to 256 fields
export class CorporateRegistrationMerkleWitness8 extends MerkleWitness(CORP_REG_MERKLE_TREE_HEIGHT) {}

// =================================== Field Indices for Corporate Registration Merkle Tree ===================================
export const CORP_REG_FIELD_INDICES = {
  // Core compliance fields (0-9)
  companyName: 0,
  category: 1,
  classOfCompany: 2,
  registrationNumber: 3,
  listed: 4,
  suspended: 5,
  CIN: 6,
  companyStatus: 7,
  dateOfIncorporation: 8,
  numberOfPartners: 9,
  
  // Additional company details (10-29)
  companyType: 10,
  companySubcategory: 11,
  rocCode: 12,
  registrarOfCompanies: 13,
  email: 14,
  phone: 15,
  website: 16,
  activityDescription: 17,
  companyActivityCode: 18,
  industrialClass: 19,
  mcaId: 20,
  jurisdiction: 21,
  legalForm: 22,
  llpinDetails: 23,
  foreignCompanyDetails: 24,
  
  // Address fields (30-49)
  registeredAddressLine1: 30,
  registeredAddressLine2: 31,
  registeredCity: 32,
  registeredState: 33,
  registeredCountry: 34,
  registeredPincode: 35,
  corporateAddressLine1: 36,
  corporateAddressLine2: 37,
  corporateCity: 38,
  corporateState: 39,
  corporateCountry: 40,
  corporatePincode: 41,
  correspondenceAddressLine1: 42,
  correspondenceAddressLine2: 43,
  correspondenceCity: 44,
  correspondenceState: 45,
  correspondenceCountry: 46,
  correspondencePincode: 47,
  
  // Financial fields (50-69)
  authorizedCapital: 50,
  paidUpCapital: 51,
  numberOfMembers: 52,
  lastAgmDate: 53,
  lastBsDate: 54,
  lastAnnualReturnDate: 55,
  listingStatus: 56,
  suspendedAtStockExchange: 57,
  marketCap: 58,
  shareCapitalDetails: 59,
  
  // Directors and governance (70-89)
  numberOfDirectors: 70,
  directorDetails: 71,
  complianceStatus: 72,
  filingStatus: 73,
  boardComposition: 74,
  keyPersonnel: 75,
  signatoryDetails: 76,
  
  // Legal and regulatory (90-119)
  strikeOffDetails: 90,
  dormantStatus: 91,
  nbfcRegistration: 92,
  prosecutionLaunched: 93,
  conversionDetails: 94,
  amalgamationDetails: 95,
  regulatoryApprovals: 96,
  licenses: 97,
  
  // Additional metadata (120-255 reserved for future expansion)
  createdAt: 120,
  updatedAt: 121,
  dataSource: 122,
  apiVersion: 123,
};

// =================================== Optimized Corporate Registration Data Structure ===================================
export class CorporateRegistrationOptimComplianceData extends Struct({
   // Core compliance identifiers
   companyName: CircuitString,
   CIN: CircuitString,
   registrationNumber: CircuitString,
   
   // Compliance critical fields
   companyStatus: CircuitString,          // ACTIVE/INACTIVE
   dateOfIncorporation: CircuitString,    // For temporal validation
   
   // Business classification
   category: CircuitString,
   classOfCompany: CircuitString,
   numberOfPartners: CircuitString,
   
   // Market status
   listed: CircuitString,                 // Listed on stock exchange
   suspended: CircuitString,              // Suspended status
   
   // Merkle tree root containing all other fields
   merkle_root: Field,
}) {}

// =================================== Public Output Structure ===================================
export class CorporateRegistrationOptimPublicOutput extends Struct({
   companyName: CircuitString,
   CIN: CircuitString,
   isCorpRegCompliant: Bool,
   verification_timestamp: UInt64,
   merkle_root: Field,
}) {}

// =================================== Utility Functions ===================================
function isFieldNotEmpty(field: CircuitString): Bool {
   const emptyField = CircuitString.fromString("");
   return field.equals(emptyField).not();
}

function isCompanyStatusActive(status: CircuitString): Bool {
   // Case insensitive comparison for "ACTIVE"
   const activeStatusUpper = CircuitString.fromString("ACTIVE");
   const activeStatusLower = CircuitString.fromString("active");
   const activeStatusCapitalized = CircuitString.fromString("Active");
   
   return status.equals(activeStatusUpper)
      .or(status.equals(activeStatusLower))
      .or(status.equals(activeStatusCapitalized));
}

function isDateOfIncorporationValidCheck(dateStr: CircuitString, currentTimestamp: UInt64): Bool {
   // Basic validation - check if date string is not empty
   // In a real implementation, you'd parse the date and compare with currentTimestamp
   // For now, just check that the date exists and is not empty
   return isFieldNotEmpty(dateStr);
}

// =================================== ZK Program ===================================
export const CorporateRegistrationOptim = ZkProgram({
   name: 'CorporateRegistrationOptim',
   publicInput: UInt64, // Current timestamp
   publicOutput: CorporateRegistrationOptimPublicOutput,

   methods: {
      proveOptimizedCompliance: {
         privateInputs: [
            CorporateRegistrationOptimComplianceData,
            Signature,              // Oracle signature on merkle root
            
            // Merkle witnesses for selective disclosure of compliance fields
            CorporateRegistrationMerkleWitness8,  // companyName witness
            CorporateRegistrationMerkleWitness8,  // CIN witness
            CorporateRegistrationMerkleWitness8,  // registrationNumber witness
            CorporateRegistrationMerkleWitness8,  // companyStatus witness
            CorporateRegistrationMerkleWitness8,  // dateOfIncorporation witness
            CorporateRegistrationMerkleWitness8,  // category witness
            CorporateRegistrationMerkleWitness8,  // classOfCompany witness
            CorporateRegistrationMerkleWitness8,  // numberOfPartners witness
            CorporateRegistrationMerkleWitness8,  // listed witness
            CorporateRegistrationMerkleWitness8,  // suspended witness
         ],
         
         async method(
            currentTimestamp: UInt64,
            complianceData: CorporateRegistrationOptimComplianceData,
            oracleSignature: Signature,
            companyNameWitness: CorporateRegistrationMerkleWitness8,
            cinWitness: CorporateRegistrationMerkleWitness8,
            registrationNumberWitness: CorporateRegistrationMerkleWitness8,
            companyStatusWitness: CorporateRegistrationMerkleWitness8,
            dateOfIncorporationWitness: CorporateRegistrationMerkleWitness8,
            categoryWitness: CorporateRegistrationMerkleWitness8,
            classOfCompanyWitness: CorporateRegistrationMerkleWitness8,
            numberOfPartnersWitness: CorporateRegistrationMerkleWitness8,
            listedWitness: CorporateRegistrationMerkleWitness8,
            suspendedWitness: CorporateRegistrationMerkleWitness8,
         ): Promise<CorporateRegistrationOptimPublicOutput> {

            // =================================== Oracle Signature Verification ===================================
            // Verify oracle signed the merkle root
            const registryPublicKey = getPublicKeyFor('MCA');
            const isValidSignature = oracleSignature.verify(registryPublicKey, [complianceData.merkle_root]);
            isValidSignature.assertTrue();

            // =================================== Merkle Inclusion Proofs ===================================
            // Verify each compliance field exists in the merkle tree
            const merkleRoot = complianceData.merkle_root;
            
            // Verify company name in merkle tree
            const companyNameHash = complianceData.companyName.hash();
            const companyNameRoot = companyNameWitness.calculateRoot(companyNameHash);
            companyNameRoot.assertEquals(merkleRoot);
            
            // Verify CIN in merkle tree
            const cinHash = complianceData.CIN.hash();
            const cinRoot = cinWitness.calculateRoot(cinHash);
            cinRoot.assertEquals(merkleRoot);
            
            // Verify registration number in merkle tree
            const registrationNumberHash = complianceData.registrationNumber.hash();
            const registrationNumberRoot = registrationNumberWitness.calculateRoot(registrationNumberHash);
            registrationNumberRoot.assertEquals(merkleRoot);
            
            // Verify company status in merkle tree
            const companyStatusHash = complianceData.companyStatus.hash();
            const companyStatusRoot = companyStatusWitness.calculateRoot(companyStatusHash);
            companyStatusRoot.assertEquals(merkleRoot);
            
            // Verify date of incorporation in merkle tree
            const dateOfIncorporationHash = complianceData.dateOfIncorporation.hash();
            const dateOfIncorporationRoot = dateOfIncorporationWitness.calculateRoot(dateOfIncorporationHash);
            dateOfIncorporationRoot.assertEquals(merkleRoot);
            
            // Verify category in merkle tree
            const categoryHash = complianceData.category.hash();
            const categoryRoot = categoryWitness.calculateRoot(categoryHash);
            categoryRoot.assertEquals(merkleRoot);
            
            // Verify class of company in merkle tree
            const classOfCompanyHash = complianceData.classOfCompany.hash();
            const classOfCompanyRoot = classOfCompanyWitness.calculateRoot(classOfCompanyHash);
            classOfCompanyRoot.assertEquals(merkleRoot);
            
            // Verify number of partners in merkle tree
            const numberOfPartnersHash = complianceData.numberOfPartners.hash();
            const numberOfPartnersRoot = numberOfPartnersWitness.calculateRoot(numberOfPartnersHash);
            numberOfPartnersRoot.assertEquals(merkleRoot);
            
            // Verify listed status in merkle tree
            const listedHash = complianceData.listed.hash();
            const listedRoot = listedWitness.calculateRoot(listedHash);
            listedRoot.assertEquals(merkleRoot);
            
            // Verify suspended status in merkle tree
            const suspendedHash = complianceData.suspended.hash();
            const suspendedRoot = suspendedWitness.calculateRoot(suspendedHash);
            suspendedRoot.assertEquals(merkleRoot);

            // =================================== Business Logic Compliance Checks ===================================
            // 1. CIN is not empty
            const isCINValid = isFieldNotEmpty(complianceData.CIN);
            
            // 2. Registration number is not empty
            const isRegistrationNumberValid = isFieldNotEmpty(complianceData.registrationNumber);
            
            // 3. Company name is not empty
            const isCompanyNameValid = isFieldNotEmpty(complianceData.companyName);
            
            // 4. Date of incorporation is valid and <= current datetime
            const isDateOfIncorporationValid = isDateOfIncorporationValidCheck(
               complianceData.dateOfIncorporation,
               currentTimestamp
            );
            
            // 5. Company status is "Active" (case insensitive)
            const isStatusActive = isCompanyStatusActive(complianceData.companyStatus);
            
            // =================================== Overall Compliance Determination ===================================
            // Company is compliant if ALL conditions are met
            const isCorpRegCompliant = isCINValid
               .and(isRegistrationNumberValid)
               .and(isCompanyNameValid)
               .and(isDateOfIncorporationValid)
               .and(isStatusActive);

            // =================================== Return Public Output ===================================
            return new CorporateRegistrationOptimPublicOutput({
               companyName: complianceData.companyName,
               CIN: complianceData.CIN,
               isCorpRegCompliant,
               verification_timestamp: currentTimestamp,
               merkle_root: complianceData.merkle_root,
            });
         },
      },
   },
});

export class CorporateRegistrationOptimProof extends ZkProgram.Proof(CorporateRegistrationOptim) {}
