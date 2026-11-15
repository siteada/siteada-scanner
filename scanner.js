// scanner.js

const puppeteer = require("puppeteer");
const axeCore = require("axe-core");
console.log("axe-core source length:", axeCore.source?.length);

function withTimeout(promise, timeoutMs, message) {
  let timer;

  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(message));
    }, timeoutMs);
  });

  return Promise.race([promise, timeout]).finally(() => {
    clearTimeout(timer);
  });
}

async function closeBrowserSafely(browser) {
  if (!browser) return;

  try {
    await withTimeout(
      browser.close(),
      5000,
      "Browser close timed out"
    );
  } catch (error) {
    console.error("Browser did not close normally:", error.message);

    // Force-kill Chromium if normal shutdown gets stuck.
    try {
      const process = browser.process();

      if (process) {
        process.kill("SIGKILL");
      }
    } catch (killError) {
      console.error("Unable to force-kill browser:", killError.message);
    }
  }
}

async function performScan(url) {
  let browser;

  try {
    console.log(`Starting accessibility scan: ${url}`);

    browser = await withTimeout(
      puppeteer.launch({
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-gpu"
        ]
      }),
      30000,
      "Browser launch timed out"
    );

    const page = await browser.newPage();

    page.setDefaultNavigationTimeout(35000);
    page.setDefaultTimeout(30000);

    // Reduce memory and bandwidth usage.
    await page.setRequestInterception(true);

    page.on("request", request => {
      const blockedTypes = new Set([
        "image",
        "media",
        "font"
      ]);

      if (blockedTypes.has(request.resourceType())) {
        request.abort();
      } else {
        request.continue();
      }
    });

    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 35000
    });

// Initialize axe-core in the page
await withTimeout(
  page.evaluate(axeCore.source),
  15000,
  "Unable to initialize accessibility scanner"
);

// Confirm axe-core is available
const axeLoaded = await page.evaluate(() => {
  return typeof window.axe !== "undefined" &&
         typeof window.axe.run === "function";
});
    const axeDiagnostics = await page.evaluate(() => ({
  axeType: typeof window.axe,
  axeRunType: typeof window.axe?.run,
  pageUrl: window.location.href
}));

console.log("axe-core diagnostics:", JSON.stringify(axeDiagnostics));

if (!axeLoaded) {
  throw new Error("axe-core failed to initialize after addScriptTag");
}

    const results = await withTimeout(
      page.evaluate(async () => {
        return window.axe.run({
          runOnly: {
            type: "tag",
            values: ["wcag2a", "wcag2aa"]
          }
        });
      }),
      45000,
      "Accessibility analysis timed out"
    );

    const issues = results.violations.map(violation => ({
      id: violation.id,
      impact: violation.impact,
      description: violation.description,
      help: violation.help,
      helpUrl: violation.helpUrl,
      nodes: violation.nodes.length
    }));

    const counts = {
      total: issues.length,
      critical: 0,
      serious: 0,
      moderate: 0,
      minor: 0
    };

    for (const issue of issues) {
      if (issue.impact === "critical") counts.critical++;
      if (issue.impact === "serious") counts.serious++;
      if (issue.impact === "moderate") counts.moderate++;
      if (issue.impact === "minor") counts.minor++;
    }

    const penalty =
      counts.critical * 25 +
      counts.serious * 15 +
      counts.moderate * 8 +
      counts.minor * 3;

    const score = Math.max(0, 100 - penalty);

    let grade = "A";

    if (score < 90) grade = "B";
    if (score < 80) grade = "C";
    if (score < 70) grade = "D";
    if (score < 60) grade = "F";

    const status =
      counts.total === 0 ? "Compliant" : "Non-Compliant";

    console.log(
      `Scan completed: ${url}; score=${score}; grade=${grade}`
    );

    return {
      ok: true,
      url,
      timestamp: new Date().toISOString(),
      summary: {
        status,
        totalIssues: counts.total,
        criticalIssues: counts.critical,
        seriousIssues: counts.serious,
        moderateIssues: counts.moderate,
        minorIssues: counts.minor,
        score,
        grade
      },
      score,
      grade,
      counts,
      issues
    };
  } finally {
    await closeBrowserSafely(browser);
  }
}

async function runScan(inputUrl) {
  if (!inputUrl) {
    throw new Error("URL is required");
  }

  let url = inputUrl.trim();

  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = `https://${url}`;
  }

  // Protect the complete scan—not only axe.run().
  return withTimeout(
    performScan(url),
    120000,
    "Complete scan timed out"
  );
}

module.exports = { runScan };
