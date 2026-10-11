import * as THREE from "three";
import { AVENUE_LAYOUT, FORUM_LAYOUT } from "./forum.ts";
import { BOARDWALK_LAYOUT } from "./boardwalk-layout.ts";
import { BAGGAGE_LAYOUT, baggageFrame } from "./baggage.ts";
import { DEFAULT_BAGGAGE_ADJUSTMENTS } from "../baggage-settings.ts";
import { cabanaKeepouts } from "./cabana-layout.ts";
import { PATH_LAMP_PLACEMENTS } from "./lighting.ts";
import {
  ACCENT_PLANTER_PLACEMENTS,
  BED_ACCENT_PLACEMENTS,
} from "./planting-layout.ts";
import { LEAF_BEDS, PALM_PLACEMENTS, PLANTER_PLACEMENTS } from "./landscape.ts";
import {
  FLOWERING_TREE_PLACEMENTS,
  floweringTreeFootprint,
} from "./flowering-tree-layout.ts";

export type BenchPlacement = {
  id: string;
  x: number;
  z: number;
  heading: number;
  zone: "foreground-west" | "foreground-east" | "forum-west" | "forum-east";
  description: string;
};

export type BenchRect = {
  left: number;
  right: number;
  rear: number;
  front: number;
};

/**
 * The selected Tripo bench is fitted into this envelope after its GLB bounds
 * are inspected. The proportions leave enough room for a compact two-seat
 * bench while keeping the cream cushion visible beside the planting beds.
 */
export const BENCH_MODEL_TARGET = {
  width: 3.05,
  depth: 1.12,
  height: 1.25,
  clearance: 0.42,
  floorY: 0.03,
  maxTriangles: 80_000,
  maxVertices: 100_000,
} as const;

export const BENCH_ASSET_ROLES = [
  "solid timber frame",
  "beige or cream upholstered cushion",
  "compact outdoor seating proportions",
] as const;

/** Bounds of the original planter GLB in its local, unscaled coordinate frame. */
export const EXISTING_PLANTER_SOURCE_BOUNDS = {
  minX: -2.7267,
  maxX: 3.1286,
  minZ: -1.8274,
  maxZ: 2.0246,
  rootScale: 0.55,
} as const;

export const EXISTING_PLANTER_BOUNDS = {
  width: (EXISTING_PLANTER_SOURCE_BOUNDS.maxX - EXISTING_PLANTER_SOURCE_BOUNDS.minX)
    * EXISTING_PLANTER_SOURCE_BOUNDS.rootScale,
  depth: (EXISTING_PLANTER_SOURCE_BOUNDS.maxZ - EXISTING_PLANTER_SOURCE_BOUNDS.minZ)
    * EXISTING_PLANTER_SOURCE_BOUNDS.rootScale,
  offsetX: (EXISTING_PLANTER_SOURCE_BOUNDS.minX + EXISTING_PLANTER_SOURCE_BOUNDS.maxX)
    * EXISTING_PLANTER_SOURCE_BOUNDS.rootScale / 2,
  offsetZ: (EXISTING_PLANTER_SOURCE_BOUNDS.minZ + EXISTING_PLANTER_SOURCE_BOUNDS.maxZ)
    * EXISTING_PLANTER_SOURCE_BOUNDS.rootScale / 2,
} as const;

/**
 * Four seating pockets frame the visible court. The two foreground benches
 * sit outside the long side beds, while the inner pair frame the forum's
 * north edge. None occupies the six metre avenue or fountain footprint.
 */
export const BENCH_PLACEMENTS: readonly BenchPlacement[] = [
  {
    id: "bench-foreground-west",
    x: -24,
    z: 35,
    heading: 0.22,
    zone: "foreground-west",
    description: "Timber bench beside the west foreground planting edge",
  },
  {
    id: "bench-foreground-east",
    x: 13,
    z: 29,
    heading: -0.22,
    zone: "foreground-east",
    description: "Timber bench beside the east foreground planting edge",
  },
  {
    id: "bench-forum-west",
    x: -10.8,
    z: 34,
    heading: 0.14,
    zone: "forum-west",
    description: "Compact sofa framing the forum's north-west seating pocket",
  },
  {
    id: "bench-forum-east",
    x: 13.8,
    z: 34,
    heading: -0.14,
    zone: "forum-east",
    description: "Compact sofa framing the forum's north-east seating pocket",
  },
];

/** Rectangular keepouts exported for the flowering-tree and parasol passes. */
export function benchFootprint(
  placement: BenchPlacement,
  padding = 0,
): BenchRect {
  // Convert the oriented rectangular footprint into a conservative world
  // axis-aligned envelope. This keeps every collision check safe when the
  // imported bench is rotated around its anchor.
  const cos = Math.abs(Math.cos(placement.heading));
  const sin = Math.abs(Math.sin(placement.heading));
  const halfWidth = (BENCH_MODEL_TARGET.width * cos
    + BENCH_MODEL_TARGET.depth * sin) / 2 + padding;
  const halfDepth = (BENCH_MODEL_TARGET.width * sin
    + BENCH_MODEL_TARGET.depth * cos) / 2 + padding;
  return {
    left: placement.x - halfWidth,
    right: placement.x + halfWidth,
    rear: placement.z - halfDepth,
    front: placement.z + halfDepth,
  };
}

export function benchFootprints(padding = 0) {
  return BENCH_PLACEMENTS.map((placement) => ({
    ...placement,
    footprint: benchFootprint(placement, padding),
  }));
}

export function benchKeepouts() {
  return benchFootprints(BENCH_MODEL_TARGET.clearance);
}

function existingPlanterFootprint(x: number, z: number): BenchRect {
  return {
    left: x + EXISTING_PLANTER_SOURCE_BOUNDS.minX * EXISTING_PLANTER_SOURCE_BOUNDS.rootScale,
    right: x + EXISTING_PLANTER_SOURCE_BOUNDS.maxX * EXISTING_PLANTER_SOURCE_BOUNDS.rootScale,
    rear: z + EXISTING_PLANTER_SOURCE_BOUNDS.minZ * EXISTING_PLANTER_SOURCE_BOUNDS.rootScale,
    front: z + EXISTING_PLANTER_SOURCE_BOUNDS.maxZ * EXISTING_PLANTER_SOURCE_BOUNDS.rootScale,
  };
}

function rectFromCenter(
  x: number,
  z: number,
  width: number,
  depth: number,
): BenchRect {
  return {
    left: x - width / 2,
    right: x + width / 2,
    rear: z - depth / 2,
    front: z + depth / 2,
  };
}

function rotatedRectFromCenter(
  x: number,
  z: number,
  width: number,
  depth: number,
  heading: number,
  padding = 0,
): BenchRect {
  const cosine = Math.abs(Math.cos(heading));
  const sine = Math.abs(Math.sin(heading));
  return rectFromCenter(
    x,
    z,
    width * cosine + depth * sine + padding * 2,
    width * sine + depth * cosine + padding * 2,
  );
}

const BUILDING_FOOTPRINTS = [
  { id: "hangar", footprint: rectFromCenter(-18, -4, 25, 15) },
  { id: "hotel", footprint: rectFromCenter(17, -2, 17, 11) },
] as const;

const BED_FOOTPRINTS = LEAF_BEDS.map(([x, z, width, depth], index) => ({
  id: `existing-bed-${index + 1}`,
  footprint: rectFromCenter(x, z, width, depth),
}));

const EXISTING_PLANTER_FOOTPRINTS = PLANTER_PLACEMENTS.map(([x, z], index) => ({
  id: `existing-planter-${index + 1}`,
  footprint: existingPlanterFootprint(x, z),
}));

const ACCENT_PLANTER_FOOTPRINTS = ACCENT_PLANTER_PLACEMENTS.map((placement) => ({
  id: placement.id,
  footprint: rectFromCenter(placement.x, placement.z, placement.maxWidth, placement.maxDepth),
}));

const BED_ACCENT_FOOTPRINTS = BED_ACCENT_PLACEMENTS.map((placement) => ({
  id: placement.id,
  footprint: rectFromCenter(placement.x, placement.z, placement.maxWidth, placement.maxDepth),
}));

const CABANA_FOOTPRINTS = cabanaKeepouts().map(({ id, footprint }) => ({
  id,
  footprint: {
    left: footprint.left,
    right: footprint.right,
    rear: footprint.rear,
    front: footprint.front,
  },
}));

/** Current stage 7 tree reservations mirrored from flowering-tree-layout.ts. */
export const FLOWERING_TREE_RESERVED_ZONES = FLOWERING_TREE_PLACEMENTS.map((placement) => {
  const footprint = floweringTreeFootprint(placement, 0.55);
  return {
    id: `flowering-tree-${placement.id}`,
    footprint: rectFromCenter(footprint.x, footprint.z, footprint.width, footprint.depth),
  };
});

/** Current stage 9 patio reservations mirrored from parasol-layout.ts. */
export const PARASOL_RESERVED_ZONES = [
  { id: "parasol-west-edge", x: -44, z: 22.5, heading: 0.08 },
  { id: "parasol-east-edge", x: 42, z: 22.5, heading: -0.08 },
  { id: "parasol-north-west", x: -24, z: 30.5, heading: 0.18 },
  { id: "parasol-north-east", x: 27, z: 29.5, heading: -0.16 },
].map(({ id, x, z, heading }) => ({
  id,
  footprint: rotatedRectFromCenter(x, z, 4.8, 4.4, heading, 0.55),
}));

export const DEFAULT_BENCH_RESERVED_ZONES = [
  ...FLOWERING_TREE_RESERVED_ZONES,
  ...PARASOL_RESERVED_ZONES,
] as const;

const PALM_WELLS = PALM_PLACEMENTS.map(([x, z, scale], index) => ({
  id: `palm-well-${index + 1}`,
  x,
  z,
  radius: scale * 1.05 + 0.15,
}));

const BAGGAGE_FOOTPRINTS = DEFAULT_BAGGAGE_ADJUSTMENTS.map((adjustment, side) => {
  const frame = baggageFrame(side, adjustment);
  const center = new THREE.Vector3().setFromMatrixPosition(frame);
  const width = 10.995267868 * BAGGAGE_LAYOUT.scale;
  const depth = 4.7 * BAGGAGE_LAYOUT.scale;
  const radians = -THREE.MathUtils.degToRad(adjustment.turn);
  return {
    id: `baggage-${side + 1}`,
    footprint: rectFromCenter(
      center.x,
      center.z,
      Math.abs(Math.cos(radians)) * width + Math.abs(Math.sin(radians)) * depth,
      Math.abs(Math.sin(radians)) * width + Math.abs(Math.cos(radians)) * depth,
    ),
  };
});

function rectsOverlap(a: BenchRect, b: BenchRect) {
  return a.left < b.right && a.right > b.left
    && a.rear < b.front && a.front > b.rear;
}

function circleIntersectsRect(
  x: number,
  z: number,
  radius: number,
  rect: BenchRect,
) {
  const dx = Math.max(rect.left - x, 0, x - rect.right);
  const dz = Math.max(rect.rear - z, 0, z - rect.front);
  return Math.hypot(dx, dz) < radius;
}

export type BenchLayoutIssue = {
  benchId: string;
  kind:
    | "avenue"
    | "forum"
    | "boardwalk"
    | "building"
    | "baggage"
    | "existing-bed"
    | "existing-planter"
    | "accent-planter"
    | "bed-accent"
    | "cabana"
    | "bench"
    | "palm-well"
    | "lamp"
    | "reserved-zone";
  detail: string;
};

export type BenchLayoutAuditInput = {
  palmWells?: readonly { x: number; z: number; radius: number }[];
  pathLamps?: readonly [number, number][];
  existingBeds?: readonly { id?: string; footprint: BenchRect }[];
  existingPlanters?: readonly { id?: string; footprint: BenchRect }[];
  accentPlanters?: readonly { id?: string; footprint: BenchRect }[];
  bedAccents?: readonly { id?: string; footprint: BenchRect }[];
  buildings?: readonly { id?: string; footprint: BenchRect }[];
  baggageBelts?: readonly { id?: string; footprint: BenchRect }[];
  cabanas?: readonly { id?: string; footprint: BenchRect }[];
  /** Keepouts supplied by flowering trees, parasols or other seating. */
  reservedZones?: readonly { id: string; footprint: BenchRect }[];
  lampRadius?: number;
};

/**
 * Validate the fixed seating pockets before an imported source is repeated.
 * The audit intentionally accepts the tree and parasol keepouts as data so
 * those parallel passes can reserve their own zones without editing this
 * module or silently moving a bench.
 */
export function auditBenchLayout(
  input: BenchLayoutAuditInput = {},
): BenchLayoutIssue[] {
  const issues: BenchLayoutIssue[] = [];
  const avenue: BenchRect = {
    left: AVENUE_LAYOUT.x - AVENUE_LAYOUT.width / 2,
    right: AVENUE_LAYOUT.x + AVENUE_LAYOUT.width / 2,
    rear: AVENUE_LAYOUT.rearZ,
    front: AVENUE_LAYOUT.frontZ,
  };
  const boardwalk: BenchRect = {
    left: BOARDWALK_LAYOUT.leftX,
    right: BOARDWALK_LAYOUT.rightX,
    rear: BOARDWALK_LAYOUT.rearZ,
    front: BOARDWALK_LAYOUT.frontZ,
  };
  const lampRadius = input.lampRadius ?? 0.24;
  const palmWells = input.palmWells ?? PALM_WELLS;
  const pathLamps = input.pathLamps ?? PATH_LAMP_PLACEMENTS;
  const existingBeds = input.existingBeds ?? BED_FOOTPRINTS;
  const existingPlanters = input.existingPlanters ?? EXISTING_PLANTER_FOOTPRINTS;
  const accentPlanters = input.accentPlanters ?? ACCENT_PLANTER_FOOTPRINTS;
  const bedAccents = input.bedAccents ?? BED_ACCENT_FOOTPRINTS;
  const buildings = input.buildings ?? BUILDING_FOOTPRINTS;
  const baggageBelts = input.baggageBelts ?? BAGGAGE_FOOTPRINTS;
  const cabanas = input.cabanas ?? CABANA_FOOTPRINTS;
  const reservedZones = input.reservedZones ?? DEFAULT_BENCH_RESERVED_ZONES;

  for (const placement of BENCH_PLACEMENTS) {
    const keepout = benchFootprint(placement, BENCH_MODEL_TARGET.clearance);
    const fitted = benchFootprint(placement);
    if (rectsOverlap(keepout, avenue)) {
      issues.push({ benchId: placement.id, kind: "avenue", detail: "six metre central avenue" });
    }
    if (rectsOverlap(fitted, boardwalk)) {
      issues.push({ benchId: placement.id, kind: "boardwalk", detail: "waterfront boardwalk" });
    }
    if (circleIntersectsRect(
      FORUM_LAYOUT.x,
      FORUM_LAYOUT.z,
      FORUM_LAYOUT.framingRadius,
      keepout,
    )) {
      issues.push({ benchId: placement.id, kind: "forum", detail: "Alliance Forum framing radius" });
    }
    for (const building of buildings) {
      if (rectsOverlap(keepout, building.footprint)) {
        issues.push({ benchId: placement.id, kind: "building", detail: building.id ?? "building" });
      }
    }
    for (const belt of baggageBelts) {
      if (rectsOverlap(keepout, belt.footprint)) {
        issues.push({ benchId: placement.id, kind: "baggage", detail: belt.id ?? "baggage belt" });
      }
    }
    for (const bed of existingBeds) {
      if (rectsOverlap(keepout, bed.footprint)) {
        issues.push({ benchId: placement.id, kind: "existing-bed", detail: bed.id ?? "existing planting bed" });
      }
    }
    for (const planter of existingPlanters) {
      if (rectsOverlap(keepout, planter.footprint)) {
        issues.push({ benchId: placement.id, kind: "existing-planter", detail: planter.id ?? "existing planter" });
      }
    }
    for (const planter of accentPlanters) {
      if (rectsOverlap(keepout, planter.footprint)) {
        issues.push({ benchId: placement.id, kind: "accent-planter", detail: planter.id ?? "accent planter" });
      }
    }
    for (const accent of bedAccents) {
      if (rectsOverlap(keepout, accent.footprint)) {
        issues.push({ benchId: placement.id, kind: "bed-accent", detail: accent.id ?? "bed accent" });
      }
    }
    for (const cabana of cabanas) {
      if (rectsOverlap(keepout, cabana.footprint)) {
        issues.push({ benchId: placement.id, kind: "cabana", detail: cabana.id ?? "cabana" });
      }
    }
    palmWells.forEach((well, index) => {
      if (circleIntersectsRect(well.x, well.z, well.radius, keepout)) {
        issues.push({ benchId: placement.id, kind: "palm-well", detail: `palm well ${index + 1}` });
      }
    });
    pathLamps.forEach(([x, z], index) => {
      if (circleIntersectsRect(x, z, lampRadius, keepout)) {
        issues.push({ benchId: placement.id, kind: "lamp", detail: `path lamp ${index + 1}` });
      }
    });
    reservedZones.forEach((zone) => {
      if (rectsOverlap(keepout, zone.footprint)) {
        issues.push({ benchId: placement.id, kind: "reserved-zone", detail: zone.id });
      }
    });
    for (const other of BENCH_PLACEMENTS) {
      if (other.id === placement.id) continue;
      if (rectsOverlap(keepout, benchFootprint(other))) {
        issues.push({ benchId: placement.id, kind: "bench", detail: other.id });
      }
    }
  }

  return issues;
}

export const BENCH_LAYOUT_AUDIT = auditBenchLayout();
