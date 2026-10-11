# Asset provenance

All runtime models and textures are served locally. Original user references are preserved in `docs/reference-images/`.

| Runtime asset | Source | Transformation | Verification |
| --- | --- | --- | --- |
| Three Star Alliance aircraft | Original Blender procedural geometry, airline wordmark reference files retained under `asset-sources/aircraft/sources` | Detailed engines, fuselage, wings, small stabilizers, landing gear and curved panels, separate brand colors, batched by material | Offline render inspected, all six aircraft/luggage exports reimported in Blender |
| Hard shell case and cognac duffel | Original Blender geometry | Ribs, wheels, handles, seams and hardware, material batching | Offline renders and browser placement checked |
| Vintage suitcase | [Poly Haven vintage suitcase](https://polyhaven.com/a/vintage_suitcase), [CC0](https://polyhaven.com/license) | One case isolated, centered, grounded, 1 m high, derived 1K maps, 570292 bytes | Final render inspected and Blender reimport passed |
| Hangar, hotel modules, forum | Original Blender geometry guided by Gemini-4 | Runtime modules share dimensions, stone/teak microtextures packed into GLB, static parts batched | Revision-specific Blender render and browser check |
| Fountain-ready forum and fitted basins | Preserved original `public/assets/forum.glb`, authored basin geometry and existing water-normal texture | Separate GLB removes only 28 stage/seating/obsolete entrance parts, retains columns and arches, batches retained architecture. Revised dedicated runtime water, 59 upright jets, falling spray, irregular foam and submerged warm lighting, first-review effect source retained | Source hash unchanged, ten pillars asserted retained, inbuilt desktop/phone and pixel-identical paused crops checked. See [local validation](forum-fountains-20261011.md). Revised local result accepted |
| Warm resort lighting | Original runtime geometry guided by Sammy's supplied reference, existing landscape coordinates | 24 instanced bronze path lamps, 12 palm uplights, nine recessed planter strips at the stage 3 checkpoint, static diffuse light atlas and four live path lights, dedicated scene group | Original model and texture hashes unchanged, footprint clearance passed, inbuilt desktop/phone inspection. See [local validation](warm-lighting-20261011.md). Accepted locally |
| Teak waterfront boardwalk | Original runtime geometry and deterministic teak texture generator, guided by Sammy's supplied reference | 1,795 staggered instanced planks, low edging, fitted tree and planter openings, three separate PBR maps. Rear planting split and side beds shortened to connect the avenue | Original 28 asset hashes unchanged, one-metre walking route verified to both deck ends, inbuilt desktop/phone and control checks passed. See [local validation](boardwalk-20261011.md). Accepted locally, Sammy authorized steps 5 and 6 together |
| Planter, baggage belt, yacht, retained original palm | Original Blender geometry | Pinnate palm fronds, modeled deck details and belt slats, material batching | Bounds and belt geometry reimport verified |
| Palm trees, local replacement on 10 October 2026 | User-supplied Tripo meshopt GLB, byte-identical source under `asset-sources/palms/source/` | Decode meshopt, uniformly fit six-metre base height, ground origin, add approved green foliage and brown trunk vertex colors. All 49,031 triangles retained. | All 12 placements render in the inbuilt browser, western crown clearance passes. See [local validation](palm-trees-20261010.md) |
| Sunset environment | [Poly Haven Belfast sunset pure sky](https://polyhaven.com/a/belfast_sunset_puresky), CC0 | Local 2K HDR, environment reflection prefiltering | Loads locally |
| Former concrete paving, retained source | [Poly Haven concrete pavement 02](https://polyhaven.com/a/concrete_pavement_02), CC0 | Local diffuse, normal and roughness maps preserved unchanged | Previously applied in browser, superseded locally by marble on 11 October 2026 |
| Resort marble paving | Original deterministic texture generation, guided by Sammy's supplied reference and feedback | Separate revised 2048px warm beige/taupe atlas with cloudy mineral deposits, normal and roughness maps. First pale maps retained. Shared ground-aligned UVs, dark circular and diagonal inlays | Local browser verification recorded in [marble-floor-20261011.md](marble-floor-20261011.md), user visual acceptance pending |
| Sand texture source | [Poly Haven coast sand 01](https://polyhaven.com/a/coast_sand_01), CC0 | Local maps retained, currently unused by the scene | Not loaded by runtime |
| Water normal | [Three.js examples](https://github.com/mrdoob/three.js/blob/dev/examples/textures/waternormals.jpg), Three.js MIT distribution | Local copy used by sea reflection and animated pool normals | Applied in browser |
| Fonts | Manrope, Google Fonts distribution | Locally hosted TTF files, prior serif files retained as unused sources | Font loading precedes 3D label generation |
| Telescope | User-supplied Tripo free text-to-3D export, original GLB retained at repository root | 12 percent mesh decimation, embedded textures reduced to 1K, 1,556,720-byte runtime copy | Blender render and browser placement inspected, original hash verified in adjacent provenance |
| Cruise ship, local replacement on 10 October 2026 | User-supplied Tripo FBX, byte-identical copy under `asset-sources/cruise-ship/source/` | All 52,138 triangles retained, uniform reference-length fit, reference draft fraction, matching bow direction, 2048px embedded PBR maps | Inbuilt browser rendering, pause/resume and replay passed, source and prior model hashes verified. See [local validation](cruise-ship-20261010.md) |

## 14 September detailing derivatives

At the 14 September checkpoint, the loader selected `airline-united-detail.glb`, `airline-avianca-detail.glb`, `airline-air-canada-detail.glb`, and `hotel-base-detail.glb`, `hotel-level-detail.glb`, `hotel-roof-detail.glb`. Their previous runtime files remain untouched for source preservation.

- Aircraft: narrower fuselage profiles with unchanged length and span, more swept and tapered wing tips, forward upper cockpit glazing, lighter door panels, relocated antenna and navigation-light attachments. Original engines, landing gear and livery references remain. Blender mesh validation is applied before export. Exported United model rendered for inspection, all three loaded in the browser.
- Hotels: embedded base-color, roughness and normal maps for travertine, teak, glass, textiles and other surfaces. Geometry, triangle counts and module dimensions verified by GLB reimport. Non-color image initialization and tangent-normal encoding were corrected before the final exports. Runtime keeps economical alpha glazing and animated pool normals rather than offline transmission.
- Reproducible derivative scripts and source/output hashes live in `asset-sources/detailing/`. All prior Blender files and generators are preserved.

## 15 September aircraft realism derivatives

Sammy chose to refine existing aircraft before expanding alliance coverage. The active loader now selects `airline-united-realism.glb`, `airline-avianca-realism.glb` and `airline-air-canada-realism.glb`. Both previous generations remain preserved. Hotel and telescope selections are unchanged.

- New geometry includes a smooth narrower cabin and radome, flush wordmarks fitted to the fuselage, six cockpit panes, oval cabin windows, fine door joints, swept thin airfoils and stabilizers, recessed 24-blade engine fans and paired landing wheels with braces.
- All variants have matching exported bounds, approximately 11.576 × 3.539 × 12.040 in glTF axis order. Aircraft length and scene transforms are retained. The wingtip thickness adds about 0.016 to the previous span and the redesigned tail is lower. Current triangle counts are 45,116 to 46,256, with 12 or 13 material primitives per aircraft.
- Editable Blender source, reproducible generator, two reimported-model review renders and output hashes are retained in `asset-sources/aircraft-realism/`. The original generator and wordmark sources remain untouched.

## Fidelity and rights notes

Aircraft are authored approximations, with simplified cockpit and tail graphics. The UNITED reference is the 1998 wordmark source, so exact current airline branding has not been established. They are not scans or engineering-accurate replicas. Wordmark references retain their original source files and provenance. Airline trademarks remain with their owners.

Architecture, foliage, belt and yacht materials combine geometry with ordinary PBR parameters. Stone and teak microtextures are small procedural maps. The paving and vintage case use photographic source maps. These differences matter when assessing the requested photoreal fidelity.

The Tripo experiment was text-to-3D. An image-to-3D trial remains unperformed. The [free-plan pricing](https://www.tripo3d.ai/pricing) was checked on 14 September 2026 and describes public models for noncommercial use. The [help center](https://www.tripo3d.ai/help/privacy-policy/how-to-use-tripo-models-commercially) reserves commercial use for paid plans. Keep the noncommercial scope and source attribution.

## Editable sources

`asset-sources/aircraft`, `asset-sources/environment` and `asset-sources/architecture` contain the build scripts, Blender files and original provenance. Scripts accept output overrides and resolve their default paths relative to their location. No MCP service or paid model provider is required to regenerate the Blender assets.

`docs/asset-manifest.json` records runtime file hashes, byte sizes and GLB structure. Provenance from the worker folders preserves the original generation paths as evidence, the copied bundles are the durable editable destination.

## 15–16 September alliance expansion

Five new runtime models reuse the approved realism component geometry for Virgin Atlantic, Vietnam Airlines, Finnair, Qatar Airways and British Airways. Airline-specific paint and projected text distinguish each model. Simple tail initials are authored identifiers, not official logos. These remain generic airliner approximations. Previous models and original generators remain unchanged.

`asset-sources/alliance-expansion/` retains the reproducible builder, editable Blender components, five reimported-model renders and source/output hashes. Broad identity references and approximation limits are linked in its README. Browser model click-throughs, arrivals, repeated alliance switching, saved totals and final asset loading were verified. The scene fetches new aircraft when their alliance is first selected.

## Runtime cleanup, 11 October 2026

28 superseded models, textures and fonts totaling 39,758,748 bytes were relocated from public into `asset-sources/retired-runtime/`. The [relocation manifest](../asset-sources/retired-runtime/manifest.json) records original labels, current paths, byte counts and unchanged SHA-256 hashes. All active application and test references were checked before relocation. The affected authoring scripts now read their archived inputs. Historical provenance paths below describe the original generation checkpoints. Current runtime assets are listed in the regenerated asset manifest, 28 files including 22 self-contained GLBs. User reference images, the supplied root telescope, editable source bundles and saved personal data are preserved.

## Selected cabana and foliage, 11 October 2026

Sammy supplied `tripo_pbr_model_4566ecd8-8750-4ee0-867c-b3a537a87952.fbx` for cabanas and `tripo_pbr_model_eb306993-5625-4ea7-9c99-72459090b411.fbx` for foliage. The selected cabana differs from the earlier suggested model, so its source URL is not inferred. Byte-identical FBXs are retained in `asset-sources/cabanas/source/` and `asset-sources/layered-planting/source/`. Source inspection, conversion scripts, hashes, normalized bounds, texture transformations and offline previews live alongside them.

Runtime derivatives are `cabana-tripo.glb`, `tropical-foliage-tripo.glb` and `accent-planter-tripo.glb`. The planter derivative retains one original ivory container, soil and brass rims from `planter.glb` with the selected foliage. Cabanas retain 34,974 triangles and 43,021 exported vertices. Foliage retains 11,796 triangles and 16,432 exported vertices. The assembled planter retains 15,554 triangles and 18,315 exported vertices. Export vertex counts include UV and material seam expansion. Cabana color maps are limited to 2048 pixels, supporting maps and foliage maps to 1024 pixels, all embedded. Runtime foliage materials receive a deeper green tint while original maps remain unchanged. Repeated plant geometry and materials share instanced batches. No additional lights or reflection passes were added.

Dedicated scene groups hold six cabanas, twelve new accent planters and ten bed foliage clusters. Current building positions, camera, forum scale, ship and original seven planter groups and twelve palms are retained. Verification is local, publication requires a separate acceptance step.

## Selected flowering trees, benches and combined patio, 11 October 2026

Sammy supplied flower.glb, bench.glb and patio.glb. Byte-identical source copies are preserved in their respective asset-sources folders. Separate runtime derivatives contain 25,165 vertices and 30,246 triangles for the tree, 33,544 vertices and 19,999 triangles for the bench, and 51,346 vertices and 50,000 triangles for the complete patio. Geometry and maps are shared across six trees, four benches and four patio sets. Each patio retains its supplied four chairs. Trees have separate low pale-stone planting wells and warm uplights. Original scene asset hashes and personal balances are preserved. Source links, transformations, actual embedded image dimensions, screenshots, control checks and performance evidence are recorded in [finishing-steps-20261011.md](finishing-steps-20261011.md). Local acceptance and publication remain separate.
