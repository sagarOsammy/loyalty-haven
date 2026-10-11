# Forum fountains, stage 2 of 9

Local preview: http://localhost:5173/. Sammy accepted the revised fountains by requesting work move forward to stage 3. Publication retains its separate acceptance step.

## Grand fountain revision after local review

Sammy requested stronger plumes, natural foamy impacts and better water color/transparency. The supplied reference was inspected again. The existing authored basin and forum derivative are sufficient, no additional supplied 3D model is needed for this revision.

The current effect replaces parabolic tube loops and outlined ripple rings with tapered upright streams, 8,496 animated falling droplets/impact splashes and broken procedural foam. Forty perimeter jets vary from about 1.96 to 2.45 metres high. Twelve central jets reach about 2.84 to 3.55 metres, with a seven-jet inner crown and a tallest 4.3-metre plume. Its highest point is 4.62 metres above the plaza, below the entrance plaque. Basin dimensions and original architecture remain unchanged.

Water now uses a slate-blue base and basin floor, stronger layered moving wave normals, lower roughness and view-dependent opacity from 0.65 to 0.96. It reflects the existing environment. Warm submerged lighting remains in place. All shader flow, droplets, foam and waves share the world's pauseable phase. The first review's source implementation is preserved in `asset-sources/forum-fountain/fountains-first-review.ts.txt`.

Animated fountain crops differ across time, while paused crops match pixel-for-pixel and phase stays at 77.953. A quality switch exposed a ResizeObserver delivery-loop warning, corrected by scheduling rendering-target resizing on the next animation frame and cancelling it on disposal. A fresh reload, Balanced/Cinematic switches and a 390 by 844 phone viewport subsequently showed the scene without an error overlay. The temporary viewport was reset to the user's current 926 by 817 desktop view. The revised scene reports 59 jets, ready state and no asset failures. Captured warning/error console logs are empty after the reload. Type checks, all 19 tests and the final build pass.

Revised screenshots are `desktop-revised.png` and `phone-revised.png` under `outputs/forum-fountain/`. The ten-frame `fountain-motion.gif` shows moving stream, spray and foam detail. Sampled selected desktop Cinematic frame rate was 74 fps, this is an indicative sample rather than a controlled comparison with the earlier viewport.

## First implementation history

## Visible changes

- Preserve the original forum's position, height, ten columns, arches, signage and scale of 1.125. Replace the seating stage with a smaller central pool, twelve surrounding jets and one taller central jet.
- Fit a shallow annular basin around the pavilion, with a 7.15-metre outer coping radius, 6.82-metre outer water radius, and forty perimeter jets. Water heights are 0.22 metres outside and 0.32 metres centrally. Pale limestone coping, submerged warm rim lighting and four submerged point lights illuminate nearby stone and columns. A dry marble ring separates the central pool and outer basin.
- Keep jets, droplets, ripple expansion and water-normal movement on the existing pauseable scene phase. Batch streams and landing ripples as instances, use one point cloud for droplets, and add no light shadow passes.
- Shorten the marked western rear diagonal before its exposed tail beyond the left garden. Add two 0.28-metre brown borders along the central avenue, ending at the outer circular paving band. Preserve the remaining inlays and warm marble texture.

## Preservation and provenance

The source inventory includes 56,183 files, covering hidden/system artifacts, configuration without reading secrets, version-control metadata, active sources/assets, references, generated items and dependencies. See the ignored inventory CSV and summary for the complete classification.

All 28 original runtime asset hashes still match the Git manifest. `public/assets/forum.glb` remains untouched. The separate derivative is 1,401,420 bytes and 23,316 triangles, compared with the original 2,382,400 bytes and 37,312 triangles. It retains three material batches and one embedded image. Preparation asserts all ten pillars remain and exactly 28 obsolete low components are removed. Exact component bounds and output hashes are in `asset-sources/forum-fountain/provenance.json`. The runtime audit includes 35 assets and 23 self-contained GLBs.

## Local verification

All browser work used the Codex inbuilt browser.

- Desktop inspection at 1444 by 1278 confirms both basins, peripheral and central streams, lit column bases, readable signs, both marked paving changes and retained composition. The basin remains inside the first paving ring, with no intersecting baggage belts or telescope. Phone inspection at 390 by 844 confirms visible fountains and usable controls. The viewport override was reset afterward.
- Star Alliance loads three aircraft, SkyTeam two, and oneworld three. Accor selection constructs one terrace. Replay restarts aircraft progress at 0.000, 0.000, 0.000 while the fountain continues with the scene phase. Cinematic and Balanced both render the fountains.
- Pause held fountain phase at 53.071 across observations. After the final underwater-light revision, it also held at 81.169 throughout phone inspection and viewport restoration. Resume advances the phase again.
- In the same unselected desktop Cinematic composition, sampled render calls changed from 802 to 838 and triangles from 7,009,210 to 7,046,662, an increase of 37,452 triangles, about 0.53 percent. Sampled frame rate changed from 58 to 53. These samples are indicative, not a controlled benchmark. Previously loaded selection assets remain cached, so later texture-memory readings are not directly comparable with a fresh page.
- Type check, all 19 existing tests, asset audit and final production build passed. The existing large-chunk build advisory remains. Scene-ready is true and asset failures are empty. Captured browser warning/error logs are empty. Screenshots are retained locally in `outputs/forum-fountain/`.

The revised local result was accepted before stage 3 began. Publication retains its separate acceptance step.
