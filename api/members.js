// Dispatcher profil publik (1 Serverless Function). URL publik lewat rewrites di vercel.json.
var H = {
  list: require("../lib/h/members"),
  one: require("../lib/h/member")
};

module.exports = function (req, res) {
  var name = req.query.r || "list";
  var h = Object.prototype.hasOwnProperty.call(H, name) ? H[name] : null;
  if (!h) { res.setHeader("Cache-Control", "no-store"); return res.status(404).json({ error: "Endpoint tidak ditemukan." }); }
  return h(req, res);
};
