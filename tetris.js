import { Matrix } from './matrix.js';
import { Figure } from './figures.js';

export class Tetris {
  width = 20;
  height = 30;
  container = null;
  iterationDuration = 1.2 * 1000;
  currentIterationTimeout = null;

  /**
   * @type {Matrix}
   */
  matrix = null;

  /**
   * @type {Figure}
   */
  currentFigure = null;

  constructor(){
    this.container = document.getElementById('matrix');
    this.matrix = new Matrix(this.width, this.height, this.container);
  }

  runIteration = () => {
    this.currentFigure = new Figure(this.matrix);
    this.currentFigure.spawn();
    this.matrix.render(this.currentFigure);

    this.crawlDownward(() => {
      console.log('Figure has been stacked', this.currentFigure);
      this.matrix.stackFigureOntoCanvas();
    });
  };

  crawlDownward = (callback) => {
    this.currentIterationTimeout = setTimeout(() => {
      const distanceBelow = this.calculateDistanceBelow();
      if (distanceBelow) {
        this.currentFigure.moveStepDown();
        this.matrix.render(this.currentFigure);
        this.crawlDownward(callback);
      }
      else {
        clearTimeout(this.currentIterationTimeout);
        callback();
      }

    }, this.iterationDuration);
  };

  calculateDistanceBelow = () => {
    // TODO: fix
    return 1;
  };
}


window.tetris = new Tetris();
tetris.runIteration();
