/**
 * SSI Glossary - Termos e definições em português
 *
 * Este glossário fornece definições claras dos termos técnicos
 * utilizados no sistema de Identidade Auto-Soberana
 */

export interface GlossaryTerm {
  term: string;
  definition: string;
  category: 'identity' | 'cryptography' | 'credential' | 'protocol';
}

export const glossary: GlossaryTerm[] = [
  {
    term: 'SSI (Self-Sovereign Identity)',
    definition: 'Identidade Auto-Soberana. Modelo onde o usuário tem controle total sobre suas próprias credenciais digitais, sem depender de autoridades centralizadas.',
    category: 'identity',
  },
  {
    term: 'DID (Decentralized Identifier)',
    definition: 'Identificador Descentralizado. Um identificador único e verificável controlado pelo titular, que não depende de registro centralizado.',
    category: 'identity',
  },
  {
    term: 'Credencial Verificável',
    definition: 'Documento digital assinado criptograficamente que contém informações sobre o titular, emitido por uma entidade confiável.',
    category: 'credential',
  },
  {
    term: 'Apresentação Verificável',
    definition: 'Resposta do titular a uma requisição, contendo atributos selecionados ou provas criptográficas derivadas de suas credenciais.',
    category: 'credential',
  },
  {
    term: 'SD-JWT (Selective Disclosure JWT)',
    definition: 'Formato de token que permite divulgação seletiva de atributos, revelando apenas as informações necessárias através de hashing criptográfico.',
    category: 'protocol',
  },
  {
    term: 'ZKP (Zero-Knowledge Proof)',
    definition: 'Prova de Conhecimento Zero. Método criptográfico que permite provar a veracidade de uma informação sem revelar a informação em si.',
    category: 'cryptography',
  },
  {
    term: 'AnonCreds',
    definition: 'Sistema de credenciais anônimas do Hyperledger que suporta provas de conhecimento zero e predicados matemáticos.',
    category: 'protocol',
  },
  {
    term: 'Nullifier',
    definition: 'Hash determinístico usado para prevenir duplicação de votos ou transações, mantendo o anonimato do usuário.',
    category: 'cryptography',
  },
  {
    term: 'Range Proof',
    definition: 'Prova de Intervalo. Prova criptográfica que valida se um valor está dentro de um intervalo específico sem revelar o valor exato.',
    category: 'cryptography',
  },
  {
    term: 'PEX (Presentation Exchange)',
    definition: 'Formato padronizado JSON para requisição e entrega de credenciais no protocolo OID4VP.',
    category: 'protocol',
  },
  {
    term: 'did:key',
    definition: 'Método DID que deriva o identificador diretamente da chave pública, sem necessidade de registro em blockchain.',
    category: 'identity',
  },
  {
    term: 'did:peer',
    definition: 'Método DID para comunicação peer-to-peer entre duas partes, sem registro público.',
    category: 'identity',
  },
  {
    term: 'did:web',
    definition: 'Método DID que utiliza domínios web (HTTPS) para resolução de documentos DID.',
    category: 'identity',
  },
  {
    term: 'Emissor',
    definition: 'Entidade que cria e assina credenciais verificáveis. No contexto deste app, simula a UFSC.',
    category: 'credential',
  },
  {
    term: 'Titular',
    definition: 'Pessoa ou entidade que possui e controla suas próprias credenciais verificáveis.',
    category: 'credential',
  },
  {
    term: 'Verificador',
    definition: 'Entidade que valida apresentações verificáveis para controlar acesso ou confirmar informações.',
    category: 'credential',
  },
  {
    term: 'Assinatura Digital',
    definition: 'Mecanismo criptográfico que garante autenticidade e integridade de dados digitais.',
    category: 'cryptography',
  },
  {
    term: 'Hash Criptográfico',
    definition: 'Função matemática que transforma dados em uma sequência fixa de caracteres, impossível de reverter.',
    category: 'cryptography',
  },
  {
    term: 'Divulgação Seletiva',
    definition: 'Capacidade de compartilhar apenas os atributos necessários de uma credencial, ocultando os demais.',
    category: 'credential',
  },
  {
    term: 'Predicado',
    definition: 'Condição matemática que pode ser provada sem revelar o valor subjacente (ex: idade >= 18).',
    category: 'cryptography',
  },
];

/**
 * Busca termos no glossário
 */
export const searchGlossary = (query: string): GlossaryTerm[] => {
  const lowerQuery = query.toLowerCase();
  return glossary.filter(
    item =>
      item.term.toLowerCase().includes(lowerQuery) ||
      item.definition.toLowerCase().includes(lowerQuery)
  );
};

/**
 * Obtém termos por categoria
 */
export const getTermsByCategory = (
  category: GlossaryTerm['category']
): GlossaryTerm[] => {
  return glossary.filter(item => item.category === category);
};

/**
 * Obtém definição de um termo específico
 */
export const getTermDefinition = (term: string): string | null => {
  const found = glossary.find(
    item => item.term.toLowerCase() === term.toLowerCase()
  );
  return found ? found.definition : null;
};
