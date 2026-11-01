const { api, bodyOf } = require("../http");
const { sql } = require("../db");
const { requireAdmin } = require("../auth");
const { KEYS, getSettings, validateSetting } = require("../settings");

module.exports = api(async (req, res) => {
  var admin = await requireAdmin(req, res);
  if (!admin) return;

  if (req.method === "GET") return res.status(200).json(await getSettings(KEYS));

  var b = bodyOf(req);
  if (KEYS.indexOf(b.key) === -1) return res.status(400).json({ error: "key tidak dikenal." });
  var v = validateSetting(b.key, b.value);
  if (v.error) return res.status(400).json({ error: v.error });

  var db = sql();
  await db`
    INSERT INTO site_settings (key, value) VALUES (${b.key}, ${JSON.stringify(v.value)}::jsonb)
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
  `;
  await db`
    INSERT INTO admin_actions (admin_user_id, action, detail)
    VALUES (${admin.id}, 'update-settings', ${JSON.stringify({ key: b.key })})
  `;
  res.status(200).json({ ok: true, value: v.value });
}, { methods: ["GET", "PUT"] });
