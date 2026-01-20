const express = require("express");
const fetch = require("node-fetch");

const router = express.Router();

/**
 * Health check
 */
router.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

/**
 * Freshservice - Tickets (PROXY)
 * GET /api/tickets
 */
router.get("/tickets", async (req, res, next) => {
  try {
    const domain = process.env.FRESHSERVICE_DOMAIN;
    const apiKey = process.env.FRESHSERVICE_API_KEY;

    if (!domain || !apiKey) {
      return res.status(500).json({
        error: "Missing env vars: FRESHSERVICE_DOMAIN or FRESHSERVICE_API_KEY",
      });
    }

    const url = new URL(`https://${domain}/api/v2/tickets`);

    // Repassa filtros/querystring do frontend
    Object.entries(req.query || {}).forEach(([key, value]) => {
      url.searchParams.set(key, String(value));
    });

    const auth = Buffer.from(`${apiKey}:X`).toString("base64");

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
    });

    const body = await response.text();

    res.status(response.status).send(body);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
