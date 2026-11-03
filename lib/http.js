// Pembungkus semua endpoint API: metode HTTP, cek asal request (CSRF),
// header aman, dan error handling seragam (selalu JSON, tidak membocorkan detail).

var buckets = new Map();

// Rate-limit sederhana per instance serverless (best-effort, bukan pengganti WAF).
function rateLimit(key, max, windowMs) {
  var now = Date.now();
  var arr = (buckets.get(key) || []).filter(function (t) { return now - t < windowMs; });
  if (arr.length >= max) { buckets.set(key, arr); return false; }
  arr.push(now);
  buckets.set(key, arr);
  if (buckets.size > 5000) {
    buckets.forEach(function (v, k) { if (!v.length || now - v[v.length - 1] > windowMs) buckets.delete(k); });
  }
  return true;
}

function clientIp(req) {
  var xf = String((req.headers && req.headers["x-forwarded-for"]) || "");
  return xf.split(",")[0].trim() || "unknown";
}

function hostOf(req) {
  return String((req.headers && (req.headers["x-forwarded-host"] || req.headers.host)) || "").split(",")[0].trim().toLowerCase();
}

// Tolak request tulis dari situs lain. Cookie sudah SameSite=Lax; ini lapis kedua.
function sameOrigin(req) {
  var origin = req.headers && req.headers.origin;
  if (origin) {
    try { return new URL(origin).host.toLowerCase() === hostOf(req); } catch (e) { return false; }
  }
  var site = req.headers && req.headers["sec-fetch-site"];
  if (site && site !== "same-origin" && site !== "same-site" && site !== "none") return false;
  return true;
}

function bodyOf(req) {
  var b = req.body;
  if (typeof b === "string") { try { b = JSON.parse(b); } catch (e) { b = null; } }
  return b && typeof b === "object" && !Array.isArray(b) ? b : {};
}

/**
 * api(handler, { methods: ["GET","POST"], cache: "public, s-maxage=30" })
 * Default: hanya GET, tanpa cache.
 */
function api(handler, opts) {
  opts = opts || {};
  var methods = opts.methods || ["GET"];
  return async function (req, res) {
    res.setHeader("Cache-Control", opts.cache && req.method === "GET" ? opts.cache : "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    if (methods.indexOf(req.method) === -1) {
      res.setHeader("Allow", methods.join(", "));
      return res.status(405).json({ error: "Method not allowed" });
    }
    if (req.method !== "GET" && req.method !== "HEAD" && !sameOrigin(req)) {
      return res.status(403).json({ error: "Permintaan ditolak (asal tidak cocok)." });
    }
    try {
      await handler(req, res);
    } catch (e) {
      console.error("[api error]", req.method, req.url, e && e.stack || e);
      if (res.headersSent) return;
      var msg = String(e && e.message || "");
      if (e && (e.code === "42P01" || e.code === "42703")) return res.status(503).json({ error: "Database belum diperbarui. Jalankan ulang schema.sql terbaru di Neon SQL Editor." });
      if (/belum di-set/.test(msg)) return res.status(503).json({ error: "Server belum dikonfigurasi lengkap. Hubungi admin." });
      res.status(500).json({ error: "Terjadi kesalahan di server. Coba lagi sebentar." });
    }
  };
}

module.exports = { api, bodyOf, rateLimit, clientIp, sameOrigin };
