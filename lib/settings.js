const { sql } = require("./db");

var KEYS = ["launch", "reroll_weights", "count_offset", "links", "milestones"];
var LINK_KEYS = ["robloxUrl", "discordUrl", "tiktokUrl", "instagramUrl", "youtubeUrl"];

async function getSettings(keys) {
  var rows = await sql()`SELECT key, value FROM site_settings WHERE key = ANY(${keys || KEYS})`;
  var out = {};
  rows.forEach(function (r) { out[r.key] = r.value; });
  return out;
}

function isHttpUrl(s) {
  try { var u = new URL(s); return (u.protocol === "https:" || u.protocol === "http:") && s.length <= 300; } catch (e) { return false; }
}

// Validasi + normalisasi nilai setting dari panel admin. Mengembalikan { value } atau { error }.
function validateSetting(key, v) {
  if (key === "launch") {
    if (!v || typeof v !== "object") return { error: "Format jadwal tidak valid." };
    var d = "";
    if (v.launchDate) {
      var t = new Date(v.launchDate);
      if (isNaN(t.getTime()) || t.getFullYear() < 2020 || t.getFullYear() > 2100) return { error: "Tanggal rilis tidak valid." };
      d = t.toISOString();
    }
    if (typeof v.registrationOpen !== "boolean") return { error: "registrationOpen harus true/false." };
    return { value: { launchDate: d, registrationOpen: v.registrationOpen } };
  }
  if (key === "reroll_weights") {
    if (!v || typeof v !== "object") return { error: "Format peluang tidak valid." };
    var w = {};
    var ok = ["common", "rare", "epic"].every(function (k) {
      var n = v[k]; if (typeof n !== "number" || !isFinite(n) || n < 0 || n > 1000) return false; w[k] = n; return true;
    });
    if (!ok) return { error: "Common/rare/epik harus angka 0–1000." };
    if (w.common + w.rare + w.epic <= 0) return { error: "Total peluang harus lebih dari 0." };
    return { value: w };
  }
  if (key === "count_offset") {
    if (typeof v !== "number" || !Number.isInteger(v) || Math.abs(v) > 1000000) return { error: "Offset harus bilangan bulat." };
    return { value: v };
  }
  if (key === "links") {
    if (!v || typeof v !== "object") return { error: "Format link tidak valid." };
    var out = {};
    for (var i = 0; i < LINK_KEYS.length; i++) {
      var k = LINK_KEYS[i], s = typeof v[k] === "string" ? v[k].trim() : "";
      if (s && !isHttpUrl(s)) return { error: "Link '" + k.replace("Url", "") + "' harus diawali https://" };
      out[k] = s;
    }
    var em = typeof v.email === "string" ? v.email.trim() : "";
    if (em && (em.length > 120 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em))) return { error: "Email support tidak valid." };
    out.email = em;
    return { value: out };
  }
  if (key === "milestones") {
    if (!Array.isArray(v) || v.length > 12) return { error: "Maksimal 12 hadiah." };
    var list = [];
    for (var j = 0; j < v.length; j++) {
      var m = v[j] || {};
      var at = Number(m.at), title = String(m.title || "").trim(), desc = String(m.desc || "").trim();
      if (!Number.isInteger(at) || at < 1 || at > 10000000) return { error: "Target pendaftar harus bilangan bulat 1–10.000.000." };
      if (title.length < 1 || title.length > 80) return { error: "Judul hadiah wajib diisi (maks 80 karakter)." };
      if (desc.length > 200) return { error: "Deskripsi hadiah maks 200 karakter." };
      list.push({ at: at, title: title, desc: desc });
    }
    list.sort(function (a, b) { return a.at - b.at; });
    return { value: list };
  }
  return { error: "key tidak dikenal." };
}

module.exports = { KEYS, getSettings, validateSetting };
