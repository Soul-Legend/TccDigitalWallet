/**
 * ErrorHandler Tests
 *
 * Covers:
 * - CryptoError → Portuguese message mapping for all operations
 * - ValidationError → field translation and message formatting
 * - StorageError → operation-specific messages
 * - Generic error handling
 * - Error logging integration
 */

import ErrorHandler, {
  CryptoError,
  ValidationError,
  StorageError,
} from '../ErrorHandler';
import LogService from '../LogService';
import {useAppStore} from '../../stores/useAppStore';

beforeEach(() => {
  useAppStore.getState().clearLogs();
  jest.clearAllMocks();
});

describe('ErrorHandler - CryptoError Handling', () => {
  const cryptoOperations: {operation: string; expectedFragment: string}[] = [
    {operation: 'key_generation', expectedFragment: 'gerar chaves criptográficas'},
    {operation: 'signature', expectedFragment: 'assinar digitalmente'},
    {operation: 'verification', expectedFragment: 'verificar assinatura'},
    {operation: 'hash', expectedFragment: 'hash criptográfico'},
    {operation: 'zkp_generation', expectedFragment: 'prova de conhecimento zero'},
    {operation: 'zkp_verification', expectedFragment: 'verificar prova'},
    {operation: 'encryption', expectedFragment: 'criptografar dados'},
    {operation: 'decryption', expectedFragment: 'descriptografar dados'},
  ];

  it.each(cryptoOperations)(
    'should return Portuguese message for operation "$operation"',
    ({operation, expectedFragment}) => {
      const error = new CryptoError(`test error`, operation, {});
      const message = ErrorHandler.handleCryptoError(error, 'emissor');
      expect(message).toContain(expectedFragment);
    },
  );

  it('should return fallback message for unknown operation', () => {
    const error = new CryptoError('something broke', 'unknown_op', {});
    const message = ErrorHandler.handleCryptoError(error, 'verificador');
    expect(message).toContain('Erro criptográfico');
    expect(message).toContain('something broke');
  });

  it('should log the error via LogService', () => {
    const spy = jest.spyOn(LogService, 'logError');
    const error = new CryptoError('test', 'signature', {});
    ErrorHandler.handleCryptoError(error, 'emissor');
    expect(spy).toHaveBeenCalledWith('emissor', error, error.stack);
    spy.mockRestore();
  });
});

describe('ErrorHandler - ValidationError Handling', () => {
  it('should translate known field names to Portuguese', () => {
    const fields = [
      {field: 'nome_completo', translated: 'Nome Completo'},
      {field: 'cpf', translated: 'CPF'},
      {field: 'matricula', translated: 'Matrícula'},
      {field: 'curso', translated: 'Curso'},
      {field: 'status_matricula', translated: 'Status de Matrícula'},
      {field: 'data_nascimento', translated: 'Data de Nascimento'},
      {field: 'isencao_ru', translated: 'Isenção RU'},
      {field: 'acesso_laboratorios', translated: 'Acesso a Laboratórios'},
    ];

    for (const {field, translated} of fields) {
      const error = new ValidationError('campo inválido', field, '');
      const message = ErrorHandler.handleValidationError(error, 'emissor');
      expect(message).toContain(translated);
    }
  });

  it('should return field name as-is for unknown fields', () => {
    const error = new ValidationError('invalid', 'unknown_field', '');
    const message = ErrorHandler.handleValidationError(error, 'titular');
    expect(message).toContain('unknown_field');
  });

  it('should handle validation error without field', () => {
    const error = new ValidationError('data inválida');
    const message = ErrorHandler.handleValidationError(error, 'verificador');
    expect(message).toContain('Erro de validação');
    expect(message).toContain('data inválida');
  });
});

describe('ErrorHandler - StorageError Handling', () => {
  const storageOperations: {op: 'read' | 'write' | 'delete' | 'encrypt' | 'decrypt'; fragment: string}[] = [
    {op: 'read', fragment: 'ler dados'},
    {op: 'write', fragment: 'salvar dados'},
    {op: 'delete', fragment: 'excluir dados'},
    {op: 'encrypt', fragment: 'criptografar dados'},
    {op: 'decrypt', fragment: 'descriptografar dados'},
  ];

  it.each(storageOperations)(
    'should return message for "$op" operation',
    ({op, fragment}) => {
      const error = new StorageError('test', op, {});
      const message = ErrorHandler.handleStorageError(error, 'titular');
      expect(message).toContain(fragment);
    },
  );
});

describe('ErrorHandler - Generic Error Handling', () => {
  it('should return generic Portuguese message', () => {
    const error = new Error('something unexpected');
    const message = ErrorHandler.handleGenericError(error, 'emissor');
    expect(message).toContain('erro inesperado');
  });

  it('should log the error', () => {
    const spy = jest.spyOn(LogService, 'logError');
    const error = new Error('test');
    ErrorHandler.handleGenericError(error, 'verificador');
    expect(spy).toHaveBeenCalledWith('verificador', error, error.stack);
    spy.mockRestore();
  });
});

describe('ErrorHandler - logError', () => {
  it('should delegate to LogService.logError', () => {
    const spy = jest.spyOn(LogService, 'logError');
    const error = new Error('test');
    ErrorHandler.logError(error, 'titular', 'context');
    expect(spy).toHaveBeenCalledWith('titular', error, error.stack);
    spy.mockRestore();
  });
});

describe('Error Classes', () => {
  it('CryptoError should have correct name and fields', () => {
    const error = new CryptoError('msg', 'signature', {foo: 'bar'});
    expect(error.name).toBe('CryptoError');
    expect(error.operation).toBe('signature');
    expect(error.details).toEqual({foo: 'bar'});
    expect(error.message).toBe('msg');
    expect(error instanceof CryptoError).toBe(true);
    expect(error instanceof Error).toBe(true);
  });

  it('ValidationError should have correct name and fields', () => {
    const error = new ValidationError('msg', 'cpf', '123');
    expect(error.name).toBe('ValidationError');
    expect(error.field).toBe('cpf');
    expect(error.value).toBe('123');
    expect(error instanceof ValidationError).toBe(true);
  });

  it('StorageError should have correct name and fields', () => {
    const error = new StorageError('msg', 'write', {});
    expect(error.name).toBe('StorageError');
    expect(error.operation).toBe('write');
    expect(error instanceof StorageError).toBe(true);
  });
});
