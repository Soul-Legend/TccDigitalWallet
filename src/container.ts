/**
 * Composition Root — wires all services together via constructor injection.
 *
 * Import from this module when you want properly-wired service instances.
 * The default singleton exports from each service file remain available
 * for backward compatibility and use the same default wiring.
 *
 * For testing, create service instances directly with mock dependencies
 * instead of importing from here.
 */

import {LogService} from './services/LogService';
import {StorageService} from './services/StorageService';
import {CryptoService} from './services/CryptoService';
import {AgentService} from './services/AgentService';
import {ErrorHandler} from './services/ErrorHandler';
import {TransportService} from './services/TransportService';
import {DIDService} from './services/DIDService';
import {AnonCredsService} from './services/AnonCredsService';
import {ZKProofService} from './services/ZKProofService';
import {TrustChainService} from './services/TrustChainService';
import {CredentialService} from './services/CredentialService';
import {PresentationService} from './services/PresentationService';
import {VerificationService} from './services/VerificationService';

// ── Level 0: Leaf services (no service dependencies) ────────────────
const logService = new LogService();
const storageService = new StorageService();

// ── Level 1: Depend on Level 0 ──────────────────────────────────────
const cryptoService = new CryptoService(logService);
const agentService = new AgentService(logService);
const errorHandler = new ErrorHandler(logService);
const transportService = new TransportService(logService);

// ── Level 2: Depend on Level 0–1 ────────────────────────────────────
const didService = new DIDService(logService, storageService, agentService);
const anonCredsService = new AnonCredsService(logService, storageService);
const zkProofService = new ZKProofService(logService);
const trustChainService = new TrustChainService(
  cryptoService,
  storageService,
  logService,
);

// ── Level 3: Depend on Level 0–2 ────────────────────────────────────
const credentialService = new CredentialService(
  didService,
  storageService,
  logService,
  agentService,
  anonCredsService,
);

// ── Level 4: Depend on Level 0–3 ────────────────────────────────────
const presentationService = new PresentationService(
  logService,
  cryptoService,
  storageService,
  anonCredsService,
);

// ── Level 5: Top-level orchestrators ─────────────────────────────────
const verificationService = new VerificationService(
  logService,
  cryptoService,
  storageService,
  zkProofService,
  anonCredsService,
);

export {
  logService,
  storageService,
  cryptoService,
  agentService,
  errorHandler,
  transportService,
  didService,
  anonCredsService,
  zkProofService,
  trustChainService,
  credentialService,
  presentationService,
  verificationService,
};
