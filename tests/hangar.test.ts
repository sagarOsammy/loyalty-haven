import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import * as THREE from "three";
import { HangarDoors, HANGAR_BAY_CENTERS } from "../lib/scene/hangar.ts";
import { arrivalPose, approachProgress } from "../lib/scene/animation.ts";
import { PALM_PLACEMENTS } from "../lib/scene/landscape.ts";

/** Read serialized glTF geometry without a browser or loading image textures. */
function geometryScene(filename: string) {
  const bytes = readFileSync(new URL(`../public/assets/${filename}`, import.meta.url));
  const data = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const jsonLength = data.getUint32(12, true);
  const gltf = JSON.parse(new TextDecoder().decode(bytes.subarray(20, 20 + jsonLength)));
  const binStart = 28 + jsonLength;
  const nodes: THREE.Object3D[] = gltf.nodes.map((node: { name?: string; mesh?: number; translation?: number[]; rotation?: number[]; scale?: number[]; matrix?: number[] }) => {
    const object = new THREE.Group();
    object.name = node.name ?? "";
    if (node.matrix) object.matrix.fromArray(node.matrix).decompose(object.position, object.quaternion, object.scale);
    else {
      if (node.translation) object.position.fromArray(node.translation);
      if (node.rotation) object.quaternion.fromArray(node.rotation);
      if (node.scale) object.scale.fromArray(node.scale);
    }
    if (node.mesh !== undefined) {
      for (const primitive of gltf.meshes[node.mesh].primitives) {
        const accessor = gltf.accessors[primitive.attributes.POSITION];
        assert.equal(accessor.componentType, 5126);
        const view = gltf.bufferViews[accessor.bufferView];
        const offset = binStart + (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
        const positions = new Float32Array(accessor.count * 3);
        for (let i = 0; i < accessor.count; i++) {
          for (let axis = 0; axis < 3; axis++) positions[i * 3 + axis] = data.getFloat32(offset + i * (view.byteStride ?? 12) + axis * 4, true);
        }
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        const material = new THREE.MeshBasicMaterial();
        material.name = gltf.materials[primitive.material]?.name ?? "";
        object.add(new THREE.Mesh(geometry, material));
      }
    }
    return object;
  });
  gltf.nodes.forEach((node: { children?: number[] }, i: number) => node.children?.forEach((child) => nodes[i].add(nodes[child])));
  const scene = new THREE.Group();
  for (const node of gltf.scenes[gltf.scene ?? 0].nodes) scene.add(nodes[node]);
  scene.updateMatrixWorld(true);
  return scene;
}

function movingPart(object: THREE.Object3D): boolean {
  return /^RearGate[123]$/.test(object.name) || (!!object.parent && movingPart(object.parent));
}

test("serialized shutters contain no pillars or masonry, fixed frame stays unchanged", () => {
  const hangar = geometryScene("hangar-structure.glb");
  const doors = new HangarDoors();
  doors.bind(hangar);
  for (let index = 0; index < 3; index++) {
    const gate = hangar.getObjectByName(`RearGate${index + 1}`)!;
    const bounds = new THREE.Box3().setFromObject(gate);
    const center = bounds.getCenter(new THREE.Vector3());
    assert.ok(Math.abs(center.x - (-7.85 + index * 7.85)) < 0.01, "Shutter is centered in its bay");
    assert.ok(Math.abs(center.z + 7.11) < 0.01, "Shutter is inside the rear housing");
    assert.ok(Math.abs(bounds.min.y - 0.325) < 0.01 && Math.abs(bounds.max.y - 5.075) < 0.01, "Closed shutter covers the doorway");
  }
  let shutters = 0;
  const fixed: { object: THREE.Object3D; transform: number[] }[] = [];
  hangar.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    if (movingPart(object)) {
      assert.equal((object.material as THREE.Material).name, "DeepInterior");
      shutters++;
    } else fixed.push({ object, transform: object.matrixWorld.toArray() });
  });
  assert.equal(shutters, 3, "Exactly three dark panels move");
  for (const opening of [0.25, 0.7, 1, 0]) {
    doors.setOpening(opening);
    hangar.updateMatrixWorld(true);
    for (const part of fixed) assert.deepEqual(part.object.matrixWorld.toArray(), part.transform);
  }
  // Serialized limestone vertices prove the inner front pillars reach the roof.
  for (const x of [-4.1, 4.1]) {
    let top = 0;
    hangar.traverse((object) => {
      if (!(object instanceof THREE.Mesh) || (object.material as THREE.Material).name !== "PaleTravertine" || movingPart(object)) return;
      const positions = object.geometry.getAttribute("position");
      const point = new THREE.Vector3();
      for (let i = 0; i < positions.count; i++) {
        point.fromBufferAttribute(positions, i).applyMatrix4(object.matrixWorld);
        if (Math.abs(point.x - x) < 0.24 && point.z > 7 && point.z < 7.6) top = Math.max(top, point.y);
      }
    });
    assert.ok(top > 8.85, "Front pillar connects to the barrel vault");
  }
});

test("all eight serialized fleet models fit the fixed rear openings during entry", () => {
  const fleet = ["united", "avianca", "air-canada", "virgin-atlantic", "vietnam-airlines", "finnair", "qatar-airways", "british-airways"];
  for (const airline of fleet) {
    const model = geometryScene(`airline-${airline}-fleet.glb`);
    const size = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3());
    model.scale.setScalar(Math.min(0.6, 6.95 / size.x, 7.3 / size.z));
    model.position.y += 0.35 - new THREE.Box3().setFromObject(model).min.y;
    const plane = new THREE.Group();
    plane.add(model);
    let crossings = 0;
    for (let index = 0; index < 3; index++) {
      for (let now = 0; now <= 8; now += 0.01) {
        const pose = arrivalPose(approachProgress(now, 0, index));
        plane.position.set(HANGAR_BAY_CENTERS[index] + pose.xOffset, 0.08 + pose.height, -3.1 + index * 0.35 + pose.zOffset);
        plane.rotation.set(pose.pitch, pose.heading, pose.roll);
        const bounds = new THREE.Box3().setFromObject(plane);
        if (bounds.max.z >= -11.35 && bounds.min.z <= -10.72) {
          crossings++;
          assert.ok(bounds.min.x > HANGAR_BAY_CENTERS[index] - 3.615, `${airline} left wing clears fixed jamb`);
          assert.ok(bounds.max.x < HANGAR_BAY_CENTERS[index] + 3.615, `${airline} right wing clears fixed jamb`);
          assert.ok(bounds.max.y < 5.05, `${airline} clears fixed rear header`);
        }
      }
    }
    assert.ok(crossings > 0);
  }
});

test("western tree crowns clear the hangar and its roof while swaying", () => {
  for (const [x, z, scale, heading] of PALM_PLACEMENTS.filter(([x]) => x < -30)) {
    const palm = geometryScene("palm-tripo.glb");
    palm.position.set(x, 0, z);
    palm.scale.setScalar(scale);
    for (const sway of [-0.009, 0, 0.009]) {
      palm.rotation.set(0, heading, sway);
      const bounds = new THREE.Box3().setFromObject(palm);
      assert.ok(bounds.max.x < -30.5, `Tree at ${x}, ${z} clears the western hangar edge`);
    }
  }
});
