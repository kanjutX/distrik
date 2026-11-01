const { OAuth2Client } = require("google-auth-library");
const { api } = require("../http");
const { sql } = require("../db");
const {
  readCookie, clearStateCookie, signSession, setSessionCookie, STATE_COOKIE, safeReturnTo, siteUrl,
} = require("../auth");
const { getSettings } = require("../settings");

function isAdminEmail(email) {
  var list = (process.env.ADMIN_EMAILS || "").split(",").map(function (s) { return s.trim().toLowerCase(); }).filter(Boolean);
  return list.indexOf(String(email).toLowerCase()) !== -1;
}

function back(res, code) { res.redirect(302, "/?login=" + code); }

module.exports = api(async (req, res) => {
  var clientId = process.env.GOOGLE_CLIENT_ID;
  var clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return back(res, "unavailable");

  var code = req.query.code, state = req.query.state;
  if (req.query.error) return back(res, "cancelled");
  if (typeof code !== "string" || typeof state !== "string") return back(res, "error");

  var cookieVal = readCookie(req, STATE_COOKIE) || "";
  clearStateCookie(res);
  var sep = cookieVal.indexOf("|");
  var cookieState = sep === -1 ? cookieVal : cookieVal.slice(0, sep);
  var returnTo = safeReturnTo(sep === -1 ? "" : cookieVal.slice(sep + 1));
  if (!cookieState || cookieState !== state) return back(res, "expired");

  var client = new OAuth2Client(clientId, clientSecret, siteUrl(req) + "/api/auth/callback");
  var payload;
  try {
    var r = await client.getToken(code);
    var ticket = await client.verifyIdToken({ idToken: r.tokens.id_token, audience: clientId });
    payload = ticket.getPayload();
  } catch (e) {
    console.error("[oauth]", e && e.message);
    return back(res, "error");
  }
  if (!payload || !payload.email || !payload.email_verified) return back(res, "error");

  var db = sql();
  var sub = String(payload.sub), email = String(payload.email).toLowerCase();
  var name = String(payload.name || email.split("@")[0]).replace(/[\u0000-\u001f]/g, "").trim().slice(0, 60);
  if (name.length < 2) name = email.split("@")[0].slice(0, 60).padEnd(2, "_");
  var avatar = typeof payload.picture === "string" && /^https:\/\//.test(payload.picture) ? payload.picture : null;
  var promote = isAdminEmail(email);

  var existing = await db`SELECT id, is_banned FROM users WHERE google_sub = ${sub}`;
  if (existing.length && existing[0].is_banned) return back(res, "banned");

  if (!existing.length && !promote) {
    var s = await getSettings(["launch"]);
    if (s.launch && s.launch.registrationOpen === false) return back(res, "closed");
  }

  var rows;
  try {
    // Satu statement atomik. Untuk akun lama: nama & foto unggahan sendiri TIDAK ditimpa,
    // foto Google hanya disegarkan kalau pengguna belum mengunggah foto sendiri.
    rows = await db`
      INSERT INTO users (google_sub, email, name, avatar_url, is_admin, rerolls_remaining)
      VALUES (${sub}, ${email}, ${name}, ${avatar}, ${promote}, 30)
      ON CONFLICT (google_sub) DO UPDATE SET
        is_admin = users.is_admin OR EXCLUDED.is_admin,
        avatar_url = CASE
          WHEN users.avatar_url IS NULL OR users.avatar_url LIKE '%googleusercontent.com%'
          THEN COALESCE(EXCLUDED.avatar_url, users.avatar_url) ELSE users.avatar_url END,
        updated_at = now()
      RETURNING id, is_banned
    `;
  } catch (e) {
    if (e && e.code === "23505") return back(res, "conflict"); // email sudah dipakai akun Google lain
    throw e;
  }
  if (!rows.length || rows[0].is_banned) return back(res, "banned");

  setSessionCookie(res, signSession(rows[0].id));
  res.redirect(302, returnTo);
});
