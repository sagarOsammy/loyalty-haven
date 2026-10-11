import { FORUM_LAYOUT, AVENUE_LAYOUT } from "./forum.ts";
import { BOARDWALK_LAYOUT } from "./boardwalk-layout.ts";
import { LEAF_BEDS, PALM_PLACEMENTS, PLANTER_PLACEMENTS } from "./landscape.ts";
import { PATH_LAMP_PLACEMENTS } from "./lighting.ts";
import { cabanaKeepouts } from "./cabana-layout.ts";
import {
  ACCENT_PLANTER_PLACEMENTS,
  BED_ACCENT_PLACEMENTS,
} from "./planting-layout.ts";

export type FloweringTreeVariant = "white-blossom" | "pale-blush";

export interface FloweringTreePlacement {
  id: string;
  side: "west" | "east";
  zone: "foreground" | "seating-edge" | "waterfront-edge";
  x: number;
  z: number;
  heading: number;
  assetScale: number;
  maxWidth: number;
  maxDepth: number;
  maxHeight: number;
  groundY: number;
  variant: FloweringTreeVariant;
  description: string;
}

export interface FloweringTreeRect {
  id?: string;
  x: number;
  z: number;
  width: number;
  depth: number;
  clearance?: number;
}

export type FloweringTreeLayoutIssueKind =
  | "count"
  | "avenue"
  | "boardwalk"
  | "building"
  | "existing-bed"
  | "existing-planter"
  | "accent-planter"
  | "bed-accent"
  | "palm"
  | "path-lamp"
  | "cabana"
  | "tree"
  | "seating";

export interface FloweringTreeLayoutIssue {
  treeId: string;
  kind: FloweringTreeLayoutIssueKind;
  detail: string;
}

/**
 * Imported trees stay at the outside edges of the plaza. The paired rows
 * frame seating and foreground planting while leaving the avenue, forum sign,
 * building faces, and waterfront cabanas readable from the approved camera.
 */
export const FLOWERING_TREE_TARGET = {
  height: 4.25,
  maxWidth: 4.8,
  maxDepth: 4.8,
  clearance: 0.55,
  groundY: 0.15,
  maxTriangles: 80_000,
  maxVertices: 100_000,
} as const;

/** Lightweight planted bases authored separately from the imported tree GLB. */
export const FLOWERING_TREE_BASE_TARGET = {
  diameter: 1.7,
  innerDiameter: 1.44,
  soilDepth: 0.15,
  copingHeight: 0.18,
  soilTopY: 0.15,
  copingTopY: 0.18,
} as const;

/** Six edge trees, with varied height and the selected white-blossom source. */
export const FLOWERING_TREE_PLACEMENTS: readonly FloweringTreePlacement[] = [
  {
    id: "flowering-tree-west-foreground",
    side: "west",
    zone: "foreground",
    x: -18.25,
    z: 37.25,
    heading: 0.18,
    assetScale: 1.02,
    maxWidth: 4.8,
    maxDepth: 4.6,
    maxHeight: 4.45,
    groundY: FLOWERING_TREE_TARGET.groundY,
    variant: "white-blossom",
    description: "White-blossom tree framing the west foreground seating edge",
  },
  {
    id: "flowering-tree-east-foreground",
    side: "east",
    zone: "foreground",
    x: 19.25,
    z: 31,
    heading: -0.22,
    assetScale: 0.96,
    maxWidth: 4.65,
    maxDepth: 4.55,
    maxHeight: 4.2,
    groundY: FLOWERING_TREE_TARGET.groundY,
    variant: "white-blossom",
    description: "White-blossom tree framing the east foreground seating edge",
  },
  {
    id: "flowering-tree-west-seating",
    side: "west",
    zone: "seating-edge",
    x: -30,
    z: 19,
    heading: 0.42,
    assetScale: 0.91,
    maxWidth: 4.5,
    maxDepth: 4.45,
    maxHeight: 3.95,
    groundY: FLOWERING_TREE_TARGET.groundY,
    variant: "white-blossom",
    description: "Lower white-blossom canopy behind the west seating group",
  },
  {
    id: "flowering-tree-east-seating",
    side: "east",
    zone: "seating-edge",
    x: 34,
    z: 23,
    heading: -0.34,
    assetScale: 1.01,
    maxWidth: 4.75,
    maxDepth: 4.55,
    maxHeight: 4.35,
    groundY: FLOWERING_TREE_TARGET.groundY,
    variant: "white-blossom",
    description: "White-blossom canopy behind the east seating group",
  },
  {
    id: "flowering-tree-west-waterfront",
    side: "west",
    zone: "waterfront-edge",
    x: -45,
    z: -6,
    heading: 0.1,
    assetScale: 0.94,
    maxWidth: 4.55,
    maxDepth: 4.5,
    maxHeight: 4.05,
    groundY: FLOWERING_TREE_TARGET.groundY,
    variant: "white-blossom",
    description: "White-blossom tree at the west waterfront edge",
  },
  {
    id: "flowering-tree-east-waterfront",
    side: "east",
    zone: "waterfront-edge",
    x: 38.5,
    z: -5,
    heading: -0.28,
    assetScale: 0.99,
    maxWidth: 4.7,
    maxDepth: 4.6,
    maxHeight: 4.25,
    groundY: FLOWERING_TREE_TARGET.groundY,
    variant: "white-blossom",
    description: "White-blossom tree at the east waterfront edge",
  },
];

const BUILDING_KEEP_OUTS: readonly FloweringTreeRect[] = [
  { id: "hangar", x: -18, z: -4, width: 25, depth: 15 },
  { id: "hotel", x: 17, z: -2, width: 17, depth: 11 },
];

type Rect = { x: number; z: number; width: number; depth: number };

/**
 * Return the axis-aligned world envelope after the tree anchor rotates the
 * source. Asset scales above one are included conservatively, while scales
 * below one retain the reserved envelope so later source swaps stay safe.
 */
export function floweringTreeFootprint(
  tree: FloweringTreePlacement,
  padding = 0,
): FloweringTreeRect {
  const scale = Math.max(tree.assetScale, 1);
  const width = tree.maxWidth * scale + padding * 2;
  const depth = tree.maxDepth * scale + padding * 2;
  const cosine = Math.abs(Math.cos(tree.heading));
  const sine = Math.abs(Math.sin(tree.heading));
  return {
    id: tree.id,
    x: tree.x,
    z: tree.z,
    width: cosine * width + sine * depth,
    depth: sine * width + cosine * depth,
  };
}

/** Bounds of the selected existing planter root at its scene scale. */
export const EXISTING_PLANTER_ROOT_BOUNDS = {
  localMinX: -2.7267,
  localMaxX: 3.1286,
  localMinZ: -1.8274,
  localMaxZ: 2.0246,
  sceneScale: 0.55,
  width: (3.1286 - -2.7267) * 0.55,
  depth: (2.0246 - -1.8274) * 0.55,
  offsetX: (-2.7267 + 3.1286) * 0.55 / 2,
  offsetZ: (-1.8274 + 2.0246) * 0.55 / 2,
} as const;

function rectsOverlap(a: Rect, b: Rect) {
  return Math.abs(a.x - b.x) * 2 < a.width + b.width
    && Math.abs(a.z - b.z) * 2 < a.depth + b.depth;
}

function rectangle(id: string, x: number, z: number, width: number, depth: number): FloweringTreeRect {
  return { id, x, z, width, depth };
}

function asExistingPlanters(): FloweringTreeRect[] {
  return PLANTER_PLACEMENTS.map(([x, z], index) => rectangle(
    `existing-planter-${index + 1}`,
    x + EXISTING_PLANTER_ROOT_BOUNDS.offsetX,
    z + EXISTING_PLANTER_ROOT_BOUNDS.offsetZ,
    EXISTING_PLANTER_ROOT_BOUNDS.width,
    EXISTING_PLANTER_ROOT_BOUNDS.depth,
  ));
}

function asExistingBeds(): FloweringTreeRect[] {
  return LEAF_BEDS.map(([x, z, width, depth], index) => rectangle(`existing-bed-${index + 1}`, x, z, width, depth));
}

function asAccentPlanters(): FloweringTreeRect[] {
  return ACCENT_PLANTER_PLACEMENTS.map((placement) => rectangle(
    placement.id,
    placement.x,
    placement.z,
    placement.maxWidth,
    placement.maxDepth,
  ));
}

function asBedAccents(): FloweringTreeRect[] {
  return BED_ACCENT_PLACEMENTS.map((placement) => rectangle(
    placement.id,
    placement.x,
    placement.z,
    placement.maxWidth,
    placement.maxDepth,
  ));
}

function asCabanas(): FloweringTreeRect[] {
  return cabanaKeepouts().map(({ id, footprint }) => rectangle(
    id,
    (footprint.left + footprint.right) / 2,
    (footprint.rear + footprint.front) / 2,
    footprint.right - footprint.left,
    footprint.front - footprint.rear,
  ));
}

/**
 * Validate the fixed edge layout before an imported source is attached. The
 * optional seating rectangles let steps 8 and 9 reserve their own footprints
 * without coupling this module to their implementation files.
 */
export function auditFloweringTreeLayout(input: {
  placements?: readonly FloweringTreePlacement[];
  seatingKeepouts?: readonly FloweringTreeRect[];
} = {}): FloweringTreeLayoutIssue[] {
  const placements = input.placements ?? FLOWERING_TREE_PLACEMENTS;
  const issues: FloweringTreeLayoutIssue[] = [];
  if (placements.length !== 6) {
    issues.push({
      treeId: "layout",
      kind: "count",
      detail: `Expected six flowering trees, received ${placements.length}`,
    });
  }

  const avenue = rectangle(
    "central-avenue",
    AVENUE_LAYOUT.x,
    (AVENUE_LAYOUT.rearZ + AVENUE_LAYOUT.frontZ) / 2,
    AVENUE_LAYOUT.width,
    AVENUE_LAYOUT.frontZ - AVENUE_LAYOUT.rearZ,
  );
  const boardwalk = rectangle(
    "boardwalk",
    (BOARDWALK_LAYOUT.leftX + BOARDWALK_LAYOUT.rightX) / 2,
    (BOARDWALK_LAYOUT.rearZ + BOARDWALK_LAYOUT.frontZ) / 2,
    BOARDWALK_LAYOUT.rightX - BOARDWALK_LAYOUT.leftX,
    BOARDWALK_LAYOUT.frontZ - BOARDWALK_LAYOUT.rearZ,
  );
  const protectedRects: FloweringTreeRect[][] = [
    BUILDING_KEEP_OUTS as FloweringTreeRect[],
    asExistingBeds(),
    asExistingPlanters(),
    asAccentPlanters(),
    asBedAccents(),
    asCabanas(),
    input.seatingKeepouts ? [...input.seatingKeepouts] : [],
  ];

  for (const placement of placements) {
    const keepout = floweringTreeFootprint(placement, FLOWERING_TREE_TARGET.clearance);
    if (rectsOverlap(keepout, avenue)) {
      issues.push({ treeId: placement.id, kind: "avenue", detail: "Tree enters the central avenue" });
    }
    if (rectsOverlap(keepout, boardwalk)) {
      issues.push({ treeId: placement.id, kind: "boardwalk", detail: "Tree enters the boardwalk footprint" });
    }
    for (const [groupIndex, group] of protectedRects.entries()) {
      for (const protectedRect of group) {
        if (!rectsOverlap(keepout, protectedRect)) continue;
        const kind: FloweringTreeLayoutIssueKind = [
          "building", "existing-bed", "existing-planter", "accent-planter",
          "bed-accent", "cabana", "seating",
        ][groupIndex] as FloweringTreeLayoutIssueKind;
        issues.push({
          treeId: placement.id,
          kind,
          detail: `Overlaps ${protectedRect.id ?? "reserved footprint"}`,
        });
      }
    }
    for (const [index, [palmX, palmZ, palmScale]] of PALM_PLACEMENTS.entries()) {
      const palmRadius = palmScale * 1.05 + 0.15 + FLOWERING_TREE_TARGET.clearance;
      if (Math.hypot(placement.x - palmX, placement.z - palmZ)
        < palmRadius + Math.max(placement.maxWidth, placement.maxDepth) / 2) {
        issues.push({
          treeId: placement.id,
          kind: "palm",
          detail: `Enters palm well ${index + 1} at ${palmX},${palmZ}`,
        });
      }
    }
    for (const [index, [lampX, lampZ]] of PATH_LAMP_PLACEMENTS.entries()) {
      if (!rectsOverlap(keepout, rectangle(`path-lamp-${index + 1}`, lampX, lampZ, 0.45, 0.45))) continue;
      issues.push({
        treeId: placement.id,
        kind: "path-lamp",
        detail: `Intersects path lamp ${index + 1} at ${lampX},${lampZ}`,
      });
    }
  }
  for (let index = 0; index < placements.length; index += 1) {
    for (let otherIndex = index + 1; otherIndex < placements.length; otherIndex += 1) {
      if (!rectsOverlap(
        floweringTreeFootprint(placements[index], FLOWERING_TREE_TARGET.clearance),
        floweringTreeFootprint(placements[otherIndex], FLOWERING_TREE_TARGET.clearance),
      )) continue;
      issues.push({
        treeId: placements[index].id,
        kind: "tree",
        detail: `Overlaps ${placements[otherIndex].id}`,
      });
    }
  }
  return issues;
}

export const FLOWERING_TREE_LAYOUT_VALIDATION = auditFloweringTreeLayout();

/** Expose the forum forecourt relationship for parent-level QA metadata. */
export const FLOWERING_TREE_FORUM_CLEARANCE = FLOWERING_TREE_PLACEMENTS.map((placement) => ({
  id: placement.id,
  distanceToForum: Math.hypot(placement.x - FORUM_LAYOUT.x, placement.z - FORUM_LAYOUT.z),
}));
