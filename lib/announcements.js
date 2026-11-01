// Validasi input pengumuman (dipakai POST dan PATCH).
function parse(b, partial) {
  var out = {};
  function bad(msg) { return { error: msg }; }

  if (!partial || b.title !== undefined) {
    var title = typeof b.title === "string" ? b.title.replace(/[\u0000-\u001f]/g, " ").trim() : "";
    if (title.length < 2 || title.length > 120) return bad("Judul 2–120 karakter.");
    out.title = title;
  }
  if (b.body !== undefined) {
    var body = typeof b.body === "string" ? b.body.replace(/\r\n/g, "\n").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").trim() : null;
    if (body === null || body.length > 2000) return bad("Isi maksimal 2000 karakter.");
    out.body = body;
  } else if (!partial) out.body = "";
  if (b.tag !== undefined) {
    var tag = typeof b.tag === "string" ? b.tag.trim() : "";
    if (tag.length < 1 || tag.length > 20) return bad("Label 1–20 karakter.");
    out.tag = tag;
  } else if (!partial) out.tag = "Info";
  if (b.isPublished !== undefined) {
    if (typeof b.isPublished !== "boolean") return bad("isPublished harus true/false.");
    out.is_published = b.isPublished;
  } else if (!partial) out.is_published = true;
  if (b.publishedAt !== undefined && b.publishedAt !== "" && b.publishedAt !== null) {
    var d = new Date(b.publishedAt);
    if (isNaN(d.getTime()) || d.getFullYear() < 2020 || d.getFullYear() > 2100) return bad("Tanggal terbit tidak valid.");
    out.published_at = d.toISOString();
  }
  return { value: out };
}

module.exports = { parse };
