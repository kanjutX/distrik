const { api, bodyOf } = require("../http");
const { sql } = require("../db");
const { requireAdmin } = require("../auth");
const { uploadImage, deleteBlob } = require("../blob");
const { parse } = require("../announcements");

var MAX_IMG = 3 * 1048576;

module.exports = api(async (req, res) => {
  var admin = await requireAdmin(req, res);
  if (!admin) return;
  var id = Number(req.query.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: "id tidak valid." });
  var db = sql();

  var cur = await db`SELECT id, image_url FROM announcements WHERE id = ${id}`;
  if (!cur.length) return res.status(404).json({ error: "Pengumuman tidak ditemukan." });

  if (req.method === "DELETE") {
    await db`DELETE FROM announcements WHERE id = ${id}`;
    await deleteBlob(cur[0].image_url);
    await db`INSERT INTO admin_actions (admin_user_id, action, detail) VALUES (${admin.id}, 'announcement-delete', ${JSON.stringify({ id: id })})`;
    return res.status(200).json({ ok: true });
  }

  // PATCH
  var b = bodyOf(req);
  var p = parse(b, true);
  if (p.error) return res.status(400).json({ error: p.error });
  var v = p.value;

  var newImage = null, imageChanged = false;
  if (b.imageDataUrl) {
    try { newImage = (await uploadImage(b.imageDataUrl, "announcements", MAX_IMG)).url; }
    catch (e) { if (e.safe) return res.status(e.status).json({ error: e.message }); throw e; }
    imageChanged = true;
  } else if (b.removeImage === true) imageChanged = true;

  await db`
    UPDATE announcements SET
      title = COALESCE(${v.title === undefined ? null : v.title}::text, title),
      body = COALESCE(${v.body === undefined ? null : v.body}::text, body),
      tag = COALESCE(${v.tag === undefined ? null : v.tag}::text, tag),
      is_published = COALESCE(${v.is_published === undefined ? null : v.is_published}::boolean, is_published),
      published_at = COALESCE(${v.published_at === undefined ? null : v.published_at}::timestamptz, published_at),
      image_url = CASE WHEN ${imageChanged}::boolean THEN ${newImage}::text ELSE image_url END,
      updated_at = now()
    WHERE id = ${id}
  `;
  if (imageChanged) await deleteBlob(cur[0].image_url);
  await db`INSERT INTO admin_actions (admin_user_id, action, detail) VALUES (${admin.id}, 'announcement-update', ${JSON.stringify({ id: id })})`;
  res.status(200).json({ ok: true });
}, { methods: ["PATCH", "DELETE"] });
