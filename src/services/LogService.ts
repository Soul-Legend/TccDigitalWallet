import {LogEntry, LogDetails} from '../types';
import {useAppStore} from '../stores/useAppStore';
import {Module} from '../utils/constants';

/**
 * LogService - Captures and manages cryptographic events
 *
 * This service is responsible for logging all cryptographic operations
 * throughout the application for debugging and auditing purposes.
 */
class LogService {
  /**
   * Captures a cryptographic event and adds it to the global log store
   */
  captureEvent(
    operation: LogEntry['operation'],
    module: LogEntry['module'],
    details: LogDetails,
    success: boolean = true,
    error?: Error
  ): void {
    const {addLog} = useAppStore.getState();

    // Obfuscate sensitive data in logs
    const sanitizedDetails = this.sanitizeLogDetails(details);

    addLog({
      operation,
      module,
      details: sanitizedDetails,
      success,
      error,
    });
  }

  /**
   * Logs a key generation event
   */
  logKeyGeneration(
    module: LogEntry['module'],
    algorithm: string,
    keySize: number,
    didMethod: string,
    success: boolean = true,
    error?: Error
  ): void {
    this.captureEvent(
      'key_generation',
      module,
      {
        algorithm,
        key_size: keySize,
        did_method: didMethod,
      },
      success,
      error
    );
  }

  /**
   * Logs a credential issuance event
   */
  logCredentialIssuance(
    algorithm: string,
    success: boolean = true,
    parameters?: Record<string, any>,
    error?: Error
  ): void {
    this.captureEvent(
      'credential_issuance',
      Module.ISSUER,
      {
        algorithm,
        parameters,
      },
      success,
      error
    );
  }

  /**
   * Logs a presentation creation event
   */
  logPresentationCreation(
    algorithm: string,
    success: boolean = true,
    parameters?: Record<string, any>,
    error?: Error
  ): void {
    this.captureEvent(
      'presentation_creation',
      Module.HOLDER,
      {
        algorithm,
        parameters,
      },
      success,
      error
    );
  }

  /**
   * Logs a verification event
   */
  logVerification(
    algorithm: string,
    verificationResult: boolean,
    success: boolean = true,
    parameters?: Record<string, any>,
    error?: Error
  ): void {
    this.captureEvent(
      'verification',
      Module.VERIFIER,
      {
        algorithm,
        verification_result: verificationResult,
        parameters,
      },
      success,
      error
    );
  }

  /**
   * Logs a hash computation event
   */
  logHashComputation(
    module: LogEntry['module'],
    algorithm: string,
    hashOutput: string,
    success: boolean = true,
    error?: Error
  ): void {
    this.captureEvent(
      'hash_computation',
      module,
      {
        algorithm,
        hash_output: this.truncateHash(hashOutput),
      },
      success,
      error
    );
  }

  /**
   * Logs a ZKP generation event
   */
  logZKPGeneration(
    module: LogEntry['module'],
    algorithm: string,
    success: boolean = true,
    parameters?: Record<string, any>,
    error?: Error
  ): void {
    this.captureEvent(
      'zkp_generation',
      module,
      {
        algorithm,
        parameters,
      },
      success,
      error
    );
  }

  /**
   * Logs an error event
   */
  logError(
    module: LogEntry['module'],
    error: Error,
    stackTrace?: string
  ): void {
    this.captureEvent(
      'error',
      module,
      {
        stack_trace: stackTrace || error.stack,
      },
      false,
      error
    );
  }

  /**
   * Gets all logs from the store
   */
  getLogs(): LogEntry[] {
    return useAppStore.getState().logs;
  }

  /**
   * Clears all logs from the store
   */
  clearLogs(): void {
    useAppStore.getState().clearLogs();
  }

  /**
   * Filters logs by operation and/or module
   */
  filterLogs(operation?: string, module?: string): LogEntry[] {
    const logs = this.getLogs();
    return logs.filter((log) => {
      if (operation && log.operation !== operation) {return false;}
      if (module && log.module !== module) {return false;}
      return true;
    });
  }

  /**
   * Sanitizes log details to obfuscate sensitive data
   */
  private sanitizeLogDetails(details: LogDetails): LogDetails {
    const sanitized = {...details};

    // Obfuscate sensitive parameters
    if (sanitized.parameters) {
      const params = {...sanitized.parameters};

      // Obfuscate CPF
      if (params.cpf) {
        params.cpf = this.obfuscateCPF(params.cpf);
      }

      // Obfuscate nome_completo
      if (params.nome_completo) {
        params.nome_completo = this.obfuscateName(params.nome_completo);
      }

      sanitized.parameters = params;
    }

    return sanitized;
  }

  /**
   * Truncates hash output for readability
   */
  private truncateHash(hash: string, length: number = 16): string {
    if (hash.length <= length) {return hash;}
    return `${hash.substring(0, length)}...`;
  }

  /**
   * Obfuscates CPF (shows only last 4 digits)
   */
  private obfuscateCPF(cpf: string): string {
    if (cpf.length < 4) {return '***';}
    return `***${cpf.slice(-4)}`;
  }

  /**
   * Obfuscates name (shows only first name)
   */
  private obfuscateName(name: string): string {
    const parts = name.split(' ');
    if (parts.length === 0) {return '***';}
    return `${parts[0]} ***`;
  }
}

export { LogService };

// Export singleton instance
const logServiceInstance = new LogService();
export default logServiceInstance;
