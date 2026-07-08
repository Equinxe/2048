const {
  SIZE,
  LEADERBOARD_SIZE,
  createEmptyBoard,
  addRandomTile,
  boardsEqual,
  move,
  canMove,
  qualifiesForLeaderboard,
  addToLeaderboard,
} = GameLogic;

const WIN_VALUE = 2048;
const STORAGE_LEADERBOARD = "2048-leaderboard";

const gridBackground = document.getElementById("grid-background");
const tileContainer = document.getElementById("tile-container");
const scoreEl = document.getElementById("score");
const bestScoreEl = document.getElementById("best-score");
const overlay = document.getElementById("overlay");
const overlayMessage = document.getElementById("overlay-message");
const overlayContinue = document.getElementById("overlay-continue");
const overlayRetry = document.getElementById("overlay-retry");
const newGameBtn = document.getElementById("new-game");
const leaderboardBtn = document.getElementById("leaderboard-btn");
const leaderboardModal = document.getElementById("leaderboard-modal");
const leaderboardClose = document.getElementById("leaderboard-close");
const leaderboardList = document.getElementById("leaderboard-list");
const nameEntryForm = document.getElementById("name-entry-form");
const nameEntryInput = document.getElementById("name-entry-input");
const nameEntrySubmit = document.getElementById("name-entry-submit");

let board = [];
let score = 0;
let leaderboard = JSON.parse(localStorage.getItem(STORAGE_LEADERBOARD)) || [];
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
  const bestScore = leaderboard.length > 0 ? leaderboard[0].score : 0;
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
    if (qualifiesForLeaderboard(leaderboard, score)) {
      showNameEntry();
    } else {
      showOverlay("Partie terminée", { allowContinue: false });
    }
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

function showNameEntry() {
  overlay.classList.remove("hidden");
  overlayMessage.textContent = "Partie terminée";
  overlayMessage.classList.remove("hidden");
  nameEntryForm.classList.remove("hidden");
  overlayContinue.classList.add("hidden");
  overlayRetry.classList.add("hidden");
  nameEntryInput.focus();
}

function hideNameEntry() {
  nameEntryForm.classList.add("hidden");
  overlay.classList.add("hidden");
}

function saveScore(name) {
  const trimmedName = name.trim() || "Joueur";
  leaderboard = addToLeaderboard(leaderboard, {
    name: trimmedName,
    score: score,
  });
  localStorage.setItem(STORAGE_LEADERBOARD, JSON.stringify(leaderboard));
  hideNameEntry();
  showOverlay("Score sauvegardé !", { allowContinue: false });
  setTimeout(() => {
    hideOverlay();
  }, 1000);
}

function showLeaderboard() {
  leaderboardList.innerHTML = "";
  if (leaderboard.length === 0) {
    const emptyMsg = document.createElement("p");
    emptyMsg.textContent = "Aucun score enregistré";
    emptyMsg.style.textAlign = "center";
    emptyMsg.style.color = "var(--text-dark)";
    leaderboardList.appendChild(emptyMsg);
  } else {
    leaderboard.forEach((entry, index) => {
      const row = document.createElement("div");
      row.className = "leaderboard-row";
      const rank = document.createElement("span");
      rank.className = "leaderboard-rank";
      rank.textContent = `#${index + 1}`;
      const name = document.createElement("span");
      name.className = "leaderboard-name";
      name.textContent = entry.name;
      const scoreDisplay = document.createElement("span");
      scoreDisplay.className = "leaderboard-score";
      scoreDisplay.textContent = entry.score;
      row.appendChild(rank);
      row.appendChild(name);
      row.appendChild(scoreDisplay);
      leaderboardList.appendChild(row);
    });
  }
  leaderboardModal.classList.remove("hidden");
}

function hideLeaderboard() {
  leaderboardModal.classList.add("hidden");
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
  hideLeaderboard();
  hideNameEntry();
  render();
}

function onNameEntrySubmit(e) {
  e.preventDefault();
  const name = nameEntryInput.value;
  nameEntryInput.value = "";
  saveScore(name);
}

document.addEventListener("keydown", onKeyDown);
newGameBtn.addEventListener("click", newGame);
overlayRetry.addEventListener("click", newGame);
overlayContinue.addEventListener("click", continueGame);
leaderboardBtn.addEventListener("click", showLeaderboard);
leaderboardClose.addEventListener("click", hideLeaderboard);
nameEntryForm.addEventListener("submit", onNameEntrySubmit);

buildGridBackground();
newGame();
