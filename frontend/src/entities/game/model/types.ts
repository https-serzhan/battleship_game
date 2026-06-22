import type { Player } from '../../player/model/types'
import type { Stats } from '../../stats/model/types'

export type GameStatus = 'waiting' | 'setup' | 'in_progress' | 'finished'
export type GameMode = 'pvp' | 'computer'
export type PlayerRole = 'A' | 'B'
export type ShotResult = 'hit' | 'miss' | 'sunk' | 'win'

export interface ShipConfigItem {
  size: number
  count: number
}

export interface CellCoord {
  x: number
  y: number
}

export interface Ship {
  id: string
  size: number
  cells: CellCoord[]
}

export interface BoardShot extends CellCoord {
  result: ShotResult
}

export interface MoveRecord extends CellCoord {
  id: number
  gameId: number
  turnNumber: number
  playerId: number
  result: ShotResult
  createdAt: string
}

export interface LobbyGame {
  id: number
  creatorId: number | null
  creatorDisplayName: string
  status: GameStatus
  gridSize: number
  shipConfig: ShipConfigItem[]
  createdAt: string
  mode: GameMode
}

export interface GamePlayerView {
  playerId: number
  displayName: string
  role: PlayerRole
  ready: boolean
  ships: Ship[]
  shots: BoardShot[]
  isCurrentPlayer: boolean
}

export interface GameView {
  id: number
  status: GameStatus
  mode: GameMode
  gridSize: number
  shipConfig: ShipConfigItem[]
  currentTurnPlayerId: number | null
  winnerPlayerId: number | null
  players: GamePlayerView[]
  moves: MoveRecord[]
  createdAt: string
  startedAt: string | null
  finishedAt: string | null
}

export interface BackendLobbyGame {
  id: number
  status: GameStatus
  mode: GameMode
  gridSize: number
  shipConfig: ShipConfigItem[]
  creator?: {
    id?: number
    displayName: string
  }
  creatorId?: number
  creatorDisplayName?: string
  createdAt: string
}

export interface BackendShotRecord extends CellCoord {
  result: ShotResult
}

export interface BackendGameParticipant {
  player: {
    id: number
    displayName: string
  }
  role: PlayerRole
  ready: boolean
  isViewer?: boolean
  board?: {
    ships: Ship[]
    shotsReceived: BackendShotRecord[]
  }
  playerId?: number
  displayName?: string
  ships?: Ship[]
  shots?: BackendShotRecord[]
  isCurrentPlayer?: boolean
}

export interface BackendGameView {
  id: number
  status: GameStatus
  mode: GameMode
  gridSize: number
  shipConfig: ShipConfigItem[]
  currentTurnPlayerId: number | null
  winnerPlayerId: number | null
  players: BackendGameParticipant[]
  moves?: MoveRecord[]
  createdAt: string
  startedAt: string | null
  finishedAt: string | null
}

export interface PlatformJoinedPayload {
  player: Player
  sessionToken: string
  stats: Stats
  games: BackendLobbyGame[]
}

export interface LobbyUpdatedPayload {
  games: BackendLobbyGame[]
}

export interface GameUpdatedPayload {
  game: BackendGameView
}

export interface ErrorMessagePayload {
  message: string
}

export interface CreateGamePayload {
  gridSize: number
  shipConfig: ShipConfigItem[]
  mode: GameMode
}

export interface ReplayMove extends CellCoord {
  id: number
  turnNumber: number
  playerId: number
  displayName: string
  result: ShotResult
  createdAt: string
}

export interface ReplayPlayer {
  playerId: number
  displayName: string
  role: PlayerRole
  ships: Ship[]
}

export interface ReplayData {
  game: {
    id: number
    gridSize: number
    mode: GameMode
    status: 'finished'
    winnerPlayerId: number | null
    createdAt: string
    startedAt: string | null
    finishedAt: string | null
  }
  players: ReplayPlayer[]
  moves: ReplayMove[]
}

export interface ReplayDataPayload {
  replay: ReplayData
}
