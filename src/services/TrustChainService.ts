import CryptoServiceInstance from './CryptoService';
import StorageServiceInstance from './StorageService';
import LogServiceInstance from './LogService';
import {ValidationError} from './ErrorHandler';
import {TrustedIssuer} from '../types';
import type {ICryptoService, IStorageService, ILogService} from '../types';
import * as ed from '@noble/ed25519';
import {canonicalize} from './encoding';

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Re-export TrustedIssuer from types for backwards compatibility
export type {TrustedIssuer} from '../types';

const STORAGE_KEY = 'trust_chain_issuers';

class TrustChainService {
  private issuers: Map<string, TrustedIssuer> = new Map();
  private loaded = false;
  private readonly crypto: ICryptoService;
  private readonly storage: IStorageService;
  private readonly logger: ILogService;

  constructor(
    crypto: ICryptoService = CryptoServiceInstance,
    storage: IStorageService = StorageServiceInstance,
    logger: ILogService = LogServiceInstance,
  ) {
    this.crypto = crypto;
    this.storage = storage;
    this.logger = logger;
  }

  // -------------------------------------------------------------------
  // Persistence
  // -------------------------------------------------------------------

  private async load(): Promise<void> {
    if (this.loaded) {
      return;
    }
    const raw = await this.storage.getRawItem(STORAGE_KEY);
    if (raw) {
      try {
        const arr: TrustedIssuer[] = JSON.parse(raw);
        for (const issuer of arr) {
          this.issuers.set(issuer.did, issuer);
        }
      } catch {
        // corrupted – start fresh
      }
    }
    this.loaded = true;
  }

  private async persist(): Promise<void> {
    const arr = Array.from(this.issuers.values());
    await this.storage.setRawItem(STORAGE_KEY, JSON.stringify(arr));
  }

  // -------------------------------------------------------------------
  // Certificate helpers
  // -------------------------------------------------------------------

  /**
   * Canonical string that the parent signs when issuing a certificate
   * for a child issuer.
   *
   * SECURITY: must be deterministic across engines/devices. Uses RFC-8785
   * style canonical JSON (sorted keys, no whitespace) — plain
   * `JSON.stringify` is NOT canonical and would allow two semantically
   * identical certificates to produce different signature inputs.
   */
  private certificatePayload(issuer: {
    did: string;
    publicKey: string;
    name: string;
    parentDid: string | null;
  }): string {
    return canonicalize({
      did: issuer.did,
      name: issuer.name,
      parentDid: issuer.parentDid,
      publicKey: issuer.publicKey,
    });
  }

  // -------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------

  /**
   * Initialise and register the root anchor issuer.
   *
   * Generates a new Ed25519 key pair, self-signs a certificate, and
   * stores it as the trust root.  Must be called once; subsequent calls
   * return the existing root.
   */
  async initializeRootIssuer(
    did: string,
    name: string,
  ): Promise<TrustedIssuer> {
    await this.load();

    // Return existing root if present
    const existing = this.getRootIssuer();
    if (existing) {
      return existing;
    }

    // Generate root key pair
    const privateKeyBytes = ed.utils.randomSecretKey();
    const publicKeyBytes = await ed.getPublicKeyAsync(privateKeyBytes);
    const privateKeyHex = toHex(privateKeyBytes);
    const publicKeyHex = toHex(publicKeyBytes);

    const payload = this.certificatePayload({
      did,
      publicKey: publicKeyHex,
      name,
      parentDid: null,
    });

    // Self-sign
    const certificate = await this.crypto.signData(payload, privateKeyHex, 'emissor');

    const root: TrustedIssuer = {
      did,
      publicKey: publicKeyHex,
      name,
      parentDid: null,
      certificate,
      createdAt: new Date().toISOString(),
    };

    this.issuers.set(did, root);
    await this.persist();

    // Store root private key so it can sign child certificates later
    await this.storage.setRawItem('trust_root_private_key', privateKeyHex);

    this.logger.captureEvent('key_generation', 'emissor', {
      algorithm: 'Ed25519',
      key_size: 256,
      did_method: 'did:web',
      parameters: {action: 'root_issuer_created', did},
    }, true);

    return root;
  }

  /**
   * Register a new trusted issuer signed by an existing issuer in the
   * chain (typically the root or one of its children).
   *
   * @param parentDid - DID of the signing parent
   * @param parentPrivateKey - Parent's private key hex (for signing the certificate)
   * @param childDid - DID for the new issuer
   * @param childName - Human-readable label
   * @returns The newly created TrustedIssuer (including generated public key)
   */
  async registerChildIssuer(
    parentDid: string,
    parentPrivateKey: string,
    childDid: string,
    childName: string,
  ): Promise<TrustedIssuer> {
    await this.load();

    const parent = this.issuers.get(parentDid);
    if (!parent) {
      throw new ValidationError(
        'Emissor pai não encontrado na cadeia de confiança',
        'parentDid',
        parentDid,
      );
    }

    if (this.issuers.has(childDid)) {
      throw new ValidationError(
        'Emissor já registrado na cadeia de confiança',
        'childDid',
        childDid,
      );
    }

    // Generate child key pair
    const privateKeyBytes = ed.utils.randomSecretKey();
    const publicKeyBytes = await ed.getPublicKeyAsync(privateKeyBytes);
    const privateKeyHex = toHex(privateKeyBytes);
    const publicKeyHex = toHex(publicKeyBytes);

    const payload = this.certificatePayload({
      did: childDid,
      publicKey: publicKeyHex,
      name: childName,
      parentDid,
    });

    // Parent signs the child's certificate
    const certificate = await this.crypto.signData(
      payload,
      parentPrivateKey,
      'emissor',
    );

    const child: TrustedIssuer = {
      did: childDid,
      publicKey: publicKeyHex,
      name: childName,
      parentDid,
      certificate,
      createdAt: new Date().toISOString(),
    };

    this.issuers.set(childDid, child);
    await this.persist();

    // Store child private key for potential further delegation
    await this.storage.setRawItem(
      `trust_issuer_private_key_${childDid}`,
      privateKeyHex,
    );

    this.logger.captureEvent('key_generation', 'emissor', {
      algorithm: 'Ed25519',
      key_size: 256,
      did_method: 'did:web',
      parameters: {
        action: 'child_issuer_registered',
        childDid,
        parentDid,
      },
    }, true);

    return child;
  }

  /**
   * Verify the complete trust chain from the given issuer DID back to the
   * root anchor. Each certificate is cryptographically verified against its
   * parent's public key. Returns true only if every link is valid and the
   * chain terminates at the root.
   */
  async verifyTrustChain(issuerDid: string): Promise<{
    trusted: boolean;
    chain: TrustedIssuer[];
    error?: string;
  }> {
    await this.load();

    const chain: TrustedIssuer[] = [];
    let currentDid: string | null = issuerDid;
    const visited = new Set<string>();

    while (currentDid) {
      if (visited.has(currentDid)) {
        return {trusted: false, chain, error: 'Ciclo detectado na cadeia de confiança'};
      }
      visited.add(currentDid);

      const issuer = this.issuers.get(currentDid);
      if (!issuer) {
        return {
          trusted: false,
          chain,
          error: `Emissor ${currentDid} não encontrado na cadeia de confiança`,
        };
      }

      chain.push(issuer);

      // Verify certificate
      const payload = this.certificatePayload(issuer);
      const signerPublicKey = issuer.parentDid
        ? this.issuers.get(issuer.parentDid)?.publicKey
        : issuer.publicKey; // Root is self-signed

      if (!signerPublicKey) {
        return {
          trusted: false,
          chain,
          error: `Chave pública do assinante não encontrada para ${issuer.parentDid}`,
        };
      }

      const valid = await this.crypto.verifySignature(
        payload,
        issuer.certificate,
        signerPublicKey,
        'verificador',
      );

      if (!valid) {
        return {
          trusted: false,
          chain,
          error: `Certificado inválido para ${currentDid}`,
        };
      }

      // Walk up
      currentDid = issuer.parentDid;
    }

    // Chain must terminate at a root (parentDid === null)
    const last = chain[chain.length - 1];
    if (!last || last.parentDid !== null) {
      return {trusted: false, chain, error: 'Cadeia não termina em um emissor raiz'};
    }

    return {trusted: true, chain};
  }

  /**
   * Look up a trusted issuer by DID.
   */
  async getIssuer(did: string): Promise<TrustedIssuer | undefined> {
    await this.load();
    return this.issuers.get(did);
  }

  /**
   * Return the root anchor issuer, if one has been initialized.
   */
  getRootIssuer(): TrustedIssuer | undefined {
    for (const issuer of this.issuers.values()) {
      if (issuer.parentDid === null) {
        return issuer;
      }
    }
    return undefined;
  }

  /**
   * List all issuers registered in the trust chain.
   */
  async getAllIssuers(): Promise<TrustedIssuer[]> {
    await this.load();
    return Array.from(this.issuers.values());
  }

  /**
   * Get the private key for a registered issuer (for signing child certificates).
   */
  async getIssuerPrivateKey(did: string): Promise<string | null> {
    await this.load();
    const issuer = this.issuers.get(did);
    if (!issuer) {
      return null;
    }
    if (issuer.parentDid === null) {
      return this.storage.getRawItem('trust_root_private_key');
    }
    return this.storage.getRawItem(`trust_issuer_private_key_${did}`);
  }

  /**
   * Check if a given DID is a trusted issuer.
   */
  async isTrustedIssuer(did: string): Promise<boolean> {
    await this.load();
    if (!this.issuers.has(did)) {
      return false;
    }
    const result = await this.verifyTrustChain(did);
    return result.trusted;
  }

  /**
   * Remove all issuers and reset the trust chain.
   */
  async reset(): Promise<void> {
    this.issuers.clear();
    this.loaded = false;
    await this.storage.setRawItem(STORAGE_KEY, '[]');
  }
}

export { TrustChainService };

const trustChainServiceInstance = new TrustChainService();
export default trustChainServiceInstance;
