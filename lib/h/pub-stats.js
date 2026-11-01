const { api } = require("../http");
const { sql } = require("../db");

module.exports = api(async (req, res) => {
  var db = sql();
  var u = await db`SELECT COUNT(*)::int AS n FROM users WHERE NOT is_banned`;
  var o = await db`SELECT value FROM site_settings WHERE key = 'count_offset'`;
  var offset = o.length ? Number(o[0].value) || 0 : 0;
  res.status(200).json({ count: Math.max(0, u[0].n + offset) });
}, { cache: "public, s-maxage=20, stale-while-revalidate=60" });
