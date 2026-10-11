import assert from "node:assert/strict";
import { test } from "node:test";
import * as THREE from "three";
import { CruiseClock,CruiseRoute,CRUISE_START,CRUISE_MARKER } from "../lib/scene/cruise.ts";

function camera(width: number,height: number) {
  const value = new THREE.PerspectiveCamera(width < 800 ? 48 : 37,width/height,0.5,1300);
  value.position.set(9.62,29.45,77.55);
  value.lookAt(0,3,3);
  value.updateMatrixWorld(true);
  return value;
}

test("cruise reaches the marker at exactly 150 seconds, then loops outside the view", () => {
  for (const [width,height] of [[1862,1168],[995,707],[420,500]]) {
    const view = camera(width,height);
    const horizon = Math.max(0.14,Math.min(0.22,140/height));
    const route = new CruiseRoute(view,horizon);
    assert.ok(route.pose(0).position.distanceTo(CRUISE_START) < 1e-8);
    const at150 = route.pose(150).position.clone().project(view);
    assert.ok(Math.abs((at150.x+1)/2 - CRUISE_MARKER.x) < 1e-8);
    assert.ok(Math.abs((1-at150.y)/2 - Math.max(CRUISE_MARKER.y,horizon+0.03)) < 1e-8);
    assert.ok(route.pose(75).position.distanceTo(CRUISE_START.clone().lerp(route.target,0.5)) < 1e-8);
    assert.ok(route.exitSeconds > 150 && route.reentrySeconds < 0);
    const exit = route.pose(route.exitSeconds).position;
    const entry = route.pose(route.exitSeconds+0.001).position;
    for (const x of [-75,75]) for (const y of [-4,15]) for (const z of [-75,75]) {
      const offset = new THREE.Vector3(x,y,z);
      assert.ok(exit.clone().add(offset).project(view).x >= 1.05-1e-8,"Vessel and sunset shadow exit before wrapping");
      assert.ok(entry.clone().add(offset).project(view).x <= -1.05+1e-4,"Vessel and sunset shadow re-enter from outside the left edge");
    }
    assert.equal(exit.y,-1.12);
    assert.ok(exit.z < -30,"Cruise stays offshore");
    const cycle = route.exitSeconds-route.reentrySeconds;
    assert.ok(route.pose(route.exitSeconds+cycle+0.1).position.distanceTo(route.pose(route.exitSeconds+0.1).position) < 1e-8);
  }
});

test("travel follows real elapsed time through frame gaps and freezes only for explicit pause", () => {
  const clock = new CruiseClock(true);
  assert.equal(clock.read(2000),2);
  assert.equal(clock.read(150000),150);
  clock.setRunning(false,151000);
  assert.equal(clock.read(180000),151);
  clock.setRunning(true,190000);
  assert.equal(clock.read(191000),152);
});
