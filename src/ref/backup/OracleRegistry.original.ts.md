import { Mina, PrivateKey, PublicKey, Field, Poseidon } from 'o1js';

const useProof = false;
export const Local = await Mina.LocalBlockchain({ proofsEnabled: useProof });
Mina.setActiveInstance(Local);

// Account definitions
export const MCAdeployerAccount = Local.testAccounts[0];
export const MCAdeployerKey = MCAdeployerAccount.key;
export const MCAsenderAccount = Local.testAccounts[1];
export const MCAsenderKey = MCAsenderAccount.key;

export const GLEIFdeployerAccount = Local.testAccounts[2];
export const GLEIFdeployerKey = GLEIFdeployerAccount.key;
export const GLEIFsenderAccount = Local.testAccounts[3];
export const GLEIFsenderKey = GLEIFsenderAccount.key;

export const EXIMdeployerAccount = Local.testAccounts[4];
export const EXIMdeployerKey = EXIMdeployerAccount.key;
export const EXIMsenderAccount = Local.testAccounts[5];
export const EXIMsenderKey = EXIMsenderAccount.key;

export const BusinessProverdeployerAccount = Local.testAccounts[6];
export const BusinessProverdeployerKey = BusinessProverdeployerAccount.key;
export const BusinessProversenderAccount = Local.testAccounts[7];
export const BusinessProversenderKey = BusinessProversenderAccount.key;

export const RiskProverdeployerAccount = Local.testAccounts[8];
export const RiskProverdeployerKey = RiskProverdeployerAccount.key;
export const RiskProversenderAccount = Local.testAccounts[9];
export const RiskProversenderKey = RiskProversenderAccount.key;


export const Registry = new Map<string, {
  publicKey: PublicKey;
  privateKey: PrivateKey;
}>([
  ['MCA', {
    publicKey: MCAdeployerAccount,
    privateKey: MCAdeployerKey
  }] ,

  ['GLEIF', {
    publicKey: GLEIFdeployerAccount,
    privateKey: GLEIFdeployerKey
  }] ,

  ['EXIM', {
    publicKey: EXIMdeployerAccount,
    privateKey: EXIMdeployerKey
  }],
  
  ['BPMN', {
    publicKey: BusinessProverdeployerAccount,
    privateKey: BusinessProverdeployerKey
  }],

  ['RISK', {
    publicKey: RiskProverdeployerAccount,
    privateKey: RiskProverdeployerKey
  }],

  ['BL_REGISTRY', {
    publicKey: BusinessProverdeployerAccount,
    privateKey: BusinessProverdeployerKey
  }]

  
]);

export function getPrivateKeyFor(key: string): PrivateKey {
  const privateKey = Registry.get(key)?.privateKey;
  if (!privateKey) throw new Error(`No private key found for ${key}`);
  return privateKey;
}


export function getPublicKeyFor(key: string): PublicKey {
  const publicKey = Registry.get(key)?.publicKey;
  if (!publicKey) throw new Error(`No private key found for ${key}`);
  return publicKey;
}
