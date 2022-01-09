import { random } from './utils.js';

export const FIGURE_TYPES = {
  TYPE_I: [
    [1],
    [1],
    [1],
    [1],
  ],
  TYPE_T: [
    [0,1,0],
    [1,1,1],
  ],
  TYPE_Z: [
    [1,1,0],
    [0,1,1],
  ],
};

export class Figure {
  x = 0;
  y = 0;
  type = null;
  data = [];

  /**
   * @type {Matrix}
   */
  matrix = null;

  constructor(matrix){
    this.matrix = matrix;
  }

  spawn = () => {
    const figureTypes = Object.keys(FIGURE_TYPES);
    this.type = figureTypes[random(figureTypes.length - 1)];
    this.data = FIGURE_TYPES[this.type];

    const maxPosX = this.matrix.width - this.data[0].length;
    this.x = random(maxPosX);
    this.y = 0;
  };

  moveDown = () => {
    this.y++;
  };
}
