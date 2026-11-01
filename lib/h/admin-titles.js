const { api, bodyOf } = require("../http");
const { sql } = require("../db");
const { requireAdmin } = require("../auth");

var TIER_COLOR = { common: "#aca696", rare: "#4fb0c6", epic: "#e8b23d" };

module.exports = api(async (req, res) => {
  var admin = await requireAdmin(req, res);
  if (!admin) return;
  var db = sql();

  if (req.method === "GET") {
    var rows = await db`
      SELECT t.id, t.text, t.tier, t.color, t.is_active,
        (SELECT COUNT(*)::int FROM user_titles ut WHERE ut.title_id = t.id) AS owners
      FROM titles t ORDER BY t.tier, t.text
    `;
    return res.status(200).json({ titles: rows });
  }

  var b = bodyOf(req);
  var text = typeof b.text === "string" ? b.text.replace(/[\u0000-\u001f]/g, " ").trim().slice(0, 60) : "";
  var tier = b.tier;
  if (text.length < 2) return res.status(400).json({ error: "Teks title minimal 2 karakter." });
  if (["common", "rare", "epic"].indexOf(tier) === -1) return res.status(400).json({ error: "tier harus common/rare/epic." });
  var dupe = await db`SELECT 1 FROM titles WHERE lower(text) = lower(${text})`;
  if (dupe.length) return res.status(409).json({ error: "Title dengan teks itu sudah ada." });
  var color = typeof b.color === "string" && /^#[0-9a-fA-F]{6}$/.test(b.color) ? b.color : TIER_COLOR[tier];

  var inserted = await db`
    INSERT INTO titles (text, tier, color) VALUES (${text}, ${tier}, ${color}) RETURNING id, text, tier, color, is_active
  `;
  await db`INSERT INTO admin_actions (admin_user_id, action, detail) VALUES (${admin.id}, 'title-create', ${JSON.stringify({ id: inserted[0].id, text: text })})`;
  res.status(200).json({ title: inserted[0] });
}, { methods: ["GET", "POST"] });
