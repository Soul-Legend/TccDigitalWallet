import {Platform} from 'react-native';
import StorageService from './StorageService';
import TrustChainService from './TrustChainService';
import {useAppStore} from '../stores/useAppStore';
import type {
  RuntimeTestCase,
  RuntimeTestResult,
  RuntimeTestSuiteResult,
  TestCategory,
  TestProgressCallback,
  DeviceInfo,
} from '../types/runtime-tests';

class RuntimeTestRunner {
  private tests: RuntimeTestCase[] = [];

  register(tests: RuntimeTestCase[]): void {
    this.tests.push(...tests);
  }

  getTests(): RuntimeTestCase[] {
    return [...this.tests];
  }

  getCategories(): TestCategory[] {
    const cats = new Set(this.tests.map(t => t.category));
    return [...cats];
  }

  async runAll(onProgress?: TestProgressCallback): Promise<RuntimeTestSuiteResult> {
    return this.execute(this.tests, onProgress);
  }

  async runByCategory(
    category: TestCategory,
    onProgress?: TestProgressCallback,
  ): Promise<RuntimeTestSuiteResult> {
    const filtered = this.tests.filter(t => t.category === category);
    return this.execute(filtered, onProgress);
  }

  private async execute(
    tests: RuntimeTestCase[],
    onProgress?: TestProgressCallback,
  ): Promise<RuntimeTestSuiteResult> {
    const startedAt = new Date().toISOString();
    const suiteStart = Date.now();
    const results: RuntimeTestResult[] = [];

    for (let i = 0; i < tests.length; i++) {
      const test = tests[i];

      // Clean state before each test
      try {
        await StorageService.clearAll();
        await TrustChainService.reset();
        useAppStore.getState().clearLogs();
      } catch {
        // Ignore cleanup errors
      }

      const result = await this.runSingle(test);
      results.push(result);

      if (onProgress) {
        onProgress(i + 1, tests.length, result);
      }
    }

    const durationMs = Date.now() - suiteStart;

    return {
      totalTests: tests.length,
      passed: results.filter(r => r.status === 'passed').length,
      failed: results.filter(r => r.status === 'failed').length,
      skipped: results.filter(r => r.status === 'skipped').length,
      durationMs,
      startedAt,
      deviceInfo: this.getDeviceInfo(),
      results,
    };
  }

  private async runSingle(test: RuntimeTestCase): Promise<RuntimeTestResult> {
    const start = Date.now();
    try {
      await test.run();
      return {
        id: test.id,
        name: test.name,
        category: test.category,
        status: 'passed',
        durationMs: Date.now() - start,
      };
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      return {
        id: test.id,
        name: test.name,
        category: test.category,
        status: 'failed',
        durationMs: Date.now() - start,
        error: error.message,
        stackTrace: error.stack,
      };
    }
  }

  private getDeviceInfo(): DeviceInfo {
    return {
      os: Platform.OS,
      version: Platform.Version,
      isDev: typeof __DEV__ !== 'undefined' && __DEV__,
    };
  }
}

export default new RuntimeTestRunner();
