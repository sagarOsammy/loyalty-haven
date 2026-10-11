# Teak waterfront boardwalk, stage 4 of 9

Local preview at http://localhost:5173/. Sammy accepted stage 3 lighting by requesting that work keep going. The boardwalk was accepted by Sammy's request to do steps 5 and 6 together with two parallel sub-agents. Publication requires separate acceptance.

## Appearance and fitting

The dedicated WaterfrontBoardwalk group spans x -49 to 44 and z -19.6 to -11.8, behind both buildings. Its surface is 0.015 metres above the ground. It contains 1,795 staggered teak boards, nominally 0.2 by 2.6 metres with 8 mm gaps, subtle randomized grain offsets and warm brown color variation. Three original 1024 by 2048 maps supply color, fine normal relief and roughness, totaling 660,642 bytes. Matte wood retains restrained highlights from the existing sunset and lamp lighting.

The rear and ends have 18 cm edging. The front trim is flush and leaves the full six-metre avenue entrance open. Existing palm roots sit in fitted soil wells with low timber collars. The end curb stops around the right waterfront planter. The camera fitting, buildings, ship, forum dimensions and palm coordinates are unchanged.

The former continuous rear planting strip is moved forward 1.2 metres, from z -17.8 to -16.6, and split around a 7.2-metre opening. This leaves a waterside walking aisle behind the strip. Side beds retain their original front edges and end at z -11.4, clearing the deck. Leaf counts follow retained bed area. The split adds one planter-edge light strip, now ten, while the 24 path lamps and twelve palm uplights retain their positions. Fixtures on the deck are grounded to its surface. A grid clearance check with a 0.5-metre walking radius verifies a continuous one-metre route from the avenue to both deck ends around palms and planting.

## Preservation and provenance

| Source | Destination | Transformation and evidence |
| --- | --- | --- |
| Supplied resort reference, preserved with existing references | `lib/scene/boardwalk.ts` and `boardwalk-layout.ts` | Authored deck, individual plank gaps and fitting around retained palms, inbuilt browser inspection |
| Original deterministic grain authoring | `public/assets/boardwalk-teak-*.jpg` | Reproducible `asset-sources/boardwalk/generate_teak.py`, seed 20261011, hashes in adjacent provenance JSON |
| Stage 3 landscape, geometry, lighting and world sources | `asset-sources/boardwalk/before/*.ts.txt` | Copies retained before edits, hashes recorded, original assets preserved |
| Existing planting layout | Shortened side beds and split rear planting | Front bed edges retained, explicit central access opening and deck clearances verified |

The pre-edit inventory classifies all 56,262 files, including ten system/incremental artifacts, one configuration file without reading contents, 973 version-control files, 378 active sources/assets, 161 generated files, nine reference files and 54,730 dependencies. All 28 original runtime hashes match the Git manifest. The regenerated audit covers 38 local assets and 23 self-contained GLBs. No external 3D model is required for the boardwalk.

## Verification

Inbuilt browser screenshots at 1140 by 998 desktop and 390 by 844 phone are retained in `outputs/boardwalk/`. The initial hot-update view requested maps before generation had finished. A fresh reload loads all three maps and confirms warm brown teak, with 59 textures before additional alliance/hotel assets load and no captured warning/error logs.

Star Alliance loads three aircraft, SkyTeam two and oneworld three. Accor constructs one terrace. Pause holds fountain phase at 9.012 across observations, resume advances it, and replay with active motion restarts aircraft at 0.001, 0.000, 0.000. Both Cinematic and Balanced render the boardwalk, planks and existing lighting. Phone viewport override is reset after inspection. Saved total remains 1,262,817 points. Live state and rendering samples are recorded in `outputs/boardwalk/verification.json`.

The same unselected desktop Cinematic view sampled 67 fps before the boardwalk and 62 to 63 fps after it. Representative frames without shadow updates increased from 850 to 916 calls and from 7,065,922 to 7,098,988 rendered triangles. These are indicative samples, with ship movement and periodic shadow refresh preventing a fixed-frame benchmark. The boards share one instanced draw batch, add three texture maps, and introduce no new lights, shadow maps or reflection passes.

Type checking, all 19 existing tests and the production build pass. The first test run exposed extensionless imports in the newly shared layout dependency, corrected to explicit TypeScript imports before the final checks. The existing production chunk-size advisory remains. Steps 5 and 6 are authorized locally, selected asset files are required before import. Publication remains pending separate acceptance.
