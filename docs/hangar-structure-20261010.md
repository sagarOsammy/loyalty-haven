# Connected hangar structure, 10 October 2026

This release resolves the five marked browser comments and follows the requested change to start each aircraft aligned with its hangar bay over the sea.

| Comment | Change | Verification |
| --- | --- | --- |
| 1, moving rear pillars | Four fixed rear piers and six fixed jambs stay in the static frame. Only the three opaque brown shutters retract. | Serialized GLB checks exclude masonry and brass from moving groups, fixed frame transforms are unchanged through opening and closing. Browser replay confirms the frame remains present with shutters open. |
| 2, disconnected front pillars | Four front pillars extend to the barrel-vault ribs. A continuous front tie beam, side roof rails and sign suspension mounts connect the frame. | Serialized limestone vertices confirm the interior front pillars reach above 8.85 m. Browser checks show the supports touching the roof and beam. |
| 3 and 4, unexplained brown pieces | Remove the two unused blank front sign plates from the runtime derivative. | Generator identifies and removes exactly two plates, browser view has one main Airline Hangar sign attached to the roof. |
| 5, trees clipping the roof | Shift the western palm placements, matching planters, side garden and foliage bed 6 m left. | Bounds checks include all western palm crowns at both sway extremes, every crown stays outside the hangar's western edge. |

## Aircraft entry

The user requested starting aircraft in positions that fit the hangar directly, instead of aligning them late in their flights. Each aircraft now starts over the sea on its bay center line, holds that line and flies through its fixed rear portal. The sea-side descent, 4.8-second arrival time and 0.8-second stagger remain. Yaw and roll are level for entry. All eight existing detailed aircraft GLBs remain unchanged.

Fixed openings provide 7.23 m of clear width. Serialized bounds of all eight aircraft are checked in all three bays every 10 milliseconds during crossing. Wings clear the fixed jambs and tails clear the rear header. Rear shutters keep their shared scene clock, pause, resume and replay behavior.

## Source preservation

The original `public/assets/hangar.glb` and prior `hangar-rear-gates.glb` are preserved. The new runtime derivative is `public/assets/hangar-structure.glb`, with an editable Blender file, generator and source/output hashes in `asset-sources/architecture/`. Existing roof, glazing, floors and material textures are retained. Personal balances, private API code, typography, plaque rendering and existing aircraft assets are unchanged. Unrelated local documentation edits and deletions remain outside this publication.

Checks: TypeScript passes, nine tests pass, asset audit passes for 48 local assets including 40 self-contained GLBs. The browser verifies opening, pause and resume with the fixed frame present. This is desktop verification, physical mobile-device checks remain deferred.

Publication succeeded as Sites version `appgprj_6aa2610840a481919bc36f79be09b8ec~appgver_059c00c2fe9c819196546a9209320b6d`, deployment `appgdep_6aca456e82f08191a336b55e593f1a7f`, source commit `275fd6b1e236b1d1bedb8907e066049b700eff95`. Live browser verification shows the connected frame with all three shutters fully open and three aligned aircraft, working pause/resume, no asset failures or captured browser warnings/errors. Screenshot: `/private/tmp/loyalty-haven-fixed-structure.png`.
