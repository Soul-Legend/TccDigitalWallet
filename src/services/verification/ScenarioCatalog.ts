import {PresentationExchangeRequest, Scenario} from '../../types';
import type {ICryptoService, ILogService} from '../../types';
import {ValidationError} from '../ErrorHandler';

const SCENARIOS: readonly Scenario[] = [
  {
    id: 'ru',
    name: 'Restaurante Universitário',
    description: 'Validar vínculo e isenção tarifária com divulgação seletiva',
    type: 'selective_disclosure',
    requested_attributes: ['status_matricula', 'isencao_ru'],
  },
  {
    id: 'elections',
    name: 'Eleições',
    description: 'Validar elegibilidade com prevenção de voto duplicado',
    type: 'zkp_eligibility',
    predicates: [{attribute: 'status_matricula', p_type: '==', value: 'Ativo'}],
  },
  {
    id: 'age_verification',
    name: 'Verificação de Maioridade',
    description: 'Validar maioridade civil sem acessar data de nascimento',
    type: 'range_proof',
    predicates: [{attribute: 'data_nascimento', p_type: '>=', value: 18}],
  },
  {
    id: 'lab_access',
    name: 'Acesso a Laboratórios',
    description: 'Validar permissões de acesso físico específicas',
    type: 'access_control',
    requested_attributes: ['acesso_laboratorios', 'acesso_predios'],
  },
];

/**
 * Catalog of pre-configured verification scenarios + PEX challenge generation.
 */
export class ScenarioCatalog {
  constructor(
    private readonly logger: ILogService,
    private readonly crypto: ICryptoService,
  ) {}

  getScenarios(): Scenario[] {
    return [...SCENARIOS];
  }

  getScenario(scenarioId: string): Scenario | undefined {
    return SCENARIOS.find(s => s.id === scenarioId);
  }

  async generateChallenge(
    scenarioId: string,
    additionalData?: {election_id?: string; resource_id?: string},
  ): Promise<PresentationExchangeRequest> {
    try {
      const scenario = this.getScenario(scenarioId);
      if (!scenario) {
        throw new ValidationError(
          `Cenário não encontrado: ${scenarioId}`,
          'scenario_id',
          scenarioId,
        );
      }

      const challenge = this.crypto.generateNonce();
      const pexRequest: PresentationExchangeRequest = {
        type: 'PresentationExchange',
        version: '1.0.0',
        challenge,
        presentation_definition: {
          id: `${scenarioId}-${Date.now()}`,
          input_descriptors: this.buildInputDescriptors(scenario),
        },
      };

      if (scenario.predicates && scenario.predicates.length > 0) {
        pexRequest.predicates = scenario.predicates;
      }
      if (additionalData?.election_id) {
        pexRequest.election_id = additionalData.election_id;
      }
      if (additionalData?.resource_id) {
        pexRequest.resource_id = additionalData.resource_id;
      }

      this.logger.captureEvent(
        'verification',
        'verificador',
        {
          parameters: {
            action: 'challenge_generated',
            scenario_id: scenarioId,
            scenario_type: scenario.type,
            challenge_truncated: challenge.substring(0, 16) + '...',
            definition_id: pexRequest.presentation_definition.id,
          },
        },
        true,
      );

      return pexRequest;
    } catch (error) {
      this.logger.captureEvent(
        'verification',
        'verificador',
        {parameters: {action: 'challenge_generation_failed', scenario_id: scenarioId}},
        false,
        error instanceof Error ? error : new Error(String(error)),
      );
      throw error;
    }
  }

  private buildInputDescriptors(
    scenario: Scenario,
  ): PresentationExchangeRequest['presentation_definition']['input_descriptors'] {
    const descriptor = {
      id: `${scenario.id}-descriptor`,
      name: scenario.name,
      purpose: scenario.description,
      constraints: {
        fields: [] as Array<{
          path: string[];
          filter?: {type: string; const?: any; pattern?: string};
          predicate?: 'required' | 'preferred';
        }>,
        limit_disclosure: 'required' as const,
      },
    };

    if (scenario.requested_attributes) {
      for (const attr of scenario.requested_attributes) {
        descriptor.constraints.fields.push({
          path: [`$.credentialSubject.${attr}`],
          predicate: 'required',
        });
      }
    }
    if (scenario.predicates) {
      for (const predicate of scenario.predicates) {
        descriptor.constraints.fields.push({
          path: [`$.credentialSubject.${predicate.attribute}`],
          predicate: 'required',
        });
      }
    }

    return [descriptor];
  }
}
