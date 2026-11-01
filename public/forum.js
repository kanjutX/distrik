(function () {
  var wrap = document.getElementById("appWrap");
  var ME = { loggedIn: false };
  var CATS = { Umum: "Umum", Game: "Diskusi Game", Saran: "Saran & Ide", Bug: "Laporan Bug", Perkenalan: "Perkenalan" };
  var CAT_KEYS = Object.keys(CATS);

  function $(id) { return document.getElementById(id); }
  function setMsg(id, cls, text) { var m = $(id); if (m) { m.className = "msg" + (cls ? " " + cls : ""); m.textContent = text || ""; } }
  function catLabel(k) { return Object.prototype.hasOwnProperty.call(CATS, k) ? CATS[k] : String(k); }
  function loginHref() { return "/api/auth/login?returnTo=" + encodeURIComponent(location.pathname + location.search); }
  function isMe(a) { return ME.loggedIn && a && Number(ME.id) === Number(a.id); }
  function catOptions(sel) {
    return CAT_KEYS.map(function (k) { return '<option value="' + esc(k) + '"' + (k === sel ? " selected" : "") + ">" + esc(CATS[k]) + "</option>"; }).join("");
  }
  function authorLine(a) {
    return '<img class="avatar avatar--xs" src="' + esc(avatarSrc(a)) + '" alt="" referrerpolicy="no-referrer" loading="lazy">' +
      "<span>" + esc(a.name) + "</span>" + (a.isAdmin ? ' <span class="pill pill-admin">Admin</span>' : "") + titleBadgeHtml(a.title);
  }

  // =====================================================================
  // DAFTAR TOPIK
  // =====================================================================
  function showList(cat) {
    if (cat && CAT_KEYS.indexOf(cat) === -1) cat = "";
    wrap.innerHTML =
      '<h1 class="app__title">Forum <em>Warga.</em></h1>' +
      '<p class="app__sub">Ngobrol, kasih saran, lapor bug, atau kenalan sama warga lain.</p>' +
      '<div class="chips" id="catChips"></div>' +
      '<div id="composerSlot"></div>' +
      '<div class="panel panel--flush"><div id="threadList"><p class="app__sub skeleton" style="margin:18px">Memuat topik…</p></div>' +
      '<div class="btnrow" style="padding:0 16px 16px"><button class="btn btn--sm btn--ghost" id="moreThreads" type="button" hidden>Muat lebih banyak</button></div></div>';

    $("catChips").innerHTML = ['<a class="chip' + (!cat ? " is-active" : "") + '" href="/forum">Semua</a>'].concat(CAT_KEYS.map(function (k) {
      return '<a class="chip' + (cat === k ? " is-active" : "") + '" href="/forum?cat=' + encodeURIComponent(k) + '">' + esc(CATS[k]) + "</a>";
    })).join("");

    renderComposer(cat);

    var offset = 0, busy = false;
    function load(reset) {
      if (busy) return; busy = true;
      var box = $("threadList"), more = $("moreThreads");
      more.disabled = true;
      apiCall("/api/forum/threads?offset=" + offset + (cat ? "&cat=" + encodeURIComponent(cat) : "")).then(function (r) {
        busy = false; more.disabled = false;
        if (!r.ok) { if (reset) box.innerHTML = '<p class="msg err" style="margin:18px">' + esc(r.data.error) + "</p>"; else setMsg("composerMsg", "err", r.data.error); return; }
        var list = r.data.threads || [];
        if (reset && !list.length) { box.innerHTML = '<p class="app__sub" style="margin:18px">Belum ada topik di sini. Jadilah yang pertama!</p>'; more.hidden = true; return; }
        var html = list.map(threadRow).join("");
        if (reset) box.innerHTML = '<div class="threads">' + html + "</div>"; else box.firstChild.insertAdjacentHTML("beforeend", html);
        offset += list.length;
        more.hidden = !r.data.hasMore;
      });
    }
    $("moreThreads").addEventListener("click", function () { load(false); });
    load(true);
  }

  function threadRow(t) {
    return '<a class="thread" href="/forum?t=' + Number(t.id) + '">' +
      '<div class="thread__main">' +
        '<div class="thread__top">' + (t.isPinned ? '<span class="pill pill-pin">Disematkan</span>' : "") + (t.isLocked ? '<span class="pill pill-lock">Dikunci</span>' : "") +
          '<span class="pill pill-tag">' + esc(catLabel(t.category)) + "</span></div>" +
        '<b class="thread__title">' + esc(t.title) + "</b>" +
        '<div class="thread__meta">' + authorLine(t.author) + '<span class="dot">•</span><time title="' + esc(fullDate(t.lastActivityAt)) + '">' + esc(timeAgo(t.lastActivityAt)) + "</time></div>" +
      "</div>" +
      '<div class="thread__stat"><b>' + Number(t.replies) + "</b><span>balasan</span></div></a>";
  }

  function renderComposer(cat) {
    var slot = $("composerSlot");
    if (!ME.loggedIn) {
      slot.innerHTML = '<div class="callout">Mau ikut ngobrol? <a href="' + esc(loginHref()) + '" style="text-decoration:underline"><b>Masuk dengan Google</b></a> dulu untuk membuat topik dan membalas.</div>';
      return;
    }
    slot.innerHTML =
      '<div class="btnrow" style="margin-bottom:16px"><button class="btn btn--sm" id="composerToggle" type="button" aria-expanded="false">+ Topik baru</button></div>' +
      '<form class="panel" id="composer" novalidate hidden>' +
        '<div class="panel__h">Topik baru</div>' +
        '<div class="formrow">' +
          '<label class="field">Kategori<select id="cCat">' + catOptions(cat || "Umum") + "</select></label>" +
          '<label class="field" style="flex:3">Judul<input id="cTitle" maxlength="100" placeholder="Judul singkat dan jelas" autocomplete="off"></label>' +
        "</div>" +
        '<label class="field">Isi <small id="cCount"></small><textarea id="cBody" maxlength="3000" rows="6" placeholder="Tulis isi topikmu di sini..."></textarea></label>' +
        '<div class="btnrow"><button class="btn btn--sm" id="cSave" type="submit">Kirim topik</button><button class="btn btn--sm btn--ghost" id="cCancel" type="button">Batal</button></div>' +
        '<p class="msg" id="composerMsg" role="status"></p>' +
      "</form>";
    var form = $("composer"), toggle = $("composerToggle");
    function count() { $("cCount").textContent = "(" + $("cBody").value.length + "/3000)"; }
    $("cBody").addEventListener("input", count); count();
    toggle.addEventListener("click", function () { form.hidden = !form.hidden; toggle.setAttribute("aria-expanded", String(!form.hidden)); if (!form.hidden) $("cTitle").focus(); });
    $("cCancel").addEventListener("click", function () { form.hidden = true; toggle.setAttribute("aria-expanded", "false"); });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var title = $("cTitle").value.trim(), body = $("cBody").value.trim();
      if (title.length < 3) return setMsg("composerMsg", "err", "Judul minimal 3 karakter.");
      if (body.length < 3) return setMsg("composerMsg", "err", "Isi minimal 3 karakter.");
      var btn = $("cSave"); btn.disabled = true; setMsg("composerMsg", "", "Mengirim...");
      apiCall("/api/forum/threads", "POST", { category: $("cCat").value, title: title, body: body }).then(function (r) {
        if (!r.ok) { btn.disabled = false; return setMsg("composerMsg", "err", r.data.error || "Gagal mengirim."); }
        location.href = "/forum?t=" + Number(r.data.id);
      });
    });
  }

  // =====================================================================
  // DETAIL TOPIK
  // =====================================================================
  var S = null; // { thread, posts, total, hasMore }

  function showThread(id) {
    wrap.innerHTML = '<p class="app__sub skeleton">Memuat topik…</p>';
    apiCall("/api/forum/threads/" + id + "?offset=0").then(function (r) {
      if (r.status === 404) { wrap.innerHTML = '<div class="blockmsg"><h2>Topik tidak ada.</h2><p class="app__sub">Mungkin sudah dihapus.</p><a class="btn btn--ghost" href="/forum">Ke forum</a></div>'; return; }
      if (!r.ok) { wrap.innerHTML = '<p class="msg err">' + esc(r.data.error || "Gagal memuat topik.") + ' <a href="" style="text-decoration:underline">Muat ulang</a></p>'; return; }
      S = { thread: r.data.thread, posts: r.data.posts || [], total: r.data.total || 0, hasMore: !!r.data.hasMore };
      document.title = S.thread.title + " — Forum Distrik 17";
      renderThread();
    });
  }

  function who(a) {
    var href = "/member?id=" + Number(a.id);
    return '<aside class="post__who">' +
      '<a href="' + href + '"><img class="avatar" src="' + esc(avatarSrc(a)) + '" alt="" referrerpolicy="no-referrer" loading="lazy"></a>' +
      '<a class="post__name" href="' + href + '">' + esc(a.name) + "</a>" +
      (a.isAdmin ? '<span class="pill pill-admin">Admin</span>' : "") +
      (a.title ? "<div>" + titleBadgeHtml(a.title) + "</div>" : "") +
    "</aside>";
  }

  function actionsFor(kind, obj, locked) {
    var mine = isMe(obj.author), admin = !!(ME.loggedIn && ME.isAdmin), btns = [];
    if (mine && (!locked || admin)) btns.push('<button type="button" data-act="edit-' + kind + '" data-id="' + Number(obj.id) + '">Edit</button>');
    if (mine || admin) btns.push('<button type="button" data-act="del-' + kind + '" data-id="' + Number(obj.id) + '">Hapus</button>');
    return btns.length ? '<div class="tbl-actions post__actions">' + btns.join("") + "</div>" : "";
  }

  function postCard(kind, obj, locked) {
    return '<article class="post" id="' + kind + "-" + Number(obj.id) + '" data-kind="' + kind + '" data-id="' + Number(obj.id) + '">' + who(obj.author) +
      '<div class="post__main"><div class="post__meta"><time title="' + esc(fullDate(obj.createdAt)) + '">' + esc(timeAgo(obj.createdAt)) + "</time>" +
      (obj.editedAt ? " <small>(diedit)</small>" : "") + '</div><div class="post__body">' + esc(obj.body) + "</div>" + actionsFor(kind, obj, locked) + "</div></article>";
  }

  function threadHeadHtml() {
    var t = S.thread, admin = !!(ME.loggedIn && ME.isAdmin);
    var mod = admin
      ? '<div class="tbl-actions" style="margin-top:10px"><button type="button" data-act="pin">' + (t.isPinned ? "Lepas sematan" : "Sematkan") + '</button><button type="button" data-act="lock">' + (t.isLocked ? "Buka kunci" : "Kunci topik") + "</button></div>"
      : "";
    return '<a class="backlink" href="/forum">← Semua topik</a>' +
      '<div class="thread__top" style="margin-top:10px">' + (t.isPinned ? '<span class="pill pill-pin">Disematkan</span>' : "") + (t.isLocked ? '<span class="pill pill-lock">Dikunci</span>' : "") +
        '<span class="pill pill-tag">' + esc(catLabel(t.category)) + "</span></div>" +
      '<h1 class="app__title thread__h1">' + esc(t.title) + "</h1>" + mod;
  }

  function replyBoxHtml() {
    var t = S.thread, admin = !!(ME.loggedIn && ME.isAdmin);
    if (!ME.loggedIn) return '<div class="callout">Mau membalas? <a href="' + esc(loginHref()) + '" style="text-decoration:underline"><b>Masuk dengan Google</b></a> dulu.</div>';
    if (t.isLocked && !admin) return '<div class="callout">Topik ini dikunci oleh admin, tidak bisa dibalas lagi.</div>';
    return '<form class="panel" id="replyForm" novalidate><div class="panel__h">Balas</div>' +
      '<label class="field"><span class="sr">Isi balasan</span><small id="rCount"></small><textarea id="rBody" maxlength="1500" rows="4" placeholder="Tulis balasanmu..."></textarea></label>' +
      '<div class="btnrow"><button class="btn btn--sm" id="rSave" type="submit">Kirim balasan</button></div><p class="msg" id="replyMsg" role="status"></p></form>';
  }

  function renderThread() {
    var t = S.thread, locked = t.isLocked;
    wrap.innerHTML =
      '<div id="threadHead">' + threadHeadHtml() + "</div>" +
      '<div id="opBox">' + postCard("thread", t, locked) + "</div>" +
      '<div class="replies__h" id="repliesHead"></div>' +
      '<div id="postList"></div>' +
      '<div class="btnrow" style="margin:12px 0"><button class="btn btn--sm btn--ghost" id="morePosts" type="button" hidden>Muat balasan berikutnya</button></div>' +
      '<div id="replyBox">' + replyBoxHtml() + "</div>";
    renderPosts();
    wrap.onclick = onThreadClick;
    wireReply();
    $("morePosts").addEventListener("click", loadMorePosts);
  }

  function renderPosts() {
    var locked = S.thread.isLocked;
    $("repliesHead").textContent = S.total + " balasan";
    $("postList").innerHTML = S.posts.length ? S.posts.map(function (p) { return postCard("post", p, locked); }).join("") : '<p class="app__sub" style="margin:0 0 12px">Belum ada balasan.</p>';
    $("morePosts").hidden = !S.hasMore;
  }

  function loadMorePosts() {
    var btn = $("morePosts"); btn.disabled = true;
    apiCall("/api/forum/threads/" + Number(S.thread.id) + "?offset=" + S.posts.length).then(function (r) {
      btn.disabled = false;
      if (!r.ok) return window.alert(r.data.error || "Gagal memuat.");
      var have = {}; S.posts.forEach(function (p) { have[p.id] = true; });
      (r.data.posts || []).forEach(function (p) { if (!have[p.id]) S.posts.push(p); });
      S.total = r.data.total; S.hasMore = !!r.data.hasMore;
      renderPosts();
    });
  }

  function wireReply() {
    var form = $("replyForm"); if (!form) return;
    function count() { $("rCount").textContent = "(" + $("rBody").value.length + "/1500)"; }
    $("rBody").addEventListener("input", count); count();
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var body = $("rBody").value.trim();
      if (!body) return setMsg("replyMsg", "err", "Balasan tidak boleh kosong.");
      var btn = $("rSave"); btn.disabled = true; setMsg("replyMsg", "", "Mengirim...");
      apiCall("/api/forum/threads/" + Number(S.thread.id) + "/posts", "POST", { body: body }).then(function (r) {
        btn.disabled = false;
        if (!r.ok) return setMsg("replyMsg", "err", r.data.error || "Gagal mengirim.");
        $("rBody").value = ""; count(); S.total += 1;
        if (!S.hasMore) { S.posts.push(r.data.post); renderPosts(); setMsg("replyMsg", "ok", "Terkirim."); }
        else { $("repliesHead").textContent = S.total + " balasan"; setMsg("replyMsg", "ok", "Terkirim. Muat balasan berikutnya untuk melihatnya."); }
      });
    });
  }

  // ---------- aksi (delegasi klik) ----------
  function findPost(id) { return S.posts.filter(function (p) { return Number(p.id) === id; })[0]; }

  function onThreadClick(e) {
    var btn = e.target.closest("button[data-act]"); if (!btn || !S) return;
    var act = btn.getAttribute("data-act"), id = Number(btn.getAttribute("data-id"));
    var t = S.thread;
    if (act === "pin" || act === "lock") {
      btn.disabled = true;
      var body = act === "pin" ? { isPinned: !t.isPinned } : { isLocked: !t.isLocked };
      return apiCall("/api/forum/threads/" + Number(t.id), "PATCH", body).then(function (r) {
        btn.disabled = false;
        if (!r.ok) return window.alert(r.data.error || "Gagal.");
        if (act === "pin") t.isPinned = !t.isPinned; else t.isLocked = !t.isLocked;
        renderThread();
      });
    }
    if (act === "del-thread") {
      if (!window.confirm("Hapus topik ini beserta semua balasannya?")) return;
      return apiCall("/api/forum/threads/" + Number(t.id), "DELETE").then(function (r) {
        if (r.ok) location.href = "/forum"; else window.alert(r.data.error || "Gagal menghapus.");
      });
    }
    if (act === "del-post") {
      if (!window.confirm("Hapus balasan ini?")) return;
      return apiCall("/api/forum/posts/" + id, "DELETE").then(function (r) {
        if (!r.ok) return window.alert(r.data.error || "Gagal menghapus.");
        S.posts = S.posts.filter(function (p) { return Number(p.id) !== id; }); S.total = Math.max(0, S.total - 1);
        renderPosts();
      });
    }
    if (act === "edit-post") return editPost(id);
    if (act === "edit-thread") return editThread();
  }

  function editPost(id) {
    var p = findPost(id), card = $("post-" + id); if (!p || !card) return;
    var main = card.querySelector(".post__main");
    main.innerHTML =
      '<label class="field"><span class="sr">Edit balasan</span><textarea id="eBody" maxlength="1500" rows="4"></textarea></label>' +
      '<div class="btnrow"><button class="btn btn--sm" id="eSave" type="button">Simpan</button><button class="btn btn--sm btn--ghost" id="eCancel" type="button">Batal</button></div><p class="msg" id="eMsg"></p>';
    $("eBody").value = p.body; $("eBody").focus();
    $("eCancel").addEventListener("click", renderPosts);
    $("eSave").addEventListener("click", function () {
      var v = $("eBody").value.trim(); if (!v) return setMsg("eMsg", "err", "Balasan tidak boleh kosong.");
      var b = $("eSave"); b.disabled = true; setMsg("eMsg", "", "Menyimpan...");
      apiCall("/api/forum/posts/" + id, "PATCH", { body: v }).then(function (r) {
        if (!r.ok) { b.disabled = false; return setMsg("eMsg", "err", r.data.error || "Gagal menyimpan."); }
        p.body = r.data.body || v; p.editedAt = new Date().toISOString(); renderPosts();
      });
    });
  }

  function editThread() {
    var t = S.thread, card = $("thread-" + Number(t.id)); if (!card) return;
    var main = card.querySelector(".post__main");
    main.innerHTML =
      '<div class="formrow"><label class="field">Kategori<select id="etCat">' + catOptions(t.category) + "</select></label>" +
      '<label class="field" style="flex:3">Judul<input id="etTitle" maxlength="100"></label></div>' +
      '<label class="field">Isi<textarea id="etBody" maxlength="3000" rows="6"></textarea></label>' +
      '<div class="btnrow"><button class="btn btn--sm" id="etSave" type="button">Simpan</button><button class="btn btn--sm btn--ghost" id="etCancel" type="button">Batal</button></div><p class="msg" id="etMsg"></p>';
    $("etTitle").value = t.title; $("etBody").value = t.body;
    $("etCancel").addEventListener("click", renderThread);
    $("etSave").addEventListener("click", function () {
      var title = $("etTitle").value.trim(), body = $("etBody").value.trim();
      if (title.length < 3) return setMsg("etMsg", "err", "Judul minimal 3 karakter.");
      if (body.length < 3) return setMsg("etMsg", "err", "Isi minimal 3 karakter.");
      var b = $("etSave"); b.disabled = true; setMsg("etMsg", "", "Menyimpan...");
      apiCall("/api/forum/threads/" + Number(t.id), "PATCH", { title: title, body: body, category: $("etCat").value }).then(function (r) {
        if (!r.ok) { b.disabled = false; return setMsg("etMsg", "err", r.data.error || "Gagal menyimpan."); }
        t.title = title; t.body = body; t.category = $("etCat").value; t.editedAt = new Date().toISOString();
        document.title = t.title + " — Forum Distrik 17";
        renderThread();
      });
    });
  }

  // =====================================================================
  // ROUTER
  // =====================================================================
  window.whenMe(function (me) {
    ME = me && me.loggedIn ? me : { loggedIn: false };
    var q = new URLSearchParams(location.search), t = q.get("t");
    if (t && /^\d{1,15}$/.test(t) && Number(t) > 0) showThread(Number(t)); else showList(q.get("cat") || "");
  });
})();
