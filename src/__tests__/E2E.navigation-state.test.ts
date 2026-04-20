/**
 * E2E Integration Test: Navigation and State Preservation
 *
 * Tests the navigation between modules and state preservation across
 * module transitions.
 *
 * Flow: Module Navigation → State Preservation → Multi-Module Workflow
 */

import {useAppStore} from '../stores/useAppStore';
import DIDService from '../services/DIDService';
import CredentialService from '../services/CredentialService';
import StorageService from '../services/StorageService';
import {StudentData} from '../types';

// Clear storage and logs before each test
beforeEach(async () => {
  await StorageService.clearAll();
  useAppStore.getState().clearLogs();
  useAppStore.getState().setCurrentModule('home');
});

describe('E2E: Navigation and State Preservation', () => {
  it('should preserve module state during navigation', async () => {
    // ========== STEP 1: Navigate to Emissor ==========
    useAppStore.getState().setCurrentModule('emissor');
    expect(useAppStore.getState().currentModule).toBe('emissor');

    // ========== STEP 2: Navigate to Titular ==========
    useAppStore.getState().setCurrentModule('titular');
    expect(useAppStore.getState().currentModule).toBe('titular');

    // ========== STEP 3: Navigate to Verificador ==========
    useAppStore.getState().setCurrentModule('verificador');
    expect(useAppStore.getState().currentModule).toBe('verificador');

    // ========== STEP 4: Navigate to Logs ==========
    useAppStore.getState().setCurrentModule('logs');
    expect(useAppStore.getState().currentModule).toBe('logs');

    // ========== STEP 5: Navigate back to Emissor ==========
    useAppStore.getState().setCurrentModule('emissor');
    expect(useAppStore.getState().currentModule).toBe('emissor');
  });

  it('should preserve logs across module navigation', async () => {
    // Generate some logs in different modules
    useAppStore.getState().setCurrentModule('emissor');
    useAppStore.getState().addLog({
      operation: 'credential_issuance',
      module: 'emissor',
      details: {test: 'emissor_log'},
      success: true,
    });

    useAppStore.getState().setCurrentModule('titular');
    useAppStore.getState().addLog({
      operation: 'presentation_creation',
      module: 'titular',
      details: {test: 'titular_log'},
      success: true,
    });

    useAppStore.getState().setCurrentModule('verificador');
    useAppStore.getState().addLog({
      operation: 'verification',
      module: 'verificador',
      details: {test: 'verificador_log'},
      success: true,
    });

    // Navigate to logs module
    useAppStore.getState().setCurrentModule('logs');

    // All logs should be preserved
    const logs = useAppStore.getState().logs;
    expect(logs.length).toBe(3);

    const emissorLog = logs.find(log => log.module === 'emissor');
    const titularLog = logs.find(log => log.module === 'titular');
    const verificadorLog = logs.find(log => log.module === 'verificador');

    expect(emissorLog).toBeDefined();
    expect(titularLog).toBeDefined();
    expect(verificadorLog).toBeDefined();

    // Navigate back to emissor
    useAppStore.getState().setCurrentModule('emissor');

    // Logs should still be preserved
    expect(useAppStore.getState().logs.length).toBe(3);
  });

  it('should preserve credentials across module navigation', async () => {
    // ========== STEP 1: Setup and Issue Credential in Emissor ==========
    const {did: holderDID} = await DIDService.generateHolderIdentity('key');
    await DIDService.generateIssuerIdentity('ufsc.br');

    const studentData: StudentData = {
      nome_completo: 'Navigation Test User',
      cpf: '12345678900',
      matricula: '2025700',
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
      isencao_ru: false,
      isencao_esporte: false,
      isencao_idiomas: false,
      acesso_laboratorios: [],
      acesso_predios: [],
    };

    useAppStore.getState().setCurrentModule('emissor');

    const credentialToken = await CredentialService.issueCredential(
      studentData,
      holderDID,
      'sd-jwt',
    );

    // ========== STEP 2: Navigate to Titular and Store Credential ==========
    useAppStore.getState().setCurrentModule('titular');

    await StorageService.storeCredential(credentialToken);

    const storedCredentials = await StorageService.getCredentials();
    expect(storedCredentials).toHaveLength(1);

    // ========== STEP 3: Navigate to Verificador ==========
    useAppStore.getState().setCurrentModule('verificador');

    // Credentials should still be in storage
    const credentialsInVerifier = await StorageService.getCredentials();
    expect(credentialsInVerifier).toHaveLength(1);
    expect(credentialsInVerifier[0]).toBe(credentialToken);

    // ========== STEP 4: Navigate to Logs ==========
    useAppStore.getState().setCurrentModule('logs');

    // Credentials should still be in storage
    const credentialsInLogs = await StorageService.getCredentials();
    expect(credentialsInLogs).toHaveLength(1);

    // ========== STEP 5: Navigate back to Titular ==========
    useAppStore.getState().setCurrentModule('titular');

    // Credentials should still be accessible
    const credentialsBackInTitular = await StorageService.getCredentials();
    expect(credentialsBackInTitular).toHaveLength(1);
    expect(credentialsBackInTitular[0]).toBe(credentialToken);
  });

  it('should support complete multi-module workflow', async () => {
    // ========== STEP 1: Emissor - Issue Credential ==========
    useAppStore.getState().setCurrentModule('emissor');

    const {did: holderDID} = await DIDService.generateHolderIdentity('key');
    await DIDService.generateIssuerIdentity('ufsc.br');

    const studentData: StudentData = {
      nome_completo: 'Workflow Test User',
      cpf: '98765432100',
      matricula: '2025800',
      curso: 'Workflow Test',
      status_matricula: 'Ativo',
      data_nascimento: '1999-05-20',
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
      acesso_laboratorios: ['Lab Test'],
      acesso_predios: ['Building Test'],
    };

    const credentialToken = await CredentialService.issueCredential(
      studentData,
      holderDID,
      'sd-jwt',
    );

    expect(useAppStore.getState().currentModule).toBe('emissor');
    expect(useAppStore.getState().logs.length).toBeGreaterThan(0);

    // ========== STEP 2: Titular - Store Credential ==========
    useAppStore.getState().setCurrentModule('titular');

    await StorageService.storeCredential(credentialToken);

    const storedCredentials = await StorageService.getCredentials();
    expect(storedCredentials).toHaveLength(1);
    expect(useAppStore.getState().currentModule).toBe('titular');

    // ========== STEP 3: Verificador - Generate Request ==========
    useAppStore.getState().setCurrentModule('verificador');

    // Simulate generating a verification request
    useAppStore.getState().addLog({
      operation: 'verification',
      module: 'verificador',
      details: {action: 'request_generated'},
      success: true,
    });

    expect(useAppStore.getState().currentModule).toBe('verificador');

    // ========== STEP 4: Back to Titular - Create Presentation ==========
    useAppStore.getState().setCurrentModule('titular');

    // Simulate creating presentation
    useAppStore.getState().addLog({
      operation: 'presentation_creation',
      module: 'titular',
      details: {action: 'presentation_created'},
      success: true,
    });

    expect(useAppStore.getState().currentModule).toBe('titular');

    // ========== STEP 5: Back to Verificador - Validate ==========
    useAppStore.getState().setCurrentModule('verificador');

    // Simulate validation
    useAppStore.getState().addLog({
      operation: 'verification',
      module: 'verificador',
      details: {action: 'validation_complete', result: 'valid'},
      success: true,
    });

    expect(useAppStore.getState().currentModule).toBe('verificador');

    // ========== STEP 6: Logs - Review All Operations ==========
    useAppStore.getState().setCurrentModule('logs');

    const allLogs = useAppStore.getState().logs;

    // Should have logs from all modules
    const emissorLogs = allLogs.filter(log => log.module === 'emissor');
    const titularLogs = allLogs.filter(log => log.module === 'titular');
    const verificadorLogs = allLogs.filter(log => log.module === 'verificador');

    expect(emissorLogs.length).toBeGreaterThan(0);
    expect(titularLogs.length).toBeGreaterThan(0);
    expect(verificadorLogs.length).toBeGreaterThan(0);

    // Credentials should still be in storage
    const finalCredentials = await StorageService.getCredentials();
    expect(finalCredentials).toHaveLength(1);
  });

  it('should maintain log chronological order across modules', async () => {
    // Add logs with delays to ensure different timestamps
    useAppStore.getState().setCurrentModule('emissor');
    useAppStore.getState().addLog({
      operation: 'credential_issuance',
      module: 'emissor',
      details: {order: 1},
      success: true,
    });

    await new Promise(resolve => setTimeout(resolve, 10));

    useAppStore.getState().setCurrentModule('titular');
    useAppStore.getState().addLog({
      operation: 'presentation_creation',
      module: 'titular',
      details: {order: 2},
      success: true,
    });

    await new Promise(resolve => setTimeout(resolve, 10));

    useAppStore.getState().setCurrentModule('verificador');
    useAppStore.getState().addLog({
      operation: 'verification',
      module: 'verificador',
      details: {order: 3},
      success: true,
    });

    await new Promise(resolve => setTimeout(resolve, 10));

    useAppStore.getState().setCurrentModule('emissor');
    useAppStore.getState().addLog({
      operation: 'credential_issuance',
      module: 'emissor',
      details: {order: 4},
      success: true,
    });

    // Navigate to logs
    useAppStore.getState().setCurrentModule('logs');

    const logs = useAppStore.getState().logs;
    expect(logs.length).toBe(4);

    // Verify chronological order
    for (let i = 1; i < logs.length; i++) {
      const prevTimestamp = new Date(logs[i - 1].timestamp).getTime();
      const currTimestamp = new Date(logs[i].timestamp).getTime();
      expect(currTimestamp).toBeGreaterThanOrEqual(prevTimestamp);
    }

    // Verify order matches insertion order
    expect(logs[0].details.order).toBe(1);
    expect(logs[1].details.order).toBe(2);
    expect(logs[2].details.order).toBe(3);
    expect(logs[3].details.order).toBe(4);
  });

  it('should allow clearing logs without affecting credentials', async () => {
    // Setup credential
    const {did: holderDID} = await DIDService.generateHolderIdentity('key');
    await DIDService.generateIssuerIdentity('ufsc.br');

    const studentData: StudentData = {
      nome_completo: 'Clear Test User',
      cpf: '11111111111',
      matricula: '2025900',
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
      'sd-jwt',
    );

    await StorageService.storeCredential(credentialToken);

    // Add some logs
    useAppStore.getState().addLog({
      operation: 'credential_issuance',
      module: 'emissor',
      details: {},
      success: true,
    });

    useAppStore.getState().addLog({
      operation: 'presentation_creation',
      module: 'titular',
      details: {},
      success: true,
    });

    expect(useAppStore.getState().logs.length).toBeGreaterThan(0);

    const credentialsBeforeClear = await StorageService.getCredentials();
    expect(credentialsBeforeClear).toHaveLength(1);

    // Clear logs
    useAppStore.getState().clearLogs();

    expect(useAppStore.getState().logs.length).toBe(0);

    // Credentials should still be present
    const credentialsAfterClear = await StorageService.getCredentials();
    expect(credentialsAfterClear).toHaveLength(1);
    expect(credentialsAfterClear[0]).toBe(credentialToken);
  });

  it('should support rapid module switching', async () => {
    const modules: Array<'emissor' | 'titular' | 'verificador' | 'logs'> = [
      'emissor',
      'titular',
      'verificador',
      'logs',
      'emissor',
      'titular',
      'verificador',
      'logs',
      'titular',
      'emissor',
    ];

    for (const module of modules) {
      useAppStore.getState().setCurrentModule(module);
      expect(useAppStore.getState().currentModule).toBe(module);

      // Add a log for each module switch
      useAppStore.getState().addLog({
        operation: 'key_generation',
        module,
        details: {switched_to: module},
        success: true,
      });
    }

    // All logs should be preserved
    expect(useAppStore.getState().logs.length).toBe(modules.length);

    // Verify each module was logged
    const emissorSwitches = useAppStore.getState().logs.filter(
      log => log.details.switched_to === 'emissor',
    );
    const titularSwitches = useAppStore.getState().logs.filter(
      log => log.details.switched_to === 'titular',
    );
    const verificadorSwitches = useAppStore.getState().logs.filter(
      log => log.details.switched_to === 'verificador',
    );
    const logsSwitches = useAppStore.getState().logs.filter(
      log => log.details.switched_to === 'logs',
    );

    expect(emissorSwitches.length).toBe(3);
    expect(titularSwitches.length).toBe(3);
    expect(verificadorSwitches.length).toBe(2);
    expect(logsSwitches.length).toBe(2);
  });

  it('should preserve DID across all modules', async () => {
    // Generate DID in emissor
    useAppStore.getState().setCurrentModule('emissor');
    const {did: holderDID} = await DIDService.generateHolderIdentity('key');

    // Verify DID is stored
    const storedDID = await StorageService.getHolderDID();
    expect(storedDID).toBe(holderDID);

    // Navigate through all modules
    useAppStore.getState().setCurrentModule('titular');
    expect(await StorageService.getHolderDID()).toBe(holderDID);

    useAppStore.getState().setCurrentModule('verificador');
    expect(await StorageService.getHolderDID()).toBe(holderDID);

    useAppStore.getState().setCurrentModule('logs');
    expect(await StorageService.getHolderDID()).toBe(holderDID);

    useAppStore.getState().setCurrentModule('emissor');
    expect(await StorageService.getHolderDID()).toBe(holderDID);
  });
});
