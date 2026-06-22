import type { GameView, Ship } from '../../../entities/game/model/types'
import type { Player } from '../../../entities/player/model/types'
import { FireShotHandler } from '../../../features/fire-shot/ui/FireShotHandler'
import { ShipPlacementControls } from '../../../features/place-ships/ui/ShipPlacementControls'
import { Button } from '../../../shared/ui/Button'
import { Card } from '../../../shared/ui/Card'
import { GameBoard } from '../../../widgets/game-board/ui/GameBoard'

interface GameRoomPageProps {
  player: Player
  game: GameView
  errorMessage: string | null
  onPlaceShips: (gameId: number, ships: Ship[]) => void
  onFire: (gameId: number, x: number, y: number) => void
  onLeaveGame: (gameId: number) => void
  onOpenReplay: () => void
}

const GameRoomPage = ({
  player,
  game,
  errorMessage,
  onPlaceShips,
  onFire,
  onLeaveGame,
  onOpenReplay,
}: GameRoomPageProps) => {
  const ownPlayer = game.players.find((participant) => participant.playerId === player.id)
  const opponent = game.players.find((participant) => participant.playerId !== player.id)
  const matchup = game.players.map((participant) => participant.displayName).join(' vs ')
  const currentTurnName =
    game.players.find((participant) => participant.playerId === game.currentTurnPlayerId)
      ?.displayName ?? 'Nobody'
  const winnerName =
    game.players.find((participant) => participant.playerId === game.winnerPlayerId)
      ?.displayName ?? null
  const canFire = game.status === 'in_progress' && game.currentTurnPlayerId === player.id
  const finishedByForfeit =
    game.status === 'finished' &&
    Boolean(game.winnerPlayerId) &&
    !game.moves.some((move) => move.result === 'win')
  const resultMessage =
    game.status === 'finished' && game.winnerPlayerId
      ? finishedByForfeit
        ? game.winnerPlayerId === player.id
          ? 'Opponent left the game. You win by forfeit.'
          : 'You left the game. You forfeited.'
        : game.winnerPlayerId === player.id
          ? 'You won.'
          : 'You lost.'
      : null
  const statusLabel =
    game.status === 'waiting'
      ? 'Waiting'
      : game.status === 'setup'
      ? 'Setup'
      : game.status === 'finished'
        ? 'Finished'
        : canFire
          ? 'Your turn'
          : 'Opponent turn'

  return (
    <main className="bg-command-grid min-h-screen">
      <div className="mx-auto max-w-7xl space-y-5 px-4 py-5 sm:px-6 lg:px-8">
        <div className="rounded-xl border border-[#c4c7c7] bg-white/90 p-4 shadow-[0_12px_30px_rgba(25,28,29,0.04)]">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-[#747878]">
                BattleGrid · Game #{game.id}
              </p>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-[#191c1d]">
                  {matchup || 'Awaiting opponent'}
                </h1>
                <p className="text-sm text-[#444748]">
                  Turn: <span className="font-semibold text-[#191c1d]">{currentTurnName}</span>
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-[#c4c7c7] bg-[#f3f4f5] px-3 py-1 font-mono text-xs uppercase tracking-[0.14em] text-[#444748]">
                {statusLabel}
              </span>
              {game.status === 'finished' ? (
                <Button variant="outline" onClick={onOpenReplay}>
                  Replay
                </Button>
              ) : null}
              <Button variant="ghost" onClick={() => onLeaveGame(game.id)}>
                {game.status === 'finished' ? 'Back to lobby' : 'Leave game'}
              </Button>
            </div>
          </div>
        </div>
        {errorMessage ? (
          <div className="rounded-xl border border-[#ba1a1a]/30 bg-white px-4 py-3 text-sm text-[#ba1a1a] shadow-[0_12px_30px_rgba(25,28,29,0.04)]">
            {errorMessage}
          </div>
        ) : null}
        {game.status === 'finished' && winnerName ? (
          <div className="rounded-xl border border-[#b7102a]/30 bg-white px-4 py-3 text-sm text-[#191c1d] shadow-[0_12px_30px_rgba(25,28,29,0.04)]">
            <span className="font-semibold text-[#b7102a]">{resultMessage}</span>{' '}
            Winner: <span className="font-semibold text-[#191c1d]">{winnerName}</span>
          </div>
        ) : null}
        <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
          <div className="grid gap-5 lg:grid-cols-2">
            {ownPlayer ? (
              <Card
                className={
                  game.status === 'setup'
                    ? 'space-y-4 p-5 lg:col-span-2'
                    : 'space-y-4 p-5'
                }
              >
                <div>
                  <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[#747878]">
                    {game.status === 'setup' ? 'Fleet Setup' : 'Own Fleet'}
                  </p>
                  <h2 className="mt-1 text-xl font-semibold text-[#191c1d]">
                    {ownPlayer.displayName}
                  </h2>
                </div>
                {game.status === 'setup' ? (
                  <ShipPlacementControls
                    key={`${game.id}-${ownPlayer.ready ? 'ready' : 'setup'}-${ownPlayer.ships.length}`}
                    gameId={game.id}
                    gridSize={game.gridSize}
                    shipConfig={game.shipConfig}
                    initialShips={ownPlayer.ships}
                    ready={ownPlayer.ready}
                    onPlaceShips={onPlaceShips}
                  />
                ) : (
                  <GameBoard
                    gridSize={game.gridSize}
                    ships={ownPlayer.ships}
                    shots={ownPlayer.shots}
                    mode="own"
                  />
                )}
              </Card>
            ) : null}
            {opponent ? (
              <Card className="space-y-4 p-5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[#747878]">
                      Opponent Waters
                    </p>
                    <h2 className="mt-1 text-xl font-semibold text-[#191c1d]">
                      {opponent.displayName}
                    </h2>
                  </div>
                  {game.status === 'in_progress' ? (
                    <span className="font-mono text-xs uppercase tracking-[0.14em] text-[#747878]">
                      {canFire ? 'Target enabled' : 'Target locked'}
                    </span>
                  ) : null}
                </div>
                <FireShotHandler
                  gridSize={game.gridSize}
                  opponent={opponent}
                  canFire={canFire}
                  onFire={(x, y) => onFire(game.id, x, y)}
                />
                {game.status === 'in_progress' && !canFire ? (
                  <p className="rounded-lg border border-[#c4c7c7] bg-[#f3f4f5] px-3 py-2 text-sm text-[#444748]">
                    Waiting for opponent fire.
                  </p>
                ) : null}
              </Card>
            ) : null}
          </div>
          <aside className="space-y-5">
            <Card className="space-y-3 p-5">
              <div>
                <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[#747878]">
                  Crew status
                </p>
                <h2 className="mt-1 text-xl font-semibold text-[#191c1d]">Players</h2>
              </div>
              <div className="space-y-2">
                {game.players.map((participant) => (
                  <div
                    className="rounded-xl border border-[#edeeef] bg-[#f8f9fa] p-3"
                    key={participant.playerId}
                  >
                    <p className="font-semibold text-[#191c1d]">
                      {participant.displayName}
                    </p>
                    <p className="font-mono text-xs uppercase tracking-[0.14em] text-[#747878]">
                      Role {participant.role} · {participant.ready ? 'Ready' : 'Not ready'}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
            {game.status === 'setup' && ownPlayer ? (
              <Card className="space-y-4 p-5">
                <div>
                  <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[#747878]">
                    Setup
                  </p>
                  <h2 className="mt-1 text-xl font-semibold text-[#191c1d]">
                    Readiness
                  </h2>
                </div>
                <p className="text-sm leading-6 text-[#444748]">
                  Place every ship and press Ready. The backend validates the final layout
                  before the match can start.
                </p>
                {ownPlayer.ready ? (
                  <div className="rounded-lg border border-[#c4c7c7] bg-[#f3f4f5] px-3 py-2 text-sm text-[#444748]">
                    Your fleet is ready. Waiting for the opponent.
                  </div>
                ) : null}
              </Card>
            ) : null}
          </aside>
        </div>
      </div>
    </main>
  )
}

export default GameRoomPage
