import { useMemo, useState } from "react";
import { supabase } from "../supabase";
import { getSpeeldata } from "../utils/date";

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
};

function parseCsv(text) {
  const cleanText = text.replace(/^\uFEFF/, "");
  const firstLine = cleanText.split(/\r?\n/)[0] || "";
  const delimiter = firstLine.includes(";") ? ";" : ",";

  const rows = [];
  let row = [];
  let value = "";
  let inQuotes = false;

  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i];
    const next = cleanText[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      value += '"';
      i++;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === delimiter && !inQuotes) {
      row.push(value.trim());
      value = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i++;
      row.push(value.trim());
      value = "";

      if (row.some((cell) => cell !== "")) rows.push(row);

      row = [];
      continue;
    }

    value += char;
  }

  if (value || row.length) {
    row.push(value.trim());
    if (row.some((cell) => cell !== "")) rows.push(row);
  }

  if (rows.length === 0) return [];

  const headers = rows[0].map((h) => h.replace(/^\uFEFF/, "").trim());

  return rows.slice(1).map((cells) => {
    const obj = {};

    headers.forEach((header, index) => {
      obj[header] = cells[index] || "";
    });

    return obj;
  });
}

function toIsoDate(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";

  const cleaned = raw.replace(/\//g, "-");
  const parts = cleaned.split("-");

  if (parts.length !== 3) return raw;

  if (parts[0].length === 4) {
    const [year, month, day] = parts;
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(
      2,
      "0"
    )}`;
  }

  const [day, month, year] = parts;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(
    2,
    "0"
  )}`;
}

function normalizeDate(value) {
  return toIsoDate(value);
}

function formatDateNl(value) {
  const iso = toIsoDate(value);
  if (!iso) return "";

  const [year, month, day] = iso.split("-");
  if (!year || !month || !day) return value;

  return `${day}-${month}-${year}`;
}

function uniqueDates(dates) {
  return [...new Set((dates || []).filter(Boolean).map(toIsoDate))];
}

function isMarkedUnavailable(value) {
  const val = String(value || "").trim().toLowerCase();
  return ["x", "ja", "yes", "1", "v", "verhinderd"].includes(val);
}

function getPlayerAvailability(player) {
  return player?.beschikbaarheid_json?.verhinderd || {};
}

function cleanDateList(list) {
  return [...new Set((list || []).filter(Boolean).map(toIsoDate))];
}

function buildAvailabilityJson({ ronde1, kwartfinale, halveFinale, finale }) {
  const cleanRonde1 = cleanDateList(ronde1);
  const cleanKwartfinale = cleanDateList(kwartfinale);
  const cleanHalveFinale = cleanDateList(halveFinale);
  const cleanFinale = cleanDateList(finale);

  return {
    verhinderd: {
      ronde1: cleanRonde1,
      voorronde: cleanRonde1,

      kwartfinale: cleanKwartfinale,
      kwartfinales: cleanKwartfinale,

      halveFinale: cleanHalveFinale,
      halve_finale: cleanHalveFinale,
      halve_finales: cleanHalveFinale,

      finale: cleanFinale,
    },
  };
}

export default function PlayersTab({ season, players, onRefresh }) {
  const [naam, setNaam] = useState("");
  const [msg, setMsg] = useState("");
  const [importing, setImporting] = useState(false);

  const speeldata = getSpeeldata(season);

  const ronde1Dates = useMemo(
    () =>
      uniqueDates([
        ...(speeldata.ronde1 || []),
        ...(speeldata.voorronde || []),
      ]),
    [speeldata]
  );

  const kwartfinaleDates = useMemo(
    () =>
      uniqueDates([
        ...(speeldata.kwartfinales || []),
        ...(speeldata.kwartfinale || []),
      ]),
    [speeldata]
  );

  const halveFinaleDates = useMemo(
    () =>
      uniqueDates([
        ...(speeldata.halve_finales || []),
        ...(speeldata.halve_finale || []),
        ...(speeldata.halveFinale || []),
      ]),
    [speeldata]
  );

  const finaleDates = useMemo(
    () => uniqueDates([...(speeldata.finale || [])]),
    [speeldata]
  );

  async function addPlayer(e) {
    e.preventDefault();
    setMsg("");

    if (!season?.id) {
      setMsg("Maak eerst een seizoen aan.");
      return;
    }

    if (!naam.trim()) {
      setMsg("Vul een naam in.");
      return;
    }

    const { error } = await supabase.from("players").insert({
      season_id: season.id,
      naam: naam.trim(),
      status: "actief",
      beschikbaarheid_json: buildAvailabilityJson({
        ronde1: [],
        kwartfinale: [],
        halveFinale: [],
        finale: [],
      }),
    });

    if (error) {
      setMsg(error.message);
      return;
    }

    setNaam("");
    setMsg("Speler toegevoegd.");
    onRefresh?.();
  }

  async function toggleVerhinderd(player, rondeKey, datum) {
    setMsg("");

    const normalizedDatum = toIsoDate(datum);
    const current = player.beschikbaarheid_json || {};
    const verhinderd = current.verhinderd || {};
    const lijst = cleanDateList(verhinderd[rondeKey] || []);

    const updatedList = lijst.includes(normalizedDatum)
      ? lijst.filter((d) => d !== normalizedDatum)
      : [...lijst, normalizedDatum];

    const nextVerhinderd = {
      ...verhinderd,
      [rondeKey]: updatedList,
    };

    if (rondeKey === "ronde1" || rondeKey === "voorronde") {
      nextVerhinderd.ronde1 = updatedList;
      nextVerhinderd.voorronde = updatedList;
    }

    if (rondeKey === "kwartfinale" || rondeKey === "kwartfinales") {
      nextVerhinderd.kwartfinale = updatedList;
      nextVerhinderd.kwartfinales = updatedList;
    }

    if (
      rondeKey === "halveFinale" ||
      rondeKey === "halve_finale" ||
      rondeKey === "halve_finales"
    ) {
      nextVerhinderd.halveFinale = updatedList;
      nextVerhinderd.halve_finale = updatedList;
      nextVerhinderd.halve_finales = updatedList;
    }

    if (rondeKey === "finale") {
      nextVerhinderd.finale = updatedList;
    }

    const { error } = await supabase
      .from("players")
      .update({
        beschikbaarheid_json: {
          ...current,
          verhinderd: nextVerhinderd,
        },
      })
      .eq("id", player.id);

    if (error) {
      setMsg(error.message);
      return;
    }

    onRefresh?.();
  }

  async function deletePlayer(player) {
    const confirmed = window.confirm(
      `Weet je zeker dat je ${player.naam} wilt verwijderen?`
    );

    if (!confirmed) return;

    const { error } = await supabase.from("players").delete().eq("id", player.id);

    if (error) {
      setMsg(error.message);
      return;
    }

    setMsg("Speler verwijderd.");
    onRefresh?.();
  }

  async function importCsv(file) {
    setMsg("");

    if (!season?.id) {
      setMsg("Maak eerst een seizoen aan.");
      return;
    }

    setImporting(true);

    try {
      const text = await file.text();
      const rows = parseCsv(text);

      let imported = 0;
      let updated = 0;
      let skipped = 0;

      for (const row of rows) {
        const naam =
          row.Naam ||
          row.naam ||
          row["﻿Naam"] ||
          row.Speler ||
          row.speler ||
          "";

        if (!String(naam).trim()) {
          skipped++;
          continue;
        }

        const ronde1 = [];
        const kwartfinale = [];
        const halveFinale = [];
        const finale = [];

        Object.entries(row).forEach(([key, value]) => {
          const cleanKey = String(key || "").replace(/^\uFEFF/, "").trim();

          if (
            cleanKey === "Naam" ||
            cleanKey === "naam" ||
            cleanKey === "Speler" ||
            cleanKey === "speler"
          ) {
            return;
          }

          if (!isMarkedUnavailable(value)) return;

          const isoKey = toIsoDate(cleanKey);

          if (ronde1Dates.includes(isoKey)) {
            ronde1.push(isoKey);
          } else if (kwartfinaleDates.includes(isoKey)) {
            kwartfinale.push(isoKey);
          } else if (halveFinaleDates.includes(isoKey)) {
            halveFinale.push(isoKey);
          } else if (finaleDates.includes(isoKey)) {
            finale.push(isoKey);
          }
        });

        const beschikbaarheid_json = buildAvailabilityJson({
          ronde1,
          kwartfinale,
          halveFinale,
          finale,
        });

        const cleanName = String(naam).trim();

        const { data: existing, error: lookupError } = await supabase
          .from("players")
          .select("id")
          .eq("season_id", season.id)
          .ilike("naam", cleanName)
          .maybeSingle();

        if (lookupError) throw lookupError;

        if (existing?.id) {
          const { error } = await supabase
            .from("players")
            .update({
              naam: cleanName,
              status: "actief",
              beschikbaarheid_json,
            })
            .eq("id", existing.id);

          if (error) throw error;
          updated++;
        } else {
          const { error } = await supabase.from("players").insert({
            season_id: season.id,
            naam: cleanName,
            status: "actief",
            beschikbaarheid_json,
          });

          if (error) throw error;
          imported++;
        }
      }

      setMsg(
        `CSV geïmporteerd: ${imported} nieuw, ${updated} bijgewerkt${
          skipped ? `, ${skipped} overgeslagen` : ""
        }.`
      );

      onRefresh?.();
    } catch (error) {
      console.error(error);
      setMsg(error.message || "CSV importeren mislukt.");
    }

    setImporting(false);
  }

  function DateChecks({ dates, selected, onToggle }) {
    const selectedNormalized = cleanDateList(selected);

    if (!dates || dates.length === 0) {
      return <p style={{ color: "#9fb3c8" }}>Geen speeldata ingesteld.</p>;
    }

    return (
      <div style={{ display: "grid", gap: 8 }}>
        {uniqueDates(dates).map((datum) => (
          <label
            key={datum}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: 10,
              borderRadius: 12,
              background: "rgba(255,255,255,0.05)",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={selectedNormalized.includes(datum)}
              onChange={() => onToggle(datum)}
              style={{ width: "auto" }}
            />

            <span>{formatDateNl(datum)}</span>
          </label>
        ))}
      </div>
    );
  }

  return (
    <div className="card">
      <h2>Spelers</h2>

      <p style={{ color: "#9fb3c8" }}>
        Voeg spelers handmatig toe of importeer de beschikbaarheid via een CSV.
        Zet in de CSV een <strong>X</strong> bij data waarop een speler
        verhinderd is. Leeg betekent beschikbaar.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 18,
          marginTop: 18,
        }}
      >
        <form
          onSubmit={addPlayer}
          style={{
            padding: 16,
            borderRadius: 18,
            background: "rgba(255,255,255,0.055)",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <h3 style={{ marginTop: 0 }}>Speler toevoegen</h3>

          <label style={labelStyle}>Naam</label>

          <input
            value={naam}
            onChange={(e) => setNaam(e.target.value)}
            placeholder="Naam speler"
            style={inputStyle}
          />

          <button type="submit" style={{ marginTop: 14 }}>
            Speler toevoegen
          </button>
        </form>

        <div
          style={{
            padding: 16,
            borderRadius: 18,
            background:
              "linear-gradient(135deg, rgba(255,140,0,0.10), rgba(0,140,255,0.12))",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <h3 style={{ marginTop: 0 }}>CSV importeren</h3>

          <p style={{ color: "#9fb3c8" }}>
            Upload hier het ingevulde beschikbaarheid-template. Zowel{" "}
            <strong>10-06-2026</strong>, <strong>10-6-2026</strong> als{" "}
            <strong>2026-06-10</strong> wordt herkend.
          </p>

          <label
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              padding: "11px 16px",
              borderRadius: 12,
              background: "linear-gradient(90deg,#ff7a18,#ff9d42)",
              color: "#07101d",
              fontWeight: 800,
              cursor: importing ? "not-allowed" : "pointer",
              opacity: importing ? 0.65 : 1,
            }}
          >
            <input
              type="file"
              accept=".csv,text/csv"
              disabled={importing}
              style={{ display: "none" }}
              onChange={(e) => {
                const file = e.target.files?.[0];

                if (file) {
                  importCsv(file);
                }

                e.target.value = "";
              }}
            />

            {importing ? "Importeren..." : "📥 CSV importeren"}
          </label>
        </div>
      </div>

      {msg && (
        <p
          className={
            msg.includes("toegevoegd") ||
            msg.includes("geïmporteerd") ||
            msg.includes("verwijderd")
              ? "success"
              : "error"
          }
        >
          {msg}
        </p>
      )}

      <h3 style={{ marginTop: 28 }}>Spelerslijst ({players.length})</h3>

      {players.length === 0 ? (
        <p>Geen spelers toegevoegd.</p>
      ) : (
        <div style={{ display: "grid", gap: 16 }}>
          {players.map((player) => {
            const verhinderd = getPlayerAvailability(player);

            return (
              <div
                key={player.id}
                style={{
                  padding: 16,
                  borderRadius: 18,
                  background: "rgba(255,255,255,0.055)",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <h3 style={{ margin: 0 }}>{player.naam}</h3>

                  <button
                    onClick={() => deletePlayer(player)}
                    style={{
                      background: "rgba(255,80,80,0.18)",
                      color: "#ffb3b3",
                    }}
                  >
                    Verwijder
                  </button>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(230px, 1fr))",
                    gap: 16,
                    marginTop: 16,
                  }}
                >
                  <div>
                    <h4>Verhinderd ronde 1</h4>
                    <DateChecks
                      dates={ronde1Dates}
                      selected={verhinderd.ronde1 || verhinderd.voorronde || []}
                      onToggle={(datum) =>
                        toggleVerhinderd(player, "ronde1", datum)
                      }
                    />
                  </div>

                  <div>
                    <h4>Verhinderd kwartfinale</h4>
                    <DateChecks
                      dates={kwartfinaleDates}
                      selected={
                        verhinderd.kwartfinale || verhinderd.kwartfinales || []
                      }
                      onToggle={(datum) =>
                        toggleVerhinderd(player, "kwartfinale", datum)
                      }
                    />
                  </div>

                  <div>
                    <h4>Verhinderd halve finale</h4>
                    <DateChecks
                      dates={halveFinaleDates}
                      selected={
                        verhinderd.halveFinale ||
                        verhinderd.halve_finale ||
                        verhinderd.halve_finales ||
                        []
                      }
                      onToggle={(datum) =>
                        toggleVerhinderd(player, "halveFinale", datum)
                      }
                    />
                  </div>

                  <div>
                    <h4>Verhinderd finale</h4>
                    <DateChecks
                      dates={finaleDates}
                      selected={verhinderd.finale || []}
                      onToggle={(datum) =>
                        toggleVerhinderd(player, "finale", datum)
                      }
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}