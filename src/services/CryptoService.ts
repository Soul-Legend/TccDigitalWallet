import {sha256} from '@noble/hashes/sha256';
import * as ed from '@noble/ed25519';
import {sha512} from '@noble/hashes/sha512';
import {CryptoError} from './ErrorHandler';
import LogServiceInstance from './LogService';
import type {ILogService} from '../types';

// @noble/ed25519 v3+ requires configuring SHA-512 (no crypto.subtle in RN)
ed.hashes.sha512 = sha512;
ed.hashes.sha512Async = async (...msgs: Uint8Array[]) =>
  sha512(ed.etc.concatBytes(...msgs));

/**
 * CryptoService - Handles cryptographic operations
 *
 * Uses @noble/hashes for SHA-256 hashing and @noble/ed25519 for signatures.
 * Both are pure JavaScript libraries that work on React Native (Hermes).
 */

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function fromHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

class CryptoService {
  private readonly logger: ILogService;

  constructor(logger: ILogService = LogServiceInstance) {
    this.logger = logger;
  }

  /**
   * Computes SHA-256 hash of input data
   */
  async computeHash(
    data: string | Uint8Array,
    module: 'emissor' | 'titular' | 'verificador' = 'titular',
  ): Promise<string> {
    try {
      const dataBytes =
        typeof data === 'string' ? new TextEncoder().encode(data) : data;
      const hashBytes = sha256(dataBytes);
      const hashOutput = toHex(hashBytes);

      this.logger.logHashComputation(module, 'SHA-256', hashOutput, true);
      return hashOutput;
    } catch (error) {
      this.logger.logHashComputation(
        module,
        'SHA-256',
        '',
        false,
        error instanceof Error ? error : new Error(String(error)),
      );
      throw new CryptoError('Failed to compute hash', 'hash', {error});
    }
  }

  /**
   * Signs data using Ed25519 private key via @noble/ed25519
   */
  async signData(
    data: string | Uint8Array,
    privateKeyHex: string,
    module: 'emissor' | 'titular' | 'verificador' = 'emissor',
  ): Promise<string> {
    try {
      const privateKeyBytes = fromHex(privateKeyHex);
      const dataBytes =
        typeof data === 'string' ? new TextEncoder().encode(data) : data;

      const signature = await ed.signAsync(dataBytes, privateKeyBytes);
      const signatureHex = toHex(signature);

      this.logger.captureEvent(
        'credential_issuance',
        module,
        {
          algorithm: 'Ed25519',
          parameters: {
            data_length: dataBytes.length,
            signature_length: signature.length,
          },
        },
        true,
      );

      return signatureHex;
    } catch (error) {
      this.logger.captureEvent(
        'credential_issuance',
        module,
        {algorithm: 'Ed25519'},
        false,
        error instanceof Error ? error : new Error(String(error)),
      );
      throw new CryptoError('Failed to sign data', 'signature', {error});
    }
  }

  /**
   * Verifies a signature using Ed25519 public key via @noble/ed25519
   */
  async verifySignature(
    data: string | Uint8Array,
    signatureHex: string,
    publicKeyHex: string,
    _module: 'emissor' | 'titular' | 'verificador' = 'verificador',
  ): Promise<boolean> {
    try {
      const publicKeyBytes = fromHex(publicKeyHex);
      const signatureBytes = fromHex(signatureHex);
      const dataBytes =
        typeof data === 'string' ? new TextEncoder().encode(data) : data;

      const isValid = await ed.verifyAsync(
        signatureBytes,
        dataBytes,
        publicKeyBytes,
      );

      this.logger.logVerification('Ed25519', isValid, true, {
        data_length: dataBytes.length,
        signature_length: signatureBytes.length,
      });

      return isValid;
    } catch (error) {
      this.logger.logVerification(
        'Ed25519',
        false,
        false,
        undefined,
        error instanceof Error ? error : new Error(String(error)),
      );
      throw new CryptoError('Failed to verify signature', 'verification', {
        error,
      });
    }
  }

  /**
   * Computes SHA-256 hash of multiple values concatenated
   */
  async computeCompositeHash(
    values: (string | Uint8Array)[],
    module: 'emissor' | 'titular' | 'verificador' = 'titular',
  ): Promise<string> {
    try {
      const parts: Uint8Array[] = [];
      for (const value of values) {
        parts.push(
          typeof value === 'string' ? new TextEncoder().encode(value) : value,
        );
      }
      const totalLen = parts.reduce((sum, p) => sum + p.length, 0);
      const combined = new Uint8Array(totalLen);
      let offset = 0;
      for (const p of parts) {
        combined.set(p, offset);
        offset += p.length;
      }
      const hashOutput = toHex(sha256(combined));

      this.logger.logHashComputation(module, 'SHA-256', hashOutput, true);
      return hashOutput;
    } catch (error) {
      this.logger.logHashComputation(
        module,
        'SHA-256',
        '',
        false,
        error instanceof Error ? error : new Error(String(error)),
      );
      throw new CryptoError('Failed to compute composite hash', 'hash', {
        error,
      });
    }
  }

  /**
   * Generates a cryptographic nonce (random challenge)
   */
  generateNonce(): string {
    const array = new Uint8Array(32);
    // Use crypto.getRandomValues polyfilled by react-native-get-random-values
    if (typeof globalThis.crypto?.getRandomValues === 'function') {
      globalThis.crypto.getRandomValues(array);
    } else {
      // SECURITY: Refuse to generate nonces without a CSPRNG.
      // Math.random() is NOT cryptographically secure and must never
      // be used for nonce/challenge generation. Ensure the polyfill
      // react-native-get-random-values is imported at app entry point.
      throw new CryptoError(
        'Secure random number generator unavailable. ' +
        'Ensure react-native-get-random-values is imported before using CryptoService.',
        'nonce_generation',
      );
    }
    return toHex(array);
  }
}

export { CryptoService };

const cryptoServiceInstance = new CryptoService();
export default cryptoServiceInstance;
