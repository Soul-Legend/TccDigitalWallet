import type {RuntimeTestSuiteResult, RuntimeTestResult} from '../types/runtime-tests';

function statusIcon(r: RuntimeTestResult): string {
  return r.status === 'passed' ? '✓' : r.status === 'failed' ? '✗' : '○';
}

function pad(s: string, len: number): string {
  return s.length >= len ? s : s + ' '.repeat(len - s.length);
}

export function generateMarkdownReport(suite: RuntimeTestSuiteResult): string {
  const lines: string[] = [];
  const {deviceInfo, results} = suite;

  lines.push('# Runtime Test Report');
  lines.push('');
  lines.push(`**Date:** ${suite.startedAt}`);
  lines.push(
    `**Device:** ${deviceInfo.os} ${deviceInfo.version}, __DEV__=${deviceInfo.isDev}`,
  );
  lines.push(`**Duration:** ${(suite.durationMs / 1000).toFixed(1)}s`);
  lines.push('');

  // Summary
  const pct =
    suite.totalTests > 0
      ? ((suite.passed / suite.totalTests) * 100).toFixed(0)
      : '0';
  lines.push('## Summary');
  lines.push('');
  lines.push(
    `✓ **${suite.passed}** passed | ✗ **${suite.failed}** failed | **${suite.totalTests}** total | ${pct}%`,
  );
  lines.push('');

  // Failed tests detail
  const failed = results.filter(r => r.status === 'failed');
  if (failed.length > 0) {
    lines.push('## Failed Tests');
    lines.push('');
    for (const f of failed) {
      lines.push(`### [${f.category}] ${f.name}`);
      lines.push('');
      lines.push(`**Error:** ${f.error ?? 'Unknown error'}`);
      lines.push(`**Duration:** ${f.durationMs}ms`);
      if (f.stackTrace) {
        lines.push('');
        lines.push('```');
        lines.push(f.stackTrace);
        lines.push('```');
      }
      lines.push('');
    }
  }

  // Full results table
  lines.push('## All Results');
  lines.push('');
  lines.push('| # | Status | Category | Test | Duration |');
  lines.push('|---|--------|----------|------|----------|');
  results.forEach((r, i) => {
    lines.push(
      `| ${i + 1} | ${statusIcon(r)} ${pad(r.status, 6)} | ${pad(r.category, 12)} | ${r.name} | ${r.durationMs}ms |`,
    );
  });
  lines.push('');

  return lines.join('\n');
}

export function generateJSONReport(suite: RuntimeTestSuiteResult): string {
  return JSON.stringify(suite, null, 2);
}
