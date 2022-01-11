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
    const { x, y, pixels, typeIndex } = this.calculateNextRotation();
    this.x = x;
    this.y = y;
    this.pixels = pixels;
    this.typeIndex = typeIndex;
  };

  calculateNextRotation = () => {
    let typeIndex = this.typeIndex + 1;
    if (typeIndex >= FIGURE_TYPES[this.type].length) {
      typeIndex = 0;
    }
    let pixels = FIGURE_TYPES[this.type][typeIndex];
    let x = this.x;
    let y = this.y;
    let width = pixels[0].length;

    if (x + width > this.matrix.width) {
      x = this.matrix.width - width;
    }
    return { x, y, pixels, typeIndex };
  };

  canRotate = () => {
    const { x, y, pixels } = this.calculateNextRotation();
    return this.canFitFigureIntoMatrix(pixels, x, y);
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
