import {
  Schema,
  CredentialDefinition,
  CredentialOffer,
  CredentialRequest,
  Credential,
  Presentation,
  LinkSecret,
} from '@hyperledger/anoncreds-react-native';
import StorageServiceInstance from './StorageService';
import LogServiceInstance from './LogService';
import {CryptoError, ValidationError} from './ErrorHandler';
import type {ILogService, IStorageService} from '../types';

/**
 * AnonCredsService - Manages the AnonCreds v2 credential lifecycle
 *
 * Implements the full CL-signature protocol for credential issuance,
 * selective disclosure, predicate proofs, and unlinkability:
 *   Schema → CredentialDefinition → Offer → Request → Credential → Presentation → Verification
 *
 * All artifacts (schemas, credential definitions, link secrets) are stored
 * locally in encrypted storage (no ledger dependency), consistent with the
 * did:web anchoring and local PKI approach specified in the thesis.
 */

// Serializable artifacts stored alongside their identifiers
interface SchemaArtifact {
  schemaId: string;
  schema: Record<string, unknown>;
}

interface CredDefArtifact {
  credDefId: string;
  credDef: Record<string, unknown>;
  credDefPrivate: Record<string, unknown>;
  keyCorrectnessProof: Record<string, unknown>;
}

class AnonCredsService {
  private readonly STORAGE_PREFIX = 'anoncreds_';
  private readonly logger: ILogService;
  private readonly storage: IStorageService;

  constructor(
    logger: ILogService = LogServiceInstance,
    storage: IStorageService = StorageServiceInstance,
  ) {
    this.logger = logger;
    this.storage = storage;
  }

  // ------------------------------------------------------------------
  // Schema management
  // ------------------------------------------------------------------

  /**
   * Creates and persists an AnonCreds Schema for the academic credential.
   * If a schema with the same id already exists it is returned directly.
   */
  async getOrCreateSchema(
    issuerId: string,
    name: string,
    version: string,
    attributeNames: string[],
  ): Promise<SchemaArtifact> {
    const schemaId = `${issuerId}:2:${name}:${version}`;

    const existing = await this.loadArtifact<SchemaArtifact>(
      `schema_${schemaId}`,
    );
    if (existing) {
      return existing;
    }

    const schema = Schema.create({
      issuerId,
      name,
      version,
      attributeNames,
    });

    // SECURITY/MEMORY: Schema is a native handle backed by Rust-allocated
    // memory. We must call `.handle.clear()` after extracting the JSON or
    // the native side will leak per-issuance. The try/finally ensures the
    // handle is freed even if `toJson()` or `saveArtifact` throws.
    let artifact: SchemaArtifact;
    try {
      artifact = {
        schemaId,
        schema: schema.toJson(),
      };
      await this.saveArtifact(`schema_${schemaId}`, artifact);
    } finally {
      try {
        (schema as unknown as {handle?: {clear: () => void}}).handle?.clear();
      } catch {
        // best-effort — a clear() failure must not mask the real error path
      }
    }

    this.logger.captureEvent(
      'credential_issuance',
      'emissor',
      {parameters: {action: 'schema_created', schemaId, attributeNames}},
      true,
    );

    return artifact;
  }

  // ------------------------------------------------------------------
  // Credential Definition management
  // ------------------------------------------------------------------

  /**
   * Creates and persists a Credential Definition (CL-signature key pair).
   * This generates the issuer's CL key pair — the private key is stored
   * securely and NEVER leaves the device.
   */
  async getOrCreateCredentialDefinition(
    issuerId: string,
    schemaArtifact: SchemaArtifact,
    tag: string = 'default',
  ): Promise<CredDefArtifact> {
    const credDefId = `${issuerId}:3:CL:${schemaArtifact.schemaId}:${tag}`;

    const existing = await this.loadArtifact<CredDefArtifact>(
      `creddef_${credDefId}`,
    );
    if (existing) {
      return existing;
    }

    const result = CredentialDefinition.create({
      schemaId: schemaArtifact.schemaId,
      schema: schemaArtifact.schema,
      issuerId,
      tag,
      signatureType: 'CL',
      supportRevocation: false,
    });

    // See SECURITY/MEMORY note in getOrCreateSchema. CredentialDefinition.create
    // returns three native handles — all must be released after JSON extraction.
    let artifact: CredDefArtifact;
    try {
      artifact = {
        credDefId,
        credDef: result.credentialDefinition.toJson(),
        credDefPrivate: result.credentialDefinitionPrivate.toJson(),
        keyCorrectnessProof: result.keyCorrectnessProof.toJson(),
      };
      await this.saveArtifact(`creddef_${credDefId}`, artifact);
    } finally {
      const handles = [
        result.credentialDefinition,
        result.credentialDefinitionPrivate,
        result.keyCorrectnessProof,
      ];
      for (const h of handles) {
        try {
          (h as unknown as {handle?: {clear: () => void}}).handle?.clear();
        } catch {
          // best-effort cleanup
        }
      }
    }

    this.logger.captureEvent(
      'credential_issuance',
      'emissor',
      {
        algorithm: 'CL',
        parameters: {action: 'cred_def_created', credDefId, tag},
      },
      true,
    );

    return artifact;
  }

  // ------------------------------------------------------------------
  // Holder: Link Secret
  // ------------------------------------------------------------------

  /**
   * Creates or retrieves the holder's link secret.
   * The link secret is a blinding factor that ensures unlinkability
   * across multiple credential presentations.
   */
  async getOrCreateLinkSecret(): Promise<{
    linkSecret: string;
    linkSecretId: string;
  }> {
    const existing = await this.loadArtifact<{
      linkSecret: string;
      linkSecretId: string;
    }>('link_secret');

    if (existing) {
      return existing;
    }

    const linkSecret = LinkSecret.create();
    const linkSecretId = `link_secret_${Date.now()}`;

    const artifact = {linkSecret, linkSecretId};
    await this.saveArtifact('link_secret', artifact);

    this.logger.captureEvent(
      'key_generation',
      'titular',
      {parameters: {action: 'link_secret_created', linkSecretId}},
      true,
    );

    return artifact;
  }

  // ------------------------------------------------------------------
  // Issuance protocol: Offer → Request → Credential
  // ------------------------------------------------------------------

  /**
   * Issuer creates a credential offer for the holder.
   * Throws if the credDefId is malformed (cannot extract schemaId).
   */
  createCredentialOffer(credDefArtifact: CredDefArtifact): Record<string, unknown> {
    const schemaId = this.extractSchemaIdFromCredDef(credDefArtifact);
    if (!schemaId) {
      throw new CryptoError(
        `Cannot extract schemaId from credDefId: ${credDefArtifact.credDefId}`,
        'anoncreds',
        {credDefId: credDefArtifact.credDefId},
      );
    }
    const offer = CredentialOffer.create({
      schemaId,
      credentialDefinitionId: credDefArtifact.credDefId,
      keyCorrectnessProof: credDefArtifact.keyCorrectnessProof,
    });

    return offer.toJson();
  }

  /**
   * Holder creates a credential request in response to the offer.
   * Returns both the request (sent to issuer) and the metadata (kept by holder).
   */
  createCredentialRequest(
    holderDid: string,
    credDefArtifact: CredDefArtifact,
    offer: Record<string, unknown>,
    linkSecret: string,
    linkSecretId: string,
  ): {
    credentialRequest: Record<string, unknown>;
    credentialRequestMetadata: Record<string, unknown>;
  } {
    const result = CredentialRequest.create({
      entropy: holderDid,
      credentialDefinition: credDefArtifact.credDef,
      credentialOffer: offer,
      linkSecret,
      linkSecretId,
    });

    return {
      credentialRequest: result.credentialRequest.toJson(),
      credentialRequestMetadata: result.credentialRequestMetadata.toJson(),
    };
  }

  /**
   * Issuer creates the CL-signed credential.
   */
  createCredential(
    credDefArtifact: CredDefArtifact,
    offer: Record<string, unknown>,
    request: Record<string, unknown>,
    attributeRawValues: Record<string, string>,
  ): Record<string, unknown> {
    const credential = Credential.create({
      credentialDefinition: credDefArtifact.credDef,
      credentialDefinitionPrivate: credDefArtifact.credDefPrivate,
      credentialOffer: offer,
      credentialRequest: request,
      attributeRawValues,
    });

    return credential.toJson();
  }

  /**
   * Holder processes the received credential with their link secret.
   * This "blinds" the credential to the holder's link secret.
   */
  processCredential(
    rawCredential: Record<string, unknown>,
    credDefArtifact: CredDefArtifact,
    credentialRequestMetadata: Record<string, unknown>,
    linkSecret: string,
  ): Record<string, unknown> {
    const credential = Credential.fromJson(rawCredential);
    const processed = credential.process({
      credentialDefinition: credDefArtifact.credDef,
      credentialRequestMetadata,
      linkSecret,
    });

    return processed.toJson();
  }

  // ------------------------------------------------------------------
  // Presentation (ZKP selective disclosure & predicate proofs)
  // ------------------------------------------------------------------

  /**
   * Creates an AnonCreds presentation (ZKP) from one or more credentials.
   *
   * @param presentationRequestJson - The verifier's presentation request (referents + predicates)
   * @param credentials             - Array of holder's AnonCreds credentials
   * @param credentialsProve        - Which referents to reveal / prove as predicates
   * @param linkSecret              - Holder's link secret
   * @param schemas                 - Map of schemaId → Schema JSON
   * @param credentialDefinitions   - Map of credDefId → CredDef JSON
   */
  createPresentation(
    presentationRequestJson: Record<string, unknown>,
    credentials: Array<{credential: Record<string, unknown>}>,
    credentialsProve: Array<{
      entryIndex: number;
      referent: string;
      isPredicate: boolean;
      reveal: boolean;
    }>,
    linkSecret: string,
    schemas: Record<string, Record<string, unknown>>,
    credentialDefinitions: Record<string, Record<string, unknown>>,
  ): Record<string, unknown> {
    const presentation = Presentation.create({
      presentationRequest: presentationRequestJson,
      credentials: credentials.map(c => ({credential: c.credential})),
      credentialsProve,
      selfAttest: {},
      linkSecret,
      schemas,
      credentialDefinitions,
    });

    return presentation.toJson();
  }

  /**
   * Verifies an AnonCreds presentation against the original request.
   * Returns true when all revealed attributes and predicates are valid.
   */
  verifyPresentation(
    presentationJson: Record<string, unknown>,
    presentationRequestJson: Record<string, unknown>,
    schemas: Record<string, Record<string, unknown>>,
    credentialDefinitions: Record<string, Record<string, unknown>>,
  ): boolean {
    const presentation = Presentation.fromJson(presentationJson);
    return presentation.verify({
      presentationRequest: presentationRequestJson,
      schemas,
      credentialDefinitions,
    });
  }

  // ------------------------------------------------------------------
  // Presentation Request helpers
  // ------------------------------------------------------------------

  /**
   * Generates a cryptographically random AnonCreds nonce.
   *
   * SECURITY: Per the AnonCreds spec, presentation-request nonces must be
   * unpredictable to preserve unlinkability — a verifier (or an observer) who
   * can predict the nonce can trivially correlate presentations across time.
   *
   * The previous implementation used `String(Date.now())`, which is
   * sub-millisecond predictable and identical to the C1 weakness fixed in
   * `CryptoService`. We pull 10 cryptographically random bytes (~80 bits,
   * matching the AnonCreds reference implementation) via `crypto.getRandomValues`
   * and emit them as a decimal-digit string (the format expected by the
   * underlying CL-signature library).
   */
  generateNonce(): string {
    const bytes = new Uint8Array(10);
    if (typeof globalThis.crypto?.getRandomValues !== 'function') {
      throw new CryptoError(
        'Secure random number generator unavailable. ' +
          'Ensure react-native-get-random-values is imported before using AnonCredsService.',
        'nonce_generation',
      );
    }
    globalThis.crypto.getRandomValues(bytes);
    // Convert to BigInt then to decimal string. AnonCreds expects digits only.
    let value = 0n;
    for (const b of bytes) {
      // eslint-disable-next-line no-bitwise
      value = (value << 8n) | BigInt(b);
    }
    return value.toString(10);
  }

  /**
   * Builds a presentation request for selective disclosure of specific attributes.
   */
  buildSelectiveDisclosureRequest(
    name: string,
    nonce: string,
    revealedAttributes: Record<
      string,
      {name: string; restrictions?: Array<Record<string, string>>}
    >,
  ): Record<string, unknown> {
    return {
      name,
      version: '1.0',
      nonce,
      requested_attributes: revealedAttributes,
      requested_predicates: {},
    };
  }

  /**
   * Builds a presentation request with predicate proofs (e.g., age >= 18).
   */
  buildPredicateRequest(
    name: string,
    nonce: string,
    revealedAttributes: Record<
      string,
      {name: string; restrictions?: Array<Record<string, string>>}
    >,
    predicates: Record<
      string,
      {
        name: string;
        p_type: '>=' | '<=' | '>' | '<';
        p_value: number;
        restrictions?: Array<Record<string, string>>;
      }
    >,
  ): Record<string, unknown> {
    return {
      name,
      version: '1.0',
      nonce,
      requested_attributes: revealedAttributes,
      requested_predicates: predicates,
    };
  }

  // ------------------------------------------------------------------
  // Full issuance convenience method
  // ------------------------------------------------------------------

  /**
   * Runs the full AnonCreds issuance protocol in a single call.
   * Useful for the local/demo flow where issuer and holder coexist in the app.
   *
   * 1. Ensure schema + cred def exist
   * 2. Create offer
   * 3. Holder creates request
   * 4. Issuer creates credential
   * 5. Holder processes credential
   */
  async issueCredentialFull(
    issuerId: string,
    holderDid: string,
    schemaName: string,
    schemaVersion: string,
    attributeNames: string[],
    attributeValues: Record<string, string>,
  ): Promise<{
    credential: Record<string, unknown>;
    schemaArtifact: SchemaArtifact;
    credDefArtifact: CredDefArtifact;
  }> {
    // 1. Schema & CredDef
    const schemaArtifact = await this.getOrCreateSchema(
      issuerId,
      schemaName,
      schemaVersion,
      attributeNames,
    );

    const credDefArtifact = await this.getOrCreateCredentialDefinition(
      issuerId,
      schemaArtifact,
    );

    // 2. Offer
    const offer = this.createCredentialOffer(credDefArtifact);

    // 3. Holder request
    const {linkSecret, linkSecretId} = await this.getOrCreateLinkSecret();
    const {credentialRequest, credentialRequestMetadata} =
      this.createCredentialRequest(
        holderDid,
        credDefArtifact,
        offer,
        linkSecret,
        linkSecretId,
      );

    // 4. Issuer creates credential
    const rawCredential = this.createCredential(
      credDefArtifact,
      offer,
      credentialRequest,
      attributeValues,
    );

    // 5. Holder processes credential
    const processed = this.processCredential(
      rawCredential,
      credDefArtifact,
      credentialRequestMetadata,
      linkSecret,
    );

    this.logger.captureEvent(
      'credential_issuance',
      'emissor',
      {
        algorithm: 'CL',
        parameters: {
          action: 'anoncreds_credential_issued',
          schemaId: schemaArtifact.schemaId,
          credDefId: credDefArtifact.credDefId,
        },
      },
      true,
    );

    return {
      credential: processed,
      schemaArtifact,
      credDefArtifact,
    };
  }

  // ------------------------------------------------------------------
  // Storage helpers
  // ------------------------------------------------------------------

  private extractSchemaIdFromCredDef(credDefArtifact: CredDefArtifact): string {
    // credDefId format per AnonCreds spec: <issuerId>:3:CL:<schemaId>:<tag>
    // We must validate the shape — silently returning '' on a malformed
    // input would propagate as an empty-string lookup against the schemas
    // map and surface as a confusing "verification failed" downstream.
    const credDefId = credDefArtifact.credDefId;
    if (typeof credDefId !== 'string' || credDefId.length === 0) {
      throw new ValidationError(
        'CredDef artifact has missing/invalid credDefId',
        'credDefId',
        credDefId,
      );
    }
    const parts = credDefId.split(':3:CL:');
    if (parts.length < 2 || parts[0].length === 0) {
      throw new ValidationError(
        'CredDefId does not match AnonCreds spec format `<issuer>:3:CL:<schemaId>:<tag>`',
        'credDefId',
        credDefId,
      );
    }
    const remainder = parts[1];
    const tagSep = remainder.lastIndexOf(':');
    if (tagSep <= 0) {
      throw new ValidationError(
        'CredDefId is missing the required `:<tag>` suffix',
        'credDefId',
        credDefId,
      );
    }
    return remainder.substring(0, tagSep);
  }

  private async saveArtifact<T>(key: string, artifact: T): Promise<void> {
    await this.storage.setRawItem(
      `${this.STORAGE_PREFIX}${key}`,
      JSON.stringify(artifact),
    );
  }

  private async loadArtifact<T>(key: string): Promise<T | null> {
    const raw = await this.storage.getRawItem(
      `${this.STORAGE_PREFIX}${key}`,
    );
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as T;
  }
}

export { AnonCredsService };

const anonCredsServiceInstance = new AnonCredsService();
export default anonCredsServiceInstance;
