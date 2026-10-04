/* Journey tab renderer (saved from the portfolio, not used by the site). Needs js/journey-data.js as window.JOURNEY, the markup in journey-markup.html, and journey.css. */
(function () {
  // Journey: a winding map of stages (events). Tapping a stage opens its details and the people met there.
  // The stages come from window.JOURNEY (see js/journey.js).
  function initJourney() {
    var map = document.getElementById('journey-map');
    var overlay = document.getElementById('journey-overlay');
    var modal = document.getElementById('journey-modal');
    var body = document.getElementById('journey-modal-body');
    var closeBtn = document.getElementById('journey-close');
    var prevBtn = document.getElementById('journey-prev');
    var nextBtn = document.getElementById('journey-next');
    var stages = window.JOURNEY;
    if (!map || !overlay || !stages || !stages.length) return;

    var NS = 'http://www.w3.org/2000/svg';
    // The map runs left to right and scrolls sideways. The path is a row of tall, steep hills:
    // PER_CURVE stages climb to a peak, the next PER_CURVE stages drop to a valley, and so on.
    var PER_CURVE = 5;
    var LEFT = 190, GAP = 66, RIGHT = 190, H = 800, TOP = 205, BOTTOM = 620;
    function stageY(i) {
      var t = (i / PER_CURVE) % 2;                 // 0..2 across one full hill
      var lin = 1 - Math.abs(t - 1);               // 0 at the valley, 1 at the peak (a sharp triangle)
      var soft = 0.5 - 0.5 * Math.cos(Math.PI * lin); // same rise, but eased so peaks and valleys are round
      var tri = 0.45 * lin + 0.55 * soft;          // steep sides, rounded tops, circles never touch
      return BOTTOM - (BOTTOM - TOP) * tri;
    }
    var W = LEFT + (stages.length - 1) * GAP + RIGHT;
    var ICONS = {
      workshop: ['M22 10 12 5 2 10l10 5 10-5z', 'M6 12v5c0 1.5 3 3 6 3s6-1.5 6-3v-5'],
      hackathon: ['m16 18 6-6-6-6', 'M8 6l-6 6 6 6'],
      competition: ['M8 21h8', 'M12 17v4', 'M7 4h10v5a5 5 0 0 1-10 0V4z', 'M17 5h3v2a3 3 0 0 1-3 3', 'M7 5H4v2a3 3 0 0 0 3 3'],
      event: ['M3 6h18v15H3z', 'M3 10h18', 'M8 3v4', 'M16 3v4']
    };
    var TYPE_LABEL = { workshop: 'workshop', hackathon: 'hackathon', competition: 'competition', event: 'event' };
    var STATUS_LABEL = { done: 'completed', next: 'current stage', locked: 'coming up' };

    function el(tag, cls, text) {
      var n = document.createElement(tag);
      if (cls) n.className = cls;
      if (text != null) n.textContent = text;
      return n;
    }
    function icon(type, size) {
      var svg = document.createElementNS(NS, 'svg');
      svg.setAttribute('viewBox', '0 0 24 24');
      svg.setAttribute('width', size || 24);
      svg.setAttribute('height', size || 24);
      svg.setAttribute('fill', 'none');
      svg.setAttribute('stroke', 'currentColor');
      svg.setAttribute('stroke-width', '1.8');
      svg.setAttribute('stroke-linecap', 'round');
      svg.setAttribute('stroke-linejoin', 'round');
      svg.setAttribute('aria-hidden', 'true');
      (ICONS[type] || ICONS.event).forEach(function (d) {
        var p = document.createElementNS(NS, 'path');
        p.setAttribute('d', d);
        svg.appendChild(p);
      });
      return svg;
    }

    // Stage centres, then a smooth curve through them (Catmull-Rom converted to Bezier segments).
    var pts = stages.map(function (_, i) { return { x: LEFT + i * GAP, y: stageY(i) }; });
    function curve(list, segments) {
      if (list.length < 2) return '';
      var count = segments == null ? list.length - 1 : segments;
      var d = 'M' + list[0].x + ' ' + list[0].y;
      for (var i = 0; i < count; i++) {
        var p0 = list[i - 1] || list[i], p1 = list[i], p2 = list[i + 1], p3 = list[i + 2] || p2;
        var c1 = { x: p1.x + (p2.x - p0.x) / 6 * 1.4, y: p1.y + (p2.y - p0.y) / 6 * 1.4 };
        var c2 = { x: p2.x - (p3.x - p1.x) / 6 * 1.4, y: p2.y - (p3.y - p1.y) / 6 * 1.4 };
        d += ' C' + c1.x + ' ' + c1.y + ' ' + c2.x + ' ' + c2.y + ' ' + p2.x + ' ' + p2.y;
      }
      return d;
    }
    var reached = 0;
    stages.forEach(function (s, i) { if (s.status === 'done' || s.status === 'next') reached = i; });

    map.style.width = W + 'px';
    map.style.height = H + 'px';
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    svg.setAttribute('width', W);
    svg.setAttribute('height', H);
    svg.setAttribute('class', 'journey-path');
    svg.setAttribute('aria-hidden', 'true');
    var base = document.createElementNS(NS, 'path');
    base.setAttribute('d', curve(pts));
    base.setAttribute('class', 'path-base');
    svg.appendChild(base);
    if (reached > 0) {
      var lit = document.createElementNS(NS, 'path');
      lit.setAttribute('d', curve(pts, reached)); // same curve as the base, just the reached segments
      lit.setAttribute('class', 'path-lit');
      svg.appendChild(lit);
    }
    map.appendChild(svg);

    var nodes = [];
    stages.forEach(function (s, i) {
      var st = el('div', 'stage stage-' + (s.status || 'locked'));
      st.style.left = pts[i].x + 'px';
      st.style.top = pts[i].y + 'px';

      var art = el('div', 'stage-art');
      art.appendChild(icon(s.type, 14));
      st.appendChild(art);

      var node = el('button', 'stage-node', String(i + 1));
      node.type = 'button';
      node.setAttribute('aria-label', 'Stage ' + (i + 1) + ': ' + s.title + ', ' + (STATUS_LABEL[s.status] || ''));
      node.addEventListener('click', function () { open(i, node); });
      st.appendChild(node);
      map.appendChild(st);
      nodes.push(node);
    });

    // ---- sideways scrolling: start on the current stage, drag to scroll, arrow buttons ----
    var scroller = document.getElementById('journey-scroll');
    var leftBtn = document.getElementById('journey-left');
    var rightBtn = document.getElementById('journey-right');
    if (scroller) {
      var focusIdx = 0;
      stages.forEach(function (s, i) { if (s.status === 'next') focusIdx = i; });
      if (!stages.some(function (s) { return s.status === 'next'; })) focusIdx = reached;
      function centreOn(i, smooth) {
        scroller.scrollTo({ left: Math.max(0, pts[i].x - scroller.clientWidth / 2), behavior: smooth ? 'smooth' : 'auto' });
      }
      // the tab may be hidden at start (width 0), so centre again whenever it is shown
      var centred = false;
      function centreOnce() {
        if (centred || !scroller.clientWidth) return;
        centred = true;
        centreOn(focusIdx, false);
      }
      centreOnce();
      window.addEventListener('resize', function () { requestAnimationFrame(centreOnce); });
      var watch = new MutationObserver(function () { requestAnimationFrame(centreOnce); });
      var panel = document.getElementById('tab-journey');
      if (panel) watch.observe(panel, { attributes: true, attributeFilter: ['hidden'] });

      if (leftBtn) leftBtn.addEventListener('click', function () { scroller.scrollBy({ left: -GAP * 1.5, behavior: 'smooth' }); });
      if (rightBtn) rightBtn.addEventListener('click', function () { scroller.scrollBy({ left: GAP * 1.5, behavior: 'smooth' }); });

      // mouse drag (touch already scrolls natively)
      var dragging = false, startX = 0, startLeft = 0, moved = false;
      scroller.addEventListener('pointerdown', function (e) {
        if (e.pointerType !== 'mouse' || e.button !== 0) return;
        dragging = true; moved = false; startX = e.clientX; startLeft = scroller.scrollLeft;
      });
      window.addEventListener('pointermove', function (e) {
        if (!dragging) return;
        var dx = e.clientX - startX;
        if (Math.abs(dx) > 4) { moved = true; scroller.classList.add('dragging'); }
        scroller.scrollLeft = startLeft - dx;
      });
      window.addEventListener('pointerup', function () {
        dragging = false;
        scroller.classList.remove('dragging');
      });
      // a drag should not count as a click on a stage
      scroller.addEventListener('click', function (e) { if (moved) { e.stopPropagation(); e.preventDefault(); moved = false; } }, true);
    }

    // ---- detail pop-up ----
    var current = 0, opener = null;

    function initials(name) {
      return (name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(function (w) { return w[0].toUpperCase(); }).join('');
    }
    function hue(name) {
      var h = 0;
      for (var i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
      return h;
    }

    function render(i) {
      var s = stages[i];
      current = i;
      body.textContent = '';

      var top = el('div', 'jm-top');
      top.appendChild(el('span', 'jm-chip', 'stage ' + String(i + 1).padStart(2, '0')));
      var type = el('span', 'jm-chip jm-type');   // icon only; the type is still announced to screen readers
      type.appendChild(icon(s.type, 16));
      type.setAttribute('role', 'img');
      type.setAttribute('aria-label', TYPE_LABEL[s.type] || 'event');
      top.appendChild(type);
      top.appendChild(el('span', 'jm-chip jm-status jm-' + (s.status || 'locked'), STATUS_LABEL[s.status] || ''));
      body.appendChild(top);

      var h = el('h3', 'jm-title', s.title);
      h.id = 'journey-modal-title';
      body.appendChild(h);
      if (s.sample) body.appendChild(el('span', 'post-sample', 'sample, replace me'));

      var meta = [s.date, s.place, s.role].filter(Boolean).join('  ·  ');
      if (meta) body.appendChild(el('p', 'jm-meta', meta));
      if (s.summary) body.appendChild(el('p', 'jm-summary', s.summary));

      if (s.highlights && s.highlights.length) {
        body.appendChild(el('h4', 'jm-heading', 'highlights'));
        var ul = el('ul', 'jm-list');
        s.highlights.forEach(function (t) { ul.appendChild(el('li', null, t)); });
        body.appendChild(ul);
      }

      body.appendChild(el('h4', 'jm-heading', 'people I met'));
      if (s.people && s.people.length) {
        var list = el('ul', 'jm-people');
        s.people.forEach(function (p) {
          var li = el('li', 'jm-person');
          var av = el('span', 'jm-avatar', initials(p.name));
          av.style.background = 'hsl(' + hue(p.name || '') + ' 45% 42%)';
          li.appendChild(av);
          var info = el('div', 'jm-info');
          if (p.url) {
            var a = el('a', 'jm-name', p.name);
            a.href = p.url; a.target = '_blank'; a.rel = 'noopener';
            info.appendChild(a);
          } else {
            info.appendChild(el('span', 'jm-name', p.name));
          }
          if (p.role) info.appendChild(el('span', 'jm-role', p.role));
          if (p.note) info.appendChild(el('span', 'jm-note', p.note));
          li.appendChild(info);
          list.appendChild(li);
        });
        body.appendChild(list);
      } else {
        body.appendChild(el('p', 'jm-empty', s.status === 'locked' ? 'Not unlocked yet. The people will show up here after the event.' : 'No one added yet.'));
      }

      prevBtn.disabled = i === 0;
      nextBtn.disabled = i === stages.length - 1;
      modal.scrollTop = 0;
    }

    function open(i, from) {
      opener = from || null;
      render(i);
      overlay.hidden = false;
      document.body.style.overflow = 'hidden';
      requestAnimationFrame(function () { overlay.classList.add('open'); closeBtn.focus(); });
    }
    function close() {
      overlay.classList.remove('open');
      overlay.hidden = true;
      document.body.style.overflow = '';
      if (opener) opener.focus();
    }

    closeBtn.addEventListener('click', close);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });
    prevBtn.addEventListener('click', function () { if (current > 0) render(current - 1); });
    nextBtn.addEventListener('click', function () { if (current < stages.length - 1) render(current + 1); });
    document.addEventListener('keydown', function (e) {
      if (overlay.hidden) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowLeft' && current > 0) render(current - 1);
      else if (e.key === 'ArrowRight' && current < stages.length - 1) render(current + 1);
    });
  }


  document.addEventListener('DOMContentLoaded', initJourney);
})();
