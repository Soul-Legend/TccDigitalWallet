import LogServiceInstance from './LogService';
import type {ILogService} from '../types';

/**
 * Custom error classes for different error categories
 */

/**
 * CryptoError - Errors related to cryptographic operations
 */
export class CryptoError extends Error {
  constructor(
    message: string,
    public operation: string,
    public details?: any
  ) {
    super(message);
    this.name = 'CryptoError';
    Object.setPrototypeOf(this, CryptoError.prototype);
  }
}

/**
 * ValidationError - Errors related to data validation
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public field?: string,
    public value?: any
  ) {
    super(message);
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * StorageError - Errors related to storage operations
 */
export class StorageError extends Error {
  constructor(
    message: string,
    public operation: 'read' | 'write' | 'delete' | 'encrypt' | 'decrypt',
    public details?: any
  ) {
    super(message);
    this.name = 'StorageError';
    Object.setPrototypeOf(this, StorageError.prototype);
  }
}

/**
 * ErrorHandler - Centralized error handling service
 *
 * This service provides methods to handle different categories of errors
 * and integrates with LogService for error logging.
 */
class ErrorHandler {
  private readonly logger: ILogService;

  constructor(logger: ILogService = LogServiceInstance) {
    this.logger = logger;
  }

  /**
   * Handles cryptographic errors
   */
  handleCryptoError(
    error: CryptoError,
    module: 'emissor' | 'titular' | 'verificador'
  ): string {
    // Log the error
    this.logger.logError(module, error, error.stack);

    // Return user-friendly message in Portuguese
    return this.getCryptoErrorMessage(error);
  }

  /**
   * Handles validation errors
   */
  handleValidationError(
    error: ValidationError,
    module: 'emissor' | 'titular' | 'verificador'
  ): string {
    // Log the error
    this.logger.logError(module, error, error.stack);

    // Return user-friendly message in Portuguese
    return this.getValidationErrorMessage(error);
  }

  /**
   * Handles storage errors
   */
  handleStorageError(
    error: StorageError,
    module: 'emissor' | 'titular' | 'verificador'
  ): string {
    // Log the error
    this.logger.logError(module, error, error.stack);

    // Return user-friendly message in Portuguese
    return this.getStorageErrorMessage(error);
  }

  /**
   * Handles generic errors
   */
  handleGenericError(
    error: Error,
    module: 'emissor' | 'titular' | 'verificador'
  ): string {
    // Log the error
    this.logger.logError(module, error, error.stack);

    // Return generic user-friendly message
    return 'Ocorreu um erro inesperado. Por favor, tente novamente.';
  }

  /**
   * Logs an error without handling it
   */
  logError(
    error: Error,
    module: 'emissor' | 'titular' | 'verificador',
    _context?: string
  ): void {
    this.logger.logError(module, error, error.stack);
  }

  /**
   * Gets user-friendly message for crypto errors
   */
  private getCryptoErrorMessage(error: CryptoError): string {
    switch (error.operation) {
      case 'key_generation':
        return 'Falha ao gerar chaves criptográficas. Verifique se o dispositivo suporta armazenamento seguro.';
      case 'signature':
        return 'Falha ao assinar digitalmente. Por favor, tente novamente.';
      case 'verification':
        return 'Falha ao verificar assinatura. A credencial pode estar corrompida.';
      case 'hash':
        return 'Falha ao computar hash criptográfico. Por favor, tente novamente.';
      case 'zkp_generation':
        return 'Falha ao gerar prova de conhecimento zero. Por favor, tente novamente.';
      case 'zkp_verification':
        return 'Falha ao verificar prova de conhecimento zero. A prova pode estar inválida.';
      case 'encryption':
        return 'Falha ao criptografar dados. Por favor, tente novamente.';
      case 'decryption':
        return 'Falha ao descriptografar dados. Os dados podem estar corrompidos.';
      default:
        return `Erro criptográfico: ${error.message}`;
    }
  }

  /**
   * Gets user-friendly message for validation errors
   */
  private getValidationErrorMessage(error: ValidationError): string {
    if (error.field) {
      return `Campo inválido: ${this.translateFieldName(error.field)}. ${error.message}`;
    }
    return `Erro de validação: ${error.message}`;
  }

  /**
   * Gets user-friendly message for storage errors
   */
  private getStorageErrorMessage(error: StorageError): string {
    switch (error.operation) {
      case 'read':
        return 'Falha ao ler dados do armazenamento. Os dados podem estar corrompidos.';
      case 'write':
        return 'Falha ao salvar dados. Verifique se há espaço disponível no dispositivo.';
      case 'delete':
        return 'Falha ao excluir dados. Por favor, tente novamente.';
      case 'encrypt':
        return 'Falha ao criptografar dados para armazenamento. Por favor, tente novamente.';
      case 'decrypt':
        return 'Falha ao descriptografar dados. Os dados podem estar corrompidos.';
      default:
        return `Erro de armazenamento: ${error.message}`;
    }
  }

  /**
   * Translates field names to Portuguese
   */
  private translateFieldName(field: string): string {
    const translations: Record<string, string> = {
      nome_completo: 'Nome Completo',
      cpf: 'CPF',
      matricula: 'Matrícula',
      curso: 'Curso',
      status_matricula: 'Status de Matrícula',
      data_nascimento: 'Data de Nascimento',
      alojamento_indigena: 'Alojamento Indígena',
      auxilio_creche: 'Auxílio Creche',
      auxilio_moradia: 'Auxílio Moradia',
      bolsa_estudantil: 'Bolsa Estudantil',
      bolsa_permanencia_mec: 'Bolsa Permanência MEC',
      paiq: 'PAIQ',
      moradia_estudantil: 'Moradia Estudantil',
      isencao_ru: 'Isenção RU',
      isencao_esporte: 'Isenção Esporte',
      isencao_idiomas: 'Isenção Idiomas',
      acesso_laboratorios: 'Acesso a Laboratórios',
      acesso_predios: 'Acesso a Prédios',
    };

    return translations[field] || field;
  }
}

// Export singleton instance
export { ErrorHandler };

const errorHandlerInstance = new ErrorHandler();
export default errorHandlerInstance;
