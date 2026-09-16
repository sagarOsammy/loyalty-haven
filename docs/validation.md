# Validation record

## Publication approval and deferred checks, 16 September 2026

Sammy approved publication and Git push of the validated local pass. Phone performance, all further responsive/device testing, and live signed-in owner/non-owner access checks are deferred as low priority. Existing validation below remains historical evidence, not a request to repeat those checks. No additional device or signed-in production tests are part of this publication. Manual refresh on explicit request remains the data policy.

## Alliance expansion, verified 16 September 2026

- Sammy approved extending the retained aircraft style to the remaining alliances on 15 September. Five new GLBs and an editable Blender bundle were created with the approved geometry, separate paint and projected airline text. Tail initials are authored identifiers, not official airline logos. All five serialized models were reimported and rendered. Bounds match the approved airframe, approximately 11.576 wide × 3.539 high × 12.040 long in glTF coordinates. Each has 15 material primitives, 45,086 to 47,070 triangles. Total added runtime size is 9,872,344 bytes.
- Browser model clicks verify Virgin Atlantic 133,500 / redeemed 80,000, Vietnam Airlines 3,500 / Not recorded, Finnair 40,047 / Not recorded, Qatar Airways 39,667 / 11,000 and British Airways 2,524 / Not recorded. SkyTeam selects two aircraft and oneworld three. Accor and the total of 1,262,817 remain unchanged.
- oneworld replay was observed at intermediate progress 0.972,0.810,0.526 and then 1,1,1. Repeated switching through SkyTeam, Star Alliance, oneworld and SkyTeam ends on precisely Virgin Atlantic and Vietnam Airlines, with the Accor floor preserved. This exercises repeated selection, not exhaustive race or GPU lifecycle coverage.
- The active oneworld scene sampled 60 fps at the current desktop viewport, 1,191 draw calls and 6,241,225 multipass triangles. Final browser warnings/errors are empty and asset failures are empty. Phone-width checks report client width and scroll width both 390 pixels. Actual phone hardware remains untested.
- Before the new models were copied into place, missing SkyTeam files produced a visible reload message and the full ledger remained usable. Selection completion now refreshes diagnostic failure state, which previously omitted newly requested alliance failures. A fresh load after integration resolves the missing models. Wider network and graphics-context recovery coverage remains open.
- TypeScript validation, all five updated tests, 38-file asset audit with 30 self-contained GLBs, and Sites production packaging pass. Nine synthetic built-Worker access checks pass. Source/output hashes match for the original three realism models and all five additions, and the user-supplied telescope source hash is unchanged.
- An anonymous request to the existing live site on 15 September returns 401, authentication_required, private/no-store and no membership data. This does not establish live signed-in owner/non-owner isolation. Sites readback still identifies public version 7. The expansion remains local pending visual review and publication approval.
- Sammy chose manual refresh on explicit request. No balance refresh or scheduled synchronization was performed.

## Aircraft realism review, 15 September 2026

- The second aircraft pass is integrated for United, Avianca and Air Canada after Sammy selected further realism before alliance expansion. Camera, building layout, placement, arrival paths and model scale are unchanged. Both earlier runtime generations remain preserved.
- Serialized GLBs were inspected through reimported studio renders and the actual resort view. Models have matching bounds of approximately 11.576 × 3.539 × 12.040 in glTF coordinates. United has 45,116 triangles and 13 primitives, Avianca 46,256 and 12, Air Canada 45,400 and 13. The new models total 5,850,404 bytes, compared with 4,209,900 for the previous three derivatives.
- Browser direct clicks on United, Air Canada and Avianca show 98,000, 50,004 and 132,600 points respectively, with missing redemption values still displayed as Not recorded. The Accor terrace and saved total of 1,262,817 remain intact.
- Replay progresses from 0.001,0,0 to 1,1,1. Final browser readback has three aircraft, one Accor floor, `sceneReady: true`, no asset failures and no captured warnings/errors. At 2055 CSS pixels, scroll width equals client width. This local sample reports 60 fps, 1,170 draw calls, 6,240,925 multipass triangles and 134 textures. More aircraft geometry is balanced by fewer material primitives, but actual phone hardware remains untested.
- TypeScript validation, five existing tests and final Sites production packaging pass. Asset audit covers 33 retained files and 25 self-contained GLBs. Source generator, all first-pass derivatives and all new runtime files match their recorded hashes.
- Editable Blender components, reproducible generation code, provenance and two close-up renders are retained under `asset-sources/aircraft-realism/`. They remain generic authored airliners with approximate airline identity references. Exact aircraft types, current liveries and photoreal acceptance remain open.
- Current work is local for review. The live site has not been republished.

## Follow-up dependency maintenance, 15 September 2026

- Vinext beta.9 and RSC plugin 0.5.34, Cloudflare Vite plugin 1.54.9, Wrangler 4.131.2 and matching Workers types 5.20260911.1 install without peer overrides. Existing production dependency declarations are retained. Supported transitive library versions were refreshed.
- Final audit has four moderate package entries, all inherited from the single esbuild development-server advisory under Drizzle Kit. No high, critical or low entries remain. The latest stable Drizzle Kit still includes the older loader dependency. Details and reachability limits are recorded in `docs/dependency-review.md`.
- TypeScript, all five existing tests and Sites production packaging pass. The access-check script uses Miniflare 5's official legacy-options adapter and all nine synthetic identity cases pass. The production runtime behind the updated Wrangler serves the resort HTML and telescope GLB with HTTP 200, and returns anonymous HTTP 401 with `private, no-store` and no memberships payload.
- The temporary production test server was stopped after verification. The development preview remains available at `http://localhost:5174/`. No publishing or production secret changes were performed.

## Framework patch verification, 15 September 2026

- React, React DOM and React Server DOM Webpack are pinned to 19.2.8, Vite to 8.0.16. Supported peer ranges remain satisfied. The Sites production build and TypeScript validation pass, along with all five existing tests. The known 3D bundle-size and route-classification notices remain.
- `node scripts/verify-private-worker.mjs` passes nine cases using the actual built Worker in a local runtime with synthetic data. It checks anonymous and partial-identity denial, owner and non-owner isolation, denial after an owner response, missing allowlist, malformed snapshot, and normalized owner email. All responses retain `Cache-Control: private, no-store`. This tests application authorization with simulated trusted identity headers, not the hosted authentication layer.
- Browser verification at 2055 CSS pixels shows all three completed Star Alliance arrivals, one Accor terrace, unchanged saved totals, `sceneReady: true`, no asset failures, and no horizontal overflow. The sampled frame rate was 60 fps in this session. No cross-device performance claim follows from this sample.
- The private-details panel displays the sign-in requirement after an anonymous request. Captured browser warnings and errors are empty. Live signed-in owner and non-owner production verification remains open.
- Asset audit still reports 30 retained files and 22 self-contained GLBs. The supplied telescope and saved loyalty data are unchanged in this dependency step.
- Current npm audit reports 17 affected package entries, with 7 high. Same-day audit of the preserved original lockfile reports 19 entries, with 9 high. The previous 50-entry historical audit is not a directly attributable patch comparison. Further dependency maintenance remains in `docs/dependency-review.md`.
- Current changes remain local. Sites readback still reports public version 7. The local review is available at `http://localhost:5174/`.

## Continuation checks, 14 September 2026

- Sites readback confirms live version 7 and public site access. The later publication session intentionally made the scene public and retained owner authorization for private membership details.
- Fresh anonymous production request to `/api/loyalty/private` returned HTTP 401, `authentication_required`, `Cache-Control: private, no-store`, and no memberships payload. Signed-in owner and non-owner production checks were not repeated.
- Telescope derivative: 1,556,720 bytes and 33,810 triangles from the unchanged 9,891,392-byte source. Blender render inspected, then browser placement checked beside the forum.
- After telescope integration, the local scene reported no asset failures, three expected Star Alliance aircraft, one Accor floor and approximately 60 fps. Captured application console had no warnings or errors.
- All five existing data and interaction-rule tests passed. Saved totals remain 1,262,817 points, including Accor 707,916.
- Current root layout and publication status supersede the historical preservation and hosting notes below.

### Final detailing verification

- Three aircraft derivatives preserve the original overall bounds of 11.56 × 4.185 × 12.04 in exported position coordinates. The source generator and all original GLBs remain unchanged. New geometry has a slimmer fuselage, tapered wings and forward upper cockpit glazing. Export mesh validation completed without the earlier mesh warning.
- All three hotel GLBs were reimported. Object counts, triangle counts and module dimensions are preserved within 0.0001 m. Embedded non-color maps were corrected and the final hotel materials inspected in the browser.
- Direct browser clicks on refined United and Accor models opened 98,000 / Not recorded and 707,916 / 98,000 respectively.
- Replay advanced aircraft arrival progress from 0.001,0,0 to 1,1,1 and restored the Accor floor. No asset failures or captured browser warnings/errors were reported.
- Phone-width override requested 390 × 844 and rendered at the browser's existing zoom as 341 CSS pixels. Scroll width equaled client width, with the compact resort and controls visible. The override was reset afterward.
- Final desktop sampling reported about 30 fps. A comparison with the original aircraft/hotel asset paths in the same session also reported 30 fps. The earlier 60 fps sample was under different session conditions. These are local observations, not device-wide performance guarantees. Detailed materials increase the reported texture count from 60 to 134, including the telescope in both cases.
- Production packaging and TypeScript validation passed. Existing five tests passed. Asset audit found 30 retained files and 22 self-contained GLBs, including the six preserved predecessor GLBs. Sixteen model keys are loaded by the active scene.
- Source-control publication and deployment of this detailing pass have not been performed. Version 7 remains the existing published version. Resolve the recorded framework advisory before the next production update.

## Historical working slice, 13 September 2026

### Passed

- Production build completed through the installed Sites build script. The Three.js scene is dynamically imported. A large 3D bundle warning remains informational.
- TypeScript validation passed.
- Five targeted tests passed, covering original totals and null redemptions, aircraft ranking, hotel order and fixture separation, continuous belt joins and paused progress, and invalid browser-tool settings.
- The final hotel-base GLB reimport passed at exactly 17×11m, with its structural top at 3m. The furniture overhang was corrected in the saved Blender source.
- Fifteen GLBs loaded locally, with no reported asset failures in the inspected desktop scene.
- Three selected aircraft read back as Avianca LifeMiles, United Airlines and Air Canada.
- The Accor scene detail displayed 707916 points and 98000 redeemed. United displayed 98000 points and Not recorded for redeemed.
- Direct clicks on an aircraft, a moving-belt suitcase and the hotel each opened the matching saved program.
- The three-terrace fixture read back Accor plus two review IDs. The total stayed 1262817. Returning to saved balances restored the one real hotel.
- Mid-arrival pause held phase 36.768 and progress 0.003,0,0. Resume advanced from that position to phase 37.035 and progress 0.015,0,0.
- Ten hotel toggles while paused preserved three aircraft and one final Accor floor, with geometry and texture counts unchanged at 260 and 57. This checks repeated selection use, not every possible GPU lifecycle path.
- The latest desktop scene measured approximately 55 to 60 fps on this Mac. This is an observed local sample, not a cross-device performance guarantee.
- A requested 390×844 phone viewport was inspected with the browser's existing zoom, yielding 341 CSS pixels. No horizontal overflow. Heading and alliance labels were corrected. Phone mode presents a compact overview and full balance panels.
- A subsequent 883×1008 Codex preview exposed cropped buildings at medium widths. Camera distance now fits the resort to the viewport aspect ratio and keeps its viewing direction fixed. The corrected browser view shows the full hangar, hotel, forum and both baggage belts. Depth-of-field focus follows the adjusted camera distance.
- Dialog focus, Escape dismissal, the quality selector and ledger navigation worked.
- The fresh Brave review showed no application warnings or errors in its captured console.
- In the Codex browser, both WebMCP tools registered with the expected schemas and annotations. Valid configuration changed the visible controls and read back the same state. Invalid motion and unexpected read arguments failed without changing the scene. Brave reported this optional capability unavailable.

### Not yet validated or accepted

- Photoreal fidelity against Gemini-4 and GPT-2 remains an open visual acceptance item. Current models still have simplified forms and materials.
- Actual phone hardware performance, graphics-driver context-loss recovery, and every network failure path have not been exercised.
- SkyTeam and oneworld aircraft remain pending. Their balances are available, and the interface states that their models are pending.
- Hosted owner access, a live Notion refresh and publication have not been configured or tested for this rebuild.
- The optional Tripo telescope has not been downloaded or integrated. Image-to-3D has not been exercised.

### Preservation

The previous tracked project files remain unchanged. The new application, editable assets, audit and repeatable inventory live in rebuild. Source-control commits, pushes and deployment have not been performed.
