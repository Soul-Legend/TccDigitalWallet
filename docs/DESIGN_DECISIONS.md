# Decisões de Design

Registro das decisões técnicas tomadas durante o desenvolvimento, com razões, alternativas avaliadas e trade-offs.

## Índice

1. [Plataforma e Frameworks](#plataforma-e-frameworks)
2. [Identidade e Criptografia](#identidade-e-criptografia)
3. [Credenciais e Provas](#credenciais-e-provas)
4. [Transporte e Armazenamento](#transporte-e-armazenamento)
5. [Interface](#interface)
6. [Testes](#testes)
7. [Padrões e Princípios SOLID](#padrões-e-princípios-solid)
8. [Injeção de Dependência e Composition Root](#injeção-de-dependência-e-composition-root)
9. [Segurança Reforçada](#segurança-reforçada)
10. [Qualidade de Código e Refatoração](#qualidade-de-código-e-refatoração)
11. [Decisões Futuras (Pós-MVP)](#decisões-futuras-pós-mvp)

---

## Plataforma e Frameworks

### React Native como Framework

**Escolha**: React Native 0.76.9 com Expo SDK 52 e TypeScript 5.0.4

**Razões**:
- Cross-platform com acesso a APIs nativas de segurança (Keystore)
- Ecossistema SSI disponível: @credo-ts, @hyperledger/anoncreds-react-native, mopro-ffi
- Suporte à Nova Arquitetura (TurboModules)

**Alternativas avaliadas**:
- Flutter: ecossistema SSI menos maduro no momento da decisão
- Native Android (Kotlin): sem cross-platform, escopo do protótipo é validação de conceito
- PWA: sem acesso ao Keystore do OS

**Trade-offs**:
- Performance inferior ao nativo puro para operações criptográficas
- Bundle maior devido às dependências nativas (Askar, AnonCreds, mopro)

---

### Zustand para State Management

**Escolha**: Zustand 4.5.0

**Razões**:
- API sem boilerplate (comparado a Redux)
- TypeScript first-class
- Tamanho reduzido (~1KB)

**Alternativas avaliadas**: Redux (overhead desnecessário para MVP), Context API (performance inferior com re-renders).

---

### Três módulos em um único app

**Escolha**: Emissor, Titular e Verificador coexistem no mesmo aplicativo, acessíveis por tabs.

**Razões**:
- Demonstração completa do ecossistema em um protótipo
- Testes E2E executam sem rede
- Setup de avaliação simplificado

**Trade-off**: Não demonstra separação real de entidades. Em produção seriam apps ou servidores distintos.

---

## Identidade e Criptografia

### Credo (Aries Framework JavaScript) como agente SSI

**Escolha**: @credo-ts/core com módulos Askar e AnonCreds.

**Razões**:
- Framework SSI de referência da OpenWallet Foundation
- Gerencia wallet criptografado (Aries Askar via @hyperledger/aries-askar-react-native)
- Suporta DID methods (did:key, did:peer) via `agent.dids.create()`
- Integra AnonCreds module para registro de schemas e credential definitions

**Alternativas avaliadas**:
- Gerenciamento manual de chaves (Ed25519 via @noble/ed25519 + armazenamento próprio): mais simples, mas reimplementa funcionalidades que Credo já resolve
- Veramo: menos suporte a AnonCreds

**Configuração**:
- Wallet: `academic-wallet`, key derivation: Argon2IMod
- Módulos: `AskarModule({ariesAskar})`, `AnonCredsModule({anoncreds, registries: []})`
- Sem DIDComm transport (app usa clipboard)

---

### DID Methods: did:key, did:peer, did:web

**Escolha**: Três métodos sem dependência de blockchain.

- **did:key**: Para chaves de assinatura do titular e emissor. Simples, auto-resolvível.
- **did:peer**: Para interações peer-to-peer (disponível, não usado nos cenários atuais).
- **did:web**: Para identidade institucional do emissor (UFSC). Formatação local — não publica documento DID.

**Alternativas avaliadas**: did:ethr (requer Ethereum), did:sov (requer ledger Indy/Sovrin). Ambas adicionam dependência de infraestrutura que foge do escopo do protótipo.

**Trade-off**: did:web sem publicação real do documento DID. Em produção, a UFSC publicaria o DID document no domínio.

---

### Ed25519 para assinaturas (SD-JWT)

CryptoService usa `@noble/ed25519` (v3+) para assinar credenciais SD-JWT e apresentações. Assinaturas de 64 bytes. SHA-256 via `@noble/hashes/sha256`; SHA-512 (necessário internamente pelo Ed25519) via `@noble/hashes/sha512`.

O agente Credo gerencia suas próprias chaves Ed25519 via Askar internamente.

---

### Armazenamento criptografado

**Escolha**: `react-native-encrypted-storage` (AES-256, chaves gerenciadas pelo Keystore do Android).

Não usa `react-native-keychain`.

**Alternativas avaliadas**: AsyncStorage (não criptografado), SQLite com SQLCipher (overhead desnecessário).

**Trade-off**: Sem backup ou sincronização. Dados perdidos se o dispositivo for perdido.

---

### Cadeia de confiança PKI para emissores

**Escolha**: TrustChainService implementa uma hierarquia de emissores confiáveis inspirada em PKI (Public Key Infrastructure), usando certificados Ed25519 em vez de X.509.

**Razões**:
- Em ambientes reais, credenciais acadêmicas são emitidas por departamentos que operam sob a autoridade de uma instituição raiz (UFSC → CTC → INE).
- Verificar apenas a assinatura da credencial não garante que o emissor é legítimo — qualquer detentor de chave Ed25519 pode assinar.
- A cadeia de confiança permite validar que o emissor foi autorizado pela âncora raiz, percorrendo a cadeia até a raiz e verificando cada certificado.

**Alternativas avaliadas**:
- **X.509/TLS certificates**: Complexidade desnecessária para um protótipo acadêmico; não se integra com DIDs.
- **Trust registries on-chain**: Dependência de ledger externa; este protótipo opera totalmente offline.
- **Lista estática de emissores confiáveis**: Simples mas não escalável e sem hierarquia.

**Trade-offs**:
- Modelo hierárquico centralizado (raiz única), diferente do modelo descentralizado de uma web-of-trust.
- Cadeia de confiança é local — não resolvida via rede. Em produção, os certificados seriam publicados em um registry público.
- Retrocompatível: se nenhuma cadeia estiver configurada, a verificação ignora este passo.

---

## Credenciais e Provas

### Dois formatos de credencial: SD-JWT e AnonCreds

Conforme definido na tese (Seção 6.3, Tabela 7), o protótipo implementa ambos os formatos para demonstrar trade-offs.

**SD-JWT**:
- Header/payload JSON assinado com Ed25519
- Divulgação seletiva por atributo: apresentação revela apenas os campos selecionados
- Proof type: `JsonWebSignature2020`
- Implementação: `CredentialService.signCredentialAsSDJWT()`

**AnonCreds**:
- CL-signatures via `@hyperledger/anoncreds-react-native`
- Divulgação seletiva com unlinkability (credencial e apresentação não são correlacionáveis)
- Suporta predicados numéricos (e.g., age >= 18) sem revelar o valor
- Proof type: `CLSignature2023`
- Implementação: `AnonCredsService.issueCredentialFull()`

**Trade-off**: AnonCreds é mais complexo e requer mais artefatos (schema, credential definition, link secret). SD-JWT é mais simples mas não provê unlinkability.

---

### AnonCreds direto (sem ledger)

**Escolha**: Usar `@hyperledger/anoncreds-react-native` diretamente, sem registro de schemas/credential definitions em ledger.

**Razões**:
- Conforme recomendado na tese – sem dependência de infraestrutura Indy/Sovrin
- Artefatos (schema, credential definition, key correctness proof) persistidos localmente via StorageService com prefixo `anoncreds_`
- Protocolo completo: Schema.create → CredentialDefinition.create → LinkSecret.create → Offer → Request → Credential → Process → Presentation → Verify
- Registries vazios (`registries: []`) no AnonCredsModule do Credo

**Alternativa avaliada**: Usar módulo AnonCreds do Credo com registry (AnonCredsCredentialFormatService). Requer ledger ou registry mock, adiciona complexidade sem benefício para o protótipo.

**Trade-off**: Sem revogação de credenciais via accumulator (requer registry). Sem verificação distribuída de schemas.

---

### Provas ZKP via mopro (Groth16/Circom)

**Escolha**: `mopro-ffi` para execução de circuitos Circom com provas Groth16.

**Razões**:
- Conforme tese (Tabela 7): mopro atribuído ao papel de "ZKP circuit compilation"
- Três circuitos: `age_range`, `status_check`, `nullifier`
- Cada circuito requer arquivo `.zkey` incluído na build
- `generateCircomProof()` e `verifyCircomProof()` da lib mopro-ffi

**Alternativa avaliada**: Snarkjs puro em JavaScript — performance insuficiente em dispositivos móveis.

**Trade-off**: Circuitos devem ser pré-compilados. Adicionar novo circuito requer compilação off-chain e inclusão do `.zkey` na build.

---

### Arquitetura dual de provas

O sistema suporta duas abordagens de ZKP, usadas em contextos diferentes:

| Abordagem | Biblioteca | Uso |
|---|---|---|
| CL-signatures (AnonCreds) | @hyperledger/anoncreds-react-native | Divulgação seletiva com unlinkability, predicados integrados |
| Groth16 (Circom circuits) | mopro-ffi | Provas customizadas: faixa etária, verificação de status, nullifiers |

Ambas coexistem. AnonCreds é usado quando a credencial é emitida nesse formato. Groth16 é usado em cenários que requerem provas customizadas sobre credenciais SD-JWT.

---

### Presentation Exchange (PEX)

**Escolha**: Formato PEX (DIF) para requisições de apresentação.

**Razões**: Padrão da indústria, expressivo (JSONPath, filtros), parte do OpenID4VP.

**Trade-off**: Complexidade de parsing. A implementação atual não suporta todas as funcionalidades do PEX (e.g., submission_requirements).

---

## Transporte e Armazenamento

### Clipboard como transporte padrão

**Escolha**: Credenciais e apresentações transferidas via clipboard do sistema operacional.

**Razões**: O foco do protótipo é a camada criptográfica, não o transporte. Clipboard elimina complexidade de rede e permite demonstração em um único dispositivo.

**Trade-off**: Experiência de uso não realista. Em produção, seria substituído por DIDComm ou OpenID4VP.

---

### Transporte de apresentações

A versão atual do protótipo expõe **dois** modos de transporte: `clipboard` (default) e `qrcode` (via `react-native-qrcode-svg`). Ambos rodam sem nenhuma camada nativa adicional além das já presentes.

A integração anterior com `@openwallet-foundation/eudi-wallet-kit-react-native` (que oferecia `proximity` BLE/NFC ISO 18013-5 e `remote` OpenID4VP) foi **removida**. Razões:

1. O pacote não está publicado no npm de forma estável e o projeto carregava-o via `require()` dinâmico — na prática, os modos BLE/remoto nunca podiam ser exercitados em CI nem reproduzidos por avaliadores.
2. Não existe hoje uma biblioteca React Native amplamente adotada que implemente ISO 18013-5 mDoc proximity. Substituir a EUDI lib por `react-native-ble-plx` exigiria implementar a stack mDoc inteira (Cose, mDL, sessions, transcript, etc.), o que está fora do escopo do TCC.
3. O foco do protótipo é a camada criptográfica e o pipeline de verificação, não o transporte.

**Substituto**: `src/services/TransportService.ts` — uma classe trivial que apenas mantém o modo ativo e emite o evento de log. O QR code já era renderizado pelas telas via `react-native-qrcode-svg`, dependência mantida no projeto.

**Trabalho futuro**: BLE proximity poderia ser reintroduzido com uma implementação dedicada de ISO 18013-5 sobre `react-native-ble-plx`; OpenID4VP poderia ser implementado com `react-native-app-auth` + handler de deep link. Ambos ficaram registrados como itens de evolução em [ARCHITECTURE.md](ARCHITECTURE.md).

---

## Interface

### Modal de consentimento

O titular vê a lista de atributos solicitados e seleciona quais revelar antes de gerar a apresentação. Conformidade com LGPD.

### Painel de logs

Todas as operações criptográficas são registradas via `LogService` e visíveis na tela LogsScreen. Armazenamento em memória apenas (não persistido).

### Glossário

Tela com termos SSI definidos. Reduz barreira para avaliadores sem conhecimento prévio em SSI.

---

## Testes

### Property-based testing com fast-check

**Escolha**: fast-check 4.6.0 com Jest 29.x.

**Razões**: Valida propriedades formais das operações criptográficas com inputs gerados aleatoriamente. Encontra edge cases que testes unitários manuais não cobrem.

Propriedades validadas incluem: determinismo de hash, verificação de assinatura, round-trip de credencial (issue → parse → verify), consistência de divulgação seletiva.

### Testes E2E

Seis cenários E2E que executam o fluxo completo (emissão → apresentação → verificação) com dados gerados via fast-check:
- Fluxo completo SD-JWT
- Restaurante universitário (divulgação seletiva)
- Eleições (nullifier)
- Faixa etária (range proof)
- Acesso a laboratório
- Estado de navegação

---

## Padrões e Princípios SOLID

### Pipeline de Verificação (Chain of Responsibility)

**Escolha**: Refatorar `validatePresentation()` de uma função monolítica para um `VerificationPipeline` composto por 7 passos independentes (`IVerificationStep`).

**Razões**:
- A função original continha ~200 linhas com 7 responsabilidades distintas misturadas (assinatura, cadeia de confiança, integridade, challenge, predicados, nullifiers, controle de acesso).
- Cada passo pode ser testado isoladamente, adicionado ou removido sem alterar os demais.
- Novos cenários de verificação (e.g., revogação) requerem apenas implementar `IVerificationStep` e registrar no pipeline.

**Alternativas avaliadas**:
- **Manter função monolítica**: Mais simples, mas viola SRP e dificulta extensão.
- **Middleware pattern (Express-style)**: `next()` callbacks adicionam complexidade sem benefício — os passos são independentes (não precisam decidir se continuam).
- **Decorator pattern**: Aninhamento dificulta depuração; pipeline linear é mais legível.

**Trade-offs**:
- Overhead de abstração para um protótipo acadêmico — justificável como demonstração de princípios SOLID.
- Pipeline acumula todos os erros (não falha no primeiro) — intencional para fornecer feedback completo ao verificador.

---

### Registro de Formatos de Credencial (Open/Closed Principle)

**Escolha**: `CredentialService` mantém um array de `ICredentialFormat` e itera para encontrar o parser adequado, em vez de usar `if/else` com strings mágicas.

**Razões**:
- Detecção de formato por magic strings (`'CLSignature2023'`, `'~'`) dispersa por múltiplos `if/else` viola OCP.
- Novos formatos (e.g., JSON-LD, mDL/mdoc) requerem apenas `registerFormat()` sem modificar código existente.

**Alternativas avaliadas**:
- **Map<string, parser>**: Requer chave única por formato; SD-JWT é detectado por heurística (presença de `~`), não por um campo de tipo.
- **Factory method**: Similar, mas `ICredentialFormat.canHandle()` é mais expressivo — permite qualquer lógica de detecção.

**Trade-off**: Ligeiro overhead de iteração sequencial. Ordem de registro importa (primeiro match vence). Na prática, com 2-3 formatos o impacto é negligível.

---

### Interfaces de Serviço (Dependency Inversion)

**Escolha**: Definir interfaces para todos os 13 serviços em `types/index.ts`: `ICryptoService`, `IStorageService`, `ICredentialService`, `ITrustChainService`, `IVerificationService`, `ILogService`, `IAgentService`, `IDIDService`, `IAnonCredsService`, `IZKProofService`.

**Razões**:
- Serviços singleton sem interface violam DIP — dependentes acoplam-se à implementação concreta.
- Interfaces documentam o contrato público de cada serviço.
- Facilitam criação de mocks tipados para testes.
- Agora usadas em runtime para injeção de dependência real via construtores (ver seção seguinte).

**Trade-off**: Overhead de manutenção — cada método público adicionado ao serviço deve ser refletido na interface. Na prática, a maioria das interfaces é estável.

---

### Limite de 1000 entradas no log

**Escolha**: `useAppStore.addLog()` descarta entradas mais antigas quando o array excede 1000.

**Razões**:
- Array de logs não tinha limite superior, causando crescimento ilimitado em sessões longas.
- 1000 entradas cobrem amplamente qualquer sessão de demonstração/avaliação.

**Alternativa avaliada**: Persistir logs em storage com paginação — overhead desnecessário para logs de demonstração.

---

## Injeção de Dependência e Composition Root

### Constructor Injection com defaults

**Escolha**: Todos os 13 serviços aceitam dependências via construtor com valores default (instâncias singleton). Um composition root em `src/container.ts` instância todos os serviços em ordem topológica.

**Razões**:
- A arquitetura anterior usava singletons importados diretamente (`CryptoService` referenciando `LogService` pelo import). Isso criava acoplamento forte e impossibilitava injeção de mocks sem monkey-patching.
- Constructor injection permite substituir qualquer dependência nos testes simplesmente passando um mock no construtor.
- O composition root centraliza a criação de instâncias e explicit a hierarquia de 6 níveis (Nível 0: LogService, StorageService → Nível 5: VerificationService).
- Defaults preservam retrocompatibilidade — código existente que usa `new CryptoService()` sem argumentos continua funcionando.

**Alternativas avaliadas**:
- **Service Locator** (container.get('CryptoService')): Esconde dependências, dificulta rastreabilidade, considerado anti-pattern.
- **DI framework** (InversifyJS, tsyringe): Overhead de decorators e metadados de reflexão desnecessário para o tamanho do protótipo.
- **Manter singletons puros**: Impede testabilidade real sem monkey-patching.

**Trade-offs**:
- Construtores mais verbosos (VerificationService aceita 6 argumentos).
- Named exports (`export { CryptoService }`) adicionados ao lado do `export default` para permitir import da classe em `container.ts`.
- Ordem de instanciação no composition root deve respeitar a topologia de dependências.

---

## Segurança Reforçada

### Remoção do fallback Math.random() no CryptoService

**Escolha**: Se o polyfill `react-native-get-random-values` não estiver disponível, `generateRandomBytes()` agora lança `CryptoError` em vez de recorrer a `Math.random()`.

**Razões**:
- `Math.random()` não é criptograficamente seguro (PRNG previsível) — usar para gerar chaves ou nonces compromete todo o sistema.
- Fail-fast é preferível a segurança degradada silenciosa.

**Trade-off**: Em ambientes onde o polyfill falha, a aplicação não funciona em vez de funcionar com segurança reduzida. Preferível para uma carteira de identidade.

### Remoção do bypass AnonCreds no VerificationService

**Escolha**: A verificação AnonCreds que retornava `true` como placeholder foi substituída por `ValidationError`.

**Razões**:
- Um placeholder `return true` aceita qualquer credencial AnonCreds sem verificação real — equivalente a desabilitar a segurança.
- `ValidationError` exige implementação real via `@credo-ts` antes de aceitar credenciais AnonCreds em produção.

### Remoção do fallback ZKP no VerificationService

**Escolha**: Provas de circuitos não reconhecidos (`legacyProof`, etc.) agora são rejeitadas com `ValidationError` em vez de aceitas silenciosamente.

**Razões**:
- O fallback anterior aceitava qualquer tipo de prova como válido — anulava o propósito da verificação ZKP.
- Apenas circuitos registrados (`age_range`, `status_check`, `nullifier`) devem ser aceitos.

---

## Qualidade de Código e Refatoração

### Extração de Hooks de Estado (useHolderState, useIssuerState)

**Escolha**: Extrair a lógica de estado e efeitos colaterais dos componentes `HolderScreen` e `IssuerScreen` para hooks custom (`useHolderState`, `useIssuerState`).

**Razões**:
- Screens de 300+ linhas misturavam lógica de estado com JSX. Hooks encapsulam state + effects, permitindo que o screen foque em layout.
- Testabilidade melhorada — hooks podem ser testados com `renderHook()` sem montar o componente completo.

### Extração de PresentationHelpers e VerificationSteps

**Escolha**: Funções puras e fábricas de pipeline steps extraídas dos respectivos serviços para ficheiros dedicados.

**Razões**:
- PresentationService e VerificationService tinham 400+ linhas cada. Funções puras não necessitam do contexto `this` e são mais fáceis de testar.
- `PresentationHelpers.ts` exporta funções utilitárias (`isDateAttribute`, `evaluatePredicate`, etc.) e aceita um `PresentationDeps` para as funções que necessitam de serviços.
- `VerificationSteps.ts` exporta 7 funções factory que criam `IVerificationStep`, parametrizadas por `IVerificationOperations`.

### Constantes Tipadas e Eliminação de Strings Mágicas

**Escolha**: Centralizar strings repetidas em `utils/constants.ts` como objetos `as const` com tipos derivados.

**Razões**:
- Strings como `'emissor'`, `'titular'`, `'sd-jwt'`, `'anoncreds'` eram repetidas 20+ vezes. Typo em uma string causa bug silencioso.
- Constantes tipadas (`Module`, `CredentialFormat`, `StorageKey`, `VerificationStepName`) dão autocompletar e erros de compilação.

### Mutex Per-Key no StorageService

**Escolha**: Operações read-modify-write em arrays JSON (credenciais, nullifiers) são protegidas por um mutex per-key.

**Razões**:
- Operações assíncronas concorrentes na mesma chave podem causar lost updates (read-A, read-B, write-A, write-B — update de A é perdido).
- Mutex per-key serializa operações na mesma chave sem bloquear chaves diferentes.

**Trade-off**: Overhead mínimo de serialização. Na prática, write contention é raro em um app de carteira single-user.

---

## Decisões Futuras (Pós-MVP)

### Revogação de credenciais

Opções: Status List 2021 (W3C, bitmap), Accumulator-based (AnonCreds nativo, requer registry).

### Backup

Opções: Backup criptografado em nuvem, seed phrase, social recovery.

### Transporte em produção

Opções: DIDComm (DIF), OpenID4VP sobre HTTP (OIDF), BLE via EUDI kit.
