/**
 * E2E Integration Test: Trust Chain Flow
 *
 * Tests the complete PKI trust chain flow:
 *   Root Anchor Setup → Child Issuer Registration → Credential Issuance →
 *   Presentation Creation → Verification with Trust Chain Validation
 *
 * Also tests rejection of credentials from untrusted issuers.
 */

import DIDService from '../services/DIDService';
import CredentialService from '../services/CredentialService';
import StorageService from '../services/StorageService';
import PresentationService from '../services/PresentationService';
import VerificationService from '../services/VerificationService';
import TrustChainService from '../services/TrustChainService';
import {useAppStore} from '../stores/useAppStore';
import {StudentData, PresentationExchangeRequest} from '../types';

beforeEach(async () => {
  await StorageService.clearAll();
  await TrustChainService.reset();
  useAppStore.getState().clearLogs();
});

const studentData: StudentData = {
  nome_completo: 'Carlos Oliveira',
  cpf: '44455566677',
  matricula: '2024300',
  curso: 'Ciência da Computação',
  status_matricula: 'Ativo',
  data_nascimento: '2001-03-20',
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
  acesso_laboratorios: ['Lab 301'],
  acesso_predios: ['CTC'],
};

const ruPexRequest: PresentationExchangeRequest = {
  type: 'PresentationExchange',
  version: '1.0.0',
  challenge: 'challenge_trust_e2e',
  presentation_definition: {
    id: 'ru_access',
    input_descriptors: [
      {
        id: 'ru_descriptor',
        name: 'RU Access',
        purpose: 'Verify RU access eligibility',
        constraints: {
          fields: [
            {path: ['$.credentialSubject.status_matricula'], predicate: 'required'},
            {path: ['$.credentialSubject.isencao_ru'], predicate: 'required'},
          ],
          limit_disclosure: 'required',
        },
      },
    ],
  },
};

describe('E2E: Trust Chain Flow', () => {
  it('should verify a credential from a trusted issuer through a 2-level chain', async () => {
    // ========== STEP 1: Generate Holder Identity ==========
    const {did: holderDID} = await DIDService.generateHolderIdentity('key');
    expect(holderDID).toMatch(/^did:key:/);

    // ========== STEP 2: Generate Issuer Identity (department) ==========
    const {did: issuerDID} = await DIDService.generateIssuerIdentity('cagr.ufsc.br');
    expect(issuerDID).toBe('did:web:cagr.ufsc.br');

    // ========== STEP 3: Setup Trust Chain (Root → Department) ==========
    const root = await TrustChainService.initializeRootIssuer(
      'did:web:ufsc.br',
      'UFSC - Âncora Raiz',
    );
    expect(root.parentDid).toBeNull();

    const rootKey = await TrustChainService.getIssuerPrivateKey('did:web:ufsc.br');
    expect(rootKey).toBeDefined();

    const child = await TrustChainService.registerChildIssuer(
      'did:web:ufsc.br',
      rootKey!,
      issuerDID,
      'CAGR - Coordenadoria Acadêmica',
    );
    expect(child.parentDid).toBe('did:web:ufsc.br');

    // Verify chain integrity
    const chainResult = await TrustChainService.verifyTrustChain(issuerDID);
    expect(chainResult.trusted).toBe(true);
    expect(chainResult.chain).toHaveLength(2);

    // ========== STEP 4: Issue Credential ==========
    const token = await CredentialService.issueCredential(studentData, holderDID, 'sd-jwt');
    expect(token).toBeDefined();

    // ========== STEP 5: Store and Parse Credential ==========
    await StorageService.storeCredential(token);
    const parsed = await CredentialService.validateAndParseCredential(token);
    expect(parsed.issuer).toBe(issuerDID);
    expect(parsed.credentialSubject.nome_completo).toBe('Carlos Oliveira');

    // ========== STEP 6: Create Presentation ==========
    const presentation = await PresentationService.createPresentation(
      parsed,
      ruPexRequest,
      ['status_matricula', 'isencao_ru'],
    );
    expect(presentation.holder).toBe(holderDID);
    expect(presentation.disclosed_attributes!.isencao_ru).toBe(true);

    // ========== STEP 7: Verify Presentation with Trust Chain ==========
    const result = await VerificationService.validatePresentation(presentation, ruPexRequest);

    expect(result.valid).toBe(true);
    expect(result.trust_chain_valid).toBe(true);
    expect(result.verified_attributes!.status_matricula).toBe('Ativo');
    expect(result.verified_attributes!.isencao_ru).toBe(true);
  });

  it('should verify a credential through a 3-level chain (root → center → department)', async () => {
    // ========== STEP 1: Identities ==========
    const {did: holderDID} = await DIDService.generateHolderIdentity('key');
    const {did: issuerDID} = await DIDService.generateIssuerIdentity('ine.ufsc.br');
    expect(issuerDID).toBe('did:web:ine.ufsc.br');

    // ========== STEP 2: 3-Level Trust Chain ==========
    // Level 0: Root anchor
    await TrustChainService.initializeRootIssuer('did:web:ufsc.br', 'UFSC Root');
    const rootKey = await TrustChainService.getIssuerPrivateKey('did:web:ufsc.br');

    // Level 1: Intermediate (CTC - Centro Tecnológico)
    await TrustChainService.registerChildIssuer(
      'did:web:ufsc.br',
      rootKey!,
      'did:web:ctc.ufsc.br',
      'CTC - Centro Tecnológico',
    );
    const ctcKey = await TrustChainService.getIssuerPrivateKey('did:web:ctc.ufsc.br');

    // Level 2: Leaf (INE - Departamento de Informática)
    await TrustChainService.registerChildIssuer(
      'did:web:ctc.ufsc.br',
      ctcKey!,
      issuerDID,
      'INE - Departamento de Informática',
    );

    // Verify full chain
    const chainResult = await TrustChainService.verifyTrustChain(issuerDID);
    expect(chainResult.trusted).toBe(true);
    expect(chainResult.chain).toHaveLength(3);
    expect(chainResult.chain[0].did).toBe(issuerDID);
    expect(chainResult.chain[1].did).toBe('did:web:ctc.ufsc.br');
    expect(chainResult.chain[2].did).toBe('did:web:ufsc.br');

    // ========== STEP 3: Issue + Present + Verify ==========
    const token = await CredentialService.issueCredential(studentData, holderDID, 'sd-jwt');
    const parsed = await CredentialService.validateAndParseCredential(token);
    const presentation = await PresentationService.createPresentation(
      parsed,
      ruPexRequest,
      ['status_matricula', 'isencao_ru'],
    );

    const result = await VerificationService.validatePresentation(presentation, ruPexRequest);
    expect(result.valid).toBe(true);
    expect(result.trust_chain_valid).toBe(true);
  });

  it('should reject a credential from an untrusted issuer when chain is configured', async () => {
    // ========== STEP 1: Identities ==========
    const {did: holderDID} = await DIDService.generateHolderIdentity('key');
    // This issuer is NOT going to be in the trust chain
    await DIDService.generateIssuerIdentity('evil-university.com');

    // ========== STEP 2: Setup trust chain with root only ==========
    await TrustChainService.initializeRootIssuer('did:web:ufsc.br', 'UFSC Root');

    // ========== STEP 3: Issue credential from untrusted issuer ==========
    const token = await CredentialService.issueCredential(studentData, holderDID, 'sd-jwt');
    const parsed = await CredentialService.validateAndParseCredential(token);
    const presentation = await PresentationService.createPresentation(
      parsed,
      ruPexRequest,
      ['status_matricula', 'isencao_ru'],
    );

    // ========== STEP 4: Verify — should fail trust chain ==========
    const result = await VerificationService.validatePresentation(presentation, ruPexRequest);
    expect(result.valid).toBe(false);
    expect(result.trust_chain_valid).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors!.some(e => e.includes('cadeia de confiança'))).toBe(true);
  });

  it('should pass verification when no trust chain is configured (backwards compatible)', async () => {
    // No trust chain setup at all
    const {did: holderDID} = await DIDService.generateHolderIdentity('key');
    await DIDService.generateIssuerIdentity('ufsc.br');

    const token = await CredentialService.issueCredential(studentData, holderDID, 'sd-jwt');
    const parsed = await CredentialService.validateAndParseCredential(token);
    const presentation = await PresentationService.createPresentation(
      parsed,
      ruPexRequest,
      ['status_matricula', 'isencao_ru'],
    );

    const result = await VerificationService.validatePresentation(presentation, ruPexRequest);
    expect(result.valid).toBe(true);
    expect(result.trust_chain_valid).toBeUndefined();
  });

  it('should allow the root issuer itself to issue valid credentials', async () => {
    // Root issuer IS the credential issuer
    const {did: holderDID} = await DIDService.generateHolderIdentity('key');
    const {did: issuerDID} = await DIDService.generateIssuerIdentity('ufsc.br');

    // Root anchor uses the same DID as the issuer
    await TrustChainService.initializeRootIssuer(issuerDID, 'UFSC Root');

    const token = await CredentialService.issueCredential(studentData, holderDID, 'sd-jwt');
    const parsed = await CredentialService.validateAndParseCredential(token);
    const presentation = await PresentationService.createPresentation(
      parsed,
      ruPexRequest,
      ['status_matricula', 'isencao_ru'],
    );

    const result = await VerificationService.validatePresentation(presentation, ruPexRequest);
    expect(result.valid).toBe(true);
    expect(result.trust_chain_valid).toBe(true);
  });
});
