const gameBoardElement = document.getElementById('game-board');
const gridContainer = document.getElementById('grid-container');
const scoreElement = document.getElementById('score');
const nextBlockElement = document.getElementById('next-block');
const messageElement = document.getElementById('message-container');
const startButton = document.getElementById('start-button');
const overlay = document.getElementById('game-overlay');
const gameOverText = document.getElementById('game-over-text');
const finalScoreElement = document.getElementById('final-score');
// const speedDisplay = document.getElementById('speed-display');
const fallingBlockContainer = document.getElementById('falling-block-container');

const BOARD_WIDTH = 6;
const BOARD_HEIGHT = 15;
const BLOCK_SIZE = 30; // The size of a block in pixels

// Game State Variables
let board;
let score;
let fallingBlock;
let fallingBlockPieces = [];
let nextBlock;
let gameLoopTimeoutId;
let animationFrameId;
let isGameOver;
let gameSessionId = 0;
let isHardDropping = false;

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    setupInitialState();
    addEventListeners();
});

function setupInitialState() {
    board = Array.from({ length: BOARD_HEIGHT }, () => Array(BOARD_WIDTH).fill(0));
    score = 0;
    isGameOver = true;
    updateScore();
    drawBoard();
    overlay.style.display = 'flex';
    gameOverText.style.display = 'none';
    startButton.textContent = 'Start Game';
}

function addEventListeners() {
    startButton.addEventListener('click', startGame);
    document.addEventListener('keydown', handleKeyPress);

    // Touch controls
    const leftButton = document.getElementById('left-button');
    const rightButton = document.getElementById('right-button');
    const downButton = document.getElementById('down-button');
    const rotateButton = document.getElementById('rotate-button');

    if (leftButton) leftButton.addEventListener('click', () => !isGameOver && !isHardDropping && moveBlock(-1));
    if (rightButton) rightButton.addEventListener('click', () => !isGameOver && !isHardDropping && moveBlock(1));
    if (downButton) downButton.addEventListener('click', () => !isGameOver && !isHardDropping && hardDrop());
    if (rotateButton) {
        rotateButton.addEventListener('click', () => {
            if (isGameOver || isHardDropping) return;
            rotateBlock();
        });
    }
}

// --- Game Flow Control ---
function startGame() {
    gameSessionId++;
    resetGame();
    overlay.style.display = 'none';
    fallingBlockContainer.style.display = 'block';

    for (let i = 0; i < 2; i++) {
        const piece = document.createElement('div');
        piece.classList.add('falling-block-piece');
        const img = document.createElement('img');
        piece.appendChild(img);
        fallingBlockPieces.push(piece);
        fallingBlockContainer.appendChild(piece);
    }

    fallingBlock = createBlock();
    updateFallingBlockVisuals();
    nextBlock = createBlock();
    drawNextBlock();
    
    isGameOver = false;
    // updateSpeedDisplay(calculateSpeed());
    gameLoop();
    renderLoop();
}

function resetGame() {
    board = Array.from({ length: BOARD_HEIGHT }, () => Array(BOARD_WIDTH).fill(0));
    score = 0;
    updateScore();

    if (gameLoopTimeoutId) clearTimeout(gameLoopTimeoutId);
    if (animationFrameId) cancelAnimationFrame(animationFrameId);

    isGameOver = false;
    gameOverText.style.display = 'none';
    fallingBlockContainer.innerHTML = '';
    fallingBlockPieces = [];
    drawBoard();
}

function triggerGameOver() {
    isGameOver = true;
    clearTimeout(gameLoopTimeoutId);
    cancelAnimationFrame(animationFrameId);

    finalScoreElement.textContent = score;
    gameOverText.style.display = 'block';
    startButton.textContent = 'Retry';
    overlay.style.display = 'flex';
    fallingBlockContainer.innerHTML = '';
}

// --- Game Loops ---
async function gameLoop() {
    if (isGameOver) return;
    const currentSessionId = gameSessionId;

    if (checkCollision()) {
        settleBlock();
        await postSettleActions(currentSessionId);
    } else {
        fallingBlock.y += 0.25;
        if (currentSessionId === gameSessionId && !isGameOver) {
            gameLoopTimeoutId = setTimeout(gameLoop, calculateSpeed());
        }
    }
}

function renderLoop() {
    if (isGameOver) {
        cancelAnimationFrame(animationFrameId);
        return;
    }

    const coords = getPieceAbsCoords(fallingBlock, true);
    for (let i = 0; i < fallingBlockPieces.length; i++) {
        const piece = fallingBlockPieces[i];
        const xPos = coords[i].x * BLOCK_SIZE;
        const yPos = coords[i].y * BLOCK_SIZE;
        piece.style.transform = `translate(${xPos}px, ${yPos}px)`;
    }
    animationFrameId = requestAnimationFrame(renderLoop);
}

// --- Block & Board Logic ---

function getPieceAbsCoords(block, forRender = false) {
    const { x, y, rotationState } = block;
    const yPos = forRender ? y : Math.round(y);

    const pivot = { x: x, y: yPos };
    let satellite;

    switch (rotationState) {
        case 0: satellite = { x: pivot.x + 1, y: pivot.y }; break;
        case 1: satellite = { x: pivot.x, y: pivot.y + 1 }; break;
        case 2: satellite = { x: pivot.x - 1, y: pivot.y }; break;
        case 3: satellite = { x: pivot.x, y: pivot.y - 1 }; break;
    }
    return [pivot, satellite];
}

function createBlock() {
    let num1, num2;
    const group1 = [1, 2, 3, 4, 5];
    const group2 = [5, 6, 7, 8, 9];

    do {
        num1 = group1[Math.floor(Math.random() * group1.length)];
        num2 = group2[Math.floor(Math.random() * group2.length)];
    } while (num1 + num2 === 10);
    
    const blocks = Math.random() < 0.5 ? [num1, num2] : [num2, num1];

    return { x: 2, y: -1, blocks, rotationState: 0 };
}

function rotateBlock() {
    const { x, y, rotationState } = fallingBlock;
    const nextState = (rotationState + 1) % 4;
    const roundedY = Math.round(y);

    const pivot = { x: x, y: roundedY };
    let nextSatellite;
    switch (nextState) {
        case 0: nextSatellite = { x: pivot.x + 1, y: pivot.y }; break;
        case 1: nextSatellite = { x: pivot.x,     y: pivot.y + 1 }; break;
        case 2: nextSatellite = { x: pivot.x - 1, y: pivot.y }; break;
        case 3: nextSatellite = { x: pivot.x,     y: pivot.y - 1 }; break;
    }

    const collision = nextSatellite.x < 0 || nextSatellite.x >= BOARD_WIDTH ||
                      nextSatellite.y < 0 || nextSatellite.y >= BOARD_HEIGHT ||
                      (board[nextSatellite.y] && board[nextSatellite.y][nextSatellite.x] !== 0);

    if (collision) {
        [fallingBlock.blocks[0], fallingBlock.blocks[1]] = [fallingBlock.blocks[1], fallingBlock.blocks[0]];
        updateFallingBlockVisuals();
    } else {
        fallingBlock.rotationState = nextState;
    }
}

function moveBlock(dx) {
    const newBlock = { ...fallingBlock, x: fallingBlock.x + dx };
    const coords = getPieceAbsCoords(newBlock);

    for (const piece of coords) {
        if (piece.x < 0 || piece.x >= BOARD_WIDTH || (piece.y >= 0 && board[piece.y][piece.x] !== 0)) {
            return;
        }
    }
    fallingBlock.x = newBlock.x;
}

async function hardDrop() {
    if (isGameOver || isHardDropping) return;

    isHardDropping = true;
    clearTimeout(gameLoopTimeoutId);

    let finalY = fallingBlock.y;
    while (true) {
        const nextY = finalY + 1;
        const tempBlock = { ...fallingBlock, y: nextY };
        if (checkCollision(tempBlock)) {
            break;
        }
        finalY = nextY;
    }

    fallingBlockPieces.forEach(p => p.classList.add('hard-dropping'));
    fallingBlock.y = finalY;

    setTimeout(async () => {
        fallingBlockPieces.forEach(p => p.classList.remove('hard-dropping'));
        if (gameSessionId !== gameSessionId) return;

        settleBlock();
        await postSettleActions(gameSessionId);

        isHardDropping = false;
    }, 80);
}

function checkCollision(block = fallingBlock) {
    const tempBlock = { ...block, y: block.y + 0.25 };
    const coords = getPieceAbsCoords(tempBlock);

    for (const piece of coords) {
        if (piece.y >= BOARD_HEIGHT || (piece.y >= 0 && piece.y < BOARD_HEIGHT && board[piece.y][piece.x] !== 0)) {
            return true;
        }
    }
    return false;
}

function settleBlock() {
    const coords = getPieceAbsCoords(fallingBlock);
    const piecesToSettle = [
        { x: coords[0].x, y: coords[0].y, num: fallingBlock.blocks[0] },
        { x: coords[1].x, y: coords[1].y, num: fallingBlock.blocks[1] }
    ];

    piecesToSettle.sort((a, b) => b.y - a.y);

    for (const piece of piecesToSettle) {
        let finalY = piece.y;
        if (finalY < 0) continue;

        while (finalY + 1 < BOARD_HEIGHT && board[finalY + 1][piece.x] === 0) {
            finalY++;
        }
        if (finalY >= 0) {
            board[finalY][piece.x] = piece.num;
        }
    }
    fallingBlockContainer.style.display = 'none';
}

async function postSettleActions(sessionId) {
    if (sessionId !== gameSessionId) return;
    drawBoard();
    if (checkGameOver()) {
        triggerGameOver();
        return;
    }
    await handleClearing(sessionId);
    if (sessionId !== gameSessionId) return;
    if (!isGameOver) {
        fallingBlock = nextBlock;
        nextBlock = createBlock();
        drawNextBlock();
        updateFallingBlockVisuals();
        fallingBlockContainer.style.display = 'block';
        if (checkCollision()) {
            settleBlock();
            drawBoard();
            triggerGameOver();
            return;
        }
        gameLoop();
    }
}

async function handleClearing(sessionId) {
    let chain = 1;
    let clearedSomething;
    do {
        if (sessionId !== gameSessionId) return;
        clearedSomething = false;
        const toClear = [];
        for (let y = 0; y < BOARD_HEIGHT; y++) {
            for (let x = 0; x < BOARD_WIDTH - 1; x++) {
                if (board[y][x] && board[y][x+1] && board[y][x] + board[y][x+1] === 10) {
                    toClear.push({y, x, type: 'h'});
                }
            }
        }
        for (let y = 0; y < BOARD_HEIGHT - 1; y++) {
            for (let x = 0; x < BOARD_WIDTH; x++) {
                if (board[y][x] && board[y+1][x] && board[y][x] + board[y+1][x] === 10) {
                    toClear.push({y: y + 1, x, type: 'v'});
                }
            }
        }

        if (toClear.length > 0) {
            clearedSomething = true;
            toClear.sort((a, b) => (a.y !== b.y ? b.y - a.y : a.x - b.x));
            const pair = toClear[0];
            if (pair.type === 'h') {
                board[pair.y][pair.x] = 0;
                board[pair.y][pair.x+1] = 0;
            } else {
                board[pair.y][pair.x] = 0;
                board[pair.y-1][pair.x] = 0;
            }
            score += 10 * Math.pow(2, chain - 1);
            if (chain > 1) showMessage(`${chain}連鎖！`);
            chain++;
            updateScore();
            // updateSpeedDisplay(calculateSpeed());
            drawBoard();
            await new Promise(r => setTimeout(r, 300));
            if (sessionId !== gameSessionId) return;

            const movements = calculateGravityMovements();
            if (movements.length > 0) {
                await animateGravity(movements);
                applyGravityToBoard();
            }

            drawBoard();
            await new Promise(r => setTimeout(r, 300));
        }
    } while (clearedSomething);
}

function calculateGravityMovements() {
    const movements = [];
    const tempBoard = board.map(row => [...row]);

    for (let x = 0; x < BOARD_WIDTH; x++) {
        let emptyRow = -1;
        for (let y = BOARD_HEIGHT - 1; y >= 0; y--) {
            if (tempBoard[y][x] === 0 && emptyRow === -1) {
                emptyRow = y;
            }
            if (tempBoard[y][x] !== 0 && emptyRow !== -1) {
                movements.push({ from: {x, y}, to: {x, emptyRow}, num: tempBoard[y][x] });
                tempBoard[emptyRow][x] = tempBoard[y][x];
                tempBoard[y][x] = 0;
                emptyRow--;
            }
        }
    }
    return movements;
}

function applyGravityToBoard() {
    for (let x = 0; x < BOARD_WIDTH; x++) {
        let emptyRow = -1;
        for (let y = BOARD_HEIGHT - 1; y >= 0; y--) {
            if (board[y][x] === 0 && emptyRow === -1) {
                emptyRow = y;
            }
            if (board[y][x] !== 0 && emptyRow !== -1) {
                board[emptyRow][x] = board[y][x];
                board[y][x] = 0;
                emptyRow--;
            }
        }
    }
}

async function animateGravity(movements) {
    const animationLayer = document.createElement('div');
    animationLayer.style.position = 'absolute';
    animationLayer.style.top = 0;
    animationLayer.style.left = 0;
    animationLayer.style.width = '100%';
    animationLayer.style.height = '100%';
    animationLayer.style.pointerEvents = 'none';
    gameBoardElement.appendChild(animationLayer);

    const fallingPieces = [];
    for (const move of movements) {
        const piece = document.createElement('div');
        piece.className = 'block';
        const img = document.createElement('img');
        img.src = `images/${move.num}.svg`;
        piece.appendChild(img);

        piece.style.position = 'absolute';
        piece.style.left = `${move.from.x * BLOCK_SIZE}px`;
        piece.style.top = `${move.from.y * BLOCK_SIZE}px`;
        piece.style.transition = 'top 0.15s ease-in';

        animationLayer.appendChild(piece);
        fallingPieces.push({piece, move});
    }

    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

    for (const item of fallingPieces) {
        item.piece.style.top = `${item.move.to.y * BLOCK_SIZE}px`;
    }

    await new Promise(r => setTimeout(r, 150));

    gameBoardElement.removeChild(animationLayer);
}

function checkGameOver() {
    for (let x = 0; x < BOARD_WIDTH; x++) {
        if (board[0][x] !== 0) return true;
    }
    return false;
}

function calculateSpeed() {
    const speed = 250 * Math.exp(-0.0017 * score);
    return Math.max(50, speed);
}

function drawBoard() {
    gridContainer.innerHTML = '';
    for (let y = 0; y < BOARD_HEIGHT; y++) {
        for (let x = 0; x < BOARD_WIDTH; x++) {
            const cell = document.createElement('div');
            cell.classList.add('block');
            if (board[y][x]) {
                const img = document.createElement('img');
                img.src = `images/${board[y][x]}.svg`;
                cell.appendChild(img);
            }
            gridContainer.appendChild(cell);
        }
    }
}

function updateFallingBlockVisuals() {
    const coords = getPieceAbsCoords(fallingBlock, true);
    for (let i = 0; i < fallingBlockPieces.length; i++) {
        const piece = fallingBlockPieces[i];
        const img = piece.querySelector('img');
        img.src = `images/${fallingBlock.blocks[i]}.svg`;
    }
}

function drawNextBlock() {
    nextBlockElement.innerHTML = '';
    for (let i = 0; i < nextBlock.blocks.length; i++) {
        const cell = document.createElement('div');
        cell.classList.add('block');
        const img = document.createElement('img');
        img.src = `images/${nextBlock.blocks[i]}.svg`;
        cell.appendChild(img);
        nextBlockElement.appendChild(cell);
    }
}

function updateScore() {
    scoreElement.textContent = score;
}

function updateSpeedDisplay(speed) {
    // if(speedDisplay) speedDisplay.textContent = speed.toFixed(0) + 'ms';
}

function showMessage(message) {
    messageElement.textContent = message;
    setTimeout(() => { messageElement.textContent = ''; }, 1000);
}

function handleKeyPress(event) {
    if (isGameOver || isHardDropping) return;
    switch (event.key) {
        case 'ArrowLeft': moveBlock(-1); break;
        case 'ArrowRight': moveBlock(1); break;
        case 'ArrowDown': hardDrop(); break;
        case ' ':
        case 'ArrowUp':
            rotateBlock();
            break;
    }
}
