# Outdoor benches, stage 8

The eighth scene change adds four compact timber benches or sofas with cream cushions beside planting beds. The attached reference image was inspected at `/var/folders/7t/0_hkzn095vqbj1pj6m0vqs5w0000gn/T/codex-clipboard-3b0c0bc6-9a68-445f-bf19-2b880641ed7f.png`, SHA-256 `39143e86bce8cef3ead01394367f0f616758521257f4dc2a4467b87fa20d6795`.

## Selected source

Sammy selected Tripo Option A, [wooden bench with beige upholstered cushion and solid wood frame](https://studio.tripo3d.ai/3d-model/wooden-bench-with-beige-upholstered-cushion-and-solid-wood-frame-6a88819d-bbd3-4333-af71-f7aafb1fee7b). The supplied source is preserved at `asset-sources/outdoor-benches/source/bench.glb`, 2,881,820 bytes, SHA-256 `c70555b312b041ad52ea3aaa50530aa63e488d8f6f7dd977813f1847cf0a5007`. The Tripo page reported 594,374 faces or triangle-topology elements and 306,371 vertices on 11 October 2026, and the local export confirms those counts. The source contains one material and one packed 2048 by 2048 color map.

The source record is in `asset-sources/outdoor-benches/provenance.json`. The separate optimized runtime derivative is `public/assets/outdoor-bench-tripo.glb`, 1,295,480 bytes, SHA-256 `7c1864810f629a81532f400f85d8e39e238badee000e7b868e2b3901cf7e3791`. It contains 19,999 triangles, 15,328 mesh vertices before export and 33,544 vertices after glTF re-import with UV seam expansion. Its packed sRGB JPEG color map is 1024 by 1024, exported at quality 90. The source remains byte for byte beside this derivative.

The verified final glTF Y-up bounds are 3.050381 metres wide, 0.987933 metres high and 0.84752 metres deep. The export mapping is Blender X=source Y, Blender Y=-source X, Blender Z=source Z, producing final glTF X=source Y, glTF Y=source Z and glTF Z=source X. The cushion is horizontal and grounded at final glTF Y 0, with the cushion-facing side at final glTF +Z.

## Layout

`BENCH_PLACEMENTS` in `lib/scene/bench-layout.ts` reserves four pockets:

| ID | Position | Role |
| --- | --- | --- |
| `bench-foreground-west` | (-24, 35) | West foreground edge beside the retained planting band, past the patio front and inside the desktop canvas |
| `bench-foreground-east` | (13, 29) | East foreground edge between the forum and east belt, inside the desktop canvas |
| `bench-forum-west` | (-10.8, 34) | North-west forum seating pocket |
| `bench-forum-east` | (13.8, 34) | North-east forum seating pocket |

The target fit envelope is 3.05 metres wide, 1.12 metres deep and 1.25 metres high, with a 0.42 metre keepout and a floor datum of Y 0.03. Footprints use a conservative rotated world envelope. The audit checks the actual `FORUM_LAYOUT.framingRadius`, central avenue, boardwalk, buildings, baggage belts, existing leaf beds, existing planter bounds, twelve accent planters, ten bed accents, six cabana keepouts, twelve palm wells, 24 path lamps, the six current flowering-tree envelopes and the four current patio seating envelopes by default. The existing planter check uses local bounds X -2.7267 to 3.1286 and Z -1.8274 to 2.0246 at root scale 0.55, including the source-bound offset. `reservedZones` can replace the mirrored tree and patio reservations when a later layout revision supplies live values. `benchKeepouts()` and `auditBenchLayout()` expose the reservations to the parallel workers.

## Import adapter

`OutdoorBenches` creates four named anchors and accepts a caller supplied loader. It inspects mesh, vertex, triangle and bounds metrics before repetition, rejects an unverified source above 80,000 triangles or 100,000 vertices, clones the selected source four times, preserves its authored root transform, fits each copy to its reserved envelope, grounds it to the floor, and enables shadows. Optional material hints can warm timber and cream cushion regions for inspection without changing the selected source by default.

The source pool owns shared geometry and maps. The adapter creates one owned cloned material set and shares it across the four source clones, allowing the parent static-instancing pass to group identical geometry and material UUIDs. It disposes that owned set once on clear or teardown, leaves source maps and geometry with the pool, guards against a loader resolving after disposal, and never creates a fallback mesh when the selected source is absent.

## Verification status

- [x] Reference inspected and hash recorded.
- [x] Selected Tripo Option A URL recorded.
- [x] Four seating pockets and cross-worker keepout API authored.
- [x] Loader-independent adapter authored with vertex and triangle inspection.
- [x] Rotated footprint audit covers default beds, planter bounds, accent foliage, lamps, palms, buildings, belts, cabanas and the actual forum radius, current result zero issues.
- [x] One owned cloned material set is shared across repeated copies for safe static batching and one-time disposal.
- [x] Selected local source preserved and inspected, with source vertices, triangles, map dimensions, bounds and hash recorded.
- [x] Optimized GLB derivative and offline preview prepared, with runtime vertices after UV seam expansion recorded.
- [x] Final foreground placements project fully inside the 1140 by 888 desktop canvas, with all bench corners above the controls at y 782.
- [x] Bench, flowering-tree and patio collision audits all return zero issues for the final placements.
- [x] Parent integration, desktop and phone browser review and performance comparison completed. Final acceptance is pending user review.
