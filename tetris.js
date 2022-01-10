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

  constructor(config){
    this.iterationDuration = (config.speed || 100) * 10;
    this.container = document.getElementById('matrix');
    this.matrix = new Matrix(config.width, config.height, this.container);
    window.addEventListener('keydown', this.onKeyDown);
  }

  launchGame = () => {
    this.matrix.reset();
    this.runIteration();
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
      'Space': () => this.rotateCurrentFigure(),
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
    this.currentFigure.rotate();
    this.matrix.render(this.currentFigure);
  };

  fastDescent = () => {
    // TODO: fix
  };

  finishGame = () => {
    // TODO: fix
    alert('Game over');
  };
}


window.tetris = new Tetris({
  width: 10,
  height: 10,
  speed: 100,
});
tetris.launchGame();
