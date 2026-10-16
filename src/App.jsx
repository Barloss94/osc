import { useEffect, useState } from "react";
import { supabase } from "./supabase";

import DashboardTab from "./components/DashboardTab";
import PlayersTab from "./components/PlayersTab";
import SpelersOverzichtTab from "./components/SpelersOverzichtTab";
import LotingTab from "./components/LotingTab";
import UitslagenTab from "./components/UitslagenTab";
import SngBeheerTab from "./components/SngBeheerTab";
import LogsTab from "./components/LogsTab";
import InstellingenTab from "./components/InstellingenTab";
import ExportsTab from "./components/ExportsTab";
import UitlegTab from "./components/UitlegTab";
import PayoutsTab from "./components/PayoutsTab";

const logoSrc = `${import.meta.env.BASE_URL}logo.png`;

const tabs = [
  ["dashboard", "Dashboard"],
  ["spelers", "Spelers"],
  ["spelersoverzicht", "Spelers overzicht"],
  ["loting", "Loting"],
  ["uitslagen", "Uitslagen"],
  ["payouts", "Prijzen"],
  ["sngs", "SNG’s"],
  ["exports", "Exports"],
  ["logs", "Logs"],
  ["instellingen", "Instellingen"],
  ["uitleg", "Uitleg"],
];

function getStartTab() {
  return window.location.hash.replace("#", "") || "dashboard";
}

export default function App() {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [season, setSeason] = useState(null);
  const [rounds, setRounds] = useState([]);
  const [players, setPlayers] = useState([]);
  const [sngs, setSngs] = useState([]);
  const [tab, setTab] = useState(getStartTab());
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    async function init() {
      const { data } = await supabase.auth.getSession();
      const currentSession = data?.session || null;

      setSession(currentSession);
      setLoading(false);

      if (currentSession?.user) {
        loadProfile(currentSession.user.id);
        loadSeason();
      }
    }

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);

      if (newSession?.user) {
        loadProfile(newSession.user.id);
        loadSeason();
      } else {
        setProfile(null);
        setSeason(null);
        setRounds([]);
        setPlayers([]);
        setSngs([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (season?.id) {
      loadRounds(season.id);
      loadPlayers(season.id);
      loadSngs(season.id);
    }
  }, [season]);

  async function loadProfile(userId) {
    const { data, error } = await supabase
      .from("app_users")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.error("loadProfile error:", error);
      setProfile(null);
      return;
    }

    setProfile(data || null);
  }

  async function loadSeason() {
    const { data, error } = await supabase
      .from("seasons")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("loadSeason error:", error);
      setSeason(null);
      return;
    }

    setSeason(data || null);
  }

  async function loadRounds(seasonId) {
    const { data, error } = await supabase
      .from("rounds")
      .select("*")
      .eq("season_id", seasonId)
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("loadRounds error:", error);
      setRounds([]);
      return;
    }

    setRounds(data || []);
  }

  async function loadPlayers(seasonId = season?.id) {
    if (!seasonId) return;

    const { data, error } = await supabase
      .from("players")
      .select("*")
      .eq("season_id", seasonId)
      .order("naam", { ascending: true });

    if (error) {
      console.error("loadPlayers error:", error);
      setPlayers([]);
      return;
    }

    setPlayers(data || []);
  }

  async function loadSngs(seasonId = season?.id) {
    if (!seasonId) {
      setSngs([]);
      return;
    }

    const { data, error } = await supabase
      .from("sngs")
      .select(`
        *,
        sng_players (
          id,
          season_id,
          round_id,
          sng_id,
          player_id,
          status,
          eindpositie,
          geplaatst,
          busts,
          stack_bij_eliminatie,
          player:players (
            id,
            naam
          )
        )
      `)
      .eq("season_id", seasonId)
      .order("datum", { ascending: true });

    if (error) {
      console.error("loadSngs error:", error);
      setSngs([]);
      return;
    }

    setSngs(data || []);
  }

  function goToTab(nextTab) {
    setTab(nextTab);
    window.location.hash = nextTab;
    setMobileMenuOpen(false);
  }

  async function logout() {
    await supabase.auth.signOut();
  }

  if (loading) {
    return <div className="page center">Laden...</div>;
  }

  if (!session) {
    return <AuthScreen />;
  }

  if (!profile || !profile.active || profile.role !== "admin") {
    return (
      <div className="page center">
        <div className="card">
          <h1>Geen toegang</h1>
          <p>Dit account heeft geen adminrechten.</p>
          <button onClick={logout} type="button">
            Uitloggen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className={`topbar ${mobileMenuOpen ? "menu-open" : ""}`}>
        <div className="brand">
          <img src={logoSrc} alt="OSC Logo" />

          <div className="brand-text">
            <h1>OSC Manager</h1>
            <p>Sit&amp;Go for it!</p>
          </div>
        </div>

        <button
          className="mobile-menu-btn"
          onClick={() => setMobileMenuOpen((prev) => !prev)}
          aria-label="Menu openen"
          type="button"
        >
          ☰
        </button>

        <nav className={`tabs ${mobileMenuOpen ? "mobile-open" : ""}`}>
          {tabs.map(([key, label]) => (
            <button
              key={key}
              className={tab === key ? "active" : ""}
              onClick={() => goToTab(key)}
              type="button"
            >
              {label}
            </button>
          ))}
        </nav>

        <div className="userbox">
          <strong>{profile?.naam || profile?.email}</strong>
          <button onClick={logout} type="button">
            Uitloggen
          </button>
        </div>
      </header>

      <main className="content">
        {tab === "dashboard" && (
          <DashboardTab season={season} players={players} sngs={sngs} />
        )}

        {tab === "spelers" && (
          <PlayersTab
            season={season}
            players={players}
            onRefresh={() => loadPlayers(season?.id)}
          />
        )}

        {tab === "spelersoverzicht" && (
          <SpelersOverzichtTab
            players={players}
            sngs={sngs}
            season={season}
          />
        )}

        {tab === "loting" && (
          <LotingTab
            season={season}
            rounds={rounds}
            players={players}
            sngs={sngs}
            profile={profile}
            onRefresh={() => loadSngs(season?.id)}
          />
        )}

        {tab === "uitslagen" && (
          <UitslagenTab
            season={season}
            rounds={rounds}
            players={players}
            sngs={sngs}
            profile={profile}
            onRefresh={() => loadSngs(season?.id)}
          />
        )}

        {tab === "payouts" && (
          <PayoutsTab season={season} players={players} sngs={sngs} />
        )}

        {tab === "sngs" && (
          <SngBeheerTab
            sngs={sngs}
            profile={profile}
            onRefresh={() => loadSngs(season?.id)}
          />
        )}

        {tab === "exports" && (
          <ExportsTab season={season} players={players} sngs={sngs} />
        )}

        {tab === "logs" && <LogsTab />}

        {tab === "instellingen" && (
          <InstellingenTab
            season={season}
            profile={profile}
            onRefresh={loadSeason}
          />
        )}

        {tab === "uitleg" && <UitlegTab />}

        {tab !== "dashboard" &&
          tab !== "spelers" &&
          tab !== "spelersoverzicht" &&
          tab !== "loting" &&
          tab !== "uitslagen" &&
          tab !== "payouts" &&
          tab !== "sngs" &&
          tab !== "exports" &&
          tab !== "logs" &&
          tab !== "instellingen" &&
          tab !== "uitleg" && (
            <Placeholder title={tabs.find(([k]) => k === tab)?.[1]} />
          )}
      </main>
    </div>
  );
}

function Placeholder({ title }) {
  return (
    <div className="card">
      <h2>{title}</h2>
      <p>Dit onderdeel bouwen we hierna verder uit.</p>
    </div>
  );
}

function AuthScreen() {
  const [mode, setMode] = useState("login");

  return (
    <div className="page center">
      <div className="auth-card">
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 14,
            marginBottom: 20,
          }}
        >
          <img
            src={logoSrc}
            alt="OSC Logo"
            style={{
              width: 84,
              height: 84,
              objectFit: "contain",
            }}
          />

          <div style={{ textAlign: "center" }}>
            <h1 style={{ margin: 0 }}>OSC Cup Manager</h1>
            <p className="slogan">Sit&amp;Go for it!</p>
          </div>
        </div>

        {mode === "login" ? <LoginForm /> : <RegisterForm />}

        <button
          className="linkbtn"
          onClick={() => setMode(mode === "login" ? "register" : "login")}
          type="button"
        >
          {mode === "login"
            ? "Nog geen account? Registreren"
            : "Al een account? Inloggen"}
        </button>
      </div>
    </div>
  );
}

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

  async function login(e) {
    e.preventDefault();
    setMsg("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) setMsg(error.message);
  }

  return (
    <form onSubmit={login} className="form">
      <input
        type="email"
        placeholder="E-mailadres"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <input
        type="password"
        placeholder="Wachtwoord"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <button type="submit">Inloggen</button>

      {msg && <p className="error">{msg}</p>}
    </form>
  );
}

function RegisterForm() {
  const [naam, setNaam] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

  async function register(e) {
    e.preventDefault();
    setMsg("");

    const { data: allowed } = await supabase.rpc("is_allowed_admin_email", {
      input_email: email,
    });

    if (!allowed) {
      setMsg("E-mail niet toegestaan.");
      return;
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { naam },
      },
    });

    if (error) {
      setMsg(error.message);
      return;
    }

    setMsg("Account aangemaakt.");
  }

  return (
    <form onSubmit={register} className="form">
      <input
        type="text"
        placeholder="Naam"
        value={naam}
        onChange={(e) => setNaam(e.target.value)}
      />

      <input
        type="email"
        placeholder="E-mailadres"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <input
        type="password"
        placeholder="Wachtwoord"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <button type="submit">Registreren</button>

      {msg && (
        <p className={msg.includes("aangemaakt") ? "success" : "error"}>
          {msg}
        </p>
      )}
    </form>
  );
}