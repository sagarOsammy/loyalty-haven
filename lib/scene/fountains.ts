import * as THREE from "three";
import { FORUM_LAYOUT } from "./forum";
import { FountainEffects, type FountainJet } from "./fountain-effects";

export const FOUNTAIN_LAYOUT = {
  outerRadius: 7.15,
  outerWaterRadius: 6.82,
  walkwayRadius: 5.25,
  centralRadius: 2.25,
  waterY: 0.22,
  centralWaterY: 0.32,
  perimeterJets: 40,
  centralJets: 12,
  crownJets: 7,
};

function annulus(inner: number, outer: number, y: number, mat: THREE.Material) {
  const mesh = new THREE.Mesh(new THREE.RingGeometry(inner, outer, 128).rotateX(-Math.PI / 2), mat);
  mesh.position.y = y;
  mesh.receiveShadow = true;
  return mesh;
}

function coping(inner: number, outer: number, top: number, mat: THREE.Material) {
  const profile = [[inner, -0.02], [outer, -0.02], [outer, top - 0.05],
    [outer - 0.04, top], [inner + 0.04, top], [inner, top - 0.05], [inner, -0.02]];
  const mesh = new THREE.Mesh(new THREE.LatheGeometry(profile.map(([r,y]) => new THREE.Vector2(r,y)), 128), mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/** A shallow outer basin and separate central fountain, driven by the world's pauseable phase. */
export class ForumFountains {
  readonly root = new THREE.Group();
  private effects: FountainEffects;
  private waterNormals: THREE.Texture;
  private phaseUniform = {value: 0};

  constructor() {
    this.root.name = "Forum shallow basins and fountains";
    this.root.position.set(FORUM_LAYOUT.x, 0, FORUM_LAYOUT.z);
    const stone = new THREE.MeshStandardMaterial({color: "#e5d3b7", roughness: 0.55});
    stone.name = "Fountain pale limestone coping";
    const tile = new THREE.MeshStandardMaterial({color: "#233e58", roughness: 0.6});
    this.waterNormals = new THREE.TextureLoader().load("/assets/water-normal.jpg");
    this.waterNormals.wrapS = this.waterNormals.wrapT = THREE.RepeatWrapping;
    this.waterNormals.repeat.set(3,3);
    const water = new THREE.MeshPhysicalMaterial({
      color: "#35556b", roughness: 0.13, metalness: 0,
      normalMap: this.waterNormals, normalScale: new THREE.Vector2(0.28,0.28),
      clearcoat: 1, clearcoatRoughness: 0.12,
      emissive: "#0d2036", emissiveIntensity: 0.12, envMapIntensity: 1.6,
      transparent: true, opacity: 0.72, depthWrite: false,
    });
    water.name = "Fountain translucent blue water with layered waves";
    water.onBeforeCompile = shader => {
      shader.uniforms.fountainTime = this.phaseUniform;
      shader.vertexShader = "varying vec3 fountainWorld;\n" + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace("#include <worldpos_vertex>",
        "#include <worldpos_vertex>\n fountainWorld = (modelMatrix * vec4(transformed,1.0)).xyz;");
      shader.fragmentShader = "uniform float fountainTime; varying vec3 fountainWorld;\n" + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace("#include <normal_fragment_maps>", `
        #include <normal_fragment_maps>
        float w1 = sin(fountainWorld.x*6.0+fountainWorld.z*3.0-fountainTime*2.4);
        float w2 = cos(fountainWorld.z*7.0-fountainWorld.x*2.0+fountainTime*1.8);
        normal = normalize(normal + vec3(w1*0.07,w2*0.07,0.0));
      `);
      shader.fragmentShader = shader.fragmentShader.replace("#include <opaque_fragment>", `
        float facing = abs(dot(normal, normalize(vViewPosition)));
        diffuseColor.a = mix(0.96,0.65,pow(facing,0.7));
        #include <opaque_fragment>
      `);
    };
    water.customProgramCacheKey = () => "fountain-blue-water-v2";

    const f = FOUNTAIN_LAYOUT;
    this.root.add(
      annulus(f.walkwayRadius, f.outerWaterRadius, 0.01, tile),
      annulus(f.walkwayRadius, f.outerWaterRadius, f.waterY, water),
      coping(f.outerWaterRadius, f.outerRadius, 0.39, stone),
      coping(f.walkwayRadius - 0.14, f.walkwayRadius, 0.27, stone),
      annulus(0, 2, 0.1, tile),
      annulus(0, 2, f.centralWaterY, water),
      coping(2, f.centralRadius, 0.46, stone),
    );
    const glow = new THREE.MeshBasicMaterial({color: "#ffcb76", toneMapped: false});
    for (const [radius,y] of [[f.outerWaterRadius - 0.03,0.18],[1.97,0.28]]) {
      const rim = new THREE.Mesh(new THREE.TorusGeometry(radius,0.025,5,128).rotateX(Math.PI/2),glow);
      rim.position.y = y;
      rim.name = "Warm underwater rim illumination";
      this.root.add(rim);
    }
    // Four shared lights reach the water, coping and column bases without shadow passes.
    for (let i=0;i<4;i++) {
      const angle = (i + 0.5) * Math.PI / 2;
      const light = new THREE.PointLight("#ffb957", 24, 7, 2);
      light.position.set(Math.cos(angle)*5.75,0.14,Math.sin(angle)*5.75);
      this.root.add(light);
    }
    const jets: FountainJet[] = [];
    const addJets = (count: number, radius: number, y: number, height: number, offset: number) => {
      for(let i=0;i<count;i++) {
        const angle = i*Math.PI*2/count+offset;
        jets.push({x:Math.cos(angle)*radius,z:Math.sin(angle)*radius,y,
          height:count===1?height:height*(0.9+0.1*Math.sin(i*2.17+offset)),seed:i*1.618+offset});
      }
    };
    addJets(f.perimeterJets,6.15,f.waterY,2.45,0);
    addJets(f.centralJets,1.15,f.centralWaterY,3.55,0.35);
    addJets(f.crownJets-1,0.24,f.centralWaterY,3.9,0.7);
    addJets(1,0,f.centralWaterY,4.3,0);
    this.effects = new FountainEffects(jets);
    this.root.add(this.effects.root);
    this.update(0,1278);
  }

  update(phase: number, viewportHeight: number) {
    this.phaseUniform.value = phase;
    this.waterNormals.offset.set(phase*0.016,phase*0.011);
    this.effects.update(phase,viewportHeight);
  }

  dispose() {
    this.effects.dispose();
  }
}
