export type GameStatus = "waiting" | "setup" | "in_progress" | "finished";
export type GameMode = "pvp" | "computer";
export type PlayerRole = "A" | "B";
export type ShotResult = "hit" | "miss" | "sunk" | "win";
export type ReplayEventType = "shot";

export interface Cell {
  x: number;
  y: number;
}

export interface ShipConfigItem {
  size: number;
  count: number;
}

export interface Ship {
  id: string;
  size: number;
  cells: Cell[];
}

export interface ShotRecord extends Cell {
  result: ShotResult;
  turnNumber: number;
  playerId: number;
}

export interface Player {
  id: number;
  baseName: string;
  displayName: string;
  sessionToken: string;
  createdAt: string;
  lastSeenAt: string;
}

export interface PlayerSummary {
  id: number;
  baseName: string;
  displayName: string;
}

export interface PlayerStats {
  playerId: number;
  gamesPlayed: number;
  wins: number;
  losses: number;
  shots: number;
  hits: number;
  misses: number;
}

export interface MoveRecord extends Cell {
  id: number;
  gameId: number;
  turnNumber: number;
  playerId: number;
  result: ShotResult;
  createdAt: string;
}

export interface LobbyGame {
  id: number;
  status: GameStatus;
  mode: GameMode;
  gridSize: number;
  shipConfig: ShipConfigItem[];
  creator: PlayerSummary;
  opponent: PlayerSummary | null;
  createdAt: string;
}

export interface PublicBoard {
  ships: Ship[];
  shotsFired: ShotRecord[];
  shotsReceived: ShotRecord[];
}

export interface GameParticipant {
  player: PlayerSummary;
  role: PlayerRole;
  ready: boolean;
  isViewer: boolean;
  board: PublicBoard;
}

export interface GameView {
  id: number;
  status: GameStatus;
  mode: GameMode;
  gridSize: number;
  shipConfig: ShipConfigItem[];
  creatorPlayerId: number;
  opponentPlayerId: number | null;
  currentTurnPlayerId: number | null;
  winnerPlayerId: number | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  players: GameParticipant[];
  moves: MoveRecord[];
}

export interface ReplayEvent {
  type: ReplayEventType;
  gameId: number;
  turnNumber: number;
  playerId: number;
  x: number;
  y: number;
  result: ShotResult;
  createdAt: string;
}

export interface ReplayData {
  game: {
    id: number;
    gridSize: number;
    mode: GameMode;
    status: "finished";
    winnerPlayerId: number | null;
    createdAt: string;
    startedAt: string | null;
    finishedAt: string | null;
  };
  players: Array<{
    playerId: number;
    displayName: string;
    role: PlayerRole;
    ships: Ship[];
  }>;
  moves: Array<{
    id: number;
    turnNumber: number;
    playerId: number;
    displayName: string;
    x: number;
    y: number;
    result: ShotResult;
    createdAt: string;
  }>;
}
