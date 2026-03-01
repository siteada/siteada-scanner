// index.js
const express = require("express");
const cors = require("cors");
const { runScan } = require("./scanner");

const app = express();

app.use(cors());

// Parse JSON normally
app.use(express.json({ limit: "1mb", type: ["application/json", "application/*+json"] }));

// Also parse text bodies (some clients send JSON as text)
app.use(express.text({ type: "*/*", limit: "1mb" }));

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

// Optional debug route (useful right now)
app.post("/debug", (req, res) => {
  res.json({
    ok: true,
    contentType: req.headers["content-type"] || null,
    bodyType: typeof req.body,
    body: req.body
  });
});

// POST /scan
// Supports:
// - JSON body: { "url": "https://example.com" }
// - Query: /scan?url=https://example.com
app.post("/scan", async (req, res) => {
  try {
    let url =
      (req.query?.url || "").toString().trim() ||
      (req.body?.url || "").toString().trim() ||
      (req.body?.URL || "").toString().trim();

    // If body came in as a string, try parsing it as JSON
    if (!url && typeof req.body === "string" && req.body.trim().startsWith("{")) {
      try {
        const parsed = JSON.parse(req.body);
        url = (parsed.url || parsed.URL || "").toString().trim();
      } catch (_) {
        // ignore JSON parse errors
      }
    }

    if (!url) {
      return res.status(400).json({ ok: false, error: "Missing url" });
    }

    const data = await runScan(url);
    res.json(data);
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err?.message || "Scan failed"
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`SiteADA scanner running on port ${PORT}`);
});
