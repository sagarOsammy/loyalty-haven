# Layered planting preparation, stage 6 of 9

Stage 6 is prepared for local review with the selected foliage derivatives. The reference image was inspected at `/var/folders/7t/0_hkzn095vqbj1pj6m0vqs5w0000gn/T/codex-clipboard-3b0c0bc6-9a68-445f-bf19-2b880641ed7f.png`. It concentrates fuller tropical planting around the forum, building corners and waterfront edges, with broad leaves at varied heights while preserving the central avenue and sign sightlines.

## Scope and source inventory

| Item | Classification | Use and preservation |
| --- | --- | --- |
| `lib/scene/planting-layout.ts` | New scene layout source | Twelve accent containers, ten optional bed accents, fit envelopes and collision checks |
| `lib/scene/layered-planting.ts` | New scene import adapter | Accepts selected imported callbacks, grounds and bounds clones, keeps AssetPool ownership with the caller |
| `public/assets/planter.glb` | Existing runtime GLB | Reusable provisional container source, unchanged, 564,984 bytes, SHA-256 recorded in `asset-sources/layered-planting/provenance.json` |
| `asset-sources/environment/build_assets.py` | Existing generator | Read-only source for the original planter cluster, unchanged |
| `asset-sources/environment/loyalty_v2_assets.blend` | Existing Blender source | Preserved original, not rewritten or copied |
| `asset-sources/environment/provenance.json` | Existing provenance | Read-only bounds and generation evidence |
| `lib/scene/landscape.ts` | Existing scene layout | Read-only bed and retained planter coordinates |
| `lib/scene/boardwalk-layout.ts` | Existing scene layout | Read-only deck envelope, used to prevent waterfront collisions |
| `asset-sources/layered-planting/before/landscape.ts.txt` | Preserved pre-stage-6 backup | Source snapshot retained before planting integration |
| `asset-sources/layered-planting/before/geometry.ts.txt` | Preserved pre-stage-6 backup | Source snapshot retained before planting integration |
| `asset-sources/layered-planting/before/lighting.ts.txt` | Preserved pre-stage-6 backup | Source snapshot retained before parent-side import-path preparation |
| `asset-sources/layered-planting/source/tripo_pbr_model_eb306993-5625-4ea7-9c99-72459090b411.fbx` | User-provided selected Tripo export | Preserved byte-for-byte, SHA-256 `27176d4c380652c0732a5017439a7f16835c8bc484ba303ee32a83e189cd0b51` |
| `asset-sources/layered-planting/build_selected_assets.py` | Blender derivative builder | Partitions, grounds, budgets and exports selected foliage derivatives |
| `asset-sources/layered-planting/inspect_selected_fbx.py` | Blender inspection utility | Records source mesh, material, texture and bounds evidence |
| `asset-sources/layered-planting/render_selected_foliage.py` | Blender preview utility | Renders FBX or GLB foliage for offline visual QA |
| `asset-sources/layered-planting/render_planter.py` | Blender preview utility | Renders retained and derived planter assemblies |
| `asset-sources/layered-planting/split_selected_foliage.py` | Blender inspection utility | Records disconnected source foliage components |
| `asset-sources/layered-planting/split_planter_container.py` | Blender inspection utility | Records retained brass rim components before filtering |
| `asset-sources/layered-planting/export_probe.py` | Blender axis probe | Confirms FBX to GLB Y-up conversion, no runtime dependency |
| `asset-sources/layered-planting/selected-asset-stats.json` | Runtime derivative stats | Hashes, bounds, triangle counts and texture dimensions |
| `asset-sources/layered-planting/previews/selected-foliage-source.png` | Offline source render | Visual inspection of the two disconnected source clusters |
| `asset-sources/layered-planting/previews/tropical-foliage-derivative.png` | Offline runtime render | Visual inspection of the normalized foliage-only GLB |
| `asset-sources/layered-planting/previews/accent-planter-derivative.png` | Offline runtime render | Visual inspection of the container and selected foliage assembly |
| `asset-sources/layered-planting/previews/existing-planter-containers.png` | Offline source render | Visual inspection of retained container geometry with original leaf meshes hidden |
| `public/assets/tropical-foliage-tripo.glb` | Runtime foliage derivative | Selected monstera and fern, normalized to 2 metres, 11,796 triangles, three embedded runtime images |
| `public/assets/accent-planter-tripo.glb` | Runtime accent-planter derivative | Largest ivory pot, matching soil and low brass rims from the retained planter source plus selected foliage, 15,554 triangles |
| `public/assets/palm-tripo.glb` | Existing runtime GLB | Read-only palm reference for spacing checks |
| `docs/reference-images/.DS_Store` | System metadata | Classified and excluded from content or runtime use |
| `asset-sources/.DS_Store` | System metadata | Classified and excluded from content or runtime use |
| `asset-sources/layered-planting/__pycache__/*.pyc` | Generated Python bytecode cache | Local inspection cache, excluded from runtime and provenance |
| Supplied reference image | User reference | Inspected visually, source preserved at the supplied temporary path |

The selected local FBX contains one mesh with two major disconnected components, a broad split-leaf cluster and a finer fern cluster. Blender inspection recorded 13,668 vertices, 13,344 polygons, 26,483 triangles and four packed 4096 by 4096 source maps, Color, Roughness, Metallic and Normal. The local export was supplied directly, its Tripo URL was not inferred from the candidate links.

The builder assigns detached minor components to the nearest major cluster, rotates the FBX into Blender Z-up for authoring, grounds each cluster, places the two clusters side by side, and decimates the combined foliage to 11,796 triangles. Runtime maps are embedded at 1024 pixels maximum. The foliage-only derivative is normalized to 2 metres high. The accent-planter derivative is normalized to 2.00959 metres high and retains the largest ivory pot, its matching soil and low brass rims from `public/assets/planter.glb`, excluding the two smaller empty pots and all original leaf meshes.

## Layout

`ACCENT_PLANTER_PLACEMENTS` contains twelve additions, four around the forum outer accent band and eight at the outside corners of the hangar and hotel. Their reserved footprints are at least 0.35 metres clear of the six metre avenue, the 1,795-plank boardwalk, the two building envelopes, baggage belts, existing planting beds, existing planters and each other. Forum placements sit 9.1 to 11.4 metres from the forum centre, outside the fountain coping while keeping the plaque readable.

`BED_ACCENT_PLACEMENTS` contains ten imported foliage anchors inside retained beds. Their ground datum is Y 0.255, the top of the existing 0.05 metre soil mesh centered at Y 0.23 in `geometry.ts`. Their width and depth envelopes now accommodate the normalized broad leaf group, and their per-instance scales range from 0.83 to 1.08 for varied heights. The adapter never creates procedural replacement foliage when this callback is absent.

The validation also reads the exported path-lamp placements, shared baggage frame dimensions and default forward adjustment, all twelve palm root keepouts, and the cabana worker's exported vegetation keepouts. The current layout reports no intersections. No planter is placed on the boardwalk. The activated cabana footprints are imported directly from the shared layout.

## Import adapter

The parent scene can provide a fresh clone of `accent-planter-tripo.glb` through `createPlanter`, and `tropical-foliage-tripo.glb` through `createFoliage`. Each source is placed below a wrapper transform, preserving the GLB root rotation and scale, then fitted inside its reserved width, depth and height, centered on its world X/Z placement and grounded by its actual lower bound or the existing bed soil datum. Empty sources fail explicitly. `onAttach` lets the existing static lighting pass mark imported meshes without adding new lights. Late factories that resolve after disposal are ignored, and populate rejects reuse of a disposed adapter. Shared geometries, materials and textures remain owned by the existing asset pool, and `clear` only detaches clones.

## Verification

The layout validators run before activation and currently return no errors for all twelve containers and all ten bed accents. Runtime asset inspection confirms both GLBs have self-contained buffers and images, with no external URIs. Offline Blender renders were reviewed for the source, foliage derivative and accent-planter derivative. TypeScript type checking and focused linting pass for the new modules. Parent scene integration, browser screenshots and performance checks continue in the main worker.

No source assets were deleted, overwritten, renamed or moved. No browser or publication action was taken by this preparation worker.

Parent local integration and desktop/phone review are complete. Repeated planting meshes use shared instanced batches, the source maps receive a deeper green runtime tint, and final layout checks report zero conflicts. Type checking, existing tests and build pass. See `docs/cabanas-planting-20261011.md` and `outputs/cabanas-planting/verification.json` for reconciled final evidence. Visual acceptance is pending.
