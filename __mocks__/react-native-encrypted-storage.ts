/**
 * Mock for react-native-encrypted-storage
 * Used in tests to simulate encrypted storage without native modules
 */

const storage: Record<string, string> = {};

const EncryptedStorage = {
  setItem: jest.fn(async (key: string, value: string): Promise<void> => {
    storage[key] = value;
  }),
  
  getItem: jest.fn(async (key: string): Promise<string | null> => {
    return storage[key] || null;
  }),
  
  removeItem: jest.fn(async (key: string): Promise<void> => {
    delete storage[key];
  }),
  
  clear: jest.fn(async (): Promise<void> => {
    Object.keys(storage).forEach(key => delete storage[key]);
  }),
};

export default EncryptedStorage;
