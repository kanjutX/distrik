const { api } = require("../http");
const { sql } = require("../db");
const { requireUser } = require("../auth");

module.exports = api(async (req, res) => {
  var user = await requireUser(req, res);
  if (!user) return;
  var catalog = await sql()`
    SELECT id, text, tier, color,
      EXISTS (SELECT 1 FROM user_titles ut WHERE ut.title_id = titles.id AND ut.user_id = ${user.id}) AS owned
    FROM titles WHERE is_active = TRUE
    ORDER BY tier, text
  `;
  res.status(200).json({ titles: catalog, rerollsRemaining: user.rerolls_remaining });
});
