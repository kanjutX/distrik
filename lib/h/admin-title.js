const { api, bodyOf } = require("../http");
const { sql } = require("../db");
const { requireAdmin } = require("../auth");

module.exports = api(async (req, res) => {
  var admin = await requireAdmin(req, res);
  if (!admin) return;
  var id = Number(req.query.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: "id tidak valid." });
  var db = sql();

  if (req.method === "DELETE") {
    var del = await db`DELETE FROM titles WHERE id = ${id} RETURNING id`;
    if (!del.length) return res.status(404).json({ error: "Title tidak ditemukan." });
    await db`INSERT INTO admin_actions (admin_user_id, action, detail) VALUES (${admin.id}, 'title-delete', ${JSON.stringify({ id: id })})`;
    return res.status(200).json({ ok: true });
  }

  var b = bodyOf(req);
  var text = typeof b.text === "string" && b.text.trim().length >= 2 ? b.text.replace(/[\u0000-\u001f]/g, " ").trim().slice(0, 60) : null;
  var tier = ["common", "rare", "epic"].indexOf(b.tier) !== -1 ? b.tier : null;
  var color = typeof b.color === "string" && /^#[0-9a-fA-F]{6}$/.test(b.color) ? b.color : null;
  var isActive = typeof b.isActive === "boolean" ? b.isActive : null;
  if (text === null && tier === null && color === null && isActive === null) return res.status(400).json({ error: "Tidak ada perubahan valid." });

  var upd = await db`
    UPDATE titles SET
      text = COALESCE(${text}::text, text),
      tier = COALESCE(${tier}::text, tier),
      color = COALESCE(${color}::text, color),
      is_active = COALESCE(${isActive}::boolean, is_active)
    WHERE id = ${id} RETURNING id
  `;
  if (!upd.length) return res.status(404).json({ error: "Title tidak ditemukan." });
  await db`INSERT INTO admin_actions (admin_user_id, action, detail) VALUES (${admin.id}, 'title-update', ${JSON.stringify({ id: id })})`;
  res.status(200).json({ ok: true });
}, { methods: ["PATCH", "DELETE"] });
