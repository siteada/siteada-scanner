// scanner.js
const puppeteer = require("puppeteer");
const axeCore = require("axe-core");

async function runScan(url) {
  if (!url) {
    throw new Error("URL is required");
  }

  let browser;

  try {
    browser = await puppeteer.launch({
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });

    const page = await browser.newPage();

    await page.goto(url, {
      waitUntil: "networkidle2",
      timeout: 45000
    });

    // Inject axe-core
    await page.addScriptTag({ content: axeCore.source });

    const results = await page.evaluate(async () => {
      return await axe.run({
        runOnly: {
          type: "tag",
          values: ["wcag2a", "wcag2aa"]
        }
      });
    });

    const issues = results.violations.map(v => ({
      id: v.id,
      impact: v.impact,
      description: v.description,
      help: v.help,
      helpUrl: v.helpUrl,
      nodes: v.nodes.length
    }));
const counts = {
  total: issues.length,
  critical: 0,
  serious: 0,
  moderate: 0,
  minor: 0
};

issues.forEach(issue => {
  if (issue.impact === "critical") counts.critical++;
  if (issue.impact === "serious") counts.serious++;
  if (issue.impact === "moderate") counts.moderate++;
  if (issue.impact === "minor") counts.minor++;
});
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
    
    return {
  ok: true,
  url,
  timestamp: new Date().toISOString(),
  score,
  grade,
  counts,
  issues
};

  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

module.exports = { runScan };
