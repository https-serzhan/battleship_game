import type { GameMode, ShipConfigItem } from '../../../entities/game/model/types'
import { CreateGameForm } from '../../../features/create-game/ui/CreateGameForm'
import { Card } from '../../../shared/ui/Card'

interface CreateGamePanelProps {
  onCreateGame: (gridSize: number, shipConfig: ShipConfigItem[], mode: GameMode) => void
}

export const CreateGamePanel = ({ onCreateGame }: CreateGamePanelProps) => (
  <Card className="space-y-4 p-5">
    <div>
      <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[#747878]">
        Session control
      </p>
      <h2 className="mt-1 text-xl font-semibold text-[#191c1d]">Create battle</h2>
    </div>
    <CreateGameForm onCreateGame={onCreateGame} />
  </Card>
)
