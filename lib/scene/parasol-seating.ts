import * as THREE from "three";
import {
  PARASOL_COMBINED_TARGET,
  PARASOL_GROUP_TARGET,
  PARASOL_PART_TARGETS,
  PARASOL_PLACEMENTS,
  auditParasolLayout,
  parasolFootprint,
  type ParasolPart,
  type ParasolPartTarget,
  type ParasolPlacement,
} from "./parasol-layout.ts";

export type ParasolChairSide = "left" | "right";
export type ParasolAssetFamily = "umbrella" | "chair" | "table";
export const PARASOL_CHAIRS_PER_COMBINED_GROUP = 4;

export type ParasolAssetFactory<T extends ParasolPart = ParasolPart> = T extends "chair-left" | "chair-right"
  ? (placement: ParasolPlacement, side: ParasolChairSide) => THREE.Object3D | undefined | Promise<THREE.Object3D | undefined>
  : (placement: ParasolPlacement) => THREE.Object3D | undefined | Promise<THREE.Object3D | undefined>;

export interface ParasolSeatingSources {
  /** Return a fresh clone of the selected Tripo Option A umbrella GLB. */
  createUmbrella?: (placement: ParasolPlacement) => THREE.Object3D | undefined | Promise<THREE.Object3D | undefined>;
  /** Return a fresh clone of the selected Tripo Option A chair GLB. */
  createChair?: (placement: ParasolPlacement, side: ParasolChairSide) => THREE.Object3D | undefined | Promise<THREE.Object3D | undefined>;
  /** Return a fresh clone of the selected Tripo Option A table GLB. */
  createTable?: (placement: ParasolPlacement) => THREE.Object3D | undefined | Promise<THREE.Object3D | undefined>;
  /** Hook for the parent lighting adapter after a part is grounded. */
  onAttach?: (object: THREE.Object3D, placement: ParasolPlacement, part: ParasolPart) => void;
}

export interface ParasolImportOptions {
  /** Provenance labels for the selected local exports. */
  sourceIds?: Partial<Record<ParasolAssetFamily, string>>;
  /** Explicit parent verification for a derivative above the repetition gate. */
  optimizationVerified?: Partial<Record<ParasolAssetFamily, boolean>>;
}

export interface ParasolCombinedImportOptions {
  /** Provenance label for the complete supplied patio GLB derivative. */
  sourceId?: string;
  /** Explicit parent verification for a derivative above the repetition gate. */
  optimizationVerified?: boolean;
}

export interface ParasolAssetMetrics {
  meshes: number;
  vertices: number;
  triangles: number;
  bounds: {
    width: number;
    height: number;
    depth: number;
  };
}

export interface ParasolSeatingFailure {
  id: string;
  part: ParasolPart;
  error: unknown;
}

export interface ParasolSeatingResult {
  umbrellaRequested: number;
  umbrellasAttached: number;
  chairRequested: number;
  chairsAttached: number;
  tableRequested: number;
  tablesAttached: number;
  groupsRequested: number;
  groupsComplete: number;
  assetMetrics: Partial<Record<ParasolAssetFamily, ParasolAssetMetrics>>;
  sourceIds: Partial<Record<ParasolAssetFamily, string>>;
  failures: ParasolSeatingFailure[];
}

export interface ParasolCombinedSeatingResult {
  sourceId?: string;
  groupsRequested: number;
  groupsComplete: number;
  umbrellasAttached: number;
  tablesAttached: number;
  chairsPerGroup: number;
  totalChairCount: number;
  meshes: number;
  vertices: number;
  triangles: number;
  bounds: ParasolAssetMetrics["bounds"];
  sourceMetrics: ParasolAssetMetrics;
  optimizationVerified: boolean;
}

/** Four repeated umbrellas make a high-poly source expensive quickly. The
 * parent may pass an explicit verification flag after producing a lighter
 * derivative, but the unverified source must fit these limits first. */
export const PARASOL_ASSET_BUDGETS: Readonly<Record<ParasolAssetFamily, {
  maxTriangles: number;
  maxVertices: number;
}>> = {
  umbrella: { maxTriangles: 80_000, maxVertices: 100_000 },
  chair: { maxTriangles: 80_000, maxVertices: 100_000 },
  table: { maxTriangles: 80_000, maxVertices: 100_000 },
};

/** The complete patio set is repeated four times, so it uses the same
 * per-source repetition gate as an individual furnishing derivative. */
export const PARASOL_COMBINED_ASSET_BUDGET = {
  maxTriangles: 80_000,
  maxVertices: 100_000,
} as const;

function inspectObject(root: THREE.Object3D): ParasolAssetMetrics {
  const bounds = new THREE.Box3().setFromObject(root);
  let meshes = 0;
  let vertices = 0;
  let triangles = 0;
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    meshes += 1;
    const position = object.geometry.getAttribute("position");
    vertices += position?.count ?? 0;
    triangles += object.geometry.index
      ? object.geometry.index.count / 3
      : (position?.count ?? 0) / 3;
  });
  const size = bounds.getSize(new THREE.Vector3());
  return {
    meshes,
    vertices,
    triangles,
    bounds: { width: size.x, height: size.y, depth: size.z },
  };
}

export function inspectParasolAsset(root: THREE.Object3D) {
  return inspectObject(root);
}

function targetFor(part: ParasolPart): ParasolPartTarget {
  return PARASOL_PART_TARGETS[part];
}

function familyFor(part: ParasolPart): ParasolAssetFamily {
  return part === "umbrella"
    ? "umbrella"
    : part === "table"
      ? "table"
      : "chair";
}

function fitPart(
  object: THREE.Object3D,
  part: ParasolPart,
  placement: ParasolPlacement,
  sourceMetrics = inspectObject(object),
) {
  const target = targetFor(part);
  const wrapper = new THREE.Group();
  wrapper.name = `Imported ${part} for ${placement.id}`;
  wrapper.rotation.y = target.heading;
  wrapper.add(object);
  wrapper.updateMatrixWorld(true);
  let bounds = new THREE.Box3().setFromObject(wrapper);
  if (bounds.isEmpty()) {
    throw new Error(`Selected ${part} asset has empty bounds`);
  }
  const size = bounds.getSize(new THREE.Vector3());
  const fit = Math.min(
    target.width / Math.max(size.x, 0.001),
    target.height / Math.max(size.y, 0.001),
    target.depth / Math.max(size.z, 0.001),
  );
  wrapper.scale.multiplyScalar(fit);
  wrapper.updateMatrixWorld(true);
  bounds = new THREE.Box3().setFromObject(wrapper);
  const center = bounds.getCenter(new THREE.Vector3());
  wrapper.position.set(
    target.x - center.x,
    target.y - bounds.min.y,
    target.z - center.z,
  );
  wrapper.userData.parasolPart = part;
  wrapper.userData.parasolSourceMetrics = sourceMetrics;
  wrapper.userData.parasolPlacement = placement.id;
  wrapper.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
  return wrapper;
}

function fitCombined(
  object: THREE.Object3D,
  placement: ParasolPlacement,
  sourceMetrics: ParasolAssetMetrics,
) {
  const wrapper = new THREE.Group();
  wrapper.name = `Imported complete patio seating for ${placement.id}`;
  wrapper.add(object);
  wrapper.updateMatrixWorld(true);
  let bounds = new THREE.Box3().setFromObject(wrapper);
  if (bounds.isEmpty()) {
    throw new Error("Selected combined patio seating asset has empty bounds");
  }
  const size = bounds.getSize(new THREE.Vector3());
  const fit = Math.min(
    PARASOL_COMBINED_TARGET.width / Math.max(size.x, 0.001),
    PARASOL_COMBINED_TARGET.height / Math.max(size.y, 0.001),
    PARASOL_COMBINED_TARGET.depth / Math.max(size.z, 0.001),
  );
  wrapper.scale.setScalar(fit);
  wrapper.updateMatrixWorld(true);
  bounds = new THREE.Box3().setFromObject(wrapper);
  const center = bounds.getCenter(new THREE.Vector3());
  // The anchor already carries the world center and heading. Keep this
  // wrapper local to it, centered in X/Z and grounded to the anchor floor.
  wrapper.position.set(-center.x, -bounds.min.y, -center.z);
  wrapper.userData.parasolCombined = true;
  wrapper.userData.parasolSourceMetrics = sourceMetrics;
  wrapper.userData.parasolPlacement = placement.id;
  wrapper.userData.chairsPerGroup = PARASOL_CHAIRS_PER_COMBINED_GROUP;
  wrapper.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
  return wrapper;
}

/**
 * Stage 9 imported-asset adapter. The parent supplies the selected combined
 * GLB from AssetPool, so this class owns anchors and transforms while shared
 * geometry, materials and maps remain pool-owned.
 */
export class ParasolSeating {
  readonly root = new THREE.Group();
  readonly placements = PARASOL_PLACEMENTS;
  readonly failures: ParasolSeatingFailure[] = [];
  readonly assetMetrics: Partial<Record<ParasolAssetFamily, ParasolAssetMetrics>> = {};
  private readonly anchors = new Map<string, THREE.Group>();
  private disposed = false;
  private populated = false;

  constructor() {
    this.root.name = "Parasol seating groups, stage 9";
    this.root.userData.groupCount = PARASOL_PLACEMENTS.length;
    this.root.userData.partsPerGroup = {
      umbrella: 1,
      chairs: PARASOL_CHAIRS_PER_COMBINED_GROUP,
      table: 1,
    };
    const layoutIssues = auditParasolLayout();
    this.root.userData.layoutValidation = layoutIssues;
    this.root.userData.layoutIssueCount = layoutIssues.length;
    for (const placement of PARASOL_PLACEMENTS) {
      const anchor = new THREE.Group();
      anchor.name = `Parasol group ${placement.id}`;
      anchor.position.set(placement.x, PARASOL_GROUP_TARGET.floorY, placement.z);
      anchor.rotation.y = placement.heading;
      anchor.userData.parasolPlacement = placement.id;
      const footprint = parasolFootprint(placement, 0);
      anchor.userData.footprint = {
        width: footprint.width,
        depth: footprint.depth,
        clearance: PARASOL_GROUP_TARGET.clearance,
        heading: placement.heading,
      };
      this.anchors.set(placement.id, anchor);
      this.root.add(anchor);
    }
  }

  /**
   * Attach four fresh clones of one complete imported patio set. The source
   * mesh stays untouched and its shared resources remain owned by AssetPool.
   * The supplied GLB is intentionally treated as one unit because its single
   * merged mesh has no reliable chair-level component boundaries.
   */
  async loadCombined(
    load: () => THREE.Object3D | undefined | Promise<THREE.Object3D | undefined>,
    options: ParasolCombinedImportOptions = {},
  ): Promise<ParasolCombinedSeatingResult> {
    if (this.disposed) throw new Error("Cannot load combined parasol seating after disposal");
    this.clear();
    this.failures.length = 0;
    for (const key of Object.keys(this.assetMetrics) as ParasolAssetFamily[]) {
      delete this.assetMetrics[key];
    }
    const source = await load();
    if (this.disposed) throw new Error("Combined parasol seating disposed while loading");
    if (!source) throw new Error("No combined patio seating asset was supplied");
    const sourceMetrics = inspectObject(source);
    const withinBudget = sourceMetrics.triangles <= PARASOL_COMBINED_ASSET_BUDGET.maxTriangles
      && sourceMetrics.vertices <= PARASOL_COMBINED_ASSET_BUDGET.maxVertices;
    const optimizationVerified = options.optimizationVerified ?? withinBudget;
    if (!optimizationVerified) {
      throw new Error(
        `Selected combined patio source has ${Math.round(sourceMetrics.triangles).toLocaleString()} triangles and ${Math.round(sourceMetrics.vertices).toLocaleString()} vertices. Supply the optimized derivative or verify it before repetition.`,
      );
    }
    const sourceId = options.sourceId;
    for (const placement of PARASOL_PLACEMENTS) {
      if (this.disposed) throw new Error("Combined parasol seating disposed while attaching");
      const clone = source.clone(true);
      const wrapper = fitCombined(clone, placement, sourceMetrics);
      this.anchors.get(placement.id)?.add(wrapper);
    }
    this.root.updateMatrixWorld(true);
    this.populated = !this.disposed;
    const groupsComplete = PARASOL_PLACEMENTS.filter((placement) => {
      const anchor = this.anchors.get(placement.id);
      return Boolean(anchor && anchor.children.length === 1);
    }).length;
    this.root.userData.importedActivated = this.populated && groupsComplete === PARASOL_PLACEMENTS.length;
    this.root.userData.sourceId = sourceId;
    this.root.userData.combinedAssetMetrics = sourceMetrics;
    this.root.userData.combinedAssetBudget = PARASOL_COMBINED_ASSET_BUDGET;
    this.root.userData.optimizationVerified = optimizationVerified;
    this.root.userData.partsPerGroup = {
      umbrella: 1,
      chairs: PARASOL_CHAIRS_PER_COMBINED_GROUP,
      table: 1,
    };
    this.root.userData.chairsPerGroup = PARASOL_CHAIRS_PER_COMBINED_GROUP;
    this.root.userData.totalChairCount = groupsComplete * PARASOL_CHAIRS_PER_COMBINED_GROUP;
    this.root.userData.assetFailures = [];
    return {
      sourceId,
      groupsRequested: PARASOL_PLACEMENTS.length,
      groupsComplete,
      umbrellasAttached: groupsComplete,
      tablesAttached: groupsComplete,
      chairsPerGroup: PARASOL_CHAIRS_PER_COMBINED_GROUP,
      totalChairCount: groupsComplete * PARASOL_CHAIRS_PER_COMBINED_GROUP,
      meshes: sourceMetrics.meshes,
      vertices: sourceMetrics.vertices,
      triangles: sourceMetrics.triangles,
      bounds: sourceMetrics.bounds,
      sourceMetrics,
      optimizationVerified,
    };
  }

  async populate(
    sources: ParasolSeatingSources = {},
    options: ParasolImportOptions = {},
  ): Promise<ParasolSeatingResult> {
    if (this.disposed) throw new Error("Cannot populate disposed parasol seating");
    this.clear();
    this.failures.length = 0;
    this.root.userData.partsPerGroup = {
      umbrella: 1,
      chairs: 2,
      table: 1,
    };
    for (const key of Object.keys(this.assetMetrics) as ParasolAssetFamily[]) {
      delete this.assetMetrics[key];
    }

    let umbrellasAttached = 0;
    let chairsAttached = 0;
    let tablesAttached = 0;
    const umbrellaRequested = sources.createUmbrella ? PARASOL_PLACEMENTS.length : 0;
    const chairRequested = sources.createChair ? PARASOL_PLACEMENTS.length * 2 : 0;
    const tableRequested = sources.createTable ? PARASOL_PLACEMENTS.length : 0;

    await Promise.all(PARASOL_PLACEMENTS.map(async (placement) => {
      if (this.disposed) return;
      const tasks: Promise<void>[] = [];
      if (sources.createUmbrella) {
        tasks.push(this.attachPart(
          placement,
          "umbrella",
          () => sources.createUmbrella!(placement),
          () => { umbrellasAttached += 1; },
          sources.onAttach,
          options,
        ));
      }
      if (sources.createChair) {
        for (const side of ["left", "right"] as const) {
          tasks.push(this.attachPart(
            placement,
            side === "left" ? "chair-left" : "chair-right",
            () => sources.createChair!(placement, side),
            () => { chairsAttached += 1; },
            sources.onAttach,
            options,
          ));
        }
      }
      if (sources.createTable) {
        tasks.push(this.attachPart(
          placement,
          "table",
          () => sources.createTable!(placement),
          () => { tablesAttached += 1; },
          sources.onAttach,
          options,
        ));
      }
      await Promise.all(tasks);
    }));

    this.populated = !this.disposed;
    const groupsRequested = sources.createUmbrella || sources.createChair || sources.createTable
      ? PARASOL_PLACEMENTS.length
      : 0;
    const groupsComplete = PARASOL_PLACEMENTS.filter((placement) => {
      const anchor = this.anchors.get(placement.id);
      return Boolean(anchor && anchor.children.length === 4);
    }).length;
    this.root.userData.importedActivated = this.populated && groupsComplete > 0;
    this.root.userData.sourceIds = { ...options.sourceIds };
    this.root.userData.assetMetrics = { ...this.assetMetrics };
    this.root.userData.assetBudgets = PARASOL_ASSET_BUDGETS;
    this.root.userData.assetFailures = this.failures.map(({ id, part }) => `${id}:${part}`);
    return {
      umbrellaRequested,
      umbrellasAttached,
      chairRequested,
      chairsAttached,
      tableRequested,
      tablesAttached,
      groupsRequested,
      groupsComplete,
      assetMetrics: { ...this.assetMetrics },
      sourceIds: { ...options.sourceIds },
      failures: [...this.failures],
    };
  }

  get isPopulated() {
    return this.populated;
  }

  /** Imported models use shared AssetPool resources, so only detach wrappers. */
  clear() {
    this.anchors.forEach((anchor) => anchor.clear());
    this.populated = false;
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.clear();
    this.root.clear();
    this.root.removeFromParent();
    this.anchors.clear();
  }

  private async attachPart(
    placement: ParasolPlacement,
    part: ParasolPart,
    load: () => THREE.Object3D | undefined | Promise<THREE.Object3D | undefined>,
    attached: () => void,
    onAttach?: ParasolSeatingSources["onAttach"],
    options: ParasolImportOptions = {},
  ) {
    try {
      const object = await load();
      if (this.disposed) return;
      if (!object) throw new Error(`No ${part} asset was supplied`);
      const family = familyFor(part);
      const sourceMetrics = inspectObject(object);
      const budget = PARASOL_ASSET_BUDGETS[family];
      const withinBudget = sourceMetrics.triangles <= budget.maxTriangles
        && sourceMetrics.vertices <= budget.maxVertices;
      const optimizationVerified = options.optimizationVerified?.[family] ?? withinBudget;
      if (!optimizationVerified) {
        throw new Error(
          `Selected ${family} source has ${Math.round(sourceMetrics.triangles).toLocaleString()} triangles and ${Math.round(sourceMetrics.vertices).toLocaleString()} vertices. Supply an optimized derivative or verify it before repetition.`,
        );
      }
      this.assetMetrics[family] ??= sourceMetrics;
      const wrapper = fitPart(object, part, placement, sourceMetrics);
      if (this.disposed) return;
      this.anchors.get(placement.id)?.add(wrapper);
      attached();
      onAttach?.(wrapper, placement, part);
    } catch (error) {
      this.failures.push({ id: placement.id, part, error });
    }
  }
}
