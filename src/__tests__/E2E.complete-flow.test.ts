/**
 * E2E Integration Test: Complete Credential Flow
 *
 * Tests the complete flow from identity generation through credential issuance,
 * storage, presentation creation, and verification.
 *
 * Flow: Identity Generation → Issuance → Storage → Presentation → Verification
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

describe('E2E: Complete Credential Flow', () => {
  it('should complete full flow: identity → issuance → storage → presentation → verification', async () => {
    // ========== STEP 1: Generate Holder Identity ==========
    const {did: holderDID, publicKey: holderPublicKey} =
      await DIDService.generateHolderIdentity('key');

    expect(holderDID).toBeDefined();
    expect(holderDID).toMatch(/^did:key:/);
    expect(holderPublicKey).toBeDefined();

    // Verify holder identity is stored
    const storedHolderDID = await StorageService.getHolderDID();
    expect(storedHolderDID).toBe(holderDID);

    // ========== STEP 2: Generate Issuer Identity ==========
    const {did: issuerDID} = await DIDService.generateIssuerIdentity('ufsc.br');

    expect(issuerDID).toBeDefined();
    expect(issuerDID).toMatch(/^did:web:ufsc\.br/);

    // ========== STEP 3: Issue Credential ==========
    const studentData: StudentData = {
      nome_completo: 'Maria Santos',
      cpf: '98765432100',
      matricula: '2024001',
      curso: 'Engenharia de Software',
      status_matricula: 'Ativo',
      data_nascimento: '2000-05-15',
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
      acesso_laboratorios: ['Lab 101', 'Lab 202'],
      acesso_predios: ['Prédio A', 'Prédio B'],
    };

    const credentialToken = await CredentialService.issueCredential(
      studentData,
      holderDID,
      'sd-jwt',
    );

    expect(credentialToken).toBeDefined();
    expect(typeof credentialToken).toBe('string');
    expect(credentialToken.split('.').length).toBe(3); // JWT format

    // ========== STEP 4: Store Credential ==========
    await StorageService.storeCredential(credentialToken);

    const storedCredentials = await StorageService.getCredentials();
    expect(storedCredentials).toHaveLength(1);
    expect(storedCredentials[0]).toBe(credentialToken);

    // ========== STEP 5: Parse and Validate Stored Credential ==========
    const parsedCredential = await CredentialService.validateAndParseCredential(
      credentialToken,
    );

    expect(parsedCredential).toBeDefined();
    expect(parsedCredential.issuer).toBe(issuerDID);
    expect(parsedCredential.credentialSubject.id).toBe(holderDID);
    expect(parsedCredential.credentialSubject.nome_completo).toBe('Maria Santos');
    expect(parsedCredential.credentialSubject.isencao_ru).toBe(true);

    // ========== STEP 6: Generate Verification Request (RU Scenario) ==========
    const pexRequest: PresentationExchangeRequest = {
      type: 'PresentationExchange',
      version: '1.0.0',
      challenge: `challenge_${Date.now()}`,
      presentation_definition: {
        id: 'ru_access',
        input_descriptors: [
          {
            id: 'ru_descriptor',
            name: 'RU Access',
            purpose: 'Verify RU access eligibility',
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

    // ========== STEP 7: Process Request and Create Presentation ==========
    const consentData = await PresentationService.processPEXRequest(
      pexRequest,
      parsedCredential,
    );

    expect(consentData).toBeDefined();
    expect(consentData.required_attributes).toContain('status_matricula');
    expect(consentData.required_attributes).toContain('isencao_ru');

    // Create SD-JWT presentation with selected attributes
    const presentation = await PresentationService.createPresentation(
      parsedCredential,
      pexRequest,
      ['status_matricula', 'isencao_ru'], // Only disclose required attributes
    );

    expect(presentation).toBeDefined();
    expect(presentation.holder).toBe(holderDID);
    expect(presentation.disclosed_attributes).toBeDefined();
    expect(presentation.disclosed_attributes!.status_matricula).toBe('Ativo');
    expect(presentation.disclosed_attributes!.isencao_ru).toBe(true);

    // Verify non-disclosed attributes are not present
    expect(presentation.disclosed_attributes!.cpf).toBeUndefined();
    expect(presentation.disclosed_attributes!.nome_completo).toBeUndefined();

    // ========== STEP 8: Verify Presentation ==========
    const validationResult = await VerificationService.validatePresentation(
      presentation,
      pexRequest,
    );

    expect(validationResult).toBeDefined();
    expect(validationResult.valid).toBe(true);
    expect(validationResult.errors).toBeUndefined();
    expect(validationResult.verified_attributes).toBeDefined();
    expect(validationResult.verified_attributes!.status_matricula).toBe('Ativo');
    expect(validationResult.verified_attributes!.isencao_ru).toBe(true);

    // ========== STEP 9: Verify Logs Were Created ==========
    const logs = useAppStore.getState().logs;

    // Should have logs for key generation, credential issuance, and verification
    expect(logs.length).toBeGreaterThan(0);

    const keyGenLogs = logs.filter(log => log.operation === 'key_generation');
    expect(keyGenLogs.length).toBeGreaterThan(0);

    const credentialLogs = logs.filter(log => log.operation === 'credential_issuance');
    expect(credentialLogs.length).toBeGreaterThan(0);
  });

  it('should handle multiple credentials in storage', async () => {
    // Generate identities
    const {did: holderDID} = await DIDService.generateHolderIdentity('key');
    await DIDService.generateIssuerIdentity('ufsc.br');

    // Issue multiple credentials
    const studentData1: StudentData = {
      nome_completo: 'João Silva',
      cpf: '11111111111',
      matricula: '2024001',
      curso: 'Ciência da Computação',
      status_matricula: 'Ativo',
      data_nascimento: '1999-01-01',
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

    const studentData2: StudentData = {
      ...studentData1,
      nome_completo: 'Ana Costa',
      cpf: '22222222222',
      matricula: '2024002',
      curso: 'Engenharia Elétrica',
    };

    const credential1 = await CredentialService.issueCredential(
      studentData1,
      holderDID,
      'sd-jwt',
    );

    const credential2 = await CredentialService.issueCredential(
      studentData2,
      holderDID,
      'sd-jwt',
    );

    // Store both credentials
    await StorageService.storeCredential(credential1);
    await StorageService.storeCredential(credential2);

    // Verify both are stored
    const storedCredentials = await StorageService.getCredentials();
    expect(storedCredentials).toHaveLength(2);

    // Parse both credentials
    const parsed1 = await CredentialService.validateAndParseCredential(credential1);
    const parsed2 = await CredentialService.validateAndParseCredential(credential2);

    expect(parsed1.credentialSubject.nome_completo).toBe('João Silva');
    expect(parsed2.credentialSubject.nome_completo).toBe('Ana Costa');

    // Delete first credential
    await StorageService.deleteCredential(0);

    const remainingCredentials = await StorageService.getCredentials();
    expect(remainingCredentials).toHaveLength(1);

    const parsedRemaining = await CredentialService.validateAndParseCredential(
      remainingCredentials[0],
    );
    expect(parsedRemaining.credentialSubject.nome_completo).toBe('Ana Costa');
  });

  it('should reject invalid credential format', async () => {
    const invalidToken = 'invalid.jwt.token';

    await expect(
      CredentialService.validateAndParseCredential(invalidToken),
    ).rejects.toThrow();
  });

  it('should reject presentation with tampered data', async () => {
    // Generate identities and issue credential
    const {did: holderDID} = await DIDService.generateHolderIdentity('key');
    await DIDService.generateIssuerIdentity('ufsc.br');

    const studentData: StudentData = {
      nome_completo: 'Test User',
      cpf: '12345678900',
      matricula: '123456',
      curso: 'Test Course',
      status_matricula: 'Ativo',
      data_nascimento: '2000-01-01',
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

    const credentialToken = await CredentialService.issueCredential(
      studentData,
      holderDID,
      'sd-jwt',
    );

    const parsedCredential = await CredentialService.validateAndParseCredential(
      credentialToken,
    );

    // Create PEX request
    const pexRequest: PresentationExchangeRequest = {
      type: 'PresentationExchange',
      version: '1.0.0',
      challenge: 'test-challenge',
      presentation_definition: {
        id: 'test',
        input_descriptors: [
          {
            id: 'test-desc',
            name: 'Test',
            purpose: 'Test',
            constraints: {
              fields: [
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

    // Create valid presentation
    const presentation = await PresentationService.createPresentation(
      parsedCredential,
      pexRequest,
      ['isencao_ru'],
    );

    // Tamper with disclosed attributes
    const tamperedPresentation = {
      ...presentation,
      disclosed_attributes: {
        ...presentation.disclosed_attributes,
        isencao_ru: false, // Changed from true to false
      },
    };

    // Verification should fail due to tampering
    const validationResult = await VerificationService.validatePresentation(
      tamperedPresentation,
      pexRequest,
    );

    expect(validationResult.valid).toBe(false);
    expect(validationResult.errors).toBeDefined();
    expect(validationResult.errors!.length).toBeGreaterThan(0);
  });
});
