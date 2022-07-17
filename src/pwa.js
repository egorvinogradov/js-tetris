import { events, PWA_READY_TO_INSTALL } from './events.js';
import {
  addRootClass,
  removeRootClass,
  waitUntilEventFired,
  getDeviceCharacteristics,
  getCSSVariable,
  template,
} from './utils.js';

export class PWA {

  IOS_SPLASH_SCREEN_BACKGROUND = getCSSVariable('--landing-color-background');

  PROMPT_DISMISSAL_MAX_ATTEMPTS = 3;
  PROMPT_DISMISSAL_EXPIRATION_PERIOD = 5 * 24 * 60 * 60 * 100; // 5 days

  PROMPT_MESSAGES = {
    manual: {
      title: 'Adding to {destination}',
      caption: 'Brick Game will be added to your {destination}. You will be able to play offline and track your scores.',
      button: 'Continue',
    },
    automatic: {
      title: 'Add to {destination}?',
      caption: 'You will be able to play offline and track your scores.',
      button: 'Yes, Add to {destination}',
    },
  };

  CLASSNAME_PROMPT_ENABLED = 'installation-enabled';
  CLASSNAME_PROMPT_SHOWN = 'installation-shown';

  PROMPT_ANIMATION_DURATION = 400;

  /**
   * @type {?'manual'|'automatic'}
   */
  promptTypeShown = null;

  /**
   * @type {{
        isInstalled: boolean,
        canInstall: boolean,
        installationType: ?'iOSManualAddToHomeScreen'|'beforeInstallPrompt'
        beforeInstallPrompt: Event|null
      }}
   */
  installationStatus = {
    isInstalled: false,
    canInstall: false,
    installationType: null,
    beforeInstallPrompt: null,
  };

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
      this.installationStatus = status;
      const {
        isInstalled,
        canInstall,
        installationType,
        beforeInstallPrompt,
      } = this.installationStatus;

      if (isInstalled) {
        addRootClass('installed');
        this.dismissPromptForever();
        if (installationType === 'iOSManualAddToHomeScreen') {
          this.renderIOSSplashScreen();
        }
      }
      if (canInstall) {
        addRootClass('can-install');
        this.initializePromptButtons();
        this.initializeBeforeInstallPrompt(beforeInstallPrompt);
      }
      events.trigger(PWA_READY_TO_INSTALL);
    });
  }

  getInstallationStatus = () => {
    const { os } = this.device;

    if (os === 'ios') {
      const isInstalled = Boolean(navigator['standalone']); // iOS;
      return new Promise(resolve => resolve({
        isInstalled,
        canInstall: !isInstalled,
        installationType: 'iOSManualAddToHomeScreen',
        beforeInstallPrompt: null,
      }));
    }
    else {
      let isInstalled = false;
      try {
        isInstalled = Boolean(window.matchMedia('(display-mode: standalone)').matches); // Chrome
      }
      catch (e) {}

      return new Promise(resolve => {
        waitUntilEventFired(window, 'beforeinstallprompt', 2000).then(beforeInstallPrompt => {
          resolve({
            isInstalled,
            canInstall: Boolean(beforeInstallPrompt) && !isInstalled,
            installationType: 'beforeInstallPrompt',
            beforeInstallPrompt,
          })
        });
      });
    }
  };

  initializePromptButtons = () => {
    document.querySelector('.install-call-to-action').addEventListener('click', () => {
      if (this.device.screenType === 'desktop') {
        this.install();
      }
      else {
        this.showPrompt('manual');
      }
    });
    document.querySelector('.install-button--continue').addEventListener('click', this.install);
    document.querySelector('.install-button--never-ask').addEventListener('click', this.dismissPromptForever);
    document.querySelectorAll('.install-button--cancel, .install-prompt-close, .install-backdrop').forEach(element => {
      element.addEventListener('click', this.dismissPromptOnce);
    });
  };

  initializeBeforeInstallPrompt = (beforeInstallPrompt) => {
    if (beforeInstallPrompt) {
      beforeInstallPrompt.preventDefault();
      beforeInstallPrompt.userChoice.then(result => {
        this.installationStatus.canInstall = false;
        this.installationStatus.beforeInstallPrompt = null;
        removeRootClass('can-install');

        if (result.outcome === 'accepted') {
          this.installationStatus.isInstalled = true;
          addRootClass('installed');

          this.hidePrompt();
          delete localStorage['prompt_dismissal_attempts'];
          delete localStorage['prompt_dismissal_date'];
        }
      });
    }
  };

  getPromptDismissalAttempts = () => {
    return +localStorage['prompt_dismissal_attempts'] || 0;
  };

  showPrompt = (type) => {
    const { screenType } = this.device;
    const templates = this.PROMPT_MESSAGES[type];
    const destination = screenType === 'desktop' ? 'Desktop' : 'Home Screen';

    const title = template(templates.title, { destination });
    const caption = template(templates.caption, { destination: destination.toLowerCase() });
    const button = template(templates.button, { destination });

    document.querySelector('.install-prompt-title').innerHTML = title;
    document.querySelector('.install-prompt-title-caption').innerHTML = caption;
    document.querySelector('.install-button--continue').innerHTML = button;

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
    const { canInstall } = this.installationStatus;

    const lastPromptDismissalTimestamp = +new Date(+localStorage['prompt_dismissal_date']) || 0;
    const currentTimestamp = +new Date() || 0;

    const remindedRecently = lastPromptDismissalTimestamp + this.PROMPT_DISMISSAL_EXPIRATION_PERIOD > currentTimestamp;
    const remindedTooManyTimes = this.getPromptDismissalAttempts() >= this.PROMPT_DISMISSAL_MAX_ATTEMPTS;

    if (canInstall && !remindedTooManyTimes && !remindedRecently) {
      this.showPrompt('automatic');
    }
  };

  install = () => {
    const { canInstall, installationType, beforeInstallPrompt } = this.installationStatus;
    if (canInstall) {
      if (installationType === 'iOSManualAddToHomeScreen') {
        this.showIOSInstallationInstructions();
      }
      else if (beforeInstallPrompt) {
        beforeInstallPrompt.prompt();
        this.hidePrompt();
      }
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
    const excludedLocalStorageKeys = ['debug', 'history'];
    if (window.caches) {
      window.caches.keys().then(keys => {
        keys.forEach(key => caches.delete(key));
      });
    }
    for (let key in localStorage) {
      if (!excludedLocalStorageKeys.includes(key)) {
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
