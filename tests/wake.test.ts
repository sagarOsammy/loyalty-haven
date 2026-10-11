import assert from "node:assert/strict";
import { test } from "node:test";
import * as THREE from "three";
import { CruiseRoute,CRUISE_BOW_TURN,CRUISE_WAKE_LIFETIME } from "../lib/scene/cruise.ts";
import { PropellerWake } from "../lib/scene/wake.ts";

function view() {
  const camera = new THREE.PerspectiveCamera(37,1862/1168,0.5,1300);
  camera.position.set(9.62,29.45,77.55);
  camera.lookAt(0,3,3);
  camera.updateMatrixWorld(true);
  return camera;
}

function parcel(wake: PropellerWake,age: number) {
  wake.mesh.updateMatrixWorld(true);
  return wake.mesh.localToWorld(new THREE.Vector3(0,age,0));
}

test("foam stays in the traversed water as it ages, with its source behind the turned stern", () => {
  const route = new CruiseRoute(view(),0.14);
  const wake = new PropellerWake();
  assert.ok(Math.abs(Math.atan2(route.velocity.x,route.velocity.z)-route.heading-CRUISE_BOW_TURN) < 1e-10);
  assert.equal(THREE.MathUtils.radToDeg(CRUISE_BOW_TURN),10);
  wake.update(route,30);
  const source = parcel(wake,0);
  const bow = new THREE.Vector3(Math.sin(route.heading),0,Math.cos(route.heading));
  const expected = route.pose(30).position.clone().addScaledVector(bow,-32.5).setY(-1.085);
  assert.ok(source.distanceTo(expected) < 1e-8);
  const oldWater = parcel(wake,10/CRUISE_WAKE_LIFETIME);
  wake.update(route,40);
  assert.ok(parcel(wake,20/CRUISE_WAKE_LIFETIME).distanceTo(oldWater) < 1e-8);
  const normal = new THREE.Vector3(0,0,1).applyQuaternion(wake.mesh.quaternion);
  assert.ok(normal.distanceTo(new THREE.Vector3(0,1,0)) < 1e-8);
  assert.ok(wake.mesh.material.uniforms.fogColor && wake.mesh.material.uniforms.fogDensity);
  wake.mesh.geometry.dispose();
  wake.mesh.material.dispose();
  wake.spray.geometry.dispose();
  wake.spray.material.dispose();
});

test("the full wake leaves the viewport before the ship loops, and explicit pause preserves foam state", () => {
  const camera = view();
  const route = new CruiseRoute(camera,0.14);
  const wake = new PropellerWake();
  for (const [elapsed,side] of [[route.exitSeconds,1],[route.exitSeconds+0.001,-1]]) {
    wake.update(route,elapsed);
    wake.mesh.updateMatrixWorld(true);
    for (const x of [-0.5,0.5]) for (const age of [0,1]) {
      const point = wake.mesh.localToWorld(new THREE.Vector3(x,age,0)).project(camera);
      assert.ok(side * point.x >= 1.05-1e-4,"Foam wrap remains outside the camera");
    }
  }
  wake.update(route,30);
  wake.mesh.updateMatrixWorld(true);
  const matrix = wake.mesh.matrixWorld.clone();
  const foamTime = wake.mesh.material.uniforms.time.value;
  const sprayTime = wake.spray.material.uniforms.time.value;
  wake.update(route,30);
  wake.mesh.updateMatrixWorld(true);
  assert.equal(wake.mesh.material.uniforms.time.value,foamTime);
  assert.equal(wake.spray.material.uniforms.time.value,sprayTime);
  assert.ok(wake.mesh.matrixWorld.equals(matrix));
  wake.dispose();
});

test("enlarged wake and spray release their resources when the scene closes", () => {
  const route = new CruiseRoute(view(),0.14);
  const wake = new PropellerWake();
  wake.update(route,100);
  assert.ok(wake.mesh.scale.x >= 22*1.5,"At least 50 percent wider");
  assert.ok(wake.mesh.scale.y >= route.velocity.length()*65*1.5,"At least 50 percent longer");
  assert.equal(wake.spray.visible,true);
  const parent = new THREE.Scene();
  parent.add(wake.root);
  let disposed = 0;
  for (const resource of [wake.mesh.geometry,wake.mesh.material,wake.spray.geometry,wake.spray.material])
    resource.addEventListener("dispose",() => disposed++);
  wake.dispose();
  assert.equal(disposed,4);
  assert.equal(wake.root.parent,null);
});
