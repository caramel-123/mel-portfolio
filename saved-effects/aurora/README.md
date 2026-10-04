# Aurora borealis cursor effect

Saved from the portfolio before it was removed from the site.

## Files
- `aurora.js`: the effect (WebGL shader plus cursor logic). Self-contained, no dependencies.
- `aurora.css`: styles for the canvas.
- `demo.html`: a standalone page that shows it working. Open it through any local server
  (for example `python3 -m http.server` in this folder), then visit `/demo.html`.

## Using it elsewhere
1. Add `<canvas id="aurora-canvas"></canvas>` near the top of `<body>` and include `aurora.css`.
2. Add the section the effect should live in with `id="intro"` (or edit `aurora.js` to use another element).
3. Include `aurora.js` at the end of the page.

## How it behaves
- Curtains of green, teal, violet and pink are drawn live in a shader and revealed around the cursor,
  leaving a short trail. Curtain height follows the trail, so it works in every direction.
- Stop moving (about 0.1s) or leave the section: the aurora sweeps away one soft front, left to right
  or right to left depending on your last movement. Moving again fades it back in the same way.
- Moving again mid-fade dissolves the old one quickly and starts a fresh entrance in the new direction.
- Only on mouse input; not on touch. Needs WebGL.

## Settings (top of `aurora.js`)
- `IDLE_MS` (90): still time before the fade-out starts.
- `OUTRO_S` (4.2) and `INTRO_S` (1.5): seconds for the fade-out and fade-in sweeps.
- `SCALE` (0.5): render resolution; lower is faster, higher is sharper.
- In the shader: `0.3` is how wide the revealed area is, `1.45` and `1.5` set brightness.
