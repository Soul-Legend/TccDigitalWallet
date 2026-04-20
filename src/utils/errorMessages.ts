/**
 * User-friendly error messages in Portuguese
 *
 * Provides clear, actionable error messages for all error scenarios
 */

export interface ErrorMessage {
  title: string;
  message: string;
  suggestion?: string;
}

/**
 * Error message catalog
 */
export const ErrorMessages = {
  // Cryptographic errors
  KEY_GENERATION_FAILED: {
    title: 'Falha na Geração de Chaves',
    message: 'Não foi possível gerar as chaves criptográficas.',
    suggestion: 'Verifique se o dispositivo suporta operações criptográficas e tente novamente.',
  },
  SIGNATURE_VERIFICATION_FAILED: {
    title: 'Assinatura Inválida',
    message: 'A assinatura digital não pôde ser verificada.',
    suggestion: 'A credencial pode ter sido alterada ou corrompida. Solicite uma nova credencial.',
  },
  HASH_COMPUTATION_FAILED: {
    title: 'Erro no Cálculo de Hash',
    message: 'Não foi possível calcular o hash criptográfico.',
    suggestion: 'Tente novamente. Se o problema persistir, reinicie o aplicativo.',
  },
  ZKP_GENERATION_FAILED: {
    title: 'Falha na Geração de Prova',
    message: 'Não foi possível gerar a prova de conhecimento zero.',
    suggestion: 'Verifique se sua credencial contém os atributos necessários e tente novamente.',
  },

  // Validation errors
  INVALID_CREDENTIAL_FORMAT: {
    title: 'Formato de Credencial Inválido',
    message: 'A credencial colada não está em um formato válido.',
    suggestion: 'Certifique-se de colar uma credencial SD-JWT ou AnonCreds válida.',
  },
  INVALID_PEX_FORMAT: {
    title: 'Formato PEX Inválido',
    message: 'A requisição de apresentação não está no formato PEX correto.',
    suggestion: 'Verifique se a requisição foi copiada corretamente do verificador.',
  },
  MISSING_REQUIRED_FIELD: {
    title: 'Campo Obrigatório Ausente',
    message: 'Um ou mais campos obrigatórios não foram preenchidos.',
    suggestion: 'Preencha todos os campos marcados com * e tente novamente.',
  },
  INVALID_CPF: {
    title: 'CPF Inválido',
    message: 'O CPF informado não é válido.',
    suggestion: 'Digite um CPF com 11 dígitos numéricos.',
  },
  INVALID_DATE: {
    title: 'Data Inválida',
    message: 'A data informada não está no formato correto.',
    suggestion: 'Use o formato AAAA-MM-DD (ex: 2000-01-15).',
  },

  // Storage errors
  STORAGE_FAILED: {
    title: 'Erro ao Armazenar',
    message: 'Não foi possível salvar os dados no armazenamento seguro.',
    suggestion: 'Verifique se há espaço disponível no dispositivo e tente novamente.',
  },
  RETRIEVAL_FAILED: {
    title: 'Erro ao Recuperar Dados',
    message: 'Não foi possível recuperar os dados armazenados.',
    suggestion: 'Os dados podem estar corrompidos. Tente reiniciar o aplicativo.',
  },
  ENCRYPTION_FAILED: {
    title: 'Erro na Criptografia',
    message: 'Não foi possível criptografar os dados.',
    suggestion: 'Verifique as permissões do aplicativo e tente novamente.',
  },
  DECRYPTION_FAILED: {
    title: 'Erro na Descriptografia',
    message: 'Não foi possível descriptografar os dados armazenados.',
    suggestion: 'Os dados podem estar corrompidos. Você pode precisar gerar uma nova identidade.',
  },

  // Presentation errors
  MISSING_ATTRIBUTES: {
    title: 'Atributos Ausentes',
    message: 'Sua credencial não contém todos os atributos solicitados.',
    suggestion: 'Solicite uma nova credencial com os atributos necessários.',
  },
  PREDICATE_NOT_SATISFIED: {
    title: 'Predicado Não Satisfeito',
    message: 'Sua credencial não satisfaz as condições solicitadas.',
    suggestion: 'Verifique os requisitos da apresentação e sua credencial.',
  },
  NULLIFIER_DUPLICATE: {
    title: 'Voto Duplicado Detectado',
    message: 'Esta credencial já foi usada para votar nesta eleição.',
    suggestion: 'Cada credencial pode votar apenas uma vez por eleição.',
  },

  // Verification errors
  ISSUER_NOT_TRUSTED: {
    title: 'Emissor Não Confiável',
    message: 'O emissor da credencial não é reconhecido.',
    suggestion: 'Apenas credenciais emitidas pela UFSC são aceitas.',
  },
  PRESENTATION_EXPIRED: {
    title: 'Apresentação Expirada',
    message: 'A apresentação está fora do prazo de validade.',
    suggestion: 'Gere uma nova apresentação e tente novamente.',
  },
  STRUCTURAL_INTEGRITY_FAILED: {
    title: 'Integridade Comprometida',
    message: 'A estrutura da apresentação foi alterada.',
    suggestion: 'A apresentação pode ter sido modificada. Gere uma nova.',
  },

  // Network/Clipboard errors
  CLIPBOARD_ACCESS_DENIED: {
    title: 'Acesso Negado',
    message: 'Não foi possível acessar a área de transferência.',
    suggestion: 'Verifique as permissões do aplicativo nas configurações do sistema.',
  },
  CLIPBOARD_EMPTY: {
    title: 'Área de Transferência Vazia',
    message: 'Não há conteúdo na área de transferência.',
    suggestion: 'Copie uma credencial ou requisição antes de colar.',
  },

  // Generic errors
  UNKNOWN_ERROR: {
    title: 'Erro Desconhecido',
    message: 'Ocorreu um erro inesperado.',
    suggestion: 'Tente novamente. Se o problema persistir, reinicie o aplicativo.',
  },
  OPERATION_CANCELLED: {
    title: 'Operação Cancelada',
    message: 'A operação foi cancelada pelo usuário.',
    suggestion: '',
  },
  TIMEOUT: {
    title: 'Tempo Esgotado',
    message: 'A operação demorou muito tempo e foi cancelada.',
    suggestion: 'Verifique sua conexão e tente novamente.',
  },
};

/**
 * Gets a user-friendly error message
 */
export const getErrorMessage = (
  errorCode: keyof typeof ErrorMessages
): ErrorMessage => {
  return ErrorMessages[errorCode] || ErrorMessages.UNKNOWN_ERROR;
};

/**
 * Formats an error for display
 */
export const formatError = (
  errorCode: keyof typeof ErrorMessages,
  additionalContext?: string
): string => {
  const error = getErrorMessage(errorCode);
  let message = `${error.title}: ${error.message}`;

  if (error.suggestion) {
    message += `\n\n${error.suggestion}`;
  }

  if (additionalContext) {
    message += `\n\nDetalhes: ${additionalContext}`;
  }

  return message;
};

/**
 * Maps technical errors to user-friendly messages
 */
export const mapTechnicalError = (technicalError: Error): ErrorMessage => {
  const message = technicalError.message.toLowerCase();

  if (message.includes('key') && message.includes('generat')) {
    return ErrorMessages.KEY_GENERATION_FAILED;
  }

  if (message.includes('signature') || message.includes('verify')) {
    return ErrorMessages.SIGNATURE_VERIFICATION_FAILED;
  }

  if (message.includes('storage') || message.includes('save')) {
    return ErrorMessages.STORAGE_FAILED;
  }

  if (message.includes('format') || message.includes('parse')) {
    return ErrorMessages.INVALID_CREDENTIAL_FORMAT;
  }

  if (message.includes('pex')) {
    return ErrorMessages.INVALID_PEX_FORMAT;
  }

  if (message.includes('nullifier') && message.includes('duplicate')) {
    return ErrorMessages.NULLIFIER_DUPLICATE;
  }

  return ErrorMessages.UNKNOWN_ERROR;
};
