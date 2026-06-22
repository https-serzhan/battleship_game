import type { ShipConfigItem } from '../../../entities/game/model/types'
import { autoPlaceShips } from '../../../entities/game/model/helpers'
import { Button } from '../../../shared/ui/Button'

interface ShipPlacementControlsProps {
  gameId: number
  gridSize: number
  shipConfig: ShipConfigItem[]
  onPlaceShips: (
    gameId: number,
    ships: ReturnType<typeof autoPlaceShips>,
  ) => void
}

export const ShipPlacementControls = ({
  gameId,
  gridSize,
  shipConfig,
  onPlaceShips,
}: ShipPlacementControlsProps) => (
  <Button
    size="lg"
    tactical
    onClick={() => onPlaceShips(gameId, autoPlaceShips(gridSize, shipConfig))}
  >
    Auto-place ships and ready
  </Button>
)
