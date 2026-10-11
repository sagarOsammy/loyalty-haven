import { AVENUE_LAYOUT } from "./forum.ts";

export const BOARDWALK_LAYOUT = {
  leftX: -49,
  rightX: 44,
  rearZ: -19.6,
  frontZ: -11.8,
  surfaceY: 0.015,
  gardenRearZ: -11.4,
  rearPlantingZ: -16.6,
  entranceX: AVENUE_LAYOUT.x,
  entranceWidth: AVENUE_LAYOUT.width,
  plantingOpeningWidth: AVENUE_LAYOUT.width + 1.2,
  plankWidth: 0.2,
  plankLength: 2.6,
  plankGap: 0.008,
} as const;

export function onBoardwalk(x: number, z: number) {
  return x >= BOARDWALK_LAYOUT.leftX && x <= BOARDWALK_LAYOUT.rightX
    && z >= BOARDWALK_LAYOUT.rearZ && z <= BOARDWALK_LAYOUT.frontZ;
}

/** Retain the front of each side bed, making room behind it for the promenade. */
export function boardwalkGardenDepth(frontZ: number) {
  return { depth: frontZ - BOARDWALK_LAYOUT.gardenRearZ,
    z: (frontZ + BOARDWALK_LAYOUT.gardenRearZ) / 2 };
}
