export const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
export const smootherStep = (value: number) => {
  const t = clamp01(value);
  return t * t * t * (t * (t * 6 - 15) + 10);
};

/** Constant-speed traversal of a stadium loop. Starts at the front left tangent. */
export function beltPose(distance: number, halfStraight = 3, radius = 1.6) {
  const straight = halfStraight * 2;
  const arc = Math.PI * radius;
  const length = 2 * (straight + arc);
  let d = ((distance % length) + length) % length;
  if (d < straight)
    return { x: -halfStraight + d, z: radius, heading: Math.PI / 2 };
  d -= straight;
  if (d < arc) {
    const angle = Math.PI / 2 - d / radius;
    return {
      x: halfStraight + Math.cos(angle) * radius,
      z: Math.sin(angle) * radius,
      heading: Math.PI - angle,
    };
  }
  d -= arc;
  if (d < straight)
    return { x: halfStraight - d, z: -radius, heading: -Math.PI / 2 };
  d -= straight;
  const angle = -Math.PI / 2 - d / radius;
  return {
    x: -halfStraight + Math.cos(angle) * radius,
    z: Math.sin(angle) * radius,
    heading: Math.PI - angle,
  };
}

export function approachProgress(now: number, started: number, index: number) {
  return smootherStep((now - started - index * 0.8) / 4.8);
}
