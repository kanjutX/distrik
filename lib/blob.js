const { put, del } = require("@vercel/blob");

var MIME_EXT = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };

// Cek isi file sebenarnya (magic bytes), bukan cuma tipe yang diklaim klien.
function sniff(buf) {
  if (buf.length > 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "image/png";
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.length > 12 && buf.slice(0, 4).toString("ascii") === "RIFF" && buf.slice(8, 12).toString("ascii") === "WEBP") return "image/webp";
  return null;
}

// Mengembalikan { url } atau melempar Error dengan .status & pesan aman ditampilkan.
async function uploadImage(dataUrl, folder, maxBytes) {
  function fail(status, msg) { var e = new Error(msg); e.status = status; e.safe = true; return e; }
  if (typeof dataUrl !== "string" || dataUrl.length > maxBytes * 1.4 + 200) throw fail(400, "Ukuran gambar terlalu besar.");
  var m = dataUrl.match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]+={0,2})$/);
  if (!m) throw fail(400, "Format gambar harus PNG, JPEG, atau WebP.");
  var buf = Buffer.from(m[2], "base64");
  if (buf.length > maxBytes) throw fail(400, "Ukuran gambar maksimal " + Math.round(maxBytes / 1048576 * 10) / 10 + "MB.");
  var real = sniff(buf);
  if (!real) throw fail(400, "File bukan gambar yang valid.");
  if (!process.env.BLOB_READ_WRITE_TOKEN) return { url: dataUrl };
  var blob = await put(folder + "/img." + MIME_EXT[real], buf, { access: "public", contentType: real, addRandomSuffix: true });
  return { url: blob.url };
}

// Hapus blob milik kita saja (host Vercel Blob); abaikan URL lain (mis. foto Google).
async function deleteBlob(url) {
  try {
    if (!url) return;
    var host = new URL(url).hostname;
    if (!/\.public\.blob\.vercel-storage\.com$/.test(host)) return;
    await del(url);
  } catch (e) { console.error("[blob delete]", e && e.message); }
}

module.exports = { uploadImage, deleteBlob };
