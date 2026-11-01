const { api, rateLimit } = require("../http");
const { sql } = require("../db");
const { requireUser } = require("../auth");
const { getRerollWeights, pickWithFallback } = require("../titles");

module.exports = api(async (req, res) => {
  var user = await requireUser(req, res);
  if (!user) return;
  if (!rateLimit("reroll:" + user.id, 20, 60 * 1000)) return res.status(429).json({ error: "Pelan-pelan, tunggu sebentar." });

  var db = sql();
  // Kurangi jatah secara ATOMIK. Dulu: cek lalu kurangi di dua langkah terpisah, sehingga
  // klik/request paralel bisa melewati batas 30 reroll.
  var dec = await db`
    UPDATE users SET rerolls_remaining = rerolls_remaining - 1, updated_at = now()
    WHERE id = ${user.id} AND rerolls_remaining > 0
    RETURNING rerolls_remaining
  `;
  if (!dec.length) return res.status(400).json({ error: "Reroll kamu sudah habis." });
  var left = dec[0].rerolls_remaining;

  var picked;
  try {
    picked = await pickWithFallback(user.id, await getRerollWeights());
  } catch (e) {
    picked = null;
    await db`UPDATE users SET rerolls_remaining = rerolls_remaining + 1 WHERE id = ${user.id}`;
    throw e;
  }
  if (!picked) {
    await db`UPDATE users SET rerolls_remaining = rerolls_remaining + 1 WHERE id = ${user.id}`;
    return res.status(503).json({ error: "Belum ada title tersedia, hubungi admin." });
  }
  if (picked.isNew) {
    await db`INSERT INTO user_titles (user_id, title_id) VALUES (${user.id}, ${picked.row.id}) ON CONFLICT DO NOTHING`;
  }
  res.status(200).json({ title: picked.row, isNew: picked.isNew, rerollsRemaining: left });
}, { methods: ["POST"] });
