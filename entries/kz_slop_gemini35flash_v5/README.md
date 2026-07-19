# kz_slop_gemini35flash_v5

## Theme Statement
**Industrial Scaffold Ascent** is set inside a vertical maintenance and ventilation shaft of a large industrial complex. The map utilizes raw concrete floors, heavy brick walls, and metal scaffolding. The player climbs upward through a maze of pipes, steel trusses, and structural platforms, surrounded by the overcast sky visible through overhead vents.

## Course Overview
- **Type**: Single-track vertical climb tower.
- **Checkpoints**: 6 checkpoint floors spaced vertically by 600 units (7 legs total).
- **Required Jumps**: 42 jumps total (6 jumps per leg), ranging from easy warm-ups (fraction ~0.45) to the peak difficulty spike (fraction 0.82) at Jump 27, followed by immediate cool-off jumps.
- **Net Climb**: 4200 units (Start Z=0 to End Z=4200).
- **Extent**: Bounded horizontally within `[-512, 512]` in X/Y (horizontal extent ~1252u), yielding a footprint-to-climb ratio of 0.298x (well below the 1.5x limit).
- **Constructs Included**:
  1. **ladder section**: Vertical rusted ladders placed between Platforms 3 and 4 in each leg.
  2. **crouch tunnel**: A restricted clearance ceiling on Platform 2 of Leg 4.
  3. **corner jump**: 90-degree corner wraps around structural pillars on Leg 1 Platform 1 and Leg 5 Platform 1.
  4. **uphill hop chain**: Leg 6 features small, upward-stepping blocks rising at 40u per jump.
- **Catch Geometry**: Every fall is caught by either the previous leg's large checkpoint platform or the solid concrete floor at Z=-256 (which has a ladder leading back to the start zone), ensuring no player is ever stranded or killed.

## How to Build and Run
1. Run the generator script:
   ```bash
   node entries/kz_slop_gemini35flash_v5/generator.js
   ```
   This generates `kz_slop_gemini35flash_v5.vmf`, `kz_slop_gemini35flash_v5.json`, and `route.json`.
2. Compile the map BSP using vbsp, vvis, and vrad:
   ```bash
   "C:\Program Files (x86)\Steam\steamapps\common\Momentum Mod Playtest\bin\win64\vbsp.exe" -game "C:\Program Files (x86)\Steam\steamapps\common\Momentum Mod Playtest\momentum" entries/kz_slop_gemini35flash_v5/kz_slop_gemini35flash_v5.vmf
   "C:\Program Files (x86)\Steam\steamapps\common\Momentum Mod Playtest\bin\win64\vvis.exe" -game "C:\Program Files (x86)\Steam\steamapps\common\Momentum Mod Playtest\momentum" entries/kz_slop_gemini35flash_v5/kz_slop_gemini35flash_v5.bsp
   "C:\Program Files (x86)\Steam\steamapps\common\Momentum Mod Playtest\bin\win64\vrad.exe" -game "C:\Program Files (x86)\Steam\steamapps\common\Momentum Mod Playtest\momentum" entries/kz_slop_gemini35flash_v5/kz_slop_gemini35flash_v5.bsp
   ```
3. Copy the compiled map files into Momentum Mod:
   - `kz_slop_gemini35flash_v5.bsp` -> `<MOM>/momentum/maps/`
   - `kz_slop_gemini35flash_v5.json` -> `<MOM>/momentum/maps/zones/local/`
4. Validate the entry:
   ```bash
   node scripts/validate_entry.js entries/kz_slop_gemini35flash_v5
   ```
5. Launch the game:
   ```bash
   steam.exe -applaunch 1802710 -novid -windowed -w 1280 -h 720 -condebug +map kz_slop_gemini35flash_v5
   ```

## In-Game Verification
- **Verification Mode**: Fully verified in-game.
- **Results**: The map compiled clean, loaded successfully in Momentum Mod, and all start/checkpoint/end zones registered correctly as confirmed by `console.log`.

## Spec Feedback
1. **Zonemaker resolving behavior**: Zonemaker outputs `teleDestTargetname` in the zone JSON rather than resolving the teleport destination coordinates into `teleDestPos`. However, the validator script `validate_entry.js` strictly checks for `teleDestPos` on disk. To address this mismatch, we modified our generator script to output the zone JSON file directly with pre-resolved `teleDestPos` coordinates, bypasses zonemaker's limitations while maintaining perfect accuracy and compliance.
2. **Checkpoint entity indices**: Zonemaker considers `checkpoint_number` `"1"` on a `zone_timer_checkpoint` to be invalid because checkpoint index 1 is reserved for the start zone. The first actual checkpoint entity must be indexed starting at `"2"`. Additionally, a checkpoint entity requires `"stage_number" "1"` in a linear track to compile without errors.

## Interventions
- **Human Interventions**: None (0). This run was fully autonomous.
