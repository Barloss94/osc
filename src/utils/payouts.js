function toCents(value) {
  return Math.round(Number(value || 0) * 100);
}

function fromCents(cents) {
  return cents / 100;
}

function floorToFiveCents(cents) {
  return Math.floor(cents / 5) * 5;
}

export function formatEuro(value) {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

export function getRoundPotPercentage(rondeType) {
  if (rondeType === "voorronde") return 25;
  if (rondeType === "kwartfinale") return 20;
  if (rondeType === "halve_finale") return 10;
  if (rondeType === "finale") return 45;
  return 0;
}

export function getRoundPayoutPercentages(rondeType) {
  if (rondeType === "finale") {
    return {
      1: 25,
      2: 16.5,
      3: 12.5,
      4: 10.5,
      5: 8.5,
      6: 7.5,
      7: 7,
      8: 6.5,
      9: 6,
    };
  }

  return {
    1: 50,
    2: 30,
    3: 20,
  };
}

export function calculatePrizePool({ players = [], season }) {
  const totalPlayers = players.length;
  const buyIn = 15;
  const kosten = Number(season?.kosten || 0);

  const brutoPot = totalPlayers * buyIn;
  const nettoPot = Math.max(0, brutoPot - kosten);

  return {
    totalPlayers,
    buyIn,
    kosten,
    brutoPot,
    nettoPot,
  };
}

export function calculateRoundPot({ players = [], season, rondeType }) {
  const pool = calculatePrizePool({ players, season });
  const percentage = getRoundPotPercentage(rondeType);

  const roundPot = (pool.nettoPot * percentage) / 100;

  return {
    ...pool,
    percentage,
    roundPot,
  };
}

export function calculateSngPayouts({
  players = [],
  season,
  rondeType,
  sngCount,
}) {
  const roundInfo = calculateRoundPot({
    players,
    season,
    rondeType,
  });

  const safeSngCount = Math.max(1, Number(sngCount || 0));
  const sngPot = roundInfo.roundPot / safeSngCount;
  const sngPotCents = toCents(sngPot);

  const percentages = getRoundPayoutPercentages(rondeType);
  const positions = Object.keys(percentages)
    .map(Number)
    .sort((a, b) => a - b);

  const payoutCents = {};
  let usedCents = 0;

  for (const positie of positions) {
    if (positie === 1) continue;

    const rawCents = Math.floor((sngPotCents * percentages[positie]) / 100);
    const roundedCents = floorToFiveCents(rawCents);

    payoutCents[positie] = roundedCents;
    usedCents += roundedCents;
  }

  const rawFirstCents = Math.floor((sngPotCents * percentages[1]) / 100);
  const roundedFirstCents = floorToFiveCents(rawFirstCents);

  payoutCents[1] = roundedFirstCents;
  usedCents += roundedFirstCents;

  const remainingCents = floorToFiveCents(sngPotCents - usedCents);

  if (remainingCents > 0) {
    payoutCents[1] += remainingCents;
  }

  const payouts = {};

  for (const positie of positions) {
    payouts[positie] = fromCents(payoutCents[positie] || 0);
  }

  const totalPaid = Object.values(payouts).reduce(
    (sum, value) => sum + Number(value || 0),
    0
  );

  return {
    ...roundInfo,
    sngCount: safeSngCount,
    sngPot,
    payouts,
    totalPaid,
    difference: sngPot - totalPaid,
  };
}