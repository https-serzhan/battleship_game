import { useState } from 'react'
import { Button } from '../../../shared/ui/Button'
import { Input } from '../../../shared/ui/Input'

interface JoinPlatformFormProps {
  onJoin: (name: string) => void
  disabled?: boolean
}

export const JoinPlatformForm = ({ onJoin, disabled }: JoinPlatformFormProps) => {
  const [name, setName] = useState('')
  const [localError, setLocalError] = useState('')

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmed = name.trim()

    if (!trimmed) {
      setLocalError('Enter a name')
      return
    }

    setLocalError('')
    onJoin(trimmed)
  }

  return (
    <form className="space-y-4" onSubmit={submit}>
      <div className="space-y-2">
        <label
          className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-[#444748]"
          htmlFor="player-name"
        >
          Command Sign
        </label>
        <Input
          id="player-name"
          value={name}
          maxLength={40}
          placeholder="Enter call sign"
          disabled={disabled}
          invalid={Boolean(localError)}
          onChange={(event) => setName(event.target.value)}
        />
      </div>
      {localError ? <p className="text-sm text-[#ba1a1a]">{localError}</p> : null}
      <Button className="w-full" type="submit" disabled={disabled} tactical>
        Enter Lobby
      </Button>
    </form>
  )
}
