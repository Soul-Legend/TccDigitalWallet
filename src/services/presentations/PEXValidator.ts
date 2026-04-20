import {
  ConsentData,
  PresentationExchangeRequest,
  VerifiableCredential,
} from '../../types';
import type {ILogService} from '../../types';
import {ValidationError} from '../ErrorHandler';

/**
 * PEX request parsing, validation, attribute extraction and consent
 * preparation. Pure orchestration over a single PEX envelope — no
 * cryptography lives here.
 */
export class PEXValidator {
  constructor(private readonly logger: ILogService) {}

  validate(
    request: string | PresentationExchangeRequest,
  ): PresentationExchangeRequest {
    try {
      let pexRequest: PresentationExchangeRequest;
      if (typeof request === 'string') {
        try {
          pexRequest = JSON.parse(request);
        } catch {
          throw new ValidationError(
            'Formato JSON inválido na requisição PEX',
            'pex_request',
            request.substring(0, 50),
          );
        }
      } else {
        pexRequest = request;
      }

      if (pexRequest.type !== 'PresentationExchange') {
        throw new ValidationError(
          'Tipo de requisição inválido. Esperado: PresentationExchange',
          'type',
          pexRequest.type,
        );
      }
      if (!pexRequest.version) {
        throw new ValidationError(
          'Campo version ausente na requisição PEX',
          'version',
          undefined,
        );
      }
      if (!pexRequest.challenge || typeof pexRequest.challenge !== 'string') {
        throw new ValidationError(
          'Campo challenge ausente ou inválido',
          'challenge',
          pexRequest.challenge,
        );
      }
      if (!pexRequest.presentation_definition) {
        throw new ValidationError(
          'Campo presentation_definition ausente',
          'presentation_definition',
          undefined,
        );
      }
      const def = pexRequest.presentation_definition;
      if (!def.id || !def.input_descriptors || !Array.isArray(def.input_descriptors)) {
        throw new ValidationError(
          'Estrutura de presentation_definition inválida',
          'presentation_definition',
          def,
        );
      }

      this.logger.captureEvent(
        'presentation_creation',
        'titular',
        {
          parameters: {
            action: 'pex_validation_success',
            definition_id: def.id,
            descriptors_count: def.input_descriptors.length,
          },
        },
        true,
      );

      return pexRequest;
    } catch (error) {
      this.logger.captureEvent(
        'presentation_creation',
        'titular',
        {parameters: {action: 'pex_validation_failed'}},
        false,
        error instanceof Error ? error : new Error(String(error)),
      );
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new ValidationError('Erro ao validar formato PEX', 'pex_request', request);
    }
  }

  extractRequestedAttributes(pexRequest: PresentationExchangeRequest): {
    required: string[];
    optional: string[];
    all: string[];
  } {
    const required: string[] = [];
    const optional: string[] = [];

    try {
      for (const descriptor of pexRequest.presentation_definition.input_descriptors) {
        if (!descriptor.constraints?.fields) {
          continue;
        }
        for (const field of descriptor.constraints.fields) {
          const name = this.extractAttributeFromPath(field.path);
          if (!name) {
            continue;
          }
          const isRequired =
            field.predicate === 'required' || field.predicate === undefined;
          if (isRequired && !required.includes(name)) {
            required.push(name);
          } else if (!isRequired && !optional.includes(name)) {
            optional.push(name);
          }
        }
      }

      const all = [...required, ...optional];
      this.logger.captureEvent(
        'presentation_creation',
        'titular',
        {
          parameters: {
            action: 'attributes_extracted',
            required_count: required.length,
            optional_count: optional.length,
            required_attributes: required,
            optional_attributes: optional,
          },
        },
        true,
      );
      return {required, optional, all};
    } catch (error) {
      this.logger.captureEvent(
        'presentation_creation',
        'titular',
        {parameters: {action: 'attribute_extraction_failed'}},
        false,
        error instanceof Error ? error : new Error(String(error)),
      );
      throw new ValidationError(
        'Erro ao extrair atributos da requisição PEX',
        'presentation_definition',
        pexRequest.presentation_definition,
      );
    }
  }

  async buildConsent(
    pexRequest: string | PresentationExchangeRequest,
    _credential: VerifiableCredential,
  ): Promise<ConsentData> {
    try {
      const validated = this.validate(pexRequest);
      const {required, optional, all} = this.extractRequestedAttributes(validated);
      const predicates = validated.predicates || [];

      const consentData: ConsentData = {
        requested_attributes: all,
        optional_attributes: optional,
        required_attributes: required,
        predicates: predicates.length > 0 ? predicates : undefined,
      };

      this.logger.captureEvent(
        'presentation_creation',
        'titular',
        {
          parameters: {
            action: 'consent_data_generated',
            required_count: required.length,
            optional_count: optional.length,
            predicates_count: predicates.length,
          },
        },
        true,
      );
      return consentData;
    } catch (error) {
      this.logger.captureEvent(
        'presentation_creation',
        'titular',
        {parameters: {action: 'pex_processing_failed'}},
        false,
        error instanceof Error ? error : new Error(String(error)),
      );
      throw error;
    }
  }

  private extractAttributeFromPath(paths: string[]): string | null {
    if (!paths || paths.length === 0) {
      return null;
    }
    const segments = paths[0]
      .split(/[.\[\]'"]/)
      .filter(s => s && s !== '$' && s !== 'credentialSubject');
    return segments.length > 0 ? segments[segments.length - 1] : null;
  }
}
