import RoundLoting from "./rounds/RoundLoting";
import { filterSngsByRound } from "../utils/rounds";

function getPlacedPlayersFromRound(sngs, rondeType, players) {
  const placedIds = new Set(
    filterSngsByRound(sngs, rondeType)
      .flatMap((sng) => sng.sng_players || [])
      .filter((sp) => sp.geplaatst)
      .map((sp) => sp.player?.id)
      .filter(Boolean)
  );

  return players.filter((player) => placedIds.has(player.id));
}

export default function LotingTab({
  season,
  rounds,
  players,
  sngs,
  profile,
  onRefresh,
}) {
  const kwartfinalisten = getPlacedPlayersFromRound(
    sngs,
    "voorronde",
    players
  );

  const halveFinalisten = getPlacedPlayersFromRound(
    sngs,
    "kwartfinale",
    players
  );

  const finalisten = getPlacedPlayersFromRound(
    sngs,
    "halve_finale",
    players
  );

  return (
    <div className="grid">
      <RoundLoting
        season={season}
        rounds={rounds}
        players={players}
        sngs={sngs}
        rondeType="voorronde"
        sourcePlayers={players}
        profile={profile}
        onRefresh={onRefresh}
      />

      <RoundLoting
        season={season}
        rounds={rounds}
        players={players}
        sngs={sngs}
        rondeType="kwartfinale"
        sourcePlayers={kwartfinalisten}
        profile={profile}
        onRefresh={onRefresh}
      />

      <RoundLoting
        season={season}
        rounds={rounds}
        players={players}
        sngs={sngs}
        rondeType="halve_finale"
        sourcePlayers={halveFinalisten}
        profile={profile}
        onRefresh={onRefresh}
      />

      <RoundLoting
        season={season}
        rounds={rounds}
        players={players}
        sngs={sngs}
        rondeType="finale"
        sourcePlayers={finalisten}
        profile={profile}
        onRefresh={onRefresh}
      />
    </div>
  );
}