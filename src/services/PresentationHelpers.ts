import {VerifiableCredential} from '../types';
import type {ICryptoService, ILogService, IStorageService, IZKProofService} from '../types';
import {ValidationError} from './ErrorHandler';
import LogServiceInstance from './LogService';
import CryptoServiceInstance from './CryptoService';
import StorageServiceInstance from './StorageService';
import ZKProofServiceInstance from './ZKProofService';
import {canonicalAttributeHashInput} from './encoding';
import type {CircomProofResult} from 'mopro-ffi';

export interface PresentationDeps {
  logger: ILogService;
  crypto: ICryptoService;
  storage: IStorageService;
  zkProof: IZKProofService;
}

const defaultDeps: PresentationDeps = {
  logger: LogServiceInstance,
  crypto: CryptoServiceInstance,
  storage: StorageServiceInstance,
  zkProof: ZKProofServiceInstance,
};

/**
 * Checks if an attribute value is a date string (YYYY-MM-DD format)
 */
export function isDateAttribute(value: any): boolean {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/**
 * Evaluates a predicate against an attribute value.
 * Handles date-to-age conversion for date_nascimento fields.
 */
export function evaluatePredicate(
  attributeValue: any,
  operator: string,
  predicateValue: any,
): boolean {
  let attrVal = attributeValue;
  const predVal = predicateValue;

  // Handle date comparisons (for age verification)
  if (typeof attributeValue === 'string' && attributeValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
    if (typeof predicateValue === 'number') {
      const birthDate = new Date(attributeValue);
      if (Number.isNaN(birthDate.getTime())) {
        throw new ValidationError(
          `Data de nascimento inválida: ${attributeValue}`,
          'attributeValue',
          attributeValue,
        );
      }
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      if (age < 0 || !Number.isFinite(age)) {
        throw new ValidationError(
          `Idade calculada inválida: ${age}`,
          'age',
          age,
        );
      }
      attrVal = age;
    }
  }

  switch (operator) {
    case '>=':
      return attrVal >= predVal;
    case '<=':
      return attrVal <= predVal;
    case '==':
      return attrVal === predVal;
    case '!=':
      return attrVal !== predVal;
    case '>':
      return attrVal > predVal;
    case '<':
      return attrVal < predVal;
    default:
      throw new ValidationError(
        `Operador inválido: ${operator}`,
        'operator',
        operator,
      );
  }
}

/**
 * Extracts disclosed attribute values from a credential based on selected attribute names.
 */
export function extractDisclosedAttributes(
  credential: VerifiableCredential,
  selectedAttributes: string[],
): Record<string, any> {
  const disclosed: Record<string, any> = {};
  for (const attr of selectedAttributes) {
    if (attr in credential.credentialSubject) {
      disclosed[attr] = (credential.credentialSubject as any)[attr];
    }
  }
  return disclosed;
}

/**
 * Obfuscates non-disclosed attributes using SHA-256 hashing.
 * Salted with attribute name for security.
 */
export async function obfuscateNonDisclosedAttributes(
  credential: VerifiableCredential,
  selectedAttributes: string[],
  deps: PresentationDeps = defaultDeps,
): Promise<Record<string, string>> {
  const obfuscated: Record<string, string> = {};

  const allAttributes = Object.keys(credential.credentialSubject).filter(
    key => key !== 'id',
  );

  for (const attr of allAttributes) {
    if (!selectedAttributes.includes(attr)) {
      const value = (credential.credentialSubject as any)[attr];
      // SECURITY: canonical (length-prefixed JSON-array) encoding so that
      // values containing the previous `:` separator cannot collide with
      // another (attribute, value) pair.
      const hashInput = canonicalAttributeHashInput(attr, value);
      const hash = await deps.crypto.computeHash(hashInput, 'titular');
      obfuscated[attr] = hash;

      deps.logger.captureEvent(
        'hash_computation',
        'titular',
        {
          parameters: {
            action: 'attribute_obfuscated',
            attribute: attr,
            hash_truncated: hash.substring(0, 16) + '...',
          },
        },
        true,
      );
    }
  }

  return obfuscated;
}

/**
 * Generates ZKP proofs for predicates using mopro/Circom Groth16 proofs.
 * Maps predicates to the appropriate circuit (age_range, status_check).
 */
export async function generateZKPProofs(
  credential: VerifiableCredential,
  predicates: Array<{attribute: string; p_type: string; value: any}>,
  deps: PresentationDeps = defaultDeps,
): Promise<any[]> {
  const proofs: any[] = [];

  for (const predicate of predicates) {
    try {
      const attributeValue = (credential.credentialSubject as any)[predicate.attribute];

      if (attributeValue === undefined) {
        throw new ValidationError(
          `Atributo ${predicate.attribute} não encontrado na credencial`,
          predicate.attribute,
          undefined,
        );
      }

      const predicateSatisfied = evaluatePredicate(
        attributeValue,
        predicate.p_type,
        predicate.value,
      );

      let circomProofResult: CircomProofResult;

      if (isDateAttribute(attributeValue) && typeof predicate.value === 'number') {
        circomProofResult = await deps.zkProof.generateAgeRangeProof(
          attributeValue,
          predicate.value,
        );
      } else if (predicate.p_type === '==' || predicate.p_type === '!=') {
        circomProofResult = await deps.zkProof.generateStatusCheckProof(
          String(attributeValue),
          String(predicate.value),
        );
      } else {
        circomProofResult = await deps.zkProof.generateAgeRangeProof(
          attributeValue,
          predicate.value,
        );
      }

      const proof = {
        predicate: {
          attr_name: predicate.attribute,
          p_type: predicate.p_type,
          value: predicate.value,
        },
        proof_data: {
          circom_proof: circomProofResult.proof,
          public_inputs: circomProofResult.inputs,
        },
        revealed_attrs: [],
        predicate_satisfied: predicateSatisfied,
      };

      proofs.push(proof);

      deps.logger.captureEvent(
        'zkp_generation',
        'titular',
        {
          parameters: {
            action: 'predicate_proof_generated',
            attribute: predicate.attribute,
            p_type: predicate.p_type,
            satisfied: predicateSatisfied,
            proof_system: 'groth16',
          },
        },
        true,
      );
    } catch (error) {
      deps.logger.captureEvent(
        'zkp_generation',
        'titular',
        {
          parameters: {
            action: 'predicate_proof_failed',
            attribute: predicate.attribute,
          },
        },
        false,
        error instanceof Error ? error : new Error(String(error)),
      );
      throw error;
    }
  }

  return proofs;
}

/**
 * Generates a deterministic nullifier for election scenarios.
 * Tries ZK circuit first, falls back to SHA-256 composite hash.
 */
export async function generateNullifier(
  holderPrivateKey: string,
  electionId: string,
  deps: PresentationDeps = defaultDeps,
): Promise<string> {
  try {
    const isAvailable = await deps.zkProof.isCircuitAvailable('nullifier');

    if (isAvailable) {
      const proofResult = await deps.zkProof.generateNullifierProof(
        holderPrivateKey,
        electionId,
      );
      const nullifier = deps.zkProof.extractNullifier(proofResult);
      if (nullifier) {
        return nullifier;
      }
    }

    // Fallback: compute deterministic hash if circuit not available
    const nullifier = await deps.crypto.computeCompositeHash(
      [holderPrivateKey, electionId],
      'titular',
    );
    return nullifier;
  } catch (error) {
    deps.logger.captureEvent(
      'hash_computation',
      'titular',
      {parameters: {action: 'nullifier_generation_failed'}},
      false,
      error instanceof Error ? error : new Error(String(error)),
    );
    throw error;
  }
}
