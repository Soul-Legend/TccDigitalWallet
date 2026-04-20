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

describe('PresentationService - ZKP Property-Based Tests', () => {
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

    // Mock CryptoService.generateNonce
    (CryptoService.generateNonce as jest.Mock).mockReturnValue(
      'mock-nonce-1234567890abcdef',
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

  const arbitraryPEXRequest = (): fc.Arbitrary<PresentationExchangeRequest> =>
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
                {
                  path: ['$.credentialSubject.status_matricula'],
                  predicate: 'required' as const,
                },
              ],
            },
          },
        ]),
      }),
      predicates: fc.constant([
        {
          attribute: 'status_matricula',
          p_type: '==',
          value: 'Ativo',
        },
      ]),
    });

  /**
   * Property 15: ZKP Proof Validity
   * **Validates: Requirements 4.9, 6.3, 11.5**
   *
   * For any AnonCreds presentation generated, the zero-knowledge proofs SHALL be
   * mathematically valid and SHALL reveal only the requested predicates without
   * exposing underlying attribute values.
   */
  describe('Property 15: ZKP Proof Validity', () => {
    it('should generate valid ZKP proofs for predicates', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitraryCredential(),
          arbitraryPEXRequest(),
          async (credential, pexRequest) => {
            // Create ZKP presentation
            const predicates = pexRequest.predicates || [];
            const presentation = await PresentationService.createZKPPresentation(
              credential,
              pexRequest,
              predicates,
            );

            // Verify presentation structure
            expect(presentation).toBeDefined();
            expect(presentation.type).toContain('VerifiablePresentation');
            expect(presentation.proof.type).toBe('Groth16Proof');

            // Verify ZKP proofs exist
            expect(presentation.zkp_proofs).toBeDefined();
            expect(Array.isArray(presentation.zkp_proofs)).toBe(true);
            expect(presentation.zkp_proofs!.length).toBe(predicates.length);

            return true;
          },
        ),
        {numRuns: 5, verbose: 0},
      );
    });

    it('should not reveal actual attribute values in ZKP proofs', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitraryCredential(),
          arbitraryPEXRequest(),
          async (credential, pexRequest) => {
            const predicates = pexRequest.predicates || [];
            const presentation = await PresentationService.createZKPPresentation(
              credential,
              pexRequest,
              predicates,
            );

            // Verify that zkp_proofs don't contain actual attribute values
            const zkpProofs = presentation.zkp_proofs || [];

            for (const proof of zkpProofs) {
              // Check that revealed_attrs is empty (no attributes revealed)
              expect(proof.revealed_attrs).toBeDefined();
              expect(proof.revealed_attrs.length).toBe(0);

              // Check that proof_data doesn't contain the actual attribute value
              const attributeName = proof.predicate.attr_name;
              const actualValue = (credential.credentialSubject as any)[
                attributeName
              ];

              const proofDataString = JSON.stringify(proof.proof_data);

              // Actual value should not appear in proof data
              if (typeof actualValue === 'string') {
                expect(proofDataString).not.toContain(actualValue);
              }
            }

            return true;
          },
        ),
        {numRuns: 5, verbose: 0},
      );
    });

    it('should correctly evaluate predicates in ZKP proofs', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitraryCredential(),
          async credential => {
            // Create a predicate based on the credential's actual status
            const actualStatus = credential.credentialSubject.status_matricula;
            const predicates: Array<{attribute: string; p_type: '>=' | '<=' | '==' | '!='; value: any}> = [
              {
                attribute: 'status_matricula',
                p_type: '==',
                value: actualStatus,
              },
            ];

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
                          path: ['$.credentialSubject.status_matricula'],
                          predicate: 'required',
                        },
                      ],
                    },
                  },
                ],
              },
              predicates,
            };

            const presentation = await PresentationService.createZKPPresentation(
              credential,
              pexRequest,
              predicates,
            );

            // Verify that the predicate is marked as satisfied
            const zkpProofs = presentation.zkp_proofs || [];
            expect(zkpProofs.length).toBe(1);
            expect(zkpProofs[0].predicate_satisfied).toBe(true);

            return true;
          },
        ),
        {numRuns: 5, verbose: 0},
      );
    });

    it('should generate cryptographic commitments for each predicate', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitraryCredential(),
          arbitraryPEXRequest(),
          async (credential, pexRequest) => {
            const predicates = pexRequest.predicates || [];
            const presentation = await PresentationService.createZKPPresentation(
              credential,
              pexRequest,
              predicates,
            );

            const zkpProofs = presentation.zkp_proofs || [];

            for (const proof of zkpProofs) {
              // Verify proof_data contains circom proof from mopro
              expect(proof.proof_data).toBeDefined();
              expect(proof.proof_data.circom_proof).toBeDefined();
              expect(typeof proof.proof_data.circom_proof).toBe('object');

              // Verify circom_proof has Groth16 structure (a, b, c curve points)
              expect(proof.proof_data.circom_proof.a).toBeDefined();
              expect(proof.proof_data.circom_proof.b).toBeDefined();
              expect(proof.proof_data.circom_proof.c).toBeDefined();
              expect(proof.proof_data.circom_proof.protocol).toBe('groth16');

              // Verify public_inputs exist
              expect(proof.proof_data.public_inputs).toBeDefined();
              expect(Array.isArray(proof.proof_data.public_inputs)).toBe(true);
            }

            return true;
          },
        ),
        {numRuns: 5, verbose: 0},
      );
    });

    it('should include predicate information in ZKP proofs', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitraryCredential(),
          arbitraryPEXRequest(),
          async (credential, pexRequest) => {
            const predicates = pexRequest.predicates || [];
            const presentation = await PresentationService.createZKPPresentation(
              credential,
              pexRequest,
              predicates,
            );

            const zkpProofs = presentation.zkp_proofs || [];

            for (let i = 0; i < zkpProofs.length; i++) {
              const proof = zkpProofs[i];
              const originalPredicate = predicates[i];

              // Verify predicate information is included
              expect(proof.predicate).toBeDefined();
              expect(proof.predicate.attr_name).toBe(
                originalPredicate.attribute,
              );
              expect(proof.predicate.p_type).toBe(originalPredicate.p_type);
              expect(proof.predicate.value).toBe(originalPredicate.value);
            }

            return true;
          },
        ),
        {numRuns: 5, verbose: 0},
      );
    });

    it('should log ZKP generation events', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitraryCredential(),
          arbitraryPEXRequest(),
          async (credential, pexRequest) => {
            jest.clearAllMocks();

            const predicates = pexRequest.predicates || [];
            await PresentationService.createZKPPresentation(
              credential,
              pexRequest,
              predicates,
            );

            // Verify logging was called for ZKP generation
            const logCalls = (LogService.captureEvent as jest.Mock).mock.calls;

            // Should have log for ZKP generation started
            const startLog = logCalls.find(
              call =>
                call[0] === 'zkp_generation' &&
                call[2]?.parameters?.action === 'zkp_generation_started',
            );
            expect(startLog).toBeDefined();

            // Should have log for ZKP generated
            const completionLog = logCalls.find(
              call =>
                call[0] === 'zkp_generation' &&
                call[2]?.parameters?.action === 'zkp_generated',
            );
            expect(completionLog).toBeDefined();

            return true;
          },
        ),
        {numRuns: 5, verbose: 0},
      );
    });

    it('should handle age-based predicates correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({min: 1950, max: 2010}),
          async birthYear => {
            // Create credential with specific birth date
            const birthDate = `${birthYear}-06-15`;
            const credential: VerifiableCredential = {
              '@context': ['https://www.w3.org/2018/credentials/v1'],
              type: ['VerifiableCredential', 'AcademicIDCredential'],
              issuer: 'did:web:ufsc.br',
              issuanceDate: new Date().toISOString(),
              credentialSubject: {
                id: 'did:key:z6Mk...',
                nome_completo: 'Test User',
                cpf: '12345678900',
                matricula: 'TEST123',
                curso: 'Test',
                status_matricula: 'Ativo',
                data_nascimento: birthDate,
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
                type: 'JsonWebSignature2020',
                created: new Date().toISOString(),
                verificationMethod: 'did:web:ufsc.br#key-1',
                proofPurpose: 'assertionMethod',
                jws: 'mock-jws',
              },
            };

            // Calculate expected age
            const today = new Date();
            let expectedAge = today.getFullYear() - birthYear;
            const birthDateObj = new Date(birthDate);
            const monthDiff = today.getMonth() - birthDateObj.getMonth();
            if (
              monthDiff < 0 ||
              (monthDiff === 0 && today.getDate() < birthDateObj.getDate())
            ) {
              expectedAge--;
            }

            // Create predicate for age >= 18
            const predicates: Array<{attribute: string; p_type: '>=' | '<=' | '==' | '!='; value: any}> = [
              {
                attribute: 'data_nascimento',
                p_type: '>=',
                value: 18,
              },
            ];

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
                          path: ['$.credentialSubject.data_nascimento'],
                          predicate: 'required',
                        },
                      ],
                    },
                  },
                ],
              },
              predicates,
            };

            const presentation = await PresentationService.createZKPPresentation(
              credential,
              pexRequest,
              predicates,
            );

            // Verify predicate satisfaction matches expected age
            const zkpProofs = presentation.zkp_proofs || [];
            expect(zkpProofs.length).toBe(1);
            expect(zkpProofs[0].predicate_satisfied).toBe(expectedAge >= 18);

            // Verify birth date is not revealed
            const proofDataString = JSON.stringify(zkpProofs[0].proof_data);
            expect(proofDataString).not.toContain(birthDate);

            return true;
          },
        ),
        {numRuns: 5, verbose: 0},
      );
    });

    it('should handle multiple predicates in a single presentation', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitraryCredential(),
          async credential => {
            // Create multiple predicates
            const predicates: Array<{attribute: string; p_type: '>=' | '<=' | '==' | '!='; value: any}> = [
              {
                attribute: 'status_matricula',
                p_type: '==',
                value: credential.credentialSubject.status_matricula,
              },
              {
                attribute: 'isencao_ru',
                p_type: '==',
                value: credential.credentialSubject.isencao_ru,
              },
            ];

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
                          path: ['$.credentialSubject.status_matricula'],
                          predicate: 'required',
                        },
                        {
                          path: ['$.credentialSubject.isencao_ru'],
                          predicate: 'required',
                        },
                      ],
                    },
                  },
                ],
              },
              predicates,
            };

            const presentation = await PresentationService.createZKPPresentation(
              credential,
              pexRequest,
              predicates,
            );

            // Verify all predicates have proofs
            const zkpProofs = presentation.zkp_proofs || [];
            expect(zkpProofs.length).toBe(2);

            // Verify each proof corresponds to a predicate
            for (let i = 0; i < predicates.length; i++) {
              expect(zkpProofs[i].predicate.attr_name).toBe(
                predicates[i].attribute,
              );
              expect(zkpProofs[i].predicate_satisfied).toBe(true);
            }

            return true;
          },
        ),
        {numRuns: 5, verbose: 0},
      );
    });
  });
});
