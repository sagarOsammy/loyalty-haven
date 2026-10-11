# Visual refresh, 10 October 2026

## Changes

- Manrope replaces the serif in the main heading, points total and Your passport to more button. Existing text and balances are unchanged.
- Aircraft retain the original curved descent from above the sea and cruise ship into the rear of the hangar, with the original 4.8-second duration, 0.8-second stagger, banking and parking positions. The original dark brown rear gates and lower wall backings retract together before entry and close after the last aircraft passes. Pause and replay share the same scene clock. This corrects the earlier front-entry interpretation.
- Large scene plaques use stronger Manrope lettering, higher-resolution textures and a separate pass after depth of field, before SMAA and tone mapping. Smaller moving labels retain normal occlusion. Render resolution increases within a four-million-pixel budget.
- Eight new fleet GLBs add distinct proportions, authored tail motifs, wing spoiler panels, fairings, spinner spirals, access panels, exits, tyre grooves, probes and radomes. All previous models, generators and authoring files are preserved.

## Provenance and verification

Source and runtime hashes: `asset-sources/aircraft-realism/fleet-provenance.json`. Serialized bounds and triangles: `fleet-verification.json` in the same folder. All eight GLBs reimport successfully. Editable Blender files and a reimported United studio render are retained beside the generator. These are detailed authored models with approximate airline cues, not exact aircraft replicas or official liveries.

Local checks: TypeScript passes, six tests pass, including all three bay paths sampled every 10 milliseconds. Asset audit passes for 47 assets and 39 self-contained GLBs, including the additive rear-gate hangar derivative. All eight source and new-runtime hashes match. Browser checks confirm all three alliances, Manrope in all three requested UI areas, correct Avianca balance interaction, pause/replay, and no captured warnings/errors or asset failures. The active wide-desktop sample reports 60 fps. This is a desktop observation, physical-phone testing remains deferred.

Publication uses a clean checkout of Sites version 8 plus only this visual update. Pre-existing local documentation edits and deletions are excluded from this release. Current Site access was verified owner-only before publication. Personal data and private API code are unchanged.

## Rear-gate correction

The original hangar GLB remains unchanged. The derivative `public/assets/hangar-rear-gates.glb` retains original materials, textures and architecture, separates the existing three dark panels and six jambs into named gate groups, and divides the lower back-wall backing into retractable sections. Source hash and output hash are in `asset-sources/architecture/rear-gates-provenance.json`, with an editable Blender derivative and a reproducible generator alongside it. All rear gates open together to clear the original diagonal approach across adjacent bays. The added front shutters are removed from runtime.

Current verification: six tests pass, including every aircraft crossing the rear entrance sampled every 10 milliseconds. TypeScript passes. Local browser screenshots show planes descending past the cruise ship with all rear gates open, and pause preserves the open-gate state. The existing detailed fleet models, Manrope and sharp plaque rendering are retained.

Deployment succeeded on 10 October 2026 at https://my-loyalty-haven.solar-rhea-5542.chatgpt.site. Published source commit: `b028584b6f2bd61e7cd751672338e9d206e2b5e4`. Production readback confirms all three requested Manrope fonts, scene readiness, zero asset failures, and all three doors fully open during arrivals.

Rear-gate correction published successfully as Sites version `appgprj_6aa2610840a481919bc36f79be09b8ec~appgver_bba0751a8cf48191ae4b6cfca199161a`, deployment `appgdep_6aca402efcd08191b07d10ac71f16728`, source commit `b429621b89387d6fcc14d85354120a77f345942c`. Live browser verification confirms the restored direction, three aircraft, rear gates fully open during descent, rear gates closed after parking, working pause and resume, and no captured errors or asset failures. Screenshot: `/private/tmp/loyalty-haven-restored-rear-approach.png`.
