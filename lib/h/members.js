const { api } = require("../http");
const { sql } = require("../db");
const F = require("../forum");

// GET /api/members?q=&offset= — direktori warga (publik): hanya nama, foto, title aktif.
module.exports = api(async (req, res) => {
  var q = F.oneLine(typeof req.query.q === "string" ? req.query.q : "").slice(0, 40);
  var like = "%" + q.replace(/[\\%_]/g, "\\$&") + "%";
  var limit = 24;
  var offset = F.clampInt(req.query.offset, 0, 0, 100000);
  var rows = await sql()`
    SELECT u.id AS uid, u.name, u.avatar_url, u.is_admin, ti.text AS title_text, ti.tier AS title_tier
    FROM users u LEFT JOIN titles ti ON ti.id = u.active_title_id
    WHERE NOT u.is_banned
      AND (${q}::text = '' OR u.name ILIKE ${like} OR (u.roblox_public AND u.roblox_username ILIKE ${like}))
    ORDER BY u.created_at DESC, u.id DESC
    LIMIT ${limit + 1} OFFSET ${offset}
  `;
  res.status(200).json({ members: rows.slice(0, limit).map(F.author), hasMore: rows.length > limit });
}, { cache: "public, s-maxage=15, stale-while-revalidate=30" });
