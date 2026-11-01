const { api, bodyOf } = require("../http");
const { sql } = require("../db");
const { requireAdmin } = require("../auth");

async function logAction(db, adminId, action, targetId, detail) {
  await db`
    INSERT INTO admin_actions (admin_user_id, action, target_user_id, detail)
    VALUES (${adminId}, ${action}, ${targetId}, ${JSON.stringify(detail || {})})
  `;
}

module.exports = api(async (req, res) => {
  var admin = await requireAdmin(req, res);
  if (!admin) return;
  var db = sql();

  if (req.method === "GET") {
    var q = String(req.query.q || "").trim().slice(0, 80);
    // escape wildcard LIKE supaya "%" / "_" dicari apa adanya
    var like = "%" + q.replace(/[\\%_]/g, "\\$&") + "%";
    var limit = Math.min(100, Math.max(1, Math.trunc(Number(req.query.limit)) || 50));
    var offset = Math.max(0, Math.trunc(Number(req.query.offset)) || 0);
    var rows = await db`
      SELECT id, email, name, roblox_username, rerolls_remaining, is_admin, is_banned, created_at
      FROM users
      WHERE ${q}::text = '' OR email ILIKE ${like} OR name ILIKE ${like} OR roblox_username ILIKE ${like}
      ORDER BY created_at DESC, id DESC LIMIT ${limit} OFFSET ${offset}
    `;
    var stats = await db`
      SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE is_banned)::int AS banned,
             COUNT(*) FILTER (WHERE is_admin)::int AS admins FROM users
    `;
    return res.status(200).json({ users: rows, stats: stats[0], hasMore: rows.length === limit });
  }

  var b = bodyOf(req);
  var action = b.action;
  var targetId = Number(b.userId);
  if (!Number.isInteger(targetId) || targetId <= 0) return res.status(400).json({ error: "userId wajib diisi." });
  var target = await db`SELECT id FROM users WHERE id = ${targetId}`;
  if (!target.length) return res.status(404).json({ error: "Pengguna tidak ditemukan." });

  if (action === "grant-rerolls") {
    var amount = Math.trunc(Number(b.amount));
    if (!amount || Math.abs(amount) > 1000) return res.status(400).json({ error: "Jumlah harus angka bukan 0 (maks ±1000)." });
    await db`UPDATE users SET rerolls_remaining = GREATEST(0, rerolls_remaining + ${amount}), updated_at = now() WHERE id = ${targetId}`;
    await logAction(db, admin.id, "grant-rerolls", targetId, { amount: amount });
    return res.status(200).json({ ok: true });
  }
  if (action === "set-banned") {
    var banned = b.banned === true;
    if (targetId === admin.id && banned) return res.status(400).json({ error: "Tidak bisa ban diri sendiri." });
    await db`UPDATE users SET is_banned = ${banned}, updated_at = now() WHERE id = ${targetId}`;
    await logAction(db, admin.id, "set-banned", targetId, { banned: banned });
    return res.status(200).json({ ok: true });
  }
  if (action === "set-admin") {
    var isAdmin = b.isAdmin === true;
    if (targetId === admin.id && !isAdmin) return res.status(400).json({ error: "Tidak bisa mencabut admin dari diri sendiri." });
    await db`UPDATE users SET is_admin = ${isAdmin}, updated_at = now() WHERE id = ${targetId}`;
    await logAction(db, admin.id, "set-admin", targetId, { isAdmin: isAdmin });
    return res.status(200).json({ ok: true });
  }
  res.status(400).json({ error: "action tidak dikenal." });
}, { methods: ["GET", "POST"] });
