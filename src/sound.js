import { addBodyClass, removeBodyClass } from './utils.js';

export class Sound {

  CLASSNAME_MUTED = 'muted';

  INTRO = './src/assets/audio/intro.mp3';
  BACKGROUND = './src/assets/audio/background.mp3';
  ROW_CLEARED = './src/assets/audio/.mp3'; // TODO: fix
  GAME_OVER = './src/assets/audio/game-over.mp3';
  FIGURE_ROTATED = './src/assets/audio/figure-rotated.mp3';
  FIGURE_MOVED = './src/assets/audio/figure-moved.mp3';
  FIGURE_DROPPED = './src/assets/audio/figure-dropped.mp3';

  isMute = false;

  /**
   * @type {HTMLAudioElement}
   */
  backgroundPlayback = null;

  /**
   * @type {HTMLAudioElement}
   */
  movementPlayback = null;

  constructor(){
    this.isMute = JSON.parse(localStorage['mute'] || false);
    this.enableMuteSwitcher();
    if (this.isMute) {
      addBodyClass(this.CLASSNAME_MUTED);
    }
  }

  enableMuteSwitcher = () => {
    document.querySelector('.options-sound').addEventListener('click', this.toggleMute);
    document.addEventListener('keydown', e => {
      if (e.code === 'KeyM') {
        this.toggleMute();
      }
    });
  };

  toggleMute = () => {
    this.setMuteState(!this.isMute);
  };

  setMuteState = (isMute) => {
    this.isMute = isMute;
    localStorage['mute'] = isMute;

    if (isMute) {
      this.stopBackgroundNoise();
      addBodyClass(this.CLASSNAME_MUTED);
    }
    else {
      this.startBackgroundNoise();
      removeBodyClass(this.CLASSNAME_MUTED);
    }
  };

  startBackgroundNoise = () => {
    if (this.backgroundPlayback) {
      this.backgroundPlayback.play();
    }
    else {
      this.backgroundPlayback = this.play(this.BACKGROUND);
      this.backgroundPlayback.loop = true;

      this.backgroundPlayback.ontimeupdate = () => {
        const buffer = 0.5;
        if(this.backgroundPlayback.currentTime > this.backgroundPlayback.duration - buffer){
          this.backgroundPlayback.currentTime = 0;
          this.backgroundPlayback.play();
        }
      };
    }
  };

  stopBackgroundNoise = () => {
    if (this.backgroundPlayback) {
      this.backgroundPlayback.pause();
      this.backgroundPlayback.currentTime = 0;
    }
  };

  play = (audioUrl) => {
    const audio = new Audio(audioUrl);
    if (!this.isMute && !this.isPlayingIntro) {
      audio.volume = 0.4;
      audio.play();
    }
    return audio;
  };

  intro = () => {
    const audio = this.play(this.INTRO);

    if (!audio.paused) {
      this.isPlayingIntro = true;
      audio.onended = () => {
        this.isPlayingIntro = false;
      };
    }
  };

  rowCleared = () => {
    // TODO: fix
    // this.play(this.ROW_CLEARED);
  };

  gameOver = () => {
    this.play(this.GAME_OVER);
  };

  figureRotated = () => {
    this.play(this.FIGURE_ROTATED);
  };

  figureMoved = () => {
    if (this.movementPlayback) {
      this.movementPlayback.pause();
      this.movementPlayback.currentTime = 0;
    }
    this.movementPlayback = this.play(this.FIGURE_MOVED);
  };

  figureDropped = () => {
    this.play(this.FIGURE_DROPPED);
  };
}
