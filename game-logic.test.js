import { describe, it, expect } from "vitest";
// game-logic.js is a classic (non-module) script on purpose, so it can be
// opened directly via file:// without a server. It attaches its API to
// `globalThis.GameLogic` as a side effect of being loaded.
import "./game-logic.js";

const {
  SIZE,
  LEADERBOARD_SIZE,
  createEmptyBoard,
  getEmptyCells,
  addRandomTile,
  boardsEqual,
  slideRowLeft,
  transpose,
  reverseRows,
  move,
  canMove,
  qualifiesForLeaderboard,
  addToLeaderboard,
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

describe("qualifiesForLeaderboard", () => {
  it("rejects non-positive scores", () => {
    const leaderboard = [{ name: "Test", score: 100 }];
    expect(qualifiesForLeaderboard(leaderboard, 0)).toBe(false);
    expect(qualifiesForLeaderboard(leaderboard, -1)).toBe(false);
  });

  it("accepts any positive score into an empty leaderboard", () => {
    expect(qualifiesForLeaderboard([], 1)).toBe(true);
    expect(qualifiesForLeaderboard([], 1000)).toBe(true);
  });

  it("accepts scores into a partially-full leaderboard", () => {
    const leaderboard = [
      { name: "Alice", score: 500 },
      { name: "Bob", score: 300 },
    ];
    expect(qualifiesForLeaderboard(leaderboard, 100)).toBe(true);
    expect(qualifiesForLeaderboard(leaderboard, 1)).toBe(true);
  });

  it("accepts higher scores into a full leaderboard", () => {
    const leaderboard = Array.from({ length: LEADERBOARD_SIZE }, (_, i) => ({
      name: `Player${i}`,
      score: 1000 - i * 100,
    }));
    expect(qualifiesForLeaderboard(leaderboard, 101)).toBe(true);
  });

  it("rejects lower scores when leaderboard is full", () => {
    const leaderboard = Array.from({ length: LEADERBOARD_SIZE }, (_, i) => ({
      name: `Player${i}`,
      score: 1000 - i * 100,
    }));
    const lowestScore = leaderboard[leaderboard.length - 1].score;
    expect(qualifiesForLeaderboard(leaderboard, lowestScore - 1)).toBe(false);
  });

  it("accepts scores strictly higher than the lowest in a full leaderboard", () => {
    const leaderboard = Array.from({ length: LEADERBOARD_SIZE }, (_, i) => ({
      name: `Player${i}`,
      score: 1000 - i * 100,
    }));
    const lowestScore = leaderboard[leaderboard.length - 1].score;
    expect(qualifiesForLeaderboard(leaderboard, lowestScore)).toBe(false);
    expect(qualifiesForLeaderboard(leaderboard, lowestScore + 1)).toBe(true);
  });
});

describe("addToLeaderboard", () => {
  it("adds an entry to an empty leaderboard", () => {
    const result = addToLeaderboard([], { name: "Alice", score: 100 });
    expect(result).toEqual([{ name: "Alice", score: 100 }]);
  });

  it("maintains sorted order (descending by score)", () => {
    let lb = [];
    lb = addToLeaderboard(lb, { name: "Alice", score: 500 });
    lb = addToLeaderboard(lb, { name: "Bob", score: 1000 });
    lb = addToLeaderboard(lb, { name: "Charlie", score: 200 });
    expect(lb).toEqual([
      { name: "Bob", score: 1000 },
      { name: "Alice", score: 500 },
      { name: "Charlie", score: 200 },
    ]);
  });

  it("caps leaderboard at LEADERBOARD_SIZE entries", () => {
    let lb = Array.from({ length: LEADERBOARD_SIZE }, (_, i) => ({
      name: `Player${i}`,
      score: 1000 - i * 50,
    }));
    lb = addToLeaderboard(lb, { name: "NewPlayer", score: 750 });
    expect(lb).toHaveLength(LEADERBOARD_SIZE);
    expect(lb.some((entry) => entry.name === "NewPlayer")).toBe(true);
  });

  it("drops the lowest score when adding to a full leaderboard", () => {
    let lb = Array.from({ length: LEADERBOARD_SIZE }, (_, i) => ({
      name: `Player${i}`,
      score: 1000 - i * 50,
    }));
    const oldLowest = lb[lb.length - 1];
    lb = addToLeaderboard(lb, { name: "NewPlayer", score: 600 });
    expect(lb).not.toContainEqual(oldLowest);
    expect(lb).toHaveLength(LEADERBOARD_SIZE);
  });

  it("does not mutate the input array", () => {
    const original = [{ name: "Alice", score: 500 }];
    const snapshot = JSON.parse(JSON.stringify(original));
    addToLeaderboard(original, { name: "Bob", score: 1000 });
    expect(original).toEqual(snapshot);
  });

  it("preserves stable ordering on tied scores (first-added preserved)", () => {
    let lb = [];
    lb = addToLeaderboard(lb, { name: "Alice", score: 100 });
    lb = addToLeaderboard(lb, { name: "Bob", score: 100 });
    lb = addToLeaderboard(lb, { name: "Charlie", score: 100 });
    expect(lb[0].name).toBe("Alice");
    expect(lb[1].name).toBe("Bob");
    expect(lb[2].name).toBe("Charlie");
  });
});
