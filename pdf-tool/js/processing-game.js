/* =========================================
   PROCESSING MINI GAME
========================================= */

let gameTimer = null;
let gameScore = 0;
let gameRunning = false;


/* =========================================
   START GAME
========================================= */

function startMiniGame() {

  const area =
    document.getElementById(
      "gameArea"
    );

  const target =
    document.getElementById(
      "gameTarget"
    );

  const scoreElement =
    document.getElementById(
      "gameScore"
    );

  if (
    !area ||
    !target
  ) {
    return;
  }

  gameRunning =
    true;

  gameScore =
    0;

  if (scoreElement) {
    scoreElement.textContent =
      "Score: 0";
  }

  target.style.display =
    "block";

  moveGameTarget();


  target.onclick =
    () => {

      if (!gameRunning) {
        return;
      }

      gameScore++;

      if (scoreElement) {

        scoreElement.textContent =
          "Score: " +
          gameScore;

      }

      moveGameTarget();

    };


  clearInterval(
    gameTimer
  );

  gameTimer =
    setInterval(
      () => {

        if (
          gameRunning
        ) {

          moveGameTarget();

        }

      },
      900
    );
}


/* =========================================
   MOVE TARGET
========================================= */

function moveGameTarget() {

  const area =
    document.getElementById(
      "gameArea"
    );

  const target =
    document.getElementById(
      "gameTarget"
    );

  if (
    !area ||
    !target
  ) {
    return;
  }

  const areaWidth =
    area.clientWidth;

  const areaHeight =
    area.clientHeight;

  const targetWidth =
    target.offsetWidth ||
    45;

  const targetHeight =
    target.offsetHeight ||
    45;

  const maxX =
    Math.max(
      0,
      areaWidth -
      targetWidth
    );

  const maxY =
    Math.max(
      0,
      areaHeight -
      targetHeight
    );

  const x =
    Math.random() *
    maxX;

  const y =
    Math.random() *
    maxY;

  target.style.left =
    x + "px";

  target.style.top =
    y + "px";
}


/* =========================================
   STOP GAME
========================================= */

function stopMiniGame() {

  gameRunning =
    false;

  clearInterval(
    gameTimer
  );

  gameTimer =
    null;

  const target =
    document.getElementById(
      "gameTarget"
    );

  if (target) {

    target.style.display =
      "none";

  }
}