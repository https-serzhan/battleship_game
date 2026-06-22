import { Button } from '../../../shared/ui/Button'

interface JoinGameButtonProps {
  gameId: number
  onJoinGame: (gameId: number) => void
}

export const JoinGameButton = ({ gameId, onJoinGame }: JoinGameButtonProps) => (
  <Button onClick={() => onJoinGame(gameId)} tactical>
    Join
  </Button>
)
