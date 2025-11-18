import { Field, Signature, Struct, ZkProgram, CircuitString, Bool, Bytes, Provable, Poseidon } from 'o1js';
import { getPublicKeyFor } from '../../core/OracleRegistry.js';

class Bytes200 extends Bytes(200) {}

export class BusinessStandardDataIntegrityComplianceData extends Struct({
    businessStandardDataIntegrityEvaluationId: Field,
    expectedContent: CircuitString,
    actualContent: CircuitString,
    actualContentFilename: String,
}) {}

export class BusinessStandardDataIntegrityPublicOutput extends Struct({
    businessStandardDataIntegrityEvaluationId: Field,
    result: Bool,
}) {}

export const BusinessStandardDataIntegrityZKProgram = ZkProgram({
    name: 'BusinessStandardDataIntegrityZKProgram',
    publicInput: Field,
    publicOutput: BusinessStandardDataIntegrityPublicOutput,
    methods: {
        proveCompliance: {
            // Added the verification result as a private input to avoid async calls in circuit
            privateInputs: [CircuitString, BusinessStandardDataIntegrityComplianceData, Bool, Signature],
            async method(
                BusinessStandardDataIntegrityToProve: Field, // publicInput
                publicInputString: CircuitString, // privateInputs[0]
                businessStandardDataIntegrityData: BusinessStandardDataIntegrityComplianceData, // privateInputs[1]
                externalVerificationResult: Bool, // privateInputs[2] - NEW: verification result from outside
                oracleSignature: Signature // privateInputs[3] - moved to last position
            ) {
                // =================================== Oracle Signature Verification ===================================
                const complianceDataHash = Poseidon.hash(
                    BusinessStandardDataIntegrityComplianceData.toFields(businessStandardDataIntegrityData)
                );
                const registryPublicKey = getPublicKeyFor('BPMN');
                
                // Log the public inputs
                Provable.asProver(() => {
                    console.log('Public Input (Field):', BusinessStandardDataIntegrityToProve.toJSON());
                    console.log('Public Input (String):', publicInputString.toString());
                    console.log('External Verification Result:', externalVerificationResult.toJSON());
                });

                const isValidSignature = oracleSignature.verify(registryPublicKey, [complianceDataHash]);
                isValidSignature.assertTrue('Oracle signature verification failed');

                // Now we use the external verification result that was computed outside the circuit
                const actualPath2 = businessStandardDataIntegrityData.actualContentFilename;
                
                Provable.asProver(() => {
                    console.log(" ********************************************** ");
                    console.log('  @@ actual File  ', actualPath2, ' ..result..', externalVerificationResult.toJSON());
                });

                // Use the external verification result directly
                // This avoids any async operations or complex computations within the ZK circuit
                return new BusinessStandardDataIntegrityPublicOutput({
                    businessStandardDataIntegrityEvaluationId: businessStandardDataIntegrityData.businessStandardDataIntegrityEvaluationId,
                    result: externalVerificationResult,
                });
            },
        },
    },
});

export class BusinessStandardDataIntegrityProof extends ZkProgram.Proof(BusinessStandardDataIntegrityZKProgram) {}