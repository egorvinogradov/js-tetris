import { random } from './utils.js';
import { FIGURE_TYPES } from './figure_types.js';

export class Figure {
  x = 0;
  y = 0;
  type = null;
  typeIndex = 0;
  pixels = [];

  /**
   * @type {Matrix}
   */
  matrix = null;

  get width(){
    return this.pixels[0].length;
  };

  get height(){
    return this.pixels.length;
  };

  constructor(matrix){
    this.matrix = matrix;
    this.spawn();
  }

  spawn = () => {
    const figureTypes = Object.keys(FIGURE_TYPES);
    this.type = figureTypes[random(figureTypes.length - 1)];
    this.typeIndex = random(FIGURE_TYPES[this.type].length - 1);
    this.pixels = FIGURE_TYPES[this.type][this.typeIndex];

    const maxPosX = this.matrix.width - this.width;
    this.x = random(maxPosX);
    this.y = 0;
  };

  rotate = () => {
    // TODO: check if can rotate (fail game)
    // TODO: change x if rotating next to boundary on the right
    let nextTypeIndex = this.typeIndex + 1;
    if (nextTypeIndex >= FIGURE_TYPES[this.type].length) {
      nextTypeIndex = 0;
    }
    this.pixels = FIGURE_TYPES[this.type][nextTypeIndex];
    this.typeIndex = nextTypeIndex;
  };

  /**
   * @param {({x?: number, y?: number})} delta
   */
  move = (delta) => {
    const { x, y } = delta;
    this.x = this.x + (x || 0);
    this.y = this.y + (y || 0);
  };

  /**
   * @param {({x?: number, y?: number})} delta
   */
  canMove = (delta) => {
    const { x, y } = delta;
    const figureNextX = this.x + (x || 0);
    const figureNextY = this.y + (y || 0);
    return this.canFitFigureIntoMatrix(this.pixels, figureNextX, figureNextY);
  };

  fitsIntoMatrix = () => {
    return this.canFitFigureIntoMatrix(this.pixels, this.x, this.y);
  };

  canFitFigureIntoMatrix = (figurePixels, figureX, figureY) => {
    const figureWidth = figurePixels[0].length;
    const figureHeight = figurePixels.length;

    for (let rowIndex = 0; rowIndex < figureHeight; rowIndex++) {
      const row = figurePixels[rowIndex];
      for (let columnIndex = 0; columnIndex < figureWidth; columnIndex++) {
        const point = row[columnIndex];
        const pointX = columnIndex + figureX;
        const pointY = rowIndex + figureY;

        const isBeyondMatrix = (pointX < 0 || pointX >= this.matrix.width) ||
          (pointY < 0 || pointY >= this.matrix.height);

        const isPointAlreadyTaken = point && this.matrix.canvas[pointY]?.[pointX];

        if (isBeyondMatrix || isPointAlreadyTaken) {
          return false;
        }
      }
    }
    return true;
  };
}
