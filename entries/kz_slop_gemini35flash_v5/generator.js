const fs = require('fs');
const path = require('path');

const MAP_NAME = "kz_slop_gemini35flash_v5";
const ENTRY_DIR = __dirname;

let brushIdCounter = 1;
let sideIdCounter = 1;
let entityIdCounter = 1;

function getNewBrushId() { return brushIdCounter++; }
function getNewSideId() { return sideIdCounter++; }
function getNewEntityId() { return entityIdCounter++; }

// Axis-aligned box brush generator with plane-winding and vertices_plus
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

// movement model physics (TOOLCHAIN.md)
function calculateGap(dz, speed, crouch, fraction) {
    const G = 800;
    const apex = crouch ? 66 : 57;
    const vt = Math.sqrt(2 * G * apex);
    const disc = vt * vt - 2 * G * dz;
    if (disc <= 0) {
        throw new Error(`Impossible jump: dz ${dz} exceeds apex ${apex}`);
    }
    const airTime = (vt + Math.sqrt(disc)) / G;
    const budget = speed * airTime + 32;
    return fraction * budget;
}

// Generate the whole layout
function run() {
    const numLegs = 7;
    const jumpsPerLeg = 6;
    const totalJumps = numLegs * jumpsPerLeg;

    // Difficulty curve setup (fractions)
    const fractions = new Array(totalJumps);
    
    // Leg 1: Warmup
    for (let i = 0; i < 6; i++) fractions[i] = 0.45 + i * 0.01;
    // Leg 2: Medium climb
    for (let i = 6; i < 12; i++) fractions[i] = 0.52 + (i - 6) * 0.01;
    // Leg 3: Winding height
    for (let i = 12; i < 18; i++) fractions[i] = 0.58 + (i - 12) * 0.01;
    // Leg 4: Cramped moves
    for (let i = 18; i < 24; i++) fractions[i] = 0.64 + (i - 18) * 0.01;
    // Leg 5: The Peak (Jump 27 is peak at index 26)
    fractions[24] = 0.70;
    fractions[25] = 0.72;
    fractions[26] = 0.82; // Peak Spike (index 26, Jump 27)
    fractions[27] = 0.50; // Cool-off 1
    fractions[28] = 0.52; // Cool-off 2
    fractions[29] = 0.70;
    // Leg 6: Uphill hopping
    for (let i = 30; i < 36; i++) fractions[i] = 0.72 + (i - 30) * 0.01;
    // Leg 7: Victory lap
    for (let i = 36; i < 42; i++) fractions[i] = 0.55 - (i - 36) * 0.02;

    // Jump configurations
    const speeds = new Array(totalJumps).fill(250);
    // Let's use 275 speed for the peak jump to make it have a bit more approach speed allowance
    speeds[26] = 250; // Keep it at 250 for simplicity

    // Horizontal direction sequence per leg
    // Odd legs go N, E, N, [ladder], W, N, N
    // Even legs go S, W, S, [ladder], E, S, S
    // We alternate headings for variety and switchbacks
    const oddHeadings = ["N", "E", "N", "W", "N", "N"];
    const evenHeadings = ["S", "W", "S", "E", "S", "S"];

    // Platforms and jumps tracker
    const platforms = [];
    const jumps = [];
    const props = [];
    const entities = [];

    // Helper to add entity
    function addEntity(classname, keys, brush=null) {
        const entId = getNewEntityId();
        let entStr = `entity\n{\n\t"id" "${entId}"\n\t"classname" "${classname}"\n`;
        for (const [k, v] of Object.entries(keys)) {
            entStr += `\t"${k}" "${v}"\n`;
        }
        if (brush) {
            entStr += `\t${brush}\n`;
        }
        entStr += `}\n`;
        entities.push(entStr);
        return entId;
    }

    // Platforms definitions
    // CP0 (Start)
    const cp0 = {
        center: [0, 0, 0],
        size: [384, 384, 32],
        matTop: "brick/brickfloor001a",
        matSides: "brick/brickwall017a",
        label: "CP0_Start"
    };
    platforms.push(cp0);

    let currentPos = [0, 0, 0];
    let prevPlatform = cp0;

    // Build legs
    let jumpIndex = 1;
    for (let leg = 1; leg <= numLegs; leg++) {
        const isOdd = (leg % 2 !== 0);
        const headings = isOdd ? oddHeadings : evenHeadings;

        // Intermediate platforms P1..P6
        for (let step = 1; step <= 6; step++) {
            const hIdx = step - 1;
            const heading = headings[hIdx];
            const jIdxGlobal = jumpIndex - 1;

            const frac = fractions[jIdxGlobal];
            const speed = speeds[jIdxGlobal];
            // Leg 6 jumps all rise by 40u, others rise by 32u
            const dz = (leg === 6) ? 40 : 32;

            // Footprint alternates
            // P1: B, P2: A, P3: B, P4: A, P5: B, P6: A
            // A: 96x96, B: 128x128
            const nextSize = (step % 2 === 0) ? [96, 96, 32] : [128, 128, 32];
            const matTop = (step % 2 === 0) ? "concrete/concretefloor002a" : "metal/metalfloor003a";
            const matSides = (step % 2 === 0) ? "concrete/concretewall036a" : "metal/metalwall032a";

            // Calculate jump gap edge-to-edge
            const gap = calculateGap(dz, speed, false, frac);

            // Takeoff point from prev platform edge
            let takeoff = [...prevPlatform.center];
            takeoff[2] = prevPlatform.center[2] + prevPlatform.size[2]/2; // top surface
            if (heading === "N") takeoff[1] += prevPlatform.size[1]/2;
            else if (heading === "S") takeoff[1] -= prevPlatform.size[1]/2;
            else if (heading === "E") takeoff[0] += prevPlatform.size[0]/2;
            else if (heading === "W") takeoff[0] -= prevPlatform.size[0]/2;

            // Landing point on next platform edge
            let landing = [...takeoff];
            landing[2] += dz;
            if (heading === "N") landing[1] += gap;
            else if (heading === "S") landing[1] -= gap;
            else if (heading === "E") landing[0] += gap;
            else if (heading === "W") landing[0] -= gap;

            // Next platform center
            let nextCenter = [...landing];
            nextCenter[2] -= nextSize[2]/2; // center Z
            if (heading === "N") nextCenter[1] += nextSize[1]/2;
            else if (heading === "S") nextCenter[1] -= nextSize[1]/2;
            else if (heading === "E") nextCenter[0] += nextSize[0]/2;
            else if (heading === "W") nextCenter[0] -= nextSize[0]/2;

            // Create next platform
            const nextPlatform = {
                center: nextCenter,
                size: nextSize,
                matTop: matTop,
                matSides: matSides,
                label: `L${leg}_P${step}`
            };

            // Record jump
            jumps.push({
                index: jumpIndex,
                leg: leg,
                from: takeoff.map(x => Math.round(x)),
                to: landing.map(x => Math.round(x)),
                gap: parseFloat(gap.toFixed(3)),
                dz: dz,
                assumedSpeed: speed,
                fraction: parseFloat(frac.toFixed(3)),
                crouch: false,
                heading: heading,
                landing: [nextSize[0], nextSize[1]]
            });

            platforms.push(nextPlatform);
            prevPlatform = nextPlatform;
            jumpIndex++;

            // Crouch tunnel construct: Leg 4, Platform 2
            if (leg === 4 && step === 2) {
                // Place a low ceiling brush over this platform
                // Platform is at nextCenter. zTop = nextCenter.z + 16.
                // Bounding box: X range +/- 48, Y range +/- 48.
                // Low ceiling from zTop + 56 to zTop + 120
                const zTop = nextCenter[2] + 16;
                const ceilingBrush = makeBoxBrush(
                    nextCenter[0] - 48, nextCenter[1] - 48, zTop + 56,
                    nextCenter[0] + 48, nextCenter[1] + 48, zTop + 120,
                    "concrete/concretefloor002a", "concrete/concretewall036a"
                );
                // Detail brush
                addEntity("func_detail", {}, ceilingBrush);
            }

            // Corner jump construct: Leg 1, Platform 1 to Platform 2
            // P1_1 is at X=0, Y=352. P1_2 is at X=208, Y=352.
            // Let's place a pillar at X=64 to 128, Y=288 to 352, Z=0 to 256.
            if (leg === 1 && step === 1) {
                const pillarBrush = makeBoxBrush(
                    64, 256, 0,
                    128, 320, 256,
                    "brick/brickwall017a", "brick/brickwall017a"
                );
                addEntity("func_detail", {}, pillarBrush);
            }
            // Corner jump construct: Leg 5, Platform 1 to Platform 2
            if (leg === 5 && step === 1) {
                // Leg 5 is odd, goes East. Let's place a pillar in the corner.
                const pillarBrush = makeBoxBrush(
                    nextCenter[0] + 64, nextCenter[1] - 96, nextCenter[2],
                    nextCenter[0] + 128, nextCenter[1] - 32, nextCenter[2] + 256,
                    "brick/brickwall017a", "brick/brickwall017a"
                );
                addEntity("func_detail", {}, pillarBrush);
            }

            // Transition: Ladder between Platform 3 and Platform 4
            if (step === 3) {
                // We add a ladder gain of 408 units (L6 ladder rises 360 units since jumps rose more).
                const ladderRise = (leg === 6) ? 360 : 408;
                
                // Platform 4 size: 96x96
                const p4Size = [96, 96, 32];
                const p4MatTop = "concrete/concretefloor002a";
                const p4MatSides = "concrete/concretewall036a";

                // Platform 4 position:
                // If odd leg (L1, L3, L5, L7): Y overlaps on North. We place Platform 4 North of Platform 3.
                // We offset Platform 4 center in Y by: P3_size_y/2 + P4_size_y/2 + 8
                // X remains the same as Platform 3.
                const dirSign = isOdd ? 1 : -1;
                const offsetL = dirSign * (prevPlatform.size[1]/2 + p4Size[1]/2 + 8);
                const p4Center = [
                    prevPlatform.center[0],
                    prevPlatform.center[1] + offsetL,
                    prevPlatform.center[2] + ladderRise
                ];

                const p4Platform = {
                    center: p4Center,
                    size: p4Size,
                    matTop: p4MatTop,
                    matSides: p4MatSides,
                    label: `L${leg}_P4`
                };

                // Add ladder brushes (invisible trigger volume + physical visual ladder)
                // Trigger volume placed in the 8 unit gap
                const triggerY1 = isOdd ? (prevPlatform.center[1] + prevPlatform.size[1]/2) : (p4Center[1] + p4Size[1]/2);
                const triggerY2 = triggerY1 + 8;
                const triggerX1 = prevPlatform.center[0] - 16;
                const triggerX2 = prevPlatform.center[0] + 16;
                const triggerZ1 = prevPlatform.center[2] + prevPlatform.size[2]/2;
                const triggerZ2 = p4Center[2] - p4Size[2]/2;

                const ladderTriggerBrush = makeBoxBrush(
                    triggerX1, triggerY1, triggerZ1,
                    triggerX2, triggerY2, triggerZ2,
                    "tools/toolsinvisibleladder", "tools/toolsinvisibleladder"
                );
                // Detail ladder volume
                addEntity("func_detail", {}, ladderTriggerBrush);

                // Decorative visual ladder prop
                addEntity("prop_static", {
                    "angles": isOdd ? "0 0 0" : "0 180 0",
                    "fademindist": "-1",
                    "fadescale": "1",
                    "model": "models/props_c17/metalladder002b.mdl",
                    "skin": "0",
                    "solid": "0", // visual only
                    "origin": `${prevPlatform.center[0]} ${triggerY1 + (isOdd ? 2 : 6)} ${triggerZ1 + 16}`
                });

                platforms.push(p4Platform);
                prevPlatform = p4Platform;
                step = 4; // Skip step 4 initialization because we just built it!
            }
        }

        // Checkpoint platform at the end of the leg
        const cpSize = [256, 256, 32];
        const cpMatTop = "brick/brickfloor001a";
        const cpMatSides = "brick/brickwall017a";

        // CP jump (Jump 6): P6 -> CP_leg
        const lastH = headings[5];
        const cpFrac = fractions[jumpIndex - 1];
        const cpSpeed = speeds[jumpIndex - 1];
        const cpDz = (leg === 6) ? 40 : 32;

        const cpGap = calculateGap(cpDz, cpSpeed, false, cpFrac);

        // Takeoff
        let cpTakeoff = [...prevPlatform.center];
        cpTakeoff[2] = prevPlatform.center[2] + prevPlatform.size[2]/2;
        if (lastH === "N") cpTakeoff[1] += prevPlatform.size[1]/2;
        else if (lastH === "S") cpTakeoff[1] -= prevPlatform.size[1]/2;
        else if (lastH === "E") cpTakeoff[0] += prevPlatform.size[0]/2;
        else if (lastH === "W") cpTakeoff[0] -= prevPlatform.size[0]/2;

        // Landing
        let cpLanding = [...cpTakeoff];
        cpLanding[2] += cpDz;
        if (lastH === "N") cpLanding[1] += cpGap;
        else if (lastH === "S") cpLanding[1] -= cpGap;
        else if (lastH === "E") cpLanding[0] += cpGap;
        else if (lastH === "W") cpLanding[0] -= cpGap;

        // CP Center
        let cpCenter = [...cpLanding];
        cpCenter[2] -= cpSize[2]/2;
        if (lastH === "N") cpCenter[1] += cpSize[1]/2;
        else if (lastH === "S") cpCenter[1] -= cpSize[1]/2;
        else if (lastH === "E") cpCenter[0] += cpSize[0]/2;
        else if (lastH === "W") cpCenter[0] -= cpSize[0]/2;

        const cpPlatform = {
            center: cpCenter,
            size: cpSize,
            matTop: cpMatTop,
            matSides: cpMatSides,
            label: `CP${leg}`
        };

        // Record jump
        jumps.push({
            index: jumpIndex,
            leg: leg,
            from: cpTakeoff.map(x => Math.round(x)),
            to: cpLanding.map(x => Math.round(x)),
            gap: parseFloat(cpGap.toFixed(3)),
            dz: cpDz,
            assumedSpeed: cpSpeed,
            fraction: parseFloat(cpFrac.toFixed(3)),
            crouch: false,
            heading: lastH,
            landing: [cpSize[0], cpSize[1]]
        });

        platforms.push(cpPlatform);
        prevPlatform = cpPlatform;
        jumpIndex++;
    }

    // End zone is co-located on CP7 (the last platform we generated)
    const finalCP = platforms[platforms.length - 1];

    // Generate props dressing each leg
    // 8 props per leg. Total 56 props.
    // Prop models array
    const propModels = [
        "props_c17/truss03b",
        "props_rooftop/scaffolding01a",
        "props_rooftop/chimneypipe01a",
        "props_pipes/concrete_pipe001a"
    ];

    for (let leg = 1; leg <= numLegs; leg++) {
        // Place 8 props at vertical levels within this leg
        const zStart = (leg - 1) * 600;
        for (let pIdx = 1; pIdx <= 8; pIdx++) {
            const model = propModels[(pIdx - 1) % propModels.length];
            const pZ = zStart + pIdx * 70;
            // Alternate left and right walls to be far away from jumps (centered X=0)
            const pX = (pIdx % 2 === 0) ? -420 : 420;
            const pY = (pIdx % 4 < 2) ? -200 : 600;

            props.push({
                model: model,
                pos: [pX, pY, pZ],
                leg: leg
            });

            // Write to entities
            addEntity("prop_static", {
                "angles": "0 0 0",
                "fademindist": "-1",
                "fadescale": "1",
                "model": `models/${model}.mdl`,
                "skin": "0",
                "solid": "6",
                "origin": `${pX} ${pY} ${pZ}`
            });
        }
    }

    // Now write the VMF geometry brushes
    let worldBrushes = [];

    // Skybox hull (Sealing outer boundary)
    // X: -576 to 576, Y: -640 to 1350, Z: -320 to 4500
    const skyX1 = -576, skyX2 = 576;
    const skyY1 = -640, skyY2 = 1350;
    const skyZ1 = -320, skyZ2 = 4500;
    const skyThick = 64;

    // Bottom
    worldBrushes.push(makeBoxBrush(skyX1 - skyThick, skyY1 - skyThick, skyZ1 - skyThick, skyX2 + skyThick, skyY2 + skyThick, skyZ1, "tools/toolsskybox", "tools/toolsskybox"));
    // Top
    worldBrushes.push(makeBoxBrush(skyX1 - skyThick, skyY1 - skyThick, skyZ2, skyX2 + skyThick, skyY2 + skyThick, skyZ2 + skyThick, "tools/toolsskybox", "tools/toolsskybox"));
    // North (+y)
    worldBrushes.push(makeBoxBrush(skyX1 - skyThick, skyY2, skyZ1, skyX2 + skyThick, skyY2 + skyThick, skyZ2, "tools/toolsskybox", "tools/toolsskybox"));
    // South (-y)
    worldBrushes.push(makeBoxBrush(skyX1 - skyThick, skyY1 - skyThick, skyZ1, skyX2 + skyThick, skyY1, skyZ2, "tools/toolsskybox", "tools/toolsskybox"));
    // East (+x)
    worldBrushes.push(makeBoxBrush(skyX2, skyY1, skyZ1, skyX2 + skyThick, skyY2, skyZ2, "tools/toolsskybox", "tools/toolsskybox"));
    // West (-x)
    worldBrushes.push(makeBoxBrush(skyX1 - skyThick, skyY1, skyZ1, skyX1, skyY2, skyZ2, "tools/toolsskybox", "tools/toolsskybox"));

    // Catch floor at Z = -256 to ensure no voids/leaks
    worldBrushes.push(makeBoxBrush(skyX1, skyY1, -256, skyX2, skyY2, -240, "concrete/concretefloor002a", "concrete/concretefloor002a"));

    // Ladder back to Start CP0 if you fall to the bottom floor
    const bottomLadderTrigger = makeBoxBrush(
        -16, -200, -240,
        16, -192, 0,
        "tools/toolsinvisibleladder", "tools/toolsinvisibleladder"
    );
    addEntity("func_detail", {}, bottomLadderTrigger);
    addEntity("prop_static", {
        "angles": "0 0 0",
        "fademindist": "-1",
        "fadescale": "1",
        "model": "models/props_c17/metalladder002b.mdl",
        "skin": "0",
        "solid": "0",
        "origin": `0 -192 -240`
    });

    // Write all platforms as brushes
    for (const p of platforms) {
        const x1 = p.center[0] - p.size[0]/2;
        const x2 = p.center[0] + p.size[0]/2;
        const y1 = p.center[1] - p.size[1]/2;
        const y2 = p.center[1] + p.size[1]/2;
        const z1 = p.center[2] - p.size[2]/2;
        const z2 = p.center[2] + p.size[2]/2;

        const brush = makeBoxBrush(x1, y1, z1, x2, y2, z2, p.matTop, p.matSides);
        // We can just keep them as world brushes, or tie checkpoints to detail. Let's keep them as world spawn brushes.
        worldBrushes.push(brush);
    }

    // Write start/checkpoint/end zone entities
    // CP0 (Start)
    const cp0_brush = makeBoxBrush(cp0.center[0] - cp0.size[0]/2, cp0.center[1] - cp0.size[1]/2, cp0.center[2] + cp0.size[2]/2,
                                     cp0.center[0] + cp0.size[0]/2, cp0.center[1] + cp0.size[1]/2, cp0.center[2] + cp0.size[2]/2 + 192,
                                     "tools/toolstrigger", "tools/toolstrigger");
    addEntity("zone_timer_start", {
        "track_number": "0",
        "safe_height": "0",
        "restart_destination": "spawn_dest"
    }, cp0_brush);

    // Player spawn destinations
    addEntity("info_player_start", {
        "angles": "0 90 0",
        "origin": `${cp0.center[0]} ${cp0.center[1]} ${cp0.center[2] + cp0.size[2]/2 + 16}`
    });
    addEntity("info_teleport_destination", {
        "targetname": "spawn_dest",
        "angles": "0 90 0",
        "origin": `${cp0.center[0]} ${cp0.center[1]} ${cp0.center[2] + cp0.size[2]/2 + 16}`
    });

    // CP1 to CP6
    let cpIndex = 1;
    for (const p of platforms) {
        if (p.label.startsWith("CP") && p.label !== "CP0_Start" && p.label !== `CP${numLegs}`) {
            const cp_brush = makeBoxBrush(p.center[0] - p.size[0]/2, p.center[1] - p.size[1]/2, p.center[2] + p.size[2]/2,
                                             p.center[0] + p.size[0]/2, p.center[1] + p.size[1]/2, p.center[2] + p.size[2]/2 + 192,
                                             "tools/toolstrigger", "tools/toolstrigger");
            addEntity("zone_timer_checkpoint", {
                "track_number": "0",
                "safe_height": "0",
                "stage_number": "1",
                "checkpoint_number": `${cpIndex + 1}`,
                "restart_destination": `cp${cpIndex}_dest`
            }, cp_brush);

            addEntity("info_teleport_destination", {
                "targetname": `cp${cpIndex}_dest`,
                "angles": "0 90 0",
                "origin": `${p.center[0]} ${p.center[1]} ${p.center[2] + p.size[2]/2 + 16}`
            });

            cpIndex++;
        }
    }

    // End Zone (CP7)
    const end_brush = makeBoxBrush(finalCP.center[0] - finalCP.size[0]/2, finalCP.center[1] - finalCP.size[1]/2, finalCP.center[2] + finalCP.size[2]/2,
                                      finalCP.center[0] + finalCP.size[0]/2, finalCP.center[1] + finalCP.size[1]/2, finalCP.center[2] + finalCP.size[2]/2 + 192,
                                      "tools/toolstrigger", "tools/toolstrigger");
    addEntity("zone_timer_end", {
        "track_number": "0",
        "safe_height": "0"
    }, end_brush);

    // Assembly VMF
    const worldspawn = `world
{
\t"id" "1"
\t"mapversion" "1"
\t"classname" "worldspawn"
\t"skyname" "sky_urb01"
\t"maxpropscreenwidth" "-1"
\t"detailvbsp" "detail.vbsp"
\t"detailmaterial" "detail/detailsprites"
${worldBrushes.join("\n")}
}`;

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
${worldspawn}
${entities.join("\n")}`;

    fs.writeFileSync(path.join(ENTRY_DIR, `${MAP_NAME}.vmf`), vmfContent, 'utf8');
    console.log(`Generated ${MAP_NAME}.vmf`);

    // Prepare route.json format matching specification
    const routeCheckpoints = [];
    let cpCount = 1;
    for (const p of platforms) {
        if (p.label.startsWith("CP") && p.label !== "CP0_Start" && p.label !== `CP${numLegs}`) {
            routeCheckpoints.push({
                index: cpCount,
                pos: [Math.round(p.center[0]), Math.round(p.center[1]), Math.round(p.center[2] + p.size[2]/2)],
                regionSize: [p.size[0], p.size[1]]
            });
            cpCount++;
        }
    }

    const route = {
        "map": MAP_NAME,
        "start": { "pos": [0, 0, 16], "yaw": 90 },
        "end":   { "pos": [Math.round(finalCP.center[0]), Math.round(finalCP.center[1]), Math.round(finalCP.center[2] + finalCP.size[2]/2)] },
        "checkpoints": routeCheckpoints,
        "jumps": jumps,
        "props": props,
        "constructs": ["ladder", "crouch tunnel", "corner", "uphill hop chain"]
    };

    fs.writeFileSync(path.join(ENTRY_DIR, `route.json`), JSON.stringify(route, null, 2), 'utf8');
    console.log(`Generated route.json`);

    // Write the perfect zone JSON directly to comply with validator and runtime
    const zoneCheckpoints = [];
    const cp0_x1 = cp0.center[0] - cp0.size[0]/2;
    const cp0_x2 = cp0.center[0] + cp0.size[0]/2;
    const cp0_y1 = cp0.center[1] - cp0.size[1]/2;
    const cp0_y2 = cp0.center[1] + cp0.size[1]/2;
    const cp0_bottom = cp0.center[2] + cp0.size[2]/2;
    
    zoneCheckpoints.push({
        "regions": [{
            "points": [[cp0_x1, cp0_y1], [cp0_x2, cp0_y1], [cp0_x2, cp0_y2], [cp0_x1, cp0_y2]],
            "bottom": cp0_bottom,
            "height": 192,
            "teleDestPos": [cp0.center[0], cp0.center[1], cp0_bottom],
            "teleDestYaw": 90,
            "safeHeight": 0
        }]
    });

    for (const p of platforms) {
        if (p.label.startsWith("CP") && p.label !== "CP0_Start" && p.label !== `CP${numLegs}`) {
            const x1 = p.center[0] - p.size[0]/2;
            const x2 = p.center[0] + p.size[0]/2;
            const y1 = p.center[1] - p.size[1]/2;
            const y2 = p.center[1] + p.size[1]/2;
            const bottom = p.center[2] + p.size[2]/2;
            
            zoneCheckpoints.push({
                "regions": [{
                    "points": [[x1, y1], [x2, y1], [x2, y2], [x1, y2]],
                    "bottom": bottom,
                    "height": 192,
                    "teleDestPos": [p.center[0], p.center[1], bottom],
                    "teleDestYaw": 90,
                    "safeHeight": 0
                }]
            });
        }
    }

    const end_x1 = finalCP.center[0] - finalCP.size[0]/2;
    const end_x2 = finalCP.center[0] + finalCP.size[0]/2;
    const end_y1 = finalCP.center[1] - finalCP.size[1]/2;
    const end_y2 = finalCP.center[1] + finalCP.size[1]/2;
    const end_bottom = finalCP.center[2] + finalCP.size[2]/2;

    const zoneJson = {
        "formatVersion": 1,
        "dataTimestamp": Math.round(Date.now() / 1000),
        "maxVelocity": 0.0,
        "tracks": {
            "main": {
                "zones": {
                    "segments": [{
                        "limitStartGroundSpeed": false,
                        "checkpointsRequired": true,
                        "checkpointsOrdered": true,
                        "checkpoints": zoneCheckpoints
                    }],
                    "end": {
                        "regions": [{
                            "points": [[end_x1, end_y1], [end_x2, end_y1], [end_x2, end_y2], [end_x1, end_y2]],
                            "bottom": end_bottom,
                            "height": 192
                        }]
                    }
                },
                "stagesEndAtStageStarts": false,
                "bhopEnabled": false
            }
        },
        "globalRegions": {}
    };

    fs.writeFileSync(path.join(ENTRY_DIR, `${MAP_NAME}.json`), JSON.stringify(zoneJson, null, 4), 'utf8');
    console.log(`Generated ${MAP_NAME}.json`);

    // Emit route report (SPEC process rule 4)
    const netClimb = finalCP.center[2] - cp0.center[2];
    const xs = [];
    const ys = [];
    for (const j of jumps) {
        xs.push(j.from[0], j.to[0]);
        ys.push(j.from[1], j.to[1]);
    }
    const horizontalExtent = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
    const footprintRatio = horizontalExtent / netClimb;

    console.log("\n======= ROUTE REPORT =======");
    console.log(`Net Climb: ${netClimb} units`);
    console.log(`Horizontal Extent: ${horizontalExtent} units`);
    console.log(`Footprint Ratio: ${footprintRatio.toFixed(3)}x net climb (max allowed 1.5x)`);
    console.log(`Checkpoints: ${routeCheckpoints.length} (need >= 6)`);
    console.log(`Total Required Jumps: ${jumps.length} (need >= 36)`);
    
    // Per leg stats
    const perLegJumps = new Map();
    const perLegProps = new Map();
    for (const j of jumps) perLegJumps.set(j.leg, (perLegJumps.get(j.leg) || 0) + 1);
    for (const p of props) perLegProps.set(p.leg, (perLegProps.get(p.leg) || 0) + 1);

    for (let l = 1; l <= numLegs; l++) {
        console.log(`Leg ${l}: Jumps = ${perLegJumps.get(l) || 0} (need >= 6), Props = ${perLegProps.get(l) || 0} (need >= 8)`);
    }

    console.log("\nDifficulty Curve Percentages:");
    jumps.forEach((j) => {
        console.log(`Jump ${j.index} (Leg ${j.leg}): fraction = ${(j.fraction * 100).toFixed(1)}%, assumedSpeed = ${j.assumedSpeed}, dz = ${j.dz}, heading = ${j.heading}`);
    });

    const headingsStr = jumps.map(j => j.heading).join(", ");
    console.log(`Heading Sequence: ${headingsStr}`);
    console.log("============================\n");
}

run();
