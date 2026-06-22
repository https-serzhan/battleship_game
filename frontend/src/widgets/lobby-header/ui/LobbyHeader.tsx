import type { Player } from '../../../entities/player/model/types'
import type { Stats } from '../../../entities/stats/model/types'
import { Button } from '../../../shared/ui/Button'

interface LobbyHeaderProps {
  player: Player
  stats: Stats | null
  connectionStatus: string
  onResetSession: () => void
}

export const LobbyHeader = ({
  player,
  stats,
  connectionStatus,
  onResetSession,
}: LobbyHeaderProps) => (
  <header className="rounded-xl border border-[#c4c7c7] bg-white/90 p-4 shadow-[0_12px_30px_rgba(25,28,29,0.04)]">
    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
      <div className="space-y-2">
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-[#747878]">
          BattleGrid
        </p>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-[#191c1d]">
            Command Lobby
          </h1>
          <p className="text-sm text-[#444748]">
            Playing as{' '}
            <span className="font-semibold text-[#191c1d]">{player.displayName}</span>
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-3 md:items-end">
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-full border border-[#c4c7c7] bg-[#f3f4f5] px-3 py-1 font-mono uppercase tracking-[0.14em] text-[#444748]">
            {connectionStatus}
          </span>
          {stats ? (
            <span className="rounded-full border border-[#c4c7c7] bg-white px-3 py-1 font-mono uppercase tracking-[0.14em] text-[#444748]">
              {stats.hits}/{stats.shots} hits
            </span>
          ) : null}
        </div>
        <Button size="sm" variant="ghost" onClick={onResetSession}>
          Reset local session
        </Button>
      </div>
    </div>
  </header>
)
