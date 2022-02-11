import {
  createArray,
  createMatrix,
  deepCloneArray,
  mapBinaryMatrixToText,
} from './utils.js';


export class DemoScene {

  SCREENSAVER_LOAD_DELAY = 2000;
  SCREENSAVER_SCENE_DELAY = 600;
  SCREENSAVER_REPAINT_DELAY = 30;
  SCREENSAVER_CANVAS = [
    [0,0,1,0,0,0,0,0,0,0],
    [0,1,1,0,0,0,0,0,0,0],
    [0,0,1,0,0,1,1,1,0,0],
    [0,0,1,0,0,1,0,1,0,0],
    [0,1,1,1,0,1,1,1,0,0],
    [0,0,0,0,0,0,0,1,0,0],
    [0,0,0,0,0,1,1,1,0,0],
    [0,1,1,1,0,0,0,0,0,0],
    [0,1,0,1,0,0,0,0,0,0],
    [0,1,1,1,0,1,1,1,0,0],
    [0,0,0,1,0,1,0,1,0,0],
    [0,1,1,1,0,0,0,1,0,0],
    [0,0,0,0,0,0,0,1,0,0],
    [0,0,0,0,0,0,0,1,0,0],
    [0,0,0,0,0,0,0,0,0,0],
    [1,0,1,0,0,1,0,0,1,0],
    [1,0,1,1,0,1,0,1,1,0],
    [1,0,1,0,1,1,0,0,1,0],
    [1,0,1,0,0,1,0,0,1,0],
    [0,0,0,0,0,0,0,1,1,1],
  ];

  GAME_OVER_LOAD_DELAY = 1500;
  GAME_OVER_SCENE_DELAY = 300;
  GAME_OVER_REPAINT_DELAY = 80;

  demoFrameTimeout = null;
  demoIsRunning = false;


  /**
   * @type {Matrix}
   */
  matrix = null;

  constructor(matrix){
    this.matrix = matrix;
  }

  launchScreenSaver = async (isGameOver) => {
    this.stop();
    this.demoIsRunning = true;

    const emptyCanvas = createMatrix(this.matrix.width, this.matrix.height, 0);
    const screensaverCanvas = deepCloneArray(this.SCREENSAVER_CANVAS);

    if (!isGameOver) {
      await this.renderFrame(screensaverCanvas, this.SCREENSAVER_SCENE_DELAY);
      await this.renderFrame(screensaverCanvas, this.SCREENSAVER_LOAD_DELAY);
    }
    await this.screensaverSpiralTraverse(screensaverCanvas, this.modifyCanvasToFadeSpirally);
    await this.screensaverSpiralTraverse(screensaverCanvas, this.modifyCanvasToScreenSaverSpirally);
    await this.renderFrame(emptyCanvas, this.SCREENSAVER_SCENE_DELAY);
    await this.renderFrame(screensaverCanvas, this.SCREENSAVER_SCENE_DELAY);
    await this.renderFrame(emptyCanvas, this.SCREENSAVER_SCENE_DELAY);
    await this.renderFrame(screensaverCanvas, this.SCREENSAVER_SCENE_DELAY);
    await this.renderFrame(emptyCanvas, this.SCREENSAVER_SCENE_DELAY);
    await this.renderFrame(screensaverCanvas, this.SCREENSAVER_SCENE_DELAY);

    this.demoFrameTimeout = setTimeout(this.launchScreenSaver, this.SCREENSAVER_SCENE_DELAY);
  };

  screensaverSpiralTraverse = async (canvas, modifyCanvas) => {
    const { width, height } = this.matrix;

    let currentRow = height;
    let currentColumn = width;

    while (currentRow > height / 2 && currentColumn > width / 2) {
      if (!this.demoIsRunning) {
        return;
      }

      // Traverse left
      for (let i = (width - currentColumn); i < currentColumn ; i++) {
        const rowIndex = height - currentRow;
        const columnIndex = i;
        const updatedCanvas = modifyCanvas(canvas, rowIndex, columnIndex);
        await this.renderFrame(updatedCanvas, this.SCREENSAVER_REPAINT_DELAY);
      }

      // Traverse down
      for (let i = (height - currentRow + 1); i < currentRow ; i++) {
        const rowIndex = i;
        const columnIndex = currentColumn - 1;
        const updatedCanvas = modifyCanvas(canvas, rowIndex, columnIndex);
        await this.renderFrame(updatedCanvas, this.SCREENSAVER_REPAINT_DELAY);
      }

      // Traverse right
      for (let i = currentColumn - 1; i > (width - currentColumn) ; i--) {
        const rowIndex = currentRow - 1;
        const columnIndex = i - 1;
        const updatedCanvas = modifyCanvas(canvas, rowIndex, columnIndex);
        await this.renderFrame(updatedCanvas, this.SCREENSAVER_REPAINT_DELAY);
      }

      // Traverse up
      for (let i = currentRow - 1; i > (height - currentRow + 1) ; i--) {
        const rowIndex = i - 1;
        const columnIndex = width - currentColumn;
        const updatedCanvas = modifyCanvas(canvas, rowIndex, columnIndex);
        await this.renderFrame(updatedCanvas, this.SCREENSAVER_REPAINT_DELAY);
      }

      currentRow--;
      currentColumn--;
    }
  };

  modifyCanvasToFadeSpirally = (canvas, rowIndex, columnIndex) => {
    canvas[rowIndex][columnIndex] = 1;
    return canvas;
  };

  modifyCanvasToScreenSaverSpirally = (canvas, rowIndex, columnIndex) => {
    canvas[rowIndex][columnIndex] = this.SCREENSAVER_CANVAS[rowIndex]?.[columnIndex];
    return canvas;
  };

  renderFrame = async (canvas, delay) => {
    return new Promise((resolve, reject) => {
      this.demoFrameTimeout = setTimeout(() => {
        if (this.demoIsRunning) {
          this.matrix.canvasElement.textContent = mapBinaryMatrixToText(canvas, '#');
          resolve();
        }
        else {
          reject();
        }
      }, delay);
    });
  };

  stop = () => {
    if (this.demoIsRunning) {
      clearTimeout(this.demoFrameTimeout);
      this.demoIsRunning = false;
    }
  };

  showGameOverScreen = async () => {
    this.stop();
    this.demoIsRunning = true;

    const { height, canvas } = this.matrix;

    for (let rowIndex = height - 1; rowIndex >= 0; rowIndex--) {
      const delay = rowIndex === height - 1
        ? this.GAME_OVER_LOAD_DELAY
        : this.GAME_OVER_REPAINT_DELAY;
      const updatedCanvas = this.modifyCanvasToFillLineByLine(canvas, rowIndex, 1);
      await this.renderFrame(updatedCanvas, delay);
    }

    for (let rowIndex = 0; rowIndex < height; rowIndex++) {
      const delay = !rowIndex
        ? this.GAME_OVER_SCENE_DELAY
        : this.GAME_OVER_REPAINT_DELAY;
      const updatedCanvas = this.modifyCanvasToFillLineByLine(canvas, rowIndex, 0);
      await this.renderFrame(updatedCanvas, delay);
    }
  };

  modifyCanvasToFillLineByLine = (canvas, rowIndex, filler) => {
    canvas[rowIndex] = createArray(this.matrix.width, filler);
    return canvas;
  };
}
