export const TETRIS_NEW_GAME = 'TETRIS_NEW_GAME';
export const TETRIS_PLAY_PAUSE = 'TETRIS_PLAY_PAUSE';
export const TETRIS_GAME_OVER = 'TETRIS_GAME_OVER';
export const TETRIS_QUIT = 'TETRIS_QUIT';
export const PWA_READY_TO_INSTALL = 'PWA_READY_TO_INSTALL';

export class Events {

  items = {};

  on = (eventName, callback) => {
    if (!this.items[eventName]) {
      this.items[eventName] = [];
    }
    this.items[eventName].push(callback);
  };

  trigger = (eventName, data) => {
    if (this.items[eventName]?.length) {
      this.items[eventName].map(callback => callback(data));
    }
  };
}

export const events = new Events();
