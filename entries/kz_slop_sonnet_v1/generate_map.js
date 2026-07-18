// generate_map.js — builds kz_slop_sonnet_v1.vmf, a KZ "Canyon Switchback"
// desert-canyon ascent for Momentum Mod, entirely from code. See PLAN.md for
// the design brief and TOOLCHAIN.md for the build pipeline / movement model
// this script derives every jump from.
//
// Run: node generate_map.js   ->  writes kz_slop_sonnet_v1.vmf
// Never hand-edit the .vmf — re-run this script instead.

const fs = require("fs");
const path = require("path");
const OUT = path.join(__dirname, "kz_slop_sonnet_v1.vmf");

// ---------------------------------------------------------------------------
// Materials — all stock HL2 `nature/` set, confirmed present in the mounted
// hl2_dir.vpk (checked with bin\win64\vpk.exe l hl2_dir.vpk). Skybox is the
// one TOOLCHAIN.md explicitly names as safe.
// ---------------------------------------------------------------------------
const M = {
  blend: "NATURE/BLENDCLIFFSAND01A", // canyon terrain rock<->sand slope blend
  sandA: "NATURE/SANDFLOOR005A",
  sandB: "NATURE/SANDFLOOR009C",
  sandC: "NATURE/SANDFLOOR010A",
  rockA: "NATURE/ROCKFLOOR002A",
  rockB: "NATURE/ROCKFLOOR006A",
  rockC: "NATURE/ROCKFLOOR003A",
  cliffA: "NATURE/CLIFFFACE001A",
  cliffB: "NATURE/CLIFFFACE002A",
  wallA: "NATURE/ROCKWALL021B",
  wallB: "NATURE/ROCKWALL021C",
  flag: "DEV_NYRO/DEV_RED_A-01",
  nodraw: "TOOLS/TOOLSNODRAW",
  sky: "TOOLS/TOOLSSKYBOX",
  trigger: "TOOLS/TOOLSTRIGGER",
};

let nextId = 2; // id 1 is reserved for worldspawn
const nid = () => nextId++;

// ---------------------------------------------------------------------------
// VMF primitives. Plane points must wind clockwise viewed from outside the
// solid (TOOLCHAIN.md gotcha #1) or vbsp silently strips faces and segfaults.
// Zone-trigger faces additionally need a `vertices_plus` block (gotcha #2) or
// zonemaker.exe fails with "Could not find bottom of zone brush".
// ---------------------------------------------------------------------------
function uvAxes(normal, scale) {
  if (normal === "z") return { u: `[1 0 0 0] ${scale}`, v: `[0 -1 0 0] ${scale}` };
  if (normal === "x") return { u: `[0 1 0 0] ${scale}`, v: `[0 0 -1 0] ${scale}` };
  return { u: `[1 0 0 0] ${scale}`, v: `[0 0 -1 0] ${scale}` };
}

function side(plane, material, normal, opts = {}) {
  const a = uvAxes(normal, opts.scale || 0.25);
  const vp = opts.verts
    ? `\t\t\tvertices_plus\n\t\t\t{\n${opts.verts.map((v) => `\t\t\t\t"v" "${v}"`).join("\n")}\n\t\t\t}\n`
    : "";
  return `\t\tside
\t\t{
\t\t\t"id" "${nid()}"
\t\t\t"plane" "${plane}"
${vp}\t\t\t"material" "${material}"
\t\t\t"uaxis" "${a.u}"
\t\t\t"vaxis" "${a.v}"
\t\t\t"rotation" "0"
\t\t\t"lightmapscale" "${opts.lightmap || 16}"
\t\t\t"smoothing_groups" "0"
${opts.disp ? opts.disp + "\n" : ""}\t\t}`;
}

// Axis-aligned box solid, x1<x2, y1<y2, z1<z2.
function boxSolid(x1, y1, z1, x2, y2, z2, mats, opts = {}) {
  if (typeof mats === "string") mats = { all: mats };
  const matOf = (f) => mats[f] || mats.all || M.cliffB;
  const vertsOf = opts.withVerts
    ? {
        top: [`${x1} ${y2} ${z2}`, `${x2} ${y2} ${z2}`, `${x2} ${y1} ${z2}`, `${x1} ${y1} ${z2}`],
        bottom: [`${x1} ${y1} ${z1}`, `${x2} ${y1} ${z1}`, `${x2} ${y2} ${z1}`, `${x1} ${y2} ${z1}`],
        west: [`${x1} ${y2} ${z2}`, `${x1} ${y1} ${z2}`, `${x1} ${y1} ${z1}`, `${x1} ${y2} ${z1}`],
        east: [`${x2} ${y2} ${z1}`, `${x2} ${y1} ${z1}`, `${x2} ${y1} ${z2}`, `${x2} ${y2} ${z2}`],
        north: [`${x2} ${y2} ${z2}`, `${x1} ${y2} ${z2}`, `${x1} ${y2} ${z1}`, `${x2} ${y2} ${z1}`],
        south: [`${x2} ${y1} ${z1}`, `${x1} ${y1} ${z1}`, `${x1} ${y1} ${z2}`, `${x2} ${y1} ${z2}`],
      }
    : null;
  const o = (f) => (vertsOf ? { ...opts, verts: vertsOf[f] } : opts);
  const sides = [
    side(`(${x1} ${y2} ${z2}) (${x2} ${y2} ${z2}) (${x2} ${y1} ${z2})`, matOf("top"), "z", opts.topOpts || o("top")),
    side(`(${x1} ${y1} ${z1}) (${x2} ${y1} ${z1}) (${x2} ${y2} ${z1})`, matOf("bottom"), "z", o("bottom")),
    side(`(${x1} ${y2} ${z2}) (${x1} ${y1} ${z2}) (${x1} ${y1} ${z1})`, matOf("west"), "x", o("west")),
    side(`(${x2} ${y2} ${z1}) (${x2} ${y1} ${z1}) (${x2} ${y1} ${z2})`, matOf("east"), "x", o("east")),
    side(`(${x2} ${y2} ${z2}) (${x1} ${y2} ${z2}) (${x1} ${y2} ${z1})`, matOf("north"), "y", o("north")),
    side(`(${x2} ${y1} ${z1}) (${x1} ${y1} ${z1}) (${x1} ${y1} ${z2})`, matOf("south"), "y", o("south")),
  ];
  return `\tsolid
\t{
\t\t"id" "${nid()}"
${sides.join("\n")}
\t}`;
}

const worldSolids = [];
const entities = [];

function pointEntity(classname, origin, extra = {}) {
  const kv = Object.entries(extra).map(([k, v]) => `\t"${k}" "${v}"`).join("\n");
  entities.push(`entity
{
\t"id" "${nid()}"
\t"classname" "${classname}"
\t"origin" "${origin}"
${kv ? kv + "\n" : ""}}`);
}

function brushEntity(classname, solids, extra = {}) {
  const kv = Object.entries(extra).map(([k, v]) => `\t"${k}" "${v}"`).join("\n");
  entities.push(`entity
{
\t"id" "${nid()}"
\t"classname" "${classname}"
${kv ? kv + "\n" : ""}${solids.join("\n")}
}`);
}

// ---------------------------------------------------------------------------
// Movement model (TOOLCHAIN.md). Every required jump must be derivable from
// these constants, and the hardest allowed jump is a fixed fraction (<=0.88)
// of what's physically clearable.
// ---------------------------------------------------------------------------
const GRAV = 800;
const VJUMP = Math.sqrt(2 * GRAV * 57); // ~302 u/s unboosted vertical takeoff
const airTime = (dz) => (VJUMP + Math.sqrt(VJUMP * VJUMP - 2 * GRAV * dz)) / GRAV;
const maxGap = (speed, dz) => speed * airTime(dz) + 32; // +32 = bbox overhang both edges
function gapFor(speed, dz, frac) {
  if (frac > 0.88) throw new Error(`frac ${frac} exceeds the 88% spec ceiling`);
  return Math.round(frac * maxGap(speed, dz));
}

// ---------------------------------------------------------------------------
// Course — built as pure data first; terrain is shaped around it afterward.
// ---------------------------------------------------------------------------
const PLAZA_R = 320; // half-size of each stage's flat safe plateau
const plazas = []; // {x, y, z, name}
const platforms = []; // {cx, cy, sx, sy, top, thick, topMat, sideMat}
const report = []; // per-jump difficulty lines, printed at the end

function stage(name, from, dir, items, final, mats) {
  let cx = from.x + dir[0] * PLAZA_R;
  let cy = from.y + dir[1] * PLAZA_R;
  let prevTop = from.z, prevOff = 0, prevSize = PLAZA_R * 2;
  for (const it of items) {
    cx += dir[0] * it.gap;
    cy += dir[1] * it.gap;
    const along = it.len || it.size;
    const pcx = cx + dir[0] * (along / 2) + (dir[1] !== 0 ? it.off : 0);
    const pcy = cy + dir[1] * (along / 2) + (dir[0] !== 0 ? it.off : 0);
    platforms.push({
      cx: pcx, cy: pcy,
      sx: dir[0] !== 0 ? along : it.size, sy: dir[0] !== 0 ? it.size : along,
      top: it.top, thick: mats.thick, topMat: mats.topMat, sideMat: mats.sideMat,
    });
    const dz = it.top - prevTop;
    const lat = Math.max(0, Math.abs(it.off - prevOff) - (it.size + prevSize) / 2);
    const eff = Math.round(Math.hypot(it.gap, lat));
    const maxAtSpeed = maxGap(it.speed, dz);
    const frac = eff / maxAtSpeed;
    report.push(`${name}  gap=${String(it.gap).padStart(3)} eff=${String(eff).padStart(3)} dz=${String(dz).padStart(3)}` +
      `  v=${it.speed}  frac=${frac.toFixed(2)}`);
    if (frac > 0.88) throw new Error(`${name}: effective gap ${eff} is ${(frac * 100).toFixed(0)}% of clearable at ${it.speed} u/s (>88%)`);
    prevTop = it.top; prevOff = it.off; prevSize = it.size;
    cx += dir[0] * along; cy += dir[1] * along;
  }
  const plaza = {
    x: cx + dir[0] * (final.gap + PLAZA_R),
    y: cy + dir[1] * (final.gap + PLAZA_R),
    z: prevTop + final.dz,
    name: final.name,
  };
  const finalFrac = final.gap / maxGap(final.speed, final.dz);
  report.push(`${name}  gap=${String(final.gap).padStart(3)} dz=${String(final.dz).padStart(3)}  v=${final.speed}` +
    `  frac=${finalFrac.toFixed(2)}  (-> ${final.name})`);
  if (finalFrac > 0.88) throw new Error(`${name}: final jump ${finalFrac.toFixed(2)} exceeds 0.88`);
  plazas.push(plaza);
  return plaza;
}

function buildCourse() {
  plazas.push({ x: 0, y: 0, z: 0, name: "Start (The Wash)" });

  // ---- Stage 1: The Wash — flat sandy bhop, speed builds 260 -> ~330 u/s.
  const dz1 = [-16, 12, -12, 16, -16, 20, 16, -12, 20, 16];
  const size1 = [128, 120, 120, 112, 112, 104, 104, 96, 96, 96];
  const off1 = [0, 48, -48, 56, -56, 64, -64, 48, -64, 72];
  let z = 0;
  const s1 = dz1.map((dz, i) => {
    const speed = Math.min(330, 260 + 7 * i);
    z += dz;
    return { gap: gapFor(speed, dz, 0.45 + 0.019 * i), size: size1[i], off: off1[i], top: z, speed };
  });
  const p1 = stage("S1 Wash    ", plazas[0], [1, 0], s1,
    { gap: gapFor(330, 56, 0.55), dz: 56, speed: 330, name: "Stage 2 start" },
    { topMat: M.sandA, sideMat: M.wallA, thick: 48 });

  // ---- Stage 2: The Switchbacks — climb the canyon wall, run-speed ledges,
  // rises up to +56 (1u under the unboosted jump apex, the stage's peak).
  const dz2 = [32, 40, 32, 48, 40, 48, 32, 48, 56];
  const off2 = [40, -40, 48, -48, 40, -56, 48, -40, 0];
  const frac2 = [0.50, 0.52, 0.50, 0.55, 0.52, 0.55, 0.50, 0.58, 0.66];
  z = p1.z;
  const s2 = dz2.map((dz, i) => {
    z += dz;
    return { gap: gapFor(250, dz, frac2[i]), size: 104 - i, off: off2[i], top: z, speed: 250 };
  });
  const p2 = stage("S2 Switchback", p1, [1, 0], s2,
    { gap: gapFor(250, 24, 0.45), dz: 24, speed: 250, name: "Stage 3 start" },
    { topMat: M.sandC, sideMat: M.wallB, thick: 64 });

  // ---- Stage 3: The Narrows — 90 degree turn onto shrinking pillars, modest
  // bhop chaining, +32 rises constant so narrowing footprint drives difficulty.
  const size3 = [96, 92, 88, 84, 80, 76, 74, 72];
  const off3 = [0, 44, -44, 40, -40, 44, -36, 0];
  z = p2.z;
  const s3 = size3.map((size, i) => {
    const speed = Math.min(330, 285 + 6 * i);
    z += 32;
    return { gap: gapFor(speed, 32, 0.60 + 0.023 * i), size, off: off3[i], top: z, speed };
  });
  const p3 = stage("S3 Narrows ", p2, [0, 1], s3,
    { gap: gapFor(320, 32, 0.62), dz: 32, speed: 320, name: "Stage 4 start" },
    { topMat: M.rockA, sideMat: M.cliffA, thick: 420 });

  // ---- Stage 4: Rimrock — the finale. Long runways for a fresh prestrafe,
  // rises shrink to zero, final flat jump sits at 0.87 (spec ceiling 0.88).
  const dz4 = [16, 10, 6, 0];
  const frac4 = [0.75, 0.79, 0.83, 0.85];
  z = p3.z;
  const s4 = dz4.map((dz, i) => {
    z += dz;
    return { gap: gapFor(275, dz, frac4[i]), size: 160, len: 192, off: [0, 56, -56, 40][i], top: z, speed: 275 };
  });
  stage("S4 Rimrock ", p3, [1, 0], s4,
    { gap: gapFor(275, 0, 0.87), dz: 0, speed: 275, name: "End (Rimrock lookout)" },
    { topMat: M.rockC, sideMat: M.cliffB, thick: 64 });
}
buildCourse();

// ---------------------------------------------------------------------------
// Terrain — a carved-canyon displacement heightfield. The floor tracks the
// course centerline (slightly dipped, wash-bed style); walls rise steeply
// with distance from the path up to a rim plateau. Plaza/platform footprints
// are flattened exactly to their design height so nothing floats or clips.
// ---------------------------------------------------------------------------
const TILE = 512, POWER = 3; // 9x9 verts/tile at power 3
const BASE_Z = -320;

const PADDING = 1600;
let bx0 = Infinity, bx1 = -Infinity, by0 = Infinity, by1 = -Infinity;
for (const p of plazas) {
  bx0 = Math.min(bx0, p.x - PLAZA_R); bx1 = Math.max(bx1, p.x + PLAZA_R);
  by0 = Math.min(by0, p.y - PLAZA_R); by1 = Math.max(by1, p.y + PLAZA_R);
}
const snap = (v, up) => (up ? Math.ceil(v / TILE) : Math.floor(v / TILE)) * TILE;
const TX0 = snap(bx0 - PADDING, false), TX1 = snap(bx1 + PADDING, true);
const TY0 = snap(by0 - PADDING, false), TY1 = snap(by1 + PADDING, true);

const segs = [];
for (let i = 0; i < plazas.length - 1; i++) segs.push([plazas[i], plazas[i + 1]]);

function pathInfo(x, y) {
  let bestD2 = Infinity, bestZ = 0;
  for (const [a, b] of segs) {
    const dx = b.x - a.x, dy = b.y - a.y;
    const len2 = dx * dx + dy * dy;
    let t = len2 > 0 ? ((x - a.x) * dx + (y - a.y) * dy) / len2 : 0;
    t = Math.max(0, Math.min(1, t));
    const px = a.x + dx * t, py = a.y + dy * t;
    const d2 = (x - px) * (x - px) + (y - py) * (y - py);
    if (d2 < bestD2) { bestD2 = d2; bestZ = a.z + (b.z - a.z) * t; }
  }
  return { d: Math.sqrt(bestD2), z: bestZ };
}

const smooth = (a, b, t) => {
  const u = Math.max(0, Math.min(1, (t - a) / (b - a)));
  return u * u * (3 - 2 * u);
};

function noise(x, y) {
  return 55 * Math.sin(0.0071 * x + 1.1) * Math.cos(0.0058 * y - 0.6)
       + 32 * Math.sin(0.0135 * x - 0.4) * Math.cos(0.0102 * y + 1.4)
       + 16 * Math.sin(0.026 * x + 0.9) * Math.sin(0.021 * y - 1.2)
       + 8 * Math.sin(0.045 * x) * Math.cos(0.039 * y);
}

const FLOOR_R = 380;   // near-path wash bed, roughly flat
const WALL_R = 1500;   // distance at which the canyon rim plateaus
const WALL_HEIGHT = 650; // rim height above the local path elevation
const FLOOR_DIP = 30;    // wash bed sits slightly below the course line

function H(x, y) {
  const p = pathInfo(x, y);
  const wallT = smooth(FLOOR_R, WALL_R, p.d);
  const base = p.z - FLOOR_DIP * (1 - wallT) + WALL_HEIGHT * wallT;
  const amp = 0.35 + 0.9 * wallT; // calmer wash bed, ruggeder rim
  let h = base + amp * noise(x, y);

  // flatten exactly to plaza height under each stage plateau
  let w = 0, pz = 0;
  for (const pl of plazas) {
    const d = Math.max(Math.abs(x - pl.x), Math.abs(y - pl.y));
    const wi = 1 - smooth(PLAZA_R, PLAZA_R + 224, d);
    if (wi > w) { w = wi; pz = pl.z; }
  }
  h = h * (1 - w) + pz * w;

  const floor = BASE_Z + 64 + 0.3 * noise(x + 5200, y - 3100);
  return Math.max(h, floor);
}

// grass/sand (255) on shallow slopes, rock (0) on steep ones
function alphaAt(x, y) {
  const e = 24;
  const gx = (H(x + e, y) - H(x - e, y)) / (2 * e);
  const gy = (H(x, y + e) - H(x, y - e)) / (2 * e);
  const g = Math.sqrt(gx * gx + gy * gy);
  const t = 1 - smooth(0.45, 0.95, g);
  return Math.round(255 * t);
}

const f2 = (v) => (Math.round(v * 100) / 100).toString();

function dispTile(x1, y1) {
  const NV = 9; // 2^POWER + 1
  const step = TILE / (NV - 1);
  const rows = { normals: [], distances: [], offsets: [], offset_normals: [], alphas: [], triangle_tags: [] };
  // Engine mapping (builddisp.cpp, TOOLCHAIN.md gotcha #4): rows advance +Y
  // from startposition (the min corner), columns advance +X.
  for (let r = 0; r < NV; r++) {
    const y = y1 + r * step;
    const norm = [], dist = [], offs = [], alph = [];
    for (let c = 0; c < NV; c++) {
      const x = x1 + c * step;
      norm.push("0 0 1");
      dist.push(f2(H(x, y) - BASE_Z));
      offs.push("0 0 0");
      alph.push(alphaAt(x, y));
    }
    rows.normals.push(norm.join(" "));
    rows.distances.push(dist.join(" "));
    rows.offsets.push(offs.join(" "));
    rows.offset_normals.push(norm.join(" "));
    rows.alphas.push(alph.join(" "));
  }
  for (let r = 0; r < NV - 1; r++) rows.triangle_tags.push(Array(2 * (NV - 1)).fill("0").join(" "));

  const rowBlock = (name, data) =>
    `\t\t\t${name}\n\t\t\t{\n${data.map((d, i) => `\t\t\t\t"row${i}" "${d}"`).join("\n")}\n\t\t\t}`;

  const disp = `\t\t\tdispinfo
\t\t\t{
\t\t\t\t"power" "${POWER}"
\t\t\t\t"startposition" "[${x1} ${y1} ${BASE_Z}]"
\t\t\t\t"flags" "0"
\t\t\t\t"elevation" "0"
\t\t\t\t"subdiv" "0"
${rowBlock("normals", rows.normals)}
${rowBlock("distances", rows.distances)}
${rowBlock("offsets", rows.offsets)}
${rowBlock("offset_normals", rows.offset_normals)}
${rowBlock("alphas", rows.alphas)}
${rowBlock("triangle_tags", rows.triangle_tags)}
\t\t\t\tallowed_verts
\t\t\t\t{
\t\t\t\t\t"10" "-1 -1 -1 -1 -1 -1 -1 -1 -1 -1"
\t\t\t\t}
\t\t\t}`;

  return boxSolid(x1, y1, BASE_Z - 64, x1 + TILE, y1 + TILE, BASE_Z, { top: M.blend, all: M.nodraw },
    { topOpts: { scale: 0.5, lightmap: 32, disp }, lightmap: 32 });
}

for (let ty = TY0; ty < TY1; ty += TILE)
  for (let tx = TX0; tx < TX1; tx += TILE)
    worldSolids.push(dispTile(tx, ty));

// ---- sealing shell (displacements alone don't seal the map) ----
const IZ1 = BASE_Z - 64, IZ2 = 2100, T = 64;
worldSolids.push(boxSolid(TX0 - T, TY0 - T, IZ1 - T, TX1 + T, TY1 + T, IZ1, M.nodraw)); // floor
worldSolids.push(boxSolid(TX0 - T, TY0 - T, IZ2, TX1 + T, TY1 + T, IZ2 + T, M.sky)); // ceiling
worldSolids.push(boxSolid(TX0 - T, TY0 - T, IZ1, TX0, TY1 + T, IZ2, M.sky)); // west
worldSolids.push(boxSolid(TX1, TY0 - T, IZ1, TX1 + T, TY1 + T, IZ2, M.sky)); // east
worldSolids.push(boxSolid(TX0, TY0 - T, IZ1, TX1, TY0, IZ2, M.sky)); // south
worldSolids.push(boxSolid(TX0, TY1, IZ1, TX1, TY1 + T, IZ2, M.sky)); // north

// ---- course platforms, grounded into the terrain below (become columns) ----
function groundedBottom(cx, cy, hx, hy, top, minThick) {
  let lo = Infinity;
  for (const [dx, dy] of [[0, 0], [-hx, -hy], [hx, -hy], [-hx, hy], [hx, hy]])
    lo = Math.min(lo, H(cx + dx, cy + dy));
  return Math.min(top - minThick, Math.round(lo) - 48);
}
for (const p of platforms) {
  const hx = p.sx / 2, hy = p.sy / 2;
  const bot = groundedBottom(p.cx, p.cy, hx, hy, p.top, p.thick);
  worldSolids.push(boxSolid(p.cx - hx, p.cy - hy, bot, p.cx + hx, p.cy + hy, p.top,
    { top: p.topMat, all: p.sideMat }));
}

// ---------------------------------------------------------------------------
// Decoration — cairns/flags at each stage plaza, a rimrock lookout tower and
// beacon at the finish, and a scatter of hoodoo spires / boulders off the
// course line. Seeded PRNG so builds are reproducible.
// ---------------------------------------------------------------------------
function cairn(bx, by, bz, mat) {
  worldSolids.push(boxSolid(bx - 40, by - 40, bz, bx + 40, by + 40, bz + 48, mat));
  worldSolids.push(boxSolid(bx - 24, by - 24, bz + 48, bx + 24, by + 24, bz + 84, mat));
  worldSolids.push(boxSolid(bx - 4, by - 4, bz + 84, bx + 4, by + 4, bz + 248, M.rockC));
  worldSolids.push(boxSolid(bx + 4, by - 2, bz + 200, bx + 60, by + 2, bz + 244, M.flag));
}
for (let i = 1; i <= 3; i++) {
  const pl = plazas[i];
  cairn(pl.x + 200, pl.y + 200, pl.z, M.cliffA);
}

// Rimrock lookout tower + beacon at the finish (plazas[4])
const E = plazas[4];
worldSolids.push(boxSolid(E.x + 80, E.y - 96, E.z, E.x + 256, E.y + 96, E.z + 40, M.rockC));
worldSolids.push(boxSolid(E.x + 112, E.y - 64, E.z + 40, E.x + 224, E.y + 64, E.z + 220, M.cliffB));
worldSolids.push(boxSolid(E.x + 96, E.y - 80, E.z + 220, E.x + 240, E.y + 80, E.z + 256, M.cliffA));
worldSolids.push(boxSolid(E.x + 164, E.y - 4, E.z + 256, E.x + 172, E.y + 4, E.z + 480, M.wallA));
worldSolids.push(boxSolid(E.x + 172, E.y - 2, E.z + 420, E.x + 268, E.y + 2, E.z + 476, M.flag));

let seed = 90210;
const rand = () => {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed / 0x7fffffff;
};
const rrange = (a, b) => Math.round(a + (b - a) * rand());
let placed = 0;
for (let tries = 0; tries < 500 && placed < 40; tries++) {
  const x = rrange(TX0 + 512, TX1 - 512), y = rrange(TY0 + 512, TY1 - 512);
  const { d } = pathInfo(x, y);
  const isHoodoo = placed % 5 === 4;
  if (d < (isHoodoo ? 750 : 260) || d > 1900) continue;
  const hz = Math.round(H(x, y));
  if (hz < BASE_Z + 96) continue;
  if (isHoodoo) {
    const b = rrange(70, 130), h1 = rrange(200, 380);
    worldSolids.push(boxSolid(x - b, y - b, hz - 96, x + b, y + b, hz + h1, M.cliffA));
    const b2 = Math.round(b * 0.55);
    worldSolids.push(boxSolid(x - b2, y - b2, hz + h1, x + b2, y + b2, hz + h1 + rrange(90, 180), M.cliffB));
  } else {
    const s = rrange(32, 90);
    worldSolids.push(boxSolid(x - s, y - s, hz - s, x + s, y + s, hz + rrange(s * 0.6, s * 1.1),
      rand() < 0.5 ? M.wallA : M.wallB));
  }
  placed++;
}

// ---------------------------------------------------------------------------
// Entities: spawn, per-stage restart destinations, zone triggers, lighting.
// ---------------------------------------------------------------------------
const P = plazas;
pointEntity("info_player_start", `${P[0].x} ${P[0].y} ${P[0].z + 8}`, { angles: "0 0 0" });

const restartAngles = ["0 0 0", "0 0 0", "0 90 0", "0 0 0"];
for (let i = 0; i < 4; i++) {
  pointEntity("info_teleport_destination", `${P[i].x} ${P[i].y} ${P[i].z + 16}`, {
    targetname: `rd_s${i + 1}`, angles: restartAngles[i],
  });
}

function zoneSolid(pl, height) {
  return boxSolid(pl.x - 288, pl.y - 288, pl.z, pl.x + 288, pl.y + 288, pl.z + height, M.trigger,
    { withVerts: true });
}

brushEntity("zone_timer_start", [zoneSolid(P[0], 160)], {
  track_number: "0", stage_end_zones: "1", checkpoints_required: "1",
  checkpoints_ordered: "1", safe_height: "0", max_velocity: "-1",
  bhop_enabled: "0", restart_destination: "rd_s1",
});
for (let i = 1; i <= 3; i++) {
  brushEntity("zone_timer_stage", [zoneSolid(P[i], 160)], {
    stage_number: `${i + 1}`, checkpoints_required: "1", checkpoints_ordered: "1",
    limit_ground_speed: "1", safe_height: "0", restart_destination: `rd_s${i + 1}`,
  });
}
brushEntity("zone_timer_end", [zoneSolid(P[4], 220)], { track_number: "0" });

// warm desert sun + tan fog
pointEntity("light_environment", `${P[0].x} ${P[0].y} 2000`, {
  angles: "0 205 0", pitch: "-48",
  _light: "255 236 200 460", _ambient: "196 178 148 120",
  _lightHDR: "-1 -1 -1 1", _lightscaleHDR: "1",
  _ambientHDR: "-1 -1 -1 1", _AmbientScaleHDR: "1",
  SunSpreadAngle: "3",
});
pointEntity("env_fog_controller", `${P[0].x} ${P[0].y} 400`, {
  fogenable: "1", fogblend: "0", fogcolor: "214 188 148", fogcolor2: "214 188 148",
  fogdir: "1 0 0", fogstart: "2200", fogend: "9800", fogmaxdensity: "0.55",
  farz: "-1", spawnflags: "1",
});

// ---------------------------------------------------------------------------
// Assemble and write the VMF.
// ---------------------------------------------------------------------------
const vmf = `versioninfo
{
\t"editorversion" "400"
\t"editorbuild" "8000"
\t"mapversion" "2"
\t"formatversion" "100"
\t"prefab" "0"
}
visgroups
{
}
viewsettings
{
\t"bSnapToGrid" "1"
\t"bShowGrid" "1"
\t"nGridSpacing" "64"
}
world
{
\t"id" "1"
\t"mapversion" "2"
\t"classname" "worldspawn"
\t"skyname" "sky_cape_hill"
\t"maxpropscreenwidth" "-1"
\t"detailvbsp" "detail.vbsp"
\t"detailmaterial" "detail/detailsprites"
${worldSolids.join("\n")}
}
${entities.join("\n")}
cameras
{
\t"activecamera" "-1"
}
cordon
{
\t"mins" "(-99999 -99999 -99999)"
\t"maxs" "(99999 99999 99999)"
\t"active" "0"
}
`;

fs.writeFileSync(OUT, vmf);
console.log(`Wrote ${path.basename(OUT)}: ${worldSolids.length} world solids, ${entities.length} entities, ${platforms.length} platforms`);
console.log("Plazas:", plazas.map((p) => `${p.name}(${p.x}, ${p.y}, z=${p.z})`).join("  "));
console.log(`Terrain: x ${TX0}..${TX1}, y ${TY0}..${TY1} (${((TX1 - TX0) / TILE) * ((TY1 - TY0) / TILE)} tiles)`);
console.log("\nJump difficulty report (frac = effective gap / max clearable at assumed speed):");
for (const r of report) console.log("  " + r);
const maxFrac = Math.max(...report.map((r) => parseFloat(r.match(/frac=([0-9.]+)/)[1])));
console.log(`\nMax frac used anywhere: ${maxFrac.toFixed(3)} (spec ceiling 0.88)`);
