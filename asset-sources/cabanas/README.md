# Waterfront cabana sources

This folder records the supplied Tripo cabana source and the stage 5 derivative. Sammy selected the Tripo asset method and supplied a local FBX export. The original file is preserved byte for byte under `source/`, and the runtime GLB is a separate optimized derivative.

The earlier Tripo links are retained in `inventory.json` as historical planning candidates. They are not attributed as the selected model. The supplied FBX contains one merged mesh with 116,598 triangles, a square canopy, tied curtains, timber posts and cream lounge seating. Its embedded 8192 pixel color map and 4096 pixel auxiliary maps are preserved in the source archive and reduced only in the derivative.

`public/assets/cabana-tripo.glb` contains the inspected derivative at 34,974 triangles and 43,021 GLB vertices, with embedded 2048 pixel base color and 1024 pixel normal and roughness-metallic maps. The derivative fits a 4.8 by 2.8 by 3.55 metre world-Y-up envelope, and its opening faces scene +Z toward the plaza. The white canopy override keeps the roof aligned with the reference while the source texture remains on timber, curtains and seating.

The importer adapter in `lib/scene/cabanas.ts` accepts the local derivative through a callback, fits it to the reserved footprint, instances it only after inspection, clones per-instance materials and guards against a late loader resolving after scene teardown.

Source and derivative thumbnails, exact hashes, Blender conversion details and image dimensions are recorded in `inventory.json`, `source-stats.json`, `derivative-stats.json` and `provenance.json`.

The compact procedural cabana fragments in the existing hotel roof asset are recorded as related context and remain unused. See `inventory.json` and `docs/cabanas-20261011.md` for source links, metrics, placement, optimization and verification status.
