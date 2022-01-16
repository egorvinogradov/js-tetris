export function random(limit){
  return Math.round(Math.random() * limit);
}

export function createArray(size, filler){
  return [ ...new Array(size) ].map(() => filler);
}

export function deepCloneArray(array) {
  const cloned = [];
  array.forEach(item => {
    if (item instanceof Array) {
      cloned.push(
        deepCloneArray(item)
      );
    }
    else {
      cloned.push(item);
    }
  });
  return cloned;
}

export function setCSSVariable(key, value) {
  document.documentElement.style.setProperty(key, value);
}

export function throttle(func, duration) {
  let isWaiting = false;
  return function () {
    if (!isWaiting) {
      isWaiting = true;
      func.apply(this, arguments);
      setTimeout(() => {
        isWaiting = false;
      }, duration);
    }
  };
}

export function onDocumentKeyDown(actions) {
  document.addEventListener('keydown', e => {
    const key = e.code;
    const action = actions[key];
    if (action) {
      action();
    }
  });
}
