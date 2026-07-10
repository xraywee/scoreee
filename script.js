const questionScores = [10, 10, 20, 20, 30];

// 填入 Firebase Realtime Database URL 後，兩台裝置開同一頁就會同步。
const syncConfig = {
  databaseURL: "https://scoreee-default-rtdb.asia-southeast1.firebasedatabase.app/",
  roomId: "scoreee-main"
};

const houses = [
  "一家",
  "二家",
  "三家",
  "五家",
  "六家",
  "七家",
  "八家",
  "九家",
  "十家",
  "十一家",
  "十二家",
  "十三家"
];

const roundLabels = [
  "第一輪",
  "第二輪",
  "第三輪",
  "第四輪",
  "第五輪",
  "第六輪"
];

let gameState = {
  scoreA: 0,
  scoreB: 0,
  questionIndex: 0,
  history: []
};

let matchState = {
  roundNumber: 1,
  leftHouse: "一家",
  rightHouse: "二家",
  roundRecords: []
};

let syncState = {
  applyingRemoteData: false,
  writeTimer: null,
  eventSource: null,
  pollTimer: null
};

const scoreAElement = document.getElementById("score-a");
const scoreBElement = document.getElementById("score-b");
const teamATitleElement = document.getElementById("team-a-title");
const teamBTitleElement = document.getElementById("team-b-title");
const currentRoundElement = document.getElementById("current-round");
const currentMatchupElement =
  document.getElementById("current-matchup");
const syncStatusElement =
  document.getElementById("sync-status");

const leftHouseSelect =
  document.getElementById("left-house-select");
const rightHouseSelect =
  document.getElementById("right-house-select");
const updateRoundButton =
  document.getElementById("update-round-button");

const questionNumberElement =
  document.getElementById("question-number");

const questionScoreElement =
  document.getElementById("question-score");

const historyListElement =
  document.getElementById("history-list");
const roundRecordListElement =
  document.getElementById("round-record-list");

const buttonA = document.getElementById("button-a");
const buttonB = document.getElementById("button-b");
const buttonNone = document.getElementById("button-none");

const undoButton =
  document.getElementById("undo-button");

const endRoundButton =
  document.getElementById("end-round-button");

const clearHistoryButton =
  document.getElementById("clear-history-button");

const resetButton =
  document.getElementById("reset-button");

setupSelectOptions();

buttonA.addEventListener("click", function () {
  answerQuestion("A");
});

buttonB.addEventListener("click", function () {
  answerQuestion("B");
});

buttonNone.addEventListener("click", function () {
  answerQuestion("none");
});

undoButton.addEventListener("click", undoLastAction);
endRoundButton.addEventListener("click", endRoundEarly);
clearHistoryButton.addEventListener("click", clearHistoryRecords);
resetButton.addEventListener("click", resetGame);
updateRoundButton.addEventListener("click", updateMatchSettings);

function setupSelectOptions() {
  houses.forEach(function (house) {
    const leftOption = document.createElement("option");
    leftOption.value = house;
    leftOption.textContent = house;
    leftHouseSelect.appendChild(leftOption);

    const rightOption = document.createElement("option");
    rightOption.value = house;
    rightOption.textContent = house;
    rightHouseSelect.appendChild(rightOption);
  });
}

function getTeamName(team) {
  if (team === "A") {
    return matchState.leftHouse;
  }

  if (team === "B") {
    return matchState.rightHouse;
  }

  return "";
}

function updateMatchSettings() {
  const selectedLeftHouse = leftHouseSelect.value;
  const selectedRightHouse = rightHouseSelect.value;

  if (selectedLeftHouse === selectedRightHouse) {
    alert("左右兩隊不能選同一個家。");
    return;
  }

  const shouldAdvanceRound = hasCurrentRoundProgress();

  if (shouldAdvanceRound) {
    finishCurrentRound();
  }

  matchState = {
    ...matchState,
    leftHouse: selectedLeftHouse,
    rightHouse: selectedRightHouse
  };

  saveGame();
  saveMatchSettings();
  render();
}

function hasCurrentRoundProgress() {
  return (
    gameState.questionIndex > 0 ||
    gameState.scoreA > 0 ||
    gameState.scoreB > 0 ||
    gameState.history.length > 0
  );
}

function getRoundLabel(roundNumber) {
  return roundLabels[roundNumber - 1] || `第 ${roundNumber} 輪`;
}

function getWinnerName(scoreA, scoreB, leftHouse, rightHouse) {
  if (scoreA > scoreB) {
    return leftHouse;
  }

  if (scoreB > scoreA) {
    return rightHouse;
  }

  return "平手";
}

function getWinnerMessage() {
  const winner = getWinnerName(
    gameState.scoreA,
    gameState.scoreB,
    matchState.leftHouse,
    matchState.rightHouse
  );

  if (winner === "平手") {
    return "本輪平手。";
  }

  return `${winner} 贏了！`;
}

function finishCurrentRound() {
  recordCurrentRound();
  resetCurrentRound();
  matchState = {
    ...matchState,
    roundNumber: Math.min(matchState.roundNumber + 1, roundLabels.length)
  };
}

function endRoundEarly() {
  if (!hasCurrentRoundProgress()) {
    alert("本輪還沒有任何分數或答題紀錄。");
    return;
  }

  alert(getWinnerMessage());

  finishCurrentRound();
  saveGame();
  saveMatchSettings();
  render();
}

function recordCurrentRound() {
  const winner = getWinnerName(
    gameState.scoreA,
    gameState.scoreB,
    matchState.leftHouse,
    matchState.rightHouse
  );

  matchState.roundRecords.push({
    roundNumber: matchState.roundNumber,
    roundLabel: getRoundLabel(matchState.roundNumber),
    leftHouse: matchState.leftHouse,
    rightHouse: matchState.rightHouse,
    scoreA: gameState.scoreA,
    scoreB: gameState.scoreB,
    winner: winner
  });
}

function resetCurrentRound() {
  gameState = {
    scoreA: 0,
    scoreB: 0,
    questionIndex: 0,
    history: []
  };
}

function answerQuestion(team) {
  if (gameState.questionIndex >= questionScores.length) {
    alert("所有題目都已經完成了。");
    return;
  }

  const score = questionScores[gameState.questionIndex];
  const questionNumber = gameState.questionIndex + 1;

  const previousState = structuredClone(gameState);

  if (team === "A") {
    gameState.scoreA += score;

    gameState.history.push({
      text: `第 ${questionNumber} 題：${getTeamName("A")} +${score} 分`,
      team: "A",
      teamName: getTeamName("A"),
      score: score,
      questionNumber: questionNumber,
      previousState: previousState
    });
  } else if (team === "B") {
    gameState.scoreB += score;

    gameState.history.push({
      text: `第 ${questionNumber} 題：${getTeamName("B")} +${score} 分`,
      team: "B",
      teamName: getTeamName("B"),
      score: score,
      questionNumber: questionNumber,
      previousState: previousState
    });
  } else {
    gameState.history.push({
      text: `第 ${questionNumber} 題：無人答對`,
      team: "none",
      questionNumber: questionNumber,
      previousState: previousState
    });
  }

  gameState.questionIndex += 1;

  saveGame();
  render();
}

function undoLastAction() {
  const lastAction = gameState.history.at(-1);

  if (!lastAction) {
    alert("目前沒有可以撤銷的紀錄。");
    return;
  }

  gameState = lastAction.previousState;

  saveGame();
  render();
}

function resetGame() {
  const confirmed = confirm(
    "確定要清除所有分數與紀錄嗎？"
  );

  if (!confirmed) {
    return;
  }

  gameState = {
    scoreA: 0,
    scoreB: 0,
    questionIndex: 0,
    history: []
  };

  matchState = {
    ...matchState,
    roundNumber: 1,
    roundRecords: []
  };

  saveGame();
  saveMatchSettings();
  render();
}

function clearHistoryRecords() {
  const confirmed = confirm(
    "確定要清空操作紀錄與輪次紀錄嗎？"
  );

  if (!confirmed) {
    return;
  }

  gameState = {
    ...gameState,
    history: []
  };

  matchState = {
    ...matchState,
    roundRecords: []
  };

  saveGame();
  saveMatchSettings();
  render();
}

function saveGame() {
  localStorage.setItem(
    "scoreAppData",
    JSON.stringify(gameState)
  );

  queueRemoteSave();
}

function saveMatchSettings() {
  localStorage.setItem(
    "scoreAppMatchSettings",
    JSON.stringify(matchState)
  );

  queueRemoteSave();
}

function loadGame() {
  const savedData =
    localStorage.getItem("scoreAppData");

  if (!savedData) {
    return;
  }

  try {
    gameState = JSON.parse(savedData);
  } catch (error) {
    console.error("讀取儲存資料失敗：", error);
  }
}

function loadMatchSettings() {
  const savedData =
    localStorage.getItem("scoreAppMatchSettings");

  if (!savedData) {
    return;
  }

  try {
    const savedMatchState = JSON.parse(savedData);
    const savedRoundNumber =
      savedMatchState.roundNumber ||
      roundLabels.indexOf(savedMatchState.round) + 1 ||
      1;
    const savedRoundRecords =
      Array.isArray(savedMatchState.roundRecords)
        ? savedMatchState.roundRecords
        : [];

    if (
      savedRoundNumber >= 1 &&
      savedRoundNumber <= roundLabels.length &&
      houses.includes(savedMatchState.leftHouse) &&
      houses.includes(savedMatchState.rightHouse) &&
      savedMatchState.leftHouse !== savedMatchState.rightHouse
    ) {
      matchState = {
        roundNumber: savedRoundNumber,
        leftHouse: savedMatchState.leftHouse,
        rightHouse: savedMatchState.rightHouse,
        roundRecords: savedRoundRecords
      };
    }
  } catch (error) {
    console.error("讀取輪次資料失敗：", error);
  }
}

function isRemoteSyncEnabled() {
  return syncConfig.databaseURL.trim() !== "";
}

function getRemoteStateUrl() {
  const databaseURL =
    syncConfig.databaseURL.replace(/\/$/, "");
  const roomPath =
    encodeURIComponent(syncConfig.roomId || "scoreee-main");

  return `${databaseURL}/scoreboards/${roomPath}.json`;
}

function getStateSnapshot() {
  return {
    gameState: gameState,
    matchState: matchState,
    updatedAt: Date.now()
  };
}

function updateSyncStatus(text) {
  syncStatusElement.textContent = `同步：${text}`;
  syncStatusElement.classList.toggle(
    "sync-status-connected",
    text === "已連線"
  );
  syncStatusElement.classList.toggle(
    "sync-status-disconnected",
    text !== "已連線"
  );
}

function queueRemoteSave() {
  if (!isRemoteSyncEnabled() || syncState.applyingRemoteData) {
    return;
  }

  clearTimeout(syncState.writeTimer);

  syncState.writeTimer = setTimeout(function () {
    syncState.writeTimer = null;
    saveRemoteState();
  }, 250);
}

function saveLocalStateOnly() {
  localStorage.setItem(
    "scoreAppData",
    JSON.stringify(gameState)
  );

  localStorage.setItem(
    "scoreAppMatchSettings",
    JSON.stringify(matchState)
  );
}

async function saveRemoteState() {
  try {
    const response = await fetch(`${getRemoteStateUrl()}?print=silent`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(getStateSnapshot())
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    updateSyncStatus("已連線");
  } catch (error) {
    console.error("同步到 Firebase 失敗：", error);
    updateSyncStatus("同步失敗，暫用本機資料");
  }
}

async function loadRemoteState() {
  try {
    const response = await fetch(getRemoteStateUrl());

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const remoteState = await response.json();

    if (remoteState) {
      applyRemoteState(remoteState);
    } else {
      await saveRemoteState();
    }

    updateSyncStatus("已連線");
  } catch (error) {
    console.error("讀取 Firebase 資料失敗：", error);
    updateSyncStatus("連線異常");
  }
}

function applyRemoteState(remoteState) {
  if (!remoteState || !remoteState.gameState || !remoteState.matchState) {
    saveRemoteState();
    return;
  }

  syncState.applyingRemoteData = true;
  gameState = remoteState.gameState;
  matchState = {
    roundNumber: remoteState.matchState.roundNumber || 1,
    leftHouse: remoteState.matchState.leftHouse || "一家",
    rightHouse: remoteState.matchState.rightHouse || "二家",
    roundRecords: Array.isArray(remoteState.matchState.roundRecords)
      ? remoteState.matchState.roundRecords
      : []
  };

  saveLocalStateOnly();
  render();
  syncState.applyingRemoteData = false;
}

function handleRemoteEvent(event) {
  try {
    const message = JSON.parse(event.data);

    if (message.path === "/") {
      applyRemoteState(message.data);
    }

    updateSyncStatus("已連線");
  } catch (error) {
    console.error("讀取 Firebase 即時資料失敗：", error);
  }
}

function startRemotePolling() {
  clearInterval(syncState.pollTimer);

  syncState.pollTimer = setInterval(function () {
    if (syncState.writeTimer) {
      return;
    }

    loadRemoteState();
  }, 3000);
}

function initRemoteSync() {
  if (!isRemoteSyncEnabled()) {
    updateSyncStatus("本機模式");
    return;
  }

  if (window.location.protocol === "file:") {
    updateSyncStatus("連線異常");
    return;
  }

  updateSyncStatus("連線中");

  loadRemoteState();
  startRemotePolling();

  syncState.eventSource = new EventSource(getRemoteStateUrl());
  syncState.eventSource.addEventListener("put", handleRemoteEvent);
  syncState.eventSource.addEventListener("patch", handleRemoteEvent);
  syncState.eventSource.addEventListener("open", function () {
    updateSyncStatus("已連線");
  });
  syncState.eventSource.addEventListener("error", function () {
    // SSE 在部分行動網路的 Proxy 環境會失敗，不據此判斷連線狀態
  });
}

function renderHistoryText(record) {
  if (record.team === "A" || record.team === "B") {
    const teamName = record.teamName || getTeamName(record.team);
    return `第 ${record.questionNumber} 題：${teamName} +${record.score} 分`;
  }

  return (record.text || "")
    .replaceAll("A 隊", getTeamName("A"))
    .replaceAll("B 隊", getTeamName("B"));
}

function render() {
  leftHouseSelect.value = matchState.leftHouse;
  rightHouseSelect.value = matchState.rightHouse;

  teamATitleElement.textContent = matchState.leftHouse;
  teamBTitleElement.textContent = matchState.rightHouse;
  buttonA.textContent = `${matchState.leftHouse}答對`;
  buttonB.textContent = `${matchState.rightHouse}答對`;
  currentRoundElement.textContent =
    getRoundLabel(matchState.roundNumber);
  currentMatchupElement.textContent =
    `${matchState.leftHouse} VS ${matchState.rightHouse}`;

  scoreAElement.textContent = gameState.scoreA;
  scoreBElement.textContent = gameState.scoreB;

  const finished =
    gameState.questionIndex >= questionScores.length;

  if (finished) {
    questionNumberElement.textContent = "完成";
    questionScoreElement.textContent = "0";
  } else {
    questionNumberElement.textContent =
      gameState.questionIndex + 1;

    questionScoreElement.textContent =
      questionScores[gameState.questionIndex];
  }

  historyListElement.innerHTML = "";

  const reversedHistory =
    [...gameState.history].reverse();

  reversedHistory.forEach(function (record) {
    const listItem = document.createElement("li");

    listItem.textContent = renderHistoryText(record);

    historyListElement.appendChild(listItem);
  });

  roundRecordListElement.innerHTML = "";

  const reversedRoundRecords =
    [...matchState.roundRecords].reverse();

  reversedRoundRecords.forEach(function (record) {
    const listItem = document.createElement("li");
    const winnerText =
      record.winner === "平手"
        ? "平手"
        : `${record.winner} 勝`;

    listItem.textContent =
      `${record.roundLabel || getRoundLabel(record.roundNumber)}：` +
      `${record.leftHouse} ${record.scoreA} ` +
      `VS ${record.scoreB} ${record.rightHouse}，${winnerText}`;

    roundRecordListElement.appendChild(listItem);
  });
}

loadGame();
loadMatchSettings();
render();
initRemoteSync();
