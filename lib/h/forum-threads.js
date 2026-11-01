const { api, bodyOf } = require("../http");
const { sql } = require("../db");
const { requireUser } = require("../auth");
const F = require("../forum");

// GET  /api/forum/threads?cat=&limit=&offset=   daftar topik (publik)
// POST /api/forum/threads                       buat topik (login)
module.exports = api(async (req, res) => {
  var db = sql();

  if (req.method === "GET") {
    var cat = null;
    if (req.query.cat !== undefined && req.query.cat !== "") {
      var pc = F.parseCategory(req.query.cat);
      if (pc.error) return res.status(400).json({ error: pc.error });
      cat = pc.value;
    }
    var limit = F.clampInt(req.query.limit, 20, 1, 50);
    var offset = F.clampInt(req.query.offset, 0, 0, 100000);
    var rows = await db`
      SELECT t.id, t.title, t.category, t.is_pinned, t.is_locked, t.created_at, t.last_activity_at,
             u.id AS uid, u.name, u.avatar_url, u.is_admin, ti.text AS title_text, ti.tier AS title_tier,
             (SELECT COUNT(*)::int FROM forum_posts p JOIN users pu ON pu.id = p.user_id AND NOT pu.is_banned
               WHERE p.thread_id = t.id) AS replies
      FROM forum_threads t
      JOIN users u ON u.id = t.user_id AND NOT u.is_banned
      LEFT JOIN titles ti ON ti.id = u.active_title_id
      WHERE (${cat}::text IS NULL OR t.category = ${cat}::text)
      ORDER BY t.is_pinned DESC, t.last_activity_at DESC, t.id DESC
      LIMIT ${limit + 1} OFFSET ${offset}
    `;
    var more = rows.length > limit;
    return res.status(200).json({
      categories: F.CATEGORIES,
      hasMore: more,
      threads: rows.slice(0, limit).map(function (r) {
        return {
          id: Number(r.id), title: r.title, category: r.category, isPinned: r.is_pinned, isLocked: r.is_locked,
          createdAt: r.created_at, lastActivityAt: r.last_activity_at, replies: r.replies, author: F.author(r),
        };
      }),
    });
  }

  // POST
  var user = await requireUser(req, res);
  if (!user) return;
  var b = bodyOf(req);
  var pc2 = F.parseCategory(b.category), pt = F.parseTitle(b.title), pb = F.parseBody(b.body, 3, 3000, "Isi topik");
  var err = pc2.error || pt.error || pb.error;
  if (err) return res.status(400).json({ error: err });

  var dupe = await db`
    SELECT 1 FROM forum_threads
    WHERE user_id = ${user.id}::bigint AND title = ${pt.value}::text AND body = ${pb.value}::text
      AND created_at > now() - interval '1 hour' LIMIT 1
  `;
  if (dupe.length) return res.status(409).json({ error: "Topik yang sama sudah kamu buat." });

  // Batas 3 topik / 10 menit dicek di dalam INSERT yang sama (atomik, tahan klik/request paralel).
  var ins = await db`
    INSERT INTO forum_threads (user_id, category, title, body)
    SELECT ${user.id}::bigint, ${pc2.value}::text, ${pt.value}::text, ${pb.value}::text
    WHERE (SELECT COUNT(*) FROM forum_threads WHERE user_id = ${user.id}::bigint AND created_at > now() - interval '10 minutes') < 3
    RETURNING id
  `;
  if (!ins.length) return res.status(429).json({ error: "Kamu terlalu sering membuat topik. Tunggu beberapa menit." });
  res.status(200).json({ ok: true, id: Number(ins[0].id) });
}, { methods: ["GET", "POST"] });
