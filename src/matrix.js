import { createArray, deepCloneArray } from './utils.js';

export class Matrix {

  BASE_CLASSNAME = 'screen-matrix';

  SCREENSAVER_LOAD_DELAY = 2000;
  SCREENSAVER_STEP_DELAY = 600;
  SCREENSAVER_SPIRAL_DELAY = 30;
  SCREENSAVER_CANVAS = [
    [0,1,0,0,1,1,1,0,0,0],
    [1,1,0,0,1,0,1,0,0,0],
    [0,1,0,0,1,1,1,0,0,0],
    [0,1,0,0,0,0,1,0,0,0],
    [0,1,0,0,1,1,1,0,0,0],
    [0,0,0,0,0,0,0,0,0,0],
    [0,0,0,1,1,1,0,1,1,1],
    [0,0,0,1,0,1,0,1,0,1],
    [0,0,0,1,1,1,0,0,0,1],
    [0,0,0,0,0,1,0,0,0,1],
    [0,0,0,1,1,1,0,0,0,1],
    [0,0,0,0,0,0,0,0,0,0],
    [1,1,1,0,0,0,0,0,0,0],
    [0,1,0,0,1,0,0,1,0,0],
    [0,1,0,0,1,1,0,1,0,0],
    [1,1,1,0,1,0,1,1,0,1],
    [0,0,0,0,1,0,0,1,0,1],
    [0,0,0,0,0,0,0,0,0,1],
    [0,0,0,0,0,0,0,0,0,1],
    [0,0,0,0,0,0,0,0,0,1],
  ];

  screensaverTimeout = null;
  screensaverIsRunning = false;

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
    this.backgroundElement.textContent = this.generateCanvasTextContent(this.createCanvas(1));

    this.container.appendChild(this.canvasElement);
    this.container.appendChild(this.backgroundElement);
  };

  createCanvas = (filler = 0) => {
    const row = createArray(this.width, filler);
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
      this.canvasElement.textContent = this.generateCanvasTextContent(canvas);
    }
  };

  generateCanvasTextContent = (canvas) => {
    return canvas.map(row => {
      return row.map(cell => cell ? '#' : ' ').join('');
    }).join('\n');
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
    this.canvas = this.createCanvas(0);
  };

  clearFilledRows = (callback) => {
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
    callback(clearedRowsCounter);
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

  launchScreenSaver = async () => {
    const emptyCanvas = this.createCanvas(0);
    const screensaverCanvas = deepCloneArray(this.SCREENSAVER_CANVAS);
    const spiralRepaintFunctions = {
      fade: (canvas, rowIndex, columnIndex) => {
        canvas[rowIndex][columnIndex] = 1;
        return canvas;
      },
      screenSaver: (canvas, rowIndex, columnIndex) => {
        canvas[rowIndex][columnIndex] = this.SCREENSAVER_CANVAS[rowIndex]?.[columnIndex];
        return canvas;
      },
    };

    this.screensaverIsRunning = true;

    await this.renderScreensaverFrame(screensaverCanvas, this.SCREENSAVER_STEP_DELAY);
    await this.renderScreensaverFrame(screensaverCanvas, this.SCREENSAVER_LOAD_DELAY);

    await this.screensaverSpiralTraverse(screensaverCanvas, spiralRepaintFunctions.fade);
    await this.screensaverSpiralTraverse(screensaverCanvas, spiralRepaintFunctions.screenSaver);

    await this.renderScreensaverFrame(emptyCanvas, this.SCREENSAVER_STEP_DELAY);
    await this.renderScreensaverFrame(screensaverCanvas, this.SCREENSAVER_STEP_DELAY);
    await this.renderScreensaverFrame(emptyCanvas, this.SCREENSAVER_STEP_DELAY);
    await this.renderScreensaverFrame(screensaverCanvas, this.SCREENSAVER_STEP_DELAY);
    await this.renderScreensaverFrame(emptyCanvas, this.SCREENSAVER_STEP_DELAY);
    await this.renderScreensaverFrame(screensaverCanvas, this.SCREENSAVER_STEP_DELAY);

    this.screensaverTimeout = setTimeout(this.launchScreenSaver, this.SCREENSAVER_STEP_DELAY);
  };

  stopScreenSaver = () => {
    if (this.screensaverIsRunning) {
      clearTimeout(this.screensaverTimeout);
      this.screensaverIsRunning = false;
      this.canvasElement.textContent = this.generateCanvasTextContent(this.canvas);
    }
  };

  screensaverSpiralTraverse = async (canvas, repaintFunction) => {
    let currentRow = this.height;
    let currentColumn = this.width;

    while (currentRow > this.height / 2 && currentColumn > this.width / 2) {
      if (!this.screensaverIsRunning) {
        return;
      }

      // Traverse left
      for (let i = (this.width - currentColumn); i < currentColumn ; i++) {
        const rowIndex = this.height - currentRow;
        const columnIndex = i;
        const updatedCanvas = repaintFunction(canvas, rowIndex, columnIndex);
        await this.renderScreensaverFrame(updatedCanvas, this.SCREENSAVER_SPIRAL_DELAY);
      }

      // Traverse down
      for (let i = (this.height - currentRow + 1); i < currentRow ; i++) {
        const rowIndex = i;
        const columnIndex = currentColumn - 1;
        const updatedCanvas = repaintFunction(canvas, rowIndex, columnIndex);
        await this.renderScreensaverFrame(updatedCanvas, this.SCREENSAVER_SPIRAL_DELAY);
      }

      // Traverse right
      for (let i = currentColumn - 1; i > (this.width - currentColumn) ; i--) {
        const rowIndex = currentRow - 1;
        const columnIndex = i - 1;
        const updatedCanvas = repaintFunction(canvas, rowIndex, columnIndex);
        await this.renderScreensaverFrame(updatedCanvas, this.SCREENSAVER_SPIRAL_DELAY);
      }

      // Traverse up
      for (let i = currentRow - 1; i > (this.height - currentRow + 1) ; i--) {
        const rowIndex = i - 1;
        const columnIndex = this.width - currentColumn;
        const updatedCanvas = repaintFunction(canvas, rowIndex, columnIndex);
        await this.renderScreensaverFrame(updatedCanvas, this.SCREENSAVER_SPIRAL_DELAY);
      }

      currentRow--;
      currentColumn--;
    }
  };

  renderScreensaverFrame = async (canvas, delay) => {
    return new Promise(resolve => {
      this.screensaverTimeout = setTimeout(() => {
        if (!this.screensaverIsRunning) {
          return;
        }
        this.canvasElement.textContent = this.generateCanvasTextContent(canvas);
        resolve();
      }, delay);
    });
  };
}
