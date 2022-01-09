let MATRIX_WIDTH = 10;
let MATRIX_HEIGTH = 15;
let MATRIX = [];
let FIGURES = {
  I_1: [
    [1],
    [1],
    [1],
    [1],
  ],
  T_1: [
    [0,1,0],
    [1,1,1],
  ],
  Z_1: [
    [1,1,0],
    [0,1,1],
  ],
};
let CURRENT_FIGURE = [];
let CURRENT_FIGURE_TYPE = null;
let CURRENT_FIGURE_X = 0;
let CURRENT_FIGURE_Y = 0;
let CURRENT_FIGURE_TIMEOUT = 2 * 1000;

function spawnRandomFigure(){
  const figureTypes = Object.keys(FIGURES);
  CURRENT_FIGURE_TYPE = figureTypes[random(figureTypes.length - 1)];
  CURRENT_FIGURE = FIGURES[CURRENT_FIGURE_TYPE];

  console.log('__CURRENT_FIGURE', CURRENT_FIGURE);
  const xMaxPos = MATRIX_WIDTH - CURRENT_FIGURE[0].length;

  CURRENT_FIGURE_X = random(xMaxPos);
  CURRENT_FIGURE_Y = 0;
}

function drawFigureOnMartix(figure){
  console.log('drawFigureOnMartix', figure);

  const affectedMatrixRows = MATRIX.slice(CURRENT_FIGURE_Y, figure.length + CURRENT_FIGURE_Y);
  const updatedAffectedMatrixRows = affectedMatrixRows.map((row, i) => {
    return [
      ...row.slice(0, CURRENT_FIGURE_X),
      ...figure[i],
      ...row.slice(CURRENT_FIGURE_X + figure[0].length),
    ];
  });

  MATRIX = [
    ...MATRIX.slice(0, CURRENT_FIGURE_Y),
    ...updatedAffectedMatrixRows,
    ...MATRIX.slice(CURRENT_FIGURE_Y + figure.length),
  ];
  renderMatrix();
};

function random(limit){
  return Math.round(Math.random() * limit);
}

function createArray(size, filler){
  return [...new Array(size)].map(() => filler);
}

function clearMartix(){
  const matrixRow = createArray(MATRIX_WIDTH, 0);
  MATRIX = createArray(MATRIX_HEIGTH, matrixRow);
}

function moveFigureDown(){

}


function calculateDistanceBelow(){}

function addFigureToMatrix(){}

function rotateFigureClockwise(){}

function renderMatrix(){
  const tableHTML = MATRIX.map(row => {
    console.log('row', row);
    const rowHTML = row.map(cell => {
      return `<td class="${ cell ? 'filled' : 'empty' }"></td>`;
    }).join('\n');
    return '  <tr>\n    ' + rowHTML + '\n</tr>';
  }).join('\n');

  const fullCode = `
<style>
table { border-collapse: collapse; }
td { width: 10px; height: 10px; }
.filled { background: black; }
</style>
<table>
  ${tableHTML}
</table>`;
  window.fullCode = fullCode;
  console.log({ fullCode });
  document.body.innerHTML = fullCode;
}

function moveCurrentFigureByTimer(figure, callback){
  window.figureTimeout = setTimeout(() => {
    let distanceBelow = calculateDistanceBelow();
    if (distanceBelow) {
      CURRENT_FIGURE_Y++;
      renderMatrix();
      moveCurrentFigureByTimer(figure, callback);
    }
    else {
      clearTimeout(window.figureTimeout);
      callback();
    }


  }, CURRENT_FIGURE_TIMEOUT);
}


clearMartix();
renderMatrix();
spawnRandomFigure();
drawFigureOnMartix(CURRENT_FIGURE);


// moveCurrentFigureByTimer(() => {
//   console.log('--- DONE ---');
// });






