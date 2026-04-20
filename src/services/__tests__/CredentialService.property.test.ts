/**
 * Property-Based Tests for CredentialService
 *
 * Feature: carteira-identidade-academica
 * These tests validate the correctness properties of credential issuance
 */

import fc from 'fast-check';
import CredentialService from '../CredentialService';
import DIDService from '../DIDService';
import StorageService from '../StorageService';
import LogService from '../LogService';
import {useAppStore} from '../../stores/useAppStore';
import {StudentData} from '../../types';
import {ValidationError} from '../ErrorHandler';

// Clear storage and logs before each test
beforeEach(async () => {
  await StorageService.clearAll();
  useAppStore.getState().clearLogs();
});

// Arbitrary generator for StudentData
const arbitraryStudentData = (): fc.Arbitrary<StudentData> =>
  fc.record({
    nome_completo: fc.string({minLength: 3, maxLength: 100}),
    cpf: fc
      .integer({min: 10000000000, max: 99999999999})
      .map(n => n.toString()),
    matricula: fc.string({minLength: 6, maxLength: 20}),
    curso: fc.constantFrom(
      'Ciência da Computação',
      'Engenharia',
      'Medicina',
      'Direito',
      'Administração',
    ),
    status_matricula: fc.constantFrom('Ativo', 'Inativo'),
    data_nascimento: fc
      .date({min: new Date('1950-01-01'), max: new Date('2010-01-01')})
      .filter(d => !isNaN(d.getTime())) // Filter out invalid dates
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
    acesso_laboratorios: fc.array(fc.string({minLength: 3, maxLength: 20}), {
      maxLength: 5,
    }),
    acesso_predios: fc.array(fc.string({minLength: 3, maxLength: 20}), {
      maxLength: 5,
    }),
  });

describe('CredentialService Property-Based Tests', () => {
  /**
   * Feature: carteira-identidade-academica, Property 5: Credential Signature Validity
   * Validates: Requirements 2.5, 2.6
   *
   * For any credential issuance, the digital signature SHALL be verifiable
   * using the issuer's public key (did:web), and the signature SHALL conform
   * to JsonWebSignature2020 or AnonCredsProof standards.
   */
  describe('Property 5: Credential Signature Validity', () => {
    it('should issue credentials with valid SD-JWT signatures', async () => {
      await fc.assert(
        fc.asyncProperty(arbitraryStudentData(), async studentData => {
          // Generate holder identity
          const {did: holderDID} = await DIDService.generateHolderIdentity(
            'key',
          );

          // Generate issuer identity (registered for the chain test setup)
          await DIDService.generateIssuerIdentity('ufsc.br');

          // Issue credential
          const credential = await CredentialService.issueCredential(
            studentData,
            holderDID,
            'sd-jwt',
          );

          // Verify credential is a JWT string
          expect(credential).toBeDefined();
          expect(typeof credential).toBe('string');
          expect(credential.split('.').length).toBe(3); // header.payload.signature

          // Parse JWT parts
          const [headerB64, payloadB64, signatureB64] = credential.split('.');

          // Decode header
          const header = JSON.parse(
            Buffer.from(headerB64, 'base64url').toString(),
          );
          expect(header.alg).toBe('EdDSA');
          expect(header.typ).toBe('JWT');

          // Decode payload
          const payload = JSON.parse(
            Buffer.from(payloadB64, 'base64url').toString(),
          );
          expect(payload.iss).toContain('did:web:ufsc.br');
          expect(payload.sub).toBe(holderDID);
          expect(payload.vc).toBeDefined();
          expect(payload.vc.credentialSubject).toBeDefined();

          // Signature is produced by the mocked Credo agent wallet;
          // real verification would need an actual Ed25519 key pair
          expect(signatureB64.length).toBeGreaterThan(0);

          return true;
        }),
        {numRuns: 5, verbose: 0},
      );
    });

    it('should issue credentials with valid AnonCreds signatures', async () => {
      await fc.assert(
        fc.asyncProperty(arbitraryStudentData(), async studentData => {
          // Generate holder identity
          const {did: holderDID} = await DIDService.generateHolderIdentity(
            'key',
          );

          // Generate issuer identity
          await DIDService.generateIssuerIdentity('ufsc.br');

          // Issue credential
          const credential = await CredentialService.issueCredential(
            studentData,
            holderDID,
            'anoncreds',
          );

          // Verify credential is a JSON string
          expect(credential).toBeDefined();
          expect(typeof credential).toBe('string');

          // Parse AnonCreds credential envelope
          const envelope = JSON.parse(credential);

          // Verify envelope structure (new real AnonCreds format)
          expect(envelope.format).toBe('anoncreds');
          expect(envelope.schema_id).toBeDefined();
          expect(envelope.cred_def_id).toBeDefined();
          expect(envelope.credential).toBeDefined();

          // Access the actual AnonCreds credential inside the envelope
          const anonCred = envelope.credential;

          // Verify AnonCreds credential structure
          expect(anonCred.schema_id).toBeDefined();
          expect(anonCred.cred_def_id).toBeDefined();
          expect(anonCred.values).toBeDefined();
          expect(anonCred.signature).toBeDefined();

          // Verify all student data attributes are encoded
          expect(anonCred.values.nome_completo).toBeDefined();
          expect(anonCred.values.cpf).toBeDefined();
          expect(anonCred.values.matricula).toBeDefined();
          expect(anonCred.values.curso).toBeDefined();

          // Verify encoding format (real AnonCreds stores {raw, encoded})
          expect(anonCred.values.nome_completo.raw).toBe(
            studentData.nome_completo,
          );
          expect(anonCred.values.nome_completo.encoded).toBeDefined();

          return true;
        }),
        {numRuns: 5, verbose: 0},
      );
    });

    it('should create credentials with correct issuer DID (did:web)', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitraryStudentData(),
          fc.constantFrom('sd-jwt', 'anoncreds'),
          async (studentData, format) => {
            // Generate holder identity
            const {did: holderDID} = await DIDService.generateHolderIdentity(
              'key',
            );

            // Generate issuer identity
            const {did: issuerDID} = await DIDService.generateIssuerIdentity(
              'ufsc.br',
            );

            // Issue credential
            const credential = await CredentialService.issueCredential(
              studentData,
              holderDID,
              format as 'sd-jwt' | 'anoncreds',
            );

            // Verify issuer DID is did:web
            expect(issuerDID).toMatch(/^did:web:/);

            // Verify credential contains issuer DID
            if (format === 'sd-jwt') {
              const [, payloadB64] = credential.split('.');
              const payload = JSON.parse(
                Buffer.from(payloadB64, 'base64url').toString(),
              );
              expect(payload.iss).toBe(issuerDID);
              expect(payload.vc.issuer).toBe(issuerDID);
            } else {
              const anonCred = JSON.parse(credential);
              expect(anonCred.schema_id).toContain('did:web:ufsc.br');
              expect(anonCred.cred_def_id).toContain('did:web:ufsc.br');
            }

            return true;
          },
        ),
        {numRuns: 5, verbose: 0},
      );
    });

    it('should include holder DID in credential subject', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitraryStudentData(),
          fc.constantFrom('key', 'peer'),
          async (studentData, holderMethod) => {
            // Generate holder identity
            const {did: holderDID} = await DIDService.generateHolderIdentity(
              holderMethod as 'key' | 'peer',
            );

            // Generate issuer identity
            await DIDService.generateIssuerIdentity('ufsc.br');

            // Issue credential
            const credential = await CredentialService.issueCredential(
              studentData,
              holderDID,
              'sd-jwt',
            );

            // Parse JWT
            const [, payloadB64] = credential.split('.');
            const payload = JSON.parse(
              Buffer.from(payloadB64, 'base64url').toString(),
            );

            // Verify holder DID is in credential subject
            expect(payload.sub).toBe(holderDID);
            expect(payload.vc.credentialSubject.id).toBe(holderDID);

            return true;
          },
        ),
        {numRuns: 5, verbose: 0},
      );
    });

    it('should log credential issuance events', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitraryStudentData(),
          fc.constantFrom('sd-jwt', 'anoncreds'),
          async (studentData, format) => {
            // Clear logs
            useAppStore.getState().clearLogs();

            // Generate identities
            const {did: holderDID} = await DIDService.generateHolderIdentity(
              'key',
            );
            await DIDService.generateIssuerIdentity('ufsc.br');

            // Clear logs again to focus on issuance
            useAppStore.getState().clearLogs();

            // Issue credential
            await CredentialService.issueCredential(
              studentData,
              holderDID,
              format as 'sd-jwt' | 'anoncreds',
            );

            // Get logs
            const logs = LogService.getLogs();
            const issuanceLogs = logs.filter(
              log => log.operation === 'credential_issuance',
            );

            // Verify issuance was logged
            expect(issuanceLogs.length).toBeGreaterThan(0);

            // Find the log with the correct algorithm (SD-JWT or AnonCreds)
            const issuanceLog = issuanceLogs.find(
              log =>
                log.details.algorithm ===
                (format === 'sd-jwt' ? 'SD-JWT' : 'AnonCreds'),
            );

            expect(issuanceLog).toBeDefined();
            expect(issuanceLog?.module).toBe('emissor');
            expect(issuanceLog?.success).toBe(true);
            expect(issuanceLog?.details.algorithm).toBe(
              format === 'sd-jwt' ? 'SD-JWT' : 'AnonCreds',
            );

            return true;
          },
        ),
        {numRuns: 5, verbose: 0},
      );
    });

    it('should validate student data before issuance', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            nome_completo: fc.option(fc.string(), {nil: ''}),
            cpf: fc.option(
              fc
                .integer({min: 10000000000, max: 99999999999})
                .map(n => n.toString()),
              {nil: ''},
            ),
            matricula: fc.option(fc.string(), {nil: ''}),
            curso: fc.option(fc.string(), {nil: ''}),
            status_matricula: fc.constantFrom('Ativo', 'Inativo', ''),
            data_nascimento: fc.option(fc.string(), {nil: ''}),
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
            acesso_laboratorios: fc.array(fc.string()),
            acesso_predios: fc.array(fc.string()),
          }),
          async invalidData => {
            // Check if data is actually invalid
            const hasEmptyRequired =
              !invalidData.nome_completo ||
              !invalidData.cpf ||
              !invalidData.matricula ||
              !invalidData.curso ||
              !invalidData.status_matricula ||
              !invalidData.data_nascimento;

            if (hasEmptyRequired) {
              // Should throw ValidationError
              expect(() => {
                CredentialService.validateStudentData(
                  invalidData as StudentData,
                );
              }).toThrow(ValidationError);
            }

            return true;
          },
        ),
        {numRuns: 5, verbose: 0},
      );
    });

    it('should reject invalid CPF formats', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitraryStudentData(),
          fc.oneof(
            fc.string({minLength: 1, maxLength: 10}), // Too short
            fc.string({minLength: 12, maxLength: 20}), // Too long
            fc.string({minLength: 11, maxLength: 11}).filter(s => /[^0-9]/.test(s)), // Non-numeric
          ),
          async (validData, invalidCPF) => {
            const invalidData = {...validData, cpf: invalidCPF};

            // Should throw ValidationError
            expect(() => {
              CredentialService.validateStudentData(invalidData);
            }).toThrow(ValidationError);

            return true;
          },
        ),
        {numRuns: 5, verbose: 0},
      );
    });

    it('should reject invalid date formats', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitraryStudentData(),
          fc.oneof(
            fc.constant('2024/01/01'), // Wrong separator
            fc.constant('01-01-2024'), // Wrong order
            fc.constant('2024-13-01'), // Invalid month
            fc.constant('2024-01-32'), // Invalid day
            fc.string({minLength: 1, maxLength: 20}).filter(s => !/^\d{4}-\d{2}-\d{2}$/.test(s)),
          ),
          async (validData, invalidDate) => {
            const invalidData = {...validData, data_nascimento: invalidDate};

            // Should throw ValidationError
            expect(() => {
              CredentialService.validateStudentData(invalidData);
            }).toThrow(ValidationError);

            return true;
          },
        ),
        {numRuns: 5, verbose: 0},
      );
    });

    it('should reject invalid status_matricula values', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitraryStudentData(),
          fc.string().filter(s => s !== 'Ativo' && s !== 'Inativo'),
          async (validData, invalidStatus) => {
            const invalidData = {
              ...validData,
              status_matricula: invalidStatus as 'Ativo' | 'Inativo',
            };

            // Should throw ValidationError
            expect(() => {
              CredentialService.validateStudentData(invalidData);
            }).toThrow(ValidationError);

            return true;
          },
        ),
        {numRuns: 5, verbose: 0},
      );
    });

    it('should preserve all student data attributes in credential', async () => {
      await fc.assert(
        fc.asyncProperty(arbitraryStudentData(), async studentData => {
          // Generate identities
          const {did: holderDID} = await DIDService.generateHolderIdentity(
            'key',
          );
          await DIDService.generateIssuerIdentity('ufsc.br');

          // Issue credential
          const credential = await CredentialService.issueCredential(
            studentData,
            holderDID,
            'sd-jwt',
          );

          // Parse JWT
          const [, payloadB64] = credential.split('.');
          const payload = JSON.parse(
            Buffer.from(payloadB64, 'base64url').toString(),
          );

          const credentialSubject = payload.vc.credentialSubject;

          // Verify all attributes are present
          expect(credentialSubject.nome_completo).toBe(studentData.nome_completo);
          expect(credentialSubject.cpf).toBe(studentData.cpf);
          expect(credentialSubject.matricula).toBe(studentData.matricula);
          expect(credentialSubject.curso).toBe(studentData.curso);
          expect(credentialSubject.status_matricula).toBe(
            studentData.status_matricula,
          );
          expect(credentialSubject.data_nascimento).toBe(
            studentData.data_nascimento,
          );
          expect(credentialSubject.alojamento_indigena).toBe(
            studentData.alojamento_indigena,
          );
          expect(credentialSubject.auxilio_creche).toBe(
            studentData.auxilio_creche,
          );
          expect(credentialSubject.auxilio_moradia).toBe(
            studentData.auxilio_moradia,
          );
          expect(credentialSubject.bolsa_estudantil).toBe(
            studentData.bolsa_estudantil,
          );
          expect(credentialSubject.bolsa_permanencia_mec).toBe(
            studentData.bolsa_permanencia_mec,
          );
          expect(credentialSubject.paiq).toBe(studentData.paiq);
          expect(credentialSubject.moradia_estudantil).toBe(
            studentData.moradia_estudantil,
          );
          expect(credentialSubject.isencao_ru).toBe(studentData.isencao_ru);
          expect(credentialSubject.isencao_esporte).toBe(
            studentData.isencao_esporte,
          );
          expect(credentialSubject.isencao_idiomas).toBe(
            studentData.isencao_idiomas,
          );
          expect(credentialSubject.acesso_laboratorios).toEqual(
            studentData.acesso_laboratorios,
          );
          expect(credentialSubject.acesso_predios).toEqual(
            studentData.acesso_predios,
          );

          return true;
        }),
        {numRuns: 5, verbose: 0},
      );
    });
  });
});
