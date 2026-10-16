import { useState } from "react";
import { supabase } from "../../supabase";
import { formatDate, getSpeeldata } from "../../utils/date";
import {
  ROUND_DATE_KEYS,
  ROUND_LABELS,
  filterSngsByRound,
  getRoundByType,
  getSngCountForRound,
} from "../../utils/rounds";
import { buildSmartLoting } from "../../utils/loting";

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

const DATE_KEY_MAP = {
  voorronde: "voorronde",
  ronde1: "voorronde",
  kwartfinale: "kwartfinales",
  kwartfinales: "kwartfinales",
  halvefinale: "halvefinales",
  halvefinales: "halvefinales",
  finale: "finale",
};

export default function RoundLoting({
  season,
  rounds,
  players,
  sngs,
  rondeType,
  sourcePlayers,
  profile,
  onRefresh,
}) {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [swapA, setSwapA] = useState("");
  const [swapB, setSwapB] = useState("");
  const [swapConfirmed, setSwapConfirmed] = useState(false);

  const label = ROUND_LABELS[rondeType];
  const speeldata = getSpeeldata(season);
  const dateKey = ROUND_DATE_KEYS[rondeType] || DATE_KEY_MAP[rondeType] || rondeType;
  const roundSngs = filterSngsByRound(sngs, rondeType);
  const inputPlayers = sourcePlayers || [];
  const targetSngCount = getSngCountForRound(rondeType, inputPlayers.length);

  const isLocked = roundSngs.some((sng) => sng.locked);

  const roundEntries = roundSngs.flatMap((sng) =>
    (sng.sng_players || []).map((sp) => ({
      ...sp,
      sng_id: sng.id,
      sngNaam: sng.naam,
      datum: sng.datum,
      playerNaam: sp.player?.naam || "Onbekend",
    }))
  );

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

  async function swapPlayers() {
    setMsg("");

    if (!swapA || !swapB) {
      return setMsg("Kies twee spelers.");
    }

    if (swapA === swapB) {
      return setMsg("Kies twee verschillende spelers.");
    }

    if (!swapConfirmed) {
      return setMsg("Bevestig eerst dat beide spelers akkoord zijn.");
    }

    if (isLocked) {
      return setMsg(`${label} is gelocked.`);
    }

    const playerA = roundEntries.find((e) => e.id === swapA);
    const playerB = roundEntries.find((e) => e.id === swapB);

    if (!playerA || !playerB) {
      return setMsg("Spelers niet gevonden.");
    }

    const confirmed = window.confirm(
      `Ruil bevestigen?\n\n${playerA.playerNaam}\n↔\n${playerB.playerNaam}`
    );

    if (!confirmed) return;

    const { error: errorA } = await supabase
      .from("sng_players")
      .update({ sng_id: playerB.sng_id })
      .eq("id", playerA.id);

    if (errorA) return setMsg(errorA.message);

    const { error: errorB } = await supabase
      .from("sng_players")
      .update({ sng_id: playerA.sng_id })
      .eq("id", playerB.id);

    if (errorB) return setMsg(errorB.message);

    await createLog("players_swapped", {
      ronde_type: rondeType,
      speler_a: playerA.playerNaam,
      speler_b: playerB.playerNaam,
      van_sng_a: playerA.sngNaam,
      van_sng_b: playerB.sngNaam,
      akkoord_beide_spelers: true,
    });

    setSwapA("");
    setSwapB("");
    setSwapConfirmed(false);

    setMsg("Spelers succesvol geruild.");
    onRefresh();
  }

  async function lockRound() {
    const confirmed = window.confirm(
      `Weet je zeker dat je ${label} wilt locken?`
    );

    if (!confirmed) return;

    const ids = roundSngs.map((sng) => sng.id);

    const { error } = await supabase
      .from("sngs")
      .update({ locked: true })
      .in("id", ids);

    if (error) {
      return setMsg(error.message);
    }

    await createLog("round_locked", {
      ronde_type: rondeType,
      ronde: label,
      sngs: ids.length,
    });

    setMsg(`${label} gelocked.`);
    onRefresh();
  }

  async function generateRound() {
    setMsg("");

    if (!season?.id) {
      return setMsg("Maak eerst een seizoen aan.");
    }

    if (!inputPlayers.length) {
      return setMsg(`Geen spelers voor ${label}.`);
    }

    if (isLocked) {
      return setMsg(`${label} is gelocked.`);
    }

    const round = getRoundByType(rounds, rondeType);

    if (!round?.id) {
      return setMsg(`${label} niet gevonden.`);
    }

    const datesForRound = speeldata?.[dateKey] || [];

    const result = buildSmartLoting({
      players: inputPlayers,
      rondeType,
      dates: datesForRound,
      sngCount: targetSngCount,
      maxPerSng: 9,
    });

    if (result.error) {
      return setMsg(result.error);
    }

    if (result.unplaced.length > 0) {
      return setMsg(
        `Niet iedereen kon worden ingedeeld: ${result.unplaced
          .map((p) => p.naam)
          .join(", ")}`
      );
    }

    const confirmed = window.confirm(
      `Bestaande ${label}-loting verwijderen en opnieuw genereren?`
    );

    if (!confirmed) return;

    setLoading(true);

    const { data: existing } = await supabase
      .from("sngs")
      .select("id")
      .eq("season_id", season.id)
      .eq("ronde_type", rondeType);

    if (existing?.length > 0) {
      const ids = existing.map((x) => x.id);

      await supabase.from("sng_players").delete().in("sng_id", ids);
      await supabase.from("sngs").delete().in("id", ids);
    }

    for (let i = 0; i < result.groups.length; i++) {
      const group = result.groups[i];

      const { data: sngData, error: sngError } = await supabase
        .from("sngs")
        .insert({
          season_id: season.id,
          round_id: round.id,
          ronde_type: rondeType,
          naam: `${label} SNG ${i + 1}`,
          datum: group.datum,
          status: "gepland",
          locked: false,
        })
        .select()
        .single();

      if (sngError) {
        setLoading(false);
        return setMsg(sngError.message);
      }

      const inserts = group.spelers.map((player) => ({
        season_id: season.id,
        round_id: round.id,
        sng_id: sngData.id,
        player_id: player.id,
        status: "ingedeeld",
      }));

      const { error: insertError } = await supabase
        .from("sng_players")
        .insert(inserts);

      if (insertError) {
        setLoading(false);
        return setMsg(insertError.message);
      }
    }

    await createLog("round_loting_generated", {
      ronde_type: rondeType,
      ronde: label,
      spelers: inputPlayers.length,
      sngs: result.groups.length,
    });

    setLoading(false);

    setMsg(`${label}-loting succesvol gegenereerd.`);
    onRefresh();
  }

  return (
    <div className="card">
      <h2>{label} loting</h2>

      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 18 }}>
        <div style={{ padding: 12, borderRadius: 12, background: "rgba(255,255,255,0.05)" }}>
          <div style={{ color: "#9fb3c8", fontSize: 12 }}>Spelers</div>
          <strong>{inputPlayers.length}</strong>
        </div>

        <div style={{ padding: 12, borderRadius: 12, background: "rgba(255,255,255,0.05)" }}>
          <div style={{ color: "#9fb3c8", fontSize: 12 }}>SNG’s</div>
          <strong>{targetSngCount}</strong>
        </div>

        <div style={{ padding: 12, borderRadius: 12, background: "rgba(255,255,255,0.05)" }}>
          <div style={{ color: "#9fb3c8", fontSize: 12 }}>Status</div>
          <strong>{isLocked ? "🔒 Locked" : "🔓 Open"}</strong>
        </div>
      </div>

      <button onClick={generateRound} disabled={loading || isLocked}>
        {loading ? "Genereren..." : `Genereer ${label.toLowerCase()}-loting`}
      </button>

      {roundSngs.length > 0 && !isLocked && (
        <div
          style={{
            marginTop: 24,
            padding: 18,
            borderRadius: 18,
            border: "1px solid rgba(47,147,255,0.35)",
            background:
              "linear-gradient(135deg, rgba(255,140,0,0.10), rgba(0,140,255,0.12))",
            overflow: "hidden",
          }}
        >
          <h3 style={{ marginTop: 0 }}>Handmatige ruil</h3>

          <p style={{ marginTop: 0, color: "#9fb3c8", fontSize: 14 }}>
            Ruil twee spelers tussen SNG’s.
          </p>

          <label style={labelStyle}>Speler A</label>

          <select value={swapA} onChange={(e) => setSwapA(e.target.value)} style={inputStyle}>
            <option value="">Kies speler A</option>
            {roundEntries.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.playerNaam} — {entry.sngNaam}
              </option>
            ))}
          </select>

          <div style={{ textAlign: "center", fontSize: 28, color: "#2f93ff", margin: "10px 0" }}>
            ⇅
          </div>

          <label style={labelStyle}>Speler B</label>

          <select value={swapB} onChange={(e) => setSwapB(e.target.value)} style={inputStyle}>
            <option value="">Kies speler B</option>
            {roundEntries.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.playerNaam} — {entry.sngNaam}
              </option>
            ))}
          </select>

          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginTop: 16,
              padding: 12,
              borderRadius: 12,
              background: "rgba(255,255,255,0.06)",
              color: "#dbeafe",
              fontWeight: 700,
            }}
          >
            <input
              type="checkbox"
              checked={swapConfirmed}
              onChange={(e) => setSwapConfirmed(e.target.checked)}
              style={{ width: "auto" }}
            />
            Ja, beide spelers zijn akkoord.
          </label>

          <button
            onClick={swapPlayers}
            disabled={!swapA || !swapB || !swapConfirmed}
            style={{ marginTop: 14, width: "100%" }}
          >
            ⇄ Ruil spelers
          </button>
        </div>
      )}

      {roundSngs.length > 0 && !isLocked && (
        <button style={{ marginTop: 16 }} onClick={lockRound}>
          🔒 Lock {label}-loting
        </button>
      )}

      {msg && (
        <p
          className={
            msg.includes("succesvol") || msg.includes("gelocked")
              ? "success"
              : "error"
          }
        >
          {msg}
        </p>
      )}

      <h3 style={{ marginTop: 26 }}>{label} SNG’s</h3>

      {roundSngs.length === 0 ? (
        <p>Nog geen loting gegenereerd.</p>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: 18,
          }}
        >
          {roundSngs.map((sng) => {
            const spelers = (sng.sng_players || [])
              .map((sp) => sp.player)
              .filter(Boolean)
              .sort((a, b) => a.naam.localeCompare(b.naam));

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
                    padding: 14,
                    background:
                      "linear-gradient(135deg, rgba(255,140,0,0.22), rgba(0,140,255,0.18))",
                    borderBottom: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <h3 style={{ margin: 0 }}>
                    {sng.locked ? "🔒 " : ""}
                    {sng.naam}
                  </h3>

                  <p style={{ margin: "6px 0 0 0", color: "#d7e7ff", fontSize: 13 }}>
                    📅 {formatDate(sng.datum)} · 👥 {spelers.length} spelers
                  </p>
                </div>

                <div style={{ padding: 14, display: "grid", gap: 8 }}>
                  {spelers.map((player, index) => (
                    <div
                      key={player.id}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "32px 1fr",
                        gap: 8,
                        alignItems: "center",
                        padding: 10,
                        borderRadius: 12,
                        background: "rgba(255,255,255,0.05)",
                      }}
                    >
                      <strong style={{ color: "#ff9d42" }}>{index + 1}.</strong>
                      <span>{player.naam}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}