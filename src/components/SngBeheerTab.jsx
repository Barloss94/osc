import { useMemo, useState } from "react";
import { supabase } from "../supabase";
import { formatDate } from "../utils/date";
import { ROUND_LABELS } from "../utils/rounds";

const STATUS_OPTIONS = ["gepland", "bezig", "afgerond", "geannuleerd"];

const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.06)",
  color: "#fff",
  fontSize: 14,
  boxSizing: "border-box",
  outline: "none",
};

const labelStyle = {
  display: "block",
  marginBottom: 6,
  marginTop: 12,
  color: "#9fb3c8",
  fontSize: 13,
  fontWeight: 700,
  letterSpacing: 0.3,
};

export default function SngBeheerTab({ sngs, profile, onRefresh }) {
  const [msg, setMsg] = useState("");
  const [filter, setFilter] = useState("alle");

  const filteredSngs = useMemo(() => {
    return (sngs || [])
      .filter((sng) => filter === "alle" || sng.ronde_type === filter)
      .sort((a, b) => String(a.datum || "").localeCompare(String(b.datum || "")));
  }, [sngs, filter]);

  async function createLog(actie, details, seasonId) {
    await supabase.from("activity_logs").insert({
      season_id: seasonId || null,
      actie,
      user_name: profile?.naam || profile?.email || "Onbekend",
      user_email: profile?.email || null,
      details_json: details,
    });
  }

  async function updateSng(sng, updates) {
    setMsg("");

    const { error } = await supabase
      .from("sngs")
      .update(updates)
      .eq("id", sng.id);

    if (error) {
      setMsg(error.message);
      return;
    }

    await createLog(
      "sng_updated",
      {
        sng_id: sng.id,
        sng_naam: sng.naam,
        ronde_type: sng.ronde_type,
        updates,
      },
      sng.season_id
    );

    setMsg("SNG bijgewerkt.");
    onRefresh();
  }

  async function removePlayer(sng, sngPlayerId, playerName) {
    const confirmed = window.confirm(
      `Weet je zeker dat je ${playerName} uit deze SNG wilt verwijderen?`
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("sng_players")
      .delete()
      .eq("id", sngPlayerId);

    if (error) {
      setMsg(error.message);
      return;
    }

    await createLog(
      "player_removed",
      {
        sng_id: sng.id,
        sng_naam: sng.naam,
        ronde_type: sng.ronde_type,
        speler: playerName,
      },
      sng.season_id
    );

    setMsg("Speler verwijderd uit SNG.");
    onRefresh();
  }

  async function cancelSng(sng) {
    const confirmed = window.confirm(
      `Weet je zeker dat je ${sng.naam} wilt annuleren?`
    );

    if (!confirmed) return;

    await updateSng(sng, {
      status: "geannuleerd",
      locked: true,
    });
  }

  return (
    <div className="card">
      <h2>SNG Beheer</h2>

      <p style={{ color: "#9fb3c8", marginBottom: 20 }}>
        Beheer bestaande SNG’s, spelers, datums en statussen.
      </p>

      <div style={{ marginBottom: 20, maxWidth: 300 }}>
        <label style={labelStyle}>Filter ronde</label>

        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={inputStyle}
        >
          <option value="alle">Alle rondes</option>
          <option value="voorronde">Voorronde</option>
          <option value="kwartfinale">Kwartfinale</option>
          <option value="halve_finale">Halve finale</option>
          <option value="finale">Finale</option>
        </select>
      </div>

      {msg && (
        <p
          className={
            msg.includes("bijgewerkt") || msg.includes("verwijderd")
              ? "success"
              : "error"
          }
        >
          {msg}
        </p>
      )}

      {filteredSngs.length === 0 ? (
        <p>Geen SNG’s gevonden.</p>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
            gap: 18,
          }}
        >
          {filteredSngs.map((sng) => {
            const players = sng.sng_players || [];

            return (
              <div
                key={sng.id}
                style={{
                  background: "rgba(255,255,255,0.055)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 18,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    padding: 16,
                    background:
                      "linear-gradient(135deg, rgba(255,140,0,0.22), rgba(0,140,255,0.18))",
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
                    <div>
                      <h3 style={{ margin: 0 }}>
                        {sng.naam || "Onbekende SNG"}
                      </h3>

                      <p
                        style={{
                          margin: "6px 0 0 0",
                          color: "#d7e7ff",
                          fontSize: 13,
                        }}
                      >
                        {ROUND_LABELS[sng.ronde_type] || sng.ronde_type}
                      </p>
                    </div>

                    <div
                      style={{
                        padding: "6px 10px",
                        borderRadius: 999,
                        background: "rgba(255,255,255,0.12)",
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    >
                      {sng.locked ? "🔒 Locked" : "🔓 Open"}
                    </div>
                  </div>
                </div>

                <div style={{ padding: 16 }}>
                  <label style={labelStyle}>Naam SNG</label>

                  <input
                    style={inputStyle}
                    value={sng.naam || ""}
                    onChange={(e) =>
                      updateSng(sng, { naam: e.target.value })
                    }
                  />

                  <label style={labelStyle}>Datum</label>

                  <input
                    type="date"
                    style={inputStyle}
                    value={String(sng.datum || "").split("T")[0]}
                    onChange={(e) =>
                      updateSng(sng, { datum: e.target.value })
                    }
                  />

                  <label style={labelStyle}>Status</label>

                  <select
                    style={inputStyle}
                    value={sng.status || "gepland"}
                    onChange={(e) =>
                      updateSng(sng, { status: e.target.value })
                    }
                  >
                    {STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>

                  <label style={labelStyle}>Notitie</label>

                  <textarea
                    rows={4}
                    style={{
                      ...inputStyle,
                      resize: "vertical",
                      minHeight: 90,
                    }}
                    value={sng.notitie || ""}
                    onChange={(e) =>
                      updateSng(sng, { notitie: e.target.value })
                    }
                    placeholder="Bijv. speler afgemeld, tafel verplaatst..."
                  />

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 10,
                      marginTop: 14,
                    }}
                  >
                    <div
                      style={{
                        padding: 12,
                        borderRadius: 12,
                        background: "rgba(255,255,255,0.04)",
                      }}
                    >
                      <div style={{ color: "#9fb3c8", fontSize: 12 }}>
                        Datum
                      </div>

                      <strong>{formatDate(sng.datum)}</strong>
                    </div>

                    <div
                      style={{
                        padding: 12,
                        borderRadius: 12,
                        background: "rgba(255,255,255,0.04)",
                      }}
                    >
                      <div style={{ color: "#9fb3c8", fontSize: 12 }}>
                        Spelers
                      </div>

                      <strong>{players.length}</strong>
                    </div>
                  </div>

                  <h4 style={{ marginTop: 20 }}>Spelers</h4>

                  {players.length === 0 ? (
                    <p>Geen spelers in deze SNG.</p>
                  ) : (
                    <div
                      style={{
                        display: "grid",
                        gap: 8,
                        marginTop: 10,
                      }}
                    >
                      {players
                        .slice()
                        .sort((a, b) =>
                          (a.player?.naam || "").localeCompare(
                            b.player?.naam || ""
                          )
                        )
                        .map((sp) => (
                          <div
                            key={sp.id}
                            style={{
                              display: "grid",
                              gridTemplateColumns: "1fr auto",
                              gap: 10,
                              alignItems: "center",
                              padding: 10,
                              borderRadius: 12,
                              background: "rgba(255,255,255,0.05)",
                            }}
                          >
                            <span>{sp.player?.naam || "Onbekend"}</span>

                            <button
                              onClick={() =>
                                removePlayer(
                                  sng,
                                  sp.id,
                                  sp.player?.naam || "deze speler"
                                )
                              }
                              style={{
                                padding: "8px 10px",
                                borderRadius: 10,
                                border: "none",
                                background: "rgba(255,80,80,0.18)",
                                color: "#ffb3b3",
                                cursor: "pointer",
                              }}
                            >
                              Verwijder
                            </button>
                          </div>
                        ))}
                    </div>
                  )}

                  <button
                    onClick={() => cancelSng(sng)}
                    disabled={sng.status === "geannuleerd"}
                    style={{
                      marginTop: 18,
                      width: "100%",
                      padding: 12,
                      borderRadius: 12,
                      border: "none",
                      background:
                        sng.status === "geannuleerd"
                          ? "rgba(255,255,255,0.08)"
                          : "linear-gradient(135deg, #ff7b00, #ff3d3d)",
                      color: "#fff",
                      fontWeight: 700,
                      cursor:
                        sng.status === "geannuleerd"
                          ? "not-allowed"
                          : "pointer",
                    }}
                  >
                    {sng.status === "geannuleerd"
                      ? "SNG geannuleerd"
                      : "Annuleer SNG"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}