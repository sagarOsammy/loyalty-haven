# Warm resort lighting, stage 3 of 9

Local review at http://localhost:5173/. Sammy accepted the revised stage 2 fountains by requesting that work move forward. Stage 3 was accepted by Sammy's request to keep going, authorizing the boardwalk. Publication remains a separate acceptance step.

## Appearance and layout

The supplied resort reference was inspected again for lamp shape, warm spill, tree uplighting and recessed edging. The dedicated `ResortLighting` group contains 24 short bronze lanterns, with frosted amber panels, 12 discreet palm uplight housings and nine narrow planter-edge strips. The existing two submerged fountain-rim strips remain in place. No additional 3D asset export is required.

The lanterns are 1.17 metres tall, with 0.38-metre square feet. Eight flank the central avenue, six sit beside the side gardens, four frame the forum, four flank the foreground beds, and two mark the waterfront corners. The avenue retains its full six-metre width. A footprint check confirms all 24 lamps clear the current hangar, hotel, baggage belts, nine planting beds and outer forum inlay. A rear corner lamp was moved clear of a bed during inspection. Existing camera fitting, architecture, ship, forum size and saved balances are retained.

## Sources and transformations

| Source | Destination | Transformation | Verification |
| --- | --- | --- | --- |
| Sammy's supplied resort image, preserved in the existing reference sources | `lib/scene/lighting.ts` | Original box/cylinder geometry, instanced by material, dedicated lighting group | Inbuilt desktop and phone inspection |
| Existing landscape and forum layout | 24 lamp coordinates, nine planter strips, twelve palm uplights | Explicit placements outside occupied footprints, narrow edging along inward-facing planter sides | Footprint and path-clearance check passed |
| Original palm GLB and materials | Runtime-only cloned palm materials | Local warm vertex illumination from each palm's uplight position, follows tree sway | Original asset hash unchanged, rendered trunks and crowns checked |
| Explicit path lamp coordinates | Runtime 1024 by 544 diffuse illumination atlas | Soft overlapping light falloff over a 160 by 85 metre world area, sampled independently of marble UVs | Warm light reaches marble and adjacent opaque surfaces without covering their texture |

The pre-implementation source inventory covers 56,245 files, including hidden/system artifacts, configuration classified without reading its contents, version-control metadata, source/assets, preserved references, generated files and dependencies. See the ignored inventory CSV and summary. All 28 original runtime asset hashes match the Git manifest. No original model, texture or supplied reference was changed. The asset audit still passes for 35 local assets and 23 self-contained GLBs.

## Rendering cost

The first implementation used 24 live point lights and sampled about 19 fps. The revised implementation keeps four live path lights around the forum and belts for specular response. All 24 lamps contribute soft diffuse illumination through the static atlas. Palm uplighting uses a local vertex field rather than twelve scene-wide spotlight loops. The four existing submerged fountain lights remain. No additional shadow maps or reflection passes were added.

The unselected 1280 by 720 desktop Cinematic baseline sampled 60 fps, 1,068 render calls and 8,541,821 triangles on a shadow-update frame. The revised same-size view sampled 60 fps. Representative shadow-update cost is 1,087 calls and 8,553,287 triangles, an increase of 19 calls and 11,466 triangles, approximately 0.13 percent. Frames without shadow updates report 850 calls and 7,065,922 triangles. Samples are indicative, with the moving ship and shadow-update scheduling preventing an exact fixed-frame benchmark. The light atlas adds one texture. The initial slow lighting version was replaced before this review.

## Verification

Desktop and 390 by 844 phone screenshots are retained in `outputs/warm-lighting/`, including the baseline. Both quality modes render the lamps and warm spill. Star Alliance and oneworld each load three aircraft, SkyTeam loads two, and Accor constructs one terrace. Pause holds fountain phase at 133.560 across observations. Resume advances it to 175.112, and replay restarts arrivals at 0.001, 0.000, 0.000 while the fountain keeps its current phase. The temporary phone viewport was reset. A fresh reload confirms scene-ready, 24 lamps, twelve uplights and no asset failures, with no captured warning/error logs since that reload. Type checks, all 19 existing tests and the final production build pass. The existing large-chunk advisory remains. The final live review uses Star Alliance, the unbuilt hotel frame, Cinematic quality and active motion. Verification data is retained in `outputs/warm-lighting/verification.json`.

Diffuse atlas lighting is intentionally approximate, with vertical attenuation and no new lamp shadow maps. This preserves smoothness while giving static surfaces local warm illumination. Existing sunlight shadows and underwater lighting remain active.
