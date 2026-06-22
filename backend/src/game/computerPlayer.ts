import type { Cell, ShotRecord } from "./types";

const keyFor = (cell: Cell): string => `${cell.x}:${cell.y}`;

export const chooseComputerShot = (
  gridSize: number,
  previousShots: ShotRecord[],
): Cell => {
  const used = new Set(previousShots.map((shot) => keyFor(shot)));
  const available: Cell[] = [];

  for (let y = 0; y < gridSize; y += 1) {
    for (let x = 0; x < gridSize; x += 1) {
      const cell = { x, y };

      if (!used.has(keyFor(cell))) {
        available.push(cell);
      }
    }
  }

  if (available.length === 0) {
    throw new Error("No available cells remain");
  }

  return available[Math.floor(Math.random() * available.length)];
};

export const randomShot = chooseComputerShot;
