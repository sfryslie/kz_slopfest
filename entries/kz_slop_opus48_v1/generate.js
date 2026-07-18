#!/usr/bin/env node
/*
 * generate.js — kz_slop_opus48_v1 "Tidewater Ascent"
 *
 * Emits kz_slop_opus48_v1.vmf deterministically. No hand editing.
 *
 * Design & physics are documented in PLAN.md. Key invariants enforced here:
 *  - Plane winding is computed & corrected per-face so outward normals are
 *    guaranteed (TOOLCHAIN gotcha #1).
 *  - vertices_plus is emitted on every face (gotcha #2, needed by zonemaker).
 *  - Every REQUIRED jump is asserted <= 88% of the max clearable gap at the
 *    conservative run speed v=250 (SPEC req 3). Build aborts otherwise.
 */
'use strict';
const fs = require('fs');
const path = require('path');

// ----------------------------------------------------------------------------
// Movement model (TOOLCHAIN.md)
// ----------------------------------------------------------------------------
const V_TAKEOFF = 302;            // vertical takeoff speed u/s
const GRAV = 800;
const RUN = 250;                  // conservative approach speed for the gate check
function airTime(dz) {            // dz = landing height above takeoff (u)
  const disc = V_TAKEOFF * V_TAKEOFF - 2 * GRAV * dz;
  if (disc < 0) return NaN;       // unreachable height
  return (V_TAKEOFF + Math.sqrt(disc)) / GRAV;
}
function maxGap(dz, v) { return v * airTime(dz) + 32; } // +32 bbox overhang

// ----------------------------------------------------------------------------
// VMF id allocation + emitters
// ----------------------------------------------------------------------------
let _id = 0;
const nid = () => ++_id;

// Outward face definitions for an axis-aligned box.
// For each face we know the outward normal and gather its 4 corners; the winding
// is then fixed programmatically so the plane normal matches the outward normal.
function faceCorners(mn, mx, axis, side) {
  const [x0, y0, z0] = mn, [x1, y1, z1] = mx;
  // corners returned CCW-ish; order is corrected later.
  switch (axis + side) {
    case 'z+': return [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]];
    case 'z-': return [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0]];
    case 'x+': return [[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]];
    case 'x-': return [[x0, y0, z0], [x0, y1, z0], [x0, y1, z1], [x0, y0, z1]];
    case 'y+': return [[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]];
    case 'y-': return [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]];
  }
}
const NORMALS = {
  'z+': [0, 0, 1], 'z-': [0, 0, -1],
  'x+': [1, 0, 0], 'x-': [-1, 0, 0],
  'y+': [0, 1, 0], 'y-': [0, -1, 0],
};
function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
function cross(a, b) {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}
function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }

// UV axes per face orientation (world aligned), scale in u/texel.
function uv(axis, scale) {
  if (axis === 'z') return [`[1 0 0 0] ${scale}`, `[0 -1 0 0] ${scale}`];
  if (axis === 'x') return [`[0 1 0 0] ${scale}`, `[0 0 -1 0] ${scale}`];
  return [`[1 0 0 0] ${scale}`, `[0 0 -1 0] ${scale}`]; // y
}

// Build one face's VMF text. `withVerts` emits vertices_plus (zone brushes need it;
// we emit it everywhere to match Strata Hammer output).
function faceStr(mn, mx, key, material, scale) {
  const axis = key[0], side = key[1];
  let c = faceCorners(mn, mx, axis, side);
  // Correct winding: normal from (p0-p1)x(p2-p1) must point along outward normal.
  const n = cross(sub(c[0], c[1]), sub(c[2], c[1]));
  if (dot(n, NORMALS[key]) < 0) c = c.slice().reverse();
  const p = c.map(v => `(${v[0]} ${v[1]} ${v[2]})`);
  const [ua, va] = uv(axis, scale);
  const verts = c.map(v => `\t\t\t"v" "${v[0]} ${v[1]} ${v[2]}"`).join('\n');
  return `\tside
\t{
\t\t"id" "${nid()}"
\t\t"plane" "${p[0]} ${p[1]} ${p[2]}"
\t\t"material" "${material}"
\t\t"uaxis" "${ua}"
\t\t"vaxis" "${va}"
\t\t"rotation" "0"
\t\t"lightmapscale" "16"
\t\t"smoothing_groups" "0"
\t\tvertices_plus
\t\t{
${verts}
\t\t}
\t}`;
}

// An axis-aligned box brush. `mats` may be a single material (all faces) or a
// per-face map keyed by z+ z- x+ x- y+ y-.
function box(mn, mx, mats, scale = 0.25) {
  const keys = ['z+', 'z-', 'x+', 'x-', 'y+', 'y-'];
  const getMat = k => (typeof mats === 'string' ? mats : (mats[k] || mats.side || 'TOOLS/TOOLSNODRAW'));
  const sides = keys.map(k => faceStr(mn, mx, k, getMat(k), scale)).join('\n');
  return `\tsolid
\t{
\t\t"id" "${nid()}"
${sides}
\t\teditor
\t\t{
\t\t\t"color" "0 180 220"
\t\t}
\t}`;
}

// ----------------------------------------------------------------------------
// Course definition
// ----------------------------------------------------------------------------
const MAT = {
  shoreTop: 'NATURE/GRASSFLOOR003A',
  shoreSide: 'NATURE/BLENDDIRTGRASS001A',
  scrambleTop: 'NATURE/DIRTFLOOR003A',
  scrambleSide: 'NATURE/DIRTFLOOR005B',
  ledgeTop: 'NATURE/ROCKFLOOR006A',
  ledgeSide: 'NATURE/ROCKWALL006A',
  spireTop: 'NATURE/ROCKFLOOR002C',
  spireSide: 'NATURE/ROCKWALL010B',
  ground: 'NATURE/SANDFLOOR005A',   // beach floor far below
  cliff: 'NATURE/CLIFFFACE001A',
  sky: 'TOOLS/TOOLSSKYBOX',
  trig: 'TOOLS/TOOLSTRIGGER',
};
function topMat(top, side) { return { 'z+': top, 'z-': side, 'x+': side, 'x-': side, 'y+': side, 'y-': side }; }

// Stages: dz per jump, landing depth (X) & width (Y), gap list (edge to edge).
const STAGES = [
  { name: 'The Tideline',      top: MAT.shoreTop,    side: MAT.shoreSide,    dz: 0,  depth: 96, width: 128, gaps: [96, 112, 120, 128] },
  { name: 'The Scramble',      top: MAT.scrambleTop, side: MAT.scrambleSide, dz: 16, depth: 80, width: 112, gaps: [120, 132, 140, 148, 152] },
  { name: 'The Ledgeworks',    top: MAT.ledgeTop,    side: MAT.ledgeSide,    dz: 24, depth: 56, width: 56,  gaps: [140, 148, 156, 160, 164] },
  { name: 'The Summit Spires', top: MAT.spireTop,    side: MAT.spireSide,    dz: 40, depth: 44, width: 44,  gaps: [128, 136, 142, 146, 150] },
];

const PLAT_THICK = 32;     // platform vertical thickness (top surface = z, base = z - thick)
const START_DEPTH = 224, START_WIDTH = 256, START_Z = 0;
const FINISH_DEPTH = 192, FINISH_WIDTH = 160;

// Walk the course left->right, produce platform rects and the required-jump list.
function layout() {
  const platforms = [];   // {x0,x1,z,width,top,side,label}
  const jumps = [];       // {from,to,gap,dz,label}
  let x = 0;
  let z = START_Z;

  // start pad
  const startPad = { x0: x, x1: x + START_DEPTH, z, width: START_WIDTH, top: MAT.shoreTop, side: MAT.shoreSide, label: 'start' };
  platforms.push(startPad);
  let prevTopZ = z;               // takeoff surface height
  let prevEdge = x + START_DEPTH; // far edge to jump from
  x = prevEdge;

  const stageFirstPlat = [];      // index into platforms of each stage's first platform

  STAGES.forEach((st, si) => {
    st.gaps.forEach((gap, ji) => {
      const takeoffZ = prevTopZ;
      z = takeoffZ + st.dz;                 // this landing height
      const px0 = prevEdge + gap;
      const px1 = px0 + st.depth;
      const plat = { x0: px0, x1: px1, z, width: st.width, top: st.top, side: st.side,
                     label: `S${si + 1}.${ji + 1}` };
      platforms.push(plat);
      // Record the first platform of stages 2+ only: that platform is where the
      // new stage begins, so its zone_timer_stage is the timed split. Stage 1
      // begins at the start pad (the zone_timer_start), not here.
      if (ji === 0 && si >= 1) stageFirstPlat.push(platforms.length - 1);
      jumps.push({ from: plat.label, gap, dz: st.dz, v: RUN, stage: si + 1,
                   width: st.width, depth: st.depth });
      prevTopZ = z;
      prevEdge = px1;
      x = px1;
    });
  });

  // summit finish pad, level with last platform
  const finish = { x0: prevEdge + 96, x1: prevEdge + 96 + FINISH_DEPTH, z: prevTopZ,
                   width: FINISH_WIDTH, top: MAT.spireTop, side: MAT.spireSide, label: 'finish' };
  // small hop onto finish (generous, not counted as a difficulty jump but still checked)
  jumps.push({ from: 'finish', gap: 96, dz: 0, v: RUN, stage: 4, width: FINISH_WIDTH, depth: FINISH_DEPTH, note: 'finish hop' });
  platforms.push(finish);

  return { platforms, jumps, stageFirstPlat, finishIdx: platforms.length - 1, startIdx: 0 };
}

// ----------------------------------------------------------------------------
// Difficulty report + hard assertion
// ----------------------------------------------------------------------------
function report(jumps) {
  console.log('\n  Per-jump difficulty (checked at v=250 u/s, cap 88%):');
  console.log('  jump      gap    dz   airtime  maxGap   pct');
  let worst = 0, fail = null;
  for (const j of jumps) {
    const at = airTime(j.dz), mg = maxGap(j.dz, j.v), pct = (j.gap / mg) * 100;
    worst = Math.max(worst, pct);
    const tag = j.note ? `  (${j.note})` : '';
    console.log(`  ${j.from.padEnd(8)} ${String(j.gap).padStart(4)}u ${String(j.dz).padStart(4)} ` +
      `${at.toFixed(3)}s ${mg.toFixed(1).padStart(7)} ${pct.toFixed(1).padStart(5)}%${tag}`);
    if (pct > 88) fail = j;
  }
  console.log(`  worst required jump: ${worst.toFixed(1)}% of max\n`);
  if (fail) {
    console.error(`FATAL: jump ${fail.from} is ${(fail.gap / maxGap(fail.dz, fail.v) * 100).toFixed(1)}% > 88% cap.`);
    process.exit(1);
  }
  // monotonic hardest-per-stage check (informational)
  const perStage = {};
  for (const j of jumps) if (!j.note) {
    const p = j.gap / maxGap(j.dz, j.v) * 100;
    perStage[j.stage] = Math.max(perStage[j.stage] || 0, p);
  }
  const order = Object.keys(perStage).sort();
  console.log('  hardest jump per stage (should be increasing):',
    order.map(s => `S${s}=${perStage[s].toFixed(1)}%`).join('  '));
  for (let i = 1; i < order.length; i++) {
    if (perStage[order[i]] <= perStage[order[i - 1]]) {
      console.error(`FATAL: stage ${order[i]} is not harder than stage ${order[i - 1]}.`);
      process.exit(1);
    }
  }
}

// ----------------------------------------------------------------------------
// Emit VMF
// ----------------------------------------------------------------------------
function build() {
  const L = layout();
  report(L.jumps);

  // world bounds
  const lastX = L.platforms[L.finishIdx].x1;
  const maxZtop = Math.max(...L.platforms.map(p => p.z));
  const BX0 = -640, BX1 = lastX + 640;
  const BY0 = -1024, BY1 = 1024;
  const BZ0 = -768, BZ1 = maxZtop + 1024;
  const WALL = 64; // shell thickness

  const worldBrushes = [];

  // --- sealed skybox shell (6 overlapping boxes) ---
  worldBrushes.push(box([BX0 - WALL, BY0 - WALL, BZ0 - WALL], [BX1 + WALL, BY1 + WALL, BZ0], MAT.sky)); // floor
  worldBrushes.push(box([BX0 - WALL, BY0 - WALL, BZ1], [BX1 + WALL, BY1 + WALL, BZ1 + WALL], MAT.sky)); // ceiling
  worldBrushes.push(box([BX0 - WALL, BY0 - WALL, BZ0 - WALL], [BX0, BY1 + WALL, BZ1 + WALL], MAT.sky)); // west
  worldBrushes.push(box([BX1, BY0 - WALL, BZ0 - WALL], [BX1 + WALL, BY1 + WALL, BZ1 + WALL], MAT.sky)); // east
  worldBrushes.push(box([BX0 - WALL, BY0 - WALL, BZ0 - WALL], [BX1 + WALL, BY0, BZ1 + WALL], MAT.sky)); // south
  worldBrushes.push(box([BX0 - WALL, BY1, BZ0 - WALL], [BX1 + WALL, BY1 + WALL, BZ1 + WALL], MAT.sky)); // north

  // --- decorative beach ground slab well below the course ---
  const groundTop = BZ0 + 96;
  worldBrushes.push(box([BX0, BY0, BZ0], [BX1, BY1, groundTop], topMat(MAT.ground, MAT.ground), 0.5));

  // --- canyon walls both sides (cliff faces) framing the route ---
  const wallInY = 640, wallThick = 96;
  worldBrushes.push(box([BX0, wallInY, groundTop], [BX1, wallInY + wallThick, BZ1 - 128], topMat(MAT.cliff, MAT.cliff), 0.5));
  worldBrushes.push(box([BX0, -wallInY - wallThick, groundTop], [BX1, -wallInY, BZ1 - 128], topMat(MAT.cliff, MAT.cliff), 0.5));

  // --- course platforms ---
  for (const p of L.platforms) {
    const mn = [p.x0, -p.width / 2, p.z - PLAT_THICK];
    const mx = [p.x1, p.width / 2, p.z];
    worldBrushes.push(box(mn, mx, topMat(p.top, p.side)));
  }

  // ----- entities -----
  const entities = [];
  const startPad = L.platforms[L.startIdx];
  const spawnX = (startPad.x0 + startPad.x1) / 2;
  const spawnZ = startPad.z + 16;

  // info_player_start
  entities.push(pointEnt('info_player_start', { origin: `${spawnX} 0 ${spawnZ}`, angles: '0 0 0' }));

  // lighting: sun + ambient
  entities.push(pointEnt('light_environment', {
    origin: `${spawnX} 0 ${maxZtop + 512}`,
    pitch: '-40', angles: '0 210 0',
    _light: '238 218 181 420', _ambient: '150 170 200 260',
    _lightHDR: '-1 -1 -1 1', _lightscaleHDR: '1', _ambientHDR: '-1 -1 -1 1', _AmbientScaleHDR: '1',
    SunSpreadAngle: '5',
  }));
  entities.push(pointEnt('shadow_control', { origin: `${spawnX} 0 ${maxZtop + 520}`, angles: '80 210 0', color: '128 128 128', distance: '75', disableallshadows: '0' }));

  // helper to make a zone brush entity
  let brushEntId = null;
  function zoneEnt(classname, kv, plat, zLo, zHi) {
    const mn = [plat.x0 - 8, -plat.width / 2 - 8, zLo];
    const mx = [plat.x1 + 8, plat.width / 2 + 8, zHi];
    const solid = box(mn, mx, MAT.trig);
    return brushEnt(classname, kv, solid);
  }

  // teleport destinations (restart_destination targets)
  function teleDest(name, plat) {
    const cx = (plat.x0 + plat.x1) / 2;
    return pointEnt('info_teleport_destination', { targetname: name, origin: `${cx} 0 ${plat.z + 24}`, angles: '0 0 0' });
  }

  // START zone over start pad
  entities.push(teleDest('tele_start', startPad));
  entities.push(zoneEnt('zone_timer_start', {
    track_number: '0', stage_end_zones: '1', checkpoints_required: '0', checkpoints_ordered: '1',
    safe_height: '0', max_velocity: '-1', bhop_enabled: '0', stage_name: 'Tideline',
    restart_destination: 'tele_start',
  }, startPad, startPad.z, startPad.z + 128));

  // STAGE zones (stage 2,3,4) over each stage's first platform
  const stageNames = ['', '', 'Scramble', 'Ledgeworks', 'Summit Spires'];
  L.stageFirstPlat.forEach((platIdx, i) => {
    const stageNum = i + 2; // first entry is stage 2
    const plat = L.platforms[platIdx];
    const tname = `tele_s${stageNum}`;
    entities.push(teleDest(tname, plat));
    entities.push(zoneEnt('zone_timer_stage', {
      stage_number: String(stageNum), track_number: '0', stage_name: stageNames[stageNum],
      checkpoints_required: '0', checkpoints_ordered: '1', limit_ground_speed: '0',
      safe_height: '0', restart_destination: tname,
    }, plat, plat.z, plat.z + 128));
  });

  // END zone over finish pad
  const finish = L.platforms[L.finishIdx];
  entities.push(zoneEnt('zone_timer_end', { track_number: '0' }, finish, finish.z, finish.z + 128));

  // ----- assemble VMF -----
  const world = `world
{
\t"id" "${nid()}"
\t"classname" "worldspawn"
\t"skyname" "sky_cape_hill"
\t"maxpropscreenwidth" "-1"
\t"detailvbsp" "detail.vbsp"
\t"detailmaterial" "detail/detailsprites"
${worldBrushes.join('\n')}
}`;

  const vmf = [versioninfo(), visgroups(), viewsettings(), world, ...entities, cameras(), cordons()].join('\n');
  return vmf;
}

// --- misc VMF sections ---
function versioninfo() {
  return `versioninfo
{
\t"editorversion" "400"
\t"editorbuild" "8000"
\t"mapversion" "1"
\t"formatversion" "100"
\t"prefab" "0"
}`;
}
function visgroups() { return `visgroups\n{\n}`; }
function viewsettings() {
  return `viewsettings
{
\t"bSnapToGrid" "1"
\t"bShowGrid" "1"
\t"bShowLogicalGrid" "0"
\t"nGridSpacing" "16"
\t"bShow3DGrid" "0"
}`;
}
function cameras() { return `cameras\n{\n\t"activecamera" "-1"\n}`; }
function cordons() { return `cordons\n{\n\t"active" "0"\n}`; }

function kvBlock(kv) {
  return Object.entries(kv).map(([k, v]) => `\t"${k}" "${v}"`).join('\n');
}
function pointEnt(classname, kv) {
  const id = nid();
  return `entity
{
\t"id" "${id}"
\t"classname" "${classname}"
${kvBlock(kv)}
\teditor
\t{
\t\t"color" "220 220 0"
\t\t"visgroupshown" "1"
\t\t"visgroupautoshown" "1"
\t}
}`;
}
function brushEnt(classname, kv, solidStr) {
  const id = nid();
  return `entity
{
\t"id" "${id}"
\t"classname" "${classname}"
${kvBlock(kv)}
${solidStr}
\teditor
\t{
\t\t"color" "0 200 200"
\t\t"visgroupshown" "1"
\t\t"visgroupautoshown" "1"
\t}
}`;
}

// ----------------------------------------------------------------------------
const out = build();
const outPath = path.join(__dirname, 'kz_slop_opus48_v1.vmf');
fs.writeFileSync(outPath, out);
console.log(`  wrote ${outPath} (${out.length} bytes, ${_id} ids)`);
