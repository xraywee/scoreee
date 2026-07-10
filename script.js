const questionScores = [10, 20, 30, 40, 50];
const buildingBlockCounts = {
  1: 6,
  2: 12
};

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
  buildingStage: 1,
  buildingTeam: "A",
  buildingComplete: false,
  history: []
};

let buildingDraft = {
  stage: null,
  blocks: []
};

let matchState = {
  roundNumber: 1,
  leftHouse: "一家",
  rightHouse: "二家",
  roundActive: false,
  roundRecords: []
};

let syncState = {
  applyingRemoteData: false,
  gameStateSaveTimer: null,
  matchStateSaveTimer: null,
  eventSource: null,
  pollTimer: null
};

const scoreAElement = document.getElementById("score-a");
const scoreBElement = document.getElementById("score-b");
const scoreboardSection =
  document.getElementById("scoreboard-section");
const buildingSection =
  document.getElementById("building-section");
const questionSection =
  document.getElementById("question-section");
const roundControlsSection =
  document.getElementById("round-controls-section");
const historySection =
  document.getElementById("history-section");
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
const questionInfoElement =
  document.getElementById("question-info");

const questionScoreElement =
  document.getElementById("question-score");
const buildingStageSelect =
  document.getElementById("building-stage-select");
const buildingTeamSelect =
  document.getElementById("building-team-select");
const buildingCurrentTargetElement =
  document.getElementById("building-current-target");
const buildingBlockListElement =
  document.getElementById("building-block-list");
const buildingShapeScoreElement =
  document.getElementById("building-shape-score");
const buildingPositionScoreElement =
  document.getElementById("building-position-score");
const buildingTotalScoreElement =
  document.getElementById("building-total-score");
const buildingMaxScoreElement =
  document.getElementById("building-max-score");
const buildingSubmitButton =
  document.getElementById("building-submit-current");

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

buildingStageSelect.addEventListener("change", function () {
  gameState = {
    ...gameState,
    buildingStage: buildingStageSelect.value === "2" ? 2 : 1
  };

  resetBuildingDraft();
  saveGame();
  render();
});

buildingTeamSelect.addEventListener("change", function () {
  gameState = {
    ...gameState,
    buildingTeam: buildingTeamSelect.value === "B" ? "B" : "A"
  };

  resetBuildingDraft();
  saveGame();
  render();
});

buildingSubmitButton.addEventListener("click", function () {
  submitBuildingScore(gameState.buildingTeam === "B" ? "B" : "A");
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

  if (isTournamentComplete()) {
    alert("六輪都已經完成了，請先清空歷史紀錄再開始新一場。");
    return;
  }

  if (selectedLeftHouse === selectedRightHouse) {
    alert("左右兩隊不能選同一個家。");
    return;
  }

  if (matchState.roundActive && hasCurrentRoundProgress()) {
    alert("本輪已經開始計分，請先提前結束本輪或重置本輪。");
    render();
    return;
  }

  resetCurrentRound();

  matchState = {
    ...matchState,
    leftHouse: selectedLeftHouse,
    rightHouse: selectedRightHouse,
    roundActive: true
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

function isTournamentComplete() {
  return matchState.roundNumber > roundLabels.length;
}

function getBuildingStageName(stage) {
  return stage === 2 ? "第二輪" : "第一輪";
}

function getBuildingBlockCount(stage) {
  return buildingBlockCounts[stage] || buildingBlockCounts[1];
}

function getCompletedBuildingScoreCount(history = gameState.history) {
  return history.filter(function (record) {
    return record.type === "building";
  }).length;
}

function isBuildingComplete() {
  return (
    Boolean(gameState.buildingComplete) ||
    getCompletedBuildingScoreCount() >= 4
  );
}

function resetBuildingDraft() {
  buildingDraft = {
    stage: null,
    blocks: []
  };
}

function ensureBuildingDraft() {
  const stage = gameState.buildingStage === 2 ? 2 : 1;

  if (buildingDraft.stage === stage) {
    return;
  }

  const blockCount = getBuildingBlockCount(stage);
  buildingDraft = {
    stage: stage,
    blocks: Array.from({ length: blockCount }, function () {
      return {
        shape: false,
        position: false
      };
    })
  };

  renderBuildingBlocks();
}

function getBuildingScoreSummary() {
  ensureBuildingDraft();

  const shapeScore = buildingDraft.blocks.filter(function (block) {
    return block.shape;
  }).length;
  const positionScore = buildingDraft.blocks.filter(function (block) {
    return block.position;
  }).length;
  const totalScore = shapeScore + positionScore;
  const maxScore = getBuildingBlockCount(buildingDraft.stage) * 2;

  return {
    shapeScore: shapeScore,
    positionScore: positionScore,
    totalScore: totalScore,
    maxScore: maxScore
  };
}

function updateBuildingScoreSummary() {
  const summary = getBuildingScoreSummary();

  buildingShapeScoreElement.textContent = summary.shapeScore;
  buildingPositionScoreElement.textContent = summary.positionScore;
  buildingTotalScoreElement.textContent = summary.totalScore;
  buildingMaxScoreElement.textContent = summary.maxScore;
}

function renderBuildingBlocks() {
  buildingBlockListElement.innerHTML = "";

  buildingDraft.blocks.forEach(function (block, index) {
    const blockNumber = index + 1;
    const blockElement = document.createElement("div");
    blockElement.className = "building-block";

    const titleElement = document.createElement("strong");
    titleElement.className = "building-block-number";
    titleElement.textContent = `${blockNumber} 號積木`;

    const optionsElement = document.createElement("div");
    optionsElement.className = "building-score-options";

    const shapeLabel = document.createElement("label");
    const shapeInput = document.createElement("input");
    shapeInput.type = "checkbox";
    shapeInput.checked = block.shape;
    shapeInput.addEventListener("change", function () {
      buildingDraft.blocks[index].shape = shapeInput.checked;
      updateBuildingScoreSummary();
    });
    shapeLabel.append(shapeInput, "形狀正確");

    const positionLabel = document.createElement("label");
    const positionInput = document.createElement("input");
    positionInput.type = "checkbox";
    positionInput.checked = block.position;
    positionInput.addEventListener("change", function () {
      buildingDraft.blocks[index].position = positionInput.checked;
      updateBuildingScoreSummary();
    });
    positionLabel.append(positionInput, "位置正確");

    optionsElement.append(shapeLabel, positionLabel);
    blockElement.append(titleElement, optionsElement);
    buildingBlockListElement.appendChild(blockElement);
  });

  updateBuildingScoreSummary();
}

function clearBuildingScores() {
  buildingDraft.blocks = buildingDraft.blocks.map(function () {
    return {
      shape: false,
      position: false
    };
  });

  renderBuildingBlocks();
}

function advanceBuildingStep() {
  const currentTeam = gameState.buildingTeam === "B" ? "B" : "A";
  const currentStage = gameState.buildingStage === 2 ? 2 : 1;

  if (currentTeam === "A") {
    gameState.buildingTeam = "B";
  } else if (currentStage === 1) {
    gameState.buildingTeam = "A";
    gameState.buildingStage = 2;
  } else {
    gameState.buildingTeam = "A";
    gameState.buildingStage = 1;
    gameState.buildingComplete = true;
  }

  resetBuildingDraft();
}

function submitBuildingScore(team) {
  if (!matchState.roundActive) {
    alert("請先按更新本輪開始計分。");
    return;
  }

  if (isBuildingComplete()) {
    alert("盲眼建築師已完成四次評分。");
    return;
  }

  const summary = getBuildingScoreSummary();

  if (
    summary.totalScore === 0 &&
    !confirm("目前盲眼建築師分數為 0，確定要送出嗎？")
  ) {
    return;
  }

  const previousState = structuredClone(gameState);
  const teamName = getTeamName(team);
  const stage = gameState.buildingStage === 2 ? 2 : 1;
  const recordText =
    `盲眼建築師${getBuildingStageName(stage)}：` +
    `${teamName} +${summary.totalScore} 分`;

  if (team === "A") {
    gameState.scoreA += summary.totalScore;
  } else {
    gameState.scoreB += summary.totalScore;
  }

  gameState.history.push({
    type: "building",
    text: recordText,
    team: team,
    teamName: teamName,
    score: summary.totalScore,
    buildingStage: stage,
    previousState: previousState
  });

  advanceBuildingStep();
  saveGame();
  render();
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
    roundNumber: matchState.roundNumber + 1,
    roundActive: false
  };
}

function endRoundEarly() {
  if (!matchState.roundActive) {
    alert("請先按更新本輪開始計分。");
    return;
  }

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
    buildingStage: 1,
    buildingTeam: "A",
    buildingComplete: false,
    history: []
  };

  resetBuildingDraft();
}

function answerQuestion(team) {
  if (!matchState.roundActive) {
    alert("請先按更新本輪開始計分。");
    return;
  }

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
      type: "question",
      text: `魔法球第 ${questionNumber} 題：${getTeamName("A")} +${score} 分`,
      team: "A",
      teamName: getTeamName("A"),
      score: score,
      questionNumber: questionNumber,
      previousState: previousState
    });
  } else if (team === "B") {
    gameState.scoreB += score;

    gameState.history.push({
      type: "question",
      text: `魔法球第 ${questionNumber} 題：${getTeamName("B")} +${score} 分`,
      team: "B",
      teamName: getTeamName("B"),
      score: score,
      questionNumber: questionNumber,
      previousState: previousState
    });
  } else {
    gameState.history.push({
      type: "question",
      text: `魔法球第 ${questionNumber} 題：無人答對`,
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
  gameState.buildingStage =
    gameState.buildingStage === 2 ? 2 : 1;
  gameState.buildingTeam =
    gameState.buildingTeam === "B" ? "B" : "A";
  gameState.buildingComplete =
    Boolean(gameState.buildingComplete);
  resetBuildingDraft();

  saveGame();
  render();
}

function resetGame() {
  const confirmed = confirm(
    "確定要重置本輪分數與題目進度嗎？"
  );

  if (!confirmed) {
    return;
  }

  resetCurrentRound();

  saveGame();
  saveMatchSettings();
  render();
}

async function clearHistoryRecords() {
  const confirmed = confirm(
    "確定要清空所有紀錄並回到第一輪嗎？"
  );

  if (!confirmed) {
    return;
  }

  clearTimeout(syncState.gameStateSaveTimer);
  clearTimeout(syncState.matchStateSaveTimer);
  syncState.gameStateSaveTimer = null;
  syncState.matchStateSaveTimer = null;

  resetCurrentRound();

  matchState = {
    roundNumber: 1,
    leftHouse: "一家",
    rightHouse: "二家",
    roundActive: false,
    roundRecords: []
  };

  saveLocalStateOnly();
  render();

  if (isRemoteSyncEnabled()) {
    await saveRemoteState();
  }
}

function saveGame() {
  localStorage.setItem(
    "scoreAppData",
    JSON.stringify(gameState)
  );

  queueRemoteGameStateSave();
}

function saveMatchSettings() {
  localStorage.setItem(
    "scoreAppMatchSettings",
    JSON.stringify(matchState)
  );

  queueRemoteMatchStateSave();
}

function loadGame() {
  const savedData =
    localStorage.getItem("scoreAppData");

  if (!savedData) {
    return;
  }

  try {
    const savedGameState = JSON.parse(savedData);

    const savedHistory = Array.isArray(savedGameState.history)
      ? savedGameState.history
      : [];

    gameState = {
      scoreA: savedGameState.scoreA || 0,
      scoreB: savedGameState.scoreB || 0,
      questionIndex: savedGameState.questionIndex || 0,
      buildingStage:
        savedGameState.buildingStage === 2 ? 2 : 1,
      buildingTeam:
        savedGameState.buildingTeam === "B" ? "B" : "A",
      buildingComplete:
        Boolean(savedGameState.buildingComplete) ||
        getCompletedBuildingScoreCount(savedHistory) >= 4,
      history: savedHistory
    };
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
      savedRoundNumber <= roundLabels.length + 1 &&
      houses.includes(savedMatchState.leftHouse) &&
      houses.includes(savedMatchState.rightHouse) &&
      savedMatchState.leftHouse !== savedMatchState.rightHouse
    ) {
      matchState = {
        roundNumber: savedRoundNumber,
        leftHouse: savedMatchState.leftHouse,
        rightHouse: savedMatchState.rightHouse,
        roundActive: Boolean(savedMatchState.roundActive),
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

function queueRemoteGameStateSave() {
  if (!isRemoteSyncEnabled() || syncState.applyingRemoteData) {
    return;
  }

  clearTimeout(syncState.gameStateSaveTimer);

  syncState.gameStateSaveTimer = setTimeout(function () {
    syncState.gameStateSaveTimer = null;
    saveRemoteGameState();
  }, 250);
}

function queueRemoteMatchStateSave() {
  if (!isRemoteSyncEnabled() || syncState.applyingRemoteData) {
    return;
  }

  clearTimeout(syncState.matchStateSaveTimer);

  syncState.matchStateSaveTimer = setTimeout(function () {
    syncState.matchStateSaveTimer = null;
    saveRemoteMatchState();
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
      headers: { "Content-Type": "application/json" },
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

async function saveRemoteGameState() {
  try {
    const response = await fetch(`${getRemoteStateUrl()}?print=silent`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gameState: gameState, updatedAt: Date.now() })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
  } catch (error) {
    console.error("同步 gameState 到 Firebase 失敗：", error);
    updateSyncStatus("同步失敗，暫用本機資料");
  }
}

async function saveRemoteMatchState() {
  try {
    const response = await fetch(`${getRemoteStateUrl()}?print=silent`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchState: matchState, updatedAt: Date.now() })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
  } catch (error) {
    console.error("同步 matchState 到 Firebase 失敗：", error);
    updateSyncStatus("同步失敗，暫用本機資料");
  }
}

async function loadRemoteState(retryCount = 0) {
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

    if (retryCount < 3) {
      setTimeout(function () {
        loadRemoteState(retryCount + 1);
      }, 3000);
    } else {
      updateSyncStatus("連線異常");
    }
  }
}

function applyRemoteState(remoteState) {
  if (!remoteState || !remoteState.gameState || !remoteState.matchState) {
    saveRemoteState();
    return;
  }

  const remoteGameState = remoteState.gameState;
  const remoteHistory = Array.isArray(remoteGameState.history)
    ? remoteGameState.history
    : [];

  syncState.applyingRemoteData = true;
  gameState = {
    scoreA: remoteGameState.scoreA || 0,
    scoreB: remoteGameState.scoreB || 0,
    questionIndex: remoteGameState.questionIndex || 0,
    buildingStage:
      remoteGameState.buildingStage === 2 ? 2 : 1,
    buildingTeam:
      remoteGameState.buildingTeam === "B" ? "B" : "A",
    buildingComplete:
      Boolean(remoteGameState.buildingComplete) ||
      getCompletedBuildingScoreCount(remoteHistory) >= 4,
    history: remoteHistory
  };
  matchState = {
    roundNumber: remoteState.matchState.roundNumber || 1,
    leftHouse: remoteState.matchState.leftHouse || "一家",
    rightHouse: remoteState.matchState.rightHouse || "二家",
    roundActive:
      Boolean(remoteState.matchState.roundActive) ||
      gameState.questionIndex > 0 ||
      gameState.scoreA > 0 ||
      gameState.scoreB > 0 ||
      gameState.history.length > 0,
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
    if (syncState.gameStateSaveTimer || syncState.matchStateSaveTimer) {
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
  if (record.type === "building") {
    return record.text || "";
  }

  if (record.type === "question") {
    return record.text ||
      `魔法球第 ${record.questionNumber} 題：${record.teamName} +${record.score} 分`;
  }

  if (record.team === "A" || record.team === "B") {
    const teamName = record.teamName || getTeamName(record.team);
    const questionNumber = record.questionNumber || "?";
    return `魔法球第 ${questionNumber} 題：${teamName} +${record.score || 0} 分`;
  }

  return (record.text || "")
    .replaceAll("A 隊", getTeamName("A"))
    .replaceAll("B 隊", getTeamName("B"));
}

function renderBuildingTargetControls() {
  const currentTeam = gameState.buildingTeam === "B" ? "B" : "A";
  const currentTeamName = getTeamName(currentTeam);
  const currentStage = gameState.buildingStage === 2 ? 2 : 1;

  buildingTeamSelect.innerHTML = "";

  [
    { value: "A", label: matchState.leftHouse },
    { value: "B", label: matchState.rightHouse }
  ].forEach(function (optionData) {
    const option = document.createElement("option");
    option.value = optionData.value;
    option.textContent = optionData.label;
    buildingTeamSelect.appendChild(option);
  });

  buildingTeamSelect.value = currentTeam;
  buildingStageSelect.value = String(currentStage);
  buildingCurrentTargetElement.textContent =
    `目前評分：${currentTeamName} ${getBuildingStageName(currentStage)}建築`;
  buildingSubmitButton.textContent = `送出給 ${currentTeamName}`;
}

function render() {
  const isRoundActive = Boolean(matchState.roundActive);
  const buildingComplete = isBuildingComplete();

  leftHouseSelect.value = matchState.leftHouse;
  rightHouseSelect.value = matchState.rightHouse;

  scoreboardSection.classList.toggle("is-hidden", !isRoundActive);
  buildingSection.classList.toggle(
    "is-hidden",
    !isRoundActive || buildingComplete
  );
  questionSection.classList.toggle("is-hidden", !isRoundActive);
  roundControlsSection.classList.toggle("is-hidden", !isRoundActive);
  historySection.classList.toggle("is-hidden", !isRoundActive);

  teamATitleElement.textContent = matchState.leftHouse;
  teamBTitleElement.textContent = matchState.rightHouse;
  buttonA.textContent = `${matchState.leftHouse}答對`;
  buttonB.textContent = `${matchState.rightHouse}答對`;
  currentRoundElement.textContent =
    isTournamentComplete()
      ? "全部輪次已完成"
      : getRoundLabel(matchState.roundNumber);
  currentMatchupElement.textContent =
    isRoundActive
      ? `${matchState.leftHouse} VS ${matchState.rightHouse}`
      : isTournamentComplete()
        ? "請清空歷史紀錄後開始新一場"
        : "請選擇家名後按更新本輪";

  scoreAElement.textContent = gameState.scoreA;
  scoreBElement.textContent = gameState.scoreB;

  if (!buildingComplete) {
    renderBuildingTargetControls();
    ensureBuildingDraft();
    updateBuildingScoreSummary();
  }

  const finished =
    gameState.questionIndex >= questionScores.length;

  if (finished) {
    questionInfoElement.textContent = "魔法球題目已完成";
    questionScoreElement.textContent = "0";
  } else {
    questionInfoElement.innerHTML =
      '第 <span id="question-number"></span> 題';
    document.getElementById("question-number").textContent =
      gameState.questionIndex + 1;

    questionScoreElement.textContent =
      questionScores[gameState.questionIndex];
  }

  buttonA.disabled = finished;
  buttonB.disabled = finished;
  buttonNone.disabled = finished;

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
