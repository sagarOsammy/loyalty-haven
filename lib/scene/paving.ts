import * as THREE from "three";
import { FORUM_LAYOUT, AVENUE_LAYOUT } from "./forum";

const WIDTH = 159.4;
const DEPTH = 85.4;
const CENTER_Z = 22.5;
const ATLAS_METRES = 12;

export function marbleMaterials() {
  const loader = new THREE.TextureLoader();
  const load = (path: string, color = false) => {
    const texture = loader.load(path);
    if (color) texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(WIDTH / ATLAS_METRES, DEPTH / ATLAS_METRES);
    texture.anisotropy = 8;
    return texture;
  };
  const maps = {
    map: load("/assets/marble-resort-warm-color.jpg", true),
    normalMap: load("/assets/marble-resort-warm-normal.jpg"),
    roughnessMap: load("/assets/marble-resort-warm-roughness.jpg"),
  };
  const marble = new THREE.MeshPhysicalMaterial({
    ...maps,
    color: "#f5e2ca",
    roughness: 0.78,
    metalness: 0,
    normalScale: new THREE.Vector2(0.35, 0.35),
    clearcoat: 0.06,
    clearcoatRoughness: 0.6,
    envMapIntensity: 0.45,
  });
  const inlay = marble.clone();
  inlay.name = "Resort dark taupe marble inlay";
  inlay.color.set("#7c7063");
  inlay.roughness = 0.76;
  marble.name = "Resort warm beige marble paving";
  return { marble, inlay };
}

/** Use ground coordinates on every surface so slab joints line up across meshes. */
export function alignPavingUV(geometry: THREE.BufferGeometry, x = 0, z = CENTER_Z) {
  const positions = geometry.getAttribute("position");
  const uv = new THREE.Float32BufferAttribute(new Float32Array(positions.count * 2), 2);
  for (let i = 0; i < positions.count; i++) {
    uv.setXY(i, (positions.getX(i) + x + WIDTH / 2) / WIDTH,
      (CENTER_Z + DEPTH / 2 - positions.getZ(i) - z) / DEPTH);
  }
  geometry.setAttribute("uv", uv);
  return geometry;
}

export function marblePlane(width: number, depth: number, x: number, z: number, mat: THREE.Material) {
  const geometry = new THREE.PlaneGeometry(width, depth).rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(alignPavingUV(geometry, x, z), mat);
  mesh.receiveShadow = true;
  return mesh;
}

export function marbleInlays(mat: THREE.Material) {
  const group = new THREE.Group();
  group.name = "Marble plaza circular and diagonal inlays";
  const { x, z } = FORUM_LAYOUT;
  for (const [inner, outer] of [[7.4, 7.7], [9.95, 10.55]]) {
    const geometry = new THREE.RingGeometry(inner, outer, 192).rotateX(-Math.PI / 2);
    const ring = new THREE.Mesh(alignPavingUV(geometry, x, z), mat);
    ring.position.set(x, -0.064, z);
    ring.receiveShadow = true;
    group.add(ring);
  }
  // End the western rear diagonal beneath the hangar edge, before the marked garden tail.
  const westEndX = -30.5;
  const westEndZ = z + (westEndX - x) * (-13 - z) / (-48 - x);
  for (const [endX, endZ] of [[westEndX, westEndZ], [48, -13], [-42, 60], [42, 60]]) {
    const direction = new THREE.Vector2(endX - x, endZ - z).normalize();
    const startX = x + direction.x * 10.55;
    const startZ = z + direction.y * 10.55;
    const length = Math.hypot(endX - startX, endZ - startZ);
    const centerX = (startX + endX) / 2;
    const centerZ = (startZ + endZ) / 2;
    const geometry = new THREE.PlaneGeometry(0.55, length).rotateX(-Math.PI / 2);
    geometry.rotateY(Math.atan2(direction.x, direction.y));
    const band = new THREE.Mesh(alignPavingUV(geometry, centerX, centerZ), mat);
    band.position.set(centerX, -0.064, centerZ);
    band.receiveShadow = true;
    group.add(band);
  }
  const avenueFront = z - Math.sqrt(10.55 ** 2 - (AVENUE_LAYOUT.width / 2) ** 2);
  const avenueLength = avenueFront - AVENUE_LAYOUT.rearZ;
  const avenueZ = (avenueFront + AVENUE_LAYOUT.rearZ) / 2;
  for (const side of [-1, 1]) {
    const avenueX = AVENUE_LAYOUT.x + side * (AVENUE_LAYOUT.width / 2 - 0.14);
    const band = marblePlane(0.28, avenueLength, avenueX, avenueZ, mat);
    band.name = "Central avenue brown marble border";
    band.position.set(avenueX, 0.012, avenueZ);
    group.add(band);
  }
  return group;
}
