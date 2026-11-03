(function () {
  var C = window.D17 || {};
  var $ = function (s) { return document.querySelector(s); };
  var fmt = function (n) { return n.toLocaleString("id-ID"); };
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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

  // ---------- nav mobile & scroll progress + active spy ----------
  var nav = $("#top"), progress = $("#scrollProgress"), burger = $("#burger"), links = $("#navLinks");
  if (burger && links) {
    burger.addEventListener("click", function () { var o = links.classList.toggle("open"); burger.setAttribute("aria-expanded", o); });
    links.addEventListener("click", function (e) { if (e.target.tagName === "A") { links.classList.remove("open"); burger.setAttribute("aria-expanded", false); } });
  }

  var spySections = ["tentang", "daftar", "hadiah", "update", "roadmap", "faq", "support"]
    .map(function (id) { return document.getElementById(id); })
    .filter(Boolean);

  function updateScrollUI() {
    var scrollY = window.pageYOffset || document.documentElement.scrollTop || 0;
    var maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    if (nav) nav.classList.toggle("is-scrolled", scrollY > 36);
    if (progress) progress.style.transform = "scaleX(" + Math.min(1, Math.max(0, scrollY / maxScroll)).toFixed(4) + ")";

    var activeId = "";
    var probe = scrollY + window.innerHeight * 0.34;
    for (var i = 0; i < spySections.length; i++) {
      if (spySections[i].offsetTop <= probe) activeId = spySections[i].id;
    }
    if (links) {
      links.querySelectorAll('a[href^="#"]').forEach(function (a) {
        a.classList.toggle("is-active", a.getAttribute("href") === "#" + activeId);
      });
    }
  }
  window.addEventListener("scroll", updateScrollUI, { passive: true });
  updateScrollUI();

  // ---------- 3D Hero Parallax & Interactive Card Tilt ----------
  var heroSec = $("#heroSec"), heroStage = $("#heroStage"), heroBg = $("#heroBg");
  if (heroSec && heroStage && !reduceMotion) {
    heroSec.addEventListener("pointermove", function (e) {
      var r = heroSec.getBoundingClientRect();
      var px = (e.clientX - r.left) / Math.max(1, r.width);
      var py = (e.clientY - r.top) / Math.max(1, r.height);
      heroSec.style.setProperty("--hx", (px * 100).toFixed(1) + "%");
      heroSec.style.setProperty("--hy", (py * 100).toFixed(1) + "%");
      var rx = ((0.5 - py) * 7).toFixed(2);
      var ry = ((px - 0.5) * 9).toFixed(2);
      heroStage.style.transform = "rotateX(" + rx + "deg) rotateY(" + ry + "deg)";
      if (heroBg) {
        heroBg.style.transform = "scale(1.08) translate3d(" + ((0.5 - px) * 18).toFixed(1) + "px," + ((0.5 - py) * 14).toFixed(1) + "px,0)";
      }
    }, { passive: true });
    heroSec.addEventListener("pointerleave", function () {
      heroStage.style.transform = "";
      if (heroBg) heroBg.style.transform = "";
    });
  }

  function wireTiltElements(root) {
    if (reduceMotion) return;
    (root || document).querySelectorAll("[data-tilt]").forEach(function (el) {
      if (el.dataset.tiltBound) return;
      el.dataset.tiltBound = "1";
      el.addEventListener("pointermove", function (e) {
        var rect = el.getBoundingClientRect();
        var x = e.clientX - rect.left;
        var y = e.clientY - rect.top;
        var rx = ((0.5 - y / Math.max(1, rect.height)) * 6).toFixed(2) + "deg";
        var ry = ((x / Math.max(1, rect.width) - 0.5) * 7).toFixed(2) + "deg";
        el.style.setProperty("--mx", x.toFixed(0) + "px");
        el.style.setProperty("--my", y.toFixed(0) + "px");
        el.style.setProperty("--rx", rx);
        el.style.setProperty("--ry", ry);
      }, { passive: true });
      el.addEventListener("pointerleave", function () {
        el.style.setProperty("--rx", "0deg");
        el.style.setProperty("--ry", "0deg");
      });
    });
  }
  wireTiltElements(document);

  // ---------- Interactive Identity & Gacha Simulator ----------
  var SIM_NAMES = ["Bima Saputra", "Rangga Wijaya", "Dito Mahendra", "Seno Baskoro", "Alya Prameswari", "Nadia Kusuma", "Reza Pratama", "Galih Pangestu"];
  var SIM_CLANS = ["Sunda • Blok Selatan", "Jawa • Sektor Timur", "Betawi • Gang 17", "Minang • Pasar Malam", "Batak • Simpang Utara", "Bugis • Dermaga Tua"];
  var SIM_LOOKS = ["Jaket Sukajan • Rambut Belah Tengah", "Hoodie Oversize • Wolfcut Hitam", "Kemeja Flanel • Topi Beanie", "Jaket Denim Sobek • Mullet Jalanan", "Tracksuit Retro • Kacamata Hitam"];
  var SIM_STYLES = ["Brawler Lorong Sempit", "Counter & Parry Cepat", "Striker Tendangan Jauh", "rushdown Agresif", "Taktikal Jarak Dekat"];
  var SIM_TITLES = [
    { text: "Warga Baru", tier: "common" },
    { text: "Anak Gang", tier: "common" },
    { text: "Penghuni Blok 17", tier: "common" },
    { text: "Penjaga Gang", tier: "common" },
    { text: "Kepala Preman", tier: "rare" },
    { text: "Raja Trotoar", tier: "rare" },
    { text: "Bayangan Malam", tier: "rare" },
    { text: "Legenda Gang", tier: "rare" },
    { text: "Warga Awal", tier: "epic" },
    { text: "Pendiri Distrik", tier: "epic" },
    { text: "Momok Kota 17", tier: "epic" }
  ];

  var simBtn = $("#simRollBtn"), simCard = $("#simCard");
  if (simBtn && simCard) {
    simBtn.addEventListener("click", function () {
      simCard.classList.remove("is-rolling");
      void simCard.offsetWidth;
      simCard.classList.add("is-rolling");
      var pickItem = function (arr) { return arr[Math.floor(Math.random() * arr.length)]; };
      var roll = Math.random() * 100;
      var tier = roll < 70 ? "common" : roll < 95 ? "rare" : "epic";
      var pool = SIM_TITLES.filter(function (t) { return t.tier === tier; });
      var chosen = pickItem(pool);
      var num = String(10 + Math.floor(Math.random() * 980)).padStart(4, "0");
      $("#simSerial").textContent = "NO. D17-" + num;
      $("#simName").textContent = pickItem(SIM_NAMES);
      $("#simClan").textContent = pickItem(SIM_CLANS);
      $("#simLook").textContent = pickItem(SIM_LOOKS);
      $("#simStyle").textContent = pickItem(SIM_STYLES);
      $("#simTitle").innerHTML = '<span class="badge-title tier-' + chosen.tier + '">' + esc(chosen.text) + "</span>";
    });
  }

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

  // ---------- counter + hadiah (with smooth animated number count-up) ----------
  var ms = (C.milestones || []).slice(), count = C.preRegCount || 0, displayedCount = 0, countAnimId = 0;
  function animateRegCount(targetVal) {
    var el = $("#regCount");
    if (!el) return;
    if (reduceMotion) {
      displayedCount = targetVal;
      el.textContent = fmt(targetVal);
      return;
    }
    cancelAnimationFrame(countAnimId);
    var startVal = displayedCount;
    var startTime = performance.now();
    var duration = 900;
    function step(now) {
      var t = Math.min(1, (now - startTime) / duration);
      var eased = 1 - Math.pow(1 - t, 3);
      displayedCount = Math.round(startVal + (targetVal - startVal) * eased);
      el.textContent = fmt(displayedCount);
      if (t < 1) countAnimId = requestAnimationFrame(step);
    }
    countAnimId = requestAnimationFrame(step);
  }

  function renderMiles() {
    ms.sort(function (a, b) { return a.at - b.at; });
    var sec = $("#hadiah"); if (sec) sec.hidden = !ms.length;
    var navA = document.querySelector('#navLinks a[href="#hadiah"]'); if (navA) navA.hidden = !ms.length;
    animateRegCount(count);
    var next = ms.filter(function (m) { return count < m.at; })[0];
    var last = ms.length ? ms[ms.length - 1].at : 1, prev = 0;
    ms.forEach(function (m) { if (m.at <= count) prev = m.at; });
    var top = next ? next.at : last;
    var pct = next ? Math.round((count - prev) / Math.max(1, top - prev) * 100) : 100;
    $("#regBar").style.width = Math.max(0, Math.min(100, pct)) + "%";
    $("#regNext").textContent = !ms.length ? "" : next ? "Target berikutnya: " + fmt(next.at) + " — " + next.title : "Semua hadiah sudah terbuka!";
    $("#miles").innerHTML = ms.map(function (m, idx) {
      var open = count >= m.at;
      return '<li class="rv in ' + (open ? "is-open" : "") + '" style="--d:' + (idx * 65) + 'ms"><b>' + fmt(m.at) + "</b><div><h3>" + esc(m.title) + "</h3><p>" + esc(m.desc) +
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
    var io = new IntersectionObserver(function (es) { es.forEach(function (x) { if (x.isIntersecting) { x.target.classList.add("in"); io.unobserve(x.target); } }); }, { threshold: 0.1 });
    els.forEach(function (el) { io.observe(el); });
  }
  window.apiCall("/api/announcements").then(function (r) {
    var list = $("#logList"); if (!list) return;
    if (!r.ok) { list.innerHTML = '<p class="log__empty">Kabar terbaru belum bisa dimuat. Coba muat ulang halaman.</p>'; return; }
    var items = r.data.announcements || [];
    if (!items.length) { list.innerHTML = '<p class="log__empty">Belum ada kabar. Pantau terus halaman ini.</p>'; return; }
    list.innerHTML = items.map(function (a, idx) {
      var red = /^(segera|penting|event)$/i.test(a.tag);
      var img = a.image_url ? '<a class="log__imgwrap" href="' + esc(a.image_url) + '" target="_blank" rel="noopener"><img class="log__img" src="' + esc(a.image_url) + '" alt="' + esc(a.title) + '" loading="lazy"></a>' : "";
      return '<article class="log__item rv" style="--d:' + (idx * 80) + 'ms"><time datetime="' + esc(a.published_at) + '">' + esc(dateLabel(a.published_at)) + "</time><div><h3>" + esc(a.title) + "</h3>" +
        (a.body ? '<p class="log__body">' + esc(a.body) + "</p>" : "") + img +
        '<span class="tag' + (red ? " tag--red" : "") + '">' + esc(a.tag) + "</span></div></article>";
    }).join("");
    revealObserve([].slice.call(list.querySelectorAll(".log__item")));
  });

  // ---------- staggered reveal on scroll ----------
  var revealTargets = [].slice.call(document.querySelectorAll(".card,.road__step,.faq details,.counter,.joinbox,.idpreview"));
  revealTargets.forEach(function (el, idx) {
    el.classList.add("rv");
    el.style.setProperty("--d", ((idx % 6) * 55) + "ms");
  });
  revealObserve(revealTargets);
})();
