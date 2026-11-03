const { neon } = require("@neondatabase/serverless");

let sqlClient = null;

// In-memory store seeded from schema.sql when DATABASE_URL is not configured
const mem = {
  nextTitleId: 21,
  nextUserId: 4,
  nextAnnouncementId: 4,
  nextThreadId: 3,
  nextPostId: 3,
  nextActionId: 1,
  site_settings: {
    launch: { launchDate: "", registrationOpen: true },
    reroll_weights: { common: 70, rare: 25, epic: 5 },
    count_offset: 124,
  },
  titles: [
    { id: 1, text: "Warga Baru", tier: "common", color: "#aca696", is_active: true, created_at: "2026-09-01T00:00:00Z" },
    { id: 2, text: "Anak Gang", tier: "common", color: "#aca696", is_active: true, created_at: "2026-09-01T00:00:00Z" },
    { id: 3, text: "Pejalan Kaki", tier: "common", color: "#aca696", is_active: true, created_at: "2026-09-01T00:00:00Z" },
    { id: 4, text: "Penghuni Blok 17", tier: "common", color: "#aca696", is_active: true, created_at: "2026-09-01T00:00:00Z" },
    { id: 5, text: "Tukang Nongkrong", tier: "common", color: "#aca696", is_active: true, created_at: "2026-09-01T00:00:00Z" },
    { id: 6, text: "Pencari Ribut", tier: "common", color: "#aca696", is_active: true, created_at: "2026-09-01T00:00:00Z" },
    { id: 7, text: "Kurir Gelap", tier: "common", color: "#aca696", is_active: true, created_at: "2026-09-01T00:00:00Z" },
    { id: 8, text: "Penjaga Gang", tier: "common", color: "#aca696", is_active: true, created_at: "2026-09-01T00:00:00Z" },
    { id: 9, text: "Anak Trotoar", tier: "common", color: "#aca696", is_active: true, created_at: "2026-09-01T00:00:00Z" },
    { id: 10, text: "Warga Resmi", tier: "common", color: "#aca696", is_active: true, created_at: "2026-09-01T00:00:00Z" },
    { id: 11, text: "Kepala Preman", tier: "rare", color: "#4fb0c6", is_active: true, created_at: "2026-09-01T00:00:00Z" },
    { id: 12, text: "Raja Trotoar", tier: "rare", color: "#4fb0c6", is_active: true, created_at: "2026-09-01T00:00:00Z" },
    { id: 13, text: "Bayangan Malam", tier: "rare", color: "#4fb0c6", is_active: true, created_at: "2026-09-01T00:00:00Z" },
    { id: 14, text: "Penguasa Blok", tier: "rare", color: "#4fb0c6", is_active: true, created_at: "2026-09-01T00:00:00Z" },
    { id: 15, text: "Legenda Gang", tier: "rare", color: "#4fb0c6", is_active: true, created_at: "2026-09-01T00:00:00Z" },
    { id: 16, text: "Penantang Kota", tier: "rare", color: "#4fb0c6", is_active: true, created_at: "2026-09-01T00:00:00Z" },
    { id: 17, text: "Warga Awal", tier: "epic", color: "#e8b23d", is_active: true, created_at: "2026-09-01T00:00:00Z" },
    { id: 18, text: "Pendiri Distrik", tier: "epic", color: "#e8b23d", is_active: true, created_at: "2026-09-01T00:00:00Z" },
    { id: 19, text: "Momok Kota 17", tier: "epic", color: "#e8b23d", is_active: true, created_at: "2026-09-01T00:00:00Z" },
    { id: 20, text: "Legenda Abadi", tier: "epic", color: "#e8b23d", is_active: true, created_at: "2026-09-01T00:00:00Z" },
  ],
  users: [
    {
      id: 1,
      google_sub: "demo-admin-sub",
      email: "kanjutxr@gmail.com",
      name: "Ujang Pratama",
      avatar_url: "/assets/favicon.png",
      roblox_username: "UjangPratama17",
      roblox_public: true,
      bio: "Penghuni asli Distrik 17 sejak hari pertama.",
      active_title_id: 17,
      rerolls_remaining: 30,
      is_admin: true,
      is_banned: false,
      created_at: "2026-10-01T08:00:00Z",
      updated_at: "2026-10-01T08:00:00Z",
    },
    {
      id: 2,
      google_sub: "demo-user-2",
      email: "raka@distrik17.id",
      name: "Raka Wijaya",
      avatar_url: "/assets/favicon.png",
      roblox_username: "RakaStreet99",
      roblox_public: true,
      bio: "Siap meramaikan beta tertutup!",
      active_title_id: 11,
      rerolls_remaining: 25,
      is_admin: false,
      is_banned: false,
      created_at: "2026-10-12T10:30:00Z",
      updated_at: "2026-10-12T10:30:00Z",
    },
    {
      id: 3,
      google_sub: "demo-user-3",
      email: "nadia@distrik17.id",
      name: "Nadia Kusuma",
      avatar_url: "/assets/favicon.png",
      roblox_username: "NadiaBlok17",
      roblox_public: false,
      bio: "Pemburu title epik.",
      active_title_id: 2,
      rerolls_remaining: 28,
      is_admin: false,
      is_banned: false,
      created_at: "2026-10-18T14:15:00Z",
      updated_at: "2026-10-18T14:15:00Z",
    },
  ],
  user_titles: [
    { user_id: 1, title_id: 17, unlocked_at: "2026-10-01T08:05:00Z" },
    { user_id: 1, title_id: 11, unlocked_at: "2026-10-01T08:02:00Z" },
    { user_id: 1, title_id: 1, unlocked_at: "2026-10-01T08:00:00Z" },
    { user_id: 2, title_id: 11, unlocked_at: "2026-10-12T10:35:00Z" },
    { user_id: 3, title_id: 2, unlocked_at: "2026-10-18T14:20:00Z" },
  ],
  announcements: [
    {
      id: 1,
      title: "Tampilan baru bergaya street",
      body: "Menu utama, pemilihan gender, panel statistik, dan gacha identitas dirombak total: kertas, tinta, tape, dan cipratan cat. Tombol UBAH nama dirapikan, menu samping dibuat lebih jelas.",
      tag: "UI",
      image_url: null,
      is_published: true,
      published_at: "2026-10-20T05:00:00.000Z",
      created_at: "2026-10-20T05:00:00.000Z",
      updated_at: "2026-10-20T05:00:00.000Z",
    },
    {
      id: 2,
      title: "Pemilihan gender & kartu karakter",
      body: "Dua kartu karakter berdampingan dengan siluet dan warna aksen masing-masing. Lebih cepat dipilih, lebih enak dilihat.",
      tag: "Fitur",
      image_url: null,
      is_published: true,
      published_at: "2026-10-10T05:00:00.000Z",
      created_at: "2026-10-10T05:00:00.000Z",
      updated_at: "2026-10-10T05:00:00.000Z",
    },
    {
      id: 3,
      title: "Sistem identitas & reroll",
      body: "14 kategori kustomisasi dengan peluang reroll yang ditampilkan jelas, termasuk asal suku dan nama belakang otomatis.",
      tag: "Sistem",
      image_url: null,
      is_published: true,
      published_at: "2026-09-15T05:00:00.000Z",
      created_at: "2026-09-15T05:00:00.000Z",
      updated_at: "2026-09-15T05:00:00.000Z",
    },
  ],
  forum_threads: [
    {
      id: 1,
      user_id: 1,
      category: "Umum",
      title: "Selamat datang di Forum Warga Distrik 17!",
      body: "Halo warga! Gunakan forum ini untuk kenalan, diskusi mekanik combat, atau kasih masukan sebelum beta tertutup dibuka.",
      is_pinned: true,
      is_locked: false,
      created_at: "2026-10-21T09:00:00.000Z",
      edited_at: null,
      last_activity_at: "2026-10-22T11:30:00.000Z",
    },
    {
      id: 2,
      user_id: 2,
      category: "Saran",
      title: "Ide kostum jaket angkatan & aksesoris jalanan",
      body: "Bakal keren banget kalau ada kustomisasi jaket denim sobek atau helm retro buat nongkrong di gang.",
      is_pinned: false,
      is_locked: false,
      created_at: "2026-10-22T10:00:00.000Z",
      edited_at: null,
      last_activity_at: "2026-10-22T12:00:00.000Z",
    },
  ],
  forum_posts: [
    {
      id: 1,
      thread_id: 1,
      user_id: 2,
      body: "Hadir boss! Udah daftar dan dapet title Kepala Preman.",
      created_at: "2026-10-22T11:30:00.000Z",
      edited_at: null,
    },
    {
      id: 2,
      thread_id: 2,
      user_id: 3,
      body: "Setuju! Tambahin juga aksesoris tas selempang lokal.",
      created_at: "2026-10-22T12:00:00.000Z",
      edited_at: null,
    },
  ],
  admin_actions: [],
};

function findTitle(id) {
  if (!id) return null;
  return mem.titles.find((t) => Number(t.id) === Number(id)) || null;
}

function findUser(id) {
  return mem.users.find((u) => Number(u.id) === Number(id)) || null;
}

function matchLike(val, pattern) {
  if (!val) return false;
  const raw = String(pattern || "").replace(/^%|%$/g, "").replace(/\\([%_\\])/g, "$1").toLowerCase();
  return String(val).toLowerCase().includes(raw);
}

async function mockSql(strings, ...values) {
  const q = strings.join(" $ ").replace(/\s+/g, " ").trim();

  // 1. pub-stats: SELECT COUNT(*)::int AS n FROM users WHERE NOT is_banned
  if (/SELECT COUNT\(\*\)::int AS n FROM users WHERE NOT is_banned/i.test(q)) {
    const n = mem.users.filter((u) => !u.is_banned).length;
    return [{ n }];
  }

  // 2. site_settings queries
  if (/SELECT value FROM site_settings WHERE key = 'count_offset'/i.test(q)) {
    return mem.site_settings.count_offset !== undefined ? [{ value: mem.site_settings.count_offset }] : [];
  }
  if (/SELECT value FROM site_settings WHERE key = 'reroll_weights'/i.test(q)) {
    return mem.site_settings.reroll_weights !== undefined ? [{ value: mem.site_settings.reroll_weights }] : [];
  }
  if (/SELECT key, value FROM site_settings WHERE key = ANY/i.test(q)) {
    const keys = Array.isArray(values[0]) ? values[0] : [];
    return keys
      .filter((k) => mem.site_settings[k] !== undefined)
      .map((k) => ({ key: k, value: mem.site_settings[k] }));
  }
  if (/INSERT INTO site_settings/i.test(q)) {
    const key = values[0];
    let val = values[1];
    if (typeof val === "string") {
      try { val = JSON.parse(val); } catch (e) {}
    }
    mem.site_settings[key] = val;
    return [];
  }

  // 3. announcements queries
  if (/FROM announcements WHERE is_published = TRUE/i.test(q)) {
    const now = Date.now();
    return mem.announcements
      .filter((a) => a.is_published && new Date(a.published_at).getTime() <= now)
      .sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime() || b.id - a.id)
      .slice(0, 30)
      .map((a) => ({ ...a }));
  }
  if (/FROM announcements ORDER BY published_at DESC/i.test(q)) {
    return mem.announcements
      .slice()
      .sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime() || b.id - a.id)
      .slice(0, 200)
      .map((a) => ({ ...a }));
  }
  if (/SELECT id, image_url FROM announcements WHERE id =/i.test(q)) {
    const id = Number(values[0]);
    const a = mem.announcements.find((x) => Number(x.id) === id);
    return a ? [{ id: a.id, image_url: a.image_url }] : [];
  }
  if (/INSERT INTO announcements/i.test(q)) {
    const [title, body, tag, image_url, is_published, published_at] = values;
    const nowIso = new Date().toISOString();
    const row = {
      id: mem.nextAnnouncementId++,
      title,
      body,
      tag,
      image_url: image_url || null,
      is_published: Boolean(is_published),
      published_at: published_at || nowIso,
      created_at: nowIso,
      updated_at: nowIso,
    };
    mem.announcements.push(row);
    return [{ id: row.id }];
  }
  if (/DELETE FROM announcements WHERE id =/i.test(q)) {
    const id = Number(values[0]);
    mem.announcements = mem.announcements.filter((x) => Number(x.id) !== id);
    return [];
  }
  if (/UPDATE announcements SET/i.test(q)) {
    const [title, body, tag, is_published, published_at, imageChanged, newImage, id] = values;
    const a = mem.announcements.find((x) => Number(x.id) === Number(id));
    if (a) {
      if (title !== null && title !== undefined) a.title = title;
      if (body !== null && body !== undefined) a.body = body;
      if (tag !== null && tag !== undefined) a.tag = tag;
      if (is_published !== null && is_published !== undefined) a.is_published = Boolean(is_published);
      if (published_at !== null && published_at !== undefined) a.published_at = published_at;
      if (imageChanged) a.image_url = newImage || null;
      a.updated_at = new Date().toISOString();
    }
    return [];
  }

  // 4. auth & user queries
  if (/SELECT id, email, name, avatar_url, roblox_username, bio, active_title_id, rerolls_remaining, is_admin, is_banned FROM users WHERE id =/i.test(q)) {
    const u = findUser(values[0]);
    return u ? [{ ...u }] : [];
  }
  if (/SELECT id, is_banned FROM users WHERE google_sub =/i.test(q)) {
    const u = mem.users.find((x) => x.google_sub === values[0]);
    return u ? [{ id: u.id, is_banned: u.is_banned }] : [];
  }
  if (/INSERT INTO users \(google_sub, email, name, avatar_url, is_admin, rerolls_remaining\)/i.test(q)) {
    const [sub, email, name, avatar, promote] = values;
    let u = mem.users.find((x) => x.google_sub === sub);
    if (u) {
      u.is_admin = Boolean(u.is_admin || promote);
      if (!u.avatar_url || String(u.avatar_url).includes("googleusercontent.com")) {
        u.avatar_url = avatar || u.avatar_url;
      }
      u.updated_at = new Date().toISOString();
      return [{ id: u.id, is_banned: u.is_banned }];
    }
    const emailConflict = mem.users.find((x) => x.email.toLowerCase() === String(email).toLowerCase());
    if (emailConflict) {
      const err = new Error("Duplicate email");
      err.code = "23505";
      throw err;
    }
    const nowIso = new Date().toISOString();
    u = {
      id: mem.nextUserId++,
      google_sub: sub,
      email,
      name,
      avatar_url: avatar,
      roblox_username: null,
      roblox_public: false,
      bio: "",
      active_title_id: null,
      rerolls_remaining: 30,
      is_admin: Boolean(promote),
      is_banned: false,
      created_at: nowIso,
      updated_at: nowIso,
    };
    mem.users.push(u);
    return [{ id: u.id, is_banned: u.is_banned }];
  }
  if (/SELECT roblox_public FROM users WHERE id =/i.test(q)) {
    const u = findUser(values[0]);
    return u ? [{ roblox_public: Boolean(u.roblox_public) }] : [];
  }
  if (/UPDATE users SET name = COALESCE/i.test(q)) {
    const [name, roblox, roblox2, bio, robloxPublic, id] = values;
    const u = findUser(id);
    if (u) {
      if (roblox !== null && roblox !== undefined && roblox !== "") {
        const dupe = mem.users.find(
          (x) => Number(x.id) !== Number(id) && x.roblox_username && x.roblox_username.toLowerCase() === String(roblox).toLowerCase()
        );
        if (dupe) {
          const err = new Error("Duplicate roblox_username");
          err.code = "23505";
          throw err;
        }
      }
      if (name !== null && name !== undefined) u.name = name;
      if (roblox !== null && roblox !== undefined) u.roblox_username = roblox === "" ? null : roblox;
      if (bio !== null && bio !== undefined) u.bio = bio;
      if (robloxPublic !== null && robloxPublic !== undefined) u.roblox_public = Boolean(robloxPublic);
      u.updated_at = new Date().toISOString();
    }
    return [];
  }
  if (/UPDATE users SET avatar_url =/i.test(q)) {
    const [url, id] = values;
    const u = findUser(id);
    if (u) {
      u.avatar_url = url;
      u.updated_at = new Date().toISOString();
    }
    return [];
  }
  if (/UPDATE users SET rerolls_remaining = rerolls_remaining - 1/i.test(q)) {
    const u = findUser(values[0]);
    if (!u || u.rerolls_remaining <= 0) return [];
    u.rerolls_remaining -= 1;
    u.updated_at = new Date().toISOString();
    return [{ rerolls_remaining: u.rerolls_remaining }];
  }
  if (/UPDATE users SET rerolls_remaining = rerolls_remaining \+ 1/i.test(q)) {
    const u = findUser(values[0]);
    if (u) u.rerolls_remaining += 1;
    return [];
  }
  if (/UPDATE users SET active_title_id =/i.test(q)) {
    const [titleId, uid] = values;
    const u = findUser(uid);
    if (u) {
      u.active_title_id = Number(titleId);
      u.updated_at = new Date().toISOString();
    }
    return [];
  }

  // 5. titles & user_titles queries
  if (/SELECT t\.id, t\.text, t\.tier, t\.color FROM user_titles ut JOIN titles t ON t\.id = ut\.title_id WHERE ut\.user_id =/i.test(q)) {
    const uid = Number(values[0]);
    return mem.user_titles
      .filter((ut) => Number(ut.user_id) === uid)
      .sort((a, b) => new Date(b.unlocked_at).getTime() - new Date(a.unlocked_at).getTime())
      .map((ut) => findTitle(ut.title_id))
      .filter(Boolean)
      .map((t) => ({ id: t.id, text: t.text, tier: t.tier, color: t.color }));
  }
  if (/SELECT t\.id, t\.text, t\.tier FROM user_titles ut JOIN titles t ON t\.id = ut\.title_id WHERE ut\.user_id =/i.test(q)) {
    const uid = Number(values[0]);
    const rank = { epic: 0, rare: 1, common: 2 };
    return mem.user_titles
      .filter((ut) => Number(ut.user_id) === uid)
      .map((ut) => ({ ut, t: findTitle(ut.title_id) }))
      .filter((x) => x.t)
      .sort((a, b) => (rank[a.t.tier] ?? 2) - (rank[b.t.tier] ?? 2) || new Date(b.ut.unlocked_at).getTime() - new Date(a.ut.unlocked_at).getTime())
      .map((x) => ({ id: x.t.id, text: x.t.text, tier: x.t.tier }));
  }
  if (/SELECT id, text, tier, color FROM titles WHERE id =/i.test(q)) {
    const t = findTitle(values[0]);
    return t ? [{ id: t.id, text: t.text, tier: t.tier, color: t.color }] : [];
  }
  if (/SELECT text, tier FROM titles WHERE id =/i.test(q)) {
    const t = findTitle(values[0]);
    return t ? [{ text: t.text, tier: t.tier }] : [];
  }
  if (/FROM titles t WHERE t\.tier = .* AND NOT EXISTS/i.test(q)) {
    const [tier, uid] = values;
    const ownedSet = new Set(
      mem.user_titles.filter((ut) => Number(ut.user_id) === Number(uid)).map((ut) => Number(ut.title_id))
    );
    const pool = mem.titles.filter((t) => t.tier === tier && t.is_active && !ownedSet.has(Number(t.id)));
    if (!pool.length) return [];
    const pick = pool[Math.floor(Math.random() * pool.length)];
    return [{ id: pick.id, text: pick.text, tier: pick.tier, color: pick.color }];
  }
  if (/FROM titles t WHERE t\.tier = .* AND t\.is_active = TRUE ORDER BY random\(\)/i.test(q)) {
    const [tier] = values;
    const pool = mem.titles.filter((t) => t.tier === tier && t.is_active);
    if (!pool.length) return [];
    const pick = pool[Math.floor(Math.random() * pool.length)];
    return [{ id: pick.id, text: pick.text, tier: pick.tier, color: pick.color }];
  }
  if (/FROM titles WHERE is_active = TRUE ORDER BY tier, text/i.test(q)) {
    const uid = Number(values[0]);
    const ownedSet = new Set(
      mem.user_titles.filter((ut) => Number(ut.user_id) === uid).map((ut) => Number(ut.title_id))
    );
    return mem.titles
      .filter((t) => t.is_active)
      .slice()
      .sort((a, b) => a.tier.localeCompare(b.tier) || a.text.localeCompare(b.text))
      .map((t) => ({ id: t.id, text: t.text, tier: t.tier, color: t.color, owned: ownedSet.has(Number(t.id)) }));
  }
  if (/INSERT INTO user_titles/i.test(q)) {
    const [uid, tid] = values;
    const exists = mem.user_titles.some((ut) => Number(ut.user_id) === Number(uid) && Number(ut.title_id) === Number(tid));
    if (!exists) {
      mem.user_titles.push({ user_id: Number(uid), title_id: Number(tid), unlocked_at: new Date().toISOString() });
    }
    return [];
  }
  if (/SELECT 1 FROM user_titles WHERE user_id =/i.test(q)) {
    const [uid, tid] = values;
    const exists = mem.user_titles.some((ut) => Number(ut.user_id) === Number(uid) && Number(ut.title_id) === Number(tid));
    return exists ? [{ "?column?": 1 }] : [];
  }
  if (/FROM titles t ORDER BY t\.tier, t\.text/i.test(q)) {
    return mem.titles
      .slice()
      .sort((a, b) => a.tier.localeCompare(b.tier) || a.text.localeCompare(b.text))
      .map((t) => ({
        id: t.id,
        text: t.text,
        tier: t.tier,
        color: t.color,
        is_active: t.is_active,
        owners: mem.user_titles.filter((ut) => Number(ut.title_id) === Number(t.id)).length,
      }));
  }
  if (/SELECT 1 FROM titles WHERE lower\(text\) = lower/i.test(q)) {
    const text = String(values[0] || "").toLowerCase();
    return mem.titles.some((t) => t.text.toLowerCase() === text) ? [{ "?column?": 1 }] : [];
  }
  if (/INSERT INTO titles \(text, tier, color\)/i.test(q)) {
    const [text, tier, color] = values;
    const row = { id: mem.nextTitleId++, text, tier, color, is_active: true, created_at: new Date().toISOString() };
    mem.titles.push(row);
    return [{ id: row.id, text: row.text, tier: row.tier, color: row.color, is_active: row.is_active }];
  }
  if (/DELETE FROM titles WHERE id =/i.test(q)) {
    const id = Number(values[0]);
    const idx = mem.titles.findIndex((t) => Number(t.id) === id);
    if (idx === -1) return [];
    mem.titles.splice(idx, 1);
    mem.user_titles = mem.user_titles.filter((ut) => Number(ut.title_id) !== id);
    mem.users.forEach((u) => { if (Number(u.active_title_id) === id) u.active_title_id = null; });
    return [{ id }];
  }
  if (/UPDATE titles SET/i.test(q)) {
    const [text, tier, color, isActive, id] = values;
    const t = findTitle(id);
    if (!t) return [];
    if (text !== null && text !== undefined) t.text = text;
    if (tier !== null && tier !== undefined) t.tier = tier;
    if (color !== null && color !== undefined) t.color = color;
    if (isActive !== null && isActive !== undefined) t.is_active = Boolean(isActive);
    return [{ id: t.id }];
  }

  // 6. members directory & public profile
  if (/FROM users u LEFT JOIN titles ti ON ti\.id = u\.active_title_id WHERE NOT u\.is_banned AND/i.test(q)) {
    const [qStr, like1, like2, limit, offset] = values;
    return mem.users
      .filter((u) => !u.is_banned && (qStr === "" || matchLike(u.name, like1) || (u.roblox_public && matchLike(u.roblox_username, like2))))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime() || b.id - a.id)
      .slice(Number(offset), Number(offset) + Number(limit))
      .map((u) => {
        const ti = findTitle(u.active_title_id);
        return {
          uid: u.id,
          name: u.name,
          avatar_url: u.avatar_url,
          is_admin: u.is_admin,
          title_text: ti ? ti.text : null,
          title_tier: ti ? ti.tier : null,
        };
      });
  }
  if (/FROM users u LEFT JOIN titles ti ON ti\.id = u\.active_title_id WHERE u\.id =/i.test(q)) {
    const u = findUser(values[0]);
    if (!u || u.is_banned) return [];
    const ti = findTitle(u.active_title_id);
    return [{
      uid: u.id,
      name: u.name,
      avatar_url: u.avatar_url,
      bio: u.bio,
      is_admin: u.is_admin,
      created_at: u.created_at,
      roblox_username: u.roblox_username,
      roblox_public: u.roblox_public,
      title_text: ti ? ti.text : null,
      title_tier: ti ? ti.tier : null,
    }];
  }
  if (/SELECT \(SELECT COUNT\(\*\)::int FROM forum_threads WHERE user_id =/i.test(q)) {
    const uid = Number(values[0]);
    return [{
      threads: mem.forum_threads.filter((t) => Number(t.user_id) === uid).length,
      posts: mem.forum_posts.filter((p) => Number(p.user_id) === uid).length,
    }];
  }
  if (/SELECT id, title, category, created_at FROM forum_threads WHERE user_id =/i.test(q)) {
    const uid = Number(values[0]);
    return mem.forum_threads
      .filter((t) => Number(t.user_id) === uid)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5)
      .map((t) => ({ id: t.id, title: t.title, category: t.category, created_at: t.created_at }));
  }

  // 7. forum queries
  if (/FROM forum_threads t JOIN users u ON u\.id = t\.user_id AND NOT u\.is_banned LEFT JOIN titles ti ON ti\.id = u\.active_title_id WHERE \(\s*\$ ::text IS NULL/i.test(q)) {
    const [cat, , limit, offset] = values;
    return mem.forum_threads
      .filter((t) => {
        const u = findUser(t.user_id);
        if (!u || u.is_banned) return false;
        if (cat !== null && cat !== undefined && t.category !== cat) return false;
        return true;
      })
      .sort((a, b) => Number(b.is_pinned) - Number(a.is_pinned) || new Date(b.last_activity_at).getTime() - new Date(a.last_activity_at).getTime() || b.id - a.id)
      .slice(Number(offset), Number(offset) + Number(limit))
      .map((t) => {
        const u = findUser(t.user_id);
        const ti = findTitle(u.active_title_id);
        const replies = mem.forum_posts.filter((p) => {
          const pu = findUser(p.user_id);
          return Number(p.thread_id) === Number(t.id) && pu && !pu.is_banned;
        }).length;
        return {
          id: t.id,
          title: t.title,
          category: t.category,
          is_pinned: t.is_pinned,
          is_locked: t.is_locked,
          created_at: t.created_at,
          last_activity_at: t.last_activity_at,
          uid: u.id,
          name: u.name,
          avatar_url: u.avatar_url,
          is_admin: u.is_admin,
          title_text: ti ? ti.text : null,
          title_tier: ti ? ti.tier : null,
          replies,
        };
      });
  }
  if (/SELECT 1 FROM forum_threads WHERE user_id =/i.test(q)) {
    const [uid, title, body] = values;
    const cutoff = Date.now() - 3600 * 1000;
    const dupe = mem.forum_threads.some(
      (t) => Number(t.user_id) === Number(uid) && t.title === title && t.body === body && new Date(t.created_at).getTime() > cutoff
    );
    return dupe ? [{ "?column?": 1 }] : [];
  }
  if (/INSERT INTO forum_threads \(user_id, category, title, body\)/i.test(q)) {
    const [uid, category, title, body] = values;
    const nowIso = new Date().toISOString();
    const row = {
      id: mem.nextThreadId++,
      user_id: Number(uid),
      category,
      title,
      body,
      is_pinned: false,
      is_locked: false,
      created_at: nowIso,
      edited_at: null,
      last_activity_at: nowIso,
    };
    mem.forum_threads.push(row);
    return [{ id: row.id }];
  }
  if (/FROM forum_threads t JOIN users u ON u\.id = t\.user_id AND NOT u\.is_banned LEFT JOIN titles ti ON ti\.id = u\.active_title_id WHERE t\.id =/i.test(q)) {
    const id = Number(values[0]);
    const t = mem.forum_threads.find((x) => Number(x.id) === id);
    if (!t) return [];
    const u = findUser(t.user_id);
    if (!u || u.is_banned) return [];
    const ti = findTitle(u.active_title_id);
    return [{
      id: t.id,
      category: t.category,
      title: t.title,
      body: t.body,
      is_pinned: t.is_pinned,
      is_locked: t.is_locked,
      created_at: t.created_at,
      edited_at: t.edited_at,
      uid: u.id,
      name: u.name,
      avatar_url: u.avatar_url,
      is_admin: u.is_admin,
      title_text: ti ? ti.text : null,
      title_tier: ti ? ti.tier : null,
    }];
  }
  if (/FROM forum_posts p JOIN users u ON u\.id = p\.user_id AND NOT u\.is_banned LEFT JOIN titles ti ON ti\.id = u\.active_title_id WHERE p\.thread_id =/i.test(q)) {
    const [tid, limit, offset] = values;
    return mem.forum_posts
      .filter((p) => {
        const u = findUser(p.user_id);
        return Number(p.thread_id) === Number(tid) && u && !u.is_banned;
      })
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime() || a.id - b.id)
      .slice(Number(offset), Number(offset) + Number(limit))
      .map((p) => {
        const u = findUser(p.user_id);
        const ti = findTitle(u.active_title_id);
        return {
          id: p.id,
          body: p.body,
          created_at: p.created_at,
          edited_at: p.edited_at,
          uid: u.id,
          name: u.name,
          avatar_url: u.avatar_url,
          is_admin: u.is_admin,
          title_text: ti ? ti.text : null,
          title_tier: ti ? ti.tier : null,
        };
      });
  }
  if (/SELECT COUNT\(\*\)::int AS n FROM forum_posts p JOIN users u ON u\.id = p\.user_id AND NOT u\.is_banned WHERE p\.thread_id =/i.test(q)) {
    const tid = Number(values[0]);
    const n = mem.forum_posts.filter((p) => {
      const u = findUser(p.user_id);
      return Number(p.thread_id) === tid && u && !u.is_banned;
    }).length;
    return [{ n }];
  }
  if (/SELECT id, user_id, is_locked FROM forum_threads WHERE id =/i.test(q)) {
    const t = mem.forum_threads.find((x) => Number(x.id) === Number(values[0]));
    return t ? [{ id: t.id, user_id: t.user_id, is_locked: t.is_locked }] : [];
  }
  if (/DELETE FROM forum_threads WHERE id =/i.test(q)) {
    const id = Number(values[0]);
    mem.forum_threads = mem.forum_threads.filter((x) => Number(x.id) !== id);
    mem.forum_posts = mem.forum_posts.filter((x) => Number(x.thread_id) !== id);
    return [];
  }
  if (/UPDATE forum_threads SET title = COALESCE/i.test(q)) {
    const [title, body, category, pinned, locked, wantsEdit, id] = values;
    const t = mem.forum_threads.find((x) => Number(x.id) === Number(id));
    if (t) {
      if (title !== null && title !== undefined) t.title = title;
      if (body !== null && body !== undefined) t.body = body;
      if (category !== null && category !== undefined) t.category = category;
      if (pinned !== null && pinned !== undefined) t.is_pinned = Boolean(pinned);
      if (locked !== null && locked !== undefined) t.is_locked = Boolean(locked);
      if (wantsEdit) t.edited_at = new Date().toISOString();
    }
    return [];
  }
  if (/SELECT t\.id, t\.is_locked, \(SELECT COUNT\(\*\)::int FROM forum_posts WHERE thread_id = t\.id\) AS n/i.test(q)) {
    const id = Number(values[0]);
    const t = mem.forum_threads.find((x) => Number(x.id) === id);
    if (!t) return [];
    const u = findUser(t.user_id);
    if (!u || u.is_banned) return [];
    const n = mem.forum_posts.filter((p) => Number(p.thread_id) === id).length;
    return [{ id: t.id, is_locked: t.is_locked, n }];
  }
  if (/SELECT 1 FROM forum_posts WHERE user_id =/i.test(q)) {
    const [uid, tid, body] = values;
    const cutoff = Date.now() - 120 * 1000;
    const dupe = mem.forum_posts.some(
      (p) => Number(p.user_id) === Number(uid) && Number(p.thread_id) === Number(tid) && p.body === body && new Date(p.created_at).getTime() > cutoff
    );
    return dupe ? [{ "?column?": 1 }] : [];
  }
  if (/INSERT INTO forum_posts \(thread_id, user_id, body\)/i.test(q)) {
    const [tid, uid, body] = values;
    const nowIso = new Date().toISOString();
    const row = { id: mem.nextPostId++, thread_id: Number(tid), user_id: Number(uid), body, created_at: nowIso, edited_at: null };
    mem.forum_posts.push(row);
    return [{ id: row.id, created_at: row.created_at }];
  }
  if (/UPDATE forum_threads SET last_activity_at = now\(\) WHERE id =/i.test(q)) {
    const t = mem.forum_threads.find((x) => Number(x.id) === Number(values[0]));
    if (t) t.last_activity_at = new Date().toISOString();
    return [];
  }
  if (/SELECT p\.id, p\.user_id, p\.thread_id, t\.is_locked FROM forum_posts p/i.test(q)) {
    const p = mem.forum_posts.find((x) => Number(x.id) === Number(values[0]));
    if (!p) return [];
    const t = mem.forum_threads.find((x) => Number(x.id) === Number(p.thread_id));
    if (!t) return [];
    return [{ id: p.id, user_id: p.user_id, thread_id: p.thread_id, is_locked: t.is_locked }];
  }
  if (/DELETE FROM forum_posts WHERE id =/i.test(q)) {
    const id = Number(values[0]);
    mem.forum_posts = mem.forum_posts.filter((x) => Number(x.id) !== id);
    return [];
  }
  if (/UPDATE forum_posts SET body =/i.test(q)) {
    const [body, id] = values;
    const p = mem.forum_posts.find((x) => Number(x.id) === Number(id));
    if (p) {
      p.body = body;
      p.edited_at = new Date().toISOString();
    }
    return [];
  }

  // 8. admin users & actions
  if (/SELECT id, email, name, roblox_username, rerolls_remaining, is_admin, is_banned, created_at FROM users/i.test(q)) {
    const [qStr, like1, like2, like3, limit, offset] = values;
    return mem.users
      .filter((u) => qStr === "" || matchLike(u.email, like1) || matchLike(u.name, like2) || matchLike(u.roblox_username, like3))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime() || b.id - a.id)
      .slice(Number(offset), Number(offset) + Number(limit))
      .map((u) => ({ ...u }));
  }
  if (/SELECT COUNT\(\*\)::int AS total, COUNT\(\*\) FILTER \(WHERE is_banned\)::int AS banned/i.test(q)) {
    return [{
      total: mem.users.length,
      banned: mem.users.filter((u) => u.is_banned).length,
      admins: mem.users.filter((u) => u.is_admin).length,
    }];
  }
  if (/SELECT id FROM users WHERE id =/i.test(q)) {
    const u = findUser(values[0]);
    return u ? [{ id: u.id }] : [];
  }
  if (/UPDATE users SET rerolls_remaining = GREATEST/i.test(q)) {
    const [amount, targetId] = values;
    const u = findUser(targetId);
    if (u) {
      u.rerolls_remaining = Math.max(0, u.rerolls_remaining + Number(amount));
      u.updated_at = new Date().toISOString();
    }
    return [];
  }
  if (/UPDATE users SET is_banned =/i.test(q)) {
    const [banned, targetId] = values;
    const u = findUser(targetId);
    if (u) {
      u.is_banned = Boolean(banned);
      u.updated_at = new Date().toISOString();
    }
    return [];
  }
  if (/UPDATE users SET is_admin =/i.test(q)) {
    const [isAdmin, targetId] = values;
    const u = findUser(targetId);
    if (u) {
      u.is_admin = Boolean(isAdmin);
      u.updated_at = new Date().toISOString();
    }
    return [];
  }
  if (/INSERT INTO admin_actions/i.test(q)) {
    mem.admin_actions.push({ id: mem.nextActionId++, values, created_at: new Date().toISOString() });
    return [];
  }

  return [];
}

function sql() {
  if (!sqlClient) {
    const url = process.env.DATABASE_URL;
    if (url) {
      sqlClient = neon(url);
    } else {
      sqlClient = mockSql;
    }
  }
  return sqlClient;
}

module.exports = { sql, _mem: mem };
