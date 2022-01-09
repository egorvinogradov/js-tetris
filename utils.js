export function random(limit){
  return Math.round(Math.random() * limit);
}

export function createArray(size, filler){
  return [ ...new Array(size) ].map(() => filler);
}

export function arrayLast(array) {
  return array[array.length - 1];
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
