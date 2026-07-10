const questionScores = [10, 10, 20, 20, 30];

let gameState = {
  scoreA: 0,
  scoreB: 0,
  questionIndex: 0,
  history: []
};

const scoreAElement = document.getElementById("score-a");
const scoreBElement = document.getElementById("score-b");

const questionNumberElement =
  document.getElementById("question-number");

const questionScoreElement =
  document.getElementById("question-score");

const historyListElement =
  document.getElementById("history-list");

const buttonA = document.getElementById("button-a");
const buttonB = document.getElementById("button-b");
const buttonNone = document.getElementById("button-none");

const undoButton =
  document.getElementById("undo-button");

const resetButton =
  document.getElementById("reset-button");

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
resetButton.addEventListener("click", resetGame);

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
      text: `第 ${questionNumber} 題：A 隊 +${score} 分`,
      previousState: previousState
    });
  } else if (team === "B") {
    gameState.scoreB += score;

    gameState.history.push({
      text: `第 ${questionNumber} 題：B 隊 +${score} 分`,
      previousState: previousState
    });
  } else {
    gameState.history.push({
      text: `第 ${questionNumber} 題：無人答對`,
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

  saveGame();
  render();
}

function saveGame() {
  localStorage.setItem(
    "scoreAppData",
    JSON.stringify(gameState)
  );
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

function render() {
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

    listItem.textContent = record.text;

    historyListElement.appendChild(listItem);
  });
}

loadGame();
render();