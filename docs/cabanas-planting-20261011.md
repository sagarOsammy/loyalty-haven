# Steps 5 and 6, implemented for local acceptance

Six cabanas, twelve new accent planters and ten foliage bed clusters now use Sammy's selected FBX exports. Two parallel workers prepared separate asset families. The parent integrated the active loader, scene groups, shared rendering batches and browser verification. Publication and step 7 require separate acceptance.

## Preserved sources and derivatives

| Asset | Supplied source vertices | Supplied source polygons | Supplied source triangles | Runtime vertices | Runtime triangles |
| --- | ---: | ---: | ---: | ---: | ---: |
| Cabana | 59,619 | 58,450 | 116,598 | 43,021 | 34,974 |
| Selected foliage | 13,668 | 13,344 | 26,483 | 16,432 | 11,796 |
| Assembled accent planter | Existing container plus selected foliage | n/a | n/a | 18,315 | 15,554 |

Source vertex counts and exported vertex counts measure different representations. Exported counts include duplicates at UV and material seams. The audit now records vertices for all GLBs. The cabana has a 2048 pixel color map and 1024 pixel supporting maps. Foliage uses 1024 pixel maps. All runtime maps are embedded. Original FBXs and all 28 original runtime files are byte-identical to their verified sources. Asset-level scripts, hashes, inspections, previews and provenance remain under each asset source folder. The selected cabana differs from the earlier linked candidate, so its URL was not inferred.

## Scene distribution

Cabanas fit uniformly within 4.3 by 2.45 by 3.7 metres, stand at boardwalk Y 0.05 and face the plaza. Centers are (-46, -13.2), (-44.5, -17.8), (-5.05, -13.2), (25, -13.2), (35.4, -13.2) and (41.3, -13.2). The staggered western pair and cabana near the hangar edge improve visibility in the retained camera. The hotel conceals part of the inner eastern cabana. Final keepouts check actual existing planter bounds, palm wells, beds, all path lamps, the avenue, deck limits and each other. Runtime reports zero issues.

Twelve new ivory containers hold both selected leaf clusters, with ten additional clusters inside existing beds. Existing seven planter groups and twelve palms are retained. Broad leaf and fern components are grounded separately, varied in height and orientation, and tinted toward deeper natural greens while preserving their maps. Dedicated cabana and planting groups keep the additions separate. Repeated planting meshes share geometry, maps and instanced drawing batches. Transform verification found a maximum matrix error below 0.00000003, preserving placement and scale. No new lights or reflection passes were added.

Camera, buildings, ship route, forum scale, marble, fountain behavior and boardwalk are retained.

## Visible and behavior verification

Desktop 1140 by 998 and phone 390 by 844 screenshots were reviewed in the inbuilt browser. The phone override was reset and the initial unselected, paused Cinematic controls restored. Paths remain clear and signs readable. The final scene reports all six cabanas, twelve accent pots and ten bed clusters, with no failed assets or captured console warnings/errors.

Star Alliance attaches three aircraft, SkyTeam two and oneworld three. Accor creates one terrace and toggles off successfully. Replay restarts arrival progress. Pause freezes ship elapsed time and fountain phase across observations, resume advances motion. Cinematic and Balanced both render the imported furnishings. The saved total remains 1,262,817 points.

Type checking, all 19 existing tests, focused linting and the production build pass. All 41 runtime assets were audited, including 26 self-contained GLBs. Built derivatives match source bytes. The existing build chunk-size advisory remains. Repository inventory classified 56,386 files during asset preparation, including hidden and system artifacts, configuration without reading contents, version-control metadata, source/assets, generated files, references and installed dependencies.

## Performance

A direct comparison under the same current desktop conditions, unselected Cinematic with motion enabled, measured about 58 fps before the new furnishings and 52 fps after them. Representative frames without a shadow refresh increase from 916 to 976 draw calls and from 7,098,988 to 8,642,344 rendered triangles. The 514,452 added asset triangles appear in three existing render passes. Geometry memory increases from 204 to 218 objects and textures from 59 to 68. A Balanced sample measured 64 fps. These are indicative live readings, ship position, background workloads and periodic shadows can change them. Readings during repeated alliance and hotel testing varied considerably and are retained in the raw browser record.

## Acceptance evidence

- `outputs/cabanas-planting/desktop.png`
- `outputs/cabanas-planting/phone.png`
- `outputs/cabanas-planting/browser-verification.json`
- `outputs/cabanas-planting/verification.json`

Sammy's requested preference to compare vertices alongside faces was saved for future recommendations for this project. Local visual acceptance remains pending.
