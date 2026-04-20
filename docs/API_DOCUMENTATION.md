# API dos Serviços

Referência das APIs públicas de todos os serviços. Cada serviço é uma classe com injeção de dependência via construtor (defaults para instâncias singleton). A composição é centralizada em `src/container.ts`.

## Índice

- [AgentService](#agentservice)
- [DIDService](#didservice)
- [CredentialService](#credentialservice)
- [AnonCredsService](#anoncredsservice)
- [PresentationService](#presentationservice)
- [PresentationHelpers](#presentationhelpers)
- [VerificationService](#verificationservice)
- [VerificationSteps](#verificationsteps)
- [ZKProofService](#zkproofservice)
- [TransportService](#transportservice)
- [CryptoService](#cryptoservice)
- [TrustChainService](#trustchainservice)
- [StorageService](#storageservice)
- [LogService](#logservice)
- [ErrorHandler](#errorhandler)

---

## AgentService

Gerencia o ciclo de vida do agente Credo (Aries Framework JavaScript). Inicializa o agente com os módulos Askar (wallet criptografado) e AnonCreds (credenciais CL-signature). Singleton com inicialização lazy.

**Construtor**: `new AgentService(logger?: ILogService)`

**Tipo interno**: `CredoAgent = Agent<{ askar: AskarModule; anoncreds: AnonCredsModule }>`

### Métodos

#### `getAgent(): Promise<CredoAgent>`

Retorna a instância do agente Credo. Inicializa na primeira chamada (Argon2IMod key derivation, wallet id `academic-wallet`). Chamadas subsequentes retornam a mesma instância.

#### `shutdown(): Promise<void>`

Encerra o agente e limpa a referência interna.

#### `isInitialized(): boolean`

Retorna `true` se o agente já foi inicializado.

---

## DIDService

Cria DIDs via agente Credo. Métodos `createDidKey` e `createDidPeer` delegam para `agent.dids.create()`. `createDidWeb` faz formatação local de string (não publica documento DID).

**Construtor**: `new DIDService(logger?: ILogService, storage?: IStorageService, agent?: IAgentService)`

### Métodos

#### `createDidKey(): Promise<{ did: string; verificationMethodId: string }>`

Cria um DID usando o método `did:key` via Credo. A chave Ed25519 é gerada internamente pelo Askar.

#### `createDidPeer(): Promise<{ did: string; verificationMethodId: string }>`

Cria um DID usando o método `did:peer` via Credo.

#### `createDidWeb(domain: string, path?: string): string`

Formata e valida uma string `did:web:domain[:path]`. **Não** publica documento DID; apenas constrói o identificador conforme a spec W3C did:web.

Validações aplicadas:

- O domínio passa por regex RFC-1123 (máx. 253 caracteres, labels 1-63, alphanum + hífen) com porta opcional `:N` (1-5 dígitos).
- A porta, se presente, é percent-encoded como `%3A` para não colidir com o `:` separador de path.
- O `path`, se presente, deve casar com `/^[A-Za-z0-9._\-/%]+$/`.
- Falha em qualquer validação lança `CryptoError` com código `key_generation`.

```typescript
DIDService.createDidWeb('ufsc.br', 'identity');
// "did:web:ufsc.br:identity"

DIDService.createDidWeb('localhost:8443', 'wallet');
// "did:web:localhost%3A8443:wallet"
```

#### `generateHolderIdentity(method?: 'key' | 'peer'): Promise<{ did: string; publicKey: string }>`

Cria um DID para o titular e persiste no StorageService. Default: `'key'`.

#### `generateIssuerIdentity(domain?: string, path?: string): Promise<{ did: string; publicKey: string }>`

Cria um `did:key` para assinatura e um `did:web` para identidade do emissor. Ambos são persistidos.

#### `resolveDid(did: string): Promise<any>`

Resolve um DID via `agent.dids.resolve()`.

---

## CredentialService

Emissão de credenciais em dois formatos: SD-JWT e AnonCreds.

**Construtor**:

```typescript
new CredentialService(
  didService?: IDIDService,
  storage?: IStorageService,
  logger?: ILogService,
  agentService?: IAgentService,
  anonCredsService?: IAnonCredsService,
  credentialTtlSeconds?: number, // default: CREDENTIAL_DEFAULT_TTL_SECONDS = 365 dias
)
```

O parâmetro `credentialTtlSeconds` controla o `exp - iat` do JWT emitido. Para reduzir o tempo de vida em testes ou cenários específicos, instancie via container ou diretamente.

### Métodos

#### `getOrCreateIssuerDID(): Promise<{ did: string; publicKey: string }>`

Retorna o DID do emissor do StorageService. Se não existir, chama `DIDService.generateIssuerIdentity()`.

#### `issueCredential(studentData: StudentData, holderDID: string, format?: 'sd-jwt' | 'anoncreds'): Promise<string>`

Emite uma credencial. O parâmetro `format` tem default `'sd-jwt'`.

- **SD-JWT**: monta `header` (`{alg: 'EdDSA', typ: 'JWT', kid: <verificationMethodId>}`), `payload` (`{vc, iss, sub, iat, exp}`), e assina com `agent.wallet.sign()` (Aries Askar) usando o DID de assinatura recuperado de `StorageService.getIssuerSigningDid()`. Retorna o token compacto `header.payload.signature`. `iat` e `exp` são derivados do mesmo `nowSeconds`; o intervalo é `credentialTtlSeconds` configurado no construtor.
- **AnonCreds**: delega para `AnonCredsService.issueCredentialFull()`. Retorna JSON stringificado com `{format: 'anoncreds', credential, schema_id, cred_def_id}`.

```typescript
// SD-JWT
const token = await CredentialService.issueCredential(studentData, holderDID);

// AnonCreds
const token = await CredentialService.issueCredential(studentData, holderDID, 'anoncreds');
```

#### `validateAndParseCredential(token: string): Promise<VerifiableCredential>`

Detecta o formato (AnonCreds se `format === 'anoncreds'` no JSON, SD-JWT caso contrário) e retorna um objeto `VerifiableCredential` normalizado.

#### `validateStudentData(data: StudentData): void`

Valida campos obrigatórios. Lança `ValidationError` se algum campo faltar ou for inválido.

#### `copyToClipboard(credential: string): Promise<void>`

Copia a credencial para o clipboard do sistema.

### Tipos

```typescript
interface StudentData {
  nome_completo: string;
  cpf: string;
  matricula: string;
  curso: string;
  status_matricula: 'Ativo' | 'Inativo';
  data_nascimento: string; // YYYY-MM-DD
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
```

---

## AnonCredsService

Wrapper sobre `@hyperledger/anoncreds-react-native`. Implementa o protocolo AnonCreds completo: criação de schema, credential definition, link secret, oferta, requisição, credencial e apresentação. Usa CL-signatures (Camenisch-Lysyanskaya).

Artefatos são persistidos no StorageService com prefixo `anoncreds_`.

### Tipos internos

```typescript
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
```

### Métodos

#### `issueCredentialFull(issuerId, holderDid, schemaName, schemaVersion, attributeNames, attributeValues): Promise<{credential, schemaArtifact, credDefArtifact}>`

Executa o protocolo de emissão completo em uma chamada: cria/recupera schema → cria/recupera credential definition → cria/recupera link secret → gera offer → gera request → cria credencial → processa credencial. Persiste todos os artefatos.

```typescript
async issueCredentialFull(
  issuerId: string,
  holderDid: string,
  schemaName: string,
  schemaVersion: string,
  attributeNames: string[],
  attributeValues: Record<string, string>
): Promise<{
  credential: Record<string, unknown>;
  schemaArtifact: SchemaArtifact;
  credDefArtifact: CredDefArtifact;
}>
```

#### `getOrCreateSchema(issuerId, name, version, attributeNames): Promise<SchemaArtifact>`

Recupera schema do storage ou cria via `Schema.create()`.

#### `getOrCreateCredentialDefinition(issuerId, schemaArtifact, tag?): Promise<CredDefArtifact>`

Recupera credential definition do storage ou cria via `CredentialDefinition.create()`.

#### `getOrCreateLinkSecret(): Promise<{ linkSecret: string; linkSecretId: string }>`

Recupera link secret do storage ou cria via `LinkSecret.create()`.

#### `createCredentialOffer(credDefArtifact): Record<string, unknown>`

Cria oferta de credencial a partir do credential definition.

#### `createCredentialRequest(holderDid, credDefArtifact, offer, linkSecret, linkSecretId): { credentialRequest, credentialRequestMetadata }`

Gera requisição de credencial do lado do holder.

#### `createCredential(credDefArtifact, offer, request, attributeRawValues): Record<string, unknown>`

Cria a credencial com CL-signature no lado do issuer.

#### `processCredential(rawCredential, credDefArtifact, credentialRequestMetadata, linkSecret): Record<string, unknown>`

Processa a credencial recebida no lado do holder (aplica link secret).

#### `createPresentation(presentationRequestJson, credentials, credentialsProve, linkSecret, schemas, credentialDefinitions): Record<string, unknown>`

Cria apresentação AnonCreds com divulgação seletiva e/ou predicados.

#### `verifyPresentation(presentationJson, presentationRequestJson, schemas, credentialDefinitions): boolean`

Verifica uma apresentação AnonCreds. Retorna `true` se válida.

#### `buildSelectiveDisclosureRequest(name, nonce, revealedAttributes): Record<string, unknown>`

Monta um `presentation_request` JSON para divulgação seletiva.

#### `buildPredicateRequest(name, nonce, revealedAttributes, predicates): Record<string, unknown>`

Monta um `presentation_request` JSON com predicados (e.g., `age >= 18`).

---

## PresentationService

Façade fina que gera apresentações verificáveis a partir de credenciais. Três modos: SD-JWT (divulgação seletiva por atributo), ZKP (provas Groth16 via mopro), AnonCreds (CL-signature com predicados).

A implementação real vive em quatro colaboradores em `src/services/presentations/`:

| Colaborador | Métodos da façade que delega |
|---|---|
| `PEXValidator` | `validatePEXFormat`, `extractRequestedAttributes`, `processPEXRequest` |
| `SDJWTPresentationBuilder` | `createPresentation` (também exporta `canonicalPresentationSigningInput` para o verificador) |
| `ZKPPresentationBuilder` | `createZKPPresentation` |
| `AnonCredsPresentationBuilder` | `createAnonCredsPresentation` |

**Construtor**:

```typescript
new PresentationService(
  logger?: ILogService,
  crypto?: ICryptoService,
  storage?: IStorageService,
  anonCredsService?: IAnonCredsService,
)
```

### Métodos

#### `validatePEXFormat(request: string | PresentationExchangeRequest): PresentationExchangeRequest`

Parseia e valida uma requisição PEX. Aceita string JSON ou objeto. Lança `ValidationError` se inválida.

#### `extractRequestedAttributes(pexRequest): { required: string[]; optional: string[]; all: string[] }`

Extrai os atributos solicitados da requisição PEX.

#### `processPEXRequest(pexRequest, credential): Promise<ConsentData>`

Processa a requisição PEX contra a credencial e retorna dados para exibição no modal de consentimento.

#### `createPresentation(credential, pexRequest, selectedAttributes): Promise<VerifiablePresentation>`

Cria apresentação SD-JWT. Revela apenas `selectedAttributes`. Assina com `CryptoService.signData()`. Proof type: `JsonWebSignature2020`.

#### `createZKPPresentation(credential, pexRequest, predicates): Promise<VerifiablePresentation>`

Cria apresentação com provas Groth16 via `ZKProofService`. Cada predicado gera uma prova de circuito (age_range, status_check, nullifier). Proof type: `Groth16Proof`.

```typescript
await PresentationService.createZKPPresentation(credential, pexRequest, [
  { attribute: 'data_nascimento', p_type: '>=', value: 18 }
]);
```

#### `createAnonCredsPresentation(credentialToken, pexRequest, revealedAttrs, predicates): Promise<VerifiablePresentation>`

Cria apresentação AnonCreds. Recupera schema, credential definition e link secret do storage. Monta proof request e delega para `AnonCredsService.createPresentation()`. Proof type: `CLSignature2023`.

```typescript
await PresentationService.createAnonCredsPresentation(
  credentialToken,
  pexRequest,
  ['status_matricula', 'isencao_ru'],
  [{ attribute: 'age', p_type: '>=', value: 18 }]
);
```

#### `copyPresentationToClipboard(presentation): Promise<void>`

Serializa e copia a apresentação para o clipboard.

---

## PresentationHelpers

Funções puras extraídas de `PresentationService` para `src/services/PresentationHelpers.ts`. Funções que necessitam de serviços recebem um `PresentationDeps` como parâmetro.

```typescript
interface PresentationDeps {
  crypto: ICryptoService;
  storage: IStorageService;
  logger: ILogService;
  zkProof: IZKProofService;
}
```

### Funções

| Função | Assinatura | Descrição |
|---|---|---|
| `isDateAttribute` | `(name: string): boolean` | Verifica se é atributo de data |
| `evaluatePredicate` | `(value: any, predicate: Predicate): boolean` | Avalia predicado numérico/data |
| `extractDisclosedAttributes` | `(credential, selected): Record<string, any>` | Extrai atributos selecionados |
| `obfuscateNonDisclosedAttributes` | `(credential, selected, deps?): Promise<Record>` | Ofusca atributos não divulgados com hash |
| `generateZKPProofs` | `(predicates, attributes, deps?): Promise<ZKPProofData[]>` | Gera provas Groth16 para predicados |
| `generateNullifier` | `(credential, electionId, deps?): Promise<string>` | Gera nullifier determinístico |

---

## VerificationService

Façade fina que valida apresentações recebidas usando um `VerificationPipeline` (Chain of Responsibility) com sete passos. A implementação real vive em oito colaboradores em `src/services/verification/`:

| Colaborador | Responsabilidade |
|---|---|
| `ScenarioCatalog` | Catálogo de cenários e geração de `PresentationExchangeRequest` (challenge + predicados). |
| `PresentationFormatValidator` | Normaliza string → `VerifiablePresentation` antes do pipeline. |
| `SignatureVerifier` | Dispatch de assinatura por proof type (Groth16Proof, CLSignature2023, JsonWebSignature2020). |
| `IntegrityVerifier` | Atributos esperados, hashes SHA-256, campos ZKP, verificação AnonCreds. |
| `PredicateChecker` | Avalia predicados declarativos (`>=`, `<=`, `>`, `<`, `==`). |
| `NullifierStore` | Anti-replay para o cenário `elections`. |
| `ResourceAccessChecker` | Controle de acesso a laboratórios/prédios. |

As sete fábricas de passos (`createSignatureStep`, `createTrustChainStep`, `createIntegrityStep`, `createChallengeStep`, `createPredicateStep`, `createNullifierStep`, `createResourceAccessStep`) vivem em `VerificationSteps.ts` e recebem uma interface `IVerificationOperations` para evitar import circular.

**Construtor**:

```typescript
new VerificationService(
  logger?: ILogService,
  crypto?: ICryptoService,
  storage?: IStorageService,
  zkProof?: IZKProofService,
  anonCreds?: IAnonCredsService,
)
```

> Nota: o construtor **não** recebe mais `TrustChainService` — o `createTrustChainStep` usa o singleton diretamente.

**Segurança (P0)**: A verificação AnonCreds lança `ValidationError` quando os artefatos do emissor não estão disponíveis (antes retornava `true` silenciosamente). A verificação ZKP rejeita provas Groth16 quando o `.zkey` do circuito não existe ou quando algum dos campos `proof.{a,b,c,publicInputs}` está ausente.

### Cenários pré-configurados

Os IDs no catálogo do back-end (`ScenarioCatalog`) usam nomes em inglês:

| ID | Tipo |
|---|---|
| `ru` | Selective disclosure (status_matricula, isencao_ru) |
| `elections` | ZKP eligibility + nullifier |
| `age_verification` | Range proof (idade >= 18) |
| `lab_access` | Access control (acesso_laboratorios) |

> **Unificação de IDs**: o `VerifierScreen` usa exatamente os mesmos IDs deste catálogo. Apenas o rótulo em português usado pelo seletor da UI vive em `src/screens/VerifierScreen.tsx` (decisão de display), mas a chave do cenário (`ru`, `elections`, `lab_access`, `age_verification`) é única em todo o sistema.


### Métodos

#### `getScenarios(): Scenario[]`

Retorna os 4 cenários configurados.

#### `getScenario(scenarioId: string): Scenario | undefined`

Retorna cenário por ID.

#### `generateChallenge(scenarioId: string, additionalData?: { election_id?: string; resource_id?: string }): Promise<PresentationExchangeRequest>`

Gera uma requisição PEX para o cenário, incluindo nonce criptográfico.

#### `validatePresentationFormat(presentation: string | VerifiablePresentation): VerifiablePresentation`

Parseia e valida estrutura da apresentação.

#### `verifyIssuerSignature(presentation, issuerPublicKey?): Promise<boolean>`

Despacha por tipo de prova:
- `JsonWebSignature2020` → verifica assinatura Ed25519 via `CryptoService.verifySignature()`
- `Groth16Proof` → aceita (verificação feita no passo de circuito)
- `CLSignature2023` → delega para `verifyAnonCredsPresentation()`

#### `verifyStructuralIntegrity(presentation, pexRequest): Promise<boolean>`

Verifica que os atributos revelados atendem aos requisitos da requisição PEX.

#### `validatePresentation(presentation, pexRequest): Promise<ValidationResult>`

Pipeline de validação: formato → assinatura → integridade estrutural → nullifier check (se eleição). Retorna `ValidationResult`.

#### `checkNullifier(nullifier: string, electionId: string): Promise<boolean>`

Retorna `true` se o nullifier já foi usado nessa eleição.

#### `storeNullifier(nullifier: string, electionId: string): Promise<void>`

Persiste nullifier para prevenir voto duplo.

### Tipos

```typescript
interface ValidationResult {
  valid: boolean;
  errors?: string[];
  verified_attributes?: Record<string, any>;
  predicates_satisfied?: boolean;
  nullifier_check?: 'new' | 'duplicate';
}

interface Scenario {
  id: string;
  name: string;
  description: string;
  type: 'selective_disclosure' | 'zkp_eligibility' | 'range_proof' | 'access_control';
  requested_attributes?: string[];
  predicates?: Predicate[];
}
```

---

## VerificationSteps

Funções factory extraídas de `VerificationService` para `src/services/VerificationSteps.ts`. Cada factory cria um `IVerificationStep` parametrizado por `IVerificationOperations`.

```typescript
interface IVerificationOperations {
  verifyIssuerSignature(presentation, issuerPublicKey?): Promise<boolean>;
  verifyAnonCredsPresentation(presentation): Promise<boolean>;
  verifyStructuralIntegrity(presentation, pexRequest): Promise<boolean>;
  verifyZKPCircuit(presentation): Promise<boolean>;
  verifyChallenge(presentation, pexRequest): Promise<boolean>;
  verifyPredicates(presentation, pexRequest): Promise<boolean>;
  checkNullifier(nullifier, electionId): Promise<boolean>;
  isTrustedIssuer(did): Promise<boolean> | boolean;
}
```

### Factory Functions

| Função | Passo | Descrição |
|---|---|---|
| `createSignatureStep` | `signature_verification` | Verifica assinatura Ed25519/CL |
| `createTrustChainStep` | `trust_chain_validation` | Valida cadeia de confiança PKI |
| `createIntegrityStep` | `structural_integrity` | Verifica atributos vs requisitos PEX |
| `createChallengeStep` | `challenge_validation` | Valida challenge/nonce |
| `createPredicateStep` | `predicate_verification` | Verifica predicados numéricos |
| `createNullifierStep` | `nullifier_check` | Verifica duplicidade de nullifier |
| `createAccessControlStep` | `access_control` | Valida controle de acesso |

---

## ZKProofService

Executa provas zero-knowledge Groth16 via `mopro-ffi` (Circom circuits). Cada circuito requer um arquivo `.zkey` na build do app.

**Construtor**: `new ZKProofService(logger?: ILogService)`

### Circuitos

| Nome | Arquivo | Uso |
|---|---|---|
| `age_range` | `age_range_final.zkey` | Prova de faixa etária |
| `status_check` | `status_check_final.zkey` | Prova de status (e.g., matrícula ativa) |
| `nullifier` | `nullifier_final.zkey` | Geração de nullifier determinístico |

### Métodos

#### `generateAgeRangeProof(birthdate: string, threshold: number): Promise<CircomProofResult>`

Gera prova Groth16 de que a idade derivada de `birthdate` atende ao `threshold`.

#### `generateStatusCheckProof(statusValue: string, expectedValue: string): Promise<CircomProofResult>`

Gera prova de que `statusValue` é igual a `expectedValue` sem revelar o valor.

#### `generateNullifierProof(holderSecret: string, electionId: string): Promise<CircomProofResult>`

Gera prova com nullifier determinístico derivado de `holderSecret` e `electionId`.

#### `verifyProof(circuitName: string, proofResult: CircomProofResult): Promise<boolean>`

Verifica uma prova Groth16 usando `verifyCircomProof()` do mopro-ffi.

#### `isCircuitAvailable(circuitName: string): Promise<boolean>`

Verifica se o arquivo `.zkey` do circuito está acessível.

#### `getCircuitStatus(): Promise<Array<{ name: string; fileName: string; available: boolean }>>`

Retorna status de disponibilidade de todos os circuitos.

#### `extractNullifier(proofResult: CircomProofResult): string | undefined`

Extrai o nullifier dos outputs públicos da prova (se presente).

---

## TransportService

Selecao do modo de transporte para a apresentacao. Substitui o antigo `EudiTransportService` (e a dependencia `@openwallet-foundation/eudi-wallet-kit-react-native`, que foi removida do projeto). Apenas dois modos sao suportados.

**Construtor**: `new TransportService(logger?: ILogService)`

### Tipos

```typescript
type TransportMode = 'clipboard' | 'qrcode';
```

### Metodos

#### `getMode(): TransportMode`

Retorna o modo ativo.

#### `setMode(mode: TransportMode): void`

Altera o modo ativo e registra o evento `transport_mode_changed` no `LogService`.

### Modos

| Modo | Descricao |
|---|---|
| `clipboard` | Default. Copia/cola manual via clipboard do sistema. |
| `qrcode` | Titular renderiza a apresentacao como QR code (`react-native-qrcode-svg`); o verificador faz a leitura. |

> **Fora de escopo**: BLE/NFC (ISO 18013-5 mDoc proximity) e OpenID4VP. Veja [DESIGN_DECISIONS.md](DESIGN_DECISIONS.md#transporte-de-apresentacoes).

---

## TrustChainService

Gerencia uma cadeia de confiança hierárquica (PKI) para emissores de credenciais. Usa Ed25519 para assinatura de certificados.

**Construtor**: `new TrustChainService(crypto?: ICryptoService, storage?: IStorageService, logger?: ILogService)`

### Tipos

```typescript
interface TrustedIssuer {
  did: string;           // DID do emissor (ex: did:web:ufsc.br)
  publicKey: string;     // Chave pública Ed25519 (hex, 64 chars)
  name: string;          // Nome descritivo
  parentDid: string | null; // DID do pai (null para raiz)
  certificate: string;   // Assinatura do pai sobre os dados do emissor (hex)
  createdAt: string;     // ISO 8601 timestamp
}

interface TrustChainResult {
  trusted: boolean;      // Se o emissor é confiável
  chain: TrustedIssuer[]; // Cadeia do emissor até a raiz
  error?: string;        // Mensagem de erro (quando trusted=false)
}
```

### Métodos

#### `initializeRootIssuer(did: string, name: string): Promise<TrustedIssuer>`

Cria a âncora raiz da cadeia de confiança. Gera par Ed25519 e auto-assina certificado.

```typescript
const root = await TrustChainService.initializeRootIssuer(
  'did:web:ufsc.br',
  'UFSC - Âncora Raiz',
);
// root.parentDid === null
```

#### `registerChildIssuer(parentDid, parentPrivateKey, childDid, childName): Promise<TrustedIssuer>`

Registra um emissor filho assinado pelo pai.

```typescript
const rootKey = await TrustChainService.getIssuerPrivateKey('did:web:ufsc.br');
const child = await TrustChainService.registerChildIssuer(
  'did:web:ufsc.br',
  rootKey!,
  'did:web:cagr.ufsc.br',
  'CAGR - Coordenadoria Acadêmica',
);
```

**Erros**: `'Emissor pai não encontrado'`, `'Emissor já registrado'`.

#### `verifyTrustChain(issuerDid: string): Promise<TrustChainResult>`

Percorre a cadeia do emissor até a raiz, verificando cada certificado.

```typescript
const result = await TrustChainService.verifyTrustChain('did:web:ine.ufsc.br');
// result.trusted === true
// result.chain === [ine, ctc, ufsc] (do emissor até a raiz)
```

#### `isTrustedIssuer(did: string): Promise<boolean>`

Verifica se um DID pertence à cadeia de confiança e se a cadeia é válida.

#### `getAllIssuers(): Promise<TrustedIssuer[]>`

Retorna todos os emissores registrados.

#### `getRootIssuer(): Promise<TrustedIssuer | null>`

Retorna o emissor raiz (parentDid === null).

#### `getIssuerPrivateKey(did: string): Promise<string | null>`

Retorna a chave privada Ed25519 (hex) de um emissor.

#### `reset(): Promise<void>`

Remove todos os emissores e chaves da cadeia de confiança.

---

## CryptoService

Operações criptográficas de baixo nível. Usa `crypto-js` para SHA-256 e `@noble/ed25519` para assinaturas.

**Construtor**: `new CryptoService(logger?: ILogService)`

**Segurança**: O fallback `Math.random()` para geração de bytes aleatórios foi removido. Se `react-native-get-random-values` não estiver disponível, lança `CryptoError`.

### Métodos

#### `computeHash(data: string | Buffer, module?: 'emissor' | 'titular' | 'verificador'): Promise<string>`

SHA-256 hash. Retorna hexadecimal. O parâmetro `module` é usado para logging.

#### `signData(data: string | Buffer, privateKeyHex: string, module?: 'emissor' | 'titular' | 'verificador'): Promise<string>`

Assinatura Ed25519. Retorna assinatura em hexadecimal.

#### `verifySignature(data: string | Buffer, signatureHex: string, publicKeyHex: string, module?: 'emissor' | 'titular' | 'verificador'): Promise<boolean>`

Verifica assinatura Ed25519. Retorna `boolean`.

#### `computeCompositeHash(values: (string | Buffer)[], module?: 'emissor' | 'titular' | 'verificador'): Promise<string>`

Hash SHA-256 de múltiplos valores concatenados.

#### `generateNonce(): string`

Gera nonce aleatório.

---

## StorageService

Armazenamento criptografado via `react-native-encrypted-storage` (AES-256, chaves gerenciadas pelo OS Keystore). Todos os métodos são async.

Chaves de armazenamento são definidas como constantes em `StorageKey` (`utils/constants.ts`). Operações read-modify-write em arrays são protegidas por mutex per-key.

### Métodos — Chaves e DIDs

| Método | Assinatura |
|---|---|
| `storeHolderPrivateKey` | `(privateKey: string, did: string): Promise<void>` |
| `getHolderPrivateKey` | `(): Promise<string \| null>` |
| `getHolderDID` | `(): Promise<string \| null>` |
| `storeHolderDID` | `(did: string): Promise<void>` |
| `storeHolderPublicKey` | `(publicKey: string): Promise<void>` |
| `getHolderPublicKey` | `(): Promise<string \| null>` |
| `storeIssuerPrivateKey` | `(privateKey: string, did: string): Promise<void>` |
| `getIssuerPrivateKey` | `(): Promise<string \| null>` |
| `getIssuerDID` | `(): Promise<string \| null>` |
| `storeIssuerDID` | `(did: string): Promise<void>` |
| `storeIssuerPublicKey` | `(publicKey: string): Promise<void>` |
| `getIssuerPublicKey` | `(): Promise<string \| null>` |
| `storeIssuerSigningDid` | `(signingDid: string): Promise<void>` |
| `getIssuerSigningDid` | `(): Promise<string \| null>` |

### Métodos — Credenciais

| Método | Assinatura |
|---|---|
| `storeCredential` | `(credential: string): Promise<void>` |
| `getCredentials` | `(): Promise<string[]>` |
| `deleteCredential` | `(index: number): Promise<void>` |

### Métodos — Nullifiers

| Método | Assinatura |
|---|---|
| `getNullifiers` | `(electionId: string): Promise<string[]>` |
| `storeNullifier` | `(nullifier: string, electionId: string): Promise<void>` |

### Métodos — Raw key-value (AnonCreds artifacts)

| Método | Assinatura |
|---|---|
| `setRawItem` | `(key: string, value: string): Promise<void>` |
| `getRawItem` | `(key: string): Promise<string \| null>` |

### Métodos — Manutenção

| Método | Assinatura |
|---|---|
| `clearAll` | `(): Promise<void>` |

---

## LogService

Captura eventos para exibição na tela de logs. Armazena em memória (não persistido).

### Métodos

| Método | Assinatura |
|---|---|
| `captureEvent` | `(operation, module, details, success?, error?): void` |
| `logKeyGeneration` | `(module, algorithm, keySize, didMethod, success?, error?): void` |
| `logCredentialIssuance` | `(algorithm, success?, parameters?, error?): void` |
| `logPresentationCreation` | `(algorithm, success?, parameters?, error?): void` |
| `logVerification` | `(algorithm, verificationResult, success?, parameters?, error?): void` |
| `logHashComputation` | `(module, algorithm, hashOutput, success?, error?): void` |
| `logZKPGeneration` | `(module, algorithm, success?, parameters?, error?): void` |
| `logError` | `(module, error, stackTrace?): void` |
| `getLogs` | `(): LogEntry[]` |
| `clearLogs` | `(): void` |
| `filterLogs` | `(operation?, module?): LogEntry[]` |

### Tipos

```typescript
interface LogEntry {
  id: string;
  timestamp: Date;
  operation: 'key_generation' | 'credential_issuance' | 'presentation_creation' |
             'verification' | 'hash_computation' | 'zkp_generation' | 'error';
  module: 'emissor' | 'titular' | 'verificador';
  details: LogDetails;
  success: boolean;
  error?: Error;
}

interface LogDetails {
  algorithm?: string;
  key_size?: number;
  did_method?: string;
  hash_output?: string;
  verification_result?: boolean;
  parameters?: Record<string, any>;
  stack_trace?: string;
}
```

---

## ErrorHandler

Tratamento centralizado de erros. Loga via `LogService` e retorna mensagens legíveis.

**Construtor**: `new ErrorHandler(logger?: ILogService)`

### Classes de erro

```typescript
class CryptoError extends Error {
  constructor(message: string, public operation: string, public details?: any)
}

class ValidationError extends Error {
  constructor(message: string, public field?: string, public value?: any)
}

class StorageError extends Error {
  constructor(message: string, public operation: 'read' | 'write' | 'delete' | 'encrypt' | 'decrypt', public details?: any)
}
```

### Métodos

| Método | Assinatura |
|---|---|
| `handleCryptoError` | `(error: CryptoError, module): string` |
| `handleValidationError` | `(error: ValidationError, module): string` |
| `handleStorageError` | `(error: StorageError, module): string` |
| `handleGenericError` | `(error: Error, module): string` |
| `logError` | `(error: Error, module, context?): void` |

Cada `handle*` retorna uma string com mensagem para exibição ao usuário.
