const { api, bodyOf } = require("../http");
const { sql } = require("../db");
const { requireUser } = require("../auth");

module.exports = api(async (req, res) => {
  var user = await requireUser(req, res);
  if (!user) return;
  var titleId = Number(bodyOf(req).titleId);
  if (!Number.isInteger(titleId) || titleId <= 0) return res.status(400).json({ error: "titleId wajib diisi." });

  var db = sql();
  var owned = await db`SELECT 1 FROM user_titles WHERE user_id = ${user.id} AND title_id = ${titleId}`;
  if (!owned.length) return res.status(403).json({ error: "Kamu belum memiliki title ini." });
  await db`UPDATE users SET active_title_id = ${titleId}, updated_at = now() WHERE id = ${user.id}`;
  res.status(200).json({ ok: true });
}, { methods: ["POST"] });
