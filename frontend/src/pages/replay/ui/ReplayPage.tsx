import { useEffect, useMemo, useState } from 'react'
import clsx from 'clsx'
import type {
  BoardShot,
  CellCoord,
  ErrorMessagePayload,
  ReplayData,
  ReplayDataPayload,
  ReplayMove,
  ReplayPlayer,
} from '../../../entities/game/model/types'
import { socket } from '../../../shared/api/socket'
import { Button } from '../../../shared/ui/Button'
import { Card } from '../../../shared/ui/Card'
import { GameBoard } from '../../../widgets/game-board/ui/GameBoard'

interface ReplayPageProps {
  gameId: number
  onBackToLobby: () => void
}

const coordLabel = (cell: CellCoord): string =>
  `${String.fromCharCode(65 + cell.x)}${cell.y + 1}`

const buildShotsForPlayer = (
  targetPlayer: ReplayPlayer,
  moves: ReplayMove[],
): BoardShot[] =>
  moves
    .filter((move) => move.playerId !== targetPlayer.playerId)
    .map((move) => ({
      x: move.x,
      y: move.y,
      result: move.result,
    }))

const getHighlightedCell = (
  targetPlayer: ReplayPlayer,
  currentMove: ReplayMove | null,
): CellCoord | null => {
  if (!currentMove || currentMove.playerId === targetPlayer.playerId) {
    return null
  }

  return {
    x: currentMove.x,
    y: currentMove.y,
  }
}

const ReplayPage = ({ gameId, onBackToLobby }: ReplayPageProps) => {
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1)
  const [isPlaying, setIsPlaying] = useState(false)
  const [replayData, setReplayData] = useState<ReplayData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const handleReplayData = (payload: ReplayDataPayload) => {
      if (payload.replay.game.id !== gameId) {
        return
      }

      setReplayData(payload.replay)
      setCurrentMoveIndex(-1)
      setIsPlaying(false)
      setError(null)
      setLoading(false)
    }

    const handleError = (payload: ErrorMessagePayload) => {
      setError(payload.message)
      setLoading(false)
      setIsPlaying(false)
    }

    socket.on('replay-data', handleReplayData)
    socket.on('error-message', handleError)
    socket.emit('get-replay', { gameId })

    return () => {
      socket.off('replay-data', handleReplayData)
      socket.off('error-message', handleError)
    }
  }, [gameId])

  useEffect(() => {
    if (
      !isPlaying ||
      !replayData ||
      currentMoveIndex >= replayData.moves.length - 1
    ) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setCurrentMoveIndex((index) => {
        const nextIndex = Math.min(index + 1, replayData.moves.length - 1)

        if (nextIndex >= replayData.moves.length - 1) {
          setIsPlaying(false)
        }

        return nextIndex
      })
    }, 800)

    return () => window.clearTimeout(timeoutId)
  }, [currentMoveIndex, isPlaying, replayData])

  const visibleMoves = useMemo(
    () => replayData?.moves.slice(0, currentMoveIndex + 1) ?? [],
    [currentMoveIndex, replayData],
  )
  const currentMove =
    replayData && currentMoveIndex >= 0
      ? replayData.moves[currentMoveIndex]
      : null
  const players = useMemo(
    () =>
      [...(replayData?.players ?? [])].sort((left, right) =>
        left.role.localeCompare(right.role),
      ),
    [replayData],
  )
  const winner = replayData?.players.find(
    (player) => player.playerId === replayData.game.winnerPlayerId,
  )
  const atEnd = replayData
    ? currentMoveIndex >= replayData.moves.length - 1
    : true
  const canStep = Boolean(replayData && replayData.moves.length > 0)

  return (
    <main className="bg-command-grid min-h-screen">
      <div className="mx-auto max-w-7xl space-y-5 px-4 py-5 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 rounded-xl border border-[#c4c7c7] bg-white/90 p-4 shadow-[0_12px_30px_rgba(25,28,29,0.04)] sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-[#747878]">
              BattleGrid replay
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-[#191c1d]">
              Game #{gameId}
            </h1>
          </div>
          <Button variant="secondary" onClick={onBackToLobby}>
            Back to Lobby
          </Button>
        </div>

        {loading ? (
          <Card className="p-5 text-sm text-[#444748]">Loading replay.</Card>
        ) : null}

        {error ? (
          <Card className="border-[#ba1a1a]/30 p-5 text-sm text-[#ba1a1a]">
            {error}
          </Card>
        ) : null}

        {replayData ? (
          <>
            <Card className="p-5">
              <div className="grid gap-3 md:grid-cols-3">
                <div>
                  <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[#747878]">
                    Winner
                  </p>
                  <p className="mt-1 text-lg font-semibold text-[#191c1d]">
                    {winner?.displayName ?? 'No winner'}
                  </p>
                </div>
                <div>
                  <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[#747878]">
                    Players
                  </p>
                  <p className="mt-1 text-lg font-semibold text-[#191c1d]">
                    {players.map((player) => player.displayName).join(' vs ')}
                  </p>
                </div>
                <div>
                  <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[#747878]">
                    Move
                  </p>
                  <p className="mt-1 text-lg font-semibold text-[#191c1d]">
                    {currentMoveIndex + 1} / {replayData.moves.length}
                  </p>
                </div>
              </div>
            </Card>

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
              <div className="grid gap-5 lg:grid-cols-2">
                {players.map((replayPlayer) => (
                  <Card className="space-y-4 p-5" key={replayPlayer.playerId}>
                    <div>
                      <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[#747878]">
                        Role {replayPlayer.role}
                      </p>
                      <h2 className="mt-1 text-xl font-semibold text-[#191c1d]">
                        {replayPlayer.displayName}
                      </h2>
                    </div>
                    <GameBoard
                      gridSize={replayData.game.gridSize}
                      ships={replayPlayer.ships}
                      shots={buildShotsForPlayer(replayPlayer, visibleMoves)}
                      mode="replay"
                      highlightedCell={getHighlightedCell(
                        replayPlayer,
                        currentMove,
                      )}
                    />
                  </Card>
                ))}
              </div>

              <aside className="space-y-5">
                <Card className="space-y-3 p-5">
                  <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[#747878]">
                    Controls
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="secondary"
                      disabled={currentMoveIndex < 0}
                      onClick={() =>
                        setCurrentMoveIndex((index) => Math.max(-1, index - 1))
                      }
                    >
                      Previous
                    </Button>
                    <Button
                      variant="secondary"
                      disabled={!canStep || atEnd}
                      onClick={() =>
                        setCurrentMoveIndex((index) =>
                          Math.min(replayData.moves.length - 1, index + 1),
                        )
                      }
                    >
                      Next
                    </Button>
                    <Button
                      disabled={!canStep || atEnd}
                      onClick={() => setIsPlaying((value) => !value)}
                    >
                      {isPlaying ? 'Pause' : 'Play'}
                    </Button>
                    <Button
                      variant="outline"
                      disabled={!canStep && currentMoveIndex < 0}
                      onClick={() => {
                        setCurrentMoveIndex(-1)
                        setIsPlaying(false)
                      }}
                    >
                      Reset
                    </Button>
                  </div>
                  {currentMove ? (
                    <div className="rounded-lg border border-[#c4c7c7] bg-[#f3f4f5] px-3 py-2 text-sm text-[#444748]">
                      <span className="font-semibold text-[#191c1d]">
                        {currentMove.displayName}
                      </span>{' '}
                      fired at {coordLabel(currentMove)}: {currentMove.result}
                    </div>
                  ) : null}
                </Card>

                <Card className="space-y-3 p-5">
                  <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[#747878]">
                    Moves
                  </p>
                  {replayData.moves.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-[#c4c7c7] bg-[#f8f9fa] p-4 text-sm text-[#444748]">
                      No shots were recorded before the game ended.
                    </div>
                  ) : (
                    <ol className="max-h-[480px] space-y-2 overflow-y-auto pr-1">
                      {replayData.moves.map((move, index) => (
                        <li
                          className={clsx(
                            'rounded-lg border p-3 text-sm',
                            index === currentMoveIndex
                              ? 'border-[#191c1d] bg-[#f3f4f5]'
                              : 'border-[#edeeef] bg-[#f8f9fa]',
                          )}
                          key={move.id}
                        >
                          <button
                            type="button"
                            className="w-full text-left"
                            onClick={() => {
                              setCurrentMoveIndex(index)
                              setIsPlaying(false)
                            }}
                          >
                            <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#747878]">
                              Move {move.turnNumber}
                            </span>
                            <span className="mt-1 block font-semibold text-[#191c1d]">
                              {move.displayName} · {coordLabel(move)}
                            </span>
                            <span className="block capitalize text-[#444748]">
                              {move.result}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ol>
                  )}
                </Card>
              </aside>
            </div>
          </>
        ) : null}
      </div>
    </main>
  )
}

export default ReplayPage
