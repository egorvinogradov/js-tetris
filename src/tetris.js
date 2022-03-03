import { Matrix } from './matrix.js';
import { Figure } from './figure.js';
import { Sound } from './sound.js';
import { DemoScene } from './demoscene.js';
import {
  events,
  TETRIS_NEW_GAME,
  TETRIS_PLAY_PAUSE,
  TETRIS_GAME_OVER,
  TETRIS_QUIT,
} from './events.js';

import {
  formatNumber,
  inflectByNumber,
  getDeviceCharacteristics,
  numberToHumanReadableOrder,
  timestampToHumanReadableDuration,
} from './utils.js';


export class Tetris {

  SPEED_DESCEND = 1000;
  SPEED_DESCEND_REDUCTION_BY_LEVEL = 100;
  SPEED_LIMIT_DESKTOP = 200;
  SPEED_LIMIT_MOBILE = 300;

  SPEED_X_MOVEMENT = 100;
  SPEED_X_MOVEMENT_SPED_UP = 100;
  SPEED_Y_MOVEMENT = 120;
  SPEED_Y_MOVEMENT_SPED_UP = 10;

  KEYDOWN_X_SPEED_UP_DELAY = 150;
  KEYDOWN_Y_SPEED_UP_DELAY = 80;

  level = 1;
  score = 0;
  rowsCleared = 0;
  currentGameStartedAt = null;

  descendInterval = null;
  figureMovements = {};
  isMovementKeyDown = {};

  isOngoingGame = false;
  isPaused = false;

  /**
   * @type {Matrix}
   */
  gameScreen = null;

  /**
   * @type {Matrix}
   */
  nextFigureScreen = null;

  /**
   * @type {Figure}
   */
  currentFigure = null;

  /**
   * @type {Figure}
   */
  nextFigure = null;

  /**
   * @type {DemoScene}
   */
  demoScene = null;

  constructor(config){
    const {
      gameWidth,
      gameHeight,
      gameScreenContainer,
      nextFigureScreenContainer,
    } = config;

    this.gameScreen = new Matrix(gameScreenContainer, gameWidth, gameHeight);
    this.demoScene = new DemoScene(this.gameScreen);
    this.demoScene.launchScreenSaver();

    this.nextFigureScreen = new Matrix(nextFigureScreenContainer, 4, 4);
    this.nextFigureScreen.render();

    this.sound = new Sound();

    this.enableGeneralKeys();
    this.enableMovementKeys();
  }

  isPlaying = () => {
    return this.isOngoingGame && !this.isPaused;
  };

  launchNewGame = () => {
    if (!this.isOngoingGame) {
      this.isOngoingGame = true;

      this.demoScene.stop();
      this.gameScreen.reset();
      this.nextFigureScreen.reset();

      this.sound.startBackgroundNoise();
      this.sound.intro();

      this.changeScore({ type: 'reset' });
      this.currentGameStartedAt = +new Date();

      this.spawnNewCurrentFigure();
      this.descendCurrentFigure();
      events.trigger(TETRIS_NEW_GAME);
    }
  };

  pauseOrResumeGame = () => {
    if (this.isOngoingGame) {
      this.isPaused = !this.isPaused;
      events.trigger(TETRIS_PLAY_PAUSE, this.isPaused);
    }
  };

  quitGame = () => {
    const confirmationMessage = 'Are you sure you want to quit?';
    const moreThan10SecondsHasPassed = new Date() - this.currentGameStartedAt > 10 * 1000;

    if (this.isOngoingGame) {
      if (moreThan10SecondsHasPassed && !confirm(confirmationMessage)) {
        return;
      }
      this.stopOngoingGame();
      this.changeScore({ type: 'reset' });
      this.gameScreen.reset();
      this.demoScene.launchScreenSaver();
      events.trigger(TETRIS_QUIT);
    }
  };

  stopOngoingGame = () => {
    this.currentFigure = null;
    this.nextFigure = null;

    this.isOngoingGame = false;
    this.isPaused = false;

    clearInterval(this.descendInterval);

    this.nextFigureScreen.reset();
    this.nextFigureScreen.render();
  };

  enableGeneralKeys = () => {
    const actions = {
      'ArrowUp': this.rotateCurrentFigure,
      'KeyM': this.sound.toggleMute,
      'KeyP': this.pauseOrResumeGame,
      'Escape': this.quitGame,
      'Enter': this.launchNewGame,
    };
    document.addEventListener('keydown', e => {
      const key = e.code;
      const action = actions[key];
      if (action) {
        action();
      }
    });
    this.onTouchButtonPress('.button-rotate', actions.ArrowUp);
    this.onTouchButtonPress('.button-top-mute', actions.KeyM);
    this.onTouchButtonPress('.button-top-pause', actions.KeyP);
    this.onTouchButtonPress('.button-top-quit', actions.Escape);
  };

  enableMovementKeys = () => {
    const keys = [
      'ArrowLeft',
      'ArrowRight',
      'ArrowDown',
    ];
    document.addEventListener('keydown', e => {
      const { code } = e;
      if (keys.includes(code) && !this.isMovementKeyDown[code]) {
        this.isMovementKeyDown[code] = true;
        this.startCurrentFigureMovementOnButtonPress(code);
      }
    });
    document.addEventListener('keyup', e => {
      const { code } = e;
      if (keys.includes(code) && this.isMovementKeyDown[code]) {
        delete this.isMovementKeyDown[code];
        this.cancelCurrentFigureMovementOnButtonPress(code);
      }
    });
    this.enableTouchMovementButton('.button-left');
    this.enableTouchMovementButton('.button-right');
    this.enableTouchMovementButton('.button-down');
  };

  onTouchButtonPress = (selector, callback) => {
    const eventType = 'onpointerdown' in window
      ? 'pointerdown'
      : 'touchstart';
    document.querySelector(selector).addEventListener(eventType, e => {
      this.vibrate('buttonPressed');
      callback(e);
    });
  };

  onTouchButtonRelease = (selector, callback) => {
    const eventType = 'onpointerup' in window
      ? 'pointerup'
      : 'touchend';
    document.querySelector(selector).addEventListener(eventType, callback);
  };

  enableTouchMovementButton = (selector) => {
    const keyCode = document.querySelector(selector).dataset.key;

    this.onTouchButtonPress(selector, () => {
      this.startCurrentFigureMovementOnButtonPress(keyCode);
    });
    this.onTouchButtonRelease(selector, () => {
      this.cancelCurrentFigureMovementOnButtonPress(keyCode);
    });
  };

  startCurrentFigureMovementOnButtonPress = (key) => {
    if (!this.isPlaying()) {
      return;
    }

    const isAlreadyMoving = this.figureMovements[key];

    if (!isAlreadyMoving) {
      const currentSpeed = this.getMovementSpeed(key);
      const increasedSpeed = this.getMovementSpeed(key, true);

      const speedIncreaseDelay = key === 'ArrowDown'
        ? this.KEYDOWN_Y_SPEED_UP_DELAY
        : this.KEYDOWN_X_SPEED_UP_DELAY;

      const speedIncreaseTimeout = setTimeout(() => {
        this.figureMovements[key].currentSpeed = increasedSpeed;
      }, speedIncreaseDelay);

      this.figureMovements[key] = {
        currentSpeed,
        speedIncreaseTimeout,
        movementTimeout: null, // movementTimeout is being set in this.moveCurrentFigureRecursively
      };

      this.moveCurrentFigureRecursively(key);
    }
  };

  cancelCurrentFigureMovementOnButtonPress = (key) => {
    if (!this.isPlaying()) {
      return;
    }
    clearTimeout(this.figureMovements[key].movementTimeout);
    clearTimeout(this.figureMovements[key].speedIncreaseTimeout);
    delete this.figureMovements[key];
  };

  clearAllCurrentFigureMovementTimeouts = () => {
    for (let key in this.figureMovements) {
      clearTimeout(this.figureMovements[key].movementTimeout);
      clearTimeout(this.figureMovements[key].speedIncreaseTimeout);
    }
  };

  attemptMovingCurrentFigure = (delta) => {
    if (this.currentFigure && this.currentFigure.canMove(delta)) {
      this.currentFigure.move(delta);
      this.gameScreen.render(this.currentFigure);
      return true;
    }
    return false;
  };

  moveCurrentFigureRecursively = (key, hasEnteredRecursion) => {

    const delta = this.getMovementDelta(key);
    this.sound.figureMoved();

    if (!hasEnteredRecursion) {
      this.attemptMovingCurrentFigure(delta);
    }

    this.figureMovements[key].movementTimeout = setTimeout(() => {
      const didMove = this.attemptMovingCurrentFigure(delta);
      if (didMove) {
        this.moveCurrentFigureRecursively(key, true);
      }
      else if (key === 'ArrowDown') {
        this.stackCurrentFigureOntoCanvas();
        this.vibrate('figureDropped');
        this.sound.figureDropped();
      }
    }, this.figureMovements[key].currentSpeed);
  };

  getMovementSpeed = (key, isIncreased) => {
    if (key === 'ArrowDown') {
      return isIncreased
        ? this.SPEED_Y_MOVEMENT_SPED_UP
        : this.SPEED_Y_MOVEMENT;
    }
    else {
      return isIncreased
        ? this.SPEED_X_MOVEMENT_SPED_UP
        : this.SPEED_X_MOVEMENT;
    }
  };

  getMovementDelta = (key) => {
    const dict = {
      'ArrowDown': { x: 0, y: 1 },
      'ArrowLeft': { x: -1, y: 0 },
      'ArrowRight': { x: 1, y: 0 },
    };
    return dict[key];
  };

  spawnNewCurrentFigure = () => {
    if (this.nextFigure) {
      this.currentFigure = this.nextFigure;
      this.currentFigure.setMatrix(this.gameScreen);
    }
    else {
      this.currentFigure = new Figure(this.gameScreen);
    }
    this.currentFigure.setRandomXPosition();
    this.gameScreen.render(this.currentFigure);

    this.nextFigure = new Figure(this.nextFigureScreen);
    this.nextFigureScreen.reset();
    this.nextFigureScreen.render(this.nextFigure);
  };

  getDescendSpeed = () => {
    const { screenType } = getDeviceCharacteristics();
    const speed = this.SPEED_DESCEND - ((this.level - 1) * this.SPEED_DESCEND_REDUCTION_BY_LEVEL);
    const speedLimit = screenType === 'desktop'
      ? this.SPEED_LIMIT_DESKTOP
      : this.SPEED_LIMIT_MOBILE;
    return Math.max(speed, speedLimit);
  };

  descendCurrentFigure = () => {
    if (this.currentFigure.fitsIntoMatrix()) {
      this.descendInterval = setInterval(() => {
        if (this.isPaused) {
          return;
        }
        if (this.currentFigure.canMove({ y: 1 })) {
          this.currentFigure.move({ y: 1 });
          this.gameScreen.render(this.currentFigure);
        }
        else {
          this.stackCurrentFigureOntoCanvas();
        }
      }, this.getDescendSpeed());
    }
    else {
      this.onGameOver();
    }
  };



  stackCurrentFigureOntoCanvas = () => {
    clearInterval(this.descendInterval);
    this.clearAllCurrentFigureMovementTimeouts();

    this.gameScreen.stackFigureOntoCanvas(this.currentFigure);
    this.gameScreen.clearFilledRows().then(numberOfRows => {
      if (numberOfRows) {
        this.changeScore({ type: 'rowCleared', numberOfRows });
        this.sound.rowCleared();
      }
    });
    this.gameScreen.render();

    this.changeScore({ type: 'stackFigure' });
    this.spawnNewCurrentFigure();
    this.descendCurrentFigure();
  };

  rotateCurrentFigure = () => {
    if (this.isPlaying() && this.currentFigure.canRotate()) {
      this.currentFigure.rotate();
      this.gameScreen.render(this.currentFigure);
      this.sound.figureRotated();
    }
  };

  changeScore = (data) => {
    const { type, numberOfRows } = data;
    if (type === 'stackFigure') {
      this.score += 10 * this.level;
    }
    if (type === 'rowCleared') {
      const basePoints = numberOfRows === 1
        ? 50
        : numberOfRows === 2
          ? 100
          : numberOfRows === 3
            ? 300
            : 1200;
      this.score += basePoints * this.level;
      this.rowsCleared += numberOfRows;
      this.level = Math.floor(this.rowsCleared / 10) + 1;
    }
    if (type === 'reset') {
      this.score = 0;
      this.rowsCleared = 0;
      this.level = 1;
      this.currentGameStartedAt = null;
    }
    const displayedScore = Math.min(this.score, 9999999).toString().padStart(7, '0');
    document.querySelector('.screen-counter--score').innerText = displayedScore;
    document.querySelector('.screen-counter--level').innerText = this.level;
  };

  onGameOver = () => {
    this.stopOngoingGame();

    const results = {
      score: this.score,
      level: this.level,
      rowsCleared: this.rowsCleared,
    };
    this.saveScoreToHistory(results, this.currentGameStartedAt).then(item => {
      const notification = this.generateGameOverNotification(item);
      events.trigger(TETRIS_GAME_OVER, notification);
    });

    this.sound.gameOver();
    this.vibrate('gameOver');

    this.demoScene.showGameOverScreen().then(() => {
      this.changeScore({ type: 'reset' });
      events.trigger(TETRIS_QUIT);
      this.demoScene.launchScreenSaver();
    });
  };

  getScoreHistory = () => {
    const history = JSON.parse(localStorage.getItem('history')) || {};
    if (!history.highest) {
      history.highest = {};
    }
    if (!history.items?.length) {
      history.items = [];
    }
    return history;
  };

  saveScoreToHistory = (results, gameStartedAt) => {
    const history = this.getScoreHistory();
    const timestamp = +new Date();
    const duration = timestamp - gameStartedAt;

    const isHighest = {
      score: false,
      rowsCleared: false,
      level: false,
    };
    for (let type in isHighest) {
      if (results[type] > (history['highest'][type] || 0)) {
        history['highest'][type] = results[type];
        isHighest[type] = true;
      }
    }
    const item = {
      timestamp,
      duration,
      isHighest,
      results,
    };

    history['items'].push(item);
    localStorage.setItem('history', JSON.stringify(history));

    return new Promise(resolve => {
      resolve(item);
    });
  };

  generateGameOverNotification = (item) => {
    const { results, isHighest, duration } = item;
    const pointsStr = formatNumber(results.score) + ' points';
    const levelStr = numberToHumanReadableOrder(results.level) + ' level';
    const rowsStr = inflectByNumber(results.rowsCleared, 'line');
    const durationStr = timestampToHumanReadableDuration(duration);

    let title = `Scored ${pointsStr}`;
    let body = `${rowsStr} cleared, reached ${levelStr}.`;

    if (isHighest.rowsCleared || isHighest.level) {
      title = isHighest.rowsCleared
        ? `RECORD🔥 ${rowsStr} cleared`
        : `RECORD🔥 ${levelStr} reached`;
      body = `Scored ${pointsStr}${isHighest.score ? ' (highest of all time).' : '.'}`;
    }
    else if (isHighest.score) {
      title = `RECORD🔥 ${pointsStr} earned`;
    }

    body += ` Completed in ${durationStr}.`;
    return { title, body };
  };

  vibrate = (type) => {
    const vibrationPatterns = {
      gameOver: [1000],
      buttonPressed: [200],
      figureDropped: [400],
    };
    if (navigator.vibrate && vibrationPatterns[type]) {
      navigator.vibrate(vibrationPatterns[type]);
    }
  };
}
