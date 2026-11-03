const crypto = require("crypto");
const { api } = require("../http");
const { setStateCookie, setSessionCookie, signSession, safeReturnTo, siteUrl } = require("../auth");

module.exports = api(async (req, res) => {
  var returnTo = safeReturnTo(typeof req.query.returnTo === "string" ? req.query.returnTo : "");
  var clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    if (process.env.VERCEL) return res.redirect(302, "/?login=unavailable");
    setSessionCookie(res, signSession(1));
    return res.redirect(302, returnTo);
  }
  var state = crypto.randomBytes(16).toString("hex");
  setStateCookie(res, state + "|" + returnTo);

  var params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: siteUrl(req) + "/api/auth/callback",
    response_type: "code",
    scope: "openid email profile",
    state: state,
    prompt: "select_account",
  });
  res.redirect(302, "https://accounts.google.com/o/oauth2/v2/auth?" + params.toString());
});
