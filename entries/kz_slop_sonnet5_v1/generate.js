'use strict';
/*
 * kz_slop_sonnet5_v1 "Cape Ascent" — VMF generator.
 *
 * Produces kz_slop_sonnet5_v1.vmf from the node table below, which is the
 * single source of truth for both the level geometry AND the per-jump
 * difficulty report printed at the end of this script (see PLAN.md for the
 * physics model this report is checked against).
 *
 * Usage: node generate.js
 *
 * No third-party dependencies (Node stdlib only).
 */
const fs = require('fs');
const path = require('path');
const { boxSides, solidBlock, nextId, resetIds } = require('./vmflib');

const OUT_NAME = 'kz_slop_sonnet5_v1';

// ---------------------------------------------------------------------------
// Movement model (from TOOLCHAIN.md)
// ---------------------------------------------------------------------------
const GRAVITY = 800;
const JUMP_V0 = Math.sqrt(2 * GRAVITY * 57);   // ~302, standing jump takeoff speed
const CROUCH_V0 = Math.sqrt(2 * GRAVITY * 66);  // ~325, crouch-jump takeoff speed
const BBOX_MARGIN = 32; // player hull overhang, both edges

function airTime(dz, v0) {
  v0 = v0 || JUMP_V0;
  const disc = v0 * v0 - 2 * GRAVITY * dz;
  if (disc < 0) return null; // unreachable: apex is below the landing height
  return (v0 + Math.sqrt(disc)) / GRAVITY;
}
function maxGap(v, dz, v0) {
  const t = airTime(dz, v0);
  if (t === null) return null;
  return v * t + BBOX_MARGIN;
}

// ---------------------------------------------------------------------------
// Node table — single source of truth for geometry + physics report.
// sizeX = platform depth (forward/X extent), width = lateral (Y) extent,
// z = top surface height, gap = required horizontal void from previous node's
// departure edge, dy = lateral (turn) offset from previous node's Y center,
// v = design approach speed for the jump INTO this node (250 run / 275
// prestrafe), stage = which stage this node starts (for zone placement +
// texture palette).
// ---------------------------------------------------------------------------
const NODES = [
  { id: 'N0',  sizeX: 384, width: 384, z: 0,   gap: 0,   dy: 0,   v: null, type: 'start', stage: 1, role: 'Spawn / Stage 1 start' },
  { id: 'N1',  sizeX: 224, width: 300, z: 0,   gap: 110, dy: 0,   v: 250,  type: 'jump',  stage: 1 },
  { id: 'N2',  sizeX: 224, width: 280, z: 8,   gap: 130, dy: 40,  v: 250,  type: 'jump',  stage: 1 },
  { id: 'N3',  sizeX: 320, width: 320, z: 24,  gap: 140, dy: -40, v: 250,  type: 'jump',  stage: 2, role: 'Stage 2 start' },
  { id: 'N4',  sizeX: 208, width: 240, z: 48,  gap: 150, dy: 48,  v: 275,  type: 'jump',  stage: 2 },
  { id: 'N5',  sizeX: 208, width: 224, z: 72,  gap: 160, dy: -30, v: 275,  type: 'jump',  stage: 2 },
  { id: 'N6',  sizeX: 320, width: 288, z: 104, gap: 164, dy: 36,  v: 275,  type: 'jump',  stage: 3, role: 'Stage 3 start' },
  { id: 'N7',  sizeX: 192, width: 208, z: 144, gap: 140, dy: -40, v: 275,  type: 'jump',  stage: 3 },
  { id: 'N7b', sizeX: 176, width: 192, z: 202, gap: 32,  dy: 0,   v: null, type: 'mantle', stage: 3, role: 'post-mantle ledge' },
  { id: 'N8',  sizeX: 256, width: 240, z: 252, gap: 146, dy: 30,  v: 275,  type: 'jump',  stage: 4, role: 'Stage 4 start' },
  { id: 'N9',  sizeX: 208, width: 176, z: 268, gap: 150, dy: 0,   v: 275,  type: 'jump',  stage: 4 },
  { id: 'N10', sizeX: 320, width: 160, z: 308, gap: 168, dy: 20,  v: 275,  type: 'jump',  stage: 4, role: 'Finish' },
];

// Resolve cumulative back/front X and Y center for each node.
(function resolveLayout() {
  let cursorBack = 0;
  let yCenter = 0;
  for (let i = 0; i < NODES.length; i++) {
    const n = NODES[i];
    if (i === 0) {
      n.xBack = 0;
      n.xFront = n.sizeX;
      n.yCenter = 0;
    } else {
      const prev = NODES[i - 1];
      n.xBack = prev.xFront + n.gap;
      n.xFront = n.xBack + n.sizeX;
      yCenter += n.dy;
      n.yCenter = yCenter;
    }
    n.xCenter = (n.xBack + n.xFront) / 2;
    n.dzFromPrev = i === 0 ? 0 : n.z - NODES[i - 1].z;
  }
})();

// ---------------------------------------------------------------------------
// Difficulty report — computed straight from the node table, printed to
// stdout AND embedded as a VMF comment-free summary is not possible in VMF,
// so this is the mechanically-checkable artifact SPEC/TOOLCHAIN ask for.
// ---------------------------------------------------------------------------
function printDifficultyReport() {
  console.log('--- kz_slop_sonnet5_v1 per-jump difficulty report ---');
  // A jump belongs to the timed segment of its DEPARTURE node, not its
  // landing node: e.g. the jump that lands you on the Stage-2 start zone is
  // still the last (and hardest) required move of Stage 1's timed split.
  let lastStage = 0;
  for (let i = 1; i < NODES.length; i++) {
    const n = NODES[i];
    const jumpStage = NODES[i - 1].stage;
    if (jumpStage !== lastStage) {
      console.log(`\n[Stage ${jumpStage}]`);
      lastStage = jumpStage;
    }
    if (n.type === 'mantle') {
      const vertPct = (n.dzFromPrev / 66) * 100;
      const horizMax = maxGap(250, n.dzFromPrev, CROUCH_V0);
      console.log(
        `  ${NODES[i-1].id}->${n.id} MANTLE (crouch-jump): vertical ${n.dzFromPrev}u ` +
        `(${vertPct.toFixed(1)}% of 66u crouch ceiling); horizontal ${n.gap}u vs ` +
        `maxGap ${horizMax.toFixed(1)}u (${(n.gap / horizMax * 100).toFixed(1)}%)`
      );
      if (vertPct > 88) throw new Error(`${n.id}: mantle exceeds 88% of vertical ceiling`);
      continue;
    }
    const mg = maxGap(n.v, n.dzFromPrev);
    if (mg === null) throw new Error(`${n.id}: dz too large, apex cannot reach landing height`);
    const pct = (n.gap / mg) * 100;
    const flag = pct > 88 ? '  <<< EXCEEDS 88% CAP' : '';
    console.log(
      `  ${NODES[i-1].id}->${n.id} jump: dist=${n.gap}u dz=${n.dzFromPrev >= 0 ? '+' : ''}${n.dzFromPrev}u ` +
      `v=${n.v} maxGap=${mg.toFixed(1)}u used=${pct.toFixed(1)}%${flag}`
    );
    if (pct > 88) throw new Error(`${n.id}: required jump exceeds 88% of max clearable gap`);
  }
  console.log('\nAll required jumps <= 88% of max. OK.\n');
}

// ---------------------------------------------------------------------------
// Texture palette per stage.
// ---------------------------------------------------------------------------
const PALETTE = {
  1: { top: 'NATURE/ROCKFLOOR002A', wall: 'NATURE/ROCKWALL006A', cliff: 'NATURE/CLIFF01A' },
  2: { top: 'WOOD/EP2_WOODFLOOR01', wall: 'WOOD/WOODBEAM001A',   cliff: 'NATURE/CLIFF02A' },
  3: { top: 'NATURE/ROCKFLOOR003A', wall: 'NATURE/ROCKWALL010B', cliff: 'NATURE/CLIFF03A' },
  4: { top: 'NATURE/ROCKFLOOR006A', wall: 'NATURE/ROCKWALL015A', cliff: 'NATURE/CLIFF04A' },
};
const NODRAW = 'TOOLS/TOOLSNODRAW';
const TRIGGER_TEX = 'TOOLS/TOOLSTRIGGER';
const SKYBOX_TEX = 'TOOLS/TOOLSSKYBOX';

// ---------------------------------------------------------------------------
// Geometry assembly
// ---------------------------------------------------------------------------
resetIds(1); // id 1 reserved for worldspawn

const worldSolids = [];
const entities = [];

const PLATFORM_THICK = 32;

for (const n of NODES) {
  const pal = PALETTE[n.stage];
  const hx = n.sizeX / 2;
  const hy = n.width / 2;
  const hz = PLATFORM_THICK / 2;
  const cx = n.xCenter;
  const cy = n.yCenter;
  const cz = n.z - hz;
  worldSolids.push(solidBlock(boxSides({
    cx, cy, cz, hx, hy, hz,
    materials: { top: pal.top, bottom: NODRAW, all: pal.wall },
  })));
}

// Scaffold support legs under stage-2 platforms (N3..N5), purely decorative.
for (const n of NODES) {
  if (n.stage !== 2) continue;
  const hx = n.sizeX / 2, hy = n.width / 2;
  const legHalf = 8, legHeight = 100;
  const insets = [
    [n.xCenter - hx + 24, n.yCenter - hy + 24],
    [n.xCenter - hx + 24, n.yCenter + hy - 24],
    [n.xCenter + hx - 24, n.yCenter - hy + 24],
    [n.xCenter + hx - 24, n.yCenter + hy - 24],
  ];
  for (const [lx, ly] of insets) {
    worldSolids.push(solidBlock(boxSides({
      cx: lx, cy: ly, cz: n.z - PLATFORM_THICK - legHeight / 2,
      hx: legHalf, hy: legHalf, hz: legHeight / 2,
      materials: { all: 'WOOD/WOODBEAM002A' },
    })));
  }
}

// Summit beacon pillar at the finish (N10).
{
  const n10 = NODES[NODES.length - 1];
  worldSolids.push(solidBlock(boxSides({
    cx: n10.xCenter, cy: n10.yCenter, cz: n10.z + 90,
    hx: 20, hy: 20, hz: 90,
    materials: { all: 'NATURE/ROCKWALL015A', top: 'NATURE/ROCKWALL015A' },
  })));
  entities.push(
`entity
{
\t"id" "${nextId()}"
\t"classname" "light"
\t"origin" "${n10.xCenter} ${n10.yCenter} ${n10.z + 190}"
\t"_light" "255 200 120 400"
\t"_constant_attn" "0"
\t"_linear_attn" "0"
\t"_quadratic_attn" "1"
\t"_fifty_percent_distance" "256"
}`);
}

// Decorative cliff walls running the length of the course, well outside the
// jump corridor (every node's |yCenter| + width/2 stays under ~260, so +-620
// leaves well over 150u of clearance on both sides, per PLAN.md).
function buildCliffWalls() {
  const segments = 12;
  const xStart = -300, xEnd = 4700;
  const segLen = (xEnd - xStart) / segments;
  for (let side = -1; side <= 1; side += 2) {
    for (let i = 0; i < segments; i++) {
      const segCenterX = xStart + segLen * (i + 0.5);
      // Follow the general height gain of the path for this X position.
      const t = Math.max(0, Math.min(1, (segCenterX - 0) / 4530));
      const topZ = -400 + t * 900 + 500; // rises with the ascent, generous headroom
      const baseZ = -400;
      const yOff = side * (660 + (i % 2 === 0 ? 0 : 40));
      const yaw = side * (6 + (i % 3) * 3);
      const stageForSeg = Math.max(1, Math.min(4, Math.ceil((i + 1) / (segments / 4))));
      const pal = PALETTE[stageForSeg];
      worldSolids.push(solidBlock(boxSides({
        cx: segCenterX, cy: yOff, cz: (baseZ + topZ) / 2,
        hx: segLen / 2 + 40, hy: 120, hz: (topZ - baseZ) / 2,
        yaw,
        materials: { all: pal.cliff },
      })));
    }
  }
}
buildCliffWalls();

// Skybox shell enclosing the whole playable volume (per PLAN.md bounds).
function buildSkyboxShell() {
  const xmin = -256, xmax = 5120, ymin = -1024, ymax = 1024, zmin = -640, zmax = 1200;
  const t = 64;
  const mat = { all: SKYBOX_TEX };
  const midX = (xmin + xmax) / 2, midY = (ymin + ymax) / 2, midZ = (zmin + zmax) / 2;
  const hxAll = (xmax - xmin) / 2, hyAll = (ymax - ymin) / 2, hzAll = (zmax - zmin) / 2;
  // floor / ceiling
  worldSolids.push(solidBlock(boxSides({ cx: midX, cy: midY, cz: zmin - t / 2, hx: hxAll + t, hy: hyAll + t, hz: t / 2, materials: mat })));
  worldSolids.push(solidBlock(boxSides({ cx: midX, cy: midY, cz: zmax + t / 2, hx: hxAll + t, hy: hyAll + t, hz: t / 2, materials: mat })));
  // walls
  worldSolids.push(solidBlock(boxSides({ cx: xmin - t / 2, cy: midY, cz: midZ, hx: t / 2, hy: hyAll + t, hz: hzAll + t, materials: mat })));
  worldSolids.push(solidBlock(boxSides({ cx: xmax + t / 2, cy: midY, cz: midZ, hx: t / 2, hy: hyAll + t, hz: hzAll + t, materials: mat })));
  worldSolids.push(solidBlock(boxSides({ cx: midX, cy: ymin - t / 2, cz: midZ, hx: hxAll + t, hy: t / 2, hz: hzAll + t, materials: mat })));
  worldSolids.push(solidBlock(boxSides({ cx: midX, cy: ymax + t / 2, cz: midZ, hx: hxAll + t, hy: t / 2, hz: hzAll + t, materials: mat })));
  return { xmin, xmax, ymin, ymax, zmin, zmax };
}
const shellBounds = buildSkyboxShell();

// ---------------------------------------------------------------------------
// Entities: player start, zones, teleport destinations, safety net, sun.
// ---------------------------------------------------------------------------
function kv(obj) {
  return Object.entries(obj).map(([k, v]) => `\t"${k}" "${v}"`).join('\n');
}
function pointEntity(classname, extra) {
  return `entity\n{\n\t"id" "${nextId()}"\n\t"classname" "${classname}"\n${kv(extra)}\n}`;
}
function brushEntity(classname, extraKV, box) {
  const sides = boxSides({ ...box, materials: { all: TRIGGER_TEX }, vertsPlus: true });
  return `entity\n{\n\t"id" "${nextId()}"\n\t"classname" "${classname}"\n${kv(extraKV)}\n${solidBlock(sides)}\n}`;
}

function zoneBoxForNode(n) {
  // Trigger volume covering the node's full footprint, from just below the
  // top surface up through comfortable jump-arc height.
  return {
    cx: n.xCenter, cy: n.yCenter, cz: n.z + 62,
    hx: n.sizeX / 2, hy: n.width / 2, hz: 66,
  };
}

const N0 = NODES[0];
const N3 = NODES.find(n => n.id === 'N3');
const N6 = NODES.find(n => n.id === 'N6');
const N8 = NODES.find(n => n.id === 'N8');
const N10 = NODES.find(n => n.id === 'N10');

// Teleport destinations (restart destinations), one per stage start.
entities.push(pointEntity('info_teleport_destination', {
  targetname: 'dest_stage1', origin: `${N0.xCenter} ${N0.yCenter} ${N0.z + 16}`, angles: '0 0 0',
}));
entities.push(pointEntity('info_teleport_destination', {
  targetname: 'dest_stage2', origin: `${N3.xCenter} ${N3.yCenter} ${N3.z + 16}`, angles: '0 0 0',
}));
entities.push(pointEntity('info_teleport_destination', {
  targetname: 'dest_stage3', origin: `${N6.xCenter} ${N6.yCenter} ${N6.z + 16}`, angles: '0 0 0',
}));
entities.push(pointEntity('info_teleport_destination', {
  targetname: 'dest_stage4', origin: `${N8.xCenter} ${N8.yCenter} ${N8.z + 16}`, angles: '0 0 0',
}));

// info_player_start on N0, facing +X (down the course).
entities.push(pointEntity('info_player_start', {
  origin: `${N0.xCenter} ${N0.yCenter} ${N0.z + 16}`,
  angles: '0 0 0',
}));

// Zone entities.
entities.push(brushEntity('zone_timer_start', {
  targetname: 'zone_start',
  stage_name: 'Foothold',
  stage_end_zones: '1',
  checkpoints_required: '1',
  checkpoints_ordered: '1',
  safe_height: '0',
  max_velocity: '-1',
  bhop_enabled: '0',
  restart_destination: 'dest_stage1',
}, zoneBoxForNode(N0)));

entities.push(brushEntity('zone_timer_stage', {
  targetname: 'zone_stage2',
  stage_name: 'Switchback',
  stage_number: '2',
  checkpoints_required: '1',
  checkpoints_ordered: '1',
  limit_ground_speed: '1',
  safe_height: '0',
  restart_destination: 'dest_stage2',
}, zoneBoxForNode(N3)));

entities.push(brushEntity('zone_timer_stage', {
  targetname: 'zone_stage3',
  stage_name: 'Rockslide',
  stage_number: '3',
  checkpoints_required: '1',
  checkpoints_ordered: '1',
  limit_ground_speed: '1',
  safe_height: '0',
  restart_destination: 'dest_stage3',
}, zoneBoxForNode(N6)));

entities.push(brushEntity('zone_timer_stage', {
  targetname: 'zone_stage4',
  stage_name: 'Summit Ridge',
  stage_number: '4',
  checkpoints_required: '1',
  checkpoints_ordered: '1',
  limit_ground_speed: '1',
  safe_height: '0',
  restart_destination: 'dest_stage4',
}, zoneBoxForNode(N8)));

entities.push(brushEntity('zone_timer_end', {
  targetname: 'zone_end',
}, zoneBoxForNode(N10)));

// Safety net: catch anyone who falls off and return them to spawn.
{
  const midX = (shellBounds.xmin + shellBounds.xmax) / 2;
  const midY = (shellBounds.ymin + shellBounds.ymax) / 2;
  const hx = (shellBounds.xmax - shellBounds.xmin) / 2 - 40;
  const hy = (shellBounds.ymax - shellBounds.ymin) / 2 - 40;
  entities.push(brushEntity('trigger_teleport', {
    targetname: 'safety_net',
    target: 'dest_stage1',
    spawnflags: '1',
  }, { cx: midX, cy: midY, cz: shellBounds.zmin + 100, hx, hy, hz: 40 }));
}

// Sun.
entities.push(pointEntity('light_environment', {
  origin: '0 0 400',
  angles: '0 130 0',
  pitch: '-55',
  _light: '255 240 210 300',
  _ambient: '180 190 210 40',
  SunSpreadAngle: '5',
}));

// ---------------------------------------------------------------------------
// Write VMF
// ---------------------------------------------------------------------------
const vmf = `versioninfo
{
\t"editorversion" "400"
\t"editorbuild" "8000"
\t"mapversion" "1"
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
\t"bShowLogicalGrid" "0"
\t"nGridSpacing" "64"
\t"bShow3DGrid" "0"
}
world
{
\t"id" "1"
\t"mapversion" "1"
\t"classname" "worldspawn"
\t"detailmaterial" "detail/detailsprites"
\t"detailvbsp" "detail.vbsp"
\t"maxpropscreenwidth" "-1"
\t"skyname" "sky_cape_hill"
${worldSolids.join('\n')}
}
${entities.join('\n')}
cameras
{
\t"activecamera" "-1"
}
cordon
{
\t"mins" "(-1024 -1024 -1024)"
\t"maxs" "(1024 1024 1024)"
\t"active" "0"
}
`;

printDifficultyReport();

const outPath = path.join(__dirname, `${OUT_NAME}.vmf`);
fs.writeFileSync(outPath, vmf);
console.log(`Wrote ${outPath} (${vmf.length} bytes, ${worldSolids.length} world solids, ${entities.length} entities)`);
