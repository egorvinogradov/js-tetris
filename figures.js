import { random } from './utils.js';

export const FIGURE_TYPES = {
  TYPE_I: [
    [1],
    [1],
    [1],
    [1],
  ],
  TYPE_T: [
    [1,1,1],
    [0,1,0],
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

  get width(){
    return this.data[0].length;
  };

  get height(){
    return this.data.length;
  };

  constructor(matrix){
    this.matrix = matrix;
  }

  spawn = () => {
    const figureTypes = Object.keys(FIGURE_TYPES);
    this.type = figureTypes[random(figureTypes.length - 1)];
    this.data = FIGURE_TYPES[this.type];

    const maxPosX = this.matrix.width - this.width;
    this.x = random(maxPosX);
    this.y = 0;
  };

  moveDown = () => {
    this.y++;
  };

  moveHorizontally = (delta) => {
    let nextPosX = this.x + delta;
    if (nextPosX < 0) {
      nextPosX = 0;
    }
    if (nextPosX > this.matrix.width) {
      nextPosX = this.matrix.width;
    }
    this.x = nextPosX;
  };

  moveLeft = () => {
    this.moveHorizontally(-1);
  };

  moveRight = () => {
    this.moveHorizontally(1);
  };
}
