const { api, bodyOf } = require("../http");
const { sql } = require("../db");
const { requireUser } = require("../auth");
const F = require("../forum");

async function logAdmin(db, adminId, action, targetUserId, detail) {
  await db`INSERT INTO admin_actions (admin_user_id, action, target_user_id, detail)
           VALUES (${adminId}, ${action}, ${targetUserId}, ${JSON.stringify(detail || {})})`;
}

// GET    /api/forum/threads/:id?limit=&offset=   topik + balasan (publik)
// PATCH  /api/forum/threads/:id                  edit (penulis) / pin & kunci (admin)
// DELETE /api/forum/threads/:id                  hapus (penulis atau admin)
module.exports = api(async (req, res) => {
  var id = F.parseId(req.query.id);
  if (!id) return res.status(400).json({ error: "id tidak valid." });
  var db = sql();

  if (req.method === "GET") {
    var limit = F.clampInt(req.query.limit, 30, 1, 50);
    var offset = F.clampInt(req.query.offset, 0, 0, 100000);
    var out = await Promise.all([
      db`SELECT t.id, t.category, t.title, t.body, t.is_pinned, t.is_locked, t.created_at, t.edited_at,
                u.id AS uid, u.name, u.avatar_url, u.is_admin, ti.text AS title_text, ti.tier AS title_tier
         FROM forum_threads t
         JOIN users u ON u.id = t.user_id AND NOT u.is_banned
         LEFT JOIN titles ti ON ti.id = u.active_title_id
         WHERE t.id = ${id}`,
      db`SELECT p.id, p.body, p.created_at, p.edited_at,
                u.id AS uid, u.name, u.avatar_url, u.is_admin, ti.text AS title_text, ti.tier AS title_tier
         FROM forum_posts p
         JOIN users u ON u.id = p.user_id AND NOT u.is_banned
         LEFT JOIN titles ti ON ti.id = u.active_title_id
         WHERE p.thread_id = ${id}
         ORDER BY p.created_at, p.id LIMIT ${limit + 1} OFFSET ${offset}`,
      db`SELECT COUNT(*)::int AS n FROM forum_posts p JOIN users u ON u.id = p.user_id AND NOT u.is_banned WHERE p.thread_id = ${id}`,
    ]);
    var t = out[0][0];
    if (!t) return res.status(404).json({ error: "Topik tidak ditemukan." });
    var posts = out[1];
    return res.status(200).json({
      thread: {
        id: Number(t.id), category: t.category, title: t.title, body: t.body, isPinned: t.is_pinned, isLocked: t.is_locked,
        createdAt: t.created_at, editedAt: t.edited_at, author: F.author(t),
      },
      posts: posts.slice(0, limit).map(function (p) {
        return { id: Number(p.id), body: p.body, createdAt: p.created_at, editedAt: p.edited_at, author: F.author(p) };
      }),
      total: out[2][0].n,
      hasMore: posts.length > limit,
    });
  }

  var user = await requireUser(req, res);
  if (!user) return;
  var cur = await db`SELECT id, user_id, is_locked FROM forum_threads WHERE id = ${id}`;
  if (!cur.length) return res.status(404).json({ error: "Topik tidak ditemukan." });
  var owner = String(cur[0].user_id) === String(user.id);

  if (req.method === "DELETE") {
    if (!owner && !user.is_admin) return res.status(403).json({ error: "Kamu tidak boleh menghapus topik ini." });
    await db`DELETE FROM forum_threads WHERE id = ${id}`;
    if (!owner) await logAdmin(db, user.id, "forum-thread-delete", cur[0].user_id, { threadId: id });
    return res.status(200).json({ ok: true });
  }

  // PATCH
  var b = bodyOf(req);
  var wantsMod = b.isPinned !== undefined || b.isLocked !== undefined;
  var wantsEdit = b.title !== undefined || b.body !== undefined || b.category !== undefined;
  if (!wantsMod && !wantsEdit) return res.status(400).json({ error: "Tidak ada perubahan." });

  var pinned = null, locked = null, title = null, body = null, category = null;
  if (wantsMod) {
    if (!user.is_admin) return res.status(403).json({ error: "Khusus admin." });
    if (b.isPinned !== undefined) { if (typeof b.isPinned !== "boolean") return res.status(400).json({ error: "isPinned harus true/false." }); pinned = b.isPinned; }
    if (b.isLocked !== undefined) { if (typeof b.isLocked !== "boolean") return res.status(400).json({ error: "isLocked harus true/false." }); locked = b.isLocked; }
  }
  if (wantsEdit) {
    if (!owner) return res.status(403).json({ error: "Hanya penulis yang bisa mengedit topik." });
    if (cur[0].is_locked && !user.is_admin) return res.status(403).json({ error: "Topik ini dikunci." });
    if (b.title !== undefined) { var pt = F.parseTitle(b.title); if (pt.error) return res.status(400).json({ error: pt.error }); title = pt.value; }
    if (b.body !== undefined) { var pb = F.parseBody(b.body, 3, 3000, "Isi topik"); if (pb.error) return res.status(400).json({ error: pb.error }); body = pb.value; }
    if (b.category !== undefined) { var pc = F.parseCategory(b.category); if (pc.error) return res.status(400).json({ error: pc.error }); category = pc.value; }
  }

  await db`
    UPDATE forum_threads SET
      title = COALESCE(${title}::text, title),
      body = COALESCE(${body}::text, body),
      category = COALESCE(${category}::text, category),
      is_pinned = COALESCE(${pinned}::boolean, is_pinned),
      is_locked = COALESCE(${locked}::boolean, is_locked),
      edited_at = CASE WHEN ${wantsEdit}::boolean THEN now() ELSE edited_at END
    WHERE id = ${id}
  `;
  if (wantsMod) await logAdmin(db, user.id, "forum-thread-mod", cur[0].user_id, { threadId: id, isPinned: pinned, isLocked: locked });
  res.status(200).json({ ok: true });
}, { methods: ["GET", "PATCH", "DELETE"] });
