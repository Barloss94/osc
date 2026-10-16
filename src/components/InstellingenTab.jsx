import { useEffect, useState } from "react";
import { supabase } from "../supabase";

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

const defaultSpeeldata = {
  ronde1: ["2026-06-10", "2026-06-15", "2026-06-23", "2026-06-28", "2026-07-11"],
  kwartfinales: ["2026-09-08", "2026-09-14", "2026-09-20", "2026-09-26"],
  halve_finales: ["2026-10-14", "2026-10-20"],
  finale: ["2026-11-21"],
};

const emptySpeeldata = {
  ronde1: ["", "", "", "", ""],
  kwartfinales: ["", "", "", ""],
  halve_finales: ["", ""],
  finale: [""],
};

export default function InstellingenTab({ season, profile, onRefresh }) {
  const [naam, setNaam] = useState("");
  const [jaar, setJaar] = useState("");
  const [kosten, setKosten] = useState("");
  const [speeldata, setSpeeldata] = useState(defaultSpeeldata);

  const [newNaam, setNewNaam] = useState("");
  const [newJaar, setNewJaar] = useState("");
  const [newKosten, setNewKosten] = useState("");
  const [newSpeeldata, setNewSpeeldata] = useState(emptySpeeldata);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!season) return;

    setNaam(season.naam || "");
    setJaar(season.jaar || "");
    setKosten(season.kosten ?? "0");

    const json = season.instellingen_json || {};
    setSpeeldata(json.speeldata || defaultSpeeldata);
  }, [season]);

  async function createLog(actie, details, seasonId = season?.id) {
    await supabase.from("activity_logs").insert({
      season_id: seasonId || null,
      actie,
      user_name: profile?.naam || profile?.email || "Onbekend",
      user_email: profile?.email || null,
      details_json: details,
    });
  }

  function updateDate(group, index, value) {
    setSpeeldata((prev) => ({
      ...prev,
      [group]: prev[group].map((d, i) => (i === index ? value : d)),
    }));
  }

  function updateNewDate(group, index, value) {
    setNewSpeeldata((prev) => ({
      ...prev,
      [group]: prev[group].map((d, i) => (i === index ? value : d)),
    }));
  }

  async function saveSettings() {
    setMsg("");

    if (!season?.id) {
      setMsg("Geen seizoen gevonden.");
      return;
    }

    const instellingen_json = {
      ...(season.instellingen_json || {}),
      speeldata,
    };

    const { error } = await supabase
      .from("seasons")
      .update({
        naam,
        jaar: jaar ? Number(jaar) : null,
        kosten: kosten === "" ? 0 : Number(kosten),
        instellingen_json,
      })
      .eq("id", season.id);

    if (error) {
      setMsg(error.message);
      return;
    }

    await createLog("settings_updated", {
      seizoen: naam,
      jaar,
      kosten: kosten === "" ? 0 : Number(kosten),
      speeldata,
    });

    setMsg("Instellingen opgeslagen.");
    onRefresh?.();
  }

  async function createSeason() {
    setMsg("");

    if (!newNaam.trim()) {
      setMsg("Vul een seizoensnaam in.");
      return;
    }

    if (!newJaar) {
      setMsg("Vul een jaartal in.");
      return;
    }

    const confirmed = window.confirm(
      `Nieuw seizoen aanmaken?\n\n${newNaam} (${newJaar})`
    );

    if (!confirmed) return;

    const { data: newSeason, error: seasonError } = await supabase
      .from("seasons")
      .insert({
        naam: newNaam,
        jaar: Number(newJaar),
        kosten: newKosten === "" ? 0 : Number(newKosten),
        instellingen_json: {
          speeldata: newSpeeldata,
        },
      })
      .select()
      .single();

    if (seasonError) {
      setMsg(seasonError.message);
      return;
    }

    const rounds = [
      {
        season_id: newSeason.id,
        ronde_type: "voorronde",
        naam: "Ronde 1",
        sort_order: 1,
      },
      {
        season_id: newSeason.id,
        ronde_type: "kwartfinale",
        naam: "Kwartfinales",
        sort_order: 2,
      },
      {
        season_id: newSeason.id,
        ronde_type: "halve_finale",
        naam: "Halve finales",
        sort_order: 3,
      },
      {
        season_id: newSeason.id,
        ronde_type: "finale",
        naam: "Finale",
        sort_order: 4,
      },
    ];

    const { error: roundsError } = await supabase.from("rounds").insert(rounds);

    if (roundsError) {
      setMsg(roundsError.message);
      return;
    }

    await createLog(
      "season_created",
      {
        seizoen: newNaam,
        jaar: newJaar,
        kosten: newKosten === "" ? 0 : Number(newKosten),
        speeldata: newSpeeldata,
      },
      newSeason.id
    );

    setNewNaam("");
    setNewJaar("");
    setNewKosten("");
    setNewSpeeldata(emptySpeeldata);
    setMsg("Nieuw seizoen aangemaakt.");
    onRefresh?.();
  }

  async function changePassword() {
    setMsg("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setMsg("Vul alle wachtwoordvelden in.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setMsg("Nieuwe wachtwoorden komen niet overeen.");
      return;
    }

    if (newPassword.length < 6) {
      setMsg("Nieuw wachtwoord moet minimaal 6 tekens zijn.");
      return;
    }

    const email = profile?.email;

    if (!email) {
      setMsg("Geen e-mailadres gevonden.");
      return;
    }

    const { error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password: currentPassword,
    });

    if (loginError) {
      setMsg("Huidig wachtwoord is onjuist.");
      return;
    }

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      setMsg(error.message);
      return;
    }

    await createLog("password_changed", {
      gebruiker: profile?.naam || profile?.email,
    });

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setMsg("Wachtwoord gewijzigd.");
  }

  function DateGroup({ title, group, data, onChange }) {
    return (
      <div
        style={{
          padding: 16,
          borderRadius: 18,
          background: "rgba(255,255,255,0.055)",
          border: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <h3 style={{ marginTop: 0 }}>{title}</h3>

        {(data[group] || []).map((date, index) => (
          <div key={index}>
            <label style={labelStyle}>Datum {index + 1}</label>
            <input
              type="date"
              value={date || ""}
              onChange={(e) => onChange(group, index, e.target.value)}
              style={inputStyle}
            />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <div className="card">
        <h2>Instellingen</h2>

        <p style={{ color: "#9fb3c8" }}>
          Beheer hier het actieve seizoen, de kosten en de vaste speeldata per ronde.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 16,
            marginTop: 18,
          }}
        >
          <div>
            <label style={labelStyle}>Seizoensnaam</label>
            <input
              value={naam}
              onChange={(e) => setNaam(e.target.value)}
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Jaar</label>
            <input
              type="number"
              value={jaar}
              onChange={(e) => setJaar(e.target.value)}
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Kosten</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={kosten}
              onChange={(e) => setKosten(e.target.value)}
              placeholder="Bijv. 50"
              style={inputStyle}
            />
          </div>
        </div>

        <h3 style={{ marginTop: 28 }}>Speeldata actieve seizoen</h3>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 18,
          }}
        >
          <DateGroup title="Ronde 1" group="ronde1" data={speeldata} onChange={updateDate} />
          <DateGroup title="Kwartfinales" group="kwartfinales" data={speeldata} onChange={updateDate} />
          <DateGroup title="Halve finales" group="halve_finales" data={speeldata} onChange={updateDate} />
          <DateGroup title="Finale" group="finale" data={speeldata} onChange={updateDate} />
        </div>

        <button onClick={saveSettings} style={{ marginTop: 22 }}>
          Instellingen opslaan
        </button>
      </div>

      <div className="card">
        <h2>Nieuw seizoen aanmaken</h2>

        <p style={{ color: "#9fb3c8" }}>
          Maak een nieuw seizoen aan inclusief standaard rondes. Kosten en speeldata kunnen direct worden ingevuld.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 16,
          }}
        >
          <div>
            <label style={labelStyle}>Nieuwe seizoensnaam</label>
            <input
              value={newNaam}
              onChange={(e) => setNewNaam(e.target.value)}
              placeholder="Bijv. OSC 2027"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Jaar</label>
            <input
              type="number"
              value={newJaar}
              onChange={(e) => setNewJaar(e.target.value)}
              placeholder="2027"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Kosten</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={newKosten}
              onChange={(e) => setNewKosten(e.target.value)}
              placeholder="Bijv. 50"
              style={inputStyle}
            />
          </div>
        </div>

        <h3 style={{ marginTop: 28 }}>Speeldata nieuw seizoen</h3>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 18,
          }}
        >
          <DateGroup title="Ronde 1" group="ronde1" data={newSpeeldata} onChange={updateNewDate} />
          <DateGroup title="Kwartfinales" group="kwartfinales" data={newSpeeldata} onChange={updateNewDate} />
          <DateGroup title="Halve finales" group="halve_finales" data={newSpeeldata} onChange={updateNewDate} />
          <DateGroup title="Finale" group="finale" data={newSpeeldata} onChange={updateNewDate} />
        </div>

        <button onClick={createSeason} style={{ marginTop: 22 }}>
          Nieuw seizoen aanmaken
        </button>
      </div>

      <div className="card">
        <h2>Account instellingen</h2>

        <p style={{ color: "#9fb3c8" }}>Wijzig hier je wachtwoord.</p>

        <label style={labelStyle}>Huidig wachtwoord</label>
        <input
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          style={inputStyle}
        />

        <label style={labelStyle}>Nieuw wachtwoord</label>
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          style={inputStyle}
        />

        <label style={labelStyle}>Bevestig nieuw wachtwoord</label>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          style={inputStyle}
        />

        <button onClick={changePassword} style={{ marginTop: 22 }}>
          Wachtwoord wijzigen
        </button>
      </div>

      {msg && (
        <p
          className={
            msg.includes("opgeslagen") ||
            msg.includes("aangemaakt") ||
            msg.includes("gewijzigd")
              ? "success"
              : "error"
          }
        >
          {msg}
        </p>
      )}
    </div>
  );
}