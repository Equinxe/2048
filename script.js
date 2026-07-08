const { SIZE, createEmptyBoard, addRandomTile, boardsEqual, move, canMove } =
  GameLogic;

const WIN_VALUE = 2048;
const STORAGE_BEST = "2048-best-score";

const gridBackground = document.getElementById("grid-background");
const tileContainer = document.getElementById("tile-container");
const scoreEl = document.getElementById("score");
const bestScoreEl = document.getElementById("best-score");
const overlay = document.getElementById("overlay");
const overlayMessage = document.getElementById("overlay-message");
const overlayContinue = document.getElementById("overlay-continue");
const overlayRetry = document.getElementById("overlay-retry");
const newGameBtn = document.getElementById("new-game");

let board = [];
let score = 0;
let bestScore = Number(localStorage.getItem(STORAGE_BEST)) || 0;
let hasWon = false;
let isGameOver = false;
let isPaused = false;

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

function showOverlay(message, { allowContinue }) {
  overlayMessage.textContent = message;
  overlayContinue.classList.toggle("hidden", !allowContinue);
  overlay.classList.remove("hidden");
}

function hideOverlay() {
  overlay.classList.add("hidden");
}

function handleMove(direction) {
  if (isGameOver || isPaused) return;

  const { board: newBoard, gained } = move(board, direction);
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
    isPaused = true;
    showOverlay("Vous avez gagné !", { allowContinue: true });
    return;
  }

  if (!canMove(board)) {
    isGameOver = true;
    showOverlay("Partie terminée", { allowContinue: false });
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

function continueGame() {
  isPaused = false;
  hideOverlay();
}

function newGame() {
  board = createEmptyBoard();
  score = 0;
  hasWon = false;
  isGameOver = false;
  isPaused = false;
  addRandomTile(board);
  addRandomTile(board);
  hideOverlay();
  render();
}

document.addEventListener("keydown", onKeyDown);
newGameBtn.addEventListener("click", newGame);
overlayRetry.addEventListener("click", newGame);
overlayContinue.addEventListener("click", continueGame);

buildGridBackground();
newGame();
