import {
  IVerificationStep,
  StepResult,
  VerifiablePresentation,
  PresentationExchangeRequest,
  Predicate,
} from '../types';
import TrustChainService from './TrustChainService';
import {VerificationStepName} from '../utils/constants';

/**
 * Interface for the VerificationService methods needed by steps.
 * Avoids circular import of the full service.
 */
export interface IVerificationOperations {
  verifyIssuerSignature(presentation: VerifiablePresentation, issuerPublicKey?: string): Promise<boolean>;
  verifyStructuralIntegrity(presentation: VerifiablePresentation, pexRequest: PresentationExchangeRequest): Promise<boolean>;
  checkNullifier(nullifier: string, electionId: string): Promise<boolean>;
  storeNullifier(nullifier: string, electionId: string): Promise<void>;
}

export function createSignatureStep(service: IVerificationOperations): IVerificationStep {
  return {
    name: VerificationStepName.SIGNATURE,
    async validate(presentation, _pexRequest, _context): Promise<StepResult> {
      try {
        const signatureValid = await service.verifyIssuerSignature(presentation);
        return signatureValid
          ? {valid: true}
          : {valid: false, error: 'Assinatura do emissor inválida'};
      } catch (error) {
        return {valid: false, error: `Erro ao verificar assinatura: ${error instanceof Error ? error.message : String(error)}`};
      }
    },
  };
}

export function createTrustChainStep(): IVerificationStep {
  return {
    name: VerificationStepName.TRUST_CHAIN,
    async validate(presentation, _pexRequest, context): Promise<StepResult> {
      const credential =
        typeof presentation.verifiableCredential === 'string'
          ? JSON.parse(presentation.verifiableCredential)
          : presentation.verifiableCredential;
      const issuerDid = credential.issuer;
      const allIssuers = await TrustChainService.getAllIssuers();
      if (allIssuers.length === 0) {
        return {valid: true}; // Trust chain not configured — skip
      }
      const chainResult = await TrustChainService.verifyTrustChain(issuerDid);
      context.trustChainValid = chainResult.trusted;
      return chainResult.trusted
        ? {valid: true}
        : {valid: false, error: `Emissor não pertence à cadeia de confiança: ${chainResult.error || issuerDid}`};
    },
  };
}

export function createIntegrityStep(service: IVerificationOperations): IVerificationStep {
  return {
    name: VerificationStepName.STRUCTURAL_INTEGRITY,
    async validate(presentation, pexRequest, _context): Promise<StepResult> {
      try {
        const integrityValid = await service.verifyStructuralIntegrity(presentation, pexRequest);
        return integrityValid
          ? {valid: true}
          : {valid: false, error: 'Integridade estrutural inválida'};
      } catch (error) {
        return {valid: false, error: `Erro ao verificar integridade: ${error instanceof Error ? error.message : String(error)}`};
      }
    },
  };
}

export function createChallengeStep(): IVerificationStep {
  return {
    name: VerificationStepName.CHALLENGE,
    async validate(presentation, pexRequest, _context): Promise<StepResult> {
      return presentation.proof.challenge === pexRequest.challenge
        ? {valid: true}
        : {valid: false, error: 'Challenge não corresponde à requisição'};
    },
  };
}

export function createPredicateStep(
  checkPredicates: (p: VerifiablePresentation, preds: Predicate[]) => boolean,
  getFailedPredicates: (p: VerifiablePresentation, preds: Predicate[]) => string[],
): IVerificationStep {
  return {
    name: VerificationStepName.PREDICATE,
    async validate(presentation, pexRequest, context): Promise<StepResult> {
      if (!pexRequest.predicates || pexRequest.predicates.length === 0) {
        return {valid: true};
      }
      const satisfied = checkPredicates(presentation, pexRequest.predicates);
      context.predicatesSatisfied = satisfied;
      if (satisfied) {
        return {valid: true};
      }
      const failed = getFailedPredicates(presentation, pexRequest.predicates);
      return {valid: false, error: `Predicados não satisfeitos: ${failed.join(', ')}`};
    },
  };
}

export function createNullifierStep(service: IVerificationOperations): IVerificationStep {
  return {
    name: VerificationStepName.NULLIFIER,
    async validate(presentation, pexRequest, context): Promise<StepResult> {
      if (!pexRequest.election_id || !presentation.nullifier) {
        return {valid: true};
      }
      const isDuplicate = await service.checkNullifier(presentation.nullifier, pexRequest.election_id);
      context.nullifierCheck = isDuplicate ? 'duplicate' : 'new';
      if (isDuplicate) {
        return {valid: false, error: 'Nullifier já registrado - voto duplicado detectado'};
      }
      await service.storeNullifier(presentation.nullifier, pexRequest.election_id);
      return {valid: true};
    },
  };
}

export function createResourceAccessStep(
  extractVerifiedAttributes: (p: VerifiablePresentation) => Record<string, any>,
  checkLabAccess: (attrs: Record<string, any>, resourceId: string) => boolean,
): IVerificationStep {
  return {
    name: VerificationStepName.RESOURCE_ACCESS,
    async validate(presentation, pexRequest, _context): Promise<StepResult> {
      if (!pexRequest.resource_id) {
        return {valid: true};
      }
      const verifiedAttributes = extractVerifiedAttributes(presentation);
      const hasPermission = checkLabAccess(verifiedAttributes, pexRequest.resource_id);
      return hasPermission
        ? {valid: true}
        : {valid: false, error: `Permissão de acesso não encontrada para: ${pexRequest.resource_id}`};
    },
  };
}
