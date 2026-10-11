import * as THREE from "three";
import {
  CABANA_ASSET_ROLES,
  CABANA_MODEL_TARGET,
  CABANA_PLACEMENTS,
  type CabanaPlacement,
} from "./cabana-layout.ts";

export type CabanaAssetLoader = () => Promise<THREE.Object3D>;

export type CabanaImportOptions = {
  /** Provenance label supplied by the selected local GLB importer. */
  sourceId?: string;
  /** Keep the selected source materials by default for visual inspection. */
  applyReferenceMaterials?: boolean;
  /** Parent verification for a derivative that exceeds the triangle budget. */
  optimizationVerified?: boolean;
};

export type CabanaAssetMetrics = {
  meshes: number;
  vertices: number;
  triangles: number;
  bounds: {
    width: number;
    height: number;
    depth: number;
  };
};

export type CabanaLoadResult = CabanaAssetMetrics & {
  sourceId: string;
  placed: number;
  optimizationVerified: boolean;
};

const FRAME_NAMES = /frame|post|pole|wood|teak|timber/i;
const FABRIC_NAMES = /canopy|curtain|fabric|cloth|textile|cushion|daybed|mattress/i;

function cloneMaterials(root: THREE.Object3D) {
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.material = Array.isArray(object.material)
      ? object.material.map((material) => material.clone())
      : object.material.clone();
  });
}

/** Dispose only per-instance material objects. Their maps remain shared with
 * the selected source and are owned by the caller that loaded that source. */
function disposeInstanceMaterials(root: THREE.Object3D) {
  const materials = new Set<THREE.Material>();
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    (Array.isArray(object.material) ? object.material : [object.material])
      .forEach((material) => materials.add(material));
  });
  materials.forEach((material) => material.dispose());
}

function applyReferenceMaterials(root: THREE.Object3D) {
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const materials = Array.isArray(object.material)
      ? object.material
      : [object.material];
    for (const material of materials) {
      if (!(material instanceof THREE.MeshStandardMaterial)
        && !(material instanceof THREE.MeshPhysicalMaterial)) continue;
      if (FRAME_NAMES.test(object.name) || FRAME_NAMES.test(material.name)) {
        material.color.set("#8b5c32");
        material.roughness = 0.62;
        material.metalness = 0.02;
      } else if (FABRIC_NAMES.test(object.name) || FABRIC_NAMES.test(material.name)) {
        material.color.set("#f3e6cf");
        material.roughness = 0.78;
        material.metalness = 0;
        material.transparent = false;
        material.opacity = 1;
      }
    }
  });
}

function fitToTarget(root: THREE.Object3D, placement: CabanaPlacement) {
  const sourceBounds = new THREE.Box3().setFromObject(root);
  const sourceSize = sourceBounds.getSize(new THREE.Vector3());
  if (!sourceSize.x || !sourceSize.y || !sourceSize.z) {
    throw new Error("Selected cabana asset has empty bounds");
  }
  const scale = Math.min(
    CABANA_MODEL_TARGET.width / sourceSize.x,
    CABANA_MODEL_TARGET.height / sourceSize.y,
    CABANA_MODEL_TARGET.depth / sourceSize.z,
  );
  // Preserve any transform scale authored in the GLB while fitting its world
  // bounds to the scene target.
  root.scale.multiplyScalar(scale);
  const fittedBounds = new THREE.Box3().setFromObject(root);
  const fittedCenter = fittedBounds.getCenter(new THREE.Vector3());
  root.position.x -= fittedCenter.x;
  root.position.y -= fittedBounds.min.y;
  root.position.z -= fittedCenter.z;
  root.userData.cabanaPlacement = placement.id;
  root.userData.cabanaRoles = [...CABANA_ASSET_ROLES];
}

export function inspectCabanaAsset(root: THREE.Object3D): CabanaAssetMetrics {
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

/**
 * Geometry-free until a selected GLB loader is supplied. This keeps layout,
 * transforms and source material handling testable without inventing a URL or
 * making six copies of an unoptimized candidate.
 */
export class WaterfrontCabanas {
  readonly root = new THREE.Group();
  readonly placements = CABANA_PLACEMENTS;
  private readonly anchors = new Map<string, THREE.Group>();
  private instances: THREE.Object3D[] = [];
  private disposed = false;

  constructor() {
    this.root.name = "Waterfront cabanas, stage 5";
    for (const placement of CABANA_PLACEMENTS) {
      const anchor = new THREE.Group();
      anchor.name = `Cabana anchor ${placement.id}`;
      anchor.position.set(placement.x, CABANA_MODEL_TARGET.floorY, placement.z);
      anchor.rotation.y = placement.heading;
      anchor.userData.cabanaPlacement = placement.id;
      anchor.userData.footprint = {
        width: CABANA_MODEL_TARGET.width,
        depth: CABANA_MODEL_TARGET.depth,
        clearance: CABANA_MODEL_TARGET.clearance,
      };
      this.anchors.set(placement.id, anchor);
      this.root.add(anchor);
    }
  }

  /**
   * Import one inspected, optimized source and instance it at all six anchors.
   * The callback is intentionally required, so no stale or invented asset URL
   * can enter the scene before the user selects a source.
   */
  async load(loader: CabanaAssetLoader, options: CabanaImportOptions = {}) {
    if (this.disposed) {
      throw new Error("Waterfront cabanas have been disposed");
    }
    this.clearInstances();
    const source = await loader();
    // A loader can resolve after the scene has been torn down. Do not attach
    // late clones to a detached group, and leave the caller-owned source for
    // its loader to release.
    if (this.disposed) {
      throw new Error("Waterfront cabanas were disposed while the asset was loading");
    }
    const metrics = inspectCabanaAsset(source);
    const optimizationVerified = options.optimizationVerified
      ?? metrics.triangles <= 80000;
    if (!optimizationVerified) {
      throw new Error(
        `Cabana source has ${Math.round(metrics.triangles).toLocaleString()} triangles. Supply an optimized derivative or verify it before repetition.`,
      );
    }
    for (const placement of CABANA_PLACEMENTS) {
      const instance = source.clone(true);
      cloneMaterials(instance);
      if (options.applyReferenceMaterials) applyReferenceMaterials(instance);
      fitToTarget(instance, placement);
      this.anchors.get(placement.id)?.add(instance);
      this.instances.push(instance);
    }
    this.root.userData.sourceId = options.sourceId ?? "selected-cabana-glb";
    this.root.userData.sourceMetrics = metrics;
    this.root.userData.optimizationVerified = optimizationVerified;
    return {
      ...metrics,
      sourceId: this.root.userData.sourceId as string,
      placed: this.instances.length,
      optimizationVerified,
    } satisfies CabanaLoadResult;
  }

  clearInstances() {
    for (const instance of this.instances) {
      disposeInstanceMaterials(instance);
      instance.removeFromParent();
    }
    this.instances = [];
  }

  dispose() {
    this.disposed = true;
    this.clearInstances();
    this.root.clear();
    this.anchors.clear();
  }
}
