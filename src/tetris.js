import { Matrix } from './matrix.js';
import { Figure } from './figure.js';
import { Sound } from './sound.js';
import { addBodyClass, removeBodyClass, setCSSVariable } from './utils.js';

export class Tetris {

  CLASSNAME_INITIALIZED = 'initialized';
  CLASSNAME_ONGOING_GAME = 'ongoing-game';
  CLASSNAME_PAUSED = 'paused';

  TETRIS_ORIGINAL_HEIGHT = 601;
  TETRIS_TO_WINDOW_HEIGHT_RATIO = 1.082;
  TETRIS_TO_WINDOW_HEIGHT_RATIO_ONGOING_GAME = 1.624;

  SPEED_DESCEND = 1000;
  SPEED_X_MOVEMENT = 100;
  SPEED_X_MOVEMENT_SPED_UP = 100;
  SPEED_Y_MOVEMENT = 120;
  SPEED_Y_MOVEMENT_SPED_UP = 10;

  KEYDOWN_SPEED_UP_DELAY = 150;

  isOngoingGame = false;
  isPaused = false;
  descendInterval = null;
  keyDownFigureMovements = {};
  keyDownSpeedUpTimeouts = {};

  /**
   * @type {Matrix}
   */
  matrix = null;

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
      matrixWidth,
      matrixHeight,
      matrixContainer,
      nextFigureScreenContainer,
    } = config;

    this.matrix = new Matrix(matrixContainer, matrixWidth, matrixHeight);
    this.matrix.render();
    this.nextFigureScreen = new Matrix(nextFigureScreenContainer, 4, 4);
    this.nextFigureScreen.render();

    this.sound = new Sound();

    this.animateLogo();
    this.scaleTetris();
    this.enableGeneralKeys();
    this.enableMovementKeys();
    this.showScreenSaver();

    window.addEventListener('resize', this.scaleTetris);
    requestAnimationFrame(() => {
      addBodyClass(this.CLASSNAME_INITIALIZED);
    });
  }

  animateLogo = () => {
    const logoElement = document.querySelector('.logo');
    const interval = 5000;
    let stage = 0;
    setInterval(() => {
      stage = stage > 2 ? 0 : stage + 1;
      if (!stage) {
        logoElement.className = 'logo';
      }
      else {
        logoElement.classList.add('logo--frame-' + stage);
      }
    }, interval);
  };

  scaleTetris = () => {
    const ratio = this.isOngoingGame
      ? this.TETRIS_TO_WINDOW_HEIGHT_RATIO_ONGOING_GAME
      : this.TETRIS_TO_WINDOW_HEIGHT_RATIO;

    const cssVariableName = this.isOngoingGame
      ? '--position-tetris-ongoing-game-scale'
      : '--position-tetris-scale';

    const tetrisHeight = window.innerHeight * ratio;
    const tetrisScale = tetrisHeight / this.TETRIS_ORIGINAL_HEIGHT;
    setCSSVariable(cssVariableName, tetrisScale);
  };

  launchNewGame = () => {
    addBodyClass(this.CLASSNAME_ONGOING_GAME);
    requestAnimationFrame(this.scaleTetris);

    this.isOngoingGame = true;

    this.matrix.reset();
    this.nextFigureScreen.reset();

    this.sound.startBackgroundNoise();
    // this.sound.intro(); // TODO: fix

    this.spawnNewCurrentFigure();
    this.dropCurrentFigure();
  };

  pauseOrResumeGame = () => {
    if (this.isOngoingGame) {
      this.isPaused = !this.isPaused;
      this.isPaused ? addBodyClass(this.CLASSNAME_PAUSED) : removeBodyClass(this.CLASSNAME_PAUSED);
    }
  };

  quitGame = () => {
    this.currentFigure = null;
    this.nextFigure = null;

    this.isOngoingGame = false;
    this.isPaused = false;

    this.matrix.reset();
    this.nextFigureScreen.reset();

    requestAnimationFrame(() => {
      this.matrix.render();
      this.nextFigureScreen.render();

      removeBodyClass(this.CLASSNAME_PAUSED);
      removeBodyClass(this.CLASSNAME_ONGOING_GAME);
      requestAnimationFrame(this.scaleTetris);
    });
  };

  enableGeneralKeys = () => {
    document.querySelector('.menu-play').addEventListener('click', this.launchNewGame);
    document.querySelector('.options-paused').addEventListener('click', this.pauseOrResumeGame);
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
      if (keys.includes(key) && !this.keyDownSpeedUpTimeouts[key]) {
        this.onMovementKeyEvent(key, 'start');
        this.keyDownSpeedUpTimeouts[key] = setTimeout(() => {
          this.onMovementKeyEvent(key, 'speedup');
        }, this.KEYDOWN_SPEED_UP_DELAY);
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
      this.matrix.render(this.currentFigure);
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
      this.currentFigure.setMatrix(this.matrix);
    }
    else {
      this.currentFigure = new Figure(this.matrix);
    }
    this.currentFigure.setRandomXPosition();
    this.matrix.render(this.currentFigure);

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
          this.matrix.render(this.currentFigure);
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
    this.matrix.stackFigureOntoCanvas(this.currentFigure);
    this.matrix.clearFilledRows(numberOfRows => {
      if (numberOfRows) {
        this.sound.rowCleared();
      }
    });
    this.matrix.render();
    this.spawnNewCurrentFigure();
    this.dropCurrentFigure();
  };

  rotateCurrentFigure = () => {
    if (this.isPaused) {
      return;
    }
    if (this.currentFigure.canRotate()) {
      this.currentFigure.rotate();
      this.matrix.render(this.currentFigure);
    }
    this.sound.figureRotated();
  };

  showScreenSaver = () => {
    console.error('__ SCREEN SAVER');
  };

  showGameOverScreen = () => {
    console.error('__ GAME OVER');
  };

  onGameFailed = () => {
    this.showGameOverScreen();
    this.sound.gameOver();
  };
}

window.onload = () => {
  window.tetris = new Tetris({
    matrixWidth: 10,
    matrixHeight: 20,
    matrixContainer: document.getElementById('matrix'),
    nextFigureScreenContainer: document.getElementById('next-figure-screen'),
  });
};

