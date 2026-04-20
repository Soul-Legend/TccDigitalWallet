/**
 * StorageService - CRUD & Edge Case Tests
 *
 * Covers gaps:
 * - deleteCredential (index-based, out-of-bounds)
 * - Public key store/retrieve (holder + issuer)
 * - Nullifier store + getNullifiers (per election, dedup)
 * - setRawItem / getRawItem round-trip
 */

import StorageService from '../StorageService';

beforeEach(async () => {
  await StorageService.clearAll();
});

describe('StorageService - Credential Deletion', () => {
  it('should delete credential at specific index', async () => {
    await StorageService.storeCredential('cred_0');
    await StorageService.storeCredential('cred_1');
    await StorageService.storeCredential('cred_2');

    await StorageService.deleteCredential(1);

    const remaining = await StorageService.getCredentials();
    expect(remaining).toEqual(['cred_0', 'cred_2']);
  });

  it('should delete the first credential', async () => {
    await StorageService.storeCredential('first');
    await StorageService.storeCredential('second');

    await StorageService.deleteCredential(0);

    const remaining = await StorageService.getCredentials();
    expect(remaining).toEqual(['second']);
  });

  it('should delete the last credential', async () => {
    await StorageService.storeCredential('a');
    await StorageService.storeCredential('b');

    await StorageService.deleteCredential(1);

    const remaining = await StorageService.getCredentials();
    expect(remaining).toEqual(['a']);
  });

  it('should throw on negative index', async () => {
    await StorageService.storeCredential('cred');
    await expect(StorageService.deleteCredential(-1)).rejects.toThrow();
  });

  it('should throw on out-of-bounds index', async () => {
    await StorageService.storeCredential('cred');
    await expect(StorageService.deleteCredential(5)).rejects.toThrow();
  });

  it('should result in empty array when last credential is deleted', async () => {
    await StorageService.storeCredential('only');
    await StorageService.deleteCredential(0);
    const remaining = await StorageService.getCredentials();
    expect(remaining).toEqual([]);
  });
});

describe('StorageService - Public Key Storage', () => {
  it('should store and retrieve holder public key', async () => {
    await StorageService.storeHolderPublicKey('abc123def456');
    const key = await StorageService.getHolderPublicKey();
    expect(key).toBe('abc123def456');
  });

  it('should return null when holder public key not stored', async () => {
    const key = await StorageService.getHolderPublicKey();
    expect(key).toBeNull();
  });

  it('should store and retrieve issuer public key', async () => {
    await StorageService.storeIssuerPublicKey('issuerPubKey789');
    const key = await StorageService.getIssuerPublicKey();
    expect(key).toBe('issuerPubKey789');
  });

  it('should return null when issuer public key not stored', async () => {
    const key = await StorageService.getIssuerPublicKey();
    expect(key).toBeNull();
  });

  it('should overwrite existing keys', async () => {
    await StorageService.storeHolderPublicKey('old_key');
    await StorageService.storeHolderPublicKey('new_key');
    const key = await StorageService.getHolderPublicKey();
    expect(key).toBe('new_key');
  });
});

describe('StorageService - Nullifier Management', () => {
  it('should return empty array for unknown election', async () => {
    const nullifiers = await StorageService.getNullifiers('election_999');
    expect(nullifiers).toEqual([]);
  });

  it('should store and retrieve nullifiers per election', async () => {
    await StorageService.storeNullifier('null_a', 'election_1');
    await StorageService.storeNullifier('null_b', 'election_1');

    const nullifiers = await StorageService.getNullifiers('election_1');
    expect(nullifiers).toEqual(['null_a', 'null_b']);
  });

  it('should not store duplicate nullifiers', async () => {
    await StorageService.storeNullifier('null_x', 'election_2');
    await StorageService.storeNullifier('null_x', 'election_2');

    const nullifiers = await StorageService.getNullifiers('election_2');
    expect(nullifiers).toEqual(['null_x']);
  });

  it('should isolate nullifiers between elections', async () => {
    await StorageService.storeNullifier('voter_1', 'election_a');
    await StorageService.storeNullifier('voter_2', 'election_b');

    const a = await StorageService.getNullifiers('election_a');
    const b = await StorageService.getNullifiers('election_b');
    expect(a).toEqual(['voter_1']);
    expect(b).toEqual(['voter_2']);
  });
});

describe('StorageService - Raw Item Storage', () => {
  it('should store and retrieve a raw item', async () => {
    await StorageService.setRawItem('my_key', 'my_value');
    const value = await StorageService.getRawItem('my_key');
    expect(value).toBe('my_value');
  });

  it('should return null for non-existent key', async () => {
    const value = await StorageService.getRawItem('nonexistent');
    expect(value).toBeNull();
  });

  it('should overwrite existing raw item', async () => {
    await StorageService.setRawItem('key', 'v1');
    await StorageService.setRawItem('key', 'v2');
    const value = await StorageService.getRawItem('key');
    expect(value).toBe('v2');
  });

  it('should handle JSON payloads', async () => {
    const payload = JSON.stringify({schema_id: 'test', version: '1.0'});
    await StorageService.setRawItem('anoncreds_schema', payload);
    const retrieved = await StorageService.getRawItem('anoncreds_schema');
    expect(JSON.parse(retrieved!)).toEqual({schema_id: 'test', version: '1.0'});
  });
});

describe('StorageService - clearAll', () => {
  it('should clear all stored data', async () => {
    await StorageService.storeCredential('cred');
    await StorageService.storeHolderPublicKey('pk');
    await StorageService.storeNullifier('null', 'election');
    await StorageService.setRawItem('raw', 'data');

    await StorageService.clearAll();

    expect(await StorageService.getCredentials()).toEqual([]);
    expect(await StorageService.getHolderPublicKey()).toBeNull();
    expect(await StorageService.getRawItem('raw')).toBeNull();
  });
});
