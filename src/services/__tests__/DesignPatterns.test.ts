/**
 * Tests for SOLID refactoring patterns:
 * - VerificationPipeline (Chain of Responsibility)
 * - Credential Format Registry (Open/Closed Principle)
 * - Log array cap (memory leak prevention)
 */
import {VerificationPipeline} from '../VerificationPipeline';
import {
  IVerificationStep,
  VerifiablePresentation,
  PresentationExchangeRequest,
  ICredentialFormat,
} from '../../types';
import CredentialService from '../CredentialService';
import {useAppStore} from '../../stores/useAppStore';

// Minimal mock presentation for pipeline tests
const mockPresentation: VerifiablePresentation = {
  '@context': ['https://www.w3.org/2018/credentials/v1'],
  type: ['VerifiablePresentation'],
  holder: 'did:key:z6MkTest',
  verifiableCredential: {
    '@context': ['https://www.w3.org/2018/credentials/v1'],
    type: ['VerifiableCredential'],
    issuer: 'did:web:ufsc.br',
    issuanceDate: new Date().toISOString(),
    credentialSubject: {
      id: 'did:key:z6MkTest',
      nome_completo: 'Test',
      cpf: '123.456.789-09',
      matricula: '20230001',
      curso: 'CC',
      status_matricula: 'Ativo',
      data_nascimento: '2000-01-01',
      alojamento_indigena: false,
      auxilio_creche: false,
      auxilio_moradia: false,
      bolsa_estudantil: false,
      bolsa_permanencia_mec: false,
      paiq: false,
      moradia_estudantil: false,
      isencao_ru: false,
      isencao_esporte: false,
      isencao_idiomas: false,
      acesso_laboratorios: [],
      acesso_predios: [],
    },
    proof: {
      type: 'Ed25519Signature2018',
      created: new Date().toISOString(),
      verificationMethod: 'did:web:ufsc.br#key-1',
      proofPurpose: 'assertionMethod',
    },
  },
  proof: {
    type: 'Ed25519Signature2018',
    created: new Date().toISOString(),
    verificationMethod: 'did:key:z6MkTest#key-1',
    proofPurpose: 'authentication',
    challenge: 'test-challenge',
  },
};

const mockPexRequest: PresentationExchangeRequest = {
  type: 'PresentationExchange',
  version: '1.0',
  challenge: 'test-challenge',
  presentation_definition: {
    id: 'test',
    input_descriptors: [],
  },
};

// ---------------------------------------------------------------
// VerificationPipeline tests
// ---------------------------------------------------------------

describe('VerificationPipeline (Chain of Responsibility)', () => {
  it('should return empty errors when all steps pass', async () => {
    const passingStep: IVerificationStep = {
      name: 'AlwaysPass',
      validate: async () => ({valid: true}),
    };

    const pipeline = new VerificationPipeline()
      .register(passingStep)
      .register(passingStep);

    const result = await pipeline.execute(mockPresentation, mockPexRequest);
    expect(result.errors).toEqual([]);
  });

  it('should accumulate errors from failing steps', async () => {
    const failStep1: IVerificationStep = {
      name: 'FailOne',
      validate: async () => ({valid: false, error: 'Erro 1'}),
    };
    const failStep2: IVerificationStep = {
      name: 'FailTwo',
      validate: async () => ({valid: false, error: 'Erro 2'}),
    };

    const pipeline = new VerificationPipeline()
      .register(failStep1)
      .register(failStep2);

    const result = await pipeline.execute(mockPresentation, mockPexRequest);
    expect(result.errors).toHaveLength(2);
    expect(result.errors).toContain('Erro 1');
    expect(result.errors).toContain('Erro 2');
  });

  it('should catch thrown exceptions and wrap with step name', async () => {
    const throwingStep: IVerificationStep = {
      name: 'ThrowingStep',
      validate: async () => {
        throw new Error('Unexpected failure');
      },
    };

    const pipeline = new VerificationPipeline().register(throwingStep);
    const result = await pipeline.execute(mockPresentation, mockPexRequest);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('[ThrowingStep]');
    expect(result.errors[0]).toContain('Unexpected failure');
  });

  it('should continue executing after a step fails', async () => {
    const executionOrder: string[] = [];
    const failStep: IVerificationStep = {
      name: 'Fail',
      validate: async () => {
        executionOrder.push('fail');
        return {valid: false, error: 'failed'};
      },
    };
    const passStep: IVerificationStep = {
      name: 'Pass',
      validate: async () => {
        executionOrder.push('pass');
        return {valid: true};
      },
    };

    const pipeline = new VerificationPipeline()
      .register(failStep)
      .register(passStep);

    await pipeline.execute(mockPresentation, mockPexRequest);
    expect(executionOrder).toEqual(['fail', 'pass']);
  });

  it('should allow steps to mutate shared context', async () => {
    const contextWriter: IVerificationStep = {
      name: 'Writer',
      validate: async (_p, _r, ctx) => {
        ctx.trustChainValid = true;
        ctx.nullifierCheck = 'new';
        return {valid: true};
      },
    };
    const contextReader: IVerificationStep = {
      name: 'Reader',
      validate: async (_p, _r, ctx) => {
        return ctx.trustChainValid
          ? {valid: true}
          : {valid: false, error: 'context not set'};
      },
    };

    const pipeline = new VerificationPipeline()
      .register(contextWriter)
      .register(contextReader);

    const result = await pipeline.execute(mockPresentation, mockPexRequest);
    expect(result.errors).toEqual([]);
    expect(result.trustChainValid).toBe(true);
    expect(result.nullifierCheck).toBe('new');
  });

  it('should support fluent registration', () => {
    const step: IVerificationStep = {
      name: 'Step',
      validate: async () => ({valid: true}),
    };

    const pipeline = new VerificationPipeline()
      .register(step)
      .register(step)
      .register(step);

    // Pipeline should be the same instance (fluent returns `this`)
    expect(pipeline).toBeInstanceOf(VerificationPipeline);
  });

  it('should handle empty pipeline', async () => {
    const pipeline = new VerificationPipeline();
    const result = await pipeline.execute(mockPresentation, mockPexRequest);
    expect(result.errors).toEqual([]);
  });

  it('should not add error when step returns valid:false without error message', async () => {
    const failNoMessage: IVerificationStep = {
      name: 'FailSilent',
      validate: async () => ({valid: false}),
    };

    const pipeline = new VerificationPipeline().register(failNoMessage);
    const result = await pipeline.execute(mockPresentation, mockPexRequest);
    expect(result.errors).toEqual([]);
  });
});

// ---------------------------------------------------------------
// Credential Format Registry tests
// ---------------------------------------------------------------

describe('Credential Format Registry (Open/Closed Principle)', () => {
  it('should parse SD-JWT credentials by default', async () => {
    const did = await CredentialService.getOrCreateIssuerDID();
    const token = await CredentialService.issueCredential(
      {
        nome_completo: 'Alice Silva',
        cpf: '123.456.789-09',
        matricula: '20230001',
        curso: 'Ciência da Computação',
        status_matricula: 'Ativo',
        data_nascimento: '2000-05-15',
        alojamento_indigena: false,
        auxilio_creche: false,
        auxilio_moradia: false,
        bolsa_estudantil: false,
        bolsa_permanencia_mec: false,
        paiq: false,
        moradia_estudantil: false,
        isencao_ru: false,
        isencao_esporte: false,
        isencao_idiomas: false,
        acesso_laboratorios: [],
        acesso_predios: [],
      },
      did.did,
      'sd-jwt',
    );
    const parsed = await CredentialService.validateAndParseCredential(token);
    expect(parsed.issuer).toBe(did.did);
    expect(parsed.credentialSubject.nome_completo).toBe('Alice Silva');
  });

  it('should allow registering a custom format', async () => {
    const customFormat: ICredentialFormat = {
      name: 'Custom',
      detect: (token) => token.startsWith('CUSTOM:'),
      parse: async (token) => ({
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        type: ['VerifiableCredential'],
        issuer: 'did:custom:test',
        issuanceDate: new Date().toISOString(),
        credentialSubject: {
          id: 'did:custom:holder',
          nome_completo: token.slice(7),
          cpf: '',
          matricula: '',
          curso: '',
          status_matricula: 'Ativo' as const,
          data_nascimento: '',
          alojamento_indigena: false,
          auxilio_creche: false,
          auxilio_moradia: false,
          bolsa_estudantil: false,
          bolsa_permanencia_mec: false,
          paiq: false,
          moradia_estudantil: false,
          isencao_ru: false,
          isencao_esporte: false,
          isencao_idiomas: false,
          acesso_laboratorios: [],
          acesso_predios: [],
        },
        proof: {
          type: 'CustomProof',
          created: new Date().toISOString(),
          verificationMethod: 'did:custom:test#key-1',
          proofPurpose: 'assertionMethod',
        },
      }),
    };

    CredentialService.registerFormat(customFormat);

    const parsed = await CredentialService.validateAndParseCredential('CUSTOM:Bob');
    expect(parsed.issuer).toBe('did:custom:test');
    expect(parsed.credentialSubject.nome_completo).toBe('Bob');
  });

  it('should reject unknown formats', async () => {
    await expect(
      CredentialService.validateAndParseCredential('UNKNOWN_FORMAT_NO_DOTS'),
    ).rejects.toThrow('Formato de credencial inválido');
  });
});

// ---------------------------------------------------------------
// Log array cap tests
// ---------------------------------------------------------------

describe('Log Array Cap (Memory Leak Prevention)', () => {
  beforeEach(() => {
    useAppStore.getState().clearLogs();
  });

  it('should keep at most 1000 logs', () => {
    const {addLog} = useAppStore.getState();

    for (let i = 0; i < 1050; i++) {
      addLog({
        operation: 'verification',
        module: 'verificador',
        details: {parameters: {index: i}},
        success: true,
      });
    }

    const logs = useAppStore.getState().logs;
    expect(logs.length).toBe(1000);
  });

  it('should retain the most recent logs (not the oldest)', () => {
    const {addLog} = useAppStore.getState();

    for (let i = 0; i < 1050; i++) {
      addLog({
        operation: 'verification',
        module: 'verificador',
        details: {parameters: {index: i}},
        success: true,
      });
    }

    const logs = useAppStore.getState().logs;
    // The first 50 should have been dropped; index 50 should be earliest
    expect(logs[0].details.parameters?.index).toBe(50);
    expect(logs[logs.length - 1].details.parameters?.index).toBe(1049);
  });

  it('should not truncate when under limit', () => {
    const {addLog} = useAppStore.getState();

    for (let i = 0; i < 5; i++) {
      addLog({
        operation: 'key_generation',
        module: 'titular',
        details: {},
        success: true,
      });
    }

    expect(useAppStore.getState().logs.length).toBe(5);
  });
});
