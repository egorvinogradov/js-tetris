import { createArray, deepCloneArray } from './utils.js';

export class Matrix {
  width = 0;
  height = 0;
  container = null;
  canvas = [];
  canvasHash = '';

  constructor(container, width, height){
    this.width = width;
    this.height = height;
    this.container = container;
    this.reset();
  };

  createEmptyCanvas = () => {
    const row = createArray(this.width, 0);
    return createArray(this.height, row);
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
      const tableHtml = canvas.map(row => {
        const rowHtml = row.map(cell => {
          const className = cell ? 'filled' : 'empty';
          return `<td class="${className}"></td>`;
        }).join('');
        return `<tr>${rowHtml}</tr>`;
      }).join('');

      this.container.innerHTML= `<table>${tableHtml}</table>`;
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
    this.canvas = this.createEmptyCanvas();
  };

  clearFilledRows = () => {
    let newRowsCounter = 0;
    let clearedCanvas = [];

    this.canvas.forEach(row => {
      if (this.isRowFilled(row)) {
        newRowsCounter++;
      }
      else {
        clearedCanvas.push(row);
      }
    });
    const emptyRow = createArray(this.width, 0);
    this.canvas = [
      ...createArray(newRowsCounter, emptyRow),
      ...clearedCanvas,
    ];
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
