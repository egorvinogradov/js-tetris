export class PWA {

  SPLASH_SCREEN_BACKGROUND = '#0033FF';

  PROMPT_DISMISSAL_MAX_ATTEMPTS = 3;
  PROMPT_DISMISSAL_EXPIRATION_PERIOD = 5 * 24 * 60 * 60 * 100; // 5 days

  beforeInstallPrompt = null;
  elements = {};

  constructor(){
    if (navigator.serviceWorker && !localStorage['debug']) {
      this.registerServiceWorker();
    }
    this.renderIOSSplashScreen();
    window.addEventListener('beforeinstallprompt', this.onReadyToInstall);
  }

  onReadyToInstall = (beforeInstallPrompt) => {
    this.beforeInstallPrompt = beforeInstallPrompt;

    this.elements.prompt = document.querySelector('.installation');
    this.elements.buttonYes = document.querySelector('.installation-options-item--yes');
    this.elements.buttonNo = document.querySelector('.installation-options-item--no');
    this.elements.buttonNever = document.querySelector('.installation-options-item--never');

    if (this.canShowInstallationPrompt()) {
      this.elements.prompt.hidden = false; // TODO: redesign appearance
      this.elements.buttonYes.addEventListener('click', this.install);
      this.elements.buttonNo.addEventListener('click', this.dismissPromptOnce);

      if (this.getPromptDismissalAttempts() > 0) {
        this.elements.buttonNever.hidden = false;
        this.elements.buttonNever.addEventListener('click', this.dismissPromptForever);
      }
    }
  };

  getPromptDismissalAttempts = () => {
    return +localStorage['prompt_dismissal_attempts'] || 0;
  };

  dismissPromptOnce = () => {
    localStorage['prompt_dismissal_attempts'] = this.getPromptDismissalAttempts() + 1;
    localStorage['prompt_dismissal_date'] = +new Date();
    this.elements.prompt.hidden = true; // TODO: redesign appearance
  };

  dismissPromptForever = () => {
    localStorage['prompt_dismissal_attempts'] = this.PROMPT_DISMISSAL_MAX_ATTEMPTS;
    this.elements.prompt.hidden = true; // TODO: redesign appearance
  };

  canShowInstallationPrompt = () => {
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
    }

    this.beforeInstallPrompt.userChoice.then(result => {
      if (result.outcome === 'accepted') {
        delete localStorage['prompt_dismissal_attempts'];
        delete localStorage['prompt_dismissal_date'];
        this.elements.prompt.hidden = true; // TODO: redesign appearance
      }
    });
  };

  registerServiceWorker = () => {
    return new Promise((resolve, reject) => {
      try {
        navigator.serviceWorker.register(new URL('../service_worker.js', import.meta.url), { scope: '/' })
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
    ctx.fillStyle = this.SPLASH_SCREEN_BACKGROUND;
    ctx.scale(devicePixelRatio, devicePixelRatio);
    ctx.fillRect(0, 0, availWidth, availHeight);

    const icon = new Image();

    icon.onload = () => {
      let canvasIconWidth = availWidth * 0.4;
      let canvasIconHeight = (icon.height / icon.width) * availWidth * 0.4;
      if (availWidth > availHeight) {
        canvasIconHeight = availHeight * 0.3;
        canvasIconWidth = (icon.width / icon.height) * availHeight * 0.3;
      }
      let canvasIconX = (availWidth - canvasIconWidth) / 2;
      let canvasIconY = (availHeight - canvasIconHeight) / 2;

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
      localStorage.removeItem(key);
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
