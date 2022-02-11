import {
  createArray,
  createMatrix,
  deepCloneArray,
  mapBinaryMatrixToText,
} from './utils.js';


export class Matrix {

  BASE_CLASSNAME = 'screen-matrix';

  width = 0;
  height = 0;
  canvas = [];
  canvasHash = '';

  /**
   * @type {HTMLElement}
   */
  container = null;

  /**
   * @type {HTMLElement}
   */
  canvasElement = null;

  /**
   * @type {HTMLElement}
   */
  backgroundElement = null;

  constructor(container, width, height){
    this.width = width;
    this.height = height;
    this.container = container;
    this.reset();
    this.createDOM();
  };

  createDOM = () => {
    this.canvasElement = document.createElement('div');
    this.canvasElement.className = `${this.BASE_CLASSNAME} ${this.BASE_CLASSNAME}--main`;

    this.backgroundElement = document.createElement('div');
    this.backgroundElement.className = `${this.BASE_CLASSNAME} ${this.BASE_CLASSNAME}--background`;

    const backgroundCanvas = createMatrix(this.width, this.height, 1);
    this.backgroundElement.textContent = mapBinaryMatrixToText(backgroundCanvas, '#');

    this.container.appendChild(this.canvasElement);
    this.container.appendChild(this.backgroundElement);
  };

  /**
   * @param {Figure} figure
   */
  createCanvasWithFigure = (figure) => {
    const canvasWithFigure = deepCloneArray(this.canvas);

    figure.pixels.forEach((row, figureY) => {
      row.forEach((point, figureX) => {
        if (point) {
          const canvasX = figureX + figure.x;
          const canvasY = figureY + figure.y;
          canvasWithFigure[canvasY][canvasX] = point;
        }
      });
    });
    return canvasWithFigure;
  };

  /**
   * @param {Figure} [figure]
   */
  stackFigureOntoCanvas = (figure) => {
    this.canvas = this.createCanvasWithFigure(figure);
  };

  /**
   * @param {Figure} [figure]
   */
  render = (figure) => {
    let canvas = this.canvas;
    if (figure) {
      canvas = this.createCanvasWithFigure(figure);
    }
    if (this.didCanvasChange(canvas)) {
      this.canvasElement.textContent = mapBinaryMatrixToText(canvas, '#');
    }
  };

  didCanvasChange = (currentCanvas) => {
    const currentCanvasHash = currentCanvas.map(row => {
      return row.join('');
    }).join('\n');
    const didChange = currentCanvasHash !== this.canvasHash;
    this.canvasHash = currentCanvasHash;
    return didChange;
  };

  reset = () => {
    this.canvas = createMatrix(this.width, this.height, 0);
  };

  clearFilledRows = () => {
    let clearedRowsCounter = 0;
    let clearedCanvas = [];

    this.canvas.forEach(row => {
      if (this.isRowFilled(row)) {
        clearedRowsCounter++;
      }
      else {
        clearedCanvas.push(row);
      }
    });
    const emptyRow = createArray(this.width, 0);
    this.canvas = [
      ...createArray(clearedRowsCounter, emptyRow),
      ...clearedCanvas,
    ];
    return new Promise(resolve => resolve(clearedRowsCounter));
  };

  isRowFilled = (row) => {
    for (let i = 0; i < row.length; i++) {
      const point = row[i];
      if (!point) {
        return false;
      }
    }
    return true;
  };
}
