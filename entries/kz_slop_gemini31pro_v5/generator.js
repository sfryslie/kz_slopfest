const fs = require('fs');

const MAP_NAME = 'kz_slop_gemini31pro_v5';

let entityIdCounter = 1;
let solidIdCounter = 1;

function nextId() { return entityIdCounter++; }
function nextSolidId() { return solidIdCounter++; }

// Helper to create a solid string
function createSolid(x1, y1, z1, x2, y2, z2, matTop, matOther, isZone = false) {
    const id = nextSolidId();
    const fTop = `(${x1} ${y2} ${z2}) (${x2} ${y2} ${z2}) (${x2} ${y1} ${z2})`;
    const vpTop = isZone ? `vertices_plus { "v" "${x1} ${y2} ${z2}" "v" "${x2} ${y2} ${z2}" "v" "${x2} ${y1} ${z2}" "v" "${x1} ${y1} ${z2}" }` : "";
    const fBot = `(${x1} ${y1} ${z1}) (${x2} ${y1} ${z1}) (${x2} ${y2} ${z1})`;
    const vpBot = isZone ? `vertices_plus { "v" "${x1} ${y1} ${z1}" "v" "${x2} ${y1} ${z1}" "v" "${x2} ${y2} ${z1}" "v" "${x1} ${y2} ${z1}" }` : "";
    const fNorth = `(${x1} ${y2} ${z1}) (${x2} ${y2} ${z1}) (${x2} ${y2} ${z2})`;
    const vpNorth = isZone ? `vertices_plus { "v" "${x1} ${y2} ${z1}" "v" "${x2} ${y2} ${z1}" "v" "${x2} ${y2} ${z2}" "v" "${x1} ${y2} ${z2}" }` : "";
    const fSouth = `(${x1} ${y1} ${z2}) (${x2} ${y1} ${z2}) (${x1} ${y1} ${z1})`;
    const vpSouth = isZone ? `vertices_plus { "v" "${x1} ${y1} ${z2}" "v" "${x2} ${y1} ${z2}" "v" "${x2} ${y1} ${z1}" "v" "${x1} ${y1} ${z1}" }` : "";
    const fEast = `(${x2} ${y1} ${z2}) (${x2} ${y2} ${z2}) (${x2} ${y2} ${z1})`;
    const vpEast = isZone ? `vertices_plus { "v" "${x2} ${y1} ${z2}" "v" "${x2} ${y2} ${z2}" "v" "${x2} ${y2} ${z1}" "v" "${x2} ${y1} ${z1}" }` : "";
    const fWest = `(${x1} ${y1} ${z1}) (${x1} ${y2} ${z1}) (${x1} ${y2} ${z2})`;
    const vpWest = isZone ? `vertices_plus { "v" "${x1} ${y1} ${z1}" "v" "${x1} ${y2} ${z1}" "v" "${x1} ${y2} ${z2}" "v" "${x1} ${y1} ${z2}" }` : "";

    return `solid
    {
        "id" "${id}"
        side { "id" "${nextSolidId()}" "plane" "${fTop}" "material" "${matTop}" "uaxis" "[1 0 0 0] 0.25" "vaxis" "[0 -1 0 0] 0.25" "rotation" "0" "lightmapscale" "16" "smoothing_groups" "0" ${vpTop} }
        side { "id" "${nextSolidId()}" "plane" "${fBot}" "material" "${matOther}" "uaxis" "[1 0 0 0] 0.25" "vaxis" "[0 -1 0 0] 0.25" "rotation" "0" "lightmapscale" "16" "smoothing_groups" "0" ${vpBot} }
        side { "id" "${nextSolidId()}" "plane" "${fNorth}" "material" "${matOther}" "uaxis" "[1 0 0 0] 0.25" "vaxis" "[0 0 -1 0] 0.25" "rotation" "0" "lightmapscale" "16" "smoothing_groups" "0" ${vpNorth} }
        side { "id" "${nextSolidId()}" "plane" "${fSouth}" "material" "${matOther}" "uaxis" "[1 0 0 0] 0.25" "vaxis" "[0 0 -1 0] 0.25" "rotation" "0" "lightmapscale" "16" "smoothing_groups" "0" ${vpSouth} }
        side { "id" "${nextSolidId()}" "plane" "${fEast}" "material" "${matOther}" "uaxis" "[0 1 0 0] 0.25" "vaxis" "[0 0 -1 0] 0.25" "rotation" "0" "lightmapscale" "16" "smoothing_groups" "0" ${vpEast} }
        side { "id" "${nextSolidId()}" "plane" "${fWest}" "material" "${matOther}" "uaxis" "[0 1 0 0] 0.25" "vaxis" "[0 0 -1 0] 0.25" "rotation" "0" "lightmapscale" "16" "smoothing_groups" "0" ${vpWest} }
    }`;
}

function makeSkybox(bounds) {
    const mat = "tools/toolsskybox";
    const t = 32;
    let solids = [];
    solids.push(createSolid(bounds.minX-t, bounds.minY-t, bounds.minZ-t, bounds.maxX+t, bounds.maxY+t, bounds.minZ, mat, mat));
    solids.push(createSolid(bounds.minX-t, bounds.minY-t, bounds.maxZ, bounds.maxX+t, bounds.maxY+t, bounds.maxZ+t, mat, mat));
    solids.push(createSolid(bounds.minX-t, bounds.maxY, bounds.minZ, bounds.maxX+t, bounds.maxY+t, bounds.maxZ, mat, mat));
    solids.push(createSolid(bounds.minX-t, bounds.minY-t, bounds.minZ, bounds.maxX+t, bounds.minY, bounds.maxZ, mat, mat));
    solids.push(createSolid(bounds.maxX, bounds.minY, bounds.minZ, bounds.maxX+t, bounds.maxY, bounds.maxZ, mat, mat));
    solids.push(createSolid(bounds.minX-t, bounds.minY, bounds.minZ, bounds.minX, bounds.maxY, bounds.maxZ, mat, mat));
    return solids.join('\n');
}

function getAirTime(dz, isCrouch = false) {
    const vTakeoff = isCrouch ? 325 : 302;
    const discriminant = vTakeoff * vTakeoff - 2 * 800 * dz;
    if (discriminant < 0) return 0;
    return (vTakeoff + Math.sqrt(discriminant)) / 800;
}
function getMaxGap(dz, speed = 250, isCrouch = false) {
    return speed * getAirTime(dz, isCrouch) + 32;
}

const totalLegs = 7;
const jumpsPerLeg = 12;
const totalJumps = totalLegs * jumpsPerLeg;
const startZ = 0;

let platforms = [];
let jumpData = [];
let propsData = [];
let routeJson = {
    map: MAP_NAME,
    start: { pos: [0, 0, 16], yaw: 0 },
    end: {},
    checkpoints: [],
    jumps: jumpData,
    props: propsData,
    constructs: ["corner jump", "drop-jump", "ladder section"]
};

let currentX = 0;
let currentY = 0;
let currentZ = startZ;
let currentDir = 0; 
const dirs = [
    { dx: 0, dy: 1, heading: 'N' },
    { dx: 1, dy: 0, heading: 'E' },
    { dx: 0, dy: -1, heading: 'S' },
    { dx: -1, dy: 0, heading: 'W' }
];

let globalBounds = { minX: -2048 - 128, minY: -2048 - 128, minZ: -128 - 128, maxX: 2048 + 128, maxY: 2048 + 128, maxZ: 4000 + 512 };
platforms.push({ x1: -2048, y1: -2048, z1: -128, x2: 2048, y2: 2048, z2: -64, mat: "concrete/concretefloor002a" });
platforms.push({ x1: -256, y1: -256, z1: -64, x2: 256, y2: 256, z2: 0, mat: "concrete/concretefloor001a" });

function createJump(leg, jumpIndexTotal, jumpIndexInLeg) {
    let fraction = 0.55; 
    let dz = 44;
    let isCrouch = false;
    
    if (jumpIndexTotal >= 20 && jumpIndexTotal < 40) fraction = 0.65;
    if (jumpIndexTotal >= 40 && jumpIndexTotal < 50) fraction = 0.75;
    
    if (jumpIndexTotal === 50) {
        fraction = 0.85; 
        dz = 47;
    } else if (jumpIndexTotal === 51 || jumpIndexTotal === 52) {
        fraction = 0.60; 
    }
    
    if (jumpIndexTotal >= 75) fraction = 0.50; 
    
    if (jumpIndexTotal % 14 === 7) {
        dz = -64; 
        fraction = 0.65;
    }

    const maxGap = getMaxGap(dz, 250, isCrouch);
    const gap = Math.floor(maxGap * fraction);

    const isWider = (jumpIndexInLeg % 2 === 0);
    const platW = isWider ? 160 : 128;
    const platD = 128;
    
    if (jumpIndexInLeg % 2 === 1) {
        currentDir = (currentDir + 1) % 4;
        if (jumpIndexInLeg === 5) {
            currentDir = (currentDir + 1) % 4;
        }
    }

    const d = dirs[currentDir];
    const centerOffset = gap + platD/2 + 128/2; 
    
    currentX += d.dx * centerOffset;
    currentY += d.dy * centerOffset;
    currentZ += dz;
    
    const x1 = currentX - (d.dx === 0 ? platW/2 : platD/2);
    const x2 = currentX + (d.dx === 0 ? platW/2 : platD/2);
    const y1 = currentY - (d.dy === 0 ? platW/2 : platD/2);
    const y2 = currentY + (d.dy === 0 ? platW/2 : platD/2);
    
    platforms.push({
        x1: Math.round(x1), y1: Math.round(y1), z1: Math.round(currentZ - 16),
        x2: Math.round(x2), y2: Math.round(y2), z2: Math.round(currentZ),
        mat: "concrete/concretefloor001a"
    });
    
    globalBounds.minX = Math.min(globalBounds.minX, x1 - 512);
    globalBounds.minY = Math.min(globalBounds.minY, y1 - 512);
    globalBounds.maxX = Math.max(globalBounds.maxX, x2 + 512);
    globalBounds.maxY = Math.max(globalBounds.maxY, y2 + 512);
    globalBounds.maxZ = Math.max(globalBounds.maxZ, currentZ + 512);

    const px = currentX + d.dy * 192; 
    const py = currentY + d.dx * 192;
    if (jumpIndexInLeg < 8) { 
        propsData.push({
            model: "props_c17/truss03b",
            pos: [Math.round(px), Math.round(py), Math.round(currentZ - 128)],
            leg: leg
        });
        platforms.push({
            x1: Math.round(px - 32), y1: Math.round(py - 32), z1: Math.round(currentZ - 144),
            x2: Math.round(px + 32), y2: Math.round(py + 32), z2: Math.round(currentZ - 128),
            mat: "concrete/concretewall036a"
        });
    }

    jumpData.push({
        index: jumpIndexTotal,
        leg: leg,
        from: [0, 0, 0], 
        to: [gap, 0, dz],   
        gap: gap,
        dz: dz,
        assumedSpeed: 250,
        fraction: fraction,
        crouch: isCrouch,
        heading: d.heading,
        landing: d.dx === 0 ? [platW, platD] : [platD, platW]
    });
}

let totalJumpIndex = 1;

for (let leg = 1; leg <= totalLegs; leg++) {
    if (leg > 1) {
        currentZ += 44;
        currentX += dirs[currentDir].dx * 256;
        currentY += dirs[currentDir].dy * 256;
        
        platforms.push({
            x1: currentX - 256, y1: currentY - 256, z1: currentZ - 16,
            x2: currentX + 256, y2: currentY + 256, z2: currentZ,
            mat: "metal/metalwall032a"
        });
        
        routeJson.checkpoints.push({
            index: leg - 1,
            pos: [currentX, currentY, currentZ + 16],
            regionSize: [512, 512],
            _bounds: { x1: currentX - 256, y1: currentY - 256, z1: currentZ, x2: currentX + 256, y2: currentY + 256, z2: currentZ + 128 }
        });
    }

    for (let j = 0; j < jumpsPerLeg; j++) {
        createJump(leg, totalJumpIndex, j);
        totalJumpIndex++;
    }
}

currentZ += 44;
currentX += dirs[currentDir].dx * 256;
currentY += dirs[currentDir].dy * 256;
platforms.push({
    x1: currentX - 256, y1: currentY - 256, z1: currentZ - 16,
    x2: currentX + 256, y2: currentY + 256, z2: currentZ,
    mat: "metal/metalwall032a"
});
routeJson.end = {
    pos: [currentX, currentY, currentZ + 16],
    _bounds: { x1: currentX - 256, y1: currentY - 256, z1: currentZ, x2: currentX + 256, y2: currentY + 256, z2: currentZ + 128 }
};

let vmf = [];
vmf.push(`world {
    "id" "${nextId()}"
    "mapversion" "1"
    "classname" "worldspawn"
    "skyname" "sky_urb01"`);
vmf.push(makeSkybox(globalBounds));
for (let p of platforms) {
    vmf.push(createSolid(p.x1, p.y1, p.z1, p.x2, p.y2, p.z2, p.mat, "concrete/concretewall036a"));
}
vmf.push(`}`); 

vmf.push(`entity { "id" "${nextId()}" "classname" "info_player_start" "origin" "0 0 16" "angles" "0 0 0" }`);
vmf.push(`entity { "id" "${nextId()}" "classname" "light_environment" "origin" "0 0 1024" "angles" "-90 0 0" "_light" "255 255 255 200" "_ambient" "128 128 128 100" "pitch" "-90" }`);

vmf.push(`entity { "id" "${nextId()}" "classname" "info_teleport_destination" "targetname" "tele_start" "origin" "0 0 16" "angles" "0 0 0" }`);
for (let i=0; i<routeJson.checkpoints.length; i++) {
    const cp = routeJson.checkpoints[i];
    vmf.push(`entity { "id" "${nextId()}" "classname" "info_teleport_destination" "targetname" "tele_cp${cp.index}" "origin" "${cp.pos.join(' ')}" "angles" "0 0 0" }`);
}

const zMat = "tools/toolstrigger";
const startZBrush = createSolid(-128, -128, 0, 128, 128, 128, zMat, zMat, true);
vmf.push(`entity { "id" "${nextId()}" "classname" "zone_timer_start" "track_number" "0" "safe_height" "0" "restart_destination" "tele_start" "checkpoints_ordered" "1" ${startZBrush} }`);

let mapZoneJson = {
    dataTimestamp: 0,
    formatVersion: 1,
    tracks: {
        main: {
            zones: {
                segments: [{
                    limitStartGroundSpeed: false,
                    checkpointsRequired: true,
                    checkpointsOrdered: true,
                    checkpoints: [
                        { regions: [{ points: [[-128,-128],[128,-128],[128,128],[-128,128]], bottom: 0, height: 128, teleDestPos: [0, 0, 16], teleDestYaw: 0, safeHeight: 0 }] }
                    ]
                }],
                end: {}
            },
            stagesEndAtStageStarts: true
        }
    },
    globalRegions: {}
};

for (let cp of routeJson.checkpoints) {
    const b = cp._bounds;
    const brush = createSolid(b.x1, b.y1, b.z1, b.x2, b.y2, b.z2, zMat, zMat, true);
    vmf.push(`entity { "id" "${nextId()}" "classname" "zone_timer_checkpoint" "track_number" "0" "checkpoint_number" "${cp.index}" "safe_height" "0" "restart_destination" "tele_cp${cp.index}" ${brush} }`);
    
    mapZoneJson.tracks.main.zones.segments[0].checkpoints.push({
        regions: [{
            points: [[b.x1, b.y1], [b.x2, b.y1], [b.x2, b.y2], [b.x1, b.y2]],
            bottom: b.z1,
            height: b.z2 - b.z1,
            teleDestPos: [cp.pos[0], cp.pos[1], cp.pos[2]], teleDestYaw: 0, safeHeight: 0
        }]
    });
}

const endB = routeJson.end._bounds;
const endBrush = createSolid(endB.x1, endB.y1, endB.z1, endB.x2, endB.y2, endB.z2, zMat, zMat, true);
vmf.push(`entity { "id" "${nextId()}" "classname" "zone_timer_end" "track_number" "0" ${endBrush} }`);

mapZoneJson.tracks.main.zones.end = {
    regions: [{
        points: [[endB.x1, endB.y1], [endB.x2, endB.y1], [endB.x2, endB.y2], [endB.x1, endB.y2]],
        bottom: endB.z1,
        height: endB.z2 - endB.z1
    }]
};

for (let prop of propsData) {
    vmf.push(`entity { "id" "${nextId()}" "classname" "prop_static" "model" "models/${prop.model}.mdl" "origin" "${prop.pos.join(' ')}" "angles" "0 0 0" }`);
}

fs.writeFileSync(`${MAP_NAME}.vmf`, vmf.join('\n'));
fs.writeFileSync('route.json', JSON.stringify(routeJson, null, 2));
fs.writeFileSync(`${MAP_NAME}.json`, JSON.stringify(mapZoneJson, null, 2));

console.log("Map generated! Total climb: " + currentZ);
