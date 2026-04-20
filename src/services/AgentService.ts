import {
  Agent,
  ConsoleLogger,
  LogLevel,
  KeyDerivationMethod,
  InitConfig,
} from '@credo-ts/core';
import {agentDependencies} from '@credo-ts/react-native';
import {AskarModule} from '@credo-ts/askar';
import {ariesAskar} from '@hyperledger/aries-askar-react-native';
import {AnonCredsModule} from '@credo-ts/anoncreds';
import {anoncreds} from '@hyperledger/anoncreds-react-native';
import EncryptedStorage from 'react-native-encrypted-storage';
import LogServiceInstance from './LogService';
import type {ILogService} from '../types';

/**
 * Local structural alias for an AnonCreds registry. We intentionally avoid
 * importing the upstream `AnonCredsRegistry` type directly because the test
 * mock for `@credo-ts/anoncreds` is intentionally minimal and does not
 * re-export it. The shape captured here is the documented public contract
 * (the module accepts an empty list when no on-ledger resolver is wired up).
 */
type AnonCredsRegistryLike = {
  methodName: string;
  supportedIdentifier: RegExp;
};

/**
 * AgentService - Manages the Credo agent lifecycle
 *
 * This service is responsible for:
 * - Configuring and initializing the Credo agent with Askar and AnonCreds modules
 * - Providing singleton access to the agent instance
 * - Managing agent shutdown
 *
 * The agent uses Aries Askar for encrypted wallet/storage and AnonCreds for
 * zero-knowledge credential operations. No DIDComm transport is registered
 * because this app uses a clipboard-based credential exchange flow.
 */

type CredoAgent = Agent<{
  askar: AskarModule;
  anoncreds: AnonCredsModule;
}>;

class AgentService {
  private static readonly WALLET_KEY_STORAGE = 'credo_wallet_master_key';
  /**
   * Sidecar key storing the version of the derivation scheme that produced
   * the master key currently in EncryptedStorage. We start at v1 (32 random
   * bytes via @noble/ed25519's CSPRNG, hex-encoded). Any future scheme change
   * (e.g. moving to a memory-hard KDF over a user-supplied passphrase) MUST
   * bump this version and migrate stored material atomically. Without this
   * sentinel, key rotation is irrecoverable on existing devices.
   */
  private static readonly WALLET_KEY_VERSION_STORAGE = 'credo_wallet_master_key_version';
  private static readonly CURRENT_WALLET_KEY_VERSION = '1';
  private agent: CredoAgent | null = null;
  private initPromise: Promise<CredoAgent> | null = null;
  private readonly logger: ILogService;

  constructor(logger: ILogService = LogServiceInstance) {
    this.logger = logger;
  }

  /**
   * Retrieves or generates the Credo wallet master key.
   * On first launch, a 32-byte random key is generated and stored in
   * EncryptedStorage so subsequent launches reuse the same key.
   *
   * Stores a parallel version sentinel so future migrations can detect
   * legacy material and re-derive without losing the wallet.
   */
  private async getOrCreateWalletKey(): Promise<string> {
    const existing = await EncryptedStorage.getItem(AgentService.WALLET_KEY_STORAGE);
    if (existing) {
      const storedVersion = await EncryptedStorage.getItem(
        AgentService.WALLET_KEY_VERSION_STORAGE,
      );
      if (storedVersion && storedVersion !== AgentService.CURRENT_WALLET_KEY_VERSION) {
        // No migration path is implemented yet — surfacing this loudly is
        // intentional. Adding a new derivation scheme requires a paired
        // migration routine that re-encrypts all wallet records.
        this.logger.captureEvent(
          'error',
          'titular',
          {
            parameters: {
              action: 'wallet_key_version_mismatch',
              stored: storedVersion,
              expected: AgentService.CURRENT_WALLET_KEY_VERSION,
            },
          },
          false,
        );
      }
      return existing;
    }
    const ed = await import('@noble/ed25519');
    const bytes = ed.etc.randomBytes(32);
    const key = Array.from(bytes as Uint8Array, (b: number) => b.toString(16).padStart(2, '0')).join('');
    await EncryptedStorage.setItem(AgentService.WALLET_KEY_STORAGE, key);
    await EncryptedStorage.setItem(
      AgentService.WALLET_KEY_VERSION_STORAGE,
      AgentService.CURRENT_WALLET_KEY_VERSION,
    );
    return key;
  }

  /**
   * Returns the initialized Credo agent.
   * Initializes on first call; subsequent calls return the same instance.
   */
  async getAgent(): Promise<CredoAgent> {
    if (this.agent) {
      return this.agent;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this.initialize();
    return this.initPromise;
  }

  private async initialize(): Promise<CredoAgent> {
    try {
      const walletKey = await this.getOrCreateWalletKey();
      // SECURITY/OPS: log level is env-driven so production builds stay quiet
      // (`warn`) while development surfaces full agent telemetry (`debug`).
      // `__DEV__` is the React Native global injected by Metro at build time.
      const logLevel =
        typeof __DEV__ !== 'undefined' && __DEV__ ? LogLevel.debug : LogLevel.warn;
      const config: InitConfig = {
        label: 'CarteiraIdentidadeAcademica',
        walletConfig: {
          id: 'academic-wallet',
          key: walletKey,
          keyDerivationMethod: KeyDerivationMethod.Argon2IMod,
        },
        logger: new ConsoleLogger(logLevel),
        autoUpdateStorageOnStartup: true,
      };

      // Type assertions explained:
      //  - `anoncreds as unknown as never` is required because `@credo-ts/anoncreds`
      //    expects an `Anoncreds` shape from `@hyperledger/anoncreds-shared`,
      //    but the React Native build re-exports it under a structurally
      //    compatible but nominally distinct symbol. The double-cast keeps
      //    type-safety honest (instead of swallowing it with `as any`).
      //  - `registries: ([] as AnonCredsRegistryLike[])` is intentional: this
      //    wallet is fully self-contained and does not resolve credentials
      //    against an on-ledger registry. See ARCHITECTURE.md § "Cadeia de
      //    confiança" for the rationale.
      // INTENTIONAL: no DIDComm transports (HTTP, WebSocket, BLE) are
      // registered. This wallet uses a clipboard-based credential exchange
      // flow; registering transports would open the agent's network surface
      // and require trust-store / endpoint provisioning that is out of scope
      // for the current TCC. Future work: add `httpInbound` / `httpOutbound`
      // modules + a connection-invitation UI before enabling.
      const agent = new Agent({
        config,
        dependencies: agentDependencies,
        modules: {
          askar: new AskarModule({ariesAskar}),
          anoncreds: new AnonCredsModule({
            anoncreds: anoncreds as unknown as never,
            registries: [] as AnonCredsRegistryLike[] as never,
          }),
        },
      }) as unknown as CredoAgent;

      await agent.initialize();

      this.agent = agent;

      this.logger.captureEvent(
        'key_generation',
        'titular',
        {
          parameters: {
            action: 'agent_initialized',
            label: config.label,
          },
        },
        true,
      );

      return agent;
    } catch (error) {
      this.initPromise = null;

      this.logger.captureEvent(
        'error',
        'titular',
        {
          parameters: {
            action: 'agent_initialization_failed',
          },
        },
        false,
        error instanceof Error ? error : new Error(String(error)),
      );

      throw error;
    }
  }

  /**
   * Shuts down the Credo agent and releases resources.
   *
   * Wraps the underlying `agent.shutdown()` in try/finally so that even if
   * the native side throws (e.g. wallet locked, Askar lock contention), the
   * service state (`this.agent`, `this.initPromise`) is reset and the next
   * `getAgent()` call performs a clean re-initialisation rather than
   * returning a half-dead instance.
   */
  async shutdown(): Promise<void> {
    if (!this.agent) {
      return;
    }
    try {
      await this.agent.shutdown();
    } finally {
      this.agent = null;
      this.initPromise = null;
    }
  }

  /**
   * Returns whether the agent is currently initialized.
   */
  isInitialized(): boolean {
    return this.agent !== null;
  }
}

export { AgentService };

const agentServiceInstance = new AgentService();
export default agentServiceInstance;
