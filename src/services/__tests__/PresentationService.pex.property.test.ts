import fc from 'fast-check';
import PresentationService from '../PresentationService';
import LogService from '../LogService';
import {PresentationExchangeRequest, VerifiableCredential} from '../../types';
import {ValidationError} from '../ErrorHandler';
import {useAppStore} from '../../stores/useAppStore';

// Mock dependencies
jest.mock('../LogService');
jest.mock('../../stores/useAppStore');

/**
 * Property-Based Tests for PEX Request Processing
 * Task 10.1: Tests for Properties 11, 12, and 13
 */
describe('PresentationService - PEX Request Processing Properties', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAppStore.getState as jest.Mock).mockReturnValue({
      logs: [],
      addLog: jest.fn(),
    });
  });

  // Arbitraries for property-based testing
  const arbitraryValidPEXRequest = (
    attributes: string[],
    optionalAttributes: string[] = [],
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
              fields: [
                ...attributes.map(attr => ({
                  path: [`$.credentialSubject.${attr}`],
                  predicate: 'required' as const,
                })),
                ...optionalAttributes.map(attr => ({
                  path: [`$.credentialSubject.${attr}`],
                  predicate: 'preferred' as const,
                })),
              ],
            },
          },
        ]),
      }),
    });

  const arbitraryInvalidPEXRequest = (): fc.Arbitrary<any> =>
    fc.oneof(
      // Missing type
      fc.record({
        version: fc.constant('1.0.0'),
        challenge: fc.string(),
        presentation_definition: fc.record({
          id: fc.string(),
          input_descriptors: fc.constant([]),
        }),
      }),
      // Wrong type
      fc.record({
        type: fc.constantFrom('InvalidType', 'VerifiablePresentation', ''),
        version: fc.constant('1.0.0'),
        challenge: fc.string(),
        presentation_definition: fc.record({
          id: fc.string(),
          input_descriptors: fc.constant([]),
        }),
      }),
      // Missing challenge
      fc.record({
        type: fc.constant('PresentationExchange'),
        version: fc.constant('1.0.0'),
        presentation_definition: fc.record({
          id: fc.string(),
          input_descriptors: fc.constant([]),
        }),
      }),
      // Missing presentation_definition
      fc.record({
        type: fc.constant('PresentationExchange'),
        version: fc.constant('1.0.0'),
        challenge: fc.string(),
      }),
      // Invalid presentation_definition structure
      fc.record({
        type: fc.constant('PresentationExchange'),
        version: fc.constant('1.0.0'),
        challenge: fc.string(),
        presentation_definition: fc.record({
          id: fc.string(),
          // Missing or invalid input_descriptors
        }),
      }),
    );

  const arbitraryCredential = (): fc.Arbitrary<VerifiableCredential> =>
    fc.record({
      '@context': fc.constant(['https://www.w3.org/2018/credentials/v1']),
      type: fc.constant(['VerifiableCredential', 'AcademicIDCredential']),
      issuer: fc.constant('did:web:ufsc.br'),
      issuanceDate: fc
        .integer({
          min: new Date('2000-01-01').getTime(),
          max: new Date('2030-12-31').getTime(),
        })
        .map(ts => new Date(ts).toISOString()),
      credentialSubject: fc.record({
        id: fc.constant('did:key:z6Mk...'),
        nome_completo: fc.string({minLength: 3, maxLength: 100}),
        cpf: fc
          .array(fc.integer({min: 0, max: 9}), {minLength: 11, maxLength: 11})
          .map(arr => arr.join('')),
        matricula: fc.string({minLength: 6, maxLength: 20}),
        curso: fc.constantFrom(
          'Ciência da Computação',
          'Engenharia',
          'Medicina',
        ),
        status_matricula: fc.constantFrom('Ativo', 'Inativo'),
        data_nascimento: fc
          .integer({
            min: new Date('1950-01-01').getTime(),
            max: new Date('2010-01-01').getTime(),
          })
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
        acesso_laboratorios: fc.array(
          fc.string({minLength: 1, maxLength: 20}),
          {maxLength: 5},
        ),
        acesso_predios: fc.array(fc.string({minLength: 1, maxLength: 20}), {
          maxLength: 5,
        }),
      }),
      proof: fc.record({
        type: fc.constant('JsonWebSignature2020'),
        created: fc
          .integer({
            min: new Date('2020-01-01').getTime(),
            max: new Date('2025-12-31').getTime(),
          })
          .map(timestamp => new Date(timestamp).toISOString()),
        verificationMethod: fc.constant('did:web:ufsc.br#key-1'),
        proofPurpose: fc.constant('assertionMethod'),
        jws: fc.string({minLength: 20, maxLength: 40}),
      }),
    });

  /**
   * Property 11: PEX Request Validation
   * **Validates: Requirements 4.1**
   *
   * For any presentation request pasted into the Holder module, the system SHALL
   * validate the format against PresentationExchange schema, and invalid formats
   * SHALL trigger descriptive error messages.
   */
  describe('Property 11: PEX Request Validation', () => {
    it('should accept all valid PEX requests with required fields', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.constantFrom(
              'nome_completo',
              'cpf',
              'matricula',
              'curso',
              'status_matricula',
            ),
            {minLength: 1, maxLength: 5},
          ),
          async attributes => {
            const pexRequest = await fc.sample(
              arbitraryValidPEXRequest(attributes),
              1,
            )[0];

            // Should not throw for valid request
            const result =
              PresentationService.validatePEXFormat(pexRequest);

            // Should return the validated request
            expect(result).toBeDefined();
            expect(result.type).toBe('PresentationExchange');
            expect(result.version).toBe('1.0.0');
            expect(result.challenge).toBeDefined();
            expect(result.presentation_definition).toBeDefined();
            expect(result.presentation_definition.id).toBeDefined();
            expect(
              result.presentation_definition.input_descriptors,
            ).toBeDefined();
            expect(
              Array.isArray(result.presentation_definition.input_descriptors),
            ).toBe(true);

            return true;
          },
        ),
        {numRuns: 10, verbose: 0},
      );
    });

    it('should reject all invalid PEX requests with ValidationError', async () => {
      await fc.assert(
        fc.asyncProperty(arbitraryInvalidPEXRequest(), async invalidRequest => {
          // Should throw ValidationError for invalid request
          expect(() => {
            PresentationService.validatePEXFormat(invalidRequest);
          }).toThrow(ValidationError);

          return true;
        }),
        {numRuns: 10, verbose: 0},
      );
    });

    it('should provide descriptive error messages for invalid formats', async () => {
      await fc.assert(
        fc.asyncProperty(arbitraryInvalidPEXRequest(), async invalidRequest => {
          try {
            PresentationService.validatePEXFormat(invalidRequest);
            // Should not reach here
            return false;
          } catch (error) {
            // Should be ValidationError
            expect(error).toBeInstanceOf(ValidationError);

            // Should have descriptive message
            const validationError = error as ValidationError;
            expect(validationError.message).toBeDefined();
            expect(validationError.message.length).toBeGreaterThan(0);

            // Should have field information
            expect(validationError.field).toBeDefined();

            return true;
          }
        }),
        {numRuns: 10, verbose: 0},
      );
    });

    it('should parse and validate JSON string PEX requests', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.constantFrom('nome_completo', 'cpf'), {
            minLength: 1,
            maxLength: 2,
          }),
          async attributes => {
            const pexRequest = await fc.sample(
              arbitraryValidPEXRequest(attributes),
              1,
            )[0];

            // Convert to JSON string
            const pexString = JSON.stringify(pexRequest);

            // Should parse and validate successfully
            const result = PresentationService.validatePEXFormat(pexString);

            expect(result).toBeDefined();
            expect(result.type).toBe('PresentationExchange');

            return true;
          },
        ),
        {numRuns: 10, verbose: 0},
      );
    });

    it('should reject malformed JSON strings with descriptive error', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({minLength: 1, maxLength: 100}).filter(s => {
            try {
              JSON.parse(s);
              return false; // Valid JSON, skip
            } catch {
              return true; // Invalid JSON, use it
            }
          }),
          async malformedJson => {
            try {
              PresentationService.validatePEXFormat(malformedJson);
              return false; // Should not succeed
            } catch (error) {
              expect(error).toBeInstanceOf(ValidationError);
              const validationError = error as ValidationError;
              expect(validationError.message).toContain('JSON inválido');
              return true;
            }
          },
        ),
        {numRuns: 10, verbose: 0},
      );
    });

    it('should log successful validation events', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.constantFrom('nome_completo', 'cpf'), {
            minLength: 1,
            maxLength: 2,
          }),
          async attributes => {
            jest.clearAllMocks();

            const pexRequest = await fc.sample(
              arbitraryValidPEXRequest(attributes),
              1,
            )[0];

            PresentationService.validatePEXFormat(pexRequest);

            // Should log validation success
            const logCalls = (LogService.captureEvent as jest.Mock).mock.calls;
            const validationLog = logCalls.find(
              call =>
                call[0] === 'presentation_creation' &&
                call[2]?.parameters?.action === 'pex_validation_success',
            );

            expect(validationLog).toBeDefined();
            expect(validationLog[3]).toBe(true); // success flag

            return true;
          },
        ),
        {numRuns: 10, verbose: 0},
      );
    });

    it('should log validation failure events', async () => {
      await fc.assert(
        fc.asyncProperty(arbitraryInvalidPEXRequest(), async invalidRequest => {
          jest.clearAllMocks();

          try {
            PresentationService.validatePEXFormat(invalidRequest);
          } catch {
            // Expected to throw
          }

          // Should log validation failure
          const logCalls = (LogService.captureEvent as jest.Mock).mock.calls;
          const failureLog = logCalls.find(
            call =>
              call[0] === 'presentation_creation' &&
              call[2]?.parameters?.action === 'pex_validation_failed',
          );

          expect(failureLog).toBeDefined();
          expect(failureLog[3]).toBe(false); // success flag

          return true;
        }),
        {numRuns: 10, verbose: 0},
      );
    });
  });

  /**
   * Property 12: Attribute Extraction Accuracy
   * **Validates: Requirements 4.3**
   *
   * For any valid PEX request, the system SHALL correctly extract and interpret
   * all requested attributes and predicates from the presentation_definition.
   */
  describe('Property 12: Attribute Extraction Accuracy', () => {
    it('should extract all requested attributes from valid PEX request', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc
            .array(
              fc.constantFrom(
                'nome_completo',
                'cpf',
                'matricula',
                'curso',
                'status_matricula',
              ),
              {minLength: 1, maxLength: 5},
            )
            .map(arr => [...new Set(arr)]), // Remove duplicates
          async attributes => {
            const pexRequest = await fc.sample(
              arbitraryValidPEXRequest(attributes),
              1,
            )[0];

            const result =
              PresentationService.extractRequestedAttributes(pexRequest);

            // Should extract all attributes
            expect(result.all).toBeDefined();
            expect(result.all.length).toBe(attributes.length);

            // All requested attributes should be in the result
            for (const attr of attributes) {
              expect(result.all).toContain(attr);
            }

            return true;
          },
        ),
        {numRuns: 10, verbose: 0},
      );
    });

    it('should correctly identify required vs optional attributes', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc
            .array(fc.constantFrom('nome_completo', 'cpf', 'matricula'), {
              minLength: 1,
              maxLength: 3,
            })
            .map(arr => [...new Set(arr)]) // Remove duplicates
            .chain(required =>
              fc
                .array(fc.constantFrom('curso', 'status_matricula'), {
                  minLength: 0,
                  maxLength: 2,
                })
                .map(arr => [...new Set(arr)]) // Remove duplicates
                .map(optional => ({required, optional})),
            ),
          async ({required, optional}) => {
            const pexRequest = await fc.sample(
              arbitraryValidPEXRequest(required, optional),
              1,
            )[0];

            const result =
              PresentationService.extractRequestedAttributes(pexRequest);

            // Required attributes should be in required array
            expect(result.required.length).toBe(required.length);
            for (const attr of required) {
              expect(result.required).toContain(attr);
            }

            // Optional attributes should be in optional array
            expect(result.optional.length).toBe(optional.length);
            for (const attr of optional) {
              expect(result.optional).toContain(attr);
            }

            // All should contain both
            expect(result.all.length).toBe(required.length + optional.length);

            return true;
          },
        ),
        {numRuns: 10, verbose: 0},
      );
    });

    it('should handle various JSONPath formats correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(
            '$.credentialSubject.nome_completo',
            "$['credentialSubject']['nome_completo']",
            '$.nome_completo',
          ),
          async pathFormat => {
            const pexRequest: PresentationExchangeRequest = {
              type: 'PresentationExchange',
              version: '1.0.0',
              challenge: 'test-challenge',
              presentation_definition: {
                id: 'test-def',
                input_descriptors: [
                  {
                    id: 'desc-1',
                    name: 'Test',
                    purpose: 'Test',
                    constraints: {
                      fields: [
                        {
                          path: [pathFormat],
                          predicate: 'required',
                        },
                      ],
                    },
                  },
                ],
              },
            };

            const result =
              PresentationService.extractRequestedAttributes(pexRequest);

            // Should extract 'nome_completo' regardless of path format
            expect(result.all).toContain('nome_completo');

            return true;
          },
        ),
        {numRuns: 10, verbose: 0},
      );
    });

    it('should not duplicate attributes if specified multiple times', async () => {
      const pexRequest: PresentationExchangeRequest = {
        type: 'PresentationExchange',
        version: '1.0.0',
        challenge: 'test-challenge',
        presentation_definition: {
          id: 'test-def',
          input_descriptors: [
            {
              id: 'desc-1',
              name: 'Test',
              purpose: 'Test',
              constraints: {
                fields: [
                  {
                    path: ['$.credentialSubject.nome_completo'],
                    predicate: 'required',
                  },
                  {
                    path: ['$.credentialSubject.nome_completo'],
                    predicate: 'required',
                  },
                ],
              },
            },
          ],
        },
      };

      const result =
        PresentationService.extractRequestedAttributes(pexRequest);

      // Should only have one instance of nome_completo
      expect(result.all.filter(a => a === 'nome_completo').length).toBe(1);
      expect(result.required.filter(a => a === 'nome_completo').length).toBe(1);
    });

    it('should log attribute extraction with counts', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc
            .array(fc.constantFrom('nome_completo', 'cpf'), {
              minLength: 1,
              maxLength: 2,
            })
            .map(arr => [...new Set(arr)]) // Remove duplicates
            .chain(required =>
              fc
                .array(fc.constantFrom('curso'), {minLength: 0, maxLength: 1})
                .map(optional => ({required, optional})),
            ),
          async ({required, optional}) => {
            jest.clearAllMocks();

            const pexRequest = await fc.sample(
              arbitraryValidPEXRequest(required, optional),
              1,
            )[0];

            PresentationService.extractRequestedAttributes(pexRequest);

            // Should log extraction with counts
            const logCalls = (LogService.captureEvent as jest.Mock).mock.calls;
            const extractionLog = logCalls.find(
              call =>
                call[0] === 'presentation_creation' &&
                call[2]?.parameters?.action === 'attributes_extracted',
            );

            expect(extractionLog).toBeDefined();
            expect(extractionLog[2].parameters.required_count).toBe(
              required.length,
            );
            expect(extractionLog[2].parameters.optional_count).toBe(
              optional.length,
            );

            return true;
          },
        ),
        {numRuns: 10, verbose: 0},
      );
    });

    it('should handle empty input_descriptors gracefully', async () => {
      const pexRequest: PresentationExchangeRequest = {
        type: 'PresentationExchange',
        version: '1.0.0',
        challenge: 'test-challenge',
        presentation_definition: {
          id: 'test-def',
          input_descriptors: [],
        },
      };

      const result =
        PresentationService.extractRequestedAttributes(pexRequest);

      // Should return empty arrays
      expect(result.all).toEqual([]);
      expect(result.required).toEqual([]);
      expect(result.optional).toEqual([]);
    });
  });

  /**
   * Property 13: Optional Attribute Selection
   * **Validates: Requirements 4.5**
   *
   * For any consent modal displayed, the system SHALL allow users to select or
   * deselect optional attributes while maintaining required attributes as mandatory.
   */
  describe('Property 13: Optional Attribute Selection', () => {
    it('should generate consent data with separate required and optional lists', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc
            .array(fc.constantFrom('nome_completo', 'cpf', 'matricula'), {
              minLength: 1,
              maxLength: 3,
            })
            .map(arr => [...new Set(arr)]) // Remove duplicates
            .chain(required =>
              fc
                .array(fc.constantFrom('curso', 'status_matricula'), {
                  minLength: 1,
                  maxLength: 2,
                })
                .map(arr => [...new Set(arr)]) // Remove duplicates
                .map(optional => ({required, optional})),
            ),
          arbitraryCredential(),
          async ({required, optional}, credential) => {
            const pexRequest = await fc.sample(
              arbitraryValidPEXRequest(required, optional),
              1,
            )[0];

            const consentData = await PresentationService.processPEXRequest(
              pexRequest,
              credential,
            );

            // Should have separate required and optional lists
            expect(consentData.required_attributes).toBeDefined();
            expect(consentData.optional_attributes).toBeDefined();

            // Required attributes should match
            expect(consentData.required_attributes.length).toBe(required.length);
            for (const attr of required) {
              expect(consentData.required_attributes).toContain(attr);
            }

            // Optional attributes should match
            expect(consentData.optional_attributes.length).toBe(optional.length);
            for (const attr of optional) {
              expect(consentData.optional_attributes).toContain(attr);
            }

            return true;
          },
        ),
        {numRuns: 10, verbose: 0},
      );
    });

    it('should include all attributes in requested_attributes list', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc
            .array(fc.constantFrom('nome_completo', 'cpf'), {
              minLength: 1,
              maxLength: 2,
            })
            .map(arr => [...new Set(arr)]) // Remove duplicates
            .chain(required =>
              fc
                .array(fc.constantFrom('curso'), {minLength: 1, maxLength: 1})
                .map(optional => ({required, optional})),
            ),
          arbitraryCredential(),
          async ({required, optional}, credential) => {
            const pexRequest = await fc.sample(
              arbitraryValidPEXRequest(required, optional),
              1,
            )[0];

            const consentData = await PresentationService.processPEXRequest(
              pexRequest,
              credential,
            );

            // requested_attributes should contain all (required + optional)
            expect(consentData.requested_attributes.length).toBe(
              required.length + optional.length,
            );

            for (const attr of [...required, ...optional]) {
              expect(consentData.requested_attributes).toContain(attr);
            }

            return true;
          },
        ),
        {numRuns: 10, verbose: 0},
      );
    });

    it('should handle requests with only required attributes', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc
            .array(fc.constantFrom('nome_completo', 'cpf', 'matricula'), {
              minLength: 1,
              maxLength: 3,
            })
            .map(arr => [...new Set(arr)]), // Remove duplicates
          arbitraryCredential(),
          async (required, credential) => {
            const pexRequest = await fc.sample(
              arbitraryValidPEXRequest(required, []),
              1,
            )[0];

            const consentData = await PresentationService.processPEXRequest(
              pexRequest,
              credential,
            );

            // Should have required attributes
            expect(consentData.required_attributes.length).toBe(required.length);

            // Optional should be empty
            expect(consentData.optional_attributes.length).toBe(0);

            // All should equal required
            expect(consentData.requested_attributes).toEqual(
              consentData.required_attributes,
            );

            return true;
          },
        ),
        {numRuns: 10, verbose: 0},
      );
    });

    it('should handle requests with only optional attributes', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc
            .array(fc.constantFrom('curso', 'status_matricula'), {
              minLength: 1,
              maxLength: 2,
            })
            .map(arr => [...new Set(arr)]), // Remove duplicates
          arbitraryCredential(),
          async (optional, credential) => {
            const pexRequest = await fc.sample(
              arbitraryValidPEXRequest([], optional),
              1,
            )[0];

            const consentData = await PresentationService.processPEXRequest(
              pexRequest,
              credential,
            );

            // Should have optional attributes
            expect(consentData.optional_attributes.length).toBe(optional.length);

            // Required should be empty
            expect(consentData.required_attributes.length).toBe(0);

            // All should equal optional
            expect(consentData.requested_attributes).toEqual(
              consentData.optional_attributes,
            );

            return true;
          },
        ),
        {numRuns: 10, verbose: 0},
      );
    });

    it('should include predicates in consent data when present', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.constantFrom('nome_completo'), {
            minLength: 1,
            maxLength: 1,
          }),
          arbitraryCredential(),
          async (required, credential) => {
            const pexRequest = await fc.sample(
              arbitraryValidPEXRequest(required, []),
              1,
            )[0];

            // Add predicates
            pexRequest.predicates = [
              {
                attribute: 'data_nascimento',
                p_type: '>=',
                value: '2000-01-01',
              },
            ];

            const consentData = await PresentationService.processPEXRequest(
              pexRequest,
              credential,
            );

            // Should include predicates
            expect(consentData.predicates).toBeDefined();
            expect(consentData.predicates!.length).toBe(1);
            expect(consentData.predicates![0].attribute).toBe('data_nascimento');

            return true;
          },
        ),
        {numRuns: 10, verbose: 0},
      );
    });

    it('should log consent data generation with counts', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc
            .array(fc.constantFrom('nome_completo', 'cpf'), {
              minLength: 1,
              maxLength: 2,
            })
            .map(arr => [...new Set(arr)]) // Remove duplicates
            .chain(required =>
              fc
                .array(fc.constantFrom('curso'), {minLength: 0, maxLength: 1})
                .map(optional => ({required, optional})),
            ),
          arbitraryCredential(),
          async ({required, optional}, credential) => {
            jest.clearAllMocks();

            const pexRequest = await fc.sample(
              arbitraryValidPEXRequest(required, optional),
              1,
            )[0];

            await PresentationService.processPEXRequest(pexRequest, credential);

            // Should log consent data generation
            const logCalls = (LogService.captureEvent as jest.Mock).mock.calls;
            const consentLog = logCalls.find(
              call =>
                call[0] === 'presentation_creation' &&
                call[2]?.parameters?.action === 'consent_data_generated',
            );

            expect(consentLog).toBeDefined();
            expect(consentLog[2].parameters.required_count).toBe(
              required.length,
            );
            expect(consentLog[2].parameters.optional_count).toBe(
              optional.length,
            );

            return true;
          },
        ),
        {numRuns: 10, verbose: 0},
      );
    });

    it('should validate PEX format before processing', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitraryInvalidPEXRequest(),
          arbitraryCredential(),
          async (invalidRequest, credential) => {
            // Should throw ValidationError for invalid request
            await expect(
              PresentationService.processPEXRequest(
                invalidRequest,
                credential,
              ),
            ).rejects.toThrow(ValidationError);

            return true;
          },
        ),
        {numRuns: 10, verbose: 0},
      );
    });
  });
});
