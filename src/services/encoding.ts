/**
 * Encoding & canonicalization helpers shared by services.
 *
 * These exist because:
 *  - React Native (Hermes) does not provide Node's `Buffer` global.
 *  - `JSON.stringify` is NOT canonical (engine-dependent key order /
 *    whitespace / Unicode escaping). Cryptographic operations that hash
 *    or sign JSON must use a canonical form to avoid signature-forgery
 *    and replay risks (RFC 8785 / JCS subset).
 */

const BASE64URL_CHARS =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

/**
 * Encode raw bytes as base64url WITHOUT padding (RFC 4648 §5).
 * Pure JS; safe in Hermes / React Native.
 */
export function bytesToBase64Url(bytes: Uint8Array): string {
  let out = '';
  let i = 0;
  for (; i + 3 <= bytes.length; i += 3) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
    out +=
      BASE64URL_CHARS[(n >> 18) & 0x3f] +
      BASE64URL_CHARS[(n >> 12) & 0x3f] +
      BASE64URL_CHARS[(n >> 6) & 0x3f] +
      BASE64URL_CHARS[n & 0x3f];
  }
  const rem = bytes.length - i;
  if (rem === 1) {
    const n = bytes[i] << 16;
    out += BASE64URL_CHARS[(n >> 18) & 0x3f] + BASE64URL_CHARS[(n >> 12) & 0x3f];
  } else if (rem === 2) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8);
    out +=
      BASE64URL_CHARS[(n >> 18) & 0x3f] +
      BASE64URL_CHARS[(n >> 12) & 0x3f] +
      BASE64URL_CHARS[(n >> 6) & 0x3f];
  }
  return out;
}

/**
 * Decode a base64url string (with or without padding) back to bytes.
 */
export function base64UrlToBytes(input: string): Uint8Array {
  const s = input.replace(/-/g, '+').replace(/_/g, '/');
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
  const bin =
    typeof globalThis.atob === 'function'
      ? globalThis.atob(s + pad)
      : decodePolyfill(s + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    out[i] = bin.charCodeAt(i);
  }
  return out;
}

function decodePolyfill(s: string): string {
  // Minimal base64 decode for environments without atob.
  const lookup = new Int8Array(128).fill(-1);
  for (let i = 0; i < 64; i++) {
    lookup['ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'.charCodeAt(i)] = i;
  }
  let out = '';
  for (let i = 0; i < s.length; i += 4) {
    const a = lookup[s.charCodeAt(i)];
    const b = lookup[s.charCodeAt(i + 1)];
    const c = s[i + 2] === '=' ? -1 : lookup[s.charCodeAt(i + 2)];
    const d = s[i + 3] === '=' ? -1 : lookup[s.charCodeAt(i + 3)];
    out += String.fromCharCode((a << 2) | (b >> 4));
    if (c !== -1) {
      out += String.fromCharCode(((b & 15) << 4) | (c >> 2));
    }
    if (d !== -1) {
      out += String.fromCharCode(((c & 3) << 6) | d);
    }
  }
  return out;
}

/** UTF-8 encode a string to bytes. */
export function utf8ToBytes(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

/** Encode a UTF-8 string as base64url. */
export function stringToBase64Url(s: string): string {
  return bytesToBase64Url(utf8ToBytes(s));
}

/**
 * Deterministic, canonical JSON serializer (RFC 8785 / JCS subset).
 *
 * Guarantees:
 *  - Object keys sorted lexicographically (UTF-16 code-unit order).
 *  - No whitespace.
 *  - `undefined` properties are omitted (matches JSON.stringify).
 *  - `null`, booleans, finite numbers, strings emitted verbatim.
 *  - Throws on cycles, functions, symbols, BigInt, non-finite numbers.
 *
 * Use this — never `JSON.stringify` — when the output will be hashed,
 * signed, or compared across processes/devices.
 */
export function canonicalize(value: unknown): string {
  return canonicalizeInner(value, new WeakSet());
}

function canonicalizeInner(value: unknown, seen: WeakSet<object>): string {
  if (value === null) {
    return 'null';
  }
  const t = typeof value;
  if (t === 'string') {
    return JSON.stringify(value);
  }
  if (t === 'boolean') {
    return value ? 'true' : 'false';
  }
  if (t === 'number') {
    if (!Number.isFinite(value as number)) {
      throw new TypeError('canonicalize: non-finite number');
    }
    return JSON.stringify(value);
  }
  if (t === 'bigint') {
    throw new TypeError('canonicalize: BigInt not supported');
  }
  if (t === 'function' || t === 'symbol' || t === 'undefined') {
    throw new TypeError(`canonicalize: unsupported type ${t}`);
  }
  if (Array.isArray(value)) {
    if (seen.has(value)) {
      throw new TypeError('canonicalize: cycle detected');
    }
    seen.add(value);
    const parts = value.map(v => canonicalizeInner(v, seen));
    seen.delete(value);
    return '[' + parts.join(',') + ']';
  }
  // Plain object
  const obj = value as Record<string, unknown>;
  if (seen.has(obj)) {
    throw new TypeError('canonicalize: cycle detected');
  }
  seen.add(obj);
  const keys = Object.keys(obj)
    .filter(k => obj[k] !== undefined)
    .sort();
  const parts = keys.map(
    k => JSON.stringify(k) + ':' + canonicalizeInner(obj[k], seen),
  );
  seen.delete(obj);
  return '{' + parts.join(',') + '}';
}

/**
 * Canonical hash input for an (attribute, value) pair.
 * Uses JSON-array encoding so that values containing the separator
 * character cannot collide with another (attribute, value) pair.
 *
 * Example:
 *   canonicalAttributeHashInput('foo', 'bar:baz')   // ["foo","bar:baz"]
 *   canonicalAttributeHashInput('foo:bar', 'baz')   // ["foo:bar","baz"]
 *   are guaranteed to differ.
 */
export function canonicalAttributeHashInput(
  attribute: string,
  value: unknown,
): string {
  return canonicalize([attribute, value]);
}
