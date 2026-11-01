(function () {
  var wrap = document.getElementById("appWrap");
  var C = window.D17 || {};
  function $(id) { return document.getElementById(id); }
  function fmtDate(s) { try { return new Date(s).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }); } catch (e) { return s; } }
  function pad(n) { return String(n).padStart(2, "0"); }
  function toLocalInput(iso) {
    var d = iso ? new Date(iso) : new Date();
    if (isNaN(d.getTime())) return "";
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) + "T" + pad(d.getHours()) + ":" + pad(d.getMinutes());
  }
  function setMsg(id, cls, text) { var m = $(id); if (m) { m.className = "msg" + (cls ? " " + cls : ""); m.textContent = text || ""; } }

  // ---------- kerangka + tab ----------
  function shell() {
    wrap.innerHTML =
      '<h1 class="app__title">Panel <em>Admin.</em></h1>' +
      '<p class="app__sub">Atur pengumuman, jadwal rilis, hadiah, link, pengguna, dan title dari sini.</p>' +
      '<div class="tabs" role="tablist">' +
        '<button class="is-active" data-tab="news">Pengumuman</button>' +
        '<button data-tab="settings">Jadwal &amp; Setting</button>' +
        '<button data-tab="site">Hadiah &amp; Link</button>' +
        '<button data-tab="users">Pengguna</button>' +
        '<button data-tab="titles">Title Pool</button>' +
      "</div>" +
      ["news", "settings", "site", "users", "titles"].map(function (t) { return '<div class="tabview' + (t === "news" ? " is-active" : "") + '" id="tab-' + t + '"></div>'; }).join("");

    wrap.querySelectorAll(".tabs button").forEach(function (b) {
      b.addEventListener("click", function () {
        wrap.querySelectorAll(".tabs button").forEach(function (x) { x.classList.remove("is-active"); });
        wrap.querySelectorAll(".tabview").forEach(function (x) { x.classList.remove("is-active"); });
        b.classList.add("is-active");
        $("tab-" + b.getAttribute("data-tab")).classList.add("is-active");
      });
    });
    initNews(); initSettings(); initSite(); initUsers(); initTitles();
  }

  // =====================================================================
  // PENGUMUMAN
  // =====================================================================
  var TAGS = ["Info", "UI", "Fitur", "Sistem", "Event", "Segera", "Penting"];
  var ed = null; // { id, imgData, removeImg, curImg }
  var newsCache = [];

  function initNews() {
    $("tab-news").innerHTML =
      '<form class="panel" id="newsForm" novalidate>' +
        '<div class="panel__h" id="newsFormTitle">Pengumuman baru</div>' +
        '<label class="field">Judul<input id="nTitle" maxlength="120" placeholder="contoh: Beta tertutup dibuka 20 Desember"></label>' +
        '<label class="field">Isi pengumuman <small id="nBodyCount"></small><textarea id="nBody" maxlength="2000" rows="5" placeholder="Tulis detailnya di sini. Baris baru ikut tampil."></textarea></label>' +
        '<div class="formrow">' +
          '<label class="field">Label<select id="nTag">' + TAGS.map(function (t) { return "<option>" + t + "</option>"; }).join("") + "</select></label>" +
          '<label class="field">Tanggal &amp; jam terbit<input type="datetime-local" id="nDate"><small>Isi tanggal masa depan untuk menjadwalkan.</small></label>' +
        "</div>" +
        '<div class="field"><span>Gambar (opsional)</span>' +
          '<div class="imgpick" id="nImgBox"></div>' +
          '<input type="file" id="nFile" accept="image/png,image/jpeg,image/webp" hidden>' +
          "<small>PNG / JPG / WebP. Otomatis diperkecil ke maks 1600px.</small>" +
        "</div>" +
        '<label class="check"><input type="checkbox" id="nPub" checked> <span>Terbitkan (hilangkan centang untuk menyimpan sebagai draft)</span></label>' +
        '<div class="btnrow"><button class="btn btn--sm" id="nSave" type="submit">Simpan pengumuman</button>' +
        '<button class="btn btn--sm btn--ghost" id="nCancel" type="button" hidden>Batal edit</button></div>' +
        '<p class="msg" id="nMsg" role="status"></p>' +
      "</form>" +
      '<div class="panel"><div class="panel__h">Semua pengumuman</div><div id="newsList"><p class="app__sub skeleton">Memuat...</p></div></div>';

    $("nBody").addEventListener("input", bodyCount);
    $("nFile").addEventListener("change", onPickImage);
    $("newsForm").addEventListener("submit", saveNews);
    $("nCancel").addEventListener("click", function () { resetNewsForm(); });
    $("newsList").addEventListener("click", onNewsAction);
    resetNewsForm(); loadNews();
  }

  function bodyCount() { $("nBodyCount").textContent = "(" + $("nBody").value.length + "/2000)"; }

  function renderImgBox() {
    var src = ed.imgData || (!ed.removeImg && ed.curImg) || "";
    $("nImgBox").innerHTML = src
      ? '<img src="' + esc(src) + '" alt="Pratinjau"><div class="btnrow"><button type="button" class="btn btn--sm btn--ghost" id="nPick">Ganti</button><button type="button" class="btn btn--sm btn--ghost" id="nDrop">Hapus gambar</button></div>'
      : '<button type="button" class="btn btn--sm btn--ghost" id="nPick">+ Pilih gambar</button>';
    $("nPick").addEventListener("click", function () { $("nFile").click(); });
    var drop = $("nDrop");
    if (drop) drop.addEventListener("click", function () { ed.imgData = null; ed.removeImg = true; renderImgBox(); });
  }

  function onPickImage() {
    var f = $("nFile").files[0]; if (!f) return;
    setMsg("nMsg", "", "Memproses gambar...");
    prepareImage(f, 1600, { maxBytes: 2.6 * 1048576 }).then(function (d) {
      ed.imgData = d; ed.removeImg = false; renderImgBox(); setMsg("nMsg", "", "");
    }).catch(function (e) { setMsg("nMsg", "err", e.message || "Gagal memproses gambar."); })
      .then(function () { $("nFile").value = ""; });
  }

  function resetNewsForm() {
    ed = { id: null, imgData: null, removeImg: false, curImg: null };
    $("newsFormTitle").textContent = "Pengumuman baru";
    $("nTitle").value = ""; $("nBody").value = ""; $("nTag").value = "Info";
    $("nDate").value = toLocalInput(null); $("nPub").checked = true;
    $("nCancel").hidden = true; $("nSave").textContent = "Simpan pengumuman";
    bodyCount(); renderImgBox(); setMsg("nMsg", "", "");
  }

  function startEdit(a) {
    ed = { id: Number(a.id), imgData: null, removeImg: false, curImg: a.image_url };
    $("newsFormTitle").textContent = "Edit pengumuman #" + a.id;
    $("nTitle").value = a.title; $("nBody").value = a.body || "";
    if (TAGS.indexOf(a.tag) === -1) { var o = document.createElement("option"); o.textContent = a.tag; $("nTag").appendChild(o); }
    $("nTag").value = a.tag; $("nDate").value = toLocalInput(a.published_at); $("nPub").checked = !!a.is_published;
    $("nCancel").hidden = false; $("nSave").textContent = "Simpan perubahan";
    bodyCount(); renderImgBox(); setMsg("nMsg", "", "");
    $("newsForm").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function saveNews(e) {
    e.preventDefault();
    var title = $("nTitle").value.trim();
    if (title.length < 2) return setMsg("nMsg", "err", "Judul minimal 2 karakter.");
    var body = { title: title, body: $("nBody").value, tag: $("nTag").value, isPublished: $("nPub").checked };
    var d = $("nDate").value; if (d) body.publishedAt = new Date(d).toISOString();
    if (ed.imgData) body.imageDataUrl = ed.imgData;
    if (ed.id && ed.removeImg && !ed.imgData) body.removeImage = true;
    var btn = $("nSave"); btn.disabled = true; setMsg("nMsg", "", "Menyimpan...");
    var req = ed.id ? apiCall("/api/admin/announcements/" + ed.id, "PATCH", body) : apiCall("/api/admin/announcements", "POST", body);
    req.then(function (r) {
      btn.disabled = false;
      if (!r.ok) return setMsg("nMsg", "err", r.data.error || "Gagal menyimpan.");
      var was = ed.id; resetNewsForm(); setMsg("nMsg", "ok", was ? "Perubahan tersimpan." : "Pengumuman tersimpan."); loadNews();
    });
  }

  function statusOf(a) {
    if (!a.is_published) return '<span class="pill pill-draft">Draft</span>';
    if (new Date(a.published_at).getTime() > Date.now()) return '<span class="pill pill-sched">Terjadwal</span>';
    return '<span class="pill pill-live">Terbit</span>';
  }

  function loadNews() {
    apiCall("/api/admin/announcements").then(function (r) {
      var box = $("newsList");
      if (!r.ok) { box.innerHTML = '<p class="msg err">' + esc(r.data.error) + "</p>"; return; }
      newsCache = r.data.announcements || [];
      if (!newsCache.length) { box.innerHTML = '<p class="app__sub" style="margin:0">Belum ada pengumuman.</p>'; return; }
      box.innerHTML = '<div class="newslist">' + newsCache.map(function (a) {
        return '<div class="newsrow">' +
          (a.image_url ? '<img class="newsrow__img" src="' + esc(a.image_url) + '" alt="" loading="lazy">' : '<div class="newsrow__img newsrow__img--none">—</div>') +
          '<div class="newsrow__main"><b>' + esc(a.title) + "</b><div class=\"newsrow__meta\">" + statusOf(a) + ' <span class="pill pill-tag">' + esc(a.tag) + "</span> <small>" + esc(fmtDate(a.published_at)) + "</small></div></div>" +
          '<div class="tbl-actions"><button data-act="edit" data-id="' + Number(a.id) + '">Edit</button>' +
          '<button data-act="toggle" data-id="' + Number(a.id) + '">' + (a.is_published ? "Jadikan draft" : "Terbitkan") + "</button>" +
          '<button data-act="del" data-id="' + Number(a.id) + '">Hapus</button></div></div>';
      }).join("") + "</div>";
    });
  }

  function onNewsAction(e) {
    var btn = e.target.closest("button[data-act]"); if (!btn) return;
    var id = Number(btn.getAttribute("data-id")), act = btn.getAttribute("data-act");
    var a = newsCache.filter(function (x) { return Number(x.id) === id; })[0]; if (!a) return;
    if (act === "edit") return startEdit(a);
    if (act === "toggle") {
      return apiCall("/api/admin/announcements/" + id, "PATCH", { isPublished: !a.is_published }).then(function (r) { if (r.ok) loadNews(); else window.alert(r.data.error || "Gagal."); });
    }
    if (act === "del") {
      if (!window.confirm('Hapus pengumuman "' + a.title + '"? Gambarnya ikut terhapus.')) return;
      apiCall("/api/admin/announcements/" + id, "DELETE").then(function (r) { if (r.ok) { if (ed && Number(ed.id) === id) resetNewsForm(); loadNews(); } else window.alert(r.data.error || "Gagal."); });
    }
  }

  // =====================================================================
  // JADWAL & SETTING
  // =====================================================================
  function putSetting(key, value, msgId) {
    setMsg(msgId, "", "Menyimpan...");
    return apiCall("/api/admin/settings", "PUT", { key: key, value: value }).then(function (r) {
      if (r.ok) setMsg(msgId, "ok", "Tersimpan. Tampil di situs dalam ±20 detik.");
      else setMsg(msgId, "err", r.data.error || "Gagal menyimpan.");
      return r;
    });
  }

  function initSettings() {
    var tab = $("tab-settings");
    tab.innerHTML = '<p class="app__sub skeleton">Memuat setting...</p>';
    apiCall("/api/admin/settings").then(function (r) {
      if (!r.ok) { tab.innerHTML = '<p class="msg err">' + esc(r.data.error) + "</p>"; return; }
      var s = r.data;
      var launch = s.launch || { launchDate: C.launchDate || "", registrationOpen: true };
      var w = s.reroll_weights || { common: 70, rare: 25, epic: 5 };
      var offset = s.count_offset || 0;

      tab.innerHTML =
        '<div class="panel"><div class="panel__h">Jadwal rilis &amp; pendaftaran</div>' +
          '<div class="formrow">' +
            '<label class="field">Tanggal &amp; jam rilis beta<input type="datetime-local" id="setLaunchDate" value="' + (launch.launchDate ? toLocalInput(launch.launchDate) : "") + '"><small>Memakai zona waktu perangkatmu. Kosongkan untuk menyembunyikan hitung mundur.</small></label>' +
            '<div class="field" style="justify-content:center"><label class="check"><input type="checkbox" id="setRegOpen"' + (launch.registrationOpen !== false ? " checked" : "") + '> <span>Pendaftaran dibuka</span></label><small>Kalau ditutup, akun baru tidak bisa mendaftar (akun lama tetap bisa masuk).</small></div>' +
          "</div>" +
          '<div class="btnrow"><button class="btn btn--sm" id="saveLaunchBtn">Simpan jadwal</button><button class="btn btn--sm btn--ghost" id="clearLaunchBtn" type="button">Hapus tanggal</button></div>' +
          '<p class="msg" id="launchMsg"></p></div>' +

        '<div class="panel"><div class="panel__h">Peluang reroll title</div>' +
          '<div class="formrow">' +
            '<label class="field">Common<input type="number" min="0" max="1000" id="wCommon" value="' + Number(w.common) + '"></label>' +
            '<label class="field">Rare<input type="number" min="0" max="1000" id="wRare" value="' + Number(w.rare) + '"></label>' +
            '<label class="field">Epik<input type="number" min="0" max="1000" id="wEpic" value="' + Number(w.epic) + '"></label>' +
          "</div>" +
          '<p class="hint" id="wHint"></p>' +
          '<button class="btn btn--sm" id="saveWeightsBtn">Simpan peluang</button><p class="msg" id="weightsMsg"></p></div>' +

        '<div class="panel"><div class="panel__h">Penghitung pendaftar</div>' +
          '<label class="field" style="max-width:220px">Offset tambahan<input type="number" id="setOffset" value="' + Number(offset) + '"></label>' +
          '<p class="hint">Ditambahkan ke jumlah akun yang terdaftar, buat menyamakan dengan angka pre-register lama.</p>' +
          '<button class="btn btn--sm" id="saveOffsetBtn">Simpan offset</button><p class="msg" id="offsetMsg"></p></div>';

      $("saveLaunchBtn").addEventListener("click", function () {
        var v = $("setLaunchDate").value;
        putSetting("launch", { launchDate: v ? new Date(v).toISOString() : "", registrationOpen: $("setRegOpen").checked }, "launchMsg");
      });
      $("clearLaunchBtn").addEventListener("click", function () {
        $("setLaunchDate").value = "";
        putSetting("launch", { launchDate: "", registrationOpen: $("setRegOpen").checked }, "launchMsg");
      });
      function hint() {
        var a = Number($("wCommon").value) || 0, b = Number($("wRare").value) || 0, c = Number($("wEpic").value) || 0, t = a + b + c;
        $("wHint").textContent = t > 0 ? "Peluang nyata: Common " + (a / t * 100).toFixed(1) + "% • Rare " + (b / t * 100).toFixed(1) + "% • Epik " + (c / t * 100).toFixed(1) + "%" : "Total harus lebih dari 0.";
      }
      ["wCommon", "wRare", "wEpic"].forEach(function (id) { $(id).addEventListener("input", hint); }); hint();
      $("saveWeightsBtn").addEventListener("click", function () {
        putSetting("reroll_weights", { common: Number($("wCommon").value) || 0, rare: Number($("wRare").value) || 0, epic: Number($("wEpic").value) || 0 }, "weightsMsg");
      });
      $("saveOffsetBtn").addEventListener("click", function () { putSetting("count_offset", Math.trunc(Number($("setOffset").value) || 0), "offsetMsg"); });
    });
  }

  // =====================================================================
  // HADIAH (milestone) & LINK
  // =====================================================================
  var LINKS = [
    ["discordUrl", "Discord"], ["robloxUrl", "Halaman Roblox"], ["tiktokUrl", "TikTok"], ["instagramUrl", "Instagram"], ["youtubeUrl", "YouTube"]
  ];

  function initSite() {
    var tab = $("tab-site");
    tab.innerHTML = '<p class="app__sub skeleton">Memuat...</p>';
    apiCall("/api/admin/settings").then(function (r) {
      if (!r.ok) { tab.innerHTML = '<p class="msg err">' + esc(r.data.error) + "</p>"; return; }
      var links = r.data.links || {}, ms = Array.isArray(r.data.milestones) ? r.data.milestones : (C.milestones || []);
      var linkVal = function (k) { return links[k] !== undefined ? links[k] : (C[k] || ""); };

      tab.innerHTML =
        '<div class="panel"><div class="panel__h">Hadiah bersama (target pendaftar)</div>' +
          '<p class="hint">Hadiah terbuka otomatis saat jumlah pendaftar mencapai target. Maksimal 12.</p>' +
          '<div id="msRows"></div>' +
          '<div class="btnrow"><button class="btn btn--sm btn--ghost" id="msAdd" type="button">+ Tambah hadiah</button><button class="btn btn--sm" id="msSave" type="button">Simpan hadiah</button></div>' +
          '<p class="msg" id="msMsg"></p></div>' +
        '<div class="panel"><div class="panel__h">Link sosial &amp; support</div>' +
          '<div class="formrow">' + LINKS.map(function (l) {
            return '<label class="field">' + l[1] + '<input id="ln_' + l[0] + '" type="url" maxlength="300" placeholder="https://..." value="' + esc(linkVal(l[0])) + '"></label>';
          }).join("") + '<label class="field">Email support<input id="ln_email" type="email" maxlength="120" value="' + esc(links.email !== undefined ? links.email : (C.email || "")) + '"></label></div>' +
          '<p class="hint">Kosongkan kolom untuk menyembunyikan tombolnya.</p>' +
          '<button class="btn btn--sm" id="lnSave" type="button">Simpan link</button><p class="msg" id="lnMsg"></p></div>';

      var msBox = $("msRows");
      function addRow(m) {
        var row = document.createElement("div"); row.className = "msrow";
        row.innerHTML =
          '<label class="field">Target<input class="ms-at" type="number" min="1" step="1" value="' + (m.at ? Number(m.at) : "") + '"></label>' +
          '<label class="field">Judul hadiah<input class="ms-title" maxlength="80" value="' + esc(m.title || "") + '"></label>' +
          '<label class="field">Deskripsi<input class="ms-desc" maxlength="200" value="' + esc(m.desc || "") + '"></label>' +
          '<button type="button" class="msrow__del" aria-label="Hapus hadiah">✕</button>';
        row.querySelector(".msrow__del").addEventListener("click", function () { row.remove(); });
        msBox.appendChild(row);
      }
      ms.forEach(addRow);
      $("msAdd").addEventListener("click", function () { if (msBox.children.length >= 12) return setMsg("msMsg", "err", "Maksimal 12 hadiah."); addRow({}); });
      $("msSave").addEventListener("click", function () {
        var list = [].map.call(msBox.children, function (row) {
          return { at: Number(row.querySelector(".ms-at").value), title: row.querySelector(".ms-title").value, desc: row.querySelector(".ms-desc").value };
        });
        putSetting("milestones", list, "msMsg");
      });
      $("lnSave").addEventListener("click", function () {
        var v = { email: $("ln_email").value };
        LINKS.forEach(function (l) { v[l[0]] = $("ln_" + l[0]).value; });
        putSetting("links", v, "lnMsg");
      });
    });
  }

  // =====================================================================
  // PENGGUNA
  // =====================================================================
  var uq = "", uoff = 0;
  function initUsers() {
    $("tab-users").innerHTML =
      '<div class="panel"><div class="statrow" id="userStats"></div>' +
        '<div class="field" style="max-width:340px"><input id="userSearch" type="search" placeholder="Cari nama / email / username roblox, lalu Enter"></div>' +
        '<div style="overflow-x:auto"><table class="tbl"><thead><tr><th>User</th><th>Roblox</th><th>Reroll</th><th>Status</th><th>Terdaftar</th><th>Aksi</th></tr></thead><tbody id="userRows"></tbody></table></div>' +
        '<div class="btnrow" style="margin-top:12px"><button class="btn btn--sm btn--ghost" id="userMore" type="button" hidden>Muat lebih banyak</button></div></div>';
    $("userSearch").addEventListener("keydown", function (e) { if (e.key === "Enter") { uq = e.target.value.trim(); fetchUsers(true); } });
    $("userMore").addEventListener("click", function () { fetchUsers(false); });
    $("userRows").addEventListener("click", onUserAction);
    fetchUsers(true);
  }

  function fetchUsers(reset) {
    var rowsEl = $("userRows");
    if (reset) { uoff = 0; rowsEl.innerHTML = '<tr><td colspan="6">Memuat...</td></tr>'; }
    apiCall("/api/admin/users?q=" + encodeURIComponent(uq) + "&limit=50&offset=" + uoff).then(function (r) {
      if (!r.ok) { rowsEl.innerHTML = '<tr><td colspan="6" class="msg err">' + esc(r.data.error) + "</td></tr>"; return; }
      var st = r.data.stats || {};
      $("userStats").innerHTML = '<span><b>' + (st.total || 0) + "</b> warga</span><span><b>" + (st.admins || 0) + "</b> admin</span><span><b>" + (st.banned || 0) + "</b> diblokir</span>";
      var html = (r.data.users || []).map(function (u) {
        return "<tr>" +
          "<td><b>" + esc(u.name) + "</b><br><small>" + esc(u.email) + "</small></td>" +
          "<td>" + esc(u.roblox_username || "-") + "</td>" +
          "<td>" + Number(u.rerolls_remaining) + "</td>" +
          "<td>" + (u.is_admin ? '<span class="pill pill-admin">Admin</span> ' : "") + (u.is_banned ? '<span class="pill pill-banned">Banned</span>' : "") + "</td>" +
          "<td><small>" + esc(fmtDate(u.created_at)) + "</small></td>" +
          '<td><div class="tbl-actions">' +
            '<button data-act="grant" data-id="' + Number(u.id) + '">+Reroll</button>' +
            '<button data-act="ban" data-id="' + Number(u.id) + '" data-v="' + (!u.is_banned) + '">' + (u.is_banned ? "Unban" : "Ban") + "</button>" +
            '<button data-act="admin" data-id="' + Number(u.id) + '" data-v="' + (!u.is_admin) + '">' + (u.is_admin ? "Cabut admin" : "Jadikan admin") + "</button>" +
          "</div></td></tr>";
      }).join("");
      if (reset) rowsEl.innerHTML = html || '<tr><td colspan="6">Tidak ada pengguna.</td></tr>'; else rowsEl.insertAdjacentHTML("beforeend", html);
      uoff += (r.data.users || []).length;
      $("userMore").hidden = !r.data.hasMore;
    });
  }

  function onUserAction(e) {
    var btn = e.target.closest("button[data-act]"); if (!btn) return;
    var act = btn.getAttribute("data-act"), id = Number(btn.getAttribute("data-id")), body = { userId: id };
    if (act === "grant") {
      var amount = Math.trunc(Number(window.prompt("Berapa reroll ditambahkan? (negatif untuk mengurangi, maks ±1000)", "5")));
      if (!amount) return;
      body.action = "grant-rerolls"; body.amount = amount;
    } else if (act === "ban") {
      body.action = "set-banned"; body.banned = btn.getAttribute("data-v") === "true";
      if (!window.confirm(body.banned ? "Ban pengguna ini?" : "Buka ban pengguna ini?")) return;
    } else if (act === "admin") {
      body.action = "set-admin"; body.isAdmin = btn.getAttribute("data-v") === "true";
      if (!window.confirm(body.isAdmin ? "Jadikan admin?" : "Cabut akses admin?")) return;
    }
    apiCall("/api/admin/users", "POST", body).then(function (r) {
      if (r.ok) fetchUsers(true); else window.alert(r.data.error || "Gagal.");
    });
  }

  // =====================================================================
  // TITLE POOL
  // =====================================================================
  function initTitles() {
    $("tab-titles").innerHTML =
      '<form class="panel" id="titleForm" novalidate><div class="panel__h">Tambah title</div>' +
        '<div class="formrow">' +
          '<label class="field">Teks title<input id="newTitleText" maxlength="60" placeholder="contoh: Legenda Gang"></label>' +
          '<label class="field">Tier<select id="newTitleTier"><option value="common">Common</option><option value="rare">Rare</option><option value="epic">Epik</option></select></label>' +
        "</div>" +
        '<button class="btn btn--sm" type="submit">Tambah title</button><p class="msg" id="addTitleMsg"></p></form>' +
      '<div class="panel"><div class="panel__h">Semua title</div><div style="overflow-x:auto"><table class="tbl"><thead><tr><th>Title</th><th>Tier</th><th>Dimiliki</th><th>Status</th><th>Aksi</th></tr></thead><tbody id="titleRows"></tbody></table></div></div>';
    $("titleForm").addEventListener("submit", function (e) {
      e.preventDefault();
      var text = $("newTitleText").value.trim(), tier = $("newTitleTier").value;
      setMsg("addTitleMsg", "", "");
      apiCall("/api/admin/titles", "POST", { text: text, tier: tier }).then(function (r) {
        if (r.ok) { $("newTitleText").value = ""; setMsg("addTitleMsg", "ok", "Title ditambahkan."); fetchTitles(); }
        else setMsg("addTitleMsg", "err", r.data.error || "Gagal menambah title.");
      });
    });
    $("titleRows").addEventListener("click", onTitleAction);
    fetchTitles();
  }

  function fetchTitles() {
    var rowsEl = $("titleRows");
    apiCall("/api/admin/titles").then(function (r) {
      if (!r.ok) { rowsEl.innerHTML = '<tr><td colspan="5" class="msg err">' + esc(r.data.error) + "</td></tr>"; return; }
      var list = r.data.titles || [];
      rowsEl.innerHTML = list.length ? list.map(function (t) {
        return "<tr><td><b>" + esc(t.text) + '</b></td><td><span class="badge-title tier-' + esc(t.tier) + '">' + esc(t.tier) + "</span></td><td>" + Number(t.owners) + "</td><td>" + (t.is_active ? "Aktif" : "Nonaktif") + "</td>" +
          '<td><div class="tbl-actions"><button data-act="rename" data-id="' + Number(t.id) + '" data-t="' + esc(t.text) + '">Ubah nama</button>' +
          '<button data-act="toggle" data-id="' + Number(t.id) + '" data-v="' + (!t.is_active) + '">' + (t.is_active ? "Nonaktifkan" : "Aktifkan") + "</button>" +
          '<button data-act="delete" data-id="' + Number(t.id) + '">Hapus</button></div></td></tr>';
      }).join("") : '<tr><td colspan="5">Belum ada title.</td></tr>';
    });
  }

  function onTitleAction(e) {
    var btn = e.target.closest("button[data-act]"); if (!btn) return;
    var act = btn.getAttribute("data-act"), id = btn.getAttribute("data-id");
    function done(r) { if (r.ok) fetchTitles(); else window.alert(r.data.error || "Gagal."); }
    if (act === "delete") {
      if (!window.confirm("Hapus title ini? Pengguna yang sudah memilikinya akan kehilangannya. (Lebih aman: Nonaktifkan.)")) return;
      return apiCall("/api/admin/titles/" + id, "DELETE").then(done);
    }
    if (act === "rename") {
      var t = window.prompt("Nama title baru:", btn.getAttribute("data-t")); if (!t || t.trim().length < 2) return;
      return apiCall("/api/admin/titles/" + id, "PATCH", { text: t.trim() }).then(done);
    }
    if (act === "toggle") apiCall("/api/admin/titles/" + id, "PATCH", { isActive: btn.getAttribute("data-v") === "true" }).then(done);
  }

  // =====================================================================
  // GERBANG AKSES
  // =====================================================================
  function showBlocked(reason) {
    var login = reason === "login";
    wrap.innerHTML = '<div class="blockmsg"><h2>' + (login ? "Masuk dulu." : "Bukan wilayahmu, boss.") + "</h2>" +
      '<p class="app__sub">' + (login ? "Login dulu buat masuk panel admin." : "Akun kamu tidak punya akses admin.") + "</p>" +
      (login ? '<a class="btn" href="/api/auth/login?returnTo=/admin">Masuk dengan Google <i>→</i></a>' : '<a class="btn btn--ghost" href="/">Kembali ke beranda</a>') + "</div>";
  }

  apiCall("/api/auth/me").then(function (r) {
    if (!r.ok) { wrap.innerHTML = '<p class="msg err">' + esc(r.data.error) + "</p>"; return; }
    if (!r.data.loggedIn) return showBlocked("login");
    if (!r.data.isAdmin) return showBlocked("forbidden");
    shell();
  });
})();
