import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { BAGGAGE_LAYOUT, baggageFrame, baggageTransform, seatLuggage } from "../lib/scene/baggage.ts";
import { validBaggageAdjustments } from "../lib/baggage-settings.ts";

async function asset(name: string) {
  // Geometry-only inspection, browser validation checks the native textures.
  const loader = new GLTFLoader().register(() => ({
    name:"GeometryOnly",loadTexture:() => Promise.resolve(new THREE.Texture()),
  }));
  const bytes = await readFile(new URL(`../public/assets/${name}.glb`,import.meta.url));
  return (await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),"")).scene;
}

test("conveyor ground axes follow the hangar, retaining approved scale and centers", () => {
  assert.ok(Math.abs(BAGGAGE_LAYOUT.scale/1.15-1.15) < 1e-10);
  assert.equal(BAGGAGE_LAYOUT.forwardShift,4.7*1.15);
  for (let side=0;side<2;side++) {
    const frame = baggageFrame(side,{turn:0,across:0,forward:0});
    const axis = new THREE.Vector3(1,0,0).transformDirection(frame);
    assert.deepEqual(axis.toArray(),[1,0,0],"Same world X direction as the unchanged hangar");
    const position = new THREE.Vector3().setFromMatrixPosition(frame);
    assert.equal(position.x,BAGGAGE_LAYOUT.centers[side].x);
    assert.equal(position.z,BAGGAGE_LAYOUT.centers[side].z);
  }
});

test("all luggage types contact the real rubber deck on straights and curves of both belts", async () => {
  const source = await asset("baggage-belt");
  const luggage = await Promise.all(["hardcase","duffel","vintage"].map(type => asset(`luggage-${type}`)));
  for (const turn of [-30,0,30]) for (let side=0;side<2;side++) {
    const belt = source.clone(true);
    const frame = baggageFrame(side,{turn,across:25,forward:50});
    belt.matrixAutoUpdate = false;
    belt.matrix.copy(frame).scale(new THREE.Vector3().setScalar(BAGGAGE_LAYOUT.scale));
    belt.updateMatrixWorld(true);
    const rubber = belt.getObjectByName("BaggageBelt_Belt_dark_rubber")!;
    for (let i=0;i<24;i++) {
      const matrix = baggageTransform(frame,i*(12+Math.PI*3.2)/24);
      const position = new THREE.Vector3().setFromMatrixPosition(matrix);
      const ray = new THREE.Raycaster(new THREE.Vector3(position.x,5,position.z),new THREE.Vector3(0,-1,0));
      const support = ray.intersectObject(rubber)[0];
      assert.ok(support,"The path remains on the carrying surface");
      for (let type=0;type<luggage.length;type++) {
        const model = luggage[type].clone(true);
        model.scale.setScalar(type===1 ? 1 : 1.08);
        seatLuggage(model);
        const root = new THREE.Group();
        root.add(model);
        root.matrixAutoUpdate = false;
        root.matrix.copy(matrix);
        root.matrixWorldNeedsUpdate = true;
        const bottom = new THREE.Box3().setFromObject(root).min.y;
        assert.ok(Math.abs(bottom-support.point.y) < 1e-6,`Wheels or feet touch the deck without floating, side=${side}, position=${i}, type=${type}, bottom=${bottom}, deck=${support.point.y}`);
      }
    }
  }
});

test("fine controls rotate rigid geometry on the ground and bring the selected end closer", () => {
  for (let side=0;side<2;side++) {
    const frame = baggageFrame(side,{turn:0.1,across:0,forward:0});
    const left = new THREE.Vector3(-5,0,0).applyMatrix4(frame);
    const right = new THREE.Vector3(5,0,0).applyMatrix4(frame);
    assert.ok(right.z>left.z,"Positive turn brings the right end closer to the viewer");
    assert.ok(Math.abs(right.distanceTo(left)-10)<1e-10,"Rotation preserves the rigid source geometry");
    assert.equal(right.y,0,"Deck stays level on the ground");
    assert.ok(Math.abs(Math.atan2(right.z-left.z,right.x-left.x)*180/Math.PI-0.1)<1e-10);
  }
  assert.equal(validBaggageAdjustments([{turn:0.1,across:0,forward:0},{turn:-10,across:25,forward:50}]),true);
  for (const turn of [NaN,Infinity,31,"10"]) {
    assert.equal(validBaggageAdjustments([{turn,across:0,forward:0},{turn:0,across:0,forward:0}]),false);
  }
});
