export type BeltAdjustment = { turn: number; across: number; forward: number };
export type BaggageAdjustments = [BeltAdjustment, BeltAdjustment];
export const DEFAULT_BAGGAGE_ADJUSTMENTS: BaggageAdjustments = [
  { turn: 0, across: 0, forward: 0 },
  { turn: 0, across: 0, forward: 75 },
];
export const BAGGAGE_STORAGE_KEY = "haven-baggage-alignment-v1";
export const BAGGAGE_LIMITS = {
  turn: { min: -30, max: 30, step: 0.1 },
  across: { min: -50, max: 50, step: 0.5 },
  forward: { min: -75, max: 75, step: 0.5 },
};

export function validBaggageAdjustments(value: unknown): value is BaggageAdjustments {
  return Array.isArray(value) && value.length === 2 && value.every(belt =>
    belt && typeof belt === "object" && Object.keys(belt).length === 3 &&
    Object.entries(BAGGAGE_LIMITS).every(([key, { min, max }]) =>
      typeof belt[key] === "number" && Number.isFinite(belt[key]) && belt[key] >= min && belt[key] <= max,
    ),
  );
}
