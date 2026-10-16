import { useState } from "react";
import { supabase } from "../../supabase";
import { formatDate } from "../../utils/date";
import { ROUND_LABELS, filterSngsByRound } from "../../utils/rounds";
import { calculateQualification } from "../../utils/qualification";
import { calculateSngPayouts, formatEuro } from "../../utils/payouts";

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

export default function RoundResults({
  season,
  players,
  sngs,
  rondeType,
  profile,
  onRefresh,
}) {
  const [msg, setMsg] = useState("");

  const label = ROUND_LABELS[rondeType];
  const roundSngs = filterSngsByRound(sngs, rondeType);

  const payoutInfo = calculateSngPayouts({
    players,
    season,
    rondeType,
    sngCount: roundSngs.length,
  });

  async function createLog(actie, details) {
    if (!season?.id) return;

    await supabase.from("activity_logs").insert({
      season_id: season.id,
      actie,
      user_name: profile?.naam || profile?.email || "Onbekend",
      user_email: profile?.email || null,
      details_json: details,
    });
  }

  async function setPositionByDropdown(sng, positie, selectedSngPlayerId) {
    setMsg("");

    for (const sp of sng.sng_players || []) {
      if (sp.eindpositie === positie) {
        await supabase
          .from("sng_players")
          .update({ eindpositie: null })
          .eq("id", sp.id);
      }
    }

    if (selectedSngPlayerId) {
      const { error } = await supabase
        .from("sng_players")
        .update({
          eindpositie: positie,
        })
        .eq("id", selectedSngPlayerId);

      if (error) {
        return setMsg(error.message);
      }
    }

    onRefresh();
  }

  async function updatePlayerField(sngPlayerId, field, value) {
    if (!sngPlayerId) return;

    const parsedValue = value === "" ? null : Number(value || 0);

    const { error } = await supabase
      .from("sng_players")
      .update({
        [field]: parsedValue,
      })
      .eq("id", sngPlayerId);

    if (error) {
      return setMsg(error.message);
    }

    onRefresh();
  }

  async function berekenKwalificatie() {
    setMsg("");

    const result = calculateQualification({
      rondeType,
      totalPlayers: players.length,
      sngs: roundSngs,
      allSngs: sngs,
    });

    if (result.error) {
      return setMsg(result.error);
    }

    const alleResultaten = roundSngs.flatMap((sng) => sng.sng_players || []);

    for (const resultaat of alleResultaten) {
      await supabase
        .from("sng_players")
        .update({
          geplaatst: result.placedIds.has(resultaat.id),
        })
        .eq("id", resultaat.id);
    }

    await createLog("qualification_calculated", {
      ronde_type: rondeType,
      ronde: label,
      geplaatst: result.placedIds.size,
    });

    setMsg(`Kwalificatie berekend: ${result.placedIds.size} spelers geplaatst.`);

    onRefresh();
  }

  return (
    <div className="card">
      <h2>Uitslagen {label.toLowerCase()}</h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: 12,
          marginBottom: 18,
        }}
      >
        <div
          style={{
            padding: 12,
            borderRadius: 12,
            background: "rgba(255,255,255,0.05)",
          }}
        >
          <div style={{ color: "#9fb3c8", fontSize: 12 }}>Brutopot</div>
          <strong>{formatEuro(payoutInfo.brutoPot)}</strong>
        </div>

        <div
          style={{
            padding: 12,
            borderRadius: 12,
            background: "rgba(255,255,255,0.05)",
          }}
        >
          <div style={{ color: "#9fb3c8", fontSize: 12 }}>Nettopot</div>
          <strong>{formatEuro(payoutInfo.nettoPot)}</strong>
        </div>

        <div
          style={{
            padding: 12,
            borderRadius: 12,
            background: "rgba(255,255,255,0.05)",
          }}
        >
          <div style={{ color: "#9fb3c8", fontSize: 12 }}>
            {label}pot ({payoutInfo.percentage}%)
          </div>
          <strong>{formatEuro(payoutInfo.roundPot)}</strong>
        </div>

        <div
          style={{
            padding: 12,
            borderRadius: 12,
            background: "rgba(255,255,255,0.05)",
          }}
        >
          <div style={{ color: "#9fb3c8", fontSize: 12 }}>Pot per SNG</div>
          <strong>{formatEuro(payoutInfo.sngPot)}</strong>
        </div>
      </div>

      {rondeType !== "finale" && roundSngs.length > 0 && (
        <button onClick={berekenKwalificatie}>Bereken kwalificatie</button>
      )}

      {msg && (
        <p className={msg.includes("berekend") ? "success" : "error"}>
          {msg}
        </p>
      )}

      {roundSngs.length === 0 ? (
        <p>Nog geen SNG’s beschikbaar.</p>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: 18,
            marginTop: 18,
          }}
        >
          {roundSngs.map((sng) => {
            const sngPlayers = (sng.sng_players || []).slice();

            return (
              <div
                key={sng.id}
                style={{
                  background: "rgba(255,255,255,0.055)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 16,
                  overflow: "hidden",
                  minWidth: 0,
                }}
              >
                <div
                  style={{
                    padding: 14,
                    background:
                      "linear-gradient(135deg, rgba(255,140,0,0.22), rgba(0,140,255,0.18))",
                    borderBottom: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <h3 style={{ margin: 0 }}>{sng.naam}</h3>

                  <p
                    style={{
                      margin: "6px 0 0 0",
                      color: "#d7e7ff",
                      fontSize: 13,
                    }}
                  >
                    📅 {formatDate(sng.datum)} · 💰 Pot:{" "}
                    {formatEuro(payoutInfo.sngPot)}
                  </p>
                </div>

                <div style={{ padding: 14 }}>
                  {Array.from({ length: sngPlayers.length }).map((_, index) => {
                    const positie = index + 1;

                    const selectedPlayer = sngPlayers.find(
                      (sp) => sp.eindpositie === positie
                    );

                    const prijs = payoutInfo.payouts[positie] || 0;

                    const selectedIdsInThisSng = new Set(
                      sngPlayers
                        .filter(
                          (sp) => sp.eindpositie && sp.id !== selectedPlayer?.id
                        )
                        .map((sp) => sp.id)
                    );

                    return (
                      <div
                        key={positie}
                        style={{
                          padding: "12px 0",
                          borderTop: "1px solid rgba(255,255,255,0.08)",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: 8,
                            alignItems: "center",
                            marginBottom: 8,
                          }}
                        >
                          <strong>{positie}e plaats</strong>

                          <span
                            style={{
                              display: "flex",
                              gap: 8,
                              alignItems: "center",
                              flexWrap: "wrap",
                              justifyContent: "flex-end",
                            }}
                          >
                            {prijs > 0 && (
                              <strong style={{ color: "#ff9d42" }}>
                                {formatEuro(prijs)}
                              </strong>
                            )}

                            <span>
                              {selectedPlayer?.geplaatst ? "✅ Door" : "—"}
                            </span>
                          </span>
                        </div>

                        <select
                          value={selectedPlayer?.id || ""}
                          onChange={(e) =>
                            setPositionByDropdown(sng, positie, e.target.value)
                          }
                          style={{
                            ...inputStyle,
                            marginBottom: 8,
                          }}
                        >
                          <option value="">Kies speler</option>

                          {sngPlayers
                            .slice()
                            .filter((sp) => !selectedIdsInThisSng.has(sp.id))
                            .sort((a, b) =>
                              (a.player?.naam || "").localeCompare(
                                b.player?.naam || ""
                              )
                            )
                            .map((sp) => (
                              <option key={sp.id} value={sp.id}>
                                {sp.player?.naam}
                              </option>
                            ))}
                        </select>

                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: 8,
                          }}
                        >
                          <input
                            type="number"
                            min="0"
                            placeholder="Aantal busts"
                            value={selectedPlayer?.busts ?? ""}
                            onChange={(e) =>
                              updatePlayerField(
                                selectedPlayer?.id,
                                "busts",
                                e.target.value
                              )
                            }
                            disabled={!selectedPlayer}
                            style={inputStyle}
                          />

                          <input
                            type="number"
                            min="0"
                            placeholder="Gespeelde handen"
                            value={selectedPlayer?.stack_bij_eliminatie ?? ""}
                            onChange={(e) =>
                              updatePlayerField(
                                selectedPlayer?.id,
                                "stack_bij_eliminatie",
                                e.target.value
                              )
                            }
                            disabled={!selectedPlayer}
                            style={inputStyle}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}