#!/usr/bin/env node
/**
 * Simplified VMF generator for kz_slop_haiku45_v1
 * Creates a basic but valid KZ map with proper brush winding
 */

const fs = require('fs');
const path = require('path');

// Physics model constants (from TOOLCHAIN.md)
const GRAVITY = 800;
const VERTICAL_TAKEOFF = Math.sqrt(2 * GRAVITY * 57);

function airtimeFormula(dz) {
    const discriminant = VERTICAL_TAKEOFF * VERTICAL_TAKEOFF - 2 * GRAVITY * dz;
    if (discriminant < 0) return 0;
    return (VERTICAL_TAKEOFF + Math.sqrt(discriminant)) / GRAVITY;
}

function maxClearableGap(speed, dz) {
    const airtime = airtimeFormula(dz);
    return speed * airtime + 32;
}

function validateJump(gap, speed, dz, stage) {
    const maxGap = maxClearableGap(speed, dz);
    const pct = (gap / maxGap) * 100;
    const status = pct <= 88 ? "✓" : "✗ FAIL";
    console.log(`Stage ${stage}: gap=${gap}u, speed=${speed}u/s, height=${dz > 0 ? '+' : ''}${dz}u -> max=${maxGap.toFixed(0)}u, using ${pct.toFixed(1)}% ${status}`);
}

function createBoxBrush(minX, minY, minZ, maxX, maxY, maxZ, texture, brushId) {
    /**Create a brush with 6 faces, properly wound */
    const x1 = Math.round(minX), y1 = Math.round(minY), z1 = Math.round(minZ);
    const x2 = Math.round(maxX), y2 = Math.round(maxY), z2 = Math.round(maxZ);

    let solidStr = `        solid\n        {\n            "id" "${brushId}"\n`;

    // Each face is defined by 3 points that form the plane
    // Points must be wound clockwise when viewed from OUTSIDE the brush

    // -X face (x = x1), viewed from -X: clockwise order
    solidStr += `            side\n            {\n                "id" "${brushId}_1"\n`;
    solidStr += `                "plane" "(${x1} ${y2} ${z2}) (${x1} ${y1} ${z2}) (${x1} ${y1} ${z1})"\n`;
    solidStr += `                "material" "${texture}"\n                "uaxis" "(0 1 0 0)" "vaxis" "(0 0 1 0)"\n            }\n`;

    // +X face (x = x2), viewed from +X: clockwise order
    solidStr += `            side\n            {\n                "id" "${brushId}_2"\n`;
    solidStr += `                "plane" "(${x2} ${y1} ${z2}) (${x2} ${y2} ${z2}) (${x2} ${y2} ${z1})"\n`;
    solidStr += `                "material" "${texture}"\n                "uaxis" "(0 1 0 0)" "vaxis" "(0 0 1 0)"\n            }\n`;

    // -Y face (y = y1), viewed from -Y: clockwise order
    solidStr += `            side\n            {\n                "id" "${brushId}_3"\n`;
    solidStr += `                "plane" "(${x2} ${y1} ${z2}) (${x1} ${y1} ${z2}) (${x1} ${y1} ${z1})"\n`;
    solidStr += `                "material" "${texture}"\n                "uaxis" "(1 0 0 0)" "vaxis" "(0 0 1 0)"\n            }\n`;

    // +Y face (y = y2), viewed from +Y: clockwise order
    solidStr += `            side\n            {\n                "id" "${brushId}_4"\n`;
    solidStr += `                "plane" "(${x1} ${y2} ${z2}) (${x2} ${y2} ${z2}) (${x2} ${y2} ${z1})"\n`;
    solidStr += `                "material" "${texture}"\n                "uaxis" "(1 0 0 0)" "vaxis" "(0 0 1 0)"\n            }\n`;

    // -Z face (z = z1), viewed from -Z: clockwise order
    solidStr += `            side\n            {\n                "id" "${brushId}_5"\n`;
    solidStr += `                "plane" "(${x1} ${y2} ${z1}) (${x2} ${y2} ${z1}) (${x2} ${y1} ${z1})"\n`;
    solidStr += `                "material" "${texture}"\n                "uaxis" "(0 1 0 0)" "vaxis" "(-1 0 0 0)"\n            }\n`;

    // +Z face (z = z2), viewed from +Z: clockwise order
    solidStr += `            side\n            {\n                "id" "${brushId}_6"\n`;
    solidStr += `                "plane" "(${x2} ${y2} ${z2}) (${x1} ${y2} ${z2}) (${x1} ${y1} ${z2})"\n`;
    solidStr += `                "material" "${texture}"\n                "uaxis" "(0 1 0 0)" "vaxis" "(-1 0 0 0)"\n            }\n`;

    solidStr += `        }\n`;
    return solidStr;
}

function generateVMF(filename) {
    console.log("\n=== Jump Difficulty Analysis ===");
    validateJump(180, 250, 0, 1);
    validateJump(200, 275, 0, 2);
    validateJump(150, 250, 40, 3);
    validateJump(130, 275, 50, 4);
    console.log("");

    let vmf = 'version\n{\n    "mapversion" "220"\n}\n';
    vmf += 'visgroups\n{\n}\n';
    vmf += 'viewsettings\n{\n    "bSnapToGrid" "1"\n}\n';
    vmf += 'world\n{\n    "id" "1"\n    "mapversion" "1"\n    "classname" "worldspawn"\n    "skyname" "sky_cape_hill"\n';

    let brushId = 1;

    // Large base platform
    vmf += createBoxBrush(0, 0, -64, 2000, 300, -32, "tools/toolsblack", brushId++);

    // Stage 1 platforms (flat, 180u gap)
    vmf += createBoxBrush(50, 75, 0, 150, 225, 32, "tools/toolsblack", brushId++);
    vmf += createBoxBrush(330, 75, 0, 430, 225, 32, "tools/toolsblack", brushId++);

    // Stage 2 platforms (flat, 200u gap, lower level)
    vmf += createBoxBrush(480, 75, -32, 580, 225, 0, "tools/toolsblack", brushId++);
    vmf += createBoxBrush(780, 75, -32, 880, 225, 0, "tools/toolsblack", brushId++);

    // Stage 3 platforms (+40u height, 150u gap)
    vmf += createBoxBrush(930, 75, 40, 1030, 225, 72, "tools/toolsblack", brushId++);
    vmf += createBoxBrush(1180, 75, 80, 1280, 225, 112, "tools/toolsblack", brushId++);

    // Stage 4 platforms (+50u height, 130u gap)
    vmf += createBoxBrush(1330, 75, 162, 1430, 225, 194, "tools/toolsblack", brushId++);
    vmf += createBoxBrush(1560, 75, 220, 1660, 225, 252, "tools/toolsblack", brushId++);

    vmf += '}\n';

    // Spawn point
    vmf += 'entity\n{\n    "id" "100"\n    "classname" "info_player_start"\n    "origin" "100 150 40"\n    "angles" "0 0 0"\n}\n';

    fs.writeFileSync(filename, vmf);
    console.log(`Generated ${filename}`);
}

function generateZoneJSON(filename) {
    const zones = {
        "zones": [
            {
                "name": "Start",
                "type": "start",
                "stage": 0,
                "track": 0,
                "pos1": [0, 50, -64],
                "pos2": [200, 250, 100]
            },
            {
                "name": "Stage 1",
                "type": "stage",
                "stage": 1,
                "track": 0,
                "pos1": [300, 50, -64],
                "pos2": [460, 250, 100]
            },
            {
                "name": "Stage 2",
                "type": "stage",
                "stage": 2,
                "track": 0,
                "pos1": [450, 50, -64],
                "pos2": [910, 250, 100]
            },
            {
                "name": "Stage 3",
                "type": "stage",
                "stage": 3,
                "track": 0,
                "pos1": [900, 50, 0],
                "pos2": [1310, 250, 150]
            },
            {
                "name": "Stage 4",
                "type": "stage",
                "stage": 4,
                "track": 0,
                "pos1": [1300, 50, 140],
                "pos2": [1550, 250, 260]
            },
            {
                "name": "End",
                "type": "end",
                "stage": 4,
                "track": 0,
                "pos1": [1550, 50, 200],
                "pos2": [1700, 250, 300]
            }
        ]
    };

    fs.writeFileSync(filename, JSON.stringify(zones, null, 2));
    console.log(`Generated ${filename}`);
}

if (require.main === module) {
    const scriptDir = __dirname;
    const mapname = "kz_slop_haiku45_v1";
    const vmfFile = path.join(scriptDir, `${mapname}.vmf`);
    const jsonFile = path.join(scriptDir, `${mapname}.json`);

    console.log(`Generating ${mapname}...`);
    generateVMF(vmfFile);
    generateZoneJSON(jsonFile);
    console.log("Done!");
}
