import * as THREE from "three";
import { BOARDWALK_LAYOUT } from "./boardwalk-layout";
import { LEAF_BEDS, PALM_PLACEMENTS } from "./landscape";

type Rect = { left: number; right: number; rear: number; front: number };
type Plank = { x: number; z: number; width: number; length: number };

export class WaterfrontBoardwalk {
  readonly root = new THREE.Group();
  readonly plankCount: number;
  private planks: THREE.InstancedMesh;

  constructor() {
    const layout = BOARDWALK_LAYOUT;
    this.root.name = "Teak waterfront boardwalk, stage 4";
    const beds: Rect[] = LEAF_BEDS.map(([x, z, w, d]) => ({
      left: x - w / 2 - 0.13, right: x + w / 2 + 0.13,
      rear: z - d / 2 - 0.13, front: z + d / 2 + 0.13,
    }));
    const palms = PALM_PLACEMENTS.filter(([, z]) => z < layout.frontZ);
    const records: Plank[] = [];
    const columns = Math.ceil((layout.rightX - layout.leftX) / layout.plankWidth);
    for (let col = 0; col < columns; col++) {
      const left = layout.leftX + col * layout.plankWidth;
      const right = Math.min(left + layout.plankWidth - layout.plankGap, layout.rightX);
      const x = (left + right) / 2;
      const cuts: [number, number][] = beds.filter(bed => right > bed.left && left < bed.right)
        .map(bed => [bed.rear, bed.front]);
      palms.forEach(([px, pz, scale]) => {
        const radius = scale * 1.05 + 0.15;
        const dx = Math.max(left - px, px - right, 0);
        if (dx < radius) {
          const dz = Math.sqrt(radius ** 2 - dx ** 2);
          cuts.push([pz - dz, pz + dz]);
        }
      });
      // Stagger end joints between adjacent boards, retaining physical plank gaps.
      const first = layout.rearZ - (col % 3) * layout.plankLength / 3;
      for (let rear = first; rear < layout.frontZ; rear += layout.plankLength) {
        const start = Math.max(layout.rearZ, rear);
        const end = Math.min(layout.frontZ, rear + layout.plankLength - layout.plankGap);
        let spans: [number, number][] = [[start, end]];
        for (const [cutRear, cutFront] of cuts) {
          spans = spans.flatMap(([a, b]): [number, number][] => {
            if (cutFront <= a || cutRear >= b) return [[a, b]];
            const kept: [number, number][] = [];
            if (cutRear > a) kept.push([a, cutRear]);
            if (cutFront < b) kept.push([cutFront, b]);
            return kept;
          });
        }
        spans.forEach(([a, b]) => {
          if (b - a > 0.035) records.push({x, z: (a + b) / 2, width: right - left, length: b - a});
        });
      }
    }
    const wood = this.teakMaterial();
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const grains = new THREE.InstancedBufferAttribute(new Float32Array(records.length * 3), 3);
    geometry.setAttribute("boardGrainTransform", grains);
    this.planks = new THREE.InstancedMesh(geometry, wood, records.length);
    this.planks.name = "Staggered teak planks with fitted tree and planter openings";
    this.planks.receiveShadow = this.planks.castShadow = true;
    this.plankCount = records.length;
    const transform = new THREE.Object3D();
    const tint = new THREE.Color();
    const random = (seed: number) => {
      const value = Math.sin(seed * 87.17 + 16.8) * 43758.54;
      return value - Math.floor(value);
    };
    records.forEach(({x, z, width, length}, index) => {
      transform.position.set(x, layout.surfaceY - 0.03, z);
      transform.scale.set(width, 0.06, length);
      transform.rotation.y = index % 2 ? Math.PI : 0;
      transform.updateMatrix();
      this.planks.setMatrixAt(index, transform.matrix);
      tint.setRGB(0.78 + random(index) * 0.22, 0.77 + random(index) * 0.2, 0.75 + random(index) * 0.2);
      this.planks.setColorAt(index, tint);
      grains.setXYZ(index, random(index + 10), random(index + 800), length / layout.plankLength);
    });
    this.root.add(this.planks);
    const dark = new THREE.MeshStandardMaterial({color: "#34281d", roughness: 0.9});
    const base = new THREE.Mesh(new THREE.BoxGeometry(layout.rightX - layout.leftX, 0.025, layout.frontZ - layout.rearZ), dark);
    base.position.set((layout.leftX + layout.rightX) / 2, layout.surfaceY - 0.0725, (layout.frontZ + layout.rearZ) / 2);
    base.receiveShadow = true;
    this.root.add(base);
    this.makeEdging();
    // Open soil wells contain the original palm roots, with low timber collars.
    const soil = new THREE.MeshStandardMaterial({color: "#3b3627", roughness: 1});
    const trim = new THREE.MeshStandardMaterial({color: "#765338", roughness: 0.65});
    palms.forEach(([x, z, scale]) => {
      const radius = scale * 1.05 + 0.15;
      const earth = new THREE.Mesh(new THREE.CircleGeometry(radius, 48).rotateX(-Math.PI / 2), soil);
      earth.position.set(x, layout.surfaceY - 0.012, z);
      earth.receiveShadow = true;
      const rim = new THREE.Mesh(new THREE.RingGeometry(radius - 0.05, radius + 0.035, 48).rotateX(-Math.PI / 2), trim);
      rim.position.set(x, layout.surfaceY + 0.009, z);
      rim.receiveShadow = true;
      this.root.add(earth, rim);
    });
  }

  private teakMaterial() {
    const loader = new THREE.TextureLoader();
    const load = (kind: string, color = false) => {
      const texture = loader.load(`/assets/boardwalk-teak-${kind}.jpg`);
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      texture.anisotropy = 8;
      if (color) texture.colorSpace = THREE.SRGBColorSpace;
      return texture;
    };
    const material = new THREE.MeshPhysicalMaterial({
      map: load("color", true), normalMap: load("normal"), roughnessMap: load("roughness"),
      normalScale: new THREE.Vector2(0.2, 0.2), roughness: 0.86, metalness: 0,
      clearcoat: 0.08, clearcoatRoughness: 0.65, envMapIntensity: 0.55,
    });
    material.name = "Warm natural teak boardwalk";
    material.onBeforeCompile = shader => {
      shader.vertexShader = shader.vertexShader.replace("#include <common>",
        "#include <common>\nattribute vec3 boardGrainTransform;")
        .replace("#include <uv_vertex>", `#include <uv_vertex>
          vMapUv = vec2(vMapUv.x, vMapUv.y * boardGrainTransform.z) + boardGrainTransform.xy;
          vNormalMapUv = vec2(vNormalMapUv.x, vNormalMapUv.y * boardGrainTransform.z) + boardGrainTransform.xy;
          vRoughnessMapUv = vec2(vRoughnessMapUv.x, vRoughnessMapUv.y * boardGrainTransform.z) + boardGrainTransform.xy;`);
    };
    material.customProgramCacheKey = () => "resort-teak-grain-v1";
    return material;
  }

  private makeEdging() {
    const layout = BOARDWALK_LAYOUT;
    const trim = new THREE.MeshStandardMaterial({color: "#68482f", roughness: 0.65});
    const add = (width: number, height: number, depth: number, x: number, y: number, z: number) => {
      const edge = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), trim);
      edge.position.set(x, y, z);
      edge.castShadow = edge.receiveShadow = true;
      this.root.add(edge);
    };
    add(layout.rightX - layout.leftX, 0.18, 0.16,
      (layout.leftX + layout.rightX) / 2, layout.surfaceY + 0.09, layout.rearZ + 0.08);
    for (const x of [layout.leftX + 0.08, layout.rightX - 0.08]) {
      let spans: [number, number][] = [[layout.rearZ, layout.frontZ]];
      for (const [bx, bz, width, depth] of LEAF_BEDS) {
        if (Math.abs(x - bx) >= width / 2 + 0.21) continue;
        const rear = bz - depth / 2 - 0.13;
        const front = bz + depth / 2 + 0.13;
        spans = spans.flatMap(([a, b]): [number, number][] => {
          if (front <= a || rear >= b) return [[a, b]];
          const kept: [number, number][] = [];
          if (rear > a) kept.push([a, rear]);
          if (front < b) kept.push([front, b]);
          return kept;
        });
      }
      for (const [rear, front] of spans)
        add(0.16, 0.18, front - rear, x, layout.surfaceY + 0.09, (front + rear) / 2);
    }
    const gapLeft = layout.entranceX - layout.entranceWidth / 2;
    const gapRight = layout.entranceX + layout.entranceWidth / 2;
    // Flush front trim, with a clear entrance matching the existing central avenue.
    for (const [left, right] of [[layout.leftX, gapLeft], [gapRight, layout.rightX]])
      add(right - left, 0.025, 0.14, (left + right) / 2, layout.surfaceY - 0.004, layout.frontZ - 0.07);
  }

  dispose() {
    this.planks.dispose();
    // Geometry, materials and texture maps are owned and disposed by the parent scene.
  }
}
