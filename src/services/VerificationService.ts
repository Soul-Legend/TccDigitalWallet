import {
  PresentationExchangeRequest,
  VerifiablePresentation,
  ValidationResult,
  Scenario,
  Predicate,
} from '../types';
import type {
  ILogService,
  ICryptoService,
  IStorageService,
  IZKProofService,
  IAnonCredsService,
} from '../types';
import LogServiceInstance from './LogService';
import CryptoServiceInstance from './CryptoService';
import StorageServiceInstance from './StorageService';
import ZKProofServiceInstance from './ZKProofService';
import AnonCredsServiceInstance from './AnonCredsService';
import {VerificationPipeline} from './VerificationPipeline';
import {
  createSignatureStep,
  createTrustChainStep,
  createIntegrityStep,
  createChallengeStep,
  createPredicateStep,
  createNullifierStep,
  createResourceAccessStep,
} from './VerificationSteps';
import {ScenarioCatalog} from './verification/ScenarioCatalog';
import {PresentationFormatValidator} from './verification/PresentationFormatValidator';
import {SignatureVerifier} from './verification/SignatureVerifier';
import {IntegrityVerifier} from './verification/IntegrityVerifier';
import {PredicateChecker} from './verification/PredicateChecker';
import {NullifierStore} from './verification/NullifierStore';
import {ResourceAccessChecker} from './verification/ResourceAccessChecker';

/**
 * VerificationService — thin facade composing focused collaborators.
 *
 * Concerns are split into single-responsibility classes under
 * `services/verification/` (see `ScenarioCatalog`, `SignatureVerifier`,
 * `IntegrityVerifier`, `PredicateChecker`, `NullifierStore`,
 * `ResourceAccessChecker`, `PresentationFormatValidator`).
 *
 * The public API is preserved for backward compatibility with screens,
 * tests, and the existing `VerificationPipeline` step factories.
 */
class VerificationService {
  private readonly logger: ILogService;
  private readonly scenarios: ScenarioCatalog;
  private readonly formatValidator: PresentationFormatValidator;
  private readonly signatureVerifier: SignatureVerifier;
  private readonly integrityVerifier: IntegrityVerifier;
  private readonly predicates: PredicateChecker;
  private readonly nullifiers: NullifierStore;
  private readonly resourceAccess: ResourceAccessChecker;

  constructor(
    logger: ILogService = LogServiceInstance,
    crypto: ICryptoService = CryptoServiceInstance,
    storage: IStorageService = StorageServiceInstance,
    zkProof: IZKProofService = ZKProofServiceInstance,
    anonCredsService: IAnonCredsService = AnonCredsServiceInstance,
  ) {
    this.logger = logger;
    this.scenarios = new ScenarioCatalog(logger, crypto);
    this.formatValidator = new PresentationFormatValidator(logger);
    this.integrityVerifier = new IntegrityVerifier(
      logger,
      crypto,
      storage,
      zkProof,
      anonCredsService,
    );
    this.signatureVerifier = new SignatureVerifier(
      logger,
      crypto,
      storage,
      presentation => this.integrityVerifier.verifyAnonCredsPresentation(presentation),
    );
    this.predicates = new PredicateChecker();
    this.nullifiers = new NullifierStore(logger, storage);
    this.resourceAccess = new ResourceAccessChecker(logger);
  }

  // -------------------------------------------------------------------
  // Scenario catalog
  // -------------------------------------------------------------------

  getScenarios(): Scenario[] {
    return this.scenarios.getScenarios();
  }

  getScenario(scenarioId: string): Scenario | undefined {
    return this.scenarios.getScenario(scenarioId);
  }

  generateChallenge(
    scenarioId: string,
    additionalData?: {election_id?: string; resource_id?: string},
  ): Promise<PresentationExchangeRequest> {
    return this.scenarios.generateChallenge(scenarioId, additionalData);
  }

  // -------------------------------------------------------------------
  // Format validation
  // -------------------------------------------------------------------

  validatePresentationFormat(
    presentation: string | VerifiablePresentation,
  ): VerifiablePresentation {
    return this.formatValidator.validate(presentation);
  }

  // -------------------------------------------------------------------
  // Signature + integrity (also wired into VerificationSteps)
  // -------------------------------------------------------------------

  verifyIssuerSignature(
    presentation: VerifiablePresentation,
    issuerPublicKey?: string,
  ): Promise<boolean> {
    return this.signatureVerifier.verify(presentation, issuerPublicKey);
  }

  verifyStructuralIntegrity(
    presentation: VerifiablePresentation,
    pexRequest: PresentationExchangeRequest,
  ): Promise<boolean> {
    return this.integrityVerifier.verify(presentation, pexRequest);
  }

  // -------------------------------------------------------------------
  // Nullifier store
  // -------------------------------------------------------------------

  checkNullifier(nullifier: string, electionId: string): Promise<boolean> {
    return this.nullifiers.exists(nullifier, electionId);
  }

  storeNullifier(nullifier: string, electionId: string): Promise<void> {
    return this.nullifiers.store(nullifier, electionId);
  }

  // -------------------------------------------------------------------
  // Pipeline-driven validation
  // -------------------------------------------------------------------

  async validatePresentation(
    presentation: string | VerifiablePresentation,
    pexRequest: PresentationExchangeRequest,
  ): Promise<ValidationResult> {
    try {
      const validated = this.formatValidator.validate(presentation);

      const pipeline = new VerificationPipeline()
        .register(createSignatureStep(this))
        .register(createTrustChainStep())
        .register(createIntegrityStep(this))
        .register(createChallengeStep())
        .register(
          createPredicateStep(
            (p, preds: Predicate[]) => this.predicates.satisfies(p, preds),
            (p, preds: Predicate[]) => this.predicates.failed(p, preds),
          ),
        )
        .register(createNullifierStep(this))
        .register(
          createResourceAccessStep(
            p => this.predicates.extractVerifiedAttributes(p),
            (attrs, resourceId) => this.resourceAccess.hasAccess(attrs, resourceId),
          ),
        );

      const context = await pipeline.execute(validated, pexRequest);

      const verified = this.predicates.extractVerifiedAttributes(validated);
      const valid = context.errors.length === 0;

      this.logger.captureEvent(
        'verification',
        'verificador',
        {
          verification_result: valid,
          parameters: {
            action: 'presentation_validated',
            valid,
            errors_count: context.errors.length,
            nullifier_check: context.nullifierCheck,
          },
        },
        true,
      );

      return {
        valid,
        errors: context.errors.length > 0 ? context.errors : undefined,
        verified_attributes: verified,
        predicates_satisfied: context.predicatesSatisfied ?? true,
        nullifier_check: context.nullifierCheck,
        trust_chain_valid: context.trustChainValid,
      };
    } catch (error) {
      this.logger.captureEvent(
        'verification',
        'verificador',
        {
          verification_result: false,
          parameters: {action: 'presentation_validation_failed'},
        },
        false,
        error instanceof Error ? error : new Error(String(error)),
      );
      return {
        valid: false,
        errors: [error instanceof Error ? error.message : 'Erro desconhecido na validação'],
      };
    }
  }
}

export {VerificationService};

const verificationServiceInstance = new VerificationService();
export default verificationServiceInstance;
