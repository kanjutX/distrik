// Dispatcher forum (1 Serverless Function). URL publik lewat rewrites di vercel.json.
var H = {
  threads: require("../lib/h/forum-threads"),
  thread: require("../lib/h/forum-thread"),
  posts: require("../lib/h/forum-posts"),
  post: require("../lib/h/forum-post")
};

module.exports = function (req, res) {
  var name = req.query.r;
  var h = Object.prototype.hasOwnProperty.call(H, name) ? H[name] : null;
  if (!h) { res.setHeader("Cache-Control", "no-store"); return res.status(404).json({ error: "Endpoint tidak ditemukan." }); }
  return h(req, res);
};
