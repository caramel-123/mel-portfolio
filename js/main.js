(function () {
  function getResolvedTheme(pref) {
    if (pref === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return pref;
  }

  function applyTheme(pref) {
    var resolved = getResolvedTheme(pref);
    document.documentElement.setAttribute('data-theme', resolved);
    document.documentElement.setAttribute('data-theme-pref', pref);
    try { sessionStorage.setItem('theme', pref); } catch (e) { /* storage unavailable: fine */ }
  }

  function updateThemeIconActiveState() {
    var pref = document.documentElement.getAttribute('data-theme-pref') || 'system';
    document.querySelectorAll('.theme-icon-btn').forEach(function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-theme-choice') === pref);
    });
  }

  function initTheme() {
    var pref = document.documentElement.getAttribute('data-theme-pref') || 'light';
    applyTheme(pref);
    updateThemeIconActiveState();

    document.querySelectorAll('.theme-icon-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        applyTheme(btn.getAttribute('data-theme-choice'));
        updateThemeIconActiveState();
      });
    });

    // Background music for dark mode. Browsers only allow audio after a click, so it starts when the visitor
    // taps the theme switch into dark, and stops when they switch back to light.
    var music = new Audio('audio/fireflies.mp3?v=2');
    music.loop = true;
    music.volume = 0.4;
    music.preload = 'none';
    function playMusic() {
      var p = music.play();
      if (p && p.catch) p.catch(function () { /* blocked or unavailable: stay silent */ });
    }
    function stopMusic() { music.pause(); music.currentTime = 0; }

    var themeSwitch = document.getElementById('theme-switch');
    if (themeSwitch) {
      themeSwitch.addEventListener('click', function () {
        var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        applyTheme(isDark ? 'light' : 'dark');
        updateThemeIconActiveState();
        if (isDark) stopMusic(); else playMusic();
      });
    }
    // switching to light by any other control (mobile menu buttons) also stops it
    document.querySelectorAll('.theme-icon-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var choice = btn.getAttribute('data-theme-choice');
        var dark = document.documentElement.getAttribute('data-theme') === 'dark';
        if (dark) playMusic(); else stopMusic();
      });
    });

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () {
      var pref = document.documentElement.getAttribute('data-theme-pref') || 'system';
      if (pref === 'system') applyTheme('system');
    });
  }

  function initMobileMenu() {
    var toggle = document.getElementById('menu-toggle');
    var menu = document.getElementById('mobile-menu');
    if (!toggle || !menu) return;

    function close() {
      menu.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    }

    toggle.addEventListener('click', function () {
      var isOpen = menu.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(isOpen));
    });

    menu.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', close);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') close();
    });
  }

  // Reassigned by initTabs() once it runs; initCommandPalette() calls this
  // by reference, so the assignment order just needs to happen before a click.
  var switchTab = function () {};

  function initTabs() {
    var panels = Array.prototype.slice.call(document.querySelectorAll('.tab-panel'));
    var navLinks = Array.prototype.slice.call(document.querySelectorAll('[data-nav]'));
    if (!panels.length) return;

    var validTabs = panels.map(function (p) { return p.getAttribute('data-tab'); });

    function setActiveNav(tab) {
      navLinks.forEach(function (link) {
        link.classList.toggle('active', link.getAttribute('data-nav') === tab);
      });
    }

    function activate(tab, opts) {
      opts = opts || {};
      if (tab === 'stack') { tab = 'experience'; opts.scrollToId = '#stack'; }   // the stack now lives under experience
      if (validTabs.indexOf(tab) === -1) tab = 'home';

      panels.forEach(function (panel) {
        panel.hidden = panel.getAttribute('data-tab') !== tab;
      });
      setActiveNav(tab);

      if (opts.updateHash !== false) {
        history.pushState(null, '', '#' + tab);
      }

      if (tab === 'home') {
        // The gallery marquee measured its track at 0 width while this tab
        // was hidden (display: none collapses layout) — remeasure now.
        window.dispatchEvent(new Event('resize'));
      }

      var scrollTarget = opts.scrollToId
        ? document.querySelector(opts.scrollToId)
        : document.getElementById('tab-' + tab);
      // first load on the home tab: just start at the very top, so the headline is never tucked under the header
      if (tab === 'home' && opts.smooth === false && !opts.scrollToId) {
        window.scrollTo(0, 0);
        return;
      }
      if (scrollTarget) {
        requestAnimationFrame(function () {
          scrollTarget.scrollIntoView({ behavior: opts.smooth === false ? 'auto' : 'smooth', block: 'start' });
        });
      }
    }

    switchTab = activate;

    navLinks.forEach(function (link) {
      link.addEventListener('click', function (e) {
        var tab = link.getAttribute('data-nav');
        if (!tab) return;
        e.preventDefault();
        activate(tab);
      });
    });

    window.addEventListener('popstate', function () {
      var tab = (location.hash || '').replace('#', '') || 'home';
      activate(tab, { updateHash: false });
    });

    var initialTab = (location.hash || '').replace('#', '') || 'home';
    activate(initialTab, { updateHash: false, smooth: false });
  }

  function initReveal() {
    var items = document.querySelectorAll('.reveal');
    if (!items.length) return;

    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      items.forEach(function (el) { el.classList.add('in-view'); });
      return;
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry, i) {
          if (entry.isIntersecting) {
            var delay = Math.min(50 + i * 70, 330);
            setTimeout(function () {
              entry.target.classList.add('in-view');
            }, delay);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );

    items.forEach(function (el) { observer.observe(el); });
  }

  function initGalleryMarquee() {
    startMarquee(document.querySelector('.gallery-viewport'), document.querySelector('.gallery-track'), 36);

    // The Community tab gets its own copy of the same gallery, sliding independently.
    var source = document.getElementById('gallery');
    var slot = document.getElementById('community-gallery-slot');
    if (!source || !slot) return;
    var copy = source.cloneNode(true);
    copy.id = 'community-gallery';
    copy.classList.add('community-gallery');
    // the scroll-reveal observer was set up before this copy existed, so show it right away
    copy.querySelectorAll('.reveal').forEach(function (n) { n.classList.remove('reveal'); });
    var label = copy.querySelector('.section-label');
    if (label) label.remove();   // the copy in the Community tab has no title text
    slot.appendChild(copy);
    startMarquee(copy.querySelector('.gallery-viewport'), copy.querySelector('.gallery-track'), 36);
  }

  // Auto-scrolls a duplicated track; pauses on mouse hover, stays swipeable.
  function startMarquee(viewport, track, speed, setSize, dir) {
    dir = dir || 1;
    if (!viewport || !track) return;
    setSize = setSize || track.children.length / 2;

    var half = 0;
    function measure() {
      // Distance from the first item to its duplicate, so the loop is seamless (includes the gap).
      half = track.children.length > setSize ? track.children[setSize].offsetLeft - track.children[0].offsetLeft : 0;
    }
    measure();
    window.addEventListener('resize', measure);

    function normalize() {
      if (half <= 0) return;
      if (viewport.scrollLeft >= half) viewport.scrollLeft -= half;
      else if (viewport.scrollLeft < 0) viewport.scrollLeft += half;
    }
    viewport.addEventListener('scroll', normalize, { passive: true });

    // Pause only while a mouse hovers the gallery; after a swipe it resumes on its own.
    var hovering = false;
    var touching = false;
    var resumeTimer = null;
    var paused = false;
    function update() { paused = hovering || touching; }

    viewport.addEventListener('pointerenter', function (e) {
      if (e.pointerType === 'mouse') { hovering = true; update(); }
    });
    viewport.addEventListener('pointerleave', function (e) {
      if (e.pointerType === 'mouse') { hovering = false; update(); }
    });
    viewport.addEventListener('touchstart', function () {
      touching = true;
      if (resumeTimer) clearTimeout(resumeTimer);
      update();
    }, { passive: true });
    ['touchend', 'touchcancel'].forEach(function (evt) {
      viewport.addEventListener(evt, function () {
        if (resumeTimer) clearTimeout(resumeTimer);
        resumeTimer = setTimeout(function () { touching = false; update(); }, 800);
      }, { passive: true });
    });

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    var last = null;
    if (dir < 0 && half > 0) viewport.scrollLeft = half;
    var pos = viewport.scrollLeft;
    function tick(ts) {
      if (half <= 0) measure(); // the section may have been hidden when this started
      if (last === null) last = ts;
      var dt = (ts - last) / 1000;
      last = ts;
      if (!paused) {
        // Keep a fractional position: browsers round scrollLeft, so tiny per-frame steps would stall.
        if (Math.abs(viewport.scrollLeft - pos) > 1.5) pos = viewport.scrollLeft;
        pos += dir * speed * dt;
        if (half > 0 && pos >= half) pos -= half;
        if (half > 0 && pos <= 0 && dir < 0) pos += half;
        viewport.scrollLeft = pos;
      } else {
        pos = viewport.scrollLeft;
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  function initBadgeSlider() {
    var viewport = document.querySelector('.badge-grid');
    var track = document.querySelector('.badge-track');
    if (!viewport || !track) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var originals = Array.prototype.slice.call(track.children);
    var setSize = originals.length;
    var setWidth = track.scrollWidth + 16;
    function addSet() {
      originals.forEach(function (el) {
        var clone = el.cloneNode(true);
        clone.setAttribute('aria-hidden', 'true');
        clone.setAttribute('tabindex', '-1');
        track.appendChild(clone);
      });
    }
    // One full copy, plus more until the track outruns the viewport by a whole set, so the loop never shows a gap.
    addSet();
    for (var i = 0; i < 8 && track.scrollWidth < viewport.clientWidth + setWidth; i++) addSet();
    startMarquee(viewport, track, 30, setSize);
  }

  function initThumbSlideshows() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var DURATION = 600;
    var INTERVAL = 1800;

    document.querySelectorAll('.project-thumb.has-slides').forEach(function (thumb) {
      var imgs = Array.prototype.slice.call(thumb.querySelectorAll('img'));
      if (imgs.length < 2) return;
      var cur = 0;
      var timer = null;
      var ease = 'transform ' + DURATION + 'ms cubic-bezier(0.22, 1, 0.36, 1)';

      // Slides the next photo in from the right while the current one leaves to the left.
      function advance() {
        var out = imgs[cur];
        var next = imgs[(cur + 1) % imgs.length];
        next.style.transition = 'none';
        next.style.transform = 'translateX(100%)';
        void next.offsetWidth; // commit the start position before animating
        out.style.transition = next.style.transition = ease;
        out.style.transform = 'translateX(-100%)';
        next.style.transform = 'translateX(0)';
        cur = (cur + 1) % imgs.length;
      }

      thumb.closest('.project-card').addEventListener('pointerenter', function (e) {
        if (e.pointerType !== 'mouse' || timer) return;
        advance();
        timer = setInterval(advance, INTERVAL);
      });
      thumb.closest('.project-card').addEventListener('pointerleave', function () {
        if (!timer) return;
        clearInterval(timer);
        timer = null;
        if (cur !== 0) advance(); // glide back to the primary photo
      });
    });
  }

  function initHeroCard() {
    var card = document.getElementById('hero-card');
    if (!card) return;
    card.addEventListener('click', function () {
      return;   // there is no card to flip any more: light mode shows the plain portrait, dark mode summons the constellation
      var on = card.getAttribute('aria-pressed') !== 'true';
      card.setAttribute('aria-pressed', String(on));
    });
  }

  // Twinkling starfield with a little mouse parallax and the odd shooting star.
  function initStarfield() {
    var canvas = document.getElementById('starfield');
    if (!canvas || !canvas.getContext) return;
    var ctx = canvas.getContext('2d');
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var w = 0, h = 0, dpr = 1, stars = [], shooting = null, nextShot = 0;
    var mx = 0, my = 0, tx = 0, ty = 0;
    var hero = document.getElementById('intro');   // no stars over the intro, so the fireflies stand out
    var FADE = 90;                                  // px over which stars fade out toward the intro's edges

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth; h = window.innerHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var n = Math.min(260, Math.round((w * h) / 7000));
      stars = [];
      for (var i = 0; i < n; i++) {
        var depth = Math.random();
        stars.push({
          x: Math.random() * w, y: Math.random() * h,
          r: 0.4 + depth * 1.3, depth: depth,
          a: 0.25 + Math.random() * 0.6,
          speed: 0.6 + Math.random() * 1.8,
          phase: Math.random() * Math.PI * 2,
          hue: Math.random() < 0.18 ? 255 : (Math.random() < 0.3 ? 205 : 0)
        });
      }
    }

    function isDark() { return document.documentElement.getAttribute('data-theme') === 'dark'; }

    function draw(t) {
      ctx.clearRect(0, 0, w, h);
      var dark = isDark();
      mx += (tx - mx) * 0.05; my += (ty - my) * 0.05;
      var hr = dark && hero ? hero.getBoundingClientRect() : null;
      if (hr && !(hr.height > 0)) hr = null;
      for (var i = 0; i < stars.length; i++) {
        var s = stars[i];
        var tw = reduced ? 1 : 0.55 + 0.45 * Math.sin(t / 1000 * s.speed + s.phase);
        var x = s.x + mx * s.depth * 14, y = s.y + my * s.depth * 14;
        var alpha = s.a * tw * (dark ? 1 : 0.55);
        if (hr) {
          // 0 inside the intro, rising to 1 once the star is FADE px outside it
          var dx = Math.max(hr.left - x, 0, x - hr.right), dy = Math.max(hr.top - y, 0, y - hr.bottom);
          alpha *= Math.min(1, Math.hypot(dx, dy) / FADE);
          if (alpha <= 0.002) continue;
        }
        ctx.beginPath();
        ctx.arc(x, y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = s.hue
          ? 'hsla(' + s.hue + ',90%,' + (dark ? 78 : 55) + '%,' + alpha + ')'
          : (dark ? 'rgba(255,255,255,' + alpha + ')' : 'rgba(70,60,140,' + alpha + ')');
        ctx.fill();
      }
      if (!reduced) {
        if (!shooting && t > nextShot) {
          var fromLeft = Math.random() < 0.5;
          shooting = { x: Math.random() * w * 0.7, y: Math.random() * h * 0.4, vx: (fromLeft ? 1 : 0.8) * 9, vy: 4.5, life: 0 };
          nextShot = t + 7000 + Math.random() * 8000;
        }
        if (shooting) {
          shooting.x += shooting.vx; shooting.y += shooting.vy; shooting.life++;
          var fade = Math.max(0, 1 - shooting.life / 55);
          var g = ctx.createLinearGradient(shooting.x, shooting.y, shooting.x - shooting.vx * 9, shooting.y - shooting.vy * 9);
          var c = dark ? '255,255,255' : '70,60,140';
          g.addColorStop(0, 'rgba(' + c + ',' + (0.9 * fade) + ')');
          g.addColorStop(1, 'rgba(' + c + ',0)');
          ctx.strokeStyle = g; ctx.lineWidth = 1.6;
          if (hr && shooting.x > hr.left && shooting.x < hr.right && shooting.y > hr.top && shooting.y < hr.bottom) ctx.globalAlpha = 0;
          ctx.beginPath();
          ctx.moveTo(shooting.x, shooting.y);
          ctx.lineTo(shooting.x - shooting.vx * 9, shooting.y - shooting.vy * 9);
          ctx.stroke();
          ctx.globalAlpha = 1;
          if (hr && shooting.x > hr.left && shooting.x < hr.right && shooting.y > hr.top && shooting.y < hr.bottom) { /* hidden over the intro */ }
          if (fade <= 0) shooting = null;
        }
      }
    }

    function frame(t) { draw(t); requestAnimationFrame(frame); }

    resize();
    window.addEventListener('resize', resize);
    if (reduced) {
      draw(0);
      window.addEventListener('scroll', function () { draw(0); }, { passive: true });
      return;
    }
    window.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse') return;
      tx = e.clientX / w - 0.5; ty = e.clientY / h - 0.5;
    }, { passive: true });
    nextShot = 3000;
    requestAnimationFrame(frame);
  }

  // Fireflies roam inside the intro section only, and only in dark mode, where they glow.
  function initFireflies() {
    var canvas = document.getElementById('fireflies');
    var hero = document.getElementById('intro');
    if (!canvas || !canvas.getContext || !hero) return;
    var ctx = canvas.getContext('2d');
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var vw = 0, vh = 0, dpr = 1, flies = [];
    var hw = 0, hh = 0; // size of the intro section; fireflies live in its local coordinates

    // Tap to call them: all fireflies fly to the tapped spot, huddle for a moment, then drift slowly apart.
    var call = null;   // { x, y (section coordinates), t0 }
    var GATHER_MS = 750, HOLD_MS = 120;   // fly in fast, barely pause, then drift apart

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      vw = window.innerWidth; vh = window.innerHeight;
      canvas.width = vw * dpr; canvas.height = vh * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener('resize', resize);

    function spawn() {
      return {
        x: Math.random() * hw, y: Math.random() * hh,
        a: Math.random() * Math.PI * 2,          // heading
        turn: 0,                                  // current turning rate
        speed: 14 + Math.random() * 26,           // px per second
        r: 1.6 + Math.random() * 1.4,
        phase: Math.random() * Math.PI * 2,       // blink phase
        rate: 0.7 + Math.random() * 0.9,          // blink speed
        ring: 8 + Math.random() * 34,             // how far from the tapped spot this one settles
        ang: Math.random() * Math.PI * 2,
        boost: 0                                  // extra scatter speed that fades out
      };
    }

    function isDark() { return document.documentElement.getAttribute('data-theme') === 'dark'; }

    // ---- Portrait: tap the photo (dark mode) and a swarm of fireflies flies in and forms your face as a constellation.
    // Tap again and they scatter, and the photo comes back. Star positions come from js/constellation.js.
    var card = document.getElementById('hero-card');
    var CS = window.CONSTELLATION;
    var portrait = { on: false, t0: 0, off: 0, parts: [], arrived: 0 };
    var CORE = [0.6, 0.9, 1.5, 2.3], HALO = [2.6, 4.2, 7.5, 13];     // per size class: dust, small, mid, big
    var sprites = null;
    function makeSprites() {
      sprites = HALO.map(function (halo, c) {
        var size = Math.ceil(halo * 4);
        var cv = document.createElement('canvas'); cv.width = cv.height = size;
        var x = cv.getContext('2d'), m = size / 2;
        var g = x.createRadialGradient(m, m, 0, m, m, halo * 2);
        g.addColorStop(0, 'rgba(255,238,130,0.42)');
        g.addColorStop(0.4, 'rgba(255,214,80,0.12)');
        g.addColorStop(1, 'rgba(255,214,80,0)');
        x.fillStyle = g; x.beginPath(); x.arc(m, m, halo * 2, 0, Math.PI * 2); x.fill();
        x.fillStyle = 'rgba(255,248,200,1)'; x.beginPath(); x.arc(m, m, CORE[c], 0, Math.PI * 2); x.fill();
        return { cv: cv, size: size };
      });
    }
    var bb = { x0: 1, y0: 1, x1: 0, y1: 0 };
    if (CS) CS.stars.forEach(function (s) { bb.x0 = Math.min(bb.x0, s[0]); bb.y0 = Math.min(bb.y0, s[1]); bb.x1 = Math.max(bb.x1, s[0]); bb.y1 = Math.max(bb.y1, s[1]); });
    function ease(p) { return p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2; }

    function startPortrait(t) {
      if (!CS || !card) return;
      if (!sprites) makeSprites();
      portrait.on = true; portrait.t0 = t; portrait.arrived = 0;
      document.documentElement.classList.add('portrait-on');
      portrait.parts = CS.stars.map(function (s, i) {
        var c = s[3] || 0;
        // the skeleton (big stars) arrives first, then the features, then the fine dust
        var delay = [1400, 900, 400, 0][c] + Math.random() * [1300, 1100, 900, 800][c];
        var ang = Math.random() * Math.PI * 2, far = 0.6 + Math.random() * 0.7;
        return {
          sx: s[0], sy: s[1], m: s[2], c: c,
          x0: hw / 2 + Math.cos(ang) * hw * far, y0: hh / 2 + Math.sin(ang) * hh * far,       // comes in from around the intro
          bend: (Math.random() - 0.5) * 360,
          delay: delay, dur: 1300 + Math.random() * 900,
          ph: Math.random() * Math.PI * 2, rate: (c >= 2 ? 1.0 : 1.8) + Math.random() * 2.4,
          dx: (Math.random() - 0.5) * 520, dy: (Math.random() - 0.5) * 420, offDelay: Math.random() * 500,
          done: 0
        };
      });
    }
    function stopPortrait(t) {
      if (!portrait.on) return;
      portrait.on = false; portrait.off = t;
      document.documentElement.classList.remove('portrait-on');
    }

    // draws the swarm in hero-local coordinates; returns nothing
    function drawPortrait(t, hr) {
      if (!portrait.parts.length) return;
      var cr = card.getBoundingClientRect();
      var cx = cr.left - hr.left + cr.width / 2, cy = cr.top - hr.top + cr.height / 2;
      var fit = Math.min((cr.width * 0.9) / (bb.x1 - bb.x0), (cr.height * 0.92) / (bb.y1 - bb.y0));
      var bcx = (bb.x0 + bb.x1) / 2, bcy = (bb.y0 + bb.y1) / 2;
      var scattering = !portrait.on;
      var since = t - (scattering ? portrait.off : portrait.t0);
      var P = portrait.parts;
      var allGone = scattering && since > 2600;
      if (allGone) { portrait.parts = []; return; }

      for (var i = 0; i < P.length; i++) {
        var p = P[i];
        var tx = cx + (p.sx - bcx) * fit, ty = cy + (p.sy - bcy) * fit;
        var x, y, a;
        if (!scattering) {
          var q = Math.max(0, Math.min(1, (since - p.delay) / p.dur));
          if (q <= 0) { p.vis = 0; continue; }
          var e = ease(q);
          // curved flight: a bezier whose control point is pushed sideways
          var mx = (p.x0 + tx) / 2 + p.bend, my = (p.y0 + ty) / 2 - p.bend * 0.6;
          x = (1 - e) * (1 - e) * p.x0 + 2 * (1 - e) * e * mx + e * e * tx;
          y = (1 - e) * (1 - e) * p.y0 + 2 * (1 - e) * e * my + e * e * ty;
          a = Math.min(1, q * 3);
          p.arrive = p.delay + p.dur;
        } else {
          var q2 = Math.max(0, Math.min(1, (since - p.offDelay) / 1900));
          var e2 = 1 - Math.pow(1 - q2, 2);
          x = tx + p.dx * e2; y = ty + p.dy * e2;
          a = 1 - q2;
          if (a <= 0) { p.vis = 0; continue; }
        }
        p.x = x; p.y = y; p.a = a; p.vis = 1;
        var settled = !scattering && since > p.delay + p.dur;
        var tw = settled ? 0.55 + 0.45 * Math.sin(t / 1000 * p.rate + p.ph) : 0.9;
        p.glow = a * (0.3 + 0.7 * tw) * (0.55 + 0.45 * p.m);
      }

      // faint lines once both ends have arrived (one batched path once everything has settled, to keep it light)
      ctx.lineWidth = 1;
      if (!scattering && since > 6200) {
        ctx.strokeStyle = 'rgba(255,224,110,0.27)';
        ctx.beginPath();
        for (var k2 = 0; k2 < CS.lines.length; k2++) {
          var A2 = P[CS.lines[k2][0]], B2 = P[CS.lines[k2][1]];
          ctx.moveTo(A2.x, A2.y); ctx.lineTo(B2.x, B2.y);
        }
        ctx.stroke();
      } else for (var k = 0; k < CS.lines.length; k++) {
        var A = P[CS.lines[k][0]], B = P[CS.lines[k][1]];
        if (!A.vis || !B.vis) continue;
        var lt = scattering ? A.a : Math.min(1, Math.max(0, (since - Math.max(A.arrive, B.arrive)) / 700));
        if (lt <= 0) continue;
        ctx.strokeStyle = 'rgba(255,224,110,' + (0.27 * lt * Math.min(A.a, B.a)) + ')';
        ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.stroke();
      }
      // the stars themselves: pre-drawn sprites, one per size class
      for (var n = 0; n < P.length; n++) {
        var s = P[n];
        if (!s.vis) continue;
        var sp = sprites[s.c], sz = sp.size * (0.85 + 0.3 * s.glow);
        // dimmer toward the shoulders so the lower part doesn't blaze: full strength down to the chin, easing to about 45% at the bottom
        var low = Math.max(0, Math.min(1, (s.sy - 0.62) / 0.38));
        ctx.globalAlpha = Math.min(1, (s.glow * 1.1 + 0.1 * s.a) * (1 - 0.55 * low));
        ctx.drawImage(sp.cv, s.x - sz / 2, s.y - sz / 2, sz, sz);
      }
      ctx.globalAlpha = 1;
    }

    var last = 0;
    function frame(t) {
      var dt = last ? Math.min(0.05, (t - last) / 1000) : 0.016;
      last = t;
      ctx.clearRect(0, 0, vw, vh);
      var r = hero.getBoundingClientRect();
      if (!isDark() && (portrait.on || portrait.parts.length)) { portrait.on = false; portrait.parts = []; document.documentElement.classList.remove('portrait-on'); }
      if (isDark() && r.height > 0 && r.bottom > 0 && r.top < vh) {
        hw = r.width; hh = r.height;
        var n = Math.max(6, Math.min(16, Math.round((hw * hh) / 60000)));
        while (flies.length < n) flies.push(spawn());
        flies.length = n;

        ctx.save();
        ctx.beginPath(); ctx.rect(r.left, r.top, r.width, r.height); ctx.clip(); // nothing outside the intro
        ctx.translate(r.left, r.top);
        ctx.globalCompositeOperation = 'lighter';

        flies.forEach(function (f) {
          var gathering = false, glowBoost = 0;
          if (call) {
            var age = t - call.t0;
            if (age < GATHER_MS + HOLD_MS) {
              gathering = true;
              // each firefly settles on its own little orbit around the tapped spot
              f.ang += dt * (0.6 + f.rate * 0.4);
              var tx = call.x + Math.cos(f.ang) * f.ring, ty = call.y + Math.sin(f.ang) * f.ring * 0.7;
              var k = Math.min(1, dt * (age < GATHER_MS ? 6 : 10));
              f.x += (tx - f.x) * k;
              f.y += (ty - f.y) * k;
              f.phase += f.rate * dt * 10;      // blink even faster while excited
              glowBoost = Math.min(1, age / 500);
            } else if (!f.released) {
              // release: burst outward in a random direction, then slow back to a lazy wander
              f.released = true;
              f.a = Math.random() * Math.PI * 2;
              f.boost = 45 + Math.random() * 45;   // a gentle push outward, not a burst
              f.turn = 0;
            }
          }
          if (!gathering && !reduced) {
            if (call) glowBoost = Math.max(0, 1 - (t - call.t0 - GATHER_MS - HOLD_MS) / 2500);
            // wander: the turning rate itself drifts, so paths curve lazily instead of zig-zagging
            f.turn += (Math.random() - 0.5) * 6 * dt;
            f.turn *= 0.98;
            f.turn = Math.max(-1.4, Math.min(1.4, f.turn));
            f.a += f.turn * dt;
            // gently steer back into the section when near its edges
            var m = 50;
            if (f.x < m || f.x > hw - m || f.y < m || f.y > hh - m) {
              var want = Math.atan2(hh / 2 - f.y, hw / 2 - f.x);
              var d = Math.atan2(Math.sin(want - f.a), Math.cos(want - f.a));
              f.a += d * 1.8 * dt;
            }
            f.boost *= Math.pow(0.62, dt);       // the push fades slowly, so they drift apart for several seconds
            var sp = f.speed + f.boost;
            f.x += Math.cos(f.a) * sp * dt;
            f.y += Math.sin(f.a) * sp * dt + Math.sin(t / 700 + f.phase) * 4 * dt; // a little bob
            f.x = Math.max(-10, Math.min(hw + 10, f.x));
            f.y = Math.max(-10, Math.min(hh + 10, f.y));
            f.phase += f.rate * dt * 6;
          }
          // fade out toward the section's top and bottom edges so nothing is cut off hard
          ctx.globalAlpha = Math.max(0, Math.min(1, Math.min(f.y, hh - f.y) / 60));

          // blink: a soft pulse that is mostly on, with a darker moment each cycle
          var pulse = Math.pow(Math.max(0, Math.sin(f.phase)), 2);
          var glow = Math.min(1, 0.25 + 0.75 * pulse + 0.35 * glowBoost);
          var R = 16 + f.r * 5 + 8 * glowBoost;
          var g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, R);
          g.addColorStop(0, 'rgba(255,238,130,' + (0.55 * glow) + ')');
          g.addColorStop(0.35, 'rgba(255,214,80,' + (0.2 * glow) + ')');
          g.addColorStop(1, 'rgba(255,214,80,0)');
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.arc(f.x, f.y, R, 0, Math.PI * 2); ctx.fill();
          // the glowing dot
          ctx.fillStyle = 'rgba(255,255,200,' + (0.35 + 0.65 * glow) + ')';
          ctx.beginPath(); ctx.arc(f.x, f.y, f.r * 0.8, 0, Math.PI * 2); ctx.fill();
        });
        drawPortrait(t, r);
        ctx.restore();

        // A word lights up when the called fireflies actually reach it (a few of them touching it).
        if (call && t - call.t0 < GATHER_MS + HOLD_MS + 600) {
          document.querySelectorAll('.sel').forEach(function (word) {
            if (word._lit) return;
            var w = word.getBoundingClientRect(), touching = 0, pad = 6;
            flies.forEach(function (f) {
              var px = r.left + f.x, py = r.top + f.y;
              if (px >= w.left - pad && px <= w.right + pad && py >= w.top - pad && py <= w.bottom + pad) touching++;
            });
            if (touching >= 3) {
              word._lit = true;
              word.classList.remove('sel-on');
              void word.offsetWidth;          // restart the animation if needed
              word.classList.add('sel-on');
              setTimeout(function () { word.classList.remove('sel-on'); word._lit = false; }, 2900);
            }
          });
        }
      }
      if (!reduced) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);

    // tapping inside the intro (dark mode only) calls every firefly to that spot
    window.addEventListener('pointerdown', function (e) {
      if (reduced || !isDark()) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      var r = hero.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) return;
      flies.forEach(function (f) { f.released = false; f.ang = Math.random() * Math.PI * 2; });
      call = { x: e.clientX - r.left, y: e.clientY - r.top, t0: performance.now() };

      // tapping the photo itself summons the swarm that forms the portrait, or scatters it
      if (card) {
        var cb = card.getBoundingClientRect();
        if (e.clientX >= cb.left && e.clientX <= cb.right && e.clientY >= cb.top && e.clientY <= cb.bottom) {
          var now = performance.now();
          if (portrait.on) stopPortrait(now); else startPortrait(now);
        }
      }

      // the cursor hint goes away once the visitor taps on or next to a word
      document.querySelectorAll('.sel').forEach(function (word) {
        var w = word.getBoundingClientRect(), pad = 28;
        if (e.clientX >= w.left - pad && e.clientX <= w.right + pad && e.clientY >= w.top - pad && e.clientY <= w.bottom + pad) {
          document.documentElement.classList.add('word-tapped');
        }
      });
    }, { passive: true });

    // with reduced motion there is no animation loop, so redraw on scroll, resize and theme change
    if (reduced) {
      var pending = false;
      var redraw = function () { if (pending) return; pending = true; requestAnimationFrame(function (ts) { pending = false; frame(ts); }); };
      window.addEventListener('scroll', redraw, { passive: true });
      window.addEventListener('resize', redraw);
      new MutationObserver(redraw).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    }
  }

  // Community engagement: builds the filterable post list from window.COMMUNITY_POSTS (see js/posts.js).
  function initCommunity() {
    var grid = document.getElementById('post-grid');
    var posts = window.COMMUNITY_POSTS;
    if (!grid || !posts) return;

    var TYPES = {
      blog: { label: 'blog', filter: 'blogs', icon: 'M4 20h4l10-10-4-4L4 16v4zM14 6l4 4M14 20h6' },
      linkedin: { label: 'linkedin', filter: 'linkedin', icon: null },
      post: { label: 'on this site', filter: 'on this site', icon: 'M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5z' }
    };
    function el(tag, cls, text) {
      var n = document.createElement(tag);
      if (cls) n.className = cls;
      if (text != null) n.textContent = text;
      return n;
    }

    function typeIcon(type) {
      var ns = 'http://www.w3.org/2000/svg';
      var svg = document.createElementNS(ns, 'svg');
      svg.setAttribute('viewBox', '0 0 24 24');
      svg.setAttribute('aria-hidden', 'true');
      if (type === 'linkedin') {
        svg.setAttribute('fill', 'currentColor');
        var use = document.createElementNS(ns, 'use');
        use.setAttribute('href', '#icon-linkedin');
        svg.appendChild(use);
      } else {
        svg.setAttribute('fill', 'none');
        svg.setAttribute('stroke', 'currentColor');
        svg.setAttribute('stroke-width', '2');
        svg.setAttribute('stroke-linecap', 'round');
        svg.setAttribute('stroke-linejoin', 'round');
        var p = document.createElementNS(ns, 'path');
        p.setAttribute('d', TYPES[type].icon);
        svg.appendChild(p);
      }
      return svg;
    }

    function photos(p) { return [].concat(p.images || p.image || []).filter(Boolean); }

    // ---- full-size photo viewer: click any photo in a card or in the caption pop-up ----
    var lbEl = el('div', 'photo-lightbox');
    lbEl.hidden = true;
    lbEl.setAttribute('role', 'dialog');
    lbEl.setAttribute('aria-modal', 'true');
    lbEl.setAttribute('aria-label', 'Photo viewer');
    var lbImg = el('img', 'lb-img');
    lbImg.alt = '';
    var lbCount = el('span', 'lb-count');
    var lbClose = el('button', 'lb-btn lb-close', '×'); lbClose.type = 'button'; lbClose.setAttribute('aria-label', 'Close photo');
    var lbPrev = el('button', 'lb-btn lb-prev', '‹'); lbPrev.type = 'button'; lbPrev.setAttribute('aria-label', 'Previous photo');
    var lbNext = el('button', 'lb-btn lb-next', '›'); lbNext.type = 'button'; lbNext.setAttribute('aria-label', 'Next photo');
    [lbImg, lbCount, lbClose, lbPrev, lbNext].forEach(function (n) { lbEl.appendChild(n); });
    document.body.appendChild(lbEl);

    var lbList = [], lbIndex = 0, lbReturn = null;
    function lbShow(i) {
      lbIndex = (i + lbList.length) % lbList.length;
      lbImg.src = lbList[lbIndex];
      lbCount.textContent = lbList.length > 1 ? (lbIndex + 1) + ' / ' + lbList.length : '';
      lbPrev.hidden = lbNext.hidden = lbList.length < 2;
    }
    function openLightbox(list, index, from) {
      lbList = list; lbReturn = from || null;
      lbShow(index);
      lbEl.hidden = false;
      document.body.style.overflow = 'hidden';
      requestAnimationFrame(function () { lbEl.classList.add('open'); lbClose.focus(); });
    }
    function closeLightbox() {
      if (lbEl.hidden) return;
      lbEl.classList.remove('open');
      lbEl.hidden = true;
      // keep the page locked if the caption pop-up is still open behind it
      var cap = document.getElementById('post-overlay');
      if (!cap || cap.hidden) document.body.style.overflow = '';
      if (lbReturn) lbReturn.focus();
    }
    lbClose.addEventListener('click', closeLightbox);
    lbPrev.addEventListener('click', function (e) { e.stopPropagation(); lbShow(lbIndex - 1); });
    lbNext.addEventListener('click', function (e) { e.stopPropagation(); lbShow(lbIndex + 1); });
    lbEl.addEventListener('click', function (e) { if (e.target === lbEl) closeLightbox(); });
    document.addEventListener('keydown', function (e) {
      if (lbEl.hidden) return;
      if (e.key === 'Escape') { e.stopImmediatePropagation(); closeLightbox(); }
      else if (e.key === 'ArrowLeft') lbShow(lbIndex - 1);
      else if (e.key === 'ArrowRight') lbShow(lbIndex + 1);
    }, true);
    // gallery strips (home page and Community tab): click a photo to open it full size, with the whole set to flip through
    document.addEventListener('click', function (e) {
      var item = e.target.closest && e.target.closest('.gallery-item');
      if (!item) return;
      e.preventDefault();                       // stay on the page instead of opening the file in a new tab
      var seen = {}, list = [];
      document.querySelectorAll('#gallery .gallery-item').forEach(function (a) {
        var src = a.getAttribute('href');
        if (src && !seen[src]) { seen[src] = true; list.push(src); }
      });
      var at = list.indexOf(item.getAttribute('href'));
      openLightbox(list, at < 0 ? 0 : at, item);
    });

    // makes each photo of a collage clickable
    function wirePhotos(thumb, pics) {
      Array.prototype.forEach.call(thumb.querySelectorAll('img'), function (img, n) {
        img.classList.add('photo-click');
        img.tabIndex = 0;
        img.setAttribute('role', 'button');
        img.setAttribute('aria-label', 'View photo ' + (n + 1) + ' full size');
        img.addEventListener('click', function (e) { e.stopPropagation(); openLightbox(pics, n, img); });
        img.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); openLightbox(pics, n, img); }
        });
      });
    }

    // ---- tap a card to read the full caption ----
    var overlay = document.getElementById('post-overlay');
    var modalBody = document.getElementById('post-modal-body');
    var modalClose = document.getElementById('post-close');
    var openFrom = null;

    function openPost(p, from) {
      if (!overlay) return;
      openFrom = from || null;
      modalBody.textContent = '';
      var t = TYPES[p.type] || TYPES.post;
      var pics = photos(p).slice(0, 3);
      if (pics.length) {
        var thumb = el('div', 'post-thumb post-thumb-' + pics.length + ' post-thumb-modal');
        pics.forEach(function (src) {
          var img = el('img');
          img.src = src; img.alt = '';
          thumb.appendChild(img);
        });
        wirePhotos(thumb, pics);
        modalBody.appendChild(thumb);
      }
      var inner = el('div', 'post-modal-text');
      var meta = el('div', 'post-meta');
      var type = el('span', 'post-type');
      type.appendChild(typeIcon(p.type in TYPES ? p.type : 'post'));
      type.appendChild(document.createTextNode(t.label));
      meta.appendChild(type);
      meta.appendChild(el('span', 'post-date', p.date || ''));
      inner.appendChild(meta);
      var h = el('h3', 'post-title post-title-lg', p.title);
      h.id = 'post-modal-title';
      inner.appendChild(h);
      if (p.sample) inner.appendChild(el('span', 'post-sample', 'sample, replace me'));
      // the full caption; blank lines separate paragraphs and single line breaks are kept
      var full = p.caption || (p.body && p.body.join('\n\n')) || p.excerpt || '';
      if (full) {
        var cap = el('div', 'post-caption');
        full.split(/\n{2,}/).forEach(function (para) { cap.appendChild(el('p', null, para)); });
        inner.appendChild(cap);
      }
      if (p.url) {
        var link = el('a', 'post-link', p.type === 'linkedin' ? 'view on linkedin ↗' : 'read the article ↗');
        link.href = p.url; link.target = '_blank'; link.rel = 'noopener';
        inner.appendChild(link);
      }
      modalBody.appendChild(inner);
      overlay.hidden = false;
      document.body.style.overflow = 'hidden';
      requestAnimationFrame(function () { overlay.classList.add('open'); modalClose.focus(); });
      document.getElementById('post-modal').scrollTop = 0;
    }
    function closePost() {
      if (!overlay || overlay.hidden) return;
      overlay.classList.remove('open');
      overlay.hidden = true;
      document.body.style.overflow = '';
      if (openFrom) openFrom.focus();
    }
    if (overlay) {
      modalClose.addEventListener('click', closePost);
      overlay.addEventListener('click', function (e) { if (e.target === overlay) closePost(); });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closePost(); });
    }

    function card(p) {
      var t = TYPES[p.type] || TYPES.post;
      var a = el('article', 'post-card');
      a.setAttribute('data-type', p.type);

      // photos at the top of the card: one fills the header, two or three are laid out as a collage
      var pics = photos(p).slice(0, 3);
      if (pics.length) {
        var thumb = el('div', 'post-thumb post-thumb-' + pics.length);
        pics.forEach(function (src) {
          var img = el('img');
          img.src = src;
          img.alt = '';
          img.loading = 'lazy';
          thumb.appendChild(img);
        });
        wirePhotos(thumb, pics);
        a.appendChild(thumb);
      }

      var meta = el('div', 'post-meta');
      var type = el('span', 'post-type');
      type.appendChild(typeIcon(p.type in TYPES ? p.type : 'post'));
      type.appendChild(document.createTextNode(t.label));
      meta.appendChild(type);
      meta.appendChild(el('span', 'post-date', p.date || ''));
      a.appendChild(meta);

      if (p.sample) a.appendChild(el('span', 'post-sample', 'sample, replace me'));
      a.appendChild(el('h3', 'post-title', p.title));
      if (p.excerpt) a.appendChild(el('p', 'post-excerpt', p.excerpt));

      if (p.type === 'post' && p.body && p.body.length) {
        var body = el('div', 'post-body');
        body.hidden = true;
        p.body.forEach(function (para) { body.appendChild(el('p', null, para)); });
        var btn = el('button', 'post-toggle', 'read here ↓');
        btn.type = 'button';
        btn.setAttribute('aria-expanded', 'false');
        btn.addEventListener('click', function () {
          var open = body.hidden;
          body.hidden = !open;
          btn.setAttribute('aria-expanded', String(open));
          btn.textContent = open ? 'show less ↑' : 'read here ↓';
        });
        a.appendChild(body);
        a.appendChild(btn);
      } else if (p.url) {
        var link = el('a', 'post-link', p.type === 'linkedin' ? 'view on linkedin ↗' : 'read the article ↗');
        link.href = p.url;
        link.target = '_blank';
        link.rel = 'noopener';
        a.appendChild(link);
      }
      // tapping anywhere on the card (except its own link) opens the full caption
      a.classList.add('post-card-open');
      a.tabIndex = 0;
      a.setAttribute('role', 'button');
      a.setAttribute('aria-label', 'Read the full post: ' + p.title);
      a.addEventListener('click', function (e) {
        if (e.target.closest('a, button')) return;
        openPost(p, a);
      });
      a.addEventListener('keydown', function (e) {
        if ((e.key === 'Enter' || e.key === ' ') && e.target === a) { e.preventDefault(); openPost(p, a); }
      });
      return a;
    }

    function render() {
      grid.textContent = '';
      if (!posts.length) grid.appendChild(el('p', 'post-empty', 'nothing here yet'));
      posts.forEach(function (p) { grid.appendChild(card(p)); });
    }

    render();
  }

  function initCommandPalette() {
    var overlay = document.getElementById('cmdk-overlay');
    var input = document.getElementById('cmdk-input');
    var resultsEl = document.getElementById('cmdk-results');
    var triggers = document.querySelectorAll('#cmdk-trigger, #cmdk-trigger-mobile');
    if (!overlay || !input || !resultsEl || !triggers.length) return;

    var items = [
      { label: 'home', hint: 'tab', tab: 'home' },
      { label: 'about', hint: 'tab', tab: 'home', scrollTo: '#about' },
      { label: 'education', hint: 'tab', tab: 'home', scrollTo: '#education' },
      { label: 'badges', hint: 'tab', tab: 'home', scrollTo: '#badges' },
      { label: 'gallery', hint: 'tab', tab: 'home', scrollTo: '#gallery' },
      { label: 'projects', hint: 'tab', tab: 'projects' },
      { label: 'experience', hint: 'tab', tab: 'experience' },
      { label: 'stack', hint: 'tab', tab: 'experience', scrollTo: '#stack' },
      { label: 'certifications', hint: 'tab', tab: 'certifications' },
      { label: 'community', hint: 'tab', tab: 'community' },
      { label: 'contact', hint: 'tab', tab: 'contact' },
      { label: 'email', hint: 'link', href: 'mailto:melfredbernabe7@gmail.com', mail: true },
      { label: 'github', hint: 'link', href: 'https://github.com/caramel-123', external: true },
      { label: 'linkedin', hint: 'link', href: 'https://www.linkedin.com/in/melfred-bernabe-869ba4360/', external: true },
      { label: 'x / twitter', hint: 'link', href: 'https://x.com/Bukopie_nice', external: true },
      { label: 'facebook', hint: 'link', href: 'https://www.facebook.com/melfred.bernabe.2024', external: true },
      { label: 'youtube', hint: 'link', href: 'https://www.youtube.com/@melfredbernabe-i5v', external: true },
      { label: 'discord', hint: 'link', href: 'https://discord.com/users/1398660390107484230', external: true },
      { label: 'telegram', hint: 'link', href: 'https://t.me/melfredbernabe7', external: true }
    ];

    var filtered = items.slice();
    var activeIndex = 0;
    var lastFocused = null;

    function render() {
      resultsEl.innerHTML = '';
      if (!filtered.length) {
        var empty = document.createElement('li');
        empty.className = 'cmdk-empty';
        empty.textContent = 'No matches';
        resultsEl.appendChild(empty);
        return;
      }
      filtered.forEach(function (item, i) {
        var li = document.createElement('li');
        li.className = 'cmdk-result';
        li.setAttribute('role', 'option');
        li.setAttribute('aria-selected', String(i === activeIndex));
        var labelSpan = document.createElement('span');
        labelSpan.textContent = item.label;
        var hintSpan = document.createElement('span');
        hintSpan.className = 'cmdk-result-hint';
        hintSpan.textContent = item.hint;
        li.appendChild(labelSpan);
        li.appendChild(hintSpan);
        li.addEventListener('mouseenter', function () { activeIndex = i; render(); });
        li.addEventListener('click', function () { go(item); });
        resultsEl.appendChild(li);
      });
      var activeEl = resultsEl.children[activeIndex];
      if (activeEl) activeEl.scrollIntoView({ block: 'nearest' });
    }

    function go(item) {
      close();
      if (item.mail) {
        window.location.href = item.href;
      } else if (item.external) {
        window.open(item.href, '_blank', 'noopener');
      } else if (item.tab) {
        switchTab(item.tab, { scrollToId: item.scrollTo });
      }
    }

    function filter() {
      var q = input.value.trim().toLowerCase();
      filtered = !q ? items.slice() : items.filter(function (item) {
        return item.label.toLowerCase().indexOf(q) !== -1;
      });
      activeIndex = 0;
      render();
    }

    function closeMobileMenu() {
      var mobileMenu = document.getElementById('mobile-menu');
      var menuToggle = document.getElementById('menu-toggle');
      if (mobileMenu && mobileMenu.classList.contains('open')) {
        mobileMenu.classList.remove('open');
        if (menuToggle) menuToggle.setAttribute('aria-expanded', 'false');
      }
    }

    function open() {
      lastFocused = document.activeElement;
      closeMobileMenu();
      overlay.hidden = false;
      input.value = '';
      filter();
      input.focus();
      document.body.style.overflow = 'hidden';
    }

    function close() {
      overlay.hidden = true;
      document.body.style.overflow = '';
      if (lastFocused && lastFocused.focus) lastFocused.focus();
    }

    triggers.forEach(function (btn) { btn.addEventListener('click', open); });

    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) close();
    });

    input.addEventListener('input', filter);

    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        activeIndex = Math.min(activeIndex + 1, filtered.length - 1);
        render();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        activeIndex = Math.max(activeIndex - 1, 0);
        render();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filtered[activeIndex]) go(filtered[activeIndex]);
      } else if (e.key === 'Escape') {
        close();
      }
    });

    document.addEventListener('keydown', function (e) {
      var isMod = e.metaKey || e.ctrlKey;
      if (isMod && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        if (overlay.hidden) open(); else close();
      } else if (e.key === 'Escape' && !overlay.hidden) {
        close();
      }
    });
  }

  // Fill these in once the Supabase project exists (Project Settings -> API).
  // The anon/public key is safe to expose client-side as long as RLS policies
  // on the `messages` table restrict what it can do.
  var SUPABASE_URL = 'https://gxaayejsthwscqxbebbs.supabase.co';
  var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4YWF5ZWpzdGh3c2NxeGJlYmJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY1MzE0NTMsImV4cCI6MjEwMjEwNzQ1M30.cgWAhu3FQMSZqgFXOzsu4sosFhD-r_X6zBqidpJXWBw';

  function initPresenceAndChat() {
    var countEls = document.querySelectorAll('.presence-count-value');
    var chatTriggers = document.querySelectorAll('#chat-trigger, #chat-trigger-mobile');
    var chatOverlay = document.getElementById('chat-overlay');
    var chatClose = document.getElementById('chat-close');
    var chatMessages = document.getElementById('chat-messages');
    var chatForm = document.getElementById('chat-form');
    var chatNameInput = document.getElementById('chat-name');
    var chatMessageInput = document.getElementById('chat-message');
    if (!chatOverlay) return;

    function closeMobileMenu() {
      var mobileMenu = document.getElementById('mobile-menu');
      var menuToggle = document.getElementById('menu-toggle');
      if (mobileMenu && mobileMenu.classList.contains('open')) {
        mobileMenu.classList.remove('open');
        if (menuToggle) menuToggle.setAttribute('aria-expanded', 'false');
      }
    }

    function openChat() {
      closeMobileMenu();
      chatOverlay.hidden = false;
      document.body.style.overflow = 'hidden';
    }
    function closeChat() {
      chatOverlay.hidden = true;
      document.body.style.overflow = '';
    }
    chatTriggers.forEach(function (btn) { btn.addEventListener('click', openChat); });
    if (chatClose) chatClose.addEventListener('click', closeChat);
    chatOverlay.addEventListener('click', function (e) { if (e.target === chatOverlay) closeChat(); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !chatOverlay.hidden) closeChat();
    });

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      // Not wired up yet — show an honest placeholder instead of a fake number.
      countEls.forEach(function (el) { el.textContent = '—'; });
      if (chatMessages) chatMessages.innerHTML = '<p class="chat-empty">Chat isn\'t connected yet.</p>';
      if (chatForm) {
        chatForm.querySelectorAll('input, button').forEach(function (el) { el.disabled = true; });
      }
      return;
    }

    import('https://esm.sh/@supabase/supabase-js@2').then(function (mod) {
      var supabase = mod.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      var ROOM = 'portfolio';

      var presenceChannel = supabase.channel('presence-' + ROOM, {
        config: { presence: { key: Math.random().toString(36).slice(2) } }
      });
      presenceChannel
        .on('presence', { event: 'sync' }, function () {
          var state = presenceChannel.presenceState();
          var count = Object.keys(state).length;
          countEls.forEach(function (el) { el.textContent = String(Math.max(count, 1)); });
        })
        .subscribe(function (status) {
          if (status === 'SUBSCRIBED') presenceChannel.track({ online_at: new Date().toISOString() });
        });

      var storedName = localStorage.getItem('chatName') || '';
      if (chatNameInput) chatNameInput.value = storedName;

      function renderMessage(msg) {
        if (!chatMessages) return;
        var wrap = document.createElement('div');
        wrap.className = 'chat-msg';
        var meta = document.createElement('p');
        meta.className = 'chat-msg-meta';
        meta.textContent = msg.name || 'anon';
        var body = document.createElement('p');
        body.className = 'chat-msg-body';
        body.textContent = msg.body;
        wrap.appendChild(meta);
        wrap.appendChild(body);
        chatMessages.appendChild(wrap);
        chatMessages.scrollTop = chatMessages.scrollHeight;
      }

      supabase
        .from('messages')
        .select('name, body, created_at')
        .order('created_at', { ascending: true })
        .limit(50)
        .then(function (res) {
          if (chatMessages) chatMessages.innerHTML = '';
          if (res.data && res.data.length) {
            res.data.forEach(renderMessage);
          } else if (chatMessages) {
            chatMessages.innerHTML = '<p class="chat-empty">No messages yet, say hi.</p>';
          }
        });

      supabase
        .channel('messages-' + ROOM)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, function (payload) {
          var emptyEl = chatMessages && chatMessages.querySelector('.chat-empty');
          if (emptyEl) emptyEl.remove();
          renderMessage(payload.new);
        })
        .subscribe();

      if (chatForm) {
        chatForm.addEventListener('submit', function (e) {
          e.preventDefault();
          var name = (chatNameInput.value || 'anon').trim().slice(0, 24) || 'anon';
          var body = (chatMessageInput.value || '').trim().slice(0, 240);
          if (!body) return;
          localStorage.setItem('chatName', name);
          supabase.from('messages').insert({ name: name, body: body }).then(function () {
            chatMessageInput.value = '';
          });
        });
      }
    });
  }

  function initSectionToggles() {
    document.querySelectorAll('.section-toggle').forEach(function (btn) {
      var target = document.getElementById(btn.getAttribute('data-toggle-target'));
      if (!target) return;
      var section = target.closest('.section');

      var moreLabel = btn.innerHTML;
      var lessLabel = 'show less ↑';
      var hiddenItems = Array.prototype.slice.call(target.querySelectorAll('[hidden]'));
      if (!hiddenItems.length) {
        btn.style.display = 'none';
        return;
      }

      var expanded = false;
      function setExpanded(value) {
        expanded = value;
        hiddenItems.forEach(function (el) { el.hidden = !expanded; });
        btn.innerHTML = expanded ? lessLabel : moreLabel;
      }
      // Lets the home-page "view all" buttons open the full list on arrival.
      btn.expandAll = function () { setExpanded(true); };
      // Tabs open with the full list; the button then works as "show less".
      setExpanded(true);
      btn.addEventListener('click', function () {
        setExpanded(!expanded);
        if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  // Builds the home page's two sliding project rows from the full project list.
  function initProjectRows() {
    var source = document.getElementById('project-grid');
    var rows = document.querySelectorAll('#project-rows .project-marquee-row');
    if (!source || rows.length < 2) return;

    var cards = Array.prototype.slice.call(source.querySelectorAll('.project-card'));
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function prepare(card, ghost) {
      var el = card.cloneNode(true);
      el.hidden = false;
      el.removeAttribute('hidden');
      el.classList.remove('reveal', 'in-view');
      if (ghost) {
        el.setAttribute('aria-hidden', 'true');
        el.querySelectorAll('a').forEach(function (a) { a.setAttribute('tabindex', '-1'); });
      }
      return el;
    }

    rows.forEach(function (row, r) {
      var track = row.querySelector('.project-marquee-track');
      var mine = cards.filter(function (_, i) { return i % 2 === r; });
      mine.forEach(function (card) { track.appendChild(prepare(card, false)); });
      if (reduced) return;
      mine.forEach(function (card) { track.appendChild(prepare(card, true)); });
      startMarquee(row, track, 34, mine.length, parseInt(row.getAttribute('data-dir'), 10) || 1);
    });
  }

  function initHomePreviewLinks() {
    document.querySelectorAll('[data-goto-tab]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var tab = btn.getAttribute('data-goto-tab');
        var panel = document.getElementById('tab-' + tab);
        var toggle = panel && panel.querySelector('.section-toggle');
        if (toggle && toggle.expandAll) toggle.expandAll();
        switchTab(tab);
      });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    initTheme();
    initMobileMenu();
    initTabs();
    initReveal();
    initStarfield();
    initFireflies();
    initCommunity();
    initProjectRows();
    initGalleryMarquee();
    initBadgeSlider();
    initThumbSlideshows();
    initHeroCard();
    initCommandPalette();
    initPresenceAndChat();
    initSectionToggles();
    initHomePreviewLinks();
  });
})();
