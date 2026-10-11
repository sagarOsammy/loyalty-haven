# Cruise route, 10 October 2026

The ship follows a constant-speed offshore route. At 150 seconds after a fresh page navigation, its sea-surface anchor reaches the annotated desktop point, 1143 by 258 pixels in the 1862 by 1278 page view. The scene canvas is 1862 by 1168, so the target is expressed relative to that canvas. Compact views preserve the horizontal fraction and leave a little water below the horizon.

The existing starting position and uniform ship scale are retained. Heading follows the travel direction with a 10-degree turn toward the viewer and gentle roll. After clearing the right edge, the ship returns from outside the left edge and repeats. The offscreen envelope includes the vessel, its long sunset shadow and its fading foam wake, so the wrap happens outside the visible view. Wake details and validation are recorded in `cruise-wake-20261010.md`.

A separate elapsed-time clock begins at page navigation. Frame delays and background tabs retain travel timing. Explicit pause freezes the route and roll. Replay of aircraft and hotel construction does not reset the cruise.

The sunset position and scene illumination are retained. A zero-intensity directional light supplies a moving shadow map along the same solar direction without adding brightness. Water now receives that shadow, while its reflection is rendered from the moving scene. Shadow maps refresh at approximately 20 Hz while motion is enabled, including palm and luggage motion, with immediate refresh on scene changes. The ship's map follows its position and keeps the same sun direction through resizing.

Automated tests verify the exact 150-second target, constant speed, waterline, offshore path, complete offscreen wrapping, repeated cycles and pause behavior across three aspect ratios. The environment tests confirm camera and horizon preservation. TypeScript and the production build pass.

The full fresh-load run was checked in the inbuilt browser. Live samples at 87.197 and 172.284 seconds follow the constant-speed route through the target at 150 seconds, with the interpolated world position within 0.001 units of the target. The screenshot was captured after arrival at approximately 172 seconds, rather than on the exact 150-second frame. Pause produced unchanged elapsed time, position and shadow-refresh timestamp across two readbacks. Solar and ship-shadow directions match, and there are no captured warnings, errors or failed assets. The observed scene ran around 49 to 59 fps on this computer.

Evidence: `outputs/cruise-route-start-20261010.jpg`, `outputs/cruise-route-arrival-20261010.jpg` and `outputs/cruise-route-verification-20261010.json`. Source ship models, personal balances and other scene assets are retained. Work remains local.
