import { useMemo } from "react";
import { formatDate } from "../utils/date";
import { ROUND_LABELS } from "../utils/rounds";

function getTodayDateOnly() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
}

function StatCard({ label, value, sub }) {
  return (
    <div
      style={{
        padding: 16,
        borderRadius: 18,
        background: "rgba(255,255,255,0.055)",
        border: "1px solid rgba(255,255,255,0.1)",
      }}
    >
      <div style={{ color: "#9fb3c8", fontSize: 13, fontWeight: 700 }}>
        {label}
      </div>
      <div style={{ fontSize: 30, fontWeight: 900, marginTop: 6 }}>{value}</div>
      {sub && <div style={{ color: "#9fb3c8", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

export default function DashboardTab({ season, players, sngs }) {
  const nextSng = useMemo(() => {
    const today = getTodayDateOnly();

    return (sngs || [])
      .filter((sng) => sng.datum)
      .filter((sng) => !["afgerond", "geannuleerd"].includes(sng.status))
      .filter((sng) => {
        const d = new Date(String(sng.datum).split("T")[0]);
        d.setHours(0, 0, 0, 0);
        return d >= today;
      })
      .sort((a, b) => String(a.datum || "").localeCompare(String(b.datum || "")))[0];
  }, [sngs]);

  const totalSngs = sngs?.length || 0;
  const lockedSngs = (sngs || []).filter((sng) => sng.locked).length;
  const completedSngs = (sngs || []).filter((sng) => sng.status === "afgerond").length;

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <div className="card">
        <h2>Dashboard</h2>
        <p style={{ color: "#9fb3c8" }}>
          Overzicht van {season?.naam || "het huidige seizoen"}.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 16,
            marginTop: 18,
          }}
        >
          <StatCard label="Spelers" value={players?.length || 0} />
          <StatCard label="SNG’s" value={totalSngs} />
          <StatCard label="Gelocked" value={lockedSngs} />
          <StatCard label="Afgerond" value={completedSngs} />
        </div>
      </div>

      <div className="card">
        <h2>🎯 Eerstvolgende SNG</h2>

        {!nextSng ? (
          <p style={{ color: "#9fb3c8" }}>Er staat geen volgende SNG gepland.</p>
        ) : (
          <div
            style={{
              borderRadius: 20,
              overflow: "hidden",
              border: "1px solid rgba(255,255,255,0.1)",
              background: "rgba(255,255,255,0.055)",
            }}
          >
            <div
              style={{
                padding: 18,
                background:
                  "linear-gradient(135deg, rgba(255,140,0,0.22), rgba(0,140,255,0.18))",
                borderBottom: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <h3 style={{ margin: 0 }}>{nextSng.naam}</h3>
              <p style={{ margin: "6px 0 0 0", color: "#d7e7ff" }}>
                {ROUND_LABELS[nextSng.ronde_type] || nextSng.ronde_type}
              </p>
            </div>

            <div
              style={{
                padding: 18,
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                gap: 12,
              }}
            >
              <StatCard label="Datum" value={formatDate(nextSng.datum)} />
              <StatCard label="Status" value={nextSng.status || "gepland"} />
              <StatCard
                label="Spelers"
                value={(nextSng.sng_players || []).length}
              />
              <StatCard label="Lock" value={nextSng.locked ? "🔒" : "🔓"} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}