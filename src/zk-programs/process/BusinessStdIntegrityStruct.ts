import {Field,Struct,CircuitString,} from 'o1js';

import { BusinessStdMerkleWitness8 } from '../../utils/optimerkle/domain/process/dataIntegrity/BusinessStdIntegrityOptimMerkleUtils.js';

export class PatternValidation extends Struct({
    witness0: BusinessStdMerkleWitness8, witness1: BusinessStdMerkleWitness8, witness2: BusinessStdMerkleWitness8,
    witness3: BusinessStdMerkleWitness8, witness4: BusinessStdMerkleWitness8, witness5: BusinessStdMerkleWitness8,
    value0: CircuitString, value1: CircuitString, value2: CircuitString,
    value3: CircuitString, value4: CircuitString, value5: CircuitString,
  }) {}
  
  export class EnumValidation extends Struct({
    witness0: BusinessStdMerkleWitness8, witness1: BusinessStdMerkleWitness8, witness2: BusinessStdMerkleWitness8, witness3: BusinessStdMerkleWitness8,
    value0: CircuitString, value1: CircuitString, value2: CircuitString, value3: CircuitString,
  }) {}
  
  export class BooleanValidation extends Struct({
    witness0: BusinessStdMerkleWitness8, witness1: BusinessStdMerkleWitness8, witness2: BusinessStdMerkleWitness8,
    value0: CircuitString, value1: CircuitString, value2: CircuitString,
  }) {}
  
  export class ArrayValidation extends Struct({
    witness0: BusinessStdMerkleWitness8, witness1: BusinessStdMerkleWitness8, witness2: BusinessStdMerkleWitness8, witness3: BusinessStdMerkleWitness8,
    value0: CircuitString, value1: CircuitString, value2: CircuitString, value3: CircuitString,
  }) {}
  
  export class StringValidation extends Struct({
    witness0: BusinessStdMerkleWitness8, witness1: BusinessStdMerkleWitness8, witness2: BusinessStdMerkleWitness8,
    witness3: BusinessStdMerkleWitness8, witness4: BusinessStdMerkleWitness8, witness5: BusinessStdMerkleWitness8, witness6: BusinessStdMerkleWitness8,
    value0:CircuitString, value1: CircuitString, value2: CircuitString,
    value3:CircuitString, value4: CircuitString, value5: CircuitString, value6:CircuitString,
  }) {}
  
  export class CoreComplianceData extends Struct({
    blToProve: Field,
    merkleRoot: Field,
    patternValidation: PatternValidation,
    enumValidation: EnumValidation,
    booleanValidation: BooleanValidation,
    arrayValidation: ArrayValidation,
    stringValidation: StringValidation,
  }) {}

