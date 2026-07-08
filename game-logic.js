// UMD-lite: exposes `GameLogic` as a global for the browser (classic <script>,
// no bundler/server needed to open index.html directly), and via `module.exports`
// for Node/Vitest. No `import`/`export` keywords on purpose — this file must stay
// loadable as a plain classic script.
(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
  root.GameLogic = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const SIZE = 4;

  function createEmptyBoard() {
    return Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
  }

  function getEmptyCells(board) {
    const cells = [];
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (board[r][c] === 0) cells.push([r, c]);
      }
    }
    return cells;
  }

  function addRandomTile(board, rng = Math.random) {
    const empty = getEmptyCells(board);
    if (empty.length === 0) return false;
    const [r, c] = empty[Math.floor(rng() * empty.length)];
    board[r][c] = rng() < 0.9 ? 2 : 4;
    return true;
  }

  function cloneBoard(board) {
    return board.map((row) => row.slice());
  }

  function boardsEqual(a, b) {
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (a[r][c] !== b[r][c]) return false;
      }
    }
    return true;
  }

  // Slides a single row to the left, merging equal adjacent tiles once.
  function slideRowLeft(row) {
    const values = row.filter((v) => v !== 0);
    const result = [];
    let gained = 0;

    for (let i = 0; i < values.length; i++) {
      if (values[i] === values[i + 1]) {
        const merged = values[i] * 2;
        result.push(merged);
        gained += merged;
        i++;
      } else {
        result.push(values[i]);
      }
    }

    while (result.length < SIZE) result.push(0);
    return { row: result, gained };
  }

  function transpose(board) {
    const t = createEmptyBoard();
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        t[c][r] = board[r][c];
      }
    }
    return t;
  }

  function reverseRows(board) {
    return board.map((row) => row.slice().reverse());
  }

  function move(board, direction) {
    let working = cloneBoard(board);
    let transposed = false;
    let reversed = false;

    if (direction === "up" || direction === "down") {
      working = transpose(working);
      transposed = true;
    }
    if (direction === "right" || direction === "down") {
      working = reverseRows(working);
      reversed = true;
    }

    let gainedTotal = 0;
    const newRows = working.map((row) => {
      const { row: slid, gained } = slideRowLeft(row);
      gainedTotal += gained;
      return slid;
    });

    let result = newRows;
    if (reversed) result = reverseRows(result);
    if (transposed) result = transpose(result);

    return { board: result, gained: gainedTotal };
  }

  function canMove(board) {
    if (getEmptyCells(board).length > 0) return true;
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const v = board[r][c];
        if (c + 1 < SIZE && board[r][c + 1] === v) return true;
        if (r + 1 < SIZE && board[r + 1][c] === v) return true;
      }
    }
    return false;
  }

  const LEADERBOARD_SIZE = 10;

  function qualifiesForLeaderboard(leaderboard, score) {
    if (score <= 0) return false;
    if (leaderboard.length < LEADERBOARD_SIZE) return true;
    return score > leaderboard[leaderboard.length - 1].score;
  }

  function addToLeaderboard(leaderboard, entry) {
    const newLeaderboard = [...leaderboard, entry];
    newLeaderboard.sort((a, b) => b.score - a.score);
    return newLeaderboard.slice(0, LEADERBOARD_SIZE);
  }

  return {
    SIZE,
    LEADERBOARD_SIZE,
    createEmptyBoard,
    getEmptyCells,
    addRandomTile,
    cloneBoard,
    boardsEqual,
    slideRowLeft,
    transpose,
    reverseRows,
    move,
    canMove,
    qualifiesForLeaderboard,
    addToLeaderboard,
  };
});
