import fc from 'fast-check';
import PresentationService from '../PresentationService';
import VerificationService from '../VerificationService';
import CryptoService from '../CryptoService';
import StorageService from '../StorageService';
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

describe('Range Proof Property-Based Tests', () => {
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

    // Mock CryptoService.signData to return a valid signature (must be >= 64 chars)
    (CryptoService.signData as jest.Mock).mockResolvedValue(
      'a'.repeat(128), // 128 character hex string (64 bytes)
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

  const arbitraryAgeVerificationRequest = (): fc.Arbitrary<PresentationExchangeRequest> =>
    fc.record({
      type: fc.constant('PresentationExchange' as const),
      version: fc.constant('1.0.0'),
      challenge: fc.string({minLength: 10, maxLength: 50}),
      presentation_definition: fc.record({
        id: fc.string({minLength: 5, maxLength: 20}),
        input_descriptors: fc.constant([
          {
            id: 'age-verification',
            name: 'Age Verification',
            purpose: 'Verify age >= 18',
            constraints: {
              fields: [
                {
                  path: ['$.credentialSubject.data_nascimento'],
                  predicate: 'required' as const,
                },
              ],
            },
          },
        ]),
      }),
      predicates: fc.constant([
        {
          attribute: 'data_nascimento',
          p_type: '>=',
          value: 18,
        },
      ]),
    });

  /**
   * Property 24: Range Proof Generation
   * **Validates: Requirements 8.3, 8.4**
   *
   * For any age verification request, the system SHALL generate a range proof
   * based on data_nascimento that proves age >= 18 without revealing the exact birthdate.
   */
  describe('Property 24: Range Proof Generation', () => {
    it('should generate range proof for age verification without revealing birthdate', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitraryCredential(),
          arbitraryAgeVerificationRequest(),
          async (credential, pexRequest) => {
            // Create ZKP presentation with age predicate
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

            // Verify ZKP proofs exist for age verification
            expect(presentation.zkp_proofs).toBeDefined();
            expect(Array.isArray(presentation.zkp_proofs)).toBe(true);
            expect(presentation.zkp_proofs!.length).toBe(1);

            // Verify the proof is for data_nascimento
            const ageProof = presentation.zkp_proofs![0];
            expect(ageProof.predicate.attr_name).toBe('data_nascimento');
            expect(ageProof.predicate.p_type).toBe('>=');
            expect(ageProof.predicate.value).toBe(18);

            return true;
          },
        ),
        {numRuns: 5, verbose: 0},
      );
    });

    it('should not reveal exact birthdate in range proof', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitraryCredential(),
          arbitraryAgeVerificationRequest(),
          async (credential, pexRequest) => {
            const predicates = pexRequest.predicates || [];
            const presentation = await PresentationService.createZKPPresentation(
              credential,
              pexRequest,
              predicates,
            );

            // Get the actual birthdate from credential
            const birthdate = credential.credentialSubject.data_nascimento;

            // Verify birthdate is not in revealed attributes
            const zkpProofs = presentation.zkp_proofs || [];
            expect(zkpProofs.length).toBe(1);
            expect(zkpProofs[0].revealed_attrs.length).toBe(0);

            // Verify birthdate is not in proof data
            const proofDataString = JSON.stringify(zkpProofs[0].proof_data);
            expect(proofDataString).not.toContain(birthdate);

            // Verify birthdate is not in presentation JSON
            // The birthdate might be in the embedded credential, but not in the proof
            const proofSection = JSON.stringify(presentation.zkp_proofs);
            expect(proofSection).not.toContain(birthdate);

            return true;
          },
        ),
        {numRuns: 5, verbose: 0},
      );
    });

    it('should generate cryptographic commitment for age range proof', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitraryCredential(),
          arbitraryAgeVerificationRequest(),
          async (credential, pexRequest) => {
            const predicates = pexRequest.predicates || [];
            const presentation = await PresentationService.createZKPPresentation(
              credential,
              pexRequest,
              predicates,
            );

            const zkpProofs = presentation.zkp_proofs || [];
            const ageProof = zkpProofs[0];

            // Verify proof_data contains circom proof from mopro
            expect(ageProof.proof_data).toBeDefined();
            expect(ageProof.proof_data.circom_proof).toBeDefined();
            expect(typeof ageProof.proof_data.circom_proof).toBe('object');

            // Verify circom_proof has Groth16 structure
            expect(ageProof.proof_data.circom_proof.a).toBeDefined();
            expect(ageProof.proof_data.circom_proof.b).toBeDefined();
            expect(ageProof.proof_data.circom_proof.c).toBeDefined();
            expect(ageProof.proof_data.circom_proof.protocol).toBe('groth16');

            // Verify public_inputs exist
            expect(ageProof.proof_data.public_inputs).toBeDefined();
            expect(Array.isArray(ageProof.proof_data.public_inputs)).toBe(true);

            return true;
          },
        ),
        {numRuns: 5, verbose: 0},
      );
    });

    it('should correctly evaluate age >= 18 predicate', async () => {
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

            // Create age verification request
            const pexRequest: PresentationExchangeRequest = {
              type: 'PresentationExchange',
              version: '1.0.0',
              challenge: 'test-challenge',
              presentation_definition: {
                id: 'age-verification',
                input_descriptors: [
                  {
                    id: 'age-desc',
                    name: 'Age Verification',
                    purpose: 'Verify age >= 18',
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
              predicates: [
                {
                  attribute: 'data_nascimento',
                  p_type: '>=',
                  value: 18,
                },
              ],
            };

            const presentation = await PresentationService.createZKPPresentation(
              credential,
              pexRequest,
              pexRequest.predicates,
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

    it('should produce boolean attestation for age verification', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitraryCredential(),
          arbitraryAgeVerificationRequest(),
          async (credential, pexRequest) => {
            const predicates = pexRequest.predicates || [];
            const presentation = await PresentationService.createZKPPresentation(
              credential,
              pexRequest,
              predicates,
            );

            const zkpProofs = presentation.zkp_proofs || [];
            const ageProof = zkpProofs[0];

            // Verify boolean attestation exists
            expect(ageProof.predicate_satisfied).toBeDefined();
            expect(typeof ageProof.predicate_satisfied).toBe('boolean');

            // Verify it's a boolean value (true or false)
            expect([true, false]).toContain(ageProof.predicate_satisfied);

            return true;
          },
        ),
        {numRuns: 5, verbose: 0},
      );
    });
  });

  /**
   * Property 25: Range Proof Privacy
   * **Validates: Requirements 8.7**
   *
   * For any range proof validation, the system SHALL verify the mathematical proof
   * without accessing or exposing the exact data_nascimento value.
   */
  describe('Property 25: Range Proof Privacy', () => {
    it('should validate range proof without accessing exact birthdate', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitraryCredential(),
          arbitraryAgeVerificationRequest(),
          async (credential, pexRequest) => {
            // Create presentation with range proof
            const predicates = pexRequest.predicates || [];
            const presentation = await PresentationService.createZKPPresentation(
              credential,
              pexRequest,
              predicates,
            );

            // Mock issuer public key
            (StorageService.getIssuerPublicKey as jest.Mock).mockResolvedValue(
              'mock-issuer-public-key',
            );

            // Mock holder public key
            (StorageService.getHolderPublicKey as jest.Mock).mockResolvedValue(
              'mock-holder-public-key',
            );

            // Mock signature verification
            (CryptoService.verifySignature as jest.Mock).mockResolvedValue(true);

            // Validate the presentation
            const validationResult = await VerificationService.validatePresentation(
              presentation,
              pexRequest,
            );

            // Verify validation completed (may be valid or invalid depending on age)
            expect(validationResult).toBeDefined();
            expect(typeof validationResult.valid).toBe('boolean');

            // Verify that validation did not require accessing the exact birthdate
            // The birthdate should not be in verified_attributes
            if (validationResult.verified_attributes) {
              expect(validationResult.verified_attributes.data_nascimento).toBeUndefined();
            }

            return true;
          },
        ),
        {numRuns: 5, verbose: 0},
      );
    });

    it('should verify mathematical proof structure without exposing birthdate', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitraryCredential(),
          arbitraryAgeVerificationRequest(),
          async (credential, pexRequest) => {
            const predicates = pexRequest.predicates || [];
            const presentation = await PresentationService.createZKPPresentation(
              credential,
              pexRequest,
              predicates,
            );

            // Mock dependencies for verification
            (StorageService.getIssuerPublicKey as jest.Mock).mockResolvedValue(
              'mock-issuer-public-key',
            );
            (StorageService.getHolderPublicKey as jest.Mock).mockResolvedValue(
              'mock-holder-public-key',
            );
            (CryptoService.verifySignature as jest.Mock).mockResolvedValue(true);

            // Validate presentation
            const validationResult = await VerificationService.validatePresentation(
              presentation,
              pexRequest,
            );

            // Calculate expected age from birthdate
            const birthDate = new Date(credential.credentialSubject.data_nascimento);
            const today = new Date();
            let age = today.getFullYear() - birthDate.getFullYear();
            const monthDiff = today.getMonth() - birthDate.getMonth();
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
              age--;
            }
            const expectedValid = age >= 18;

            // Verify the proof was validated correctly based on actual age
            expect(validationResult.valid).toBe(expectedValid);

            // Verify no birthdate in validation result
            // (it might be in the embedded credential, but not in the verification logic)
            if (validationResult.verified_attributes) {
              expect(validationResult.verified_attributes.data_nascimento).toBeUndefined();
            }

            return true;
          },
        ),
        {numRuns: 5, verbose: 0},
      );
    });

    it('should validate ZKP signature without revealing attribute value', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitraryCredential(),
          arbitraryAgeVerificationRequest(),
          async (credential, pexRequest) => {
            const predicates = pexRequest.predicates || [];
            const presentation = await PresentationService.createZKPPresentation(
              credential,
              pexRequest,
              predicates,
            );

            // Mock dependencies
            (StorageService.getHolderPublicKey as jest.Mock).mockResolvedValue(
              'mock-holder-public-key',
            );

            // Track what data is passed to verifySignature
            const verifySignatureCalls: any[] = [];
            (CryptoService.verifySignature as jest.Mock).mockImplementation(
              async (data, signature, publicKey) => {
                verifySignatureCalls.push({data, signature, publicKey});
                return true;
              },
            );

            // Verify structural integrity (which validates ZKP proofs)
            (StorageService.getIssuerPublicKey as jest.Mock).mockResolvedValue(
              'mock-issuer-public-key',
            );

            try {
              await VerificationService.verifyStructuralIntegrity(
                presentation,
                pexRequest,
              );

              // If verification succeeds, check that birthdate was not passed to signature verification
              const birthdate = credential.credentialSubject.data_nascimento;
              for (const call of verifySignatureCalls) {
                expect(call.data).not.toContain(birthdate);
              }
            } catch (error) {
              // If verification fails due to unsatisfied predicate, that's expected for some ages
              // Just verify that the error is about predicate satisfaction, not signature verification
              if (error instanceof Error) {
                expect(error.message).toContain('Predicado não satisfeito');
              }
            }

            return true;
          },
        ),
        {numRuns: 5, verbose: 0},
      );
    });

    it('should check predicate satisfaction without accessing raw attribute', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({min: 1950, max: 2010}),
          async birthYear => {
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

            const pexRequest: PresentationExchangeRequest = {
              type: 'PresentationExchange',
              version: '1.0.0',
              challenge: 'test-challenge',
              presentation_definition: {
                id: 'age-verification',
                input_descriptors: [
                  {
                    id: 'age-desc',
                    name: 'Age Verification',
                    purpose: 'Verify age >= 18',
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
              predicates: [
                {
                  attribute: 'data_nascimento',
                  p_type: '>=',
                  value: 18,
                },
              ],
            };

            const presentation = await PresentationService.createZKPPresentation(
              credential,
              pexRequest,
              pexRequest.predicates,
            );

            // Mock dependencies
            (StorageService.getIssuerPublicKey as jest.Mock).mockResolvedValue(
              'mock-issuer-public-key',
            );
            (StorageService.getHolderPublicKey as jest.Mock).mockResolvedValue(
              'mock-holder-public-key',
            );
            (CryptoService.verifySignature as jest.Mock).mockResolvedValue(true);

            // Validate presentation
            const validationResult = await VerificationService.validatePresentation(
              presentation,
              pexRequest,
            );

            // Verify validation result matches expected age
            const expectedValid = expectedAge >= 18;
            expect(validationResult.valid).toBe(expectedValid);
            expect(validationResult.predicates_satisfied).toBe(expectedValid);

            // Verify birthdate is not in verified attributes
            if (validationResult.verified_attributes) {
              expect(validationResult.verified_attributes.data_nascimento).toBeUndefined();
            }

            return true;
          },
        ),
        {numRuns: 5, verbose: 0},
      );
    });
  });
});
