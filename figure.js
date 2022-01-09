import { random } from './utils.js';
import { FIGURE_TYPES } from './figure_types.js';

export class Figure {
  x = 0;
  y = 0;
  type = null;
  typeIndex = 0;
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
    this.typeIndex = random(FIGURE_TYPES[this.type].length - 1);
    this.data = FIGURE_TYPES[this.type][this.typeIndex];

    const maxPosX = this.matrix.width - this.width;
    this.x = random(maxPosX);
    this.y = 0;
  };

  rotate = () => {
    let nextTypeIndex = this.typeIndex + 1;
    if (nextTypeIndex >= FIGURE_TYPES[this.type].length) {
      nextTypeIndex = 0;
    }
    this.data = FIGURE_TYPES[this.type][nextTypeIndex];
    this.typeIndex = nextTypeIndex;
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
