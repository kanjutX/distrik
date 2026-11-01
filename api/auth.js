// Dispatcher: satu Serverless Function melayani beberapa endpoint (batas plan Hobby = 12 function).
// URL publik tidak berubah: vercel.json me-rewrite /api/... ke file ini dengan ?action=...
var H = {
  login: require("../lib/h/auth-login"),
  callback: require("../lib/h/auth-callback"),
  logout: require("../lib/h/auth-logout"),
  me: require("../lib/h/auth-me")
};

module.exports = function (req, res) {
  var name = req.query.action;
  var h = Object.prototype.hasOwnProperty.call(H, name) ? H[name] : null;
  if (!h) { res.setHeader("Cache-Control", "no-store"); return res.status(404).json({ error: "Endpoint tidak ditemukan." }); }
  return h(req, res);
};
