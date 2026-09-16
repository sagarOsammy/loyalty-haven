import * as THREE from "three";
import { HDRLoader } from "three/addons/loaders/HDRLoader.js";
import { Water } from "three/addons/objects/Water.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { BokehPass } from "three/addons/postprocessing/BokehPass.js";
import { SMAAPass } from "three/addons/postprocessing/SMAAPass.js";
import {
  AssetPool,
  AIRCRAFT_ASSET,
  ASSETS,
  ownMaterials,
  type AssetKey,
} from "./assets";
import { approachProgress, beltPose, smootherStep } from "./animation";
import {
  box,
  constructionFrame,
  createSiteGround,
  material,
  palette,
  place,
  plaque,
} from "./geometry";
import { visibleAircraft, visibleHotels, type Selection } from "../selection";
import type { PublicHotel, PublicPartner, PublicSnapshot } from "../snapshot";

export type WorldOptions = {
  motion: boolean;
  quality: "cinematic" | "balanced";
};
export type WorldEvent = {
  type: "ready" | "progress" | "error" | "detail";
  message?: string;
  id?: string;
  loaded?: number;
  total?: number;
};
type Aircraft = {
  root: THREE.Group;
  partner: PublicPartner;
  index: number;
  started: number;
  destination: THREE.Vector3;
};
type Floor = {
  root: THREE.Group;
  hotel: PublicHotel;
  index: number;
  started: number;
  plane: THREE.Plane;
};
type Bag = { root: THREE.Group; distance: number; side: number };

export class HavenWorld {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(34, 1, 0.5, 1300);
  readonly renderer: THREE.WebGLRenderer;
  private composer: EffectComposer;
  private dof: BokehPass;
  private assets: AssetPool;
  private mounted = true;
  private ready = false;
  private loaded = new Set<string>();
  private pending: Selection = { alliance: null, hotels: [] };
  private snapshot: PublicSnapshot;
  private options: WorldOptions;
  private aircraft: Aircraft[] = [];
  private floors: Floor[] = [];
  private bags: Bag[] = [];
  private palms: THREE.Group[] = [];
  private staticRoot = new THREE.Group();
  private hotelRoot = new THREE.Group();
  private aircraftRoot = new THREE.Group();
  private bagRoot = new THREE.Group();
  private forumSpinner = new THREE.Group();
  private siteFrame: THREE.Group;
  private hotelBase?: THREE.Group;
  private hotelRoof?: THREE.Group;
  private ship?: THREE.Group;
  private sea: Water;
  private sun: THREE.DirectionalLight;
  private hdr?: THREE.DataTexture;
  private pmrem?: THREE.WebGLRenderTarget;
  private phase = 0;
  private generation = 0;
  private frame = 0;
  private lastTime = 0;
  private measurementStart = 0;
  private framesMeasured = 0;
  private observer: ResizeObserver;
  private pointer = new THREE.Vector2();
  private raycaster = new THREE.Raycaster();
  private pointerStart: { x: number; y: number; id: number } | null = null;
  private contextLost = false;
  private lightingFailed = false;
  private shadowDirty = true;
  private width = 1;
  private height = 1;
  private statusTimer = 0;

  constructor(
    private canvas: HTMLCanvasElement,
    snapshot: PublicSnapshot,
    options: WorldOptions,
    private emit: (event: WorldEvent) => void,
  ) {
    this.snapshot = snapshot;
    this.options = options;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.82;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.localClippingEnabled = true;
    this.scene.background = new THREE.Color("#c4c0af");
    this.scene.fog = new THREE.FogExp2("#b4bfb8", 0.0024);
    this.camera.position.set(23, 33, 68);
    this.camera.lookAt(0, 3, 0);
    this.scene.add(new THREE.HemisphereLight("#cfddde", "#947556", 0.35));
    this.sun = new THREE.DirectionalLight("#ffe0b2", 2.8);
    this.sun.position.set(-32, 30, -15);
    this.sun.target.position.set(0, 0, 0);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    Object.assign(this.sun.shadow.camera, {
      left: -45,
      right: 45,
      top: 42,
      bottom: -40,
      near: 1,
      far: 150,
    });
    this.sun.shadow.normalBias = 0.025;
    this.sun.shadow.bias = -0.00018;
    this.sun.shadow.radius = 3;
    this.scene.add(this.sun, this.sun.target);
    const fill = new THREE.DirectionalLight("#b8d4e1", 0.3);
    fill.position.set(18, 14, 30);
    this.scene.add(fill);
    this.scene.add(
      this.staticRoot,
      this.hotelRoot,
      this.aircraftRoot,
      this.bagRoot,
    );
    this.staticRoot.add(createSiteGround());
    this.siteFrame = constructionFrame();
    place(this.siteFrame, this.staticRoot, 17, 0, -2);
    const waterNormal = new THREE.TextureLoader().load(
      "/assets/water-normal.jpg",
      (texture) => {
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        this.invalidate();
      },
    );
    this.sea = new Water(new THREE.PlaneGeometry(1800, 1800), {
      textureWidth: 512,
      textureHeight: 512,
      waterNormals: waterNormal,
      sunDirection: this.sun.position.clone().normalize(),
      sunColor: 0xffdd9d,
      waterColor: 0x128b99,
      distortionScale: 0.4,
      fog: true,
    });
    this.sea.rotation.x = -Math.PI / 2;
    this.sea.position.set(0, -1.12, -550);
    this.scene.add(this.sea);
    const reflectWater = this.sea.onBeforeRender.bind(this.sea);
    this.sea.onBeforeRender = (...args) => {
      if (!args[1].overrideMaterial) reflectWater(...args);
    };
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.dof = new BokehPass(this.scene, this.camera, {
      focus: 73,
      aperture: 0.000013,
      maxblur: 0.004,
    });
    this.composer.addPass(this.dof);
    this.composer.addPass(new SMAAPass());
    this.composer.addPass(new OutputPass());
    this.assets = new AssetPool((key, failed) => {
      if (!this.mounted) return;
      this.loaded.add(key);
      this.emit({
        type: "progress",
        loaded: this.loaded.size,
        total: Object.keys(ASSETS).length,
        message: failed ? `Could not load ${key}` : undefined,
      });
    });
    this.observer = new ResizeObserver(this.resize);
    this.observer.observe(canvas.parentElement!);
    canvas.addEventListener("pointerdown", this.onPointerDown);
    canvas.addEventListener("pointerup", this.onPointerUp);
    canvas.addEventListener("pointermove", this.onPointerMove);
    canvas.addEventListener("pointercancel", this.onPointerCancel);
    canvas.addEventListener("webglcontextlost", this.onContextLost);
    canvas.addEventListener("webglcontextrestored", this.onContextRestored);
    document.addEventListener("visibilitychange", this.onVisibility);
    this.resize();
    this.loadLighting();
    void this.populate();
    this.invalidate();
  }

  private async loadLighting() {
    try {
      const hdr = await new HDRLoader().loadAsync(
        "/assets/belfast-sunset-2k.hdr",
      );
      if (!this.mounted) {
        hdr.dispose();
        return;
      }
      hdr.mapping = THREE.EquirectangularReflectionMapping;
      this.hdr = hdr;
      const generator = new THREE.PMREMGenerator(this.renderer);
      this.pmrem = generator.fromEquirectangular(hdr);
      generator.dispose();
      this.scene.environment = this.pmrem.texture;
      this.scene.environmentIntensity = 0.6;
      this.scene.background = hdr;
      this.scene.backgroundIntensity = 0.55;
      this.scene.backgroundBlurriness = 0.04;
      this.scene.backgroundRotation.y = 1.15;
      this.scene.environmentRotation.y = 1.15;
      this.invalidate();
    } catch {
      if (!this.mounted) return;
      this.lightingFailed = true;
      this.reportStatus();
    }
  }

  private reportStatus() {
    const failures = [
      ...this.assets.failures,
      ...(this.lightingFailed ? ["sunset lighting"] : []),
    ];
    this.canvas.dataset.assetFailures = failures.join(",");
    this.emit(
      failures.length
        ? {
            type: "error",
            message: `Could not load ${failures.join(", ")}. Reload the scene to retry.`,
          }
        : { type: "ready" },
    );
  }

  private async asset(
    key: AssetKey,
    parent: THREE.Object3D,
    position: [number, number, number],
    scale = 1,
    heading = 0,
  ) {
    const object = await this.assets.instance(key);
    if (!this.mounted) return undefined;
    object.scale.setScalar(scale);
    object.rotation.y = heading;
    place(object, parent, ...position);
    return object;
  }

  private async populate() {
    const settled = await Promise.allSettled([
      this.asset("hangar", this.staticRoot, [-18, 0, -4]),
      this.asset("forum", this.staticRoot, [0, 0.08, 13]),
      this.asset("telescope", this.staticRoot, [9, 0.02, 21], 2.6, -0.65),
      this.asset("hotelBase", this.hotelRoot, [17, 0, -2]).then((o) => {
        this.hotelBase = o;
        if (o) o.visible = false;
      }),
      this.asset("hotelRoof", this.hotelRoot, [17, 6.5, -2]).then((o) => {
        this.hotelRoof = o;
        if (o) o.visible = false;
      }),
      this.asset("ship", this.scene, [-35, -1.12, -85], 1.4, 1.1).then((o) => {
        this.ship = o;
      }),
      this.asset("belt", this.staticRoot, [-19, 0, 17], 1.15, -0.12),
      this.asset("belt", this.staticRoot, [20, 0, 16], 1.15, 0.12),
      this.makePalms(),
      this.makeLuggage(),
      ...(["united", "avianca", "airCanada", "hotelLevel"] as AssetKey[]).map(
        (key) => this.assets.get(key),
      ),
    ]);
    if (!this.mounted) return;
    if (
      settled.some((result) => result.status === "rejected") &&
      !this.assets.failures.size
    ) {
      this.assets.failures.add("resort props");
    }
    place(
      plaque("AIRLINE HANGAR", "EVERY MILE, A NEW POSSIBILITY", 12, 1.5),
      this.staticRoot,
      -18,
      7.3,
      3.7,
    );
    place(
      plaque("ALLIANCE FORUM", "YOUR CONNECTIONS, WORLDWIDE", 8.0, 1.3),
      this.staticRoot,
      0,
      4.5,
      17.2,
    );
    this.makeForum();
    this.ready = true;
    this.canvas.dataset.sceneReady = "true";
    this.canvas.dataset.assetFailures = [...this.assets.failures].join(",");
    await this.applySelection(this.pending, true);
    this.reportStatus();
    this.shadowDirty = true;
    this.invalidate();
  }

  private async makePalms() {
    const positions: [number, number, number, number][] = [
      [-32, -14, 1.2, 1],
      [-31, -4, 0.9, 2],
      [-32, 8, 1.05, 0],
      [-30, 21, 1.15, 3],
      [31, -14, 1.1, 0.4],
      [31, -4, 0.92, 2.1],
      [32, 6, 1.05, 3.4],
      [30, 19, 1.2, 1.3],
      [-5, -16, 0.9, 1.1],
      [4, -16, 0.8, 3.6],
      [29, -16, 1.1, 0],
      [-32, -18, 1.05, 2.7],
    ];
    await this.assets.get("palm");
    for (const [x, z, scale, heading] of positions) {
      const palm = await this.asset(
        "palm",
        this.staticRoot,
        [x, 0, z],
        scale,
        heading,
      );
      if (palm) this.palms.push(palm);
    }
    await this.assets.get("planter");
    for (const [x, z] of [
      [-8, 8],
      [8, 8],
      [-29, 10],
      [29, 10],
      [8, -15],
      [-29, -15],
      [27, -10],
    ]) {
      await this.asset("planter", this.staticRoot, [x, 0, z], 0.55);
    }
  }

  private async makeLuggage() {
    const types: AssetKey[] = ["hardcase", "duffel", "vintage"];
    const records = [
      ...this.snapshot.airlinePartners,
      ...this.snapshot.hotelBrands,
    ];
    const results = await Promise.allSettled(
      types.map((key) => this.assets.get(key)),
    );
    const available = types.filter(
      (_, index) => results[index].status === "fulfilled",
    );
    if (!available.length || !this.mounted) return;
    for (let side = 0; side < 2; side++) {
      for (let i = 0; i < 8; i++) {
        const root = new THREE.Group();
        const type = available[(i + side) % available.length];
        const model = await this.assets.instance(type);
        model.scale.setScalar(type === "duffel" ? 1.0 : 1.08);
        const bounds = new THREE.Box3().setFromObject(model);
        model.position.y -= bounds.min.y;
        root.add(model);
        const record = records[(i + side * 4) % records.length];
        root.userData.detailId = record.id;
        const label = plaque(
          `${record.points.toLocaleString("en-US")} pts`,
          "",
          1.35,
          0.4,
        );
        label.position.set(0, 1.25, 0.25);
        root.add(label);
        this.bagRoot.add(root);
        this.bags.push({
          root,
          side,
          distance: i * ((12 + Math.PI * 3.2) / 8),
        });
      }
    }
  }

  private makeForum() {
    place(this.forumSpinner, this.staticRoot, 0, 1.1, 13);
    const alliances = this.snapshot.alliances.filter(
      (a) => a.category === "airline",
    );
    alliances.forEach((alliance, index) => {
      const angle = (index / 3) * Math.PI * 2;
      const column = box(
        2.6,
        2.6,
        0.18,
        material(palette.bronze, 0.32, 0.45),
        0.1,
      );
      const board = plaque(
        alliance.name.toUpperCase(),
        `${alliance.totalPoints.toLocaleString("en-US")} POINTS`,
        2.55,
        2.25,
      );
      const panel = new THREE.Group();
      panel.add(column);
      board.position.z = 0.13;
      panel.add(board);
      panel.position.set(Math.sin(angle) * 2.4, 1.4, Math.cos(angle) * 2.4);
      panel.rotation.y = angle;
      panel.userData.alliance = alliance.id;
      this.forumSpinner.add(panel);
    });
  }

  setSelection(selection: Selection, snapshot = this.snapshot) {
    this.pending = {
      alliance: selection.alliance,
      hotels: [...selection.hotels],
    };
    this.snapshot = snapshot;
    if (this.ready) void this.applySelection(this.pending);
  }

  private remove(root: THREE.Object3D) {
    this.assets.releaseInstance(root);
  }

  private async applySelection(selection: Selection, force = false) {
    const revision = ++this.generation;
    const partners = visibleAircraft(this.snapshot, selection.alliance);
    const hotels = visibleHotels(this.snapshot, selection.hotels);
    const aircraftChanged =
      force ||
      this.aircraft.map((p) => p.partner.id).join() !==
        partners.map((p) => p.id).join();
    const missingHotels = hotels.filter(
      (hotel) => !this.floors.some((floor) => floor.hotel.id === hotel.id),
    );
    const [planeResults, floorResults] = await Promise.all([
      Promise.allSettled(
        aircraftChanged
          ? partners.map(async (partner, index) => {
              const key = AIRCRAFT_ASSET[partner.id];
              if (!key) return null;
              const model = await this.assets.instance(key);
              const root = new THREE.Group();
              model.scale.setScalar(0.66);
              const bounds = new THREE.Box3().setFromObject(model);
              model.position.y -= bounds.min.y;
              root.add(model);
              root.userData.detailId = partner.id;
              return {
                root,
                partner,
                index,
                destination: new THREE.Vector3(
                  -26.3 + index * 8.3,
                  0.08,
                  -3.1 + index * 0.35,
                ),
                started: this.phase,
              } satisfies Aircraft;
            })
          : [],
      ),
      Promise.allSettled(
        missingHotels.map(async (hotel) => ({
          hotel,
          root: await this.assets.instance("hotelLevel"),
        })),
      ),
    ]);
    // Stage asynchronous work off-scene, then commit only the newest complete selection.
    if (!this.mounted || revision !== this.generation) {
      planeResults.forEach((result) => {
        if (result.status === "fulfilled" && result.value)
          this.remove(result.value.root);
      });
      floorResults.forEach((result) => {
        if (result.status === "fulfilled") this.remove(result.value.root);
      });
      return;
    }
    if (aircraftChanged) {
      this.aircraft.forEach(({ root }) => this.remove(root));
      this.aircraft = planeResults.flatMap((result) =>
        result.status === "fulfilled" && result.value ? [result.value] : [],
      );
      this.aircraft.forEach((plane) => {
        plane.started = this.options.motion ? this.phase : this.phase - 20;
        this.aircraftRoot.add(plane.root);
      });
      if (planeResults.some((result) => result.status === "rejected"))
        this.emit({
          type: "error",
          message: "An aircraft could not load. Reload to retry.",
        });
    }
    const keep = new Set(hotels.map((h) => h.id));
    this.floors
      .filter((floor) => !keep.has(floor.hotel.id))
      .forEach(({ root }) => this.remove(root));
    this.floors = this.floors.filter((floor) => keep.has(floor.hotel.id));
    for (const result of floorResults) {
      if (result.status !== "fulfilled") {
        this.emit({
          type: "error",
          message: "The hotel terrace could not load. Reload to retry.",
        });
        continue;
      }
      const { root, hotel } = result.value;
      const index = hotels.findIndex((h) => h.id === hotel.id);
      ownMaterials(root);
      root.userData.detailId = hotel.id;
      const plane = new THREE.Plane(
        new THREE.Vector3(0, -1, 0),
        3 + index * 3.5,
      );
      root.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          const materials = Array.isArray(child.material)
            ? child.material
            : [child.material];
          materials.forEach((mat: THREE.Material) => {
            mat.clippingPlanes = [plane];
            mat.clipShadows = true;
          });
        }
      });
      const label = plaque(
        hotel.id.startsWith("review-")
          ? "REVIEW TERRACE"
          : hotel.brand.toUpperCase(),
        hotel.id.startsWith("review-")
          ? "CONSTRUCTION FIXTURE"
          : `${hotel.points.toLocaleString("en-US")} POINTS`,
        4.9,
        1.0,
      );
      label.position.set(0, 1.4, 5.7);
      root.add(label);
      this.hotelRoot.add(root);
      this.floors.push({
        root,
        hotel,
        index,
        plane,
        started: this.options.motion
          ? this.phase + index * 0.6
          : this.phase - 20,
      });
    }
    this.floors.forEach((floor) => {
      floor.index = hotels.findIndex((h) => h.id === floor.hotel.id);
      const terraceScale = 0.86 ** floor.index;
      floor.root.scale.set(terraceScale, 1, terraceScale);
      floor.root.position.set(
        17,
        3 + floor.index * 3.5,
        -2 - floor.index * 2.7,
      );
    });
    this.floors.sort((a, b) => a.index - b.index);
    this.siteFrame.visible = !hotels.length;
    if (this.hotelBase) this.hotelBase.visible = !!hotels.length;
    if (this.hotelRoof) {
      this.hotelRoof.visible = !!hotels.length;
      this.hotelRoof.position.y = 3 + hotels.length * 3.5;
      this.hotelRoof.position.z = -2 - Math.max(0, hotels.length - 1) * 2.7;
      const roofScale = 0.86 ** Math.max(0, hotels.length - 1);
      this.hotelRoof.scale.set(roofScale, 1, roofScale);
    }
    this.canvas.dataset.aircraftCount = String(this.aircraft.length);
    this.canvas.dataset.floorCount = String(this.floors.length);
    this.canvas.dataset.aircraftIds = this.aircraft
      .map((p) => p.partner.id)
      .join(",");
    this.canvas.dataset.floorIds = this.floors.map((f) => f.hotel.id).join(",");
    // Selection can fetch an alliance for the first time after initial loading.
    // Keep the visible notice and diagnostic state aligned with those requests.
    if (!this.contextLost) this.reportStatus();
    this.shadowDirty = true;
    this.invalidate();
  }

  replay() {
    this.aircraft.forEach((plane) => {
      plane.started = this.options.motion ? this.phase : this.phase - 20;
    });
    this.floors.forEach((floor) => {
      floor.started = this.options.motion
        ? this.phase + floor.index * 0.6
        : this.phase - 20;
    });
    this.shadowDirty = true;
    this.invalidate();
  }

  setOptions(options: WorldOptions) {
    this.options = options;
    this.lastTime = 0;
    this.resize();
    this.invalidate();
  }

  private resize = () => {
    if (!this.mounted) return;
    const rect = this.canvas.parentElement!.getBoundingClientRect();
    this.width = Math.max(1, rect.width);
    this.height = Math.max(1, rect.height);
    const narrow = this.width < 800;
    this.camera.aspect = this.width / this.height;
    this.camera.fov = narrow ? 48 : 37;
    const target = new THREE.Vector3(0, 3, 3);
    const viewDirection = new THREE.Vector3(8, 22, 62);
    // Fit the whole resort in portrait panels as well as wide windows.
    const distance = Math.max(
      viewDirection.length(),
      82 /
        (2 *
          Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) *
          this.camera.aspect),
    );
    this.camera.position
      .copy(target)
      .addScaledVector(viewDirection.normalize(), distance);
    this.camera.lookAt(target);
    this.dof.materialBokeh.uniforms.focus.value = distance + 7;
    this.camera.updateProjectionMatrix();
    const dpr = Math.min(
      window.devicePixelRatio || 1,
      this.options.quality === "cinematic" && !narrow ? 1.15 : 1.0,
    );
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(this.width, this.height, false);
    this.composer.setPixelRatio(dpr);
    this.composer.setSize(this.width, this.height);
    this.dof.enabled = !narrow && this.options.quality === "cinematic";
    this.invalidate();
  };

  private animate = (time: number) => {
    this.frame = 0;
    if (!this.mounted || this.contextLost || document.hidden) {
      this.lastTime = 0;
      return;
    }
    const dt = this.lastTime ? Math.min((time - this.lastTime) / 1000, 0.2) : 0;
    this.lastTime = time;
    const motion = this.options.motion;
    if (motion) this.phase += dt;
    let changing = false;
    for (const plane of this.aircraft) {
      const progress = approachProgress(this.phase, plane.started, plane.index);
      const remaining = 1 - progress;
      plane.root.visible = progress > 0;
      plane.root.position.set(
        plane.destination.x + remaining * 22,
        plane.destination.y + remaining * remaining * 22,
        plane.destination.z - remaining * 83,
      );
      plane.root.rotation.set(
        -0.07 * Math.sin(progress * Math.PI),
        0.2 * remaining,
        -0.13 * Math.sin(progress * Math.PI),
      );
      if (progress < 1 && motion) changing = true;
    }
    for (const floor of this.floors) {
      const progress = smootherStep((this.phase - floor.started) / 3.6);
      const base = 3 + floor.index * 3.5;
      floor.plane.constant = base + progress * 3.8;
      floor.root.position.y = base + (1 - progress) * 0.35;
      if (progress < 1 && motion) changing = true;
    }
    if (this.hotelRoof && this.floors.length) {
      const latest = this.floors[this.floors.length - 1];
      const progress = smootherStep((this.phase - latest.started) / 3.6);
      this.hotelRoof.visible = progress > 0.82;
      this.hotelRoof.position.y =
        3 + this.floors.length * 3.5 + (1 - progress) * 4;
    }
    this.forumSpinner.rotation.y = this.phase * 0.07;
    const bagAngle = [-0.12, 0.12];
    this.bags.forEach((bag) => {
      const pose = beltPose(bag.distance + this.phase * 0.42);
      const angle = bagAngle[bag.side];
      const x = pose.x * 1.15,
        z = pose.z * 1.15;
      bag.root.position.set(
        (bag.side ? 20 : -19) + x * Math.cos(angle) + z * Math.sin(angle),
        1.265,
        (bag.side ? 16 : 17) - x * Math.sin(angle) + z * Math.cos(angle),
      );
      bag.root.rotation.y = pose.heading + angle;
    });
    this.palms.forEach((palm, index) => {
      palm.rotation.z = Math.sin(this.phase * 0.55 + index * 1.3) * 0.009;
    });
    if (this.ship) {
      this.ship.position.x = -35 + Math.sin(this.phase * 0.009) * 10;
      this.ship.rotation.z = Math.sin(this.phase * 0.42) * 0.006;
    }
    this.sea.material.uniforms["time"].value = this.phase * 0.18;
    this.assets.animate(this.phase);
    if (this.shadowDirty || changing) {
      this.renderer.shadowMap.needsUpdate = true;
      this.shadowDirty = false;
    }
    this.renderer.info.autoReset = false;
    this.renderer.info.reset();
    this.composer.render(dt);
    this.canvas.dataset.animationPhase = this.phase.toFixed(3);
    this.canvas.dataset.aircraftProgress = this.aircraft
      .map((plane) =>
        approachProgress(this.phase, plane.started, plane.index).toFixed(3),
      )
      .join(",");
    this.canvas.dataset.geometries = String(
      this.renderer.info.memory.geometries,
    );
    this.canvas.dataset.textures = String(this.renderer.info.memory.textures);
    this.framesMeasured++;
    if (time - this.measurementStart > 1500) {
      this.canvas.dataset.fps = String(
        Math.round(
          (this.framesMeasured * 1000) / (time - this.measurementStart),
        ),
      );
      this.canvas.dataset.drawCalls = String(this.renderer.info.render.calls);
      this.canvas.dataset.triangles = String(
        this.renderer.info.render.triangles,
      );
      this.measurementStart = time;
      this.framesMeasured = 0;
    }
    if (motion || changing || !this.ready) this.invalidate();
  };

  private invalidate() {
    if (this.mounted && !this.frame && !this.contextLost && !document.hidden)
      this.frame = requestAnimationFrame(this.animate);
  }

  private hit(event: PointerEvent) {
    const bounds = this.canvas.getBoundingClientRect();
    this.pointer.set(
      ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
      (-(event.clientY - bounds.top) / bounds.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(
      [this.aircraftRoot, this.hotelRoot, this.bagRoot, this.forumSpinner],
      true,
    );
    for (const hit of hits) {
      let object: THREE.Object3D | null = hit.object;
      while (object) {
        if (object.userData.detailId || object.userData.alliance)
          return object.userData;
        object = object.parent;
      }
    }
    return null;
  }
  private onPointerDown = (event: PointerEvent) => {
    if (!this.pointerStart && event.isPrimary)
      this.pointerStart = {
        x: event.clientX,
        y: event.clientY,
        id: event.pointerId,
      };
  };
  private onPointerCancel = () => {
    this.pointerStart = null;
  };
  private onPointerUp = (event: PointerEvent) => {
    const start = this.pointerStart;
    this.pointerStart = null;
    if (
      !start ||
      start.id !== event.pointerId ||
      Math.hypot(event.clientX - start.x, event.clientY - start.y) > 5
    )
      return;
    const hit = this.hit(event);
    if (hit) this.emit({ type: "detail", id: hit.detailId ?? hit.alliance });
  };
  private onPointerMove = (event: PointerEvent) => {
    if (
      this.pointerStart &&
      Math.hypot(
        event.clientX - this.pointerStart.x,
        event.clientY - this.pointerStart.y,
      ) > 5
    )
      this.pointerStart = null;
    this.canvas.style.cursor = this.hit(event) ? "pointer" : "default";
  };
  private onContextLost = (event: Event) => {
    event.preventDefault();
    this.contextLost = true;
    cancelAnimationFrame(this.frame);
    this.frame = 0;
    this.emit({
      type: "error",
      message:
        "The 3D view paused while graphics were unavailable. Your selections are saved.",
    });
  };
  private onContextRestored = () => {
    this.contextLost = false;
    this.shadowDirty = true;
    this.lastTime = 0;
    this.invalidate();
    this.reportStatus();
  };
  private onVisibility = () => {
    if (document.hidden) {
      cancelAnimationFrame(this.frame);
      this.frame = 0;
      this.lastTime = 0;
    } else this.invalidate();
  };

  dispose() {
    this.mounted = false;
    this.generation++;
    cancelAnimationFrame(this.frame);
    clearTimeout(this.statusTimer);
    this.observer.disconnect();
    this.canvas.removeEventListener("pointerdown", this.onPointerDown);
    this.canvas.removeEventListener("pointerup", this.onPointerUp);
    this.canvas.removeEventListener("pointermove", this.onPointerMove);
    this.canvas.removeEventListener("pointercancel", this.onPointerCancel);
    this.canvas.removeEventListener("webglcontextlost", this.onContextLost);
    this.canvas.removeEventListener(
      "webglcontextrestored",
      this.onContextRestored,
    );
    document.removeEventListener("visibilitychange", this.onVisibility);
    this.assets.dispose([this.scene]);
    this.hdr?.dispose();
    this.pmrem?.dispose();
    this.composer.passes.forEach((pass) => pass.dispose());
    this.composer.dispose();
    this.renderer.dispose();
  }
}
