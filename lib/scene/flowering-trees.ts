import * as THREE from "three";
import {
  floweringTreeFootprint,
  FLOWERING_TREE_BASE_TARGET,
  FLOWERING_TREE_LAYOUT_VALIDATION,
  FLOWERING_TREE_PLACEMENTS,
  FLOWERING_TREE_TARGET,
  type FloweringTreePlacement,
} from "./flowering-tree-layout.ts";

export type FloweringTreeAssetLoader = (
  placement: FloweringTreePlacement,
) => Promise<THREE.Object3D>;

export type FloweringTreeImportOptions = {
  /** Provenance label supplied by the selected local Tripo importer. */
  sourceId?: string;
  /** Keep the selected source materials by default for local visual review. */
  applyReferenceMaterials?: boolean;
  /** Parent verification for a derivative above the repeated-instance budget. */
  optimizationVerified?: boolean;
};

export type FloweringTreeAssetMetrics = {
  meshes: number;
  vertices: number;
  triangles: number;
  bounds: {
    width: number;
    height: number;
    depth: number;
  };
};

export type FloweringTreeLoadResult = FloweringTreeAssetMetrics & {
  sourceId: string;
  placed: number;
  optimizationVerified: boolean;
  layoutIssues: number;
};

const BARK_NAMES = /bark|branch|trunk|wood|stem/i;
const BLOSSOM_NAMES = /blossom|flower|petal|bud/i;

function assignSharedMaterials(
  root: THREE.Object3D,
  materialCache: Map<THREE.Material, THREE.Material>,
  ownedMaterials: Set<THREE.Material>,
) {
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const sourceMaterials = Array.isArray(object.material)
      ? object.material
      : [object.material];
    const materials = sourceMaterials.map((material) => {
      const shared = materialCache.get(material);
      if (shared) return shared;
      const clone = material.clone();
      materialCache.set(material, clone);
      ownedMaterials.add(clone);
      return clone;
    });
    object.material = Array.isArray(object.material) ? materials : materials[0];
  });
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
      if (BARK_NAMES.test(object.name) || BARK_NAMES.test(material.name)) {
        material.color.set("#70472e");
        material.roughness = 0.88;
        material.metalness = 0;
      } else if (BLOSSOM_NAMES.test(object.name) || BLOSSOM_NAMES.test(material.name)) {
        material.color.set("#f4eadf");
        material.roughness = 0.78;
        material.metalness = 0;
        material.transparent = false;
        material.opacity = 1;
      }
    }
  });
}

function fitToTarget(root: THREE.Object3D, placement: FloweringTreePlacement) {
  const sourceBounds = new THREE.Box3().setFromObject(root);
  const sourceSize = sourceBounds.getSize(new THREE.Vector3());
  if (!sourceSize.x || !sourceSize.y || !sourceSize.z) {
    throw new Error("Selected flowering-tree asset has empty bounds");
  }
  const scale = Math.min(
    placement.maxWidth / sourceSize.x,
    placement.maxHeight / sourceSize.y,
    placement.maxDepth / sourceSize.z,
  ) * placement.assetScale;
  // Preserve the authored GLB transform while fitting the world bounds to the
  // reserved edge footprint. Do not flatten the source's natural branch shape.
  root.scale.multiplyScalar(scale);
  const fittedBounds = new THREE.Box3().setFromObject(root);
  const fittedCenter = fittedBounds.getCenter(new THREE.Vector3());
  root.position.x -= fittedCenter.x;
  root.position.y += placement.groundY - fittedBounds.min.y;
  root.position.z -= fittedCenter.z;
  root.userData.floweringTreePlacement = placement.id;
  root.userData.floweringTreeVariant = placement.variant;
  root.userData.floweringTreeRoles = [
    "natural trunk and branches",
    "pale flowering canopy",
  ];
}

export function inspectFloweringTreeAsset(root: THREE.Object3D): FloweringTreeAssetMetrics {
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
 * Stage 7 imported-asset adapter. The callback is required so a candidate
 * Tripo source cannot enter the scene before it is selected and inspected.
 * Six instances share source geometry, maps, and one owned cloned material set
 * through AssetPool, which lets the parent batch identical meshes safely.
 */
export class FloweringTrees {
  readonly root = new THREE.Group();
  readonly treeBasesRoot = new THREE.Group();
  readonly placements = FLOWERING_TREE_PLACEMENTS;
  readonly layoutValidation = FLOWERING_TREE_LAYOUT_VALIDATION;
  private readonly anchors = new Map<string, THREE.Group>();
  private instances: THREE.Object3D[] = [];
  private sharedMaterials = new Set<THREE.Material>();
  private wellSoilGeometry?: THREE.CylinderGeometry;
  private wellCopingGeometry?: THREE.TorusGeometry;
  private wellSoilMaterial?: THREE.MeshStandardMaterial;
  private wellCopingMaterial?: THREE.MeshStandardMaterial;
  private disposed = false;

  constructor() {
    this.root.name = "Flowering trees, stage 7";
    this.treeBasesRoot.name = "Six flowering-tree pale-stone planting wells";
    this.root.add(this.treeBasesRoot);
    this.root.userData.floweringTreeCount = FLOWERING_TREE_PLACEMENTS.length;
    this.root.userData.layoutValidation = FLOWERING_TREE_LAYOUT_VALIDATION;
    this.root.userData.treeBase = {
      diameter: FLOWERING_TREE_BASE_TARGET.diameter,
      innerDiameter: FLOWERING_TREE_BASE_TARGET.innerDiameter,
      soilDepth: FLOWERING_TREE_BASE_TARGET.soilDepth,
      copingHeight: FLOWERING_TREE_BASE_TARGET.copingHeight,
      soilTopY: FLOWERING_TREE_BASE_TARGET.soilTopY,
      copingTopY: FLOWERING_TREE_BASE_TARGET.copingTopY,
    };
    this.createTreeBases();
    for (const placement of FLOWERING_TREE_PLACEMENTS) {
      const anchor = new THREE.Group();
      anchor.name = `Flowering-tree anchor ${placement.id}`;
      anchor.position.set(placement.x, 0, placement.z);
      anchor.rotation.y = placement.heading;
      anchor.userData.floweringTreePlacement = placement.id;
      anchor.userData.zone = placement.zone;
      const footprint = floweringTreeFootprint(placement);
      anchor.userData.footprint = {
        width: footprint.width,
        depth: footprint.depth,
        clearance: FLOWERING_TREE_TARGET.clearance,
      };
      anchor.userData.treeBaseGroundY = FLOWERING_TREE_BASE_TARGET.soilTopY;
      this.anchors.set(placement.id, anchor);
      this.root.add(anchor);
    }
  }

  /**
   * Import one inspected source and instance it at all six edge anchors. A
   * loader with fewer parameters remains compatible, so AssetPool.get can be
   * passed directly by the parent integration.
   */
  async load(
    loader: FloweringTreeAssetLoader,
    options: FloweringTreeImportOptions = {},
  ): Promise<FloweringTreeLoadResult> {
    if (this.disposed) throw new Error("Flowering trees have been disposed");
    this.clearInstances();
    const source = await loader(FLOWERING_TREE_PLACEMENTS[0]);
    if (this.disposed) {
      throw new Error("Flowering trees were disposed while the asset was loading");
    }
    const metrics = inspectFloweringTreeAsset(source);
    const optimizationVerified = options.optimizationVerified
      ?? (metrics.triangles <= FLOWERING_TREE_TARGET.maxTriangles
        && metrics.vertices <= FLOWERING_TREE_TARGET.maxVertices);
    if (!optimizationVerified) {
      throw new Error(
        `Flowering-tree source has ${Math.round(metrics.triangles).toLocaleString()} triangles and ${Math.round(metrics.vertices).toLocaleString()} vertices. Supply an optimized derivative or verify it before six repetitions.`,
      );
    }
    const materialCache = new Map<THREE.Material, THREE.Material>();
    try {
      for (const [index, placement] of FLOWERING_TREE_PLACEMENTS.entries()) {
        const instance = source.clone(true);
        assignSharedMaterials(instance, materialCache, this.sharedMaterials);
        if (options.applyReferenceMaterials && index === 0) {
          applyReferenceMaterials(instance);
        }
        fitToTarget(instance, placement);
        this.anchors.get(placement.id)?.add(instance);
        this.instances.push(instance);
      }
    } catch (error) {
      this.clearInstances();
      throw error;
    }
    this.root.userData.sourceId = options.sourceId ?? "selected-flowering-tree-glb";
    this.root.userData.sourceMetrics = metrics;
    this.root.userData.optimizationVerified = optimizationVerified;
    this.root.userData.selectedVariant = "Tripo flowering tree, Option A white blossoms";
    return {
      ...metrics,
      sourceId: this.root.userData.sourceId as string,
      placed: this.instances.length,
      optimizationVerified,
      layoutIssues: FLOWERING_TREE_LAYOUT_VALIDATION.length,
    };
  }

  /** Detach instances and release the one material set owned by this adapter. */
  clearInstances() {
    for (const instance of this.instances) {
      instance.removeFromParent();
    }
    this.instances = [];
    this.sharedMaterials.forEach((material) => material.dispose());
    this.sharedMaterials.clear();
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.clearInstances();
    this.disposeTreeBases();
    this.root.clear();
    this.anchors.clear();
  }

  /** Create the six shared, low planting wells without changing imported GLB geometry. */
  private createTreeBases() {
    const base = FLOWERING_TREE_BASE_TARGET;
    const soilRadius = base.innerDiameter / 2;
    const copingRadius = base.diameter / 2;
    const copingTubeRadius = (copingRadius - soilRadius) / 2;
    this.wellSoilGeometry = new THREE.CylinderGeometry(
      soilRadius,
      soilRadius,
      base.soilDepth,
      32,
    );
    this.wellCopingGeometry = new THREE.TorusGeometry(
      (soilRadius + copingRadius) / 2,
      copingTubeRadius,
      8,
      32,
    );
    this.wellSoilMaterial = new THREE.MeshStandardMaterial({
      color: "#302319",
      roughness: 0.96,
      metalness: 0,
    });
    this.wellCopingMaterial = new THREE.MeshStandardMaterial({
      color: "#d7c5a8",
      roughness: 0.74,
      metalness: 0.02,
    });
    const soil = new THREE.InstancedMesh(
      this.wellSoilGeometry,
      this.wellSoilMaterial,
      FLOWERING_TREE_PLACEMENTS.length,
    );
    soil.name = "Shared dark soil for six flowering-tree wells";
    soil.castShadow = false;
    soil.receiveShadow = true;
    const coping = new THREE.InstancedMesh(
      this.wellCopingGeometry,
      this.wellCopingMaterial,
      FLOWERING_TREE_PLACEMENTS.length,
    );
    coping.name = "Shared pale-stone coping for six flowering-tree wells";
    coping.castShadow = true;
    coping.receiveShadow = true;
    const transform = new THREE.Object3D();
    FLOWERING_TREE_PLACEMENTS.forEach((placement, index) => {
      transform.position.set(
        placement.x,
        base.soilDepth / 2,
        placement.z,
      );
      transform.rotation.set(0, 0, 0);
      transform.scale.set(1, 1, 1);
      transform.updateMatrix();
      soil.setMatrixAt(index, transform.matrix);
      // TorusGeometry's tube is symmetric around its center. Place its top
      // at the requested coping height while allowing the lower half to bed
      // into the soil and plaza surface.
      transform.position.y = base.copingTopY - copingTubeRadius;
      transform.rotation.x = Math.PI / 2;
      transform.updateMatrix();
      coping.setMatrixAt(index, transform.matrix);
    });
    soil.instanceMatrix.needsUpdate = true;
    coping.instanceMatrix.needsUpdate = true;
    this.treeBasesRoot.add(soil, coping);
    this.treeBasesRoot.userData.instanceCount = FLOWERING_TREE_PLACEMENTS.length;
    this.treeBasesRoot.userData.soilTopY = base.soilTopY;
    this.treeBasesRoot.userData.copingTopY = base.copingTopY;
  }

  private disposeTreeBases() {
    this.wellSoilGeometry?.dispose();
    this.wellCopingGeometry?.dispose();
    this.wellSoilMaterial?.dispose();
    this.wellCopingMaterial?.dispose();
    this.wellSoilGeometry = undefined;
    this.wellCopingGeometry = undefined;
    this.wellSoilMaterial = undefined;
    this.wellCopingMaterial = undefined;
    this.treeBasesRoot.clear();
  }
}
