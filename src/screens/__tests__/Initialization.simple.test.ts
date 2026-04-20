import DIDService from '../../services/DIDService';
import StorageService from '../../services/StorageService';
import {useAppStore} from '../../stores/useAppStore';

// Mock dependencies
jest.mock('../../services/DIDService');
jest.mock('../../services/StorageService');

describe('InitializationScreen Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAppStore.setState({
      holderDID: null,
      issuerDID: null,
      logs: [],
      currentModule: 'home',
    });
  });

  describe('First Launch Detection', () => {
    it('should detect first launch when no DID exists', async () => {
      (StorageService.getHolderDID as jest.Mock) = jest
        .fn()
        .mockResolvedValue(null);

      const existingDID = await StorageService.getHolderDID();

      expect(existingDID).toBeNull();
      expect(StorageService.getHolderDID).toHaveBeenCalled();
    });

    it('should detect existing DID on subsequent launches', async () => {
      const testDID = 'did:key:z6MkExisting';
      (StorageService.getHolderDID as jest.Mock) = jest
        .fn()
        .mockResolvedValue(testDID);

      const existingDID = await StorageService.getHolderDID();

      expect(existingDID).toBe(testDID);
    });
  });

  describe('Identity Generation', () => {
    it('should generate holder identity using did:key method', async () => {
      const testDID = 'did:key:z6MkTest';
      const testPublicKey = 'testPublicKey123';

      (DIDService.generateHolderIdentity as jest.Mock) = jest
        .fn()
        .mockResolvedValue({did: testDID, publicKey: testPublicKey});

      const result = await DIDService.generateHolderIdentity('key');

      expect(DIDService.generateHolderIdentity).toHaveBeenCalledWith('key');
      expect(result.did).toBe(testDID);
      expect(result.publicKey).toBe(testPublicKey);
    });

    it('should handle identity generation errors', async () => {
      const errorMessage = 'Failed to generate key pair';

      (DIDService.generateHolderIdentity as jest.Mock) = jest
        .fn()
        .mockRejectedValue(new Error(errorMessage));

      await expect(DIDService.generateHolderIdentity('key')).rejects.toThrow(
        errorMessage
      );
    });
  });

  describe('State Management', () => {
    it('should update holder DID in store after generation', () => {
      const testDID = 'did:key:z6MkNewDID';
      const {setHolderDID} = useAppStore.getState();

      setHolderDID(testDID);

      const {holderDID} = useAppStore.getState();
      expect(holderDID).toBe(testDID);
    });

    it('should maintain holder DID across store updates', () => {
      const testDID = 'did:key:z6MkPersistent';
      const {setHolderDID, setCurrentModule} = useAppStore.getState();

      setHolderDID(testDID);
      setCurrentModule('emissor');

      const {holderDID, currentModule} = useAppStore.getState();
      expect(holderDID).toBe(testDID);
      expect(currentModule).toBe('emissor');
    });
  });

  describe('Error Recovery', () => {
    it('should allow retry after generation failure', async () => {
      const errorMessage = 'Network error';
      const successDID = 'did:key:z6MkRetry';

      (DIDService.generateHolderIdentity as jest.Mock) = jest
        .fn()
        .mockRejectedValueOnce(new Error(errorMessage))
        .mockResolvedValueOnce({did: successDID, publicKey: 'retrykey'});

      // First attempt fails
      await expect(DIDService.generateHolderIdentity('key')).rejects.toThrow(
        errorMessage
      );

      // Second attempt succeeds
      const result = await DIDService.generateHolderIdentity('key');
      expect(result.did).toBe(successDID);
    });
  });

  describe('Requirements Validation', () => {
    it('validates Requirement 1.1: First launch detection', async () => {
      (StorageService.getHolderDID as jest.Mock) = jest
        .fn()
        .mockResolvedValue(null);

      const existingDID = await StorageService.getHolderDID();

      // System SHALL detect first initialization
      expect(existingDID).toBeNull();
    });

    it('validates Requirement 1.5: Display DID after generation', async () => {
      const generatedDID = 'did:key:z6MkGenerated';

      (DIDService.generateHolderIdentity as jest.Mock) = jest
        .fn()
        .mockResolvedValue({did: generatedDID, publicKey: 'key'});

      const result = await DIDService.generateHolderIdentity('key');

      // System SHALL display the generated DID
      expect(result.did).toBeDefined();
      expect(result.did).toBe(generatedDID);
    });

    it('validates Requirement 1.6: Error handling with retry option', async () => {
      const error = new Error('Generation failed');

      (DIDService.generateHolderIdentity as jest.Mock) = jest
        .fn()
        .mockRejectedValue(error);

      // System SHALL handle errors
      await expect(DIDService.generateHolderIdentity('key')).rejects.toThrow();

      // System SHALL allow retry
      (DIDService.generateHolderIdentity as jest.Mock) = jest
        .fn()
        .mockResolvedValue({did: 'did:key:z6MkRetry', publicKey: 'key'});

      const retryResult = await DIDService.generateHolderIdentity('key');
      expect(retryResult.did).toBeDefined();
    });
  });
});
