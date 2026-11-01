const { sql } = require("./db");

var TIERS = ["common", "rare", "epic"];

async function getRerollWeights() {
  var rows = await sql()`SELECT value FROM site_settings WHERE key = 'reroll_weights'`;
  var w = (rows[0] && rows[0].value) || { common: 70, rare: 25, epic: 5 };
  var out = { common: Number(w.common) || 0, rare: Number(w.rare) || 0, epic: Number(w.epic) || 0 };
  if (out.common + out.rare + out.epic <= 0) return { common: 70, rare: 25, epic: 5 };
  return out;
}

function rollTier(weights) {
  var total = weights.common + weights.rare + weights.epic;
  var r = Math.random() * total;
  if (r < weights.common) return "common";
  if (r < weights.common + weights.rare) return "rare";
  return "epic";
}

// Urutan tier yang dicoba: hasil lemparan dulu, lalu tier lain (berat terbesar dulu),
// supaya reroll tidak gagal hanya karena satu tier kebetulan kosong.
function tierOrder(first, weights) {
  var rest = TIERS.filter(function (t) { return t !== first && weights[t] > 0; })
    .sort(function (a, b) { return weights[b] - weights[a]; });
  return [first].concat(rest);
}

// Pilih title acak di tier tsb. Prioritaskan yang belum dimiliki user;
// kalau semuanya sudah dikoleksi, boleh dapat duplikat.
async function pickTitleForUser(userId, tier) {
  var db = sql();
  var fresh = await db`
    SELECT t.id, t.text, t.tier, t.color FROM titles t
    WHERE t.tier = ${tier} AND t.is_active = TRUE
      AND NOT EXISTS (SELECT 1 FROM user_titles ut WHERE ut.title_id = t.id AND ut.user_id = ${userId})
    ORDER BY random() LIMIT 1
  `;
  if (fresh.length) return { row: fresh[0], isNew: true };
  var any = await db`
    SELECT t.id, t.text, t.tier, t.color FROM titles t
    WHERE t.tier = ${tier} AND t.is_active = TRUE
    ORDER BY random() LIMIT 1
  `;
  if (any.length) return { row: any[0], isNew: false };
  return null;
}

async function pickWithFallback(userId, weights) {
  var order = tierOrder(rollTier(weights), weights);
  for (var i = 0; i < order.length; i++) {
    var p = await pickTitleForUser(userId, order[i]);
    if (p) return p;
  }
  return null;
}

module.exports = { getRerollWeights, rollTier, pickTitleForUser, pickWithFallback };
