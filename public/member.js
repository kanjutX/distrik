(function () {
  var wrap = document.getElementById("appWrap");
  var ME = { loggedIn: false };
  var CATS = { Umum: "Umum", Game: "Diskusi Game", Saran: "Saran & Ide", Bug: "Laporan Bug", Perkenalan: "Perkenalan" };

  function $(id) { return document.getElementById(id); }
  function catLabel(k) { return Object.prototype.hasOwnProperty.call(CATS, k) ? CATS[k] : String(k); }
  function tierLabel(t) { return t === "epic" ? "Epik" : t === "rare" ? "Rare" : "Umum"; }
  function joined(iso) {
    try { return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }); } catch (e) { return ""; }
  }

  // =====================================================================
  // PROFIL PUBLIK
  // =====================================================================
  function showMember(id) {
    wrap.innerHTML = '<p class="app__sub skeleton">Memuat profil…</p>';
    apiCall("/api/members/" + id).then(function (r) {
      if (r.status === 404) { wrap.innerHTML = '<div class="blockmsg"><h2>Warga tidak ditemukan.</h2><p class="app__sub">Akunnya tidak ada atau sedang diblokir.</p><a class="btn btn--ghost" href="/member">Cari warga</a></div>'; return; }
      if (!r.ok) { wrap.innerHTML = '<p class="msg err">' + esc(r.data.error || "Gagal memuat profil.") + ' <a href="" style="text-decoration:underline">Muat ulang</a></p>'; return; }
      render(r.data);
    });
  }

  function render(m) {
    document.title = m.name + " — Distrik 17";
    var mine = ME.loggedIn && Number(ME.id) === Number(m.id);
    var owned = m.ownedTitles || [];
    wrap.innerHTML =
      '<a class="backlink" href="/member">← Semua warga</a>' +
      '<div class="panel" style="margin-top:12px">' +
        '<div class="profhead">' +
          '<div class="profhead__avatar"><img id="mAvatar" alt="Foto profil" referrerpolicy="no-referrer"></div>' +
          "<div>" +
            '<div class="profhead__name"><span id="mName"></span>' + (m.isAdmin ? ' <span class="pill pill-admin">Admin</span>' : "") + "</div>" +
            '<div style="margin-top:8px">' + (m.activeTitle ? titleBadgeHtml(m.activeTitle) : '<span class="badge-title tier-common">Belum punya title</span>') + "</div>" +
            '<div class="profhead__email" id="mMeta" style="margin-top:8px"></div>' +
          "</div>" +
        "</div>" +
        (m.bio ? '<p class="post__body" id="mBio" style="margin-top:14px"></p>' : "") +
        (mine ? '<div class="btnrow" style="margin-top:14px"><a class="btn btn--sm btn--ghost" href="/profile">Edit profilku</a></div>' : "") +
      "</div>" +
      '<div class="panel"><div class="panel__h">Koleksi title <small style="font-weight:500">(' + owned.length + ")</small></div>" +
        '<div class="titlegrid" id="mTitles"></div></div>' +
      '<div class="panel"><div class="panel__h">Topik terbaru</div><div id="mThreads"></div></div>';

    // teks pengguna dimasukkan lewat textContent / properti, bukan string HTML
    $("mAvatar").src = avatarSrc(m); $("mName").textContent = m.name;
    var meta = ["Bergabung " + joined(m.joinedAt), m.stats.threads + " topik", m.stats.posts + " balasan"];
    if (m.robloxUsername) meta.push("Roblox: " + m.robloxUsername);
    $("mMeta").textContent = meta.join(" • ");
    if (m.bio) $("mBio").textContent = m.bio;

    $("mTitles").innerHTML = owned.length ? owned.map(function (t) {
      var tier = /^(common|rare|epic)$/.test(t.tier) ? t.tier : "common";
      var on = m.activeTitle && m.activeTitle.text === t.text;
      return '<div class="titlechip tier-' + tier + (on ? " is-active" : "") + '">' + esc(t.text) + "<small>" + tierLabel(tier) + (on ? " • dipakai" : "") + "</small></div>";
    }).join("") : '<p class="app__sub" style="margin:0">Belum punya title.</p>';

    var th = m.recentThreads || [];
    $("mThreads").innerHTML = th.length ? '<div class="threads">' + th.map(function (t) {
      return '<a class="thread" href="/forum?t=' + Number(t.id) + '"><div class="thread__main"><div class="thread__top"><span class="pill pill-tag">' + esc(catLabel(t.category)) + "</span></div>" +
        '<b class="thread__title">' + esc(t.title) + '</b><div class="thread__meta"><time title="' + esc(fullDate(t.createdAt)) + '">' + esc(timeAgo(t.createdAt)) + "</time></div></div></a>";
    }).join("") + "</div>" : '<p class="app__sub" style="margin:0">Belum membuat topik.</p>';
  }

  // =====================================================================
  // DIREKTORI WARGA
  // =====================================================================
  function showDirectory() {
    wrap.innerHTML =
      '<h1 class="app__title">Warga <em>Distrik.</em></h1>' +
      '<p class="app__sub">Cari warga lain dan lihat profil serta koleksi title mereka.</p>' +
      '<div class="panel"><form id="mSearch" class="btnrow" novalidate role="search"><label class="field" style="flex:1;min-width:200px;margin:0"><span class="sr">Cari nama</span><input id="mQ" type="search" maxlength="40" placeholder="Cari nama warga..." autocomplete="off"></label>' +
      '<button class="btn btn--sm" type="submit">Cari</button></form></div>' +
      '<div class="panel panel--flush"><div id="mList"><p class="app__sub skeleton" style="margin:18px">Memuat…</p></div>' +
      '<div class="btnrow" style="padding:0 16px 16px"><button class="btn btn--sm btn--ghost" id="mMore" type="button" hidden>Muat lebih banyak</button></div></div>';

    var q = "", offset = 0, token = 0;
    function load(reset) {
      if (reset) { offset = 0; $("mList").innerHTML = '<p class="app__sub skeleton" style="margin:18px">Memuat…</p>'; }
      var my = ++token;
      apiCall("/api/members?q=" + encodeURIComponent(q) + "&offset=" + offset).then(function (r) {
        if (my !== token) return; // hasil pencarian lama diabaikan
        var box = $("mList");
        if (!r.ok) { box.innerHTML = '<p class="msg err" style="margin:18px">' + esc(r.data.error || "Gagal memuat.") + "</p>"; $("mMore").hidden = true; return; }
        var list = r.data.members || [];
        if (reset && !list.length) { box.innerHTML = '<p class="app__sub" style="margin:18px">Tidak ada warga yang cocok.</p>'; $("mMore").hidden = true; return; }
        var html = list.map(function (a) {
          return '<a class="thread" href="/member?id=' + Number(a.id) + '"><div class="thread__main"><div class="thread__meta" style="margin:0">' +
            '<img class="avatar avatar--sm" src="' + esc(avatarSrc(a)) + '" alt="" referrerpolicy="no-referrer" loading="lazy"><b class="thread__title" style="margin:0">' + esc(a.name) + "</b>" +
            (a.isAdmin ? ' <span class="pill pill-admin">Admin</span>' : "") + titleBadgeHtml(a.title) + "</div></div></a>";
        }).join("");
        if (reset) box.innerHTML = '<div class="threads">' + html + "</div>"; else box.firstChild.insertAdjacentHTML("beforeend", html);
        offset += list.length; $("mMore").hidden = !r.data.hasMore;
      });
    }
    $("mSearch").addEventListener("submit", function (e) { e.preventDefault(); q = $("mQ").value.trim(); load(true); });
    $("mMore").addEventListener("click", function () { load(false); });
    load(true);
  }

  window.whenMe(function (me) {
    ME = me && me.loggedIn ? me : { loggedIn: false };
    var id = new URLSearchParams(location.search).get("id");
    if (id && /^\d{1,15}$/.test(id) && Number(id) > 0) showMember(Number(id)); else showDirectory();
  });
})();
