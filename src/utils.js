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

export function addRootClass(...className) {
  document.documentElement.classList.add(...className);
}

export function removeRootClass(...className) {
  document.documentElement.classList.remove(...className);
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

export function supportsTouchScreen() {
  return window.ontouchstart
    || navigator.maxTouchPoints > 0
    || navigator.msMaxTouchPoints > 0;
}

export function getDeviceCharacteristics(){
  const isIOS = /iPhone|iPod|iPad/i.test(navigator.userAgent);
  const isLateIPadOS = /Macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints > 2;

  let os = null;
  if (isIOS || isLateIPadOS) {
    os = 'ios';
  }
  else if (/mac/i.test(navigator.userAgent) && !isLateIPadOS) {
    os = 'mac';
  }
  else if (/android/i.test(navigator.userAgent)) {
    os = 'android';
  }
  else if (/windows/i.test(navigator.userAgent)) {
    os = 'windows';
  }
  else if (/linux/i.test(navigator.userAgent)) {
    os = 'linux';
  }

  const isTouchDevice = supportsTouchScreen();
  let screenType = 'desktop';

  if (isTouchDevice) {
    const screenWidth = Math.min(screen.availWidth, screen.availHeight);
    if (screenWidth < getCSSVariable('--mobile-breakpoint', true)) {
      screenType = 'phone';
    }
    else {
      screenType = 'tablet';
    }
  }
  return {
    screenType,
    isTouchDevice,
    os,
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
  if (supportsTouchScreen()) {
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

export function formatNumber(number) {
  try {
    return new Intl.NumberFormat().format(number);
  }
  catch (e) {
    return number;
  }
}

export function numberToHumanReadableOrder(number) {
  const endings = {
    '1': 'st',
    '2': 'nd',
    '3': 'rd',
  };
  return number + (endings[number] || 'th');
}

export function timestampToHumanReadableDuration(timestamp) {
  const secondsTotal = Math.round(timestamp / 1000);
  const minutesTotal = Math.floor(secondsTotal / 60);
  const hoursTotal = Math.floor(minutesTotal / 60);

  const minutes = minutesTotal - (hoursTotal * 60);
  const seconds = secondsTotal - (hoursTotal * 60 * 60) - (minutes * 60);
  const chunk = (count, word) => count ? inflectByNumber(count, word) : '';

  return [
    chunk(hoursTotal, 'hour'),
    chunk(minutes, 'minute'),
    chunk(seconds, 'second'),
  ].join(' ').trim();
}

export function inflectByNumber(number, word){
  return `${number} ${word}${number === 1 ? '' : 's'}`;
}

export function waitUntilEventFired(element, eventType, maxDelay) {
  return new Promise(resolve => {
    let timeout = null;
    const callback = (...args) => {
      clearTimeout(timeout);
      element.removeEventListener(eventType, callback);
      resolve(...args);
    };
    timeout = setTimeout(callback, maxDelay);
    element.addEventListener(eventType, callback);
  });
}

export function template(str, data) {
  let result = str;
  const matches = str.match(/{\s*([a-z0-9_]+)\s*}/ig);
  if (matches && matches.length) {
    matches.forEach(substr => {
      const key = substr.replace(/[{}\s]/ig, '');
      result = result.replace(substr, data[key] || '');
    });
  }
  return result;
}
