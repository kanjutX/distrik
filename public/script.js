(function () {
  var C = window.D17 || {};
  var $ = function (s) { return document.querySelector(s); };
  var fmt = function (n) { return n.toLocaleString("id-ID"); };

  // ---------- link (config.js = bawaan, admin bisa menimpa lewat /api/settings-public) ----------
  function applyLinks(over) {
    document.querySelectorAll("[data-link]").forEach(function (a) {
      var k = a.getAttribute("data-link");
      var v = over ? over[k] : C[k];
      if (over && v === undefined) v = C[k];
      if (k === "email") {
        var t = document.getElementById("mailTxt");
        if (v) { a.href = "mailto:" + v; if (t) t.textContent = v + " →"; } else { a.removeAttribute("href"); }
        return;
      }
      if (v && /^https?:\/\//i.test(v)) a.href = v; else a.removeAttribute("href");
    });
  }
  applyLinks(null);

  // ---------- nav mobile ----------
  var burger = $("#burger"), links = $("#navLinks");
  burger.addEventListener("click", function () { var o = links.classList.toggle("open"); burger.setAttribute("aria-expanded", o); });
  links.addEventListener("click", function (e) { if (e.target.tagName === "A") { links.classList.remove("open"); burger.setAttribute("aria-expanded", false); } });

  // ---------- notifikasi hasil login (?login=...) ----------
  var NOTICES = {
    cancelled: "Login dibatalkan.",
    closed: "Pendaftaran sedang ditutup sementara oleh admin.",
    banned: "Akun ini diblokir. Hubungi support kalau merasa ini salah.",
    expired: "Sesi login kedaluwarsa. Coba masuk lagi.",
    conflict: "Email ini sudah terhubung ke akun Google lain.",
    unavailable: "Login belum diaktifkan. Coba lagi nanti.",
    error: "Login gagal. Coba lagi sebentar."
  };
  (function () {
    var m = /[?&]login=([a-z]+)/.exec(location.search), box = $("#notice");
    if (!m || !NOTICES[m[1]] || !box) return;
    box.textContent = NOTICES[m[1]]; box.hidden = false;
    try { history.replaceState(null, "", location.pathname + location.hash); } catch (e) {}
    setTimeout(function () { box.hidden = true; }, 9000);
    box.addEventListener("click", function () { box.hidden = true; });
  })();

  // ---------- countdown ----------
  var cdTimer = null;
  function setupCountdown(launchDate) {
    clearInterval(cdTimer);
    var box = $("#countdown"), note = $("#cdNote");
    var target = launchDate ? new Date(launchDate).getTime() : NaN;
    if (isNaN(target)) { box.hidden = true; note.textContent = "Tanggal rilis segera diumumkan — daftar supaya kamu tahu duluan."; return; }
    box.hidden = false; note.textContent = "Beta tertutup dibuka dalam:";
    var p = function (n) { return String(n).padStart(2, "0"); };
    var tick = function () {
      var d = Math.max(0, target - Date.now()), s = Math.floor(d / 1000);
      $("#cdD").textContent = p(Math.floor(s / 86400)); $("#cdH").textContent = p(Math.floor(s % 86400 / 3600));
      $("#cdM").textContent = p(Math.floor(s % 3600 / 60)); $("#cdS").textContent = p(s % 60);
      if (d <= 0) { note.textContent = "Beta sudah dibuka!"; clearInterval(cdTimer); }
    };
    tick(); cdTimer = setInterval(tick, 1000);
  }
  setupCountdown(C.launchDate);

  // ---------- counter + hadiah ----------
  var ms = (C.milestones || []).slice(), count = C.preRegCount || 0;
  function renderMiles() {
    ms.sort(function (a, b) { return a.at - b.at; });
    var sec = $("#hadiah"); if (sec) sec.hidden = !ms.length;
    var navA = document.querySelector('#navLinks a[href="#hadiah"]'); if (navA) navA.hidden = !ms.length;
    $("#regCount").textContent = fmt(count);
    var next = ms.filter(function (m) { return count < m.at; })[0];
    var last = ms.length ? ms[ms.length - 1].at : 1, prev = 0;
    ms.forEach(function (m) { if (m.at <= count) prev = m.at; });
    var top = next ? next.at : last;
    var pct = next ? Math.round((count - prev) / Math.max(1, top - prev) * 100) : 100;
    $("#regBar").style.width = Math.max(0, Math.min(100, pct)) + "%";
    $("#regNext").textContent = !ms.length ? "" : next ? "Target berikutnya: " + fmt(next.at) + " — " + next.title : "Semua hadiah sudah terbuka!";
    $("#miles").innerHTML = ms.map(function (m) {
      var open = count >= m.at;
      return '<li class="rv in ' + (open ? "is-open" : "") + '"><b>' + fmt(m.at) + "</b><div><h3>" + esc(m.title) + "</h3><p>" + esc(m.desc) +
        '</p></div><span class="st">' + (open ? "TERBUKA" : "TERKUNCI") + "</span></li>";
    }).join("");
  }
  renderMiles();

  // ---------- tombol daftar (tergantung login & status pendaftaran) ----------
  var regOpen = true, me = null;
  function renderJoin() {
    var btn = $("#joinBtn"), msg = $("#joinMsg"); if (!btn) return;
    if (me && me.loggedIn) {
      btn.href = "/profile"; btn.innerHTML = "Buka profilku <i>→</i>"; btn.classList.remove("is-off");
      msg.textContent = "Kamu sudah terdaftar sebagai " + me.name + "."; msg.className = "joinbox__msg ok";
    } else if (!regOpen) {
      btn.removeAttribute("href"); btn.classList.add("is-off"); btn.setAttribute("aria-disabled", "true");
      msg.textContent = "Pendaftaran sedang ditutup sementara oleh admin."; msg.className = "joinbox__msg err";
    } else {
      btn.href = "/api/auth/login?returnTo=/profile"; btn.classList.remove("is-off"); btn.removeAttribute("aria-disabled");
      msg.textContent = ""; msg.className = "joinbox__msg";
    }
  }
  renderJoin();
  document.addEventListener("d17:me", function (e) { me = e.detail; renderJoin(); });
  if (window.D17_ME) { me = window.D17_ME; renderJoin(); }

  // ---------- data dari server ----------
  window.apiCall("/api/settings-public").then(function (r) {
    if (!r.ok) return;
    var s = r.data;
    setupCountdown(s.launchDate || "");
    regOpen = s.registrationOpen !== false; renderJoin();
    if (s.links) applyLinks(s.links);
    if (Array.isArray(s.milestones)) { ms = s.milestones.slice(); renderMiles(); }
  });
  window.apiCall("/api/stats").then(function (r) {
    if (r.ok && typeof r.data.count === "number") { count = r.data.count; renderMiles(); }
  });

  // ---------- pengumuman ----------
  function dateLabel(iso) {
    try { return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Jakarta" }).toUpperCase(); }
    catch (e) { return ""; }
  }
  function revealObserve(els) {
    if (!("IntersectionObserver" in window)) { els.forEach(function (el) { el.classList.add("in"); }); return; }
    var io = new IntersectionObserver(function (es) { es.forEach(function (x) { if (x.isIntersecting) { x.target.classList.add("in"); io.unobserve(x.target); } }); }, { threshold: 0.12 });
    els.forEach(function (el) { io.observe(el); });
  }
  window.apiCall("/api/announcements").then(function (r) {
    var list = $("#logList"); if (!list) return;
    if (!r.ok) { list.innerHTML = '<p class="log__empty">Kabar terbaru belum bisa dimuat. Coba muat ulang halaman.</p>'; return; }
    var items = r.data.announcements || [];
    if (!items.length) { list.innerHTML = '<p class="log__empty">Belum ada kabar. Pantau terus halaman ini.</p>'; return; }
    list.innerHTML = items.map(function (a) {
      var red = /^(segera|penting|event)$/i.test(a.tag);
      var img = a.image_url ? '<a class="log__imgwrap" href="' + esc(a.image_url) + '" target="_blank" rel="noopener"><img class="log__img" src="' + esc(a.image_url) + '" alt="' + esc(a.title) + '" loading="lazy"></a>' : "";
      return '<article class="log__item rv"><time datetime="' + esc(a.published_at) + '">' + esc(dateLabel(a.published_at)) + "</time><div><h3>" + esc(a.title) + "</h3>" +
        (a.body ? '<p class="log__body">' + esc(a.body) + "</p>" : "") + img +
        '<span class="tag' + (red ? " tag--red" : "") + '">' + esc(a.tag) + "</span></div></article>";
    }).join("");
    revealObserve([].slice.call(list.querySelectorAll(".log__item")));
  });

  // ---------- reveal on scroll ----------
  revealObserve([].slice.call(document.querySelectorAll(".card,.road__step,.faq details,.counter,.joinbox")).map(function (el) { el.classList.add("rv"); return el; }));
})();
