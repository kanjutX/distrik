const { api, bodyOf } = require("../http");
const { sql } = require("../db");
const { requireUser } = require("../auth");
const F = require("../forum");

var MAX_PER_THREAD = 1000;

// POST /api/forum/threads/:id/posts   kirim balasan (login)
module.exports = api(async (req, res) => {
  var user = await requireUser(req, res);
  if (!user) return;
  var id = F.parseId(req.query.id);
  if (!id) return res.status(400).json({ error: "id tidak valid." });
  var pb = F.parseBody(bodyOf(req).body, 1, 1500, "Balasan");
  if (pb.error) return res.status(400).json({ error: pb.error });

  var db = sql();
  var th = await db`
    SELECT t.id, t.is_locked, (SELECT COUNT(*)::int FROM forum_posts WHERE thread_id = t.id) AS n
    FROM forum_threads t JOIN users u ON u.id = t.user_id AND NOT u.is_banned WHERE t.id = ${id}
  `;
  if (!th.length) return res.status(404).json({ error: "Topik tidak ditemukan." });
  if (th[0].is_locked && !user.is_admin) return res.status(403).json({ error: "Topik ini dikunci, tidak bisa dibalas." });
  if (th[0].n >= MAX_PER_THREAD) return res.status(400).json({ error: "Topik ini sudah penuh." });

  var dupe = await db`
    SELECT 1 FROM forum_posts
    WHERE user_id = ${user.id}::bigint AND thread_id = ${id}::bigint AND body = ${pb.value}::text
      AND created_at > now() - interval '2 minutes' LIMIT 1
  `;
  if (dupe.length) return res.status(409).json({ error: "Balasan yang sama baru saja kamu kirim." });

  // Batas 6 balasan / menit dicek di dalam INSERT yang sama (atomik).
  var ins = await db`
    INSERT INTO forum_posts (thread_id, user_id, body)
    SELECT ${id}::bigint, ${user.id}::bigint, ${pb.value}::text
    WHERE (SELECT COUNT(*) FROM forum_posts WHERE user_id = ${user.id}::bigint AND created_at > now() - interval '1 minute') < 6
    RETURNING id, created_at
  `;
  if (!ins.length) return res.status(429).json({ error: "Pelan-pelan, kamu mengirim terlalu cepat." });
  await db`UPDATE forum_threads SET last_activity_at = now() WHERE id = ${id}`;

  var title = null;
  if (user.active_title_id) {
    var tr = await db`SELECT text, tier FROM titles WHERE id = ${user.active_title_id}`;
    if (tr.length) title = { text: tr[0].text, tier: tr[0].tier };
  }
  res.status(200).json({
    ok: true,
    post: {
      id: Number(ins[0].id), body: pb.value, createdAt: ins[0].created_at, editedAt: null,
      author: { id: Number(user.id), name: user.name, avatarUrl: user.avatar_url || null, isAdmin: !!user.is_admin, title: title },
    },
  });
}, { methods: ["POST"] });
