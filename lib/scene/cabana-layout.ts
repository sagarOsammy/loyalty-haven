import { BOARDWALK_LAYOUT } from "./boardwalk-layout.ts";

export type CabanaPlacement = {
  id: string;
  x: number;
  z: number;
  heading: number;
};

export type CabanaRect = {
  left: number;
  right: number;
  rear: number;
  front: number;
};

export type CabanaPalmWell = {
  x: number;
  z: number;
  radius: number;
};

export type CabanaLeafBed = {
  x: number;
  z: number;
  width: number;
  depth: number;
};

export type CabanaLayoutAuditIssue = {
  cabanaId: string;
  kind: "palm-well" | "leaf-bed" | "path-lamp" | "existing-planter" | "cabana" | "avenue" | "boardwalk";
  detail: string;
};

/**
 * A compact open cabana fits the boardwalk while leaving a clear avenue and
 * the existing planting beds visible around it. The imported model is fitted
 * to these limits after its own source dimensions are inspected.
 */
export const CABANA_MODEL_TARGET = {
  width: 4.3,
  depth: 2.45,
  height: 3.7,
  clearance: 0.35,
  floorY: BOARDWALK_LAYOUT.surfaceY + 0.035,
} as const;

export const CABANA_LAYOUT = {
  rowZ: -13.2,
  boardwalkLeft: BOARDWALK_LAYOUT.leftX,
  boardwalkRight: BOARDWALK_LAYOUT.rightX,
  boardwalkRear: BOARDWALK_LAYOUT.rearZ,
  boardwalkFront: BOARDWALK_LAYOUT.frontZ,
  centralAvenueLeft: BOARDWALK_LAYOUT.entranceX - BOARDWALK_LAYOUT.entranceWidth / 2,
  centralAvenueRight: BOARDWALK_LAYOUT.entranceX + BOARDWALK_LAYOUT.entranceWidth / 2,
  model: CABANA_MODEL_TARGET,
} as const;

/**
 * Three cabanas on each side keep existing pots and palm wells clear. The
 * staggered western pair and inner western cabana show beside the hangar.
 */
export const CABANA_PLACEMENTS: readonly CabanaPlacement[] = [
  { id: "cabana-01", x: -46, z: CABANA_LAYOUT.rowZ, heading: 0 },
  { id: "cabana-02", x: -44.5, z: -17.8, heading: 0 },
  { id: "cabana-03", x: -5.05, z: CABANA_LAYOUT.rowZ, heading: 0 },
  { id: "cabana-04", x: 25, z: CABANA_LAYOUT.rowZ, heading: 0 },
  { id: "cabana-05", x: 35.4, z: CABANA_LAYOUT.rowZ, heading: 0 },
  { id: "cabana-06", x: 41.3, z: CABANA_LAYOUT.rowZ, heading: 0 },
];

export const CABANA_ASSET_ROLES = [
  "teak frame and posts",
  "white square canopy",
  "tied white corner curtains",
  "cream upholstered daybed",
] as const;

export function cabanaFootprint(
  placement: CabanaPlacement,
  padding = 0,
): CabanaRect {
  const halfWidth = CABANA_MODEL_TARGET.width / 2 + padding;
  const halfDepth = CABANA_MODEL_TARGET.depth / 2 + padding;
  return {
    left: placement.x - halfWidth,
    right: placement.x + halfWidth,
    rear: placement.z - halfDepth,
    front: placement.z + halfDepth,
  };
}

export function cabanaFootprints(padding = 0) {
  return CABANA_PLACEMENTS.map((placement) => ({
    ...placement,
    footprint: cabanaFootprint(placement, padding),
  }));
}

/** The space reserved for the vegetation pass around each cabana. */
export function cabanaKeepouts() {
  return cabanaFootprints(CABANA_MODEL_TARGET.clearance);
}

export function isInsideCentralAvenue(placement: CabanaPlacement) {
  const footprint = cabanaFootprint(placement, CABANA_MODEL_TARGET.clearance);
  return footprint.left < CABANA_LAYOUT.centralAvenueRight
    && footprint.right > CABANA_LAYOUT.centralAvenueLeft;
}

export function isInsideBoardwalk(placement: CabanaPlacement) {
  const footprint = cabanaFootprint(placement);
  return footprint.left >= CABANA_LAYOUT.boardwalkLeft
    && footprint.right <= CABANA_LAYOUT.boardwalkRight
    && footprint.rear >= CABANA_LAYOUT.boardwalkRear
    && footprint.front <= CABANA_LAYOUT.boardwalkFront;
}

function circleIntersectsRect(
  x: number,
  z: number,
  radius: number,
  rect: CabanaRect,
) {
  const dx = Math.max(rect.left - x, 0, x - rect.right);
  const dz = Math.max(rect.rear - z, 0, z - rect.front);
  return Math.hypot(dx, dz) < radius;
}

function rectsOverlap(a: CabanaRect, b: CabanaRect) {
  return a.left < b.right && a.right > b.left
    && a.rear < b.front && a.front > b.rear;
}

/**
 * Audit the reserved keepouts against the current boardwalk landscape. The
 * caller supplies source placements so this check stays aligned with the
 * active palm, bed and lamp arrays rather than duplicating their coordinates.
 */
export function auditCabanaLayout(input: {
  palmWells: readonly CabanaPalmWell[];
  leafBeds: readonly CabanaLeafBed[];
  pathLamps: readonly [number, number][];
  existingPlanters?: readonly CabanaRect[];
  lampRadius?: number;
}) {
  const issues: CabanaLayoutAuditIssue[] = [];
  const lampRadius = input.lampRadius ?? 0.2;
  for (const placement of CABANA_PLACEMENTS) {
    const keepout = cabanaFootprint(placement, CABANA_MODEL_TARGET.clearance);
    if (isInsideCentralAvenue(placement)) {
      issues.push({cabanaId: placement.id, kind: "avenue", detail: "Central avenue overlap"});
    }
    if (!isInsideBoardwalk(placement)) {
      issues.push({cabanaId: placement.id, kind: "boardwalk", detail: "Outside boardwalk"});
    }
    input.existingPlanters?.forEach((rect, index) => {
      if (rectsOverlap(keepout, rect)) {
        issues.push({cabanaId: placement.id, kind: "existing-planter", detail: `planter-${index + 1}`});
      }
    });
    CABANA_PLACEMENTS.filter(other => other.id !== placement.id).forEach(other => {
      if (rectsOverlap(keepout, cabanaFootprint(other))) {
        issues.push({cabanaId: placement.id, kind: "cabana", detail: other.id});
      }
    });
    input.palmWells.forEach((well, index) => {
      if (circleIntersectsRect(well.x, well.z, well.radius, keepout)) {
        issues.push({
          cabanaId: placement.id,
          kind: "palm-well",
          detail: `well-${index + 1} at ${well.x},${well.z}`,
        });
      }
    });
    input.leafBeds.forEach((bed, index) => {
      const rect: CabanaRect = {
        left: bed.x - bed.width / 2,
        right: bed.x + bed.width / 2,
        rear: bed.z - bed.depth / 2,
        front: bed.z + bed.depth / 2,
      };
      if (rectsOverlap(keepout, rect)) {
        issues.push({
          cabanaId: placement.id,
          kind: "leaf-bed",
          detail: `bed-${index + 1}`,
        });
      }
    });
    input.pathLamps.forEach(([x, z], index) => {
      if (circleIntersectsRect(x, z, lampRadius, keepout)) {
        issues.push({
          cabanaId: placement.id,
          kind: "path-lamp",
          detail: `lamp-${index + 1} at ${x},${z}`,
        });
      }
    });
  }
  return issues;
}
