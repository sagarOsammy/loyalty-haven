# Corner planting, 10 October 2026

Four new planting sections match the existing low green foliage bed marked as the reference. The four destination markers are mapped onto the ground plane using the current 1887 by 1278 browser viewport and the existing camera. This is a local edit.

| Marker | Destination | Ground center, X and Z |
| --- | --- | --- |
| 2 | Bottom left beside the controls | -17.9, 41.8 |
| 3 | Bottom right beside the controls | 26.9, 35.9 |
| 4 | Right beside the seawall | 43.2, -16.2 |
| 5 | Left beside the seawall | -56.4, -17.7 |

Each bed reuses the reference dimensions of 8 by 2.3 scene units, stone edging, green ground surface, foliage geometry, color variation and 290 leaf instances. The instance buffer scales with the number of beds, now nine beds and 2,610 leaf instances, all foliage still uses one shared instanced mesh. The original five beds keep their placements and foliage seeds. Source files, GLBs, camera composition and personal balances are preserved.

Implementation is in `lib/scene/landscape.ts` and `lib/scene/geometry.ts`. TypeScript validation and the production build pass. Final inbuilt-browser verification shows all four new beds at the marked locations, with the selected Accor hotel restored, scene ready, an empty asset-failure list and no captured browser warnings or errors. The desktop sample reports 60 fps, which does not establish other-device performance.

Screenshot: `outputs/corner-planting-20261010.jpg`. The local website remains open in the inbuilt browser for further annotations.
