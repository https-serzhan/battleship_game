export const clientEvents = {
  joinPlatform: "join-platform",
  createGame: "create-game",
  joinGame: "join-game",
  placeShips: "place-ships",
  fire: "fire",
  leaveGame: "leave-game",
} as const;

export const serverEvents = {
  platformJoined: "platform-joined",
  lobbyUpdated: "lobby-updated",
  gameUpdated: "game-updated",
  errorMessage: "error-message",
} as const;

export const gameRoom = (gameId: number): string => `game:${gameId}`;
export const playerRoom = (playerId: number): string => `player:${playerId}`;
