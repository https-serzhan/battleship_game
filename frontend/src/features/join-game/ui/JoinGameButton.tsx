import { Button } from '../../../shared/ui/Button'

interface JoinGameButtonProps {
  gameId: number
  disabled?: boolean
  onJoinGame: (gameId: number) => void
}

export const JoinGameButton = ({
  gameId,
  disabled = false,
  onJoinGame,
}: JoinGameButtonProps) => (
  <Button disabled={disabled} onClick={() => onJoinGame(gameId)} tactical>
    {disabled ? 'Your game' : 'Join'}
  </Button>
)
