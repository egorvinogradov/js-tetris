import { Matrix } from './matrix.js';
import { Figure } from './figure.js';
import { Sound } from './sound.js';

export class Tetris {

  ONGOING_GAME_CLASSNAME = 'game--active';

  SPEED_DESCEND = 1000;
  SPEED_X_MOVEMENT = 100;
  SPEED_X_MOVEMENT_SPED_UP = 100;
  SPEED_Y_MOVEMENT = 120;
  SPEED_Y_MOVEMENT_SPED_UP = 16;

  KEYDOWN_SPEED_UP_DELAY = 150;

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

    this.enableGeneralKeys();
    this.enableMovementKeys();
    this.showScreenSaver();
  }

  launchNewGame = () => {
    document.body.classList.add(this.ONGOING_GAME_CLASSNAME);
    this.matrix.reset();
    this.nextFigureScreen.reset();

    this.spawnNewCurrentFigure();
    this.dropCurrentFigure();
  };

  pauseOrResumeGame = () => {
    this.isPaused = !this.isPaused;
  };

  quitGame = () => {
    this.currentFigure = null;
    this.nextFigure = null;
    this.matrix.reset();
    this.nextFigureScreen.reset();

    requestAnimationFrame(() => {
      this.matrix.render();
      this.nextFigureScreen.render();
      document.body.classList.remove(this.ONGOING_GAME_CLASSNAME);
    });
  };

  enableGeneralKeys = () => {
    document.getElementById('play-button').addEventListener('click', this.launchNewGame);
    document.addEventListener('keydown', e => {
      const key = e.code;
      const actions = {
        'Enter': () => this.launchNewGame(),
        'KeyP': () => this.pauseOrResumeGame(),
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
    this.sound.figureMoved();
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


window.tetris = new Tetris({
  matrixWidth: 10,
  matrixHeight: 20,
  matrixContainer: document.getElementById('matrix'),
  nextFigureScreenContainer: document.getElementById('next-figure-screen'),
});
