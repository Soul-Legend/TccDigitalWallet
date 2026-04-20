// Polyfill WebCrypto for @noble/ed25519
const { webcrypto } = require('crypto');
if (!global.crypto) {
  global.crypto = webcrypto;
}

// Mock react-native modules
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper', () => ({}), {
  virtual: true,
});

// Mock react-native-gesture-handler
jest.mock('react-native-gesture-handler', () => ({
  GestureHandlerRootView: 'GestureHandlerRootView',
}), {
  virtual: true,
});

// Mock AgentService globally for all tests
// The Credo agent requires native modules that are not available in test env
jest.mock('./src/services/AgentService', () => {
  let callCount = 0;
  const mockAgent = {
    initialize: jest.fn().mockResolvedValue(undefined),
    shutdown: jest.fn().mockResolvedValue(undefined),
    dids: {
      create: jest.fn().mockImplementation((opts) => {
        callCount++;
        const method = (opts && opts.method) || 'key';
        const suffix = `${callCount}${Date.now()}${Math.random().toString(36).slice(2, 12)}`;
        const did = method === 'peer'
          ? `did:peer:0z6Mk${suffix}`
          : `did:key:z6Mk${suffix}`;
        return Promise.resolve({
          didState: {
            state: 'finished',
            did,
            didDocument: {
              verificationMethod: [{
                id: `${did}#key-1`,
                type: 'Ed25519VerificationKey2018',
                publicKey: Buffer.from('mock-public-key'),
              }],
            },
          },
        });
      }),
      resolve: jest.fn().mockResolvedValue({
        didDocument: {
          verificationMethod: [{
            id: 'did:key:z6MkTest#key-1',
            type: 'Ed25519VerificationKey2018',
            publicKey: Buffer.from('mock-public-key'),
          }],
        },
      }),
    },
    wallet: {
      sign: jest.fn().mockResolvedValue({
        signature: Buffer.from('mock-ed25519-signature-value-padded-to-64-bytes-for-realism00000'),
      }),
    },
    modules: {
      anoncreds: {},
    },
  };
  return {
    __esModule: true,
    default: {
      getAgent: jest.fn().mockResolvedValue(mockAgent),
      isInitialized: jest.fn().mockReturnValue(true),
      shutdown: jest.fn().mockResolvedValue(undefined),
    },
  };
});

// Mock ZKProofService globally for all tests
// The mopro-ffi package requires native modules (Rust bindings via UniFFI)
jest.mock('./src/services/ZKProofService', () => {
  const mockCircomProof = {
    a: {x: '0x1234', y: '0x5678', z: '0x1'},
    b: {x: ['0xaa', '0xbb'], y: ['0xcc', '0xdd'], z: ['0x1', '0x0']},
    c: {x: '0xdead', y: '0xbeef', z: '0x1'},
    protocol: 'groth16',
    curve: 'bn128',
  };

  return {
    __esModule: true,
    default: {
      generateAgeRangeProof: jest.fn().mockResolvedValue({
        proof: mockCircomProof,
        inputs: ['1', '18'],
      }),
      generateStatusCheckProof: jest.fn().mockResolvedValue({
        proof: mockCircomProof,
        inputs: ['1'],
      }),
      generateNullifierProof: jest.fn().mockImplementation(async (holderSecret, electionId) => {
        // Deterministic but unique per input pair
        let hash = 0;
        const combined = `${holderSecret}:${electionId}`;
        for (let i = 0; i < combined.length; i++) {
          hash = ((hash << 5) - hash + combined.charCodeAt(i)) | 0;
        }
        const nullifierHex = '0x' + Math.abs(hash).toString(16).padStart(16, '0');
        return {
          proof: mockCircomProof,
          inputs: [nullifierHex],
        };
      }),
      verifyProof: jest.fn().mockResolvedValue(true),
      isCircuitAvailable: jest.fn().mockResolvedValue(true),
      getCircuitStatus: jest.fn().mockResolvedValue([
        {name: 'age_range', fileName: 'age_range_final.zkey', available: true},
        {name: 'status_check', fileName: 'status_check_final.zkey', available: true},
        {name: 'nullifier', fileName: 'nullifier_final.zkey', available: true},
      ]),
      extractNullifier: jest.fn().mockImplementation((proofResult) => {
        return proofResult && proofResult.inputs ? proofResult.inputs[0] : undefined;
      }),
    },
  };
});

// Custom serializer to truncate long strings in test output
expect.addSnapshotSerializer({
  test: (val) => typeof val === 'string' && val.length > 100,
  print: (val) => {
    const truncated = val.length > 100 ? `${val.substring(0, 50)}...${val.substring(val.length - 50)}` : val;
    return `"${truncated}"`;
  },
});

// Mock AnonCredsService globally for all tests
// The @hyperledger/anoncreds-react-native package requires native Rust bindings via JSI
jest.mock('./src/services/AnonCredsService', () => {
  const mockSchemaArtifact = {
    schemaId: 'did:web:ufsc.br:2:academic-id:1.0',
    schema: {
      issuerId: 'did:web:ufsc.br',
      name: 'academic-id',
      version: '1.0',
      attrNames: ['nome_completo', 'cpf', 'matricula', 'curso', 'status_matricula', 'data_nascimento'],
    },
  };

  const mockCredDefArtifact = {
    credDefId: 'did:web:ufsc.br:3:CL:did:web:ufsc.br:2:academic-id:1.0:default',
    credDef: {
      schemaId: mockSchemaArtifact.schemaId,
      type: 'CL',
      tag: 'default',
      issuerId: 'did:web:ufsc.br',
      value: {primary: {}},
    },
    credDefPrivate: {value: {p_key: 'mock'}},
    keyCorrectnessProof: {c: 'mock', xz_cap: 'mock', xr_cap: []},
  };

  return {
    __esModule: true,
    default: {
      getOrCreateSchema: jest.fn().mockResolvedValue(mockSchemaArtifact),
      getOrCreateCredentialDefinition: jest.fn().mockResolvedValue(mockCredDefArtifact),
      getOrCreateLinkSecret: jest.fn().mockResolvedValue({
        linkSecret: 'mock_link_secret',
        linkSecretId: 'mock_link_secret_id',
      }),
      createCredentialOffer: jest.fn().mockReturnValue({
        schema_id: mockSchemaArtifact.schemaId,
        cred_def_id: mockCredDefArtifact.credDefId,
        nonce: 'mock_nonce',
      }),
      createCredentialRequest: jest.fn().mockReturnValue({
        credentialRequest: {prover_did: 'mock', nonce: 'mock'},
        credentialRequestMetadata: {link_secret_name: 'mock'},
      }),
      createCredential: jest.fn().mockReturnValue({
        schema_id: mockSchemaArtifact.schemaId,
        cred_def_id: mockCredDefArtifact.credDefId,
        values: {},
        signature: {},
      }),
      processCredential: jest.fn().mockReturnValue({
        schema_id: mockSchemaArtifact.schemaId,
        cred_def_id: mockCredDefArtifact.credDefId,
        values: {},
        signature: {},
      }),
      issueCredentialFull: jest.fn().mockImplementation(
        async (_issuerId, _holderDid, _schemaName, _schemaVersion, attrNames, attrValues) => {
          const values = {};
          for (const name of attrNames) {
            values[name] = {raw: attrValues[name] || '', encoded: '0'};
          }
          return {
            credential: {
              schema_id: mockSchemaArtifact.schemaId,
              cred_def_id: mockCredDefArtifact.credDefId,
              values,
              signature: {p_credential: {}, r_credential: null},
            },
            schemaArtifact: mockSchemaArtifact,
            credDefArtifact: mockCredDefArtifact,
          };
        },
      ),
      createPresentation: jest.fn().mockReturnValue({
        proof: {proofs: [], aggregated_proof: {}},
        requested_proof: {
          revealed_attrs: {},
          self_attested_attrs: {},
          unrevealed_attrs: {},
          predicates: {},
        },
        identifiers: [],
      }),
      verifyPresentation: jest.fn().mockReturnValue(true),
      buildSelectiveDisclosureRequest: jest.fn().mockImplementation(
        (name, nonce, revealedAttributes) => ({
          name,
          version: '1.0',
          nonce,
          requested_attributes: revealedAttributes,
          requested_predicates: {},
        }),
      ),
      buildPredicateRequest: jest.fn().mockImplementation(
        (name, nonce, revealedAttributes, predicates) => ({
          name,
          version: '1.0',
          nonce,
          requested_attributes: revealedAttributes,
          requested_predicates: predicates,
        }),
      ),
    },
  };
});

// Override console methods to reduce noise in test output
const originalError = console.error;
const originalWarn = console.warn;

console.error = (...args) => {
  // Filter out known noisy errors
  const message = args[0]?.toString() || '';
  if (
    message.includes('Warning: ReactDOM.render') ||
    message.includes('Not implemented: HTMLFormElement.prototype.submit') ||
    message.includes('base64') ||
    message.includes('1lX2NvbXBsZXRv')
  ) {
    return;
  }
  originalError.apply(console, args);
};

console.warn = (...args) => {
  // Filter out known noisy warnings
  const message = args[0]?.toString() || '';
  if (
    message.includes('componentWillReceiveProps') ||
    message.includes('componentWillMount')
  ) {
    return;
  }
  originalWarn.apply(console, args);
};

// Note: Custom matchers removed to avoid jest.setup.js issues
// Long strings are already handled by the snapshot serializer above
