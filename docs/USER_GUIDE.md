# Guia do Usuário - Carteira Identidade Acadêmica

## Introdução

Este guia explica como usar o aplicativo de Carteira de Identidade Acadêmica para emitir, armazenar e apresentar credenciais verificáveis.

## Glossário de Termos

- **DID (Identificador Descentralizado)**: Identificador digital controlado pelo usuário, sem autoridade central
- **Credencial Verificável**: Documento digital assinado contendo dados acadêmicos
- **Apresentação Verificável**: Resposta contendo apenas os dados solicitados pelo verificador
- **SD-JWT**: Formato de credencial onde atributos individuais podem ser revelados ou omitidos
- **AnonCreds**: Formato de credencial baseado em CL-signatures que permite divulgação seletiva com unlinkability e predicados numéricos
- **ZKP (Prova de Conhecimento Zero)**: Prova que valida uma afirmação sem revelar os dados subjacentes
- **Groth16**: Sistema de provas ZKP usado via mopro para circuitos customizados (faixa etária, status, nullifiers)
- **Nullifier**: Hash determinístico usado para prevenir voto duplicado sem identificar o votante

Para mais termos, acesse o Glossário dentro do aplicativo.

## Primeira Inicialização

### Geração de Identidade

Na primeira vez que você abre o aplicativo:

1. O sistema exibe uma tela de inicialização
2. Inicializa o agente Credo com wallet criptografado (Aries Askar)
3. Gera um par de chaves Ed25519 e cria seu DID via `did:key`
4. Exibe seu DID gerado (formato: `did:key:z...`)

As chaves privadas ficam no wallet criptografado do Askar, protegidas pelo Keystore do Android.

## Navegação

O aplicativo possui 5 telas principais acessíveis pelo menu:

- **Início**: Tela principal com visão geral
- **Emissor**: Para emitir credenciais (simula a UFSC)
- **Titular**: Para gerenciar suas credenciais
- **Verificador**: Para validar apresentações
- **Logs**: Para monitorar eventos criptográficos

## Módulo Emissor

### Objetivo
Simula a instituição (UFSC) emitindo uma credencial acadêmica.

### Passo a Passo

1. **Acesse o Módulo Emissor** pelo menu
2. **Preencha o formulário** com seus dados acadêmicos:
   - Nome completo
   - CPF (11 dígitos)
   - Matrícula
   - Curso
   - Status de matrícula (Ativo/Inativo)
   - Data de nascimento (formato: AAAA-MM-DD)
   - Benefícios sociais (checkboxes)
   - Isenções (checkboxes)
   - Acessos a laboratórios e prédios (separados por vírgula)

3. **Escolha o formato** (SD-JWT ou AnonCreds)
   - **SD-JWT**: Monta JSON com header/payload e assina com Ed25519. Resultado: token `header.payload.signature`.
   - **AnonCreds**: Executa protocolo CL-signature completo via @hyperledger/anoncreds-react-native. Resultado: JSON com `{format: 'anoncreds', credential, schema_id, cred_def_id}`.

4. **Clique em "Emitir Credencial"**
   - O sistema valida os campos obrigatórios
   - Gera a credencial no formato escolhido
   - Copia para a área de transferência

4. **Confirmação**: Mensagem de sucesso aparece quando a credencial é copiada

### Campos Obrigatórios

- Nome completo
- CPF
- Matrícula
- Curso
- Status de matrícula
- Data de nascimento

### Exemplo de Dados

```
Nome: João Silva Santos
CPF: 12345678900
Matrícula: 20231234567
Curso: Ciência da Computação
Status: Ativo
Data de Nascimento: 2000-05-15
Acesso Laboratórios: LCN, LINSE, LabSEC
Acesso Prédios: INE, CTC
```

### Cadeia de Confiança (PKI)

O módulo emissor inclui uma seção colapsável "🔗 Cadeia de Confiança" que permite gerenciar emissores confiáveis hierárquicos.

#### Configurar Âncora Raiz

1. Expanda a seção **Cadeia de Confiança** tocando no cabeçalho
2. Toque em **"Inicializar Âncora Raiz"**
3. O sistema cria o emissor raiz (usa o DID do emissor atual ou `did:web:ufsc.br`)
4. A âncora raiz aparece na lista com ícone 🏛️

#### Registrar Emissor Filho

1. Selecione o **emissor pai** nos chips horizontais (🏛️ para raiz, 🏢 para intermediários)
2. Se nenhum pai for selecionado, o sistema usa a âncora raiz automaticamente
3. Preencha o **DID** do novo emissor (ex: `did:web:ctc.ufsc.br`)
4. Preencha o **nome** descritivo (ex: `CTC - Centro Tecnológico`)
5. Toque em **"Registrar Emissor"**
6. O novo emissor aparece na lista com indicação do pai

#### Exemplo de Hierarquia

```
🏛️ UFSC - Âncora Raiz (did:web:ufsc.br)
  🏢 CTC - Centro Tecnológico (did:web:ctc.ufsc.br)
    🏢 INE - Departamento de Informática (did:web:ine.ufsc.br)
  🏢 CAGR - Coordenadoria Acadêmica (did:web:cagr.ufsc.br)
```

> **Nota**: Quando uma cadeia de confiança está configurada, o módulo verificador só aceita credenciais de emissores que pertencem à cadeia.

## Módulo Titular

### Objetivo
Gerenciar suas credenciais e responder a requisições de apresentação.

### Armazenar uma Credencial

1. **Acesse o Módulo Titular**
2. **Cole a credencial** no campo de entrada
   - Use o botão "Colar" ou Ctrl+V
3. **Aguarde a validação**
   - O sistema verifica a estrutura do token
   - Armazena de forma criptografada
4. **Visualize sua credencial**
   - Todos os atributos são exibidos em texto claro
   - Navegue entre múltiplas credenciais se tiver mais de uma

### Responder a uma Requisição

1. **Cole a requisição PEX** recebida do verificador
2. **Revise o Modal de Consentimento**
   - Veja quais atributos são solicitados
   - Atributos obrigatórios aparecem marcados
   - Atributos opcionais podem ser desmarcados
3. **Aprove ou Cancele**
   - Aprovar: Gera a apresentação
   - Cancelar: Fecha o modal sem gerar nada
4. **Aguarde a geração**
   - Para SD-JWT: Ofusca atributos não revelados
   - Para ZKP: Gera provas matemáticas
5. **Apresentação copiada**: Mensagem de sucesso confirma

### Tipos de Apresentação

**SD-JWT (Divulgação Seletiva)**
- Revela apenas os atributos selecionados; demais são omitidos
- Assinatura Ed25519 (proof type: `JsonWebSignature2020`)
- Usado no cenário de Restaurante Universitário e Laboratórios

**Groth16 (ZKP via mopro)**
- Executa circuitos Circom para gerar provas Groth16
- Prova predicados (e.g., idade >= 18, status == Ativo) sem revelar valores
- Proof type: `Groth16Proof`
- Usado em Eleições (nullifier + elegibilidade) e Verificação de Maioridade

**AnonCreds (CL-Signature)**
- Divulgação seletiva com unlinkability (apresentação não correlacionável à credencial)
- Suporta predicados numéricos nativos (e.g., age >= 18)
- Proof type: `CLSignature2023`
- Disponível quando a credencial foi emitida em formato AnonCreds

## Módulo Verificador

### Objetivo
Validar apresentações verificáveis em diferentes cenários.

### Cenários Disponíveis

#### 1. Restaurante Universitário (RU)

**Objetivo**: Validar vínculo ativo e isenção tarifária

**Atributos solicitados**:
- status_matricula
- isencao_ru

**Fluxo**:
1. Selecione "Restaurante Universitário"
2. Clique em "Gerar Requisição"
3. Requisição é copiada automaticamente
4. Envie para o titular (via área de transferência)
5. Receba a apresentação do titular
6. Cole a apresentação no campo de validação
7. Sistema valida:
   - Assinatura do emissor
   - Hashes dos atributos revelados
   - Presença dos atributos obrigatórios
8. Resultado: Acesso aprovado ou negado

#### 2. Eleições Estudantis

**Objetivo**: Validar elegibilidade e prevenir voto duplicado

**Atributos solicitados**:
- status_matricula (prova ZKP de "Ativo")
- Nullifier único

**Fluxo**:
1. Selecione "Eleições"
2. Sistema gera requisição com election_id único
3. Titular gera:
   - Prova ZKP de matrícula ativa
   - Nullifier (hash determinístico)
4. Verificador valida:
   - Prova matemática de elegibilidade
   - Nullifier não está duplicado
5. Se válido: Registra nullifier e aprova voto
6. Se duplicado: Rejeita com mensagem de duplicidade

**Importante**: O mesmo estudante sempre gera o mesmo nullifier para a mesma eleição, impedindo voto duplicado.

#### 3. Laboratórios

**Objetivo**: Validar permissão de acesso físico

**Atributos solicitados**:
- acesso_laboratorios ou acesso_predios

**Fluxo**:
1. Selecione "Laboratórios"
2. Digite o nome do laboratório/prédio (ex: "LCN", "INE")
3. Sistema gera requisição específica
4. Titular verifica se tem permissão
5. Se tem: Gera apresentação confirmando
6. Se não tem: Exibe mensagem de ausência de permissão
7. Verificador valida a permissão específica

#### 4. Verificação de Maioridade

**Objetivo**: Validar idade >= 18 anos sem revelar data de nascimento

**Atributos solicitados**:
- Range Proof de data_nascimento >= 18 anos

**Fluxo**:
1. Selecione "Maioridade"
2. Sistema gera requisição com predicado idade >= 18
4. Titular gera prova:
   - Com credencial SD-JWT: executa circuito `age_range` via mopro/Groth16; gera prova de que idade >= 18 sem revelar a data
   - Com credencial AnonCreds: usa predicado nativo CL-signature (age >= 18)
5. Verificador valida:
   - Groth16: verifica prova de circuito via `verifyCircomProof()`
   - AnonCreds: verifica apresentação via `Presentation.verify()`
6. Resultado: Maior ou menor de idade (data de nascimento não é revelada)

### Validação da Cadeia de Confiança

Quando uma cadeia de confiança está configurada (via Módulo Emissor), o verificador adiciona automaticamente uma etapa extra na validação:

- **🔗 Cadeia de confiança verificada**: O emissor da credencial foi encontrado na cadeia e todos os certificados da cadeia são válidos até a âncora raiz.
- **⛓️‍💥 Emissor fora da cadeia de confiança**: O emissor não pertence à cadeia configurada. A apresentação será rejeitada.

> Se nenhuma cadeia de confiança estiver configurada, este passo é ignorado e a verificação funciona normalmente apenas com a assinatura do emissor.

## Painel de Logs

### Objetivo
Monitorar todos os eventos criptográficos em tempo real.

### Informações Exibidas

Cada entrada de log contém:
- **Timestamp**: Data e hora do evento
- **Operação**: Tipo (geração de chave, emissão, verificação, etc.)
- **Módulo**: Onde ocorreu (Emissor, Titular, Verificador)
- **Detalhes técnicos**:
  - Algoritmo usado
  - Tamanho de chave
  - Método DID
  - Hashes (truncados)
  - Resultados de validação
  - Parâmetros
- **Status**: Sucesso ou erro
- **Stack trace**: Em caso de erro

### Funcionalidades

- **Rolagem**: Navegue pelo histórico completo
- **Limpeza**: Botão para limpar todos os logs
- **Privacidade**: Dados sensíveis (CPF, nome) são ofuscados

### Exemplo de Log

```
[2026-03-31 18:30:45] Geração de Chaves
Módulo: Titular
Algoritmo: Ed25519
Tamanho: 256 bits
Método DID: did:key
Status: Sucesso
```

## Fluxo Completo de Uso

### Cenário: Acesso ao Restaurante Universitário

1. **Emissor emite credencial**
   - Preenche dados do estudante
   - Emite credencial SD-JWT
   - Credencial copiada

2. **Titular armazena credencial**
   - Cola credencial no Módulo Titular
   - Sistema valida e armazena
   - Credencial visível na tela

3. **Verificador gera requisição**
   - Seleciona cenário "RU"
   - Gera requisição PEX
   - Requisição copiada

4. **Titular gera apresentação**
   - Cola requisição no Módulo Titular
   - Revisa modal de consentimento
   - Aprova divulgação de status_matricula e isencao_ru
   - Apresentação SD-JWT gerada e copiada

5. **Verificador valida apresentação**
   - Cola apresentação no Módulo Verificador
   - Sistema valida assinatura e hashes
   - Resultado: Acesso aprovado ✓

6. **Logs registram tudo**
   - Emissão da credencial
   - Armazenamento
   - Geração de apresentação
   - Validação

## Dicas e Boas Práticas

### Segurança

- ✅ Suas chaves privadas nunca saem do dispositivo
- ✅ Credenciais são armazenadas criptografadas
- ✅ Você controla quais atributos revelar
- ✅ Logs ofuscam dados sensíveis

### Privacidade

- Use SD-JWT quando quiser revelar apenas alguns atributos
- Use ZKP quando quiser provar algo sem revelar o valor
- Sempre revise o modal de consentimento antes de aprovar
- Desmarque atributos opcionais que não quer revelar

### Performance

- Operações ZKP podem levar alguns segundos
- Range Proofs são computacionalmente intensivas
- Aguarde os indicadores de loading

### Troubleshooting

**Credencial não é aceita**
- Verifique se copiou o token completo (SD-JWT começa com `eyJ...`, AnonCreds começa com `{"format":"anoncreds"`)
- Se o parsing falhar, verifique os logs para a mensagem de erro

**Apresentação rejeitada**
- Verifique se revelou todos os atributos obrigatórios da requisição
- Verifique se a credencial ainda é válida
- Veja os logs para detalhes do erro

**Nullifier duplicado**
- Você já votou nesta eleição
- O sistema previne voto duplicado por design

## Acessibilidade

O aplicativo suporta:
- ✅ Screen readers (TalkBack)
- ✅ Tamanhos de fonte do sistema
- ✅ Alto contraste
- ✅ Touch targets mínimos de 44x44dp
- ✅ Navegação por teclado

## Suporte

Para problemas técnicos:
1. Consulte o [Guia de Troubleshooting](./TROUBLESHOOTING.md)
2. Verifique os logs no Painel de Logs
3. Abra uma issue no repositório


