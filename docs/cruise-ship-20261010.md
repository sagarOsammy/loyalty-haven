# Local cruise ship replacement, 10 October 2026

The local scene uses the supplied Tripo cruise ship via `public/assets/cruise-ship-tripo.glb`. Sammy requested local replacement and validation in the Codex inbuilt browser. This change has not been published.

| Boundary | Result | Evidence |
| --- | --- | --- |
| Preserved source | Passed | Downloads FBX and retained source copy match the SHA-256 in `asset-sources/cruise-ship/provenance.json`. Previous `cruise-ship.glb` also matches its recorded hash. |
| Browser asset | Passed | Self-contained 3,002,240-byte GLB, 52,138 triangles, base color, normal and packed metallic/roughness maps. Final browser `shipAsset` is `/assets/cruise-ship-tripo.glb`, `sceneReady` is true and `assetFailures` is empty. |
| Visible placement | Passed | Inbuilt desktop browser shows textured decks and hull afloat, matching the prior bow direction and horizontal placement. Source proportions retained through uniform reference-length fitting. |
| Pause and resume | Passed | While paused, phase 41.602, position `-31.3427,-1.1200,-85.0000` and roll `-0.005887` remain stable. Resume advances phase to 41.703 and position to `-31.3342,-1.1200,-85.0000`. |
| Replay and coexistence | Passed | Replay restarts aircraft progress. Final state has three aircraft with completed progress and one Accor floor, with the replacement ship still loaded. Saved total remains 1,262,817. |
| Browser diagnostics | Passed | No captured browser warnings or errors. Final desktop sample reports 60 fps. This sample does not establish performance on other devices. |
| Build and asset integrity | Passed | TypeScript validation and final production build succeed. Asset audit covers 49 local files and 41 self-contained GLBs. Build retains its bundle-size and route-classification notices. |

Screenshot: `outputs/cruise-ship-replacement-20261010.jpg`, captured from the Codex inbuilt browser at the local development URL. All browser checks used that browser.

The preserved source, editable Blender derivative, reproducible conversion, hashes and file inventory live in `asset-sources/cruise-ship/`. `cruise-ship-tripo.blend1` is a generated backup from the orientation correction. Existing unrelated work in the checkout is preserved.

The user supplied no license document with this FBX. Local validation makes no determination about public distribution rights.
