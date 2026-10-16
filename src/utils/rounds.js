export const ROUND_TYPES = ["voorronde", "kwartfinale", "halve_finale", "finale"];

export const ROUND_LABELS = {
  voorronde: "Voorronde",
  kwartfinale: "Kwartfinale",
  halve_finale: "Halve finale",
  finale: "Finale",
};

export const ROUND_DATE_KEYS = {
  voorronde: "ronde1",
  kwartfinale: "kwartfinale",
  halve_finale: "halve_finale",
  finale: "finale",
};

export function getRoundByType(rounds, rondeType) {
  return (rounds || []).find((r) => r.ronde_type === rondeType);
}

export function filterSngsByRound(sngs, rondeType) {
  return (sngs || []).filter((sng) => sng.ronde_type === rondeType);
}

export function getNextRoundType(rondeType) {
  if (rondeType === "voorronde") return "kwartfinale";
  if (rondeType === "kwartfinale") return "halve_finale";
  if (rondeType === "halve_finale") return "finale";
  return null;
}

export function getStartRoundType(playerCount) {
  if (playerCount <= 9) return "finale";
  if (playerCount <= 16) return "halve_finale";
  if (playerCount <= 28) return "kwartfinale";
  return "voorronde";
}

export function getSngCountForRound(rondeType, playerCount) {
  if (rondeType === "finale") return 1;
  if (rondeType === "halve_finale") return 2;
  if (rondeType === "kwartfinale") return 4;

  return Math.ceil(playerCount / 9);
}

export function getTargetQualifiers(rondeType, totalPlayers, sngCount) {
  if (rondeType === "finale") return 1;

  if (rondeType === "halve_finale") {
    return 9;
  }

  if (rondeType === "kwartfinale") {
    return 16;
  }

  if (rondeType === "voorronde") {
    if (sngCount === 4) return 28;
    if (sngCount === 5) return 32;
    if (sngCount >= 6) return 36;
  }

  return 0;
}