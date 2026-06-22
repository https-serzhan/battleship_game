import type { GameView } from '../../../entities/game/model/types'
import { Button } from '../../../shared/ui/Button'
import { Card } from '../../../shared/ui/Card'

interface ReplayPageProps {
  game: GameView
  onBack: () => void
}

const ReplayPage = ({ game, onBack }: ReplayPageProps) => (
  <main className="bg-command-grid min-h-screen">
    <div className="mx-auto max-w-5xl space-y-5 px-4 py-5 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-3 rounded-xl border border-[#c4c7c7] bg-white/90 p-4 shadow-[0_12px_30px_rgba(25,28,29,0.04)] sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-[#747878]">
            BattleGrid replay
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-[#191c1d]">
            Game #{game.id}
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={onBack}>
            Back to game
          </Button>
          <Button variant="outline" disabled>
            Export Replay
          </Button>
        </div>
      </div>
      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <Card className="space-y-3 p-5">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[#747878]">
            Replay foundation
          </p>
          <div className="grid min-h-[260px] place-items-center rounded-xl border border-dashed border-[#c4c7c7] bg-[#f8f9fa] p-6 text-center text-sm text-[#444748]">
            Stored move events can be rendered here as a replay timeline.
          </div>
        </Card>
        <Card className="space-y-3 p-5">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[#747878]">
            Summary
          </p>
          <div className="space-y-2 text-sm text-[#444748]">
            <p>Status: {game.status}</p>
            <p>
              Grid: {game.gridSize}x{game.gridSize}
            </p>
            <p>Mode: {game.mode}</p>
          </div>
        </Card>
      </div>
    </div>
  </main>
)

export default ReplayPage
