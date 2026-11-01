-- Distrik 17 — schema akun, title gacha, dan setting admin.
-- AMAN dijalankan berulang kali (idempotent): jalankan ulang setiap kali ada versi baru.

CREATE TABLE IF NOT EXISTS titles (
  id          BIGSERIAL PRIMARY KEY,
  text        TEXT NOT NULL,
  tier        TEXT NOT NULL CHECK (tier IN ('common','rare','epic')),
  color       TEXT NOT NULL DEFAULT '#aca696',
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id                 BIGSERIAL PRIMARY KEY,
  google_sub         TEXT NOT NULL UNIQUE,
  email              TEXT NOT NULL UNIQUE,
  name               TEXT NOT NULL,
  avatar_url         TEXT,
  roblox_username    TEXT,
  bio                TEXT NOT NULL DEFAULT '',
  active_title_id    BIGINT REFERENCES titles(id) ON DELETE SET NULL,
  rerolls_remaining  INT NOT NULL DEFAULT 30,
  is_admin           BOOLEAN NOT NULL DEFAULT FALSE,
  is_banned          BOOLEAN NOT NULL DEFAULT FALSE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_titles (
  user_id      BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title_id     BIGINT NOT NULL REFERENCES titles(id) ON DELETE CASCADE,
  unlocked_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, title_id)
);

CREATE TABLE IF NOT EXISTS site_settings (
  key    TEXT PRIMARY KEY,
  value  JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS admin_actions (
  id              BIGSERIAL PRIMARY KEY,
  admin_user_id   BIGINT NOT NULL REFERENCES users(id),
  action          TEXT NOT NULL,
  target_user_id  BIGINT REFERENCES users(id),
  detail          JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_titles_user ON user_titles(user_id);
CREATE INDEX IF NOT EXISTS idx_titles_tier_active ON titles(tier, is_active);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Setting default, boleh diubah dari panel admin nanti.
INSERT INTO site_settings (key, value) VALUES
  ('launch', '{"launchDate": "", "registrationOpen": true}'),
  ('reroll_weights', '{"common": 70, "rare": 25, "epic": 5}'),
  ('count_offset', '0')
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS announcements (
  id            BIGSERIAL PRIMARY KEY,
  title         TEXT NOT NULL,
  body          TEXT NOT NULL DEFAULT '',
  tag           TEXT NOT NULL DEFAULT 'Info',
  image_url     TEXT,
  is_published  BOOLEAN NOT NULL DEFAULT TRUE,
  published_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_announcements_pub ON announcements(is_published, published_at DESC);

-- Satu username Roblox hanya boleh dipakai satu akun (cegah klaim ganda).
CREATE UNIQUE INDEX IF NOT EXISTS uq_users_roblox ON users (lower(roblox_username)) WHERE roblox_username IS NOT NULL;

-- Starter pool title — hanya diisi kalau tabel title masih kosong. Edit lewat panel admin.
INSERT INTO titles (text, tier, color)
SELECT * FROM (VALUES
('Warga Baru', 'common', '#aca696'),
  ('Anak Gang', 'common', '#aca696'),
  ('Pejalan Kaki', 'common', '#aca696'),
  ('Penghuni Blok 17', 'common', '#aca696'),
  ('Tukang Nongkrong', 'common', '#aca696'),
  ('Pencari Ribut', 'common', '#aca696'),
  ('Kurir Gelap', 'common', '#aca696'),
  ('Penjaga Gang', 'common', '#aca696'),
  ('Anak Trotoar', 'common', '#aca696'),
  ('Warga Resmi', 'common', '#aca696'),
  ('Kepala Preman', 'rare', '#4fb0c6'),
  ('Raja Trotoar', 'rare', '#4fb0c6'),
  ('Bayangan Malam', 'rare', '#4fb0c6'),
  ('Penguasa Blok', 'rare', '#4fb0c6'),
  ('Legenda Gang', 'rare', '#4fb0c6'),
  ('Penantang Kota', 'rare', '#4fb0c6'),
  ('Warga Awal', 'epic', '#e8b23d'),
  ('Pendiri Distrik', 'epic', '#e8b23d'),
  ('Momok Kota 17', 'epic', '#e8b23d'),
  ('Legenda Abadi', 'epic', '#e8b23d')
) AS v(text, tier, color)
WHERE NOT EXISTS (SELECT 1 FROM titles);

-- Pengumuman awal — hanya kalau tabel masih kosong. Edit/hapus lewat panel admin.
INSERT INTO announcements (title, body, tag, published_at)
SELECT * FROM (VALUES
  ('Tampilan baru bergaya street', 'Menu utama, pemilihan gender, panel statistik, dan gacha identitas dirombak total: kertas, tinta, tape, dan cipratan cat. Tombol UBAH nama dirapikan, menu samping dibuat lebih jelas.', 'UI', '2026-10-20T12:00:00+07:00'::timestamptz),
  ('Pemilihan gender & kartu karakter', 'Dua kartu karakter berdampingan dengan siluet dan warna aksen masing-masing. Lebih cepat dipilih, lebih enak dilihat.', 'Fitur', '2026-10-10T12:00:00+07:00'::timestamptz),
  ('Sistem identitas & reroll', '14 kategori kustomisasi dengan peluang reroll yang ditampilkan jelas, termasuk asal suku dan nama belakang otomatis.', 'Sistem', '2026-09-15T12:00:00+07:00'::timestamptz)
) AS v(title, body, tag, published_at)
WHERE NOT EXISTS (SELECT 1 FROM announcements);


-- ===== v3.2: forum diskusi + profil publik =====
-- Pemain boleh memilih menampilkan username Roblox di profil publik (default: disembunyikan).
ALTER TABLE users ADD COLUMN IF NOT EXISTS roblox_public BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS forum_threads (
  id                BIGSERIAL PRIMARY KEY,
  user_id           BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category          TEXT NOT NULL DEFAULT 'Umum',
  title             TEXT NOT NULL CHECK (char_length(title) BETWEEN 3 AND 100),
  body              TEXT NOT NULL CHECK (char_length(body) BETWEEN 3 AND 3000),
  is_pinned         BOOLEAN NOT NULL DEFAULT FALSE,
  is_locked         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  edited_at         TIMESTAMPTZ,
  last_activity_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_forum_threads_list ON forum_threads (is_pinned DESC, last_activity_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_forum_threads_user ON forum_threads (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS forum_posts (
  id          BIGSERIAL PRIMARY KEY,
  thread_id   BIGINT NOT NULL REFERENCES forum_threads(id) ON DELETE CASCADE,
  user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body        TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 1500),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  edited_at   TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_forum_posts_thread ON forum_posts (thread_id, created_at, id);
CREATE INDEX IF NOT EXISTS idx_forum_posts_user ON forum_posts (user_id, created_at DESC);
