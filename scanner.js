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

    return {
      ok: true,
      url,
      timestamp: new Date().toISOString(),
      counts: {
        total: issues.length
      },
      issues
    };

  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

module.exports = { runScan };
