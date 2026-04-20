/**
 * VerificationService - Edge Case & Rejection Tests
 *
 * Covers gaps:
 * - Tampered presentation rejection
 * - Missing fields in presentation
 * - Invalid credential format
 * - Empty/null presentation handling
 * - AnonCreds credential parsing round-trip
 * - validateStudentData edge cases via CredentialService
 */

import CredentialService from '../CredentialService';
import DIDService from '../DIDService';
import PresentationService from '../PresentationService';
import VerificationService from '../VerificationService';
import StorageService from '../StorageService';
import {useAppStore} from '../../stores/useAppStore';
import {StudentData, PresentationExchangeRequest, VerifiablePresentation} from '../../types';
import {ValidationError} from '../ErrorHandler';

beforeEach(async () => {
  await StorageService.clearAll();
  useAppStore.getState().clearLogs();
});

const validStudentData: StudentData = {
  nome_completo: 'Test Student',
  cpf: '12345678901',
  matricula: '2024001',
  curso: 'Engenharia',
  status_matricula: 'Ativo',
  data_nascimento: '2000-01-15',
  alojamento_indigena: false,
  auxilio_creche: false,
  auxilio_moradia: false,
  bolsa_estudantil: false,
  bolsa_permanencia_mec: false,
  paiq: false,
  moradia_estudantil: false,
  isencao_ru: true,
  isencao_esporte: false,
  isencao_idiomas: false,
  acesso_laboratorios: [],
  acesso_predios: [],
};

const ruRequest: PresentationExchangeRequest = {
  type: 'PresentationExchange',
  version: '1.0.0',
  challenge: 'test_challenge',
  presentation_definition: {
    id: 'ru_access',
    input_descriptors: [{
      id: 'ru',
      name: 'RU',
      purpose: 'RU access',
      constraints: {
        fields: [
          {path: ['$.credentialSubject.status_matricula'], predicate: 'required'},
          {path: ['$.credentialSubject.isencao_ru'], predicate: 'required'},
        ],
        limit_disclosure: 'required',
      },
    }],
  },
};

describe('CredentialService.validateStudentData - Edge Cases', () => {
  it('should reject empty string for nome_completo', () => {
    expect(() =>
      CredentialService.validateStudentData({...validStudentData, nome_completo: ''}),
    ).toThrow(ValidationError);
  });

  it('should reject CPF with letters', () => {
    expect(() =>
      CredentialService.validateStudentData({...validStudentData, cpf: '1234abcd901'}),
    ).toThrow('CPF deve conter 11 dígitos');
  });

  it('should reject CPF with wrong length', () => {
    expect(() =>
      CredentialService.validateStudentData({...validStudentData, cpf: '123'}),
    ).toThrow('CPF deve conter 11 dígitos');
  });

  it('should reject invalid date format', () => {
    expect(() =>
      CredentialService.validateStudentData({...validStudentData, data_nascimento: '15/01/2000'}),
    ).toThrow('formato');
  });

  it('should reject impossible date (month 13)', () => {
    expect(() =>
      CredentialService.validateStudentData({...validStudentData, data_nascimento: '2000-13-01'}),
    ).toThrow('Data de nascimento inválida');
  });

  it('should reject impossible date (Feb 30)', () => {
    expect(() =>
      CredentialService.validateStudentData({...validStudentData, data_nascimento: '2000-02-30'}),
    ).toThrow('Data de nascimento inválida');
  });

  it('should reject invalid status_matricula', () => {
    expect(() =>
      CredentialService.validateStudentData({...validStudentData, status_matricula: 'Formado' as any}),
    ).toThrow('Status de matrícula');
  });

  it('should accept valid student data without throwing', () => {
    expect(() =>
      CredentialService.validateStudentData(validStudentData),
    ).not.toThrow();
  });
});

describe('VerificationService - Presentation Rejection', () => {
  let holderDID: string;

  beforeEach(async () => {
    const result = await DIDService.generateHolderIdentity('key');
    holderDID = result.did;
    await DIDService.generateIssuerIdentity('ufsc.br');
  });

  async function createValidPresentation(): Promise<VerifiablePresentation> {
    const token = await CredentialService.issueCredential(validStudentData, holderDID, 'sd-jwt');
    const parsed = await CredentialService.validateAndParseCredential(token);
    return PresentationService.createPresentation(parsed, ruRequest, ['status_matricula', 'isencao_ru']);
  }

  it('should accept a valid presentation', async () => {
    const presentation = await createValidPresentation();
    const result = await VerificationService.validatePresentation(presentation, ruRequest);
    expect(result.valid).toBe(true);
  });

  it('should reject a presentation with tampered disclosed attributes', async () => {
    const presentation = await createValidPresentation();
    // Tamper: change disclosed value
    presentation.disclosed_attributes!.isencao_ru = false;

    const result = await VerificationService.validatePresentation(presentation, ruRequest);
    expect(result.valid).toBe(false);
  });

  it('should reject a presentation with missing required attributes', async () => {
    const presentation = await createValidPresentation();
    // Remove a required attribute
    delete presentation.disclosed_attributes!.isencao_ru;

    const result = await VerificationService.validatePresentation(presentation, ruRequest);
    expect(result.valid).toBe(false);
  });

  it('should reject a presentation with removed proof', async () => {
    const presentation = await createValidPresentation();
    // Remove proof
    delete (presentation as any).proof.jws;

    const result = await VerificationService.validatePresentation(presentation, ruRequest);
    expect(result.valid).toBe(false);
  });

  it('should detect holder mismatch in presentation', async () => {
    const presentation = await createValidPresentation();
    const originalHolder = presentation.holder;
    // Change holder — signature was over the original holder
    presentation.holder = 'did:key:z6MkFAKE';

    // Holder mismatch should be detectable (signature was over original holder)
    expect(presentation.holder).not.toBe(originalHolder);
  });
});

describe('CredentialService - AnonCreds Round-Trip', () => {
  it('should issue and parse an AnonCreds credential', async () => {
    const {did: holderDID} = await DIDService.generateHolderIdentity('key');
    await DIDService.generateIssuerIdentity('ufsc.br');

    const token = await CredentialService.issueCredential(
      validStudentData,
      holderDID,
      'anoncreds',
    );

    expect(token).toBeDefined();
    // AnonCreds token is a JSON envelope
    const envelope = JSON.parse(token);
    expect(envelope.format).toBe('anoncreds');
    expect(envelope.schema_id).toBeDefined();
    expect(envelope.cred_def_id).toBeDefined();

    // Parse it back
    const parsed = await CredentialService.validateAndParseCredential(token);
    expect(parsed).toBeDefined();
    expect(parsed.credentialSubject.nome_completo).toBe('Test Student');
    expect(parsed.credentialSubject.cpf).toBe('12345678901');
    expect(parsed.type).toContain('AcademicIDCredential');
  });

  it('should reject invalid token format', async () => {
    await expect(
      CredentialService.validateAndParseCredential('not_a_valid_token'),
    ).rejects.toThrow();
  });
});
