import { createArray } from './utils.js';

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

    // TODO: uncomment
    // return createArray(this.height, row);

    // TODO: REMOVE TEST DATA
    return [ ...createArray(this.height - 1, row), [1,0,0,1,0,1,0,1,0,1], ];
  };

  /**
   * @param {Figure} figure
   */
  createCanvasWithFigure = (figure) => {
    const affectedCanvasRows = this.canvas.slice(figure.y, figure.data.length + figure.y);
    const updatedAffectedCanvasRows = affectedCanvasRows.map((row, i) => {
      return [
        ...row.slice(0, figure.x),
        ...figure.data[i],
        ...row.slice(figure.x + figure.data[0].length),
      ];
    });
    return [
      ...this.canvas.slice(0, figure.y),
      ...updatedAffectedCanvasRows,
      ...this.canvas.slice(figure.y + figure.data.length),
    ];
  };

  /**
   * @param {Figure} [figure]
   */
  stackFigureOntoCanvas = (figure) => {
    // TODO: re-render
    // TODO: destroy figure
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
