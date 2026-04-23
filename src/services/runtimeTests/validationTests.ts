import DIDService from '../DIDService';
import CredentialService from '../CredentialService';
import CryptoService from '../CryptoService';
import StorageService from '../StorageService';
import VerificationService from '../VerificationService';
import type {RuntimeTestCase} from '../../types/runtime-tests';
import {minimalStudentData} from './fixtures';
import {
  assertDefined,
  assertEqual,
  assert,
  assertRejects,
  assertThrows,
  assertMatch,
} from './assertions';

/**
 * P0 — Validation, nonce generation, composite hash, and credential management tests.
 */
const validationTests: RuntimeTestCase[] = [
  // ── P0: validateStudentData() rejection paths ──────────────────
  {
    id: 'validate-missing-field',
    name: 'validateStudentData rejects missing required fields',
    category: 'credential',
    run: async () => {
      const incomplete = {...minimalStudentData, cpf: ''};
      assertThrows(
        () => CredentialService.validateStudentData(incomplete),
        'Empty CPF should throw ValidationError',
      );
    },
  },
  {
    id: 'validate-invalid-cpf',
    name: 'validateStudentData rejects non-11-digit CPF',
    category: 'credential',
    run: async () => {
      const badCPF = {...minimalStudentData, cpf: '123'};
      assertThrows(
        () => CredentialService.validateStudentData(badCPF),
        'Short CPF should throw ValidationError',
      );

      const letterCPF = {...minimalStudentData, cpf: '1234567890A'};
      assertThrows(
        () => CredentialService.validateStudentData(letterCPF),
        'Letter in CPF should throw ValidationError',
      );
    },
  },
  {
    id: 'validate-invalid-date',
    name: 'validateStudentData rejects invalid dates (Feb 30, month 13)',
    category: 'credential',
    run: async () => {
      const feb30 = {...minimalStudentData, data_nascimento: '2000-02-30'};
      assertThrows(
        () => CredentialService.validateStudentData(feb30),
        'Feb 30 should throw ValidationError',
      );

      const month13 = {...minimalStudentData, data_nascimento: '2000-13-01'};
      assertThrows(
        () => CredentialService.validateStudentData(month13),
        'Month 13 should throw ValidationError',
      );

      const badFormat = {...minimalStudentData, data_nascimento: '01/01/2000'};
      assertThrows(
        () => CredentialService.validateStudentData(badFormat),
        'Non-ISO date should throw ValidationError',
      );
    },
  },
  {
    id: 'validate-invalid-status',
    name: 'validateStudentData rejects invalid enrollment status',
    category: 'credential',
    run: async () => {
      const badStatus = {...minimalStudentData, status_matricula: 'Suspenso' as any};
      assertThrows(
        () => CredentialService.validateStudentData(badStatus),
        'Invalid status should throw ValidationError',
      );
    },
  },
  {
    id: 'validate-valid-data-passes',
    name: 'validateStudentData accepts correct data',
    category: 'credential',
    run: async () => {
      // Should NOT throw
      CredentialService.validateStudentData(minimalStudentData);
    },
  },

  // ── P0: computeCompositeHash ──────────────────────────────────
  {
    id: 'crypto-composite-hash',
    name: 'computeCompositeHash produces deterministic hex output',
    category: 'crypto',
    run: async () => {
      const h1 = await CryptoService.computeCompositeHash(['hello', 'world']);
      assertDefined(h1, 'hash result');
      assertMatch(h1, /^[0-9a-f]{64}$/, 'SHA-256 hex');

      const h2 = await CryptoService.computeCompositeHash(['hello', 'world']);
      assertEqual(h1, h2, 'deterministic');

      // Different input → different hash
      const h3 = await CryptoService.computeCompositeHash(['world', 'hello']);
      assert(h1 !== h3, 'Order should matter');
    },
  },
  {
    id: 'crypto-composite-hash-bytes',
    name: 'computeCompositeHash accepts Uint8Array inputs',
    category: 'crypto',
    run: async () => {
      const h1 = await CryptoService.computeCompositeHash([
        new TextEncoder().encode('hello'),
        new TextEncoder().encode('world'),
      ]);
      const h2 = await CryptoService.computeCompositeHash(['hello', 'world']);
      assertEqual(h1, h2, 'string and Uint8Array inputs should produce same hash');
    },
  },

  // ── P0: generateNonce CSPRNG ──────────────────────────────────
  {
    id: 'crypto-nonce-csprng',
    name: 'generateNonce produces unique 64-char hex nonces on-device',
    category: 'crypto',
    run: async () => {
      const n1 = CryptoService.generateNonce();
      assertDefined(n1, 'nonce 1');
      assertMatch(n1, /^[0-9a-f]{64}$/, 'nonce hex format');

      const n2 = CryptoService.generateNonce();
      assert(n1 !== n2, 'Two nonces must be unique');
    },
  },

  // ── P1: deleteCredential bounds checking ──────────────────────
  {
    id: 'storage-delete-bounds',
    name: 'deleteCredential rejects out-of-bounds index',
    category: 'credential',
    run: async () => {
      const {did: holderDID} = await DIDService.generateHolderIdentity('key');
      await DIDService.generateIssuerIdentity('ufsc.br');

      const token = await CredentialService.issueCredential(
        minimalStudentData,
        holderDID,
        'sd-jwt',
      );
      await StorageService.storeCredential(token);

      await assertRejects(
        () => StorageService.deleteCredential(-1),
        'Negative index should throw',
      );
      await assertRejects(
        () => StorageService.deleteCredential(999),
        'Beyond-length index should throw',
      );

      // Valid delete still works
      await StorageService.deleteCredential(0);
      const remaining = await StorageService.getCredentials();
      assertEqual(remaining.length, 0, 'no credentials remaining');
    },
  },

  // ── P1: Issuer key storage round-trip ─────────────────────────
  {
    id: 'storage-issuer-keys',
    name: 'Issuer keys stored and retrievable',
    category: 'identity',
    run: async () => {
      const {did: issuerDID, publicKey} = await DIDService.generateIssuerIdentity('ufsc.br');
      assertDefined(issuerDID, 'issuerDID');

      const storedDID = await StorageService.getIssuerDID();
      assertEqual(storedDID, issuerDID, 'stored issuerDID');

      const storedPK = await StorageService.getIssuerPublicKey();
      assertEqual(storedPK, publicKey, 'stored issuerPublicKey');

      const storedPrivate = await StorageService.getIssuerPrivateKey();
      assertDefined(storedPrivate, 'stored issuerPrivateKey');
      assertEqual(storedPrivate!.length, 64, 'issuer privateKey length');
    },
  },

  // ── P0: ScenarioCatalog.generateChallenge ─────────────────────
  {
    id: 'scenario-generate-challenge-ru',
    name: 'generateChallenge builds valid PEX for RU scenario',
    category: 'verification',
    run: async () => {
      const pex = await VerificationService.generateChallenge('ru');
      assertDefined(pex, 'PEX request');
      assertEqual(pex.type, 'PresentationExchange', 'type');
      assertEqual(pex.version, '1.0.0', 'version');
      assertDefined(pex.challenge, 'challenge');
      assertMatch(pex.challenge, /^[0-9a-f]{64}$/, 'challenge is nonce');
      assertDefined(pex.presentation_definition, 'presentation_definition');
      assert(
        pex.presentation_definition.input_descriptors.length > 0,
        'has input descriptors',
      );
    },
  },
  {
    id: 'scenario-generate-challenge-elections',
    name: 'generateChallenge builds PEX with predicates for elections',
    category: 'verification',
    run: async () => {
      const pex = await VerificationService.generateChallenge('elections', {
        election_id: 'test_election_2024',
      });
      assertDefined(pex.predicates, 'predicates');
      assert(pex.predicates!.length > 0, 'has predicates');
      assertEqual(pex.election_id, 'test_election_2024', 'election_id');
    },
  },
  {
    id: 'scenario-generate-challenge-lab',
    name: 'generateChallenge builds PEX with resource_id for lab',
    category: 'verification',
    run: async () => {
      const pex = await VerificationService.generateChallenge('lab_access', {
        resource_id: 'Lab 101',
      });
      assertEqual(pex.resource_id, 'Lab 101', 'resource_id');
      assertDefined(pex.presentation_definition, 'presentation_definition');
    },
  },
  {
    id: 'scenario-generate-challenge-invalid',
    name: 'generateChallenge rejects unknown scenario',
    category: 'verification',
    run: async () => {
      await assertRejects(
        () => VerificationService.generateChallenge('nonexistent'),
        'Unknown scenario should throw',
      );
    },
  },
];

export default validationTests;
