/**
 * Contract Utilities - Index file
 * Exports all contract-related utility functions
 */

export {
  checkCompanyExistsOnChain,
  createContractStateBasedWitness,
  createCompanyKey,
  validateContractAccess,
  logContractState,
  type CompanyExistenceResult,
  type WitnessCreationResult
} from './o1js/ContractStateQueries.js';
