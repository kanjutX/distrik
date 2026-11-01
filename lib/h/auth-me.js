const { api } = require("../http");
const { getSessionUser } = require("../auth");

module.exports = api(async (req, res) => {
  var user = await getSessionUser(req);
  if (!user) return res.status(200).json({ loggedIn: false });
  res.status(200).json({
    loggedIn: true,
    id: Number(user.id),
    email: user.email,
    name: user.name,
    avatarUrl: user.avatar_url,
    robloxUsername: user.roblox_username,
    isAdmin: user.is_admin,
  });
});
