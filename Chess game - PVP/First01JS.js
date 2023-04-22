var board = null
var $board = $('#myBoard')
var game = new Chess()
var whiteSquareGrey = '#a9a9a9'
var blackSquareGrey = '#696969'
var $status = $('#status')
var $fen = $('#fen')
var squareToHighlight = null
var squareClass = 'square-55d63'


var STACK_SIZE = 100; // maximum size of undo stack
var globalSum = 0; 


var weights = { p: 100, n: 325, b: 340, r: 500, q: 900, k: 10000, k_e: 10000 };
var pst_w = {
  p: [
    [100, 100, 100, 100, 105, 100, 100, 100],
    [78, 83, 86, 73, 102, 82, 85, 90],
    [7, 29, 21, 44, 40, 31, 44, 7],
    [-17, 16, -2, 15, 14, 0, 15, -13],
    [-26, 3, 10, 9, 6, 1, 0, -23],
    [-22, 9, 5, -11, -10, -2, 3, -19],
    [-31, 8, -7, -37, -36, -14, 3, -31],
    [0, 0, 0, 0, 0, 0, 0, 0],
  ],
  n: [
    [-66, -53, -75, -75, -10, -55, -58, -70],
    [-3, -6, 100, -36, 4, 62, -4, -14],
    [10, 67, 1, 74, 73, 27, 62, -2],
    [24, 24, 45, 37, 33, 41, 25, 17],
    [-1, 5, 31, 21, 22, 35, 2, 0],
    [-18, 10, 13, 22, 18, 15, 11, -14],
    [-23, -15, 2, 0, 2, 0, -23, -20],
    [-74, -23, -26, -24, -19, -35, -22, -69],
  ],
  b: [
    [-59, -78, -82, -76, -23, -107, -37, -50],
    [-11, 20, 35, -42, -39, 31, 2, -22],
    [-9, 39, -32, 41, 52, -10, 28, -14],
    [25, 17, 20, 34, 26, 25, 15, 10],
    [13, 10, 17, 23, 17, 16, 0, 7],
    [14, 25, 24, 15, 8, 25, 20, 15],
    [19, 20, 11, 6, 7, 6, 20, 16],
    [-7, 2, -15, -12, -14, -15, -10, -10],
  ],
  r: [
    [35, 29, 33, 4, 37, 33, 56, 50],
    [55, 29, 56, 67, 55, 62, 34, 60],
    [19, 35, 28, 33, 45, 27, 25, 15],
    [0, 5, 16, 13, 18, -4, -9, -6],
    [-28, -35, -16, -21, -13, -29, -46, -30],
    [-42, -28, -42, -25, -25, -35, -26, -46],
    [-53, -38, -31, -26, -29, -43, -44, -53],
    [-30, -24, -18, 5, -2, -18, -31, -32],
  ],
  q: [
    [6, 1, -8, -104, 69, 24, 88, 26],
    [14, 32, 60, -10, 20, 76, 57, 24],
    [-2, 43, 32, 60, 72, 63, 43, 2],
    [1, -16, 22, 17, 25, 20, -13, -6],
    [-14, -15, -2, -5, -1, -10, -20, -22],
    [-30, -6, -13, -11, -16, -11, -16, -27],
    [-36, -18, 0, -19, -15, -15, -21, -38],
    [-39, -30, -31, -13, -31, -36, -34, -42],
  ],
  k: [
    [4, 54, 47, -99, -99, 60, 83, -62],
    [-32, 10, 55, 56, 56, 55, 10, 3],
    [-62, 12, -57, 44, -67, 28, 37, -31],
    [-55, 50, 11, -4, -19, 13, 0, -49],
    [-55, -43, -52, -28, -51, -47, -8, -50],
    [-47, -42, -43, -79, -64, -32, -29, -32],
    [-4, 3, -14, -50, -57, -18, 13, 4],
    [17, 30, -3, -14, 6, -1, 40, 18],
  ],

  // Endgame King Table
  k_e: [
    [-50, -40, -30, -20, -20, -30, -40, -50],
    [-30, -20, -10, 0, 0, -10, -20, -30],
    [-30, -10, 20, 30, 30, 20, -10, -30],
    [-30, -10, 30, 40, 40, 30, -10, -30],
    [-30, -10, 30, 40, 40, 30, -10, -30],
    [-30, -10, 20, 30, 30, 20, -10, -30],
    [-30, -30, 0, 0, 0, 0, -30, -30],
    [-50, -30, -30, -30, -30, -30, -30, -50],
  ],
};
var pst_b = {
  p: pst_w['p'].slice().reverse(),
  n: pst_w['n'].slice().reverse(),
  b: pst_w['b'].slice().reverse(),
  r: pst_w['r'].slice().reverse(),
  q: pst_w['q'].slice().reverse(),
  k: pst_w['k'].slice().reverse(),
  k_e: pst_w['k_e'].slice().reverse(),
};

var pstOpponent = { w: pst_b, b: pst_w };
var pstSelf = { w: pst_w, b: pst_b };

/*
 * Evaluates the board at this point in time,
 * using the material weights and piece square tables.
 */
function evaluateBoard(game, move, prevSum, color) {

  if (game.in_checkmate()) {

    // Opponent is in checkmate (good for us)
    if (move.color === color) {
      return 10 ** 10;
    }
    // Our king's in checkmate (bad for us)
    else {
      return -(10 ** 10);
    }
  }

  if (game.in_draw() || game.in_threefold_repetition() || game.in_stalemate())
  {
    return 0;
  }

  if (game.in_check()) {
    // Opponent is in check (good for us)
    if (move.color === color) {
      prevSum += 50;
    }
    // Our king's in check (bad for us)
    else {
      prevSum -= 50;
    }
  }

  var from = [
    8 - parseInt(move.from[1]),
    move.from.charCodeAt(0) - 'a'.charCodeAt(0),
  ];
  var to = [
    8 - parseInt(move.to[1]),
    move.to.charCodeAt(0) - 'a'.charCodeAt(0),
  ];

  // Change endgame behavior for kings
  if (prevSum < -1500) {
    if (move.piece === 'k') {
      move.piece = 'k_e';
    }
    // Kings can never be captured
    // else if (move.captured === 'k') {
    //   move.captured = 'k_e';
    // }
  }

  if ('captured' in move) {
    // Opponent piece was captured (good for us)
    if (move.color === color) {
      prevSum +=
        weights[move.captured] +
        pstOpponent[move.color][move.captured][to[0]][to[1]];
    }
    // Our piece was captured (bad for us)
    else {
      prevSum -=
        weights[move.captured] +
        pstSelf[move.color][move.captured][to[0]][to[1]];
    }
  }

  if (move.flags.includes('p')) {
    // NOTE: promote to queen for simplicity
    move.promotion = 'q';

    // Our piece was promoted (good for us)
    if (move.color === color) {
      prevSum -=
        weights[move.piece] + pstSelf[move.color][move.piece][from[0]][from[1]];
      prevSum +=
        weights[move.promotion] +
        pstSelf[move.color][move.promotion][to[0]][to[1]];
    }
    // Opponent piece was promoted (bad for us)
    else {
      prevSum +=
        weights[move.piece] + pstSelf[move.color][move.piece][from[0]][from[1]];
      prevSum -=
        weights[move.promotion] +
        pstSelf[move.color][move.promotion][to[0]][to[1]];
    }
  } else {
    // The moved piece still exists on the updated board, so we only need to update the position value
    if (move.color !== color) {
      prevSum += pstSelf[move.color][move.piece][from[0]][from[1]];
      prevSum -= pstSelf[move.color][move.piece][to[0]][to[1]];
    } else {
      prevSum -= pstSelf[move.color][move.piece][from[0]][from[1]];
      prevSum += pstSelf[move.color][move.piece][to[0]][to[1]];
    }
  }

  return prevSum;
}


function updateAdvantage() {
  if (globalSum > 0) {
    $('#advantageColor').text('Black');
    $('#advantageNumber').text(globalSum);
  } else if (globalSum < 0) {
    $('#advantageColor').text('White');
    $('#advantageNumber').text(-globalSum);
  } else {
    $('#advantageColor').text('Neither side');
    $('#advantageNumber').text(globalSum);
  }
  $('#advantageBar').attr({
    'aria-valuenow': `${-globalSum}`,
    style: `width: ${((-globalSum + 2000) / 4000) * 100}%`,
  });
}


function removeHighlights (color) {
  $board.find('.' + squareClass)
    .removeClass('highlight-' + color)
}

function removeGreySquares () {
  $('#myBoard .square-55d63').css('background', '')
}

function greySquare (square) {
  var $square = $('#myBoard .square-' + square)

  var background = whiteSquareGrey
  if ($square.hasClass('black-3c85d')) {
    background = blackSquareGrey
  }

  $square.css('background', background)
}

function onDragStart (source, piece) {
  // do not pick up pieces if the game is over
  if (game.game_over()) return false

  // or if it's not that side's turn
  if ((game.turn() === 'w' && piece.search(/^b/) !== -1) ||
      (game.turn() === 'b' && piece.search(/^w/) !== -1)) {
    return false
  }
}

function onDrop (source, target, piece, newPos, oldPos, orientation) {
  removeGreySquares()


  console.log('Source: ' + source)
  console.log('Target: ' + target)
  console.log('Piece: ' + piece)
  console.log('New position: ' + Chessboard.objToFen(newPos))
  console.log('Old position: ' + Chessboard.objToFen(oldPos))
  console.log('Orientation: ' + orientation)
  console.log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~')

  // see if the move is legal
  var move = game.move({
    from: source,
    to: target,
    promotion: 'q' // NOTE: always promote to a queen for example simplicity
  })

  // illegal move
  if (move === null) return 'snapback'
  if (move.color === 'w'){
  removeHighlights('white')
  $board.find('.square-' + source).addClass('highlight-white')
  $board.find('.square-' + target).addClass('highlight-white')
  } else{
    removeHighlights('black')
    $board.find('.square-' + move.from).addClass('highlight-black')
    $board.find('.square-' + target).addClass('highlight-black')
  }

  globalSum = evaluateBoard(game, move, globalSum, 'b');
  updateAdvantage();

  renderMoveHistory(game.history());

  updateStatus()
}

function onMouseoverSquare (square, piece) {
  // get list of possible moves for this square
  var moves = game.moves({
    square: square,
    verbose: true
  })

  // exit if there are no moves available for this square
  if (moves.length === 0) return

  // highlight the square they moused over
  greySquare(square)

  // highlight the possible squares for this piece
  for (var i = 0; i < moves.length; i++) {
    greySquare(moves[i].to)
  }
}

function onMouseoutSquare (square, piece) {
  removeGreySquares()
}

function onMoveEnd () {
  $board.find('.square-' + squareToHighlight)
    .addClass('highlight-black')
}

function onSnapEnd () {
  board.position(game.fen())
}


var renderMoveHistory = function (moves) {
    var historyElement = $('#move-history').empty();
    historyElement.empty();
    for (var i = 0; i < moves.length; i = i + 2) {
        historyElement.append('<span>' + moves[i] + ' || ' + ( moves[i + 1] ? moves[i + 1] : ' ') + '</span><br>')
    }
    historyElement.scrollTop(historyElement[0].scrollHeight);

};


function updateStatus () {
  var status = ''

  var moveColor = 'White'
  if (game.turn() === 'b') {
    moveColor = 'Black'
  }

  // checkmate?
  if (game.in_checkmate()) {
    status = 'Game over, ' + moveColor + ' is in checkmate.'
  }

  // draw?
  else if (game.in_draw()) {
    status = 'Game over, drawn position'
  }

  // game still on
  else {
    status = moveColor + ' to move'

    // check?
    if (game.in_check()) {
      status += ', ' + moveColor + ' is in check'
    }
  }

  $status.html(status)
  $fen.html(game.fen())
}

var config = {
  draggable: true,
  position: 'start',
  onDragStart: onDragStart,
  onDrop: onDrop,
  onMouseoutSquare: onMouseoutSquare,
  onMouseoverSquare: onMouseoverSquare,
  onMoveEnd: onMoveEnd,
  onSnapEnd: onSnapEnd
}
board = Chessboard('myBoard', config)

updateStatus()