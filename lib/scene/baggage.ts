import * as THREE from "three";
import { beltPose } from "./animation.ts";
import { DEFAULT_BAGGAGE_ADJUSTMENTS, type BeltAdjustment } from "../baggage-settings.ts";

// Keep the approved centers, while the belt axes follow the hangar world X axis.
const previousHeading = Math.atan2(8,62);
const heading = 0;
const oldScale = 1.15;
const scale = oldScale * 1.15;
// The inspected belt asset is 4.7 units wide, including its ground plinth.
const forwardShift = 4.7 * oldScale;
const centerX = 0.5 + Math.sin(previousHeading) * forwardShift;
const centerZ = 16.5 + Math.cos(previousHeading) * forwardShift;

export const BAGGAGE_LAYOUT = {
  scale,
  heading,
  forwardShift,
  // The dark rubber carrying surface reaches y=1.1 in the source GLB.
  surfaceY: 1.1 * scale,
  centers: [-19.5,19.5].map(offset => ({
    x: centerX + Math.cos(previousHeading)*offset,
    z: centerZ - Math.sin(previousHeading)*offset,
  })),
};

/** Align each model's actual wheels or feet with the local support plane. */
export function seatLuggage(model: THREE.Object3D) {
  const bounds = new THREE.Box3().setFromObject(model);
  model.position.y -= bounds.min.y;
}

/** Rotate on the ground, positive turn brings the right end toward the viewer. */
export function baggageFrame(side: number,adjustment: BeltAdjustment = DEFAULT_BAGGAGE_ADJUSTMENTS[side]) {
  const center = BAGGAGE_LAYOUT.centers[side];
  const width = 10.995267868 * scale;
  const depth = 4.7 * scale;
  return new THREE.Matrix4()
    .makeTranslation(center.x + adjustment.across * width / 100,0,center.z + adjustment.forward * depth / 100)
    .multiply(new THREE.Matrix4().makeRotationY(-THREE.MathUtils.degToRad(adjustment.turn)));
}

/** Apply the identical position and rotation to luggage and its supporting belt. */
export function baggageTransform(frame: THREE.Matrix4,distance: number) {
  const pose = beltPose(distance);
  return frame.clone()
    .multiply(new THREE.Matrix4().makeTranslation(pose.x*scale,BAGGAGE_LAYOUT.surfaceY,pose.z*scale))
    .multiply(new THREE.Matrix4().makeRotationY(pose.heading));
}
