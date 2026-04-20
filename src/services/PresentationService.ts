import {
  ConsentData,
  PresentationExchangeRequest,
  VerifiableCredential,
  VerifiablePresentation,
} from '../types';
import type {
  ILogService,
  ICryptoService,
  IStorageService,
  IAnonCredsService,
} from '../types';
import LogServiceInstance from './LogService';
import CryptoServiceInstance from './CryptoService';
import StorageServiceInstance from './StorageService';
import AnonCredsServiceInstance from './AnonCredsService';
import {PEXValidator} from './presentations/PEXValidator';
import {
  SDJWTPresentationBuilder,
  canonicalPresentationSigningInput as _canonicalSigningInput,
} from './presentations/SDJWTPresentationBuilder';
import {ZKPPresentationBuilder} from './presentations/ZKPPresentationBuilder';
import {AnonCredsPresentationBuilder} from './presentations/AnonCredsPresentationBuilder';

/** Re-export for verifier (which reconstructs the same canonical form). */
export const canonicalPresentationSigningInput = _canonicalSigningInput;

/**
 * PresentationService — thin facade composing PEX validation + per-format
 * builders. See `services/presentations/` for the strategy implementations
 * (`SDJWTPresentationBuilder`, `ZKPPresentationBuilder`,
 * `AnonCredsPresentationBuilder`, `PEXValidator`).
 *
 * The public API is preserved for backward compatibility with screens
 * and tests.
 */
class PresentationService {
  private readonly logger: ILogService;
  private readonly pex: PEXValidator;
  private readonly sdJwt: SDJWTPresentationBuilder;
  private readonly zkp: ZKPPresentationBuilder;
  private readonly anonCreds: AnonCredsPresentationBuilder;

  constructor(
    logger: ILogService = LogServiceInstance,
    crypto: ICryptoService = CryptoServiceInstance,
    storage: IStorageService = StorageServiceInstance,
    anonCredsService: IAnonCredsService = AnonCredsServiceInstance,
  ) {
    this.logger = logger;
    this.pex = new PEXValidator(logger);
    this.sdJwt = new SDJWTPresentationBuilder(logger, crypto, storage);
    this.zkp = new ZKPPresentationBuilder(logger, storage);
    this.anonCreds = new AnonCredsPresentationBuilder(
      logger,
      storage,
      anonCredsService,
    );
  }

  // -------------------------------------------------------------------
  // PEX request handling
  // -------------------------------------------------------------------

  validatePEXFormat(
    request: string | PresentationExchangeRequest,
  ): PresentationExchangeRequest {
    return this.pex.validate(request);
  }

  extractRequestedAttributes(pexRequest: PresentationExchangeRequest): {
    required: string[];
    optional: string[];
    all: string[];
  } {
    return this.pex.extractRequestedAttributes(pexRequest);
  }

  processPEXRequest(
    pexRequest: string | PresentationExchangeRequest,
    credential: VerifiableCredential,
  ): Promise<ConsentData> {
    return this.pex.buildConsent(pexRequest, credential);
  }

  // -------------------------------------------------------------------
  // Format-specific presentation builders
  // -------------------------------------------------------------------

  createPresentation(
    credential: VerifiableCredential,
    pexRequest: PresentationExchangeRequest,
    selectedAttributes: string[],
  ): Promise<VerifiablePresentation> {
    return this.sdJwt.build(credential, pexRequest, selectedAttributes);
  }

  createZKPPresentation(
    credential: VerifiableCredential,
    pexRequest: PresentationExchangeRequest,
    predicates: Array<{attribute: string; p_type: string; value: any}>,
  ): Promise<VerifiablePresentation> {
    return this.zkp.build(credential, pexRequest, predicates);
  }

  createAnonCredsPresentation(
    credentialToken: string,
    pexRequest: PresentationExchangeRequest,
    revealedAttrs: string[],
    predicates: Array<{attribute: string; p_type: '>=' | '<=' | '>' | '<'; value: number}>,
  ): Promise<VerifiablePresentation> {
    return this.anonCreds.build(credentialToken, pexRequest, revealedAttrs, predicates);
  }

  // -------------------------------------------------------------------
  // Misc
  // -------------------------------------------------------------------

  async copyPresentationToClipboard(
    presentation: VerifiablePresentation,
  ): Promise<void> {
    try {
      const presentationString = JSON.stringify(presentation, null, 2);
      this.logger.captureEvent(
        'presentation_creation',
        'titular',
        {
          parameters: {
            action: 'presentation_copied_to_clipboard',
            presentation_size: presentationString.length,
          },
        },
        true,
      );
      // TODO: Implement actual clipboard copy when integrated with React Native
      // await Clipboard.setString(presentationString);
    } catch (error) {
      this.logger.captureEvent(
        'presentation_creation',
        'titular',
        {parameters: {action: 'clipboard_copy_failed'}},
        false,
        error instanceof Error ? error : new Error(String(error)),
      );
      throw error;
    }
  }
}

export {PresentationService};

const presentationServiceInstance = new PresentationService();
export default presentationServiceInstance;
