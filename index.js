// index.js
const express = require("express");
const cors = require("cors");
const { runScan } = require("./scanner");

const app = express();

app.use(cors());
app.use(express.json());

// Health check
app.get("/health", (req, res) => {
  res.json({ ok: true });
});

// Helper to read url from either body OR query string
function getUrl(req) {
  const fromBody = req.body && typeof req.body.url === "string" ? req.body.url : "";
  const fromQuery = typeof req.query.url === "string" ? req.query.url : "";
  return (fromBody || fromQuery).trim();
}

// GET /scan?url=https://example.com
app.get("/scan", async (req, res) => {
  try {
    const url = getUrl(req);
    if (!url) return res.status(400).json({ ok: false, error: "Missing url" });

    const data = await runScan(url);
    res.json(data);
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message || "Scan failed" });
  }
});

// POST /scan  { "url": "https://example.com" }
app.post("/scan", async (req, res) => {
  try {
    const url = getUrl(req);
    if (!url) return res.status(400).json({ ok: false, error: "Missing url" });

    const data = await runScan(url);
    res.json(data);
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message || "Scan failed" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`SiteADA scanner running on port ${PORT}`);
});
