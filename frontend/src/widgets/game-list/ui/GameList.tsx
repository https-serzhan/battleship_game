import type { LobbyGame } from '../../../entities/game/model/types'
import { shipConfigSummary } from '../../../entities/game/model/helpers'
import { JoinGameButton } from '../../../features/join-game/ui/JoinGameButton'
import { Card } from '../../../shared/ui/Card'

interface GameListProps {
  games: LobbyGame[]
  currentPlayerId: number
  onJoinGame: (gameId: number) => void
}

export const GameList = ({
  games,
  currentPlayerId,
  onJoinGame,
}: GameListProps) => (
  <Card className="space-y-4 p-5">
    <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[#747878]">
          Open sessions
        </p>
        <h2 className="mt-1 text-xl font-semibold text-[#191c1d]">Waiting games</h2>
      </div>
      <span className="font-mono text-xs uppercase tracking-[0.14em] text-[#747878]">
        {games.length} available
      </span>
    </div>
    {games.length === 0 ? (
      <div className="rounded-xl border border-dashed border-[#c4c7c7] bg-[#f8f9fa] p-6 text-sm text-[#444748]">
        No open sessions yet. Create the first battle.
      </div>
    ) : (
      <div className="grid gap-3">
        {games.map((game) => (
          <div
            key={game.id}
            className="flex flex-col gap-4 rounded-xl border border-[#c4c7c7] bg-[#f8f9fa] p-4 md:flex-row md:items-center md:justify-between"
          >
            <div className="space-y-2 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-[#191c1d]">{game.creatorDisplayName}</p>
                <span className="rounded-full border border-[#c4c7c7] bg-white px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-[#444748]">
                  {game.status}
                </span>
              </div>
              <p className="text-[#444748]">
                {game.gridSize}x{game.gridSize}, {shipConfigSummary(game.shipConfig)}
              </p>
              <p className="font-mono text-xs uppercase tracking-[0.14em] text-[#747878]">
                Mode {game.mode}
              </p>
            </div>
            <JoinGameButton
              gameId={game.id}
              disabled={game.creatorId === currentPlayerId}
              onJoinGame={onJoinGame}
            />
          </div>
        ))}
      </div>
    )}
  </Card>
)
