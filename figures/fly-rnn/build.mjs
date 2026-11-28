// Anatomy figure: Fruit Fly Connectome RNN, drawn as a bench instrument.
// A lamp carriage (the moving bar stimulus) runs over 16 photocells (the 16 retina positions).
// Under them, a 9-row x 16-column patch panel holds one jack per neuron type per position
// (R1-R6, L1, L2, Mi1, Tm3, Tm1, Tm2, T4, T5, back to front). The same-position wiring is
// fixed by a punched card read from the real connectome (type_matrix.csv, neuPrint male-cns v1.0);
// the lateral weights are fader pairs between columns (learned, not connectome, and set
// with independent noise per side to break the left/right symmetry). The T4 and T5 rows feed
// a summing bus into a galvanometer that reads P(right).
// Build: node build.mjs [--light]   → fly-rnn.html (or fly-rnn-light.html)
import { writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ANATOMY = join(homedir(), ".claude", "skills", "anatomy");
const k = await import(pathToFileURL(join(ANATOMY, "kit", "iso-kit.mjs")).href);
const { kitScript } = await import(pathToFileURL(join(ANATOMY, "scripts", "inline-kit.mjs")).href);

const HERE = dirname(fileURLToPath(import.meta.url));
const theme = process.argv.includes("--light") ? "light" : "dark";

/* ---------- Truth: the model this figure stands for ---------- */
const N = 16; // photoreceptor positions in the 1D strip
const TYPES = ["R1-R6", "L1", "L2", "Mi1", "Tm3", "Tm1", "Tm2", "T4", "T5"];
const SIGN = [-1, -1, 1, 1, 1, 1, 1, 1, 1]; // sign_matrix.csv (Dale's law per presynaptic type)
// type_matrix.csv: average synapse weight, rows = presynaptic, columns = postsynaptic.
const W = [
  [1.97, 28.62, 29.49, 0, 0, 0, 0, 0, 0],
  [1.44, 2.57, 2.12, 64.95, 12.51, 1.26, 2.47, 1.0, 0],
  [2.57, 2.66, 1.59, 1.9, 1.69, 105.62, 74.32, 0, 0],
  [0, 17.17, 1.4, 2.41, 9.62, 2.31, 1.55, 9.57, 0],
  [0, 3.5, 1.69, 2.12, 3.11, 1.43, 1.44, 5.12, 1.49],
  [0, 1.0, 2.1, 1.57, 1.37, 1.61, 2.6, 1.3, 4.9],
  [0, 1.85, 2.14, 1.69, 1.45, 2.74, 1.45, 1.59, 7.08],
  [0, 1.33, 0, 1.09, 1.14, 1.12, 1.13, 1.97, 1.54],
  [0, 0, 0, 3.0, 1.07, 1.08, 1.08, 1.5, 1.84],
];
const ROW_COLOUR = ["#f3e6c4", "#c7d2de", "#c7d2de", "#4f8fe0", "#4f8fe0", "#e8774a", "#e8774a", "#4f8fe0", "#e8774a"];
const STEPS = 24; // recurrent unroll length per sample
// motion_detection.ipynb, logged 50-epoch training run (direction accuracy and BCE loss per epoch).
const ACC = [0.5015,0.4979,0.5021,0.4981,0.4971,0.5005,0.5003,0.5036,0.5015,0.5019,0.5024,0.5,0.5035,0.5018,0.5018,0.4996,0.4981,0.5009,0.5022,0.504,0.4993,0.5002,0.5043,0.5038,0.5017,0.5031,0.5127,0.5126,0.5279,0.5625,0.6563,0.6767,0.6893,0.6941,0.6916,0.6909,0.6927,0.6888,0.7092,0.7307,0.7401,0.7414,0.7447,0.742,0.745,0.7486,0.746,0.7468,0.7465,0.7471];
const LOSS = [0.7539,0.6959,0.6953,0.6952,0.6951,0.6946,0.6944,0.6942,0.694,0.6939,0.6938,0.6941,0.6938,0.6939,0.6938,0.6936,0.6938,0.6939,0.694,0.6939,0.6938,0.6938,0.6935,0.6936,0.6934,0.6936,0.6924,0.6906,0.6889,0.6868,0.6763,0.6707,0.6659,0.661,0.6548,0.6504,0.6449,0.6398,0.614,0.582,0.5512,0.5397,0.5315,0.5289,0.5235,0.5168,0.5141,0.5111,0.5085,0.5064];
const EPOCHS = ACC.length;

/* ---------- World layout (x along the strip, y toward the viewer, z up) ---------- */
const WIDTH = 720;
const HEIGHT = 335;
const PITCH = 20;
const COLS = Array.from({ length: N }, (_, i) => -150 + PITCH * i);
const ROW_Y = TYPES.map((_, r) => -16 + 6.4 * r);

const PLATE = { x: -232, y: -80, w: 446, d: 176, r: 8 };
const PLATE_H = 10;
const FOOT_H = 4;
const STRIP = { x: -162, y: -40, w: 324, d: 16, r: 2 };
const CELL_Y = -32;
const CELL_R = 5.5;
const CELL_TOP = 12.5;
const POST_X = [-180, 180];
const RAIL_Z = 58;
const RAIL = { x: -184, y: -35, w: 368, d: 6, r: 1.5 };
const HOOD_Z = 30;
const PANEL = { x: -202, y: -22, w: 364, d: 64, r: 3 };
const PANEL_H = 9;
const LIP = { x: -162, y: 42, w: 324, d: 28, r: 2 };
const LIP_H = 5;
const BUS = { x: -156, y: 38.6, w: 312, d: 2.4, r: 1 };
const RULER = { x: -156, y: 78, w: 312, d: 7, r: 1 };
// Fader pairs between columns: left and right lateral weight side by side, travelling along y.
const FADER_Y0 = LIP.y + 5;
const FADER_TRAVEL = 17;
const FADER_Y = (v) => FADER_Y0 + FADER_TRAVEL * (1 - v); // higher weight sits further back, so higher on screen
const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), [POST_X[0], CELL_Y, RAIL_Z + 16], [POST_X[1], CELL_Y, RAIL_Z + 16]],
  WIDTH,
  HEIGHT,
  { pad: 14, azimuth: 62 },
);

const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const byDepth = (items, key = (v) => v) => items.toSorted((a, b) => k.depthOf(key(a), P) - k.depthOf(key(b), P));

// Lateral fader settings, 0..1. Start: a shared structural prior plus small independent noise per side
// (the notebook's init: -3 + structured_bias + randn * 0.1), so each pair sits almost level. End: illustrative,
// since the trained weights weren't saved; the two sides of each pair split as training breaks the symmetry.
let seed = 7;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const clamp01 = (v) => Math.min(0.94, Math.max(0.06, v));
const LATERAL = Array.from({ length: N - 1 }, () => {
  const shared = 0.4 + rand() * 0.2;
  const start = { left: clamp01(shared + (rand() - 0.5) * 0.03), right: clamp01(shared + (rand() - 0.5) * 0.03) };
  const split = 0.18 + rand() * 0.22;
  const sign = rand() < 0.5 ? -1 : 1;
  return { start, end: { left: clamp01(shared + sign * split), right: clamp01(shared - sign * split * (0.6 + rand() * 0.5)) } };
});
// One fader per side per gap: [side, x offset from the gap centre].
const FADER_SIDES = [["left", -3.4], ["right", 3.4]];

/* ---------- Parts ---------- */
function plate() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(PLATE, 22), ([x, y]) => [x, y, 0])) {
    out.push(S(k.cylinder(x, y, 7, -PLATE_H - FOOT_H, 1.6, P, 28), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 5.4, -PLATE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "mid" }));
  }
  out.push(S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 8, 1.6), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: "lo" }));
  const screws = k.corners(PLATE, 10);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  // Position ruler: one major tick per retina column.
  out.push(S(k.slabOf(RULER, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
  const ticks = k.topTicks(RULER.x + 6, RULER.x + RULER.w - 6, 4, 5, RULER.y + 0.8, 0.6, [2, 3.8], P);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  out.push(D([at([RULER.x + 2.5, RULER.y + 3.5, 0.6]), at([RULER.x + RULER.w - 2.5, RULER.y + 3.5, 0.6])], { size: 0.45 }));
  return out.join("");
}

function post(x) {
  const out = [];
  const foot = { x: x - 7, y: CELL_Y - 7, w: 14, d: 14, r: 2 };
  out.push(S(k.slabOf(foot, 0, 4, P, 3, 0.5), { tone: "mid" }));
  out.push(D(k.corners(foot, 2.6).map(([px, py]) => at([px, py, 4])), { size: 0.4 }));
  out.push(S(k.cylinder(x, CELL_Y, 3.6, 4, RAIL_Z - 4, P, 24), { tone: "mid", crease: "none" }));
  out.push(L([20, 40].map((z) => k.sideArc(x, CELL_Y, 3.6, z, P, 14)).join(""), { tone: "faint" }));
  out.push(S(k.cylinder(x, CELL_Y, 5, RAIL_Z - 3, 3, P, 24), { tone: "mid" }));
  return out.join("");
}

function cells() {
  const out = [];
  out.push(S(k.slabOf(STRIP, 0, 5, P, 3, 0.6), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(STRIP, 2.5), 5, P, 3), { tone: "faint" }));
  for (const [i, x] of byDepth(COLS.map((x, i) => [i, x]), ([, x]) => [x, CELL_Y, 0])) {
    out.push(S(k.cylinder(x, CELL_Y, CELL_R, 5, 6, P, 24), { tone: "mid" }));
    out.push(S(k.cylinder(x, CELL_Y, 4.2, 11, CELL_TOP - 11, P, 24, 0.3), { tone: "hi", crease: "lo" }));
    out.push(L(k.ring(x, CELL_Y, 2.8, CELL_TOP, P, 20), { tone: "lo" }));
    out.push(`<path class="iso-line" data-tone="lit" data-cell="${i}" style="opacity:0;stroke-width:1.1" d="${k.ring(x, CELL_Y, 2.8, CELL_TOP, P, 20)}"/>`);
    out.push(D([at([x, CELL_Y, CELL_TOP])], { size: 0.45, tone: "lo" }));
  }
  return out.join("");
}

function rail() {
  const out = [S(k.slabOf(RAIL, RAIL_Z, 6, P, 3, 0.5), { tone: "mid" })];
  out.push(L(k.lineOnTop([RAIL.x + 4, RAIL.y + 3], [RAIL.x + RAIL.w - 4, RAIL.y + 3], RAIL_Z + 6, P), { tone: "faint" }));
  out.push(D(POST_X.map((x) => at([x, RAIL.y + 3, RAIL_Z + 6])), { size: 0.5 }));
  return out.join("");
}

// Built at x = 0 and moved with translateAlong.
function carriage() {
  const out = [];
  const block = { x: -11, y: CELL_Y - 8, w: 22, d: 16, r: 2 };
  out.push(S(k.slabOf(block, RAIL_Z - 4, 16, P, 3, 0.6), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(block, 2.4), RAIL_Z + 12, P, 3), { tone: "faint" }));
  out.push(D(k.corners(block, 3).map(([px, py]) => at([px, py, RAIL_Z + 12])), { size: 0.4 }));
  const knob = [0, CELL_Y + 10];
  out.push(S(k.slabOf({ x: -1.5, y: CELL_Y + 8, w: 3, d: 3, r: 0.8 }, RAIL_Z + 3, 3, P, 2), { tone: "mid", crease: "none" }));
  out.push(S(k.cylinder(knob[0], knob[1] + 1, 3, RAIL_Z + 1.5, 6, P, 20), { tone: "mid" }));
  out.push(L(k.knurl(knob[0], knob[1] + 1, 3, RAIL_Z + 1.5, RAIL_Z + 7.5, 18, P), { tone: "lo" }));
  out.push(S(k.cylinder(0, CELL_Y, 2.4, HOOD_Z + 10, RAIL_Z - 4 - HOOD_Z - 10, P, 16), { tone: "mid", crease: "none" }));
  out.push(S(k.cylinder(0, CELL_Y, 7.5, HOOD_Z + 2, 8, P, 32, 0.5), { tone: "mid" }));
  out.push(L(k.sideArc(0, CELL_Y, 7.5, HOOD_Z + 6, P, 20), { tone: "faint" }));
  out.push(S(k.cylinder(0, CELL_Y, 6.4, HOOD_Z, 2, P, 32), { tone: "hi", lit: true }));
  return out.join("");
}

function panel() {
  const out = [];
  out.push(S(k.slabOf(LIP, 0, LIP_H, P, 3, 0.5), { tone: "mid" }));
  out.push(S(k.slabOf(PANEL, 0, PANEL_H, P, 4, 0.8), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(PANEL, 3), PANEL_H, P, 4), { tone: "faint" }));
  // Divider between the engraved names and the jack field.
  out.push(L(k.lineOnTop([-162, PANEL.y + 3], [-162, PANEL.y + PANEL.d - 3], PANEL_H, P), { tone: "faint" }));
  // One trace per column, photocell lead down to the summing bus.
  out.push(L(COLS.map((x) => k.lineOnTop([x, PANEL.y], [x, BUS.y], PANEL_H, P)).join(""), { tone: "faint" }));
  ROW_Y.forEach((y, r) => {
    out.push(k.faceTextSvg(k.topMatrix([-196, y + 1], PANEL_H, P, "x"), TYPES[r], { size: 4.8, tone: r >= 7 ? "hi" : "mid" }));
    out.push(L(COLS.map((x) => k.ring(x, y, 1.9, PANEL_H, P, 16)).join(""), { tone: r >= 7 ? "mid" : "lo" }));
    // The neuron itself: a lens over each jack that lights with its activity.
    COLS.forEach((x, i) => out.push(`<path class="fx-n" data-n="${r * N + i}" style="color:${ROW_COLOUR[r]};opacity:0" d="${k.ring(x, y, 2.5, PANEL_H, P, 18)}"/>`));
  });
  out.push(S(k.slabOf(BUS, PANEL_H, 1.4, P, 2), { tone: "hi", crease: "lo" }));
  out.push(D([at([BUS.x + 2, BUS.y + 1.2, PANEL_H + 1.4]), at([BUS.x + BUS.w - 2, BUS.y + 1.2, PANEL_H + 1.4])], { size: 0.45, tone: "hi" }));
  // Fader pairs between columns: left and right lateral weights for that gap, side by side.
  COLS.slice(0, -1).forEach((x0, i) => {
    for (const [side, dx] of FADER_SIDES) {
      const x = x0 + PITCH / 2 + dx;
      const track = { x: x - 0.8, y: FADER_Y0 - 2, w: 1.6, d: FADER_TRAVEL + 4, r: 0.8 };
      out.push(L(k.planOutline(track, LIP_H, P, 3), { tone: "lo" }));
      out.push(`<g data-fader="${side}-${i}">${fader(x)}</g>`);
    }
  });
  return out.join("");
}

// A fader cap built at value 0 (front of its track) and moved along y.
function fader(x) {
  const y = FADER_Y(0);
  const cap = { x: x - 2.2, y: y - 1.7, w: 4.4, d: 3.4, r: 0.6 };
  return S(k.slabOf(cap, LIP_H, 2.4, P, 2, 0.3), { tone: "hi", crease: "lo" }) +
    L(k.lineOnTop([cap.x + 0.8, y], [cap.x + cap.w - 0.8, y], LIP_H + 2.4, P), { tone: "lo", free: true });
}


/* ---------- Page ---------- */
const startX = COLS[0] - 20;
const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    "A bench instrument standing for a connectome-constrained recurrent network. A lamp carriage slides along a rail over 16 photocells, the 16 retina positions. In front, a patch panel has 9 rows of jacks, one per neuron type, for each position; each jack lights as its neuron fires, ON pathway in blue and OFF pathway in orange. Fader pairs between columns are the learned left and right lateral weights. The two output rows, T4 and T5, feed a summing bus.",
  body: [
    plate(),
    post(POST_X[0]),
    cells(),
    post(POST_X[1]),
    rail(),
    `<g data-part="carriage" transform="${k.translateAlong(P, [startX, 0, 0])}">${carriage()}</g>`,
    panel(),
  ],
});

const live = `
const P = ${JSON.stringify(P)};
const COLS = ${JSON.stringify(COLS)}, PITCH = ${PITCH};
const STEPS = ${STEPS};
const ACC = ${JSON.stringify(ACC)}, LOSS = ${JSON.stringify(LOSS)}, EPOCHS = ${EPOCHS};
const ACC_MAX = Math.max(...ACC);
const LATERAL = ${JSON.stringify(LATERAL)}, FADER_SIDES = ${JSON.stringify(FADER_SIDES)}, FADER_Y0 = ${FADER_Y0}, FADER_TRAVEL = ${FADER_TRAVEL};
const FADER_Y = ${FADER_Y.toString()};
const N = ${N}, ROWS = ${TYPES.length};
const REACH = [${COLS[0] - 24}, ${COLS[N - 1] + 24}];
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const $ = (s) => svg.querySelector(s);
const carriage = $('[data-part="carriage"]');
// Training chart: one bar per epoch of the logged run; bars fill in as the replay reaches them.
const bars = [...document.querySelectorAll("[data-bar]")], accText = document.querySelector("[data-acc]");
let barsShown = -1;
// Architecture labels are sized in viewBox units; --k scales them back to the page's type sizes.
const ax = document.querySelector(".ax");
new ResizeObserver(([e]) => { if (e.contentRect.width) ax.style.setProperty("--k", 800 / e.contentRect.width); }).observe(ax);
const cellRings = [...svg.querySelectorAll("[data-cell]")];
const faders = [];
COLS.slice(0, -1).forEach((x0, i) => FADER_SIDES.forEach(([side]) => faders.push({ el: $('[data-fader="' + side + "-" + i + '"]'), from: LATERAL[i].start[side], to: LATERAL[i].end[side] })));
const neurons = [...svg.querySelectorAll("[data-n]")].sort((a, b) => a.dataset.n - b.dataset.n);
const shown = new Array(neurons.length).fill("0");

const readout = document.querySelector("[data-readout]");
const replay = document.querySelector("[data-replay]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
// Logged curve, read between epochs. epoch runs 1..EPOCHS.
const at = (list, e) => { const i = clamp(e, 1, EPOCHS) - 1, lo = Math.floor(i), hi = Math.min(lo + 1, EPOCHS - 1); return list[lo] + (list[hi] - list[lo]) * (i - lo); };

// Needle stand-in: delay-and-compare between neighbouring cells (what T4/T5 compute), scaled by how
// far the logged accuracy has moved off chance. At a symmetric start it can't tell left from right.
const act = new Float32Array(COLS.length), slow = new Float32Array(COLS.length);
const prevAct = new Float32Array(COLS.length);
const level = Array.from({ length: ROWS }, () => new Float32Array(COLS.length));
const lp = (row, i, input, dt, tau) => { level[row][i] += (input - level[row][i]) * (1 - Math.exp(-dt / tau)); };
// Illustrative ON/OFF circuit in the shape the README describes: R1-R6 follow the light; L1 carries
// brightening into the ON pathway (Mi1 fast, Tm3 delayed), L2 carries dimming into the OFF pathway
// (Tm1 fast, Tm2 delayed); T4/T5 compare a delayed neighbour with a fast one, and only become
// direction-selective as training breaks the left/right symmetry.
function circuit(dt) {
  for (let i = 0; i < COLS.length; i++) {
    const rate = (act[i] - prevAct[i]) / Math.max(dt, 1e-3);
    level[0][i] = act[i];
    lp(1, i, Math.min(1, Math.max(0, rate) / 6), dt, 0.05);
    lp(2, i, Math.min(1, Math.max(0, -rate) / 6), dt, 0.05);
    lp(3, i, level[1][i], dt, 0.04);
    lp(4, i, level[1][i], dt, 0.2);
    lp(5, i, level[2][i], dt, 0.04);
    lp(6, i, level[2][i], dt, 0.2);
  }
  for (let i = 0; i < COLS.length; i++) {
    const l = Math.max(0, i - 1), r = Math.min(COLS.length - 1, i + 1);
    const on = Math.abs(level[4][l] - level[4][r]) * level[3][i] * 8;
    const off = Math.abs(level[6][l] - level[6][r]) * level[5][i] * 8;
    lp(7, i, Math.min(1, learned * on + (1 - learned) * 0.25 * level[3][i]), dt, 0.05);
    lp(8, i, Math.min(1, learned * off + (1 - learned) * 0.25 * level[5][i]), dt, 0.05);
  }
}
const TRAIN = 9; // seconds to replay 50 epochs
let mode = "train", trainT = 0, epoch = 1, learned = 0, shownLearned = -1;
let x = REACH[0], target = x, prevX = x, p = 0.5, pRate = 0;
let frame = 0, last = 0, clock = 0, touring = true, visible = false, idle = 0, dir = 0;
function sweep(t, travel, rest) {
  const cycle = 2 * (travel + rest), u = t % cycle;
  if (u < travel) return REACH[0] + (REACH[1] - REACH[0]) * (u / travel);
  if (u < travel + rest) return REACH[1];
  if (u < 2 * travel + rest) return REACH[1] - (REACH[1] - REACH[0]) * ((u - travel - rest) / travel);
  return REACH[0];
}
function drawTraining() {
  const a = at(ACC, epoch);
  const done = Math.floor(epoch);
  if (done !== barsShown) {
    barsShown = done;
    bars.forEach((b, i) => b.classList.toggle("on", i < done));
    accText.textContent = (a * 100).toFixed(1) + "%";
  }
  if (Math.abs(learned - shownLearned) > 0.002) {
    shownLearned = learned;
    for (const f of faders) f.el.setAttribute("transform", translateAlong(P, [0, FADER_Y(f.from + (f.to - f.from) * learned) - FADER_Y(0), 0]));
  }
}
function draw() {
  carriage.setAttribute("transform", translateAlong(P, [x, 0, 0]));
  cellRings.forEach((el, i) => { const o = act[i].toFixed(2); if (el.style.opacity !== o) el.style.opacity = o; });
  neurons.forEach((el, n) => {
    const v = level[Math.floor(n / N)][n % N];
    const o = (Math.round(Math.min(1, Math.sqrt(v) * 1.25) * 20) / 20).toFixed(2);
    if (shown[n] !== o) { shown[n] = o; el.style.opacity = o; }
  });
  drawTraining();
  let text;
  if (mode === "train") {
    text = "training · epoch " + Math.max(1, Math.floor(epoch)) + "/" + EPOCHS;
  } else {
    const progress = clamp((x - REACH[0]) / (REACH[1] - REACH[0]), 0, 1);
    const step = Math.min(STEPS, Math.max(1, Math.round((dir < 0 ? 1 - progress : progress) * STEPS)));
    text = (dir > 0 ? "moving right" : dir < 0 ? "moving left" : "still") + " · P(right) " + p.toFixed(2);
  }
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-valuetext", text);
}
function startTraining() {
  mode = "train"; trainT = 0; epoch = 1; learned = 0; touring = true; clock = 0;
  if (still.matches) finishTraining();
  replay.disabled = true;
  run();
}
function finishTraining() {
  mode = "run"; epoch = EPOCHS; learned = clamp((at(ACC, EPOCHS) - 0.5) / (ACC_MAX - 0.5), 0, 1);
  clock = clamp((x - REACH[0]) / (REACH[1] - REACH[0]), 0, 1) * 3.4; // carry on from where the bar is, no snap
  replay.disabled = false;
  if (still.matches) { touring = false; x = target = (REACH[0] + REACH[1]) / 2; }
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  if (mode === "train") {
    trainT += dt;
    epoch = 1 + clamp(trainT / TRAIN, 0, 1) * (EPOCHS - 1);
    learned = clamp((at(ACC, epoch) - 0.5) / (ACC_MAX - 0.5), 0, 1);
    target = sweep(trainT, 0.9, 0.12); // fresh synthetic batches, both directions
    if (trainT >= TRAIN) finishTraining();
  } else if (touring) { clock += dt; target = sweep(clock, 3.4, 1.1); }
  prevX = x;
  x = still.matches ? target : x + (target - x) * (1 - Math.exp(-dt / (mode === "train" ? 0.05 : 0.12)));
  const v = (x - prevX) / dt;
  dir = Math.abs(v) > 4 ? Math.sign(v) : Math.abs(v) < 0.5 ? 0 : dir;
  const k = 1 - Math.exp(-dt / 0.14);
  let corr = 0;
  for (let i = 0; i < COLS.length; i++) {
    const a = Math.exp(-(((COLS[i] - x) / 13) ** 2));
    act[i] = a;
    slow[i] += (a - slow[i]) * k;
  }
  for (let i = 0; i < COLS.length - 1; i++) corr += slow[i] * act[i + 1] - act[i] * slow[i + 1];
  circuit(dt);
  prevAct.set(act);
  const want = 1 / (1 + Math.exp(-corr * 2.2 * learned));
  for (let s = 0; s < 4; s++) { pRate += ((want - p) * 90 - pRate * 15) * dt / 4; p += pRate * dt / 4; }
  p = clamp(p, 0, 1);
  draw();
  frame = visible ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const steer = (next) => {
  if (mode === "train") return;
  touring = false; target = clamp(next, REACH[0], REACH[1]);
  clearTimeout(idle); idle = setTimeout(() => { touring = !still.matches; clock = 0; }, 3600); run();
};
new IntersectionObserver((e) => { visible = e[e.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
replay.addEventListener("click", () => startTraining());
stage.addEventListener("pointermove", (event) => {
  const box = svg.getBoundingClientRect();
  steer(REACH[0] + clamp(((event.clientX - box.left) / box.width - 0.15) / 0.7, 0, 1) * (REACH[1] - REACH[0]));
});
stage.addEventListener("keydown", (event) => {
  if (event.key === "t" || event.key === "T") { startTraining(); event.preventDefault(); return; }
  const step = { ArrowRight: 20, ArrowUp: 20, ArrowLeft: -20, ArrowDown: -20 }[event.key];
  if (event.key === "Home") steer(REACH[0]);
  else if (event.key === "End") steer(REACH[1]);
  else if (step) steer(target + step);
  else return;
  event.preventDefault();
});
startTraining();
draw();
`;

const body = k.plateHtml({
  fig: "Fig 2",
  title: "Connectome motion detector",
  hint: "Hover to steer the light bar",
  readout: "training · epoch 1/50 · accuracy 50.2%",
  keys: [
    { mark: "lit", label: "Light bar: the moving input" },
    { mark: "blue", label: "ON neurons: Mi1, Tm3, T4" },
    { mark: "red", label: "OFF neurons: Tm1, Tm2, T5" },
    { mark: "raised", label: "Faders: learned left/right weights" },
  ],
  caption:
    "Each of the 16 columns is one retina position running the same 9-neuron circuit; column 8 is wired so you can see its links. Training replays the notebook's logged run on the plotter (stuck at chance for 26 epochs, 74.7% by epoch 50); neuron lights and fader motion are illustrative.",
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Light bar position: arrow keys move it along the photocells; T replays training" aria-valuemin="0" aria-valuemax="1">${svg}</div>`,
}).replace(/<span class="iso-plate-corner" data-corner="title">[^<]*<\/span>/, `<button type="button" class="iso-plate-corner fx-train" data-corner="title" data-replay aria-label="Training accuracy per epoch; click to replay training"><span>Accuracy <b data-acc>50.2%</b></span><svg class="fx-bars" viewBox="0 0 150 28" aria-hidden="true"><line class="fx-chance" x1="0" x2="150" y1="20.6" y2="20.6"/>${ACC.map((a, i) => `<rect data-bar x="${i * 3}" y="${(28 - ((a - 0.4) / 0.38) * 28).toFixed(1)}" width="2" height="${(((a - 0.4) / 0.38) * 28).toFixed(1)}"/>`).join("")}</svg></button>`);

/* ---------- Fig 2b: the same network as a standard unrolled-RNN diagram ---------- */
function archHtml() {
  // A standard unrolled-RNN diagram of motion_detection.ipynb's MotionDetection.forward:
  // h_t = (1 - λ) ⊙ h_{t-1} + W tanh(h_{t-1}) + W_L tanh(h^L_{t-1}) + W_R tanh(h^R_{t-1}) + x_t, for t = 1..24, h_0 = 0;
  // P(right) = σ(Σ over the 16 positions of tanh(h_24) at T4 and T5).
  const arrow = (d, kind = "") => `<path class="ax-arrow ${kind}" d="${d}" marker-end="url(#ax-head)"/>`;
  const link = (x0, x1) => arrow(`M${x0} ${mid} H${x1 - 2}`); // every horizontal link is GAP long
  // _{sub}, ^{sup} and [learned] markup to SVG tspans.
  const m = (s) => s
    .replace(/\[([^\]]*)\]/g, '<tspan class="ax-lrn">$1</tspan>')
    .replace(/_\{([^}]*)\}/g, '<tspan class="ax-sub" dy="3">$1</tspan><tspan dy="-3">​</tspan>')
    .replace(/\^\{([^}]*)\}/g, '<tspan class="ax-sub" dy="-5">$1</tspan><tspan dy="5">​</tspan>');
  // One horizontal grid: cells CW wide, GAP between every pair of boxes.
  const CY = 12, CH = 44, CW = 56, GAP = 26, mid = CY + CH / 2;
  const H0 = 72; // where the h0 label ends
  const X1 = H0 + GAP, X2 = X1 + CW + GAP, X3 = X2 + CW + GAP;
  const DOTS = [X3 + CW + GAP, X3 + CW + GAP + 28]; // the ··· slot
  const X24 = DOTS[1] + GAP;
  const SUM = [X24 + CW + GAP, 116]; // x, width
  const SIG = SUM[0] + SUM[1] + GAP + 14; // centre of the σ node
  const OUT = [SIG + 14 + GAP, 780 - (SIG + 14 + GAP)];
  const STEP = [[1, X1], [2, X2], [3, X3], [24, X24]];
  // x_t: the 16-position stimulus column at step t (a bar moving right).
  const SY = CY + CH + 38;
  const strip = (t, cx) => {
    const pos = ((t - 1) * 15) / 23, out = [];
    for (let i = 0; i < 16; i++) {
      const v = Math.exp(-(((i - pos) / 1.1) ** 2));
      out.push(`<rect x="${cx - 4}" y="${SY + i * 4}" width="8" height="3.4" style="opacity:${(0.08 + 0.92 * v).toFixed(2)}"/>`);
    }
    return `<g class="ax-grid">${out.join("")}</g>${arrow(`M${cx} ${SY - 6} V${CY + CH + 4}`)}<text class="ax-s" x="${cx}" y="${SY + 64 + 20}" text-anchor="middle">${m(`x_{${t}}`)}</text>`;
  };
  const cells = STEP.map(([t, x]) =>
    `<g class="ax-box"><rect x="${x}" y="${CY}" width="${CW}" height="${CH}" rx="6"/><text class="ax-t" x="${x + CW / 2}" y="${mid + 4}" text-anchor="middle">${m(`h_{${t}}`)}</text></g>${strip(t, x + CW / 2)}`).join("");
  const EQ = SY + 64 + 20 + 40, KEY = EQ + 32;
  return `<figure class="iso-figure fx-arch"><div class="iso-plate"><div class="iso-plate-corners" aria-hidden="true"><span class="iso-plate-corner" data-corner="fig">Fig 2b</span><span class="iso-plate-corner" data-corner="title">Architecture</span></div>
<svg class="ax" viewBox="0 0 800 ${KEY + 8}" role="img" aria-label="The recurrent network unrolled over 24 time steps. The hidden state h starts at zero; at each step it takes the previous state through the connectome weights W, the learned left and right lateral weights and the learned leak, and adds that step's stimulus x_t. After step 24, the T4 and T5 activity summed over the 16 positions goes through a sigmoid to give P(right).">
<defs><marker id="ax-head" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 8 4 0 8z" class="ax-headfill"/></marker></defs>
<text class="ax-s" x="20" y="${mid + 4}">${m("h_{0} = 0")}</text>
${link(H0, X1)}
${cells}
${link(X1 + CW, X2)}${link(X2 + CW, X3)}${link(X3 + CW, DOTS[0])}
<text class="ax-t" x="${(DOTS[0] + DOTS[1]) / 2}" y="${mid + 4}" text-anchor="middle">···</text>
${link(DOTS[1], X24)}
${link(X24 + CW, SUM[0])}
<g class="ax-box"><rect x="${SUM[0]}" y="${CY}" width="${SUM[1]}" height="${CH}" rx="6"/><text class="ax-t" x="${SUM[0] + SUM[1] / 2}" y="${mid + 4}" text-anchor="middle">Σ T4 + T5</text></g>
${link(SUM[0] + SUM[1], SIG - 14)}
<circle class="ax-sum" cx="${SIG}" cy="${mid}" r="14"/><text class="ax-t" x="${SIG}" y="${mid + 4}" text-anchor="middle">σ</text>
${link(SIG + 14, OUT[0])}
<g class="ax-box ax-accent"><rect x="${OUT[0]}" y="${CY}" width="${OUT[1]}" height="${CH}" rx="6"/><text class="ax-t" x="${OUT[0] + OUT[1] / 2}" y="${mid + 4}" text-anchor="middle">P(right)</text></g>
<text class="ax-s" x="20" y="${EQ}">${m("h_{t} = (1 − [λ]) ⊙ h_{t−1} + W tanh(h_{t−1}) + [W_{L}] tanh(h^{L}_{t−1}) + [W_{R}] tanh(h^{R}_{t−1}) + x_{t}")}</text>
<g class="ax-key"><text class="ax-s" x="20" y="${KEY}">h: state of 16 × 9 neurons</text><text class="ax-s" x="236" y="${KEY}">x: light bar</text>
<rect x="352" y="${KEY - 10}" width="22" height="12" rx="3"/><text class="ax-s" x="382" y="${KEY}">W: connectome</text>
<rect class="ax-learned-key" x="505" y="${KEY - 10}" width="22" height="12" rx="3"/><text class="ax-s" x="535" y="${KEY}">${m("[W_{L}, W_{R}, λ]: learned")}</text></g>
</svg></div><figcaption class="iso-legend"><span class="iso-caption">The same network as Fig 2, unrolled over time. Connectome weights start from neuPrint data and are fine-tuned; lateral weights and leak have no connectome data, so they are learned.</span></figcaption></figure>`;
}
const ARCH_CSS = ".iso-stage{overflow:hidden}.fx-controls{display:flex;justify-content:center;margin:14px 0 4px}" +
  ".fx-arch{margin-top:36px}.fx-arch .iso-plate{padding:44px 20px 20px}.ax{display:block;width:100%;height:auto;font-family:var(--anatomy-mono)}" +
  ".ax-box rect,.ax-sum{fill:var(--anatomy-face);stroke:var(--anatomy-mid);stroke-width:1}.ax-learned rect{stroke:#4f8fe0;stroke-dasharray:4 3}" +
  ".ax-accent rect{stroke:var(--anatomy-strong);stroke-width:1.5}.ax-cell{fill:none;stroke:var(--anatomy-lo)}" +
  ".ax-t{fill:var(--anatomy-strong);font-size:calc(12px * var(--k, 1));font-weight:500}.ax-s{fill:var(--anatomy-text);font-size:calc(11px * var(--k, 1))}.ax-h{fill:var(--anatomy-muted);font-size:calc(11px * var(--k, 1));letter-spacing:.1em}" +
  ".ax-l{fill:var(--anatomy-muted);font-size:calc(11px * var(--k, 1))}.ax-arrow{fill:none;stroke:var(--anatomy-mid);stroke-width:1.2}.ax-headfill{fill:var(--anatomy-mid)}" +
  ".ax-grid rect{fill:#f3e6c4}.ax-sub{font-size:calc(8.5px * var(--k, 1))}.ax-lrn{fill:#4f8fe0}.ax-key rect{fill:none;stroke:var(--anatomy-mid)}.ax-key .ax-learned-key{stroke:#4f8fe0;stroke-dasharray:3 2}";

let html = k.pageHtml({ title: "Connectome motion detector", theme, body: body + archHtml(), script: kitScript() + live, width: 820 });
if (theme === "dark") {
  // Match the portfolio's tokens (DESIGN.md): page #0b0e12, card #11151b.
  html = html.replace("</style>", ".iso[data-theme=\"dark\"],.iso:not([data-theme=\"light\"]){--anatomy-page:#0b0e12;--anatomy-card:#11151b;--anatomy-paper:#11151b}.iso-page{margin:16px auto}</style>");
}
// Replay button, both themes.
html = html.replace("</style>", ".fx-train{pointer-events:auto;display:grid;gap:6px;justify-items:end;padding:0;background:none;border:0;cursor:pointer;font:inherit;color:inherit;letter-spacing:.1em;text-transform:uppercase}.fx-train:disabled{cursor:default}.fx-train b{font-weight:500;color:var(--anatomy-text);letter-spacing:.04em}.fx-train:focus-visible{outline:2px solid var(--anatomy-mid);outline-offset:4px}.fx-bars{display:block;width:150px;height:28px}.fx-bars rect{fill:var(--anatomy-lo);transition:fill .2s}.fx-bars rect.on{fill:var(--anatomy-strong)}.fx-chance{stroke:var(--anatomy-mid);stroke-dasharray:2 2}.iso-plate{padding-top:64px}.fx-n{fill:currentColor;stroke:currentColor;stroke-width:.6;filter:drop-shadow(0 0 2px currentColor)}.fx-cable{fill:none;stroke:currentColor;stroke-linecap:round;opacity:.3}.fx-cable[data-inhibitory]{stroke-dasharray:2.4 1.6}.iso{--anatomy-blue:#4f8fe0;--anatomy-red:#e8774a}" + ARCH_CSS + "</style>");
const out = theme === "light" ? "fly-rnn-light.html" : "fly-rnn.html";
writeFileSync(join(HERE, "..", "..", "public", "figures", "fly-rnn", out), html);
console.log("wrote", out);
