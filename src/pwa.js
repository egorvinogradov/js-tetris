import {
  addRootClass,
  getCSSVariable,
  getDeviceCharacteristics,
  getOrientation,
  waitUntilEventFired,
  removeRootClass,
} from './utils.js';

export class PWA {

  IOS_SPLASH_SCREEN_BACKGROUND = getCSSVariable('--landing-color-background');

  PROMPT_DISMISSAL_MAX_ATTEMPTS = 3;
  PROMPT_DISMISSAL_EXPIRATION_PERIOD = 5 * 24 * 60 * 60 * 100; // 5 days

  PROMPT_MESSAGES = {
    manual: {
      title: 'Adding to Home Screen',
      caption: 'Brick Game will be added to your home screen. You will be able to play offline and track your scores.',
      button: 'Continue',
    },
    automatic: {
      title: 'Add to Home Screen?',
      caption: 'You will be able to play offline and track your scores.',
      button: 'Yes, Add to Home Screen',
    },
  };

  CLASSNAME_PROMPT_ENABLED = 'installation-enabled';
  CLASSNAME_PROMPT_SHOWN = 'installation-shown';

  PROMPT_ANIMATION_DURATION = 400;

  /**
   * @type {?'manual'|'automatic'}
   */
  promptTypeShown = null;
  chromiumBeforeInstallPrompt = null;
  device = getDeviceCharacteristics();

  constructor(){
    if (localStorage['debug']) {
      this.reset();
      console.warn('SERVICE WORKER DISABLED');
    }
    else if (navigator.serviceWorker) {
      this.registerServiceWorker();
    }

    this.getInstallationStatus().then(status => {
      const { isInstalled, canInstall, chromiumBeforeInstallPrompt } = status;

      if (isInstalled) {
        addRootClass('installed');
        if (this.device.isIOS) {
          this.renderIOSSplashScreen();
        }
        this.dismissPromptForever();
      }
      if (canInstall) {
        addRootClass('can-install');
        if (chromiumBeforeInstallPrompt) {
          chromiumBeforeInstallPrompt.preventDefault();
          this.chromiumBeforeInstallPrompt = chromiumBeforeInstallPrompt;
        }
        this.initializePromptUI();

        // TODO: installation cancelled workflow

        window.addEventListener('appinstalled', () => {
          this.dismissPromptForever();
          addRootClass('installed');
          removeRootClass('can-install');
        });
      }
    });
  }

  getInstallationStatus = () => {
    if (this.device.isIOS) {
      const isInstalled = Boolean(navigator['standalone']); // iOS;
      return new Promise(resolve => resolve({
        chromiumBeforeInstallPrompt: null,
        canInstall: !isInstalled,
        isInstalled,
      }));
    }
    else {
      let isInstalled = false;
      try {
        isInstalled = Boolean(window.matchMedia('(display-mode: standalone)').matches); // Chrome
      }
      catch (e) {}
      return new Promise(resolve => {
        waitUntilEventFired(window, 'beforeinstallprompt', 2000).then(chromiumBeforeInstallPrompt => {
          resolve({
            chromiumBeforeInstallPrompt,
            canInstall: Boolean(chromiumBeforeInstallPrompt) && !isInstalled,
            isInstalled,
          })
        });
      });
    }
  };

  initializePromptUI = () => {
    document.querySelector('.install-call-to-action').addEventListener('click', () => {
      this.showPrompt('manual');
    });
    document.querySelector('.install-button--continue').addEventListener('click', this.install);
    document.querySelector('.install-button--never-ask').addEventListener('click', this.dismissPromptForever);
    document.querySelectorAll('.install-button--cancel, .install-prompt-close, .install-backdrop').forEach(element => {
      element.addEventListener('click', this.dismissPromptOnce);
    });
  };

  getPromptDismissalAttempts = () => {
    return +localStorage['prompt_dismissal_attempts'] || 0;
  };

  showPrompt = (type) => {
    const messages = this.PROMPT_MESSAGES[type];
    document.querySelector('.install-prompt-title').innerHTML = messages.title;
    document.querySelector('.install-prompt-title-caption').innerHTML = messages.caption;
    document.querySelector('.install-button--continue').innerHTML = messages.button;

    this.toggleNeverAskButtonVisibility(type);
    this.promptTypeShown = type;

    addRootClass(this.CLASSNAME_PROMPT_ENABLED);
    requestAnimationFrame(() => {
      addRootClass(this.CLASSNAME_PROMPT_SHOWN);
    });
  };

  hidePrompt = () => {
    this.promptTypeShown = null;

    removeRootClass(this.CLASSNAME_PROMPT_SHOWN);
    setTimeout(() => {
      removeRootClass(this.CLASSNAME_PROMPT_ENABLED);
    }, this.PROMPT_ANIMATION_DURATION);
  };

  toggleNeverAskButtonVisibility = (promptType) => {
    const isHidden = promptType === 'manual' || this.getPromptDismissalAttempts() === 0;
    document.querySelector('.install-button--never-ask').hidden = isHidden;
  };

  dismissPromptOnce = () => {
    if (this.promptTypeShown === 'automatic') {
      localStorage['prompt_dismissal_attempts'] = this.getPromptDismissalAttempts() + 1;
      localStorage['prompt_dismissal_date'] = +new Date();
    }
    this.hidePrompt();
  };

  dismissPromptForever = () => {
    if (this.promptTypeShown === 'automatic') {
      localStorage['prompt_dismissal_attempts'] = this.PROMPT_DISMISSAL_MAX_ATTEMPTS;
    }
    this.hidePrompt();
  };

  remindAboutInstallation = () => {
    const promptDismissalTimestamp = +new Date(+localStorage['prompt_dismissal_date']) || 0;
    const currentTimestamp = +new Date() || 0;

    const remindedRecently = promptDismissalTimestamp + this.PROMPT_DISMISSAL_EXPIRATION_PERIOD > currentTimestamp;
    const remindedTooManyTimes = this.getPromptDismissalAttempts() >= this.PROMPT_DISMISSAL_MAX_ATTEMPTS;

    if (!remindedTooManyTimes && !remindedRecently) {
      this.showPrompt('automatic');
    }
  };

  install = () => {
    if (this.chromiumBeforeInstallPrompt) {
      this.chromiumBeforeInstallPrompt.prompt();
      this.chromiumBeforeInstallPrompt.userChoice.then(result => {
        if (result.outcome === 'accepted') {
          delete localStorage['prompt_dismissal_attempts'];
          delete localStorage['prompt_dismissal_date'];
          this.hidePrompt();
        }
        this.chromiumBeforeInstallPrompt = null;
      });
    }
    else {
      this.showIOSInstallationInstructions();
    }
  };

  showIOSInstallationInstructions = () => {
    alert('IOS INSTALLATION');
  };

  registerServiceWorker = () => {
    return new Promise((resolve, reject) => {
      try {
        // noinspection JSCheckFunctionSignatures
        /**
         * This syntax - [(new URL(...), import.meta.url), { type: 'module' }]
         * is required by Parcel bundler
         * @see https://parceljs.org/languages/javascript/#service-workers
         */
        navigator.serviceWorker.register(new URL('../service_worker.js', import.meta.url), { type: 'module', scope: '/' })
          .then(resolve)
          .catch(reject);
      }
      catch (error) {
        reject(error);
      }
    });
  };

  renderIOSSplashScreen = () => {
    const { availWidth, availHeight } = screen;
    const linkElement = document.querySelector('link[rel=apple-touch-startup-image]');

    const canvas = document.createElement('canvas');
    canvas.width = availWidth * devicePixelRatio;
    canvas.height = availHeight * devicePixelRatio;

    const ctx = canvas.getContext('2d');
    ctx.fillStyle = this.IOS_SPLASH_SCREEN_BACKGROUND;
    ctx.scale(devicePixelRatio, devicePixelRatio);
    ctx.fillRect(0, 0, availWidth, availHeight);

    const icon = new Image();

    icon.onload = () => {
      const canvasIconWidth = availWidth * 0.2;
      const canvasIconHeight = (icon.height / icon.width) * canvasIconWidth;
      const canvasIconX = (availWidth - canvasIconWidth) / 2;
      const canvasIconY = (availHeight - canvasIconHeight) / 2;
      ctx.drawImage(icon, canvasIconX, canvasIconY, canvasIconWidth, canvasIconHeight);
      linkElement.href = canvas.toDataURL('image/png');
    };

    icon.src = linkElement.href;
  };

  reset = () => {
    if (window.caches) {
      window.caches.keys().then(keys => {
        keys.forEach(key => caches.delete(key));
      });
    }
    for (let key in localStorage) {
      if (key !== 'debug' && key !== 'history') {
        localStorage.removeItem(key);
      }
    }
    return this.unregisterServiceWorkers();
  };

  unregisterServiceWorkers = async () => {
    if (navigator.serviceWorker) {
      const serviceWorkerRegistrations = await navigator.serviceWorker.getRegistrations();
      serviceWorkerRegistrations.forEach(registration => {
        try {
          registration.unregister();
        }
        catch (e) {}
      });
    }
  };

  showNotification = (title, body) => {
    Notification.requestPermission().then(permission => {
      if (permission === 'granted' && navigator.serviceWorker?.controller) {
        navigator.serviceWorker.controller.postMessage({
          eventType: 'notification',
          title,
          body,
        });
      }
    });
  };
}
