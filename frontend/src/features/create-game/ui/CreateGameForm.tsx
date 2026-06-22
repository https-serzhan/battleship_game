import { useState } from 'react'
import type { GameMode, ShipConfigItem } from '../../../entities/game/model/types'
import { Button } from '../../../shared/ui/Button'
import { Input } from '../../../shared/ui/Input'

interface CreateGameFormProps {
  onCreateGame: (gridSize: number, shipConfig: ShipConfigItem[], mode: GameMode) => void
}

const defaultShipConfig: ShipConfigItem[] = [
  { size: 4, count: 1 },
  { size: 3, count: 2 },
  { size: 2, count: 3 },
  { size: 1, count: 4 },
]

export const CreateGameForm = ({ onCreateGame }: CreateGameFormProps) => {
  const [gridSize, setGridSize] = useState(10)
  const [shipConfig, setShipConfig] = useState<ShipConfigItem[]>(defaultShipConfig)
  const [mode, setMode] = useState<GameMode>('pvp')

  const updateConfig = (
    index: number,
    key: keyof ShipConfigItem,
    value: number,
  ) => {
    setShipConfig((items) =>
      items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [key]: Math.max(1, value) } : item,
      ),
    )
  }

  const create = () => {
    onCreateGame(gridSize, shipConfig, mode)
  }

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <label
          className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-[#444748]"
          htmlFor="grid-size"
        >
          Grid size
        </label>
        <Input
          id="grid-size"
          type="number"
          min={6}
          max={15}
          value={gridSize}
          onChange={(event) => setGridSize(Number(event.target.value))}
        />
      </div>
      <div className="space-y-2">
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-[#444748]">
          Mode
        </p>
        <div className="grid grid-cols-2 gap-2 rounded-xl border border-[#c4c7c7] bg-[#f3f4f5] p-1">
          <Button
            variant={mode === 'pvp' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setMode('pvp')}
          >
            PvP
          </Button>
          <Button
            variant={mode === 'computer' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setMode('computer')}
          >
            Computer
          </Button>
        </div>
      </div>
      <div className="space-y-2">
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-[#444748]">
          Ship manifest
        </p>
        {shipConfig.map((item, index) => (
          <div
            className="grid grid-cols-[1fr_1fr] gap-2 rounded-lg border border-[#edeeef] bg-[#f8f9fa] p-2"
            key={`${item.size}-${index}`}
          >
            <div className="space-y-1">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#747878]">
                Size
              </span>
              <Input
                aria-label={`Ship size ${index + 1}`}
                type="number"
                min={1}
                value={item.size}
                onChange={(event) => updateConfig(index, 'size', Number(event.target.value))}
              />
            </div>
            <div className="space-y-1">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#747878]">
                Count
              </span>
              <Input
                aria-label={`Ship count ${index + 1}`}
                type="number"
                min={1}
                value={item.count}
                onChange={(event) => updateConfig(index, 'count', Number(event.target.value))}
              />
            </div>
          </div>
        ))}
      </div>
      <Button className="w-full" onClick={create} tactical>
        Create Session
      </Button>
    </div>
  )
}
