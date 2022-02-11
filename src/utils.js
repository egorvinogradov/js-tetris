export function random(from, to){
  return Math.round(Math.random() * (to - from)) + from;
}

export function createArray(size, filler){
  return [ ...new Array(size) ].map(() => filler);
}

export function createMatrix(width, height, filler){
  const row = createArray(width, filler);
  return createArray(height, row);
}

export function mapBinaryMatrixToText(matrix, filler) {
  return matrix.map(row => {
    return row.map(cell => cell ? filler : ' ').join('');
  }).join('\n');
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

export function addRootClass(className) {
  document.documentElement.classList.add(className);
}

export function removeRootClass(className) {
  document.documentElement.classList.remove(className);
}

export function capitalize(str) {
  return str[0].toUpperCase() + str.slice(1);
}

export function createNodeArray(elements){
  if (!elements) {
    return [];
  }
  return elements.length ? [...elements] : [elements];
}

export function createSVGElement(tagName, attributes, children){
  const element = document.createElementNS('http://www.w3.org/2000/svg', tagName);
  for (let key in attributes) {
    element.setAttribute(key, attributes[key]);
  }
  createNodeArray(children).forEach(child => {
    element.appendChild(child);
  });
  return element;
}

export function applySVGFilter(elements, effects) {
  const filterEffectElements = effects.map(effect => {
    const tagName = 'fe' + capitalize(effect.type);
    const { inSource, in2Source, ...attributes } = effect;
    if (inSource) {
      attributes.in = 'SourceGraphic';
    }
    if (in2Source) {
      attributes.in2 = 'SourceGraphic';
    }
    return createSVGElement(tagName, attributes);
  });

  const filterId = 'generated-svg-filter-' + random(100, 999);
  const filterElement = createSVGElement('filter', {
    id: filterId,
    width: '140%',
    height: '140%',
    x: '-20%',
    y: '-20%',
  }, filterEffectElements);

  document.body.appendChild(
    createSVGElement('svg', {}, filterElement)
  );
  createNodeArray(elements).forEach(element => {
    let currentFilters = getComputedStyle(element).getPropertyValue('filter');
    if (currentFilters === 'none') {
      currentFilters = '';
    }
    element.style.setProperty('filter', `url(#${filterId}) ${currentFilters}`);
  });
}

export function detectDeviceCharacteristics(){
  const isIOS = /iPhone|iPod|iPad/i.test(navigator.userAgent);
  const isLateIPadOS = /Macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints > 2;

  // const isTouchDevice = window.ontouchstart
  //   || navigator.maxTouchPoints > 0
  //   || navigator.msMaxTouchPoints > 0;
  const isTouchDevice = window.innerWidth < 500; // TODO: remove after debug

  let deviceType = 'desktop';
  if (isTouchDevice) {
    if (screen.availWidth < screen.availHeight && screen.availWidth < 420) {
      deviceType = 'phone';
    }
    else {
      deviceType = 'tablet';
    }
  }
  return {
    deviceType,
    isTouchDevice,
    isIOS: isIOS || isLateIPadOS,
  };
}
