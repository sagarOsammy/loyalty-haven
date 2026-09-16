# Aircraft realism pass, 15 September 2026

Sammy selected further realism work on the existing aircraft before adding other alliances. The scene camera, building layout, arrival paths, aircraft placement and scale remain unchanged.

`prepare_aircraft.py` reads the preserved original generator and supplies new component builders in memory. It never modifies that generator or either prior runtime generation. `LOYALTY_AIRCRAFT_REALISM_OUT` chooses a temporary output directory. The retained Blender file contains editable component geometry for all three aircraft. The two review PNGs show the serialized United GLB after reimport.

Changes include a smoothly tapered narrower cabin, rounded radome, six cockpit panes, oval cabin windows, flush projected airline wordmarks, fine door outlines, thin swept wings and stabilizers, slat/flap joints, recessed 24-blade engine fans, intake throats, spinners, exhausts, paired wheels and gear braces. Flat tail shading avoids false surface dents. Fine curves use reduced tessellation for runtime efficiency.

| Runtime | Triangles | Material primitives | Bytes |
| --- | ---: | ---: | ---: |
| `airline-united-realism.glb` | 45,116 | 13 | 1,932,548 |
| `airline-avianca-realism.glb` | 46,256 | 12 | 1,974,776 |
| `airline-air-canada-realism.glb` | 45,400 | 13 | 1,943,080 |

All three serialized models have matching bounds, approximately 11.576 wide × 3.539 high × 12.040 long in glTF coordinates. Length is retained. The finer wingtip thickness changes total span by approximately 0.016 from the prior generation. Tail height is reduced from the earlier 4.12 maximum to 3.54 for the revised silhouette. Their lowest point is 0.001 above the model origin. No scene transform compensations were applied.

Original and first-detail GLBs remain preserved under `public/assets`. The current loader selects only the new realism variants. Hashes and original wordmark provenance are linked in `provenance.json` and the retained aircraft source folder. These are generic authored airliner approximations with retained airline identity references, not exact aircraft types, scans or certified current liveries.

Browser verification: all three completed arrivals open their corresponding saved balances. Replay passes, asset failures and console errors are empty, and the desktop sample reports 60 fps. Final production build and asset audit pass. Local verification is separate from hosted publication and photoreal acceptance.
