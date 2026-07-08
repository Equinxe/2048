import { describe, it, expect } from "vitest";
// game-logic.js is a classic (non-module) script on purpose, so it can be
// opened directly via file:// without a server. It attaches its API to
// `globalThis.GameLogic` as a side effect of being loaded.
import "./game-logic.js";

const {
  SIZE,
  createEmptyBoard,
  getEmptyCells,
  addRandomTile,
  boardsEqual,
  slideRowLeft,
  transpose,
  reverseRows,
  move,
  canMove,
} = globalThis.GameLogic;

describe("slideRowLeft", () => {
  it("merges a full run of equal values pairwise, not chained", () => {
    expect(slideRowLeft([2, 2, 2, 2])).toEqual({ row: [4, 4, 0, 0], gained: 8 });
  });

  it("merges only the first pair in a triple run, leaving the third alone", () => {
    expect(slideRowLeft([2, 2, 2, 0])).toEqual({ row: [4, 2, 0, 0], gained: 4 });
  });

  it("compacts and merges values separated by gaps", () => {
    expect(slideRowLeft([0, 0, 2, 2])).toEqual({ row: [4, 0, 0, 0], gained: 4 });
    expect(slideRowLeft([2, 0, 0, 2])).toEqual({ row: [4, 0, 0, 0], gained: 4 });
  });

  it("does not merge unequal neighbors", () => {
    expect(slideRowLeft([4, 2, 2, 4])).toEqual({ row: [4, 4, 4, 0], gained: 4 });
  });

  it("leaves an already-slid row unchanged", () => {
    expect(slideRowLeft([2, 4, 8, 16])).toEqual({ row: [2, 4, 8, 16], gained: 0 });
  });

  it("handles an empty row", () => {
    expect(slideRowLeft([0, 0, 0, 0])).toEqual({ row: [0, 0, 0, 0], gained: 0 });
  });
});

describe("transpose / reverseRows", () => {
  it("transpose is its own inverse", () => {
    const board = [
      [1, 2, 3, 4],
      [5, 6, 7, 8],
      [9, 10, 11, 12],
      [13, 14, 15, 16],
    ];
    expect(transpose(transpose(board))).toEqual(board);
  });

  it("transpose swaps rows and columns correctly", () => {
    const board = [
      [1, 2, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    expect(transpose(board)).toEqual([
      [1, 0, 0, 0],
      [2, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ]);
  });

  it("reverseRows reverses each row independently", () => {
    const board = [
      [1, 2, 3, 4],
      [0, 0, 0, 5],
    ];
    expect(reverseRows(board)).toEqual([
      [4, 3, 2, 1],
      [5, 0, 0, 0],
    ]);
  });
});

describe("move", () => {
  const board = () => [
    [2, 2, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 2, 2],
  ];

  it("slides left", () => {
    const { board: result, gained } = move(board(), "left");
    expect(result).toEqual([
      [4, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [4, 0, 0, 0],
    ]);
    expect(gained).toBe(8);
  });

  it("slides right", () => {
    const { board: result } = move(board(), "right");
    expect(result).toEqual([
      [0, 0, 0, 4],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 4],
    ]);
  });

  it("slides up", () => {
    const vertical = [
      [2, 0, 0, 0],
      [2, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    const { board: result, gained } = move(vertical, "up");
    expect(result).toEqual([
      [4, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ]);
    expect(gained).toBe(4);
  });

  it("slides down", () => {
    const vertical = [
      [2, 0, 0, 0],
      [2, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    const { board: result } = move(vertical, "down");
    expect(result).toEqual([
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [4, 0, 0, 0],
    ]);
  });

  it("does not mutate the input board", () => {
    const original = board();
    const snapshot = original.map((row) => row.slice());
    move(original, "left");
    expect(original).toEqual(snapshot);
  });
});

describe("boardsEqual", () => {
  it("detects identical boards", () => {
    expect(boardsEqual(createEmptyBoard(), createEmptyBoard())).toBe(true);
  });

  it("detects a single differing cell", () => {
    const a = createEmptyBoard();
    const b = createEmptyBoard();
    b[0][0] = 2;
    expect(boardsEqual(a, b)).toBe(false);
  });
});

describe("getEmptyCells / addRandomTile", () => {
  it("lists every empty coordinate", () => {
    const board = createEmptyBoard();
    board[0][0] = 2;
    const empty = getEmptyCells(board);
    expect(empty).toHaveLength(SIZE * SIZE - 1);
    expect(empty).not.toContainEqual([0, 0]);
  });

  it("places exactly one tile into an empty cell", () => {
    const board = createEmptyBoard();
    const placed = addRandomTile(board, () => 0);
    expect(placed).toBe(true);
    const nonZero = board.flat().filter((v) => v !== 0);
    expect(nonZero).toHaveLength(1);
  });

  it("uses the rng to choose between 2 and 4", () => {
    const boardLow = createEmptyBoard();
    addRandomTile(boardLow, () => 0);
    expect(boardLow.flat().find((v) => v !== 0)).toBe(2);

    const boardHigh = createEmptyBoard();
    addRandomTile(boardHigh, () => 0.99);
    expect(boardHigh.flat().find((v) => v !== 0)).toBe(4);
  });

  it("returns false when the board is full", () => {
    const full = Array.from({ length: SIZE }, () => Array(SIZE).fill(2));
    expect(addRandomTile(full)).toBe(false);
  });
});

describe("canMove", () => {
  it("is true when there is an empty cell", () => {
    expect(canMove(createEmptyBoard())).toBe(true);
  });

  it("is true when two equal values are adjacent, even with no empty cells", () => {
    const board = [
      [2, 4, 2, 4],
      [4, 2, 4, 2],
      [2, 4, 2, 4],
      [4, 2, 4, 4],
    ];
    expect(canMove(board)).toBe(true);
  });

  it("is false when the board is full with no adjacent equal values", () => {
    const board = [
      [2, 4, 2, 4],
      [4, 2, 4, 2],
      [2, 4, 2, 4],
      [4, 2, 4, 2],
    ];
    expect(canMove(board)).toBe(false);
  });
});
