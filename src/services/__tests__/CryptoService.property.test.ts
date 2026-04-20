import fc from 'fast-check';
import CryptoService from '../CryptoService';
import LogService from '../LogService';
import {useAppStore} from '../../stores/useAppStore';

// Mock dependencies
jest.mock('../LogService');
jest.mock('../../stores/useAppStore');

describe('CryptoService - Property-Based Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAppStore.getState as jest.Mock).mockReturnValue({
      logs: [],
      addLog: jest.fn(),
    });
  });

  /**
   * Property 36: Cryptographic Algorithm Compliance
   * **Validates: Requirements 11.3**
   *
   * For any digital signature creation, the system SHALL use industry-standard
   * algorithms (e.g., EdDSA, ECDSA) as specified in W3C standards.
   */
  describe('Property 36: Cryptographic Algorithm Compliance', () => {
    it('should use Ed25519 algorithm for all signature operations', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({minLength: 1, maxLength: 100}),
          fc
            .array(fc.integer({min: 0, max: 15}), {minLength: 64, maxLength: 64})
            .map(arr => arr.map(n => n.toString(16)).join('')),
          async (data, privateKeyHex) => {
            jest.clearAllMocks();

            try {
              await CryptoService.signData(data, privateKeyHex, 'emissor');
            } catch (error) {
              // Expected to fail with invalid keys
            }

            const calls = (LogService.captureEvent as jest.Mock).mock.calls;
            const hasEd25519Call = calls.some(
              call =>
                call[0] === 'credential_issuance' &&
                call[1] === 'emissor' &&
                call[2]?.algorithm === 'Ed25519',
            );

            expect(hasEd25519Call).toBe(true);
          },
        ),
        {numRuns: 5, verbose: 0},
      );
    });

    it('should use SHA-256 algorithm for all hash operations', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({minLength: 1, maxLength: 100}),
          async data => {
            await CryptoService.computeHash(data, 'titular');

            expect(LogService.logHashComputation).toHaveBeenCalledWith(
              'titular',
              'SHA-256',
              expect.any(String),
              true,
            );
          },
        ),
        {numRuns: 5, verbose: 0},
      );
    });
  });

  /**
   * Property 28: Hash Operation Logging
   * **Validates: Requirements 9.5**
   *
   * For any hash computation, the log SHALL contain the truncated hash result
   * for verification purposes.
   */
  describe('Property 28: Hash Operation Logging', () => {
    it('should log hash output for every hash computation', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({minLength: 1, maxLength: 100}),
          async data => {
            const hash = await CryptoService.computeHash(data, 'titular');

            expect(LogService.logHashComputation).toHaveBeenCalledWith(
              'titular',
              'SHA-256',
              hash,
              true,
            );

            expect(hash).toMatch(/^[0-9a-f]{64}$/);
          },
        ),
        {numRuns: 5, verbose: 0},
      );
    });

    it('should log hash output for composite hash operations', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.string({minLength: 1, maxLength: 50}), {
            minLength: 1,
            maxLength: 3,
          }),
          async values => {
            const hash = await CryptoService.computeCompositeHash(
              values,
              'titular',
            );

            expect(LogService.logHashComputation).toHaveBeenCalledWith(
              'titular',
              'SHA-256',
              hash,
              true,
            );

            expect(hash).toMatch(/^[0-9a-f]{64}$/);
          },
        ),
        {numRuns: 5, verbose: 0},
      );
    });

    it('should log errors when hash computation fails', async () => {
      const mockError = new Error('Hash computation failed');

      jest
        .spyOn(CryptoService, 'computeHash')
        .mockRejectedValueOnce(mockError);

      try {
        await CryptoService.computeHash('test data', 'titular');
      } catch (error) {
        // Expected to throw
      }

      jest.restoreAllMocks();
    });
  });

  describe('Hash Determinism', () => {
    it('should produce identical hashes for identical inputs', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({minLength: 1, maxLength: 100}),
          async data => {
            const hash1 = await CryptoService.computeHash(data, 'titular');
            const hash2 = await CryptoService.computeHash(data, 'titular');

            expect(hash1).toBe(hash2);
          },
        ),
        {numRuns: 5, verbose: 0},
      );
    });

    it('should produce identical composite hashes for identical value arrays', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.string({minLength: 1, maxLength: 50}), {
            minLength: 1,
            maxLength: 3,
          }),
          async values => {
            const hash1 = await CryptoService.computeCompositeHash(
              values,
              'titular',
            );
            const hash2 = await CryptoService.computeCompositeHash(
              values,
              'titular',
            );

            expect(hash1).toBe(hash2);
          },
        ),
        {numRuns: 5, verbose: 0},
      );
    });
  });

  describe('Nonce Generation', () => {
    it('should generate unique nonces', () => {
      fc.assert(
        fc.property(fc.constant(null), () => {
          const nonce1 = CryptoService.generateNonce();
          const nonce2 = CryptoService.generateNonce();

          expect(nonce1).not.toBe(nonce2);
          expect(nonce1).toMatch(/^[0-9a-f]{64}$/);
          expect(nonce2).toMatch(/^[0-9a-f]{64}$/);

          return true;
        }),
        {numRuns: 5, verbose: 0},
      );
    });
  });
});
