const { api } = require("../http");
const { sql } = require("../db");
const F = require("../forum");

// GET /api/members/:id — profil publik. TIDAK pernah memuat email, jatah reroll, atau data internal.
module.exports = api(async (req, res) => {
  var id = F.parseId(req.query.id);
  if (!id) return res.status(400).json({ error: "id tidak valid." });
  var db = sql();
  var rows = await db`
    SELECT u.id AS uid, u.name, u.avatar_url, u.bio, u.is_admin, u.created_at, u.roblox_username, u.roblox_public,
           ti.text AS title_text, ti.tier AS title_tier
    FROM users u LEFT JOIN titles ti ON ti.id = u.active_title_id
    WHERE u.id = ${id} AND NOT u.is_banned
  `;
  if (!rows.length) return res.status(404).json({ error: "Warga tidak ditemukan." });
  var u = rows[0];

  var more = await Promise.all([
    db`SELECT t.id, t.text, t.tier FROM user_titles ut JOIN titles t ON t.id = ut.title_id
       WHERE ut.user_id = ${id}
       ORDER BY CASE t.tier WHEN 'epic' THEN 0 WHEN 'rare' THEN 1 ELSE 2 END, ut.unlocked_at DESC`,
    db`SELECT (SELECT COUNT(*)::int FROM forum_threads WHERE user_id = ${id}) AS threads,
              (SELECT COUNT(*)::int FROM forum_posts WHERE user_id = ${id}) AS posts`,
    db`SELECT id, title, category, created_at FROM forum_threads WHERE user_id = ${id} ORDER BY created_at DESC LIMIT 5`,
  ]);

  var a = F.author(u);
  res.status(200).json({
    id: a.id, name: a.name, avatarUrl: a.avatarUrl, isAdmin: a.isAdmin, activeTitle: a.title,
    bio: u.bio || "",
    robloxUsername: u.roblox_public && u.roblox_username ? u.roblox_username : null,
    joinedAt: u.created_at,
    ownedTitles: more[0].map(function (t) { return { id: Number(t.id), text: t.text, tier: t.tier }; }),
    stats: { threads: more[1][0].threads, posts: more[1][0].posts },
    recentThreads: more[2].map(function (t) { return { id: Number(t.id), title: t.title, category: t.category, createdAt: t.created_at }; }),
  });
}, { cache: "public, s-maxage=15, stale-while-revalidate=30" });
