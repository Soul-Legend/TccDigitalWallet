/**
 * Property-Based Tests for Holder Credential Storage
 * Feature: carteira-identidade-academica
 * Task 9.1: Property tests for credential storage functionality
 */

import fc from 'fast-check';
import CredentialService from '../../services/CredentialService';
import StorageService from '../../services/StorageService';
import {StudentData, VerifiableCredential} from '../../types';

// Arbitrary generators
const arbitraryStudentData = (): fc.Arbitrary<StudentData> =>
  fc.record({
    nome_completo: fc.string({minLength: 3, maxLength: 100}),
    cpf: fc
      .string({minLength: 11, maxLength: 11})
      .map(s => s.replace(/\D/g, '').padEnd(11, '0')),
    matricula: fc.string({minLength: 6, maxLength: 20}),
    curso: fc.constantFrom(
      'Ciência da Computação',
      'Engenharia',
      'Medicina',
    ),
    status_matricula: fc.constantFrom('Ativo', 'Inativo'),
    data_nascimento: fc
      .date({min: new Date('1950-01-01'), max: new Date('2010-01-01')})
      .filter(d => !isNaN(d.getTime()))
      .map(d => d.toISOString().split('T')[0]),
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
    acesso_laboratorios: fc.array(fc.string(), {maxLength: 5}),
    acesso_predios: fc.array(fc.string(), {maxLength: 5}),
  });

describe('Holder Credential Storage - Property Tests', () => {
  beforeEach(async () => {
    // Clear storage before each test
    await StorageService.clearAll();
  });

  afterEach(async () => {
    // Clean up after each test
    await StorageService.clearAll();
  });

  /**
   * Property 7: Token Structure Validation
   * Validates: Requirements 3.2
   *
   * For any credential received by the Holder module, the system SHALL validate
   * the token structure against VerifiableCredential schema, and malformed tokens
   * SHALL be rejected with descriptive error messages.
   */
  describe('Property 7: Token Structure Validation', () => {
    it('should validate and accept well-formed SD-JWT credentials', async () => {
      await fc.assert(
        fc.asyncProperty(arbitraryStudentData(), async studentData => {
          // Generate a valid credential
          const holderDID = 'did:key:z6MkTest123';
          const credentialToken = await CredentialService.issueCredential(
            studentData,
            holderDID,
            'sd-jwt',
          );

          // Validate and parse should succeed
          const parsedCredential =
            await CredentialService.validateAndParseCredential(credentialToken);

          // Verify the credential has the expected structure
          expect(parsedCredential).toHaveProperty('@context');
          expect(parsedCredential).toHaveProperty('type');
          expect(parsedCredential).toHaveProperty('issuer');
          expect(parsedCredential).toHaveProperty('issuanceDate');
          expect(parsedCredential).toHaveProperty('credentialSubject');
          expect(parsedCredential).toHaveProperty('proof');

          return true;
        }),
        {numRuns: 3, verbose: 0},
      );
    });

    it('should reject malformed tokens with descriptive errors', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(
            fc.constant('invalid-token'),
            fc.constant(''),
            fc.constant('{}'),
            fc.constant('not.a.jwt'),
            fc.constant('a.b'), // JWT with only 2 parts
          ),
          async invalidToken => {
            // Validation should fail
            await expect(
              CredentialService.validateAndParseCredential(invalidToken),
            ).rejects.toThrow();

            return true;
          },
        ),
        {numRuns: 3, verbose: 0},
      );
    });

    it('should reject tokens with missing required fields', async () => {
      // Create a JWT with incomplete credential
      const incompleteCredential = {
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        type: ['VerifiableCredential'],
        // Missing issuer, issuanceDate, credentialSubject, proof
      };

      const payload = {
        vc: incompleteCredential,
        iss: 'did:web:test',
        sub: 'did:key:test',
        iat: Math.floor(Date.now() / 1000),
      };

      const header = {alg: 'EdDSA', typ: 'JWT'};
      const headerBase64 = Buffer.from(JSON.stringify(header)).toString(
        'base64url',
      );
      const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString(
        'base64url',
      );
      const fakeSignature = 'fake-signature';

      const invalidJWT = `${headerBase64}.${payloadBase64}.${fakeSignature}`;

      await expect(
        CredentialService.validateAndParseCredential(invalidJWT),
      ).rejects.toThrow();
    });
  });

  /**
   * Property 8: Encrypted Credential Storage
   * Validates: Requirements 3.4, 11.2
   *
   * For any valid credential, the system SHALL store it in encrypted format using
   * the operating system's secure storage APIs, and retrieval SHALL decrypt the
   * credential correctly.
   */
  describe('Property 8: Encrypted Credential Storage', () => {
    it('should store and retrieve credentials correctly', async () => {
      await fc.assert(
        fc.asyncProperty(arbitraryStudentData(), async studentData => {
          // Clear storage at the start of each iteration
          await StorageService.clearAll();

          // Generate a valid credential
          const holderDID = 'did:key:z6MkTest123';
          const credentialToken = await CredentialService.issueCredential(
            studentData,
            holderDID,
            'sd-jwt',
          );

          // Store the credential
          await StorageService.storeCredential(credentialToken);

          // Retrieve credentials
          const storedCredentials = await StorageService.getCredentials();

          // Verify the credential was stored
          expect(storedCredentials).toHaveLength(1);
          expect(storedCredentials[0]).toBe(credentialToken);

          return true;
        }),
        {numRuns: 3, verbose: 0},
      );
    });

    it('should handle multiple credentials correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(arbitraryStudentData(), {minLength: 1, maxLength: 5}),
          async studentDataArray => {
            // Clear storage at the start of each iteration
            await StorageService.clearAll();

            const holderDID = 'did:key:z6MkTest123';
            const tokens: string[] = [];

            // Store multiple credentials
            for (const studentData of studentDataArray) {
              const token = await CredentialService.issueCredential(
                studentData,
                holderDID,
                'sd-jwt',
              );
              await StorageService.storeCredential(token);
              tokens.push(token);
            }

            // Retrieve all credentials
            const storedCredentials = await StorageService.getCredentials();

            // Verify all credentials were stored
            expect(storedCredentials).toHaveLength(tokens.length);
            expect(storedCredentials).toEqual(tokens);

            return true;
          },
        ),
        {numRuns: 3, verbose: 0},
      );
    });

    it('should persist credentials across retrieval operations', async () => {
      await fc.assert(
        fc.asyncProperty(arbitraryStudentData(), async studentData => {
          // Clear storage at the start of each iteration
          await StorageService.clearAll();

          const holderDID = 'did:key:z6MkTest123';
          const credentialToken = await CredentialService.issueCredential(
            studentData,
            holderDID,
            'sd-jwt',
          );

          // Store the credential
          await StorageService.storeCredential(credentialToken);

          // Retrieve multiple times
          const retrieval1 = await StorageService.getCredentials();
          const retrieval2 = await StorageService.getCredentials();
          const retrieval3 = await StorageService.getCredentials();

          // All retrievals should return the same data
          expect(retrieval1).toEqual(retrieval2);
          expect(retrieval2).toEqual(retrieval3);
          expect(retrieval1[0]).toBe(credentialToken);

          return true;
        }),
        {numRuns: 3, verbose: 0},
      );
    });
  });

  /**
   * Property 9: Attribute Rendering Completeness
   * Validates: Requirements 3.7
   *
   * For any stored credential, all attributes in the credentialSubject SHALL be
   * rendered in plain text when the user views the credential.
   */
  describe('Property 9: Attribute Rendering Completeness', () => {
    it('should parse and expose all credential attributes', async () => {
      await fc.assert(
        fc.asyncProperty(arbitraryStudentData(), async studentData => {
          const holderDID = 'did:key:z6MkTest123';
          const credentialToken = await CredentialService.issueCredential(
            studentData,
            holderDID,
            'sd-jwt',
          );

          // Parse the credential
          const parsedCredential =
            await CredentialService.validateAndParseCredential(credentialToken);

          // Verify all student data attributes are present
          const subject = parsedCredential.credentialSubject;

          expect(subject.nome_completo).toBe(studentData.nome_completo);
          expect(subject.cpf).toBe(studentData.cpf);
          expect(subject.matricula).toBe(studentData.matricula);
          expect(subject.curso).toBe(studentData.curso);
          expect(subject.status_matricula).toBe(studentData.status_matricula);
          expect(subject.data_nascimento).toBe(studentData.data_nascimento);
          expect(subject.alojamento_indigena).toBe(
            studentData.alojamento_indigena,
          );
          expect(subject.auxilio_creche).toBe(studentData.auxilio_creche);
          expect(subject.auxilio_moradia).toBe(studentData.auxilio_moradia);
          expect(subject.bolsa_estudantil).toBe(studentData.bolsa_estudantil);
          expect(subject.bolsa_permanencia_mec).toBe(
            studentData.bolsa_permanencia_mec,
          );
          expect(subject.paiq).toBe(studentData.paiq);
          expect(subject.moradia_estudantil).toBe(
            studentData.moradia_estudantil,
          );
          expect(subject.isencao_ru).toBe(studentData.isencao_ru);
          expect(subject.isencao_esporte).toBe(studentData.isencao_esporte);
          expect(subject.isencao_idiomas).toBe(studentData.isencao_idiomas);
          expect(subject.acesso_laboratorios).toEqual(
            studentData.acesso_laboratorios,
          );
          expect(subject.acesso_predios).toEqual(studentData.acesso_predios);

          return true;
        }),
        {numRuns: 3, verbose: 0},
      );
    });

    it('should preserve attribute types correctly', async () => {
      await fc.assert(
        fc.asyncProperty(arbitraryStudentData(), async studentData => {
          const holderDID = 'did:key:z6MkTest123';
          const credentialToken = await CredentialService.issueCredential(
            studentData,
            holderDID,
            'sd-jwt',
          );

          const parsedCredential =
            await CredentialService.validateAndParseCredential(credentialToken);
          const subject = parsedCredential.credentialSubject;

          // Verify types
          expect(typeof subject.nome_completo).toBe('string');
          expect(typeof subject.cpf).toBe('string');
          expect(typeof subject.matricula).toBe('string');
          expect(typeof subject.curso).toBe('string');
          expect(typeof subject.status_matricula).toBe('string');
          expect(typeof subject.data_nascimento).toBe('string');
          expect(typeof subject.alojamento_indigena).toBe('boolean');
          expect(typeof subject.auxilio_creche).toBe('boolean');
          expect(typeof subject.auxilio_moradia).toBe('boolean');
          expect(typeof subject.bolsa_estudantil).toBe('boolean');
          expect(typeof subject.bolsa_permanencia_mec).toBe('boolean');
          expect(typeof subject.paiq).toBe('boolean');
          expect(typeof subject.moradia_estudantil).toBe('boolean');
          expect(typeof subject.isencao_ru).toBe('boolean');
          expect(typeof subject.isencao_esporte).toBe('boolean');
          expect(typeof subject.isencao_idiomas).toBe('boolean');
          expect(Array.isArray(subject.acesso_laboratorios)).toBe(true);
          expect(Array.isArray(subject.acesso_predios)).toBe(true);

          return true;
        }),
        {numRuns: 3, verbose: 0},
      );
    });
  });

  /**
   * Property 10: Multi-Credential Navigation
   * Validates: Requirements 3.8
   *
   * For any set of stored credentials, the system SHALL allow navigation between
   * them, and each credential SHALL be accessible individually.
   */
  describe('Property 10: Multi-Credential Navigation', () => {
    it('should allow access to each credential individually', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(arbitraryStudentData(), {minLength: 2, maxLength: 5}),
          async studentDataArray => {
            // Clear storage at the start of each iteration
            await StorageService.clearAll();

            const holderDID = 'did:key:z6MkTest123';
            const expectedCredentials: VerifiableCredential[] = [];

            // Store multiple credentials
            for (const studentData of studentDataArray) {
              const token = await CredentialService.issueCredential(
                studentData,
                holderDID,
                'sd-jwt',
              );
              await StorageService.storeCredential(token);

              const parsed =
                await CredentialService.validateAndParseCredential(token);
              expectedCredentials.push(parsed);
            }

            // Retrieve all credentials
            const storedTokens = await StorageService.getCredentials();

            // Verify we can access each credential individually
            for (let i = 0; i < storedTokens.length; i++) {
              const token = storedTokens[i];
              const parsed =
                await CredentialService.validateAndParseCredential(token);

              // Verify this credential matches the expected one
              expect(parsed.credentialSubject.nome_completo).toBe(
                expectedCredentials[i].credentialSubject.nome_completo,
              );
              expect(parsed.credentialSubject.cpf).toBe(
                expectedCredentials[i].credentialSubject.cpf,
              );
              expect(parsed.credentialSubject.matricula).toBe(
                expectedCredentials[i].credentialSubject.matricula,
              );
            }

            return true;
          },
        ),
        {numRuns: 3, verbose: 0},
      );
    });

    it('should maintain credential order', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(arbitraryStudentData(), {minLength: 2, maxLength: 5}),
          async studentDataArray => {
            // Clear storage at the start of each iteration
            await StorageService.clearAll();

            const holderDID = 'did:key:z6MkTest123';
            const tokens: string[] = [];

            // Store credentials in order
            for (const studentData of studentDataArray) {
              const token = await CredentialService.issueCredential(
                studentData,
                holderDID,
                'sd-jwt',
              );
              await StorageService.storeCredential(token);
              tokens.push(token);
            }

            // Retrieve credentials
            const storedTokens = await StorageService.getCredentials();

            // Verify order is maintained
            expect(storedTokens).toEqual(tokens);

            return true;
          },
        ),
        {numRuns: 3, verbose: 0},
      );
    });

    it('should support credential deletion without affecting others', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(arbitraryStudentData(), {minLength: 3, maxLength: 5}),
          async studentDataArray => {
            // Clear storage at the start of each iteration
            await StorageService.clearAll();

            const holderDID = 'did:key:z6MkTest123';
            const tokens: string[] = [];

            // Store multiple credentials
            for (const studentData of studentDataArray) {
              const token = await CredentialService.issueCredential(
                studentData,
                holderDID,
                'sd-jwt',
              );
              await StorageService.storeCredential(token);
              tokens.push(token);
            }

            // Delete the middle credential
            const middleIndex = Math.floor(tokens.length / 2);
            await StorageService.deleteCredential(middleIndex);

            // Retrieve remaining credentials
            const remainingTokens = await StorageService.getCredentials();

            // Verify the correct credential was deleted
            expect(remainingTokens).toHaveLength(tokens.length - 1);
            expect(remainingTokens).not.toContain(tokens[middleIndex]);

            // Verify other credentials are still present
            const expectedRemaining = [
              ...tokens.slice(0, middleIndex),
              ...tokens.slice(middleIndex + 1),
            ];
            expect(remainingTokens).toEqual(expectedRemaining);

            return true;
          },
        ),
        {numRuns: 3, verbose: 0},
      );
    });
  });
});
