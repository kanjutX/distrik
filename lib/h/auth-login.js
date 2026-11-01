const crypto = require("crypto");
const { api } = require("../http");
const { setStateCookie, safeReturnTo, siteUrl } = require("../auth");

module.exports = api(async (req, res) => {
  var clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) return res.redirect(302, "/?login=unavailable");

  var returnTo = safeReturnTo(typeof req.query.returnTo === "string" ? req.query.returnTo : "");
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
