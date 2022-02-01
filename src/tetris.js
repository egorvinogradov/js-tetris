import { Matrix } from './matrix.js';
import { Figure } from './figure.js';
import { Sound } from './sound.js';
import { TetrisAnimation } from './tetris_animation.js';

export const TETRIS_EVENTS = {
  NEW_GAME: 'NEW_GAME',
  PLAY: 'PLAY',
  PAUSE: 'PAUSE',
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
  keyDownFigureMovements = {};
  keyDownSpeedUpTimeouts = {};

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
   * @type {TetrisAnimation}
   */
  animation = null;

  constructor(config){
    const {
      gameWidth,
      gameHeight,
      gameScreenContainer,
      nextFigureScreenContainer,
    } = config;

    this.gameScreen = new Matrix(gameScreenContainer, gameWidth, gameHeight);

    this.animation = new TetrisAnimation(this.gameScreen);
    this.animation.launchScreenSaver();

    this.nextFigureScreen = new Matrix(nextFigureScreenContainer, 4, 4);
    this.nextFigureScreen.render();

    this.sound = new Sound();

    this.enableGeneralKeys();
    this.enableMovementKeys();
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

  canPlay = () => {
    return this.isOngoingGame && !this.isPaused;
  };

  launchNewGame = () => {
    if (!this.isOngoingGame) {
      this.isOngoingGame = true;

      this.animation.stopScreenSaver();
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
      this.triggerEvent(this.isPaused ? TETRIS_EVENTS.PAUSE : TETRIS_EVENTS.PLAY);
    }
  };

  quitGame = () => {
    this.stopOngoingGame();
    this.gameScreen.reset();
    this.animation.stopGameOverScreen();
    this.animation.launchScreenSaver();
    this.triggerEvent(TETRIS_EVENTS.QUIT);
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
      'Enter': () => this.launchNewGame(),
      'KeyP': () => this.pauseOrResumeGame(),
      'Escape': () => this.quitGame(),
      'ArrowUp': () => this.rotateCurrentFigure(),
    };
    document.addEventListener('keydown', e => {
      const key = e.code;
      const action = actions[key];
      if (action) {
        action();
      }
    });
  };

  enableMovementKeys = () => {
    const keys = [
      'ArrowLeft',
      'ArrowRight',
      'ArrowDown',
    ];

    document.addEventListener('keydown', e => {
      if (!this.canPlay()) {
        return;
      }
      const key = e.code;
      const speedUpDelay = key === 'ArrowDown'
        ? this.KEYDOWN_Y_SPEED_UP_DELAY
        : this.KEYDOWN_X_SPEED_UP_DELAY;

      if (keys.includes(key) && !this.keyDownSpeedUpTimeouts[key]) {
        this.onMovementKeyEvent(key, 'start');
        this.keyDownSpeedUpTimeouts[key] = setTimeout(() => {
          this.onMovementKeyEvent(key, 'speedup');
        }, speedUpDelay);
      }
    });

    document.addEventListener('keyup', e => {
      if (!this.canPlay()) {
        return;
      }
      const key = e.code;

      if (keys.includes(key)) {
        clearTimeout(this.keyDownSpeedUpTimeouts[key]);
        delete this.keyDownSpeedUpTimeouts[key];
        this.onMovementKeyEvent(key, 'stop');
      }
    });
  };

  onMovementKeyEvent = (key, stage) => {
    if (stage === 'start') {
      const delta = this.getMovementDelta(key);
      const speed = this.getMovementSpeed(key, stage);
      this.keyDownFigureMovements[key] = { speed, timeout: null };
      this.attemptMovingCurrentFigure(delta);
      this.moveCurrentFigureRecursively(key, delta);
      this.sound.figureMoved();
    }
    if (stage === 'speedup') {
      this.keyDownFigureMovements[key].speed = this.getMovementSpeed(key, stage);
    }
    if (stage === 'stop') {
      clearTimeout(this.keyDownFigureMovements[key].timeout);
    }
  };

  getMovementSpeed = (key, stage) => {
    if (key === 'ArrowDown') {
      return stage === 'speedup'
        ? this.SPEED_Y_MOVEMENT_SPED_UP
        : this.SPEED_Y_MOVEMENT;
    }
    else {
      return stage === 'speedup'
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

  attemptMovingCurrentFigure = (delta) => {
    if (this.currentFigure && this.currentFigure.canMove(delta)) {
      this.currentFigure.move(delta);
      this.gameScreen.render(this.currentFigure);
      return true;
    }
    return false;
  };

  moveCurrentFigureRecursively = (key, delta) => {
    this.keyDownFigureMovements[key].timeout = setTimeout(() => {
      const didMove = this.attemptMovingCurrentFigure(delta);
      if (didMove) {
        this.moveCurrentFigureRecursively(key, delta);
      }
      else if (key === 'ArrowDown') {
        this.stackCurrentFigureOntoCanvas();
        this.sound.figureDropped();
      }
    }, this.keyDownFigureMovements[key].speed);
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
    this.gameScreen.clearFilledRows(numberOfRows => {
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
    if (this.canPlay() && this.currentFigure.canRotate()) {
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

    this.animation.showGameOverScreen().then(() => {
      this.triggerEvent(TETRIS_EVENTS.QUIT);
      this.animation.launchScreenSaver();
    });
  };
}
