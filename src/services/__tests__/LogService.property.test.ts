/**
 * Property-Based Tests for LogService
 *
 * Feature: carteira-identidade-academica
 * These tests validate the correctness properties of the logging system
 */

import fc from 'fast-check';
import LogService from '../LogService';
import {useAppStore} from '../../stores/useAppStore';
import {LogEntry} from '../../types';

// Clear logs before each test
beforeEach(() => {
  useAppStore.getState().clearLogs();
});

describe('LogService Property-Based Tests', () => {
  /**
   * Feature: carteira-identidade-academica, Property 6: Cryptographic Event Logging
   * Validates: Requirements 2.10, 4.13, 5.11, 9.1, 9.2
   *
   * For any cryptographic operation (key generation, credential issuance,
   * presentation creation, verification), a log entry SHALL be created with
   * timestamp, operation type, and technical details.
   */
  describe('Property 6: Cryptographic Event Logging', () => {
    it('should create log entry for any key generation event', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('emissor', 'titular', 'verificador'),
          fc.constantFrom('EdDSA', 'ECDSA', 'RSA'),
          fc.integer({min: 256, max: 4096}),
          fc.constantFrom('did:key', 'did:peer', 'did:web'),
          (module, algorithm, keySize, didMethod) => {
            // Clear logs before test
            useAppStore.getState().clearLogs();

            // Log key generation
            LogService.logKeyGeneration(
              module as 'emissor' | 'titular' | 'verificador',
              algorithm,
              keySize,
              didMethod,
              true
            );

            // Get logs
            const logs = LogService.getLogs();

            // Verify log entry was created
            expect(logs.length).toBe(1);

            const log = logs[0];

            // Verify log has required fields
            expect(log.id).toBeDefined();
            expect(log.timestamp).toBeInstanceOf(Date);
            expect(log.operation).toBe('key_generation');
            expect(log.module).toBe(module);
            expect(log.success).toBe(true);

            // Verify technical details
            expect(log.details.algorithm).toBe(algorithm);
            expect(log.details.key_size).toBe(keySize);
            expect(log.details.did_method).toBe(didMethod);

            return true;
          }
        ),
        {numRuns: 5, verbose: 0}
      );
    });

    it('should create log entry for any credential issuance event', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('JsonWebSignature2020', 'AnonCredsProof'),
          fc.boolean(),
          fc.record({
            issuer: fc.constantFrom('did:web:ufsc.br', 'did:web:example.edu'),
            credentialType: fc.constantFrom('AcademicIDCredential', 'StudentCredential'),
          }),
          (algorithm, success, parameters) => {
            // Clear logs before test
            useAppStore.getState().clearLogs();

            // Log credential issuance
            LogService.logCredentialIssuance(algorithm, success, parameters);

            // Get logs
            const logs = LogService.getLogs();

            // Verify log entry was created
            expect(logs.length).toBe(1);

            const log = logs[0];

            // Verify log has required fields
            expect(log.id).toBeDefined();
            expect(log.timestamp).toBeInstanceOf(Date);
            expect(log.operation).toBe('credential_issuance');
            expect(log.module).toBe('emissor');
            expect(log.success).toBe(success);

            // Verify technical details
            expect(log.details.algorithm).toBe(algorithm);
            expect(log.details.parameters).toEqual(parameters);

            return true;
          }
        ),
        {numRuns: 5, verbose: 0}
      );
    });

    it('should create log entry for any presentation creation event', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('SD-JWT', 'AnonCreds'),
          fc.boolean(),
          fc.record({
            disclosed_attributes: fc.array(fc.string(), {maxLength: 5}),
            predicates: fc.array(fc.string(), {maxLength: 3}),
          }),
          (algorithm, success, parameters) => {
            // Clear logs before test
            useAppStore.getState().clearLogs();

            // Log presentation creation
            LogService.logPresentationCreation(algorithm, success, parameters);

            // Get logs
            const logs = LogService.getLogs();

            // Verify log entry was created
            expect(logs.length).toBe(1);

            const log = logs[0];

            // Verify log has required fields
            expect(log.id).toBeDefined();
            expect(log.timestamp).toBeInstanceOf(Date);
            expect(log.operation).toBe('presentation_creation');
            expect(log.module).toBe('titular');
            expect(log.success).toBe(success);

            // Verify technical details
            expect(log.details.algorithm).toBe(algorithm);
            expect(log.details.parameters).toEqual(parameters);

            return true;
          }
        ),
        {numRuns: 5, verbose: 0}
      );
    });

    it('should create log entry for any verification event', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('JsonWebSignature2020', 'AnonCredsProof'),
          fc.boolean(),
          fc.boolean(),
          fc.record({
            issuer: fc.constantFrom('did:web:ufsc.br', 'did:web:example.edu'),
            challenge: fc.string({minLength: 16, maxLength: 24}),
          }),
          (algorithm, verificationResult, success, parameters) => {
            // Clear logs before test
            useAppStore.getState().clearLogs();

            // Log verification
            LogService.logVerification(
              algorithm,
              verificationResult,
              success,
              parameters
            );

            // Get logs
            const logs = LogService.getLogs();

            // Verify log entry was created
            expect(logs.length).toBe(1);

            const log = logs[0];

            // Verify log has required fields
            expect(log.id).toBeDefined();
            expect(log.timestamp).toBeInstanceOf(Date);
            expect(log.operation).toBe('verification');
            expect(log.module).toBe('verificador');
            expect(log.success).toBe(success);

            // Verify technical details
            expect(log.details.algorithm).toBe(algorithm);
            expect(log.details.verification_result).toBe(verificationResult);
            expect(log.details.parameters).toEqual(parameters);

            return true;
          }
        ),
        {numRuns: 5, verbose: 0}
      );
    });

    it('should create log entry for any hash computation event', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('emissor', 'titular', 'verificador'),
          fc.constantFrom('SHA-256', 'SHA-512', 'BLAKE2b'),
          fc.string({minLength: 8, maxLength: 16}).map(s =>
            s.split('').map(c => c.charCodeAt(0).toString(16)).join('').substring(0, 64)
          ),
          fc.boolean(),
          (module, algorithm, hashOutput, success) => {
            // Clear logs before test
            useAppStore.getState().clearLogs();

            // Log hash computation
            LogService.logHashComputation(
              module as 'emissor' | 'titular' | 'verificador',
              algorithm,
              hashOutput,
              success
            );

            // Get logs
            const logs = LogService.getLogs();

            // Verify log entry was created
            expect(logs.length).toBe(1);

            const log = logs[0];

            // Verify log has required fields
            expect(log.id).toBeDefined();
            expect(log.timestamp).toBeInstanceOf(Date);
            expect(log.operation).toBe('hash_computation');
            expect(log.module).toBe(module);
            expect(log.success).toBe(success);

            // Verify technical details
            expect(log.details.algorithm).toBe(algorithm);
            expect(log.details.hash_output).toBeDefined();

            // Verify hash is truncated for readability
            if (hashOutput.length > 16) {
              expect(log.details.hash_output?.length).toBeLessThanOrEqual(20); // 16 + "..."
            }

            return true;
          }
        ),
        {numRuns: 5, verbose: 0}
      );
    });

    it('should create log entry for any ZKP generation event', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('emissor', 'titular', 'verificador'),
          fc.constantFrom('AnonCreds', 'BBS+', 'Groth16'),
          fc.boolean(),
          fc.record({
            predicate_type: fc.constantFrom('>=', '<=', '=='),
            attribute: fc.string(),
          }),
          (module, algorithm, success, parameters) => {
            // Clear logs before test
            useAppStore.getState().clearLogs();

            // Log ZKP generation
            LogService.logZKPGeneration(
              module as 'emissor' | 'titular' | 'verificador',
              algorithm,
              success,
              parameters
            );

            // Get logs
            const logs = LogService.getLogs();

            // Verify log entry was created
            expect(logs.length).toBe(1);

            const log = logs[0];

            // Verify log has required fields
            expect(log.id).toBeDefined();
            expect(log.timestamp).toBeInstanceOf(Date);
            expect(log.operation).toBe('zkp_generation');
            expect(log.module).toBe(module);
            expect(log.success).toBe(success);

            // Verify technical details
            expect(log.details.algorithm).toBe(algorithm);
            expect(log.details.parameters).toEqual(parameters);

            return true;
          }
        ),
        {numRuns: 5, verbose: 0}
      );
    });

    it('should create log entry for any error event', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('emissor', 'titular', 'verificador'),
          fc.string({minLength: 10, maxLength: 50}),
          fc.string({minLength: 20, maxLength: 100}),
          (module, errorMessage, stackTrace) => {
            // Clear logs before test
            useAppStore.getState().clearLogs();

            // Create error
            const error = new Error(errorMessage);

            // Log error
            LogService.logError(
              module as 'emissor' | 'titular' | 'verificador',
              error,
              stackTrace
            );

            // Get logs
            const logs = LogService.getLogs();

            // Verify log entry was created
            expect(logs.length).toBe(1);

            const log = logs[0];

            // Verify log has required fields
            expect(log.id).toBeDefined();
            expect(log.timestamp).toBeInstanceOf(Date);
            expect(log.operation).toBe('error');
            expect(log.module).toBe(module);
            expect(log.success).toBe(false);
            expect(log.error).toBeDefined();

            // Verify technical details
            expect(log.details.stack_trace).toBe(stackTrace);

            return true;
          }
        ),
        {numRuns: 5, verbose: 0}
      );
    });
  });

  /**
   * Feature: carteira-identidade-academica, Property 26: Log Chronological Ordering
   * Validates: Requirements 9.8
   *
   * For any sequence of log entries, the system SHALL maintain chronological
   * order based on timestamps, with newer entries appearing after older ones.
   */
  describe('Property 26: Log Chronological Ordering', () => {
    it('should maintain chronological order for any sequence of log events', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              operation: fc.constantFrom(
                'key_generation',
                'credential_issuance',
                'presentation_creation',
                'verification',
                'hash_computation',
                'zkp_generation'
              ),
              module: fc.constantFrom('emissor', 'titular', 'verificador'),
              algorithm: fc.string(),
            }),
            {minLength: 2, maxLength: 20}
          ),
          (events) => {
            // Clear logs before test
            useAppStore.getState().clearLogs();

            // Capture events with small delays to ensure different timestamps
            events.forEach((event, _index) => {
              // Add a tiny delay to ensure timestamps are different
              const startTime = Date.now();
              while (Date.now() - startTime < 1) {
                // Busy wait for 1ms
              }

              LogService.captureEvent(
                event.operation as LogEntry['operation'],
                event.module as 'emissor' | 'titular' | 'verificador',
                {algorithm: event.algorithm},
                true
              );
            });

            // Get logs
            const logs = LogService.getLogs();

            // Verify we have the correct number of logs
            expect(logs.length).toBe(events.length);

            // Verify chronological ordering
            for (let i = 1; i < logs.length; i++) {
              const prevTimestamp = logs[i - 1].timestamp.getTime();
              const currTimestamp = logs[i].timestamp.getTime();

              // Current timestamp should be >= previous timestamp
              expect(currTimestamp).toBeGreaterThanOrEqual(prevTimestamp);
            }

            return true;
          }
        ),
        {numRuns: 5, verbose: 0}
      );
    });

    it('should preserve insertion order when events occur rapidly', () => {
      fc.assert(
        fc.property(
          fc.integer({min: 3, max: 5}),
          (numEvents) => {
            // Clear logs before test
            useAppStore.getState().clearLogs();

            // Capture multiple events rapidly
            for (let i = 0; i < numEvents; i++) {
              LogService.captureEvent(
                'hash_computation',
                'titular',
                {algorithm: 'SHA-256', parameters: {sequence: i}},
                true
              );
            }

            // Get logs
            const logs = LogService.getLogs();

            // Verify we have the correct number of logs
            expect(logs.length).toBe(numEvents);

            // Verify sequence is preserved
            for (let i = 0; i < logs.length; i++) {
              expect(logs[i].details.parameters?.sequence).toBe(i);
            }

            // Verify timestamps are in order (or equal if rapid)
            for (let i = 1; i < logs.length; i++) {
              const prevTimestamp = logs[i - 1].timestamp.getTime();
              const currTimestamp = logs[i].timestamp.getTime();
              expect(currTimestamp).toBeGreaterThanOrEqual(prevTimestamp);
            }

            return true;
          }
        ),
        {numRuns: 5, verbose: 0}
      );
    });

    it('should maintain order across different operation types', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.constantFrom(
              'key_generation',
              'credential_issuance',
              'presentation_creation',
              'verification',
              'hash_computation',
              'zkp_generation',
              'error'
            ),
            {minLength: 3, maxLength: 10}
          ),
          (operations) => {
            // Clear logs before test
            useAppStore.getState().clearLogs();

            // Capture events in sequence
            operations.forEach((operation, index) => {
              // Add a tiny delay
              const startTime = Date.now();
              while (Date.now() - startTime < 1) {
                // Busy wait
              }

              LogService.captureEvent(
                operation as LogEntry['operation'],
                'titular',
                {parameters: {sequence: index}},
                true
              );
            });

            // Get logs
            const logs = LogService.getLogs();

            // Verify chronological ordering
            for (let i = 1; i < logs.length; i++) {
              const prevTimestamp = logs[i - 1].timestamp.getTime();
              const currTimestamp = logs[i].timestamp.getTime();
              expect(currTimestamp).toBeGreaterThanOrEqual(prevTimestamp);
            }

            // Verify sequence is preserved
            for (let i = 0; i < logs.length; i++) {
              expect(logs[i].details.parameters?.sequence).toBe(i);
            }

            return true;
          }
        ),
        {numRuns: 5, verbose: 0}
      );
    });
  });
});
