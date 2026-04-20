/**
 * Simple unit tests for CredentialService debugging
 */

import CredentialService from '../CredentialService';
import DIDService from '../DIDService';
import StorageService from '../StorageService';
import {useAppStore} from '../../stores/useAppStore';
import {StudentData} from '../../types';

// Clear storage and logs before each test
beforeEach(async () => {
  await StorageService.clearAll();
  useAppStore.getState().clearLogs();
});

describe('CredentialService Simple Tests', () => {
  it('should issue a simple SD-JWT credential', async () => {
    // Generate identities
    const {did: holderDID} = await DIDService.generateHolderIdentity('key');
    await DIDService.generateIssuerIdentity('ufsc.br');

    // Create simple student data
    const studentData: StudentData = {
      nome_completo: 'João Silva',
      cpf: '12345678901',
      matricula: '123456',
      curso: 'Ciência da Computação',
      status_matricula: 'Ativo',
      data_nascimento: '1990-01-01',
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

    // Issue credential
    const credential = await CredentialService.issueCredential(
      studentData,
      holderDID,
      'sd-jwt',
    );

    // Verify credential is a JWT string
    expect(credential).toBeDefined();
    expect(typeof credential).toBe('string');
    expect(credential.split('.').length).toBe(3);
  });
});
