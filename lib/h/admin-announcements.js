const { api, bodyOf } = require("../http");
const { sql } = require("../db");
const { requireAdmin } = require("../auth");
const { uploadImage } = require("../blob");
const { parse } = require("../announcements");

var MAX_IMG = 3 * 1048576;

module.exports = api(async (req, res) => {
  var admin = await requireAdmin(req, res);
  if (!admin) return;
  var db = sql();

  if (req.method === "GET") {
    var rows = await db`
      SELECT id, title, body, tag, image_url, is_published, published_at, created_at
      FROM announcements ORDER BY published_at DESC, id DESC LIMIT 200
    `;
    rows.forEach(function (r) { r.id = Number(r.id); });
    return res.status(200).json({ announcements: rows });
  }

  var b = bodyOf(req);
  var p = parse(b, false);
  if (p.error) return res.status(400).json({ error: p.error });
  var v = p.value;

  var imageUrl = null;
  if (b.imageDataUrl) {
    try { imageUrl = (await uploadImage(b.imageDataUrl, "announcements", MAX_IMG)).url; }
    catch (e) { if (e.safe) return res.status(e.status).json({ error: e.message }); throw e; }
  }
  var publishedAt = v.published_at || new Date().toISOString();
  var ins = await db`
    INSERT INTO announcements (title, body, tag, image_url, is_published, published_at)
    VALUES (${v.title}, ${v.body}, ${v.tag}, ${imageUrl}, ${v.is_published}, ${publishedAt})
    RETURNING id
  `;
  await db`INSERT INTO admin_actions (admin_user_id, action, detail) VALUES (${admin.id}, 'announcement-create', ${JSON.stringify({ id: ins[0].id, title: v.title })})`;
  res.status(200).json({ ok: true, id: ins[0].id });
}, { methods: ["GET", "POST"] });
