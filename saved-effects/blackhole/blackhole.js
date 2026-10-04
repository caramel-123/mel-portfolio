/*
 * Black hole tap effect (saved from the portfolio, not used by the site).
 * Needs: <canvas id="blackhole-fx"></canvas> (see blackhole.css). Tap or click anywhere: a black hole with a
 * swirling orange disk appears, and in Chromium it also warps the page underneath (backdrop-filter + SVG
 * displacement map). Other browsers get the canvas visuals only.
 */
(function () {
  // A swirling black hole with an orange accretion disk appears wherever you tap or click.
  function initBlackHole() {
    var canvas = document.getElementById('blackhole-fx');
    if (!canvas || !canvas.getContext) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var ctx = canvas.getContext('2d');
    var w = 0, h = 0, dpr = 1;
    var holes = [];
    var running = false;
    var LIFE = 1700; // ms

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth; h = window.innerHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener('resize', resize);

    // Real page warping: a circular backdrop-filter lens that displaces the pixels under it.
    // Only Chromium supports SVG filters in backdrop-filter; elsewhere the canvas effect still plays.
    var lensOK = !!window.chrome && !!(window.CSS && CSS.supports && CSS.supports('backdrop-filter', 'url(#x)'));
    var SVGNS = 'http://www.w3.org/2000/svg';
    var MAX_PX = 240; // displacement range encoded in the map (+/- MAX_PX / 2)
    var lensDefs = null;
    var lensMap = null;
    var lensCount = 0;

    function buildLensMap() {
      var N = 192, half = N / 2;
      var c = document.createElement('canvas');
      c.width = c.height = N;
      var cx = c.getContext('2d');
      var img = cx.createImageData(N, N);
      for (var py = 0; py < N; py++) {
        for (var px = 0; px < N; px++) {
          var vx = (px + 0.5 - half) / half, vy = (py + 0.5 - half) / half; // -1..1
          var r = Math.sqrt(vx * vx + vy * vy);
          var dx = 0, dy = 0;
          if (r < 1) {
            var f = (1 - r) * (1 - r);          // smooth falloff, 0 at the rim
            var theta = 2.6 * f;                // twist, strongest near the core
            var sc = 1 - 0.62 * f;              // pull sampling toward the center
            var cos = Math.cos(theta), sin = Math.sin(theta);
            var sx = (vx * cos - vy * sin) * sc, sy = (vx * sin + vy * cos) * sc;
            dx = (sx - vx) * half; dy = (sy - vy) * half;   // offset in map pixels
          }
          // map pixels are scaled to lens pixels later, so store as a fraction of the lens
          var ex = Math.max(-0.5, Math.min(0.5, dx / N * 1.0));
          var ey = Math.max(-0.5, Math.min(0.5, dy / N * 1.0));
          var i = (py * N + px) * 4;
          img.data[i] = Math.round((0.5 + ex) * 255);
          img.data[i + 1] = Math.round((0.5 + ey) * 255);
          img.data[i + 2] = 128;
          img.data[i + 3] = 255;
        }
      }
      cx.putImageData(img, 0, 0);
      return c.toDataURL('image/png');
    }

    function makeLens(x, y, R) {
      if (!lensOK) return null;
      if (!lensDefs) {
        lensDefs = document.createElementNS(SVGNS, 'svg');
        lensDefs.setAttribute('width', '0');
        lensDefs.setAttribute('height', '0');
        lensDefs.setAttribute('aria-hidden', 'true');
        lensDefs.style.position = 'fixed';
        document.body.appendChild(lensDefs);
        lensMap = buildLensMap();
      }
      var id = 'bh-lens-' + (lensCount++);
      var filter = document.createElementNS(SVGNS, 'filter');
      filter.setAttribute('id', id);
      filter.setAttribute('x', '0'); filter.setAttribute('y', '0');
      filter.setAttribute('width', '1'); filter.setAttribute('height', '1');
      filter.setAttribute('filterUnits', 'objectBoundingBox');
      filter.setAttribute('primitiveUnits', 'objectBoundingBox');
      filter.setAttribute('color-interpolation-filters', 'sRGB');
      var fi = document.createElementNS(SVGNS, 'feImage');
      fi.setAttribute('href', lensMap);
      fi.setAttribute('x', '0'); fi.setAttribute('y', '0');
      fi.setAttribute('width', '1'); fi.setAttribute('height', '1');
      fi.setAttribute('preserveAspectRatio', 'none');
      fi.setAttribute('result', 'map');
      var disp = document.createElementNS(SVGNS, 'feDisplacementMap');
      disp.setAttribute('in', 'SourceGraphic');
      disp.setAttribute('in2', 'map');
      disp.setAttribute('scale', '0');
      disp.setAttribute('xChannelSelector', 'R');
      disp.setAttribute('yChannelSelector', 'G');
      filter.appendChild(fi); filter.appendChild(disp);
      lensDefs.appendChild(filter);

      var el = document.createElement('div');
      el.className = 'blackhole-lens';
      el.style.left = (x - R) + 'px';
      el.style.top = (y - R) + 'px';
      el.style.width = el.style.height = (2 * R) + 'px';
      var f = 'url(#' + id + ')';
      el.style.backdropFilter = f;
      el.style.webkitBackdropFilter = f;
      document.body.appendChild(el);
      return { el: el, filter: filter, disp: disp, R: R };
    }

    function spawn(x, y) {
      var parts = [];
      for (var i = 0; i < 150; i++) {
        var arm = i % 3;
        parts.push({
          a: (arm / 3) * Math.PI * 2 + Math.random() * 0.9,
          r: 16 + Math.pow(Math.random(), 0.7) * 78,
          s: 0.7 + Math.random() * 0.6,
          size: 0.8 + Math.random() * 1.8,
          hue: 18 + Math.random() * 30
        });
      }
      var R = Math.max(110, Math.min(190, Math.min(w, h) * 0.24));
      holes.push({ x: x, y: y, t0: performance.now(), parts: parts, rot: Math.random() * Math.PI, lens: makeLens(x, y, R) });
      if (!running) { running = true; requestAnimationFrame(frame); }
    }

    function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

    function frame(now) {
      ctx.clearRect(0, 0, w, h);
      holes = holes.filter(function (b) {
        var alive = now - b.t0 < LIFE;
        if (!alive && b.lens) { b.lens.el.remove(); b.lens.filter.remove(); }
        return alive;
      });
      holes.forEach(function (b) {
        var p = (now - b.t0) / LIFE;
        var grow = easeOut(Math.min(1, p / 0.25));
        var collapse = p > 0.72 ? (p - 0.72) / 0.28 : 0;
        var scale = grow * (1 - collapse * 0.85);
        var alpha = 1 - Math.pow(collapse, 1.5);
        var t = (now - b.t0) / 1000;
        var core = 15 * scale;
        if (b.lens) {
          // warp strength follows the same grow / hold / collapse curve
          var strength = grow * (1 - collapse);
          b.lens.disp.setAttribute('scale', String(strength * 1.4));
        }

        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(b.rot);
        ctx.globalAlpha = alpha;

        // warm halo
        var halo = ctx.createRadialGradient(0, 0, core * 0.8, 0, 0, 110 * scale);
        halo.addColorStop(0, 'rgba(255,140,30,0.55)');
        halo.addColorStop(0.45, 'rgba(255,90,10,0.18)');
        halo.addColorStop(1, 'rgba(255,90,10,0)');
        ctx.fillStyle = halo;
        ctx.beginPath(); ctx.arc(0, 0, 110 * scale, 0, Math.PI * 2); ctx.fill();

        // swirling accretion disk: particles spiral inward and speed up as they fall
        ctx.globalCompositeOperation = 'lighter';
        b.parts.forEach(function (q) {
          var fall = Math.min(1, t / (LIFE / 1000)) * 0.55;
          var r = Math.max(core * 0.9, q.r * scale * (1 - fall * (1 - q.r / 110)));
          var ang = q.a + t * q.s * (4.5 + 110 / (r + 12));
          var x = Math.cos(ang) * r;
          var y = Math.sin(ang) * r * 0.5; // tilt the disk
          var heat = 1 - Math.min(1, (r - core) / 80);
          var color = 'hsla(' + (q.hue + heat * 18) + ',100%,' + (50 + heat * 25) + '%,' + (0.35 + heat * 0.55) + ')';
          // short streak behind each particle so the disk reads as a swirl
          var back = 0.32 + heat * 0.25;
          ctx.strokeStyle = color;
          ctx.lineWidth = q.size * (0.6 + heat * 0.8);
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(Math.cos(ang - back) * r, Math.sin(ang - back) * r * 0.5);
          ctx.lineTo(x, y);
          ctx.stroke();
        });
        ctx.globalCompositeOperation = 'source-over';

        // bright ring hugging the event horizon
        ctx.lineWidth = 2.5 * scale;
        ctx.strokeStyle = 'rgba(255,170,60,0.95)';
        ctx.shadowColor = 'rgba(255,120,20,0.9)';
        ctx.shadowBlur = 14;
        ctx.beginPath(); ctx.ellipse(0, 0, core * 1.45, core * 0.85, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.shadowBlur = 0;

        // the black core
        ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.arc(0, 0, core, 0, Math.PI * 2); ctx.fill();

        ctx.restore();
      });
      if (holes.length) requestAnimationFrame(frame);
      else { running = false; ctx.clearRect(0, 0, w, h); }
    }

    window.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      spawn(e.clientX, e.clientY);
    }, { passive: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initBlackHole);
  else initBlackHole();
})();
