import { JoinPlatformForm } from '../../../features/join-platform/ui/JoinPlatformForm'
import { Card } from '../../../shared/ui/Card'

interface NameEntryPageProps {
  onJoin: (name: string) => void
  connectionStatus: string
  errorMessage: string | null
}

const NameEntryPage = ({
  onJoin,
  connectionStatus,
  errorMessage,
}: NameEntryPageProps) => (
  <main className="bg-command-grid flex min-h-screen items-center justify-center px-4 py-10">
    <Card className="w-full max-w-md space-y-6 p-6">
      <div className="space-y-3">
        <div className="inline-flex rounded-full border border-[#c4c7c7] bg-[#f3f4f5] px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[#444748]">
          Naval command link
        </div>
        <div className="space-y-2">
          <h1 className="text-4xl font-semibold tracking-tight text-[#191c1d]">
            BattleGrid
          </h1>
          <p className="text-sm leading-6 text-[#444748]">
            Real-time Battleship duels for remote opponents.
          </p>
        </div>
      </div>
      <JoinPlatformForm onJoin={onJoin} disabled={connectionStatus === 'connecting'} />
      <div className="flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
        <span className="text-[#747878]">No registration required</span>
        <span className="rounded-full border border-[#c4c7c7] bg-[#edeeef] px-3 py-1 font-mono text-[11px] uppercase tracking-[0.14em] text-[#444748]">
          {connectionStatus}
        </span>
      </div>
      {errorMessage ? (
        <div className="rounded-lg border border-[#ba1a1a]/30 bg-[#ba1a1a]/5 px-3 py-2 text-sm text-[#ba1a1a]">
          {errorMessage}
        </div>
      ) : null}
    </Card>
  </main>
)

export default NameEntryPage
