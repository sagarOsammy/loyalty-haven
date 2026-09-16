import assert from "node:assert/strict";
import { test } from "node:test";
import { publicSnapshot } from "../lib/snapshot.ts";
import {
  visibleAircraft,
  visibleHotels,
  toggleHotel,
  snapshotTotals,
  constructionFixture,
  EMPTY_SELECTION,
} from "../lib/selection.ts";
import { validateConfiguration } from "../lib/webmcp.ts";
import { beltPose, approachProgress } from "../lib/scene/animation.ts";

test("saved ledger reconciles without interpreting blanks as redemptions", () => {
  assert.deepEqual(snapshotTotals(publicSnapshot), publicSnapshot.totals);
  assert.equal(publicSnapshot.airlinePartners[0].redeemed, null);
});
test("aircraft rank by points independent of input order, zero balances excluded", () => {
  const reordered = {
    ...publicSnapshot,
    airlinePartners: [...publicSnapshot.airlinePartners].reverse(),
  };
  assert.deepEqual(
    visibleAircraft(reordered, "star-alliance").map((p) => p.id),
    ["avianca-lifemiles", "united-airlines", "air-canada"],
  );
  assert.deepEqual(
    visibleAircraft(reordered, "skyteam").map((p) => p.id),
    ["virgin-atlantic", "vietnam-airlines"],
  );
  assert.deepEqual(
    visibleAircraft(reordered, "oneworld").map((p) => p.id),
    ["finnair", "qatar-airways", "british-airways"],
  );
  assert.equal(visibleAircraft(reordered, null).length, 0);
});
test("floor labels preserve selected order, deduplicate and cap three floors", () => {
  const fixture = constructionFixture(publicSnapshot);
  assert.deepEqual(
    visibleHotels(fixture, [
      "review-terrace-3",
      "accor",
      "review-terrace-3",
      "review-terrace-2",
    ]).map((h) => h.id),
    ["review-terrace-3", "accor", "review-terrace-2"],
  );
  assert.equal(publicSnapshot.hotelBrands.length, 1);
  assert.equal(
    toggleHotel(EMPTY_SELECTION, "missing", publicSnapshot),
    EMPTY_SELECTION,
  );
});
test("belt has continuous positions and correct direction around both corners", () => {
  const circumference = 12 + 2 * Math.PI * 1.6;
  assert.deepEqual(beltPose(0), beltPose(circumference));
  for (const join of [6, 6 + Math.PI * 1.6, 12 + Math.PI * 1.6]) {
    const a = beltPose(join - 0.00001),
      b = beltPose(join + 0.00001);
    assert.ok(Math.hypot(a.x - b.x, a.z - b.z) < 0.00003);
  }
  assert.equal(approachProgress(0, -20, 2), 1);
  assert.equal(approachProgress(9, 0, 2), 1);
  const halfway = approachProgress(2.4, 0, 0);
  assert.equal(halfway, 0.5);
  assert.equal(
    approachProgress(2.4, 0, 0),
    halfway,
    "A frozen scene clock preserves arrival progress",
  );
});

test("browser tools reject unsupported settings before changing visible state", () => {
  for (const alliance of ["star-alliance", "skyteam", "oneworld"]) {
    assert.deepEqual(validateConfiguration({ alliance }), { alliance });
  }
  assert.deepEqual(
    validateConfiguration({
      alliance: null,
      accor: true,
      motion: false,
      quality: "balanced",
    }),
    { alliance: null, accor: true, motion: false, quality: "balanced" },
  );
  for (const input of [
    null,
    [],
    { points: 1 },
    { alliance: "unknown" },
    { motion: "false" },
  ]) {
    assert.throws(() => validateConfiguration(input));
  }
});
