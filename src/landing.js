import { Tetris, TETRIS_EVENTS } from './tetris.js';
import {
  addBodyClass,
  removeBodyClass,
  applySVGFilter,
  setCSSVariable,
  random,
} from './utils.js';

export class BrickGameLanding {

  CLASSNAME_INITIALIZED = 'initialized';
  CLASSNAME_ONGOING_GAME = 'ongoing-game';
  CLASSNAME_PAUSED = 'paused';
  CLASSNAME_GAME_OVER = 'game-over';

  TETRIS_WIDTH_POINTS = 10;
  TETRIS_HEIGHT_POINTS = 20;
  TETRIS_GAME_SCREEN_SELECTOR = '.screen-game';
  TETRIS_NEXT_FIGURE_SCREEN_SELECTOR = '.screen-next-figure';

  TETRIS_ORIGINAL_HEIGHT = 601;
  TETRIS_TO_WINDOW_HEIGHT_RATIO = 1.082;
  TETRIS_TO_WINDOW_HEIGHT_RATIO_ONGOING_GAME = 1.624;

  /**
   * @type {Tetris}
   */
  tetris = null;

  constructor(){
    this.animateLogo();
    this.scaleTetris();

    applySVGFilter(document.querySelector('.noise'), [
      { type: 'turbulence', baseFrequency: 1 }
    ]);
    applySVGFilter(document.querySelector('.brand-image'), [
      { type: 'composite', operator: 'in', result: 'composite', inSource: true, in2Source: true },
      { type: 'turbulence', baseFrequency: 3, result: 'turbulence' },
      { type: 'displacementMap', scale: 1, in: 'composite', in2: 'turbulence' },
    ]);
    this.renderScratches(document.querySelector('.scratches--curve'), 30);
    this.renderScratches(document.querySelector('.scratches--bottom'), 100);

    window.addEventListener('load', this.initializeTetris);
    window.addEventListener('resize', this.scaleTetris);
  }

  initializeTetris = () => {
    this.tetris = new Tetris({
      gameWidth: this.TETRIS_WIDTH_POINTS,
      gameHeight: this.TETRIS_HEIGHT_POINTS,
      gameScreenContainer: document.querySelector(this.TETRIS_GAME_SCREEN_SELECTOR),
      nextFigureScreenContainer: document.querySelector(this.TETRIS_NEXT_FIGURE_SCREEN_SELECTOR),
    });

    this.tetris.on(TETRIS_EVENTS.NEW_GAME, () => {
      removeBodyClass(this.CLASSNAME_PAUSED);
      removeBodyClass(this.CLASSNAME_GAME_OVER);
      addBodyClass(this.CLASSNAME_ONGOING_GAME);
    });
    this.tetris.on(TETRIS_EVENTS.QUIT, () => {
      removeBodyClass(this.CLASSNAME_PAUSED);
      removeBodyClass(this.CLASSNAME_GAME_OVER);
      removeBodyClass(this.CLASSNAME_ONGOING_GAME);
    });
    this.tetris.on(TETRIS_EVENTS.PLAY, () => {
      removeBodyClass(this.CLASSNAME_PAUSED);
    });
    this.tetris.on(TETRIS_EVENTS.PAUSE, () => {
      addBodyClass(this.CLASSNAME_PAUSED);
    });
    this.tetris.on(TETRIS_EVENTS.FAIL, () => {
      addBodyClass(this.CLASSNAME_GAME_OVER);
    });

    addBodyClass(this.CLASSNAME_INITIALIZED);
    document.querySelector('.menu-play').addEventListener('click', this.tetris.launchNewGame);
    document.querySelector('.options-paused').addEventListener('click', this.tetris.pauseOrResumeGame);
  };

  scaleTetris = () => {
    const tetrisHeight = window.innerHeight * this.TETRIS_TO_WINDOW_HEIGHT_RATIO;
    const tetrisScale = tetrisHeight / this.TETRIS_ORIGINAL_HEIGHT;
    setCSSVariable('--position-tetris-scale', tetrisScale);

    const tetrisHeightOngoingGame = window.innerHeight * this.TETRIS_TO_WINDOW_HEIGHT_RATIO_ONGOING_GAME;
    const tetrisScaleOngoingGame = tetrisHeightOngoingGame / this.TETRIS_ORIGINAL_HEIGHT;
    setCSSVariable('--position-tetris-ongoing-game-scale', tetrisScaleOngoingGame);
  };

  animateLogo = () => {
    const logoElement = document.querySelector('.logo');
    const interval = 5000;
    let stage = 0;
    setInterval(() => {
      stage = stage > 2 ? 0 : stage + 1;
      if (!stage) {
        logoElement.className = 'logo';
      }
      else {
        logoElement.classList.add('logo--frame-' + stage);
      }
    }, interval);
  };

  renderScratches = (container, scratchCount) => {
    const scratchAreaWidth = container.clientWidth;
    const scratchAreaHeight = container.clientHeight;
    const paths = [];

    for (let i = 0; i < scratchCount; i++) {
      paths.push(this.generateScratchPath(scratchAreaWidth, scratchAreaHeight));
    }
    container.setAttribute('viewBox', `0 0 ${scratchAreaWidth} ${scratchAreaHeight}`);
    container.innerHTML = paths.join('\n');
  };

  generateScratchPath = (scratchAreaWidth, scratchAreaHeight) => {
    const pathWidth = random(10, scratchAreaWidth * 0.7);
    const pathHeight = random(1, scratchAreaHeight * 0.07);
    const x = random(0, scratchAreaWidth - pathWidth);
    const y = random(0, scratchAreaHeight - pathHeight);
    const angle = random(-10, 10);
    const curveRadius = 0.5;

    const pointCount = random(3,4);
    const pointPosXDeviation = pathWidth / pointCount;
    const points = [];

    for (let i = 0; i < pointCount; i++) {
      const pointX = random(0, pointPosXDeviation) + i * pointPosXDeviation;
      const pointY = random(0, pathHeight);
      points.push([pointX, pointY]);
    }

    const curve = points.map((point, index) => {
      return index
        ? this.generateBezierCurveCommand(points, index, curveRadius)
        : this.generatePathCommand('M', point);
    }).join(' ');

    return `<path transform="rotate(${angle}) translate(${x},${y})" d="${curve}"></path>`;
  };

  /**
   * @see https://francoisromain.medium.com/smooth-a-svg-path-with-cubic-bezier-curves-e37b49d46c74
   */
  calculateBezierPoint = (previousPoint, currentPoint, nextPoint, curveRadius, isReverse) => {
    previousPoint = previousPoint || currentPoint;
    nextPoint = nextPoint || currentPoint;

    const dx = nextPoint[0] - previousPoint[0];
    const dy = nextPoint[1] - previousPoint[1];
    const length = Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2)) * curveRadius;
    const angle = Math.atan2(dy, dx) + (isReverse ? Math.PI : 0);
    const x = currentPoint[0] + Math.cos(angle) * length;
    const y = currentPoint[1] + Math.sin(angle) * length;
    return [x, y];
  };

  generateBezierCurveCommand = (points, index, curveRadius) => {
    const startPoint = this.calculateBezierPoint(
      points[index - 2],
      points[index - 1],
      points[index],
      curveRadius,
    );
    const endPoint = this.calculateBezierPoint(
      points[index - 1],
      points[index],
      points[index + 1],
      curveRadius,
      true,
    );
    return this.generatePathCommand('C', startPoint, endPoint, points[index]);
  };

  generatePathCommand = (type, ...points) => {
    return type + points.map(([x, y]) => {
      return Math.round(x) + ',' + Math.round(y);
    }).join(' ');
  };
}
