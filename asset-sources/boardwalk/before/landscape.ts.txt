/** Keep the western trees, planters and planting beds together. */
const WEST_SHIFT = 6;
export const SIDE_GARDEN_CENTERS = [-32 - WEST_SHIFT, 31];
// Ground-plane positions of the four marked corners in the approved desktop view.
export const CORNER_LEAF_BEDS: [number, number, number, number][] = [
  [-17.9, 41.8, 8, 2.3], // Bottom left.
  [26.9, 35.9, 8, 2.3], // Bottom right.
  [43.2, -16.2, 8, 2.3], // Right beside the seawall.
  [-56.4, -17.7, 8, 2.3], // Left beside the seawall.
];
export const LEAF_BEDS = [
  [-34 - WEST_SHIFT, 0, 3.5, 38],
  [33, 0, 3.5, 38],
  [-12, 7.4, 8, 2.3],
  [20, 6.5, 16, 2.2],
  [0, -17.8, 58, 2.1],
  ...CORNER_LEAF_BEDS,
];
export const PALM_PLACEMENTS: [number, number, number, number][] = [
  [-32 - WEST_SHIFT, -14, 1.2, 1],
  [-31 - WEST_SHIFT, -4, 0.9, 2],
  [-32 - WEST_SHIFT, 8, 1.05, 0],
  [-30 - WEST_SHIFT, 21, 1.15, 3],
  [31, -14, 1.1, 0.4],
  [31, -4, 0.92, 2.1],
  [32, 6, 1.05, 3.4],
  [30, 19, 1.2, 1.3],
  [-5, -16, 0.9, 1.1],
  [4, -16, 0.8, 3.6],
  [29, -16, 1.1, 0],
  [-32 - WEST_SHIFT, -18, 1.05, 2.7],
];
export const PLANTER_PLACEMENTS = [
  [-8, 8], [8, 8], [-29 - WEST_SHIFT, 10], [29, 10],
  [8, -15], [-29 - WEST_SHIFT, -15], [27, -10],
];
