import { useMemo, useRef, useState } from "react";
import html2canvas from "html2canvas";
import { formatDate, getSpeeldata } from "../utils/date";
import { ROUND_LABELS } from "../utils/rounds";
import { calculateSngPayouts, formatEuro } from "../utils/payouts";

const logoSrc = `${import.meta.env.BASE_URL}logo.png`;
const logoSimpleSrc = `${import.meta.env.BASE_URL}logosimpel.png`;

const RONDES = ["voorronde", "kwartfinale", "halve_finale", "finale"];

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

function hasPosition(value) {
  return value !== null && value !== undefined && value !== "";
}

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

function getSngCountByRound(sngs) {
  return (sngs || []).reduce((acc, sng) => {
    acc[sng.ronde_type] = (acc[sng.ronde_type] || 0) + 1;
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

export default function ExportsTab({ season, players = [], sngs }) {
  const exportRef = useRef(null);

  const [exportType, setExportType] = useState("loting");
  const [rondeType, setRondeType] = useState("voorronde");
  const [exporting, setExporting] = useState(false);
  const [msg, setMsg] = useState("");

  const roundSngs = useMemo(() => {
    return (sngs || [])
      .filter((sng) => sng.ronde_type === rondeType)
      .sort((a, b) =>
        String(a.datum || "").localeCompare(String(b.datum || ""))
      );
  }, [sngs, rondeType]);

  const playerRows = useMemo(
    () => getPlayerRows(players, sngs, season),
    [players, sngs, season]
  );

  const allPlayersCount = roundSngs.reduce(
    (sum, sng) => sum + (sng.sng_players || []).length,
    0
  );

  const placedPlayers = roundSngs
    .flatMap((sng) =>
      (sng.sng_players || [])
        .filter((sp) => sp.geplaatst)
        .map((sp) => ({
          ...sp,
          sngNaam: sng.naam,
          datum: sng.datum,
        }))
    )
    .sort((a, b) =>
      (a.player?.naam || "").localeCompare(b.player?.naam || "")
    );

  const isPlayersExport =
    exportType === "spelersoverzicht" ||
    exportType === "spelersoverzicht_geld";

  async function exportImage() {
    setMsg("");

    if (!exportRef.current) return;

    if (isPlayersExport && playerRows.length === 0) {
      setMsg("Geen spelers om te exporteren.");
      return;
    }

    if (!isPlayersExport && roundSngs.length === 0) {
      setMsg("Geen data om te exporteren.");
      return;
    }

    setExporting(true);

    try {
      const canvas = await html2canvas(exportRef.current, {
        scale: 2,
        backgroundColor: "#070b12",
        useCORS: true,
      });

      const link = document.createElement("a");
      link.download = isPlayersExport
        ? `osc-${exportType}.png`
        : `osc-${exportType}-${rondeType}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();

      setMsg("Export gemaakt.");
    } catch (error) {
      console.error(error);
      setMsg("Export mislukt.");
    }

    setExporting(false);
  }

  function downloadAvailabilityTemplate() {
    setMsg("");

    const speeldata = getSpeeldata(season) || {};

    const dates = [
      ...(speeldata.ronde1 || []),
      ...(speeldata.voorronde || []),
      ...(speeldata.kwartfinales || []),
      ...(speeldata.kwartfinale || []),
      ...(speeldata.halve_finales || []),
      ...(speeldata.halve_finale || []),
      ...(speeldata.finale || []),
    ].filter(Boolean);

    const uniqueDates = [...new Set(dates)];

    if (uniqueDates.length === 0) {
      setMsg("Geen speeldata gevonden voor template.");
      return;
    }

    let html = `
      <html>
        <head>
          <meta charset="UTF-8" />
        </head>
        <body>
          <table border="1">
            <tr>
              <th>Naam</th>
              ${uniqueDates.map((date) => `<th>${date}</th>`).join("")}
            </tr>
    `;

    for (let i = 1; i <= 54; i++) {
      html += `
        <tr>
          <td></td>
          ${uniqueDates.map(() => `<td></td>`).join("")}
        </tr>
      `;
    }

    html += `
          </table>
        </body>
      </html>
    `;

    const blob = new Blob([html], {
      type: "application/vnd.ms-excel;charset=utf-8;",
    });

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "osc_beschikbaarheid_template.xls";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    window.URL.revokeObjectURL(url);

    setMsg("Template gedownload.");
  }

  function ExportHeader({ title, subtitle }) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 28,
          borderBottom: "3px solid rgba(255,255,255,0.14)",
          paddingBottom: 24,
          marginBottom: 30,
        }}
      >
        <img
          src={logoSrc}
          alt="OSC Logo"
          style={{
            width: 180,
            height: 180,
            objectFit: "contain",
            flexShrink: 0,
          }}
        />

        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: 32,
              color: "#ff7a18",
              fontWeight: 900,
              letterSpacing: 2,
            }}
          >
            OPTSCH SNG CUP
          </div>

          <div
            style={{
              fontSize: 54,
              fontWeight: 1000,
              lineHeight: 1.05,
              marginTop: 6,
            }}
          >
            {title}
          </div>

          <div
            style={{
              marginTop: 10,
              color: "#2f93ff",
              fontSize: 24,
              fontWeight: 800,
            }}
          >
            Sit&amp;Go for it!
          </div>

          <div
            style={{
              marginTop: 14,
              fontSize: 20,
              color: "#d8e8ff",
              fontWeight: 700,
            }}
          >
            {subtitle}
          </div>
        </div>
      </div>
    );
  }

  function ExportShell({ children, title, subtitle }) {
    return (
      <div
        ref={exportRef}
        style={{
          position: "fixed",
          left: "-9999px",
          top: 0,
          width: 1080,
          minHeight: 1440,
          padding: 54,
          background:
            "radial-gradient(circle at top left, rgba(255,122,24,0.22), transparent 34%), radial-gradient(circle at bottom right, rgba(47,147,255,0.22), transparent 38%), #070b12",
          color: "#ffffff",
          fontFamily: "Inter, system-ui, sans-serif",
          boxSizing: "border-box",
          overflow: "hidden",
        }}
      >
        <img
          src={logoSimpleSrc}
          alt="OSC Watermark"
          style={{
            position: "absolute",
            width: 560,
            height: 700,
            objectFit: "contain",
            opacity: 0.035,
            right: -110,
            bottom: -130,
            pointerEvents: "none",
          }}
        />

        <div
          style={{
            border: "5px solid #ff7a18",
            borderRadius: 34,
            padding: 34,
            minHeight: 1332,
            boxSizing: "border-box",
            background: "rgba(5,10,18,0.84)",
            boxShadow: "0 0 0 5px rgba(47,147,255,0.45)",
            position: "relative",
            zIndex: 2,
          }}
        >
          <ExportHeader title={title} subtitle={subtitle} />

          {children}

          <div
            style={{
              marginTop: 36,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 14,
            }}
          >
            <img
              src={logoSimpleSrc}
              alt="OSC"
              style={{
                width: 32,
                height: 40,
                objectFit: "contain",
                opacity: 0.8,
              }}
            />

            <div
              style={{
                textAlign: "center",
                color: "#d8e8ff",
                fontSize: 22,
                fontWeight: 700,
              }}
            >
              Kroon jij jezelf tot absolute SNG genie van dit seizoen?!
            </div>
          </div>
        </div>
      </div>
    );
  }

  function PosterSngCard({ sng, children }) {
    return (
      <div
        style={{
          background: "rgba(255,255,255,0.075)",
          border: "2px solid rgba(47,147,255,0.42)",
          borderRadius: 24,
          padding: 20,
          minHeight: 240,
          boxSizing: "border-box",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <img
          src={logoSimpleSrc}
          alt="OSC"
          style={{
            position: "absolute",
            right: 14,
            top: 14,
            width: 30,
            height: 38,
            objectFit: "contain",
            opacity: 0.22,
          }}
        />

        <div
          style={{
            background: "linear-gradient(90deg, #ff7a18, #ff9d42)",
            color: "#07101d",
            fontWeight: 1000,
            borderRadius: 16,
            padding: "10px 56px 10px 14px",
            fontSize: 24,
            marginBottom: 14,
          }}
        >
          {sng.naam}
        </div>

        <div
          style={{
            color: "#2f93ff",
            fontWeight: 900,
            fontSize: 22,
            marginBottom: 14,
          }}
        >
          📅 {formatDate(sng.datum)}
        </div>

        <div style={{ display: "grid", gap: 7 }}>{children}</div>
      </div>
    );
  }

  function PosterPlayerRow({ index, name, extra }) {
    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: extra ? "34px 1fr auto" : "34px 1fr",
          alignItems: "center",
          gap: 8,
          fontSize: 21,
          fontWeight: 750,
          padding: "5px 0",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <span style={{ color: "#ff7a18", fontWeight: 1000 }}>
          {index + 1}.
        </span>

        <span>{name}</span>

        {extra && (
          <span
            style={{
              color: "#2f93ff",
              fontSize: 16,
              fontWeight: 900,
            }}
          >
            {extra}
          </span>
        )}
      </div>
    );
  }

  function LotingExport() {
    return (
      <ExportShell
        title={`${ROUND_LABELS[rondeType]?.toUpperCase()} LOTING`}
        subtitle={`${roundSngs.length} SNG’s • ${allPlayersCount} spelers`}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 22,
          }}
        >
          {roundSngs.map((sng) => {
            const spelers = (sng.sng_players || [])
              .map((sp) => sp.player)
              .filter(Boolean)
              .sort((a, b) => a.naam.localeCompare(b.naam));

            return (
              <PosterSngCard key={sng.id} sng={sng}>
                {spelers.map((player, index) => (
                  <PosterPlayerRow
                    key={player.id}
                    index={index}
                    name={player.naam}
                  />
                ))}
              </PosterSngCard>
            );
          })}
        </div>
      </ExportShell>
    );
  }

  function UitslagenExport({ withMoney = false }) {
    const payoutInfo = calculateSngPayouts({
      players,
      season,
      rondeType,
      sngCount: roundSngs.length,
    });

    return (
      <ExportShell
        title={
          withMoney
            ? `${ROUND_LABELS[rondeType]?.toUpperCase()} UITSLAGEN + PRIJZEN`
            : `${ROUND_LABELS[rondeType]?.toUpperCase()} UITSLAGEN`
        }
        subtitle={`${roundSngs.length} SNG’s • ${allPlayersCount} spelers`}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 22,
          }}
        >
          {roundSngs.map((sng) => {
            const resultaten = (sng.sng_players || [])
              .slice()
              .filter((sp) => sp.eindpositie)
              .sort((a, b) => a.eindpositie - b.eindpositie);

            return (
              <PosterSngCard key={sng.id} sng={sng}>
                {resultaten.length === 0 ? (
                  <div style={{ color: "#d8e8ff", fontSize: 20 }}>
                    Nog geen uitslag ingevoerd.
                  </div>
                ) : (
                  resultaten.map((sp) => {
                    const positie = Number(sp.eindpositie);
                    const prijs = Number(payoutInfo.payouts?.[positie] || 0);

                    let extra = "";

                    if (withMoney) {
                      extra = prijs > 0 ? formatEuro(prijs) : "";
                    } else if (sp.geplaatst) {
                      extra = "✅ Door";
                    } else if (sp.busts) {
                      extra = `${sp.busts} busts`;
                    }

                    return (
                      <PosterPlayerRow
                        key={sp.id}
                        index={positie - 1}
                        name={sp.player?.naam || "Onbekend"}
                        extra={extra}
                      />
                    );
                  })
                )}
              </PosterSngCard>
            );
          })}
        </div>
      </ExportShell>
    );
  }

  function GeplaatstenExport() {
    return (
      <ExportShell
        title={`${ROUND_LABELS[rondeType]?.toUpperCase()} GEPLAATST`}
        subtitle={`${placedPlayers.length} spelers geplaatst`}
      >
        <div style={{ display: "grid", gap: 12 }}>
          {placedPlayers.length === 0 ? (
            <div
              style={{
                fontSize: 26,
                textAlign: "center",
                color: "#d8e8ff",
              }}
            >
              Nog geen geplaatste spelers.
            </div>
          ) : (
            placedPlayers.map((sp, index) => (
              <div
                key={sp.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "54px 1fr auto",
                  gap: 14,
                  alignItems: "center",
                  padding: "14px 18px",
                  borderRadius: 18,
                  background: "rgba(255,255,255,0.075)",
                  border: "2px solid rgba(47,147,255,0.35)",
                  fontSize: 24,
                  fontWeight: 800,
                }}
              >
                <span style={{ color: "#ff7a18", fontWeight: 1000 }}>
                  {index + 1}.
                </span>

                <span>{sp.player?.naam || "Onbekend"}</span>

                <span style={{ color: "#2f93ff", fontSize: 18 }}>
                  {sp.sngNaam}
                </span>
              </div>
            ))
          )}
        </div>
      </ExportShell>
    );
  }

  function SngOverzichtExport() {
    return (
      <ExportShell
        title={`${ROUND_LABELS[rondeType]?.toUpperCase()} OVERZICHT`}
        subtitle={`${roundSngs.length} SNG’s • ${allPlayersCount} spelers`}
      >
        <div style={{ display: "grid", gap: 18 }}>
          {roundSngs.map((sng) => {
            const spelers = sng.sng_players || [];

            return (
              <div
                key={sng.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto auto auto",
                  gap: 18,
                  alignItems: "center",
                  padding: 18,
                  borderRadius: 20,
                  background: "rgba(255,255,255,0.075)",
                  border: "2px solid rgba(47,147,255,0.35)",
                  fontSize: 22,
                  fontWeight: 800,
                }}
              >
                <span>{sng.naam}</span>

                <span style={{ color: "#2f93ff" }}>
                  {formatDate(sng.datum)}
                </span>

                <span>{spelers.length} spelers</span>

                <span>{sng.locked ? "🔒" : "🔓"}</span>
              </div>
            );
          })}
        </div>
      </ExportShell>
    );
  }

  function SpelersOverzichtExport({ withMoney = false }) {
    const activeCount = playerRows.filter((r) => r.status === "Actief").length;
    const eliminatedCount = playerRows.filter(
      (r) => r.status === "Uitgeschakeld"
    ).length;
    const totalWon = playerRows.reduce(
      (sum, r) => sum + Number(r.totaalGewonnen || 0),
      0
    );

    return (
      <ExportShell
        title={withMoney ? "SPELERS + PRIJZEN" : "SPELERS OVERZICHT"}
        subtitle={
          withMoney
            ? `${playerRows.length} spelers • ${activeCount} actief • ${formatEuro(
                totalWon
              )} gewonnen`
            : `${playerRows.length} spelers • ${activeCount} actief • ${eliminatedCount} uitgeschakeld`
        }
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10,
          }}
        >
          {playerRows.map((row, index) => (
            <div
              key={row.id}
              style={{
                display: "grid",
                gridTemplateColumns: withMoney
                  ? "38px 1fr auto"
                  : "38px 1fr",
                gap: 10,
                alignItems: "center",
                padding: "9px 11px",
                borderRadius: 14,
                background: "rgba(255,255,255,0.075)",
                border: "1px solid rgba(47,147,255,0.28)",
                fontSize: 16,
                fontWeight: 800,
                minHeight: 44,
              }}
            >
              <span
                style={{
                  color: "#ff7a18",
                  fontWeight: 1000,
                  fontSize: 18,
                }}
              >
                {index + 1}.
              </span>

              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 17,
                    fontWeight: 950,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {row.naam}
                </div>

                <div
                  style={{
                    marginTop: 2,
                    color: "#d8e8ff",
                    fontSize: 12,
                    fontWeight: 700,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {row.statusIcon} {row.status} • {row.uitgeschakeldIn} •{" "}
                  {row.gespeeldeSngs} SNG • {row.totalBusts} busts
                </div>
              </div>

              {withMoney && (
                <span
                  style={{
                    color: row.totaalGewonnen > 0 ? "#ff9d42" : "#d8e8ff",
                    fontWeight: 1000,
                    fontSize: 15,
                    whiteSpace: "nowrap",
                  }}
                >
                  {formatEuro(row.totaalGewonnen)}
                </span>
              )}
            </div>
          ))}
        </div>
      </ExportShell>
    );
  }

  return (
    <div className="card">
      <h2>Exports</h2>

      <p style={{ color: "#9fb3c8" }}>
        Maak hier centrale exports in OSC-stijl.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 16,
          marginTop: 18,
        }}
      >
        <div>
          <label style={labelStyle}>Exporttype</label>

          <select
            value={exportType}
            onChange={(e) => setExportType(e.target.value)}
            style={inputStyle}
          >
            <option value="loting">Loting</option>
            <option value="uitslagen">Uitslagen</option>
            <option value="uitslagen_geld">Uitslagen met geldbedragen</option>
            <option value="geplaatsten">Geplaatste spelers</option>
            <option value="sng_overzicht">SNG overzicht</option>
            <option value="spelersoverzicht">Spelersoverzicht</option>
            <option value="spelersoverzicht_geld">
              Spelersoverzicht met geldbedragen
            </option>
          </select>
        </div>

        {!isPlayersExport && (
          <div>
            <label style={labelStyle}>Ronde</label>

            <select
              value={rondeType}
              onChange={(e) => setRondeType(e.target.value)}
              style={inputStyle}
            >
              {RONDES.map((ronde) => (
                <option key={ronde} value={ronde}>
                  {ROUND_LABELS[ronde]}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div
        style={{
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          marginTop: 22,
        }}
      >
        <button onClick={exportImage} disabled={exporting}>
          {exporting ? "Exporteren..." : "📸 Download export"}
        </button>

        <button onClick={downloadAvailabilityTemplate}>
          📥 Download beschikbaarheid-template (.xls)
        </button>
      </div>

      {msg && (
        <p
          className={
            msg.includes("gemaakt") || msg.includes("gedownload")
              ? "success"
              : "error"
          }
        >
          {msg}
        </p>
      )}

      {exportType === "loting" && <LotingExport />}
      {exportType === "uitslagen" && <UitslagenExport withMoney={false} />}
      {exportType === "uitslagen_geld" && <UitslagenExport withMoney={true} />}
      {exportType === "geplaatsten" && <GeplaatstenExport />}
      {exportType === "sng_overzicht" && <SngOverzichtExport />}
      {exportType === "spelersoverzicht" && (
        <SpelersOverzichtExport withMoney={false} />
      )}
      {exportType === "spelersoverzicht_geld" && (
        <SpelersOverzichtExport withMoney={true} />
      )}
    </div>
  );
}