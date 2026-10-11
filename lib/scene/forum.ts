/** Shared layout keeps the pavilion, its forecourt and the approach together. */
export const FORUM_LAYOUT = {
  x: 1.5,
  z: 25,
  y: 0.08,
  scale: 1.5 * 0.75,
  courtRadius: 8.2 * 0.75,
  // Keep the approved camera composition while the pavilion gets smaller.
  framingRadius: 8.2,
};

// The facing building edges are -5.5 and 8.5 metres, leaving equal four-metre gaps.
export const AVENUE_LAYOUT = {
  x: 1.5,
  width: 6,
  rearZ: -16.5,
  frontZ: FORUM_LAYOUT.z,
};
