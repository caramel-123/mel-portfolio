(function () {
  var THEME_ORDER = ['system', 'light', 'dark'];

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
    localStorage.setItem('theme', pref);
    var labels = document.querySelectorAll('#theme-toggle-value, #theme-toggle-value-mobile');
    labels.forEach(function (el) { el.textContent = pref; });
  }

  function initTheme() {
    var pref = document.documentElement.getAttribute('data-theme-pref') || 'system';
    applyTheme(pref);

    var toggles = document.querySelectorAll('#theme-toggle, #theme-toggle-mobile');
    toggles.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var current = document.documentElement.getAttribute('data-theme-pref') || 'system';
        var next = THEME_ORDER[(THEME_ORDER.indexOf(current) + 1) % THEME_ORDER.length];
        applyTheme(next);
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

  function initScrollSpy() {
    var sections = document.querySelectorAll('.section[id]');
    var navLinks = document.querySelectorAll('[data-nav]');
    if (!sections.length || !navLinks.length) return;

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            var id = entry.target.getAttribute('id');
            navLinks.forEach(function (link) {
              var match = link.getAttribute('href') === '#' + id;
              link.classList.toggle('active', match);
            });
          }
        });
      },
      { rootMargin: '-40% 0px -55% 0px', threshold: 0 }
    );

    sections.forEach(function (section) { observer.observe(section); });
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
    var viewport = document.querySelector('.gallery-viewport');
    var track = document.querySelector('.gallery-track');
    if (!viewport || !track) return;

    var half = 0;
    function measure() { half = track.scrollWidth / 2; }
    measure();
    window.addEventListener('resize', measure);

    function normalize() {
      if (half <= 0) return;
      if (viewport.scrollLeft >= half) viewport.scrollLeft -= half;
      else if (viewport.scrollLeft < 0) viewport.scrollLeft += half;
    }
    viewport.addEventListener('scroll', normalize, { passive: true });

    var paused = false;
    var resumeTimer = null;
    function pause() {
      paused = true;
      if (resumeTimer) clearTimeout(resumeTimer);
    }
    function scheduleResume() {
      if (resumeTimer) clearTimeout(resumeTimer);
      resumeTimer = setTimeout(function () { paused = false; }, 2000);
    }
    ['pointerdown', 'touchstart', 'wheel'].forEach(function (evt) {
      viewport.addEventListener(evt, pause, { passive: true });
    });
    ['pointerup', 'touchend', 'mouseleave'].forEach(function (evt) {
      viewport.addEventListener(evt, scheduleResume, { passive: true });
    });

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    var speed = 36; // px per second
    var last = null;
    function tick(ts) {
      if (last === null) last = ts;
      var dt = (ts - last) / 1000;
      last = ts;
      if (!paused) {
        viewport.scrollLeft += speed * dt;
        normalize();
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  document.addEventListener('DOMContentLoaded', function () {
    initTheme();
    initMobileMenu();
    initScrollSpy();
    initReveal();
    initGalleryMarquee();
  });
})();
