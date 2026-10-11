# Distant environment model replacement, 10 October 2026

## Latest revision

The 3D cloud implementation is removed from the active scene at the user's request. The previous sunset cloud backdrop is restored from the retained `public/assets/sunset-sky-20261010.png`. The image's lower-right painted terrain is masked in the sky shader so the imported mountain mesh remains the visible terrain.

The mountain presentation dimensions are each increased by exactly 25 percent. The upper ridgeline is anchored to the right screen edge using the camera projection, including a small overscan margin. The sun, water settings, lighting and resort composition are retained. The original cloud GLB and its provenance remain preserved, with no runtime cloud-model request or cloud layer.

TypeScript, the production build and both environment geometry tests pass. Tests cover the level horizon, unchanged camera, upward-facing water and right-edge anchoring across three aspect ratios. Inbuilt-browser readback confirms the original sky path, zero 3D cloud layers, a ready scene and no failed assets or console errors. Evidence: `outputs/restored-clouds-mountains-20261010.jpg`.

## Initial model integration

The supplied 4.8 MB mountain terrain and 70 KB cloud silhouette replace the painted mountains and clouds from the earlier sunset backdrop. Work remains local.

- Mountains retain all 839,716 triangles and three embedded PBR textures. Terrain sits along the right horizon, with its cut base below the waterline.
- Clouds retain all 13,888 source triangles. Seven shared instances use warm sunset shading and soft transparency. The supplied model is a thin silhouette, rather than a volumetric cloud.
- A clear sunset gradient removes the old painted cloud and mountain imagery. The sun, lighting, water settings, camera transforms, resort objects and saved balances are retained.

Source preservation is verified by matching SHA-256 hashes across both Downloads originals, provenance copies and runtime assets. The local asset audit passes for 53 assets and 44 self-contained GLBs. TypeScript checks, the production build and both environment geometry tests pass. Tests cover a level horizon, unchanged camera matrices, upward-facing water and mountains staying below the sun across desktop, compact and mobile aspect ratios.

The inbuilt browser shows both new asset paths, seven cloud instances, all three completed Star Alliance arrivals and no failed assets or console errors. The observed preview runs around 60 frames per second on the current computer. Evidence: `outputs/distant-environment-models-20261010.jpg`. The preview remains open for annotation.

Source details: `asset-sources/distant-environment/provenance.json`.
