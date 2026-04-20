/**
 * Custom Jest Reporter to reduce verbose output
 * Truncates long strings and base64 data in error messages
 */

class CustomReporter {
  constructor(globalConfig, options) {
    this._globalConfig = globalConfig;
    this._options = options;
  }

  onRunComplete(contexts, results) {
    // Only show summary, not individual test details
  }

  onTestResult(test, testResult, aggregatedResult) {
    if (testResult.numFailingTests > 0) {
      testResult.testResults.forEach((result) => {
        if (result.status === 'failed') {
          result.failureMessages = result.failureMessages.map((message) => {
            // Truncate long base64-like strings
            let truncated = message.replace(/[A-Za-z0-9+/=]{100,}/g, (match) => {
              return `${match.substring(0, 20)}...[${match.length} chars]...${match.substring(match.length - 20)}`;
            });

            // Truncate long hex strings
            truncated = truncated.replace(/[0-9a-f]{100,}/gi, (match) => {
              return `${match.substring(0, 20)}...[${match.length} chars]...${match.substring(match.length - 20)}`;
            });

            // Truncate JWT tokens
            truncated = truncated.replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, (match) => {
              if (match.length > 100) {
                return `${match.substring(0, 30)}...[JWT ${match.length} chars]...${match.substring(match.length - 30)}`;
              }
              return match;
            });

            // Limit overall message length
            if (truncated.length > 2000) {
              truncated = truncated.substring(0, 1000) + '\n\n... [message truncated] ...\n\n' + truncated.substring(truncated.length - 1000);
            }

            return truncated;
          });
        }
      });
    }
  }
}

module.exports = CustomReporter;
