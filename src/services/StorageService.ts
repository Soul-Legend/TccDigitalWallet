import EncryptedStorage from 'react-native-encrypted-storage';
import {StorageError} from './ErrorHandler';
import {StorageKey, HOLDER_KEY_PREFIX, ISSUER_KEY_PREFIX, NULLIFIER_KEY_PREFIX} from '../utils/constants';

/**
 * StorageService - Manages encrypted storage of sensitive data
 *
 * This service provides secure storage for private keys, DIDs, and credentials
 * using the device's encrypted storage capabilities.
 */
class StorageService {
  private readonly HOLDER_KEY_PREFIX = HOLDER_KEY_PREFIX;
  private readonly ISSUER_KEY_PREFIX = ISSUER_KEY_PREFIX;

  /**
   * Per-key mutex map to serialise read-modify-write operations on array-
   * valued storage entries (credentials, nullifiers).  This prevents race
   * conditions when concurrent callers modify the same key.
   */
  private readonly locks = new Map<string, Promise<void>>();

  /**
   * Executes `fn` while holding an exclusive lock for `key`.
   * Concurrent calls with the same key are queued; different keys run in parallel.
   */
  private async withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
    // Chain onto the existing promise for this key (or a resolved one).
    const prev = this.locks.get(key) ?? Promise.resolve();
    let release: () => void;
    const next = new Promise<void>(resolve => { release = resolve; });
    this.locks.set(key, next);

    // Wait for the previous operation on this key to finish.
    await prev;
    try {
      return await fn();
    } finally {
      release!();
      // Clean up the entry when the queue is drained.
      if (this.locks.get(key) === next) {
        this.locks.delete(key);
      }
    }
  }

  /**
   * Stores holder's private key in encrypted storage
   */
  async storeHolderPrivateKey(privateKey: string, did: string): Promise<void> {
    try {
      await EncryptedStorage.setItem(
        `${this.HOLDER_KEY_PREFIX}private_key`,
        privateKey
      );
      await EncryptedStorage.setItem(
        `${this.HOLDER_KEY_PREFIX}did`,
        did
      );
    } catch (error) {
      throw new StorageError(
        'Failed to store holder private key',
        'write',
        {error}
      );
    }
  }

  /**
   * Retrieves holder's private key from encrypted storage
   */
  async getHolderPrivateKey(): Promise<string | null> {
    try {
      return await EncryptedStorage.getItem(`${this.HOLDER_KEY_PREFIX}private_key`);
    } catch (error) {
      throw new StorageError(
        'Failed to retrieve holder private key',
        'read',
        {error}
      );
    }
  }

  /**
   * Retrieves holder's DID from encrypted storage
   */
  async getHolderDID(): Promise<string | null> {
    try {
      return await EncryptedStorage.getItem(`${this.HOLDER_KEY_PREFIX}did`);
    } catch (error) {
      throw new StorageError(
        'Failed to retrieve holder DID',
        'read',
        {error}
      );
    }
  }

  /**
   * Stores holder's DID in encrypted storage
   */
  async storeHolderDID(did: string): Promise<void> {
    try {
      await EncryptedStorage.setItem(`${this.HOLDER_KEY_PREFIX}did`, did);
    } catch (error) {
      throw new StorageError('Failed to store holder DID', 'write', {error});
    }
  }

  /**
   * Stores issuer's DID (did:web) in encrypted storage
   */
  async storeIssuerDID(did: string): Promise<void> {
    try {
      await EncryptedStorage.setItem(`${this.ISSUER_KEY_PREFIX}did`, did);
    } catch (error) {
      throw new StorageError('Failed to store issuer DID', 'write', {error});
    }
  }

  /**
   * Stores issuer's signing DID (did:key used for cryptographic operations)
   */
  async storeIssuerSigningDid(signingDid: string): Promise<void> {
    try {
      await EncryptedStorage.setItem(
        `${this.ISSUER_KEY_PREFIX}signing_did`,
        signingDid,
      );
    } catch (error) {
      throw new StorageError(
        'Failed to store issuer signing DID',
        'write',
        {error},
      );
    }
  }

  /**
   * Retrieves issuer's signing DID from encrypted storage
   */
  async getIssuerSigningDid(): Promise<string | null> {
    try {
      return await EncryptedStorage.getItem(
        `${this.ISSUER_KEY_PREFIX}signing_did`,
      );
    } catch (error) {
      throw new StorageError(
        'Failed to retrieve issuer signing DID',
        'read',
        {error},
      );
    }
  }

  /**
   * Stores issuer's private key in encrypted storage
   */
  async storeIssuerPrivateKey(privateKey: string, did: string): Promise<void> {
    try {
      await EncryptedStorage.setItem(
        `${this.ISSUER_KEY_PREFIX}private_key`,
        privateKey
      );
      await EncryptedStorage.setItem(
        `${this.ISSUER_KEY_PREFIX}did`,
        did
      );
    } catch (error) {
      throw new StorageError(
        'Failed to store issuer private key',
        'write',
        {error}
      );
    }
  }

  /**
   * Retrieves issuer's private key from encrypted storage
   */
  async getIssuerPrivateKey(): Promise<string | null> {
    try {
      return await EncryptedStorage.getItem(`${this.ISSUER_KEY_PREFIX}private_key`);
    } catch (error) {
      throw new StorageError(
        'Failed to retrieve issuer private key',
        'read',
        {error}
      );
    }
  }

  /**
   * Retrieves issuer's DID from encrypted storage
   */
  async getIssuerDID(): Promise<string | null> {
    try {
      return await EncryptedStorage.getItem(`${this.ISSUER_KEY_PREFIX}did`);
    } catch (error) {
      throw new StorageError(
        'Failed to retrieve issuer DID',
        'read',
        {error}
      );
    }
  }

  /**
   * Stores a credential in encrypted storage
   */
  async storeCredential(credential: string): Promise<void> {
    return this.withLock(StorageKey.HOLDER_CREDENTIALS, async () => {
      try {
        // Get existing credentials
        const credentials = await this.getCredentials();

        // Add new credential
        credentials.push(credential);

        // Store updated credentials array
        await EncryptedStorage.setItem(
          StorageKey.HOLDER_CREDENTIALS,
          JSON.stringify(credentials)
        );
      } catch (error) {
        throw new StorageError(
          'Failed to store credential',
          'write',
          {error}
        );
      }
    });
  }

  /**
   * Retrieves all stored credentials
   */
  async getCredentials(): Promise<string[]> {
    try {
      const credentialsJson = await EncryptedStorage.getItem(StorageKey.HOLDER_CREDENTIALS);

      if (!credentialsJson) {
        return [];
      }

      return JSON.parse(credentialsJson);
    } catch (error) {
      throw new StorageError(
        'Failed to retrieve credentials',
        'read',
        {error}
      );
    }
  }

  /**
   * Deletes a credential at the specified index
   */
  async deleteCredential(index: number): Promise<void> {
    return this.withLock(StorageKey.HOLDER_CREDENTIALS, async () => {
      try {
        const credentials = await this.getCredentials();

        if (index < 0 || index >= credentials.length) {
          throw new StorageError(
            'Invalid credential index',
            'delete',
            {index}
          );
        }

        credentials.splice(index, 1);

        await EncryptedStorage.setItem(
          StorageKey.HOLDER_CREDENTIALS,
          JSON.stringify(credentials)
        );
      } catch (error) {
        if (error instanceof StorageError) {
          throw error;
        }
        throw new StorageError(
          'Failed to delete credential',
          'delete',
          {error}
        );
      }
    });
  }

  /**
   * Stores holder's public key in encrypted storage
   */
  async storeHolderPublicKey(publicKey: string): Promise<void> {
    try {
      await EncryptedStorage.setItem(
        `${this.HOLDER_KEY_PREFIX}public_key`,
        publicKey
      );
    } catch (error) {
      throw new StorageError(
        'Failed to store holder public key',
        'write',
        {error}
      );
    }
  }

  /**
   * Retrieves holder's public key from encrypted storage
   */
  async getHolderPublicKey(): Promise<string | null> {
    try {
      return await EncryptedStorage.getItem(`${this.HOLDER_KEY_PREFIX}public_key`);
    } catch (error) {
      throw new StorageError(
        'Failed to retrieve holder public key',
        'read',
        {error}
      );
    }
  }

  /**
   * Stores issuer's public key in encrypted storage
   */
  async storeIssuerPublicKey(publicKey: string): Promise<void> {
    try {
      await EncryptedStorage.setItem(
        `${this.ISSUER_KEY_PREFIX}public_key`,
        publicKey
      );
    } catch (error) {
      throw new StorageError(
        'Failed to store issuer public key',
        'write',
        {error}
      );
    }
  }

  /**
   * Retrieves issuer's public key from encrypted storage
   */
  async getIssuerPublicKey(): Promise<string | null> {
    try {
      return await EncryptedStorage.getItem(`${this.ISSUER_KEY_PREFIX}public_key`);
    } catch (error) {
      throw new StorageError(
        'Failed to retrieve issuer public key',
        'read',
        {error}
      );
    }
  }

  /**
   * Retrieves nullifiers for a specific election
   */
  async getNullifiers(electionId: string): Promise<string[]> {
    try {
      const nullifiersJson = await EncryptedStorage.getItem(`${NULLIFIER_KEY_PREFIX}${electionId}`);

      if (!nullifiersJson) {
        return [];
      }

      return JSON.parse(nullifiersJson);
    } catch (error) {
      throw new StorageError(
        'Failed to retrieve nullifiers',
        'read',
        {error}
      );
    }
  }

  /**
   * Stores a nullifier for a specific election
   */
  async storeNullifier(nullifier: string, electionId: string): Promise<void> {
    const lockKey = `${NULLIFIER_KEY_PREFIX}${electionId}`;
    return this.withLock(lockKey, async () => {
      try {
        const nullifiers = await this.getNullifiers(electionId);

        // Add new nullifier if not already present
        if (!nullifiers.includes(nullifier)) {
          nullifiers.push(nullifier);

          await EncryptedStorage.setItem(
            `${NULLIFIER_KEY_PREFIX}${electionId}`,
            JSON.stringify(nullifiers)
          );
        }
      } catch (error) {
        throw new StorageError(
          'Failed to store nullifier',
          'write',
          {error}
        );
      }
    });
  }

  /**
   * Generic key-value storage for AnonCreds artifacts and other data.
   */
  async setRawItem(key: string, value: string): Promise<void> {
    try {
      await EncryptedStorage.setItem(key, value);
    } catch (error) {
      throw new StorageError('Failed to store item', 'write', {error});
    }
  }

  async getRawItem(key: string): Promise<string | null> {
    try {
      return await EncryptedStorage.getItem(key);
    } catch (error) {
      throw new StorageError('Failed to retrieve item', 'read', {error});
    }
  }

  /**
   * Clears all stored keys (for testing purposes)
   */
  async clearAll(): Promise<void> {
    try {
      await EncryptedStorage.clear();
    } catch (error) {
      throw new StorageError(
        'Failed to clear storage',
        'delete',
        {error}
      );
    }
  }
}

export { StorageService };

// Export singleton instance
const storageServiceInstance = new StorageService();
export default storageServiceInstance;
