# Parasol seating, stage 9

Stage 9 uses the supplied combined Tripo patio export to create four complete
edge seating groups. Each group contains the original exported canopy, round
table and four wicker lounge chairs. The supplied file is one merged mesh, so
the adapter retains all four chairs rather than attempting an unsafe chair
deletion. The runtime result is sixteen chairs across four groups.

## Source record

| Record | Evidence |
| --- | --- |
| Selected family | Supplied combined brown/beige umbrella, table and four wicker chairs |
| Supplied source | `asset-sources/parasol-seating/source/patio.glb` |
| Source SHA-256 | `754ec45908ac2528680800ee61a0fba561fa905f942ad73f00c65a6af07b8f88` |
| Source topology | One mesh, one material, 524,195 vertices and 985,436 triangles |
| Source maps | Three embedded 2048 by 2048 PBR images |
| Runtime derivative | `public/assets/patio-seating-tripo.glb` |
| Derivative SHA-256 | `7afe44999db65056229875a10fd4cca816a157b566332a2532b862a23928cdc2` |
| Derivative topology | One mesh, one material, 51,346 vertices and 50,000 triangles |
| Derivative maps | Three embedded 1024 by 1024 PNG images |

The original source remains preserved. `asset-sources/parasol-seating/patio-decoded.glb`
is the meshopt-decoded intermediate, while the Blender file, previews and
resized map files are generated working artifacts. `source-inventory.json`
classifies every file, including the Blender backup artifact.

The source has no named chair components. The generated derivative therefore
keeps the complete supplied silhouette. `prepare_patio.py` checks the actual
GLB buffer bytes after export, including the PNG signature and width and
height of each embedded map. `derivative-stats.json` records those checks.

## Layout and collision reservations

The group centers are:

```text
west-edge      (-44, 22.5)
east-edge      ( 42, 22.5)
north-west     (-24, 30.5)
north-east     ( 27, 29.5)
```

Each group reserves a 4.8m by 4.4m envelope before heading rotation, with
0.55m clearance. The audit uses the rotated world envelope and checks the
hangar, hotel, central avenue, forum, boardwalk, existing leaf beds and
planters, accent planting, cabanas, lamps, palms, flowering trees and benches.
The complete imported set is centered locally, rotated once by its anchor
heading, and grounded to the 0.06m floor datum.

## Runtime API

`ParasolSeating.loadCombined` accepts a fresh parent AssetPool clone source:

```ts
const result = await seating.loadCombined(
  () => assets.get("patioSeating"),
  { sourceId: "patio.glb" },
);
```

The result reports:

- `groupsComplete`, four after all anchors receive a clone
- `chairsPerGroup`, four from the supplied combined export
- `totalChairCount`, sixteen for the complete scene
- `vertices` and `triangles`, source counts used for the repetition gate
- `sourceMetrics`, bounds and mesh count
- `optimizationVerified`, true when the source is within the 80,000 triangle
  and 100,000 vertex gate, or when the parent explicitly verifies it

The loader clones scene nodes with `clone(true)`, which shares geometry,
materials and textures with the parent AssetPool. `clear` and `dispose`
detach wrappers and do not release pool-owned resources.

## Verification status

- [x] Four complete groups are authored.
- [x] Full scene keepout audit is authored and returns zero issues for default
  reservations.
- [x] Source file is preserved with a recorded SHA-256.
- [x] Derivative is below the vertex and triangle gate.
- [x] GLB byte inspection confirms three embedded 1024 by 1024 PNG maps.
- [x] Focused TypeScript check and ESLint pass for both parasol modules.
- [x] Isolated loader exercise reports four complete groups and sixteen chairs,
  and grounds each wrapper to its anchor.
- [x] Parent integration and inbuilt-browser desktop and phone review completed. Final acceptance is pending user review.
