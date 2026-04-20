/**
 * Mock for @hyperledger/anoncreds-react-native
 *
 * Simulates the AnonCreds shared API classes (Schema, CredentialDefinition,
 * Credential, Presentation, etc.) used by AnonCredsService.
 *
 * SHAPE FIDELITY:
 * The real wrapper exposes each native object via `instance.handle`, which is
 * itself an `ObjectHandle` carrying a numeric `handle` plus a `clear()` method
 * that calls `objectFree()` on the Rust side. Production code (e.g.
 * AnonCredsService.getOrCreateSchema's try/finally) calls
 * `instance.handle.clear()` to release native memory. To avoid silently
 * masking that contract, this mock mirrors the shape: `instance.handle` is an
 * object with both `handle: number` and `clear: jest.Mock`.
 */

let handleCounter = 0;

class MockObjectHandle {
  handle: number;
  clear: jest.Mock;
  constructor() {
    this.handle = ++handleCounter;
    this.clear = jest.fn();
  }
}

class MockAnoncredsObject {
  handle: MockObjectHandle;
  private _json: Record<string, unknown>;

  constructor(json: Record<string, unknown> = {}) {
    this.handle = new MockObjectHandle();
    this._json = json;
  }

  toJson(): Record<string, unknown> {
    return this._json;
  }

  static fromJson(json: Record<string, unknown> | string) {
    const parsed = typeof json === 'string' ? JSON.parse(json) : json;
    return new this(parsed);
  }
}

export class Schema extends MockAnoncredsObject {
  static create(options: {
    issuerId: string;
    name: string;
    version: string;
    attributeNames: string[];
  }) {
    return new Schema({
      issuerId: options.issuerId,
      name: options.name,
      version: options.version,
      attrNames: options.attributeNames,
    });
  }
}

export class CredentialDefinition extends MockAnoncredsObject {
  static create(options: {
    schemaId: string;
    schema: any;
    issuerId: string;
    tag: string;
    signatureType: string;
    supportRevocation: boolean;
  }) {
    return {
      credentialDefinition: new CredentialDefinition({
        schemaId: options.schemaId,
        type: options.signatureType,
        tag: options.tag,
        issuerId: options.issuerId,
        value: {primary: {n: 'mock_n', s: 'mock_s', r: {}, rctxt: '', z: ''}},
      }),
      credentialDefinitionPrivate: new CredentialDefinitionPrivate({
        value: {p_key: 'mock_private'},
      }),
      keyCorrectnessProof: new KeyCorrectnessProof({
        c: 'mock_c',
        xz_cap: 'mock_xz',
        xr_cap: [],
      }),
    };
  }
}

export class CredentialDefinitionPrivate extends MockAnoncredsObject {}
export class KeyCorrectnessProof extends MockAnoncredsObject {}

export class CredentialOffer extends MockAnoncredsObject {
  static create(options: {
    schemaId: string;
    credentialDefinitionId: string;
    keyCorrectnessProof: any;
  }) {
    return new CredentialOffer({
      schema_id: options.schemaId,
      cred_def_id: options.credentialDefinitionId,
      nonce: 'mock_nonce',
      key_correctness_proof: options.keyCorrectnessProof,
    });
  }
}

export class CredentialRequest extends MockAnoncredsObject {
  static create(options: {
    entropy: string;
    credentialDefinition: any;
    credentialOffer: any;
    linkSecret: string;
    linkSecretId: string;
  }) {
    return {
      credentialRequest: new CredentialRequest({
        prover_did: options.entropy,
        cred_def_id: 'mock_cred_def_id',
        blinded_ms: {},
        blinded_ms_correctness_proof: {},
        nonce: 'mock_nonce',
      }),
      credentialRequestMetadata: new CredentialRequestMetadata({
        link_secret_blinding_data: {},
        nonce: 'mock_nonce',
        link_secret_name: options.linkSecretId,
      }),
    };
  }
}

export class CredentialRequestMetadata extends MockAnoncredsObject {}

export class Credential extends MockAnoncredsObject {
  static create(options: {
    credentialDefinition: any;
    credentialDefinitionPrivate: any;
    credentialOffer: any;
    credentialRequest: any;
    attributeRawValues: Record<string, string>;
  }) {
    const values: Record<string, {raw: string; encoded: string}> = {};
    for (const [key, val] of Object.entries(options.attributeRawValues)) {
      values[key] = {raw: val, encoded: String(val.length)};
    }
    return new Credential({
      schema_id: 'mock_schema_id',
      cred_def_id: 'mock_cred_def_id',
      values,
      signature: {p_credential: {}, r_credential: null},
      signature_correctness_proof: {},
      rev_reg: null,
      witness: null,
    });
  }

  process(options: {
    credentialDefinition: any;
    credentialRequestMetadata: any;
    linkSecret: string;
  }) {
    // Return self - in real lib, processes the credential with link secret
    return this;
  }
}

export class Presentation extends MockAnoncredsObject {
  static create(options: {
    presentationRequest: any;
    credentials: any[];
    credentialsProve: any[];
    selfAttest: Record<string, string>;
    linkSecret: string;
    schemas: Record<string, any>;
    credentialDefinitions: Record<string, any>;
  }) {
    return new Presentation({
      proof: {proofs: [], aggregated_proof: {}},
      requested_proof: {
        revealed_attrs: {},
        self_attested_attrs: options.selfAttest,
        unrevealed_attrs: {},
        predicates: {},
      },
      identifiers: [],
    });
  }

  verify(_options: {
    presentationRequest: any;
    schemas: Record<string, any>;
    credentialDefinitions: Record<string, any>;
  }) {
    return true;
  }
}

export class PresentationRequest extends MockAnoncredsObject {}

export class LinkSecret {
  static create() {
    return 'mock_link_secret_' + Date.now();
  }
}

// The raw native bindings object passed to Credo's AnonCredsModule
export const anoncreds = {};
