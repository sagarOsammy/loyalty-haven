# Setup review, updated 16 September 2026

## Recommendation

Continue the approved composition in the repository root and improve aircraft shapes and hotel materials. Sammy approved retaining the composition on 14 September 2026. The rebuild was promoted to the root and published in a later session, so the original 13 September review no longer describes the deployment state.

## Findings and disposition

| Priority | Finding | Action and current status |
| --- | --- | --- |
| P1 | Visual fidelity was below the references, with generic geometry and flat materials | Fresh Blender assets, local texture maps, environment lighting, reflective water and depth of field added. The architectural and foliage revisions are integrated and inspected. Photorealism is not yet accepted. |
| P1 | Some alliance controls could imply aircraft existed when no matching assets were available | Star Alliance is the implemented arrival slice. Other alliance buttons explicitly open balances, their models remain pending. |
| P1 | Old scene recreation could lose selections when motion or snapshot options changed | The renderer instance retains options and reads the latest pending selection. Async asset staging commits only the newest generation. |
| P1 | Pausing mid-arrival jumped to the destination and could jump back when resumed | Scene clock now freezes without changing progress. New selections made while paused settle immediately. |
| P1 | Saved constant balances were described as live | Footer and ledger now show the saved date. All 11 original records and totals reconcile. No live refresh is claimed. |
| P1 | Hosting and private membership access | Later session 01a09b13-578a-79f2-ac02-e6f888efe161 implemented owner-gated membership details and published version 7. Sites readback on 14 September confirms public site access, matching the user request. Private endpoint rejects anonymous access and checks an explicit owner allowlist. Live signed-in owner/non-owner testing is deferred at Sammy’s request on 16 September 2026. |
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

## Current state and remaining work

| Order | Work | Status and next action |
| --- | --- | --- |
| 1 | Composition | Approved on 14 September, retain camera, spacing and building layout. |
| 2 | Visual detailing | Hotel materials and the supplied telescope are integrated. On 15 September, Sammy selected a further aircraft realism pass before alliance expansion. All three existing aircraft now use smoother, narrower airframes, swept airfoils, recessed engine fans, fine glazing and flush wordmarks. Editable derivatives and review renders are preserved. Scene composition and transforms are retained. Photorealism remains an open acceptance target. |
| 3 | SkyTeam and oneworld | Implemented locally after Sammy approved extending the aircraft style on 15 September. SkyTeam brings in Virgin Atlantic and Vietnam Airlines, oneworld brings in Finnair, Qatar Airways and British Airways. Controls, forum selection and optional browser tools select arrivals. All five aircraft open their exact saved balances, replay and repeated switching pass. Editable derivatives and renders are retained under asset-sources/alliance-expansion. |
| 4 | Membership details | Implemented and deployed in the later session. Public scene access is intentional. Keep membership IDs and expiry notes server-only behind ChatGPT authentication and an owner check. |
| 5 | Data refresh | Sammy selected manual refresh on request on 15 September in session 01a0a578-f3b5-7f22-b7fd-7013c41801d1. Retain the 10 September snapshot until explicitly asked to refresh. No scheduled refresh is authorized. Each requested refresh must read the source, reconcile identity, totals and blank values, and preserve the owner-only boundary for private details. |
| 6 | Publication of this pass | Sammy approved this pass for publication and Git push on 16 September 2026. Publish the validated aircraft, alliance, hotel, telescope and dependency changes to the existing public site while retaining the owner-only membership boundary. Version 7 was live at the pre-publication readback. |
| 7 | Dependency alerts | React/RSC, Vite, Vinext and Cloudflare updates are verified locally. Current audit has zero high or critical findings, with four moderate entries inherited from one Drizzle tooling advisory. The latest stable Drizzle release still retains that dependency. Production serving, five existing tests and nine built-Worker access checks pass. See `docs/dependency-review.md`. Local changes await publication. |
| 8 | Further validation | Deferred low priority by Sammy on 16 September: phone performance, all further responsive/device testing, and live signed-in owner/non-owner access checks. Resume only when requested. Complete graphics-context recovery and broader network failure coverage remain backlog items. Nine synthetic built-Worker access checks pass. |

Only Accor exists in the saved hotel data. The two labeled sample terraces remain a construction fixture and never alter saved totals. WebMCP remains optional. Framework scaffolding and existing dependencies stay in place.

## Telescope received

The source file `loyalty-brass-telescope.glb` is now present in the repository root. It came from the prior Tripo text-to-3D experiment, not an image-to-3D workflow. The root source is preserved unchanged. A reduced runtime derivative, reproducible preparation script and compact provenance are retained for the current review.

- Source: 9,891,392 bytes, 281,758 triangles.
- Runtime copy: 1,556,720 bytes, 33,810 triangles, embedded 1K texture maps.
- Placement: a small observation prop beside the forum, without changing building positions or balances.
- Source SHA-256: `801414c2d3389a2baa84c7f5d2ec44ca5e9553c58eb7531b9fc3c2c2cdfecf6d`.
- Tripo pricing checked on 14 September describes the free plan as public models for noncommercial use. The help center reserves commercial use for paid plans. Preserve that usage scope. Sources: [pricing](https://www.tripo3d.ai/pricing), [commercial-use guidance](https://www.tripo3d.ai/help/privacy-policy/how-to-use-tripo-models-commercially), [terms](https://www.tripo3d.ai/terms).

## Review provenance

- Original rebuild and visual checkpoint: session `01a094e0-bbd6-7192-b6ba-9fe50e50b3d3`.
- Root promotion, GitHub publication, private membership flow and public Sites access: session `01a09b13-578a-79f2-ac02-e6f888efe161`.
- Aircraft realism continuation: session `01a0a075-453b-7dd1-b77f-ce75f3484f0d`.
- Alliance expansion and manual refresh decision: session `01a0a578-f3b5-7f22-b7fd-7013c41801d1`.
- Active app: repository root. Historical references to `rebuild/` refer to the pre-promotion layout.
- Live site: [My Loyalty Haven](https://my-loyalty-haven.solar-rhea-5542.chatgpt.site), version 7 reported by Sites on 14 September. Current local refinements are separate from that published version.
