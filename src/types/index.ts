// Type definitions for the application
// Will be populated in subsequent tasks

import {CredentialFormatType} from '../utils/constants';

export interface StudentData {
  nome_completo: string;
  cpf: string;
  matricula: string;
  curso: string;
  status_matricula: 'Ativo' | 'Inativo';
  data_nascimento: string;
  alojamento_indigena: boolean;
  auxilio_creche: boolean;
  auxilio_moradia: boolean;
  bolsa_estudantil: boolean;
  bolsa_permanencia_mec: boolean;
  paiq: boolean;
  moradia_estudantil: boolean;
  isencao_ru: boolean;
  isencao_esporte: boolean;
  isencao_idiomas: boolean;
  acesso_laboratorios: string[];
  acesso_predios: string[];
}

export interface VerifiableCredential {
  '@context': string[];
  type: string[];
  issuer: string;
  issuanceDate: string;
  expirationDate?: string;
  credentialSubject: StudentData & {id: string};
  proof: Proof;
}

export interface Proof {
  type: string;
  created: string;
  verificationMethod: string;
  proofPurpose: string;
  jws?: string;
  signature?: string;
  challenge?: string;
}

export interface PresentationRequest {
  type: 'PresentationExchange';
  challenge: string;
  requested_attributes: string[];
  optional_attributes?: string[];
  predicates?: Predicate[];
}

export interface Predicate {
  attribute: string;
  p_type: '>=' | '<=' | '==' | '!=';
  value: any;
}

export interface VerifiablePresentation {
  '@context': string[];
  type: string[];
  holder: string;
  verifiableCredential: VerifiableCredential | string;
  proof: Proof;
  disclosed_attributes?: Record<string, any>;
  zkp_proof?: {
    proof_data: any;
    revealed_attrs: string[];
    predicates: Array<{
      attr_name: string;
      p_type: string;
      value: number;
      satisfied?: boolean;
    }>;
  };
  zkp_proofs?: any[];
  nullifier?: string;
}

export interface LogEntry {
  id: string;
  timestamp: Date;
  operation:
    | 'key_generation'
    | 'credential_issuance'
    | 'presentation_creation'
    | 'verification'
    | 'hash_computation'
    | 'zkp_generation'
    | 'trust_chain_init'
    | 'trust_chain_register'
    | 'error';
  module: 'emissor' | 'titular' | 'verificador';
  details: LogDetails;
  success: boolean;
  error?: Error;
}

export interface LogDetails {
  algorithm?: string;
  key_size?: number;
  did_method?: string;
  hash_output?: string;
  verification_result?: boolean;
  parameters?: Record<string, any>;
  stack_trace?: string;
  format?: string;
  holder?: string;
  root_did?: string;
  parent_did?: string;
  child_did?: string;
  child_name?: string;
}

// PEX (Presentation Exchange) Types
export interface PresentationExchangeRequest {
  type: 'PresentationExchange';
  version: string;
  challenge: string;
  presentation_definition: {
    id: string;
    input_descriptors: Array<{
      id: string;
      name: string;
      purpose: string;
      constraints: {
        fields: Array<{
          path: string[];
          filter?: {
            type: string;
            const?: any;
            pattern?: string;
            contains?: {
              const?: any;
            };
          };
          predicate?: 'required' | 'preferred';
        }>;
        limit_disclosure?: 'required' | 'preferred';
      };
    }>;
  };
  predicates?: Array<{
    attribute: string;
    p_type: '>=' | '<=' | '==' | '!=';
    value: any;
  }>;
  election_id?: string;
  resource_id?: string;
}

// Scenario Types
export interface Scenario {
  id: string;
  name: string;
  description: string;
  type: 'selective_disclosure' | 'zkp_eligibility' | 'range_proof' | 'access_control';
  requested_attributes?: string[];
  predicates?: Predicate[];
  challenge_data?: any;
}

// Validation Result
export interface ValidationResult {
  valid: boolean;
  errors?: string[];
  verified_attributes?: Record<string, any>;
  predicates_satisfied?: boolean;
  nullifier_check?: 'new' | 'duplicate';
  trust_chain_valid?: boolean;
}

// Secure Storage
export interface SecureStorage {
  holder_private_key: string;
  holder_did: string;
  credentials: VerifiableCredential[];
  nullifiers: Record<string, string[]>;
  issuer_private_key: string;
  issuer_did: string;
}

// Consent Data
export interface ConsentData {
  requested_attributes: string[];
  optional_attributes: string[];
  required_attributes: string[];
  predicates?: Predicate[];
}

// ZKP Proof
export interface ZKPProof {
  proof_data: any;
  revealed_attrs: string[];
  predicates: Array<{
    attr_name: string;
    p_type: string;
    value: number;
  }>;
}

// -------------------------------------------------------------------
// Trusted Issuer (PKI Trust Chain)
// -------------------------------------------------------------------

export interface TrustedIssuer {
  did: string;
  publicKey: string;
  name: string;
  parentDid: string | null;
  certificate: string;
  createdAt: string;
}

// -------------------------------------------------------------------
// Service Interfaces (Dependency Inversion Principle)
// -------------------------------------------------------------------

export type ModuleType = 'emissor' | 'titular' | 'verificador';

export interface ICryptoService {
  computeHash(data: string | Uint8Array, module?: ModuleType): Promise<string>;
  signData(data: string | Uint8Array, privateKeyHex: string, module?: ModuleType): Promise<string>;
  verifySignature(data: string | Uint8Array, signatureHex: string, publicKeyHex: string, module?: ModuleType): Promise<boolean>;
  computeCompositeHash(values: (string | Uint8Array)[], module?: ModuleType): Promise<string>;
  generateNonce(): string;
}

export interface IStorageService {
  storeHolderPrivateKey(privateKey: string, did: string): Promise<void>;
  getHolderPrivateKey(): Promise<string | null>;
  getHolderDID(): Promise<string | null>;
  storeHolderDID(did: string): Promise<void>;
  storeIssuerPrivateKey(privateKey: string, did: string): Promise<void>;
  getIssuerPrivateKey(): Promise<string | null>;
  getIssuerDID(): Promise<string | null>;
  storeIssuerDID(did: string): Promise<void>;
  getCredentials(): Promise<string[]>;
  storeCredential(credential: string): Promise<void>;
  deleteCredential(index: number): Promise<void>;
  storeHolderPublicKey(publicKey: string): Promise<void>;
  getHolderPublicKey(): Promise<string | null>;
  storeIssuerPublicKey(publicKey: string): Promise<void>;
  getIssuerPublicKey(): Promise<string | null>;
  storeIssuerSigningDid(signingDid: string): Promise<void>;
  getIssuerSigningDid(): Promise<string | null>;
  getNullifiers(electionId: string): Promise<string[]>;
  storeNullifier(nullifier: string, electionId: string): Promise<void>;
  setRawItem(key: string, value: string): Promise<void>;
  getRawItem(key: string): Promise<string | null>;
  clearAll(): Promise<void>;
}

export interface ICredentialService {
  getOrCreateIssuerDID(): Promise<{did: string; publicKey: string}>;
  issueCredential(studentData: StudentData, holderDID: string, format?: CredentialFormatType): Promise<string>;
  validateAndParseCredential(token: string): Promise<VerifiableCredential>;
  validateStudentData(data: StudentData): void;
  copyToClipboard(credential: string): Promise<void>;
}

export interface ITrustChainService {
  initializeRootIssuer(did: string, name: string): Promise<TrustedIssuer>;
  registerChildIssuer(parentDid: string, parentPrivateKey: string, childDid: string, childName: string): Promise<TrustedIssuer>;
  verifyTrustChain(issuerDid: string): Promise<{trusted: boolean; chain: TrustedIssuer[]; error?: string}>;
  isTrustedIssuer(did: string): Promise<boolean> | boolean;
  getAllIssuers(): Promise<TrustedIssuer[]>;
  getRootIssuer(): TrustedIssuer | null | undefined;
  getIssuerPrivateKey(did: string): Promise<string | null>;
  reset(): Promise<void>;
}

export interface IVerificationStep {
  name: string;
  validate(
    presentation: VerifiablePresentation,
    pexRequest: PresentationExchangeRequest,
    context: VerificationContext,
  ): Promise<StepResult>;
}

export interface VerificationContext {
  errors: string[];
  verifiedAttributes?: Record<string, any>;
  trustChainValid?: boolean;
  nullifierCheck?: 'new' | 'duplicate';
  predicatesSatisfied?: boolean;
}

export interface StepResult {
  valid: boolean;
  error?: string;
}

export interface IVerificationService {
  getScenarios(): Scenario[];
  getScenario(scenarioId: string): Scenario | undefined;
  generateChallenge(scenarioId: string, additionalData?: Record<string, any>): Promise<PresentationExchangeRequest>;
  validatePresentation(presentation: string | VerifiablePresentation, pexRequest: PresentationExchangeRequest): Promise<ValidationResult>;
  validatePresentationFormat(presentation: string | object): VerifiablePresentation;
}

// -------------------------------------------------------------------
// Credential Format Registry (Open/Closed Principle)
// -------------------------------------------------------------------

export interface ICredentialFormat {
  name: string;
  detect(token: string, parsed: any): boolean;
  parse(token: string): Promise<VerifiableCredential>;
}

// -------------------------------------------------------------------
// Additional Service Interfaces (Dependency Injection)
// -------------------------------------------------------------------

export interface ILogService {
  captureEvent(
    operation: LogEntry['operation'],
    module: LogEntry['module'],
    details: LogDetails,
    success?: boolean,
    error?: Error,
  ): void;
  logKeyGeneration(module: LogEntry['module'], algorithm: string, keySize: number, didMethod: string, success?: boolean, error?: Error): void;
  logCredentialIssuance(algorithm: string, success?: boolean, parameters?: Record<string, any>, error?: Error): void;
  logPresentationCreation(algorithm: string, success?: boolean, parameters?: Record<string, any>, error?: Error): void;
  logVerification(algorithm: string, verificationResult: boolean, success?: boolean, parameters?: Record<string, any>, error?: Error): void;
  logHashComputation(module: LogEntry['module'], algorithm: string, hashOutput: string, success?: boolean, error?: Error): void;
  logZKPGeneration(module: LogEntry['module'], algorithm: string, success?: boolean, parameters?: Record<string, any>, error?: Error): void;
  logError(module: LogEntry['module'], error: Error, stackTrace?: string): void;
  getLogs(): LogEntry[];
  clearLogs(): void;
  filterLogs(operation?: string, module?: string): LogEntry[];
}

export interface IAgentService {
  getAgent(): Promise<any>;
  shutdown(): Promise<void>;
  isInitialized(): boolean;
}

export interface IDIDService {
  createDidKey(): Promise<{did: string; verificationMethodId: string}>;
  createDidPeer(): Promise<{did: string; verificationMethodId: string}>;
  createDidWeb(domain: string, path?: string): string;
  generateHolderIdentity(method?: 'key' | 'peer'): Promise<{did: string; publicKey: string}>;
  generateIssuerIdentity(domain?: string, path?: string): Promise<{did: string; publicKey: string}>;
}

export interface IAnonCredsService {
  getOrCreateSchema(issuerId: string, name: string, version: string, attributeNames: string[]): Promise<{schemaId: string; schema: Record<string, unknown>}>;
  getOrCreateCredentialDefinition(issuerId: string, schemaArtifact: {schemaId: string; schema: Record<string, unknown>}, tag?: string): Promise<{credDefId: string; credDef: Record<string, unknown>; credDefPrivate: Record<string, unknown>; keyCorrectnessProof: Record<string, unknown>}>;
  getOrCreateLinkSecret(): Promise<{linkSecret: string; linkSecretId: string}>;
  issueCredentialFull(issuerId: string, holderDid: string, schemaName: string, schemaVersion: string, attributeNames: string[], attributeValues: Record<string, string>): Promise<{credential: Record<string, unknown>; schemaArtifact: {schemaId: string; schema: Record<string, unknown>}; credDefArtifact: {credDefId: string; credDef: Record<string, unknown>; credDefPrivate: Record<string, unknown>; keyCorrectnessProof: Record<string, unknown>}}>;
  verifyPresentation(presentationJson: Record<string, unknown>, presentationRequestJson: Record<string, unknown>, schemas: Record<string, Record<string, unknown>>, credentialDefinitions: Record<string, Record<string, unknown>>): boolean;
  buildSelectiveDisclosureRequest(name: string, nonce: string, revealedAttributes: Record<string, {name: string; restrictions?: Array<Record<string, string>>}>): Record<string, unknown>;
  createPresentation(presentationRequestJson: Record<string, unknown>, credentials: Array<{credential: Record<string, unknown>}>, credentialsProve: Array<{entryIndex: number; referent: string; isPredicate: boolean; reveal: boolean}>, linkSecret: string, schemas: Record<string, Record<string, unknown>>, credentialDefinitions: Record<string, Record<string, unknown>>): Record<string, unknown>;
  buildPredicateRequest(name: string, nonce: string, revealedAttributes: Record<string, {name: string; restrictions?: Array<Record<string, string>>}>, predicates: Record<string, {name: string; p_type: '>=' | '<=' | '>' | '<'; p_value: number; restrictions?: Array<Record<string, string>>}>): Record<string, unknown>;
  /** Cryptographically random AnonCreds nonce (decimal-string, ~80 bits). See AnonCredsService.generateNonce. */
  generateNonce(): string;
}

export interface IZKProofService {
  generateAgeRangeProof(birthdate: string, threshold: number): Promise<any>;
  generateStatusCheckProof(statusValue: string, expectedValue: string): Promise<any>;
  generateNullifierProof(holderSecret: string, electionId: string): Promise<any>;
  verifyProof(circuitName: string, proofResult: any): Promise<boolean>;
  isCircuitAvailable(circuitName: string): Promise<boolean>;
  extractNullifier(proofResult: any): string | undefined;
}
