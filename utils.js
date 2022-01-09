export function random(limit){
  return Math.round(Math.random() * limit);
}

export function createArray(size, filler){
  return [ ...new Array(size) ].map(() => filler);
}

export function arrayLast(arr) {
  return arr[arr.length - 1];
}
