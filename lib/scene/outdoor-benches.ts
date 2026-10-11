import * as THREE from "three";
import {
  BENCH_ASSET_ROLES,
  BENCH_MODEL_TARGET,
  BENCH_PLACEMENTS,
  type BenchPlacement,
} from "./bench-layout.ts";

export type BenchAssetLoader = () => Promise<THREE.Object3D>;

export type BenchImportOptions = {
  /** Selected Tripo source or the separately optimized local derivative. */
  sourceId?: string;
  /** Keep source materials unless an explicit reference-material pass is requested. */
  applyReferenceMaterials?: boolean;
  /** Parent verification for a source over the default repeated-instance budget. */
  optimizationVerified?: boolean;
};

export type BenchAssetMetrics = {
  meshes: number;
  vertices: number;
  triangles: number;
  bounds: {
    width: number;
    height: number;
    depth: number;
  };
};

export type BenchLoadResult = BenchAssetMetrics & {
  sourceId: string;
  placed: number;
  optimizationVerified: boolean;
};

const WOOD_NAMES = /frame|wood|timber|solid|leg|arm|side/i;
const CUSHION_NAMES = /cushion|beige|fabric|upholster|pillow|textile/i;

type OwnedMaterialSet = {
  bySource: Map<THREE.Material, THREE.Material>;
  owned: Set<THREE.Material>;
};

/**
 * Clone each source material once, then reuse that owned clone across all
 * repeated benches. Maps stay shallow-shared with the source AssetPool, while
 * the material objects remain safe to tune and dispose as one set.
 */
function createOwnedMaterialSet(root: THREE.Object3D): OwnedMaterialSet {
  const bySource = new Map<THREE.Material, THREE.Material>();
  const owned = new Set<THREE.Material>();
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const materials = Array.isArray(object.material)
      ? object.material
      : [object.material];
    materials.forEach((material) => {
      if (bySource.has(material)) return;
      const clone = material.clone();
      bySource.set(material, clone);
      owned.add(clone);
    });
  });
  return { bySource, owned };
}

function assignOwnedMaterials(root: THREE.Object3D, materials: OwnedMaterialSet) {
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const replace = (material: THREE.Material) => {
      const owned = materials.bySource.get(material);
      if (owned) return owned;
      const clone = material.clone();
      materials.bySource.set(material, clone);
      materials.owned.add(clone);
      return clone;
    };
    object.material = Array.isArray(object.material)
      ? object.material.map(replace)
      : replace(object.material);
  });
}

function disposeOwnedMaterials(materials: OwnedMaterialSet) {
  materials.owned.forEach((material) => material.dispose());
  materials.bySource.clear();
  materials.owned.clear();
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
      if (WOOD_NAMES.test(object.name) || WOOD_NAMES.test(material.name)) {
        material.color.set("#8b5c32");
        material.roughness = 0.68;
        material.metalness = 0.02;
      } else if (CUSHION_NAMES.test(object.name) || CUSHION_NAMES.test(material.name)) {
        material.color.set("#efe1c9");
        material.roughness = 0.82;
        material.metalness = 0;
        material.transparent = false;
        material.opacity = 1;
      }
    }
  });
}

/** Fit one source copy around its local anchor, preserving its authored root transform. */
function fitToTarget(root: THREE.Object3D, placement: BenchPlacement) {
  const sourceBounds = new THREE.Box3().setFromObject(root);
  const sourceSize = sourceBounds.getSize(new THREE.Vector3());
  if (!sourceSize.x || !sourceSize.y || !sourceSize.z) {
    throw new Error("Selected bench asset has empty bounds");
  }
  const scale = Math.min(
    BENCH_MODEL_TARGET.width / sourceSize.x,
    BENCH_MODEL_TARGET.height / sourceSize.y,
    BENCH_MODEL_TARGET.depth / sourceSize.z,
  );
  root.scale.multiplyScalar(scale);
  const fittedBounds = new THREE.Box3().setFromObject(root);
  const fittedCenter = fittedBounds.getCenter(new THREE.Vector3());
  // The parent anchor already owns the world placement. Center this copy in
  // that anchor so source transforms are not applied twice.
  root.position.x -= fittedCenter.x;
  root.position.y -= fittedBounds.min.y;
  root.position.z -= fittedCenter.z;
  root.userData.benchPlacement = placement.id;
  root.userData.benchRoles = [...BENCH_ASSET_ROLES];
}

export function inspectBenchAsset(root: THREE.Object3D): BenchAssetMetrics {
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
 * Four imported compact benches. The adapter intentionally takes a loader
 * callback because the selected Tripo source is still awaiting local import.
 * It cannot silently substitute procedural geometry or an unselected URL.
 */
export class OutdoorBenches {
  readonly root = new THREE.Group();
  readonly placements = BENCH_PLACEMENTS;
  private readonly anchors = new Map<string, THREE.Group>();
  private instances: THREE.Object3D[] = [];
  private ownedMaterials: OwnedMaterialSet = {
    bySource: new Map(),
    owned: new Set(),
  };
  private disposed = false;

  constructor() {
    this.root.name = "Outdoor timber benches, stage 8";
    for (const placement of BENCH_PLACEMENTS) {
      const anchor = new THREE.Group();
      anchor.name = `Bench anchor ${placement.id}`;
      anchor.position.set(placement.x, BENCH_MODEL_TARGET.floorY, placement.z);
      anchor.rotation.y = placement.heading;
      anchor.userData.benchPlacement = placement.id;
      anchor.userData.footprint = {
        width: BENCH_MODEL_TARGET.width,
        depth: BENCH_MODEL_TARGET.depth,
        clearance: BENCH_MODEL_TARGET.clearance,
      };
      this.anchors.set(placement.id, anchor);
      this.root.add(anchor);
    }
    this.root.userData.benchCount = BENCH_PLACEMENTS.length;
    this.root.userData.assetRoles = [...BENCH_ASSET_ROLES];
  }

  async load(loader: BenchAssetLoader, options: BenchImportOptions = {}) {
    if (this.disposed) throw new Error("Outdoor benches have been disposed");
    this.clearInstances();
    const source = await loader();
    if (this.disposed) throw new Error("Outdoor benches were disposed while the asset was loading");
    const metrics = inspectBenchAsset(source);
    const optimizationVerified = options.optimizationVerified
      ?? (metrics.triangles <= BENCH_MODEL_TARGET.maxTriangles
        && metrics.vertices <= BENCH_MODEL_TARGET.maxVertices);
    if (!optimizationVerified) {
      throw new Error(
        `Bench source has ${Math.round(metrics.triangles).toLocaleString()} triangles and ${Math.round(metrics.vertices).toLocaleString()} vertices. Supply an optimized derivative or verify it before repetition.`,
      );
    }
    this.ownedMaterials = createOwnedMaterialSet(source);
    try {
      for (const [index, placement] of BENCH_PLACEMENTS.entries()) {
        const instance = source.clone(true);
        assignOwnedMaterials(instance, this.ownedMaterials);
        // Apply optional hints once, after the shared material set has been
        // assigned to the first copy. Later copies reuse those same objects.
        if (options.applyReferenceMaterials && index === 0) {
          applyReferenceMaterials(instance);
        }
        fitToTarget(instance, placement);
        const anchor = this.anchors.get(placement.id);
        if (!anchor) continue;
        instance.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
        anchor.add(instance);
        this.instances.push(instance);
      }
    } catch (error) {
      this.clearInstances();
      throw error;
    }
    this.root.userData.sourceId = options.sourceId ?? "selected-tripo-bench-glb";
    this.root.userData.sourceMetrics = metrics;
    this.root.userData.optimizationVerified = optimizationVerified;
    this.root.userData.sharedMaterialCount = this.ownedMaterials.owned.size;
    return {
      ...metrics,
      sourceId: this.root.userData.sourceId as string,
      placed: this.instances.length,
      optimizationVerified,
    } satisfies BenchLoadResult;
  }

  clearInstances() {
    for (const instance of this.instances) {
      instance.removeFromParent();
    }
    this.instances = [];
    disposeOwnedMaterials(this.ownedMaterials);
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.clearInstances();
    this.root.clear();
    this.anchors.clear();
  }
}
