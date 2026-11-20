// Anatomy figure: the rover's object detector as a classic CNN diagram, in the kit's isometric style.
// Input frame -> conv/pool feature volumes -> YOLO-style grid head -> output frame with the detection.
// Layer sizes are schematic; the output ("mallet", 0.94) is the real detection from the SAR video.
// Build: node build.mjs   -> cnn.svg
import { writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const k = await import(pathToFileURL(join(homedir(), ".claude", "skills", "anatomy", "kit", "iso-kit.mjs")).href);
const HERE = dirname(fileURLToPath(import.meta.url));

const WIDTH = 600;
const HEIGHT = 384;
const SIDE = 96; // input / output frame size
const MID = SIDE / 2;

// Feature volumes: x = where it sits, w = channels (thickness), s = spatial size (square).
const LAYERS = [
  { x: 44, w: 10, s: 80, label: "conv" },
  { x: 82, w: 10, s: 58, label: "pool" },
  { x: 118, w: 20, s: 58, label: "conv" },
  { x: 166, w: 20, s: 38, label: "pool" },
  { x: 214, w: 32, s: 38, label: "conv" },
];
const HEAD = { x: 276, w: 12, s: 30 };
const OUT_X = 344;

const corners = [];
for (const L of [...LAYERS, HEAD]) corners.push(...k.boxCorners({ x: L.x, y: MID - L.s / 2, w: L.w, d: L.s }, MID - L.s / 2, MID + L.s / 2));
corners.push(...k.boxCorners({ x: 0, y: 0, w: 3, d: SIDE }, 0, SIDE), ...k.boxCorners({ x: OUT_X, y: 0, w: 3, d: SIDE }, 0, SIDE));
corners.push([0, SIDE, -62], [OUT_X, SIDE, -62]);
// Viewer to the front-left, so each layer shows the face that looks back toward the input.
const P = k.fitProjection(corners, WIDTH, HEIGHT, { pad: 24, azimuth: 118, elevation: 20 });

const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const pt = (p) => at(p).map((n) => n.toFixed(1)).join(",");

// A point on a frame's front face: u across (0..1 along y), v up (0..1 along z).
const onFrame = (x, u, v) => [x, u * SIDE, v * SIDE];
const facePath = (x, poly) => "M" + poly.map(([u, v]) => pt(onFrame(x, u, v))).join("L") + "Z";
// Affine transform that lays SVG text flat on a frame face (1 unit = 1 world unit).
function faceMatrix(x, u, v) {
  const o = at(onFrame(x, u, v));
  const a = at([x, u * SIDE + 1, v * SIDE]);
  const b = at([x, u * SIDE, v * SIDE - 1]);
  return `matrix(${(a[0] - o[0]).toFixed(4)} ${(a[1] - o[1]).toFixed(4)} ${(b[0] - o[0]).toFixed(4)} ${(b[1] - o[1]).toFixed(4)} ${o[0].toFixed(1)} ${o[1].toFixed(1)})`;
}

// The mallet as seen in the frame: a long diagonal handle and a head at its upper end.
const HANDLE = [[0.24, 0.7], [0.3, 0.76], [0.86, 0.2], [0.8, 0.14]];
const HEADP = [[0.14, 0.7], [0.22, 0.84], [0.36, 0.76], [0.28, 0.62]];
const BOX = [[0.12, 0.1], [0.9, 0.1], [0.9, 0.88], [0.12, 0.88]];

function frame(x, { output = false } = {}) {
  const out = [];
  out.push(S(k.slabOf({ x, y: 0, w: 3, d: SIDE, r: 0.5 }, 0, SIDE, P, 2, 0.4), { tone: "mid" }));
  // Pixel grid on the face.
  const grid = [];
  for (let i = 1; i < 8; i++) {
    grid.push(`M${pt(onFrame(x, i / 8, 0))}L${pt(onFrame(x, i / 8, 1))}`);
    grid.push(`M${pt(onFrame(x, 0, i / 8))}L${pt(onFrame(x, 1, i / 8))}`);
  }
  out.push(`<path class="cn-grid" d="${grid.join("")}"/>`);
  out.push(`<path class="cn-mallet" d="${facePath(x, HANDLE)}${facePath(x, HEADP)}"/>`);
  if (output) {
    out.push(`<path class="cn-box" pathLength="1" d="${facePath(x, BOX)}"/>`);
    out.push(`<text class="cn-tag" transform="${faceMatrix(x, 0.12, 0.92)}" font-size="9">mallet 0.94</text>`);
  } else {
    // The kernel window the first convolution slides over the frame.
    out.push(`<path class="cn-kernel" d="${facePath(x, [[0.42, 0.44], [0.6, 0.44], [0.6, 0.62], [0.42, 0.62]])}"/>`);
  }
  return out.join("");
}

function volume(L, i) {
  const plan = { x: L.x, y: MID - L.s / 2, w: L.w, d: L.s, r: 0.6 };
  return `<g class="cn-layer" style="animation-delay:${(0.35 * (i + 1)).toFixed(2)}s">${S(k.slabOf(plan, MID - L.s / 2, L.s, P, 2, 0.5), { tone: "hi", crease: "lo" })}</g>`;
}

function head() {
  const plan = { x: HEAD.x, y: MID - HEAD.s / 2, w: HEAD.w, d: HEAD.s, r: 0.6 };
  const out = [`<g class="cn-layer" style="animation-delay:${(0.35 * (LAYERS.length + 1)).toFixed(2)}s">`, S(k.slabOf(plan, MID - HEAD.s / 2, HEAD.s, P, 2, 0.5), { tone: "hi", crease: "lo" })];
  // A 3 x 3 grid on its front face: each cell predicts boxes and classes.
  const x = HEAD.x, y0 = MID - HEAD.s / 2, z0 = MID - HEAD.s / 2;
  const g = [];
  for (let i = 1; i < 3; i++) {
    g.push(`M${pt([x, y0 + (HEAD.s * i) / 3, z0])}L${pt([x, y0 + (HEAD.s * i) / 3, z0 + HEAD.s])}`);
    g.push(`M${pt([x, y0, z0 + (HEAD.s * i) / 3])}L${pt([x, y0 + HEAD.s, z0 + (HEAD.s * i) / 3])}`);
  }
  out.push(`<path class="cn-headgrid" d="${g.join("")}"/>`, `</g>`);
  return out.join("");
}

// Receptive-field cones: a window on one stage narrows to a single cell on the next.
function cone(fromX, win, toX, toU, toV, toS) {
  const [u0, v0, u1, v1] = win;
  const apex = at([toX, MID + (toU - 0.5) * toS, MID + (toV - 0.5) * toS]);
  const corners4 = [[u0, v0], [u1, v0], [u1, v1], [u0, v1]].map(([u, v]) => at([fromX, u, v]));
  return `<path class="cn-cone" d="${corners4.map((c) => `M${c[0].toFixed(1)},${c[1].toFixed(1)}L${apex[0].toFixed(1)},${apex[1].toFixed(1)}`).join("")}"/>`;
}
function windowOn(L, du, dv, size) {
  // A square window on layer L's front face, in world y/z.
  const y = MID + (du - 0.5) * L.s, z = MID + (dv - 0.5) * L.s;
  return [y, z, y + size, z + size];
}

const cones = [
  cone(0, [0.42 * SIDE, 0.44 * SIDE, 0.6 * SIDE, 0.62 * SIDE], LAYERS[0].x, 0.55, 0.55, LAYERS[0].s),
  cone(LAYERS[0].x, windowOn(LAYERS[0], 0.5, 0.5, 10), LAYERS[1].x, 0.6, 0.6, LAYERS[1].s),
  cone(LAYERS[2].x, windowOn(LAYERS[2], 0.48, 0.5, 9), LAYERS[3].x, 0.6, 0.6, LAYERS[3].s),
  cone(LAYERS[4].x, windowOn(LAYERS[4], 0.4, 0.45, 8), HEAD.x, 0.65, 0.6, HEAD.s),
];

// Labels under each stage, and brackets grouping what runs on the NPU.
function labels() {
  const out = [];
  const stages = [[0, 3, "INPUT"], ...LAYERS.map((L) => [L.x, L.w, L.label.toUpperCase()]), [HEAD.x, HEAD.w, "HEAD"], [OUT_X, 3, "OUTPUT"]];
  const foot = (x, w) => at([x + w / 2, SIDE, 0]);
  const base = Math.max(...stages.map(([x, w]) => foot(x, w)[1])) + 22;
  for (const [x, w, text] of stages) out.push(`<text class="cn-lab" x="${foot(x, w)[0].toFixed(1)}" y="${base.toFixed(1)}" text-anchor="middle">${text}</text>`);
  const y = base + 16;
  const bracket = (x0, x1, text) => {
    const ax = foot(x0, 0)[0], bx = foot(x1, 0)[0], mx = (ax + bx) / 2;
    out.push(`<path class="cn-brace" d="M${ax.toFixed(1)},${y.toFixed(1)} V${(y + 7).toFixed(1)} H${bx.toFixed(1)} V${y.toFixed(1)} M${mx.toFixed(1)},${(y + 7).toFixed(1)} V${(y + 13).toFixed(1)}"/>`);
    out.push(`<text class="cn-group" x="${mx.toFixed(1)}" y="${(y + 29).toFixed(1)}" text-anchor="middle">${text}</text>`);
  };
  bracket(LAYERS[0].x - 4, LAYERS[LAYERS.length - 1].x + LAYERS[LAYERS.length - 1].w + 4, "FEATURE LEARNING · YOLO BACKBONE");
  bracket(HEAD.x - 4, OUT_X + 6, "DETECTION");
  return out.join("");
}

// Painter's order: farthest (output, largest x) first, input last; cones on top.
const body = [
  frame(OUT_X, { output: true }),
  head(),
  ...LAYERS.map((L, i) => ({ L, i })).reverse().map(({ L, i }) => volume(L, i)),
  frame(0),
  cones.join(""),
  labels(),
];

const css = `
.iso{--anatomy-paper:#161c24;--anatomy-face:#1b222c;--anatomy-top:#202833;--anatomy-shade-0:#121820;--anatomy-shade-1:#151b24;--anatomy-shade-2:#18202a;--anatomy-shade-3:#1b232e}
.cn-grid{fill:none;stroke:#2c3642;stroke-width:.5}
.cn-mallet{fill:#c9654a;stroke:#e8774a;stroke-width:.6}
.cn-kernel{fill:rgba(79,143,224,.18);stroke:#4f8fe0;stroke-width:1.2}
.cn-cone{fill:none;stroke:#4f8fe0;stroke-width:.8;opacity:.75}
.cn-headgrid{fill:none;stroke:#9aa3ad;stroke-width:.7}
.cn-box{fill:none;stroke:#3fd47a;stroke-width:1.6;stroke-dasharray:1;stroke-dashoffset:1;animation:cn-draw 4.2s infinite}
.cn-tag{fill:#3fd47a;font-family:ui-monospace,Menlo,monospace;opacity:0;animation:cn-tag 4.2s infinite}
.cn-lab{fill:#9aa3ad;font:500 11.5px ui-monospace,Menlo,monospace;letter-spacing:.08em}
.cn-group{fill:#e8e6e1;font:500 12px ui-monospace,Menlo,monospace;letter-spacing:.1em}
.cn-brace{fill:none;stroke:#5d6670;stroke-width:1}
.cn-layer{animation:cn-pulse 4.2s infinite}
@keyframes cn-pulse{0%,100%{filter:none}6%{filter:drop-shadow(0 0 5px #4f8fe0) brightness(1.5)}16%{filter:none}}
@keyframes cn-draw{0%,55%{stroke-dashoffset:1}70%,92%{stroke-dashoffset:0}100%{stroke-dashoffset:0;opacity:0}}
@keyframes cn-tag{0%,66%{opacity:0}74%,92%{opacity:1}100%{opacity:0}}
@media (prefers-reduced-motion:reduce){.cn-layer{animation:none}.cn-box{animation:none;stroke-dashoffset:0}.cn-tag{animation:none;opacity:1}}
`;

let svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  standalone: "dark",
  label: "A convolutional object detector. A camera frame showing a mallet passes through convolution and pooling volumes that shrink in space and grow in channels, with cones showing each window narrowing to one cell, into a grid detection head. The output frame shows the mallet boxed and labelled mallet 0.94.",
  body,
});
svg = svg.replace("</style>", css + "</style>");
writeFileSync(join(HERE, "cnn.svg"), svg);
console.log("wrote cnn.svg");
