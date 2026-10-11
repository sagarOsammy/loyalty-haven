# Parasol seating, stage 9

This folder records the imported patio seating used for the last furnishing
pass. The selected Tripo export is one complete merged set with one canopy,
one round table and four wicker lounge chairs. The supplied mesh does not
expose safe chair-level component boundaries, so the complete four-chair set
is repeated at each of the four scene placements.

Reference image: `/var/folders/7t/0_hkzn095vqbj1pj6m0vqs5w0000gn/T/codex-clipboard-3b0c0bc6-9a68-445f-bf19-2b880641ed7f.png`.

## Selected source and derivative

Sammy selected the original Tripo Option A umbrella, chair and table family,
then supplied `patio.glb` as a complete combined export. The original file is
preserved byte for byte at `source/patio.glb`. The decoded intermediate and
the generated derivative are kept separately so the source remains
recoverable.

| File | Contents | Vertices | Triangles | Maps |
| --- | --- | ---: | ---: | --- |
| `source/patio.glb` | Supplied combined source | 524,195 | 985,436 | 3 embedded 2048px PBR maps |
| `public/assets/patio-seating-tripo.glb` | Runtime derivative | 51,346 | 50,000 | 3 embedded 1024px PNG maps |

Source SHA-256 is `754ec45908ac2528680800ee61a0fba561fa905f942ad73f00c65a6af07b8f88`.
Derivative SHA-256 is recorded in `derivative-stats.json`. The derivative is
one mesh and one material, with the supplied canopy, table and four-chair
silhouettes retained. The embedded byte payloads were read directly from the
GLB and verified as three 1024 by 1024 PNGs, not inferred from Blender image
datablock metadata.

The conversion in `prepare_patio.py` keeps Blender Y-up output, grounds the
lowest point to zero, fits the complete set to a 4.25m by 4.0m by 2.85m local
envelope, and decimates to 50,000 triangles. The width and depth fit keeps the
canopy visible at the scene camera while the height preserves a believable
resort scale. The source proportions remain represented by the supplied
component silhouettes, and all repeated instances share the parent AssetPool
geometry, material and texture resources.

## Layout

The four group centers are:

| Group | World center X/Z | Purpose |
| --- | --- | --- |
| West edge | -44, 22.5 | Edge garden seating beyond the west side bed |
| East edge | 42, 22.5 | Edge garden seating beyond the east side bed |
| North-west | -24, 30.5 | Forum framing seating on the open west forecourt |
| North-east | 27, 29.5 | Forum framing seating on the open east forecourt |

Each group reserves a 4.8m by 4.4m envelope before heading rotation, plus
0.55m clearance. The audit converts each oriented envelope to a world-space
axis-aligned rectangle before checking the buildings, avenue, forum,
boardwalk, beds, planters, palms, lamps, cabanas, flowering trees and benches.
The combined adapter centers the imported set in its anchor, applies the
placement heading once, and grounds it to the existing 0.06m floor datum.

## Runtime adapter

`lib/scene/parasol-layout.ts` owns placements, the combined target envelope,
scene audits and the reservations shared with the parallel tree and bench
passes. `lib/scene/parasol-seating.ts` exposes:

```ts
await seating.loadCombined(() => assets.get("patioSeating"), {
  sourceId: "patio.glb",
});
```

The returned report includes `groupsComplete`, `chairsPerGroup`,
`totalChairCount`, `vertices`, `triangles`, source bounds and the optimization
gate result. The loader rejects an unoptimized source above 80,000 triangles or
100,000 vertices before attaching repeated copies. Disposal detaches wrappers
only, leaving shared AssetPool resources for the parent pool to release.

## Inventory and verification

- [x] Supplied source, decoded intermediate, generated previews, working blend,
  generated map files and Blender backup are inventoried in `source-inventory.json`.
- [x] Source SHA, source geometry counts, bounds and embedded maps are recorded.
- [x] Derivative geometry is 50,000 triangles and 51,346 runtime vertices.
- [x] All three derivative texture payloads are embedded 1024 by 1024 PNGs.
- [x] Four complete groups are prepared, with four chairs per group and sixteen
  chairs total.
- [x] Oriented group envelopes account for heading rotation and full scene
  keepouts.
- [x] Combined loader and layout modules pass focused typecheck and lint.
- [ ] Parent scene integration and inbuilt-browser review remain pending.
