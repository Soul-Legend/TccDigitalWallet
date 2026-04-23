export type TestCategory =
  | 'identity'
  | 'credential'
  | 'presentation'
  | 'verification'
  | 'crypto'
  | 'zkp'
  | 'trust-chain'
  | 'integration';

export type TestStatus = 'pending' | 'running' | 'passed' | 'failed' | 'skipped';

export interface RuntimeTestCase {
  id: string;
  name: string;
  category: TestCategory;
  run: () => Promise<void>;
}

export interface RuntimeTestResult {
  id: string;
  name: string;
  category: TestCategory;
  status: TestStatus;
  durationMs: number;
  error?: string;
  stackTrace?: string;
  details?: Record<string, unknown>;
}

export interface RuntimeTestSuiteResult {
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  durationMs: number;
  startedAt: string;
  deviceInfo: DeviceInfo;
  results: RuntimeTestResult[];
}

export interface DeviceInfo {
  os: string;
  version: string | number;
  isDev: boolean;
}

export type TestProgressCallback = (
  completed: number,
  total: number,
  current: RuntimeTestResult,
) => void;
