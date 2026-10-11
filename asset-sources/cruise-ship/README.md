# Supplied cruise ship

The user supplied `tripo_pbr_model_9f2828ec-aab5-4b3b-b9e7-6b65e54efc37.fbx` on 10 October 2026 and requested a local replacement for the existing ship. A byte-identical source copy is retained in `source/`. The original Downloads file and `public/assets/cruise-ship.glb` are preserved.

| File | Role |
| --- | --- |
| `source/*.fbx` | Original mesh, UVs and four embedded 4096px PBR images |
| `prepare_cruise_ship.py` | Reproducible FBX conversion and reference-fit placement |
| `cruise-ship-tripo.blend` | Editable converted model, packed images |
| `provenance.json` | Source and output hashes, dimensions and transformations |
| `inventory.json` | Complete folder inventory, including the generated Blender backup |
| `../../public/assets/cruise-ship-tripo.glb` | Self-contained browser derivative with 2048px embedded images |

The derivative retains all 52,138 triangles. Its length matches the previous ship, with uniform scaling that preserves the supplied proportions. The vertical origin uses the prior ship's submerged-height fraction. A 180-degree horizontal rotation matches the reference bow direction. Existing scene position, heading, scale and motion are retained. GLB export converts Blender Z up to Three.js Y up. Roughness and metallic images are packed into a single GLB PBR texture alongside color and normal textures.

Run the installed Blender in background mode with `--python asset-sources/cruise-ship/prepare_cruise_ship.py` from the repository root to regenerate it. The Blender graphics initialization requires execution outside the macOS sandbox on this machine.

The source inventory contains one FBX with its embedded mesh and images. No accompanying external textures or license document were supplied. Generated files and Blender cache artifacts are separate from the preserved source. This delivery is for local review, publication is outside the requested scope.
