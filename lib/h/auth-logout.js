const { api } = require("../http");
const { clearSessionCookie } = require("../auth");

// Hanya POST yang menghapus sesi (GET tidak boleh punya efek samping: cegah logout paksa lewat link/gambar).
module.exports = api(async (req, res) => {
  if (req.method === "POST") {
    clearSessionCookie(res);
    return res.status(200).json({ ok: true });
  }
  res.redirect(302, "/");
}, { methods: ["GET", "POST"] });
