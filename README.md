# My Loyalty Haven rebuild

The active application is this repository. The former project is not part of this working copy. Preserved visual references live under `docs/reference-images/`.

## Published application

[Open the published site](https://my-loyalty-haven.solar-rhea-5542.chatgpt.site), The Site is owner-private. Membership details also retain the server-side owner check. See [project status and remaining work](docs/setup-review.md) for the current release, backlog, deferred checks and validation summary.

For local review, start the preview and open http://localhost:5173.

- The supplied cruise ship follows a timed crossing, with a fading foamy wake and dynamic sunset lighting.
- Supplied palm and distant mountain models, the retained cloud sky, and corner planting match the approved scene edits.
- Baggage controls provide precise rotation and position, guides, save and copy. Published offsets are left 0 percent forward, right 75 percent forward. Both rotations and across offsets are zero.
- Superseded runtime assets are recoverable under `asset-sources/retired-runtime/`, with hashes and updated authoring inputs.
- Each alliance brings up to three positive balances into the hangar, ranked by saved points.
- Accor builds the saved hotel terrace.
- Scene settings include a clearly marked three-terrace construction fixture.
- Moving luggage and aircraft open their original program balances.
- Pause, replay, quality controls and the complete saved ledger are available.
- SkyTeam selects Virgin Atlantic and Vietnam Airlines. oneworld selects Finnair, Qatar Airways and British Airways.
- Private account details open from Scene settings after owner-authorized ChatGPT sign-in.
- The supplied telescope has an optimized runtime copy beside the forum. Its original GLB remains in the repository root.

The public snapshot is dated 10 September 2026. Sammy selected manual refresh on explicit request, with no scheduled synchronization. Unknown redeemed values remain null. The construction fixture never changes the saved balance total.

## Run and verify

Requires Node.js 22.13 or newer. Dependencies and lockfile are already present.

```sh
npm run dev -- --port 5173
npm run typecheck
npm test
npm run inventory
npm run assets:audit
npm run lint
npm run build
```

For Sites packaging, use the installed Sites skill and its current `build-site.mjs` script. Do not hardcode a plugin cache version or reinitialize this checkout. The existing Sites identity is retained in `.openai/hosting.json`.

## Structure

| Location | Purpose |
| --- | --- |
| `app/haven.tsx` | Visible controls and saved balance panels |
| `app/api/loyalty/private/route.ts` | Owner-authorized private membership details endpoint |
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

## Private account details

Membership IDs and expiry notes are kept out of the public source and public
snapshot. Sites runtime secrets provide `LOYALTY_OWNER_USER_ID` or
`LOYALTY_OWNER_EMAIL`, together with `LOYALTY_PRIVATE_SNAPSHOT_JSON`. The API
requires ChatGPT sign-in, checks the explicit owner identity, and returns the
private payload with `Cache-Control: private, no-store`.

## Boundaries

The public snapshot is intentionally saved data, not a live Notion connection.
Private membership data is configured through Sites runtime secrets and never
belongs in source control. Generated models are original approximations and are
not certified aircraft replicas.

The preserved visual references are source material only, not a second application. `npm run inventory` creates local source-coverage reports, which are excluded from source control alongside generated dependency/runtime folders.

See [project status and remaining work](docs/setup-review.md) for the authoritative status, and [asset provenance](docs/asset-provenance.md) for asset origins and limitations.
