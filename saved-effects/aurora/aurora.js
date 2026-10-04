/*
 * Aurora borealis cursor effect (saved from the portfolio).
 *
 * Needs on the page:
 *   <canvas id="aurora-canvas"></canvas>   a full-screen, fixed canvas BEHIND your content (see aurora.css)
 *   <section id="intro">...</section>      the area the aurora is limited to (it only shows while the
 *                                          cursor is inside it). Change the id in `getElementById('intro')`
 *                                          below, or point it at document.body for a whole-page effect.
 *
 * Behaviour: a live WebGL shader draws flowing aurora curtains that your cursor reveals and trails.
 * When the cursor goes idle or leaves the area, the aurora sweeps away left-to-right or right-to-left
 * (the direction you were moving). Moving back in sweeps it in from the same direction.
 * Tuning knobs: IDLE_MS, OUTRO_S, INTRO_S, the 0.3 / 0.9 radius numbers in the shader, SCALE.
 * Needs WebGL; does nothing if it is unavailable. Respects prefers-reduced-motion (no flow animation).
 */
(function () {
  // Aurora borealis, drawn live in a shader. The curtains are a flowing field fixed to the screen;
  // the cursor (and the trail it leaves) only reveals and bends them, so nothing is being dragged around.
  function initAurora() {
    var canvas = document.getElementById('aurora-canvas');
    if (!canvas) return;
    var gl = canvas.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: false });
    if (!gl) return;
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var N = 32;

    var vs = 'attribute vec2 a; void main(){ gl_Position = vec4(a, 0.0, 1.0); }';
    var fs = [
      'precision mediump float;',
      'uniform vec2 uRes; uniform float uTime; uniform float uCy; uniform float uMix; uniform float uLift; uniform float uOut; uniform float uDir; uniform vec2 uXr; uniform float uIn; uniform float uInX; uniform float uInDir; uniform vec3 uPts[' + N + '];',
      'float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }',
      'float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);',
      '  return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y); }',
      'float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++){ v += a * noise(p); p *= 2.02; a *= 0.5; } return v; }',
      // one curtain: bright lower edge, rays climbing upward, colour shifting with height
      'vec4 curtain(vec2 p, float c, float seed, float t){',
      '  float edge = c + 0.07 * sin(p.x * 2.4 + t * 2.2 + seed) + 0.11 * (fbm(vec2(p.x * 1.3 + seed, t * 0.8)) - 0.5);',
      '  float dy = p.y - edge;',
      '  float body = smoothstep(-0.035, 0.012, dy) * exp(-max(dy, 0.0) * 3.6);',
      '  float rays = fbm(vec2(p.x * 34.0 + seed * 7.0, t * 2.5 + dy * 1.2));',
      '  float patch = 0.45 + 0.55 * fbm(vec2(p.x * 2.2 + seed, t * 0.6));',
      '  float inten = body * pow(0.25 + 0.75 * rays, 1.3) * patch;',
      '  vec3 green = vec3(0.32, 1.0, 0.62), teal = vec3(0.22, 0.78, 0.92), violet = vec3(0.68, 0.42, 1.0), pink = vec3(0.95, 0.45, 0.85);',
      '  vec3 col = mix(green, teal, smoothstep(0.0, 0.22, dy));',
      '  col = mix(col, violet, smoothstep(0.16, 0.4, dy));',
      '  col = mix(col, pink, smoothstep(0.34, 0.6, dy) * 0.6);',
      '  return vec4(col * inten, inten);',
      '}',
      'void main(){',
      '  vec2 px = gl_FragCoord.xy - vec2(0.0, uLift);',
      '  vec2 p = px / uRes.y;',
      '  float m = 0.0, my = 0.0;',
      '  for (int i = 0; i < ' + N + '; i++){',
      '    vec3 q = uPts[i];',
      '    vec2 d = (px - q.xy) / (uRes.y * 0.3);',
      '    float w = q.z * exp(-dot(d, d) * 0.9);',
      '    m += w; my += w * q.y;',
      '  }',
      // each pixel hangs its curtain at the height of the nearby trail, so the glow follows any path
      '  float base = my / (m + 0.0001) / uRes.y - 0.1;',
      '  m = 1.0 - exp(-m * 1.35);',
      '  float t = uTime;',
      '  vec4 a = curtain(p, base + 0.02, 1.0, t);',
      '  vec4 b = curtain(p, base - 0.05, 3.7, t * 0.8 + 4.0);',
      '  vec4 c = curtain(p, base + 0.09, 6.1, t * 1.1 + 9.0);',
      '  vec4 col = a + b * 0.8 + c * 0.6;',
      // One soft front sweeps across the aurora: left to right or right to left, following the cursor's travel.
      // No per-streak differences, just a wide gradual fade.
      // outro: the front moves in the direction of travel and everything behind it has faded
      '  float s = clamp((px.x - uXr.x) / (uXr.y - uXr.x + 1.0), 0.0, 1.0);',
      '  s = uDir > 0.0 ? s : 1.0 - s;',
      '  float vis = 1.0 - smoothstep(s * 0.6, s * 0.6 + 0.4, uOut);',
      // intro: the aurora appears first near where the cursor came in and the front moves on ahead of it
      '  float sIn = clamp(((px.x - uInX) * uInDir) / (uRes.y * 1.1), 0.0, 1.0);',
      '  vis *= smoothstep(sIn * 0.6, sIn * 0.6 + 0.4, uIn);',
      '  float al = clamp(col.a * 1.5, 0.0, 1.0) * m * uMix * vis;',
      '  gl_FragColor = vec4(col.rgb * m * uMix * 1.45 * vis, al);',
      '}'
    ].join('\n');

    function shader(type, src) {
      var s = gl.createShader(type);
      gl.shaderSource(s, src); gl.compileShader(s);
      return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
    }
    var v = shader(gl.VERTEX_SHADER, vs), f = shader(gl.FRAGMENT_SHADER, fs);
    if (!v || !f) return;
    var prog = gl.createProgram();
    gl.attachShader(prog, v); gl.attachShader(prog, f); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);

    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prog, 'a');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    var uRes = gl.getUniformLocation(prog, 'uRes');
    var uTime = gl.getUniformLocation(prog, 'uTime');
    var uCy = gl.getUniformLocation(prog, 'uCy');
    var uMix = gl.getUniformLocation(prog, 'uMix');
    var uLift = gl.getUniformLocation(prog, 'uLift');
    var uOut = gl.getUniformLocation(prog, 'uOut');
    var uDir = gl.getUniformLocation(prog, 'uDir');
    var uXr = gl.getUniformLocation(prog, 'uXr');
    var uIn = gl.getUniformLocation(prog, 'uIn');
    var uInX = gl.getUniformLocation(prog, 'uInX');
    var uInDir = gl.getUniformLocation(prog, 'uInDir');
    var uPts = gl.getUniformLocation(prog, 'uPts');

    var SCALE = 0.5; // the glow is soft, so render at half resolution
    var W = 0, H = 0;
    function resize() {
      W = Math.max(1, Math.round(window.innerWidth * SCALE));
      H = Math.max(1, Math.round(window.innerHeight * SCALE));
      canvas.width = W; canvas.height = H;
      gl.viewport(0, 0, W, H);
    }
    resize();
    window.addEventListener('resize', resize);

    var target = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    var pos = { x: target.x, y: target.y };
    var cy = 0.5;
    var trail = [];
    var lastStamp = null;
    var mix = 0, want = 0, running = false;
    var data = new Float32Array(N * 3);

    // The aurora lives only over the intro section; below it (projects and so on) there is no effect.
    var hero = document.getElementById('intro');
    var lastMask = '';
    function heroRect() {
      var r = hero ? hero.getBoundingClientRect() : null;
      return r && r.height > 0 ? r : null;
    }
    function applyMask() {
      var r = heroRect();
      var m = 'linear-gradient(to bottom, transparent 0, transparent 0)'; // hero hidden: show nothing
      if (r) {
        var top = Math.max(0, r.top), bottom = Math.min(window.innerHeight, r.bottom);
        if (bottom > top) {
          var fade = Math.min(140, (bottom - top) * 0.4);
          m = 'linear-gradient(to bottom, transparent ' + top + 'px, #000 ' + (top + 24) + 'px, #000 ' + (bottom - fade) + 'px, transparent ' + bottom + 'px)';
        }
      }
      if (m !== lastMask) {
        lastMask = m;
        canvas.style.webkitMaskImage = m;
        canvas.style.maskImage = m;
      }
    }

    var lastMove = 0;
    var lift = 0;       // slight upward drift while the outro plays
    var lastT = 0;
    var IDLE_MS = 90;  // after this long without movement the outro starts
    var OUTRO_S = 4.2;  // seconds for the fade to sweep across every streak
    var outro = 0;      // 0 = fully visible, 1 = every streak gone
    var outroDir = 1;   // 1: streaks fade left to right, -1: right to left
    var dirAcc = 0, lastClientX = null, wasActive = false;
    var INTRO_S = 1.5;  // seconds for the streaks to appear one after another
    var intro = 1;      // 0 = no streaks yet, 1 = all appeared
    var introX = 0, introDir = 1;
    var restart = false;  // set when you move again while the previous aurora is still fading out

    function frame(now) {
      applyMask();
      var dt = lastT ? Math.min(0.05, (now - lastT) / 1000) : 0.016;
      lastT = now;
      if (want > 0 && now - lastMove > IDLE_MS) want = 0;

      // the outro starts the moment the cursor goes idle (or leaves), sweeping the way you were moving
      if (want === 0 && wasActive) { outroDir = dirAcc >= 0 ? 1 : -1; outro = 0; wasActive = false; intro = 1; }
      if (want > 0) wasActive = true;

      pos.x += (target.x - pos.x) * 0.1;
      pos.y += (target.y - pos.y) * 0.1;

      if (want > 0 && restart) {
        // Moving again while the old aurora is still fading: let it dissolve quickly, then start a fresh
        // entrance in the direction of the NEW movement (instead of replaying the old direction).
        mix = Math.max(0, mix - dt * 5);
        if (mix <= 0.02) {
          mix = 0; trail = []; lastStamp = null; outro = 0; intro = 0;
          introDir = dirAcc >= 0 ? 1 : -1;
          introX = target.x * SCALE;
          restart = false;
        }
      } else if (want > 0) {
        outro = Math.max(0, outro - dt * 6);   // brings the streaks straight back
        if (intro < 1) {
          intro = Math.min(1, intro + dt / INTRO_S);
          if (intro < 0.2) introDir = dirAcc >= 0 ? 1 : -1; // settle on the direction of the first movement
        }
        lift *= 0.7;
        mix += (1 - mix) * 0.06;
        if (!lastStamp || Math.hypot(pos.x - lastStamp.x, pos.y - lastStamp.y) > 24) {
          lastStamp = { x: pos.x, y: pos.y };
          trail.push({ x: pos.x, y: pos.y, life: 1 });
          if (trail.length > N - 1) trail.shift();
        }
        trail.forEach(function (p) { p.life -= 0.009; });
        trail = trail.filter(function (p) { return p.life > 0; });
      } else if (mix > 0.01 || trail.length) {
        outro = Math.min(1, outro + dt / OUTRO_S);
        lift += dt * 22 * SCALE;
        if (outro >= 1) { trail = []; mix = 0; lastStamp = null; restart = false; }
      }

      data.fill(0);
      var k = 0, minX = 1e9, maxX = -1e9;
      function put(x, y, life) {
        var px = x * SCALE;
        data[k++] = px; data[k++] = (window.innerHeight - y) * SCALE; data[k++] = life;
        if (px < minX) minX = px;
        if (px > maxX) maxX = px;
      }
      trail.forEach(function (p) { put(p.x, p.y, p.life * 0.75); });
      // the live cursor position carries the strongest part of the field
      if (want > 0 || mix > 0.01) put(pos.x, pos.y, 1.0);
      var margin = H * 0.45;
      if (minX > maxX) { minX = 0; maxX = W; }

      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(uRes, W, H);
      gl.uniform1f(uTime, reduced ? 0 : now * 0.00006);
      gl.uniform1f(uCy, cy * 1.0);
      gl.uniform1f(uMix, mix);
      gl.uniform1f(uLift, lift);
      gl.uniform1f(uOut, outro * outro * (3.0 - 2.0 * outro));
      gl.uniform1f(uIn, intro * intro * (3.0 - 2.0 * intro));
      gl.uniform1f(uInX, introX);
      gl.uniform1f(uInDir, introDir);
      gl.uniform1f(uDir, outroDir);
      gl.uniform2f(uXr, minX - margin, maxX + margin);
      gl.uniform3fv(uPts, data);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      var settling = Math.abs(target.x - pos.x) > 0.4 || Math.abs(target.y - pos.y) > 0.4;
      var playing = want > 0 || ((mix > 0.01 || trail.length) && outro < 1);
      if (playing || (settling && want > 0)) requestAnimationFrame(frame);
      else { running = false; lift = 0; lastT = 0; outro = 0; mix = 0; restart = false; gl.clear(gl.COLOR_BUFFER_BIT); }
    }
    function kick() { if (!running) { running = true; requestAnimationFrame(frame); } }

    window.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse') return;
      var r = heroRect();
      if (!r || e.clientY < r.top || e.clientY > r.bottom) { want = 0; lastClientX = null; kick(); return; }
      if (want === 0 && mix < 0.02) {           // coming in from nothing: play the intro
        intro = 0; dirAcc = 0; introDir = 1;
        introX = e.clientX * SCALE;
      } else if (want === 0 && !restart) {      // still fading out from before: restart in the new direction
        restart = true; dirAcc = 0; lastClientX = null;
      }
      if (lastClientX !== null) dirAcc = dirAcc * 0.7 + (e.clientX - lastClientX) * 0.3;
      lastClientX = e.clientX;
      target.x = e.clientX; target.y = e.clientY;
      want = 1;
      lastMove = performance.now();
      kick();
    }, { passive: true });
    document.documentElement.addEventListener('mouseleave', function () { want = 0; kick(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initAurora);
  else initAurora();
})();
