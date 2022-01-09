import { createArray, deepCloneArray } from './utils.js';

export class Matrix {
  width = 0;
  height = 0;
  container = null;
  canvas = [];

  constructor(width, height, container){
    this.width = width;
    this.height = height;
    this.container = container;
    this.canvas = this.createClearCanvas();
    this.render();
  };

  createClearCanvas = () => {
    const row = createArray(this.width, 0);
    return createArray(this.height, row);
  };

  /**
   * @param {Figure} figure
   */
  createCanvasWithFigure = (figure) => {
    const canvasWithFigure = deepCloneArray(this.canvas);

    figure.data.forEach((row, figureY) => {
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
    this.render();
  };

  /**
   * @param {Figure} [figure]
   */
  render = (figure) => {
    let canvas = this.canvas;
    if (figure) {
      canvas = this.createCanvasWithFigure(figure);
    }

    const tableHtml = canvas.map(row => {
      const rowHtml = row.map(cell => {
        const className = cell ? 'filled' : 'empty';
        return `<td class="${className}"></td>`;
      }).join('');
      return `<tr>${rowHtml}</tr>`;
    }).join('');

    this.container.innerHTML= `<table>${tableHtml}</table>`;
  };
}
