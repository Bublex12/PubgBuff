const MAP_LABELS: Record<string, string> = {
  Baltic_Main: "Erangel (Remastered)",
  Erangel_Main: "Erangel (оригинал)",
  Desert_Main: "Miramar",
  Savage_Main: "Sanhok",
  DihorOtok_Main: "Vikendi",
  Summerland_Main: "Karakin",
  Chimera_Main: "Paramo",
  Tiger_Main: "Taego",
  Kiki_Main: "Deston",
  Neon_Main: "Rondo",
  Range_Main: "Camp Jackal",
};

function titleCaseWords(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

const WEAPON_TOKEN_LABELS: Record<string, string> = {
  // Common abbreviations / special cases after stripping Item_Weapon_ / _C
  AUG: "AUG",
  AKM: "AKM",
  Beryl: "Beryl M762",
  Groza: "Groza",
  M16A4: "M16A4",
  M416: "M416",
  Mk14: "Mk14 EBR",
  Mk47: "Mk47 Mutant",
  Mini14: "Mini-14",
  QBU: "QBU",
  QBZ: "QBZ",
  SCARL: "SCAR-L",
  HK416: "M416",
  SLR: "SLR",
  SKS: "SKS",
  VSS: "VSS",
  UMP: "UMP45",
  UZI: "Micro UZI",
  Vector: "Vector",
  PP19: "Bizon",
  P90: "P90",
  MP5K: "MP5K",
  Tommygun: "Thompson",
  Winchester: "Win94",
  Win1894: "Win94",
  S686: "S686",
  S1897: "S1897",
  S12K: "S12K",
  DBS: "DBS",
  M249: "M249",
  MG3: "MG3",
  DP28: "DP-28",
  Crossbow: "Crossbow",
  DesertEagle: "Deagle",
  P1911: "P1911",
  P92: "P92",
  R45: "R45",
  Rhino: "R45",
  G18: "P18C",
};

export function formatPubgMapName(rawMapName: string): string {
  const trimmed = rawMapName.trim();
  if (!trimmed) {
    return "";
  }

  const mapped = MAP_LABELS[trimmed];
  if (mapped) {
    return mapped;
  }

  return trimmed;
}

export function formatPubgWeaponName(rawWeaponKey: string): string {
  const trimmed = rawWeaponKey.trim();
  if (!trimmed) {
    return "";
  }

  const direct = WEAPON_TOKEN_LABELS[trimmed];
  if (direct) {
    return direct;
  }

  let key = trimmed;

  if (key.startsWith("Item_Weapon_")) {
    key = key.slice("Item_Weapon_".length);
  } else if (key.startsWith("Item_")) {
    key = key.slice("Item_".length);
  }

  if (key.endsWith("_C")) {
    key = key.slice(0, -"_C".length);
  }

  const tokenLabel = WEAPON_TOKEN_LABELS[key] ?? WEAPON_TOKEN_LABELS[key.replaceAll("-", "")];
  if (tokenLabel) {
    return tokenLabel;
  }

  key = key.replaceAll("_", " ").trim();
  if (!key) {
    return trimmed;
  }

  return titleCaseWords(key);
}
