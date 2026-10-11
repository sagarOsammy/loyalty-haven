# Asset provenance

All runtime models and textures are served locally. Original user references are preserved in `docs/reference-images/`.

| Runtime asset | Source | Transformation | Verification |
| --- | --- | --- | --- |
| Three Star Alliance aircraft | Original Blender procedural geometry, airline wordmark reference files retained under `asset-sources/aircraft/sources` | Detailed engines, fuselage, wings, small stabilizers, landing gear and curved panels, separate brand colors, batched by material | Offline render inspected, all six aircraft/luggage exports reimported in Blender |
| Hard shell case and cognac duffel | Original Blender geometry | Ribs, wheels, handles, seams and hardware, material batching | Offline renders and browser placement checked |
| Vintage suitcase | [Poly Haven vintage suitcase](https://polyhaven.com/a/vintage_suitcase), [CC0](https://polyhaven.com/license) | One case isolated, centered, grounded, 1 m high, derived 1K maps, 570292 bytes | Final render inspected and Blender reimport passed |
| Hangar, hotel modules, forum | Original Blender geometry guided by Gemini-4 | Runtime modules share dimensions, stone/teak microtextures packed into GLB, static parts batched | Revision-specific Blender render and browser check |
| Planter, baggage belt, yacht, retained original palm | Original Blender geometry | Pinnate palm fronds, modeled deck details and belt slats, material batching | Bounds and belt geometry reimport verified |
| Palm trees, local replacement on 10 October 2026 | User-supplied Tripo meshopt GLB, byte-identical source under `asset-sources/palms/source/` | Decode meshopt, uniformly fit six-metre base height, ground origin, add approved green foliage and brown trunk vertex colors. All 49,031 triangles retained. | All 12 placements render in the inbuilt browser, western crown clearance passes. See [local validation](palm-trees-20261010.md) |
| Sunset environment | [Poly Haven Belfast sunset pure sky](https://polyhaven.com/a/belfast_sunset_puresky), CC0 | Local 2K HDR, environment reflection prefiltering | Loads locally |
| Paving | [Poly Haven concrete pavement 02](https://polyhaven.com/a/concrete_pavement_02), CC0 | Local diffuse, normal and roughness maps | Applied in browser |
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
