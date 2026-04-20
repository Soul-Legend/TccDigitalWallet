/**
 * E2E Integration Test: Elections Scenario with Nullifier Prevention
 *
 * Tests the complete elections flow with ZKP eligibility proofs and
 * nullifier-based duplicate vote prevention.
 *
 * Flow: Identity → Credential → Election Request → ZKP Presentation →
 *       Nullifier Check → Duplicate Prevention
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

describe('E2E: Elections Scenario with Nullifier Prevention', () => {
  it('should complete elections flow with nullifier generation and validation', async () => {
    // ========== STEP 1: Setup Identities and Credential ==========
    const {did: holderDID} = await DIDService.generateHolderIdentity('key');
    await DIDService.generateIssuerIdentity('ufsc.br');

    const studentData: StudentData = {
      nome_completo: 'Carlos Oliveira',
      cpf: '33344455566',
      matricula: '2024100',
      curso: 'Direito',
      status_matricula: 'Ativo',
      data_nascimento: '1998-03-20',
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

    // ========== STEP 2: Generate Election Request with Election ID ==========
    const electionId = `eleicao_reitoria_2024_${Date.now()}`;

    const electionRequest: PresentationExchangeRequest = {
      type: 'PresentationExchange',
      version: '1.0.0',
      challenge: `election_challenge_${Date.now()}`,
      presentation_definition: {
        id: 'election_eligibility',
        input_descriptors: [
          {
            id: 'election_desc',
            name: 'Election Eligibility',
            purpose: 'Verify voter eligibility for university election',
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
              ],
            },
          },
        ],
      },
      election_id: electionId,
      predicates: [
        {
          attribute: 'status_matricula',
          p_type: '==',
          value: 'Ativo',
        },
      ],
    };

    // ========== STEP 3: Process Request and Create ZKP Presentation ==========
    const consentData = await PresentationService.processPEXRequest(
      electionRequest,
      parsedCredential,
    );

    expect(consentData).toBeDefined();
    expect(consentData.predicates).toBeDefined();
    expect(consentData.predicates!.length).toBeGreaterThan(0);

    // Create ZKP presentation with nullifier
    const presentation = await PresentationService.createZKPPresentation(
      parsedCredential,
      electionRequest,
      consentData.predicates!,
    );

    expect(presentation).toBeDefined();
    expect(presentation.holder).toBe(holderDID);
    expect(presentation.nullifier).toBeDefined();
    expect(typeof presentation.nullifier).toBe('string');
    expect(presentation.nullifier!.length).toBeGreaterThan(0);

    // Verify ZKP proof is present
    expect(presentation.zkp_proof).toBeDefined();
    expect(presentation.zkp_proof!.predicates).toBeDefined();

    // ========== STEP 4: First Validation - Should Succeed ==========
    const firstValidation = await VerificationService.validatePresentation(
      presentation,
      electionRequest,
    );

    expect(firstValidation).toBeDefined();
    expect(firstValidation.valid).toBe(true);
    expect(firstValidation.predicates_satisfied).toBe(true);
    expect(firstValidation.nullifier_check).toBe('new');

    // ========== STEP 5: Second Validation with Same Nullifier - Should Fail ==========
    const secondValidation = await VerificationService.validatePresentation(
      presentation,
      electionRequest,
    );

    expect(secondValidation).toBeDefined();
    expect(secondValidation.valid).toBe(false);
    expect(secondValidation.nullifier_check).toBe('duplicate');
    expect(secondValidation.errors).toBeDefined();
    expect(secondValidation.errors).toContain(
      'Nullifier já registrado - voto duplicado detectado',
    );
  });

  it('should generate deterministic nullifiers for same credential and election', async () => {
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

    const electionId = 'test_election_123';

    const electionRequest: PresentationExchangeRequest = {
      type: 'PresentationExchange',
      version: '1.0.0',
      challenge: 'test_challenge',
      presentation_definition: {
        id: 'test',
        input_descriptors: [
          {
            id: 'test',
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
      election_id: electionId,
      predicates: [
        {
          attribute: 'status_matricula',
          p_type: '==',
          value: 'Ativo',
        },
      ],
    };

    // Create two presentations with same credential and election ID
    const presentation1 = await PresentationService.createZKPPresentation(
      parsedCredential,
      electionRequest,
      [{attribute: 'status_matricula', p_type: '==', value: 'Ativo'}],
    );

    const presentation2 = await PresentationService.createZKPPresentation(
      parsedCredential,
      electionRequest,
      [{attribute: 'status_matricula', p_type: '==', value: 'Ativo'}],
    );

    // Nullifiers should be identical
    expect(presentation1.nullifier).toBe(presentation2.nullifier);
  });

  it('should generate different nullifiers for different elections', async () => {
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

    // Create requests for two different elections
    const election1Request: PresentationExchangeRequest = {
      type: 'PresentationExchange',
      version: '1.0.0',
      challenge: 'challenge1',
      presentation_definition: {
        id: 'election1',
        input_descriptors: [
          {
            id: 'desc1',
            name: 'Election 1',
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
      election_id: 'election_reitoria_2024',
      predicates: [
        {
          attribute: 'status_matricula',
          p_type: '==',
          value: 'Ativo',
        },
      ],
    };

    const election2Request: PresentationExchangeRequest = {
      ...election1Request,
      challenge: 'challenge2',
      election_id: 'election_diretorio_2024',
    };

    // Create presentations for both elections
    const presentation1 = await PresentationService.createZKPPresentation(
      parsedCredential,
      election1Request,
      [{attribute: 'status_matricula', p_type: '==', value: 'Ativo'}],
    );

    const presentation2 = await PresentationService.createZKPPresentation(
      parsedCredential,
      election2Request,
      [{attribute: 'status_matricula', p_type: '==', value: 'Ativo'}],
    );

    // Nullifiers should be different
    expect(presentation1.nullifier).not.toBe(presentation2.nullifier);

    // Both should validate successfully (different elections)
    const validation1 = await VerificationService.validatePresentation(
      presentation1,
      election1Request,
    );

    const validation2 = await VerificationService.validatePresentation(
      presentation2,
      election2Request,
    );

    expect(validation1.valid).toBe(true);
    expect(validation1.nullifier_check).toBe('new');
    expect(validation2.valid).toBe(true);
    expect(validation2.nullifier_check).toBe('new');
  });

  it('should reject inactive students from voting', async () => {
    // Setup with inactive student
    const {did: holderDID} = await DIDService.generateHolderIdentity('key');
    await DIDService.generateIssuerIdentity('ufsc.br');

    const inactiveStudentData: StudentData = {
      nome_completo: 'Inactive Student',
      cpf: '99988877766',
      matricula: '2024999',
      curso: 'Test',
      status_matricula: 'Inativo', // Inactive status
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
      acesso_laboratorios: [],
      acesso_predios: [],
    };

    const credentialToken = await CredentialService.issueCredential(
      inactiveStudentData,
      holderDID,
      'anoncreds',
    );

    const parsedCredential = await CredentialService.validateAndParseCredential(
      credentialToken,
    );

    const electionRequest: PresentationExchangeRequest = {
      type: 'PresentationExchange',
      version: '1.0.0',
      challenge: 'test_challenge',
      presentation_definition: {
        id: 'election',
        input_descriptors: [
          {
            id: 'eligibility',
            name: 'Eligibility',
            purpose: 'Check eligibility',
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
              ],
            },
          },
        ],
      },
      election_id: 'test_election',
      predicates: [
        {
          attribute: 'status_matricula',
          p_type: '==',
          value: 'Ativo',
        },
      ],
    };

    // Attempt to create presentation - should fail or create invalid proof
    const presentation = await PresentationService.createZKPPresentation(
      parsedCredential,
      electionRequest,
      [{attribute: 'status_matricula', p_type: '==', value: 'Ativo'}],
    );

    // Validation should fail because predicate is not satisfied
    const validation = await VerificationService.validatePresentation(
      presentation,
      electionRequest,
    );

    expect(validation.valid).toBe(false);
    expect(validation.predicates_satisfied).toBe(false);
    expect(validation.errors).toBeDefined();
  });
});
