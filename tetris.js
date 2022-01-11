import { Matrix } from './matrix.js';
import { Figure } from './figure.js';

export class Tetris {
  container = null;
  iterationDuration = null;
  currentIterationTimeout = null;

  /**
   * @type {Matrix}
   */
  matrix = null;

  /**
   * @type {Figure}
   */
  currentFigure = null;
  ongoingGameClassName = 'game--active';

  constructor(config){
    this.iterationDuration = (config.speed || 100) * 10;
    this.container = document.getElementById('matrix');
    this.matrix = new Matrix(config.width, config.height, this.container);
    window.addEventListener('keydown', this.onKeyDown);
    document.getElementById('play-button').addEventListener('click', this.launchGame);
  }

  launchGame = () => {
    this.matrix.reset();
    this.runIteration();
    document.body.classList.add(this.ongoingGameClassName);
  };

  runIteration = () => {
    this.currentFigure = new Figure(this.matrix);
    if (!this.currentFigure.fitsIntoMatrix()) {
      return this.finishGame();
    }
    this.matrix.clearFilledRows();
    this.matrix.render(this.currentFigure);

    this.descend(() => {
      console.log('Figure has been stacked', this.currentFigure);
      this.matrix.stackFigureOntoCanvas(this.currentFigure);
      this.runIteration();
    });
  };

  descend = (callback) => {
    this.currentIterationTimeout = setTimeout(() => {
      if (this.currentFigure.canMove({ y: 1 })) {
        this.currentFigure.move({ y: 1 });
        this.matrix.render(this.currentFigure);
        this.descend(callback);
      }
      else {
        clearTimeout(this.currentIterationTimeout);
        callback();
      }
    }, this.iterationDuration);
  };

  onKeyDown = (e) => {
    const actions = {
      'ArrowLeft': () => this.moveCurrentFigureHorizontally(-1),
      'ArrowRight': () => this.moveCurrentFigureHorizontally(1),
      'ArrowDown': () => this.fastDescent(),
      'ArrowUp': () => this.rotateCurrentFigure(),
      'Space': () => this.rotateCurrentFigure(),
      'KeyM': () => this.toggleMute(),
      'Escape': () => this.exit(),
    };
    const action = actions[e.code];
    if (action) {
      action();
      this.matrix.render(this.currentFigure);
      e.preventDefault();
    }
  };

  moveCurrentFigureHorizontally = (delta) => {
    if (this.currentFigure.canMove({ x: delta })) {
      this.currentFigure.move({ x: delta });
    }
  };

  rotateCurrentFigure = () => {
    if (this.currentFigure.canRotate()) {
      this.currentFigure.rotate();
      this.matrix.render(this.currentFigure);
    }
  };

  fastDescent = () => {
    if (this.currentFigure.canMove({ y: 1 })) {
      this.currentFigure.move({ y: 1 });
    }
  };

  finishGame = () => {
    // TODO: fix
    alert('Game over');
  };

  toggleMute = () => {
    // TODO: fix
  };

  exit = () => {
    document.body.classList.remove(this.ongoingGameClassName);
    clearTimeout(this.currentIterationTimeout);
    requestAnimationFrame(() => {
      this.matrix.reset();
    });
  };
}


window.tetris = new Tetris({
  width: 20,
  height: 30,
  speed: 100,
});
