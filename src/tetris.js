import { Matrix } from './matrix.js';
import { Figure } from './figure.js';
import { Sound } from './sound.js';

export const TETRIS_EVENTS = {
  NEW_GAME: 'NEW_GAME',
  PLAY: 'PLAY',
  PAUSE: 'PAUSE',
  QUIT: 'QUIT',
  FAIL: 'FAIL',
};

export class Tetris {

  SPEED_DESCEND = 1000;
  SPEED_X_MOVEMENT = 100;
  SPEED_X_MOVEMENT_SPED_UP = 100;
  SPEED_Y_MOVEMENT = 120;
  SPEED_Y_MOVEMENT_SPED_UP = 10;

  KEYDOWN_X_SPEED_UP_DELAY = 150;
  KEYDOWN_Y_SPEED_UP_DELAY = 80;

  NEW_GAME_DELAY = 600;

  events = {};
  isOngoingGame = false;
  isPaused = false;
  descendInterval = null;
  keyDownFigureMovements = {};
  keyDownSpeedUpTimeouts = {};

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

  constructor(config){
    const {
      gameWidth,
      gameHeight,
      gameScreenContainer,
      nextFigureScreenContainer,
    } = config;

    this.gameScreen = new Matrix(gameScreenContainer, gameWidth, gameHeight);
    this.gameScreen.launchScreenSaver();

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

  launchNewGame = () => {
    this.triggerEvent(TETRIS_EVENTS.NEW_GAME);

    setTimeout(() => {
      this.isOngoingGame = true;
      this.gameScreen.stopScreenSaver();
      this.gameScreen.reset();
      this.nextFigureScreen.reset();

      this.sound.startBackgroundNoise();
      // this.sound.intro(); // TODO: uncomment

      this.spawnNewCurrentFigure();
      this.dropCurrentFigure();
    }, this.NEW_GAME_DELAY);
  };

  pauseOrResumeGame = () => {
    if (this.isOngoingGame) {
      this.isPaused = !this.isPaused;
      this.triggerEvent(this.isPaused ? TETRIS_EVENTS.PAUSE : TETRIS_EVENTS.PLAY);
    }
  };

  quitGame = () => {
    this.currentFigure = null;
    this.nextFigure = null;

    this.isOngoingGame = false;
    this.isPaused = false;
    clearInterval(this.descendInterval);

    this.gameScreen.reset();
    this.nextFigureScreen.reset();

    requestAnimationFrame(() => {
      this.gameScreen.launchScreenSaver();
      this.nextFigureScreen.render();
      this.triggerEvent(TETRIS_EVENTS.QUIT);
    });
  };

  enableGeneralKeys = () => {
    document.addEventListener('keydown', e => {
      const key = e.code;
      const actions = {
        'Enter': () => this.launchNewGame(),
        'KeyP': () => this.pauseOrResumeGame(),
        'Escape': () => this.quitGame(),
        'Space': () => this.rotateCurrentFigure(),
        'ArrowUp': () => this.rotateCurrentFigure(),
      };
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
      if (this.isPaused) {
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
      if (this.isPaused) {
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
    if (this.currentFigure.canMove(delta)) {
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
    // TODO: consider level & score
    return this.SPEED_DESCEND;
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
    console.log('Figure has been stacked', this.currentFigure);
    clearInterval(this.descendInterval);

    this.gameScreen.stackFigureOntoCanvas(this.currentFigure);
    this.gameScreen.clearFilledRows(numberOfRows => {
      if (numberOfRows) {
        this.sound.rowCleared();
      }
    });
    this.gameScreen.render();
    this.spawnNewCurrentFigure();
    this.dropCurrentFigure();
  };

  rotateCurrentFigure = () => {
    if (this.isPaused) {
      return;
    }
    if (this.currentFigure.canRotate()) {
      this.currentFigure.rotate();
      this.gameScreen.render(this.currentFigure);
    }
    this.sound.figureRotated();
  };

  onGameFailed = () => {
    this.sound.gameOver();
    this.triggerEvent(TETRIS_EVENTS.FAIL);
  };
}
