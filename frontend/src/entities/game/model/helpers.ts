import type {
  BackendGameParticipant,
  BackendGameView,
  BackendLobbyGame,
  BoardShot,
  CellCoord,
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
  creatorId: game.creatorId ?? game.creator?.id ?? null,
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
  moves: game.moves ?? [],
  createdAt: game.createdAt,
  startedAt: game.startedAt,
  finishedAt: game.finishedAt,
})

export const shipConfigSummary = (shipConfig: ShipConfigItem[]): string =>
  shipConfig.map((item) => `${item.count}x${item.size}`).join(', ')

type Orientation = 'horizontal' | 'vertical'

interface CreateShipFromStartCellParams {
  id: string
  size: number
  start: CellCoord
  orientation: Orientation
  gridSize: number
}

const keyFor = (cell: CellCoord): string => `${cell.x}:${cell.y}`

const isStraightContiguous = (ship: Ship): boolean => {
  if (ship.cells.length !== ship.size) {
    return false
  }

  if (ship.cells.length === 1) {
    return true
  }

  const sameX = ship.cells.every((cell) => cell.x === ship.cells[0].x)
  const sameY = ship.cells.every((cell) => cell.y === ship.cells[0].y)

  if (!sameX && !sameY) {
    return false
  }

  const values = ship.cells
    .map((cell) => (sameX ? cell.y : cell.x))
    .sort((left, right) => left - right)

  return values.every((value, index) => index === 0 || value === values[index - 1] + 1)
}

const expectedCountsBySize = (shipConfig: ShipConfigItem[]): Map<number, number> => {
  const counts = new Map<number, number>()

  for (const item of shipConfig) {
    counts.set(item.size, (counts.get(item.size) ?? 0) + item.count)
  }

  return counts
}

export const areCellsInsideBoard = (
  cells: CellCoord[],
  gridSize: number,
): boolean =>
  cells.every(
    (cell) =>
      Number.isInteger(cell.x) &&
      Number.isInteger(cell.y) &&
      cell.x >= 0 &&
      cell.y >= 0 &&
      cell.x < gridSize &&
      cell.y < gridSize,
  )

export const doShipsOverlap = (ships: Ship[]): boolean => {
  const occupied = new Set<string>()

  for (const ship of ships) {
    for (const cell of ship.cells) {
      const key = keyFor(cell)

      if (occupied.has(key)) {
        return true
      }

      occupied.add(key)
    }
  }

  return false
}

export const createShipFromStartCell = ({
  id,
  size,
  start,
  orientation,
  gridSize,
}: CreateShipFromStartCellParams): Ship | null => {
  const cells = Array.from({ length: size }, (_, index) => ({
    x: orientation === 'horizontal' ? start.x + index : start.x,
    y: orientation === 'horizontal' ? start.y : start.y + index,
  }))

  if (!areCellsInsideBoard(cells, gridSize)) {
    return null
  }

  return { id, size, cells }
}

export const isShipPlacementValid = (
  ships: Ship[],
  gridSize: number,
  shipConfig: ShipConfigItem[],
): boolean => {
  const expectedCounts = expectedCountsBySize(shipConfig)
  const actualCounts = new Map<number, number>()
  const expectedTotal = [...expectedCounts.values()].reduce(
    (total, count) => total + count,
    0,
  )

  if (ships.length !== expectedTotal || doShipsOverlap(ships)) {
    return false
  }

  for (const ship of ships) {
    if (
      ship.id.trim().length === 0 ||
      !expectedCounts.has(ship.size) ||
      !areCellsInsideBoard(ship.cells, gridSize) ||
      !isStraightContiguous(ship)
    ) {
      return false
    }

    actualCounts.set(ship.size, (actualCounts.get(ship.size) ?? 0) + 1)
  }

  return [...expectedCounts].every(
    ([size, count]) => (actualCounts.get(size) ?? 0) === count,
  )
}

export const generateRandomShips = (
  gridSize: number,
  shipConfig: ShipConfigItem[],
): Ship[] => {
  const usedBySize = new Map<number, number>()
  const sizes = shipConfig
    .flatMap((item) =>
      Array.from({ length: item.count }, () => {
        const index = usedBySize.get(item.size) ?? 0
        usedBySize.set(item.size, index + 1)

        return {
          size: item.size,
          index,
        }
      }),
    )
    .sort((left, right) => right.size - left.size)

  for (let layoutAttempt = 0; layoutAttempt < 100; layoutAttempt += 1) {
    const ships: Ship[] = []

    for (const item of sizes) {
      let placed: Ship | null = null

      for (let attempt = 0; attempt < 200 && !placed; attempt += 1) {
        const orientation: Orientation =
          Math.random() >= 0.5 ? 'horizontal' : 'vertical'
        const maxX =
          orientation === 'horizontal' ? gridSize - item.size : gridSize - 1
        const maxY =
          orientation === 'horizontal' ? gridSize - 1 : gridSize - item.size

        if (maxX < 0 || maxY < 0) {
          break
        }

        const start = {
          x: Math.floor(Math.random() * (maxX + 1)),
          y: Math.floor(Math.random() * (maxY + 1)),
        }
        const candidate = createShipFromStartCell({
          id: `ship-${item.size}-${item.index}`,
          size: item.size,
          start,
          orientation,
          gridSize,
        })

        if (candidate && !doShipsOverlap([...ships, candidate])) {
          placed = candidate
        }
      }

      if (!placed) {
        break
      }

      ships.push(placed)
    }

    if (isShipPlacementValid(ships, gridSize, shipConfig)) {
      return ships
    }
  }

  throw new Error('Could not generate a valid random ship layout for this configuration.')
}

export const autoPlaceShips = generateRandomShips
