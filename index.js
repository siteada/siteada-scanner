const express = require("express");
const cors = require("cors");

const { runAxeScan } = require("./scanner");

const app = express();

// Basic settings
app.use(cors());
app.use(express.json({ limit: "1mb" }));

// Health check (lets us confirm Render is running)
app.get("/", (req, res) => {
  res.status(200).json({ ok: true, service: "siteada-scanner" });
});

// Main scan endpoint
app.post("/scan", async (req, res) => {
  try {
    // Simple API key protection
    const expected = process.env.SITEADA_SECRET;
    const provided = req.header("x-siteada-key");

    if (expected && provided !== expected) {
      return res.status(401).json({ ok: false, error: "Unauthorized" });
    }

    const { url } = req.body || {};
    if (!url || typeof url !== "string") {
      return res.status(400).json({ ok: false, error: "Missing url" });
    }

    const result = await runAxeScan(url);

    return res.status(200).json({ ok: true, ...result });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: "Scan failed",
      details: err?.message || String(err),
    });
  }
});

// Render provides PORT. Locally we default to 3000.
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`siteada-scanner listening on ${PORT}`);
});
