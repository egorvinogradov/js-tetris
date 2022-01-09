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
      const distanceBelow = this.calculateShortestDistanceBelow();
      if (distanceBelow > 0) {
        console.warn('__ proceed', distanceBelow);
        this.currentFigure.moveDown();
        this.matrix.render(this.currentFigure);
        this.crawlDownward(callback);
      }
      else {
        console.error('__ do not proceed', distanceBelow);
        clearTimeout(this.currentIterationTimeout);
        callback();
      }

    }, this.iterationDuration);
  };

  calculateShortestDistanceBelow = () => {
    const figureLowestRow = arrayLast(this.currentFigure.data);
    const figureLowestRowY = this.currentFigure.data.length + this.currentFigure.y;
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
        console.log('__ pointInRow', matrixRowNumber, pointInRow);
        if (pointInRow[pointX]) {
          return matrixRowNumber - pointY;
        }
      }
      return this.matrix.canvas.length - pointY;
    });

    console.log('__ figureLowestPoints', figureLowestPoints);
    console.log('__ figureLowestRowY', figureLowestRowY);
    console.log('__ distancesBelow', distancesBelow);

    return distancesBelow.sort()[0];
  };
}


window.tetris = new Tetris({
  width: 10,
  height: 10,
  speed: 120,
});
tetris.runIteration();
