const { api, bodyOf } = require("../http");
const { sql } = require("../db");
const { requireUser } = require("../auth");
const { oneLine } = require("../forum");

function clean(s) { return String(s).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u200b-\u200f\u202a-\u202e\u2060-\u2069\ufeff]/g, "").trim(); }

module.exports = api(async (req, res) => {
  var user = await requireUser(req, res);
  if (!user) return;
  var db = sql();

  if (req.method === "GET") {
    var titleRows = await db`
      SELECT t.id, t.text, t.tier, t.color FROM user_titles ut
      JOIN titles t ON t.id = ut.title_id
      WHERE ut.user_id = ${user.id}
      ORDER BY ut.unlocked_at DESC
    `;
    var active = null;
    if (user.active_title_id) {
      var a = await db`SELECT id, text, tier, color FROM titles WHERE id = ${user.active_title_id}`;
      active = a[0] || null;
    }
    var pub = await db`SELECT roblox_public FROM users WHERE id = ${user.id}`;
    return res.status(200).json({
      id: Number(user.id), email: user.email, name: user.name, avatarUrl: user.avatar_url,
      robloxUsername: user.roblox_username, robloxPublic: !!(pub[0] && pub[0].roblox_public), bio: user.bio,
      rerollsRemaining: user.rerolls_remaining, isAdmin: user.is_admin,
      activeTitle: active ? { id: Number(active.id), text: active.text, tier: active.tier, color: active.color } : null,
      ownedTitles: titleRows.map(function (t) { return { id: Number(t.id), text: t.text, tier: t.tier, color: t.color }; }),
    });
  }

  // PUT
  var b = bodyOf(req);
  var name = typeof b.name === "string" ? oneLine(b.name).slice(0, 60) : null;
  var roblox = typeof b.robloxUsername === "string" ? b.robloxUsername.trim() : null;
  var bio = typeof b.bio === "string" ? clean(b.bio).slice(0, 280) : null;
  var robloxPublic = typeof b.robloxPublic === "boolean" ? b.robloxPublic : null;

  if (name !== null && name.length < 2) return res.status(400).json({ error: "Nama minimal 2 karakter." });
  if (roblox !== null && roblox !== "" && !/^[A-Za-z0-9_]{3,20}$/.test(roblox)) {
    return res.status(400).json({ error: "Username Roblox 3–20 karakter (huruf, angka, garis bawah)." });
  }

  try {
    await db`
      UPDATE users SET
        name = COALESCE(${name}, name),
        roblox_username = CASE WHEN ${roblox}::text IS NULL THEN roblox_username ELSE NULLIF(${roblox}::text, '') END,
        bio = COALESCE(${bio}, bio),
        roblox_public = COALESCE(${robloxPublic}::boolean, roblox_public),
        updated_at = now()
      WHERE id = ${user.id}
    `;
  } catch (e) {
    if (e && e.code === "23505") return res.status(409).json({ error: "Username Roblox itu sudah dipakai akun lain." });
    throw e;
  }
  res.status(200).json({ ok: true, name: name !== null ? name : user.name });
}, { methods: ["GET", "PUT"] });
