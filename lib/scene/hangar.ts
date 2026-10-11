import * as THREE from "three";

export const HANGAR_BAY_CENTERS = [-25.85, -18, -10.15] as const;

/** Animate only the brown shutters, the columns and jambs remain fixed. */
export class HangarDoors {
  private gates: THREE.Object3D[] = [];

  bind(hangar: THREE.Object3D) {
    this.gates = [1, 2, 3].map((index) => {
      const gate = hangar.getObjectByName(`RearGate${index}`);
      if (!gate) throw new Error(`Missing rear hangar gate ${index}`);
      return gate;
    });
  }

  setOpening(opening: number) {
    const amount = Math.max(0, Math.min(1, opening));
    for (const gate of this.gates) {
      // Compress the rolling gate above the opening, retaining the upper wall.
      gate.scale.y = 1 - amount;
      gate.position.y = 5.3 * amount;
      gate.visible = amount < 1;
    }
  }
}
