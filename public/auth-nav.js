(function () {
  var slot = document.getElementById("authSlot");
  if (!slot) return;

  function publish(me) {
    window.D17_ME = me;
    try { document.dispatchEvent(new CustomEvent("d17:me", { detail: me })); } catch (e) {}
  }

  window.apiCall("/api/auth/me").then(function (r) {
    var me = r.data;
    if (!r.ok || !me.loggedIn) {
      var returnTo = encodeURIComponent(location.pathname + location.search);
      slot.innerHTML = '<a class="authSlot__login" href="/api/auth/login?returnTo=' + returnTo + '"><span class="lg">Masuk dengan Google</span><span class="sh">Masuk</span></a>';
      publish({ loggedIn: false });
      return;
    }
    slot.innerHTML =
      '<button class="authSlot__user" id="authUserBtn" aria-haspopup="true" aria-expanded="false">' +
      '<img class="authSlot__avatar" id="authAvatar" src="' + esc(me.avatarUrl || "/assets/favicon.png") + '" alt="" referrerpolicy="no-referrer">' +
      '<span class="authSlot__name" id="authName">' + esc(me.name) + "</span></button>" +
      '<div class="authSlot__menu" id="authMenu" hidden>' +
      '<a href="/profile">Profilku</a>' +
      (me.isAdmin ? '<a href="/admin">Panel Admin</a>' : "") +
      '<button id="authLogoutBtn" type="button">Keluar</button>' +
      "</div>";

    var btn = document.getElementById("authUserBtn"), menu = document.getElementById("authMenu");
    function close() { menu.hidden = true; btn.setAttribute("aria-expanded", "false"); }
    btn.addEventListener("click", function (e) { e.stopPropagation(); menu.hidden = !menu.hidden; btn.setAttribute("aria-expanded", String(!menu.hidden)); });
    document.addEventListener("click", close);
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
    document.getElementById("authLogoutBtn").addEventListener("click", function () {
      window.apiCall("/api/auth/logout", "POST").then(function () { location.href = "/"; });
    });
    publish(me);
  });

  // halaman profil memberi tahu header kalau nama/foto berubah
  document.addEventListener("d17:profile", function (e) {
    var d = e.detail || {}, n = document.getElementById("authName"), a = document.getElementById("authAvatar");
    if (n && d.name) n.textContent = d.name;
    if (a && d.avatarUrl) a.src = d.avatarUrl;
  });
})();
