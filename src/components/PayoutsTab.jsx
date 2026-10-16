import { useMemo } from "react";
import { ROUND_LABELS } from "../utils/rounds";
import {
  calculatePrizePool,
  calculateSngPayouts,
  formatEuro,
  getRoundPotPercentage,
  getRoundPayoutPercentages,
} from "../utils/payouts";

const RONDES = ["voorronde", "kwartfinale", "halve_finale", "finale"];

const cardStyle = {
  padding: 16,
  borderRadius: 18,
  background: "rgba(255,255,255,0.055)",
  border: "1px solid rgba(255,255,255,0.1)",
};

const thStyle = {
  textAlign: "left",
  padding: "10px 8px",
  color: "#9fb3c8",
  fontSize: 13,
  borderBottom: "1px solid rgba(255,255,255,0.12)",
};

const tdStyle = {
  padding: "10px 8px",
  borderBottom: "1px solid rgba(255,255,255,0.08)",
};

function getSngCount(sngs, rondeType) {
  const count = (sngs || []).filter((sng) => sng.ronde_type === rondeType).length;

  if (count > 0) return count;

  if (rondeType === "voorronde") return 0;
  if (rondeType === "kwartfinale") return 4;
  if (rondeType === "halve_finale") return 2;
  if (rondeType === "finale") return 1;

  return 1;
}

export default function PayoutsTab({ season, players, sngs }) {
  const prizePool = useMemo(
    () => calculatePrizePool({ players, season }),
    [players, season]
  );

  return (
    <div className="card">
      <h2>Prijzenverdeling</h2>

      <p style={{ color: "#9fb3c8" }}>
        Overzicht van de brutopot, kosten, nettopot en de verdeling per ronde en per SNG.
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
            Spelers
          </div>
          <div style={{ fontSize: 30, fontWeight: 900 }}>
            {prizePool.totalPlayers}
          </div>
        </div>

        <div style={cardStyle}>
          <div style={{ color: "#9fb3c8", fontSize: 13, fontWeight: 700 }}>
            Buy-in
          </div>
          <div style={{ fontSize: 30, fontWeight: 900 }}>
            {formatEuro(prizePool.buyIn)}
          </div>
        </div>

        <div style={cardStyle}>
          <div style={{ color: "#9fb3c8", fontSize: 13, fontWeight: 700 }}>
            Brutopot
          </div>
          <div style={{ fontSize: 30, fontWeight: 900 }}>
            {formatEuro(prizePool.brutoPot)}
          </div>
        </div>

        <div style={cardStyle}>
          <div style={{ color: "#9fb3c8", fontSize: 13, fontWeight: 700 }}>
            Kosten
          </div>
          <div style={{ fontSize: 30, fontWeight: 900 }}>
            {formatEuro(prizePool.kosten)}
          </div>
        </div>

        <div style={cardStyle}>
          <div style={{ color: "#9fb3c8", fontSize: 13, fontWeight: 700 }}>
            Nettopot
          </div>
          <div style={{ fontSize: 30, fontWeight: 900 }}>
            {formatEuro(prizePool.nettoPot)}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gap: 18, marginTop: 24 }}>
        {RONDES.map((rondeType) => {
          const sngCount = getSngCount(sngs, rondeType);

          const payoutInfo = calculateSngPayouts({
            players,
            season,
            rondeType,
            sngCount: Math.max(1, sngCount),
          });

          const percentages = getRoundPayoutPercentages(rondeType);
          const positions = Object.keys(percentages)
            .map(Number)
            .sort((a, b) => a - b);

          return (
            <div key={rondeType} style={cardStyle}>
              <h3 style={{ marginTop: 0 }}>
                {ROUND_LABELS[rondeType]} — {getRoundPotPercentage(rondeType)}%
              </h3>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                  gap: 12,
                  marginBottom: 16,
                }}
              >
                <div>
                  <div style={{ color: "#9fb3c8", fontSize: 12 }}>
                    Rondepot
                  </div>
                  <strong>{formatEuro(payoutInfo.roundPot)}</strong>
                </div>

                <div>
                  <div style={{ color: "#9fb3c8", fontSize: 12 }}>
                    Aantal SNG’s
                  </div>
                  <strong>{sngCount || "Nog niet geloot"}</strong>
                </div>

                <div>
                  <div style={{ color: "#9fb3c8", fontSize: 12 }}>
                    Pot per SNG
                  </div>
                  <strong>{formatEuro(payoutInfo.sngPot)}</strong>
                </div>

                <div>
                  <div style={{ color: "#9fb3c8", fontSize: 12 }}>
                    Uitgekeerd per SNG
                  </div>
                  <strong>{formatEuro(payoutInfo.totalPaid)}</strong>
                </div>
              </div>

              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    minWidth: 420,
                  }}
                >
                  <thead>
                    <tr>
                      <th style={thStyle}>Plaats</th>
                      <th style={thStyle}>Percentage</th>
                      <th style={thStyle}>Bedrag per SNG</th>
                    </tr>
                  </thead>

                  <tbody>
                    {positions.map((positie) => (
                      <tr key={positie}>
                        <td style={{ ...tdStyle, fontWeight: 900 }}>
                          {positie}e
                        </td>
                        <td style={tdStyle}>{percentages[positie]}%</td>
                        <td
                          style={{
                            ...tdStyle,
                            fontWeight: 900,
                            color: payoutInfo.payouts[positie] > 0 ? "#ff9d42" : "#fff",
                          }}
                        >
                          {formatEuro(payoutInfo.payouts[positie])}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {Math.abs(payoutInfo.difference) >= 0.01 && (
                <p style={{ color: "#9fb3c8", marginBottom: 0 }}>
                  Afrondingsverschil: {formatEuro(payoutInfo.difference)}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}