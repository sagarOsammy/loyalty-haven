# Supplied distant environment models

Current state: the cloud model is retained as a source but removed from the runtime implementation. The prior sunset-cloud backdrop is restored. Mountains are 25 percent larger and anchored by their upper ridgeline to the right edge. The import details below record the initial model integration.

Two user-supplied files were identified by size and copied byte-for-byte. Original Downloads files and the previous sunset backdrop remain preserved.

| Role | Source | Runtime copy | Content |
| --- | --- | --- | --- |
| Mountains | `source/tripo_pbr_model_ce2c5736-2ee3-42f7-8d20-2437071deedc_meshopt.glb` | `public/assets/mountains-tripo.glb` | 4,826,824 bytes, 427,968 vertices, 839,716 triangles, three embedded JPEG PBR maps |
| Cloud | `source/tripo_base_model_4f921f9e-4425-4e1e-a069-e0a0833c922c_meshopt.glb` | `public/assets/cloud-tripo.glb` | 69,832 bytes, 6,946 vertices, 13,888 triangles, thin uncolored silhouette |

Both use Meshopt compression, decoded at runtime with Three.js's bundled decoder. No geometry or textures are removed. Presentation transforms fit the mountain terrain into a low right-hand horizon, with its base submerged to hide the cut terrain boundary. Seven shared cloud instances receive warm translucent shading, a soft base fade and shaded undersides. Neither layer casts shadows over the resort.

The prior painted clouds and mountains are removed from the visible sky by using a clear procedural sunset gradient. The existing circular sun, sunlight direction, water transparency and resort composition are retained. `provenance.json` records hashes and verifies all copies against the original supplied files. This folder's source GLBs are content inputs, README and provenance are documentation, and no hidden artifacts were present when created.
