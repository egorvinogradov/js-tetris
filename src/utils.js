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

export function getCSSVariable(key, numberOnly) {
  let value = getComputedStyle(document.documentElement).getPropertyValue(key);
  if (numberOnly) {
    value = +value.replace(/[a-z]+$/ig, '');
  }
  return value;
}

export function setCSSVariable(key, value, postfix) {
  document.documentElement.style.setProperty(key, (value || 0) + (postfix || ''));
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

export function supportsTouch() {
  return window.ontouchstart
    || navigator.maxTouchPoints > 0
    || navigator.msMaxTouchPoints > 0;
}

export function getDeviceCharacteristics(){
  const isIOS = /iPhone|iPod|iPad/i.test(navigator.userAgent);
  const isLateIPadOS = /Macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints > 2;
  const isTouchDevice = supportsTouch();

  let deviceType = 'desktop';
  if (isTouchDevice) {
    const screenWidth = Math.min(screen.availWidth, screen.availHeight);
    if (screenWidth < 420) {
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

export function getViewport() {
  return {
    width: window.innerWidth,
    height: window.innerHeight,
  };
}

export function getOrientation() {
  const viewport = getViewport();
  if (supportsTouch()) {
    return viewport.width < viewport.height ? 'portrait' : 'landscape';
  }
  else {
    return 'landscape';
  }
}

/**
 * Converts 'vmin' CSS unit into pixels
 */
export function vminToPx(value) {
  const orientation = getOrientation();
  const viewport = getViewport();
  const smallestSide = orientation === 'portrait' ? 'width' : 'height';
  return viewport[smallestSide] * value / 100;
}
