# Asset palette — Tier 1 (benchmark-safe)

Everything listed here ships with Momentum Mod Playtest for **every player** via
`<MOM>\mount\hl2_dir.vpk` (HL2 base content) or loose files under
`<MOM>\momentum\materials\`. Use **only Tier 1** for scored entries.

Momentum's `gameinfo.txt` can also mount TF2, CS:GO, CS:S, and Portal 2 content
when those games are installed locally. That content is **Tier 2 — off limits**
for kz_slopfest entries. It is not guaranteed on every machine and breaks
comparability.

Pick **one coherent theme** from the starter kits below (or compose your own
palette from Tier 1). Mountain/grass/outdoor is fine — not required. State your
theme, material families, and prop vocabulary in `PLAN.md`.

## Skies (worldspawn `skyname`)

Shipped loose in `<MOM>\momentum\materials\skybox\` (always present):

| `skyname` | Mood |
|---|---|
| `sky_cape_hill` | Coastal hills, open blue |
| `sky_urb01` | Overcast urban |
| `mpa115` | Neutral outdoor |

Many HL2 skies also exist inside `hl2_dir.vpk` under `materials/skybox/` (e.g.
`sky_day02_03`, `sky_ep01_01`). Use the basename without the `_ft`/`_bk` suffix
in `worldspawn`. If a sky fails to load, fall back to `sky_cape_hill`.

## Materials — verified present in `hl2_dir.vpk`

Training data frequently hallucinates material names that **do not exist** in the
mounted VPK. The following were checked against the shipped archive.

**Known missing (do not use):** `nature/rockwall012a`

If vbsp or an in-game load warns on a material, swap it before shipping — note
the fix in your README **Spec feedback** section.

### Nature / outdoor

Floors and platforms:

- `nature/grassfloor002a`, `nature/grassfloor003a`
- `nature/dirtfloor003a`, `nature/dirtfloor006a`, `nature/dirtfloor008a`
- `nature/rockfloor002a`, `nature/rockfloor003a`, `nature/rockfloor006a`
- `nature/sandfloor005a`
- `nature/snowfloor002a`

Walls, cliffs, backdrop:

- `nature/rockwall006a`, `nature/rockwall006b`, `nature/rockwall007a`
- `nature/rockwall010b`, `nature/cliffface001a`, `nature/cliff02a`, `nature/cliff03b`

Blends (transitions, non-walkable shoulders OK):

- `nature/blenddirtgrass006a`, `nature/blendgrassdirt01`
- `nature/blendcliffsand01a`, `nature/blendgrassgravel01`
- `nature/blendconcretedirt001a`

### Urban / industrial

- **Concrete:** `concrete/concretefloor001a`, `concrete/concretefloor002a`,
  `concrete/concretewall010a`, `concrete/concretewall036a`
- **Metal:** `metal/metalfloor001a`, `metal/metalfloor003a`,
  `metal/metalwall021a`, `metal/metalwall032a`
- **Brick:** `brick/brickwall017a`, `brick/brickwall037a`, `brick/brickfloor001a`

### Wood / docks / interiors

- `wood/ep2_woodfloor01`, `wood/woodbeam001a`, `wood/woodfloor008a`
- `wood/woodwall019a`, `plaster/plasterwall021a`, `tile/tilefloor001a`

### Functional (small accents only)

- `dev/dev_measuregeneric01`, `dev/dev_measurewall01d` — finish beacons, zone
  markers (see SPEC.md; a dev-textured *map* scores 1 on aesthetics)
- `tools/toolsskybox`, `tools/toolsnodraw`, `tools/toolstrigger` — hull / triggers

Tier 1 contains **6,600+** other materials in `hl2_dir.vpk`. Anything in that
archive is legal; the lists above are **curated starters**, not an exhaustive
allowlist. When in doubt, prefer names from these kits or verify against the VPK
before committing geometry.

## Prop models (`prop_static` — decoration)

Use `prop_static` for non-gameplay scenery. Props must **not** block the required
route or create walkable bypasses. Prefer props on ledges, in void space, or
alongside the corridor — never on landing pads or in jump corridors (SPEC
requirement 11; a gen-4 entry shipped with props making four jumps impossible).

**⚠ Many "loose object" models are physics-only and silently fail as
`prop_static`.** vbsp reports `must be used on a dynamic entity (i.e.
prop_physics)` and **deletes them from the map**. Confirmed physics-only (do
not use as `prop_static`): `props_junk/wood_crate001a`,
`props_junk/metalbucket02a`, `props_junk/trashbin01a`,
`props_debris/concrete_chunk01a`, `props_debris/wood_chunk05b`,
`props_wasteland/barricade002a`, `props_c17/oildrum001`. The pattern (gen-4,
sonnet5): small pick-up-able junk ships physics-only; **structural and
architectural models — trusses, pipes, scaffolding, ladders, lamps, rocks,
trees, stalactites — are generally static-safe.** Probe-compile one instance of
every model in your palette before committing to it.

All paths below are under `models/` (omit `.mdl` in `model` key). Verified in
`hl2_dir.vpk`.

| Kit | Example models | Count in VPK |
|---|---|---|
| **Foliage / coast** | `props_foliage/tree_pine_01`, `props_foliage/rock_coast02d`, `props_foliage/driftwood_02a` | ~99 |
| **Wasteland junk** | `props_wasteland/boat_fishing02a`, `props_wasteland/light_spotlight01_base`, `props_wasteland/barricade002a` | ~290 |
| **City 17** | `props_c17/truss03b`, `props_c17/metalladder002b`, `props_c17/oildrum001` | ~263 |
| **Debris** | `props_debris/concrete_chunk01a`, `props_debris/rebar002d_96`, `props_debris/wood_chunk05b` | ~235 |
| **Pipes / industrial** | `props_pipes/concrete_pipe001a`, `props_pipes/pipeset08d_512_001a` | ~95 |
| **Mining / cave** | `props_mining/caverocks_cluster01`, `props_mining/stalactite_cluster02`, `props_mining/lamps01` | ~136 |
| **Train / canal** | `props_trainstation/ceiling_truss001a`, `props_canal/canal_bridge03a`, `props_canal/winch01` | ~99 / ~71 |
| **Docks** | `props_docks/dockpole01a`, `props_docks/channelmarker02a` | ~49 |
| **Rooftop** | `props_rooftop/scaffolding01a`, `props_rooftop/chimneypipe01a` | ~48 |
| **Junk scatter** | ⚠ mostly physics-only as `prop_static` — see warning above; probe-compile any candidate | ~129 |
| **Combine** (sci-fi industrial) | `props_combine/combineinnerwall001a`, `props_combine/pipes01_single02c` | ~236 |

## Theme starter kits (suggested palettes)

Mix materials + props + sky. These are **examples**, not assignments.

### Coastal / cliff (e.g. "Cape Ascent")

- Materials: `nature/rockwall006a`, `nature/dirtfloor006a`, `nature/sandfloor005a`,
  `nature/grassfloor003a`
- Props: `props_foliage/rock_coast02d`, `props_docks/dockpole01a`,
  `props_wasteland/boat_fishing02a`
- Sky: `sky_cape_hill`

### Urban decay

- Materials: `concrete/concretefloor001a`, `concrete/concretewall036a`,
  `metal/metalwall032a`, `brick/brickwall017a`
- Props: `props_c17/truss03b`, `props_rooftop/scaffolding01a`,
  `props_c17/metalladder002b`, `props_rooftop/chimneypipe01a`
- Sky: `sky_urb01` or `sky_day02_03`

### Industrial / combine

- Materials: `metal/metalfloor001a`, `metal/metalwall021a`, `concrete/concretefloor002a`
- Props: `props_pipes/concrete_pipe001a`, `props_combine/pipes01_single02c`,
  `props_mining/warehouse_truss01`
- Sky: `sky_urb01`

### Forest / canal

- Materials: `nature/blenddirtgrass006a`, `nature/dirtfloor003a`, `wood/woodbeam001a`
- Props: `props_foliage/tree_pine_01`, `props_foliage/forestrock_cluster02`,
  `props_canal/winch01`, `props_trainstation/tracksign02`
- Sky: `sky_cape_hill` or `mpa115`

### Mining / underground

- Materials: `nature/rockfloor006a`, `nature/rockwall010b`, `nature/dirtfloor_mine001a`
- Props: `props_mining/caverocks_cluster01`, `props_mining/stalactite_cluster02`,
  `props_mining/lamps01`
- Sky: `sky_cape_hill` (interior sections still need sealed skybox hull)

## Detail and polish (optional)

- `detail/detailsprites` on `worldspawn` — grass/detail overlay (already common in
  shipped maps)
- `light_environment` — one per map for outdoor scenes
- `env_fog_controller` — mood; keep subtle so the route stays readable

Displacements and complex terrain are legal but high-risk for vbsp leaks and
plane-winding bugs. Decorative displacements **off the required route** are
safer than walkable displacement ramps (which violate SPEC.md requirement 7).
