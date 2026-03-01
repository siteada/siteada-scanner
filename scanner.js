// scanner.js
const pa11y = require("pa11y");

/**
 * Runs an accessibility scan on a URL
 * Returns normalized structured results
 */
async function runScan(url, options = {}) {
  if (!url) {
    throw new Error("URL is required");
  }

  const timeout = options.timeout || 60000;
  const standard = options.standard || "WCAG2AA";

  const result = await pa11y(url, {
    timeout,
    standard,
    includeWarnings: true,
    includeNotices: false
  });

  const issues = (result.issues || []).map(issue => ({
    code: issue.code,
    type: issue.type, // error | warning | notice
    message: issue.message,
    context: issue.context,
    selector: issue.selector
  }));

  const counts = issues.reduce(
    (acc, issue) => {
      acc.total += 1;
      if (issue.type === "error") acc.errors += 1;
      if (issue.type === "warning") acc.warnings += 1;
      if (issue.type === "notice") acc.notices += 1;
      return acc;
    },
    { total: 0, errors: 0, warnings: 0, notices: 0 }
  );

  return {
    ok: true,
    url: result.pageUrl || url,
    title: result.documentTitle || null,
    standard,
    timestamp: new Date().toISOString(),
    counts,
    issues
  };
}

module.exports = { runScan };
