/* Grunge paint layer + Atmospheric Street Motion Graphics (Rain, Street Embers, Spotlight).
   Everything in the paint layers is absolutely positioned inside the document,
   while #fxCanvas renders lightweight 60fps atmospheric rain and embers. */
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- 1. ATMOSPHERIC STREET CANVAS (RAIN + EMBERS) ----------
  var canvas = document.getElementById('fxCanvas');
  if (canvas && !reduce) {
    var ctx = canvas.getContext('2d');
    var cw = 0, ch = 0;
    var drops = [], embers = [];
    var pointerX = 0.5, pointerY = 0.4;

    function resizeCanvas() {
      cw = canvas.width = window.innerWidth;
      ch = canvas.height = window.innerHeight;
      var dropCount = cw < 700 ? 36 : 70;
      var emberCount = cw < 700 ? 14 : 28;
      drops = [];
      for (var i = 0; i < dropCount; i++) {
        drops.push({
          x: Math.random() * cw,
          y: Math.random() * ch,
          len: 14 + Math.random() * 22,
          vy: 9 + Math.random() * 7,
          vx: -1.2 - Math.random() * 0.8,
          alpha: 0.06 + Math.random() * 0.12
        });
      }
      embers = [];
      for (var j = 0; j < emberCount; j++) {
        embers.push({
          x: Math.random() * cw,
          y: Math.random() * ch,
          r: 1 + Math.random() * 2.2,
          vy: -0.35 - Math.random() * 0.65,
          vx: (Math.random() - 0.5) * 0.5,
          alpha: 0.2 + Math.random() * 0.55,
          phase: Math.random() * Math.PI * 2,
          gold: Math.random() < 0.3
        });
      }
    }

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas, { passive: true });
    window.addEventListener('pointermove', function (e) {
      pointerX = e.clientX / Math.max(1, cw);
      pointerY = e.clientY / Math.max(1, ch);
    }, { passive: true });

    function drawFx() {
      if (document.hidden) {
        requestAnimationFrame(drawFx);
        return;
      }
      ctx.clearRect(0, 0, cw, ch);

      // Subtle atmospheric street rain streaks
      ctx.lineWidth = 1;
      var windOffset = (pointerX - 0.5) * 1.4;
      for (var i = 0; i < drops.length; i++) {
        var d = drops[i];
        ctx.strokeStyle = 'rgba(233, 225, 203, ' + d.alpha + ')';
        ctx.beginPath();
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x + d.vx + windOffset, d.y + d.len);
        ctx.stroke();
        d.x += d.vx + windOffset * 0.3;
        d.y += d.vy;
        if (d.y > ch + 30) { d.y = -25; d.x = Math.random() * cw; }
        if (d.x < -30) d.x = cw + 20;
        else if (d.x > cw + 30) d.x = -20;
      }

      // Rising crimson & gold street embers
      for (var j = 0; j < embers.length; j++) {
        var em = embers[j];
        em.phase += 0.04;
        var flicker = 0.55 + Math.sin(em.phase) * 0.45;
        var a = (em.alpha * flicker).toFixed(3);
        ctx.fillStyle = em.gold ? 'rgba(232, 178, 61, ' + a + ')' : 'rgba(236, 98, 76, ' + a + ')';
        ctx.beginPath();
        ctx.arc(em.x, em.y, em.r, 0, Math.PI * 2);
        ctx.fill();
        em.x += em.vx + Math.sin(em.phase * 0.7) * 0.25;
        em.y += em.vy;
        if (em.y < -10) { em.y = ch + 10; em.x = Math.random() * cw; }
      }

      requestAnimationFrame(drawFx);
    }
    requestAnimationFrame(drawFx);
  }

  // ---------- 2. GRUNGE PAINT SPLATTERS & GRAFFITI LAYER ----------
  var back = document.getElementById('paintBack'), front = document.getElementById('paintFront');
  if (!back || !front) return;
  var P = '/assets/paint/';

  var SPLATS = [
    ['splat-1.webp', 1, 3, 180], ['splat-2.webp', 1, 3, 180], ['splat-3.webp', 1, 3, 180],
    ['splat-5.webp', 1, 2, 180], ['splat-6.webp', 1, 3, 180], ['splat-4.webp', 1, 1, 180],
    ['splat-left.webp', 182 / 286, 2, 10], ['drips-top.webp', 320 / 199, 2, 8],
    ['splat-star-red.webp', 228 / 182, 2, 180], ['splat-bottom.webp', 228 / 181, 2, 14],
    ['splat-star-white.webp', 250 / 240, 1, 180], ['streak-red.webp', 208 / 79, 2, 24],
    ['corner-red.webp', 148 / 79, 1, 30]
  ];
  var TAGS = ['17', 'WARGA', 'GANG 17', 'KOTA INI KITA', 'NO NAME', 'JANGAN DIAM', 'DISTRIK'];

  var items = [];
  var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('hit'); io.unobserve(e.target); } });
  }, { threshold: 0.05 }) : null;

  function rng(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function pick(list, r) {
    var tot = 0, i; for (i = 0; i < list.length; i++) tot += list[i][2];
    var x = r() * tot;
    for (i = 0; i < list.length; i++) { x -= list[i][2]; if (x <= 0) return list[i]; }
    return list[0];
  }
  function docY(el) { return el.getBoundingClientRect().top + window.pageYOffset; }

  function add(layer, o) {
    var d = document.createElement('div');
    d.className = 'pt' + (o.txt ? ' pt--txt' : '');
    d.style.left = o.x + 'px'; d.style.top = o.y + 'px';
    d.style.setProperty('--o', o.o);
    if (o.txt) {
      d.textContent = o.txt;
      d.style.fontSize = o.w + 'px';
      d.style.color = o.color;
      d.style.transform = 'rotate(' + o.r + 'deg)';
      if (o.stroke) { d.style.color = 'transparent'; d.style.webkitTextStroke = o.stroke + 'px ' + o.color; }
      d.dataset.base = o.r;
    } else {
      d.style.width = o.w + 'px'; d.style.height = Math.round(o.w / o.ratio) + 'px';
      d.style.setProperty('--r', o.r + 'deg'); d.style.setProperty('--fx', o.fx);
      var img = new Image(); img.src = P + o.f; img.alt = ''; img.decoding = 'async'; img.loading = 'lazy';
      d.appendChild(img);
    }
    layer.appendChild(d);
    items.push({ el: d, y: o.y + (o.h || o.w / (o.ratio || 1)) / 2, s: o.s, txt: !!o.txt, r: o.r });
    if (io) io.observe(d); else d.classList.add('hit');
  }

  function build() {
    back.innerHTML = ''; front.innerHTML = ''; items = [];
    var W = back.clientWidth, H = back.clientHeight, mobile = W < 700, k = mobile ? 0.62 : 1;
    var r = rng(17);

    var y = mobile ? 360 : 520;
    while (y < H - 260) {
      var a = pick(SPLATS, r), edge = r(), size = (260 + r() * 260) * k * (a[0].indexOf('splat-') === 0 && a[0].length < 14 ? 1.25 : 1);
      var x, o = .62 + r() * .35;
      if (edge < .38) x = -size * (.1 + r() * .3);
      else if (edge < .76) x = W - size * (.6 + r() * .45);
      else { x = W * (.12 + r() * .6); size *= .7; o *= .55; }
      var tilt = (r() * 2 - 1) * a[3];
      add(back, { f: a[0], ratio: a[1], w: size, x: x, y: y - size / 2, r: tilt.toFixed(1), fx: r() < .5 ? -1 : 1, o: o.toFixed(2), s: (r() * .22 - .04).toFixed(3) });
      y += (mobile ? 260 : 300) + r() * (mobile ? 200 : 260);
    }

    var spots = [.07, .21, .36, .5, .63, .77, .9];
    spots.forEach(function (f, i) {
      var t = TAGS[i % TAGS.length], big = t === '17', fs = (big ? 300 : 120 + r() * 60) * k;
      var left = i % 2 === 0;
      add(back, {
        txt: t, w: fs, x: left ? -fs * .1 : W - fs * (big ? 1.1 : t.length * .5), y: H * f,
        r: ((r() * 2 - 1) * 14).toFixed(1), o: big ? .34 : .13, h: fs,
        color: big ? '#e9e1cb' : (i % 3 === 0 ? '#de3a28' : '#e9e1cb'), stroke: big ? 3 : 0, s: (r() * .12).toFixed(3)
      });
    });

    function anchor(sel, frac) { var e = document.querySelector(sel); return e ? docY(e) + e.offsetHeight * frac : null; }
    var ay;
    if ((ay = anchor('#tentang', .1)) !== null) add(back, { f: 'poster-skull.webp', ratio: 317 / 450, w: 250 * k, x: W - 210 * k, y: ay, r: 6, fx: 1, o: mobile ? .3 : .55, s: .05 });
    if ((ay = anchor('#hadiah', .42)) !== null) add(back, { f: 'poster-city.webp', ratio: 382 / 337, w: 330 * k, x: -90 * k, y: ay, r: -5, fx: 1, o: mobile ? .3 : .5, s: .06 });
    if ((ay = anchor('#roadmap', .3)) !== null) add(back, { f: 'crown.webp', ratio: 148 / 120, w: 170 * k, x: W - 140 * k, y: ay, r: -9, fx: 1, o: .65, s: .03 });
    if ((ay = anchor('#update', .35)) !== null) add(back, { f: 'crown.webp', ratio: 148 / 120, w: 130 * k, x: 10, y: ay, r: 12, fx: -1, o: .5, s: .05 });

    ['#daftar', '#update', '#faq'].forEach(function (sel, i) {
      var e = document.querySelector(sel); if (!e) return;
      var w = Math.min(W * (mobile ? .8 : .42), 560);
      add(front, { f: 'tape-hazard.webp', ratio: 867 / 130, w: w, x: i % 2 ? W - w * .8 : -w * .2, y: docY(e) - 18, r: (i % 2 ? 3 : -3) + (r() * 2 - 1), fx: 1, o: .95, s: -.03 });
    });

    var fy = mobile ? 900 : 700, n = 0;
    while (fy < H - 400 && n < (mobile ? 4 : 9)) {
      var s2 = (90 + r() * 90) * k, side = n % 2;
      add(front, { f: 'splat-' + (1 + Math.floor(r() * 6)) + '.webp', ratio: 1, w: s2, x: side ? W - s2 * .5 : -s2 * .55, y: fy, r: (r() * 360).toFixed(0), fx: 1, o: .92, s: -.08 });
      fy += 800 + r() * 700; n++;
    }
    update();
  }

  var ticking = false;
  function update() {
    ticking = false;
    if (reduce) return;
    var mid = window.pageYOffset + window.innerHeight / 2;
    for (var i = 0; i < items.length; i++) {
      var it = items[i], dy = (it.y - mid) * -it.s;
      it.el.style.transform = it.txt ? 'translate3d(0,' + dy.toFixed(1) + 'px,0) rotate(' + it.r + 'deg)' : 'translate3d(0,' + dy.toFixed(1) + 'px,0)';
    }
  }
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });

  var lastW = 0, t;
  function schedule() { clearTimeout(t); t = setTimeout(function () { if (window.innerWidth !== lastW) { lastW = window.innerWidth; build(); } }, 180); }
  window.addEventListener('resize', schedule);
  function init() { lastW = window.innerWidth; build(); }
  if (document.readyState === 'complete') init(); else window.addEventListener('load', init);
})();
