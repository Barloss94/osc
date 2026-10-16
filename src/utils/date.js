export const DEFAULT_SPEELDATA = {
  ronde1: [
    "2026-06-10",
    "2026-06-15",
    "2026-06-23",
    "2026-06-28",
    "2026-07-11",
  ],
  kwartfinale: [
    "2026-09-08",
    "2026-09-14",
    "2026-09-20",
    "2026-09-26",
  ],
  halve_finale: [
    "2026-10-14",
    "2026-10-20",
  ],
  finale: [
    "2026-11-21",
  ],
};

export function formatDate(date) {
  if (!date) return "geen datum";

  const cleanDate = String(date).split("T")[0];
  const [y, m, d] = cleanDate.split("-");

  if (!y || !m || !d) {
    return String(date);
  }

  return `${d}-${m}-${y}`;
}

export function getSpeeldata(season) {
  const saved = season?.instellingen_json?.speeldata || {};

  return {
    ronde1:
      saved.ronde1 ||
      DEFAULT_SPEELDATA.ronde1,

    kwartfinale:
      saved.kwartfinale ||
      saved.kwartfinales ||
      DEFAULT_SPEELDATA.kwartfinale,

    halve_finale:
      saved.halve_finale ||
      saved.halve_finales ||
      DEFAULT_SPEELDATA.halve_finale,

    finale:
      saved.finale ||
      DEFAULT_SPEELDATA.finale,
  };
}