import { useMemo, useState } from 'react'
import clsx from 'clsx'
import type {
  CellCoord,
  Ship,
  ShipConfigItem,
} from '../../../entities/game/model/types'
import {
  createShipFromStartCell,
  doShipsOverlap,
  generateRandomShips,
  isShipPlacementValid,
} from '../../../entities/game/model/helpers'
import { Button } from '../../../shared/ui/Button'
import { GameBoard } from '../../../widgets/game-board/ui/GameBoard'

type Orientation = 'horizontal' | 'vertical'

interface ShipPlacementControlsProps {
  gameId: number
  gridSize: number
  shipConfig: ShipConfigItem[]
  initialShips?: Ship[]
  ready?: boolean
  onPlaceShips: (gameId: number, ships: Ship[]) => void
}

interface ShipSlot {
  id: string
  size: number
  label: string
}

const buildShipSlots = (shipConfig: ShipConfigItem[]): ShipSlot[] => {
  const usedBySize = new Map<number, number>()

  return shipConfig
    .flatMap((item) =>
      Array.from({ length: item.count }, () => {
        const index = usedBySize.get(item.size) ?? 0
        usedBySize.set(item.size, index + 1)

        return {
          id: `ship-${item.size}-${index}`,
          size: item.size,
          label: `Size ${item.size}`,
        }
      }),
    )
    .sort((left, right) => right.size - left.size)
}

const sortShipsBySlots = (ships: Ship[], slots: ShipSlot[]): Ship[] =>
  [...ships].sort(
    (left, right) =>
      slots.findIndex((slot) => slot.id === left.id) -
      slots.findIndex((slot) => slot.id === right.id),
  )

export const ShipPlacementControls = ({
  gameId,
  gridSize,
  shipConfig,
  initialShips = [],
  ready = false,
  onPlaceShips,
}: ShipPlacementControlsProps) => {
  const slots = useMemo(() => buildShipSlots(shipConfig), [shipConfig])
  const firstUnplacedShipId =
    slots.find((slot) => !initialShips.some((ship) => ship.id === slot.id))?.id ??
    slots[0]?.id ??
    null
  const [orientation, setOrientation] = useState<Orientation>('horizontal')
  const [ships, setShips] = useState<Ship[]>(initialShips)
  const [selectedShipId, setSelectedShipId] =
    useState<string | null>(firstUnplacedShipId)
  const [localError, setLocalError] = useState<string | null>(null)

  const placedIds = useMemo(
    () => new Set(ships.map((ship) => ship.id)),
    [ships],
  )
  const selectedSlot = slots.find((slot) => slot.id === selectedShipId) ?? null
  const valid = isShipPlacementValid(ships, gridSize, shipConfig)
  const placedCount = ships.length

  const selectNextUnplaced = (nextShips: Ship[]) => {
    const next = slots.find(
      (slot) => !nextShips.some((ship) => ship.id === slot.id),
    )

    setSelectedShipId(next?.id ?? selectedShipId)
  }

  const handlePlace = (cell: CellCoord) => {
    if (ready || !selectedSlot) {
      return
    }

    const candidate = createShipFromStartCell({
      id: selectedSlot.id,
      size: selectedSlot.size,
      start: cell,
      orientation,
      gridSize,
    })

    if (!candidate) {
      setLocalError('That ship would leave the board.')
      return
    }

    const withoutSelected = ships.filter((ship) => ship.id !== selectedSlot.id)

    if (doShipsOverlap([...withoutSelected, candidate])) {
      setLocalError('Ships cannot overlap.')
      return
    }

    const nextShips = sortShipsBySlots([...withoutSelected, candidate], slots)
    setShips(nextShips)
    setLocalError(null)
    selectNextUnplaced(nextShips)
  }

  const handleRemove = (shipId: string) => {
    if (ready) {
      return
    }

    const nextShips = ships.filter((ship) => ship.id !== shipId)
    setShips(nextShips)
    setSelectedShipId(shipId)
    setLocalError(null)
  }

  const handleRandomize = () => {
    try {
      const nextShips = sortShipsBySlots(
        generateRandomShips(gridSize, shipConfig),
        slots,
      )
      setShips(nextShips)
      setSelectedShipId(slots[0]?.id ?? null)
      setLocalError(null)
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : 'Random placement failed.')
    }
  }

  const handleClear = () => {
    setShips([])
    setSelectedShipId(slots[0]?.id ?? null)
    setLocalError(null)
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
      <GameBoard
        gridSize={gridSize}
        ships={ships}
        shots={[]}
        mode="placement"
        disabled={ready}
        onCellClick={ready ? undefined : handlePlace}
      />
      <div className="space-y-4">
        <div>
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[#747878]">
            Fleet Placement
          </p>
          <h3 className="mt-1 text-lg font-semibold text-[#191c1d]">
            {placedCount} / {slots.length} ships placed
          </h3>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button
            variant={orientation === 'horizontal' ? 'primary' : 'secondary'}
            size="sm"
            tactical
            disabled={ready}
            onClick={() => setOrientation('horizontal')}
          >
            Horizontal
          </Button>
          <Button
            variant={orientation === 'vertical' ? 'primary' : 'secondary'}
            size="sm"
            tactical
            disabled={ready}
            onClick={() => setOrientation('vertical')}
          >
            Vertical
          </Button>
        </div>

        <div className="space-y-2">
          {slots.map((slot) => {
            const placed = placedIds.has(slot.id)
            const selected = selectedShipId === slot.id

            return (
              <div
                className={clsx(
                  'rounded-lg border bg-[#f8f9fa] p-2',
                  selected ? 'border-[#191c1d]' : 'border-[#edeeef]',
                )}
                key={slot.id}
              >
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    disabled={ready}
                    className="min-w-0 flex-1 text-left disabled:cursor-not-allowed"
                    onClick={() => setSelectedShipId(slot.id)}
                  >
                    <span className="block truncate text-sm font-semibold text-[#191c1d]">
                      {slot.label}
                    </span>
                    <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#747878]">
                      {placed ? 'Placed' : 'Not placed'}
                    </span>
                  </button>
                  {placed ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={ready}
                      onClick={() => handleRemove(slot.id)}
                    >
                      Remove
                    </Button>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>

        {localError ? (
          <div className="rounded-lg border border-[#ba1a1a]/30 bg-white px-3 py-2 text-sm text-[#ba1a1a]">
            {localError}
          </div>
        ) : null}

        {ready ? (
          <div className="rounded-lg border border-[#c4c7c7] bg-[#f3f4f5] px-3 py-2 text-sm text-[#444748]">
            Fleet locked. Waiting for the other player.
          </div>
        ) : null}

        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
          <Button
            variant="secondary"
            tactical
            disabled={ready}
            onClick={handleRandomize}
          >
            Randomize Fleet
          </Button>
          <Button
            variant="outline"
            tactical
            disabled={ready || ships.length === 0}
            onClick={handleClear}
          >
            Clear Fleet
          </Button>
          <Button
            tactical
            disabled={ready || !valid}
            className="sm:col-span-2 xl:col-span-1"
            onClick={() => onPlaceShips(gameId, ships)}
          >
            Ready
          </Button>
        </div>
      </div>
    </div>
  )
}
