import PresentationService from '../PresentationService';
import VerificationService from '../VerificationService';
import CryptoService from '../CryptoService';
import StorageService from '../StorageService';
import {
  VerifiableCredential,
} from '../../types';
import {useAppStore} from '../../stores/useAppStore';

// Mock dependencies
jest.mock('../LogService');
jest.mock('../CryptoService');
jest.mock('../StorageService');
jest.mock('../../stores/useAppStore');

describe('Range Proof Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAppStore.getState as jest.Mock).mockReturnValue({
      logs: [],
      addLog: jest.fn(),
    });

    // Mock StorageService
    (StorageService.getHolderPrivateKey as jest.Mock).mockResolvedValue(
      '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    );
    (StorageService.getIssuerPublicKey as jest.Mock).mockResolvedValue(
      'mock-issuer-public-key',
    );
    (StorageService.getHolderPublicKey as jest.Mock).mockResolvedValue(
      'mock-holder-public-key',
    );

    // Mock CryptoService
    (CryptoService.signData as jest.Mock).mockResolvedValue(
      'a'.repeat(128), // 128 character hex string (64 bytes)
    );
    (CryptoService.verifySignature as jest.Mock).mockResolvedValue(true);
    (CryptoService.computeHash as jest.Mock).mockImplementation(
      async (data: string) => {
        let hash = 0;
        for (let i = 0; i < data.length; i++) {
          hash = (hash << 5) - hash + data.charCodeAt(i);
          hash = hash & hash;
        }
        return Math.abs(hash).toString(16).padStart(64, '0');
      },
    );
    (CryptoService.generateNonce as jest.Mock).mockReturnValue(
      'mock-nonce-1234567890abcdef',
    );
  });

  describe('Complete Age Verification Flow', () => {
    it('should complete full age verification flow for person >= 18', async () => {
      // 1. Create credential for person born in 1990 (definitely >= 18)
      const credential: VerifiableCredential = {
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        type: ['VerifiableCredential', 'AcademicIDCredential'],
        issuer: 'did:web:ufsc.br',
        issuanceDate: new Date().toISOString(),
        credentialSubject: {
          id: 'did:key:z6Mk...',
          nome_completo: 'João Silva',
          cpf: '12345678900',
          matricula: 'TEST123',
          curso: 'Ciência da Computação',
          status_matricula: 'Ativo',
          data_nascimento: '1990-06-15',
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
        },
        proof: {
          type: 'JsonWebSignature2020',
          created: new Date().toISOString(),
          verificationMethod: 'did:web:ufsc.br#key-1',
          proofPurpose: 'assertionMethod',
          jws: 'mock-jws',
        },
      };

      // 2. Verifier generates age verification challenge
      const pexRequest = await VerificationService.generateChallenge('age_verification');

      expect(pexRequest).toBeDefined();
      expect(pexRequest.type).toBe('PresentationExchange');
      expect(pexRequest.predicates).toBeDefined();
      expect(pexRequest.predicates![0].attribute).toBe('data_nascimento');
      expect(pexRequest.predicates![0].p_type).toBe('>=');
      expect(pexRequest.predicates![0].value).toBe(18);

      // 3. Holder processes the request
      const consentData = await PresentationService.processPEXRequest(
        pexRequest,
        credential,
      );

      expect(consentData).toBeDefined();
      expect(consentData.predicates).toBeDefined();
      expect(consentData.predicates!.length).toBe(1);

      // 4. Holder creates ZKP presentation
      const presentation = await PresentationService.createZKPPresentation(
        credential,
        pexRequest,
        consentData.predicates!,
      );

      expect(presentation).toBeDefined();
      expect(presentation.type).toContain('VerifiablePresentation');
      expect(presentation.proof.type).toBe('Groth16Proof');
      expect(presentation.zkp_proofs).toBeDefined();
      expect(presentation.zkp_proofs!.length).toBe(1);

      // Verify birthdate is not revealed
      const zkpProof = presentation.zkp_proofs![0];
      expect(zkpProof.revealed_attrs.length).toBe(0);
      expect(zkpProof.predicate_satisfied).toBe(true);

      // 5. Verifier validates the presentation
      const validationResult = await VerificationService.validatePresentation(
        presentation,
        pexRequest,
      );

      expect(validationResult.valid).toBe(true);
      expect(validationResult.predicates_satisfied).toBe(true);

      // Verify birthdate was not accessed during validation
      if (validationResult.verified_attributes) {
        expect(validationResult.verified_attributes.data_nascimento).toBeUndefined();
      }
    });

    it('should reject age verification for person < 18', async () => {
      // Create credential for person born in 2010 (definitely < 18)
      const credential: VerifiableCredential = {
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        type: ['VerifiableCredential', 'AcademicIDCredential'],
        issuer: 'did:web:ufsc.br',
        issuanceDate: new Date().toISOString(),
        credentialSubject: {
          id: 'did:key:z6Mk...',
          nome_completo: 'Maria Santos',
          cpf: '98765432100',
          matricula: 'TEST456',
          curso: 'Engenharia',
          status_matricula: 'Ativo',
          data_nascimento: '2010-06-15',
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
        },
        proof: {
          type: 'JsonWebSignature2020',
          created: new Date().toISOString(),
          verificationMethod: 'did:web:ufsc.br#key-1',
          proofPurpose: 'assertionMethod',
          jws: 'mock-jws',
        },
      };

      // Generate challenge
      const pexRequest = await VerificationService.generateChallenge('age_verification');

      // Process request
      const consentData = await PresentationService.processPEXRequest(
        pexRequest,
        credential,
      );

      // Create presentation
      const presentation = await PresentationService.createZKPPresentation(
        credential,
        pexRequest,
        consentData.predicates!,
      );

      // Verify predicate is not satisfied
      const zkpProof = presentation.zkp_proofs![0];
      expect(zkpProof.predicate_satisfied).toBe(false);

      // Validate presentation
      const validationResult = await VerificationService.validatePresentation(
        presentation,
        pexRequest,
      );

      // Validation should fail because predicate is not satisfied
      expect(validationResult.valid).toBe(false);
      expect(validationResult.predicates_satisfied).toBe(false);
    });

    it('should not reveal birthdate in any part of the flow', async () => {
      const birthdate = '1995-03-20';
      const credential: VerifiableCredential = {
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        type: ['VerifiableCredential', 'AcademicIDCredential'],
        issuer: 'did:web:ufsc.br',
        issuanceDate: new Date().toISOString(),
        credentialSubject: {
          id: 'did:key:z6Mk...',
          nome_completo: 'Test User',
          cpf: '11111111111',
          matricula: 'TEST789',
          curso: 'Medicina',
          status_matricula: 'Ativo',
          data_nascimento: birthdate,
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
        },
        proof: {
          type: 'JsonWebSignature2020',
          created: new Date().toISOString(),
          verificationMethod: 'did:web:ufsc.br#key-1',
          proofPurpose: 'assertionMethod',
          jws: 'mock-jws',
        },
      };

      const pexRequest = await VerificationService.generateChallenge('age_verification');
      const consentData = await PresentationService.processPEXRequest(
        pexRequest,
        credential,
      );
      const presentation = await PresentationService.createZKPPresentation(
        credential,
        pexRequest,
        consentData.predicates!,
      );

      // Check that birthdate is not in ZKP proofs
      const zkpProofsString = JSON.stringify(presentation.zkp_proofs);
      expect(zkpProofsString).not.toContain(birthdate);

      // Check that birthdate is not in revealed attributes
      const zkpProof = presentation.zkp_proofs![0];
      expect(zkpProof.revealed_attrs).toEqual([]);

      // Validate and check result
      const validationResult = await VerificationService.validatePresentation(
        presentation,
        pexRequest,
      );

      // Check that birthdate is not in validation result
      if (validationResult.verified_attributes) {
        expect(validationResult.verified_attributes.data_nascimento).toBeUndefined();
      }
    });
  });

  describe('Maioridade Scenario in VerifierScreen', () => {
    it('should have maioridade scenario configured correctly', () => {
      const scenarios = VerificationService.getScenarios();
      const maioridadeScenario = scenarios.find(s => s.id === 'age_verification');

      expect(maioridadeScenario).toBeDefined();
      expect(maioridadeScenario!.name).toBe('Verificação de Maioridade');
      expect(maioridadeScenario!.type).toBe('range_proof');
      expect(maioridadeScenario!.predicates).toBeDefined();
      expect(maioridadeScenario!.predicates!.length).toBe(1);
      expect(maioridadeScenario!.predicates![0].attribute).toBe('data_nascimento');
      expect(maioridadeScenario!.predicates![0].p_type).toBe('>=');
      expect(maioridadeScenario!.predicates![0].value).toBe(18);
    });
  });
});
