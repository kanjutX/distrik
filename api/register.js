// Vercel Serverless Function — menerima pendaftaran & meneruskannya ke Discord webhook.
// Set env var di Vercel: DISCORD_WEBHOOK_URL  (Project → Settings → Environment Variables)
const hits = new Map(); // rate-limit sederhana per instance (5 request / menit / IP)

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const ip = (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "unknown";
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter((t) => now - t < 60000);
  if (arr.length >= 5) return res.status(429).json({ error: "Terlalu banyak percobaan. Tunggu semenit ya." });
  arr.push(now); hits.set(ip, arr);

  const b = typeof req.body === "string" ? safeParse(req.body) : req.body || {};
  if (b.website) return res.status(200).json({ ok: true }); // honeypot: pura-pura sukses untuk bot

  const roblox = String(b.roblox || "").trim();
  const email = String(b.email || "").trim().slice(0, 120);
  const platform = String(b.platform || "").slice(0, 40);
  if (!/^[A-Za-z0-9_]{3,20}$/.test(roblox)) return res.status(400).json({ error: "Username Roblox tidak valid." });
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return res.status(400).json({ error: "Email tidak valid." });

  const hook = process.env.DISCORD_WEBHOOK_URL;
  if (!hook) return res.status(503).json({ error: "Pendaftaran belum diaktifkan oleh admin." });

  try {
    const r = await fetch(hook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        allowed_mentions: { parse: [] },
        embeds: [{
          title: "Pre-register baru",
          color: 0xde3a28,
          fields: [
            { name: "Roblox", value: "`" + roblox + "`", inline: true },
            { name: "Platform", value: platform || "-", inline: true },
            { name: "Email", value: email || "-" },
          ],
          timestamp: new Date().toISOString(),
        }],
      }),
    });
    if (!r.ok) throw new Error("webhook " + r.status);
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(502).json({ error: "Gagal menyimpan. Coba lagi sebentar." });
  }
};

function safeParse(s) { try { return JSON.parse(s); } catch (_) { return {}; } }
