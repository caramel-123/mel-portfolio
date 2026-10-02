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
    localStorage.setItem('theme', pref);
  }

  function updateThemeIconActiveState() {
    var pref = document.documentElement.getAttribute('data-theme-pref') || 'system';
    document.querySelectorAll('.theme-icon-btn').forEach(function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-theme-choice') === pref);
    });
  }

  function initTheme() {
    var pref = document.documentElement.getAttribute('data-theme-pref') || 'system';
    applyTheme(pref);
    updateThemeIconActiveState();

    document.querySelectorAll('.theme-icon-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        applyTheme(btn.getAttribute('data-theme-choice'));
        updateThemeIconActiveState();
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
  }

  // Auto-scrolls a duplicated track; pauses on mouse hover, stays swipeable.
  function startMarquee(viewport, track, speed, setSize) {
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
    var pos = viewport.scrollLeft;
    function tick(ts) {
      if (last === null) last = ts;
      var dt = (ts - last) / 1000;
      last = ts;
      if (!paused) {
        // Keep a fractional position: browsers round scrollLeft, so tiny per-frame steps would stall.
        if (Math.abs(viewport.scrollLeft - pos) > 1.5) pos = viewport.scrollLeft;
        pos += speed * dt;
        if (half > 0 && pos >= half) pos -= half;
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
      { label: 'stack', hint: 'tab', tab: 'stack' },
      { label: 'certifications', hint: 'tab', tab: 'certifications' },
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

  function initProjectFan() {
    var fan = document.getElementById('project-fan');
    if (!fan) return;
    var cards = Array.prototype.slice.call(fan.querySelectorAll('.project-card'));
    cards.forEach(function (card) {
      card.addEventListener('click', function (e) {
        if (card.getAttribute('data-pos') === 'center') return;
        e.preventDefault();
        var oldCenter = fan.querySelector('[data-pos="center"]');
        oldCenter.setAttribute('data-pos', card.getAttribute('data-pos'));
        card.setAttribute('data-pos', 'center');
      });
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
    initGalleryMarquee();
    initBadgeSlider();
    initCommandPalette();
    initPresenceAndChat();
    initSectionToggles();
    initHomePreviewLinks();
    initProjectFan();
  });
})();
