#!/usr/bin/env node
// kz_slopfest frozen entry validator — spec generation 5.
// Usage: node scripts/validate_entry.js entries/kz_slop_<model>_v5
// Checks route.json + zone JSON against SPEC.md's machine-checkable gates.
// Frozen with the spec: entries must not modify this file (RULES.md #2).

"use strict";
const fs = require("fs");
const path = require("path");

const SPEC_GEN = 5;
const MIN_CLIMB = 3072;
const FOOTPRINT_RATIO = 1.5;
const MIN_CHECKPOINTS = 6;
const MIN_JUMPS_TOTAL = 36;
const MIN_JUMPS_PER_LEG = 6;
const MAX_FRACTION = 0.88;
const SPIKE = 0.80, COOL = 0.65;
const PEAK_LO = 0.50, PEAK_HI = 0.75;
const MIN_PROPS_PER_LEG = 8;
const PROP_CLEARANCE = 64;
const MIN_FOOTPRINTS_PER_LEG = 2;
const MIN_HEADING_CHANGES = 2;
const MIN_CONSTRUCTS = 3;
const ALLOWED_SPEEDS = [250, 275, 380];
const CONSTRUCT_MENU = ["ladder", "crouch tunnel", "drop-jump", "uphill hop chain",
  "tightrope", "rail walk", "corner", "180", "pillar weave", "wall gap"];

// --- movement model (TOOLCHAIN.md) ---
const G = 800, APEX = 57, APEX_CROUCH = 66, BBOX = 32;
const RISE_CAP = 48, RISE_CAP_CROUCH = 56; // SPEC req 4: rises need margin too
function maxGap(dz, v, apex) {
  const vt = Math.sqrt(2 * G * apex);
  const disc = vt * vt - 2 * G * dz;
  if (disc <= 0) return NaN; // landing above jump apex: not clearable
  const airTime = (vt + Math.sqrt(disc)) / G;
  return v * airTime + BBOX;
}

const failures = [], warnings = [];
const fail = (m) => failures.push(m);
const warn = (m) => warnings.push(m);

// --- load ---
const entryDir = process.argv[2];
if (!entryDir) { console.error("usage: node scripts/validate_entry.js <entry-dir>"); process.exit(2); }
const base = path.basename(entryDir.replace(/[\\/]+$/, ""));
const nameRe = new RegExp(`^kz_slop_[a-z0-9]+_v${SPEC_GEN}$`);
if (!nameRe.test(base)) fail(`entry folder '${base}' does not match kz_slop_<model>_v${SPEC_GEN} (lowercase, no dots)`);

function loadJson(p, label) {
  try { return JSON.parse(fs.readFileSync(p, "utf8")); }
  catch (e) { fail(`${label}: cannot read/parse ${p}: ${e.message}`); return null; }
}
const route = loadJson(path.join(entryDir, "route.json"), "route.json");
const zones = loadJson(path.join(entryDir, `${base}.json`), "zone JSON");
if (!route) finish();

if (route.map !== base) fail(`route.json map '${route.map}' != folder '${base}'`);
const jumps = route.jumps || [], cps = route.checkpoints || [], props = route.props || [];

// --- climb + footprint (req 2) ---
if (!route.start || !route.end) fail("route.json missing start/end");
else {
  const climb = route.end.pos[2] - route.start.pos[2];
  if (climb < MIN_CLIMB) fail(`net climb ${climb.toFixed(0)}u < ${MIN_CLIMB}u (req 2)`);
  const xs = [], ys = [];
  for (const j of jumps) { xs.push(j.from[0], j.to[0]); ys.push(j.from[1], j.to[1]); }
  if (xs.length) {
    const extent = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
    if (extent > FOOTPRINT_RATIO * climb)
      fail(`horizontal extent ${extent.toFixed(0)}u > ${FOOTPRINT_RATIO}x net climb ${climb.toFixed(0)}u (req 2: build a tower, not a sprawl)`);
  }
}
if (cps.length < MIN_CHECKPOINTS) fail(`${cps.length} checkpoints < ${MIN_CHECKPOINTS} (req 2)`);

// --- jumps: counts, physics, speeds (req 4, 8) ---
if (jumps.length < MIN_JUMPS_TOTAL) fail(`${jumps.length} required jumps < ${MIN_JUMPS_TOTAL} (req 8)`);
const perLeg = new Map();
for (const j of jumps) {
  perLeg.set(j.leg, (perLeg.get(j.leg) || 0) + 1);
  if (!ALLOWED_SPEEDS.includes(j.assumedSpeed))
    fail(`jump ${j.index}: assumedSpeed ${j.assumedSpeed} not one of ${ALLOWED_SPEEDS.join("/")}`);
  if (j.assumedSpeed === 380) warn(`jump ${j.index} assumes bhop-cap 380 u/s — legal only on optional routes; a required jump at 380 fails req 4`);
  const dz = j.dz !== undefined ? j.dz : j.to[2] - j.from[2];
  const dx = j.to[0] - j.from[0], dy = j.to[1] - j.from[1];
  const gap = j.gap !== undefined ? j.gap : Math.hypot(dx, dy);
  const riseCap = j.crouch ? RISE_CAP_CROUCH : RISE_CAP;
  if (dz > riseCap) {
    fail(`jump ${j.index}: rise ${dz}u > ${riseCap}u cap${j.crouch ? " (crouch)" : " (declare crouch for 49-56u, req 4)"} — gen 4 shipped two over-height jumps this way`);
    continue;
  }
  if (j.crouch) warn(`jump ${j.index} is a declared crouch-jump — precision move, keep surrounding jumps easy`);
  const budget = maxGap(dz, j.assumedSpeed, j.crouch ? APEX_CROUCH : APEX);
  if (isNaN(budget)) { fail(`jump ${j.index}: dz ${dz} exceeds jump apex — impossible (req 4)`); continue; }
  const frac = gap / budget;
  if (frac > MAX_FRACTION) fail(`jump ${j.index}: ${(frac * 100).toFixed(1)}% of budget > ${MAX_FRACTION * 100}% (gap ${gap.toFixed(0)}, dz ${dz}, v ${j.assumedSpeed})`);
  if (j.fraction !== undefined && Math.abs(j.fraction - frac) > 0.02)
    fail(`jump ${j.index}: declared fraction ${j.fraction} drifts from recomputed ${frac.toFixed(3)} — manifest and physics disagree`);
  j._frac = frac;
}
for (let leg = 1; leg <= cps.length + 1; leg++) {
  const n = perLeg.get(leg) || 0;
  if (n < MIN_JUMPS_PER_LEG) fail(`leg ${leg}: ${n} required jumps < ${MIN_JUMPS_PER_LEG} (req 8)`);
}

// --- difficulty curve (req 3) ---
const fr = jumps.map(j => j._frac).filter(f => f !== undefined);
if (fr.length >= MIN_JUMPS_TOTAL) {
  const n = fr.length;
  const mean = a => a.reduce((s, x) => s + x, 0) / a.length;
  const openMean = mean(fr.slice(0, Math.floor(n / 4)));
  const coreMean = mean(fr.slice(Math.floor(n / 2), Math.floor(n * 3 / 4)));
  if (coreMean <= openMean)
    fail(`difficulty trend: 50-75% span mean ${(coreMean * 100).toFixed(1)}% not above opening quarter ${(openMean * 100).toFixed(1)}% (req 3: rising trend)`);
  const peakIdx = fr.indexOf(Math.max(...fr));
  const pos = peakIdx / (n - 1);
  if (pos < PEAK_LO || pos > PEAK_HI)
    fail(`hardest jump at ${(pos * 100).toFixed(0)}% of sequence — must sit in ${PEAK_LO * 100}-${PEAK_HI * 100}% (req 3)`);
  fr.forEach((f, i) => {
    if (f >= SPIKE && i < n - 1) {
      const next3 = fr.slice(i + 1, i + 4);
      if (next3.filter(x => x <= COOL).length < Math.min(2, next3.length))
        fail(`jump ${i + 1} spikes to ${(f * 100).toFixed(0)}% with no cool-off (need 2 of next 3 jumps <= ${COOL * 100}%) (req 3)`);
    }
  });
}

// --- route shape (req 10) ---
const headings = jumps.map(j => j.heading).filter(Boolean);
let changes = 0; const seen = [];
for (let i = 1; i < headings.length; i++) if (headings[i] !== headings[i - 1]) { changes++; seen.push(headings[i - 1] + "->" + headings[i]); }
if (changes < MIN_HEADING_CHANGES) fail(`heading changes ${changes} < ${MIN_HEADING_CHANGES} (req 10)`);
const OPP = { N: "S", S: "N", E: "W", W: "E" };
if (!headings.some((h, i) => headings.slice(i + 1).includes(OPP[h])))
  fail("no plan-view reversal (switchback) found in heading sequence (req 10)");
const legFootprints = new Map();
for (const j of jumps) {
  if (!j.landing) continue;
  const k = j.landing.join("x");
  if (!legFootprints.has(j.leg)) legFootprints.set(j.leg, new Set());
  legFootprints.get(j.leg).add(k);
}
for (const [leg, set] of legFootprints)
  if (set.size < MIN_FOOTPRINTS_PER_LEG) fail(`leg ${leg}: ${set.size} distinct landing footprints < ${MIN_FOOTPRINTS_PER_LEG} (req 10)`);

// --- props: counts + clearance (req 11) ---
const propsPerLeg = new Map();
function distToSegment2D(p, a, b) {
  const abx = b[0] - a[0], aby = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * abx + (p[1] - a[1]) * aby) / (abx * abx + aby * aby || 1)));
  return Math.hypot(p[0] - (a[0] + t * abx), p[1] - (a[1] + t * aby));
}
let legless = 0;
for (const p of props) {
  for (const j of jumps) {
    const d = distToSegment2D(p.pos, j.from, j.to);
    const zLo = Math.min(j.from[2], j.to[2]) - 16, zHi = Math.max(j.from[2], j.to[2]) + APEX + 72;
    if (d < PROP_CLEARANCE && p.pos[2] > zLo - 128 && p.pos[2] < zHi)
      fail(`prop ${p.model} at (${p.pos.join(",")}) is ${d.toFixed(0)}u from jump ${j.index} corridor (< ${PROP_CLEARANCE}u, req 11) — gen 4 shipped an impossible course this way`);
  }
  if (p.leg === undefined) legless++;
  else propsPerLeg.set(p.leg, (propsPerLeg.get(p.leg) || 0) + 1);
}
if (legless) fail(`${legless} props missing 'leg' in route.json — declare which leg each prop dresses (req 11)`);
else for (let leg = 1; leg <= cps.length + 1; leg++) {
  const n = propsPerLeg.get(leg) || 0;
  if (n < MIN_PROPS_PER_LEG) fail(`leg ${leg}: ${n} props < ${MIN_PROPS_PER_LEG} (req 11)`);
}

// --- constructs (req 12) ---
const constructs = (route.constructs || []).map(c => String(c).toLowerCase());
const matched = constructs.filter(c => CONSTRUCT_MENU.some(m => c.includes(m)));
if (matched.length < MIN_CONSTRUCTS)
  fail(`${matched.length} recognized constructs < ${MIN_CONSTRUCTS} (req 12; menu: ${CONSTRUCT_MENU.join(", ")})`);

// --- zone JSON topology (req 5) ---
if (zones) {
  const main = zones.tracks && zones.tracks.main;
  if (!main) fail("zone JSON: no tracks.main");
  else {
    const segs = main.zones && main.zones.segments || [];
    if (segs.length !== 1) fail(`zone JSON: ${segs.length} segments — gen ${SPEC_GEN} requires exactly 1 (single-track checkpoint topology, req 5)`);
    else {
      const zcps = segs[0].checkpoints || [];
      if (zcps.length < MIN_CHECKPOINTS + 1) fail(`zone JSON: ${zcps.length} checkpoints incl. start < ${MIN_CHECKPOINTS + 1} (req 5)`);
      if (zcps.length && cps.length && zcps.length !== cps.length + 1)
        warn(`zone JSON has ${zcps.length} checkpoints, route.json declares ${cps.length} (+1 start expected)`);
      if (!segs[0].checkpointsOrdered) fail("zone JSON: checkpointsOrdered must be true (req 5)");
      const start = zcps[0] && zcps[0].regions && zcps[0].regions[0];
      if (!start || !start.teleDestPos) fail("zone JSON: start region missing teleDestPos (req 5)");
    }
    if (!(main.zones && main.zones.end)) fail("zone JSON: no end zone (req 5)");
  }
}

finish();
function finish() {
  for (const w of warnings) console.log("WARN  " + w);
  if (failures.length) {
    for (const f of failures) console.log("FAIL  " + f);
    console.log(`\n${failures.length} failure(s) — entry does not pass the validator gate.`);
    process.exit(1);
  }
  console.log("PASS  all machine-checkable gates (compile, load, and witnessed-timer gates still apply)");
  process.exit(0);
}
