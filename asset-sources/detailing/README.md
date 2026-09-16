# 14 September detailing pass

These scripts create derivative assets without changing the original models or authoring bundles.

| Script | Preserved input | Runtime selection |
| --- | --- | --- |
| `prepare_aircraft.py` | `asset-sources/aircraft/build_assets.py` and its local wordmark sources | Three `airline-*-detail.glb` files |
| `prepare_hotel.py` | Three original `public/assets/hotel-*.glb` modules | Three `hotel-*-detail.glb` files |

Run each script using Blender in background mode. `LOYALTY_AIRCRAFT_DETAIL_OUT` and `LOYALTY_HOTEL_DETAIL_OUT` control the output folders. Defaults are temporary review folders. Copy only verified GLBs to the runtime paths recorded in provenance. Original public assets remain retained and are no longer loaded by the active scene.

Aircraft retain their original length, span, orientation and airline identities. Hotel exports preserve all geometry and module dimensions. Hotel maps are generated locally, use non-color interpretation for roughness and normals, and contain no external dependencies. The browser disables screen-space transmission and retains shared pool animation.

The United GLB and assembled hotel were rendered after reimport. All six derivative assets were inspected in the actual browser composition. These remain authored approximations and a material refinement, with final photoreal acceptance still open.
