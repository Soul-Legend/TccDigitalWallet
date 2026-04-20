/**
 * Mock for @credo-ts/core
 * Used in tests to simulate Credo functionality without native modules
 */

const mockSign = jest.fn().mockResolvedValue({
  signature: Buffer.from('mock-signature'),
});

const mockDidsCreate = jest.fn().mockResolvedValue({
  didState: {
    state: 'finished',
    did: 'did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK',
    didDocument: {
      verificationMethod: [
        {
          id: 'did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK#z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK',
          type: 'Ed25519VerificationKey2018',
          publicKey: Buffer.from('mock-public-key'),
        },
      ],
    },
  },
});

const mockDidsResolve = jest.fn().mockResolvedValue({
  didDocument: {
    verificationMethod: [
      {
        id: 'did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK#z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK',
        type: 'Ed25519VerificationKey2018',
        publicKey: Buffer.from('mock-public-key'),
      },
    ],
  },
});

const mockAgent = {
  initialize: jest.fn().mockResolvedValue(undefined),
  shutdown: jest.fn().mockResolvedValue(undefined),
  wallet: {sign: mockSign},
  dids: {create: mockDidsCreate, resolve: mockDidsResolve},
  modules: {
    anoncreds: {},
  },
};

export const Agent = jest.fn().mockImplementation(() => mockAgent);

export const KeyType = {
  Ed25519: 'ed25519',
  X25519: 'x25519',
};

export const KeyDerivationMethod = {
  Argon2IMod: 'ARGON2I_MOD',
  Argon2Int: 'ARGON2I_INT',
  Raw: 'RAW',
};

export const ConsoleLogger = jest.fn();

export const LogLevel = {
  trace: 0,
  debug: 1,
  info: 2,
  warn: 3,
  error: 4,
  fatal: 5,
};

export const DidKey = jest.fn();
export const DidPeer = jest.fn();
