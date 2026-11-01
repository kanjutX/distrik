// Validasi & helper bersama untuk forum dan profil publik.

var CATEGORIES = ["Umum", "Game", "Saran", "Bug", "Perkenalan"];

// Karakter kontrol + karakter arah-tulisan/tak-terlihat (dipakai untuk memalsukan tampilan teks).
var CONTROL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u200b-\u200f\u202a-\u202e\u2060-\u2069\ufeff]/g;

function oneLine(s) {
  return String(s).replace(CONTROL, "").replace(/[\t\r\n]+/g, " ").replace(/ {2,}/g, " ").trim();
}

function multiLine(s) {
  return String(s).replace(/\r\n?/g, "\n").replace(CONTROL, "").replace(/\n{3,}/g, "\n\n").trim();
}

// Mengembalikan { value } atau { error }.
function parseTitle(v) {
  if (typeof v !== "string") return { error: "Judul wajib diisi." };
  var t = oneLine(v);
  if (t.length < 3 || t.length > 100) return { error: "Judul 3–100 karakter." };
  return { value: t };
}

function parseBody(v, min, max, label) {
  if (typeof v !== "string") return { error: label + " wajib diisi." };
  if (v.length > max * 4) return { error: label + " maksimal " + max + " karakter." };
  var t = multiLine(v);
  if (t.length < min) return { error: label + " minimal " + min + " karakter." };
  if (t.length > max) return { error: label + " maksimal " + max + " karakter." };
  return { value: t };
}

function parseCategory(v) {
  if (typeof v !== "string" || CATEGORIES.indexOf(v) === -1) return { error: "Kategori tidak valid." };
  return { value: v };
}

function parseId(v) {
  var n = Number(v);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

// Baris DB -> objek penulis untuk JSON (id bigint dijadikan angka; tidak pernah menyertakan email).
function author(r) {
  return {
    id: Number(r.uid),
    name: r.name,
    avatarUrl: r.avatar_url || null,
    isAdmin: !!r.is_admin,
    title: r.title_text ? { text: r.title_text, tier: r.title_tier } : null,
  };
}

function clampInt(v, def, min, max) {
  var n = Math.trunc(Number(v));
  if (!isFinite(n)) n = def;
  return Math.min(max, Math.max(min, n));
}

module.exports = { CATEGORIES, oneLine, multiLine, parseTitle, parseBody, parseCategory, parseId, author, clampInt };
