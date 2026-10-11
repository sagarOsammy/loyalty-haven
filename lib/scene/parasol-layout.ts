import { AVENUE_LAYOUT, FORUM_LAYOUT } from "./forum.ts";
import { BOARDWALK_LAYOUT } from "./boardwalk-layout.ts";
import { cabanaKeepouts } from "./cabana-layout.ts";
import {
  ACCENT_PLANTER_PLACEMENTS,
  BED_ACCENT_PLACEMENTS,
} from "./planting-layout.ts";
import { PATH_LAMP_PLACEMENTS } from "./lighting.ts";
import { LEAF_BEDS, PALM_PLACEMENTS, PLANTER_PLACEMENTS } from "./landscape.ts";
import { benchKeepouts } from "./bench-layout.ts";
import {
  FLOWERING_TREE_PLACEMENTS,
  floweringTreeFootprint,
} from "./flowering-tree-layout.ts";

export type ParasolPlacement = {
  id: string;
  zone: "west-edge" | "east-edge" | "north-west" | "north-east";
  x: number;
  z: number;
  heading: number;
  description: string;
};

export type ParasolPart = "umbrella" | "chair-left" | "chair-right" | "table";

export type ParasolPartTarget = {
  width: number;
  depth: number;
  height: number;
  x: number;
  y: number;
  z: number;
  heading: number;
};

export type ParasolRect = {
  id: string;
  x: number;
  z: number;
  width: number;
  depth: number;
  /** World-space heading for the source rectangle, if it is rotated. */
  heading?: number;
  clearance?: number;
};

export type ParasolCircle = {
  id: string;
  x: number;
  z: number;
  radius: number;
  clearance?: number;
};

export type ParasolLayoutIssue = {
  parasolId: string;
  kind: "rect" | "circle" | "parasol";
  detail: string;
};

/**
 * Four compact seating groups frame the forum and avenue from the outer
 * gardens. The envelopes leave the central view, the boardwalk entrance, and
 * the retained building fronts open for the camera and for interaction.
 */
export const PARASOL_GROUP_TARGET = {
  width: 4.8,
  depth: 4.4,
  clearance: 0.55,
  floorY: 0.06,
} as const;

/**
 * The supplied patio GLB is a complete umbrella, table and four-chair set.
 * This is the normalized local envelope used by the optimized derivative,
 * before the parent anchor applies the group heading and world position.
 */
export const PARASOL_COMBINED_TARGET = {
  width: 4.25,
  depth: 4.0,
  height: 2.85,
} as const;

/**
 * The selected Tripo Option A assets are imported by the adapter. These
 * targets preserve a believable resort scale while allowing source-specific
 * dimensions to be normalized without changing each group's arrangement.
 */
export const PARASOL_PART_TARGETS: Readonly<Record<ParasolPart, ParasolPartTarget>> = {
  umbrella: {
    width: 3.55,
    depth: 3.55,
    height: 2.85,
    x: 0,
    y: 0,
    z: 0,
    heading: 0,
  },
  "chair-left": {
    width: 1.05,
    depth: 1.05,
    height: 1.05,
    x: -1.1,
    y: 0,
    z: 0.22,
    heading: -0.32,
  },
  "chair-right": {
    width: 1.05,
    depth: 1.05,
    height: 1.05,
    x: 1.1,
    y: 0,
    z: 0.22,
    heading: 0.32,
  },
  table: {
    width: 0.82,
    depth: 0.82,
    height: 0.68,
    x: 0,
    y: 0,
    z: 0.86,
    heading: 0,
  },
};

/**
 * Coordinates are world X/Z. The west and east groups sit beyond the long
 * side planting beds. The two north groups sit outside the forum radius and
 * below the corner beds, keeping the forum sign and avenue legible.
 */
export const PARASOL_PLACEMENTS: readonly ParasolPlacement[] = [
  {
    id: "parasol-west-edge",
    zone: "west-edge",
    x: -44,
    z: 22.5,
    heading: 0.08,
    description: "Ivory parasol seating beside the west garden edge",
  },
  {
    id: "parasol-east-edge",
    zone: "east-edge",
    x: 42,
    z: 22.5,
    heading: -0.08,
    description: "Ivory parasol seating beside the east garden edge",
  },
  {
    id: "parasol-north-west",
    zone: "north-west",
    x: -24,
    z: 30.5,
    heading: 0.18,
    description: "Ivory parasol seating framing the forum from the west",
  },
  {
    id: "parasol-north-east",
    zone: "north-east",
    x: 27,
    z: 29.5,
    heading: -0.16,
    description: "Ivory parasol seating framing the forum from the east",
  },
];

/** Existing scene reservations that the four groups must respect. */
export const PARASOL_DEFAULT_RECT_OBSTACLES: readonly ParasolRect[] = [
  {
    id: "hangar",
    x: -18,
    z: -4,
    width: 25,
    depth: 15,
    clearance: 0.55,
  },
  {
    id: "hotel",
    x: 17,
    z: -2,
    width: 17,
    depth: 11,
    clearance: 0.55,
  },
  {
    id: "central-avenue",
    x: AVENUE_LAYOUT.x,
    z: (AVENUE_LAYOUT.rearZ + AVENUE_LAYOUT.frontZ) / 2,
    width: AVENUE_LAYOUT.width,
    depth: AVENUE_LAYOUT.frontZ - AVENUE_LAYOUT.rearZ,
    clearance: 0.55,
  },
  {
    id: "waterfront-boardwalk",
    x: (BOARDWALK_LAYOUT.leftX + BOARDWALK_LAYOUT.rightX) / 2,
    z: (BOARDWALK_LAYOUT.rearZ + BOARDWALK_LAYOUT.frontZ) / 2,
    width: BOARDWALK_LAYOUT.rightX - BOARDWALK_LAYOUT.leftX,
    depth: BOARDWALK_LAYOUT.frontZ - BOARDWALK_LAYOUT.rearZ,
    clearance: 0.3,
  },
];

export const PARASOL_DEFAULT_CIRCLE_OBSTACLES: readonly ParasolCircle[] = [
  {
    id: "alliance-forum",
    x: FORUM_LAYOUT.x,
    z: FORUM_LAYOUT.z,
    radius: FORUM_LAYOUT.framingRadius,
    clearance: 0.65,
  },
];

/**
 * Bounds measured from the existing planter GLB before the scene's 0.55 root
 * scale is applied. Keeping these values here avoids the earlier nominal
 * 1.8m by 1.35m approximation in the seating audit.
 */
export const ORIGINAL_PLANTER_LOCAL_BOUNDS = {
  minX: -2.7267,
  maxX: 3.1286,
  minZ: -1.8274,
  maxZ: 2.0246,
} as const;

export const ORIGINAL_PLANTER_ROOT_SCALE = 0.55 as const;

export function originalPlanterFootprint(
  x: number,
  z: number,
  padding = 0.2,
): ParasolRect {
  const scale = ORIGINAL_PLANTER_ROOT_SCALE;
  const width = (ORIGINAL_PLANTER_LOCAL_BOUNDS.maxX - ORIGINAL_PLANTER_LOCAL_BOUNDS.minX) * scale;
  const depth = (ORIGINAL_PLANTER_LOCAL_BOUNDS.maxZ - ORIGINAL_PLANTER_LOCAL_BOUNDS.minZ) * scale;
  return {
    id: `existing-planter-${x}-${z}`,
    x: x + (ORIGINAL_PLANTER_LOCAL_BOUNDS.minX + ORIGINAL_PLANTER_LOCAL_BOUNDS.maxX) * scale / 2,
    z: z + (ORIGINAL_PLANTER_LOCAL_BOUNDS.minZ + ORIGINAL_PLANTER_LOCAL_BOUNDS.maxZ) * scale / 2,
    width,
    depth,
    clearance: padding,
  };
}

function rectObstacle(
  id: string,
  x: number,
  z: number,
  width: number,
  depth: number,
  clearance = 0,
): ParasolRect {
  return { id, x, z, width, depth, clearance };
}

/** Existing leaf beds are treated as full reserved rectangles, including
 * their low planter rims, so chairs do not straddle the soil edge. */
export const PARASOL_DEFAULT_LEAF_BED_OBSTACLES: readonly ParasolRect[] =
  LEAF_BEDS.map(([x, z, width, depth], index) =>
    rectObstacle(`leaf-bed-${index + 1}`, x, z, width, depth, 0.35));

/** Imported stage 6 foliage envelopes remain protected while stage 9 is fit. */
export const PARASOL_DEFAULT_ACCENT_PLANTING_OBSTACLES: readonly ParasolRect[] = [
  ...ACCENT_PLANTER_PLACEMENTS.map((placement) =>
    rectObstacle(
      `accent-planter-${placement.id}`,
      placement.x,
      placement.z,
      placement.maxWidth,
      placement.maxDepth,
      placement.footprint.clearance,
    )),
  ...BED_ACCENT_PLACEMENTS.map((placement) =>
    rectObstacle(
      `bed-accent-${placement.id}`,
      placement.x,
      placement.z,
      placement.maxWidth,
      placement.maxDepth,
      0.15,
    )),
];

/** Cabana keepouts are already expanded by the cabana module's clearance. */
export const PARASOL_DEFAULT_CABANA_OBSTACLES: readonly ParasolRect[] =
  cabanaKeepouts().map(({ id, footprint }) => rectObstacle(
    `cabana-${id}`,
    (footprint.left + footprint.right) / 2,
    (footprint.rear + footprint.front) / 2,
    footprint.right - footprint.left,
    footprint.front - footprint.rear,
  ));

/** Lamps need only a small hard keepout, but checking them prevents a chair
 * leg or table from hiding the warm fixture. */
export const PARASOL_DEFAULT_LAMP_OBSTACLES: readonly ParasolRect[] =
  PATH_LAMP_PLACEMENTS.map(([x, z], index) =>
    rectObstacle(`path-lamp-${index + 1}`, x, z, 0.45, 0.45, 0.18));

/** Palm root wells are circles because their trunks can be rotated within the
 * broad canopy. The radius matches the boardwalk and planting audits. */
export const PARASOL_DEFAULT_PALM_OBSTACLES: readonly ParasolCircle[] =
  PALM_PLACEMENTS.map(([x, z, scale], index) => ({
    id: `palm-${index + 1}`,
    x,
    z,
    radius: scale * 1.05 + 0.15,
    clearance: 0.3,
  }));

export const PARASOL_DEFAULT_PLANTER_OBSTACLES: readonly ParasolRect[] =
  PLANTER_PLACEMENTS.map(([x, z]) => originalPlanterFootprint(x, z));

/** The parallel flowering-tree and bench passes reserve their fitted world
 * envelopes here too, so the default parasol audit catches their final
 * positions even before the parent wires a cross-module audit together. */
export const PARASOL_DEFAULT_FLOWERING_TREE_OBSTACLES: readonly ParasolRect[] =
  FLOWERING_TREE_PLACEMENTS.map((placement) => {
    const footprint = floweringTreeFootprint(placement, 0.55);
    return rectObstacle(
      `flowering-tree-${placement.id}`,
      footprint.x,
      footprint.z,
      footprint.width,
      footprint.depth,
    );
  });

export const PARASOL_DEFAULT_BENCH_OBSTACLES: readonly ParasolRect[] =
  benchKeepouts().map(({ id, footprint }) => rectObstacle(
    `bench-${id}`,
    (footprint.left + footprint.right) / 2,
    (footprint.rear + footprint.front) / 2,
    footprint.right - footprint.left,
    footprint.front - footprint.rear,
  ));

/** Complete reserved scene geometry used by the default audit. */
export const PARASOL_DEFAULT_KEEP_OUTS = {
  rects: [
    ...PARASOL_DEFAULT_RECT_OBSTACLES,
    ...PARASOL_DEFAULT_LEAF_BED_OBSTACLES,
    ...PARASOL_DEFAULT_PLANTER_OBSTACLES,
    ...PARASOL_DEFAULT_ACCENT_PLANTING_OBSTACLES,
    ...PARASOL_DEFAULT_CABANA_OBSTACLES,
    ...PARASOL_DEFAULT_LAMP_OBSTACLES,
    ...PARASOL_DEFAULT_FLOWERING_TREE_OBSTACLES,
    ...PARASOL_DEFAULT_BENCH_OBSTACLES,
  ] as const,
  circles: [
    ...PARASOL_DEFAULT_CIRCLE_OBSTACLES,
    ...PARASOL_DEFAULT_PALM_OBSTACLES,
  ] as const,
};

function rotatedEnvelope(width: number, depth: number, heading: number, padding: number) {
  const cosine = Math.abs(Math.cos(heading));
  const sine = Math.abs(Math.sin(heading));
  return {
    width: width * cosine + depth * sine + padding * 2,
    depth: width * sine + depth * cosine + padding * 2,
  };
}

export function parasolFootprint(
  placement: ParasolPlacement,
  padding: number = PARASOL_GROUP_TARGET.clearance,
): ParasolRect {
  const envelope = rotatedEnvelope(
    PARASOL_GROUP_TARGET.width,
    PARASOL_GROUP_TARGET.depth,
    placement.heading,
    padding,
  );
  return {
    id: placement.id,
    x: placement.x,
    z: placement.z,
    width: envelope.width,
    depth: envelope.depth,
    heading: placement.heading,
  };
}

export function parasolFootprints(padding: number = PARASOL_GROUP_TARGET.clearance) {
  return PARASOL_PLACEMENTS.map((placement) => parasolFootprint(placement, padding));
}

function overlaps(a: ParasolRect, b: ParasolRect) {
  return Math.abs(a.x - b.x) * 2 < a.width + b.width
    && Math.abs(a.z - b.z) * 2 < a.depth + b.depth;
}

function intersectsCircle(rect: ParasolRect, circle: ParasolCircle) {
  const halfWidth = rect.width / 2;
  const halfDepth = rect.depth / 2;
  const nearestX = Math.max(rect.x - halfWidth, Math.min(circle.x, rect.x + halfWidth));
  const nearestZ = Math.max(rect.z - halfDepth, Math.min(circle.z, rect.z + halfDepth));
  const radius = circle.radius + (circle.clearance ?? 0);
  return Math.hypot(nearestX - circle.x, nearestZ - circle.z) < radius;
}

/**
 * Validate the compact group reservations against known scene geometry and
 * optional reservations authored by the tree and bench passes. The optional
 * arrays let those agents coordinate without importing their unfinished
 * modules into this isolated step.
 */
export function auditParasolLayout(input: {
  rectObstacles?: readonly ParasolRect[];
  circleObstacles?: readonly ParasolCircle[];
} = {}) {
  const issues: ParasolLayoutIssue[] = [];
  const rectObstacles = [
    ...PARASOL_DEFAULT_KEEP_OUTS.rects,
    ...(input.rectObstacles ?? []),
  ];
  const circleObstacles = [
    ...PARASOL_DEFAULT_KEEP_OUTS.circles,
    ...(input.circleObstacles ?? []),
  ];
  const footprints = PARASOL_PLACEMENTS.map((placement) => ({
    placement,
    footprint: parasolFootprint(placement),
  }));
  for (const { placement, footprint } of footprints) {
    for (const obstacle of rectObstacles) {
      if (overlaps(footprint, {
        ...obstacle,
        width: obstacle.width + (obstacle.clearance ?? 0) * 2,
        depth: obstacle.depth + (obstacle.clearance ?? 0) * 2,
      })) {
        issues.push({
          parasolId: placement.id,
          kind: "rect",
          detail: `${obstacle.id} overlap`,
        });
      }
    }
    for (const obstacle of circleObstacles) {
      if (intersectsCircle(footprint, obstacle)) {
        issues.push({
          parasolId: placement.id,
          kind: "circle",
          detail: `${obstacle.id} overlap`,
        });
      }
    }
  }
  for (let index = 0; index < footprints.length; index += 1) {
    for (let otherIndex = index + 1; otherIndex < footprints.length; otherIndex += 1) {
      if (overlaps(footprints[index].footprint, footprints[otherIndex].footprint)) {
        issues.push({
          parasolId: footprints[index].placement.id,
          kind: "parasol",
          detail: `${footprints[otherIndex].placement.id} overlap`,
        });
      }
    }
  }
  return issues;
}
