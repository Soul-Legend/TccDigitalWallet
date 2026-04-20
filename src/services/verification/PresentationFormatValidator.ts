import {VerifiablePresentation} from '../../types';
import type {ILogService} from '../../types';
import {ValidationError} from '../ErrorHandler';

/**
 * Parses + validates the structural shape of a presentation envelope.
 */
export class PresentationFormatValidator {
  constructor(private readonly logger: ILogService) {}

  validate(
    presentation: string | VerifiablePresentation,
  ): VerifiablePresentation {
    try {
      let parsed: VerifiablePresentation;
      if (typeof presentation === 'string') {
        try {
          parsed = JSON.parse(presentation);
        } catch {
          throw new ValidationError(
            'Formato JSON inválido na apresentação',
            'presentation',
            presentation.substring(0, 50),
          );
        }
      } else {
        parsed = presentation;
      }

      if (!parsed['@context'] || !Array.isArray(parsed['@context'])) {
        throw new ValidationError('Campo @context ausente ou inválido', '@context', parsed['@context']);
      }
      if (!parsed.type || !Array.isArray(parsed.type)) {
        throw new ValidationError('Campo type ausente ou inválido', 'type', parsed.type);
      }
      if (!parsed.holder || typeof parsed.holder !== 'string') {
        throw new ValidationError('Campo holder ausente ou inválido', 'holder', parsed.holder);
      }
      if (!parsed.verifiableCredential) {
        throw new ValidationError('Campo verifiableCredential ausente', 'verifiableCredential', undefined);
      }
      if (!parsed.proof || typeof parsed.proof !== 'object') {
        throw new ValidationError('Campo proof ausente ou inválido', 'proof', parsed.proof);
      }

      const proof = parsed.proof;
      if (!proof.type || !proof.created || !proof.challenge || !proof.proofPurpose) {
        throw new ValidationError('Estrutura de proof inválida', 'proof', proof);
      }

      this.logger.captureEvent(
        'verification',
        'verificador',
        {
          parameters: {
            action: 'presentation_format_validated',
            holder: parsed.holder,
            proof_type: proof.type,
          },
        },
        true,
      );

      return parsed;
    } catch (error) {
      this.logger.captureEvent(
        'verification',
        'verificador',
        {parameters: {action: 'presentation_format_validation_failed'}},
        false,
        error instanceof Error ? error : new Error(String(error)),
      );

      if (error instanceof ValidationError) {
        throw error;
      }
      throw new ValidationError(
        'Erro ao validar formato da apresentação',
        'presentation',
        presentation,
      );
    }
  }
}
