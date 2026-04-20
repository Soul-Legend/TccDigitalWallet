import type {ILogService, IStorageService} from '../../types';
import {CryptoError} from '../ErrorHandler';

/**
 * Election nullifier persistence — used to prevent double-voting.
 */
export class NullifierStore {
  constructor(
    private readonly logger: ILogService,
    private readonly storage: IStorageService,
  ) {}

  async exists(nullifier: string, electionId: string): Promise<boolean> {
    try {
      const nullifiers = await this.storage.getNullifiers(electionId);
      return nullifiers.includes(nullifier);
    } catch (error) {
      throw new CryptoError('Erro ao verificar nullifier', 'nullifier_check', {error});
    }
  }

  async store(nullifier: string, electionId: string): Promise<void> {
    try {
      await this.storage.storeNullifier(nullifier, electionId);
      this.logger.captureEvent(
        'verification',
        'verificador',
        {
          parameters: {
            action: 'nullifier_stored',
            election_id: electionId,
            nullifier_truncated: nullifier.substring(0, 16) + '...',
          },
        },
        true,
      );
    } catch (error) {
      throw new CryptoError('Erro ao armazenar nullifier', 'nullifier_storage', {error});
    }
  }
}
