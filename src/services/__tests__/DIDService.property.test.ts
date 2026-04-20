/**
 * Property-Based Tests for DIDService
 *
 * Feature: carteira-identidade-academica
 * These tests validate the correctness properties of identity generation
 */

import fc from 'fast-check';
import DIDService from '../DIDService';
import StorageService from '../StorageService';
import LogService from '../LogService';
import {useAppStore} from '../../stores/useAppStore';

// Clear storage and logs before each test
beforeEach(async () => {
  await StorageService.clearAll();
  useAppStore.getState().clearLogs();
});

describe('DIDService Property-Based Tests', () => {
  /**
   * Feature: carteira-identidade-academica, Property 1: Key Generation Security
   * Validates: Requirements 1.2, 11.1
   *
   * Key pairs are now generated inside the Credo agent wallet (Aries Askar).
   * We verify that DID creation delegates to the agent and that the
   * returned DIDs have the correct format.
   */
  describe('Property 1: Key Generation Security', () => {
    it('should generate valid did:key identities via the Credo agent', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({min: 1, max: 3}),
          async (iterations) => {
            for (let i = 0; i < iterations; i++) {
              const {did, verificationMethodId} = await DIDService.createDidKey();

              expect(did).toMatch(/^did:key:z/);
              expect(verificationMethodId).toBeDefined();
              expect(typeof verificationMethodId).toBe('string');
            }
            return true;
          },
        ),
        {numRuns: 5, verbose: 0},
      );
    });

    it('should generate unique did:key identities for each invocation', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({min: 2, max: 3}),
          async (numKeys) => {
            const dids: string[] = [];

            for (let i = 0; i < numKeys; i++) {
              const {did} = await DIDService.createDidKey();
              dids.push(did);
            }

            const uniqueDids = new Set(dids);
            expect(uniqueDids.size).toBe(dids.length);
            return true;
          },
        ),
        {numRuns: 5, verbose: 0},
      );
    });

    it('should use Ed25519 algorithm (256-bit keys)', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('titular', 'emissor'),
          async (module) => {
            useAppStore.getState().clearLogs();

            if (module === 'titular') {
              await DIDService.generateHolderIdentity('key');
            } else {
              await DIDService.generateIssuerIdentity('ufsc.br');
            }

            const logs = LogService.getLogs();
            const keyGenLog = logs.find(log => log.operation === 'key_generation');

            expect(keyGenLog).toBeDefined();
            expect(keyGenLog?.details.algorithm).toBe('Ed25519');
            expect(keyGenLog?.details.key_size).toBe(256);
            return true;
          },
        ),
        {numRuns: 5, verbose: 0},
      );
    });
  });

  /**
   * Feature: carteira-identidade-academica, Property 2: DID Format Compliance
   * Validates: Requirements 1.3, 2.5
   *
   * For any generated key pair, the system SHALL create a DID that conforms
   * to either did:key or did:peer method specifications for holders, and
   * did:web specification for issuers.
   */
  describe('Property 2: DID Format Compliance', () => {
    it('should create valid did:key format via the agent', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({min: 1, max: 3}),
          async (iterations) => {
            for (let i = 0; i < iterations; i++) {
              const {did} = await DIDService.createDidKey();

              // Verify did:key format
              expect(did).toMatch(/^did:key:z/);
              expect(did.startsWith('did:key:z')).toBe(true);
            }
            return true;
          },
        ),
        {numRuns: 5, verbose: 0},
      );
    });

    it('should create valid did:peer format via the agent', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({min: 1, max: 3}),
          async (iterations) => {
            for (let i = 0; i < iterations; i++) {
              const {did} = await DIDService.createDidPeer();

              // did:peer DIDs start with did:peer:
              expect(did).toMatch(/^did:peer:/);
            }
            return true;
          },
        ),
        {numRuns: 5, verbose: 0},
      );
    });

    it('should create valid did:web format from any domain', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(
            fc.constant('ufsc.br'),
            fc.constant('example.edu'),
            fc.constant('university.org'),
            fc.constant('https://ufsc.br'),
            fc.constant('http://example.edu')
          ),
          fc.option(fc.constantFrom('identity', 'did', 'users/123'), {nil: null}),
          (domain, path) => {
            const did = DIDService.createDidWeb(domain, path ?? undefined);

            // Verify did:web format
            expect(did.startsWith('did:web:')).toBe(true);

            // Verify no protocol in DID
            expect(did).not.toContain('http://');
            expect(did).not.toContain('https://');

            // Verify path is properly encoded with colons
            if (path) {
              expect(did).toContain(':');
              // Path separators should be converted to colons
              const expectedPath = path.replace(/\//g, ':');
              expect(did).toContain(expectedPath);
            }

            return true;
          }
        ),
        {numRuns: 5, verbose: 0}
      );
    });

    it('should generate holder identity with valid did:key or did:peer', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('key', 'peer'),
          async (method) => {
            const {did, publicKey} = await DIDService.generateHolderIdentity(
              method as 'key' | 'peer'
            );

            // Verify DID format based on method
            if (method === 'key') {
              expect(did).toMatch(/^did:key:z/);
            } else {
              expect(did).toMatch(/^did:peer:/);
            }

            // publicKey is now the verification method ID (a string)
            expect(typeof publicKey).toBe('string');
            expect(publicKey.length).toBeGreaterThan(0);

            return true;
          }
        ),
        {numRuns: 5, verbose: 0}
      );
    });

    it('should generate issuer identity with valid did:web', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('ufsc.br', 'example.edu', 'university.org'),
          fc.option(fc.constantFrom('identity', 'did'), {nil: null}),
          async (domain, path) => {
            const {did, publicKey} = await DIDService.generateIssuerIdentity(
              domain,
              path ?? undefined
            );

            // Verify did:web format
            expect(did.startsWith('did:web:')).toBe(true);
            expect(did).toContain(domain);

            // publicKey is now the verification method ID (a string)
            expect(typeof publicKey).toBe('string');
            expect(publicKey.length).toBeGreaterThan(0);

            return true;
          }
        ),
        {numRuns: 5, verbose: 0}
      );
    });
  });

  /**
   * Feature: carteira-identidade-academica, Property 3: Private Key Isolation
   * Validates: Requirements 1.4, 1.7
   *
   * For any DID created, the private keys SHALL be stored in encrypted local
   * storage and SHALL never be transmitted outside the device through network
   * calls, clipboard operations, or logs.
   */
  describe('Property 3: Private Key Isolation', () => {
    it('should persist holder DID in encrypted storage', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('key', 'peer'),
          async (method) => {
            await StorageService.clearAll();

            const {did} = await DIDService.generateHolderIdentity(
              method as 'key' | 'peer',
            );

            // Verify DID is stored
            const storedDID = await StorageService.getHolderDID();
            expect(storedDID).toBe(did);

            return true;
          },
        ),
        {numRuns: 5, verbose: 0},
      );
    });

    it('should persist issuer DID in encrypted storage', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('ufsc.br', 'example.edu'),
          async (domain) => {
            await StorageService.clearAll();

            const {did} = await DIDService.generateIssuerIdentity(domain);

            // Verify DID is stored
            const storedDID = await StorageService.getIssuerDID();
            expect(storedDID).toBe(did);

            return true;
          },
        ),
        {numRuns: 5, verbose: 0},
      );
    });

    it('should never return private keys from DID generation methods', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('key', 'peer'),
          async (method) => {
            const holderResult = await DIDService.generateHolderIdentity(
              method as 'key' | 'peer',
            );

            expect(holderResult).toHaveProperty('did');
            expect(holderResult).toHaveProperty('publicKey');
            expect(holderResult).not.toHaveProperty('privateKey');

            return true;
          },
        ),
        {numRuns: 5, verbose: 0},
      );
    });

    it('should isolate holder and issuer DIDs in separate storage', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('key', 'peer'),
          async (holderMethod) => {
            await StorageService.clearAll();

            const holderResult = await DIDService.generateHolderIdentity(
              holderMethod as 'key' | 'peer',
            );
            const issuerResult =
              await DIDService.generateIssuerIdentity('ufsc.br');

            const holderDID = await StorageService.getHolderDID();
            const issuerDID = await StorageService.getIssuerDID();

            expect(holderDID).not.toBe(issuerDID);
            expect(holderDID).toBe(holderResult.did);
            expect(issuerDID).toBe(issuerResult.did);

            return true;
          },
        ),
        {numRuns: 5, verbose: 0},
      );
    });
  });

  /**
   * Feature: carteira-identidade-academica, Property 27: Key Generation Logging
   * Validates: Requirements 9.4
   *
   * For any key generation event, the log SHALL contain algorithm name,
   * key size, DID method, and timestamp.
   */
  describe('Property 27: Key Generation Logging', () => {
    it('should log all required details for holder key generation', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('key', 'peer'),
          async (method) => {
            // Clear logs
            useAppStore.getState().clearLogs();

            // Generate identity
            await DIDService.generateHolderIdentity(method as 'key' | 'peer');

            // Get logs
            const logs = LogService.getLogs();
            const keyGenLog = logs.find(log => log.operation === 'key_generation');

            // Verify log exists
            expect(keyGenLog).toBeDefined();

            // Verify required fields
            expect(keyGenLog?.id).toBeDefined();
            expect(keyGenLog?.timestamp).toBeInstanceOf(Date);
            expect(keyGenLog?.operation).toBe('key_generation');
            expect(keyGenLog?.module).toBe('titular');
            expect(keyGenLog?.success).toBe(true);

            // Verify technical details
            expect(keyGenLog?.details.algorithm).toBe('Ed25519');
            expect(keyGenLog?.details.key_size).toBe(256);
            expect(keyGenLog?.details.did_method).toBe(
              method === 'key' ? 'did:key' : 'did:peer'
            );

            return true;
          }
        ),
        {numRuns: 5, verbose: 0}
      );
    });

    it('should log all required details for issuer key generation', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('ufsc.br', 'example.edu', 'university.org'),
          async (domain) => {
            // Clear logs
            useAppStore.getState().clearLogs();

            // Generate identity
            await DIDService.generateIssuerIdentity(domain);

            // Get logs
            const logs = LogService.getLogs();
            const keyGenLog = logs.find(log => log.operation === 'key_generation');

            // Verify log exists
            expect(keyGenLog).toBeDefined();

            // Verify required fields
            expect(keyGenLog?.id).toBeDefined();
            expect(keyGenLog?.timestamp).toBeInstanceOf(Date);
            expect(keyGenLog?.operation).toBe('key_generation');
            expect(keyGenLog?.module).toBe('emissor');
            expect(keyGenLog?.success).toBe(true);

            // Verify technical details
            expect(keyGenLog?.details.algorithm).toBe('Ed25519');
            expect(keyGenLog?.details.key_size).toBe(256);
            expect(keyGenLog?.details.did_method).toBe('did:web');

            return true;
          }
        ),
        {numRuns: 5, verbose: 0}
      );
    });

    it('should log errors when key generation fails', async () => {
      // This test verifies error logging by checking the LogService directly
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('titular', 'emissor'),
          fc.constantFrom('Ed25519', 'ECDSA'),
          fc.integer({min: 256, max: 4096}),
          fc.constantFrom('did:key', 'did:peer', 'did:web'),
          (module, algorithm, keySize, didMethod) => {
            // Clear logs
            useAppStore.getState().clearLogs();

            // Create a test error
            const testError = new Error('Test key generation failure');

            // Log the error
            LogService.logKeyGeneration(
              module as 'emissor' | 'titular' | 'verificador',
              algorithm,
              keySize,
              didMethod,
              false,
              testError
            );

            // Get logs
            const logs = LogService.getLogs();
            const keyGenLog = logs.find(log => log.operation === 'key_generation');

            // Verify log exists
            expect(keyGenLog).toBeDefined();

            // Verify error is logged
            expect(keyGenLog?.success).toBe(false);
            expect(keyGenLog?.error).toBeDefined();
            expect(keyGenLog?.error?.message).toBe('Test key generation failure');

            // Verify technical details are still present
            expect(keyGenLog?.details.algorithm).toBe(algorithm);
            expect(keyGenLog?.details.key_size).toBe(keySize);
            expect(keyGenLog?.details.did_method).toBe(didMethod);

            return true;
          }
        ),
        {numRuns: 5, verbose: 0}
      );
    });

    it('should maintain chronological order of key generation logs', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({min: 2, max: 3}),
          async (numGenerations) => {
            // Clear logs
            useAppStore.getState().clearLogs();

            // Generate multiple identities
            for (let i = 0; i < numGenerations; i++) {
              if (i % 2 === 0) {
                await DIDService.generateHolderIdentity('key');
              } else {
                await DIDService.generateIssuerIdentity('ufsc.br');
              }

              // Small delay to ensure different timestamps
              await new Promise(resolve => setTimeout(resolve, 2));
            }

            // Get logs
            const logs = LogService.getLogs();
            const keyGenLogs = logs.filter(log => log.operation === 'key_generation');

            // Verify we have the correct number of logs
            expect(keyGenLogs.length).toBe(numGenerations);

            // Verify chronological ordering
            for (let i = 1; i < keyGenLogs.length; i++) {
              const prevTimestamp = keyGenLogs[i - 1].timestamp.getTime();
              const currTimestamp = keyGenLogs[i].timestamp.getTime();
              expect(currTimestamp).toBeGreaterThanOrEqual(prevTimestamp);
            }

            return true;
          }
        ),
        {numRuns: 3, verbose: 0}
      );
    });
  });
});
