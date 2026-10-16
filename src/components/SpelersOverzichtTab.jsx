import { useMemo } from "react";
import { formatDate } from "../utils/date";
import { ROUND_LABELS } from "../utils/rounds";
import { calculateSngPayouts, formatEuro } from "../utils/payouts";

const cardStyle = {
  padding: 16,
  borderRadius: 18,
  background: "rgba(255,255,255,0.055)",
  border: "1px solid rgba(255,255,255,0.1)",
};

const tableWrapStyle = {
  width: "100%",
  overflowX: "auto",
};

const thStyle = {
  textAlign: "left",
  padding: "12px 10px",
  color: "#9fb3c8",
  fontSize: 13,
  borderBottom: "1px solid rgba(255,255,255,0.12)",
  whiteSpace: "nowrap",
};

const tdStyle = {
  padding: "12px 10px",
  borderBottom: "1px solid rgba(255,255,255,0.08)",
  whiteSpace: "nowrap",
};

function getRoundOrder(rondeType) {
  const order = {
    voorronde: 1,
    ronde1: 1,
    kwartfinale: 2,
    kwartfinales: 2,
    halve_finale: 3,
    halveFinale: 3,
    halve_finales: 3,
    finale: 4,
  };

  return order[rondeType] || 99;
}

function getRoundLabel(rondeType) {
  return ROUND_LABELS[rondeType] || rondeType || "Onbekend";
}

function hasPosition(value) {
  return value !== null && value !== undefined && value !== "";
}

function getSngCountByRound(sngs) {
  return (sngs || []).reduce((acc, sng) => {
    const rondeType = sng.ronde_type;
    acc[rondeType] = (acc[rondeType] || 0) + 1;
    return acc;
  }, {});
}

function getPrizeForResult({ result, players, season, sngCountByRound }) {
  if (!hasPosition(result.eindpositie)) return 0;

  const rondeType = result.rondeType;
  const positie = Number(result.eindpositie);
  const sngCount = sngCountByRound[rondeType] || 1;

  const payoutInfo = calculateSngPayouts({
    players,
    season,
    rondeType,
    sngCount,
  });

  return Number(payoutInfo.payouts?.[positie] || 0);
}

function getPlayerRows(players, sngs, season) {
  const sngCountByRound = getSngCountByRound(sngs);

  return (players || [])
    .map((player) => {
      const allResults = (sngs || [])
        .flatMap((sng) =>
          (sng.sng_players || [])
            .filter((sp) => sp.player_id === player.id)
            .map((sp) => ({
              ...sp,
              sngNaam: sng.naam,
              sngDatum: sng.datum,
              rondeType: sng.ronde_type,
              roundOrder: getRoundOrder(sng.ronde_type),
            }))
        )
        .sort((a, b) => {
          if (a.roundOrder !== b.roundOrder) {
            return a.roundOrder - b.roundOrder;
          }

          return String(a.sngDatum || "").localeCompare(String(b.sngDatum || ""));
        });

      const playedResults = allResults.filter((r) => hasPosition(r.eindpositie));

      const totalBusts = allResults.reduce(
        (sum, r) => sum + Number(r.busts || 0),
        0
      );

      const totaalGewonnen = playedResults.reduce((sum, result) => {
        return (
          sum +
          getPrizeForResult({
            result,
            players,
            season,
            sngCountByRound,
          })
        );
      }, 0);

      const lastResult = playedResults[playedResults.length - 1] || null;

      const isFinalWinner =
        lastResult?.rondeType === "finale" &&
        Number(lastResult?.eindpositie) === 1;

      const stillActive =
        playedResults.length === 0 ||
        isFinalWinner ||
        lastResult?.geplaatst === true;

      const eliminatedResult =
        playedResults.length > 0 && !stillActive ? lastResult : null;

      return {
        id: player.id,
        naam: player.naam,
        status: stillActive ? "Actief" : "Uitgeschakeld",
        statusIcon: stillActive ? "✅" : "❌",
        uitgeschakeldIn: eliminatedResult
          ? getRoundLabel(eliminatedResult.rondeType)
          : "Nog actief",
        laatsteSng: lastResult?.sngNaam || "Nog niet gespeeld",
        laatsteDatum: lastResult?.sngDatum || null,
        laatstePositie: lastResult?.eindpositie || null,
        totalBusts,
        totaalGewonnen,
        gespeeldeSngs: playedResults.length,
      };
    })
    .sort((a, b) => {
      if (a.status !== b.status) {
        return a.status === "Actief" ? -1 : 1;
      }

      if (b.totaalGewonnen !== a.totaalGewonnen) {
        return b.totaalGewonnen - a.totaalGewonnen;
      }

      if (b.totalBusts !== a.totalBusts) {
        return b.totalBusts - a.totalBusts;
      }

      return a.naam.localeCompare(b.naam);
    });
}

export default function SpelersOverzichtTab({ players, sngs, season }) {
  const rows = useMemo(
    () => getPlayerRows(players, sngs, season),
    [players, sngs, season]
  );

  const activeCount = rows.filter((r) => r.status === "Actief").length;
  const eliminatedCount = rows.filter((r) => r.status === "Uitgeschakeld").length;
  const totalBusts = rows.reduce((sum, r) => sum + r.totalBusts, 0);
  const totalWon = rows.reduce((sum, r) => sum + r.totaalGewonnen, 0);

  return (
    <div className="card">
      <h2>Spelers overzicht</h2>

      <p style={{ color: "#9fb3c8" }}>
        Overzicht van alle spelers, hun status, ronde van uitschakeling, totaal
        aantal busts en totaal gewonnen bedrag.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 14,
          marginTop: 18,
        }}
      >
        <div style={cardStyle}>
          <div style={{ color: "#9fb3c8", fontSize: 13, fontWeight: 700 }}>
            Totaal spelers
          </div>
          <div style={{ fontSize: 30, fontWeight: 900 }}>{rows.length}</div>
        </div>

        <div style={cardStyle}>
          <div style={{ color: "#9fb3c8", fontSize: 13, fontWeight: 700 }}>
            Nog actief
          </div>
          <div style={{ fontSize: 30, fontWeight: 900 }}>{activeCount}</div>
        </div>

        <div style={cardStyle}>
          <div style={{ color: "#9fb3c8", fontSize: 13, fontWeight: 700 }}>
            Uitgeschakeld
          </div>
          <div style={{ fontSize: 30, fontWeight: 900 }}>{eliminatedCount}</div>
        </div>

        <div style={cardStyle}>
          <div style={{ color: "#9fb3c8", fontSize: 13, fontWeight: 700 }}>
            Totaal busts
          </div>
          <div style={{ fontSize: 30, fontWeight: 900 }}>{totalBusts}</div>
        </div>

        <div style={cardStyle}>
          <div style={{ color: "#9fb3c8", fontSize: 13, fontWeight: 700 }}>
            Totaal gewonnen
          </div>
          <div style={{ fontSize: 30, fontWeight: 900 }}>
            {formatEuro(totalWon)}
          </div>
        </div>
      </div>

      <div style={{ ...cardStyle, marginTop: 20 }}>
        <div style={tableWrapStyle}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              minWidth: 980,
            }}
          >
            <thead>
              <tr>
                <th style={thStyle}>Speler</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Uitgeschakeld in</th>
                <th style={thStyle}>Laatste SNG</th>
                <th style={thStyle}>Datum</th>
                <th style={thStyle}>Positie</th>
                <th style={thStyle}>SNG’s gespeeld</th>
                <th style={thStyle}>Totaal busts</th>
                <th style={thStyle}>Gewonnen</th>
              </tr>
            </thead>

            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td style={tdStyle} colSpan={9}>
                    Geen spelers beschikbaar.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id}>
                    <td style={{ ...tdStyle, fontWeight: 800 }}>{row.naam}</td>

                    <td style={tdStyle}>
                      {row.statusIcon} {row.status}
                    </td>

                    <td style={tdStyle}>{row.uitgeschakeldIn}</td>

                    <td style={tdStyle}>{row.laatsteSng}</td>

                    <td style={tdStyle}>
                      {row.laatsteDatum ? formatDate(row.laatsteDatum) : "—"}
                    </td>

                    <td style={tdStyle}>
                      {row.laatstePositie ? `${row.laatstePositie}e` : "—"}
                    </td>

                    <td style={tdStyle}>{row.gespeeldeSngs}</td>

                    <td style={{ ...tdStyle, fontWeight: 900 }}>
                      {row.totalBusts}
                    </td>

                    <td
                      style={{
                        ...tdStyle,
                        fontWeight: 900,
                        color: row.totaalGewonnen > 0 ? "#ff9d42" : "#fff",
                      }}
                    >
                      {formatEuro(row.totaalGewonnen)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}