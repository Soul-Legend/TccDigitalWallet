// Type declarations for native modules that require npm install
// These declarations allow TypeScript compilation before node_modules are present.

declare module '@hyperledger/anoncreds-react-native' {
  type JsonObject = Record<string, unknown>;

  class AnoncredsObject {
    handle: number;
    toJson(): JsonObject;
    static fromJson(json: JsonObject | string): AnoncredsObject;
  }

  export class Schema extends AnoncredsObject {
    static create(options: {
      issuerId: string;
      name: string;
      version: string;
      attributeNames: string[];
    }): Schema;
  }

  export class CredentialDefinition extends AnoncredsObject {
    static create(options: {
      schemaId: string;
      schema: JsonObject;
      issuerId: string;
      tag: string;
      signatureType: string;
      supportRevocation: boolean;
    }): {
      credentialDefinition: CredentialDefinition;
      credentialDefinitionPrivate: CredentialDefinitionPrivate;
      keyCorrectnessProof: KeyCorrectnessProof;
    };
  }

  export class CredentialDefinitionPrivate extends AnoncredsObject {}
  export class KeyCorrectnessProof extends AnoncredsObject {}

  export class CredentialOffer extends AnoncredsObject {
    static create(options: {
      schemaId: string;
      credentialDefinitionId: string;
      keyCorrectnessProof: JsonObject;
    }): CredentialOffer;
  }

  export class CredentialRequest extends AnoncredsObject {
    static create(options: {
      entropy: string;
      credentialDefinition: JsonObject;
      credentialOffer: JsonObject;
      linkSecret: string;
      linkSecretId: string;
    }): {
      credentialRequest: CredentialRequest;
      credentialRequestMetadata: CredentialRequestMetadata;
    };
  }

  export class CredentialRequestMetadata extends AnoncredsObject {}

  export class Credential extends AnoncredsObject {
    static create(options: {
      credentialDefinition: JsonObject;
      credentialDefinitionPrivate: JsonObject;
      credentialOffer: JsonObject;
      credentialRequest: JsonObject;
      attributeRawValues: Record<string, string>;
      attributeEncodedValues?: Record<string, string>;
      revocationConfiguration?: unknown;
    }): Credential;

    static fromJson(json: JsonObject | string): Credential;

    process(options: {
      credentialDefinition: JsonObject;
      credentialRequestMetadata: JsonObject;
      linkSecret: string;
      revocationRegistryDefinition?: JsonObject;
    }): Credential;
  }

  export class Presentation extends AnoncredsObject {
    static create(options: {
      presentationRequest: JsonObject;
      credentials: Array<{credential: JsonObject; timestamp?: number; revocationState?: JsonObject}>;
      credentialsProve: Array<{
        entryIndex: number;
        referent: string;
        isPredicate: boolean;
        reveal: boolean;
      }>;
      selfAttest: Record<string, string>;
      linkSecret: string;
      schemas: Record<string, JsonObject>;
      credentialDefinitions: Record<string, JsonObject>;
    }): Presentation;

    static fromJson(json: JsonObject | string): Presentation;

    verify(options: {
      presentationRequest: JsonObject;
      schemas: Record<string, JsonObject>;
      credentialDefinitions: Record<string, JsonObject>;
      revocationRegistryDefinitions?: Record<string, JsonObject>;
      revocationStatusLists?: JsonObject[];
    }): boolean;
  }

  export class PresentationRequest extends AnoncredsObject {}

  export class LinkSecret {
    static create(): string;
  }

  export const anoncreds: Record<string, unknown>;
}
