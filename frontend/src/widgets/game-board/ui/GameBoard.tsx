import clsx from 'clsx'
import type { BoardShot, CellCoord, Ship } from '../../../entities/game/model/types'

interface GameBoardProps {
  gridSize: number
  ships: Ship[]
  shots: BoardShot[]
  mode: 'own' | 'opponent'
  onCellClick?: (cell: CellCoord) => void
}

const keyFor = (cell: CellCoord): string => `${cell.x}:${cell.y}`

const shotLabel: Record<BoardShot['result'], string> = {
  hit: '×',
  miss: '•',
  sunk: '×',
  win: '×',
}

export const GameBoard = ({
  gridSize,
  ships,
  shots,
  mode,
  onCellClick,
}: GameBoardProps) => {
  const shipCells = new Set(ships.flatMap((ship) => ship.cells.map(keyFor)))
  const shotByCell = new Map(shots.map((shot) => [keyFor(shot), shot]))

  return (
    <div
      className="grid aspect-square w-full max-w-[540px] overflow-hidden rounded-xl border border-[#c4c7c7] bg-[#edeeef] p-1 shadow-inner"
      style={{ gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: gridSize * gridSize }, (_, index) => {
        const x = index % gridSize
        const y = Math.floor(index / gridSize)
        const cell = { x, y }
        const shot = shotByCell.get(keyFor(cell))
        const hasShip = shipCells.has(keyFor(cell))
        const clickable = Boolean(onCellClick)
        const markerClassName = clsx(
          shot?.result === 'miss' && 'h-2 w-2 rounded-full bg-current text-transparent',
          shot &&
            shot.result !== 'miss' &&
            'flex h-5 w-5 items-center justify-center rounded-full bg-white/70',
        )
        const className = clsx(
          'm-px flex aspect-square min-h-0 items-center justify-center rounded-[4px] border border-white/80 text-xs font-bold transition-colors',
          mode === 'own' && hasShip && !shot && 'bg-[#7c999c]',
          !hasShip && !shot && 'bg-[#f8f9fa]',
          shot?.result === 'miss' && 'bg-[#d9ecef] text-[#30727e]',
          (shot?.result === 'hit' || shot?.result === 'sunk' || shot?.result === 'win') &&
            'bg-[#f7d9de] text-[#b7102a]',
          clickable && 'cursor-crosshair hover:bg-[#d9ecef] focus:outline focus:outline-2 focus:outline-[#191c1d]',
          !clickable && mode === 'opponent' && 'cursor-not-allowed',
        )

        if (clickable) {
          return (
            <button
              aria-label={`Cell ${x},${y}`}
              className={className}
              key={keyFor(cell)}
              onClick={() => onCellClick?.(cell)}
            >
              <span className={markerClassName}>{shot ? shotLabel[shot.result] : ''}</span>
            </button>
          )
        }

        return (
          <div className={className} key={keyFor(cell)}>
            <span className={markerClassName}>{shot ? shotLabel[shot.result] : ''}</span>
          </div>
        )
      })}
    </div>
  )
}
