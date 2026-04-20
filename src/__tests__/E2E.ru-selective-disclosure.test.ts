/**
 * E2E Integration Test: RU Scenario with Selective Disclosure
 *
 * Tests the Restaurant Universitário (RU) access scenario using SD-JWT
 * for selective disclosure of only required attributes (status_matricula, isencao_ru).
 *
 * Flow: Identity → Credential → RU Request → SD-JWT Presentation →
 *       Hash Verification → Access Control
 */

import DIDService from '../services/DIDService';
import CredentialService from '../services/CredentialService';
import StorageService from '../services/StorageService';
import PresentationService from '../services/PresentationService';
import VerificationService from '../services/VerificationService';
import {useAppStore} from '../stores/useAppStore';
import {StudentData, PresentationExchangeRequest} from '../types';

// Clear storage and logs before each test
beforeEach(async () => {
  await StorageService.clearAll();
  useAppStore.getState().clearLogs();
});

describe('E2E: RU Scenario with Selective Disclosure', () => {
  it('should complete RU access flow with selective disclosure', async () => {
    // ========== STEP 1: Setup Identities and Credential ==========
    const {did: holderDID} = await DIDService.generateHolderIdentity('key');
    await DIDService.generateIssuerIdentity('ufsc.br');

    const studentData: StudentData = {
      nome_completo: 'Fernanda Lima',
      cpf: '55566677788',
      matricula: '2024200',
      curso: 'Medicina',
      status_matricula: 'Ativo',
      data_nascimento: '1999-08-10',
      alojamento_indigena: false,
      auxilio_creche: false,
      auxilio_moradia: true,
      bolsa_estudantil: true,
      bolsa_permanencia_mec: false,
      paiq: false,
      moradia_estudantil: false,
      isencao_ru: true, // Has RU exemption
      isencao_esporte: false,
      isencao_idiomas: false,
      acesso_laboratorios: ['Lab Anatomia', 'Lab Fisiologia'],
      acesso_predios: ['Hospital Universitário'],
    };

    const credentialToken = await CredentialService.issueCredential(
      studentData,
      holderDID,
      'sd-jwt',
    );

    const parsedCredential = await CredentialService.validateAndParseCredential(
      credentialToken,
    );

    // ========== STEP 2: Generate RU Access Request ==========
    const ruRequest: PresentationExchangeRequest = {
      type: 'PresentationExchange',
      version: '1.0.0',
      challenge: `ru_challenge_${Date.now()}`,
      presentation_definition: {
        id: 'ru_access',
        input_descriptors: [
          {
            id: 'ru_descriptor',
            name: 'RU Access Verification',
            purpose: 'Verify student status and RU exemption for access control',
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
              limit_disclosure: 'required',
            },
          },
        ],
      },
    };

    // ========== STEP 3: Process Request and Create SD-JWT Presentation ==========
    const consentData = await PresentationService.processPEXRequest(
      ruRequest,
      parsedCredential,
    );

    expect(consentData).toBeDefined();
    expect(consentData.required_attributes).toContain('status_matricula');
    expect(consentData.required_attributes).toContain('isencao_ru');

    // Create SD-JWT presentation with only required attributes
    const presentation = await PresentationService.createPresentation(
      parsedCredential,
      ruRequest,
      ['status_matricula', 'isencao_ru'],
    );

    expect(presentation).toBeDefined();
    expect(presentation.holder).toBe(holderDID);
    expect(presentation.disclosed_attributes).toBeDefined();

    // ========== STEP 4: Verify Only Required Attributes Are Disclosed ==========
    expect(presentation.disclosed_attributes!.status_matricula).toBe('Ativo');
    expect(presentation.disclosed_attributes!.isencao_ru).toBe(true);

    // Verify sensitive attributes are NOT disclosed
    expect(presentation.disclosed_attributes!.nome_completo).toBeUndefined();
    expect(presentation.disclosed_attributes!.cpf).toBeUndefined();
    expect(presentation.disclosed_attributes!.data_nascimento).toBeUndefined();
    expect(presentation.disclosed_attributes!.matricula).toBeUndefined();
    expect(presentation.disclosed_attributes!.curso).toBeUndefined();
    expect(presentation.disclosed_attributes!.auxilio_moradia).toBeUndefined();
    expect(presentation.disclosed_attributes!.bolsa_estudantil).toBeUndefined();

    // ========== STEP 5: Validate Presentation ==========
    const validationResult = await VerificationService.validatePresentation(
      presentation,
      ruRequest,
    );

    expect(validationResult).toBeDefined();
    expect(validationResult.valid).toBe(true);
    expect(validationResult.errors).toBeUndefined();
    expect(validationResult.verified_attributes).toBeDefined();
    expect(validationResult.verified_attributes!.status_matricula).toBe('Ativo');
    expect(validationResult.verified_attributes!.isencao_ru).toBe(true);
  });

  it('should deny access when student does not have RU exemption', async () => {
    // Setup with student without RU exemption
    const {did: holderDID} = await DIDService.generateHolderIdentity('key');
    await DIDService.generateIssuerIdentity('ufsc.br');

    const studentData: StudentData = {
      nome_completo: 'Pedro Santos',
      cpf: '11122233344',
      matricula: '2024300',
      curso: 'Administração',
      status_matricula: 'Ativo',
      data_nascimento: '2001-02-15',
      alojamento_indigena: false,
      auxilio_creche: false,
      auxilio_moradia: false,
      bolsa_estudantil: false,
      bolsa_permanencia_mec: false,
      paiq: false,
      moradia_estudantil: false,
      isencao_ru: false, // No RU exemption
      isencao_esporte: false,
      isencao_idiomas: false,
      acesso_laboratorios: [],
      acesso_predios: [],
    };

    const credentialToken = await CredentialService.issueCredential(
      studentData,
      holderDID,
      'sd-jwt',
    );

    const parsedCredential = await CredentialService.validateAndParseCredential(
      credentialToken,
    );

    const ruRequest: PresentationExchangeRequest = {
      type: 'PresentationExchange',
      version: '1.0.0',
      challenge: 'ru_challenge',
      presentation_definition: {
        id: 'ru_access',
        input_descriptors: [
          {
            id: 'ru_descriptor',
            name: 'RU Access',
            purpose: 'Verify RU access',
            constraints: {
              fields: [
                {
                  path: ['$.credentialSubject.status_matricula'],
                  predicate: 'required',
                },
                {
                  path: ['$.credentialSubject.isencao_ru'],
                  predicate: 'required',
                  filter: {
                    type: 'boolean',
                    const: true,
                  },
                },
              ],
              limit_disclosure: 'required',
            },
          },
        ],
      },
    };

    const presentation = await PresentationService.createPresentation(
      parsedCredential,
      ruRequest,
      ['status_matricula', 'isencao_ru'],
    );

    // Presentation is created but validation should check the value
    expect(presentation.disclosed_attributes!.isencao_ru).toBe(false);

    const validationResult = await VerificationService.validatePresentation(
      presentation,
      ruRequest,
    );

    // Validation should fail because isencao_ru is false
    expect(validationResult.valid).toBe(false);
    expect(validationResult.errors).toBeDefined();
  });

  it('should deny access when student status is inactive', async () => {
    // Setup with inactive student
    const {did: holderDID} = await DIDService.generateHolderIdentity('key');
    await DIDService.generateIssuerIdentity('ufsc.br');

    const studentData: StudentData = {
      nome_completo: 'Inactive Student',
      cpf: '99988877766',
      matricula: '2024400',
      curso: 'Test',
      status_matricula: 'Inativo', // Inactive
      data_nascimento: '2000-01-01',
      alojamento_indigena: false,
      auxilio_creche: false,
      auxilio_moradia: false,
      bolsa_estudantil: false,
      bolsa_permanencia_mec: false,
      paiq: false,
      moradia_estudantil: false,
      isencao_ru: true, // Has exemption but inactive
      isencao_esporte: false,
      isencao_idiomas: false,
      acesso_laboratorios: [],
      acesso_predios: [],
    };

    const credentialToken = await CredentialService.issueCredential(
      studentData,
      holderDID,
      'sd-jwt',
    );

    const parsedCredential = await CredentialService.validateAndParseCredential(
      credentialToken,
    );

    const ruRequest: PresentationExchangeRequest = {
      type: 'PresentationExchange',
      version: '1.0.0',
      challenge: 'ru_challenge',
      presentation_definition: {
        id: 'ru_access',
        input_descriptors: [
          {
            id: 'ru_descriptor',
            name: 'RU Access',
            purpose: 'Verify RU access',
            constraints: {
              fields: [
                {
                  path: ['$.credentialSubject.status_matricula'],
                  predicate: 'required',
                  filter: {
                    type: 'string',
                    const: 'Ativo',
                  },
                },
                {
                  path: ['$.credentialSubject.isencao_ru'],
                  predicate: 'required',
                },
              ],
              limit_disclosure: 'required',
            },
          },
        ],
      },
    };

    const presentation = await PresentationService.createPresentation(
      parsedCredential,
      ruRequest,
      ['status_matricula', 'isencao_ru'],
    );

    expect(presentation.disclosed_attributes!.status_matricula).toBe('Inativo');

    const validationResult = await VerificationService.validatePresentation(
      presentation,
      ruRequest,
    );

    // Should fail because status is not 'Ativo'
    expect(validationResult.valid).toBe(false);
    expect(validationResult.errors).toBeDefined();
  });

  it('should allow optional attribute selection', async () => {
    // Setup
    const {did: holderDID} = await DIDService.generateHolderIdentity('key');
    await DIDService.generateIssuerIdentity('ufsc.br');

    const studentData: StudentData = {
      nome_completo: 'Ana Silva',
      cpf: '44455566677',
      matricula: '2024500',
      curso: 'Engenharia',
      status_matricula: 'Ativo',
      data_nascimento: '2000-06-20',
      alojamento_indigena: false,
      auxilio_creche: false,
      auxilio_moradia: false,
      bolsa_estudantil: true,
      bolsa_permanencia_mec: false,
      paiq: false,
      moradia_estudantil: false,
      isencao_ru: true,
      isencao_esporte: true,
      isencao_idiomas: false,
      acesso_laboratorios: [],
      acesso_predios: [],
    };

    const credentialToken = await CredentialService.issueCredential(
      studentData,
      holderDID,
      'sd-jwt',
    );

    const parsedCredential = await CredentialService.validateAndParseCredential(
      credentialToken,
    );

    // Request with optional attributes
    const ruRequest: PresentationExchangeRequest = {
      type: 'PresentationExchange',
      version: '1.0.0',
      challenge: 'ru_challenge',
      presentation_definition: {
        id: 'ru_access',
        input_descriptors: [
          {
            id: 'ru_descriptor',
            name: 'RU Access',
            purpose: 'Verify RU access',
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
                {
                  path: ['$.credentialSubject.curso'],
                  predicate: 'preferred', // Optional
                },
                {
                  path: ['$.credentialSubject.bolsa_estudantil'],
                  predicate: 'preferred', // Optional
                },
              ],
              limit_disclosure: 'required',
            },
          },
        ],
      },
    };

    const consentData = await PresentationService.processPEXRequest(
      ruRequest,
      parsedCredential,
    );

    expect(consentData.required_attributes).toHaveLength(2);
    expect(consentData.optional_attributes).toHaveLength(2);
    expect(consentData.optional_attributes).toContain('curso');
    expect(consentData.optional_attributes).toContain('bolsa_estudantil');

    // User chooses to disclose only required + curso
    const presentation = await PresentationService.createPresentation(
      parsedCredential,
      ruRequest,
      ['status_matricula', 'isencao_ru', 'curso'], // Include optional curso
    );

    expect(presentation.disclosed_attributes!.status_matricula).toBe('Ativo');
    expect(presentation.disclosed_attributes!.isencao_ru).toBe(true);
    expect(presentation.disclosed_attributes!.curso).toBe('Engenharia');
    expect(presentation.disclosed_attributes!.bolsa_estudantil).toBeUndefined(); // Not disclosed

    const validationResult = await VerificationService.validatePresentation(
      presentation,
      ruRequest,
    );

    expect(validationResult.valid).toBe(true);
  });

  it('should detect tampering with disclosed attributes', async () => {
    // Setup
    const {did: holderDID} = await DIDService.generateHolderIdentity('key');
    await DIDService.generateIssuerIdentity('ufsc.br');

    const studentData: StudentData = {
      nome_completo: 'Test User',
      cpf: '12345678900',
      matricula: '123456',
      curso: 'Test',
      status_matricula: 'Ativo',
      data_nascimento: '2000-01-01',
      alojamento_indigena: false,
      auxilio_creche: false,
      auxilio_moradia: false,
      bolsa_estudantil: false,
      bolsa_permanencia_mec: false,
      paiq: false,
      moradia_estudantil: false,
      isencao_ru: false, // Originally false
      isencao_esporte: false,
      isencao_idiomas: false,
      acesso_laboratorios: [],
      acesso_predios: [],
    };

    const credentialToken = await CredentialService.issueCredential(
      studentData,
      holderDID,
      'sd-jwt',
    );

    const parsedCredential = await CredentialService.validateAndParseCredential(
      credentialToken,
    );

    const ruRequest: PresentationExchangeRequest = {
      type: 'PresentationExchange',
      version: '1.0.0',
      challenge: 'ru_challenge',
      presentation_definition: {
        id: 'ru_access',
        input_descriptors: [
          {
            id: 'ru_descriptor',
            name: 'RU Access',
            purpose: 'Verify RU access',
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
    };

    const presentation = await PresentationService.createPresentation(
      parsedCredential,
      ruRequest,
      ['status_matricula', 'isencao_ru'],
    );

    // Tamper with the disclosed attribute
    const tamperedPresentation = {
      ...presentation,
      disclosed_attributes: {
        ...presentation.disclosed_attributes,
        isencao_ru: true, // Changed from false to true
      },
    };

    // Validation should fail due to hash mismatch
    const validationResult = await VerificationService.validatePresentation(
      tamperedPresentation,
      ruRequest,
    );

    expect(validationResult.valid).toBe(false);
    expect(validationResult.errors).toBeDefined();
    expect(validationResult.errors!.some(err =>
      err.includes('hash') || err.includes('integridade') || err.includes('assinatura')
    )).toBe(true);
  });
});
