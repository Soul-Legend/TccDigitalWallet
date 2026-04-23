import {canonicalize} from '../encoding';
import {evaluatePredicate, isDateAttribute} from '../PresentationHelpers';
import {
  CryptoError,
  ValidationError,
  StorageError,
  ErrorHandler,
} from '../ErrorHandler';
import type {RuntimeTestCase} from '../../types/runtime-tests';
import {
  assert,
  assertEqual,
  assertThrows,
  assertDefined,
  assertMatch,
} from './assertions';

/**
 * P3 — Edge-case and defensive tests for encoding, predicates, and error handling.
 */
const edgeCaseTests: RuntimeTestCase[] = [
  // ── canonicalize() rejection cases ────────────────────────────
  {
    id: 'canonicalize-cycle-detection',
    name: 'canonicalize detects circular references',
    category: 'crypto',
    run: async () => {
      const obj: any = {a: 1};
      obj.self = obj;
      assertThrows(
        () => canonicalize(obj),
        'Cycle should throw TypeError',
      );
    },
  },
  {
    id: 'canonicalize-rejects-bigint',
    name: 'canonicalize rejects BigInt values',
    category: 'crypto',
    run: async () => {
      assertThrows(
        () => canonicalize(42n as any),
        'BigInt should throw TypeError',
      );
    },
  },
  {
    id: 'canonicalize-rejects-non-finite',
    name: 'canonicalize rejects Infinity and NaN',
    category: 'crypto',
    run: async () => {
      assertThrows(
        () => canonicalize(Infinity),
        'Infinity should throw TypeError',
      );
      assertThrows(
        () => canonicalize(NaN),
        'NaN should throw TypeError',
      );
    },
  },
  {
    id: 'canonicalize-rejects-function',
    name: 'canonicalize rejects function values',
    category: 'crypto',
    run: async () => {
      assertThrows(
        () => canonicalize(() => {}),
        'Function should throw TypeError',
      );
    },
  },
  {
    id: 'canonicalize-rejects-symbol',
    name: 'canonicalize rejects Symbol values',
    category: 'crypto',
    run: async () => {
      assertThrows(
        () => canonicalize(Symbol('test') as any),
        'Symbol should throw TypeError',
      );
    },
  },
  {
    id: 'canonicalize-sorted-keys',
    name: 'canonicalize produces lexicographically sorted keys',
    category: 'crypto',
    run: async () => {
      const result = canonicalize({z: 1, a: 2, m: 3});
      assertEqual(result, '{"a":2,"m":3,"z":1}', 'keys sorted');
    },
  },
  {
    id: 'canonicalize-nested-objects',
    name: 'canonicalize handles nested objects and arrays',
    category: 'crypto',
    run: async () => {
      const result = canonicalize({b: [3, 2, 1], a: {y: true, x: null}});
      assertEqual(result, '{"a":{"x":null,"y":true},"b":[3,2,1]}', 'nested canonical');
    },
  },
  {
    id: 'canonicalize-omits-undefined',
    name: 'canonicalize omits undefined properties',
    category: 'crypto',
    run: async () => {
      const result = canonicalize({a: 1, b: undefined, c: 3});
      assertEqual(result, '{"a":1,"c":3}', 'undefined omitted');
    },
  },

  // ── evaluatePredicate() operator coverage ─────────────────────
  {
    id: 'predicate-less-than',
    name: 'evaluatePredicate: < operator',
    category: 'verification',
    run: async () => {
      assert(evaluatePredicate(5, '<', 10), '5 < 10');
      assert(!evaluatePredicate(10, '<', 5), '10 < 5 is false');
      assert(!evaluatePredicate(5, '<', 5), '5 < 5 is false');
    },
  },
  {
    id: 'predicate-less-equal',
    name: 'evaluatePredicate: <= operator',
    category: 'verification',
    run: async () => {
      assert(evaluatePredicate(5, '<=', 10), '5 <= 10');
      assert(evaluatePredicate(5, '<=', 5), '5 <= 5');
      assert(!evaluatePredicate(10, '<=', 5), '10 <= 5 is false');
    },
  },
  {
    id: 'predicate-greater-than',
    name: 'evaluatePredicate: > operator',
    category: 'verification',
    run: async () => {
      assert(evaluatePredicate(10, '>', 5), '10 > 5');
      assert(!evaluatePredicate(5, '>', 10), '5 > 10 is false');
      assert(!evaluatePredicate(5, '>', 5), '5 > 5 is false');
    },
  },
  {
    id: 'predicate-not-equal',
    name: 'evaluatePredicate: != operator',
    category: 'verification',
    run: async () => {
      assert(evaluatePredicate('Ativo', '!=', 'Inativo'), 'Ativo != Inativo');
      assert(!evaluatePredicate('Ativo', '!=', 'Ativo'), 'Ativo != Ativo is false');
    },
  },
  {
    id: 'predicate-invalid-operator',
    name: 'evaluatePredicate rejects invalid operator',
    category: 'verification',
    run: async () => {
      assertThrows(
        () => evaluatePredicate(5, '**', 3),
        'Invalid operator should throw',
      );
    },
  },
  {
    id: 'predicate-date-to-age',
    name: 'evaluatePredicate converts date to age for numeric comparison',
    category: 'verification',
    run: async () => {
      const today = new Date();
      const twentyYearsAgo = new Date(today.getFullYear() - 20, today.getMonth(), today.getDate());
      const dateStr = twentyYearsAgo.toISOString().split('T')[0];

      assert(evaluatePredicate(dateStr, '>=', 18), '20yo >= 18');
      assert(!evaluatePredicate(dateStr, '>=', 25), '20yo >= 25 is false');
    },
  },
  {
    id: 'is-date-attribute',
    name: 'isDateAttribute recognizes YYYY-MM-DD format',
    category: 'verification',
    run: async () => {
      assert(isDateAttribute('2000-01-15'), 'valid date');
      assert(!isDateAttribute('01/15/2000'), 'US format not date');
      assert(!isDateAttribute(12345), 'number not date');
      assert(!isDateAttribute(null), 'null not date');
    },
  },

  // ── ErrorHandler error classes ────────────────────────────────
  {
    id: 'error-classes-crypto',
    name: 'CryptoError carries operation and details',
    category: 'integration',
    run: async () => {
      const err = new CryptoError('Test error', 'key_generation', {foo: 'bar'});
      assertEqual(err.name, 'CryptoError', 'error name');
      assertEqual(err.operation, 'key_generation', 'operation');
      assertDefined(err.details, 'details');
      assert(err instanceof Error, 'instanceof Error');
      assert(err instanceof CryptoError, 'instanceof CryptoError');
    },
  },
  {
    id: 'error-classes-validation',
    name: 'ValidationError carries field and value',
    category: 'integration',
    run: async () => {
      const err = new ValidationError('Bad field', 'cpf', '123');
      assertEqual(err.name, 'ValidationError', 'error name');
      assertEqual(err.field, 'cpf', 'field');
      assertEqual(err.value, '123', 'value');
      assert(err instanceof Error, 'instanceof Error');
    },
  },
  {
    id: 'error-classes-storage',
    name: 'StorageError carries operation type',
    category: 'integration',
    run: async () => {
      const err = new StorageError('Write failed', 'write', {key: 'test'});
      assertEqual(err.name, 'StorageError', 'error name');
      assertEqual(err.operation, 'write', 'operation');
      assert(err instanceof Error, 'instanceof Error');
    },
  },
  {
    id: 'error-handler-crypto-message',
    name: 'ErrorHandler returns Portuguese message for crypto errors',
    category: 'integration',
    run: async () => {
      const handler = new ErrorHandler();
      const msg = handler.handleCryptoError(
        new CryptoError('test', 'key_generation'),
        'titular',
      );
      assertDefined(msg, 'message');
      assert(msg.length > 0, 'non-empty message');
      assertMatch(msg, /chaves criptográficas|gerar/, 'Portuguese crypto message');
    },
  },
  {
    id: 'error-handler-validation-message',
    name: 'ErrorHandler returns Portuguese message for validation errors',
    category: 'integration',
    run: async () => {
      const handler = new ErrorHandler();
      const msg = handler.handleValidationError(
        new ValidationError('Bad CPF', 'cpf', '123'),
        'emissor',
      );
      assertDefined(msg, 'message');
      assertMatch(msg, /CPF/, 'message references CPF field');
    },
  },
  {
    id: 'error-handler-storage-message',
    name: 'ErrorHandler returns Portuguese message for storage errors',
    category: 'integration',
    run: async () => {
      const handler = new ErrorHandler();
      const msg = handler.handleStorageError(
        new StorageError('Delete failed', 'delete'),
        'titular',
      );
      assertDefined(msg, 'message');
      assertMatch(msg, /excluir|Falha/, 'Portuguese storage delete message');
    },
  },
  {
    id: 'error-handler-generic-message',
    name: 'ErrorHandler returns generic Portuguese message',
    category: 'integration',
    run: async () => {
      const handler = new ErrorHandler();
      const msg = handler.handleGenericError(new Error('random'), 'verificador');
      assertDefined(msg, 'message');
      assertMatch(msg, /inesperado/, 'Portuguese generic message');
    },
  },
];

export default edgeCaseTests;
