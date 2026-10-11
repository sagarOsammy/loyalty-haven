# Loyalty Haven: project status and remaining work

Updated 11 October 2026. This is the single current status document for the project.

## Release status

The October scene changes are approved for publication to the existing Site and GitHub repository. Sites access was verified as owner-private on 11 October, with the owner as the sole allowed viewer. Version 12 was the last deployed version before this release preparation. Publication history is available through Sites and GitHub main.

- Supplied cruise ship, timed crossing, larger fading foamy wake and a 10-degree bow turn toward the viewer.
- Supplied palms and enlarged right-side mountains, retained cloud sky, sunset horizon, water and directional sunlight.
- Manrope typography, smaller forum, removed alliance board and additional corner planting.
- Grounded baggage with hangar-aligned axes, 15 percent enlargement, precise adjustment controls and approved additional offsets left 0 percent, right 75 percent.
- Recoverable runtime-asset cleanup and personal GitHub author/committer identity `sagarOsammy`.

Membership IDs and expiry notes remain server-only. The saved public balances and personal source data retain their existing values. The September publication was version 8. Historical validation below remains dated to that release.

## October release validation

Type checking and all 19 scene/data tests pass. The runtime asset audit validates 28 files and 22 self-contained GLBs. The archived 28 files reconcile byte counts and unchanged SHA-256 hashes. Local inbuilt-browser verification covers baggage controls, saved preferences, scene readiness and asset loading. Production packaging and publication are performed from the same pushed Site source commit, with the existing owner-private audience preserved.

See [cleanup and release preparation](release-20261011.md) for the inventory classifications and author-correction mechanism.

## What remains

### Backlog

| Item | Remaining work | Completion condition |
| --- | --- | --- |
| Visual fidelity | Further photorealism against the retained references, if pursued. Models currently use generic airframes, approximate paint and authored identifiers. | A further visual pass reviewed and accepted by Sammy. Exact aircraft types and replica liveries require an agreed scope. |
| Graphics recovery | Exercise loss and restoration of the browser's 3D graphics context. | Rendering and interaction recover with selections retained, or a clear recovery action appears. |
| Network recovery | Broaden coverage beyond the missing-aircraft case already checked. | Representative failed or interrupted model and lighting requests produce clear errors and usable recovery, with the ledger available. |
| Dependency maintenance | Resolve the remaining moderate Drizzle tooling advisory when an upstream-supported update is available. | Compatible update passes the relevant build and access checks, and the advisory clears. Details below. |

These items were not required to block the approved release. No further work is currently running on them.

### Deferred by Sammy on 16 September

Resume only when requested:

- Phone hardware performance.
- Any further responsive or device testing.
- Live signed-in owner versus non-owner access testing.

### On request only

Balance refreshes are manual. The saved snapshot remains dated **10 September 2026**. No scheduled synchronization is authorized. A future explicit refresh request must reconcile source identities, totals and blank values, and preserve the public/private data boundary.

## Delivered baseline

| Area | Delivered behavior |
| --- | --- |
| Aircraft and alliances | Star Alliance displays Avianca, United and Air Canada. SkyTeam displays Virgin Atlantic and Vietnam Airlines. oneworld displays Finnair, Qatar Airways and British Airways. Up to three positive balances are selected by points, with deterministic tie handling. |
| Resort detailing | Refined airframes, cockpit glazing, engines, wings and landing gear. Detailed hotel materials and the supplied telescope are integrated without changing the approved layout. Editable models, original files and provenance remain preserved. |
| Hotels and balances | Accor is the only hotel in saved data. Two clearly labeled sample terraces exercise construction without changing real totals. Aircraft, hotel and luggage interactions open the corresponding saved balances. |
| Interaction and lifecycle | Pause, resume, replay, repeated selection and hotel ordering work. Async asset staging keeps the latest selection. Shared resource disposal, elapsed-time motion and hidden-tab suspension are implemented. Optional browser tools support all three alliances. |
| Errors and interface | Asset failures show a reload message while balance panels remain usable. Shared dialog/select controls provide keyboard and focus behavior. Saved dates and unknown redemption values are represented explicitly. |
| Dependencies | Coordinated React/RSC 19.2.8, Vite 8.0.16, Vinext beta.9, RSC plugin 0.5.34, Cloudflare plugin 1.54.9 and Wrangler 4.131.2 updates are included in the published release. |

## Validation evidence and limits

Completed during 13–16 September, before publication:

- **Build and logic:** TypeScript validation, five targeted tests and Sites production packaging passed. Tests cover saved totals and null values, aircraft ranking, hotel order and fixtures, movement/pause calculations, and browser-tool input validation.
- **Interactions and data:** all eight displayed aircraft opened their corresponding balances. Replay completed, repeated alliance switching ended with the correct aircraft, and Accor remained selected. The saved total reconciles to **1,262,817 points**, including **707,916 Accor points**. Unknown redemptions remain Not recorded.
- **Asset integrity:** the audit covered **38 retained runtime files and 30 self-contained GLBs**. All new aircraft were reimported and rendered. Original three-aircraft and five-addition hashes matched their provenance, and the supplied telescope source hash remained unchanged.
- **Error handling:** missing SkyTeam models produced a visible reload message and left the full ledger usable. A fresh load after integration resolved the failure. Final browser checks reported no missing assets, warnings or errors.
- **Access isolation:** nine checks against the built Worker passed using synthetic identities and data. They cover anonymous/partial identity rejection, owner/non-owner separation, cache isolation, missing configuration, malformed data and normalized email matching. An anonymous request to the then-live site also returned 401 with private/no-store caching and no membership data. Live signed-in production testing remains deferred.
- **Performance and layout:** the final active oneworld desktop sample reported about 60 fps. Earlier phone-width checks found no horizontal overflow. These observations do not establish physical-phone performance or exhaustive device compatibility. Further device checks are deferred.

## Remaining dependency advisory

At the **16 September publication check**, npm reported four moderate package entries, with zero high or critical entries. GitHub's refreshed result reported one moderate advisory. Both refer to the same underlying [esbuild development-server advisory, GHSA-67mh-4wv8-2f99](https://github.com/evanw/esbuild/security/advisories/GHSA-67mh-4wv8-2f99).

Dependency path: `drizzle-kit 0.31.10 → @esbuild-kit/esm-loader → @esbuild-kit/core-utils → esbuild 0.18.20`.

The inspected loader used transform functions, with no serve/context call found. The active preview used patched esbuild 0.28.1. Exposure through the old loader was not demonstrated. The latest stable Drizzle release checked during maintenance still retained it. Recheck upstream availability during a future dependency pass. The audit-proposed breaking downgrade was not applied. Audit counts are dated observations and may change.

## Where to find details

- [README](../README.md): local setup, commands and repository structure.
- [Asset provenance](asset-provenance.md): asset sources, transformations and licensing limits, including the retained noncommercial scope of the Tripo telescope.
- [Asset manifest](asset-manifest.json): runtime file hashes, sizes and model structure.
- [Editable asset sources](../asset-sources/): scripts, Blender files, renders and source/output hashes.
- [Tests](../tests/selection.test.ts) and [built-Worker access checks](../scripts/verify-private-worker.mjs): repeatable logic and authorization verification.

## Consolidation record

This document combines the previous setup review, dependency review and validation record. Repeated phase logs, obsolete version-7/pending-publication claims and superseded measurements were removed. The two superseded documents were removed from the working tree. Their full contents and the earlier setup review remain recoverable in the historical release tree and the author-correction backup.

Publication and the manual-refresh/deferred-testing decisions are recorded in session `01a0a578-f3b5-7f22-b7fd-7013c41801d1`. The documentation consolidation preserves saved personal data.
