import { Matrix } from './matrix.js';
import { Figure } from './figures.js';
import { arrayLast } from './utils.js';

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

    window.addEventListener('keydown', e => {
      const acceptedKeys = ['ArrowLeft', 'ArrowRight'];
      if (acceptedKeys.includes(e.key)) {
        this.onKeyPress(e);
      }
    });
  }

  onKeyPress = (e) => {
    if (e.key === 'ArrowLeft') {
      this.currentFigure.moveLeft();
    }
    else if (e.key === 'ArrowRight') {
      this.currentFigure.moveRight();
    }
    this.matrix.render(this.currentFigure);
    e.preventDefault();
  };

  runIteration = () => {
    this.currentFigure = new Figure(this.matrix);
    this.currentFigure.spawn();
    this.matrix.render(this.currentFigure);

    this.descend(() => {
      console.log('Figure has been stacked', this.currentFigure);
      this.matrix.stackFigureOntoCanvas(this.currentFigure);
      this.runIteration();
    });
  };

  descend = (callback) => {
    this.currentIterationTimeout = setTimeout(() => {
      const distanceBelow = this.calculateShortestDistanceBelow();
      if (distanceBelow > 0) {
        this.currentFigure.moveDown();
        this.matrix.render(this.currentFigure);
        this.descend(callback);
      }
      else {
        clearTimeout(this.currentIterationTimeout);
        callback();
      }
    }, this.iterationDuration);
  };

  calculateShortestDistanceBelow = () => {
    const figureLowestRow = arrayLast(this.currentFigure.data);
    const figureLowestRowY = this.currentFigure.height + this.currentFigure.y;
    const figureLowestPoints = [];
    figureLowestRow.forEach((point, i) => {
      if (point) {
        figureLowestPoints.push([
          this.currentFigure.x + i,
          figureLowestRowY,
        ]);
      }
    });
    const distancesBelow = figureLowestPoints.map(([pointX, pointY]) => {
      for (let matrixRowNumber = pointY; matrixRowNumber < this.matrix.canvas.length; matrixRowNumber++) {
        const pointInRow = this.matrix.canvas[matrixRowNumber];
        if (pointInRow[pointX]) {
          return matrixRowNumber - pointY;
        }
      }
      return this.matrix.canvas.length - pointY;
    });
    return distancesBelow.sort()[0];
  };
}


window.tetris = new Tetris({
  width: 10,
  height: 10,
  speed: 90,
});
tetris.runIteration();
