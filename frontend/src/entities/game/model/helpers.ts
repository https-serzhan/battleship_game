import type {
  BackendGameParticipant,
  BackendGameView,
  BackendLobbyGame,
  BoardShot,
  GameView,
  LobbyGame,
  Ship,
  ShipConfigItem,
} from './types'

const toBoardShots = (shots: BoardShot[] | undefined): BoardShot[] =>
  shots?.map((shot) => ({
    x: shot.x,
    y: shot.y,
    result: shot.result,
  })) ?? []

const getParticipantPlayerId = (participant: BackendGameParticipant): number =>
  participant.playerId ?? participant.player.id

const getParticipantDisplayName = (participant: BackendGameParticipant): string =>
  participant.displayName ?? participant.player.displayName

export const toLobbyGame = (game: BackendLobbyGame): LobbyGame => ({
  id: game.id,
  creatorDisplayName: game.creatorDisplayName ?? game.creator?.displayName ?? 'Unknown',
  status: game.status,
  gridSize: game.gridSize,
  shipConfig: game.shipConfig,
  createdAt: game.createdAt,
  mode: game.mode,
})

export const toLobbyGames = (games: BackendLobbyGame[]): LobbyGame[] =>
  games.map(toLobbyGame)

export const toGameView = (game: BackendGameView): GameView => ({
  id: game.id,
  status: game.status,
  mode: game.mode,
  gridSize: game.gridSize,
  shipConfig: game.shipConfig,
  currentTurnPlayerId: game.currentTurnPlayerId,
  winnerPlayerId: game.winnerPlayerId,
  players: game.players.map((participant) => ({
    playerId: getParticipantPlayerId(participant),
    displayName: getParticipantDisplayName(participant),
    role: participant.role,
    ready: participant.ready,
    ships: participant.ships ?? participant.board?.ships ?? [],
    shots: toBoardShots(participant.shots ?? participant.board?.shotsReceived),
    isCurrentPlayer: participant.isCurrentPlayer ?? participant.isViewer ?? false,
  })),
  createdAt: game.createdAt,
  startedAt: game.startedAt,
  finishedAt: game.finishedAt,
})

export const shipConfigSummary = (shipConfig: ShipConfigItem[]): string =>
  shipConfig.map((item) => `${item.count}x${item.size}`).join(', ')

export const autoPlaceShips = (
  gridSize: number,
  shipConfig: ShipConfigItem[],
): Ship[] => {
  const ships: Ship[] = []
  let x = 0
  let y = 0
  let shipNumber = 1

  for (const config of shipConfig) {
    for (let index = 0; index < config.count; index += 1) {
      if (x + config.size > gridSize) {
        x = 0
        y += 1
      }

      if (y >= gridSize) {
        throw new Error('Ship configuration does not fit this board')
      }

      ships.push({
        id: `ship-${shipNumber}`,
        size: config.size,
        cells: Array.from({ length: config.size }, (_, offset) => ({
          x: x + offset,
          y,
        })),
      })

      x += config.size
      shipNumber += 1
    }
  }

  return ships
}
