# PLAN

## Theme pitch
The fantasy of this climb is an ascent up a towering, abandoned urban high-rise ruin. The player scales broken concrete floors, rusted scaffolding, and exposed pipes to reach the very top of the dilapidated structure.

## Asset palette
- Materials: `concrete/concretefloor001a`, `concrete/concretewall036a`, `metal/metalwall032a`, `brick/brickwall017a`
- Props: `props_c17/truss03b`, `props_rooftop/scaffolding01a`, `props_c17/metalladder002b`, `props_rooftop/chimneypipe01a`
- Sky: `sky_urb01`

## Structure sketch
The building is a vertical stack of 6 main floors (checkpoint regions), separated by large gaps and structural beams. The player climbs up the interior and exterior faces of the structure, using scaffolding and concrete platforms to progress. The floors are stacked with roughly 768-960 units of vertical spacing. Each floor covers a wide footprint to serve as catch geometry.

## Difficulty curve
- **Leg 1-2**: Warm-up, mostly simple jumps at 50-65% budget.
- **Leg 3-4**: Rising difficulty, culminating in the peak difficulty jump (~85% budget) around 60% of the way through.
- **Leg 5**: Cool-offs after the hard jumps, maintaining moderate difficulty.
- **Leg 6**: Victory lap, easier jumps leading to the top, allowing the player to flow to the finish while enjoying the view.

## Constructs
- **Corner jump**: Around broken concrete pillars to turn raw gaps into rhythm.
- **Ladder section**: Scaling an exterior rusted ladder to transition between floors.
- **Drop-jump**: Dropping down onto a lower pipe before springing to a higher platform.

## Per-leg fun hook
- **Leg 1**: The foundation, getting comfortable with the urban aesthetic and basic gaps.
- **Leg 2**: Scaffold climbing and corner jumps around exposed pillars.
- **Leg 3**: Tricky exterior navigation including a ladder section.
- **Leg 4**: The peak of the climb, demanding a precise drop-jump and focus.
- **Leg 5**: Scaling rooftop structures and chimney pipes.
- **Leg 6**: A breezy victory lap high above the city, offering a great view down to the lower floors.

## Verification plan
1. Generate and compile a minimal two-platform probe map (walking skeleton) with vbsp, vvis, vrad, and zonemaker.
2. Verify the probe map loads in-game without crashes.
3. Build the full map generator and check output against `validate_entry.js`.
4. Compile the full map and verify the timer and checkpoints work in-game.
