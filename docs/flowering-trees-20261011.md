# Flowering trees, 11 October 2026

## Scope

Stage 7 adds six small flowering trees around the outer plaza edges. The paired west and east placements frame the seating edges and foreground corners while leaving the six metre avenue, Alliance Forum sign, buildings, boardwalk, and cabanas visible from the approved camera.

## Selected source

The selected candidate is Tripo Option A, a flowering tree with white blossoms, natural branches, and trunk:

https://studio.tripo3d.ai/3d-model/flowering-tree-with-white-blossoms-realistic-branches-and-trunk-d07a87b2-1421-4f1b-92e9-779226e76b3c

The user selected this candidate. The supplied local export is preserved at `asset-sources/flowering-trees/source/flower.glb`, and the optimized runtime derivative is `public/assets/flowering-tree-tripo.glb`.

The Tripo page showed **195,138 triangle faces** and **111,752 vertices** at 2026-10-11T15:50:49Z. The preserved local source has the same counts and SHA-256 `94f7b0539437fee36f3836fed0a3997a8515b9a472c0f30c5601631a8e38f86e`.

## Layout

| Placement group | Count | World intent |
|---|---:|---|
| Foreground | 2 | Pair at x -18.25 and 19.25, z 37.25 and 31, using the clear inner lanes so both crowns remain inside the canvas and above the fixed controls while the beds, benches, and lamps stay clear |
| Seating edge | 2 | Pair at x -30 and 34, z 19 and 23, framing the outer seating while clearing the east palm well and parasol group |
| Waterfront edge | 2 | Pair at x -45 and 38.5, z -6 and -5, keeping the waterfront frame inside the live camera projection without entering the boardwalk or cabanas |

Each placement reserves a 4.5 to 4.8 metre local envelope, a 3.95 to 4.45 metre height envelope, and 0.55 metre clearance. The layout audit expands each envelope by its scale and anchor rotation before checking the central avenue, boardwalk, building footprints, existing and imported planting, palms, path lamps, cabanas, tree to tree overlap, and optional seating keepouts supplied by later furnishing stages.

Each imported tree is grounded to the top of a dedicated low planting well. The six wells use shared instanced geometry, a 1.7 metre pale-stone diameter, a 0.15 metre dark-soil depth, and 0.18 metre coping height. The imported tree source remains unchanged, and the well bases remain attached during model reloads until the stage is disposed.

Existing planter collision checks use the known selected root bounds, local x -2.7267 to 3.1286 and z -1.8274 to 2.0246, at scene scale 0.55. This gives a 3.220415 metre width, a 2.1186 metre depth, and a center offset of +0.1105225 metres in x and +0.05423 metres in z.

The final six-coordinate audit uses the current bench and parasol keepouts as well as the fixed building, boardwalk, cabana, planting, palm, lamp, and tree reservations. It returns zero issues for the selected placements: west foreground (-18.25, 37.25), east foreground (19.25, 31), west seating (-30, 19), east seating (34, 23), west waterfront (-45, -6), and east waterfront (38.5, -5). The camera remains unchanged. At the 1140 by 888 canvas size, the west foreground anchor projects at about (80, 735) with its crown at about (69, 648), and the east foreground anchor at about (902, 719) with its crown at about (909, 638), keeping both crowns above the y 782 control bar.

## Asset accounting

The optimized runtime GLB has 25,165 exported vertices and 30,246 triangles, reduced from 111,752 vertices and 195,138 triangles. It retains one embedded 2048px color map, uses a 1,350,564 byte runtime file, and has normalized Blender dimensions of approximately 5.062 by 4.766 by 4.202 metres. The original 4096px map was reduced to 2048px for repeated scene use. Shared geometry and maps remain owned by the parent asset pool, and the adapter uses one owned cloned material set across all six instances so static batching remains possible.

## Verification status

- Layout module: prepared
- Imported asset adapter: prepared, optimized derivative available
- Source inventory: recorded, source GLB preserved
- Blender preview: source and derivative rendered
- Browser review: parent integration completed, desktop and phone screenshots and control checks passed, see finishing-steps-20261011.md
- Publication: separate acceptance step
