import { lazy, Suspense, useEffect, useState } from 'react'
import type { Ship } from '../entities/game/model/types'
import type {
  CreateGamePayload,
  ErrorMessagePayload,
  GameMode,
  GameUpdatedPayload,
  LobbyGame,
  LobbyUpdatedPayload,
  PlatformJoinedPayload,
  ShipConfigItem,
  GameView,
} from '../entities/game/model/types'
import { toGameView, toLobbyGames } from '../entities/game/model/helpers'
import type { Player } from '../entities/player/model/types'
import type { Stats } from '../entities/stats/model/types'
import { socket } from '../shared/api/socket'
import {
  clearSessionToken,
  getSessionToken,
  setSessionToken,
} from '../shared/lib/storage'

const NameEntryPage = lazy(() => import('../pages/name-entry/ui/NameEntryPage'))
const LobbyPage = lazy(() => import('../pages/lobby/ui/LobbyPage'))
const GameRoomPage = lazy(() => import('../pages/game-room/ui/GameRoomPage'))
const ReplayPage = lazy(() => import('../pages/replay/ui/ReplayPage'))

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected'

const App = () => {
  const [player, setPlayer] = useState<Player | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [games, setGames] = useState<LobbyGame[]>([])
  const [activeGame, setActiveGame] = useState<GameView | null>(null)
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>('connecting')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [showReplay, setShowReplay] = useState(false)

  useEffect(() => {
    const handleConnect = () => {
      setConnectionStatus('connected')
      const token = getSessionToken()

      if (token) {
        socket.emit('join-platform', { sessionToken: token })
      }
    }

    const handleDisconnect = () => {
      setConnectionStatus('disconnected')
    }

    const handlePlatformJoined = (payload: PlatformJoinedPayload) => {
      setPlayer(payload.player)
      setStats(payload.stats)
      setGames(toLobbyGames(payload.games))
      setSessionToken(payload.sessionToken)
      setErrorMessage(null)
    }

    const handleLobbyUpdated = (payload: LobbyUpdatedPayload) => {
      setGames(toLobbyGames(payload.games))
    }

    const handleGameUpdated = (payload: GameUpdatedPayload) => {
      const game = toGameView(payload.game)
      setActiveGame(game)
      setErrorMessage(null)

      if (game.status === 'finished') {
        const token = getSessionToken()

        if (token) {
          socket.emit('join-platform', { sessionToken: token })
        }
      }
    }

    const handleError = (payload: ErrorMessagePayload) => {
      setErrorMessage(payload.message)
    }

    socket.on('connect', handleConnect)
    socket.on('disconnect', handleDisconnect)
    socket.on('platform-joined', handlePlatformJoined)
    socket.on('lobby-updated', handleLobbyUpdated)
    socket.on('game-updated', handleGameUpdated)
    socket.on('error-message', handleError)

    socket.connect()

    return () => {
      socket.off('connect', handleConnect)
      socket.off('disconnect', handleDisconnect)
      socket.off('platform-joined', handlePlatformJoined)
      socket.off('lobby-updated', handleLobbyUpdated)
      socket.off('game-updated', handleGameUpdated)
      socket.off('error-message', handleError)
      socket.disconnect()
    }
  }, [])

  const joinPlatform = (name: string) => {
    setErrorMessage(null)
    socket.emit('join-platform', { name })
  }

  const createGame = (
    gridSize: number,
    shipConfig: ShipConfigItem[],
    mode: GameMode,
  ) => {
    const payload: CreateGamePayload = { gridSize, shipConfig, mode }

    setErrorMessage(null)
    socket.emit('create-game', payload)
  }

  const joinGame = (gameId: number) => {
    setErrorMessage(null)
    socket.emit('join-game', { gameId })
  }

  const placeShips = (gameId: number, ships: Ship[]) => {
    setErrorMessage(null)
    socket.emit('place-ships', { gameId, ships })
  }

  const fire = (gameId: number, x: number, y: number) => {
    setErrorMessage(null)
    socket.emit('fire', { gameId, x, y })
  }

  const leaveGame = (gameId: number) => {
    const leavingGame = activeGame?.id === gameId ? activeGame : null

    socket.emit('leave-game', { gameId })
    setShowReplay(false)

    if (
      !leavingGame ||
      leavingGame.status === 'waiting' ||
      leavingGame.status === 'finished'
    ) {
      setActiveGame(null)
    }
  }

  const resetSession = () => {
    clearSessionToken()
    setPlayer(null)
    setStats(null)
    setActiveGame(null)
    setShowReplay(false)
  }

  const fallback = (
    <div className="flex min-h-screen items-center justify-center text-sm text-slate-600">
      Loading
    </div>
  )

  return (
    <Suspense fallback={fallback}>
      {!player ? (
        <NameEntryPage
          onJoin={joinPlatform}
          connectionStatus={connectionStatus}
          errorMessage={errorMessage}
        />
      ) : activeGame && showReplay ? (
        <ReplayPage
          key={activeGame.id}
          gameId={activeGame.id}
          onBackToLobby={() => leaveGame(activeGame.id)}
        />
      ) : activeGame ? (
        <GameRoomPage
          player={player}
          game={activeGame}
          errorMessage={errorMessage}
          onPlaceShips={placeShips}
          onFire={fire}
          onLeaveGame={leaveGame}
          onOpenReplay={() => setShowReplay(true)}
        />
      ) : (
        <LobbyPage
          player={player}
          stats={stats}
          games={games}
          connectionStatus={connectionStatus}
          errorMessage={errorMessage}
          onCreateGame={createGame}
          onJoinGame={joinGame}
          onResetSession={resetSession}
        />
      )}
    </Suspense>
  )
}

export default App
