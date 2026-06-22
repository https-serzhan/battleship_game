import clsx from 'clsx'
import type { BoardShot, CellCoord, Ship } from '../../../entities/game/model/types'

interface GameBoardProps {
  gridSize: number
  ships: Ship[]
  shots: BoardShot[]
  mode: 'own' | 'opponent' | 'placement'
  onCellClick?: (cell: CellCoord) => void
  disabled?: boolean
  isCurrentTurn?: boolean
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
  disabled = false,
  isCurrentTurn = false,
}: GameBoardProps) => {
  const shipCells = new Set(ships.flatMap((ship) => ship.cells.map(keyFor)))
  const shotByCell = new Map(shots.map((shot) => [keyFor(shot), shot]))
  const clickable = Boolean(onCellClick) && !disabled
  const columns = `1.5rem repeat(${gridSize}, minmax(0, 1fr))`

  return (
    <div
      className={clsx(
        'w-full max-w-[560px] rounded-xl border border-[#c4c7c7] bg-[#edeeef] p-2 shadow-inner',
        disabled && 'opacity-80',
      )}
    >
      <div className="grid gap-1" style={{ gridTemplateColumns: columns }}>
        <div />
        {Array.from({ length: gridSize }, (_, index) => (
          <div
            className="flex h-5 items-center justify-center font-mono text-[10px] font-semibold uppercase text-[#747878]"
            key={`column-${index}`}
          >
            {String.fromCharCode(65 + index)}
          </div>
        ))}
        {Array.from({ length: gridSize }, (_, y) => (
          <div className="contents" key={`row-${y}`}>
            <div className="flex items-center justify-center font-mono text-[10px] font-semibold text-[#747878]">
              {y + 1}
            </div>
            {Array.from({ length: gridSize }, (_, x) => {
              const cell = { x, y }
              const shot = shotByCell.get(keyFor(cell))
              const hasShip = shipCells.has(keyFor(cell))
              const markerClassName = clsx(
                shot?.result === 'miss' &&
                  'h-2 w-2 rounded-full bg-current text-transparent',
                shot &&
                  shot.result !== 'miss' &&
                  'flex h-5 w-5 items-center justify-center rounded-full bg-white/70',
              )
              const className = clsx(
                'flex aspect-square min-h-0 items-center justify-center rounded-[4px] border border-white/80 text-xs font-bold transition-colors',
                !hasShip && !shot && 'bg-[#f8f9fa]',
                hasShip && !shot && mode === 'placement' && 'bg-[#5f8589]',
                hasShip && !shot && mode !== 'placement' && 'bg-[#7c999c]',
                shot?.result === 'miss' && 'bg-[#d9ecef] text-[#30727e]',
                (shot?.result === 'hit' ||
                  shot?.result === 'sunk' ||
                  shot?.result === 'win') &&
                  'bg-[#f7d9de] text-[#b7102a]',
                clickable &&
                  'cursor-crosshair hover:bg-[#d9ecef] focus:outline focus:outline-2 focus:outline-[#191c1d]',
                mode === 'opponent' &&
                  !clickable &&
                  'cursor-not-allowed bg-[#f3f4f5]',
                mode === 'placement' &&
                  clickable &&
                  'hover:border-[#191c1d] hover:bg-[#d9ecef]',
                mode === 'opponent' &&
                  clickable &&
                  isCurrentTurn &&
                  'hover:border-[#191c1d]',
              )

              if (clickable) {
                return (
                  <button
                    aria-label={`Cell ${String.fromCharCode(65 + x)}${y + 1}`}
                    className={className}
                    key={keyFor(cell)}
                    onClick={() => onCellClick?.(cell)}
                  >
                    <span className={markerClassName}>
                      {shot ? shotLabel[shot.result] : ''}
                    </span>
                  </button>
                )
              }

              return (
                <div className={className} key={keyFor(cell)}>
                  <span className={markerClassName}>
                    {shot ? shotLabel[shot.result] : ''}
                  </span>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
