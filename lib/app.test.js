const test = require("node:test");
const assert = require("node:assert/strict");
const { validateSetting } = require("./settings");
const { parse: parseAnnouncement } = require("./announcements");
const { parseTitle, parseBody, parseCategory } = require("./forum");
const { rollTier } = require("./titles");
const { sql } = require("./db");

test("settings validation accepts valid launch and reroll_weights", () => {
  const l = validateSetting("launch", { launchDate: "2026-12-20T12:00:00Z", registrationOpen: true });
  assert.equal(Boolean(l.error), false);
  assert.equal(l.value.registrationOpen, true);

  const w = validateSetting("reroll_weights", { common: 70, rare: 25, epic: 5 });
  assert.deepEqual(w.value, { common: 70, rare: 25, epic: 5 });

  const invalidW = validateSetting("reroll_weights", { common: 0, rare: 0, epic: 0 });
  assert.ok(invalidW.error);
});

test("forum and announcement parsers validate constraints", () => {
  assert.equal(parseTitle("ab").error, "Judul 3–100 karakter.");
  assert.equal(parseTitle("Topik Baru Warga").value, "Topik Baru Warga");
  assert.equal(parseCategory("Umum").value, "Umum");
  assert.ok(parseCategory("InvalidCat").error);
  assert.equal(parseBody("Halo semua!", 3, 3000, "Isi").value, "Halo semua!");

  const ann = parseAnnouncement({ title: "Update Beta", body: "Detail baru", tag: "Info", isPublished: true }, false);
  assert.equal(ann.value.title, "Update Beta");
});

test("in-memory database returns seeded stats, announcements, threads, and titles", async () => {
  const db = sql();
  const users = await db`SELECT COUNT(*)::int AS n FROM users WHERE NOT is_banned`;
  assert.ok(users[0].n >= 3);

  const announcements = await db`
    SELECT id, title, body, tag, image_url, published_at
    FROM announcements
    WHERE is_published = TRUE AND published_at <= now()
    ORDER BY published_at DESC, id DESC LIMIT 30
  `;
  assert.equal(announcements.length, 3);

  const tier = rollTier({ common: 0, rare: 0, epic: 100 });
  assert.equal(tier, "epic");
});
