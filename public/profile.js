(function () {
  var wrap = document.getElementById("appWrap");
  var P = null; // state profil saat ini

  function tierLabel(t) { return t === "epic" ? "Epik" : t === "rare" ? "Rare" : "Umum"; }
  function titleBadge(t) {
    if (!t) return '<span class="badge-title tier-common">Belum punya title</span>';
    return '<span class="badge-title tier-' + esc(t.tier) + '">' + esc(t.text) + "</span>";
  }
  function setMsg(id, cls, text) { var m = document.getElementById(id); if (m) { m.className = "msg" + (cls ? " " + cls : ""); m.textContent = text || ""; } }
  function $(id) { return document.getElementById(id); }

  function render() {
    wrap.innerHTML =
      '<h1 class="app__title">Profil<em>ku.</em></h1>' +
      '<p class="app__sub">Atur identitasmu di Distrik 17.</p>' +
      '<div class="callout" id="robloxCallout" hidden><b>Satu langkah lagi:</b> isi username Roblox kamu di bawah supaya hadiah bisa diklaim di game.</div>' +

      '<div class="panel">' +
        '<div class="btnrow" style="justify-content:flex-end;margin:0 0 10px"><a class="btn btn--sm btn--ghost" id="pubLink" href="/member">Lihat profil publikku</a></div>' +
        '<div class="profhead">' +
          '<div class="profhead__avatar">' +
            '<img id="avatarImg" src="' + esc(P.avatarUrl || "/assets/favicon.png") + '" alt="Foto profil" referrerpolicy="no-referrer">' +
            '<label class="profhead__upload" title="Ganti foto" aria-label="Ganti foto profil">+<input id="avatarInput" type="file" accept="image/png,image/jpeg,image/webp" hidden></label>' +
          "</div>" +
          "<div>" +
            '<div class="profhead__name" id="headName"></div>' +
            '<div class="profhead__email" id="headEmail"></div>' +
            '<div style="margin-top:8px" id="headTitle"></div>' +
          "</div>" +
        "</div>" +
        '<p class="msg" id="avatarMsg"></p>' +
      "</div>" +

      '<form class="panel" id="profileForm" novalidate>' +
        '<div class="panel__h">Data diri</div>' +
        '<div class="formrow">' +
          '<label class="field">Nama tampilan<input id="fName" maxlength="60" autocomplete="nickname"></label>' +
          '<label class="field">Username Roblox<input id="fRoblox" maxlength="20" placeholder="contoh: UjangPratama17" autocomplete="off" autocapitalize="off" spellcheck="false"></label>' +
        "</div>" +
        '<label class="check" style="margin-bottom:16px"><input type="checkbox" id="fRobloxPub"> <span>Tampilkan username Roblox di profil publik</span></label>' +
        '<label class="field">Bio <small id="bioCount"></small><textarea id="fBio" maxlength="280" placeholder="Ceritakan dikit soal kamu..."></textarea></label>' +
        '<button class="btn btn--sm" id="saveProfileBtn" type="submit">Simpan perubahan</button>' +
        '<p class="msg" id="profileMsg" role="status"></p>' +
      "</form>" +

      '<div class="panel">' +
        '<div class="panel__h">Reroll Title</div>' +
        '<div class="rollbox">' +
          '<div class="rollbox__result" id="rollResult" aria-live="polite"></div>' +
          '<div class="rollbox__count"><b id="rerollCount"></b> reroll tersisa</div>' +
          '<button class="btn" id="rerollBtn" type="button">Putar Title <i>→</i></button>' +
          '<p class="msg" id="rerollMsg" role="status"></p>' +
        "</div>" +
      "</div>" +

      '<div class="panel">' +
        '<div class="panel__h">Koleksi title <small id="ownedCount" style="font-weight:500"></small></div>' +
        '<div class="titlegrid" id="titleGrid"></div>' +
        '<p class="msg" id="selectMsg" role="status"></p>' +
      "</div>";

    // nilai diisi lewat properti (bukan lewat string HTML) supaya aman dari injeksi
    $("headName").textContent = P.name; $("headEmail").textContent = P.email;
    $("fName").value = P.name; $("fRoblox").value = P.robloxUsername || ""; $("fBio").value = P.bio || "";
    $("fRobloxPub").checked = !!P.robloxPublic; $("pubLink").href = "/member?id=" + Number(P.id);
    updateBioCount(); updateHead(); updateRerollUI(); renderTitleGrid();
    $("rollResult").innerHTML = titleBadge(P.activeTitle);

    wireAvatar(); wireForm(); wireReroll();
  }

  function updateBioCount() { $("bioCount").textContent = "(" + $("fBio").value.length + "/280)"; }
  function updateHead() {
    $("headTitle").innerHTML = titleBadge(P.activeTitle);
    $("robloxCallout").hidden = !!P.robloxUsername;
  }
  function updateRerollUI() {
    $("rerollCount").textContent = P.rerollsRemaining;
    $("rerollBtn").disabled = P.rerollsRemaining <= 0;
  }

  function renderTitleGrid() {
    var grid = $("titleGrid"), owned = P.ownedTitles || [];
    $("ownedCount").textContent = owned.length ? "(" + owned.length + ")" : "";
    if (!owned.length) { grid.innerHTML = '<p class="app__sub" style="margin:0">Belum ada title. Coba reroll dulu.</p>'; return; }
    grid.innerHTML = owned.map(function (t) {
      var on = P.activeTitle && Number(P.activeTitle.id) === Number(t.id);
      return '<button type="button" class="titlechip tier-' + esc(t.tier) + (on ? " is-active" : "") + '" data-id="' + Number(t.id) + '" aria-pressed="' + (on ? "true" : "false") + '">' +
        esc(t.text) + "<small>" + tierLabel(t.tier) + (on ? " • dipakai" : "") + "</small></button>";
    }).join("");
    grid.querySelectorAll(".titlechip").forEach(function (chip) {
      chip.addEventListener("click", function () { selectTitle(Number(chip.getAttribute("data-id"))); });
    });
  }

  function selectTitle(id) {
    setMsg("selectMsg", "", "");
    apiCall("/api/titles/select", "POST", { titleId: id }).then(function (r) {
      if (!r.ok) return setMsg("selectMsg", "err", r.data.error || "Gagal memilih title.");
      P.activeTitle = (P.ownedTitles || []).filter(function (t) { return Number(t.id) === id; })[0] || null;
      updateHead(); renderTitleGrid(); $("rollResult").innerHTML = titleBadge(P.activeTitle);
      setMsg("selectMsg", "ok", "Title dipakai.");
    });
  }

  function wireAvatar() {
    var input = $("avatarInput");
    input.addEventListener("change", function () {
      var file = input.files[0]; if (!file) return;
      setMsg("avatarMsg", "", "Mengunggah...");
      prepareImage(file, 320, { square: true, maxBytes: 1.2 * 1048576 }).then(function (dataUrl) {
        return apiCall("/api/avatar", "POST", { dataUrl: dataUrl });
      }).then(function (r) {
        if (!r.ok) return setMsg("avatarMsg", "err", r.data.error || "Gagal mengunggah.");
        P.avatarUrl = r.data.avatarUrl; $("avatarImg").src = r.data.avatarUrl;
        document.dispatchEvent(new CustomEvent("d17:profile", { detail: { avatarUrl: r.data.avatarUrl } }));
        setMsg("avatarMsg", "ok", "Foto profil diperbarui.");
      }).catch(function (e) { setMsg("avatarMsg", "err", e.message || "Gagal memproses gambar."); })
        .then(function () { input.value = ""; }); // boleh pilih file yang sama lagi
    });
  }

  function wireForm() {
    $("fBio").addEventListener("input", updateBioCount);
    $("profileForm").addEventListener("submit", function (e) {
      e.preventDefault();
      var name = $("fName").value.trim(), roblox = $("fRoblox").value.trim();
      if (name.length < 2) return setMsg("profileMsg", "err", "Nama minimal 2 karakter.");
      if (roblox && !/^[A-Za-z0-9_]{3,20}$/.test(roblox)) return setMsg("profileMsg", "err", "Username Roblox 3–20 karakter (huruf, angka, garis bawah).");
      var btn = $("saveProfileBtn"); btn.disabled = true; setMsg("profileMsg", "", "Menyimpan...");
      apiCall("/api/profile", "PUT", { name: name, robloxUsername: roblox, bio: $("fBio").value, robloxPublic: $("fRobloxPub").checked }).then(function (r) {
        btn.disabled = false;
        if (!r.ok) return setMsg("profileMsg", "err", r.data.error || "Gagal menyimpan.");
        P.name = r.data.name || name; P.robloxUsername = roblox; P.robloxPublic = $("fRobloxPub").checked; P.bio = $("fBio").value.trim();
        $("headName").textContent = P.name; updateHead();
        document.dispatchEvent(new CustomEvent("d17:profile", { detail: { name: P.name } }));
        setMsg("profileMsg", "ok", "Tersimpan.");
      });
    });
  }

  function wireReroll() {
    var ROLL_PREVIEW = [
      { text: "Anak Gang", tier: "common" },
      { text: "Kepala Preman", tier: "rare" },
      { text: "Warga Awal", tier: "epic" },
      { text: "Raja Trotoar", tier: "rare" },
      { text: "Penghuni Blok 17", tier: "common" },
      { text: "Pendiri Distrik", tier: "epic" }
    ];
    $("rerollBtn").addEventListener("click", function () {
      var btn = this, result = $("rollResult");
      btn.disabled = true; setMsg("rerollMsg", "", "");
      result.classList.add("is-spinning");
      var spinIdx = 0;
      var spinTimer = setInterval(function () {
        var sample = ROLL_PREVIEW[spinIdx % ROLL_PREVIEW.length];
        result.innerHTML = titleBadge(sample);
        spinIdx++;
      }, 75);
      apiCall("/api/titles/reroll", "POST").then(function (r) {
        setTimeout(function () {
          clearInterval(spinTimer);
          result.classList.remove("is-spinning");
          if (!r.ok) {
            result.innerHTML = titleBadge(P.activeTitle);
            setMsg("rerollMsg", "err", r.data.error || "Gagal reroll.");
            btn.disabled = P.rerollsRemaining <= 0;
            return;
          }
          var t = r.data.title;
          P.rerollsRemaining = r.data.rerollsRemaining;
          if (r.data.isNew) P.ownedTitles = [t].concat(P.ownedTitles || []);
          result.innerHTML = titleBadge(t);
          result.classList.remove("is-landed");
          void result.offsetWidth;
          result.classList.add("is-landed");
          updateRerollUI(); renderTitleGrid();
          setMsg("rerollMsg", "ok", r.data.isNew ? "Title baru didapat! Klik di koleksi untuk memakainya." : "Dapat title yang sudah kamu punya.");
        }, 320);
      });
    });
  }

  function showLoginPrompt() {
    wrap.innerHTML =
      '<div class="blockmsg"><h2>Masuk dulu, boss.</h2>' +
      '<p class="app__sub">Login pakai Google buat lihat dan atur profilmu.</p>' +
      '<a class="btn" href="/api/auth/login?returnTo=/profile">Masuk dengan Google <i>→</i></a></div>';
  }

  apiCall("/api/profile").then(function (r) {
    if (r.status === 401) return showLoginPrompt();
    if (!r.ok) { wrap.innerHTML = '<p class="msg err">' + esc(r.data.error || "Gagal memuat profil.") + ' <a href="" style="text-decoration:underline">Muat ulang</a></p>'; return; }
    P = r.data; render();
  });
})();
