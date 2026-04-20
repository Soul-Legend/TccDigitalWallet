import {VerifiablePresentation, Predicate} from '../../types';
import {evaluatePredicate} from '../PresentationHelpers';

/**
 * Predicate evaluation against three presentation shapes (legacy single
 * `zkp_proof`, modern `zkp_proofs[]`, plain credential) — and verified
 * attribute extraction used by the resource-access step.
 */
export class PredicateChecker {
  extractVerifiedAttributes(
    presentation: VerifiablePresentation,
  ): Record<string, unknown> {
    if (presentation.disclosed_attributes) {
      return presentation.disclosed_attributes;
    }

    if (presentation.zkp_proofs && presentation.zkp_proofs.length > 0) {
      const revealed: Record<string, unknown> = {};
      for (const proof of presentation.zkp_proofs) {
        if (proof.revealed_attrs && proof.revealed_attrs.length > 0) {
          for (const attr of proof.revealed_attrs) {
            revealed[attr] = true;
          }
        }
      }
      return revealed;
    }

    const credential =
      typeof presentation.verifiableCredential === 'string'
        ? JSON.parse(presentation.verifiableCredential)
        : presentation.verifiableCredential;
    return credential.credentialSubject;
  }

  satisfies(
    presentation: VerifiablePresentation,
    predicates: Predicate[],
  ): boolean {
    if (presentation.zkp_proof) {
      for (const predicate of predicates) {
        const proof = presentation.zkp_proof.predicates.find(
          p => p.attr_name === predicate.attribute,
        );
        if (!proof || proof.satisfied === false) {
          return false;
        }
      }
      return true;
    }

    if (presentation.zkp_proofs) {
      for (const predicate of predicates) {
        const proof = presentation.zkp_proofs.find(
          p => p.predicate.attr_name === predicate.attribute,
        );
        if (!proof || !proof.predicate_satisfied) {
          return false;
        }
      }
      return true;
    }

    const credential =
      typeof presentation.verifiableCredential === 'string'
        ? JSON.parse(presentation.verifiableCredential)
        : presentation.verifiableCredential;
    for (const predicate of predicates) {
      const value = credential.credentialSubject[predicate.attribute];
      if (!evaluatePredicate(value, predicate.p_type, predicate.value)) {
        return false;
      }
    }
    return true;
  }

  failed(
    presentation: VerifiablePresentation,
    predicates: Predicate[],
  ): string[] {
    const failures: string[] = [];

    if (presentation.zkp_proof) {
      for (const predicate of predicates) {
        const proof = presentation.zkp_proof.predicates.find(
          p => p.attr_name === predicate.attribute,
        );
        if (!proof || proof.satisfied === false) {
          failures.push(`${predicate.attribute} ${predicate.p_type} ${predicate.value}`);
        }
      }
      return failures;
    }

    if (presentation.zkp_proofs) {
      for (const predicate of predicates) {
        const proof = presentation.zkp_proofs.find(
          p => p.predicate.attr_name === predicate.attribute,
        );
        if (!proof || !proof.predicate_satisfied) {
          failures.push(`${predicate.attribute} ${predicate.p_type} ${predicate.value}`);
        }
      }
      return failures;
    }

    const credential =
      typeof presentation.verifiableCredential === 'string'
        ? JSON.parse(presentation.verifiableCredential)
        : presentation.verifiableCredential;
    for (const predicate of predicates) {
      const value = credential.credentialSubject[predicate.attribute];
      if (!evaluatePredicate(value, predicate.p_type, predicate.value)) {
        if (predicate.attribute === 'data_nascimento' && typeof predicate.value === 'number') {
          failures.push(`idade ${predicate.p_type} ${predicate.value} anos`);
        } else {
          failures.push(`${predicate.attribute} ${predicate.p_type} ${predicate.value}`);
        }
      }
    }
    return failures;
  }
}
