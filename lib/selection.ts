import type { PublicSnapshot, PublicHotel, PublicPartner } from "./snapshot.ts";

export type AirlineAlliance = "star-alliance" | "skyteam" | "oneworld";
export type Selection = { alliance: AirlineAlliance | null; hotels: string[] };
export const EMPTY_SELECTION: Selection = { alliance: null, hotels: [] };

export function visibleAircraft(
  snapshot: PublicSnapshot,
  alliance: AirlineAlliance | null,
): PublicPartner[] {
  if (!alliance) return [];
  return snapshot.airlinePartners
    .filter(
      (p) =>
        p.allianceId === alliance && Number.isFinite(p.points) && p.points > 0,
    )
    .sort((a, b) => b.points - a.points || a.id.localeCompare(b.id))
    .slice(0, 3);
}

export function visibleHotels(
  snapshot: PublicSnapshot,
  ids: string[],
): PublicHotel[] {
  const valid = new Map(
    snapshot.hotelBrands.filter((h) => h.points > 0).map((h) => [h.id, h]),
  );
  return [...new Set(ids)]
    .slice(0, 3)
    .flatMap((id) => (valid.has(id) ? [valid.get(id)!] : []));
}

export function toggleHotel(
  selection: Selection,
  id: string,
  snapshot: PublicSnapshot,
): Selection {
  if (!snapshot.hotelBrands.some((h) => h.id === id && h.points > 0))
    return selection;
  const hotels = selection.hotels.includes(id)
    ? selection.hotels.filter((hotel) => hotel !== id)
    : selection.hotels.length < 3
      ? [...selection.hotels, id]
      : selection.hotels;
  return { ...selection, hotels };
}

export function snapshotTotals(snapshot: PublicSnapshot) {
  const airlinePoints = snapshot.airlinePartners.reduce(
    (sum, p) => sum + p.points,
    0,
  );
  const hotelPoints = snapshot.hotelBrands.reduce(
    (sum, p) => sum + p.points,
    0,
  );
  const redeemedPoints = [
    ...snapshot.airlinePartners,
    ...snapshot.hotelBrands,
  ].reduce((sum, p) => sum + (p.redeemed ?? 0), 0);
  return {
    airlinePoints,
    hotelPoints,
    combinedPoints: airlinePoints + hotelPoints,
    redeemedPoints,
  };
}

// A separate review fixture exercises vertical construction without changing the saved ledger.
export function constructionFixture(snapshot: PublicSnapshot): PublicSnapshot {
  return {
    ...snapshot,
    hotelBrands: [
      ...snapshot.hotelBrands,
      {
        id: "review-terrace-2",
        brand: "Review terrace 2",
        program: "Construction preview",
        allianceId: "hotels",
        points: 1,
        redeemed: null,
        theme: { primary: "#bf9564", secondary: "#e6d8c5", accent: "#7d8e76" },
      },
      {
        id: "review-terrace-3",
        brand: "Review terrace 3",
        program: "Construction preview",
        allianceId: "hotels",
        points: 1,
        redeemed: null,
        theme: { primary: "#bf9564", secondary: "#e6d8c5", accent: "#7d8e76" },
      },
    ],
  };
}

export const formatPoints = (value: number) =>
  new Intl.NumberFormat("en-IN").format(value);
