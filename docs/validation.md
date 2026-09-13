# Working slice validation, 13 September 2026

## Passed

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

## Not yet validated or accepted

- Photoreal fidelity against Gemini-4 and GPT-2 remains an open visual acceptance item. Current models still have simplified forms and materials.
- Actual phone hardware performance, graphics-driver context-loss recovery, and every network failure path have not been exercised.
- SkyTeam and oneworld aircraft remain pending. Their balances are available, and the interface states that their models are pending.
- Hosted owner access, a live Notion refresh and publication have not been configured or tested for this rebuild.
- The optional Tripo telescope has not been downloaded or integrated. Image-to-3D has not been exercised.

## Preservation

The previous tracked project files remain unchanged. The new application, editable assets, audit and repeatable inventory live in rebuild. Source-control commits, pushes and deployment have not been performed.
