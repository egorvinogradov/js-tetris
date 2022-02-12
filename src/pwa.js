export class PWA {

  IOS_SPLASH_SCREEN_BACKGROUND = '#0033FF';

  PROMPT_DISMISSAL_MAX_ATTEMPTS = 3;
  PROMPT_DISMISSAL_EXPIRATION_PERIOD = 5 * 24 * 60 * 60 * 100; // 5 days

  beforeInstallPrompt = null;

  constructor(){
    if (localStorage['debug']) {
      this.reset();
      console.warn('SERVICE WORKER DISABLED');
    }

    // TODO: uncomment after debug
    // if (navigator.serviceWorker && !localStorage['debug']) {
    //   this.registerServiceWorker();
    // }

    this.renderIOSSplashScreen();
    window.addEventListener('beforeinstallprompt', this.onReadyToInstall);
    window.addEventListener('appinstalled', this.dismissPromptForever);

    document.querySelector('.pwa-install-button').addEventListener('click', () => {
      // TODO: show PWA installation popup
    });
  }

  onReadyToInstall = (beforeInstallPrompt) => {
    beforeInstallPrompt.preventDefault();
    this.beforeInstallPrompt = beforeInstallPrompt;

    // TODO: rewrite logic according to new design
    // this.promptElement = document.querySelector('.installation');
    // this.buttonYesElement = document.querySelector('.installation-options-item--yes');
    // this.buttonNoElement = document.querySelector('.installation-options-item--no');
    // this.buttonNeverElement = document.querySelector('.installation-options-item--never');

    if (this.canShowInstallationPrompt()) {
      // this.promptElement.hidden = false; // TODO: redesign appearance
      // this.buttonYesElement.addEventListener('click', this.install);
      // this.buttonNoElement.addEventListener('click', this.dismissPromptOnce);

      if (this.getPromptDismissalAttempts() > 0) {
        // this.buttonNeverElement.hidden = false;
        // this.buttonNeverElement.addEventListener('click', this.dismissPromptForever);
      }
    }
  };

  getPromptDismissalAttempts = () => {
    return +localStorage['prompt_dismissal_attempts'] || 0;
  };

  dismissPromptOnce = () => {
    localStorage['prompt_dismissal_attempts'] = this.getPromptDismissalAttempts() + 1;
    localStorage['prompt_dismissal_date'] = +new Date();
    // this.promptElement.hidden = true; // TODO: rewrite logic according to new design
  };

  dismissPromptForever = () => {
    localStorage['prompt_dismissal_attempts'] = this.PROMPT_DISMISSAL_MAX_ATTEMPTS;
    // this.promptElement.hidden = true; // TODO: rewrite logic according to new design
  };

  canShowInstallationPrompt = () => {
    // TODO: show after first play (and after some time has passed)

    if (this.getPromptDismissalAttempts() >= this.PROMPT_DISMISSAL_MAX_ATTEMPTS) {
      return false;
    }
    const promptDismissalTimestamp = +new Date(+localStorage['prompt_dismissal_date']) || 0;
    const currentTimestamp = +new Date() || 0;
    return promptDismissalTimestamp + this.PROMPT_DISMISSAL_EXPIRATION_PERIOD < currentTimestamp;
  };

  install = () => {
    if (this.beforeInstallPrompt) {
      this.beforeInstallPrompt.prompt();
      this.beforeInstallPrompt.userChoice.then(result => {
        if (result.outcome === 'accepted') {
          delete localStorage['prompt_dismissal_attempts'];
          delete localStorage['prompt_dismissal_date'];
          // this.promptElement.hidden = true; // TODO: rewrite logic according to new design
        }
        this.beforeInstallPrompt = null;
      });
    }
  };

  registerServiceWorker = () => {
    return new Promise((resolve, reject) => {
      try {
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
      if (key !== 'debug') {
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
}
