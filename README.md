# Distrik 17 — Website Pre-Register

Situs statis + 1 serverless function. Tanpa build step.

## Deploy ke Vercel
1. Push folder ini ke GitHub (atau `npx vercel` dari folder ini).
2. Import project di vercel.com. Framework: **Other**, tanpa build command.
3. Agar form menyimpan data: Settings → Environment Variables → `DISCORD_WEBHOOK_URL`
   (Discord: Server Settings → Integrations → Webhooks → New Webhook → Copy URL). Redeploy.
   Setiap pendaftar akan muncul sebagai pesan di kanal Discord itu.

## Yang wajib kamu edit
- `config.js`: link Discord/TikTok/IG/YouTube, email support, tanggal rilis, jumlah pendaftar, daftar hadiah.
- `index.html`: bagian "Catatan Update", "Hadiah", dan FAQ berisi contoh teks — ganti dengan info aslimu.

## Catatan
- Jumlah pendaftar di web diisi manual lewat `preRegCount` di `config.js` (belum ada database).
  Kalau mau otomatis, buat `/api/stats` yang mengembalikan `{ "count": N }` dari database (mis. Vercel KV / Supabase); `script.js` sudah memanggilnya.
- Pre-register ini mengumpulkan username Roblox + email opsional. Jangan pernah minta password.
"# distrik" 
