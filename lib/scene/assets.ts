import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

export const ASSETS = {
  hangar: "/assets/hangar.glb",
  hotelBase: "/assets/hotel-base-detail.glb",
  hotelLevel: "/assets/hotel-level-detail.glb",
  hotelRoof: "/assets/hotel-roof-detail.glb",
  forum: "/assets/forum.glb",
  palm: "/assets/palm.glb",
  planter: "/assets/planter.glb",
  ship: "/assets/cruise-ship.glb",
  belt: "/assets/baggage-belt.glb",
  united: "/assets/airline-united-realism.glb",
  avianca: "/assets/airline-avianca-realism.glb",
  airCanada: "/assets/airline-air-canada-realism.glb",
  virginAtlantic: "/assets/airline-virgin-atlantic-realism.glb",
  vietnamAirlines: "/assets/airline-vietnam-airlines-realism.glb",
  finnair: "/assets/airline-finnair-realism.glb",
  qatarAirways: "/assets/airline-qatar-airways-realism.glb",
  britishAirways: "/assets/airline-british-airways-realism.glb",
  hardcase: "/assets/luggage-hardcase.glb",
  duffel: "/assets/luggage-duffel.glb",
  vintage: "/assets/luggage-vintage.glb",
  telescope: "/assets/loyalty-brass-telescope.glb",
} as const;

export type AssetKey = keyof typeof ASSETS;
export const AIRCRAFT_ASSET: Record<string, AssetKey | undefined> = {
  "united-airlines": "united",
  "avianca-lifemiles": "avianca",
  "air-canada": "airCanada",
  "virgin-atlantic": "virginAtlantic",
  "vietnam-airlines": "vietnamAirlines",
  finnair: "finnair",
  "qatar-airways": "qatarAirways",
  "british-airways": "britishAirways",
};

/** All shared geometry, maps and original materials live until the pool is disposed. */
export class AssetPool {
  private loader = new GLTFLoader();
  private requests = new Map<AssetKey, Promise<THREE.Group>>();
  private originals: THREE.Group[] = [];
  private shared = new WeakSet<object>();
  private lifetime = new AbortController();
  private disposed = false;
  private poolRipples?: THREE.Texture;
  failures = new Set<string>();

  constructor(private onProgress: (key: string, failed: boolean) => void) {}

  async get(key: AssetKey): Promise<THREE.Group> {
    let request = this.requests.get(key);
    if (!request) {
      request = fetch(ASSETS[key], {
        signal: AbortSignal.any([
          this.lifetime.signal,
          AbortSignal.timeout(30000),
        ]),
      })
        .then(async (response) => {
          if (!response.ok) throw new Error(`Asset ${key}: ${response.status}`);
          return this.loader.parseAsync(
            await response.arrayBuffer(),
            "/assets/",
          );
        })
        .then(({ scene }) => {
          if (this.disposed) {
            disposeResources([scene]);
            throw new Error("Scene closed");
          }
          scene.traverse((object) => {
            if (object instanceof THREE.Mesh) {
              this.shared.add(object.geometry);
              object.castShadow = true;
              object.receiveShadow = true;
              const materials = Array.isArray(object.material)
                ? object.material
                : [object.material];
              for (const material of materials) {
                this.shared.add(material);
                Object.values(material).forEach((value) => {
                  if (value instanceof THREE.Texture) this.shared.add(value);
                });
                if (material instanceof THREE.MeshStandardMaterial) {
                  material.envMapIntensity = 0.8;
                  if (
                    /pool/i.test(material.name) &&
                    !/trim|stone/i.test(material.name)
                  ) {
                    if (!this.poolRipples) {
                      this.poolRipples = new THREE.TextureLoader().load(
                        "/assets/water-normal.jpg",
                      );
                      this.poolRipples.wrapS = this.poolRipples.wrapT =
                        THREE.RepeatWrapping;
                      this.poolRipples.repeat.set(3, 3);
                      this.shared.add(this.poolRipples);
                    }
                    material.normalMap = this.poolRipples;
                    material.normalScale.set(0.16, 0.16);
                    if (!material.name.startsWith("HotelDetail_")) {
                      material.roughness = 0.18;
                      material.metalness = 0.2;
                    }
                  }
                  const greens: Record<string, string> = {
                    "Palm leaf emerald": "#345129",
                    "Palm leaf sunlit": "#64783e",
                    "Palm leaf teal shade": "#2c432b",
                    "Tropical leaf blue green": "#344c36",
                    "Tropical leaf broad": "#466238",
                    "Tropical leaf deep": "#2b402a",
                  };
                  if (greens[material.name]) {
                    material.color.set(greens[material.name]);
                    material.roughness = 0.86;
                  }
                }
                // Architectural glazing reflects the environment without an expensive full-scene transmission pass.
                if (
                  material instanceof THREE.MeshPhysicalMaterial &&
                  material.transmission > 0
                ) {
                  material.transmission = 0;
                  if (/glass/i.test(material.name)) {
                    if (!material.name.startsWith("HotelDetail_"))
                      material.color.set("#adbbb0");
                    material.opacity = 0.19;
                    material.transparent = true;
                    material.depthWrite = false;
                  }
                  if (!material.name.startsWith("HotelDetail_")) {
                    material.roughness = 0.16;
                    material.metalness = 0.15;
                  }
                }
              }
            }
          });
          this.originals.push(scene);
          this.onProgress(key, false);
          return scene;
        })
        .catch((error) => {
          if (!this.disposed) {
            this.failures.add(key);
            this.onProgress(key, true);
          }
          throw error;
        });
      this.requests.set(key, request);
    }
    return request;
  }

  async instance(key: AssetKey) {
    return (await this.get(key)).clone(true);
  }

  animate(phase: number) {
    if (this.poolRipples)
      this.poolRipples.offset.set(phase * 0.012, phase * 0.008);
  }

  /** Release labels and cloned clipping materials without touching pooled assets. */
  releaseInstance(root: THREE.Object3D) {
    root.removeFromParent();
    disposeResources([root], (resource) => !this.shared.has(resource));
    root.clear();
  }

  dispose(roots: THREE.Object3D[]) {
    this.disposed = true;
    this.lifetime.abort();
    disposeResources([...roots, ...this.originals]);
    this.originals = [];
    this.requests.clear();
  }
}

export function disposeResources(
  roots: THREE.Object3D[],
  owns: (resource: object) => boolean = () => true,
) {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  roots.forEach((root) =>
    root.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      geometries.add(object.geometry);
      (Array.isArray(object.material)
        ? object.material
        : [object.material]
      ).forEach((m: THREE.Material) => materials.add(m));
    }),
  );
  materials.forEach((material) => {
    Object.values(material).forEach((value) => {
      if (value instanceof THREE.Texture) textures.add(value);
    });
    if (material instanceof THREE.ShaderMaterial) {
      Object.values(material.uniforms).forEach(({ value }) => {
        if (value instanceof THREE.Texture) textures.add(value);
      });
    }
    if (owns(material)) material.dispose();
  });
  geometries.forEach((geometry) => {
    if (owns(geometry)) geometry.dispose();
  });
  textures.forEach((texture) => {
    if (owns(texture)) texture.dispose();
  });
}

export function ownMaterials(object: THREE.Object3D) {
  object.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.material = Array.isArray(child.material)
        ? child.material.map((m: THREE.Material) => m.clone())
        : child.material.clone();
    }
  });
}
