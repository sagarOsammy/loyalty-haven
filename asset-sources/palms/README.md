# Tripo palm replacement

Sammy supplied the meshopt-compressed GLB and approved green foliage and brown trunks. The original contains geometry and normals, with no materials, textures or UVs.

| File | Role |
| --- | --- |
| `source/tripo_base_model_72143897-a7af-41ea-94ed-eb1d43943dec_meshopt.glb` | Byte-identical preserved source, 274,476 bytes |
| `build-palm.mjs` | Reproducible decoding, uniform normalization and vertex coloring |
| `provenance.json` | Source and derivative hashes, bounds and transformation record |
| `../../public/assets/palm-tripo.glb` | Self-contained runtime derivative, 761,396 bytes |
| `../../public/assets/palm.glb` | Preserved prior model, runtime reference replaced |

Regenerate from the checkout with `node asset-sources/palms/build-palm.mjs`. The builder uses the installed Three.js meshopt decoder, with no external downloads. All 24,520 vertices and 49,031 triangles are preserved. Normals retain the supplied quantized precision. Colors blend from warm brown trunks to green crowns by normalized height, with subtle tonal variation. The existing twelve positions, heading variations and per-placement scales remain unchanged.

See `../../docs/palm-trees-20261010.md` for validation.
