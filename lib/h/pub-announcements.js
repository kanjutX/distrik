const { api } = require("../http");
const { sql } = require("../db");

// Pengumuman yang sudah terbit (is_published + jadwal terbit sudah lewat). Publik.
module.exports = api(async (req, res) => {
  var rows = await sql()`
    SELECT id, title, body, tag, image_url, published_at
    FROM announcements
    WHERE is_published = TRUE AND published_at <= now()
    ORDER BY published_at DESC, id DESC LIMIT 30
  `;
  rows.forEach(function (r) { r.id = Number(r.id); });
  res.status(200).json({ announcements: rows });
}, { cache: "public, s-maxage=20, stale-while-revalidate=60" });
