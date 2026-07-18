'use strict';
// Minimal VMF-writing helpers, self-checking plane winding against the
// verified rule: for plane points (p0,p1,p2) written in that order, the
// outward face normal equals normalize(cross(p0-p1, p2-p1)).
// (Verified against a real vbsp-compiled dispinfo example pulled from a
// public Source-engine test fixture: bottom face z=const plane
// "(32 480 32) (32 32 32) (480 32 32)" has outward normal -Z under this
// exact formula; top face at z=const with points listed the "mirrored" way
// gives +Z. Cross-checked by hand before trusting it here.)

function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
function cross(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}
function dot(a, b) { return a[0]*b[0] + a[1]*b[1] + a[2]*b[2]; }
function len(a) { return Math.sqrt(dot(a,a)); }

function fmt(n) {
  // Compact numeric formatting for VMF coordinates.
  let r = Math.round(n * 1000) / 1000;
  if (Object.is(r, -0)) r = 0;
  return r.toString();
}
function pt(p) { return `(${fmt(p[0])} ${fmt(p[1])} ${fmt(p[2])})`; }

function rotateXY(x, y, yawDeg) {
  const r = yawDeg * Math.PI / 180;
  const c = Math.cos(r), s = Math.sin(r);
  return [x * c - y * s, x * s + y * c];
}

// Build the 4 corners (world space) + intended outward normal for one face
// of a box centered at (cx,cy,cz) with half-extents (hx,hy,hz), yawed about Z.
// axis: 'x','y','z' ; sign: +1 or -1 (which face along that local axis)
function faceCorners(cx, cy, cz, hx, hy, hz, yawDeg, axis, sign) {
  const corner = (sx, sy, sz) => {
    const lx = sx * hx, ly = sy * hy, lz = sz * hz;
    const [wx, wy] = rotateXY(lx, ly, yawDeg);
    return [cx + wx, cy + wy, cz + lz];
  };
  let loop; // list of (sx,sy,sz) around the face in a consistent loop
  let localNormal;
  if (axis === 'z') {
    loop = [[-1,-1,sign],[-1,1,sign],[1,1,sign],[1,-1,sign]];
    localNormal = [0, 0, sign];
  } else if (axis === 'x') {
    loop = [[sign,-1,-1],[sign,-1,1],[sign,1,1],[sign,1,-1]];
    localNormal = [sign, 0, 0];
  } else { // y
    loop = [[-1,sign,-1],[-1,sign,1],[1,sign,1],[1,sign,-1]];
    localNormal = [0, sign, 0];
  }
  const [nx, ny] = rotateXY(localNormal[0], localNormal[1], yawDeg);
  const normal = [nx, ny, localNormal[2]];
  const corners = loop.map(([sx,sy,sz]) => corner(sx,sy,sz));
  return { corners, normal };
}

// Verify + fix winding for a 4-point loop so that cross(p0-p1,p2-p1) matches
// the outward normal direction (Source's clockwise-from-outside convention).
function orderForWinding(corners, normal) {
  const [p0, p1, p2] = corners;
  const check = cross(sub(p0, p1), sub(p2, p1));
  const d = dot(check, normal);
  if (d > 0) return corners.slice();
  if (d < 0) return corners.slice().reverse();
  throw new Error('degenerate face, cannot determine winding');
}

let uid = 0;
function nextId() { return ++uid; }
function resetIds(start) { uid = start || 0; }

// texAxes: given which local axis is fixed for this face, return default
// uaxis/vaxis strings (world-aligned, not rotated with yaw -- fine for
// decorative brushes, exact for axis-aligned ones).
function texAxes(axis, scale) {
  scale = scale || 0.25;
  if (axis === 'z') return [`[1 0 0 0] ${scale}`, `[0 -1 0 0] ${scale}`];
  if (axis === 'x') return [`[0 1 0 0] ${scale}`, `[0 0 -1 0] ${scale}`];
  return [`[1 0 0 0] ${scale}`, `[0 0 -1 0] ${scale}`]; // y
}

// Build one box brush's `side` blocks (as text) for a solid.
// faceMaterials: { top, bottom, xpos, xneg, ypos, yneg } (fallback to `all`)
function boxSides(opts) {
  const { cx, cy, cz, hx, hy, hz, yaw = 0, materials, vertsPlus = false, texScale } = opts;
  const faces = [
    { axis: 'z', sign: 1, mat: materials.top || materials.all },
    { axis: 'z', sign: -1, mat: materials.bottom || materials.all },
    { axis: 'x', sign: 1, mat: materials.xpos || materials.all },
    { axis: 'x', sign: -1, mat: materials.xneg || materials.all },
    { axis: 'y', sign: 1, mat: materials.ypos || materials.all },
    { axis: 'y', sign: -1, mat: materials.yneg || materials.all },
  ];
  const sideTexts = [];
  for (const f of faces) {
    const { corners, normal } = faceCorners(cx, cy, cz, hx, hy, hz, yaw, f.axis, f.sign);
    const ordered = orderForWinding(corners, normal);
    // self-check
    const check = cross(sub(ordered[0], ordered[1]), sub(ordered[2], ordered[1]));
    const nn = len(normal) > 0 ? normal.map(v => v/len(normal)) : normal;
    const cn = len(check) > 0 ? check.map(v => v/len(check)) : check;
    const d = dot(nn, cn);
    if (d < 0.999) throw new Error(`plane winding self-check failed (dot=${d})`);
    const [uaxis, vaxis] = texAxes(f.axis, texScale);
    const id = nextId();
    let vp = '';
    if (vertsPlus) {
      const vlines = ordered.map(p => `\t\t\t"v" "${fmt(p[0])} ${fmt(p[1])} ${fmt(p[2])}"`).join('\n');
      vp = `\n\t\tvertices_plus\n\t\t{\n${vlines}\n\t\t}`;
    }
    sideTexts.push(
`\tside
\t{
\t\t"id" "${id}"
\t\t"plane" "${pt(ordered[0])} ${pt(ordered[1])} ${pt(ordered[2])}"
\t\t"material" "${f.mat}"
\t\t"uaxis" "${uaxis}"
\t\t"vaxis" "${vaxis}"
\t\t"rotation" "0"
\t\t"lightmapscale" "16"
\t\t"smoothing_groups" "0"${vp}
\t}`);
  }
  return sideTexts;
}

function solidBlock(sideTexts) {
  const id = nextId();
  return `solid\n{\n\t"id" "${id}"\n${sideTexts.join('\n')}\n}`;
}

module.exports = { boxSides, solidBlock, nextId, resetIds, fmt };
