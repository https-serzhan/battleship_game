import { validateShipConfig } from "./gameRules";
import type { Cell, Ship, ShipConfigItem } from "./types";

type Orientation = "horizontal" | "vertical";

const keyFor = (cell: Cell): string => `${cell.x}:${cell.y}`;

const buildCells = (
  x: number,
  y: number,
  size: number,
  orientation: Orientation,
): Cell[] =>
  Array.from({ length: size }, (_, index) => ({
    x: orientation === "horizontal" ? x + index : x,
    y: orientation === "horizontal" ? y : y + index,
  }));

const isInsideBoard = (gridSize: number, cell: Cell): boolean =>
  cell.x >= 0 && cell.y >= 0 && cell.x < gridSize && cell.y < gridSize;

const expandShipSizes = (shipConfig: ShipConfigItem[]): number[] =>
  shipConfig
    .flatMap((item) => Array.from({ length: item.count }, () => item.size))
    .sort((left, right) => right - left);

export const generateRandomShips = (
  gridSize: number,
  shipConfig: ShipConfigItem[],
): Ship[] => {
  validateShipConfig(gridSize, shipConfig);

  const shipSizes = expandShipSizes(shipConfig);

  for (let layoutAttempt = 0; layoutAttempt < 100; layoutAttempt += 1) {
    const occupied = new Set<string>();
    const ships: Ship[] = [];

    for (const size of shipSizes) {
      let placed: Ship | null = null;

      for (let attempt = 0; attempt < 200 && !placed; attempt += 1) {
        const orientation: Orientation =
          Math.random() >= 0.5 ? "horizontal" : "vertical";
        const maxX = orientation === "horizontal" ? gridSize - size : gridSize - 1;
        const maxY = orientation === "horizontal" ? gridSize - 1 : gridSize - size;

        if (maxX < 0 || maxY < 0) {
          break;
        }

        const x = Math.floor(Math.random() * (maxX + 1));
        const y = Math.floor(Math.random() * (maxY + 1));
        const cells = buildCells(x, y, size, orientation);

        if (
          cells.every(
            (cell) => isInsideBoard(gridSize, cell) && !occupied.has(keyFor(cell)),
          )
        ) {
          placed = {
            id: `ship-${ships.length + 1}`,
            size,
            cells,
          };
        }
      }

      if (!placed) {
        break;
      }

      for (const cell of placed.cells) {
        occupied.add(keyFor(cell));
      }

      ships.push(placed);
    }

    if (ships.length === shipSizes.length) {
      return ships;
    }
  }

  throw new Error(
    "Could not generate a valid random ship layout for this configuration.",
  );
};

export const autoPlaceShips = generateRandomShips;
