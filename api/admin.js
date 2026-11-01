// Dispatcher: satu Serverless Function melayani beberapa endpoint (batas plan Hobby = 12 function).
// URL publik tidak berubah: vercel.json me-rewrite /api/... ke file ini dengan ?r=...
var H = {
  announcements: require("../lib/h/admin-announcements"),
  announcement: require("../lib/h/admin-announcement"),
  settings: require("../lib/h/admin-settings"),
  titles: require("../lib/h/admin-titles"),
  title: require("../lib/h/admin-title"),
  users: require("../lib/h/admin-users")
};

module.exports = function (req, res) {
  var name = req.query.r;
  var h = Object.prototype.hasOwnProperty.call(H, name) ? H[name] : null;
  if (!h) { res.setHeader("Cache-Control", "no-store"); return res.status(404).json({ error: "Endpoint tidak ditemukan." }); }
  return h(req, res);
};
