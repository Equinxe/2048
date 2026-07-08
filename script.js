(() => {
  const SIZE = 4;
  const WIN_VALUE = 2048;
  const STORAGE_BEST = "2048-best-score";

  const gridBackground = document.getElementById("grid-background");
  const tileContainer = document.getElementById("tile-container");
  const scoreEl = document.getElementById("score");
  const bestScoreEl = document.getElementById("best-score");
  const overlay = document.getElementById("overlay");
  const overlayMessage = document.getElementById("overlay-message");
  const overlayRetry = document.getElementById("overlay-retry");
  const newGameBtn = document.getElementById("new-game");

  let board = [];
  let score = 0;
  let bestScore = Number(localStorage.getItem(STORAGE_BEST)) || 0;
  let hasWon = false;
  let isGameOver = false;

  function createEmptyBoard() {
    return Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
  }

  function getEmptyCells(b) {
    const cells = [];
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (b[r][c] === 0) cells.push([r, c]);
      }
    }
    return cells;
  }

  function addRandomTile(b) {
    const empty = getEmptyCells(b);
    if (empty.length === 0) return false;
    const [r, c] = empty[Math.floor(Math.random() * empty.length)];
    b[r][c] = Math.random() < 0.9 ? 2 : 4;
    return true;
  }

  function cloneBoard(b) {
    return b.map((row) => row.slice());
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

  function transpose(b) {
    const t = createEmptyBoard();
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        t[c][r] = b[r][c];
      }
    }
    return t;
  }

  function reverseRows(b) {
    return b.map((row) => row.slice().reverse());
  }

  function move(direction) {
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

  function render() {
    tileContainer.innerHTML = "";
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const value = board[r][c];
        if (value === 0) continue;
        const tile = document.createElement("div");
        tile.className = "tile";
        tile.dataset.value = value;
        tile.style.gridRowStart = r + 1;
        tile.style.gridColumnStart = c + 1;
        tile.textContent = value;
        tileContainer.appendChild(tile);
      }
    }
    scoreEl.textContent = score;
    bestScoreEl.textContent = bestScore;
  }

  function buildGridBackground() {
    gridBackground.innerHTML = "";
    for (let i = 0; i < SIZE * SIZE; i++) {
      const cell = document.createElement("div");
      cell.className = "grid-cell";
      gridBackground.appendChild(cell);
    }
  }

  function canMove(b) {
    if (getEmptyCells(b).length > 0) return true;
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const v = b[r][c];
        if (c + 1 < SIZE && b[r][c + 1] === v) return true;
        if (r + 1 < SIZE && b[r + 1][c] === v) return true;
      }
    }
    return false;
  }

  function showOverlay(message) {
    overlayMessage.textContent = message;
    overlay.classList.remove("hidden");
  }

  function hideOverlay() {
    overlay.classList.add("hidden");
  }

  function handleMove(direction) {
    if (isGameOver) return;

    const { board: newBoard, gained } = move(direction);
    if (boardsEqual(board, newBoard)) return;

    board = newBoard;
    score += gained;
    if (score > bestScore) {
      bestScore = score;
      localStorage.setItem(STORAGE_BEST, String(bestScore));
    }

    addRandomTile(board);
    render();

    if (!hasWon && board.some((row) => row.includes(WIN_VALUE))) {
      hasWon = true;
      showOverlay("Vous avez gagné !");
      return;
    }

    if (!canMove(board)) {
      isGameOver = true;
      showOverlay("Partie terminée");
    }
  }

  const KEY_DIRECTIONS = {
    ArrowLeft: "left",
    ArrowRight: "right",
    ArrowUp: "up",
    ArrowDown: "down",
  };

  function onKeyDown(e) {
    const direction = KEY_DIRECTIONS[e.key];
    if (!direction) return;
    e.preventDefault();
    handleMove(direction);
  }

  function newGame() {
    board = createEmptyBoard();
    score = 0;
    hasWon = false;
    isGameOver = false;
    addRandomTile(board);
    addRandomTile(board);
    hideOverlay();
    render();
  }

  document.addEventListener("keydown", onKeyDown);
  newGameBtn.addEventListener("click", newGame);
  overlayRetry.addEventListener("click", newGame);

  buildGridBackground();
  newGame();
})();
