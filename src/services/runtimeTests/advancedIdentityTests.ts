import DIDService from '../DIDService';
import StorageService from '../StorageService';
import TrustChainService from '../TrustChainService';
import type {RuntimeTestCase} from '../../types/runtime-tests';
import {
  assertEqual,
  assert,
} from './assertions';

/**
 * P1 — DID method edge cases, trust chain idempotency, concurrent storage, nullifier dedup.
 */
const advancedIdentityTests: RuntimeTestCase[] = [
  // ── P1: did:web edge cases ────────────────────────────────────
  {
    id: 'didweb-port-encoding',
    name: 'did:web encodes port correctly (%3A)',
    category: 'identity',
    run: async () => {
      const did = DIDService.createDidWeb('ufsc.br:8443');
      assertEqual(did, 'did:web:ufsc.br%3A8443', 'port encoding');
    },
  },
  {
    id: 'didweb-strip-scheme',
    name: 'did:web strips https:// prefix',
    category: 'identity',
    run: async () => {
      const did = DIDService.createDidWeb('https://ufsc.br');
      assertEqual(did, 'did:web:ufsc.br', 'scheme stripped');
    },
  },
  {
    id: 'didweb-path-segments',
    name: 'did:web converts path segments to colons',
    category: 'identity',
    run: async () => {
      const did = DIDService.createDidWeb('ufsc.br', 'departamentos/ine');
      assertEqual(did, 'did:web:ufsc.br:departamentos:ine', 'path to colons');
    },
  },
  {
    id: 'didweb-invalid-domain',
    name: 'did:web rejects invalid domains',
    category: 'identity',
    run: async () => {
      let threw = false;
      try {
        DIDService.createDidWeb('');
      } catch {
        threw = true;
      }
      assert(threw, 'Empty domain should throw');

      threw = false;
      try {
        DIDService.createDidWeb('not a valid domain!');
      } catch {
        threw = true;
      }
      assert(threw, 'Invalid domain should throw');
    },
  },

  // ── P1: Trust chain root idempotency ──────────────────────────
  {
    id: 'trust-root-idempotent',
    name: 'initializeRootIssuer is idempotent',
    category: 'trust-chain',
    run: async () => {
      const root1 = await TrustChainService.initializeRootIssuer(
        'did:web:ufsc.br',
        'UFSC Root',
      );
      const root2 = await TrustChainService.initializeRootIssuer(
        'did:web:ufsc.br',
        'UFSC Root',
      );
      assertEqual(root1.did, root2.did, 'same DID');
      assertEqual(root1.publicKey, root2.publicKey, 'same publicKey');
      assertEqual(root1.certificate, root2.certificate, 'same certificate');
    },
  },

  // ── P1: Trust chain isTrustedIssuer direct check ──────────────
  {
    id: 'trust-is-trusted-issuer',
    name: 'isTrustedIssuer checks chain membership',
    category: 'trust-chain',
    run: async () => {
      await TrustChainService.initializeRootIssuer('did:web:ufsc.br', 'UFSC Root');
      const rootKey = await TrustChainService.getIssuerPrivateKey('did:web:ufsc.br');
      await TrustChainService.registerChildIssuer(
        'did:web:ufsc.br',
        rootKey!,
        'did:web:ctc.ufsc.br',
        'CTC',
      );

      const trustedResult = await TrustChainService.verifyTrustChain('did:web:ctc.ufsc.br');
      assert(trustedResult.trusted, 'Registered child should be trusted');

      const untrustedResult = await TrustChainService.verifyTrustChain('did:web:evil.com');
      assert(!untrustedResult.trusted, 'Unregistered issuer should not be trusted');
    },
  },

  // ── P1: Storage concurrent access (withLock serialization) ────
  {
    id: 'storage-concurrent-writes',
    name: 'Concurrent credential stores serialize correctly',
    category: 'credential',
    run: async () => {
      const {did: holderDID} = await DIDService.generateHolderIdentity('key');
      await DIDService.generateIssuerIdentity('ufsc.br');

      // Issue 5 credentials
      const tokens: string[] = [];
      for (let i = 0; i < 5; i++) {
        const cred = await CredentialService.issueCredential(
          {
            ...minimalStudentData,
            nome_completo: `User ${i}`,
            cpf: `${i}`.padStart(11, '0'),
          },
          holderDID,
          'sd-jwt',
        );
        tokens.push(cred);
      }

      // Store all concurrently
      await Promise.all(tokens.map(t => StorageService.storeCredential(t)));

      const stored = await StorageService.getCredentials();
      assertEqual(stored.length, 5, 'all 5 credentials stored despite concurrency');
    },
  },

  // ── P1: Nullifier deduplication ───────────────────────────────
  {
    id: 'storage-nullifier-dedup',
    name: 'storeNullifier deduplicates identical nullifiers',
    category: 'verification',
    run: async () => {
      const electionId = `dedup_test_${Date.now()}`;
      const nullifier = 'deadbeef1234567890';

      await StorageService.storeNullifier(nullifier, electionId);
      await StorageService.storeNullifier(nullifier, electionId); // duplicate

      const stored = await StorageService.getNullifiers(electionId);
      assertEqual(stored.length, 1, 'duplicates should be suppressed');
      assertEqual(stored[0], nullifier, 'stored nullifier value');
    },
  },
];

// Need CredentialService for the concurrent test
import CredentialService from '../CredentialService';
import {minimalStudentData} from './fixtures';

export default advancedIdentityTests;
