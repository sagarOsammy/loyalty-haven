import * as THREE from "three";
import {
  ACCENT_PLANTER_LAYOUT_VALIDATION,
  ACCENT_PLANTER_PLACEMENTS,
  BED_ACCENT_LAYOUT_VALIDATION,
  BED_ACCENT_PLACEMENTS,
  type AccentPlanterPlacement,
  type BedAccentPlacement,
} from "./planting-layout.ts";

export type LayeredPlantingPlacement = AccentPlanterPlacement | BedAccentPlacement;
export type LayeredPlantingKind = "accent-planter" | "bed-accent";

export type ImportedPlanterFactory = (
  placement: AccentPlanterPlacement,
) => THREE.Object3D | undefined | Promise<THREE.Object3D | undefined>;

export type ImportedFoliageFactory = (
  placement: BedAccentPlacement,
) => THREE.Object3D | undefined | Promise<THREE.Object3D | undefined>;

export interface LayeredPlantingSources {
  /** Return a fresh clone of the selected planter/container GLB. */
  createPlanter?: ImportedPlanterFactory;
  /** Return a fresh clone of the selected Tripo foliage GLB. */
  createFoliage?: ImportedFoliageFactory;
  /** Hook for the scene lighting adapter after a model is grounded. */
  onAttach?: (
    object: THREE.Object3D,
    placement: LayeredPlantingPlacement,
    kind: LayeredPlantingKind,
  ) => void;
}

export interface LayeredPlantingFailure {
  id: string;
  kind: LayeredPlantingKind;
  error: unknown;
}

export interface LayeredPlantingResult {
  planterRequested: number;
  plantersAttached: number;
  foliageRequested: number;
  foliageAttached: number;
  failures: LayeredPlantingFailure[];
}

/**
 * Stage 6 imported-asset adapter. The layout and footprint constraints live
 * separately so selected Tripo exports can be reviewed before activation.
 * This class intentionally has no fallback foliage geometry and owns no GLB
 * materials, which keeps AssetPool shared resources safe during teardown.
 */
export class LayeredPlanting {
  readonly root = new THREE.Group();
  readonly plantersRoot = new THREE.Group();
  readonly bedAccentsRoot = new THREE.Group();
  readonly failures: LayeredPlantingFailure[] = [];
  private populated = false;
  private disposed = false;

  constructor() {
    this.root.name = "Layered tropical planting, stage 6";
    this.plantersRoot.name = "Twelve imported accent planters";
    this.bedAccentsRoot.name = "Selected imported foliage bed accents";
    this.root.add(this.plantersRoot, this.bedAccentsRoot);
    this.root.userData.accentPlanterCount = ACCENT_PLANTER_PLACEMENTS.length;
    this.root.userData.bedAccentCount = BED_ACCENT_PLACEMENTS.length;
    this.root.userData.layoutValidation = [
      ...ACCENT_PLANTER_LAYOUT_VALIDATION,
      ...BED_ACCENT_LAYOUT_VALIDATION,
    ];
  }

  /**
   * Attach only explicitly supplied imported assets. Calling this again
   * clears the previous clones first, so a candidate can be swapped safely.
   */
  async populate(sources: LayeredPlantingSources = {}): Promise<LayeredPlantingResult> {
    if (this.disposed) {
      throw new Error("Cannot populate disposed layered planting");
    }
    this.clear();
    this.failures.length = 0;

    const planterResults = sources.createPlanter
      ? await Promise.all(ACCENT_PLANTER_PLACEMENTS.map(async (placement) => {
        try {
          if (this.disposed) return false;
          const object = await sources.createPlanter!(placement);
          if (this.disposed) return false;
          if (!object) return false;
          this.attach(object, placement, "accent-planter", this.plantersRoot, sources.onAttach);
          return true;
        } catch (error) {
          this.failures.push({ id: placement.id, kind: "accent-planter", error });
          return false;
        }
      }))
      : [];

    const foliageResults = sources.createFoliage && !this.disposed
      ? await Promise.all(BED_ACCENT_PLACEMENTS.map(async (placement) => {
        try {
          if (this.disposed) return false;
          const object = await sources.createFoliage!(placement);
          if (this.disposed) return false;
          if (!object) return false;
          this.attach(object, placement, "bed-accent", this.bedAccentsRoot, sources.onAttach);
          return true;
        } catch (error) {
          this.failures.push({ id: placement.id, kind: "bed-accent", error });
          return false;
        }
      }))
      : [];

    this.populated = !this.disposed;
    this.root.userData.importedFoliageActivated = !this.disposed && foliageResults.some(Boolean);
    this.root.userData.importedPlanterActivated = !this.disposed && planterResults.some(Boolean);
    this.root.userData.assetFailures = this.failures.map(({ id }) => id);
    return {
      planterRequested: sources.createPlanter ? ACCENT_PLANTER_PLACEMENTS.length : 0,
      plantersAttached: planterResults.filter(Boolean).length,
      foliageRequested: sources.createFoliage ? BED_ACCENT_PLACEMENTS.length : 0,
      foliageAttached: foliageResults.filter(Boolean).length,
      failures: [...this.failures],
    };
  }

  get isPopulated() {
    return this.populated;
  }

  /** Imported models use shared AssetPool resources, so only detach clones. */
  clear() {
    this.plantersRoot.clear();
    this.bedAccentsRoot.clear();
    this.populated = false;
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.clear();
    this.root.removeFromParent();
  }

  private attach(
    object: THREE.Object3D,
    placement: LayeredPlantingPlacement,
    kind: LayeredPlantingKind,
    parent: THREE.Object3D,
    onAttach?: LayeredPlantingSources["onAttach"],
  ) {
    const width = placement.maxWidth;
    const depth = placement.maxDepth;
    const height = placement.maxHeight;
    const wrapper = new THREE.Group();
    wrapper.name = `Imported ${kind}, ${placement.id}`;
    wrapper.rotation.y = placement.heading;
    wrapper.scale.setScalar(placement.assetScale);
    wrapper.add(object);
    wrapper.updateMatrixWorld(true);

    // Fit the supplied source to the reserved collision envelope before
    // centering it, because candidate GLBs may use different origins.
    let bounds = new THREE.Box3().setFromObject(wrapper);
    if (bounds.isEmpty()) {
      throw new Error(`Imported ${kind} ${placement.id} has empty bounds`);
    }
    const size = bounds.getSize(new THREE.Vector3());
    const fit = Math.min(
      1,
      width / Math.max(size.x, 0.001),
      depth / Math.max(size.z, 0.001),
      height / Math.max(size.y, 0.001),
    );
    if (fit < 1) {
      wrapper.scale.multiplyScalar(fit);
      wrapper.updateMatrixWorld(true);
      bounds = new THREE.Box3().setFromObject(wrapper);
    }
    const center = bounds.getCenter(new THREE.Vector3());
    wrapper.position.x += placement.x - center.x;
    wrapper.position.y += placement.groundY - bounds.min.y;
    wrapper.position.z += placement.z - center.z;
    wrapper.updateMatrixWorld(true);
    wrapper.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    parent.add(wrapper);
    onAttach?.(wrapper, placement, kind);
  }
}
