// index.js
const express = require("express");
const cors = require("cors");
const { runScan } = require("./scanner");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

// POST /scan
// Body: { "url": "https://example.com" }
app.post("/scan", async (req, res) => {
  try {
    const url = (req.body?.url || "").trim();
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
