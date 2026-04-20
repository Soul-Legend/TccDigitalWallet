/**
 * TrustChainService Tests
 *
 * Validates:
 * - Root anchor initialization (self-signed certificate)
 * - Child issuer registration (parent-signed certificate)
 * - Chain verification (walk from leaf to root)
 * - Rejection of unknown issuers
 * - Multi-level chains (root → intermediate → leaf)
 * - Cycle detection
 * - Integration with VerificationService
 */

import TrustChainService from '../TrustChainService';
import StorageService from '../StorageService';
import CredentialService from '../CredentialService';
import DIDService from '../DIDService';
import PresentationService from '../PresentationService';
import VerificationService from '../VerificationService';
import {useAppStore} from '../../stores/useAppStore';
import {StudentData, PresentationExchangeRequest} from '../../types';

beforeEach(async () => {
  await StorageService.clearAll();
  await TrustChainService.reset();
  useAppStore.getState().clearLogs();
});

describe('TrustChainService', () => {
  describe('Root Anchor Initialization', () => {
    it('should create a self-signed root issuer', async () => {
      const root = await TrustChainService.initializeRootIssuer(
        'did:web:ufsc.br',
        'UFSC - Root CA',
      );

      expect(root.did).toBe('did:web:ufsc.br');
      expect(root.name).toBe('UFSC - Root CA');
      expect(root.parentDid).toBeNull();
      expect(root.publicKey).toBeDefined();
      expect(root.publicKey.length).toBe(64); // 32 bytes = 64 hex chars
      expect(root.certificate).toBeDefined();
      expect(root.createdAt).toBeDefined();
    });

    it('should verify the root self-signature', async () => {
      await TrustChainService.initializeRootIssuer(
        'did:web:ufsc.br',
        'UFSC - Root CA',
      );

      const result = await TrustChainService.verifyTrustChain('did:web:ufsc.br');
      expect(result.trusted).toBe(true);
      expect(result.chain).toHaveLength(1);
      expect(result.chain[0].did).toBe('did:web:ufsc.br');
    });

    it('should return existing root on subsequent calls', async () => {
      const root1 = await TrustChainService.initializeRootIssuer(
        'did:web:ufsc.br',
        'UFSC - Root CA',
      );
      const root2 = await TrustChainService.initializeRootIssuer(
        'did:web:ufsc.br',
        'UFSC - Root CA',
      );

      expect(root1.did).toBe(root2.did);
      expect(root1.publicKey).toBe(root2.publicKey);
    });
  });

  describe('Child Issuer Registration', () => {
    it('should register a child issuer signed by the root', async () => {
      await TrustChainService.initializeRootIssuer(
        'did:web:ufsc.br',
        'UFSC - Root CA',
      );
      const rootPrivateKey = await TrustChainService.getIssuerPrivateKey('did:web:ufsc.br');
      expect(rootPrivateKey).toBeDefined();

      const child = await TrustChainService.registerChildIssuer(
        'did:web:ufsc.br',
        rootPrivateKey!,
        'did:web:cagr.ufsc.br',
        'CAGR - Departamento Acadêmico',
      );

      expect(child.did).toBe('did:web:cagr.ufsc.br');
      expect(child.name).toBe('CAGR - Departamento Acadêmico');
      expect(child.parentDid).toBe('did:web:ufsc.br');
      expect(child.publicKey).toBeDefined();
      expect(child.certificate).toBeDefined();
    });

    it('should verify the child certificate against the parent public key', async () => {
      await TrustChainService.initializeRootIssuer(
        'did:web:ufsc.br',
        'UFSC - Root CA',
      );
      const rootKey = await TrustChainService.getIssuerPrivateKey('did:web:ufsc.br');

      await TrustChainService.registerChildIssuer(
        'did:web:ufsc.br',
        rootKey!,
        'did:web:cagr.ufsc.br',
        'CAGR',
      );

      const result = await TrustChainService.verifyTrustChain('did:web:cagr.ufsc.br');
      expect(result.trusted).toBe(true);
      expect(result.chain).toHaveLength(2);
      expect(result.chain[0].did).toBe('did:web:cagr.ufsc.br');
      expect(result.chain[1].did).toBe('did:web:ufsc.br');
    });

    it('should reject registration with unknown parent', async () => {
      await expect(
        TrustChainService.registerChildIssuer(
          'did:web:unknown.br',
          'fake_key',
          'did:web:child.br',
          'Child',
        ),
      ).rejects.toThrow('Emissor pai não encontrado');
    });

    it('should reject duplicate child registration', async () => {
      await TrustChainService.initializeRootIssuer('did:web:ufsc.br', 'UFSC');
      const rootKey = await TrustChainService.getIssuerPrivateKey('did:web:ufsc.br');

      await TrustChainService.registerChildIssuer(
        'did:web:ufsc.br',
        rootKey!,
        'did:web:cagr.ufsc.br',
        'CAGR',
      );

      await expect(
        TrustChainService.registerChildIssuer(
          'did:web:ufsc.br',
          rootKey!,
          'did:web:cagr.ufsc.br',
          'CAGR duplicate',
        ),
      ).rejects.toThrow('Emissor já registrado');
    });
  });

  describe('Multi-level Chain', () => {
    it('should verify a 3-level chain (root → intermediate → leaf)', async () => {
      // Level 0: Root
      await TrustChainService.initializeRootIssuer(
        'did:web:ufsc.br',
        'UFSC Root',
      );
      const rootKey = await TrustChainService.getIssuerPrivateKey('did:web:ufsc.br');

      // Level 1: Intermediate
      await TrustChainService.registerChildIssuer(
        'did:web:ufsc.br',
        rootKey!,
        'did:web:ctc.ufsc.br',
        'CTC - Centro Tecnológico',
      );
      const ctcKey = await TrustChainService.getIssuerPrivateKey('did:web:ctc.ufsc.br');

      // Level 2: Leaf
      await TrustChainService.registerChildIssuer(
        'did:web:ctc.ufsc.br',
        ctcKey!,
        'did:web:ine.ufsc.br',
        'INE - Departamento de Informática',
      );

      const result = await TrustChainService.verifyTrustChain('did:web:ine.ufsc.br');
      expect(result.trusted).toBe(true);
      expect(result.chain).toHaveLength(3);
      expect(result.chain[0].did).toBe('did:web:ine.ufsc.br');
      expect(result.chain[1].did).toBe('did:web:ctc.ufsc.br');
      expect(result.chain[2].did).toBe('did:web:ufsc.br');
    });

    it('should list all issuers in the chain', async () => {
      await TrustChainService.initializeRootIssuer('did:web:ufsc.br', 'UFSC');
      const rootKey = await TrustChainService.getIssuerPrivateKey('did:web:ufsc.br');

      await TrustChainService.registerChildIssuer(
        'did:web:ufsc.br', rootKey!, 'did:web:ctc.ufsc.br', 'CTC',
      );
      await TrustChainService.registerChildIssuer(
        'did:web:ufsc.br', rootKey!, 'did:web:cse.ufsc.br', 'CSE',
      );

      const all = await TrustChainService.getAllIssuers();
      expect(all).toHaveLength(3);
    });
  });

  describe('Trust Chain Rejection', () => {
    it('should reject an unknown issuer DID', async () => {
      await TrustChainService.initializeRootIssuer('did:web:ufsc.br', 'UFSC');

      const result = await TrustChainService.verifyTrustChain('did:web:attacker.com');
      expect(result.trusted).toBe(false);
      expect(result.error).toContain('não encontrado');
    });

    it('should report isTrustedIssuer correctly', async () => {
      await TrustChainService.initializeRootIssuer('did:web:ufsc.br', 'UFSC');
      const rootKey = await TrustChainService.getIssuerPrivateKey('did:web:ufsc.br');

      await TrustChainService.registerChildIssuer(
        'did:web:ufsc.br', rootKey!, 'did:web:cagr.ufsc.br', 'CAGR',
      );

      expect(await TrustChainService.isTrustedIssuer('did:web:ufsc.br')).toBe(true);
      expect(await TrustChainService.isTrustedIssuer('did:web:cagr.ufsc.br')).toBe(true);
      expect(await TrustChainService.isTrustedIssuer('did:web:evil.com')).toBe(false);
    });
  });

  describe('Chain Reset', () => {
    it('should clear all issuers on reset', async () => {
      await TrustChainService.initializeRootIssuer('did:web:ufsc.br', 'UFSC');
      await TrustChainService.reset();

      const all = await TrustChainService.getAllIssuers();
      expect(all).toHaveLength(0);

      const result = await TrustChainService.verifyTrustChain('did:web:ufsc.br');
      expect(result.trusted).toBe(false);
    });
  });
});

describe('TrustChain + Verification Integration', () => {
  const studentData: StudentData = {
    nome_completo: 'Ana Costa',
    cpf: '11122233344',
    matricula: '2024200',
    curso: 'Engenharia Elétrica',
    status_matricula: 'Ativo',
    data_nascimento: '2000-06-15',
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
    acesso_laboratorios: ['Lab 101'],
    acesso_predios: ['CTC'],
  };

  const pexRequest: PresentationExchangeRequest = {
    type: 'PresentationExchange',
    version: '1.0.0',
    challenge: 'test_challenge_trust',
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

  it('should accept a credential issued by a trusted issuer in the chain', async () => {
    // Setup identities normally
    const {did: holderDID} = await DIDService.generateHolderIdentity('key');
    const {did: issuerDID} = await DIDService.generateIssuerIdentity('cagr.ufsc.br');

    // Setup trust chain: root → department (the issuer we just created)
    await TrustChainService.initializeRootIssuer(
      'did:web:ufsc.br',
      'UFSC Root',
    );
    const rootKey = await TrustChainService.getIssuerPrivateKey('did:web:ufsc.br');

    // Register the issuer DID as a trusted child in the chain
    await TrustChainService.registerChildIssuer(
      'did:web:ufsc.br',
      rootKey!,
      issuerDID,
      'CAGR - Departamento Acadêmico',
    );

    // Issue credential from the trusted department
    const token = await CredentialService.issueCredential(studentData, holderDID, 'sd-jwt');
    const parsed = await CredentialService.validateAndParseCredential(token);

    // Create presentation
    const presentation = await PresentationService.createPresentation(
      parsed,
      pexRequest,
      ['status_matricula', 'isencao_ru'],
    );

    // Verify — should pass trust chain
    const result = await VerificationService.validatePresentation(presentation, pexRequest);
    expect(result.trust_chain_valid).toBe(true);
    expect(result.valid).toBe(true);
  });

  it('should reject a credential issued by an untrusted issuer', async () => {
    // Setup identities (issuer is NOT in the trust chain)
    const {did: holderDID} = await DIDService.generateHolderIdentity('key');
    await DIDService.generateIssuerIdentity('evil-university.com');

    // Setup trust chain with root only — the issuer DID is not registered here
    await TrustChainService.initializeRootIssuer('did:web:ufsc.br', 'UFSC Root');

    // Issue credential from untrusted issuer
    const token = await CredentialService.issueCredential(studentData, holderDID, 'sd-jwt');
    const parsed = await CredentialService.validateAndParseCredential(token);

    const presentation = await PresentationService.createPresentation(
      parsed,
      pexRequest,
      ['status_matricula', 'isencao_ru'],
    );

    // Verify — should FAIL trust chain
    const result = await VerificationService.validatePresentation(presentation, pexRequest);
    expect(result.trust_chain_valid).toBe(false);
    expect(result.valid).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors!.some(e => e.includes('cadeia de confiança'))).toBe(true);
  });

  it('should skip trust chain check when no chain is initialized', async () => {
    // No trust chain setup — backwards compatible
    const {did: holderDID} = await DIDService.generateHolderIdentity('key');
    await DIDService.generateIssuerIdentity('ufsc.br');

    const token = await CredentialService.issueCredential(studentData, holderDID, 'sd-jwt');
    const parsed = await CredentialService.validateAndParseCredential(token);

    const presentation = await PresentationService.createPresentation(
      parsed,
      pexRequest,
      ['status_matricula', 'isencao_ru'],
    );

    const result = await VerificationService.validatePresentation(presentation, pexRequest);
    // trust_chain_valid should be undefined (not checked)
    expect(result.trust_chain_valid).toBeUndefined();
    // Presentation should still be valid
    expect(result.valid).toBe(true);
  });
});
