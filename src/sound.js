/**
 * @see https://medium.com/swinginc/playing-with-midi-in-javascript-b6999f2913c3
 */

export class Sound {

  /**
   * Taken from https://codepen.io/kulak-at/pen/oqbKpq
   */
  MELODY_INTRO = [
    [76, 4],
    [71, 8],
    [72, 8],
    [74, 4],
    [72, 8],
    [71, 8],
    [69, 4],
    [69, 8],
    [72, 8],
    [76, 4],
    [74, 8],
    [72, 8],
    [71, 4],
    [71, 8],
    [72, 8],
    [74, 4],
    [76, 4],
    [72, 4],
    [69, 4],
    [69, 4],
    [0,  4],
    [74, 3],
    [77, 8],
    [81, 4],
    [79, 8],
    [77, 8],
    [76, 3],
    [72, 8],
    [76, 4],
    [74, 8],
    [72, 8],
    [71, 4],
    [71, 8],
    [72, 8],
    [74, 4],
    [76, 4],
    [72, 4],
    [69, 4],
    [69, 4],
    [0, 4],
  ];

  /**
   * 1. MP3 extracted from https://www.youtube.com/watch?v=FZxTFRtq6SA (07:00 / Stage Clear)
   * 2. MP3 converted into MIDI at https://piano2notes.com/
   * 3. MIDI converted into array of frequencies/lengths using https://github.com/mido/mido/
   * 4. Mido output is cleared of zero lengths and note_offs
   */
  ROW_CLEARED = [
    [81, 3],
    [62, 2],
    [67, 5],
    [62, 6],
    [75, 1],
    [87, 5],
    [67, 1],
  ];

  /**
   * 1. MP3 extracted from https://www.youtube.com/watch?v=FZxTFRtq6SA (07:02 / Game Over)
   * 2. MP3 converted into MIDI at https://piano2notes.com/
   * 3. MIDI converted into array of frequencies/lengths using https://github.com/mido/mido/
   * 4. Mido output is cleared of zero lengths and note_offs
   */
  GAME_OVER = [
    [76, 770],
    [76, 55],
    [81, 55],
    [81, 55],
    [76, 55],
    [76, 55],
    [77, 55],
    [81, 55],
    [81, 165],
    [72, 770],
    [71, 55],
    [71, 55],
    [71, 55],
    [71, 55],
    [72, 55],
    [72, 55],
    [71, 55],
    [71, 55],
    [72, 220],
  ];

  isMute = false;

  constructor(){
    this.isMute = JSON.parse(localStorage['mute'] || false);
    this.enableMuteSwitcher();
  }

  enableMuteSwitcher = () => {
    document.addEventListener('keydown', e => {
      if (e.code === 'KeyM') {
        this.toggleMute();
      }
    });
  };

  toggleMute = () => {
    this.isMute = !this.isMute;
    localStorage['mute'] = this.isMute;
  };

  setupOscillator = () => {
    const context = new AudioContext();

    const gainNode = context.createGain();
    gainNode.connect(context.destination);
    gainNode.gain.value = 0.175; // volume level

    const oscillator = context.createOscillator();
    oscillator.type = 'square';
    oscillator.connect(gainNode);
    return oscillator;
  };

  midiNumberToFrequency = (number) => {
    /**
     * @see https://newt.phys.unsw.edu.au/jw/notes.html
     */
    return Math.pow(2, (number - 69) / 12) * 440;
  };

  play = (melody, length) => {
    if (this.isMute) {
      return;
    }
    const oscillator = this.setupOscillator();
    const eps = 0.01;
    let time = eps;

    melody.forEach(note => {
      const [ midiNumber, startsAt ] = note;
      const frequency = this.midiNumberToFrequency(midiNumber);
      console.log(Math.round(time * 100) / 100, Math.round(frequency));
      oscillator.frequency.setTargetAtTime(0, time - eps, 0);
      oscillator.frequency.setTargetAtTime(frequency, time, 0);
      time += length / startsAt;
    });
    oscillator.start();
    oscillator.stop(time);
  };

  intro = () => {
    this.play(this.MELODY_INTRO, 2);
  };

  rowCleared = () => {
    this.play(this.ROW_CLEARED, 0.5);
  };

  gameOver = () => {
    this.play(this.GAME_OVER, 10);
  };

  figureRotated = () => {};
  figureMoved = () => {};
  figureDropped = () => {};
}
