import * as THREE from "three";
import { AVENUE_LAYOUT, FORUM_LAYOUT } from "./forum.ts";
import { BAGGAGE_LAYOUT, baggageFrame } from "./baggage.ts";
import { DEFAULT_BAGGAGE_ADJUSTMENTS } from "../baggage-settings.ts";
import { BOARDWALK_LAYOUT } from "./boardwalk-layout.ts";
import { cabanaKeepouts } from "./cabana-layout.ts";
import { PATH_LAMP_PLACEMENTS } from "./lighting.ts";
import { LEAF_BEDS, PALM_PLACEMENTS, PLANTER_PLACEMENTS } from "./landscape.ts";

export type PlantingZone = "forum" | "building-corner";

export interface PlantingFootprint {
  width: number;
  depth: number;
  clearance: number;
}

export interface AccentPlanterPlacement {
  id: string;
  zone: PlantingZone;
  x: number;
  z: number;
  heading: number;
  assetScale: number;
  maxWidth: number;
  maxDepth: number;
  maxHeight: number;
  groundY: number;
  footprint: PlantingFootprint;
  description: string;
}

export interface BedAccentPlacement {
  id: string;
  bedIndex: number;
  x: number;
  z: number;
  heading: number;
  assetScale: number;
  maxWidth: number;
  maxDepth: number;
  maxHeight: number;
  groundY: number;
  description: string;
}

/**
 * The 12 additions stay at the edges of the scene, leaving the six metre
 * central avenue and the forum sign readable from the approved camera.
 * Coordinates are world X/Z, with Y grounded by the import adapter.
 */
export const ACCENT_PLANTER_PLACEMENTS: readonly AccentPlanterPlacement[] = [
  {
    id: "forum-north-west",
    zone: "forum",
    x: -5.6,
    z: 31.8,
    heading: -0.3,
    assetScale: 0.87,
    maxWidth: 2.05,
    maxDepth: 1.5,
    maxHeight: 1.95,
    groundY: 0,
    footprint: { width: 1.85, depth: 1.3, clearance: 0.35 },
    description: "Broad accent foliage outside the forum north-west arc",
  },
  {
    id: "forum-north-east",
    zone: "forum",
    x: 8.6,
    z: 31.8,
    heading: 0.42,
    assetScale: 1.02,
    maxWidth: 2.2,
    maxDepth: 1.55,
    maxHeight: 2.15,
    groundY: 0,
    footprint: { width: 1.95, depth: 1.35, clearance: 0.35 },
    description: "Tall accent foliage outside the forum north-east arc",
  },
  {
    id: "forum-south-west",
    zone: "forum",
    x: -5.6,
    z: 18.2,
    heading: 0.22,
    assetScale: 0.82,
    maxWidth: 1.95,
    maxDepth: 1.45,
    maxHeight: 1.85,
    groundY: 0,
    footprint: { width: 1.8, depth: 1.25, clearance: 0.35 },
    description: "Lower accent foliage outside the forum south-west arc",
  },
  {
    id: "forum-south-east",
    zone: "forum",
    x: 8.6,
    z: 18.2,
    heading: -0.48,
    assetScale: 0.97,
    maxWidth: 2.1,
    maxDepth: 1.5,
    maxHeight: 2.05,
    groundY: 0,
    footprint: { width: 1.9, depth: 1.3, clearance: 0.35 },
    description: "Tall accent foliage outside the forum south-east arc",
  },
  {
    id: "hangar-front-west",
    zone: "building-corner",
    x: -32,
    z: 4.2,
    heading: 0.15,
    assetScale: 0.82,
    maxWidth: 2,
    maxDepth: 1.45,
    maxHeight: 1.85,
    groundY: 0,
    footprint: { width: 1.85, depth: 1.25, clearance: 0.35 },
    description: "Layered foliage at the hangar outer front corner",
  },
  {
    id: "hangar-front-east",
    zone: "building-corner",
    x: -4,
    z: 4.2,
    heading: -0.28,
    assetScale: 1.0,
    maxWidth: 2.15,
    maxDepth: 1.5,
    maxHeight: 2.1,
    groundY: 0,
    footprint: { width: 1.9, depth: 1.3, clearance: 0.35 },
    description: "Taller foliage at the hangar avenue-side corner",
  },
  {
    id: "hotel-front-west",
    zone: "building-corner",
    x: 7,
    z: 4.2,
    heading: 0.37,
    assetScale: 0.85,
    maxWidth: 2,
    maxDepth: 1.45,
    maxHeight: 1.9,
    groundY: 0,
    footprint: { width: 1.85, depth: 1.25, clearance: 0.35 },
    description: "Lower foliage at the hotel avenue-side corner",
  },
  {
    id: "hotel-front-east",
    zone: "building-corner",
    x: 27,
    z: 4.2,
    heading: -0.18,
    assetScale: 1.04,
    maxWidth: 2.25,
    maxDepth: 1.55,
    maxHeight: 2.2,
    groundY: 0,
    footprint: { width: 1.95, depth: 1.35, clearance: 0.35 },
    description: "Tall foliage at the hotel outer front corner",
  },
  {
    id: "hangar-rear-west",
    zone: "building-corner",
    x: -32,
    z: -9.9,
    heading: 0.55,
    assetScale: 0.92,
    maxWidth: 2.1,
    maxDepth: 1.5,
    maxHeight: 2,
    groundY: 0,
    footprint: { width: 1.9, depth: 1.3, clearance: 0.35 },
    description: "Water-facing foliage at the hangar rear corner",
  },
  {
    id: "hangar-rear-east",
    zone: "building-corner",
    x: -4,
    z: -9.9,
    heading: -0.4,
    assetScale: 0.77,
    maxWidth: 1.95,
    maxDepth: 1.4,
    maxHeight: 1.75,
    groundY: 0,
    footprint: { width: 1.8, depth: 1.2, clearance: 0.35 },
    description: "Low foliage at the hangar inner rear corner",
  },
  {
    id: "hotel-rear-west",
    zone: "building-corner",
    x: 7,
    z: -6.2,
    heading: 0.18,
    assetScale: 0.87,
    maxWidth: 2.05,
    maxDepth: 1.45,
    maxHeight: 1.95,
    groundY: 0,
    footprint: { width: 1.85, depth: 1.25, clearance: 0.35 },
    description: "Layered foliage at the hotel inner rear corner",
  },
  {
    id: "hotel-rear-east",
    zone: "building-corner",
    x: 27,
    z: -6.2,
    heading: -0.52,
    assetScale: 1.0,
    maxWidth: 2.15,
    maxDepth: 1.5,
    maxHeight: 2.1,
    groundY: 0,
    footprint: { width: 1.9, depth: 1.3, clearance: 0.35 },
    description: "Tall foliage at the hotel water-facing corner",
  },
];

/**
 * Optional bed accents for the selected foliage GLB. These are deliberately
 * separate from the twelve containers so the imported source can be reviewed
 * and repeated without changing the existing low planting geometry.
 */
export const BED_ACCENT_PLACEMENTS: readonly BedAccentPlacement[] = [
  { id: "west-bed-lower", bedIndex: 0, x: -39.1, z: -9.2, heading: 0.25, assetScale: 0.95, maxWidth: 1.55, maxDepth: 1.7, maxHeight: 2.2, groundY: 0.255, description: "Broad leaf cluster in the lower west bed" },
  { id: "west-bed-upper", bedIndex: 0, x: -40.4, z: 13.8, heading: -0.38, assetScale: 0.83, maxWidth: 1.45, maxDepth: 1.5, maxHeight: 1.95, groundY: 0.255, description: "Lower leaf cluster in the upper west bed" },
  { id: "east-bed-lower", bedIndex: 1, x: 33.2, z: -9.3, heading: -0.22, assetScale: 0.9, maxWidth: 1.5, maxDepth: 1.6, maxHeight: 2.1, groundY: 0.255, description: "Broad leaf cluster in the lower east bed" },
  { id: "east-bed-upper", bedIndex: 1, x: 33.2, z: 13.4, heading: 0.44, assetScale: 1.03, maxWidth: 1.65, maxDepth: 1.7, maxHeight: 2.35, groundY: 0.255, description: "Tall leaf cluster in the upper east bed" },
  { id: "hangar-bed-west", bedIndex: 2, x: -14.7, z: 7.4, heading: 0.18, assetScale: 0.88, maxWidth: 1.55, maxDepth: 1.5, maxHeight: 2.05, groundY: 0.255, description: "Accent foliage in the hangar front bed" },
  { id: "hangar-bed-east", bedIndex: 2, x: -9.3, z: 7.4, heading: -0.46, assetScale: 1.08, maxWidth: 1.7, maxDepth: 1.6, maxHeight: 2.4, groundY: 0.255, description: "Tall accent foliage in the hangar front bed" },
  { id: "hotel-bed-west", bedIndex: 3, x: 14.1, z: 6.5, heading: -0.3, assetScale: 1.0, maxWidth: 1.7, maxDepth: 1.6, maxHeight: 2.3, groundY: 0.255, description: "Tall accent foliage in the hotel front bed" },
  { id: "hotel-bed-east", bedIndex: 3, x: 24.7, z: 6.5, heading: 0.32, assetScale: 0.85, maxWidth: 1.5, maxDepth: 1.45, maxHeight: 2, groundY: 0.255, description: "Lower accent foliage in the hotel front bed" },
  { id: "rear-bed-west", bedIndex: 4, x: -23.2, z: -16.6, heading: 0.2, assetScale: 0.9, maxWidth: 1.55, maxDepth: 1.5, maxHeight: 2.05, groundY: 0.255, description: "Broad leaf cluster in the west rear bed" },
  { id: "rear-bed-east", bedIndex: 5, x: 22.6, z: -16.6, heading: -0.35, assetScale: 1.0, maxWidth: 1.65, maxDepth: 1.55, maxHeight: 2.25, groundY: 0.255, description: "Broad leaf cluster in the east rear bed" },
];

const BUILDING_FOOTPRINTS = [
  { id: "hangar", x: -18, z: -4, width: 25, depth: 15 },
  { id: "hotel", x: 17, z: -2, width: 17, depth: 11 },
] as const;

const BAGGAGE_FOOTPRINTS = DEFAULT_BAGGAGE_ADJUSTMENTS.map((adjustment, side) => {
  const frame = baggageFrame(side, adjustment);
  const center = new THREE.Vector3().setFromMatrixPosition(frame);
  const width = 10.995267868 * BAGGAGE_LAYOUT.scale;
  const depth = 4.7 * BAGGAGE_LAYOUT.scale;
  const radians = -THREE.MathUtils.degToRad(adjustment.turn);
  return {
    id: `baggage-${side + 1}`,
    x: center.x,
    z: center.z,
    width: Math.abs(Math.cos(radians)) * width + Math.abs(Math.sin(radians)) * depth,
    depth: Math.abs(Math.sin(radians)) * width + Math.abs(Math.cos(radians)) * depth,
  };
});

type Rect = { x: number; z: number; width: number; depth: number };

function asRect(placement: AccentPlanterPlacement): Rect {
  return {
    x: placement.x,
    z: placement.z,
    // Use the full imported fit envelope, not only the nominal container
    // base, so broad leaves cannot clip a path or retained asset.
    width: placement.maxWidth,
    depth: placement.maxDepth,
  };
}

function expanded(rect: Rect, amount: number): Rect {
  return {
    x: rect.x,
    z: rect.z,
    width: rect.width + amount * 2,
    depth: rect.depth + amount * 2,
  };
}

function overlaps(a: Rect, b: Rect) {
  return Math.abs(a.x - b.x) * 2 < a.width + b.width &&
    Math.abs(a.z - b.z) * 2 < a.depth + b.depth;
}

function distanceToForum(placement: AccentPlanterPlacement) {
  return Math.hypot(placement.x - FORUM_LAYOUT.x, placement.z - FORUM_LAYOUT.z);
}

/** Return human-readable layout errors before any imported asset is attached. */
export function validateAccentPlanterLayout(
  placements: readonly AccentPlanterPlacement[] = ACCENT_PLANTER_PLACEMENTS,
) {
  const errors: string[] = [];
  const avenue = {
    x: AVENUE_LAYOUT.x,
    z: (AVENUE_LAYOUT.rearZ + AVENUE_LAYOUT.frontZ) / 2,
    width: AVENUE_LAYOUT.width,
    depth: AVENUE_LAYOUT.frontZ - AVENUE_LAYOUT.rearZ,
  };
  const boardwalk = {
    x: (BOARDWALK_LAYOUT.leftX + BOARDWALK_LAYOUT.rightX) / 2,
    z: (BOARDWALK_LAYOUT.rearZ + BOARDWALK_LAYOUT.frontZ) / 2,
    width: BOARDWALK_LAYOUT.rightX - BOARDWALK_LAYOUT.leftX,
    depth: BOARDWALK_LAYOUT.frontZ - BOARDWALK_LAYOUT.rearZ,
  };
  const beds: Rect[] = LEAF_BEDS.map(([x, z, width, depth]) => ({ x, z, width, depth }));
  const oldPlanters: Rect[] = PLANTER_PLACEMENTS.map(([x, z]) => ({
    x,
    z,
    width: 1.8,
    depth: 1.35,
  }));
  const cabanaRects: Rect[] = cabanaKeepouts().map(({ footprint }) => ({
    x: (footprint.left + footprint.right) / 2,
    z: (footprint.rear + footprint.front) / 2,
    width: footprint.right - footprint.left,
    depth: footprint.front - footprint.rear,
  }));
  if (placements.length !== 12) errors.push(`Expected 12 accent planters, received ${placements.length}`);
  for (const placement of placements) {
    const rect = asRect(placement);
    const protectedRect = expanded(rect, placement.footprint.clearance);
    if (overlaps(protectedRect, avenue)) errors.push(`${placement.id} enters the six metre avenue`);
    if (overlaps(protectedRect, boardwalk)) errors.push(`${placement.id} enters the boardwalk footprint`);
    for (const building of BUILDING_FOOTPRINTS) {
      if (overlaps(protectedRect, building)) errors.push(`${placement.id} intersects ${building.id}`);
    }
    for (const belt of BAGGAGE_FOOTPRINTS) {
      if (overlaps(protectedRect, belt)) errors.push(`${placement.id} intersects ${belt.id}`);
    }
    for (const bed of beds) {
      if (overlaps(protectedRect, bed)) errors.push(`${placement.id} intersects an existing planting bed`);
    }
    for (const oldPlanter of oldPlanters) {
      if (overlaps(protectedRect, oldPlanter)) errors.push(`${placement.id} intersects an existing planter`);
    }
    for (const [palmX, palmZ, palmScale] of PALM_PLACEMENTS) {
      const radius = palmScale * 1.05 + 0.15 + placement.footprint.clearance;
      if (Math.hypot(placement.x - palmX, placement.z - palmZ) < radius + Math.max(placement.maxWidth, placement.maxDepth) / 2) {
        errors.push(`${placement.id} enters the palm root well at ${palmX},${palmZ}`);
      }
    }
    for (const [lampX, lampZ] of PATH_LAMP_PLACEMENTS) {
      if (overlaps(protectedRect, { x: lampX, z: lampZ, width: 0.45, depth: 0.45 })) {
        errors.push(`${placement.id} intersects a path lamp at ${lampX},${lampZ}`);
      }
    }
    for (const [cabanaIndex, cabana] of cabanaRects.entries()) {
      if (overlaps(protectedRect, cabana)) {
        errors.push(`${placement.id} enters cabana keepout ${cabanaIndex + 1}`);
      }
    }
    if (placement.zone === "forum") {
      const radius = distanceToForum(placement);
      if (radius < 9.1 || radius > 11.4) errors.push(`${placement.id} is outside the forum accent band`);
    } else if (distanceToForum(placement) < 8.9) {
      errors.push(`${placement.id} crowds the forum`);
    }
  }
  for (let i = 0; i < placements.length; i++) {
    for (let j = i + 1; j < placements.length; j++) {
      const a = expanded(asRect(placements[i]), placements[i].footprint.clearance);
      const b = expanded(asRect(placements[j]), placements[j].footprint.clearance);
      if (overlaps(a, b)) errors.push(`${placements[i].id} overlaps ${placements[j].id}`);
    }
  }
  return errors;
}

export const ACCENT_PLANTER_LAYOUT_VALIDATION = validateAccentPlanterLayout();

/** Check that each optional imported foliage accent remains inside its named bed. */
export function validateBedAccentLayout(
  placements: readonly BedAccentPlacement[] = BED_ACCENT_PLACEMENTS,
) {
  return placements.flatMap((placement) => {
    const bed = LEAF_BEDS[placement.bedIndex];
    if (!bed) return [`${placement.id} references missing bed ${placement.bedIndex}`];
    const [x, z, width, depth] = bed;
    const insideX = Math.abs(placement.x - x) + placement.maxWidth / 2 <= width / 2;
    const insideZ = Math.abs(placement.z - z) + placement.maxDepth / 2 <= depth / 2;
    return insideX && insideZ ? [] : [`${placement.id} leaves planting bed ${placement.bedIndex}`];
  });
}

export const BED_ACCENT_LAYOUT_VALIDATION = validateBedAccentLayout();
