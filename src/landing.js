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
  vminToPx,
  waitUntilEventFired,
} from './utils.js';


export class BrickGameLanding {

  CONTENT_POSITIONS_CONFIG = {
    phone: {
      portrait: {
        portraitContentRatio: 0.8,
        portraitTetrisWidth: 70,
        portraitTetrisTopRelative: 10,
        portraitTetrisRight: 30,
        portraitMenuTop: 25,
        portraitMenuLeft: 10,
      },
      landscape: {
        landscapeContentRatio: 2.5,
        landscapeTetrisHeight: 100,
        landscapeTetrisTop: 8,
        landscapeMenuTop: 35,
        landscapeMenuLeftRelative: 0,
      },
    },
    tablet: {
      portrait: {
        portraitContentRatio: 0.95,
        portraitTetrisHeight: 92,
        portraitTetrisTopRelative: 14,
        portraitTetrisRight: 10,
        portraitMenuTop: 18,
        portraitMenuLeft: 7,
      },
      landscape: {
        landscapeContentRatio: 2.3,
        landscapeTetrisHeight: 100,
        landscapeTetrisTop: 7,
        landscapeMenuTop: 40,
        landscapeMenuLeftRelative: 10,
      },
    },
    desktop: {
      landscape: {
        landscapeContentRatio: 2.5,
        landscapeTetrisHeight: 100,
        landscapeTetrisTop: 7,
        landscapeMenuTop: 30,
        landscapeMenuLeftRelative: 0,
      },
    },
  };

  TETRIS_ORIGINAL_WIDTH = getCSSVariable('--tetris-width', true);
  TETRIS_ORIGINAL_HEIGHT = getCSSVariable('--tetris-height', true);

  TETRIS_MAX_WIDTH_ONGOING_GAME = 95;   // vw
  TETRIS_MAX_HEIGHT_ONGOING_GAME = 123; // vh

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
    this.redirectToHttps();
    this.animateLogo();
    this.repositionLandingContent();
    this.repositionLandingContentForOngoingGame();
    this.applyDeviceBasedLogic();
    this.applyVisualEffects();

    this.pwa = new PWA();

    // TODO: move to settings, change appearance, optimize code
    // document.querySelector('.options-reset-pwa').addEventListener('click', this.pwa.reset);

    window.addEventListener('load', this.initializeTetris);
  }

  redirectToHttps = () => {
    const isDevelopment = location.hostname === 'localhost' || /^[0-9.]+$/.test(location.hostname);
    if (!isDevelopment && location.protocol === 'http:') {
      location.protocol = 'https:';
    }
  };

  applyDeviceBasedLogic = () => {
    const { deviceType, isTouchDevice, isIOS } = this.device;
    addRootClass('device--' + deviceType);

    if (isTouchDevice) {
      if (screen.orientation) {
        screen.orientation.lock('portrait').catch(() => {});
      }
      window.addEventListener('orientationchange', () => {
        waitUntilEventFired(window, 'resize', 400).then(() => {
          /**
           * Waiting until viewport dimensions change after changeorientation event occurred
           * @see https://stackoverflow.com/questions/12452349/mobile-viewport-height-after-orientation-change
           */
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
    const doubleTapDelay = 300; // https://stackoverflow.com/a/38958743
    document.addEventListener('touchend', (e) => {
      const now = +new Date();
      const isWithinDelay = now - lastTouchEnd <= doubleTapDelay;
      const isWithinButton = e.target.closest('.button');
      if (isWithinDelay && !isWithinButton) {
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
    this.tetris.on(TETRIS_EVENTS.GAME_OVER, notification => {
      const { title, body } = notification;
      this.pwa.showNotification(title, body);

      // TODO: fix order
      this.pwa.remindAboutInstallation();
      addRootClass(this.CLASSNAME_GAME_OVER);
    });
    this.tetris.on(TETRIS_EVENTS.QUIT, this.resetTetrisClassnames);

    document.querySelector('.menu-desktop-play').addEventListener('click', this.tetris.launchNewGame);
    document.querySelector('.menu-mobile-play').addEventListener('click', this.tetris.launchNewGame);

    // TODO: rewrite logic according to new design
    // document.querySelector('.options-paused').addEventListener('click', this.tetris.pauseOrResumeGame);

    // TODO: fix order
    this.pwa.remindAboutInstallation();
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

    let tetrisDimensions = this.scaleTetrisToFit({ vh: config.landscapeTetrisHeight });
    if (orientation === 'portrait') {
      tetrisDimensions = deviceType === 'phone'
        ? this.scaleTetrisToFit({ vw: config.portraitTetrisWidth })
        : this.scaleTetrisToFit({ vh: config.portraitTetrisHeight });
    }

    let tetrisRight;
    let tetrisTop;
    let menuLeft;
    let menuTop = vminToPx(config.portraitMenuTop || config.landscapeMenuTop);

    if (orientation === 'portrait') {
      const contentMarginY = (viewport.height - (tetrisDimensions.height * config.portraitContentRatio)) / 2;
      tetrisTop = Math.max(contentMarginY, vminToPx(config.portraitTetrisTopRelative));
      tetrisRight = vminToPx(config.portraitTetrisRight);
      menuLeft = vminToPx(config.portraitMenuLeft);
    }
    if (orientation === 'landscape') {
      const contentMarginX = (viewport.width - (tetrisDimensions.width * config.landscapeContentRatio)) / 2;
      tetrisTop = vminToPx(config.landscapeTetrisTop);
      tetrisRight = -contentMarginX;
      menuLeft = contentMarginX + vminToPx(config.landscapeMenuLeftRelative);
    }
    setCSSVariable('--position-tetris-scale', tetrisDimensions.scale);
    setCSSVariable('--position-tetris-translate-top', tetrisTop, 'px');
    setCSSVariable('--position-tetris-translate-right', tetrisRight, 'px');
    setCSSVariable('--landing-menu-top', menuTop, 'px');
    setCSSVariable('--landing-menu-left', menuLeft, 'px');
  };

  repositionLandingContentForOngoingGame = () => {
    const viewport = getViewport();
    const tetris = this.scaleTetrisToFit({
      vw: this.TETRIS_MAX_WIDTH_ONGOING_GAME,
      vh: this.TETRIS_MAX_HEIGHT_ONGOING_GAME,
    });

    const contentMarginX = (viewport.width - tetris.width) / 2;
    const tetrisRight = -contentMarginX;
    const tetrisTop = Math.min(vminToPx(5), contentMarginX);

    setCSSVariable('--position-tetris-ongoing-game-translate-top', tetrisTop, 'px');
    setCSSVariable('--position-tetris-ongoing-game-translate-right', tetrisRight, 'px');
    setCSSVariable('--position-tetris-ongoing-game-scale', tetris.scale);
  };

  scaleTetrisToFit = (config) => {
    const tetrisSizeRatio = this.TETRIS_ORIGINAL_WIDTH / this.TETRIS_ORIGINAL_HEIGHT;
    const { width: viewportWidth, height: viewportHeight } = getViewport();
    const maxWidth = viewportWidth * (config.vw || 0) / 100;
    const maxHeight = viewportHeight * (config.vh || 0) / 100;

    const fitIntoWidth = (maxWidth) => {
      return {
        width: maxWidth,
        height: maxWidth / tetrisSizeRatio,
        scale: maxWidth / this.TETRIS_ORIGINAL_WIDTH,
      };
    };
    const fitIntoHeight = (maxHeight) => {
      return {
        height: maxHeight,
        width: maxHeight * tetrisSizeRatio,
        scale: maxHeight / this.TETRIS_ORIGINAL_HEIGHT,
      };
    };

    if (maxWidth && maxHeight) {
      const maxSizeRatio = maxWidth / maxHeight;
      if (maxSizeRatio < tetrisSizeRatio) {
        return fitIntoWidth(maxWidth);
      }
      else {
        return fitIntoHeight(maxHeight);
      }
    }
    else if (maxWidth) {
      return fitIntoWidth(maxWidth);
    }
    else if (maxHeight) {
      return fitIntoHeight(maxHeight);
    }
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
      { type: 'turbulence', baseFrequency: 0.7 }
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
