/**
 * E2E Integration Test: Laboratory Access Control
 *
 * Tests the laboratory/building access control scenario with array-based
 * permission verification.
 *
 * Flow: Identity → Credential → Lab Request → Permission Check →
 *       Access Grant/Deny
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

describe('E2E: Laboratory Access Control', () => {
  it('should grant access when student has lab permission', async () => {
    // ========== STEP 1: Setup Identities and Credential ==========
    const {did: holderDID} = await DIDService.generateHolderIdentity('key');
    await DIDService.generateIssuerIdentity('ufsc.br');

    const studentData: StudentData = {
      nome_completo: 'Juliana Costa',
      cpf: '66677788899',
      matricula: '2025100',
      curso: 'Física',
      status_matricula: 'Ativo',
      data_nascimento: '2001-04-10',
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
      acesso_laboratorios: ['Lab 101', 'Lab 202', 'Lab Física Quântica'],
      acesso_predios: ['Prédio A', 'Prédio B', 'Centro de Ciências Físicas'],
    };

    const credentialToken = await CredentialService.issueCredential(
      studentData,
      holderDID,
      'sd-jwt',
    );

    const parsedCredential = await CredentialService.validateAndParseCredential(
      credentialToken,
    );

    // ========== STEP 2: Generate Lab Access Request ==========
    const requestedLab = 'Lab 101';

    const labRequest: PresentationExchangeRequest = {
      type: 'PresentationExchange',
      version: '1.0.0',
      challenge: `lab_challenge_${Date.now()}`,
      presentation_definition: {
        id: 'lab_access',
        input_descriptors: [
          {
            id: 'lab_descriptor',
            name: 'Laboratory Access',
            purpose: `Verify access permission for ${requestedLab}`,
            constraints: {
              fields: [
                {
                  path: ['$.credentialSubject.acesso_laboratorios'],
                  predicate: 'required',
                },
              ],
            },
          },
        ],
      },
      resource_id: requestedLab,
    };

    // ========== STEP 3: Process Request and Create Presentation ==========
    const consentData = await PresentationService.processPEXRequest(
      labRequest,
      parsedCredential,
    );

    expect(consentData).toBeDefined();
    expect(consentData.required_attributes).toContain('acesso_laboratorios');

    const presentation = await PresentationService.createPresentation(
      parsedCredential,
      labRequest,
      ['acesso_laboratorios'],
    );

    expect(presentation).toBeDefined();
    expect(presentation.holder).toBe(holderDID);
    expect(presentation.disclosed_attributes).toBeDefined();
    expect(presentation.disclosed_attributes!.acesso_laboratorios).toBeDefined();
    expect(Array.isArray(presentation.disclosed_attributes!.acesso_laboratorios)).toBe(true);

    // ========== STEP 4: Validate Access Permission ==========
    const validationResult = await VerificationService.validatePresentation(
      presentation,
      labRequest,
    );

    expect(validationResult).toBeDefined();
    expect(validationResult.valid).toBe(true);
    expect(validationResult.errors).toBeUndefined();

    // Verify the requested lab is in the disclosed array
    const disclosedLabs = presentation.disclosed_attributes!.acesso_laboratorios as string[];
    expect(disclosedLabs).toContain(requestedLab);
  });

  it('should deny access when student lacks lab permission', async () => {
    // Setup
    const {did: holderDID} = await DIDService.generateHolderIdentity('key');
    await DIDService.generateIssuerIdentity('ufsc.br');

    const studentData: StudentData = {
      nome_completo: 'Pedro Silva',
      cpf: '11122233344',
      matricula: '2025200',
      curso: 'História',
      status_matricula: 'Ativo',
      data_nascimento: '2000-09-05',
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
      acesso_laboratorios: ['Lab História', 'Lab Arqueologia'],
      acesso_predios: ['Prédio Humanidades'],
    };

    const credentialToken = await CredentialService.issueCredential(
      studentData,
      holderDID,
      'sd-jwt',
    );

    const parsedCredential = await CredentialService.validateAndParseCredential(
      credentialToken,
    );

    // Request access to a lab not in the student's list
    const requestedLab = 'Lab Física Quântica';

    const labRequest: PresentationExchangeRequest = {
      type: 'PresentationExchange',
      version: '1.0.0',
      challenge: 'lab_challenge',
      presentation_definition: {
        id: 'lab_access',
        input_descriptors: [
          {
            id: 'lab_descriptor',
            name: 'Laboratory Access',
            purpose: `Verify access permission for ${requestedLab}`,
            constraints: {
              fields: [
                {
                  path: ['$.credentialSubject.acesso_laboratorios'],
                  predicate: 'required',
                  filter: {
                    type: 'array',
                    contains: {
                      const: requestedLab,
                    },
                  },
                },
              ],
            },
          },
        ],
      },
      resource_id: requestedLab,
    };

    const presentation = await PresentationService.createPresentation(
      parsedCredential,
      labRequest,
      ['acesso_laboratorios'],
    );

    const validationResult = await VerificationService.validatePresentation(
      presentation,
      labRequest,
    );

    // Should fail because requested lab is not in the array
    expect(validationResult.valid).toBe(false);
    expect(validationResult.errors).toBeDefined();
    expect(validationResult.errors!.some(err =>
      err.includes('permissão') || err.includes('acesso') || err.includes('laboratório')
    )).toBe(true);
  });

  it('should grant building access when student has permission', async () => {
    // Setup
    const {did: holderDID} = await DIDService.generateHolderIdentity('key');
    await DIDService.generateIssuerIdentity('ufsc.br');

    const studentData: StudentData = {
      nome_completo: 'Ana Rodrigues',
      cpf: '55566677788',
      matricula: '2025300',
      curso: 'Engenharia Civil',
      status_matricula: 'Ativo',
      data_nascimento: '1999-11-20',
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
      acesso_predios: ['Prédio Engenharia', 'Centro Tecnológico', 'Biblioteca Central'],
    };

    const credentialToken = await CredentialService.issueCredential(
      studentData,
      holderDID,
      'sd-jwt',
    );

    const parsedCredential = await CredentialService.validateAndParseCredential(
      credentialToken,
    );

    const requestedBuilding = 'Centro Tecnológico';

    const buildingRequest: PresentationExchangeRequest = {
      type: 'PresentationExchange',
      version: '1.0.0',
      challenge: 'building_challenge',
      presentation_definition: {
        id: 'building_access',
        input_descriptors: [
          {
            id: 'building_descriptor',
            name: 'Building Access',
            purpose: `Verify access permission for ${requestedBuilding}`,
            constraints: {
              fields: [
                {
                  path: ['$.credentialSubject.acesso_predios'],
                  predicate: 'required',
                },
              ],
            },
          },
        ],
      },
      resource_id: requestedBuilding,
    };

    const presentation = await PresentationService.createPresentation(
      parsedCredential,
      buildingRequest,
      ['acesso_predios'],
    );

    const validationResult = await VerificationService.validatePresentation(
      presentation,
      buildingRequest,
    );

    expect(validationResult.valid).toBe(true);

    const disclosedBuildings = presentation.disclosed_attributes!.acesso_predios as string[];
    expect(disclosedBuildings).toContain(requestedBuilding);
  });

  it('should handle empty access arrays', async () => {
    // Setup with student who has no lab/building access
    const {did: holderDID} = await DIDService.generateHolderIdentity('key');
    await DIDService.generateIssuerIdentity('ufsc.br');

    const studentData: StudentData = {
      nome_completo: 'Student Without Access',
      cpf: '99988877766',
      matricula: '2025400',
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
      isencao_ru: false,
      isencao_esporte: false,
      isencao_idiomas: false,
      acesso_laboratorios: [], // Empty array
      acesso_predios: [], // Empty array
    };

    const credentialToken = await CredentialService.issueCredential(
      studentData,
      holderDID,
      'sd-jwt',
    );

    const parsedCredential = await CredentialService.validateAndParseCredential(
      credentialToken,
    );

    const labRequest: PresentationExchangeRequest = {
      type: 'PresentationExchange',
      version: '1.0.0',
      challenge: 'lab_challenge',
      presentation_definition: {
        id: 'lab_access',
        input_descriptors: [
          {
            id: 'lab_descriptor',
            name: 'Lab Access',
            purpose: 'Verify lab access',
            constraints: {
              fields: [
                {
                  path: ['$.credentialSubject.acesso_laboratorios'],
                  predicate: 'required',
                },
              ],
            },
          },
        ],
      },
      resource_id: 'Any Lab',
    };

    const presentation = await PresentationService.createPresentation(
      parsedCredential,
      labRequest,
      ['acesso_laboratorios'],
    );

    expect(presentation.disclosed_attributes!.acesso_laboratorios).toEqual([]);

    const validationResult = await VerificationService.validatePresentation(
      presentation,
      labRequest,
    );

    // Should fail because array is empty
    expect(validationResult.valid).toBe(false);
    expect(validationResult.errors).toBeDefined();
  });

  it('should handle multiple lab permissions', async () => {
    // Setup
    const {did: holderDID} = await DIDService.generateHolderIdentity('key');
    await DIDService.generateIssuerIdentity('ufsc.br');

    const studentData: StudentData = {
      nome_completo: 'Multi-Access Student',
      cpf: '12312312312',
      matricula: '2025500',
      curso: 'Engenharia Química',
      status_matricula: 'Ativo',
      data_nascimento: '2000-03-15',
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
      acesso_laboratorios: [
        'Lab Química Orgânica',
        'Lab Química Inorgânica',
        'Lab Físico-Química',
        'Lab Análise Instrumental',
      ],
      acesso_predios: ['Prédio Química', 'Centro de Ciências'],
    };

    const credentialToken = await CredentialService.issueCredential(
      studentData,
      holderDID,
      'sd-jwt',
    );

    const parsedCredential = await CredentialService.validateAndParseCredential(
      credentialToken,
    );

    // Test access to each lab
    const labsToTest = [
      'Lab Química Orgânica',
      'Lab Química Inorgânica',
      'Lab Físico-Química',
      'Lab Análise Instrumental',
    ];

    for (const lab of labsToTest) {
      const labRequest: PresentationExchangeRequest = {
        type: 'PresentationExchange',
        version: '1.0.0',
        challenge: `challenge_${lab}`,
        presentation_definition: {
          id: `access_${lab}`,
          input_descriptors: [
            {
              id: 'lab_desc',
              name: 'Lab Access',
              purpose: `Access to ${lab}`,
              constraints: {
                fields: [
                  {
                    path: ['$.credentialSubject.acesso_laboratorios'],
                    predicate: 'required',
                  },
                ],
              },
            },
          ],
        },
        resource_id: lab,
      };

      const presentation = await PresentationService.createPresentation(
        parsedCredential,
        labRequest,
        ['acesso_laboratorios'],
      );

      const validationResult = await VerificationService.validatePresentation(
        presentation,
        labRequest,
      );

      expect(validationResult.valid).toBe(true);

      const disclosedLabs = presentation.disclosed_attributes!.acesso_laboratorios as string[];
      expect(disclosedLabs).toContain(lab);
    }
  });

  it('should not disclose other attributes when checking lab access', async () => {
    // Setup
    const {did: holderDID} = await DIDService.generateHolderIdentity('key');
    await DIDService.generateIssuerIdentity('ufsc.br');

    const studentData: StudentData = {
      nome_completo: 'Privacy Test Student',
      cpf: '45645645645',
      matricula: '2025600',
      curso: 'Biologia',
      status_matricula: 'Ativo',
      data_nascimento: '1998-07-30',
      alojamento_indigena: false,
      auxilio_creche: false,
      auxilio_moradia: true,
      bolsa_estudantil: true,
      bolsa_permanencia_mec: false,
      paiq: false,
      moradia_estudantil: false,
      isencao_ru: true,
      isencao_esporte: false,
      isencao_idiomas: false,
      acesso_laboratorios: ['Lab Biologia Molecular'],
      acesso_predios: ['Prédio Biociências'],
    };

    const credentialToken = await CredentialService.issueCredential(
      studentData,
      holderDID,
      'sd-jwt',
    );

    const parsedCredential = await CredentialService.validateAndParseCredential(
      credentialToken,
    );

    const labRequest: PresentationExchangeRequest = {
      type: 'PresentationExchange',
      version: '1.0.0',
      challenge: 'privacy_challenge',
      presentation_definition: {
        id: 'privacy_test',
        input_descriptors: [
          {
            id: 'privacy_desc',
            name: 'Privacy Test',
            purpose: 'Test privacy',
            constraints: {
              fields: [
                {
                  path: ['$.credentialSubject.acesso_laboratorios'],
                  predicate: 'required',
                },
              ],
              limit_disclosure: 'required',
            },
          },
        ],
      },
      resource_id: 'Lab Biologia Molecular',
    };

    const presentation = await PresentationService.createPresentation(
      parsedCredential,
      labRequest,
      ['acesso_laboratorios'], // Only disclose lab access
    );

    // Verify only lab access is disclosed
    expect(presentation.disclosed_attributes!.acesso_laboratorios).toBeDefined();
    expect(presentation.disclosed_attributes!.nome_completo).toBeUndefined();
    expect(presentation.disclosed_attributes!.cpf).toBeUndefined();
    expect(presentation.disclosed_attributes!.data_nascimento).toBeUndefined();
    expect(presentation.disclosed_attributes!.matricula).toBeUndefined();
    expect(presentation.disclosed_attributes!.curso).toBeUndefined();
    expect(presentation.disclosed_attributes!.isencao_ru).toBeUndefined();
    expect(presentation.disclosed_attributes!.auxilio_moradia).toBeUndefined();
    expect(presentation.disclosed_attributes!.bolsa_estudantil).toBeUndefined();

    const validationResult = await VerificationService.validatePresentation(
      presentation,
      labRequest,
    );

    expect(validationResult.valid).toBe(true);
  });
});
