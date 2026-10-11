# Finishing steps 7 to 9, 11 October 2026

Status: all three supplied Tripo exports are integrated. Desktop and phone visual review, control verification and production build are recorded below. Sammy accepted the completed scene for publication to the existing ChatGPT Site and GitHub repository on 11 October 2026. The release retains the owner-private Site audience.

## Supplied sources and separate derivatives

| Family | Copies | Supplied export vertices / triangles | Runtime vertices / triangles | Runtime bytes | Embedded maps |
|---|---:|---:|---:|---:|---|
| White flowering tree | 6 | 111,752 / 195,138 | 25,165 / 30,246 | 1,350,564 | 2048px JPEG color |
| Timber bench with cream cushion | 4 | 306,371 / 594,374 | 33,544 / 19,999 | 1,295,480 | 1024px JPEG color |
| Complete patio set | 4 | 524,195 / 985,436 | 51,346 / 50,000 | 5,856,340 | Three 1024px PNG PBR maps |

Counts are read from the actual GLB accessors. Exported vertices include UV seam expansion. Embedded image dimensions are verified from the actual image buffer bytes with Pillow, rather than relying on Blender image metadata.

Selected source pages:

- [White flowering tree](https://studio.tripo3d.ai/3d-model/flowering-tree-with-white-blossoms-realistic-branches-and-trunk-d07a87b2-1421-4f1b-92e9-779226e76b3c)
- [Timber bench](https://studio.tripo3d.ai/3d-model/wooden-bench-with-beige-upholstered-cushion-and-solid-wood-frame-6a88819d-bbd3-4333-af71-f7aafb1fee7b)
- [Combined umbrella, table and four wicker chairs](https://studio.tripo3d.ai/3d-model/patio-umbrella-with-table-and-four-wicker-chairs-in-brown-and-beige-to-36a6caad-32da-4abe-9914-51a17b86c489)

The supplied patio replaces the earlier separate umbrella, chair and table candidates. Each supplied complete set contains four chairs, retained because the original is one merged mesh. The scene therefore contains four umbrellas, four tables and sixteen chairs. Its ribbed brown/beige canopy and wicker chairs retain the selected model's authored appearance. The selected flowering tree has an airy white-blossom crown, less dense than the reference's leafy flowering trees.

All three Downloads files remain unchanged and match their preserved source copies byte-for-byte. The 41 pre-existing runtime assets also retain their baseline hashes. A complete inventory includes hidden and system artifacts, source originals, meshopt-decoded intermediates, Blender working files and backups, texture derivatives, rendered previews, application sources, dependencies and build outputs. No source cleanup was performed.

## Implementation

Three parallel agents prepared the tree, bench and patio derivatives and their isolated scene groups. The parent integrated the asset mappings, loaders, shared static batches and disposal lifecycle. Each imported family uses one shared geometry/material batch. The tree group adds six instanced pale-stone planting wells and six amber uplights. Tree beams use local vertex illumination and the existing static light atlas, with no additional shadow maps or reflection passes.

Uniform fitting, grounded glTF Y-up orientation and reserved rotated footprints preserve natural asset proportions. Browser inspection caught an initial bench axis conversion error, the final derivative places the cream cushion horizontally above the timber legs. New placements were adjusted to remain visible in the tall desktop view. Existing camera, architecture, forum scale, ship, marble, boardwalk and planting remain in place.

## Verification

- Coordinated tree, bench and patio clearance audits, zero issues. Checks cover existing planting, palms, lamps, cabanas, architecture, central avenue, forum and boardwalk.
- Browser captures use 1140 by 998 desktop and 390 by 844 phone viewports. The actual scene canvases are 1140 by 888 and 390 by 626. Phone UI has no horizontal overflow, both quality modes render without captured warning or error logs.
- Visible controls verified: Star Alliance three arrivals, SkyTeam two, oneworld three, Accor one terrace. Replay resets arrival progress. Pause holds the fountain phase at 93.355 between observations, resume advances it.
- TypeScript passes, all 19 existing tests pass, 44 runtime assets audit as self-contained local resources, production build passes. The existing framework reports its large client chunk advisory.
- Source hashes, actual GLB texture dimensions and counts are recorded in outputs/finishing-steps/asset-byte-verification.json and preservation-verification.json. Browser bounds and rendering samples are recorded alongside final screenshots.

The selected originals would submit 7,490,068 furnishing triangles across fourteen placements. The derivatives submit 461,472, a reduction of about 94 percent. Repeated exported vertices reduce from 3,992,776 to 490,550, about 88 percent. Shared instancing reduces separate draw submissions while retaining the fourteen placements. The same unselected Cinematic desktop view recorded 997 draw calls and 10,039,360 triangles per normal frame, compared with baseline 976 and 8,642,344. This is about 2.2 percent more draw submissions and 16.2 percent more rendered triangles across the existing reflection passes. Resident geometry objects rose from 214 to 221 and textures from 68 to 73. Final samples were 60 and 62 fps, the saved baseline was 63 fps and an earlier baseline observation was 74 fps. These are indicative measurements, rather than a controlled benchmark, and shadow-update frames must be compared separately. The final review screenshot uses the restored default 1280 by 720 viewport.

Preparation evidence remains in outputs/finishing-steps/preparation-verification.json as a historical pre-import checkpoint. All nine ambience steps are included in the accepted publication scope. Deployment status and the exact source commit are verified separately during publication.
