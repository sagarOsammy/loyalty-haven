# Marble floor, stage 1 of 9

Local preview: http://localhost:5173/. Publication and stage 2 await Sammy's acceptance of this stage.

## Changes

### Warm texture revision following local review

Sammy found the first tiles too white and insufficiently textured. Separate warm beige/taupe derivatives now add stronger slab variation, cloudy mineral deposits and more irregular veins. The warm ivory material tint, higher honed roughness and reduced clearcoat soften whitening from the environment. Slab scale, joints, inlay placement, camera and scene layout are retained.

The first three marble maps and their provenance remain preserved. Revised generation hashes are in `asset-sources/marble/provenance-warm.json`. The asset manifest now covers 34 assets, including the 22 self-contained GLBs. The three revised maps total 1,282,518 bytes, replacing the active first-version maps without increasing the runtime texture count or geometry.

The revised local desktop result was inspected in Cinematic and Balanced. Phone inspection at an observed 354 by 767 CSS-pixel viewport confirms visible paving and usable controls. The viewport override was reset. The scene reports ready, three completed Star Alliance arrivals and no asset failures. Captured browser warning/error logs are empty. Type check, all 19 tests, asset audit and production build passed. The existing build chunk-size advisory remains. New screenshots are `outputs/marble-floor/desktop-warm.jpg` and `outputs/marble-floor/phone-warm.jpg`.

Visual acceptance of the revised floor is pending. No later stage or publication has started.

### First implementation and validation history

- Replace the concrete material with an original 64-slab cream/beige marble atlas. Keep 1.5-metre slab scale consistent across plaza, avenue and forum forecourt through shared ground-coordinate UVs.
- Add taupe marble rings at radii 7.4–7.7 and 9.95–10.55 metres around the existing forum centre. Four 0.55-metre diagonal bands extend from the outer ring toward the plaza corners. Inlays sit 0.006 metres above the ground to avoid depth fighting and remain below the existing raised avenue and forecourt.
- Use non-metallic physical materials with subtle clearcoat and roughness variation for soft sunset/environment highlights. Existing camera, buildings, forum dimensions, ship, planting and personal balances remain unchanged.

## Preservation and provenance

The pre-change full source inventory covers 56,152 files, including 10 system/incremental artifacts, 1 configuration file without reading secrets, 894 version-control items, 328 active source/assets, 182 generated artifacts, 9 preserved references and 54,728 dependency files. Local inventory outputs are ignored by Git.

Original concrete JPEGs remain in place with their recorded hashes unchanged. New generation source is in `asset-sources/marble/`, with exact generated-map hashes in its `provenance.json`. The runtime asset manifest includes all 31 assets and verifies the 22 GLBs retain self-contained dependencies.

## Validation

Type check, all 19 existing tests and the final production build passed. The build reports its existing large-chunk advisory.

- Desktop inspection confirms visible cream/beige slab variation, soft highlights, both circular bands and four aligned diagonal bands. The final reference-comparable screenshot uses Star Alliance with the hotel unselected. Construction was separately checked with the hotel selected.
- Phone inspection at an observed 341 by 767 CSS-pixel viewport confirms the marble remains rendered, controls are usable and the existing responsive composition is retained. Temporary viewport settings were restored.
- All three alliance switches passed, with 3 Star Alliance, 2 SkyTeam and 3 oneworld aircraft loaded without asset failures. Hotel selection creates one terrace. Replay restarted aircraft progress at 0.003, 0.000, 0.000. Explicit pause held animation phase at 61.989 across observations. Both Cinematic and Balanced render the paving.
- Browser scene-ready is true, asset failures are empty, and captured warning/error logs are empty. Screenshots are retained locally at `outputs/marble-floor/desktop.jpg` and `outputs/marble-floor/phone.jpg`.
- In the same unselected desktop Cinematic composition, sampled render calls changed from 1021 to 1038 and drawn triangles from 8,502,625 to 8,503,759. Sampled frame rate was 37 before and 53 after, with 60 sampled later in the selected scene. These single samples are indicative, not a controlled performance benchmark.
- All 28 original runtime asset hashes match the pre-change Git manifest. The only runtime asset additions are the three marble maps, totaling 875,955 bytes.

Visual acceptance remains with Sammy. Full lighting and furnishings are later stages.
