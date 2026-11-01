// Dispatcher: satu Serverless Function melayani beberapa endpoint (batas plan Hobby = 12 function).
// URL publik tidak berubah: vercel.json me-rewrite /api/... ke file ini dengan ?r=...
var H = {
  profile: require("../lib/h/profile"),
  avatar: require("../lib/h/avatar")
};

module.exports = function (req, res) {
  var name = req.query.r || 'profile';
  var h = Object.prototype.hasOwnProperty.call(H, name) ? H[name] : null;
  if (!h) { res.setHeader("Cache-Control", "no-store"); return res.status(404).json({ error: "Endpoint tidak ditemukan." }); }
  return h(req, res);
};
