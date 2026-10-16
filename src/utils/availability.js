import { ROUND_DATE_KEYS } from "./rounds";

function normalizeDate(date) {
  if (!date) return "";
  return String(date).split("T")[0];
}

function getRoundKeys(rondeType) {
  const mappedKey = ROUND_DATE_KEYS[rondeType] || rondeType;

  const aliases = {
    voorronde: ["voorronde", "ronde1"],
    ronde1: ["ronde1", "voorronde"],

    kwartfinale: ["kwartfinale", "kwartfinales"],
    kwartfinales: ["kwartfinales", "kwartfinale"],

    halve_finale: ["halve_finale", "halve_finales", "halveFinale"],
    halve_finales: ["halve_finales", "halve_finale", "halveFinale"],
    halveFinale: ["halveFinale", "halve_finale", "halve_finales"],

    finale: ["finale"],
  };

  return [
    ...new Set([
      mappedKey,
      rondeType,
      ...(aliases[rondeType] || []),
      ...(aliases[mappedKey] || []),
    ]),
  ];
}

export function getVerhinderd(player, rondeType) {
  const verhinderd = player?.beschikbaarheid_json?.verhinderd || {};
  const keys = getRoundKeys(rondeType);

  return [
    ...new Set(
      keys
        .flatMap((key) => verhinderd[key] || [])
        .map(normalizeDate)
        .filter(Boolean)
    ),
  ];
}

export function getBeschikbareData(player, rondeType, dates) {
  const verhinderd = getVerhinderd(player, rondeType);

  return (dates || [])
    .map(normalizeDate)
    .filter((date) => date && !verhinderd.includes(date));
}

export function normalizeBeschikbaarheidJson(current = {}) {
  const verhinderd = current.verhinderd || {};

  const ronde1 = [
    ...new Set([
      ...(verhinderd.ronde1 || []),
      ...(verhinderd.voorronde || []),
    ].map(normalizeDate).filter(Boolean)),
  ];

  const kwartfinale = [
    ...new Set([
      ...(verhinderd.kwartfinale || []),
      ...(verhinderd.kwartfinales || []),
    ].map(normalizeDate).filter(Boolean)),
  ];

  const halveFinale = [
    ...new Set([
      ...(verhinderd.halve_finale || []),
      ...(verhinderd.halve_finales || []),
      ...(verhinderd.halveFinale || []),
    ].map(normalizeDate).filter(Boolean)),
  ];

  const finale = [
    ...new Set([
      ...(verhinderd.finale || []),
    ].map(normalizeDate).filter(Boolean)),
  ];

  return {
    ...current,
    verhinderd: {
      ...verhinderd,

      ronde1,
      voorronde: ronde1,

      kwartfinale,
      kwartfinales: kwartfinale,

      halve_finale: halveFinale,
      halve_finales: halveFinale,
      halveFinale,

      finale,
    },
  };
}