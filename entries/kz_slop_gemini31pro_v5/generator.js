const fs = require('fs');

const MAP_NAME = 'kz_slop_gemini31pro_v5_probe';

let entityIdCounter = 1;
let solidIdCounter = 1;

function nextId() { return entityIdCounter++; }
function nextSolidId() { return solidIdCounter++; }

function createSolid(x1, y1, z1, x2, y2, z2, matTop, matOther, isZone = false) {
    const id = nextSolidId();
    
    // Top (+z)
    const fTop = `(${x1} ${y2} ${z2}) (${x2} ${y2} ${z2}) (${x2} ${y1} ${z2})`;
    const vpTop = isZone ? `vertices_plus { "v" "${x1} ${y2} ${z2}" "v" "${x2} ${y2} ${z2}" "v" "${x2} ${y1} ${z2}" "v" "${x1} ${y1} ${z2}" }` : "";
    
    // Bottom (-z)
    const fBot = `(${x1} ${y1} ${z1}) (${x2} ${y1} ${z1}) (${x2} ${y2} ${z1})`;
    const vpBot = isZone ? `vertices_plus { "v" "${x1} ${y1} ${z1}" "v" "${x2} ${y1} ${z1}" "v" "${x2} ${y2} ${z1}" "v" "${x1} ${y2} ${z1}" }` : "";

    // North (+y)
    const fNorth = `(${x1} ${y2} ${z1}) (${x2} ${y2} ${z1}) (${x2} ${y2} ${z2})`;
    const vpNorth = isZone ? `vertices_plus { "v" "${x1} ${y2} ${z1}" "v" "${x2} ${y2} ${z1}" "v" "${x2} ${y2} ${z2}" "v" "${x1} ${y2} ${z2}" }` : "";

    // South (-y)
    const fSouth = `(${x1} ${y1} ${z2}) (${x2} ${y1} ${z2}) (${x1} ${y1} ${z1})`;
    const vpSouth = isZone ? `vertices_plus { "v" "${x1} ${y1} ${z2}" "v" "${x2} ${y1} ${z2}" "v" "${x2} ${y1} ${z1}" "v" "${x1} ${y1} ${z1}" }` : "";

    // East (+x)
    const fEast = `(${x2} ${y1} ${z2}) (${x2} ${y2} ${z2}) (${x2} ${y2} ${z1})`;
    const vpEast = isZone ? `vertices_plus { "v" "${x2} ${y1} ${z2}" "v" "${x2} ${y2} ${z2}" "v" "${x2} ${y2} ${z1}" "v" "${x2} ${y1} ${z1}" }` : "";

    // West (-x)
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

function makeSkybox(r, hTop, hBot) {
    const mat = "tools/toolsskybox";
    const t = 32;
    let solids = [];
    solids.push(createSolid(-r, -r, hBot-t, r, r, hBot, mat, mat));
    solids.push(createSolid(-r, -r, hTop, r, r, hTop+t, mat, mat));
    solids.push(createSolid(-r, r, hBot, r, r+t, hTop, mat, mat));
    solids.push(createSolid(-r, -r-t, hBot, r, -r, hTop, mat, mat));
    solids.push(createSolid(r, -r, hBot, r+t, r, hTop, mat, mat));
    solids.push(createSolid(-r-t, -r, hBot, -r, r, hTop, mat, mat));
    return solids.join('\n');
}

function generateProbe() {
    let entities = [];
    
    // World
    const skybox = makeSkybox(1024, 1024, -1024);
    const plat1 = createSolid(-96, -96, -16, 96, 96, 0, "concrete/concretefloor002a", "concrete/concretewall036a");
    const plat2 = createSolid(128, -96, -16, 320, 96, 0, "concrete/concretefloor002a", "concrete/concretewall036a");
    
    entities.push(`world
    {
        "id" "${nextId()}"
        "mapversion" "1"
        "classname" "worldspawn"
        "skyname" "sky_urb01"
        ${skybox}
        ${plat1}
        ${plat2}
    }`);

    // Player start
    entities.push(`entity
    {
        "id" "${nextId()}"
        "classname" "info_player_start"
        "origin" "0 0 16"
        "angles" "0 0 0"
    }`);

    // Light
    entities.push(`entity
    {
        "id" "${nextId()}"
        "classname" "light_environment"
        "origin" "0 0 256"
        "angles" "-90 0 0"
        "_light" "255 255 255 200"
        "_ambient" "128 128 128 100"
        "pitch" "-90"
    }`);

    // Teleport dest
    entities.push(`entity
    {
        "id" "${nextId()}"
        "classname" "info_teleport_destination"
        "targetname" "start_dest"
        "origin" "0 0 16"
        "angles" "0 0 0"
    }`);
    
    // Start Zone
    const startZoneBrush = createSolid(-96, -96, 0, 96, 96, 128, "tools/toolstrigger", "tools/toolstrigger", true);
    entities.push(`entity
    {
        "id" "${nextId()}"
        "classname" "zone_timer_start"
        "track_number" "0"
        "safe_height" "0"
        "restart_destination" "start_dest"
        "checkpoints_ordered" "1"
        ${startZoneBrush}
    }`);

    // End Zone
    const endZoneBrush = createSolid(128, -96, 0, 320, 96, 128, "tools/toolstrigger", "tools/toolstrigger", true);
    entities.push(`entity
    {
        "id" "${nextId()}"
        "classname" "zone_timer_end"
        "track_number" "0"
        ${endZoneBrush}
    }`);

    const vmf = entities.join('\n');
    fs.writeFileSync(`${MAP_NAME}.vmf`, vmf);
}

generateProbe();
