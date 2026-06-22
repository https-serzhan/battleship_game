import type { GameMode, LobbyGame, ShipConfigItem } from '../../../entities/game/model/types'
import type { Player } from '../../../entities/player/model/types'
import type { Stats } from '../../../entities/stats/model/types'
import { CreateGamePanel } from '../../../widgets/create-game-panel/ui/CreateGamePanel'
import { GameList } from '../../../widgets/game-list/ui/GameList'
import { LobbyHeader } from '../../../widgets/lobby-header/ui/LobbyHeader'
import { Card } from '../../../shared/ui/Card'

interface LobbyPageProps {
  player: Player
  stats: Stats | null
  games: LobbyGame[]
  connectionStatus: string
  errorMessage: string | null
  onCreateGame: (gridSize: number, shipConfig: ShipConfigItem[], mode: GameMode) => void
  onJoinGame: (gameId: number) => void
  onResetSession: () => void
}

const LobbyPage = ({
  player,
  stats,
  games,
  connectionStatus,
  errorMessage,
  onCreateGame,
  onJoinGame,
  onResetSession,
}: LobbyPageProps) => (
  <main className="bg-command-grid min-h-screen">
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-5 sm:px-6 lg:px-8">
      <LobbyHeader
        player={player}
        stats={stats}
        connectionStatus={connectionStatus}
        onResetSession={onResetSession}
      />
      {errorMessage ? (
        <div className="rounded-xl border border-[#ba1a1a]/30 bg-white px-4 py-3 text-sm text-[#ba1a1a] shadow-[0_12px_30px_rgba(25,28,29,0.04)]">
          {errorMessage}
        </div>
      ) : null}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[#747878]">
            Games played
          </p>
          <p className="mt-2 font-mono text-3xl font-semibold text-[#191c1d]">
            {stats?.gamesPlayed ?? 0}
          </p>
        </Card>
        <Card className="p-4">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[#747878]">
            Wins
          </p>
          <p className="mt-2 font-mono text-3xl font-semibold text-[#191c1d]">
            {stats?.wins ?? 0}
          </p>
        </Card>
        <Card className="p-4">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[#747878]">
            Losses
          </p>
          <p className="mt-2 font-mono text-3xl font-semibold text-[#191c1d]">
            {stats?.losses ?? 0}
          </p>
        </Card>
        <Card className="p-4">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[#747878]">
            Accuracy
          </p>
          <p className="mt-2 font-mono text-3xl font-semibold text-[#191c1d]">
            {stats?.shots ? Math.round((stats.hits / stats.shots) * 100) : 0}%
          </p>
        </Card>
      </section>
      <div className="grid gap-5 lg:grid-cols-[390px_1fr]">
        <CreateGamePanel onCreateGame={onCreateGame} />
        <GameList
          games={games}
          currentPlayerId={player.id}
          onJoinGame={onJoinGame}
        />
      </div>
    </div>
  </main>
)

export default LobbyPage
