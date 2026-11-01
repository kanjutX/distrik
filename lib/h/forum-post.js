const { api, bodyOf } = require("../http");
const { sql } = require("../db");
const { requireUser } = require("../auth");
const F = require("../forum");

// PATCH  /api/forum/posts/:id   edit balasan (penulis)
// DELETE /api/forum/posts/:id   hapus balasan (penulis atau admin)
module.exports = api(async (req, res) => {
  var user = await requireUser(req, res);
  if (!user) return;
  var id = F.parseId(req.query.id);
  if (!id) return res.status(400).json({ error: "id tidak valid." });
  var db = sql();

  var cur = await db`
    SELECT p.id, p.user_id, p.thread_id, t.is_locked
    FROM forum_posts p JOIN forum_threads t ON t.id = p.thread_id WHERE p.id = ${id}
  `;
  if (!cur.length) return res.status(404).json({ error: "Balasan tidak ditemukan." });
  var owner = String(cur[0].user_id) === String(user.id);

  if (req.method === "DELETE") {
    if (!owner && !user.is_admin) return res.status(403).json({ error: "Kamu tidak boleh menghapus balasan ini." });
    await db`DELETE FROM forum_posts WHERE id = ${id}`;
    if (!owner) {
      await db`INSERT INTO admin_actions (admin_user_id, action, target_user_id, detail)
               VALUES (${user.id}, 'forum-post-delete', ${cur[0].user_id}, ${JSON.stringify({ postId: id, threadId: Number(cur[0].thread_id) })})`;
    }
    return res.status(200).json({ ok: true });
  }

  // PATCH
  if (!owner) return res.status(403).json({ error: "Hanya penulis yang bisa mengedit balasan." });
  if (cur[0].is_locked && !user.is_admin) return res.status(403).json({ error: "Topik ini dikunci." });
  var pb = F.parseBody(bodyOf(req).body, 1, 1500, "Balasan");
  if (pb.error) return res.status(400).json({ error: pb.error });
  await db`UPDATE forum_posts SET body = ${pb.value}::text, edited_at = now() WHERE id = ${id}`;
  res.status(200).json({ ok: true, body: pb.value });
}, { methods: ["PATCH", "DELETE"] });
