import { Tetris, TETRIS_EVENTS } from './tetris.js';
import { PWA } from './pwa.js';
import {
  addRootClass,
  removeRootClass,
  getCSSVariable,
  setCSSVariable,
  applySVGFilter,
  getDeviceCharacteristics,
  getOrientation,
  getViewport,
  random,
  vw,
  vh,
  vminToPx,
} from './utils.js';


export class BrickGameLanding {

  CONTENT_POSITIONS_CONFIG = {
    phone: {
      portrait: {
        contentRatio: 0.8,
        tetrisScaleRatio: 0.7,
        tetrisTopRelative: 10,
        tetrisRight: 30,
        menuTop: 25,
        menuLeft: 10,
      },
      landscape: {
        contentRatio: 2.5,
        tetrisScaleRatio: 1,
        tetrisTop: 8,
        menuTop: 35,
        menuLeftRelative: 0,
      },
    },
    tablet: {
      portrait: {
        contentRatio: 0.95,
        tetrisScaleRatio: 0.92,
        tetrisTopRelative: 14,
        tetrisRight: 10,
        menuTop: 18,
        menuLeft: 7,
      },
      landscape: {
        contentRatio: 2.3,
        tetrisScaleRatio: 1,
        tetrisTop: 7,
        menuTop: 40,
        menuLeftRelative: 10,
      },
    },
    desktop: {
      landscape: {
        contentRatio: 2.5,
        tetrisScaleRatio: 1,
        tetrisTop: 7,
        menuTop: 30,
        menuLeftRelative: 0,
      },
    },
  };

  TETRIS_ORIGINAL_WIDTH = getCSSVariable('--tetris-width', true);
  TETRIS_ORIGINAL_HEIGHT = getCSSVariable('--tetris-height', true);

  CLASSNAME_INITIALIZED = 'initialized';
  CLASSNAME_ONGOING_GAME = 'ongoing-game';
  CLASSNAME_PAUSED = 'paused';
  CLASSNAME_GAME_OVER = 'game-over';

  MATRIX_WIDTH = 10;
  MATRIX_HEIGHT = 20;
  GAME_SCREEN_SELECTOR = '.screen-game';
  NEXT_FIGURE_SCREEN_SELECTOR = '.screen-next-figure';

  /**
   * @type {Tetris}
   */
  tetris = null;

  /**
   * @type {PWA}
   */
  pwa = null;
  device = getDeviceCharacteristics();

  constructor(){
    this.pwa = new PWA();

    this.animateLogo();
    this.repositionLandingContent();
    this.repositionLandingContentForOngoingGame();
    this.applyDeviceBasedLogic();
    this.applyVisualEffects();

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
        this.waitOrientationChangeEnd().then(() => {
          this.repositionLandingContent();
          this.repositionLandingContentForOngoingGame();
        });
      });
      addRootClass('device--touch');
    }

    if (isIOS) {
      this.preventPinchZoomInIOS();
      this.preventDoubleTabZoomInIOS();
      addRootClass('device--ios');
    }

    if (!isTouchDevice) {
      window.addEventListener('resize', () => {
        this.repositionLandingContent();
        this.repositionLandingContentForOngoingGame();
      });
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
      gameWidth: this.MATRIX_WIDTH,
      gameHeight: this.MATRIX_HEIGHT,
      gameScreenContainer: document.querySelector(this.GAME_SCREEN_SELECTOR),
      nextFigureScreenContainer: document.querySelector(this.NEXT_FIGURE_SCREEN_SELECTOR),
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

  repositionLandingContent = () => {
    const { deviceType } = getDeviceCharacteristics();
    const orientation = getOrientation();
    const viewport = getViewport();
    const config = this.CONTENT_POSITIONS_CONFIG[deviceType][orientation];

    let {
      tetrisWidth,
      tetrisHeight,
      tetrisScale,
    } = this.calculateTetrisDimensions(config.tetrisScaleRatio);

    let tetrisRight;
    let tetrisTop;
    let menuLeft;
    let menuTop = vminToPx(config.menuTop);

    if (orientation === 'portrait') {
      const contentMarginY = (viewport.height - (tetrisHeight * config.contentRatio)) / 2;
      tetrisTop = Math.max(contentMarginY, vminToPx(config.tetrisTopRelative));
      tetrisRight = vminToPx(config.tetrisRight);
      menuLeft = vminToPx(config.menuLeft);
    }
    if (orientation === 'landscape') {
      const contentMarginX = (viewport.width - (tetrisWidth * config.contentRatio)) / 2;
      tetrisTop = vminToPx(config.tetrisTop);
      tetrisRight = -contentMarginX;
      menuLeft = contentMarginX + vminToPx(config.menuLeftRelative);
    }

    setCSSVariable('--position-tetris-scale', tetrisScale);
    setCSSVariable('--position-tetris-translate-top', tetrisTop, 'px');
    setCSSVariable('--position-tetris-translate-right', tetrisRight, 'px');
    setCSSVariable('--landing-menu-top', menuTop, 'px');
    setCSSVariable('--landing-menu-left', menuLeft, 'px');
  };

  repositionLandingContentForOngoingGame = () => {
    // zzz

    const orientation = getOrientation();
    const viewport = getViewport();

    const TETRIS_ONGOING_GAME_PORTRAIT_SCALE_BY_WIDTH = 0.9;
    const TETRIS_ONGOING_GAME_LANDSCAPE_SCALE_BY_HEIGHT = 1.5;

    const maxVerticalScale = 0.8;

    const maxTetrisHeightToReachButtons = viewport.height * 0.9;
    // viewport.height

    const scaleRatio = orientation === 'portrait'
      ? TETRIS_ONGOING_GAME_PORTRAIT_SCALE_BY_WIDTH
      : TETRIS_ONGOING_GAME_LANDSCAPE_SCALE_BY_HEIGHT;

    const {
      tetrisWidth,
      tetrisHeight,
      tetrisScale,
    } = this.calculateTetrisDimensions(scaleRatio, maxTetrisHeightToReachButtons);

    const contentMarginX = (viewport.width - tetrisWidth) / 2;
    let tetrisOngoingGameX;
    let tetrisOngoingGameY;


    if (orientation === 'portrait') {
      tetrisOngoingGameX = -contentMarginX;
      tetrisOngoingGameY = contentMarginX;
    }
    if (orientation === 'landscape') {
      tetrisOngoingGameX = contentMarginX;
      tetrisOngoingGameY = vminToPx('5vh');
    }

    setCSSVariable('--position-tetris-ongoing-game-translate-top', tetrisOngoingGameY, 'px');
    setCSSVariable('--position-tetris-ongoing-game-translate-right', tetrisOngoingGameX, 'px');
    setCSSVariable('--position-tetris-ongoing-game-scale', tetrisScale);
  };

  calculateTetrisDimensions = (ratio) => {
    const { deviceType } = this.device;
    const orientation = getOrientation();
    const viewport = getViewport();
    const tetrisWidthToHeightRatio = this.TETRIS_ORIGINAL_WIDTH / this.TETRIS_ORIGINAL_HEIGHT;

    let tetrisWidth;
    let tetrisHeight;
    let tetrisScale;

    if (deviceType === 'phone' && orientation === 'portrait') {
      tetrisWidth = viewport.width * ratio;
      tetrisHeight = tetrisWidth / tetrisWidthToHeightRatio;
      tetrisScale = tetrisWidth / this.TETRIS_ORIGINAL_WIDTH;
    }
    else {
      tetrisHeight = viewport.height * ratio;
      tetrisWidth = tetrisHeight * tetrisWidthToHeightRatio;
      tetrisScale = tetrisHeight / this.TETRIS_ORIGINAL_HEIGHT;
    }
    return {
      tetrisHeight,
      tetrisWidth,
      tetrisScale,
    };
  };

  animateLogo = () => {
    const logoElement = document.querySelector('.logo');
    const frameChangeInterval = 5000;
    let stage = 0;
    setInterval(() => {
      stage = stage > 2 ? 0 : stage + 1;
      if (!stage) {
        logoElement.className = 'logo';
      }
      else {
        logoElement.classList.add('logo--frame-' + stage);
      }
    }, frameChangeInterval);
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
