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
import { beltPose, approachProgress, arrivalPose, hangarDoorProgress } from "../lib/scene/animation.ts";

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

test("arrivals start aligned over the sea and clear the rear shutters", () => {
  assert.deepEqual(arrivalPose(0), {
    xOffset: 0, zOffset: -83, height: 22, pitch: -0, heading: 0, roll: 0,
  });
  const halfway = arrivalPose(0.5);
  assert.equal(halfway.xOffset, 0);
  assert.equal(halfway.zOffset, -41.5);
  assert.equal(halfway.height, 5.5);
  assert.equal(halfway.pitch, -0.07);
  assert.equal(halfway.roll, 0);
  for (let now = 0; now <= 8; now += 0.01) {
    const opening = Math.max(...[0, 1, 2].map((i) => hangarDoorProgress(now, 0, i)));
    for (let index = 0; index < 3; index++) {
      const pose = arrivalPose(approachProgress(now, 0, index));
      const centerZ = -3.1 + index * 0.35 + pose.zOffset;
      // Conservative length includes the detailed fleet, yaw and banking.
      const nose = centerZ + 4;
      const tail = centerZ - 4;
      if (nose >= -11.35 && tail <= -10.7) {
        assert.equal(opening, 1, "All rear shutters clear the full arrival");
        assert.ok(0.43 + pose.height + 3 < 5.3, "Aircraft clears the rear header");
      }
    }
  }
  assert.equal(hangarDoorProgress(8, 0, 2), 0);
  assert.equal(approachProgress(4.8, 0, 0), 1);
  assert.equal(approachProgress(6.4, 0, 2), 1);
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
