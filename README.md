# My Loyalty Haven rebuild

The active application is this repository. The former project is not part of this working copy. Preserved visual references live under `docs/reference-images/`.

## Current review

Open http://localhost:5174 while the local preview is running. This is an unpublished working slice awaiting visual approval.

- Star Alliance brings the three largest positive balances into the hangar.
- Accor builds the saved hotel terrace.
- Scene settings include a clearly marked three-terrace construction fixture.
- Moving luggage and aircraft open their original program balances.
- Pause, replay, quality controls and the complete saved ledger are available.
- SkyTeam and oneworld show their balances. Their aircraft models remain pending.

The public snapshot is dated 10 September 2026. It is not a live Notion connection. Unknown redeemed values remain null. The construction fixture never changes the saved balance total.

## Run and verify

Requires Node.js 22.13 or newer. Dependencies and lockfile are already present.

```sh
npm run dev -- --port 5174
npm run typecheck
npm test
npm run inventory
npm run assets:audit
npm run build
```

For Sites packaging, use the installed Sites skill and its current `build-site.mjs` script. Do not hardcode a plugin cache version or reinitialize this checkout. The existing Sites identity is retained in `.openai/hosting.json`.

## Structure

| Location | Purpose |
| --- | --- |
| `app/haven.tsx` | Visible controls and saved balance panels |
| `app/globals.css` | Shared resort theme and responsive layout |
| `lib/snapshot.ts` | Saved public data, original values preserved |
| `lib/selection.ts` | Ranking, hotel order, totals and isolated review fixture |
| `lib/scene/` | 3D asset ownership, scene, motion and geometry |
| `lib/webmcp.ts` | Optional browser tools, shares the same visible controls |
| `public/assets/` | Local runtime models and textures |
| `asset-sources/` | Editable Blender authoring bundles and provenance |
| `tests/` | Data reconciliation and animation path checks |
| `docs/` | Audit, inventory, provenance, review evidence and visual references |
| `components/ui/`, `vendor/`, `scripts/` | Supplied framework infrastructure, keep separate from product code |

## Boundaries

No deployment, source-control commit, paid asset purchase, or personal data upload has been made for this rebuild. Owner access and the eventual data-refresh path must be verified before publishing. Generated models are original approximations and are not certified aircraft replicas.

The preserved visual references are source material only, not a second application. `npm run inventory` creates local source-coverage reports, which are excluded from source control alongside generated dependency/runtime folders.

See `docs/setup-review.md` for the current findings and `docs/asset-provenance.md` for asset origins and limitations.
