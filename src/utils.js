export function random(from, to){
  return Math.round(Math.random() * (to - from)) + from;
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

export function addBodyClass(className) {
  document.body.classList.add(className);
}

export function removeBodyClass(className) {
  document.body.classList.remove(className);
}
