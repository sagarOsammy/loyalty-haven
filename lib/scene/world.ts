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
import { approachProgress, arrivalPose, hangarDoorProgress, smootherStep } from "./animation";
import { BAGGAGE_LAYOUT, baggageFrame, baggageTransform, seatLuggage } from "./baggage";
import { DEFAULT_BAGGAGE_ADJUSTMENTS, type BaggageAdjustments } from "../baggage-settings";
import { HangarDoors, HANGAR_BAY_CENTERS } from "./hangar";
import { LEAF_BEDS, PALM_PLACEMENTS, PLANTER_PLACEMENTS } from "./landscape";
import { FORUM_LAYOUT } from "./forum";
import { ForumFountains, FOUNTAIN_LAYOUT } from "./fountains";
import { ResortLighting, PATH_LAMP_PLACEMENTS } from "./lighting";
import { WaterfrontBoardwalk } from "./boardwalk";
import { BOARDWALK_LAYOUT } from "./boardwalk-layout";
import { WaterfrontCabanas } from "./cabanas";
import { auditCabanaLayout } from "./cabana-layout";
import { LayeredPlanting } from "./layered-planting";
import { StaticInstances } from "./static-instances";
import { FloweringTrees } from "./flowering-trees";
import { OutdoorBenches } from "./outdoor-benches";
import { ParasolSeating } from "./parasol-seating";
import { auditBenchLayout, benchKeepouts } from "./bench-layout";
import { auditFloweringTreeLayout, floweringTreeFootprint, FLOWERING_TREE_PLACEMENTS } from "./flowering-tree-layout";
import { auditParasolLayout, parasolFootprints } from "./parasol-layout";
import { LabelPass } from "./labels";
import { SunsetAtmosphere, SUNSET_SKY } from "./sunset";
import { CruiseClock, CruiseRoute, CRUISE_START, CRUISE_BOW_TURN, CRUISE_WAKE_LIFETIME, CRUISE_WAKE_SCALE } from "./cruise";
import { PropellerWake } from "./wake";
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

// Center the ship on the annotated desktop spot (291, 171), on the sea surface.
const SHIP_POSITION = CRUISE_START.toArray() as [number,number,number];
// Compensate for the greater distance to preserve the approved visible ship size.
const SHIP_SCALE = 3.082244;

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
  private belts: (THREE.Group | undefined)[] = [];
  private baggageAdjustments = DEFAULT_BAGGAGE_ADJUSTMENTS;
  private baggageFrames = [new THREE.Matrix4(),new THREE.Matrix4()];
  private palms: THREE.Group[] = [];
  private staticRoot = new THREE.Group();
  private hotelRoot = new THREE.Group();
  private aircraftRoot = new THREE.Group();
  private hangarDoors = new HangarDoors();
  private bagRoot = new THREE.Group();
  private forumRoot = new THREE.Group();
  private fountains = new ForumFountains();
  private resortLighting = new ResortLighting();
  private boardwalk = new WaterfrontBoardwalk();
  private cabanas = new WaterfrontCabanas();
  private layeredPlanting = new LayeredPlanting();
  private floweringTrees = new FloweringTrees();
  private outdoorBenches = new OutdoorBenches();
  private parasolSeating = new ParasolSeating();
  private furnishingInstances = new StaticInstances();
  private siteFrame: THREE.Group;
  private hotelBase?: THREE.Group;
  private hotelRoof?: THREE.Group;
  private ship?: THREE.Group;
  private cruise!: CruiseRoute;
  private cruiseClock: CruiseClock;
  private shipShadow: THREE.DirectionalLight;
  private wake = new PropellerWake();
  private shadowUpdatedAt = 0;
  private sea: Water;
  private atmosphere: SunsetAtmosphere;
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
  private resizeFrame = 0;
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
    this.cruiseClock = new CruiseClock(options.motion);
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.9;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.localClippingEnabled = true;
    this.scene.background = new THREE.Color("#c4c0af");
    this.scene.fog = new THREE.FogExp2("#c9aaa0", 0.00045);
    this.camera.position.set(23, 33, 68);
    this.camera.lookAt(0, 3, 0);
    this.scene.add(new THREE.HemisphereLight("#d2dced", "#92704c", 0.75));
    this.sun = new THREE.DirectionalLight("#ffc078", 4.2);
    this.sun.position.set(55, 40, -90);
    this.sun.target.position.set(0, 0, 0);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    Object.assign(this.sun.shadow.camera, {
      left: -70,
      right: 70,
      top: 65,
      bottom: -65,
      near: 1,
      far: 220,
    });
    this.sun.shadow.normalBias = 0.025;
    this.sun.shadow.bias = -0.00018;
    this.sun.shadow.radius = 3;
    this.scene.add(this.sun, this.sun.target);
    // A shadow-only solar map follows the offshore ship without adding illumination.
    this.shipShadow = new THREE.DirectionalLight("#ffc078",0);
    this.shipShadow.name = "MovingShipSunShadow";
    this.shipShadow.castShadow = true;
    this.shipShadow.shadow.mapSize.set(1024,1024);
    Object.assign(this.shipShadow.shadow.camera,{left:-75,right:75,top:75,bottom:-75,near:20,far:220});
    this.shipShadow.shadow.normalBias = 0.04;
    this.shipShadow.shadow.bias = -0.00015;
    this.scene.add(this.shipShadow,this.shipShadow.target);
    const fill = new THREE.DirectionalLight("#b8c9e1", 0.4);
    fill.position.set(18, 14, 30);
    this.scene.add(fill);
    this.scene.add(
      this.staticRoot,
      this.hotelRoot,
      this.aircraftRoot,
      this.bagRoot,
    );
    this.staticRoot.add(createSiteGround());
    this.staticRoot.add(this.fountains.root);
    this.staticRoot.add(this.resortLighting.root);
    this.staticRoot.add(this.boardwalk.root);
    this.staticRoot.add(this.cabanas.root, this.layeredPlanting.root);
    this.staticRoot.add(this.floweringTrees.root, this.outdoorBenches.root, this.parasolSeating.root);
    this.canvas.dataset.boardwalkPlanks = String(this.boardwalk.plankCount);
    this.canvas.dataset.boardwalkBounds = [BOARDWALK_LAYOUT.leftX, BOARDWALK_LAYOUT.rightX,
      BOARDWALK_LAYOUT.rearZ, BOARDWALK_LAYOUT.frontZ].join(",");
    this.canvas.dataset.pathLampCount = String(PATH_LAMP_PLACEMENTS.length);
    this.canvas.dataset.palmUplightCount = String(PALM_PLACEMENTS.length);
    this.siteFrame = constructionFrame();
    place(this.siteFrame, this.staticRoot, 17, 0, -2);
    const waterNormal = new THREE.TextureLoader().load(
      "/assets/water-normal.jpg",
      (texture) => {
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        this.invalidate();
      },
    );
    this.atmosphere = new SunsetAtmosphere();
    this.scene.add(this.atmosphere.root);
    this.sea = new Water(new THREE.PlaneGeometry(1, 1), {
      textureWidth: 512,
      textureHeight: 512,
      waterNormals: waterNormal,
      sunDirection: this.sun.position.clone().normalize(),
      sunColor: 0xffbe68,
      waterColor: 0x294e65,
      alpha: 0.92,
      distortionScale: 3.0,
      fog: true,
    });
    this.sea.rotation.x = -Math.PI / 2;
    this.sea.position.set(0, -1.12, -550);
    this.scene.add(this.sea,this.wake.root);
    this.sea.material.transparent = true;
    this.sea.receiveShadow = true;
    this.sea.material.uniforms.size.value = 14;
    this.sea.material.fragmentShader = this.sea.material.fragmentShader.replace(
      "gl_FragColor = vec4( outgoingLight, alpha );",
      "gl_FragColor = vec4( outgoingLight, mix(alpha, 0.995, smoothstep(50.0, 220.0, distance)) );",
    ).replace(
      "vec3 scatter = max( 0.0, dot( surfaceNormal, eyeDirection ) ) * waterColor;",
      "vec3 scatter = (0.38 + 0.5 * max(0.0, dot(surfaceNormal, eyeDirection))) * waterColor;",
    ).replace(
      "sunColor * diffuseLight * 0.3 + scatter",
      "sunColor * diffuseLight * 0.06 + scatter",
    ).replace(
      "reflectionSample + specularLight, reflectance",
      "reflectionSample + specularLight * 4.0, reflectance * 0.5",
    );
    const reflectWater = this.sea.onBeforeRender.bind(this.sea);
    this.sea.onBeforeRender = (...args) => {
      if (!args[1].overrideMaterial) {
        const visible = this.wake.root.visible;
        this.wake.root.visible = false;
        try { reflectWater(...args); } finally { this.wake.root.visible = visible; }
      }
    };
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.dof = new BokehPass(this.scene, this.camera, {
      focus: 73,
      aperture: 0.000013,
      maxblur: 0.004,
    });
    this.composer.addPass(this.dof);
    this.composer.addPass(new LabelPass(this.scene, this.camera));
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
    this.observer = new ResizeObserver(() => {
      // Resize rendering targets after observer delivery, avoiding layout feedback in the same cycle.
      if (!this.resizeFrame) this.resizeFrame = requestAnimationFrame(() => {
        this.resizeFrame = 0;
        this.resize();
      });
    });
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
      const [mountains] = await Promise.all([this.assets.instance("mountains"), this.atmosphere.load()]);
      if (!this.mounted) {
        this.assets.releaseInstance(mountains);
        return;
      }
      this.atmosphere.useMountain(mountains);
      this.atmosphere.fit(this.camera, this.sea, this.height);
      this.canvas.dataset.mountainAsset = ASSETS.mountains;
      delete this.canvas.dataset.cloudAsset;
      this.canvas.dataset.cloudCount = "0";
      if (!this.mounted) return;
      this.canvas.dataset.sunsetSky = SUNSET_SKY;
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
      this.scene.environmentIntensity = 0.4;
      this.scene.environmentRotation.y = -0.6;
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
    object.userData.assetKey = key;
    place(object, parent, ...position);
    return object;
  }

  private async populate() {
    place(this.forumRoot, this.staticRoot, FORUM_LAYOUT.x, FORUM_LAYOUT.y, FORUM_LAYOUT.z);
    this.forumRoot.scale.setScalar(FORUM_LAYOUT.scale);
    this.canvas.dataset.forumScale = String(this.forumRoot.scale.x);
    this.canvas.dataset.forumAsset = ASSETS.forum;
    this.canvas.dataset.fountainJets = String(FOUNTAIN_LAYOUT.perimeterJets + FOUNTAIN_LAYOUT.centralJets + FOUNTAIN_LAYOUT.crownJets);
    const settled = await Promise.allSettled([
      this.asset("hangar", this.staticRoot, [-18, 0, -4]).then((hangar) => {
        if (hangar) this.hangarDoors.bind(hangar);
      }),
      this.asset("forum", this.forumRoot, [0, 0, 0]).then((forum) => {
        // The authored blank plaque duplicates the named entrance sign.
        const blank = forum?.getObjectByName("ForumRuntimePlaque");
        if (blank) blank.visible = false;
      }),
      this.asset("telescope", this.staticRoot, [9, 0.02, 21], 2.6, -0.65),
      this.asset("hotelBase", this.hotelRoot, [17, 0, -2]).then((o) => {
        this.hotelBase = o;
        if (o) o.visible = false;
      }),
      this.asset("hotelRoof", this.hotelRoot, [17, 6.5, -2]).then((o) => {
        this.hotelRoof = o;
        if (o) o.visible = false;
      }),
      this.asset("ship", this.scene, SHIP_POSITION, SHIP_SCALE, 1.1).then((o) => {
        this.ship = o;
        if (o) {
          this.canvas.dataset.shipAsset = ASSETS.ship;
          this.canvas.dataset.shipScale = String(o.scale.x);
        }
      }),
      ...BAGGAGE_LAYOUT.centers.map(({x,z},side) =>
        this.asset("belt",this.staticRoot,[x,0,z],BAGGAGE_LAYOUT.scale,BAGGAGE_LAYOUT.heading).then(belt => {
          this.belts[side] = belt;
          this.fitBaggage();
        })),
      this.makePalms(),
      this.makeFurnishings(),
      this.makeLuggage(),
      ...(["united", "avianca", "airCanada", "hotelLevel"] as AssetKey[]).map(
        (key) => this.assets.get(key),
      ),
    ]);
    if (!this.mounted) return;
    this.staticRoot.updateMatrixWorld(true);
    const existingPlanters = this.staticRoot.children
      .filter(object => object.userData.assetKey === "planter")
      .map(object => {
        const bounds = new THREE.Box3().setFromObject(object);
        return {left: bounds.min.x, right: bounds.max.x, rear: bounds.min.z, front: bounds.max.z};
      });
    const cabanaIssues = auditCabanaLayout({
      existingPlanters,
      palmWells: PALM_PLACEMENTS.map(([x, z, scale]) => ({x, z, radius: scale * 1.05 + 0.15})),
      leafBeds: LEAF_BEDS.map(([x, z, width, depth]) => ({x, z, width: width + 0.26, depth: depth + 0.26})),
      pathLamps: PATH_LAMP_PLACEMENTS,
    });
    this.canvas.dataset.cabanaLayoutIssues = String(cabanaIssues.length);
    if (cabanaIssues.length) this.assets.failures.add("cabana layout");
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
      plaque("ALLIANCE FORUM", "YOUR CONNECTIONS, WORLDWIDE", 8.0, 0.85),
      this.forumRoot,
      0,
      4.6,
      4.42,
    );
    this.resortLighting.lightStaticSurfaces(this.staticRoot);
    this.ready = true;
    this.canvas.dataset.sceneReady = "true";
    this.canvas.dataset.assetFailures = [...this.assets.failures].join(",");
    await this.applySelection(this.pending, true);
    this.reportStatus();
    this.shadowDirty = true;
    this.invalidate();
  }

  private async makePalms() {
    // Move the entire western tree group and its planters six metres left.
    await this.assets.get("palm");
    for (const [x, z, scale, heading] of PALM_PLACEMENTS) {
      const palm = await this.asset(
        "palm",
        this.staticRoot,
        [x, 0, z],
        scale,
        heading,
      );
      if (palm) {
        this.resortLighting.uplightPalm(palm, x, z);
        this.palms.push(palm);
      }
    }
    this.canvas.dataset.palmAsset = ASSETS.palm;
    this.canvas.dataset.palmCount = String(this.palms.length);
    await this.assets.get("planter");
    for (const [x, z] of PLANTER_PLACEMENTS) {
      await this.asset("planter", this.staticRoot, [x, 0, z], 0.55);
    }
  }

  private async makeFurnishings() {
    const captureBounds = (root: THREE.Group) => {
      root.updateMatrixWorld(true);
      return root.children.filter(child => child.name.includes("anchor") || child.name.startsWith("Parasol group ")).map(child => {
        const bounds = new THREE.Box3().setFromObject(child);
        return {name: child.name, min: bounds.min.toArray(), max: bounds.max.toArray()};
      });
    };
    const furnishingBounds: Record<string, ReturnType<typeof captureBounds>> = {};
    const stages = ["cabanas", "layered planting", "flowering trees", "outdoor benches", "patio seating"];
    const settled = await Promise.allSettled([
      this.cabanas.load(() => this.assets.get("cabana"), {
        sourceId: "tripo_pbr_model_4566ecd8-8750-4ee0-867c-b3a537a87952.fbx",
      }).then((result) => {
        if (!this.mounted) return;
        this.canvas.dataset.cabanaCount = String(result.placed);
        this.canvas.dataset.cabanaVertices = String(result.vertices);
        this.canvas.dataset.cabanaTriangles = String(result.triangles);
      }),
      this.layeredPlanting.populate({
        createPlanter: () => this.assets.instance("accentPlanter"),
        createFoliage: () => this.assets.instance("tropicalFoliage"),
      }).then((result) => {
        if (!this.mounted) return;
        this.canvas.dataset.accentPlanterCount = String(result.plantersAttached);
        this.canvas.dataset.bedAccentCount = String(result.foliageAttached);
        if (result.failures.length) this.assets.failures.add("layered planting");
        this.furnishingInstances.batch(this.layeredPlanting.root);
      }),
      this.floweringTrees.load(() => this.assets.get("floweringTree"), {sourceId: "flower.glb"}).then(result => {
        if (!this.mounted) return;
        this.canvas.dataset.floweringTreeCount = String(result.placed);
        this.canvas.dataset.floweringTreeVertices = String(result.vertices);
        this.canvas.dataset.floweringTreeTriangles = String(result.triangles);
        furnishingBounds.trees = captureBounds(this.floweringTrees.root);
        this.canvas.dataset.floweringTreeBatches = String(this.furnishingInstances.batch(this.floweringTrees.root));
        this.resortLighting.lightFloweringTrees(this.floweringTrees.root, this.floweringTrees.placements);
        this.canvas.dataset.floweringTreeUplightCount = String(this.floweringTrees.placements.length);
      }),
      this.outdoorBenches.load(() => this.assets.get("outdoorBench"), {sourceId: "bench.glb"}).then(result => {
        if (!this.mounted) return;
        this.canvas.dataset.outdoorBenchCount = String(result.placed);
        this.canvas.dataset.outdoorBenchVertices = String(result.vertices);
        this.canvas.dataset.outdoorBenchTriangles = String(result.triangles);
        furnishingBounds.benches = captureBounds(this.outdoorBenches.root);
        this.canvas.dataset.outdoorBenchBatches = String(this.furnishingInstances.batch(this.outdoorBenches.root));
      }),
      this.parasolSeating.loadCombined(() => this.assets.get("patioSeating"), {sourceId: "patio.glb"}).then(result => {
        if (!this.mounted) return;
        this.canvas.dataset.patioGroupCount = String(result.groupsComplete);
        this.canvas.dataset.patioChairCount = String(result.totalChairCount);
        this.canvas.dataset.patioChairsPerGroup = String(result.chairsPerGroup);
        this.canvas.dataset.patioVertices = String(result.vertices);
        this.canvas.dataset.patioTriangles = String(result.triangles);
        furnishingBounds.patios = captureBounds(this.parasolSeating.root);
        this.canvas.dataset.patioBatches = String(this.furnishingInstances.batch(this.parasolSeating.root));
      }),
    ]);
    if (!this.mounted) return;
    settled.forEach((result, index) => {
      if (result.status === "rejected") this.assets.failures.add(stages[index]);
    });
    this.canvas.dataset.furnishingBounds = JSON.stringify(furnishingBounds);
    const patioKeepouts = parasolFootprints();
    const treeKeepouts = FLOWERING_TREE_PLACEMENTS.map(tree => floweringTreeFootprint(tree, 0.55));
    const asBenchRect = ({x, z, width, depth}: {x: number; z: number; width: number; depth: number}) => ({
      left: x - width / 2, right: x + width / 2, rear: z - depth / 2, front: z + depth / 2,
    });
    const audits = {
      floweringTreeLayoutIssues: auditFloweringTreeLayout({seatingKeepouts: [
        ...patioKeepouts,
        ...benchKeepouts().map(({id, footprint}) => ({id,
          x: (footprint.left + footprint.right) / 2, z: (footprint.rear + footprint.front) / 2,
          width: footprint.right - footprint.left, depth: footprint.front - footprint.rear,
        })),
      ]}).length,
      outdoorBenchLayoutIssues: auditBenchLayout({reservedZones: [
        ...treeKeepouts, ...patioKeepouts,
      ].map((rect, index) => ({id: rect.id ?? `furnishing-${index}`, footprint: asBenchRect(rect)}))}).length,
      patioLayoutIssues: auditParasolLayout().length,
    };
    for (const [key, count] of Object.entries(audits)) {
      this.canvas.dataset[key] = String(count);
      if (count) this.assets.failures.add(key);
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
        seatLuggage(model);
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
              // Keep detailed wings inside the fixed rear portals.
              const size = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3());
              model.scale.setScalar(Math.min(0.6, 6.95 / size.x, 7.3 / size.z));
              const bounds = new THREE.Box3().setFromObject(model);
              model.position.y += 0.35 - bounds.min.y;
              root.add(model);
              root.userData.detailId = partner.id;
              return {
                root,
                partner,
                index,
                destination: new THREE.Vector3(
                  HANGAR_BAY_CENTERS[index],
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
    this.canvas.dataset.forumAlliance = selection.alliance ?? "none";
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
    this.cruiseClock.setRunning(options.motion,performance.now());
    this.options = options;
    this.lastTime = 0;
    this.resize();
    this.invalidate();
  }

  setBaggageAdjustments(adjustments: BaggageAdjustments) {
    this.baggageAdjustments = adjustments.map(belt => ({ ...belt })) as BaggageAdjustments;
    this.fitBaggage();
    this.shadowDirty = true;
    this.invalidate();
  }

  getBaggageGuides() {
    const project = (point: THREE.Vector3) => {
      const p = point.project(this.camera);
      return [(p.x+1)*this.width/2,(1-p.y)*this.height/2] as [number,number];
    };
    return {
      width: this.width, height: this.height,
      hangar: [project(new THREE.Vector3(-30.5,0.28,3.371116824448109)),project(new THREE.Vector3(-5.5,0.28,3.371116824448109))],
      belts: this.baggageFrames.map(frame => [-3.15,3.15].map(x =>
        project(new THREE.Vector3(x*BAGGAGE_LAYOUT.scale,0.08,2.35*BAGGAGE_LAYOUT.scale).applyMatrix4(frame)),
      )),
    };
  }

  private fitBaggage() {
    this.baggageFrames = BAGGAGE_LAYOUT.centers.map((_,side) => baggageFrame(side,this.baggageAdjustments[side]));
    this.belts.forEach((belt,side) => {
      if (!belt) return;
      belt.matrixAutoUpdate = false;
      belt.matrix.copy(this.baggageFrames[side]).scale(new THREE.Vector3().setScalar(BAGGAGE_LAYOUT.scale));
      belt.matrixWorldNeedsUpdate = true;
    });
    this.canvas.dataset.baggagePerspective = "hangar-ground-axis";
    this.canvas.dataset.baggageAdjustments = JSON.stringify(this.baggageAdjustments);
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
    let distance = Math.max(
      viewDirection.length(),
      82 /
        (2 *
          Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) *
          this.camera.aspect),
    );
    viewDirection.normalize();
    this.camera.updateProjectionMatrix();
    const controls = this.canvas.closest(".haven")
      ?.querySelector<HTMLElement>(".resort-controls");
    const bottom = controls
      ? Math.min(this.height, controls.getBoundingClientRect().top - rect.top - 24)
      : this.height - 24;
    const safeBottom = 1 - 2 * bottom / this.height;
    // Keep the enlarged forecourt above the controls in short, wide windows.
    for (let attempt = 0; attempt < 40; attempt++) {
      this.camera.position.copy(target).addScaledVector(viewDirection, distance);
      this.camera.lookAt(target);
      this.camera.updateMatrixWorld(true);
      let lowest = 1;
      for (let point = 0; point < 32; point++) {
        const angle = point * Math.PI / 16;
        const edge = new THREE.Vector3(
          FORUM_LAYOUT.x + Math.cos(angle) * (FORUM_LAYOUT.framingRadius + 0.1),
          0,
          FORUM_LAYOUT.z + Math.sin(angle) * (FORUM_LAYOUT.framingRadius + 0.1),
        ).project(this.camera);
        lowest = Math.min(lowest, edge.y);
      }
      if (lowest >= safeBottom) break;
      distance *= 1.025;
    }
    this.fitBaggage();
    this.dof.materialBokeh.uniforms.focus.value = distance + 7;
    this.atmosphere.fit(this.camera, this.sea, this.height);
    this.sun.position.copy(this.atmosphere.lightDirection).multiplyScalar(115);
    this.sun.shadow.camera.updateProjectionMatrix();
    this.cruise = new CruiseRoute(this.camera,this.atmosphere.horizonFraction);
    this.canvas.dataset.shipTarget = this.cruise.target.toArray().map(v => v.toFixed(4)).join(",");
    this.canvas.dataset.shipArrivalSeconds = "150";
    this.sea.material.uniforms.sunDirection.value.copy(this.atmosphere.lightDirection);
    this.canvas.dataset.horizonFraction = this.atmosphere.horizonFraction.toFixed(4);
    const sunScreen = this.atmosphere.sunPosition.clone().project(this.camera);
    this.canvas.dataset.sunScreen = [(sunScreen.x + 1) * this.width / 2, (1 - sunScreen.y) * this.height / 2].map(v => v.toFixed(1)).join(",");
    this.canvas.dataset.sunDirection = this.atmosphere.lightDirection.toArray().map(v => v.toFixed(4)).join(",");
    this.canvas.dataset.waterAlpha = String(this.sea.material.uniforms.alpha.value);
    this.shadowDirty = true;
    const dpr = Math.min(
      window.devicePixelRatio || 1,
      this.options.quality === "cinematic" && !narrow ? 1.5 : 1.25,
      Math.sqrt(4_000_000 / (this.width * this.height)),
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
    const openings = [0, 0, 0];
    for (const plane of this.aircraft) {
      const progress = approachProgress(this.phase, plane.started, plane.index);
      const pose = arrivalPose(progress);
      const opening = hangarDoorProgress(this.phase, plane.started, plane.index);
      openings[plane.index] = opening;
      plane.root.visible = progress > 0;
      plane.root.position.set(
        plane.destination.x + pose.xOffset,
        plane.destination.y + pose.height,
        plane.destination.z + pose.zOffset,
      );
      plane.root.rotation.set(
        pose.pitch,
        pose.heading,
        pose.roll,
      );
      if (progress < 1 && motion) changing = true;
      if (opening > 0 && motion) changing = true;
    }
    // Keep the rear shutters clear until the last aircraft has entered.
    const opening = Math.max(...openings);
    this.hangarDoors.setOpening(opening);
    this.canvas.dataset.hangarDoors = [opening, opening, opening].map((p) => p.toFixed(3)).join(",");
    this.canvas.dataset.arrivalDirection = "cruise-ship-to-rear-hangar";
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
    this.bags.forEach((bag) => {
      bag.root.matrixAutoUpdate = false;
      bag.root.matrix.copy(baggageTransform(this.baggageFrames[bag.side],bag.distance + this.phase * 0.42));
      bag.root.matrixWorldNeedsUpdate = true;
    });
    this.canvas.dataset.baggageScale = String(BAGGAGE_LAYOUT.scale);
    this.canvas.dataset.baggageSurfaceY = String(BAGGAGE_LAYOUT.surfaceY);
    this.canvas.dataset.baggageCenters = BAGGAGE_LAYOUT.centers.map(({x,z}) => `${x.toFixed(3)},${z.toFixed(3)}`).join("|");
    this.palms.forEach((palm, index) => {
      palm.rotation.z = Math.sin(this.phase * 0.55 + index * 1.3) * 0.009;
    });
    if (this.ship) {
      const elapsed = this.cruiseClock.read(time);
      const pose = this.cruise.pose(elapsed);
      this.ship.position.copy(pose.position);
      this.ship.rotation.set(0,pose.heading,pose.roll);
      this.wake.update(this.cruise,elapsed,this.height);
      this.canvas.dataset.shipBowTurnDegrees = String(THREE.MathUtils.radToDeg(CRUISE_BOW_TURN));
      this.canvas.dataset.wakeLifetime = String(CRUISE_WAKE_LIFETIME);
      this.canvas.dataset.wakeScale = String(CRUISE_WAKE_SCALE);
      this.canvas.dataset.wakeSprayCount = String(this.wake.spray.geometry.getAttribute("position").count);
      this.canvas.dataset.wakeActive = String(this.wake.mesh.visible);
      this.shipShadow.target.position.copy(pose.position);
      this.shipShadow.position.copy(pose.position).addScaledVector(this.atmosphere.lightDirection,130);
      this.canvas.dataset.shipPosition = pose.position.toArray().map(value => value.toFixed(4)).join(",");
      this.canvas.dataset.shipRoll = pose.roll.toFixed(6);
      this.canvas.dataset.shipElapsed = elapsed.toFixed(3);
      this.canvas.dataset.shipRouteTime = pose.routeTime.toFixed(3);
      const screen = pose.position.clone().project(this.camera);
      this.canvas.dataset.shipScreen = [(screen.x + 1) * this.width / 2,(1 - screen.y) * this.height / 2].map(v => v.toFixed(1)).join(",");
      this.canvas.dataset.shipShadowDirection = this.atmosphere.lightDirection.toArray().map(v => v.toFixed(4)).join(",");
    }
    this.sea.material.uniforms["time"].value = this.phase * 0.18;
    this.fountains.update(this.phase,this.height*this.renderer.getPixelRatio());
    this.canvas.dataset.fountainPhase = this.phase.toFixed(3);
    this.assets.animate(this.phase);
    if (this.shadowDirty || changing || (motion && time - this.shadowUpdatedAt >= 50)) {
      this.renderer.shadowMap.needsUpdate = true;
      this.shadowUpdatedAt = time;
      this.canvas.dataset.shadowUpdatedAt = time.toFixed(1);
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
      [this.aircraftRoot, this.hotelRoot, this.bagRoot],
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
    cancelAnimationFrame(this.resizeFrame);
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
    this.wake.dispose();
    this.fountains.dispose();
    this.resortLighting.dispose();
    this.boardwalk.dispose();
    this.assets.dispose([this.scene]);
    this.furnishingInstances.dispose();
    this.cabanas.dispose();
    this.layeredPlanting.dispose();
    this.floweringTrees.dispose();
    this.outdoorBenches.dispose();
    this.parasolSeating.dispose();
    this.hdr?.dispose();
    this.atmosphere.dispose();
    this.pmrem?.dispose();
    this.composer.passes.forEach((pass) => pass.dispose());
    this.composer.dispose();
    this.renderer.dispose();
  }
}
