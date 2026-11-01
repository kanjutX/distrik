# Distrik 17 — Website Pre-Register (v3.2)

Situs statis (`public/`) + serverless API (`api/`, `lib/`) di Vercel. Database Neon (Postgres), login Google, foto di Vercel Blob. Tanpa build step.

```
public/   halaman & aset statis (index, profile, admin, css, js)
api/      7 Serverless Function (dispatcher) — muat di batas 12 function plan Hobby
lib/h/    isi semua endpoint (tidak dihitung sebagai function)
lib/      kode bersama (db, auth, validasi, blob)
schema.sql  skema database (aman dijalankan berulang)
```

## Deploy dari nol (±15 menit)

### 1. Push ke GitHub → import ke Vercel
Push folder ini ke repo GitHub. Di vercel.com: **Add New → Project** → pilih repo. Framework: **Other**. Build/Output biarkan (sudah diatur `vercel.json`). Klik **Deploy** (deploy pertama boleh error login dulu, normal).

### 2. Database (Neon) → hubungkan ke Vercel
1. Project Vercel → tab **Storage → Create Database → Neon** → beri nama → **Connect to Project** (centang semua environment). Ini otomatis menambah env `DATABASE_URL`.
2. Buka **Open in Neon Console → SQL Editor**, tempel seluruh isi `schema.sql`, klik **Run**. 
   *Update dari versi lama? Jalankan ulang `schema.sql` utuh — aman, data lama tidak hilang.*

### 3. Blob (foto profil & gambar pengumuman)
Tab **Storage → Create Database → Blob → Connect to Project**. Otomatis menambah `BLOB_READ_WRITE_TOKEN`.

### 4. Google OAuth
1. [console.cloud.google.com](https://console.cloud.google.com) → buat project → **APIs & Services → OAuth consent screen** (External; isi nama app & email; tambah emailmu sebagai Test user bila masih Testing; **Publish app** agar semua orang bisa login).
2. **Credentials → Create Credentials → OAuth client ID → Web application**.
3. **Authorized redirect URIs**: `https://DOMAINMU/api/auth/callback` (pakai domain Vercel/custom yang dipakai pengunjung; boleh banyak).
4. Simpan **Client ID** dan **Client Secret**.

### 5. Environment Variables (Project → Settings → Environment Variables)
| Nama | Isi |
|---|---|
| `DATABASE_URL` | otomatis dari langkah 2 |
| `BLOB_READ_WRITE_TOKEN` | otomatis dari langkah 3 |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | dari langkah 4 |
| `JWT_SECRET` | string acak panjang: `openssl rand -hex 32` |
| `ADMIN_EMAILS` | email Google adminmu, pisah koma. Pemilik email ini otomatis admin |
| `SITE_URL` | **disarankan**: `https://domainmu.com` (tanpa slash akhir), mengunci redirect OAuth |

`DISCORD_WEBHOOK_URL` tidak dipakai lagi (form Discord sudah dihapus); boleh dihapus.

### 6. Redeploy
Tab **Deployments → … → Redeploy**. Lalu login dengan email di `ADMIN_EMAILS` → buka `/admin`.

## Update ke v3.2 (WAJIB: jalankan ulang schema)
Buka Neon → SQL Editor → tempel seluruh `schema.sql` → **Run**. Aman, data lama tidak hilang. Ini menambah tabel forum dan kolom `roblox_public`. Kalau lupa, situs menampilkan "Database belum diperbarui" (bukan crash). Setelah itu push ke GitHub; Vercel deploy otomatis.

## Forum & profil publik (baru)
- `/forum`: topik + balasan, kategori (Umum, Game, Saran, Bug, Perkenalan). Semua orang boleh membaca; login Google untuk menulis. Title aktif tiap pemain tampil di samping nama mereka (daftar topik, topik, balasan).
- Penulis bisa edit/hapus tulisannya sendiri. Admin bisa menyematkan, mengunci, dan menghapus tulisan siapa pun (tercatat di `admin_actions`). Pengguna yang di-ban otomatis hilang dari forum; muncul lagi bila di-unban.
- `/member`: direktori warga (cari nama). `/member?id=N`: profil publik (foto, title aktif, bio, koleksi title, topik terbaru). Email dan jatah reroll **tidak pernah** tampil. Username Roblox hanya tampil kalau pemilik mencentang "Tampilkan username Roblox di profil publik" di `/profile` (bawaan: tersembunyi).
- Batas anti-spam (dicek atomik di database): 3 topik / 10 menit, 6 balasan / menit per akun; tulisan identik ditolak.
- Keamanan forum: semua teks ditampilkan sebagai teks (anti-XSS), karakter kontrol dan pembalik arah tulisan dibuang, cek asal request pada semua penulisan, otorisasi dicek di server (bukan hanya tombol disembunyikan), panjang dibatasi juga di database.

## Catatan batas function Vercel
Plan Hobby maksimal 12 Serverless Function (1 file di `api/` = 1 function). Semua endpoint digabung ke 7 file dispatcher di `api/`, sedangkan logikanya ada di `lib/h/`. URL tetap `/api/...` lewat `rewrites` di `vercel.json`. Mau menambah endpoint: buat file di `lib/h/`, daftarkan di dispatcher, dan tambah rewrite.

## Panel admin (`/admin`)
- **Pengumuman**: tulis, edit, hapus, upload gambar, label, tanggal terbit (isi masa depan = terjadwal), draft/terbit.
- **Jadwal & Setting**: tanggal rilis (hitung mundur), buka/tutup pendaftaran, peluang reroll, offset penghitung.
- **Hadiah & Link**: target & hadiah milestone, link Discord/Roblox/TikTok/IG/YouTube, email support.
- **Pengguna**: cari, tambah reroll, ban, jadikan admin. **Title Pool**: tambah/ubah/nonaktifkan/hapus.
Perubahan tampil di situs ±20 detik (cache CDN).

## Keamanan (ringkas)
Cookie sesi HttpOnly+Secure+SameSite, state OAuth, redirect hanya ke path internal, cek Origin pada semua request tulis, validasi ketat semua input admin (link hanya http/https), upload gambar dicek isi file asli, reroll atomik (anti-race), CSP + header keamanan, kode server tidak lagi ikut tersaji sebagai file statis (hanya `public/`).

**Catatan:** username Roblox yang diisi pemain **tidak diverifikasi** (hanya dijamin unik). Kalau hadiah dalam game bernilai, tambahkan verifikasi (mis. Roblox OAuth) sebelum klaim.
