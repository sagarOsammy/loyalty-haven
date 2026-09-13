import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

export const palette = {
  stone: "#d6c6ae",
  brass: "#b79658",
  bronze: "#483e2c",
  ink: "#23312f",
  teak: "#78513a",
  cream: "#eee5d4",
};

export function material(color: string, roughness = 0.65, metalness = 0) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

export function box(
  width: number,
  height: number,
  depth: number,
  mat: THREE.Material,
  radius = 0.04,
) {
  const mesh = new THREE.Mesh(
    new RoundedBoxGeometry(
      width,
      height,
      depth,
      2,
      Math.min(radius, width / 4, height / 4, depth / 4),
    ),
    mat,
  );
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export function place<T extends THREE.Object3D>(
  object: T,
  parent: THREE.Object3D,
  x: number,
  y: number,
  z: number,
) {
  object.position.set(x, y, z);
  parent.add(object);
  return object;
}

export function plaque(
  title: string,
  subtitle: string,
  width = 7.6,
  height = 1.3,
) {
  const group = new THREE.Group();
  const rim = box(
    width,
    height,
    0.15,
    material(palette.brass, 0.27, 0.78),
    0.07,
  );
  const face = box(
    width - 0.08,
    height - 0.08,
    0.17,
    material(palette.ink, 0.6),
    0.07,
  );
  group.add(rim, face);
  const canvas = document.createElement("canvas");
  canvas.width = 1536;
  canvas.height = Math.round((1536 * height) / width);
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = palette.cream;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `500 ${Math.round(canvas.height * (subtitle ? 0.34 : 0.4))}px Cormorant Garamond, Georgia`;
  ctx.fillText(title, canvas.width / 2, canvas.height * (subtitle ? 0.4 : 0.5));
  if (subtitle) {
    ctx.font = `500 ${Math.round(canvas.height * 0.13)}px Manrope, sans-serif`;
    ctx.fillStyle = "#cabb9c";
    ctx.fillText(subtitle, canvas.width / 2, canvas.height * 0.75);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  const text = new THREE.Mesh(
    new THREE.PlaneGeometry(width - 0.1, height - 0.1),
    new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
    }),
  );
  text.position.z = 0.09;
  group.add(text);
  return group;
}

export function createSiteGround() {
  const group = new THREE.Group();
  const textures = new THREE.TextureLoader();
  const paving = textures.load("/assets/concrete_pavement_02_diff.jpg");
  paving.colorSpace = THREE.SRGBColorSpace;
  paving.wrapS = paving.wrapT = THREE.RepeatWrapping;
  paving.repeat.set(32, 18);
  paving.anisotropy = 8;
  const normal = textures.load("/assets/concrete_pavement_02_nor_gl.jpg");
  normal.wrapS = normal.wrapT = THREE.RepeatWrapping;
  normal.repeat.copy(paving.repeat);
  const rough = textures.load("/assets/concrete_pavement_02_rough.jpg");
  rough.wrapS = rough.wrapT = THREE.RepeatWrapping;
  rough.repeat.copy(paving.repeat);
  const stone = new THREE.MeshStandardMaterial({
    color: "#d9c6a8",
    map: paving,
    normalMap: normal,
    roughnessMap: rough,
    roughness: 0.72,
    normalScale: new THREE.Vector2(0.3, 0.3),
  });
  place(box(160, 1.5, 86, material("#c3aa89"), 0.5), group, 0, -0.85, 22.5);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(159.4, 85.4), stone);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  place(ground, group, 0, -0.07, 22.5);
  // The central arrival avenue uses warm, inset limestone and brass edging.
  place(box(10, 0.06, 39, material("#cdbb9d", 0.5)), group, -1, -0.025, 3);
  const brass = material(palette.brass, 0.4, 0.65);
  [-6.1, 4.1].forEach((x) =>
    place(box(0.04, 0.03, 39, brass), group, x, 0.025, 3),
  );
  // Seawall, cap stones and the curved forum approach.
  place(box(160, 0.8, 0.45, material("#bfa887"), 0.12), group, 0, 0.3, -20.1);
  place(box(160, 0.1, 0.65, material("#ece0ca")), group, 0, 0.75, -20.1);
  const court = new THREE.Mesh(
    new THREE.CylinderGeometry(8.1, 8.2, 0.13, 96),
    material("#e2d3ba", 0.65),
  );
  place(court, group, 0, 0.03, 13);
  court.receiveShadow = true;
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(7.5, 0.035, 5, 128),
    brass,
  );
  ring.rotation.x = Math.PI / 2;
  place(ring, group, 0, 0.12, 13);
  const garden = material("#35402a", 0.92);
  for (const x of [-32, 31]) {
    place(box(2.8, 0.35, 32, material("#c7b395"), 0.16), group, x, 0.07, 0);
    place(box(2.45, 0.05, 31.6, garden), group, x, 0.26, 0);
  }
  // Repeated small leaf clusters give the planting beds depth at a single draw call.
  const beds = [
    [-34, 0, 3.5, 38],
    [33, 0, 3.5, 38],
    [-12, 7.4, 8, 2.3],
    [20, 6.5, 16, 2.2],
    [0, -17.8, 58, 2.1],
  ];
  const leaves = new THREE.InstancedMesh(
    new THREE.IcosahedronGeometry(0.22, 1),
    material("#526638", 0.92),
    1450,
  );
  const transform = new THREE.Object3D();
  const tint = new THREE.Color();
  let instance = 0;
  const random = (seed: number) => {
    const value = Math.sin(seed * 91.71 + 31.9) * 43758.54;
    return value - Math.floor(value);
  };
  beds.forEach(([x, z, width, depth], bedIndex) => {
    place(
      box(width + 0.22, 0.24, depth + 0.22, material("#c7b395"), 0.1),
      group,
      x,
      0.1,
      z,
    );
    place(box(width, 0.05, depth, garden), group, x, 0.23, z);
    const count = 290;
    for (let i = 0; i < count; i++) {
      const seed = i + bedIndex * count;
      transform.position.set(
        x + (random(seed) - 0.5) * width,
        0.35 + random(seed + 1900) * 0.65,
        z + (random(seed + 800) - 0.5) * depth,
      );
      transform.rotation.set(
        random(seed + 120) * 3,
        random(seed + 30) * 6,
        random(seed + 64) * 3,
      );
      transform.scale.set(1.8, 0.65, 1.2);
      transform.updateMatrix();
      leaves.setMatrixAt(instance, transform.matrix);
      tint.setHSL(
        0.2 + random(seed + 23) * 0.035,
        0.25,
        0.6 + random(seed + 70) * 0.3,
      );
      leaves.setColorAt(instance++, tint);
    }
  });
  leaves.castShadow = true;
  leaves.receiveShadow = true;
  group.add(leaves);
  return group;
}

export function constructionFrame() {
  const group = new THREE.Group();
  const steel = material("#a5a695", 0.43, 0.7);
  const warm = material("#d5c3a6", 0.84);
  for (const y of [0.18, 3, 6.5]) {
    place(box(17.2, 0.22, 11.2, warm), group, 0, y, 0);
  }
  for (const x of [-8, -4, 0, 4, 8])
    place(box(0.14, 6.7, 0.14, steel), group, x, 3.4, 5.6);
  for (const y of [1.4, 4.8])
    for (const x of [-6, -2, 2, 6]) {
      const brace = box(4.4, 0.09, 0.09, steel, 0.02);
      brace.rotation.z = Math.PI / 5;
      place(brace, group, x, y, 5.62);
    }
  for (const x of [-8, 8])
    for (const z of [-5, 0, 5])
      place(box(0.3, 6.8, 0.3, warm), group, x, 3.4, z);
  const sign = plaque(
    "HOTEL HIDEAWAY",
    "SELECT A HOTEL TO BUILD YOUR STAY",
    9.2,
    1.5,
  );
  place(sign, group, 0, 3.1, 5.8);
  return group;
}
