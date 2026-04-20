import fc from 'fast-check';
import PresentationService from '../PresentationService';
import CryptoService from '../CryptoService';
import StorageService from '../StorageService';
import LogService from '../LogService';
import {
  PresentationExchangeRequest,
  VerifiableCredential,
  StudentData,
} from '../../types';
import {useAppStore} from '../../stores/useAppStore';

// Mock dependencies
jest.mock('../LogService');
jest.mock('../CryptoService');
jest.mock('../StorageService');
jest.mock('../../stores/useAppStore');

describe('PresentationService - Property-Based Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAppStore.getState as jest.Mock).mockReturnValue({
      logs: [],
      addLog: jest.fn(),
    });

    // Mock StorageService to return a valid private key
    (StorageService.getHolderPrivateKey as jest.Mock).mockResolvedValue(
      '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    );

    // Mock CryptoService.signData to return a valid signature
    (CryptoService.signData as jest.Mock).mockResolvedValue(
      'mock-signature-hex',
    );

    // Mock CryptoService.computeHash to return deterministic hashes
    (CryptoService.computeHash as jest.Mock).mockImplementation(
      async (data: string) => {
        // Simple deterministic hash for testing
        let hash = 0;
        for (let i = 0; i < data.length; i++) {
          hash = (hash << 5) - hash + data.charCodeAt(i);
          hash = hash & hash;
        }
        return Math.abs(hash).toString(16).padStart(64, '0');
      },
    );
  });

  // Arbitraries for property-based testing
  const arbitraryStudentData = (): fc.Arbitrary<StudentData> =>
    fc.record({
      nome_completo: fc.string({minLength: 3, maxLength: 100}),
      cpf: fc
        .array(fc.integer({min: 0, max: 9}), {minLength: 11, maxLength: 11})
        .map(arr => arr.join('')),
      matricula: fc.string({minLength: 6, maxLength: 20}),
      curso: fc.constantFrom(
        'Ciência da Computação',
        'Engenharia',
        'Medicina',
        'Direito',
      ),
      status_matricula: fc.constantFrom('Ativo', 'Inativo'),
      data_nascimento: fc
        .integer({min: new Date('1950-01-01').getTime(), max: new Date('2010-01-01').getTime()})
        .map(timestamp => new Date(timestamp).toISOString().split('T')[0]),
      alojamento_indigena: fc.boolean(),
      auxilio_creche: fc.boolean(),
      auxilio_moradia: fc.boolean(),
      bolsa_estudantil: fc.boolean(),
      bolsa_permanencia_mec: fc.boolean(),
      paiq: fc.boolean(),
      moradia_estudantil: fc.boolean(),
      isencao_ru: fc.boolean(),
      isencao_esporte: fc.boolean(),
      isencao_idiomas: fc.boolean(),
      acesso_laboratorios: fc.array(fc.string({minLength: 1, maxLength: 20}), {
        maxLength: 5,
      }),
      acesso_predios: fc.array(fc.string({minLength: 1, maxLength: 20}), {
        maxLength: 5,
      }),
    });

  const arbitraryCredential = (): fc.Arbitrary<VerifiableCredential> =>
    fc.record({
      '@context': fc.constant(['https://www.w3.org/2018/credentials/v1']),
      type: fc.constant(['VerifiableCredential', 'AcademicIDCredential']),
      issuer: fc.constant('did:web:ufsc.br'),
      issuanceDate: fc.constant(new Date('2024-01-01').toISOString()),
      credentialSubject: arbitraryStudentData().map(data => ({
        id: 'did:key:z6Mk...',
        ...data,
      })),
      proof: fc.record({
        type: fc.constant('JsonWebSignature2020'),
        created: fc.constant(new Date('2024-01-01').toISOString()),
        verificationMethod: fc.constant('did:web:ufsc.br#key-1'),
        proofPurpose: fc.constant('assertionMethod'),
        jws: fc.string({minLength: 20, maxLength: 40}),
      }),
    });

  const arbitraryPEXRequest = (
    attributes: string[],
  ): fc.Arbitrary<PresentationExchangeRequest> =>
    fc.record({
      type: fc.constant('PresentationExchange' as const),
      version: fc.constant('1.0.0'),
      challenge: fc.string({minLength: 10, maxLength: 50}),
      presentation_definition: fc.record({
        id: fc.string({minLength: 5, maxLength: 20}),
        input_descriptors: fc.constant([
          {
            id: 'desc-1',
            name: 'Student Credential',
            purpose: 'Verify student attributes',
            constraints: {
              fields: attributes.map(attr => ({
                path: [`$.credentialSubject.${attr}`],
                predicate: 'required' as const,
              })),
            },
          },
        ]),
      }),
    });

  /**
   * Property 14: SD-JWT Attribute Obfuscation
   * **Validates: Requirements 4.8, 7.3, 11.4**
   *
   * For any SD-JWT presentation generated, non-disclosed attributes SHALL be
   * obfuscated using cryptographically secure hash functions, and the hashed
   * values SHALL not be reversible to reveal the original data.
   */
  describe('Property 14: SD-JWT Attribute Obfuscation', () => {
    it('should obfuscate non-disclosed attributes using cryptographic hash', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitraryCredential(),
          fc.array(
            fc.constantFrom(
              'nome_completo',
              'cpf',
              'matricula',
              'curso',
              'status_matricula',
            ),
            {minLength: 1, maxLength: 3},
          ),
          async (credential, selectedAttributes) => {
            // Create a PEX request for the selected attributes
            const pexRequest = await fc.sample(
              arbitraryPEXRequest(selectedAttributes),
              1,
            )[0];

            // Create presentation
            const presentation = await PresentationService.createPresentation(
              credential,
              pexRequest,
              selectedAttributes,
            );

            // Verify disclosed attributes are present and not hashed
            expect(presentation.disclosed_attributes).toBeDefined();
            for (const attr of selectedAttributes) {
              expect(presentation.disclosed_attributes).toHaveProperty(attr);
              const originalValue = (credential.credentialSubject as any)[attr];
              expect(presentation.disclosed_attributes![attr]).toBe(
                originalValue,
              );
            }

            // Verify non-disclosed attributes are hashed
            const hashedAttributes = (presentation as any).hashed_attributes;
            expect(hashedAttributes).toBeDefined();

            const allAttributes = Object.keys(credential.credentialSubject).filter(
              key => key !== 'id',
            );
            const nonDisclosedAttributes = allAttributes.filter(
              attr => !selectedAttributes.includes(attr),
            );

            for (const attr of nonDisclosedAttributes) {
              // Attribute should be in hashed_attributes
              expect(hashedAttributes).toHaveProperty(attr);

              // Hash should be a hex string
              expect(hashedAttributes[attr]).toMatch(/^[0-9a-f]+$/);

              // Hash should NOT contain the original value
              const originalValue = (credential.credentialSubject as any)[attr];
              const originalValueString =
                typeof originalValue === 'object'
                  ? JSON.stringify(originalValue)
                  : String(originalValue);

              expect(hashedAttributes[attr]).not.toContain(originalValueString);

              // Hash should NOT be the original value
              expect(hashedAttributes[attr]).not.toBe(originalValue);
              expect(hashedAttributes[attr]).not.toBe(originalValueString);
            }

            return true;
          },
        ),
        {numRuns: 5, verbose: 0},
      );
    });

    it('should not include non-disclosed attributes in disclosed_attributes', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitraryCredential(),
          fc.array(
            fc.constantFrom('nome_completo', 'cpf', 'matricula'),
            {minLength: 1, maxLength: 2},
          ),
          async (credential, selectedAttributes) => {
            const pexRequest = await fc.sample(
              arbitraryPEXRequest(selectedAttributes),
              1,
            )[0];

            const presentation = await PresentationService.createPresentation(
              credential,
              pexRequest,
              selectedAttributes,
            );

            // Get all attributes
            const allAttributes = Object.keys(
              credential.credentialSubject,
            ).filter(key => key !== 'id');

            // Non-disclosed attributes should NOT be in disclosed_attributes
            const nonDisclosedAttributes = allAttributes.filter(
              attr => !selectedAttributes.includes(attr),
            );

            for (const attr of nonDisclosedAttributes) {
              expect(presentation.disclosed_attributes).not.toHaveProperty(
                attr,
              );
            }

            return true;
          },
        ),
        {numRuns: 5, verbose: 0},
      );
    });

    it('should use cryptographically secure hash function (SHA-256)', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitraryCredential(),
          fc.constant(['nome_completo']), // Disclose only one attribute
          async (credential, selectedAttributes) => {
            const pexRequest = await fc.sample(
              arbitraryPEXRequest(selectedAttributes),
              1,
            )[0];

            await PresentationService.createPresentation(
              credential,
              pexRequest,
              selectedAttributes,
            );

            // Verify CryptoService.computeHash was called for non-disclosed attributes
            const computeHashCalls = (CryptoService.computeHash as jest.Mock)
              .mock.calls;

            // Should have been called at least once for non-disclosed attributes
            expect(computeHashCalls.length).toBeGreaterThan(0);

            // Verify all calls used 'titular' module
            for (const call of computeHashCalls) {
              expect(call[1]).toBe('titular');
            }

            return true;
          },
        ),
        {numRuns: 5, verbose: 0},
      );
    });

    it('should produce deterministic hashes for same attribute values', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitraryCredential(),
          fc.constant(['nome_completo']), // Disclose only one attribute
          async (credential, selectedAttributes) => {
            const pexRequest = await fc.sample(
              arbitraryPEXRequest(selectedAttributes),
              1,
            )[0];

            // Create presentation twice with same inputs
            const presentation1 = await PresentationService.createPresentation(
              credential,
              pexRequest,
              selectedAttributes,
            );

            const presentation2 = await PresentationService.createPresentation(
              credential,
              pexRequest,
              selectedAttributes,
            );

            // Hashed attributes should be identical
            const hashed1 = (presentation1 as any).hashed_attributes;
            const hashed2 = (presentation2 as any).hashed_attributes;

            expect(hashed1).toEqual(hashed2);

            return true;
          },
        ),
        {numRuns: 5, verbose: 0},
      );
    });

    it('should hash all non-disclosed attributes without exception', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitraryCredential(),
          fc.array(
            fc.constantFrom('nome_completo', 'cpf'),
            {minLength: 1, maxLength: 2},
          ),
          async (credential, selectedAttributes) => {
            const pexRequest = await fc.sample(
              arbitraryPEXRequest(selectedAttributes),
              1,
            )[0];

            const presentation = await PresentationService.createPresentation(
              credential,
              pexRequest,
              selectedAttributes,
            );

            const hashedAttributes = (presentation as any).hashed_attributes;
            const allAttributes = Object.keys(
              credential.credentialSubject,
            ).filter(key => key !== 'id');
            const nonDisclosedAttributes = allAttributes.filter(
              attr => !selectedAttributes.includes(attr),
            );

            // Every non-disclosed attribute should be hashed
            expect(Object.keys(hashedAttributes).length).toBe(
              nonDisclosedAttributes.length,
            );

            for (const attr of nonDisclosedAttributes) {
              expect(hashedAttributes).toHaveProperty(attr);
              expect(typeof hashedAttributes[attr]).toBe('string');
              expect(hashedAttributes[attr].length).toBeGreaterThan(0);
            }

            return true;
          },
        ),
        {numRuns: 5, verbose: 0},
      );
    });

    it('should log obfuscation events for each hashed attribute', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitraryCredential(),
          fc.constant(['nome_completo']), // Disclose only one
          async (credential, selectedAttributes) => {
            jest.clearAllMocks();

            const pexRequest = await fc.sample(
              arbitraryPEXRequest(selectedAttributes),
              1,
            )[0];

            await PresentationService.createPresentation(
              credential,
              pexRequest,
              selectedAttributes,
            );

            // Verify logging was called for obfuscation
            const logCalls = (LogService.captureEvent as jest.Mock).mock.calls;

            // Should have logs for attribute obfuscation
            const obfuscationLogs = logCalls.filter(
              call =>
                call[0] === 'hash_computation' &&
                call[2]?.parameters?.action === 'attribute_obfuscated',
            );

            // Should have at least one obfuscation log
            expect(obfuscationLogs.length).toBeGreaterThan(0);

            return true;
          },
        ),
        {numRuns: 5, verbose: 0},
      );
    });
  });

  describe('Presentation Creation Logging', () => {
    it('should log presentation creation start and completion', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitraryCredential(),
          fc.array(fc.constantFrom('nome_completo', 'cpf'), {
            minLength: 1,
            maxLength: 2,
          }),
          async (credential, selectedAttributes) => {
            jest.clearAllMocks();

            const pexRequest = await fc.sample(
              arbitraryPEXRequest(selectedAttributes),
              1,
            )[0];

            await PresentationService.createPresentation(
              credential,
              pexRequest,
              selectedAttributes,
            );

            const logCalls = (LogService.captureEvent as jest.Mock).mock.calls;

            // Should have log for presentation creation started
            const startLog = logCalls.find(
              call =>
                call[0] === 'presentation_creation' &&
                call[2]?.parameters?.action ===
                  'presentation_creation_started',
            );
            expect(startLog).toBeDefined();

            // Should have log for presentation created
            const completionLog = logCalls.find(
              call =>
                call[0] === 'presentation_creation' &&
                call[2]?.parameters?.action === 'presentation_created',
            );
            expect(completionLog).toBeDefined();

            return true;
          },
        ),
        {numRuns: 5, verbose: 0},
      );
    });
  });
});
