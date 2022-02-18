import { Matrix } from './matrix.js';
import { Figure } from './figure.js';
import { Sound } from './sound.js';
import { DemoScene } from './demoscene.js';


export const TETRIS_EVENTS = {
  NEW_GAME: 'NEW_GAME',
  PLAY_PAUSE: 'PLAY_PAUSE',
  QUIT: 'QUIT',
  FAIL: 'FAIL',
};


export class Tetris {

  SPEED_DESCEND = 1000;
  SPEED_DESCEND_REDUCTION_BY_LEVEL = 100;

  SPEED_X_MOVEMENT = 100;
  SPEED_X_MOVEMENT_SPED_UP = 100;
  SPEED_Y_MOVEMENT = 120;
  SPEED_Y_MOVEMENT_SPED_UP = 10;

  KEYDOWN_X_SPEED_UP_DELAY = 150;
  KEYDOWN_Y_SPEED_UP_DELAY = 80;

  level = 1;
  score = 0;
  rowsCleared = 0;

  events = {};
  descendInterval = null;
  figureMovements = {};

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
    this.enableMovementButton('.button-left');
    this.enableMovementButton('.button-right');
    this.enableMovementButton('.button-down');
  }

  on = (eventName, callback) => {
    if (!this.events[eventName]) {
      this.events[eventName] = [];
    }
    this.events[eventName].push(callback);
  };

  triggerEvent = (eventName, data) => {
    if (this.events[eventName]?.length) {
      this.events[eventName].map(callback => callback(data));
    }
  };

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

      this.spawnNewCurrentFigure();
      this.dropCurrentFigure();
      this.triggerEvent(TETRIS_EVENTS.NEW_GAME);
    }
  };

  pauseOrResumeGame = () => {
    if (this.isOngoingGame) {
      this.isPaused = !this.isPaused;
      this.triggerEvent(TETRIS_EVENTS.PLAY_PAUSE, this.isPaused);
    }
  };

  quitGame = () => {
    const confirmationMessage = 'Are you sure you want to quit?';
    if (this.isOngoingGame && confirm(confirmationMessage)) {
      this.stopOngoingGame();
      this.gameScreen.reset();
      this.demoScene.launchScreenSaver();
      this.triggerEvent(TETRIS_EVENTS.QUIT);
    }
  };

  stopOngoingGame = () => {
    this.currentFigure = null;
    this.nextFigure = null;

    this.isOngoingGame = false;
    this.isPaused = false;

    clearInterval(this.descendInterval);
    this.descendInterval = null;

    this.nextFigureScreen.reset();
    this.nextFigureScreen.render();
    this.changeScore({ type: 'reset' });
  };

  enableGeneralKeys = () => {
    const actions = {
      'Enter': this.launchNewGame,
      'Escape': this.quitGame,
      'ArrowUp': this.rotateCurrentFigure,
      'KeyP': this.pauseOrResumeGame,
      'KeyM': this.sound.toggleMute,
    };
    document.addEventListener('keydown', e => {
      const key = e.code;
      const action = actions[key];
      if (action) {
        action();
      }
    });
    this.onButtonTap('.button-rotate', actions.ArrowUp);
    this.onButtonTap('.button-top-pause', actions.KeyP);
    this.onButtonTap('.button-top-quit', actions.Escape);
    this.onButtonTap('.button-top-mute', actions.KeyM);
  };

  enableMovementKeys = () => {
    const keys = [
      'ArrowLeft',
      'ArrowRight',
      'ArrowDown',
    ];
    document.addEventListener('keydown', e => {
      if (keys.includes(e.code)) {
        this.onMovementStart(e.code);
      }
    });
    document.addEventListener('keyup', e => {
      if (keys.includes(e.code)) {
        this.onMovementCancel(e.code);
      }
    });
  };

  onButtonTap = (selector, callback) => {
    const eventType = 'onpointerdown' in window
      ? 'pointerdown'
      : 'touchstart';
    document.querySelector(selector).addEventListener(eventType, e => {
      this.vibrate('buttonPressed');
      callback(e);
    });
  };

  onButtonUntap = (selector, callback) => {
    const eventType = 'onpointerup' in window
      ? 'pointerup'
      : 'touchend';
    document.querySelector(selector).addEventListener(eventType, callback);
  };

  enableMovementButton = (selector) => {
    const keyCode = document.querySelector(selector).dataset.key;

    this.onButtonTap(selector, () => {
      this.onMovementStart(keyCode);
    });
    this.onButtonUntap(selector, () => {
      this.onMovementCancel(keyCode);
    });
  };

  onMovementStart = (key) => {
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

      const delta = this.getMovementDelta(key);
      this.moveCurrentFigureRecursively(key, delta);
    }
  };

  onMovementCancel = (key) => {
    if (!this.isPlaying()) {
      return;
    }
    clearTimeout(this.figureMovements[key].movementTimeout);
    clearTimeout(this.figureMovements[key].speedIncreaseTimeout);
    delete this.figureMovements[key];
  };

  attemptMovingCurrentFigure = (delta) => {
    if (this.currentFigure && this.currentFigure.canMove(delta)) {
      this.currentFigure.move(delta);
      this.gameScreen.render(this.currentFigure);
      return true;
    }
    return false;
  };

  moveCurrentFigureRecursively = (key, delta, hasEnteredRecursion) => {
    this.sound.figureMoved();

    if (!hasEnteredRecursion) {
      this.attemptMovingCurrentFigure(delta);
    }

    this.figureMovements[key].movementTimeout = setTimeout(() => {
      const didMove = this.attemptMovingCurrentFigure(delta);
      if (didMove) {
        this.moveCurrentFigureRecursively(key, delta, true);
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
    return this.SPEED_DESCEND - ((this.level - 1) * this.SPEED_DESCEND_REDUCTION_BY_LEVEL);
  };

  dropCurrentFigure = () => {
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
      this.onGameFailed();
    }
  };

  stackCurrentFigureOntoCanvas = () => {
    clearInterval(this.descendInterval);

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
    this.dropCurrentFigure();
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
    }
    const displayedScore = Math.min(this.score, 9999999).toString().padStart(7, '0');
    document.querySelector('.screen-counter--score').innerText = displayedScore;
    document.querySelector('.screen-counter--level').innerText = this.level;
  };

  onGameFailed = () => {
    this.stopOngoingGame();
    this.triggerEvent(TETRIS_EVENTS.FAIL);
    this.sound.gameOver();
    this.vibrate('gameOver');

    this.demoScene.showGameOverScreen().then(() => {
      this.triggerEvent(TETRIS_EVENTS.QUIT);
      this.demoScene.launchScreenSaver();
    });
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
