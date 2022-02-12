import { Tetris, TETRIS_EVENTS } from './tetris.js';
import { PWA } from './pwa.js';
import {
  addRootClass,
  removeRootClass,
  setCSSVariable,
  applySVGFilter,
  detectDeviceCharacteristics,
  getViewportHeight,
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

  TETRIS_TO_WINDOW_HEIGHT_RATIO_MOBILE = 0.978;
  TETRIS_TO_WINDOW_HEIGHT_RATIO_ONGOING_GAME_MOBILE = 1.624;

  /**
   * @type {Tetris}
   */
  tetris = null;

  /**
   * @type {PWA}
   */
  pwa = null;
  device = detectDeviceCharacteristics();

  constructor(){
    this.animateLogo();
    this.scaleTetris();
    this.applyDeviceBasedLogic();
    this.applyVisualEffects();

    this.pwa = new PWA();
    // TODO: move to settings, change appearance, optimize code
    // document.querySelector('.options-reset-pwa').addEventListener('click', this.pwa.reset);

    window.addEventListener('load', this.initializeTetris);
  }

  applyDeviceBasedLogic = () => {
    const { deviceType, isTouchDevice, isIOS } = this.device;
    addRootClass('device--' + deviceType);

    if (isTouchDevice) {
      if (screen.orientation) {
        screen.orientation.lock('portrait');
      }
      window.addEventListener('orientationchange', () => {
        this.waitOrientationChangeEnd().then(this.scaleTetris);
      });
      addRootClass('device--touch');
    }

    if (isIOS) {
      this.preventPinchZoomInIOS();
      this.preventDoubleTabZoomInIOS();
      addRootClass('device--ios');
    }

    if (!isTouchDevice) {
      window.addEventListener('resize', this.scaleTetris);
    }
  };

  waitOrientationChangeEnd = () => {
    /**
     * Waiting until viewport dimensions change after changeorientation event occurred
     * @see https://stackoverflow.com/questions/12452349/mobile-viewport-height-after-orientation-change
     */
    return new Promise(resolve => {
      const maxOrientationChangeDelay = 400;
      let orientationChangeDelayTimeout = null;

      const onOrientationChangeEnded = () => {
        clearTimeout(orientationChangeDelayTimeout);
        window.removeEventListener('resize', onOrientationChangeEnded);
        resolve();
      };
      orientationChangeDelayTimeout = setTimeout(onOrientationChangeEnded, maxOrientationChangeDelay);
      window.addEventListener('resize', onOrientationChangeEnded);
    });
  };

  preventPinchZoomInIOS = () => {
    /**
     * In the future, this could be removed once touch-action: pan-x pan-y is widely adopted
     */
    document.addEventListener('touchmove', (e) => {
      if (e.scale !== 1) {
        e.preventDefault();
      }
    }, { passive: false });
  };

  preventDoubleTabZoomInIOS = () => {
    /**
     * The most reliable way to disable double tap zoom on iOS.
     * <meta name=viewport content=user-scalable=no> and touch-action: manipulation; are not reliable.
     * @see https://stackoverflow.com/questions/46167604/ios-html-disable-double-tap-to-zoom
     */
    let lastTouchEnd = 0;
    const doubleTabDelay = 300; // see: https://stackoverflow.com/a/38958743
    document.addEventListener('touchend', (e) => {
      let now = +new Date();
      if (now - lastTouchEnd <= doubleTabDelay) {
        e.preventDefault();
      }
      lastTouchEnd = now;
    });
  };

  initializeTetris = () => {
    this.tetris = new Tetris({
      gameWidth: this.TETRIS_WIDTH_POINTS,
      gameHeight: this.TETRIS_HEIGHT_POINTS,
      gameScreenContainer: document.querySelector(this.TETRIS_GAME_SCREEN_SELECTOR),
      nextFigureScreenContainer: document.querySelector(this.TETRIS_NEXT_FIGURE_SCREEN_SELECTOR),
    });
    this.tetris.on(TETRIS_EVENTS.NEW_GAME, () => {
      this.resetTetrisClassnames();
      addRootClass(this.CLASSNAME_ONGOING_GAME);
    });
    this.tetris.on(TETRIS_EVENTS.PLAY_PAUSE, isPaused => {
      isPaused ? addRootClass(this.CLASSNAME_PAUSED) : removeRootClass(this.CLASSNAME_PAUSED);
    });
    this.tetris.on(TETRIS_EVENTS.FAIL, () => {
      addRootClass(this.CLASSNAME_GAME_OVER);
    });
    this.tetris.on(TETRIS_EVENTS.QUIT, this.resetTetrisClassnames);

    document.querySelector('.menu-desktop-play').addEventListener('click', this.tetris.launchNewGame);
    document.querySelector('.menu-mobile-play').addEventListener('click', this.tetris.launchNewGame);

    // TODO: rewrite logic according to new design
    // document.querySelector('.options-paused').addEventListener('click', this.tetris.pauseOrResumeGame);

    addRootClass(this.CLASSNAME_INITIALIZED);
  };

  resetTetrisClassnames = () => {
    removeRootClass(this.CLASSNAME_PAUSED);
    removeRootClass(this.CLASSNAME_GAME_OVER);
    removeRootClass(this.CLASSNAME_ONGOING_GAME);
  };

  applyVisualEffects = () => {
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
  };

  scaleTetris = () => {
    const sizeRatioInitial = this.device.isTouchDevice
      ? this.TETRIS_TO_WINDOW_HEIGHT_RATIO_MOBILE
      : this.TETRIS_TO_WINDOW_HEIGHT_RATIO;

    const sizeRatioOngoingGame = this.device.isTouchDevice
      ? this.TETRIS_TO_WINDOW_HEIGHT_RATIO_ONGOING_GAME_MOBILE
      : this.TETRIS_TO_WINDOW_HEIGHT_RATIO_ONGOING_GAME;

    const viewportHeight = getViewportHeight();

    const tetrisHeight = viewportHeight * sizeRatioInitial;
    const tetrisScale = tetrisHeight / this.TETRIS_ORIGINAL_HEIGHT;
    setCSSVariable('--position-tetris-scale', tetrisScale);

    const tetrisHeightOngoingGame = viewportHeight * sizeRatioOngoingGame;
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
