# Cruise foam wake, updated 11 October 2026

The cruise bow turns 10 degrees toward the viewer relative to its travel direction. The existing starting position, scale, speed and 150-second arrival target remain in place.

A procedural water-surface wake starts at the stern. Animated turbulence produces warm white froth and ripples, spreading outward and losing opacity with age. Water parcels stay in the traversed water as the vessel advances. The 11 October revision makes the maximum wake 50 percent wider and longer, from 22 to 33 world units wide and from 65 to 97.5 seconds of traversed water. Brighter, denser froth, irregular wave crests and 72 animated short-lived spray droplets make the disturbance more visible. A fresh page builds the trail progressively. Explicit pause freezes the ship, turbulence, wake and spray together.

The offscreen loop includes the entire wake as well as the ship and sunset shadow. The foam is excluded from the water's reflection pass to avoid reflecting surface foam twice. Fog and tone mapping keep the foam within the existing sunset atmosphere. The ship's sunlight direction, moving reflection and regularly refreshed shadow maps remain active.

Initial validation, 10 October: type checking, six focused cruise/environment/wake tests and the production build passed. Inbuilt browser inspection confirmed visible froth, a fading tail, the 10-degree heading, empty asset-failure state and approximately 59 to 60 fps. Paused readbacks both reported 79.618 seconds, position -44.9404,-1.1200,-130.2946 and shadow timestamp 79621.4. Resuming advanced the ship and shadow refresh again.

Two rendering issues found during validation, missing fog uniforms and a reserved shader identifier, were corrected. No new captured warnings or errors occurred during the final live observation. Build output retains its bundle-size advisory.

Revision validation, 11 October: type checking, seven focused cruise/environment/wake tests and the production build pass. Tests cover the 50 percent size increase, stationary aging water, offscreen wrap, frozen spray time and release of all wake/spray resources. Inbuilt browser inspection confirmed the brighter foam and spray with empty captured warnings/errors and asset-failure state, at approximately 53 to 57 fps in the current viewport. The original 150-second route and 10-degree bow turn are preserved.

Evidence: `outputs/cruise-foamy-wake-20261010.jpg` and `outputs/cruise-splashier-wake-20261011.jpg`. The inbuilt preview remains open with motion enabled. Source models, saved balances and unrelated scene objects are retained. Work remains local.
