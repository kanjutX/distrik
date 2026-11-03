const http = require("http");
const fs = require("fs");
const path = require("path");

const PUBLIC_DIR = path.join(__dirname, "public");

const API_DISPATCHERS = {
  "/api/admin": require("./api/admin"),
  "/api/auth": require("./api/auth"),
  "/api/forum": require("./api/forum"),
  "/api/members": require("./api/members"),
  "/api/profile": require("./api/profile"),
  "/api/public": require("./api/public"),
  "/api/titles": require("./api/titles"),
};

const REWRITES = [
  { regex: /^\/api\/forum\/threads\/([^/]+)\/posts$/, dest: "/api/forum", params: (m) => ({ r: "posts", id: decodeURIComponent(m[1]) }) },
  { regex: /^\/api\/forum\/threads\/([^/]+)$/, dest: "/api/forum", params: (m) => ({ r: "thread", id: decodeURIComponent(m[1]) }) },
  { regex: /^\/api\/forum\/threads$/, dest: "/api/forum", params: () => ({ r: "threads" }) },
  { regex: /^\/api\/forum\/posts\/([^/]+)$/, dest: "/api/forum", params: (m) => ({ r: "post", id: decodeURIComponent(m[1]) }) },
  { regex: /^\/api\/members\/([^/]+)$/, dest: "/api/members", params: (m) => ({ r: "one", id: decodeURIComponent(m[1]) }) },
  { regex: /^\/api\/auth\/([^/]+)$/, dest: "/api/auth", params: (m) => ({ action: decodeURIComponent(m[1]) }) },
  { regex: /^\/api\/admin\/announcements\/([^/]+)$/, dest: "/api/admin", params: (m) => ({ r: "announcement", id: decodeURIComponent(m[1]) }) },
  { regex: /^\/api\/admin\/announcements$/, dest: "/api/admin", params: () => ({ r: "announcements" }) },
  { regex: /^\/api\/admin\/titles\/([^/]+)$/, dest: "/api/admin", params: (m) => ({ r: "title", id: decodeURIComponent(m[1]) }) },
  { regex: /^\/api\/admin\/titles$/, dest: "/api/admin", params: () => ({ r: "titles" }) },
  { regex: /^\/api\/admin\/settings$/, dest: "/api/admin", params: () => ({ r: "settings" }) },
  { regex: /^\/api\/admin\/users$/, dest: "/api/admin", params: () => ({ r: "users" }) },
  { regex: /^\/api\/titles\/([^/]+)$/, dest: "/api/titles", params: (m) => ({ action: decodeURIComponent(m[1]) }) },
  { regex: /^\/api\/stats$/, dest: "/api/public", params: () => ({ r: "stats" }) },
  { regex: /^\/api\/settings-public$/, dest: "/api/public", params: () => ({ r: "settings" }) },
  { regex: /^\/api\/announcements$/, dest: "/api/public", params: () => ({ r: "announcements" }) },
  { regex: /^\/api\/avatar$/, dest: "/api/profile", params: () => ({ r: "avatar" }) },
];

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

function enhanceResponse(res) {
  res.status = function (code) {
    res.statusCode = code;
    return res;
  };
  res.json = function (obj) {
    if (!res.getHeader("Content-Type")) {
      res.setHeader("Content-Type", "application/json; charset=utf-8");
    }
    res.end(JSON.stringify(obj));
    return res;
  };
  res.redirect = function (statusOrUrl, maybeUrl) {
    let code = 302;
    let url = statusOrUrl;
    if (typeof statusOrUrl === "number") {
      code = statusOrUrl;
      url = maybeUrl;
    }
    res.statusCode = code;
    res.setHeader("Location", url);
    res.end();
    return res;
  };
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    if (req.method === "GET" || req.method === "HEAD") return resolve(undefined);
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > 8 * 1024 * 1024) {
        reject(Object.assign(new Error("Payload Too Large"), { statusCode: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      if (!chunks.length) return resolve({});
      const raw = Buffer.concat(chunks).toString("utf-8");
      try {
        resolve(JSON.parse(raw));
      } catch (e) {
        resolve(raw);
      }
    });
    req.on("error", reject);
  });
}

async function handleRequest(req, res) {
  enhanceResponse(res);

  let parsedUrl;
  try {
    parsedUrl = new URL(req.url || "/", "http://localhost:3000");
  } catch (e) {
    return res.status(400).json({ error: "Bad request" });
  }

  const pathname = parsedUrl.pathname.replace(/\/+$/, "") || "/";
  const query = {};
  parsedUrl.searchParams.forEach((v, k) => {
    query[k] = v;
  });

  // Route API requests
  if (pathname.startsWith("/api/")) {
    let handler = API_DISPATCHERS[pathname];
    if (!handler) {
      for (const rw of REWRITES) {
        const m = pathname.match(rw.regex);
        if (m) {
          Object.assign(query, rw.params(m));
          handler = API_DISPATCHERS[rw.dest];
          break;
        }
      }
    }
    if (!handler) {
      return res.status(404).json({ error: "Endpoint tidak ditemukan." });
    }
    req.query = query;
    try {
      req.body = await readBody(req);
    } catch (err) {
      return res.status(err.statusCode || 400).json({ error: "Ukuran data terlalu besar." });
    }
    return handler(req, res);
  }

  // Serve static files from /public (with cleanUrls support)
  let relPath = pathname === "/" ? "/index.html" : pathname;
  let filePath = path.normalize(path.join(PUBLIC_DIR, relPath));
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.statusCode = 403;
    return res.end("Forbidden");
  }

  if (!path.extname(filePath)) {
    const htmlCandidate = filePath + ".html";
    if (fs.existsSync(htmlCandidate) && fs.statSync(htmlCandidate).isFile()) {
      filePath = htmlCandidate;
    }
  }

  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    res.statusCode = 404;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    return res.end("Not Found");
  }

  const ext = path.extname(filePath).toLowerCase();
  res.setHeader("Content-Type", MIME_TYPES[ext] || "application/octet-stream");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (pathname.startsWith("/assets/")) {
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  } else {
    res.setHeader("Cache-Control", "no-cache");
  }

  fs.createReadStream(filePath).pipe(res);
}

const server = http.createServer(handleRequest);

if (require.main === module) {
  const PORT = Number(process.env.PORT) || 3000;
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

module.exports = { server, handleRequest };
