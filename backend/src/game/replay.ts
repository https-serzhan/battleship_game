import type { MoveRecord, ReplayEvent } from "./types";

export const serializeMoveToReplayEvent = (move: MoveRecord): ReplayEvent => ({
  type: "shot",
  gameId: move.gameId,
  turnNumber: move.turnNumber,
  playerId: move.playerId,
  x: move.x,
  y: move.y,
  result: move.result,
  createdAt: move.createdAt,
});

export const serializeMovesToReplayEvents = (
  moves: MoveRecord[],
): ReplayEvent[] => moves.map(serializeMoveToReplayEvent);
