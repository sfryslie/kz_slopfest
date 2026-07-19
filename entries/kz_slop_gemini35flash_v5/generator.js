const fs = require('fs');
const path = require('path');

const MAP_NAME = "kz_slop_gemini35flash_v5";
const ENTRY_DIR = __dirname;

let brushIdCounter = 1;
let sideIdCounter = 1;

function getNewBrushId() {
    return brushIdCounter++;
}

function getNewSideId() {
    return sideIdCounter++;
}

function makeBoxBrush(x1, y1, z1, x2, y2, z2, textureTop, textureSides) {
    const bId = getNewBrushId();
    
    const faces = [
        {
            // Top (+z)
            plane: [[x1, y2, z2], [x2, y2, z2], [x2, y1, z2], [x1, y1, z2]],
            uaxis: "[1 0 0 0] 0.25",
            vaxis: "[0 -1 0 0] 0.25",
            mat: textureTop
        },
        {
            // Bottom (-z)
            plane: [[x1, y1, z1], [x2, y1, z1], [x2, y2, z1], [x1, y2, z1]],
            uaxis: "[1 0 0 0] 0.25",
            vaxis: "[0 -1 0 0] 0.25",
            mat: textureSides
        },
        {
            // North (+y)
            plane: [[x1, y2, z1], [x2, y2, z1], [x2, y2, z2], [x1, y2, z2]],
            uaxis: "[1 0 0 0] 0.25",
            vaxis: "[0 0 -1 0] 0.25",
            mat: textureSides
        },
        {
            // South (-y)
            plane: [[x1, y1, z2], [x2, y1, z2], [x2, y1, z1], [x1, y1, z1]],
            uaxis: "[1 0 0 0] 0.25",
            vaxis: "[0 0 -1 0] 0.25",
            mat: textureSides
        },
        {
            // East (+x)
            plane: [[x2, y1, z2], [x2, y2, z2], [x2, y2, z1], [x2, y1, z1]],
            uaxis: "[0 1 0 0] 0.25",
            vaxis: "[0 0 -1 0] 0.25",
            mat: textureSides
        },
        {
            // West (-x)
            plane: [[x1, y1, z1], [x1, y2, z1], [x1, y2, z2], [x1, y1, z2]],
            uaxis: "[0 1 0 0] 0.25",
            vaxis: "[0 0 -1 0] 0.25",
            mat: textureSides
        }
    ];

    let sideStr = "";
    for (const f of faces) {
        const sId = getNewSideId();
        const [v1, v2, v3, v4] = f.plane;
        sideStr += `\tside
\t{
\t\t"id" "${sId}"
\t\t"plane" "(${v1[0]} ${v1[1]} ${v1[2]}) (${v2[0]} ${v2[1]} ${v2[2]}) (${v3[0]} ${v3[1]} ${v3[2]})"
\t\tvertices_plus
\t\t{
\t\t\t"v" "${v1[0]} ${v1[1]} ${v1[2]}"
\t\t\t"v" "${v2[0]} ${v2[1]} ${v2[2]}"
\t\t\t"v" "${v3[0]} ${v3[1]} ${v3[2]}"
\t\t\t"v" "${v4[0]} ${v4[1]} ${v4[2]}"
\t\t}
\t\t"material" "${f.mat}"
\t\t"uaxis" "${f.uaxis}"
\t\t"vaxis" "${f.vaxis}"
\t\t"rotation" "0"
\t\t"lightmapscale" "16"
\t\t"smoothing_groups" "0"
\t}\n`;
    }

    return `solid
{
\t"id" "${bId}"
${sideStr}}`;
}

function generateMinimalVMF() {
    let solids = [];
    
    // Outer skybox hollow box
    // Bottom
    solids.push(makeBoxBrush(-576, -576, -320, 576, 1088, -256, "tools/toolsskybox", "tools/toolsskybox"));
    // Top
    solids.push(makeBoxBrush(-576, -576, 1024, 576, 1088, 1088, "tools/toolsskybox", "tools/toolsskybox"));
    // North (+y)
    solids.push(makeBoxBrush(-576, 1024, -256, 576, 1088, 1024, "tools/toolsskybox", "tools/toolsskybox"));
    // South (-y)
    solids.push(makeBoxBrush(-576, -576, -256, 576, -512, 1024, "tools/toolsskybox", "tools/toolsskybox"));
    // East (+x)
    solids.push(makeBoxBrush(512, -512, -256, 576, 1024, 1024, "tools/toolsskybox", "tools/toolsskybox"));
    // West (-x)
    solids.push(makeBoxBrush(-576, -512, -256, -512, 1024, 1024, "tools/toolsskybox", "tools/toolsskybox"));

    // Start platform
    solids.push(makeBoxBrush(-128, -128, -16, 128, 128, 0, "concrete/concretefloor002a", "concrete/concretewall036a"));
    
    // End platform
    solids.push(makeBoxBrush(-128, 256, -16, 128, 512, 0, "concrete/concretefloor002a", "concrete/concretewall036a"));

    let worldBrushesStr = solids.join("\n");

    let entitiesStr = "";
    
    // Player spawn
    entitiesStr += `entity
{
\t"id" "10001"
\t"classname" "info_player_start"
\t"angles" "0 90 0"
\t"origin" "0 0 16"
}\n`;

    // Teleport destination for start
    entitiesStr += `entity
{
\t"id" "10002"
\t"classname" "info_teleport_destination"
\t"targetname" "spawn_dest"
\t"angles" "0 90 0"
\t"origin" "0 0 16"
}\n`;

    // Start Zone entity
    const startZoneBrush = makeBoxBrush(-128, -128, 0, 128, 128, 192, "tools/toolstrigger", "tools/toolstrigger");
    entitiesStr += `entity
{
\t"id" "20001"
\t"classname" "zone_timer_start"
\t"track_number" "0"
\t"safe_height" "0"
\t"restart_destination" "spawn_dest"
\t${startZoneBrush}
}\n`;

    // End Zone entity
    const endZoneBrush = makeBoxBrush(-128, 256, 0, 128, 512, 192, "tools/toolstrigger", "tools/toolstrigger");
    entitiesStr += `entity
{
\t"id" "20002"
\t"classname" "zone_timer_end"
\t"track_number" "0"
\t"safe_height" "0"
\t${endZoneBrush}
}\n`;

    const vmfContent = `versioninfo
{
\t"editorversion" "400"
\t"editorbuild" "8900"
\t"mapversion" "1"
\t"formatversion" "100"
\t"prefab" "0"
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
\t"skyname" "sky_urb01"
\t"maxpropscreenwidth" "-1"
\t"detailvbsp" "detail.vbsp"
\t"detailmaterial" "detail/detailsprites"
${worldBrushesStr}
}
${entitiesStr}`;

    fs.writeFileSync(path.join(ENTRY_DIR, `${MAP_NAME}.vmf`), vmfContent, 'utf8');
    console.log(`Generated ${MAP_NAME}.vmf`);
}

function generateMinimalRoute() {
    const route = {
        "map": MAP_NAME,
        "start": { "pos": [0, 0, 16], "yaw": 90 },
        "end":   { "pos": [0, 384, 16] },
        "checkpoints": [],
        "jumps": [],
        "props": [],
        "constructs": []
    };
    fs.writeFileSync(path.join(ENTRY_DIR, `route.json`), JSON.stringify(route, null, 2), 'utf8');
    console.log(`Generated route.json`);
}

generateMinimalVMF();
generateMinimalRoute();
