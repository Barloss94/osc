import { useEffect, useState } from "react";
import { supabase } from "../supabase";

function formatDateTime(dateString) {
  if (!dateString) return "-";

  return new Date(dateString).toLocaleString("nl-NL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getActionLabel(action) {
  const map = {
    round_loting_generated: "🎲 Loting gegenereerd",
    players_swapped: "⇄ Spelers geruild",
    round_locked: "🔒 Ronde gelocked",
    qualification_calculated: "✅ Kwalificatie berekend",
    sng_updated: "🛠️ SNG bijgewerkt",
    player_removed: "❌ Speler verwijderd",
  };

  return map[action] || action;
}

export default function LogsTab() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLogs();
  }, []);

  async function loadLogs() {
    setLoading(true);

    const { data, error } = await supabase
      .from("activity_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(250);

    if (error) {
      console.error("loadLogs error:", error);
      setLogs([]);
      setLoading(false);
      return;
    }

    setLogs(data || []);
    setLoading(false);
  }

  return (
    <div className="card">
      <h2>Activiteit logs</h2>

      <p style={{ color: "#9fb3c8" }}>
        Overzicht van acties binnen de OSC Cup Manager.
      </p>

      {loading ? (
        <p>Laden...</p>
      ) : logs.length === 0 ? (
        <p>Geen logs gevonden.</p>
      ) : (
        <div style={{ display: "grid", gap: 14, marginTop: 20 }}>
          {logs.map((log) => (
            <div
              key={log.id}
              style={{
                borderRadius: 18,
                overflow: "hidden",
                border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.04)",
              }}
            >
              <div
                style={{
                  padding: 14,
                  background:
                    "linear-gradient(135deg, rgba(255,140,0,0.20), rgba(0,140,255,0.18))",
                  borderBottom: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 10,
                    flexWrap: "wrap",
                  }}
                >
                  <strong>{getActionLabel(log.actie)}</strong>

                  <span style={{ color: "#d7e7ff", fontSize: 13 }}>
                    {formatDateTime(log.created_at)}
                  </span>
                </div>

                <div
                  style={{
                    marginTop: 8,
                    color: "#dbeafe",
                    fontSize: 13,
                    opacity: 0.9,
                  }}
                >
                  👤 {log.user_name || log.user_email || "Onbekend"}
                </div>
              </div>

              <div style={{ padding: 14 }}>
                <pre
                  style={{
                    margin: 0,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    fontFamily: "inherit",
                    color: "#dbeafe",
                    fontSize: 14,
                  }}
                >
                  {JSON.stringify(log.details_json || {}, null, 2)}
                </pre>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}