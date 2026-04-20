/**
 * Shared constants and enums used across the application.
 *
 * Centralises magic strings that previously appeared as inline literals
 * in multiple files.
 */

// ── Navigation / Module identifiers ──────────────────────────────────

/** Modules available for LogEntry (service-layer). */
export const Module = {
  ISSUER: 'emissor',
  HOLDER: 'titular',
  VERIFIER: 'verificador',
} as const;

/** Extended set that includes UI-only screens. */
export const AppModule = {
  ...Module,
  LOGS: 'logs',
  HOME: 'home',
} as const;

export type AppModuleType = (typeof AppModule)[keyof typeof AppModule];

// ── Credential formats ───────────────────────────────────────────────

export const CredentialFormat = {
  SD_JWT: 'sd-jwt',
  ANONCREDS: 'anoncreds',
} as const;

export type CredentialFormatType =
  (typeof CredentialFormat)[keyof typeof CredentialFormat];

// ── Verification step names ──────────────────────────────────────────

export const VerificationStepName = {
  SIGNATURE: 'SignatureVerification',
  TRUST_CHAIN: 'TrustChainVerification',
  STRUCTURAL_INTEGRITY: 'StructuralIntegrity',
  CHALLENGE: 'ChallengeVerification',
  PREDICATE: 'PredicateVerification',
  NULLIFIER: 'NullifierVerification',
  RESOURCE_ACCESS: 'ResourceAccessVerification',
} as const;

// ── Storage keys ─────────────────────────────────────────────────────

export const StorageKey = {
  HOLDER_PRIVATE_KEY: 'holder_private_key',
  HOLDER_PUBLIC_KEY: 'holder_public_key',
  HOLDER_DID: 'holder_did',
  ISSUER_PRIVATE_KEY: 'issuer_private_key',
  ISSUER_PUBLIC_KEY: 'issuer_public_key',
  ISSUER_SIGNING_DID: 'issuer_signing_did',
  ISSUER_DID: 'issuer_did',
  HOLDER_CREDENTIALS: 'holder_credentials',
} as const;

/** Prefix applied to holder-specific keys. */
export const HOLDER_KEY_PREFIX = 'holder_';
/** Prefix applied to issuer-specific keys. */
export const ISSUER_KEY_PREFIX = 'issuer_';
/** Prefix for nullifier storage keys (followed by electionId). */
export const NULLIFIER_KEY_PREFIX = 'nullifiers_';

/**
 * Default credential validity in seconds.
 * One year matches the academic-year cadence used by UFSC and keeps the
 * issued JWT short-lived enough for the demo.
 */
export const CREDENTIAL_DEFAULT_TTL_SECONDS = 365 * 24 * 60 * 60;
