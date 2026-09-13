# Asset provenance

All runtime models and textures are served locally. Original user references are preserved in `docs/reference-images/`.

| Runtime asset | Source | Transformation | Verification |
| --- | --- | --- | --- |
| Three Star Alliance aircraft | Original Blender procedural geometry, airline wordmark reference files retained under `asset-sources/aircraft/sources` | Detailed engines, fuselage, wings, small stabilizers, landing gear and curved panels, separate brand colors, batched by material | Offline render inspected, all six aircraft/luggage exports reimported in Blender |
| Hard shell case and cognac duffel | Original Blender geometry | Ribs, wheels, handles, seams and hardware, material batching | Offline renders and browser placement checked |
| Vintage suitcase | [Poly Haven vintage suitcase](https://polyhaven.com/a/vintage_suitcase), [CC0](https://polyhaven.com/license) | One case isolated, centered, grounded, 1 m high, derived 1K maps, 570292 bytes | Final render inspected and Blender reimport passed |
| Hangar, hotel modules, forum | Original Blender geometry guided by Gemini-4 | Runtime modules share dimensions, stone/teak microtextures packed into GLB, static parts batched | Revision-specific Blender render and browser check |
| Palm, planter, baggage belt, yacht | Original Blender geometry | Pinnate palm fronds, modeled deck details and belt slats, material batching | Bounds and belt geometry reimport verified |
| Sunset environment | [Poly Haven Belfast sunset pure sky](https://polyhaven.com/a/belfast_sunset_puresky), CC0 | Local 2K HDR, environment reflection prefiltering | Loads locally |
| Paving | [Poly Haven concrete pavement 02](https://polyhaven.com/a/concrete_pavement_02), CC0 | Local diffuse, normal and roughness maps | Applied in browser |
| Sand texture source | [Poly Haven coast sand 01](https://polyhaven.com/a/coast_sand_01), CC0 | Local maps retained, currently unused by the scene | Not loaded by runtime |
| Water normal | [Three.js examples](https://github.com/mrdoob/three.js/blob/dev/examples/textures/waternormals.jpg), Three.js MIT distribution | Local copy used by sea reflection and animated pool normals | Applied in browser |
| Fonts | Manrope and Cormorant Garamond, Google Fonts distributions | Locally hosted TTF files | Font loading precedes 3D label generation |
| Optional telescope | Tripo free v2.5 text-to-3D | One generic public prop, 40 free credits used, no personal data upload | Download blocked by browser, not integrated |

## Fidelity and rights notes

Aircraft are authored approximations, with simplified cockpit and tail graphics. The UNITED reference is the 1998 wordmark source, so exact current airline branding has not been established. They are not scans or engineering-accurate replicas. Wordmark references retain their original source files and provenance. Airline trademarks remain with their owners.

Architecture, foliage, belt and yacht materials combine geometry with ordinary PBR parameters. Stone and teak microtextures are small procedural maps. The paving and vintage case use photographic source maps. These differences matter when assessing the requested photoreal fidelity.

The Tripo experiment was text-to-3D. An image-to-3D trial remains unperformed. Its free-plan public/noncommercial restrictions must be checked before using the prop outside this local review.

## Editable sources

`asset-sources/aircraft`, `asset-sources/environment` and `asset-sources/architecture` contain the build scripts, Blender files and original provenance. Scripts accept output overrides and resolve their default paths relative to their location. No MCP service or paid model provider is required to regenerate the Blender assets.

`docs/asset-manifest.json` records runtime file hashes, byte sizes and GLB structure. Provenance from the worker folders preserves the original generation paths as evidence, the copied bundles are the durable editable destination.
