export type AllianceId = "star-alliance" | "skyteam" | "oneworld" | "hotels";

export type PublicPartner = {
  id: string;
  program: string;
  partner: string;
  allianceId: AllianceId;
  points: number;
  redeemed: number | null;
  livery: {
    primary: string;
    secondary: string;
    tail: string;
  };
};

export type PublicHotel = {
  id: string;
  brand: string;
  program: string;
  allianceId: "hotels";
  points: number;
  redeemed: number | null;
  theme: {
    primary: string;
    secondary: string;
    accent: string;
  };
};

export type PublicAlliance = {
  id: AllianceId;
  name: string;
  category: "airline" | "hotel";
  color: string;
  logo: string;
  totalPoints: number;
  redeemedPoints: number;
  partnerCount: number;
};

export type PublicSnapshot = {
  snapshotAt: string;
  sourceLabel: string;
  totals: {
    airlinePoints: number;
    hotelPoints: number;
    combinedPoints: number;
    redeemedPoints: number;
  };
  alliances: PublicAlliance[];
  airlinePartners: PublicPartner[];
  hotelBrands: PublicHotel[];
};

export const publicSnapshot: PublicSnapshot = {
  snapshotAt: "2026-09-10T07:47:26Z",
  sourceLabel: "Notion Points ledger + Alliance directory",
  totals: {
    airlinePoints: 554901,
    hotelPoints: 707916,
    combinedPoints: 1262817,
    redeemedPoints: 210500,
  },
  alliances: [
    {
      id: "star-alliance",
      name: "Star Alliance",
      category: "airline",
      color: "#79c95b",
      logo: "STAR",
      totalPoints: 335663,
      redeemedPoints: 21500,
      partnerCount: 5,
    },
    {
      id: "skyteam",
      name: "SkyTeam",
      category: "airline",
      color: "#9d6cff",
      logo: "SKY",
      totalPoints: 137000,
      redeemedPoints: 80000,
      partnerCount: 2,
    },
    {
      id: "oneworld",
      name: "oneworld",
      category: "airline",
      color: "#ff955d",
      logo: "one",
      totalPoints: 82238,
      redeemedPoints: 11000,
      partnerCount: 3,
    },
    {
      id: "hotels",
      name: "Hotel brands",
      category: "hotel",
      color: "#e7b86a",
      logo: "H",
      totalPoints: 707916,
      redeemedPoints: 98000,
      partnerCount: 1,
    },
  ],
  airlinePartners: [
    {
      id: "avianca-lifemiles",
      program: "LifeMiles",
      partner: "Avianca LifeMiles",
      allianceId: "star-alliance",
      points: 132600,
      redeemed: null,
      livery: { primary: "#6ec86a", secondary: "#e9f2d0", tail: "#11805b" },
    },
    {
      id: "united-airlines",
      program: "MileagePlus",
      partner: "United Airlines",
      allianceId: "star-alliance",
      points: 98000,
      redeemed: null,
      livery: { primary: "#6d8eea", secondary: "#f0f2fa", tail: "#1f376d" },
    },
    {
      id: "air-canada",
      program: "Aeroplan",
      partner: "Air Canada",
      allianceId: "star-alliance",
      points: 50004,
      redeemed: null,
      livery: { primary: "#d75b4d", secondary: "#f7eadb", tail: "#9a2c39" },
    },
    {
      id: "air-india",
      program: "Maharaja Club",
      partner: "Air India",
      allianceId: "star-alliance",
      points: 28499,
      redeemed: 13000,
      livery: { primary: "#c85b58", secondary: "#efc27b", tail: "#8c233b" },
    },
    {
      id: "turkish-airlines",
      program: "Miles & Smiles",
      partner: "Turkish Airlines",
      allianceId: "star-alliance",
      points: 26560,
      redeemed: 8500,
      livery: { primary: "#d8655d", secondary: "#f0eee8", tail: "#a32239" },
    },
    {
      id: "virgin-atlantic",
      program: "Flying Club",
      partner: "Virgin Atlantic",
      allianceId: "skyteam",
      points: 133500,
      redeemed: 80000,
      livery: { primary: "#d34e68", secondary: "#f3e7de", tail: "#6e204d" },
    },
    {
      id: "vietnam-airlines",
      program: "Lotusmiles",
      partner: "Vietnam Airlines",
      allianceId: "skyteam",
      points: 3500,
      redeemed: null,
      livery: { primary: "#e6ba59", secondary: "#f4f0dc", tail: "#13686d" },
    },
    {
      id: "finnair",
      program: "Finnair Plus",
      partner: "Finnair",
      allianceId: "oneworld",
      points: 40047,
      redeemed: null,
      livery: { primary: "#62b9d6", secondary: "#eff7f5", tail: "#1372a1" },
    },
    {
      id: "qatar-airways",
      program: "Privilege Club",
      partner: "Qatar Airways",
      allianceId: "oneworld",
      points: 39667,
      redeemed: 11000,
      livery: { primary: "#b57a92", secondary: "#f2edf0", tail: "#6d183f" },
    },
    {
      id: "british-airways",
      program: "Executive Club",
      partner: "British Airways",
      allianceId: "oneworld",
      points: 2524,
      redeemed: null,
      livery: { primary: "#5d84c6", secondary: "#f3f4f6", tail: "#b11f52" },
    },
  ],
  hotelBrands: [
    {
      id: "accor",
      brand: "Accor",
      program: "ALL - Accor Live Limitless",
      allianceId: "hotels",
      points: 707916,
      redeemed: 98000,
      theme: {
        primary: "#e7b86a",
        secondary: "#f5e3bb",
        accent: "#c47745",
      },
    },
  ],
};

export function allianceForId(id: AllianceId): PublicAlliance {
  return publicSnapshot.alliances.find((alliance) => alliance.id === id) ?? publicSnapshot.alliances[0];
}
