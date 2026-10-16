import { getTargetQualifiers } from "./rounds";

function getTableSizeFromResult(result) {
  return result.tableSize || result.sngSpelers || result.aantalSpelers || 0;
}

function getSeasonBusts(playerId, allSngs) {
  return (allSngs || [])
    .flatMap((sng) => sng.sng_players || [])
    .filter((sp) => sp.player_id === playerId)
    .reduce((sum, sp) => sum + Number(sp.busts || 0), 0);
}

function sortBonusCandidates(a, b, allSngs) {
  const bustsA = getSeasonBusts(a.player_id, allSngs);
  const bustsB = getSeasonBusts(b.player_id, allSngs);

  if (bustsA !== bustsB) return bustsB - bustsA;

  const handenA = Number(a.stack_bij_eliminatie || 0);
  const handenB = Number(b.stack_bij_eliminatie || 0);

  if (handenA !== handenB) return handenB - handenA;

  return Math.random() - 0.5;
}

export function calculateQualification({
  rondeType,
  totalPlayers,
  sngs,
  allSngs = sngs,
}) {
  const aantalSngs = sngs.length;

  const alleResultaten = sngs.flatMap((sng) =>
    (sng.sng_players || []).map((sp) => ({
      ...sp,
      sngNaam: sng.naam,
      playerNaam: sp.player?.naam,
      tableSize: (sng.sng_players || []).length,
    }))
  );

  const mistPositie = alleResultaten.filter((r) => !r.eindpositie);

  if (mistPositie.length > 0) {
    return {
      placedIds: new Set(),
      error: "Vul eerst alle eindposities in.",
    };
  }

  if (rondeType === "voorronde" && aantalSngs === 5) {
    const directDoor = alleResultaten.filter((r) => r.eindpositie <= 6);

    const bonusKandidaten = alleResultaten
      .filter((r) => r.eindpositie === 7)
      .filter((r) => getTableSizeFromResult(r) === 9)
      .sort((a, b) => sortBonusCandidates(a, b, allSngs))
      .slice(0, 2);

    return {
      placedIds: new Set([
        ...directDoor.map((r) => r.id),
        ...bonusKandidaten.map((r) => r.id),
      ]),
      doelAantal: 32,
      vastePlaatsen: 6,
      extraPlaatsen: 2,
      bonusPositie: 7,
      error: null,
    };
  }

  const doelAantal = getTargetQualifiers(rondeType, totalPlayers, aantalSngs);

  if (!aantalSngs || !doelAantal) {
    return {
      placedIds: new Set(),
      error: "Geen geldige kwalificatieregel voor deze ronde.",
    };
  }

  const vastePlaatsen = Math.floor(doelAantal / aantalSngs);
  const extraPlaatsen = doelAantal % aantalSngs;
  const bonusPositie = vastePlaatsen + 1;

  const directDoor = alleResultaten.filter(
    (r) => r.eindpositie <= vastePlaatsen
  );

  const bonusKandidaten = alleResultaten
    .filter((r) => r.eindpositie === bonusPositie)
    .sort((a, b) => sortBonusCandidates(a, b, allSngs))
    .slice(0, extraPlaatsen);

  return {
    placedIds: new Set([
      ...directDoor.map((r) => r.id),
      ...bonusKandidaten.map((r) => r.id),
    ]),
    doelAantal,
    vastePlaatsen,
    extraPlaatsen,
    bonusPositie,
    error: null,
  };
}