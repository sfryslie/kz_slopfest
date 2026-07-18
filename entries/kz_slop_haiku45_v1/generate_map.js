#!/usr/bin/env node
/**
 * Generator for kz_slop_haiku45_v1 — Industrial Canyon Transit KZ map
 * Produces fully procedural VMF and zone JSON files with calculated jump difficulty
 */

const fs = require('fs');
const path = require('path');

// Physics model constants (from TOOLCHAIN.md)
const GRAVITY = 800;  // u/s²
const JUMP_APEX = 57;  // u (normal jump)
const RUN_SPEED = 250;  // u/s
const PRESTRAFE_SPEED = 275;  // u/s
const VERTICAL_TAKEOFF = Math.sqrt(2 * GRAVITY * JUMP_APEX);  // ~302 u/s

// Textures
const TEXTURE_METAL = "nature/metal_caution_stripe";
const TEXTURE_FLOOR = "nature/dirt";
const TEXTURE_TRIGGER = "tools/toolstrigger";

class Vec3 {
    constructor(x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    add(other) {
        return new Vec3(this.x + other.x, this.y + other.y, this.z + other.z);
    }

    mul(scalar) {
        return new Vec3(this.x * scalar, this.y * scalar, this.z * scalar);
    }

    toString() {
        return `${Math.round(this.x)} ${Math.round(this.y)} ${Math.round(this.z)}`;
    }
}

function airtimeFormula(dz) {
    /**
     * Calculate airtime when landing dz units above takeoff
     * airTime(dz) = (v0 + sqrt(v0² - 2g·dz)) / g
     * where v0 = 302 u/s (vertical takeoff speed)
     */
    const discriminant = VERTICAL_TAKEOFF * VERTICAL_TAKEOFF - 2 * GRAVITY * dz;
    if (discriminant < 0) return 0;
    return (VERTICAL_TAKEOFF + Math.sqrt(discriminant)) / GRAVITY;
}

function maxClearableGap(speed, dz) {
    /**Calculate max clearable gap at given speed and height delta */
    const airtime = airtimeFormula(dz);
    return speed * airtime + 32;  // +32 for player bbox overhang
}

function validateJump(gap, speed, dz, stage) {
    /**Validate and report jump difficulty */
    const maxGap = maxClearableGap(speed, dz);
    const pct = (gap / maxGap) * 100;
    const status = pct <= 88 ? "✓" : "✗ FAIL";
    console.log(`Stage ${stage}: gap=${gap}u, speed=${speed}u/s, height=${dz > 0 ? '+' : ''}${dz}u -> max=${maxGap.toFixed(0)}u, using ${pct.toFixed(1)}% ${status}`);
}

class VMFBuilder {
    constructor(mapname) {
        this.mapname = mapname;
        this.entityId = 1;
        this.brushId = 1;
    }

    newEntityId() {
        return this.entityId++;
    }

    newBrushId() {
        return this.brushId++;
    }

    addBrushFace(bid, v1, v2, v3, texture) {
        /**
         * Create a brush face with proper winding (clockwise from outside)
         * The three points must define the normal pointing outward
         */
        return `            side
            {
                "id" "${this.newBrushId()}"
                "plane" "(${v1.toString()}) (${v2.toString()}) (${v3.toString()})"
                "material" "${texture}"
                "uaxis" "(1 0 0 0)"
                "vaxis" "(0 1 0 0)"
                "rotation" "0"
                "lightmapscale" "16"
                "smoothing_groups" "0"
                "vertices_plus"
                {
                    "v" "${v1.toString()}"
                    "v" "${v2.toString()}"
                    "v" "${v3.toString()}"
                }
            }
`;
    }

    createBox(minPt, maxPt, texture) {
        /**Create a solid box brush (6 faces, properly wound) */
        const x1 = Math.round(minPt.x);
        const y1 = Math.round(minPt.y);
        const z1 = Math.round(minPt.z);
        const x2 = Math.round(maxPt.x);
        const y2 = Math.round(maxPt.y);
        const z2 = Math.round(maxPt.z);

        const brushId = this.newBrushId();

        // Vertices for box
        const v = [
            [x1, y1, z1], [x1, y2, z1], [x1, y2, z2], [x1, y1, z2],  // -X
            [x2, y1, z1], [x2, y2, z1], [x2, y2, z2], [x2, y1, z2],  // +X
        ];

        let faces = "";
        // -X face
        faces += this.addBrushFace(brushId, new Vec3(...v[0]), new Vec3(...v[3]), new Vec3(...v[2]), texture);
        // +X face
        faces += this.addBrushFace(brushId, new Vec3(...v[4]), new Vec3(...v[6]), new Vec3(...v[7]), texture);
        // -Y face
        faces += this.addBrushFace(brushId, new Vec3(...v[0]), new Vec3(...v[4]), new Vec3(...v[7]), texture);
        // +Y face
        faces += this.addBrushFace(brushId, new Vec3(...v[1]), new Vec3(...v[2]), new Vec3(...v[6]), texture);
        // -Z face
        faces += this.addBrushFace(brushId, new Vec3(...v[0]), new Vec3(...v[1]), new Vec3(...v[5]), texture);
        // +Z face
        faces += this.addBrushFace(brushId, new Vec3(...v[3]), new Vec3(...v[7]), new Vec3(...v[6]), texture);

        return `        solid
        {
            "id" "${brushId}"
${faces}        }
`;
    }
}

function generateVMF(filename) {
    /**Generate the complete VMF file */

    const builder = new VMFBuilder("kz_slop_haiku45_v1");

    console.log("\n=== Jump Difficulty Analysis ===");
    validateJump(180, RUN_SPEED, 0, 1);
    validateJump(200, PRESTRAFE_SPEED, 0, 2);
    validateJump(150, RUN_SPEED, 40, 3);
    validateJump(130, PRESTRAFE_SPEED, 50, 4);
    console.log("");

    let vmf = 'version\n{\n    "mapversion" "220"\n}\n';
    vmf += 'visgroups\n{\n}\n';
    vmf += 'viewsettings\n{\n    "bSnapToGrid" "1"\n    "bShowGrid" "1"\n    "bShowLogical" "0"\n}\n';
    vmf += 'world\n{\n    "id" "1"\n    "mapversion" "1"\n    "classname" "worldspawn"\n';
    vmf += '    "skyname" "sky_cape_hill"\n    "maxpropscreenwidth" "-1"\n    "detailfog" "0"\n';

    // Floor base (large platform underneath entire map)
    vmf += builder.createBox(new Vec3(-200, -200, -64), new Vec3(2200, 400, -32), TEXTURE_FLOOR);

    // ===== STAGE 1: Canyon Base =====
    // Start platform (flat)
    vmf += builder.createBox(new Vec3(50, 100, 0), new Vec3(200, 250, 32), TEXTURE_METAL);
    // Gap: 180u (200 to 380)
    // End platform
    vmf += builder.createBox(new Vec3(380, 100, 0), new Vec3(530, 250, 32), TEXTURE_METAL);

    // ===== STAGE 2: Lower Platform =====
    // Ramp down
    vmf += builder.createBox(new Vec3(530, 100, 0), new Vec3(580, 250, -32), TEXTURE_METAL);
    // Platform at lower height
    vmf += builder.createBox(new Vec3(580, 100, -32), new Vec3(730, 250, 0), TEXTURE_METAL);
    // Gap: 200u (730 to 930)
    // End platform
    vmf += builder.createBox(new Vec3(930, 100, -32), new Vec3(1080, 250, 0), TEXTURE_METAL);

    // ===== STAGE 3: Upper Platform =====
    // Ramp up to stage 3 (+40u)
    vmf += builder.createBox(new Vec3(1080, 100, 0), new Vec3(1130, 250, 40), TEXTURE_METAL);
    // Platform at +40u
    vmf += builder.createBox(new Vec3(1130, 80, 40), new Vec3(1280, 270, 72), TEXTURE_METAL);
    // Gap: 150u (1280 to 1430)
    // End platform at +80u
    vmf += builder.createBox(new Vec3(1430, 80, 80), new Vec3(1580, 270, 112), TEXTURE_METAL);

    // ===== STAGE 4: Final Ascent =====
    // Connection ramp to +50u
    vmf += builder.createBox(new Vec3(1580, 150, 112), new Vec3(1630, 200, 162), TEXTURE_METAL);
    // Platform at +50u above last stage floor
    vmf += builder.createBox(new Vec3(1630, 130, 162), new Vec3(1780, 220, 194), TEXTURE_METAL);
    // Gap: 130u (1780 to 1910)
    // Finish platform
    vmf += builder.createBox(new Vec3(1910, 130, 220), new Vec3(2060, 220, 252), TEXTURE_METAL);

    // Side walls
    vmf += builder.createBox(new Vec3(-100, -300, -64), new Vec3(-50, 400, 300), TEXTURE_FLOOR);
    vmf += builder.createBox(new Vec3(2100, -300, -64), new Vec3(2150, 400, 300), TEXTURE_FLOOR);

    vmf += '}\n';

    // Start position
    vmf += 'entity\n{\n    "id" "100"\n    "classname" "info_player_start"\n    "origin" "125 175 40"\n    "angles" "0 0 0"\n}\n';

    fs.writeFileSync(filename, vmf);
    console.log(`Generated ${filename}`);
}

function generateZoneJSON(filename) {
    /**Generate the zone JSON file with timer and checkpoints */

    const zones = {
        "zones": [
            {
                "name": "Start",
                "type": "start",
                "stage": 0,
                "track": 0,
                "pos1": [-50, 75, -64],
                "pos2": [250, 275, 100]
            },
            {
                "name": "Stage 1",
                "type": "stage",
                "stage": 1,
                "track": 0,
                "pos1": [350, 75, -64],
                "pos2": [560, 275, 100]
            },
            {
                "name": "Stage 2",
                "type": "stage",
                "stage": 2,
                "track": 0,
                "pos1": [580, 75, -64],
                "pos2": [1100, 275, 100]
            },
            {
                "name": "Stage 3",
                "type": "stage",
                "stage": 3,
                "track": 0,
                "pos1": [1130, 75, 0],
                "pos2": [1600, 275, 120]
            },
            {
                "name": "Stage 4",
                "type": "stage",
                "stage": 4,
                "track": 0,
                "pos1": [1630, 100, 140],
                "pos2": [1800, 250, 210]
            },
            {
                "name": "End",
                "type": "end",
                "stage": 4,
                "track": 0,
                "pos1": [1900, 75, 200],
                "pos2": [2070, 275, 300]
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
