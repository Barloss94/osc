import RoundResults from "./rounds/RoundResults";

export default function UitslagenTab({
  season,
  rounds,
  players,
  sngs,
  profile,
  onRefresh,
}) {
  return (
    <div
      style={{
        display: "grid",
        gap: 20,
      }}
    >
      <RoundResults
        season={season}
        rounds={rounds}
        players={players}
        sngs={sngs}
        rondeType="voorronde"
        profile={profile}
        onRefresh={onRefresh}
      />

      <RoundResults
        season={season}
        rounds={rounds}
        players={players}
        sngs={sngs}
        rondeType="kwartfinale"
        profile={profile}
        onRefresh={onRefresh}
      />

      <RoundResults
        season={season}
        rounds={rounds}
        players={players}
        sngs={sngs}
        rondeType="halve_finale"
        profile={profile}
        onRefresh={onRefresh}
      />

      <RoundResults
        season={season}
        rounds={rounds}
        players={players}
        sngs={sngs}
        rondeType="finale"
        profile={profile}
        onRefresh={onRefresh}
      />
    </div>
  );
}