import { validateShipConfig } from "./gameRules";
import type { Cell, Ship, ShipConfigItem } from "./types";

const keyFor = (cell: Cell): string => `${cell.x}:${cell.y}`;

const buildCells = (
  x: number,
  y: number,
  size: number,
  horizontal: boolean,
): Cell[] =>
  Array.from({ length: size }, (_, index) => ({
    x: horizontal ? x + index : x,
    y: horizontal ? y : y + index,
  }));

export const autoPlaceShips = (
  gridSize: number,
  shipConfig: ShipConfigItem[],
): Ship[] => {
  validateShipConfig(gridSize, shipConfig);

  const occupied = new Set<string>();
  const ships: Ship[] = [];

  for (const item of shipConfig) {
    for (let countIndex = 0; countIndex < item.count; countIndex += 1) {
      let placed: Ship | null = null;

      for (let attempt = 0; attempt < 1000 && !placed; attempt += 1) {
        const horizontal = Math.random() >= 0.5;
        const maxX = horizontal ? gridSize - item.size : gridSize - 1;
        const maxY = horizontal ? gridSize - 1 : gridSize - item.size;
        const x = Math.floor(Math.random() * (maxX + 1));
        const y = Math.floor(Math.random() * (maxY + 1));
        const cells = buildCells(x, y, item.size, horizontal);

        if (cells.every((cell) => !occupied.has(keyFor(cell)))) {
          placed = {
            id: `ship-${ships.length + 1}`,
            size: item.size,
            cells,
          };
        }
      }

      if (!placed) {
        throw new Error("Unable to place ships automatically");
      }

      for (const cell of placed.cells) {
        occupied.add(keyFor(cell));
      }

      ships.push(placed);
    }
  }

  return ships;
};
