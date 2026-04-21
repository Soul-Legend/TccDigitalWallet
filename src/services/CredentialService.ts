import {StudentData, VerifiableCredential, ICredentialFormat} from '../types';
import type {ILogService, IStorageService, IDIDService, IAgentService, IAnonCredsService} from '../types';
import * as Clipboard from 'expo-clipboard';
import DIDServiceInstance from './DIDService';
import StorageServiceInstance from './StorageService';
import LogServiceInstance from './LogService';
import AgentServiceInstance from './AgentService';
import AnonCredsServiceInstance from './AnonCredsService';
import {CryptoError, ValidationError} from './ErrorHandler';
import {getKeyFromVerificationMethod} from '@credo-ts/core';
import {Buffer} from 'buffer';
import {
  CredentialFormat,
  CredentialFormatType,
  CREDENTIAL_DEFAULT_TTL_SECONDS,
} from '../utils/constants';
import {
  base64UrlToBytes,
  bytesToBase64Url,
  stringToBase64Url,
  utf8ToBytes,
} from './encoding';

function toUint8Array(value: unknown): Uint8Array {
  if (value instanceof Uint8Array) {
    return value;
  }
  if (
    value &&
    typeof value === 'object' &&
    typeof (value as {length?: number}).length === 'number'
  ) {
    // Buffer (Node) or array-like; copy into Uint8Array
    return Uint8Array.from(value as ArrayLike<number>);
  }
  throw new CryptoError(
    'Wallet signature returned in unexpected format',
    'signature',
    {actualType: typeof value},
  );
}

/**
 * CredentialService - Handles credential issuance and management
 *
 * This service is responsible for:
 * - Generating issuer DIDs (did:web)
 * - Creating Verifiable Credentials from StudentData
 * - Signing credentials digitally
 * - Formatting credentials as SD-JWT or AnonCreds
 * - Copying credentials to clipboard
 */
class CredentialService {
  /**
   * Format registry (Open/Closed Principle).
   * New credential formats can be registered without modifying parsing logic.
   */
  private formats: ICredentialFormat[] = [];
  private readonly didService: IDIDService;
  private readonly storage: IStorageService;
  private readonly logger: ILogService;
  private readonly agentService: IAgentService;
  private readonly anonCredsService: IAnonCredsService;
  private readonly credentialTtlSeconds: number;

  constructor(
    didService: IDIDService = DIDServiceInstance,
    storage: IStorageService = StorageServiceInstance,
    logger: ILogService = LogServiceInstance,
    agentService: IAgentService = AgentServiceInstance,
    anonCredsService: IAnonCredsService = AnonCredsServiceInstance,
    credentialTtlSeconds: number = CREDENTIAL_DEFAULT_TTL_SECONDS,
  ) {
    this.didService = didService;
    this.storage = storage;
    this.logger = logger;
    this.agentService = agentService;
    this.anonCredsService = anonCredsService;
    this.credentialTtlSeconds = credentialTtlSeconds;
    // Register default formats (order matters — first match wins)
    this.registerFormat({
      name: 'AnonCreds',
      detect: (_token, parsed) =>
        parsed !== null &&
        ((parsed.format === CredentialFormat.ANONCREDS && parsed.credential) ||
          (parsed.schema_id && parsed.values)),
      parse: (token) => this.parseAnonCreds(token),
    });
    this.registerFormat({
      name: 'SD-JWT',
      detect: (token, _parsed) => token.includes('.'),
      parse: (token) => this.parseSDJWT(token),
    });
  }

  /**
   * Registers a new credential format parser (extensibility point).
   */
  registerFormat(format: ICredentialFormat): void {
    this.formats.push(format);
  }

  /**
   * Generates or retrieves the institution's DID (did:web)
   * For the MVP, we simulate UFSC as the issuer
   */
  async getOrCreateIssuerDID(): Promise<{did: string; publicKey: string}> {
    try {
      // Check if issuer DID already exists
      const existingDID = await this.storage.getIssuerDID();

      if (existingDID) {
        // DID exists, retrieve the stored public key
        const existingPublicKey = await this.storage.getIssuerPublicKey();

        this.logger.captureEvent(
          'key_generation',
          'emissor',
          {
            algorithm: 'Ed25519',
            key_size: 256,
            did_method: 'did:web',
            parameters: {
              action: 'retrieved_existing',
            },
          },
          true,
        );

        return {did: existingDID, publicKey: existingPublicKey || ''};
      }

      // Generate new issuer identity
      const {did, publicKey} = await this.didService.generateIssuerIdentity(
        'ufsc.br',
        'identidade-academica',
      );

      return {did, publicKey};
    } catch (error) {
      this.logger.captureEvent(
        'error',
        'emissor',
        {
          parameters: {
            action: 'issuer_did_generation_failed',
            errorMessage: error instanceof Error ? error.message : String(error),
            errorName: error instanceof Error ? error.name : typeof error,
          },
          stack_trace: error instanceof Error ? error.stack : undefined,
        },
        false,
        error instanceof Error ? error : new Error(String(error)),
      );
      throw new CryptoError(
        'Failed to generate issuer DID',
        'key_generation',
        {error},
      );
    }
  }

  /**
   * Issues a Verifiable Credential from StudentData
   * @param studentData - The student's academic data
   * @param holderDID - The DID of the credential holder (student)
   * @param format - The credential format ('sd-jwt' or 'anoncreds')
   * @returns The issued credential as a string (JWT or AnonCreds format)
   */
  async issueCredential(
    studentData: StudentData,
    holderDID: string,
    format: CredentialFormatType = CredentialFormat.SD_JWT,
  ): Promise<string> {
    try {
      // Get or create issuer DID
      const {did: issuerDID} = await this.getOrCreateIssuerDID();

      // Create the credential object
      const credential = await this.createVerifiableCredential(
        studentData,
        holderDID,
        issuerDID,
      );

      // Sign and format the credential based on the requested format
      let signedCredential: string;

      if (format === CredentialFormat.SD_JWT) {
        signedCredential = await this.signCredentialAsSDJWT(
          credential,
          issuerDID,
        );
      } else {
        signedCredential = await this.signCredentialAsAnonCreds(
          credential,
          issuerDID,
        );
      }

      // Log the credential issuance
      this.logger.logCredentialIssuance(
        format === CredentialFormat.SD_JWT ? 'SD-JWT' : 'AnonCreds',
        true,
        {
          issuer: issuerDID,
          holder: holderDID,
          format,
        },
      );

      return signedCredential;
    } catch (error) {
      // Log the error
      this.logger.logCredentialIssuance(
        format === CredentialFormat.SD_JWT ? 'SD-JWT' : 'AnonCreds',
        false,
        undefined,
        error instanceof Error ? error : new Error(String(error)),
      );

      throw error;
    }
  }

  /**
   * Creates a VerifiableCredential object from StudentData
   */
  private async createVerifiableCredential(
    studentData: StudentData,
    holderDID: string,
    issuerDID: string,
  ): Promise<VerifiableCredential> {
    const now = new Date();
    const issuanceDate = now.toISOString();

    // Create credential subject with holder DID
    const credentialSubject = {
      id: holderDID,
      ...studentData,
    };

    // Create the credential structure
    const credential: VerifiableCredential = {
      '@context': [
        'https://www.w3.org/2018/credentials/v1',
        'https://w3id.org/security/suites/jws-2020/v1',
      ],
      type: ['VerifiableCredential', 'AcademicIDCredential'],
      issuer: issuerDID,
      issuanceDate,
      credentialSubject,
      proof: {
        type: 'JsonWebSignature2020',
        created: issuanceDate,
        verificationMethod: `${issuerDID}#key-1`,
        proofPurpose: 'assertionMethod',
      },
    };

    return credential;
  }

  /**
   * Signs a credential and formats it as SD-JWT
   * Uses the Credo agent's wallet for Ed25519 signing
   */
  private async signCredentialAsSDJWT(
    credential: VerifiableCredential,
    issuerDID: string,
  ): Promise<string> {
    try {
      const agent = await this.agentService.getAgent();

      // Resolve the issuer's signing DID (did:key) to get the key reference
      const signingDid = await this.storage.getIssuerSigningDid();
      if (!signingDid) {
        throw new CryptoError(
          'Issuer signing DID not found',
          'signature',
          {},
        );
      }

      const didResult = await agent.dids.resolve(signingDid);
      const verificationMethod =
        didResult.didDocument?.verificationMethod?.[0];
      if (!verificationMethod) {
        throw new CryptoError(
          'No verification method found for issuer DID',
          'signature',
          {},
        );
      }

      // Build JWT payload
      const nowSeconds = Math.floor(Date.now() / 1000);
      const payload = {
        vc: credential,
        iss: issuerDID,
        sub: credential.credentialSubject.id,
        iat: nowSeconds,
        exp: nowSeconds + this.credentialTtlSeconds,
      };

      const header = {
        alg: 'EdDSA',
        typ: 'JWT',
        kid: verificationMethod.id,
      };

      const headerBase64 = stringToBase64Url(JSON.stringify(header));
      const payloadBase64 = stringToBase64Url(JSON.stringify(payload));

      const dataToSign = Buffer.from(`${headerBase64}.${payloadBase64}`, 'utf-8');

      // Extract the proper Key instance from the verification method.
      // Credo's wallet.sign() expects a Key object (not raw bytes) so it
      // can look up the matching private key in Askar.
      const signingKey = getKeyFromVerificationMethod(verificationMethod);

      // Resolve the underlying Wallet (with sign()) — NOT the WalletApi wrapper.
      // `agent.wallet` is WalletApi (no sign()), `agent.context.wallet` is the
      // actual Wallet interface that exposes sign().
      type WalletSignArg = {data: Buffer; key: unknown};
      type WalletLike = {
        sign: (arg: WalletSignArg) => Promise<Buffer>;
      };
      const agentAny = agent as any;
      const wallet: WalletLike | undefined =
        (typeof agentAny.context?.wallet?.sign === 'function'
          ? agentAny.context.wallet
          : undefined) ??
        (typeof agentAny.wallet?.sign === 'function'
          ? agentAny.wallet
          : undefined);
      if (!wallet) {
        throw new CryptoError(
          'Credo wallet sign API unavailable',
          'signature',
          {},
        );
      }

      // Credo's wallet.sign() returns the signature Buffer directly.
      const signatureBytes = toUint8Array(
        await wallet.sign({data: dataToSign, key: signingKey}),
      );

      const signatureBase64 = bytesToBase64Url(signatureBytes);
      return `${headerBase64}.${payloadBase64}.${signatureBase64}`;
    } catch (error) {
      this.logger.captureEvent(
        'error',
        'emissor',
        {
          parameters: {
            action: 'sdjwt_sign_failed',
            errorMessage: error instanceof Error ? error.message : String(error),
            errorName: error instanceof Error ? error.name : typeof error,
            issuerDID,
          },
          stack_trace: error instanceof Error ? error.stack : undefined,
        },
        false,
        error instanceof Error ? error : new Error(String(error)),
      );
      throw new CryptoError(
        'Failed to sign credential as SD-JWT',
        'signature',
        {error},
      );
    }
  }

  /**
   * Issues a credential using the real AnonCreds CL-signature protocol.
   *
   * Runs the full protocol: Schema → CredDef → Offer → Request → Credential.
   * Stores the processed credential together with artifact references so
   * the holder can later create AnonCreds presentations (ZKP selective
   * disclosure and predicate proofs).
   */
  private async signCredentialAsAnonCreds(
    credential: VerifiableCredential,
    _issuerDID: string,
  ): Promise<string> {
    try {
      const issuerDid =
        (await this.storage.getIssuerDID()) || 'did:web:ufsc.br';
      const holderDid = credential.credentialSubject.id;

      // Convert StudentData attributes to flat string map for AnonCreds
      const attributeNames: string[] = [];
      const attributeValues: Record<string, string> = {};

      for (const [key, value] of Object.entries(
        credential.credentialSubject,
      )) {
        if (key === 'id') {
          continue;
        }
        attributeNames.push(key);
        if (Array.isArray(value)) {
          attributeValues[key] = JSON.stringify(value);
        } else {
          attributeValues[key] = String(value);
        }
      }

      // Full AnonCreds issuance protocol
      const {credential: anonCredsCredential, schemaArtifact, credDefArtifact} =
        await this.anonCredsService.issueCredentialFull(
          issuerDid,
          holderDid,
          'academic-id',
          '1.0',
          attributeNames,
          attributeValues,
        );

      // Wrap in an envelope that includes artifact references for later
      // presentation creation and verification
      const envelope = {
        format: CredentialFormat.ANONCREDS,
        credential: anonCredsCredential,
        schema_id: schemaArtifact.schemaId,
        cred_def_id: credDefArtifact.credDefId,
        holder_did: holderDid,
      };

      return JSON.stringify(envelope);
    } catch (error) {
      this.logger.captureEvent(
        'error',
        'emissor',
        {
          parameters: {
            action: 'anoncreds_sign_failed',
            errorMessage: error instanceof Error ? error.message : String(error),
            errorName: error instanceof Error ? error.name : typeof error,
          },
          stack_trace: error instanceof Error ? error.stack : undefined,
        },
        false,
        error instanceof Error ? error : new Error(String(error)),
      );
      throw new CryptoError(
        'Failed to issue AnonCreds credential',
        'signature',
        {error},
      );
    }
  }

  /**
   * Copies a credential to the clipboard
   * @param credential - The credential string to copy
   */
  async copyToClipboard(credential: string): Promise<void> {
    try {
      await Clipboard.setStringAsync(credential);

      this.logger.captureEvent(
        'credential_issuance',
        'emissor',
        {
          parameters: {
            action: 'copied_to_clipboard',
            credential_length: credential.length,
          },
        },
        true,
      );
    } catch (error) {
      throw new CryptoError(
        'Failed to copy credential to clipboard',
        'clipboard',
        {error},
      );
    }
  }

  /**
   * Validates and parses a credential token (SD-JWT or AnonCreds)
   * @param token - The credential token string
   * @returns Parsed VerifiableCredential object
   */
  async validateAndParseCredential(token: string): Promise<VerifiableCredential> {
    try {
      // Try to parse as JSON first (could be AnonCreds or other JSON format)
      let parsedToken: any = null;
      try {
        parsedToken = JSON.parse(token);
      } catch (parseError) {
        // Not JSON — treat as JWT. Log at debug level for troubleshooting.
        this.logger.captureEvent(
          'error',
          'emissor',
          {
            parameters: {
              action: 'credential_parse_attempt',
              reason: 'Token is not valid JSON, trying JWT',
              snippet: token.substring(0, 80),
              parseError: parseError instanceof Error ? parseError.message : String(parseError),
            },
          },
          true,
        );
      }

      // Iterate through format registry (first match wins)
      for (const format of this.formats) {
        if (format.detect(token, parsedToken)) {
          return await format.parse(token);
        }
      }

      // No format matched
      throw new ValidationError(
        'Formato de credencial inválido',
        'token',
        token.substring(0, 50),
      );
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      this.logger.captureEvent(
        'error',
        'emissor',
        {
          parameters: {
            action: 'credential_validation_failed',
            errorMessage: error instanceof Error ? error.message : String(error),
            errorName: error instanceof Error ? error.name : typeof error,
            snippet: token.substring(0, 80),
          },
          stack_trace: error instanceof Error ? error.stack : undefined,
        },
        false,
        error instanceof Error ? error : new Error(String(error)),
      );
      throw new ValidationError(
        'Formato de credencial inválido',
        'token',
        token.substring(0, 50),
      );
    }
  }

  /**
   * Parses an SD-JWT token into a VerifiableCredential
   */
  private async parseSDJWT(jwt: string): Promise<VerifiableCredential> {
    try {
      // Split JWT into parts
      const parts = jwt.split('.');

      if (parts.length !== 3) {
        throw new ValidationError(
          'JWT deve conter 3 partes (header.payload.signature)',
          'jwt',
          jwt.substring(0, 50),
        );
      }

      // Decode payload
      const payloadBase64 = parts[1];
      const payloadJson = new TextDecoder().decode(
        base64UrlToBytes(payloadBase64),
      );
      const payload = JSON.parse(payloadJson);

      // Extract credential from payload
      if (!payload.vc) {
        throw new ValidationError(
          'JWT não contém credencial verificável',
          'jwt_payload',
          payloadJson.substring(0, 50),
        );
      }

      const credential = payload.vc as VerifiableCredential;

      // Validate credential structure
      this.validateCredentialStructure(credential);

      return credential;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      this.logger.captureEvent(
        'error',
        'emissor',
        {
          parameters: {
            action: 'sdjwt_decode_failed',
            errorMessage: error instanceof Error ? error.message : String(error),
            errorName: error instanceof Error ? error.name : typeof error,
            snippet: jwt.substring(0, 80),
          },
          stack_trace: error instanceof Error ? error.stack : undefined,
        },
        false,
        error instanceof Error ? error : new Error(String(error)),
      );
      throw new ValidationError(
        'Erro ao decodificar SD-JWT',
        'jwt',
        jwt.substring(0, 50),
      );
    }
  }

  /**
   * Parses an AnonCreds credential into a VerifiableCredential.
   * Supports both the new envelope format (from real AnonCreds) and
   * legacy shaped JSON for backward compatibility.
   */
  private async parseAnonCreds(anonCredsJson: string): Promise<VerifiableCredential> {
    try {
      const parsed = JSON.parse(anonCredsJson);

      // New envelope format: { format: 'anoncreds', credential, schema_id, cred_def_id }
      const isEnvelope = parsed.format === CredentialFormat.ANONCREDS && parsed.credential;
      const anonCreds = isEnvelope ? parsed.credential : parsed;
      const schemaId = isEnvelope
        ? parsed.schema_id
        : parsed.schema_id || 'unknown';
      const credDefId = isEnvelope
        ? parsed.cred_def_id
        : parsed.cred_def_id || 'unknown';
      const holderDid = isEnvelope ? parsed.holder_did || '' : '';

      // Extract attribute values from the AnonCreds credential
      const credentialSubject: any = {id: holderDid};

      // Real AnonCreds credentials store values under `values` with {raw, encoded}
      const values = anonCreds.values || {};
      for (const [key, value] of Object.entries(values)) {
        const attrValue = value as {raw: string; encoded: string};
        const raw = attrValue?.raw ?? String(value);

        if (raw === 'true' || raw === 'false') {
          credentialSubject[key] = raw === 'true';
        } else if (key === 'acesso_laboratorios' || key === 'acesso_predios') {
          try {
            credentialSubject[key] = JSON.parse(raw);
          } catch (arrayParseError) {
            this.logger.captureEvent(
              'error',
              'emissor',
              {
                parameters: {
                  action: 'anoncreds_array_parse_failed',
                  field: key,
                  rawValue: raw.substring(0, 80),
                  parseError: arrayParseError instanceof Error ? arrayParseError.message : String(arrayParseError),
                },
              },
              false,
            );
            credentialSubject[key] = [];
          }
        } else {
          credentialSubject[key] = raw;
        }
      }

      // Extract the base issuer DID from the cred_def_id.
      // Format: {issuerDid}:3:CL:{...}  — the issuer DID is everything
      // before the first ':3:CL:' segment.
      const clSeparator = ':3:CL:';
      const issuerFromCredDef = credDefId.includes(clSeparator)
        ? credDefId.substring(0, credDefId.indexOf(clSeparator))
        : credDefId;

      const credential: VerifiableCredential = {
        '@context': [
          'https://www.w3.org/2018/credentials/v1',
          'https://w3id.org/security/suites/jws-2020/v1',
        ],
        type: ['VerifiableCredential', 'AcademicIDCredential'],
        issuer: issuerFromCredDef,
        issuanceDate: new Date().toISOString(),
        credentialSubject,
        proof: {
          type: 'CLSignature2023',
          created: new Date().toISOString(),
          verificationMethod: `${credDefId}#key-1`,
          proofPurpose: 'assertionMethod',
          signature: isEnvelope
            ? JSON.stringify({schema_id: schemaId, cred_def_id: credDefId})
            : JSON.stringify(anonCreds.signature),
        },
      };

      return credential;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      this.logger.captureEvent(
        'error',
        'emissor',
        {
          parameters: {
            action: 'anoncreds_decode_failed',
            errorMessage: error instanceof Error ? error.message : String(error),
            errorName: error instanceof Error ? error.name : typeof error,
            snippet: anonCredsJson.substring(0, 80),
          },
          stack_trace: error instanceof Error ? error.stack : undefined,
        },
        false,
        error instanceof Error ? error : new Error(String(error)),
      );
      throw new ValidationError(
        'Erro ao decodificar AnonCreds',
        'anoncreds',
        anonCredsJson.substring(0, 50),
      );
    }
  }

  /**
   * Validates the structure of a VerifiableCredential
   */
  private validateCredentialStructure(credential: VerifiableCredential): void {
    // Check required fields
    if (!credential['@context'] || !Array.isArray(credential['@context'])) {
      throw new ValidationError(
        'Campo @context ausente ou inválido',
        '@context',
        credential['@context'],
      );
    }

    if (!credential.type || !Array.isArray(credential.type)) {
      throw new ValidationError(
        'Campo type ausente ou inválido',
        'type',
        credential.type,
      );
    }

    if (!credential.issuer || typeof credential.issuer !== 'string') {
      throw new ValidationError(
        'Campo issuer ausente ou inválido',
        'issuer',
        credential.issuer,
      );
    }

    if (!credential.issuanceDate || typeof credential.issuanceDate !== 'string') {
      throw new ValidationError(
        'Campo issuanceDate ausente ou inválido',
        'issuanceDate',
        credential.issuanceDate,
      );
    }

    if (!credential.credentialSubject || typeof credential.credentialSubject !== 'object') {
      throw new ValidationError(
        'Campo credentialSubject ausente ou inválido',
        'credentialSubject',
        credential.credentialSubject,
      );
    }

    if (!credential.proof || typeof credential.proof !== 'object') {
      throw new ValidationError(
        'Campo proof ausente ou inválido',
        'proof',
        credential.proof,
      );
    }
  }

  /**
   * Validates StudentData before credential issuance
   * Ensures all required fields are present and valid
   */
  validateStudentData(data: StudentData): void {
    const requiredFields: (keyof StudentData)[] = [
      'nome_completo',
      'cpf',
      'matricula',
      'curso',
      'status_matricula',
      'data_nascimento',
    ];

    for (const field of requiredFields) {
      if (!data[field] || data[field] === '') {
        throw new ValidationError(
          'Campo obrigatório ausente ou vazio',
          field,
          data[field],
        );
      }
    }

    // Validate CPF format (11 digits)
    if (!/^\d{11}$/.test(data.cpf)) {
      throw new ValidationError(
        'CPF deve conter 11 dígitos',
        'cpf',
        data.cpf,
      );
    }

    // Validate date format (ISO 8601)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data.data_nascimento)) {
      throw new ValidationError(
        'Data de nascimento deve estar no formato YYYY-MM-DD',
        'data_nascimento',
        data.data_nascimento,
      );
    }

    // Validate date is actually valid (not 2024-13-01, etc.)
    const dateObj = new Date(data.data_nascimento);
    if (isNaN(dateObj.getTime())) {
      throw new ValidationError(
        'Data de nascimento inválida',
        'data_nascimento',
        data.data_nascimento,
      );
    }

    // Check if the date string matches the parsed date (catches invalid dates like 2024-13-01)
    const [year, month, day] = data.data_nascimento.split('-').map(Number);
    if (
      dateObj.getFullYear() !== year ||
      dateObj.getMonth() + 1 !== month ||
      dateObj.getDate() !== day
    ) {
      throw new ValidationError(
        'Data de nascimento inválida',
        'data_nascimento',
        data.data_nascimento,
      );
    }

    // Validate status_matricula
    if (!['Ativo', 'Inativo'].includes(data.status_matricula)) {
      throw new ValidationError(
        'Status de matrícula deve ser "Ativo" ou "Inativo"',
        'status_matricula',
        data.status_matricula,
      );
    }
  }
}

// Export singleton instance
export { CredentialService };

const credentialServiceInstance = new CredentialService();
export default credentialServiceInstance;
