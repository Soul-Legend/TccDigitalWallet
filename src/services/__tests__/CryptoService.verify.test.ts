/**
 * CryptoService - Signature Verification & Nonce Tests
 *
 * Covers gaps identified in the test audit:
 * - verifySignature() — valid/invalid/mismatched data
 * - generateNonce() — uniqueness and format
 * - Sign-then-verify round-trip (property-based)
 */

import CryptoService from '../CryptoService';
import * as ed from '@noble/ed25519';
import * as fc from 'fast-check';

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

describe('CryptoService - Signature Verification', () => {
  let privateKeyHex: string;
  let publicKeyHex: string;

  beforeAll(async () => {
    const privateKeyBytes = ed.utils.randomSecretKey();
    const publicKeyBytes = await ed.getPublicKeyAsync(privateKeyBytes);
    privateKeyHex = toHex(privateKeyBytes);
    publicKeyHex = toHex(publicKeyBytes);
  });

  it('should verify a valid Ed25519 signature', async () => {
    const data = 'Hello, World!';
    const signatureHex = await CryptoService.signData(data, privateKeyHex, 'verificador');
    const isValid = await CryptoService.verifySignature(data, signatureHex, publicKeyHex);
    expect(isValid).toBe(true);
  });

  it('should reject a signature with mismatched data', async () => {
    const signatureHex = await CryptoService.signData('original', privateKeyHex, 'verificador');
    const isValid = await CryptoService.verifySignature('tampered', signatureHex, publicKeyHex);
    expect(isValid).toBe(false);
  });

  it('should reject a signature with wrong public key', async () => {
    const data = 'test data';
    const signatureHex = await CryptoService.signData(data, privateKeyHex, 'verificador');

    // Generate a different key pair
    const otherPrivate = ed.utils.randomSecretKey();
    const otherPublic = await ed.getPublicKeyAsync(otherPrivate);
    const otherPublicHex = toHex(otherPublic);

    const isValid = await CryptoService.verifySignature(data, signatureHex, otherPublicHex);
    expect(isValid).toBe(false);
  });

  it('should reject a corrupted signature', async () => {
    const data = 'test data';
    const signatureHex = await CryptoService.signData(data, privateKeyHex, 'verificador');

    // Corrupt one byte
    const corrupted = 'ff' + signatureHex.substring(2);

    const isValid = await CryptoService.verifySignature(data, corrupted, publicKeyHex);
    expect(isValid).toBe(false);
  });

  it('property: sign-then-verify round-trip always succeeds', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({minLength: 1, maxLength: 500}),
        async (data) => {
          const sig = await CryptoService.signData(data, privateKeyHex, 'emissor');
          const valid = await CryptoService.verifySignature(data, sig, publicKeyHex);
          expect(valid).toBe(true);
        },
      ),
      {numRuns: 20},
    );
  });

  it('should handle Uint8Array input for both sign and verify', async () => {
    const data = new Uint8Array([1, 2, 3, 4, 5]);
    const sig = await CryptoService.signData(data, privateKeyHex, 'verificador');
    const valid = await CryptoService.verifySignature(data, sig, publicKeyHex);
    expect(valid).toBe(true);
  });
});

describe('CryptoService - Nonce Generation', () => {
  it('should generate 64-character hex nonces', () => {
    const nonce = CryptoService.generateNonce();
    expect(nonce).toMatch(/^[0-9a-f]{64}$/);
  });

  it('should generate unique nonces on each call', () => {
    const nonces = new Set<string>();
    for (let i = 0; i < 100; i++) {
      nonces.add(CryptoService.generateNonce());
    }
    expect(nonces.size).toBe(100);
  });
});
