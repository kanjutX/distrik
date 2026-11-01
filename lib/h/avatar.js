const { api, bodyOf, rateLimit } = require("../http");
const { sql } = require("../db");
const { requireUser } = require("../auth");
const { uploadImage, deleteBlob } = require("../blob");

module.exports = api(async (req, res) => {
  var user = await requireUser(req, res);
  if (!user) return;
  if (!rateLimit("avatar:" + user.id, 10, 3600 * 1000)) {
    return res.status(429).json({ error: "Terlalu sering ganti foto. Coba lagi nanti." });
  }
  try {
    var up = await uploadImage(bodyOf(req).dataUrl, "avatars/" + user.id, 1.5 * 1048576);
  } catch (e) {
    if (e.safe) return res.status(e.status).json({ error: e.message });
    throw e;
  }
  await sql()`UPDATE users SET avatar_url = ${up.url}, updated_at = now() WHERE id = ${user.id}`;
  await deleteBlob(user.avatar_url); // bersihkan foto lama biar storage tidak menumpuk
  res.status(200).json({ ok: true, avatarUrl: up.url });
}, { methods: ["POST"] });
