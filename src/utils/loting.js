import { getBeschikbareData } from "./availability";

export function shuffle(list) {
  const arr = [...list];

  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));

    [arr[i], arr[j]] = [arr[j], arr[i]];
  }

  return arr;
}

export function buildSmartLoting({ players, rondeType, dates, sngCount, maxPerSng = 9 }) {
  if (!players?.length) return { groups: [], unplaced: [], error: "Geen spelers beschikbaar." };
  if (!dates?.length) return { groups: [], unplaced: [], error: "Geen speeldata beschikbaar." };

  const playerInfos = shuffle(players).map((player) => ({
    player,
    opties: getBeschikbareData(player, rondeType, dates),
  }));

  const zonderOpties = playerInfos.filter((info) => info.opties.length === 0);
  if (zonderOpties.length > 0) {
    return { groups: [], unplaced: zonderOpties.map((info) => info.player), error: null };
  }

  const groups = [];
  const getGroupsForDate = (datum) => groups.filter((group) => group.datum === datum);
  const createGroup = (datum) => {
    const group = { datum, spelers: [] };
    groups.push(group);
    return group;
  };

  function canCreateGroupOnDate(datum) {
    const maxGroupsOnDate = rondeType === "voorronde" ? 2 : 1;
    if (getGroupsForDate(datum).length >= maxGroupsOnDate) return false;
    if (groups.length >= sngCount) return false;
    return true;
  }

  function getOpenGroupsForPlayer(info) {
    return groups.filter((g) => info.opties.includes(g.datum)).filter((g) => g.spelers.length < maxPerSng);
  }

  function placeInBestExistingGroup(info) {
    const options = getOpenGroupsForPlayer(info).sort((a, b) => {
      if (a.spelers.length !== b.spelers.length) return a.spelers.length - b.spelers.length;
      return Math.random() - 0.5;
    });
    if (!options.length) return false;
    options[0].spelers.push(info.player);
    return true;
  }

  function placeInNewGroup(info) {
    const bestDatum = info.opties.filter((datum) => canCreateGroupOnDate(datum)).sort((a, b) => {
      const aHard = playerInfos.filter((p) => p.opties.length === 1 && p.opties[0] === a).length;
      const bHard = playerInfos.filter((p) => p.opties.length === 1 && p.opties[0] === b).length;
      if (aHard !== bHard) return bHard - aHard;
      const aAvailable = playerInfos.filter((p) => p.opties.includes(a)).length;
      const bAvailable = playerInfos.filter((p) => p.opties.includes(b)).length;
      return bAvailable - aAvailable;
    })[0];
    if (!bestDatum) return false;
    createGroup(bestDatum).spelers.push(info.player);
    return true;
  }

  const oneOptionPlayers = playerInfos.filter((info) => info.opties.length === 1);
  const twoOptionPlayers = playerInfos.filter((info) => info.opties.length === 2);
  const flexiblePlayers = playerInfos.filter((info) => info.opties.length >= 3);
  const forcedDates = [...new Set(oneOptionPlayers.map((info) => info.opties[0]))];

  if (forcedDates.length > sngCount) {
    return { groups: [], unplaced: oneOptionPlayers.map((info) => info.player), error: "Er zijn meer verplichte speeldata dan beschikbare SNG’s." };
  }

  for (const datum of forcedDates) createGroup(datum);

  const unplaced = [];
  for (const info of oneOptionPlayers) if (!placeInBestExistingGroup(info)) unplaced.push(info.player);
  for (const info of twoOptionPlayers) {
    if (placeInBestExistingGroup(info)) continue;
    if (placeInNewGroup(info)) continue;
    unplaced.push(info.player);
  }

  while (groups.length < Math.min(sngCount, dates.length)) {
    const bestDatum = dates.filter((datum) => getGroupsForDate(datum).length === 0).sort((a, b) => {
      const aAvailable = playerInfos.filter((info) => info.opties.includes(a)).length;
      const bAvailable = playerInfos.filter((info) => info.opties.includes(b)).length;
      return bAvailable - aAvailable;
    })[0];
    if (!bestDatum) break;
    createGroup(bestDatum);
  }

  for (const info of flexiblePlayers) {
    if (placeInBestExistingGroup(info)) continue;
    if (placeInNewGroup(info)) continue;
    unplaced.push(info.player);
  }

  while (groups.length < sngCount) {
    const bestDatum = dates.filter((datum) => canCreateGroupOnDate(datum)).sort((a, b) => {
      const aAvailable = playerInfos.filter((info) => info.opties.includes(a)).length;
      const bAvailable = playerInfos.filter((info) => info.opties.includes(b)).length;
      return bAvailable - aAvailable;
    })[0];
    if (!bestDatum) break;
    createGroup(bestDatum);
  }

  groups.sort((a, b) => {
    if (a.datum !== b.datum) return a.datum.localeCompare(b.datum);
    return b.spelers.length - a.spelers.length;
  });
  return { groups, unplaced, error: null };
}
