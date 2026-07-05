/* =========================================
   Poker Ledger - script.js
   Vanilla JavaScript, no frameworks.
   ========================================= */

// ----- Constants -----
const BUYIN_VALUE = 500; // Rupees per buy-in
const CHIP_VALUE = 20;   // Rupees per chip
const STORAGE_KEY = "pokerLedgerData";

// ----- App State -----
// players: array of { id, name, buyIns, finalChips }
// history: array of { text, time }
let players = [];
let history = [];
let nextPlayerNumber = 1; // used to generate default names like "Player 1"

// ----- DOM References -----
const playerTableBody = document.getElementById("playerTableBody");
const emptyMessage = document.getElementById("emptyMessage");
const historyList = document.getElementById("historyList");

const addPlayerBtn = document.getElementById("addPlayerBtn");
const transferBtn = document.getElementById("transferBtn");
const resetBtn = document.getElementById("resetBtn");

const transferModal = document.getElementById("transferModal");
const fromSelect = document.getElementById("fromSelect");
const toSelect = document.getElementById("toSelect");
const amountInput = document.getElementById("amountInput");
const transferError = document.getElementById("transferError");
const cancelTransferBtn = document.getElementById("cancelTransferBtn");
const confirmTransferBtn = document.getElementById("confirmTransferBtn");

// =========================================
// PERSISTENCE (localStorage)
// =========================================

// Save the current state to localStorage
function saveState() {
  const data = {
    players: players,
    history: history,
    nextPlayerNumber: nextPlayerNumber
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// Load state from localStorage (if any exists)
function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;

  try {
    const data = JSON.parse(raw);
    players = data.players || [];
    history = data.history || [];
    nextPlayerNumber = data.nextPlayerNumber || 1;
  } catch (err) {
    // If saved data is corrupted, start fresh
    players = [];
    history = [];
    nextPlayerNumber = 1;
  }
}

// =========================================
// HISTORY LOGGING
// =========================================

// Add an entry to the history log (newest entries appear at the top)
function logHistory(text) {
  const now = new Date();
  const time = now.toLocaleString([], {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "short"
  });
  history.unshift({ text: text, time: time });
  renderHistory();
}

// Render the history list in the DOM
function renderHistory() {
  historyList.innerHTML = "";

  if (history.length === 0) {
    const emptyItem = document.createElement("li");
    emptyItem.textContent = "No activity yet.";
    historyList.appendChild(emptyItem);
    return;
  }

  history.forEach((entry) => {
    const item = document.createElement("li");

    const textSpan = document.createElement("span");
    textSpan.textContent = entry.text;

    const timeSpan = document.createElement("span");
    timeSpan.className = "history-time";
    timeSpan.textContent = entry.time;

    item.appendChild(textSpan);
    item.appendChild(timeSpan);
    historyList.appendChild(item);
  });
}

// =========================================
// PLAYER MANAGEMENT
// =========================================

// Generate a unique id for a new player
function generatePlayerId() {
  return "p_" + Date.now() + "_" + Math.floor(Math.random() * 10000);
}

// Add a new player with default values
function addPlayer() {
  const defaultName = "Player " + nextPlayerNumber;
  nextPlayerNumber += 1;

  const newPlayer = {
    id: generatePlayerId(),
    name: defaultName,
    buyIns: 0,
    finalChips: 0
  };

  players.push(newPlayer);
  logHistory(defaultName + " joined the game");
  saveState();
  renderTable();
}

// Rename a player, logging the change if the name actually changed
function renamePlayer(playerId, newName) {
  const player = players.find((p) => p.id === playerId);
  if (!player) return;

  const trimmedName = newName.trim();
  if (trimmedName === "" || trimmedName === player.name) {
    return; // ignore empty or unchanged names
  }

  logHistory("Player renamed: " + player.name + " → " + trimmedName);
  player.name = trimmedName;
  saveState();
}

// Delete a player by id
function deletePlayer(playerId) {
  const player = players.find((p) => p.id === playerId);
  if (!player) return;

  const confirmed = window.confirm("Delete " + player.name + "? This cannot be undone.");
  if (!confirmed) return;

  players = players.filter((p) => p.id !== playerId);
  logHistory("Deleted: " + player.name);
  saveState();
  renderTable();
}

// Increase a player's buy-in count by 1
function increaseBuyIn(playerId) {
  const player = players.find((p) => p.id === playerId);
  if (!player) return;

  player.buyIns += 1;
  logHistory(player.name + " bought in");
  saveState();
  renderTable();
}

// Decrease a player's buy-in count by 1 (never below 0)
function decreaseBuyIn(playerId) {
  const player = players.find((p) => p.id === playerId);
  if (!player) return;

  if (player.buyIns <= 0) return; // cannot go negative

  player.buyIns -= 1;
  saveState();
  renderTable();
}

// Update a player's final chip count
function updateFinalChips(playerId, newChipCount) {
  const player = players.find((p) => p.id === playerId);
  if (!player) return;

  let chips = parseInt(newChipCount, 10);
  if (isNaN(chips) || chips < 0) {
    chips = 0;
  }

  player.finalChips = chips;
  saveState();
  renderTable();
}

// =========================================
// CALCULATIONS
// =========================================

// Calculate the rupee value of a player's final chips
function calculateChipValue(player) {
  return player.finalChips * CHIP_VALUE;
}

// Calculate a player's profit or loss
function calculateProfitLoss(player) {
  const chipValue = calculateChipValue(player);
  const investment = player.buyIns * BUYIN_VALUE;
  return chipValue - investment;
}

// =========================================
// RENDERING
// =========================================

// Render the full player table based on current state
function renderTable() {
  playerTableBody.innerHTML = "";

  if (players.length === 0) {
    emptyMessage.style.display = "block";
  } else {
    emptyMessage.style.display = "none";
  }

  players.forEach((player) => {
    const row = document.createElement("tr");

    // --- Player Name cell ---
    const nameCell = document.createElement("td");
    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.className = "player-name-input";
    nameInput.value = player.name;
    nameInput.disabled = true; // editable only after clicking "Edit"
    nameInput.addEventListener("blur", () => {
      renamePlayer(player.id, nameInput.value);
      nameInput.disabled = true;
      renderTable();
    });
    nameInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        nameInput.blur();
      }
    });
    nameCell.appendChild(nameInput);
    row.appendChild(nameCell);

    // --- Buy-ins cell ---
    const buyInCell = document.createElement("td");
    const buyInControls = document.createElement("div");
    buyInControls.className = "buyin-controls";

    const minusBtn = document.createElement("button");
    minusBtn.className = "btn-icon";
    minusBtn.textContent = "−";
    minusBtn.setAttribute("aria-label", "Decrease buy-ins");
    minusBtn.addEventListener("click", () => decreaseBuyIn(player.id));

    const countSpan = document.createElement("span");
    countSpan.className = "buyin-count";
    countSpan.textContent = player.buyIns;

    const plusBtn = document.createElement("button");
    plusBtn.className = "btn-icon";
    plusBtn.textContent = "+";
    plusBtn.setAttribute("aria-label", "Increase buy-ins");
    plusBtn.addEventListener("click", () => increaseBuyIn(player.id));

    buyInControls.appendChild(minusBtn);
    buyInControls.appendChild(countSpan);
    buyInControls.appendChild(plusBtn);
    buyInCell.appendChild(buyInControls);
    row.appendChild(buyInCell);

    // --- Final Chips cell ---
    const chipsCell = document.createElement("td");
    const chipsInput = document.createElement("input");
    chipsInput.type = "number";
    chipsInput.min = "0";
    chipsInput.className = "chips-input";
    chipsInput.value = player.finalChips;
    chipsInput.addEventListener("input", () => {
      updateFinalChipsLive(player.id, chipsInput.value);
    });
    chipsCell.appendChild(chipsInput);
    row.appendChild(chipsCell);

    // --- Chip Value cell ---
    const chipValueCell = document.createElement("td");
    chipValueCell.textContent = "₹" + calculateChipValue(player);
    row.appendChild(chipValueCell);

    // --- Profit/Loss cell ---
    const profitLoss = calculateProfitLoss(player);
    const profitCell = document.createElement("td");
    const sign = profitLoss >= 0 ? "+" : "-";
    profitCell.textContent = sign + "₹" + Math.abs(profitLoss);
    profitCell.className = profitLoss >= 0 ? "profit" : "loss";
    row.appendChild(profitCell);

    // --- Edit cell ---
    const editCell = document.createElement("td");
    const editBtn = document.createElement("button");
    editBtn.className = "btn btn-secondary btn-small";
    editBtn.textContent = "Edit";
    editBtn.addEventListener("click", () => {
      nameInput.disabled = false;
      nameInput.focus();
      nameInput.select();
    });
    editCell.appendChild(editBtn);
    row.appendChild(editCell);

    // --- Delete cell ---
    const deleteCell = document.createElement("td");
    const deleteBtn = document.createElement("button");
    deleteBtn.className = "btn btn-danger btn-small";
    deleteBtn.textContent = "Delete";
    deleteBtn.addEventListener("click", () => deletePlayer(player.id));
    deleteCell.appendChild(deleteBtn);
    row.appendChild(deleteCell);

    playerTableBody.appendChild(row);
  });
}

// Update final chips without a full table re-render (keeps input focus while typing)
function updateFinalChipsLive(playerId, newChipCount) {
  const player = players.find((p) => p.id === playerId);
  if (!player) return;

  let chips = parseInt(newChipCount, 10);
  if (isNaN(chips) || chips < 0) {
    chips = 0;
  }
  player.finalChips = chips;
  saveState();

  // Update only the chip value and profit/loss cells for this row,
  // instead of re-rendering the whole table (which would lose input focus).
  const rows = playerTableBody.querySelectorAll("tr");
  const rowIndex = players.findIndex((p) => p.id === playerId);
  const row = rows[rowIndex];
  if (!row) return;

  const chipValueCell = row.children[3];
  const profitCell = row.children[4];

  chipValueCell.textContent = "₹" + calculateChipValue(player);

  const profitLoss = calculateProfitLoss(player);
  const sign = profitLoss >= 0 ? "+" : "-";
  profitCell.textContent = sign + "₹" + Math.abs(profitLoss);
  profitCell.className = profitLoss >= 0 ? "profit" : "loss";
}

// =========================================
// TRANSFER BUY-IN (MODAL)
// =========================================

// Open the transfer modal and populate the dropdowns
function openTransferModal() {
  if (players.length < 2) {
    window.alert("You need at least 2 players to transfer a buy-in.");
    return;
  }

  fromSelect.innerHTML = "";
  toSelect.innerHTML = "";

  players.forEach((player) => {
    const fromOption = document.createElement("option");
    fromOption.value = player.id;
    fromOption.textContent = player.name + " (" + player.buyIns + " buy-ins)";
    fromSelect.appendChild(fromOption);

    const toOption = document.createElement("option");
    toOption.value = player.id;
    toOption.textContent = player.name;
    toSelect.appendChild(toOption);
  });

  // Default "To" selection to the second player so From and To differ initially
  if (toSelect.options.length > 1) {
    toSelect.selectedIndex = 1;
  }

  amountInput.value = 1;
  transferError.textContent = "";
  transferModal.classList.remove("hidden");
}

// Close the transfer modal
function closeTransferModal() {
  transferModal.classList.add("hidden");
  transferError.textContent = "";
}

// Validate and perform the transfer
function performTransfer() {
  const fromId = fromSelect.value;
  const toId = toSelect.value;
  const amount = parseInt(amountInput.value, 10);

  // Validation
  if (fromId === toId) {
    transferError.textContent = "Cannot transfer to yourself.";
    return;
  }

  if (isNaN(amount) || amount < 1) {
    transferError.textContent = "Amount must be at least 1.";
    return;
  }

  const fromPlayer = players.find((p) => p.id === fromId);
  const toPlayer = players.find((p) => p.id === toId);

  if (!fromPlayer || !toPlayer) {
    transferError.textContent = "Player not found.";
    return;
  }

  if (amount > fromPlayer.buyIns) {
    transferError.textContent = fromPlayer.name + " only has " + fromPlayer.buyIns + " buy-ins.";
    return;
  }

  // Perform the transfer
  fromPlayer.buyIns -= amount;
  toPlayer.buyIns += amount;

  const buyInWord = amount === 1 ? "buy-in" : "buy-ins";
  logHistory("Transfer: " + fromPlayer.name + " → " + toPlayer.name + " (" + amount + " " + buyInWord + ")");

  saveState();
  renderTable();
  closeTransferModal();
}

// =========================================
// RESET GAME
// =========================================

function resetGame() {
  const confirmed = window.confirm(
    "Are you sure you want to reset the game? This will remove all players and history."
  );
  if (!confirmed) return;

  players = [];
  history = [];
  nextPlayerNumber = 1;

  saveState();
  renderTable();
  renderHistory();
}

// =========================================
// EVENT LISTENERS
// =========================================

addPlayerBtn.addEventListener("click", addPlayer);
resetBtn.addEventListener("click", resetGame);

transferBtn.addEventListener("click", openTransferModal);
cancelTransferBtn.addEventListener("click", closeTransferModal);
confirmTransferBtn.addEventListener("click", performTransfer);

// Close modal if user clicks outside the modal box
transferModal.addEventListener("click", (e) => {
  if (e.target === transferModal) {
    closeTransferModal();
  }
});

// =========================================
// INITIALIZATION
// =========================================

function init() {
  loadState();
  renderTable();
  renderHistory();
}

init();