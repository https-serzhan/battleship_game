import type { GamePlayerView } from '../../../entities/game/model/types'
import { GameBoard } from '../../../widgets/game-board/ui/GameBoard'

interface FireShotHandlerProps {
  gridSize: number
  opponent: GamePlayerView
  canFire: boolean
  onFire: (x: number, y: number) => void
}

export const FireShotHandler = ({
  gridSize,
  opponent,
  canFire,
  onFire,
}: FireShotHandlerProps) => (
  <GameBoard
    gridSize={gridSize}
    ships={opponent.ships}
    shots={opponent.shots}
    mode="opponent"
    onCellClick={canFire ? (cell) => onFire(cell.x, cell.y) : undefined}
  />
)
