import * as THREE from "three";

export const CRUISE_ARRIVAL_SECONDS = 150;
export const CRUISE_BOW_TURN = THREE.MathUtils.degToRad(10);
export const CRUISE_WAKE_SCALE = 1.5;
export const CRUISE_WAKE_WIDTH = 22 * CRUISE_WAKE_SCALE;
export const CRUISE_WAKE_LIFETIME = 65 * CRUISE_WAKE_SCALE;
export const CRUISE_START = new THREE.Vector3(-104.737843,-1.12,-141.852496);
export const CRUISE_MARKER = { x: 1143 / 1862, y: 258 / 1168 };

/** Constant-speed offshore route, calibrated to the annotated desktop view. */
export class CruiseRoute {
  readonly target = new THREE.Vector3();
  readonly velocity = new THREE.Vector3();
  readonly heading: number;
  readonly exitSeconds: number;
  readonly reentrySeconds: number;

  constructor(camera: THREE.PerspectiveCamera, horizonFraction: number) {
    const ray = new THREE.Raycaster();
    // Leave a little open water below the horizon in compact and portrait views.
    const markerY = Math.max(CRUISE_MARKER.y,horizonFraction + 0.03);
    ray.setFromCamera(new THREE.Vector2(CRUISE_MARKER.x * 2 - 1,1 - markerY * 2),camera);
    ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,1,0),1.12),this.target);
    this.target.y = CRUISE_START.y;
    this.velocity.copy(this.target).sub(CRUISE_START).divideScalar(CRUISE_ARRIVAL_SECONDS);
    this.heading = Math.atan2(this.velocity.x,this.velocity.z) - CRUISE_BOW_TURN;
    const projection = new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);
    const speed = new THREE.Vector4(this.velocity.x,0,this.velocity.z,0).applyMatrix4(projection);
    let exit = -Infinity;
    let entry = Infinity;
    // Include the vessel, sunset shadow and full fading wake before wrapping.
    const envelope = Math.max(75,36 + this.velocity.length() * CRUISE_WAKE_LIFETIME + CRUISE_WAKE_WIDTH / 2 + 1);
    for (const x of [-envelope,envelope]) for (const y of [-4,15]) for (const z of [-envelope,envelope]) {
      const corner = CRUISE_START.clone().add(new THREE.Vector3(x,y,z));
      const clip = new THREE.Vector4(corner.x,corner.y,corner.z,1).applyMatrix4(projection);
      const crossing = (edge: number) => (edge * clip.w - clip.x) / (speed.x - edge * speed.w);
      exit = Math.max(exit,crossing(1.05));
      entry = Math.min(entry,crossing(-1.05));
    }
    this.exitSeconds = exit;
    this.reentrySeconds = entry;
  }

  pose(elapsed: number) {
    let routeTime = Math.max(0,elapsed);
    const cycle = this.exitSeconds - this.reentrySeconds;
    if (routeTime > this.exitSeconds)
      routeTime = this.reentrySeconds + (routeTime - this.exitSeconds) % cycle;
    const position = CRUISE_START.clone().addScaledVector(this.velocity,routeTime);
    return { position, heading: this.heading, roll: Math.sin(elapsed * 0.42) * 0.006, routeTime };
  }
}

/** Wall-clock travel survives background tabs and low frame rates, explicit pause freezes it. */
export class CruiseClock {
  private elapsed = 0;
  private last = 0;
  private running: boolean;
  constructor(running: boolean) { this.running = running; }
  read(nowMs: number) {
    if (this.running) this.elapsed += Math.max(0,nowMs - this.last) / 1000;
    this.last = nowMs;
    return this.elapsed;
  }
  setRunning(running: boolean,nowMs: number) {
    this.read(nowMs);
    this.running = running;
  }
}
