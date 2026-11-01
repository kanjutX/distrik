// Helper bersama (dipakai index, profil, admin). Tanpa dependensi.
(function () {
  var ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  window.esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return ESC[c]; }); };

  // ---- helper tampilan untuk forum & profil publik ----
  window.titleBadgeHtml = function (t) {
    if (!t || !t.text) return "";
    var tier = /^(common|rare|epic)$/.test(t.tier) ? t.tier : "common";
    return '<span class="badge-title badge-title--sm tier-' + tier + '">' + esc(t.text) + "</span>";
  };
  window.avatarSrc = function (u) { return (u && u.avatarUrl) || "/assets/favicon.png"; };
  window.fullDate = function (iso) {
    try { return new Date(iso).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }); } catch (e) { return ""; }
  };
  window.timeAgo = function (iso) {
    var t = new Date(iso).getTime();
    if (isNaN(t)) return "";
    var s = Math.max(0, Math.floor((Date.now() - t) / 1000));
    if (s < 60) return "baru saja";
    if (s < 3600) return Math.floor(s / 60) + " mnt lalu";
    if (s < 86400) return Math.floor(s / 3600) + " jam lalu";
    if (s < 7 * 86400) return Math.floor(s / 86400) + " hari lalu";
    try { return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }); } catch (e) { return ""; }
  };
  // jalankan cb(me) setelah status login diketahui (auth-nav.js memublikasikannya)
  window.whenMe = function (cb) {
    if (window.D17_ME) return cb(window.D17_ME);
    document.addEventListener("d17:me", function (e) { cb(e.detail); }, { once: true });
  };

  // fetch JSON yang tahan banting: selalu mengembalikan { ok, status, data } dan tidak pernah melempar
  // (respons non-JSON seperti 413/502 dari platform tidak lagi bikin UI mati).
  window.apiCall = function (path, method, body) {
    var opts = { method: method || "GET", credentials: "same-origin", headers: {} };
    if (body !== undefined) { opts.headers["Content-Type"] = "application/json"; opts.body = JSON.stringify(body); }
    return fetch(path, opts).then(function (r) {
      return r.text().then(function (t) {
        var j = {}; try { j = t ? JSON.parse(t) : {}; } catch (e) {}
        if (!r.ok && !j.error) {
          j.error = r.status === 413 ? "Ukuran data terlalu besar." : r.status === 429 ? "Terlalu banyak permintaan, tunggu sebentar." : "Server bermasalah (" + r.status + "). Coba lagi.";
        }
        return { ok: r.ok, status: r.status, data: j };
      });
    }).catch(function () {
      return { ok: false, status: 0, data: { error: "Koneksi bermasalah. Periksa internetmu." } };
    });
  };

  // Ubah file gambar jadi data-URL JPEG yang sudah diperkecil. square=true -> dipotong persegi (avatar).
  // Mencoba kualitas turun bertahap sampai ukurannya di bawah maxBytes.
  window.prepareImage = function (file, maxSide, opts) {
    opts = opts || {};
    return new Promise(function (resolve, reject) {
      if (!file || !/^image\/(png|jpeg|webp|gif|heic|heif|bmp)$/i.test(file.type || "")) return reject(new Error("Pilih file gambar (PNG, JPG, atau WebP)."));
      if (file.size > 25 * 1048576) return reject(new Error("File terlalu besar (maks 25MB sebelum dikecilkan)."));
      // FileReader (data: URL) dipakai, bukan blob: URL, supaya CSP img-src tetap ketat.
      var reader = new FileReader(), img = new Image();
      var unreadable = function () { reject(new Error("Gambar tidak bisa dibaca. Coba format PNG/JPG/WebP.")); };
      reader.onerror = unreadable; img.onerror = unreadable;
      reader.onload = function () { img.src = reader.result; };
      img.onload = function () {
        var sw = img.naturalWidth, sh = img.naturalHeight, sx = 0, sy = 0, w, h;
        if (opts.square) { var m = Math.min(sw, sh); sx = (sw - m) / 2; sy = (sh - m) / 2; sw = sh = m; w = h = Math.min(maxSide, m); }
        else { var k = Math.min(1, maxSide / Math.max(sw, sh)); w = Math.round(sw * k); h = Math.round(sh * k); }
        var c = document.createElement("canvas"); c.width = w; c.height = h;
        var g = c.getContext("2d");
        g.fillStyle = opts.bg || "#16171b"; g.fillRect(0, 0, w, h); // PNG transparan tidak jadi hitam pekat
        g.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
        var q = 0.88, out = c.toDataURL("image/jpeg", q), limit = (opts.maxBytes || 2.4 * 1048576) * 1.34;
        while (out.length > limit && q > 0.4) { q -= 0.1; out = c.toDataURL("image/jpeg", q); }
        if (out.length > limit) return reject(new Error("Gambar masih terlalu besar setelah dikecilkan."));
        resolve(out);
      };
      reader.readAsDataURL(file);
    });
  };
})();
