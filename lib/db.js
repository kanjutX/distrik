const { neon } = require("@neondatabase/serverless");

let sqlClient = null;

// Dipanggil lazy supaya error "DATABASE_URL belum di-set" muncul sebagai
// respons API yang jelas, bukan crash saat cold start.
function sql() {
  if (!sqlClient) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL belum di-set di Environment Variables Vercel.");
    sqlClient = neon(url);
  }
  return sqlClient;
}

module.exports = { sql };
