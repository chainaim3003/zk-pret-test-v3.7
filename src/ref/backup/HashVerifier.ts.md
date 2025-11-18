import { SmartContract, State, method, state, Field } from 'o1js';
import { SecretHashProof } from './SecretHash.js';

export class HashVerifier extends SmartContract {
   @state(Field) storedHash = State<Field>();

   @method async verifyProof(proof: SecretHashProof) {
      proof.verify();
      this.storedHash.requireEquals(this.storedHash.get());
      const currentHash = this.storedHash.get();
      currentHash.assertEquals(proof.publicInput);
   }
}
