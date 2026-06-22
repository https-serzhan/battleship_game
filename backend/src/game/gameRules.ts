import type { Cell, Ship, ShipConfigItem, ShotRecord, ShotResult } from "./types";

const keyFor = (cell: Cell): string => `${cell.x}:${cell.y}`;

const isBoardCoordinate = (gridSize: number, cell: Cell): boolean =>
  Number.isInteger(cell.x) &&
  Number.isInteger(cell.y) &&
  cell.x >= 0 &&
  cell.y >= 0 &&
  cell.x < gridSize &&
  cell.y < gridSize;

const expectedCountsBySize = (shipConfig: ShipConfigItem[]): Map<number, number> => {
  const counts = new Map<number, number>();

  for (const item of shipConfig) {
    counts.set(item.size, (counts.get(item.size) ?? 0) + item.count);
  }

  return counts;
};

const hitShotKeys = (shots: ShotRecord[]): Set<string> => {
  const keys = new Set<string>();

  for (const shot of shots) {
    if (shot.result !== "miss") {
      keys.add(keyFor(shot));
    }
  }

  return keys;
};

const validateStraightContiguous = (ship: Ship): void => {
  if (ship.cells.length === 1) {
    return;
  }

  const sameX = ship.cells.every((cell) => cell.x === ship.cells[0].x);
  const sameY = ship.cells.every((cell) => cell.y === ship.cells[0].y);

  if (!sameX && !sameY) {
    throw new Error("Ship cells must form a straight line");
  }

  const values = ship.cells
    .map((cell) => (sameX ? cell.y : cell.x))
    .sort((left, right) => left - right);

  for (let index = 1; index < values.length; index += 1) {
    if (values[index] !== values[index - 1] + 1) {
      throw new Error("Ship cells must be contiguous");
    }
  }
};

export const validateShipConfig = (
  gridSize: number,
  shipConfig: ShipConfigItem[],
): void => {
  if (!Number.isInteger(gridSize) || gridSize < 6 || gridSize > 15) {
    throw new Error("Grid size must be an integer from 6 to 15");
  }

  if (shipConfig.length === 0) {
    throw new Error("Ship configuration cannot be empty");
  }

  let totalCells = 0;

  for (const item of shipConfig) {
    if (!Number.isInteger(item.size) || item.size < 1) {
      throw new Error("Each ship size must be a positive integer");
    }

    if (!Number.isInteger(item.count) || item.count < 1) {
      throw new Error("Each ship count must be a positive integer");
    }

    if (item.size > gridSize) {
      throw new Error("Ship size cannot exceed grid size");
    }

    totalCells += item.size * item.count;
  }

  if (totalCells > gridSize * gridSize) {
    throw new Error("Ship cells must fit on the board");
  }
};

export const validateShipsPlacement = (
  gridSize: number,
  shipConfig: ShipConfigItem[],
  ships: Ship[],
): void => {
  validateShipConfig(gridSize, shipConfig);

  const expectedCounts = expectedCountsBySize(shipConfig);
  const actualCounts = new Map<number, number>();
  const occupied = new Set<string>();
  const ids = new Set<string>();
  const expectedShipTotal = [...expectedCounts.values()].reduce(
    (total, count) => total + count,
    0,
  );

  if (ships.length !== expectedShipTotal) {
    throw new Error("Ship count does not match configuration");
  }

  for (const ship of ships) {
    if (ship.id.trim().length === 0) {
      throw new Error("Ship id is required");
    }

    if (ids.has(ship.id)) {
      throw new Error("Ship ids must be unique");
    }

    ids.add(ship.id);

    if (!Number.isInteger(ship.size) || ship.size < 1) {
      throw new Error("Ship size must be a positive integer");
    }

    if (ship.cells.length !== ship.size) {
      throw new Error("Ship cell count must match ship size");
    }

    if (!expectedCounts.has(ship.size)) {
      throw new Error("Ship size is not allowed by configuration");
    }

    const localCells = new Set<string>();

    for (const cell of ship.cells) {
      if (!isBoardCoordinate(gridSize, cell)) {
        throw new Error("Ship cells must be inside the board");
      }

      const key = keyFor(cell);

      if (localCells.has(key)) {
        throw new Error("Ship cells cannot repeat");
      }

      if (occupied.has(key)) {
        throw new Error("Ships cannot overlap");
      }

      localCells.add(key);
      occupied.add(key);
    }

    validateStraightContiguous(ship);
    actualCounts.set(ship.size, (actualCounts.get(ship.size) ?? 0) + 1);
  }

  for (const [size, expected] of expectedCounts) {
    if ((actualCounts.get(size) ?? 0) !== expected) {
      throw new Error(`Expected ${expected} ship(s) of size ${size}`);
    }
  }
};

export const getShotResult = (
  opponentShips: Ship[],
  x: number,
  y: number,
  previousShots: ShotRecord[],
): Exclude<ShotResult, "win"> => {
  if (previousShots.some((shot) => shot.x === x && shot.y === y)) {
    throw new Error("This cell has already been targeted");
  }

  const targetShip = opponentShips.find((ship) =>
    ship.cells.some((cell) => cell.x === x && cell.y === y),
  );

  if (!targetShip) {
    return "miss";
  }

  const hitKeys = hitShotKeys(previousShots);
  hitKeys.add(keyFor({ x, y }));

  return targetShip.cells.every((cell) => hitKeys.has(keyFor(cell)))
    ? "sunk"
    : "hit";
};

export const areAllShipsSunk = (ships: Ship[], shots: ShotRecord[]): boolean => {
  const hitKeys = hitShotKeys(shots);

  return ships.every((ship) =>
    ship.cells.every((cell) => hitKeys.has(keyFor(cell))),
  );
};

export const isInsideBoard = (gridSize: number, cell: Cell): boolean =>
  isBoardCoordinate(gridSize, cell);
