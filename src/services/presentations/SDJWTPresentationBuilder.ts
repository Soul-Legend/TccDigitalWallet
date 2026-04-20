import {
  PresentationExchangeRequest,
  VerifiableCredential,
  VerifiablePresentation,
} from '../../types';
import type {ICryptoService, ILogService, IStorageService} from '../../types';
import {ValidationError} from '../ErrorHandler';
import {canonicalize} from '../encoding';
import {
  extractDisclosedAttributes,
  obfuscateNonDisclosedAttributes,
} from '../PresentationHelpers';

/**
 * Builds the canonical byte string the holder signs over a SD-JWT
 * presentation envelope. The verifier reconstructs the same string
 * via this exact function — see VerificationService.SignatureVerifier.
 */
export function canonicalPresentationSigningInput(
  presentation: VerifiablePresentation,
  hashedAttributes: Record<string, string> = {},
): string {
  return canonicalize({
    '@context': presentation['@context'],
    challenge: presentation.proof?.challenge ?? null,
    disclosed_attributes: presentation.disclosed_attributes ?? {},
    hashed_attributes: hashedAttributes,
    holder: presentation.holder,
    type: presentation.type,
    verifiableCredential: presentation.verifiableCredential,
  });
}

/**
 * Builds an SD-JWT-style presentation: discloses the user-selected
 * attributes in the clear and ships salted SHA-256 hashes for every
 * other attribute so the verifier can prove non-disclosure.
 */
export class SDJWTPresentationBuilder {
  constructor(
    private readonly logger: ILogService,
    private readonly crypto: ICryptoService,
    private readonly storage: IStorageService,
  ) {}

  async build(
    credential: VerifiableCredential,
    pexRequest: PresentationExchangeRequest,
    selectedAttributes: string[],
  ): Promise<VerifiablePresentation> {
    try {
      const holderPrivateKey = await this.storage.getHolderPrivateKey();
      if (!holderPrivateKey) {
        throw new ValidationError(
          'Chave privada do titular não encontrada',
          'holder_private_key',
          undefined,
        );
      }

      this.logger.captureEvent(
        'presentation_creation',
        'titular',
        {
          parameters: {
            action: 'presentation_creation_started',
            selected_attributes_count: selectedAttributes.length,
          },
        },
        true,
      );

      const disclosedAttributes = extractDisclosedAttributes(
        credential,
        selectedAttributes,
      );
      const obfuscatedAttributes = await obfuscateNonDisclosedAttributes(
        credential,
        selectedAttributes,
      );

      const presentation: VerifiablePresentation = {
        '@context': [
          'https://www.w3.org/2018/credentials/v1',
          'https://identity.foundation/presentation-exchange/submission/v1',
        ],
        type: ['VerifiablePresentation', 'PresentationSubmission'],
        holder: credential.credentialSubject.id,
        verifiableCredential: credential,
        proof: {
          type: 'JsonWebSignature2020',
          created: new Date().toISOString(),
          challenge: pexRequest.challenge,
          proofPurpose: 'authentication',
          verificationMethod: `${credential.credentialSubject.id}#key-1`,
        },
        disclosed_attributes: disclosedAttributes,
      };
      (presentation as any).hashed_attributes = obfuscatedAttributes;

      const signingInput = canonicalPresentationSigningInput(
        presentation,
        obfuscatedAttributes,
      );
      const signature = await this.crypto.signData(
        signingInput,
        holderPrivateKey,
        'titular',
      );
      presentation.proof.jws = signature;

      this.logger.captureEvent(
        'presentation_creation',
        'titular',
        {
          parameters: {
            action: 'presentation_created',
            disclosed_count: selectedAttributes.length,
            obfuscated_count: Object.keys(obfuscatedAttributes).length,
            holder: credential.credentialSubject.id,
          },
        },
        true,
      );
      return presentation;
    } catch (error) {
      this.logger.captureEvent(
        'presentation_creation',
        'titular',
        {parameters: {action: 'presentation_creation_failed'}},
        false,
        error instanceof Error ? error : new Error(String(error)),
      );
      throw error;
    }
  }
}
