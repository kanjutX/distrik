const jwt = require("jsonwebtoken");
const { sql } = require("./db");

const SESSION_COOKIE = "d17_session";
const STATE_COOKIE = "d17_oauth_state";
const SESSION_DAYS = 30;

function jwtSecret() {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error("JWT_SECRET belum di-set di Environment Variables Vercel.");
  return s;
}

function serializeCookie(name, value, opts) {
  opts = opts || {};
  var parts = [name + "=" + encodeURIComponent(value)];
  parts.push("Path=" + (opts.path || "/"));
  parts.push("HttpOnly");
  parts.push("SameSite=" + (opts.sameSite || "Lax"));
  if (process.env.NODE_ENV !== "development") parts.push("Secure");
  if (opts.maxAge != null) parts.push("Max-Age=" + opts.maxAge);
  if (opts.maxAge === 0) parts.push("Expires=Thu, 01 Jan 1970 00:00:00 GMT");
  return parts.join("; ");
}

function appendSetCookie(res, cookieStr) {
  var prev = res.getHeader("Set-Cookie");
  if (!prev) return res.setHeader("Set-Cookie", cookieStr);
  var arr = Array.isArray(prev) ? prev : [prev];
  arr.push(cookieStr);
  res.setHeader("Set-Cookie", arr);
}

function setSessionCookie(res, token) {
  appendSetCookie(res, serializeCookie(SESSION_COOKIE, token, { maxAge: SESSION_DAYS * 86400 }));
}

function clearSessionCookie(res) {
  appendSetCookie(res, serializeCookie(SESSION_COOKIE, "", { maxAge: 0 }));
}

function setStateCookie(res, state) {
  appendSetCookie(res, serializeCookie(STATE_COOKIE, state, { maxAge: 600 }));
}

function clearStateCookie(res) {
  appendSetCookie(res, serializeCookie(STATE_COOKIE, "", { maxAge: 0 }));
}

// req.cookies sudah disediakan runtime Node Vercel, tapi jaga-jaga kalau tidak ada.
function readCookie(req, name) {
  if (req.cookies && req.cookies[name] != null) return req.cookies[name];
  var header = req.headers && req.headers.cookie;
  if (!header) return null;
  var parts = header.split(";");
  for (var i = 0; i < parts.length; i++) {
    var p = parts[i].trim();
    var eq = p.indexOf("=");
    if (eq === -1) continue;
    if (p.slice(0, eq) === name) { try { return decodeURIComponent(p.slice(eq + 1)); } catch (e) { return null; } }
  }
  return null;
}

function signSession(uid) {
  return jwt.sign({ uid: uid }, jwtSecret(), { expiresIn: SESSION_DAYS + "d", algorithm: "HS256" });
}

function verifySession(token) {
  try {
    return jwt.verify(token, jwtSecret(), { algorithms: ["HS256"] });
  } catch (e) {
    return null;
  }
}

// Mengambil user dari DB berdasarkan session cookie. Selalu query ulang
// (bukan percaya JWT mentah) supaya ban/promosi admin langsung berlaku.
async function getSessionUser(req) {
  var token = readCookie(req, SESSION_COOKIE);
  if (!token) return null;
  var payload = verifySession(token);
  if (!payload || !payload.uid) return null;
  var db = sql();
  var rows = await db`
    SELECT id, email, name, avatar_url, roblox_username, bio,
           active_title_id, rerolls_remaining, is_admin, is_banned
    FROM users WHERE id = ${payload.uid}
  `;
  if (!rows.length || rows[0].is_banned) return null;
  return rows[0];
}

async function requireUser(req, res) {
  var user = await getSessionUser(req);
  if (!user) {
    res.status(401).json({ error: "Belum login." });
    return null;
  }
  return user;
}

async function requireAdmin(req, res) {
  var user = await requireUser(req, res);
  if (!user) return null;
  if (!user.is_admin) {
    res.status(403).json({ error: "Khusus admin." });
    return null;
  }
  return user;
}

// Batasi tujuan redirect ke path di situs sendiri. Menolak "//host", "/\\host",
// karakter kontrol, dan apa pun yang bila diparsing berpindah origin (open-redirect).
function safeReturnTo(raw, fallback) {
  fallback = fallback || "/profile";
  if (typeof raw !== "string" || raw.length > 200) return fallback;
  if (raw.charAt(0) !== "/" || raw.charAt(1) === "/" || raw.indexOf("\\") !== -1 || /[\u0000-\u001f\u007f]/.test(raw)) return fallback;
  try {
    var u = new URL(raw, "https://base.invalid");
    if (u.origin !== "https://base.invalid") return fallback;
    return u.pathname + u.search;
  } catch (e) { return fallback; }
}

// Origin situs. Set SITE_URL di Vercel (mis. https://distrik17.com) supaya redirect_uri
// OAuth tidak bergantung pada header Host dari request.
function siteUrl(req) {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/+$/, "");
  var proto = (req.headers["x-forwarded-proto"] || "https").split(",")[0].trim();
  var host = (req.headers["x-forwarded-host"] || req.headers.host || "").split(",")[0].trim();
  return proto + "://" + host;
}

module.exports = {
  safeReturnTo, siteUrl,
  SESSION_COOKIE, STATE_COOKIE,
  setSessionCookie, clearSessionCookie, setStateCookie, clearStateCookie,
  readCookie, signSession, verifySession, getSessionUser, requireUser, requireAdmin,
};
