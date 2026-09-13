# Setup review, 13 September 2026

## Recommendation

Continue in the isolated rebuild and approve the working 3D slice before expanding it. The basic architecture is feasible on this Mac, but matching the reference requires better authored models and browser inspection, not additional prompt libraries.

## Findings and disposition

| Priority | Finding | Action and current status |
| --- | --- | --- |
| P1 | Visual fidelity was below the references, with generic geometry and flat materials | Fresh Blender assets, local texture maps, environment lighting, reflective water and depth of field added. The architectural and foliage revisions are integrated and inspected. Photorealism is not yet accepted. |
| P1 | Some alliance controls could imply aircraft existed when no matching assets were available | Star Alliance is the implemented arrival slice. Other alliance buttons explicitly open balances, their models remain pending. |
| P1 | Old scene recreation could lose selections when motion or snapshot options changed | The renderer instance retains options and reads the latest pending selection. Async asset staging commits only the newest generation. |
| P1 | Pausing mid-arrival jumped to the destination and could jump back when resumed | Scene clock now freezes without changing progress. New selections made while paused settle immediately. |
| P1 | Saved constant balances were described as live | Footer and ledger now show the saved date. All 11 original records and totals reconcile. No live refresh is claimed. |
| P1 | No verified owner access configuration for deployment | Local-only review continues. Owner-only hosted access and application data visibility must be verified before publishing. |
| P2 | Aircraft ranking relied on source array order | Explicit positive-balance sorting, deterministic tie handling and a three-aircraft cap are tested. SkyTeam correctly has two positive partners in data. |
| P2 | Multiple hotel ordering and re-creation were inconsistent | Hotel levels retain selection order, deduplicate, cap at three and preserve existing levels. The review fixture is separate from saved totals. |
| P2 | Shared model resources and labels could accumulate across changes | Shared assets are owned by one pool. Retired labels and cloned clipping materials are released immediately. Late fetches are canceled on teardown. |
| P2 | Static aircraft parts caused excessive draw calls | Asset exports batch by material. Browser measurements are recorded separately from offline render quality. |
| P2 | Frame-based motion changed speed with display refresh | A single elapsed-time clock drives movement. Luggage follows a continuous stadium path. Hidden tabs suspend rendering. |
| P2 | A desktop camera distance cropped buildings in medium-width preview panels | Camera distance now fits the viewport aspect ratio while preserving its viewing direction. The corrected 883px-wide browser view contains the main buildings and both belts. |
| P2 | Asset failures were previously hidden | Failed model or lighting loads surface a visible reload message. Point panels remain usable if graphics cannot start. |
| P2 | The old application and CSS were large and mixed unrelated responsibilities | The rebuild separates data, selection rules, rendering, asset ownership, animation and visible controls. Formatting is standardized on authored files. |
| P2 | New assets existed only in temporary worker folders | Editable Blender bundles and provenance are now preserved under asset-sources, with one public runtime copy of each model. |
| P2 | Source coverage and generated artifacts were unclear | The repeatable npm run inventory command audits this repository, including hidden files, system artifacts, dependencies and version-control metadata, without reading secret configuration values. Its generated reports stay local. Originals are preserved. |
| P3 | Native custom modal and select behavior duplicated supplied UI infrastructure | Shared Dialog and Select primitives now provide keyboard behavior and focus handling. |
| P3 | Preview directions depended on a cached plugin version | The new README names the active directory and stable project commands, referring to the current installed Sites skill for packaging. |

## Remaining limitations and decisions

1. The visual result still needs the user's review against Gemini-4 and GPT-2. Procedural model detail alone does not establish photorealism.
2. SkyTeam and oneworld aircraft, a live Notion refresh path, hosted owner access and final publication remain outside this working slice.
3. Only Accor exists in the saved hotel data. Two labeled sample terraces exercise construction without inventing hotel balances.
4. The Tripo experiment generated one generic telescope using free text-to-3D, not image-to-3D. The download was blocked by the browser. No personal reference was uploaded and no purchase was made.
5. WebMCP is optional. Both tools were exercised in the Codex browser with valid and invalid inputs. Brave currently lacks that optional capability.
6. The supplied framework contains optional database, authentication and component scaffolding. It is retained separately. Dependency pruning would add maintenance risk during the visual review and is deferred.

## Highest-priority work addressable today

The asset corrections, interaction checks, source preservation and local packaging are complete for the working slice. The next practical priorities after visual review are:

- Improve the aircraft shapes and hotel material finish against the supplied references, using the current browser composition as the review target.
- Extend the approved aircraft approach to SkyTeam and oneworld, preserving the verified positive-balance ranking.
- Verify hosted owner access and agree on the saved-data refresh path before publication.

## Optional Tripo unblock

The generated asset is at https://studio.tripo3d.ai/workspace/generate/c7fe6c5a-fd82-4eef-9f8f-a07173e0804f.

1. Open the telescope in Tripo Studio while signed in.
2. Choose Export, GLB, 2K. Stay within the displayed free allowance.
3. If the current browser blocks the download, use a browser that permits the download. Do not disable security protections for this project.
4. Save `loyalty-brass-telescope.glb` in the parent `personal-loyalty` folder.
5. Reply that the file is saved. I can then inspect, optimize and integrate it.

This optional prop does not block the core scene. Its current plan restrictions must be respected before any public or commercial use.
