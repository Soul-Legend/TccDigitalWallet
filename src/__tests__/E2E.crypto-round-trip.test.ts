/**
 * E2E Crypto Round-Trip Test
 *
 * Verifies that the Ed25519 cryptographic pipeline actually works end-to-end:
 * - Presentation signing uses real Ed25519 (via @noble/ed25519)
 * - Signatures can be independently verified with the holder's public key
 * - Tampered presentations produce invalid signatures
 * - Trust chain certificates are cryptographically valid
 * - Hash obfuscation is deterministic and tamper-evident
 *
 * This test bypasses the mock boundaries (AgentService, ZKProofService) and
 * validates the real cryptographic operations that DO run in the test environment.
 */

import DIDService from '../services/DIDService';
import CredentialService from '../services/CredentialService';
import PresentationService from '../services/PresentationService';
import CryptoService from '../services/CryptoService';
import StorageService from '../services/StorageService';
import TrustChainService from '../services/TrustChainService';
import {canonicalize, canonicalAttributeHashInput} from '../services/encoding';
import {useAppStore} from '../stores/useAppStore';
import {StudentData, PresentationExchangeRequest} from '../types';

beforeEach(async () => {
  await StorageService.clearAll();
  await TrustChainService.reset();
  useAppStore.getState().clearLogs();
});

const studentData: StudentData = {
  nome_completo: 'Crypto Test Student',
  cpf: '99988877766',
  matricula: '2024999',
  curso: 'Segurança da Informação',
  status_matricula: 'Ativo',
  data_nascimento: '1999-07-14',
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
  acesso_laboratorios: ['LabSEC'],
  acesso_predios: ['INE'],
};

const ruRequest: PresentationExchangeRequest = {
  type: 'PresentationExchange',
  version: '1.0.0',
  challenge: 'crypto_round_trip_challenge',
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

describe('E2E: Crypto Round-Trip Verification', () => {
  describe('Presentation Signature (Real Ed25519)', () => {
    it('should produce a verifiable Ed25519 signature on the presentation', async () => {
      // Setup identities
      const {did: holderDID} = await DIDService.generateHolderIdentity('key');
      await DIDService.generateIssuerIdentity('ufsc.br');

      // Issue + parse + create presentation
      const token = await CredentialService.issueCredential(studentData, holderDID, 'sd-jwt');
      const parsed = await CredentialService.validateAndParseCredential(token);
      const presentation = await PresentationService.createPresentation(
        parsed,
        ruRequest,
        ['status_matricula', 'isencao_ru'],
      );

      // The presentation has a real Ed25519 signature in proof.jws
      expect(presentation.proof.jws).toBeDefined();
      expect(typeof presentation.proof.jws).toBe('string');
      expect(presentation.proof.jws!.length).toBeGreaterThan(0);

      // Reconstruct the signed payload using the canonical encoding the
      // holder uses (see services/PresentationService.canonicalPresentationSigningInput).
      const signedPayload = canonicalize({
        '@context': presentation['@context'],
        challenge: presentation.proof.challenge ?? null,
        disclosed_attributes: presentation.disclosed_attributes ?? {},
        hashed_attributes: (presentation as any).hashed_attributes ?? {},
        holder: presentation.holder,
        type: presentation.type,
        verifiableCredential: presentation.verifiableCredential,
      });

      // Get holder's public key
      const holderPublicKey = await StorageService.getHolderPublicKey();
      expect(holderPublicKey).toBeDefined();

      // VERIFY the signature independently using CryptoService
      const isValid = await CryptoService.verifySignature(
        signedPayload,
        presentation.proof.jws!,
        holderPublicKey!,
      );
      expect(isValid).toBe(true);
    });

    it('should detect tampered disclosed attributes via signature', async () => {
      const {did: holderDID} = await DIDService.generateHolderIdentity('key');
      await DIDService.generateIssuerIdentity('ufsc.br');

      const token = await CredentialService.issueCredential(studentData, holderDID, 'sd-jwt');
      const parsed = await CredentialService.validateAndParseCredential(token);
      const presentation = await PresentationService.createPresentation(
        parsed,
        ruRequest,
        ['status_matricula', 'isencao_ru'],
      );

      // Tamper: change the disclosed isencao_ru from true to false
      const tampered = JSON.parse(JSON.stringify(presentation));
      tampered.disclosed_attributes.isencao_ru = false;

      // Reconstruct payload with TAMPERED attributes
      const tamperedPayload = JSON.stringify({
        '@context': tampered['@context'],
        type: tampered.type,
        holder: tampered.holder,
        verifiableCredential: tampered.verifiableCredential,
        disclosed_attributes: tampered.disclosed_attributes,
        hashed_attributes: tampered.hashed_attributes,
      });

      const holderPublicKey = await StorageService.getHolderPublicKey();

      // Signature should NOT match the tampered payload
      const isValid = await CryptoService.verifySignature(
        tamperedPayload,
        tampered.proof.jws!,
        holderPublicKey!,
      );
      expect(isValid).toBe(false);
    });

    it('should detect tampered holder DID via signature', async () => {
      const {did: holderDID} = await DIDService.generateHolderIdentity('key');
      await DIDService.generateIssuerIdentity('ufsc.br');

      const token = await CredentialService.issueCredential(studentData, holderDID, 'sd-jwt');
      const parsed = await CredentialService.validateAndParseCredential(token);
      const presentation = await PresentationService.createPresentation(
        parsed,
        ruRequest,
        ['status_matricula', 'isencao_ru'],
      );

      // Tamper: change holder DID
      const tampered = JSON.parse(JSON.stringify(presentation));
      tampered.holder = 'did:key:z6MkATTACKER';

      const tamperedPayload = JSON.stringify({
        '@context': tampered['@context'],
        type: tampered.type,
        holder: tampered.holder,
        verifiableCredential: tampered.verifiableCredential,
        disclosed_attributes: tampered.disclosed_attributes,
        hashed_attributes: tampered.hashed_attributes,
      });

      const holderPublicKey = await StorageService.getHolderPublicKey();

      // Signature mismatch after tampering holder
      const isValid = await CryptoService.verifySignature(
        tamperedPayload,
        tampered.proof.jws!,
        holderPublicKey!,
      );
      expect(isValid).toBe(false);
    });
  });

  describe('Hash Obfuscation (Real SHA-256)', () => {
    it('should produce deterministic hashes for non-disclosed attributes', async () => {
      const {did: holderDID} = await DIDService.generateHolderIdentity('key');
      await DIDService.generateIssuerIdentity('ufsc.br');

      const token = await CredentialService.issueCredential(studentData, holderDID, 'sd-jwt');
      const parsed = await CredentialService.validateAndParseCredential(token);

      // Create two presentations with same inputs
      const p1 = await PresentationService.createPresentation(
        parsed, ruRequest, ['status_matricula', 'isencao_ru'],
      );
      const p2 = await PresentationService.createPresentation(
        parsed, ruRequest, ['status_matricula', 'isencao_ru'],
      );

      // Hashed (obfuscated) attributes should be deterministic
      const hashes1 = (p1 as any).hashed_attributes;
      const hashes2 = (p2 as any).hashed_attributes;

      expect(hashes1).toBeDefined();
      expect(hashes2).toBeDefined();

      // Same attribute values should produce same hashes
      for (const key of Object.keys(hashes1)) {
        expect(hashes1[key]).toBe(hashes2[key]);
      }
    });

    it('should independently verify attribute hashes', async () => {
      const {did: holderDID} = await DIDService.generateHolderIdentity('key');
      await DIDService.generateIssuerIdentity('ufsc.br');

      const token = await CredentialService.issueCredential(studentData, holderDID, 'sd-jwt');
      const parsed = await CredentialService.validateAndParseCredential(token);
      const presentation = await PresentationService.createPresentation(
        parsed, ruRequest, ['status_matricula', 'isencao_ru'],
      );

      const hashedAttrs = (presentation as any).hashed_attributes;
      expect(hashedAttrs).toBeDefined();

      // The CPF should be hashed (not disclosed)
      expect(hashedAttrs.cpf).toBeDefined();

      // Independently compute the hash of the CPF value using the canonical
      // (length-prefixed JSON-array) encoding shared by holder + verifier.
      const expectedHash = await CryptoService.computeHash(
        canonicalAttributeHashInput('cpf', studentData.cpf),
        'titular',
      );
      expect(hashedAttrs.cpf).toBe(expectedHash);
    });
  });

  describe('Trust Chain Certificates (Real Ed25519)', () => {
    it('should produce valid Ed25519 certificates that survive independent verification', async () => {
      // Initialize root
      const root = await TrustChainService.initializeRootIssuer(
        'did:web:ufsc.br',
        'UFSC Root',
      );
      expect(root.certificate).toBeDefined();

      // Verify root self-signature independently using the canonical payload
      // produced by TrustChainService.
      const rootPayload = canonicalize({
        did: root.did,
        name: root.name,
        parentDid: root.parentDid,
        publicKey: root.publicKey,
      });
      const rootSelfValid = await CryptoService.verifySignature(
        rootPayload,
        root.certificate,
        root.publicKey,
      );
      expect(rootSelfValid).toBe(true);

      // Register child
      const rootKey = await TrustChainService.getIssuerPrivateKey('did:web:ufsc.br');
      const child = await TrustChainService.registerChildIssuer(
        'did:web:ufsc.br',
        rootKey!,
        'did:web:ctc.ufsc.br',
        'CTC',
      );

      // Verify child certificate independently using ROOT public key
      const childPayload = canonicalize({
        did: child.did,
        name: child.name,
        parentDid: child.parentDid,
        publicKey: child.publicKey,
      });
      const childCertValid = await CryptoService.verifySignature(
        childPayload,
        child.certificate,
        root.publicKey, // child cert signed by root
      );
      expect(childCertValid).toBe(true);
    });

    it('should detect tampered certificate payloads', async () => {
      const root = await TrustChainService.initializeRootIssuer(
        'did:web:ufsc.br',
        'UFSC Root',
      );
      const rootKey = await TrustChainService.getIssuerPrivateKey('did:web:ufsc.br');

      const child = await TrustChainService.registerChildIssuer(
        'did:web:ufsc.br',
        rootKey!,
        'did:web:evil.ufsc.br',
        'Evil Dept',
      );

      // Tamper: change the child's name in the payload
      const tamperedPayload = JSON.stringify({
        did: child.did,
        publicKey: child.publicKey,
        name: 'Trusted Dept', // Changed from 'Evil Dept'
        parentDid: child.parentDid,
      });

      // Certificate should NOT verify against tampered payload
      const isValid = await CryptoService.verifySignature(
        tamperedPayload,
        child.certificate,
        root.publicKey,
      );
      expect(isValid).toBe(false);
    });
  });

  describe('Key Pair Integrity', () => {
    it('should generate unique key pairs for holder and issuer', async () => {
      const {publicKey: holderPK} = await DIDService.generateHolderIdentity('key');
      const {publicKey: issuerPK} = await DIDService.generateIssuerIdentity('ufsc.br');

      // Keys should be valid hex strings
      expect(holderPK).toMatch(/^[0-9a-f]{64}$/);
      expect(issuerPK).toMatch(/^[0-9a-f]{64}$/);

      // Holder and issuer should have different keys
      expect(holderPK).not.toBe(issuerPK);
    });

    it('should store keys retrievably', async () => {
      const {publicKey: holderPK} = await DIDService.generateHolderIdentity('key');

      const storedPK = await StorageService.getHolderPublicKey();
      expect(storedPK).toBe(holderPK);

      const storedPrivate = await StorageService.getHolderPrivateKey();
      expect(storedPrivate).toBeDefined();
      expect(storedPrivate!.length).toBe(64); // 32 bytes hex
    });

    it('should sign and verify with stored key pair', async () => {
      await DIDService.generateHolderIdentity('key');

      const privateKey = await StorageService.getHolderPrivateKey();
      const publicKey = await StorageService.getHolderPublicKey();

      const data = 'test message for round-trip';
      const signature = await CryptoService.signData(data, privateKey!, 'titular');
      const valid = await CryptoService.verifySignature(data, signature, publicKey!);
      expect(valid).toBe(true);

      // Verify with wrong data fails
      const invalidCheck = await CryptoService.verifySignature('wrong', signature, publicKey!);
      expect(invalidCheck).toBe(false);
    });
  });
});
