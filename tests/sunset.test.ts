import assert from "node:assert/strict";
import { test } from "node:test";
import * as THREE from "three";
import { SunsetAtmosphere } from "../lib/scene/sunset.ts";

test("sunset horizon stays level, water faces upward and camera framing is retained", () => {
  for (const [width, height] of [[1887,1168], [995,707], [420,500]]) {
    const camera = new THREE.PerspectiveCamera(width < 800 ? 48 : 37, width / height, 0.5, 1300);
    camera.position.set(9.62,29.45,77.55);
    camera.lookAt(0,3,3);
    camera.updateMatrixWorld(true);
    const before = camera.matrixWorld.toArray();
    const atmosphere = new SunsetAtmosphere();
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(1,1));
    atmosphere.fit(camera, sea, height);
    sea.updateMatrixWorld(true);
    assert.deepEqual(camera.matrixWorld.toArray(), before);
    const normal = new THREE.Vector3(0,0,1).applyQuaternion(sea.quaternion);
    assert.ok(normal.distanceTo(new THREE.Vector3(0,1,0)) < 1e-6);
    const targetY = 1 - atmosphere.horizonFraction * 2;
    for (const x of [-0.1,0,0.1]) {
      const edge = new THREE.Vector3(x,0.5,0).applyMatrix4(sea.matrixWorld);
      assert.ok(Math.abs(edge.y + 1.12) < 1e-6);
      assert.ok(Math.abs(edge.project(camera).y - targetY) < 1e-6);
    }
    const sun = atmosphere.sunPosition.clone().project(camera);
    assert.ok(sun.x > 0 && sun.x < 1, "Sun is on the visible right side");
    assert.ok(sun.y > targetY && sun.y < 1, "Sun is above the horizon");
    const cameraRight = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,0).setY(0).normalize();
    assert.ok(atmosphere.lightDirection.dot(cameraRight) > 0 && atmosphere.lightDirection.z < 0);
    assert.ok(Math.abs(atmosphere.lightDirection.length() - 1) < 1e-6);
    atmosphere.dispose();
    atmosphere.sky.geometry.dispose();
    atmosphere.sky.material.dispose();
    atmosphere.seabed.geometry.dispose();
    atmosphere.seabed.material.dispose();
    sea.geometry.dispose();
    (sea.material as THREE.Material).dispose();
  }
});

test("larger mountain model remains anchored to the right horizon across aspect ratios", () => {
  const atmosphere = new SunsetAtmosphere();
  const mountain = new THREE.Group();
  mountain.add(new THREE.Mesh(new THREE.BoxGeometry(0.573,0.126,1)));
  atmosphere.useMountain(mountain);
  assert.equal(atmosphere.mountains.children.length,1);
  assert.equal(atmosphere.root.getObjectByName("TripoSunsetClouds"),undefined);
  for (const [width,height] of [[1887,1168],[995,707],[420,500]]) {
    const camera = new THREE.PerspectiveCamera(width < 800 ? 48 : 37,width/height,0.5,1300);
    camera.position.set(9.62,29.45,77.55);
    camera.lookAt(0,3,3);
    camera.updateMatrixWorld(true);
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(1,1));
    atmosphere.fit(camera,sea,height);
    atmosphere.root.updateMatrixWorld(true);
    let rightmost = -Infinity;
    mountain.traverse(object => {
      if (!(object instanceof THREE.Mesh)) return;
      const vertices = object.geometry.getAttribute("position");
      for (let i = 0; i < vertices.count; i++) {
        const vertex = new THREE.Vector3().fromBufferAttribute(vertices,i).applyMatrix4(object.matrixWorld).project(camera);
        rightmost = Math.max(rightmost,vertex.x);
      }
      assert.equal(object.castShadow,false);
    });
    assert.ok(Math.abs(rightmost - 1.03) < 1e-6,"Terrain stays flush with the right edge");
    assert.ok(Math.abs(atmosphere.mountains.scale.x / atmosphere.mountains.scale.y - 0.40 / 0.15) < 1e-6);
    sea.geometry.dispose();
    (sea.material as THREE.Material).dispose();
  }
});
