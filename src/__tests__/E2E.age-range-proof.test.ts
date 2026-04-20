/**
 * E2E Integration Test: Age Verification with Range Proof
 *
 * Tests the age verification scenario using Range Proofs to prove
 * age >= 18 without revealing the exact birthdate.
 *
 * Flow: Identity → Credential → Age Request → Range Proof →
 *       Privacy-Preserving Verification
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

describe('E2E: Age Verification with Range Proof', () => {
  it('should complete age verification flow with range proof', async () => {
    // ========== STEP 1: Setup Identities and Credential ==========
    const {did: holderDID} = await DIDService.generateHolderIdentity('key');
    await DIDService.generateIssuerIdentity('ufsc.br');

    // Student born in 2000 (currently 24+ years old)
    const studentData: StudentData = {
      nome_completo: 'Roberto Alves',
      cpf: '77788899900',
      matricula: '2024600',
      curso: 'Arquitetura',
      status_matricula: 'Ativo',
      data_nascimento: '2000-12-25', // Over 18
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
    };

    const credentialToken = await CredentialService.issueCredential(
      studentData,
      holderDID,
      'anoncreds',
    );

    const parsedCredential = await CredentialService.validateAndParseCredential(
      credentialToken,
    );

    // ========== STEP 2: Generate Age Verification Request ==========
    const ageRequest: PresentationExchangeRequest = {
      type: 'PresentationExchange',
      version: '1.0.0',
      challenge: `age_challenge_${Date.now()}`,
      presentation_definition: {
        id: 'age_verification',
        input_descriptors: [
          {
            id: 'age_descriptor',
            name: 'Age Verification',
            purpose: 'Verify user is 18 years or older without revealing exact birthdate',
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
          value: 18, // Age in years
        },
      ],
    };

    // ========== STEP 3: Process Request and Create Range Proof ==========
    const consentData = await PresentationService.processPEXRequest(
      ageRequest,
      parsedCredential,
    );

    expect(consentData).toBeDefined();
    expect(consentData.predicates).toBeDefined();
    expect(consentData.predicates!.length).toBe(1);
    expect(consentData.predicates![0].attribute).toBe('data_nascimento');
    expect(consentData.predicates![0].p_type).toBe('>=');
    expect(consentData.predicates![0].value).toBe(18);

    // Create ZKP presentation with range proof
    const presentation = await PresentationService.createZKPPresentation(
      parsedCredential,
      ageRequest,
      consentData.predicates!,
    );

    expect(presentation).toBeDefined();
    expect(presentation.holder).toBe(holderDID);
    expect(presentation.zkp_proof).toBeDefined();
    expect(presentation.zkp_proof!.predicates).toBeDefined();

    // ========== STEP 4: Verify Birthdate is NOT Disclosed ==========
    // The exact birthdate should not be in disclosed attributes
    expect(presentation.disclosed_attributes?.data_nascimento).toBeUndefined();

    // ZKP proof should contain predicate information but not the actual date
    const agePredicateProof = presentation.zkp_proof!.predicates.find(
      p => p.attr_name === 'data_nascimento',
    );
    expect(agePredicateProof).toBeDefined();
    expect(agePredicateProof!.p_type).toBe('>=');

    // ========== STEP 5: Validate Range Proof ==========
    const validationResult = await VerificationService.validatePresentation(
      presentation,
      ageRequest,
    );

    expect(validationResult).toBeDefined();
    expect(validationResult.valid).toBe(true);
    expect(validationResult.predicates_satisfied).toBe(true);
    expect(validationResult.errors).toBeUndefined();

    // Verify that the exact birthdate was not revealed
    expect(validationResult.verified_attributes?.data_nascimento).toBeUndefined();
  });

  it('should reject underage users', async () => {
    // Setup with underage student (born in 2010, currently 14 years old)
    const {did: holderDID} = await DIDService.generateHolderIdentity('key');
    await DIDService.generateIssuerIdentity('ufsc.br');

    const underageStudentData: StudentData = {
      nome_completo: 'Young Student',
      cpf: '11122233344',
      matricula: '2024700',
      curso: 'Test',
      status_matricula: 'Ativo',
      data_nascimento: '2010-01-01', // Under 18
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
    };

    const credentialToken = await CredentialService.issueCredential(
      underageStudentData,
      holderDID,
      'anoncreds',
    );

    const parsedCredential = await CredentialService.validateAndParseCredential(
      credentialToken,
    );

    const ageRequest: PresentationExchangeRequest = {
      type: 'PresentationExchange',
      version: '1.0.0',
      challenge: 'age_challenge',
      presentation_definition: {
        id: 'age_verification',
        input_descriptors: [
          {
            id: 'age_descriptor',
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

    // Create presentation (will generate proof but predicate will be false)
    const presentation = await PresentationService.createZKPPresentation(
      parsedCredential,
      ageRequest,
      [{attribute: 'data_nascimento', p_type: '>=', value: 18}],
    );

    // Validation should fail because age < 18
    const validationResult = await VerificationService.validatePresentation(
      presentation,
      ageRequest,
    );

    expect(validationResult.valid).toBe(false);
    expect(validationResult.predicates_satisfied).toBe(false);
    expect(validationResult.errors).toBeDefined();
    expect(validationResult.errors!.some(err =>
      err.includes('idade') || err.includes('predicado') || err.includes('18')
    )).toBe(true);
  });

  it('should verify exactly 18 years old (boundary case)', async () => {
    // Setup with student who just turned 18
    const {did: holderDID} = await DIDService.generateHolderIdentity('key');
    await DIDService.generateIssuerIdentity('ufsc.br');

    // Calculate date for exactly 18 years ago
    const today = new Date();
    const eighteenYearsAgo = new Date(
      today.getFullYear() - 18,
      today.getMonth(),
      today.getDate(),
    );
    const birthdateString = eighteenYearsAgo.toISOString().split('T')[0];

    const studentData: StudentData = {
      nome_completo: 'Boundary Case Student',
      cpf: '55566677788',
      matricula: '2024800',
      curso: 'Test',
      status_matricula: 'Ativo',
      data_nascimento: birthdateString, // Exactly 18 years old
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
    };

    const credentialToken = await CredentialService.issueCredential(
      studentData,
      holderDID,
      'anoncreds',
    );

    const parsedCredential = await CredentialService.validateAndParseCredential(
      credentialToken,
    );

    const ageRequest: PresentationExchangeRequest = {
      type: 'PresentationExchange',
      version: '1.0.0',
      challenge: 'age_challenge',
      presentation_definition: {
        id: 'age_verification',
        input_descriptors: [
          {
            id: 'age_descriptor',
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
      parsedCredential,
      ageRequest,
      [{attribute: 'data_nascimento', p_type: '>=', value: 18}],
    );

    const validationResult = await VerificationService.validatePresentation(
      presentation,
      ageRequest,
    );

    // Should pass because age is exactly 18 (>= 18)
    expect(validationResult.valid).toBe(true);
    expect(validationResult.predicates_satisfied).toBe(true);
  });

  it('should support different age thresholds', async () => {
    // Setup
    const {did: holderDID} = await DIDService.generateHolderIdentity('key');
    await DIDService.generateIssuerIdentity('ufsc.br');

    // Calculate a birthdate for someone who is exactly 29 years old today
    const today = new Date();
    const birthdate29 = new Date(
      today.getFullYear() - 29,
      today.getMonth(),
      today.getDate(),
    );
    const birthdateString = birthdate29.toISOString().split('T')[0];

    const studentData: StudentData = {
      nome_completo: 'Test User',
      cpf: '99988877766',
      matricula: '2024900',
      curso: 'Test',
      status_matricula: 'Ativo',
      data_nascimento: birthdateString, // Exactly 29 years old
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
    };

    const credentialToken = await CredentialService.issueCredential(
      studentData,
      holderDID,
      'anoncreds',
    );

    const parsedCredential = await CredentialService.validateAndParseCredential(
      credentialToken,
    );

    // Test age >= 21
    const age21Request: PresentationExchangeRequest = {
      type: 'PresentationExchange',
      version: '1.0.0',
      challenge: 'age21_challenge',
      presentation_definition: {
        id: 'age21_verification',
        input_descriptors: [
          {
            id: 'age21_descriptor',
            name: 'Age 21+ Verification',
            purpose: 'Verify age >= 21',
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
          value: 21,
        },
      ],
    };

    const presentation21 = await PresentationService.createZKPPresentation(
      parsedCredential,
      age21Request,
      [{attribute: 'data_nascimento', p_type: '>=', value: 21}],
    );

    const validation21 = await VerificationService.validatePresentation(
      presentation21,
      age21Request,
    );

    expect(validation21.valid).toBe(true);
    expect(validation21.predicates_satisfied).toBe(true);

    // Test age >= 25
    const age25Request: PresentationExchangeRequest = {
      ...age21Request,
      challenge: 'age25_challenge',
      presentation_definition: {
        ...age21Request.presentation_definition,
        id: 'age25_verification',
      },
      predicates: [
        {
          attribute: 'data_nascimento',
          p_type: '>=',
          value: 25,
        },
      ],
    };

    const presentation25 = await PresentationService.createZKPPresentation(
      parsedCredential,
      age25Request,
      [{attribute: 'data_nascimento', p_type: '>=', value: 25}],
    );

    const validation25 = await VerificationService.validatePresentation(
      presentation25,
      age25Request,
    );

    expect(validation25.valid).toBe(true);
    expect(validation25.predicates_satisfied).toBe(true);

    // Test age >= 30 (should fail since user is 29)
    const age30Request: PresentationExchangeRequest = {
      ...age21Request,
      challenge: 'age30_challenge',
      presentation_definition: {
        ...age21Request.presentation_definition,
        id: 'age30_verification',
      },
      predicates: [
        {
          attribute: 'data_nascimento',
          p_type: '>=',
          value: 30,
        },
      ],
    };

    const presentation30 = await PresentationService.createZKPPresentation(
      parsedCredential,
      age30Request,
      [{attribute: 'data_nascimento', p_type: '>=', value: 30}],
    );

    const validation30 = await VerificationService.validatePresentation(
      presentation30,
      age30Request,
    );

    expect(validation30.valid).toBe(false);
    expect(validation30.predicates_satisfied).toBe(false);
  });

  it('should maintain privacy by not revealing exact birthdate', async () => {
    // Setup
    const {did: holderDID} = await DIDService.generateHolderIdentity('key');
    await DIDService.generateIssuerIdentity('ufsc.br');

    const exactBirthdate = '1998-07-22';

    const studentData: StudentData = {
      nome_completo: 'Privacy Test User',
      cpf: '12312312312',
      matricula: '2025000',
      curso: 'Test',
      status_matricula: 'Ativo',
      data_nascimento: exactBirthdate,
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
    };

    const credentialToken = await CredentialService.issueCredential(
      studentData,
      holderDID,
      'anoncreds',
    );

    const parsedCredential = await CredentialService.validateAndParseCredential(
      credentialToken,
    );

    const ageRequest: PresentationExchangeRequest = {
      type: 'PresentationExchange',
      version: '1.0.0',
      challenge: 'privacy_challenge',
      presentation_definition: {
        id: 'privacy_test',
        input_descriptors: [
          {
            id: 'privacy_descriptor',
            name: 'Privacy Test',
            purpose: 'Test privacy preservation',
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
      parsedCredential,
      ageRequest,
      [{attribute: 'data_nascimento', p_type: '>=', value: 18}],
    );

    // Convert presentation to JSON string to check for birthdate leakage
    const presentationJson = JSON.stringify(presentation);

    // Exact birthdate should NOT appear anywhere in the presentation
    expect(presentationJson).not.toContain(exactBirthdate);
    expect(presentationJson).not.toContain('1998-07-22');
    expect(presentationJson).not.toContain('1998');
    expect(presentationJson).not.toContain('07-22');

    // Validation should still succeed
    const validationResult = await VerificationService.validatePresentation(
      presentation,
      ageRequest,
    );

    expect(validationResult.valid).toBe(true);
    expect(validationResult.predicates_satisfied).toBe(true);

    // Verified attributes should not contain the exact birthdate
    expect(validationResult.verified_attributes?.data_nascimento).toBeUndefined();
  });
});
