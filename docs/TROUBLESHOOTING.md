# Guia de Troubleshooting

## Introdução

Este guia ajuda a resolver problemas comuns encontrados durante instalação, desenvolvimento e uso da Carteira de Identidade Acadêmica.

## Índice

- [Problemas de Instalação](#problemas-de-instalação)
- [Problemas de Build](#problemas-de-build)
- [Problemas de Execução](#problemas-de-execução)
- [Problemas de Funcionalidade](#problemas-de-funcionalidade)
- [Problemas de Performance](#problemas-de-performance)
- [Problemas de Testes](#problemas-de-testes)

---

## Problemas de Instalação

### Erro: "SDK location not found"

**Sintoma**: Build falha com mensagem sobre SDK não encontrado

**Causa**: Android SDK não configurado

**Solução**:
```bash
# Crie o arquivo android/local.properties
echo "sdk.dir=C:\\Users\\[SEU_USUARIO]\\AppData\\Local\\Android\\Sdk" > android/local.properties

# No Linux/Mac:
echo "sdk.dir=/Users/[SEU_USUARIO]/Library/Android/sdk" > android/local.properties
```

---

### Erro: "npm install" falha com dependências

**Sintoma**: Algumas dependências não são encontradas

**Causa**: Algumas bibliotecas podem não estar disponíveis publicamente

**Solução**:
```bash
# Limpe o cache do npm
npm cache clean --force

# Remova node_modules e package-lock.json
rm -rf node_modules package-lock.json

# Reinstale com --legacy-peer-deps (necessário porque @credo-ts e @hyperledger têm peer dependencies conflitantes)
npm install --legacy-peer-deps
```

**Dependências que podem causar problemas**:
- `mopro-ffi` (github:zkmopro/mopro-react-native-package): Requer acesso ao repositório GitHub
- `@hyperledger/anoncreds-react-native` e `@hyperledger/aries-askar-react-native`: Dependem de bindings nativos compilados para Android

> Nota: o pacote `@openwallet-foundation/eudi-wallet-kit-react-native` foi removido do projeto. Os modos de transporte BLE/NFC e OpenID4VP estão fora de escopo desta versão; veja [DESIGN_DECISIONS.md](DESIGN_DECISIONS.md#transporte-de-apresentações).

---

### Erro: "Java version incompatible"

**Sintoma**: Build falha com erro de versão do Java

**Causa**: JDK incorreto instalado

**Solução**:
```bash
# Verifique a versão do Java
java -version

# Deve ser JDK 17
# Se não for, instale JDK 17 e configure JAVA_HOME

# Windows:
set JAVA_HOME=C:\Program Files\Java\jdk-17

# Linux/Mac:
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk
```

---

## Problemas de Build

### Erro: "Execution failed for task ':app:installDebug'"

**Sintoma**: Build completa mas instalação falha

**Causa**: Nenhum dispositivo/emulador conectado

**Solução**:
```bash
# Verifique dispositivos conectados
adb devices

# Se vazio, inicie um emulador no Android Studio
# Ou conecte um dispositivo físico com USB debugging habilitado

# Reinicie o ADB se necessário
adb kill-server
adb start-server
```

---

### Erro: "Unable to load script"

**Sintoma**: App abre mas tela branca com erro de script

**Causa**: Metro Bundler não está rodando ou cache corrompido

**Solução**:
```bash
# Limpe o cache do Metro
npm start -- --reset-cache

# Em outro terminal
npm run android

# Se ainda falhar, limpe tudo:
cd android
./gradlew clean
cd ..
rm -rf node_modules
npm install
npm start -- --reset-cache
```

---

### Erro: "Duplicate class found"

**Sintoma**: Build falha com erro de classe duplicada

**Causa**: Conflito de dependências

**Solução**:
```bash
# Limpe o build do Android
cd android
./gradlew clean
./gradlew cleanBuildCache
cd ..

# Limpe o cache do Gradle
rm -rf ~/.gradle/caches/

# Rebuild
npm run android
```

---

### Erro: "Could not resolve all files for configuration"

**Sintoma**: Gradle não consegue resolver dependências

**Causa**: Repositórios Maven inacessíveis ou cache corrompido

**Solução**:

Edite `android/build.gradle`:
```gradle
allprojects {
    repositories {
        google()
        mavenCentral()
        maven { url 'https://jitpack.io' }
        // Adicione outros repositórios se necessário
    }
}
```

Depois:
```bash
cd android
./gradlew clean
./gradlew --refresh-dependencies
cd ..
npm run android
```

---

## Problemas de Execução

### App crasha na inicialização

**Sintoma**: App abre e fecha imediatamente

**Causa**: Erro não tratado na inicialização

**Solução**:
```bash
# Veja os logs do Android
adb logcat | grep -i "ReactNative"

# Ou use o React Native Debugger
npm start
# Pressione 'd' no terminal do Metro
# Selecione "Debug" no menu do app
```

**Erros comuns**:
- Agente Credo falha ao inicializar: verifique se os bindings nativos do Askar estão compilados corretamente. Rebuild com `cd android && ./gradlew clean && cd .. && npm run android`
- Wallet não abre: pode ocorrer se a key derivation falhar. Delete dados do app e reinicie
- Biblioteca nativa não carregada: Rebuild completo

---

### Erro: "Network request failed"

**Sintoma**: Operações de rede falham

**Causa**: Permissões de internet ou configuração de rede

**Solução**:

Verifique `android/app/src/main/AndroidManifest.xml`:
```xml
<uses-permission android:name="android.permission.INTERNET" />
```

Para desenvolvimento, adicione:
```xml
<application
  android:usesCleartextTraffic="true"
  ...>
```

---

### Tela branca após navegação

**Sintoma**: Navegação resulta em tela branca

**Causa**: Erro não tratado no componente

**Solução**:
```bash
# Ative o modo debug
# Pressione Ctrl+M (ou Cmd+M no Mac) no emulador
# Selecione "Debug"

# Veja o console do navegador para erros
```

**Verificações**:
- Componente está exportado corretamente?
- Props estão sendo passadas corretamente?
- Estado está inicializado?

---

## Problemas de Funcionalidade

### Credencial não é aceita

**Sintoma**: Ao colar credencial, erro de validação

**Causa**: Formato incorreto ou credencial corrompida

**Solução**:
1. Verifique se copiou o token completo
2. Token deve começar com `eyJ` (JWT) ou `{` (JSON)
3. Não deve ter espaços ou quebras de linha extras

**Debug**:
```typescript
// No HolderScreen, adicione log:
console.log('Token recebido:', token.substring(0, 50));
console.log('Tamanho:', token.length);
```

---

### Apresentação rejeitada pelo verificador

**Sintoma**: Validação falha com erro

**Causa**: Assinatura inválida, atributos faltando, ou formato incorreto

**Solução**:
1. Verifique os logs no Painel de Logs
2. Confirme que revelou todos os atributos obrigatórios
3. Verifique se a credencial não expirou

**Debug**:
```typescript
// No VerificationService, adicione logs:
console.log('Presentation:', JSON.stringify(presentation, null, 2));
console.log('Request:', JSON.stringify(request, null, 2));
```

---

### Nullifier duplicado (Eleições)

**Sintoma**: Sistema rejeita voto por duplicidade

**Causa**: Você já votou nesta eleição (comportamento esperado)

**Solução**: Isso é intencional! O sistema previne voto duplicado.

**Para testar novamente**:
```typescript
// Limpe os dados do app:
// Configurações > Apps > Carteira > Limpar dados
// Ou via ADB:
// adb shell pm clear com.carteiraidentidadeacademica
```

---

### AnonCreds: credencial não é processada

**Sintoma**: Credencial AnonCreds não é aceita pelo titular

**Causa**: Artefatos AnonCreds (schema, credential definition, link secret) ausentes do storage

**Solução**:
- Os artefatos são persistidos automaticamente pelo `AnonCredsService.issueCredentialFull()` no StorageService com prefixo `anoncreds_`
- Se o storage foi limpo entre emissão e apresentação, a credencial não pode ser usada porque o link secret é perdido
- Emita novamente a credencial no mesmo dispositivo

---

### Range Proof falha

**Sintoma**: Verificação de maioridade falha

**Causa**: Data de nascimento inválida ou cálculo incorreto

**Solução**:
1. Verifique formato da data: `AAAA-MM-DD`
2. Verifique se a data é válida
3. Verifique cálculo de idade

**Debug**:
```typescript
// No PresentationService:
const birthDate = new Date(credential.credentialSubject.data_nascimento);
const age = calculateAge(birthDate);
console.log('Idade calculada:', age);
```

---

### Logs não aparecem

**Sintoma**: Painel de Logs está vazio

**Causa**: LogService não está capturando eventos

**Solução**:
```typescript
// Verifique se LogService está sendo chamado:
import LogService from './services/LogService';

// Após operação:
LogService.captureEvent(
  'test',        // operation
  'titular',     // module
  {},            // details
  true           // success
);

// Verifique os logs:
console.log('Logs:', LogService.getLogs());
```

---

## Problemas de Performance

### Operações ZKP lentas

**Sintoma**: Geração de provas Groth16 leva vários segundos

**Causa**: Groth16 proving é computacionalmente intensivo, especialmente em dispositivos móveis. O ZKProofService usa `mopro-ffi` que executa circuitos Circom nativamente.

**Notas**:
1. Isso é comportamento esperado para provas Groth16
2. Os circuitos requerem arquivos `.zkey` (age_range_final.zkey, status_check_final.zkey, nullifier_final.zkey) presentes na build
3. Se `isCircuitAvailable()` retorna `false`, o arquivo `.zkey` não foi encontrado
4. O indicador de loading na UI deve estar visível durante a geração

---

### App lento após muitas operações

**Sintoma**: App fica lento com uso prolongado

**Causa**: Logs acumulados, cache crescendo

**Solução**:
```typescript
// Limpe logs periodicamente
useAppStore.getState().clearLogs();

// Limite tamanho do cache
const MAX_LOGS = 100;
if (logs.length > MAX_LOGS) {
  logs = logs.slice(-MAX_LOGS);
}
```

---

### Alto uso de memória

**Sintoma**: App usa muita memória

**Causa**: Credenciais grandes, logs extensos

**Solução**:
1. Limpe logs antigos
2. Remova credenciais não usadas
3. Reinicie o app periodicamente

**Monitoramento**:
```bash
# Veja uso de memória
adb shell dumpsys meminfo com.carteiraidentidadeacademica
```

---

## Problemas de Testes

### Testes falhando aleatoriamente

**Sintoma**: Testes passam às vezes, falham outras

**Causa**: Testes assíncronos, race conditions

**Solução**:
```typescript
// Use waitFor para operações assíncronas
import { waitFor } from '@testing-library/react-native';

await waitFor(() => {
  expect(screen.getByText('Success')).toBeTruthy();
}, { timeout: 5000 });

// Use act para updates de estado
import { act } from '@testing-library/react-native';

await act(async () => {
  await someAsyncOperation();
});
```

---

### Property tests falhando

**Sintoma**: fast-check encontra contraexemplos

**Causa**: Bug real ou gerador de dados incorreto

**Solução**:
1. **Analise o contraexemplo**: fast-check mostra o input que falhou
2. **Reproduza manualmente**: Use o input para debugar
3. **Corrija o bug ou o gerador**

**Exemplo**:
```typescript
// fast-check mostra:
// Counterexample: { cpf: "00000000000" }

// Corrija o gerador:
const arbitraryCPF = fc.string({ minLength: 11, maxLength: 11 })
  .filter(s => s !== "00000000000"); // Exclua CPF inválido
```

---

### Testes E2E falhando

**Sintoma**: Testes de integração falham

**Causa**: Timing, estado não limpo, emulador lento

**Solução**:
```typescript
// Aumente timeouts
await waitFor(element(by.id('success')))
  .toBeVisible()
  .withTimeout(10000); // 10 segundos

// Limpe estado antes de cada teste
beforeEach(async () => {
  await device.launchApp({ newInstance: true });
});

// Use emulador mais rápido
// Prefira x86_64 ao ARM
```

---

## Problemas Específicos do Windows

### Erro: "EPERM: operation not permitted"

**Sintoma**: npm install falha com erro de permissão

**Solução**:
```bash
# Execute como Administrador
# Ou desabilite antivírus temporariamente
# Ou adicione exceção para pasta do projeto
```

---

### Erro: "Command failed: gradlew.bat"

**Sintoma**: Build falha no Windows

**Solução**:
```bash
# Use PowerShell ou CMD, não Git Bash
# Ou configure Git Bash corretamente:
export JAVA_HOME="/c/Program Files/Java/jdk-17"
export ANDROID_HOME="/c/Users/[USER]/AppData/Local/Android/Sdk"
```

---

## Ferramentas de Debug

### React Native Debugger

```bash
# Instale
npm install -g react-native-debugger

# Execute
react-native-debugger

# No app, pressione Ctrl+M e selecione "Debug"
```

---

### Flipper

```bash
# Já vem com React Native 0.76
# Abra Flipper e conecte ao app
# Veja logs, network, layout, etc.
```

---

### ADB Logcat

```bash
# Veja todos os logs
adb logcat

# Filtre por tag
adb logcat -s ReactNative:V ReactNativeJS:V

# Salve em arquivo
adb logcat > logs.txt
```

---

## Comandos Úteis

### Limpar tudo

```bash
# Limpe cache do npm
npm cache clean --force

# Limpe node_modules
rm -rf node_modules package-lock.json

# Limpe cache do Metro
rm -rf $TMPDIR/metro-*
rm -rf $TMPDIR/haste-*

# Limpe build do Android
cd android
./gradlew clean
./gradlew cleanBuildCache
cd ..

# Reinstale
npm install

# Rebuild
npm run android
```

---

### Reset completo do app

```bash
# Desinstale o app
adb uninstall com.carteiraidentidadeacademica

# Limpe dados
adb shell pm clear com.carteiraidentidadeacademica

# Reinstale
npm run android
```

---

### Verificar configuração

```bash
# Verifique ambiente React Native
npx react-native doctor

# Verifique versões
node --version  # Deve ser >= 18
java -version   # Deve ser JDK 17
npm --version

# Verifique Android SDK
sdkmanager --list
```

---

## Quando Pedir Ajuda

Se nenhuma solução acima funcionou:

1. **Colete informações**:
   - Versão do Node.js, npm, Java
   - Sistema operacional
   - Mensagem de erro completa
   - Logs do ADB
   - Passos para reproduzir

2. **Verifique logs**:
   - Painel de Logs no app
   - Console do Metro Bundler
   - ADB logcat
   - Flipper

3. **Crie uma issue**:
   - Descreva o problema
   - Cole logs relevantes
   - Mencione o que já tentou

4. **Forneça contexto**:
   - O que estava tentando fazer?
   - Funcionava antes?
   - Mudou algo recentemente?

---

## Recursos Adicionais

- [React Native Troubleshooting](https://reactnative.dev/docs/troubleshooting)
- [Android Developer Docs](https://developer.android.com/docs)
- [Stack Overflow - React Native](https://stackoverflow.com/questions/tagged/react-native)
- [React Native Community](https://github.com/react-native-community)

---

**Versão**: 1.0.0  
**Última atualização**: Março 2026

**Nota**: Este guia é atualizado continuamente. Se encontrou um problema não listado, por favor contribua com a solução!
